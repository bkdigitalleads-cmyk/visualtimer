const fs = require('fs');
const path = require('path');

// The app's sounds, made here from sine waves and plucked strings so they
// belong to this app and nobody else: five gentle end sounds, a soft tick
// and the one-minute warning. Writes ../assets/sounds/*.wav (44.1 kHz,
// 16-bit mono). The end sounds double as the notification sounds when the
// phone is locked (app.json, expo-notifications "sounds"), so each stays
// under 30 seconds. No sudden starts: every note has a short fade in, and
// everything peaks well below full scale, so nothing startles a child.
//   node sounds.js

const RATE = 44100;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function buffer(seconds) {
  return new Float64Array(Math.ceil(seconds * RATE));
}

/** A struck bar or bell: a few sine partials, each with its own decay, and a 6 ms fade in. */
function strike(buf, at, freq, { partials, decay, gain }) {
  const start = Math.floor(at * RATE);
  const len = Math.min(buf.length - start, Math.ceil(decay * 7 * RATE));
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.006);
    let v = 0;
    for (const [ratio, amp, d] of partials) v += amp * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp(-t / (decay * d));
    buf[start + i] += gain * attack * v;
  }
}

/** A plucked string (Karplus-Strong), softened with a gentle lowpass. */
function pluck(buf, at, freq, { gain, decay }) {
  const start = Math.floor(at * RATE);
  const n = Math.round(RATE / freq);
  let seed = Math.round(freq * 1000) % 2147483647 || 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const ring = Array.from({ length: n }, () => rnd());
  // Smooth the burst first, so the attack is a soft pluck, not a scratch.
  for (let k = 0; k < 3; k++) for (let i = 0; i < n; i++) ring[i] = (ring[i] + ring[(i + 1) % n]) / 2;
  const len = Math.min(buf.length - start, Math.ceil(decay * 6 * RATE));
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    const next = (idx + 1) % n;
    const v = ring[idx];
    ring[idx] = 0.996 * 0.5 * (ring[idx] + ring[next]);
    idx = next;
    buf[start + i] += gain * v * Math.min(1, t / 0.004) * Math.exp(-t / decay);
  }
}

/** A soft hollow wood tap: a sine that drops a little in pitch, with a breath of filtered noise. */
function tap(buf, at, freq, gain) {
  const start = Math.floor(at * RATE);
  const len = Math.min(buf.length - start, Math.ceil(0.5 * RATE));
  let seed = 12345;
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    const f = freq * (1 + 0.25 * Math.exp(-t / 0.02));
    const tone = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.09);
    seed = (seed * 16807) % 2147483647;
    lp += 0.08 * ((seed / 2147483647) * 2 - 1 - lp);
    const noise = lp * Math.exp(-t / 0.012);
    buf[start + i] += gain * Math.min(1, t / 0.002) * (tone + 0.6 * noise);
  }
}

/** Peak-normalise to `peak` (0..1) and fade the last 80 ms, then 16-bit WAV. */
function write(name, buf, peak) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  const k = max > 0 ? peak / max : 0;
  const fade = Math.floor(0.08 * RATE);
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    const tail = i > buf.length - fade ? (buf.length - i) / fade : 1;
    const s = Math.max(-1, Math.min(1, buf[i] * k * tail));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVE', 8);
  head.write('fmt ', 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([head, data]));
  console.log(`assets/sounds/${name}.wav  ${(buf.length / RATE).toFixed(2)} s`);
}

// A warm bell: the fundamental, an octave, and a soft inharmonic shimmer.
const BELL = { partials: [[1, 1, 1], [2, 0.32, 0.55], [2.76, 0.12, 0.35], [5.4, 0.04, 0.2]], decay: 0.55, gain: 1 };
// A small glassy bell, brighter and shorter.
const LITTLE = { partials: [[1, 1, 1], [2.76, 0.28, 0.5], [5.4, 0.12, 0.3], [8.9, 0.05, 0.2]], decay: 0.32, gain: 1 };
// A marimba bar: fundamental with its 4th and 10th partials, which die fast.
const BAR = { partials: [[1, 1, 1], [3.93, 0.22, 0.25], [9.97, 0.06, 0.12]], decay: 0.3, gain: 1 };

function chime() {
  // Three falling notes, then the first again, soft: G5, E5, C5 ... G5.
  const b = buffer(4.2);
  [[0, 79], [0.55, 76], [1.1, 72], [2.0, 79], [2.0, 72]].forEach(([at, n], i) => strike(b, at, midi(n), { ...BELL, gain: i === 4 ? 0.55 : 1 }));
  write('chime', b, 0.5);
}

function bells() {
  // A little rising pentatonic run, twice.
  const b = buffer(3.6);
  const run = [84, 86, 88, 91, 93];
  for (let r = 0; r < 2; r++) run.forEach((n, i) => strike(b, r * 1.25 + i * 0.13, midi(n), { ...LITTLE, gain: 0.8 }));
  strike(b, 2.6, midi(96), LITTLE);
  write('bells', b, 0.42);
}

function marimba() {
  // C5 E5 G5 C6, a breath, then G5 C6 together.
  const b = buffer(3.0);
  [[0, 72], [0.18, 76], [0.36, 79], [0.54, 84], [1.2, 79], [1.2, 84]].forEach(([at, n]) => strike(b, at, midi(n), BAR));
  write('marimba', b, 0.55);
}

function harp() {
  // An upward pentatonic sweep that settles on a soft chord.
  const b = buffer(4.5);
  const sweep = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84];
  sweep.forEach((n, i) => pluck(b, i * 0.075, midi(n), { gain: 0.7, decay: 0.9 }));
  [72, 76, 79].forEach((n, i) => pluck(b, 1.4 + i * 0.03, midi(n), { gain: 0.8, decay: 1.2 }));
  write('harp', b, 0.5);
}

function drum() {
  // Wood drum: tok, tok, tok-tok, a pause, and one deeper tap.
  const b = buffer(2.6);
  [[0, 330], [0.32, 330], [0.64, 392], [0.8, 392], [1.4, 262]].forEach(([at, f]) => tap(b, at, f, 1));
  write('drum', b, 0.55);
}

function tick() {
  // Very short and quiet: a small wooden click.
  const b = buffer(0.12);
  tap(b, 0, 1800, 1);
  write('tick', b, 0.16);
}

function warn() {
  // One minute left: two soft notes, lower and quieter than any end sound.
  const b = buffer(2.0);
  strike(b, 0, midi(76), { ...BELL, decay: 0.4 });
  strike(b, 0.35, midi(72), { ...BELL, decay: 0.5 });
  write('warn', b, 0.3);
}

fs.mkdirSync(OUT, { recursive: true });
chime();
bells();
marimba();
harp();
drum();
tick();
warn();
