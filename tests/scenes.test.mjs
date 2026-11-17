// The scenes' shapes: the disc's wedge, the leaf being eaten, the stars
// going out, the rocket's trip, and the rules every scene keeps (drawn in
// code, no numbers on them, nothing that copies another timer's look).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const Gm = await import('../src/scenes/geometry.ts');
const M = await import('../src/model.ts');
const ROOT = new URL('..', import.meta.url).pathname;

const nums = (d) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

test('disc: full at the start, empty at the end, and the empty part opens clockwise from twelve', () => {
  assert.equal(Gm.wedgePath(150, 150, 100, 0), '');
  const full = Gm.wedgePath(150, 150, 100, 1);
  assert.match(full, /A100 100 0 1 1 150 250A100 100 0 1 1 150 50Z/);
  // Three quarters left: twelve to three is empty; the wedge runs from three o'clock round to twelve, the long way.
  const q = Gm.wedgePath(150, 150, 100, 0.75);
  assert.match(q, /^M150 150L250 150A100 100 0 1 1 150 50Z$/);
  // A quarter left: the wedge runs from nine o'clock to twelve, the short way.
  const k = Gm.wedgePath(150, 150, 100, 0.25);
  assert.match(k, /^M150 150L50 150A/);
  const [ex, ey] = Gm.wedgeEdge(150, 150, 100, 0.25);
  assert.ok(Math.abs(ex - 50) < 1e-6 && Math.abs(ey - 150) < 1e-6, 'a quarter left: the edge is at nine o\'clock');
  assert.match(k, /A100 100 0 0 1 150 50Z$/, 'the short way round');
  const [hx, hy] = Gm.wedgeEdge(150, 150, 100, 0.5);
  assert.ok(Math.abs(hx - 150) < 1e-6 && Math.abs(hy - 250) < 1e-6, 'half left: six o\'clock');
});

test('leaf: shrinks from the tip to the stem as time goes, with round bites on its edge', () => {
  const width = (d) => Math.max(...[...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1])));
  let last = Infinity;
  for (const f of [1, 0.8, 0.6, 0.4, 0.2, 0.05]) {
    const d = Gm.leafPath(f);
    const w = width(d);
    assert.ok(w < last + 1e-6, `leaf at ${f} is no wider than before`);
    assert.ok(Math.abs(w - Gm.leafEdgeX(f)) < 1, `the leaf ends at the bite edge at ${f}`);
    last = w;
  }
  assert.equal(Gm.leafPath(0), '');
  assert.ok(!Gm.leafPath(1).includes('A'), 'a whole leaf has no bites');
  assert.ok(Gm.leafPath(0.5).includes('A'), 'a bitten leaf has bites');
  assert.ok(!/NaN|Infinity/.test(Gm.leafPath(0.3)));
  assert.equal(Gm.leafHalf(Gm.LEAF.x0), 0);
});

test('stars: ten, going out from the last, the one going out shown by how much is left', () => {
  assert.deepEqual(Gm.starsLit(1, 10), { full: 10, part: 0 });
  assert.deepEqual(Gm.starsLit(0, 10), { full: 0, part: 0 });
  const h = Gm.starsLit(0.55, 10);
  assert.equal(h.full, 5);
  assert.ok(Math.abs(h.part - 0.5) < 1e-9);
  assert.match(Gm.starPath(0, 0, 20, 9), /^M0 -20L/);
});

test('rocket: leaves the pad at the start, reaches the moon at the end, nose along the way it flies', () => {
  const a = Gm.tripPoint(0);
  const b = Gm.tripPoint(1);
  assert.deepEqual([a.x, a.y], Gm.TRIP.p0);
  assert.deepEqual([b.x, b.y], Gm.TRIP.p1);
  assert.ok(Math.abs(a.angle) < 15, 'pointing up off the pad');
  assert.ok(b.angle > 60, 'leaning toward the moon');
  assert.equal(Gm.tripDots(0.5, 4).length, 4);
  assert.ok(Gm.tripDots(0.5, 4).every(([x]) => x > Gm.tripPoint(0.5).x - 1));
});

test('colors and clock helpers', () => {
  assert.equal(Gm.mix('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(Gm.mix('#2A9D8F', '#2A9D8F', 0.3), '#2a9d8f');
  assert.equal(Gm.clamp01(2), 1);
  assert.equal(Gm.clamp01(NaN), 0);
  assert.equal(Gm.wobble(3, 2, 1), Gm.wobble(3, 2, 1));
});

test('scenes: nine, all drawn in code, no numbers or text on them, no red-on-white disc', () => {
  const files = readdirSync(`${ROOT}src/scenes`).filter((f) => f.endsWith('.tsx'));
  for (const id of M.SCENES.map((s) => s.id)) assert.ok(files.some((f) => f.toLowerCase().startsWith(id.slice(0, 4))), `a file for ${id}`);
  const wedge = readFileSync(`${ROOT}src/scenes/Wedge.tsx`, 'utf8');
  assert.ok(!/<Text|SvgText|TSpan/.test(wedge), 'no numbers round the disc');
  for (const f of files) {
    const s = readFileSync(`${ROOT}src/scenes/${f}`, 'utf8');
    assert.ok(!/require\(|\.png|\.jpg|<Image/.test(s), `${f} is drawn in code, no pictures`);
    assert.ok(!/from 'react-native-svg'[\s\S]*\bText\b/.test(s.split('\n').find((l) => l.includes("from 'react-native-svg'")) ?? ''), `${f} draws no text`);
  }
  // The default disc color is teal, and no disc color is a red.
  assert.equal(M.colorHex('teal'), '#2A9D8F');
  for (const c of M.COLORS) {
    const n = parseInt(c.hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    assert.ok(!(r > 180 && g < 80 && b < 80), `${c.name} is not a red`);
  }
});
