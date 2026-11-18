const sharp = require('sharp');
const opentype = require('opentype.js');
const fs = require('fs');
const path = require('path');

// App Store screenshots, built from the app's real screens (docs/design/light,
// or a folder of the same names: `node screenshots.js <dir>`). Each is the
// app's oat table colour, a short caption at the top in the app's own
// rounded face (Fredoka SemiBold, drawn as outlines so it looks the same
// anywhere), and under it either the whole screen with its own rounded
// corners, or six scenes cut from running screens (`grid`). No device
// frames, no gradients, no emoji. Captions carry the search terms in order
// of importance. Writes store/screenshots/6.9/ (1320x2868) and 6.3/
// (1206x2622); the website's shot-1 to shot-6 are the 6.9 set, reduced.

const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'docs/design/light');
const FRED = opentype.loadSync(path.join(ROOT, 'assets/fonts/Fredoka-SemiBold.ttf'));
const TABLE = '#F5EFE4';
const INK = '#2B2622';
const EDGE = 'rgba(43,38,34,0.10)';

const SHOTS = [
  { file: '22-run-disc', caption: 'A Timer Kids Can See' },
  { grid: ['30-run-rocket', '30-run-caterpillar', '30-run-icepop', '30-run-sunset', '30-run-train', '30-run-candle'], caption: 'Nine Scenes to Choose From' },
  { file: '44-routine-step', caption: 'Routines, Step by Step' },
  { file: '10-home', caption: 'Big Presets and a Dial' },
  { file: '40-saved-pro', caption: 'Saved Timers for Every Day' },
  { file: '46-child-lock', caption: 'Child Lock for Little Hands' },
];

const SIZES = [
  { name: '6.9', width: 1320, height: 2868 },
  { name: '6.3', width: 1206, height: 2622 },
];

/** Where the scene sits on a portrait run screen, in points (393x852). */
const SCENE_BOX = { x: 20, y: 214, size: 353 };

/** The caption as one or two centred lines, as large as fits (a long one breaks at a word). */
function captionSvg(text, width, top, maxSize) {
  const maxW = width * 0.86;
  const widthAt = (t, size) => FRED.getAdvanceWidth(t, size);
  let lines = [text];
  let size = maxSize;
  while (size > maxSize * 0.72 && widthAt(text, size) > maxW) size -= 2;
  if (widthAt(text, size) > maxW) {
    const words = text.split(' ');
    let best = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const d = Math.abs(widthAt(words.slice(0, i).join(' '), maxSize) - widthAt(words.slice(i).join(' '), maxSize));
      if (d < bestDiff) {
        bestDiff = d;
        best = i;
      }
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    size = maxSize;
    while (lines.some((l) => widthAt(l, size) > maxW)) size -= 2;
  }
  const lineH = size * 1.12;
  const paths = lines
    .map((l, i) => {
      const x = (width - widthAt(l, size)) / 2;
      return `<path d="${FRED.getPath(l, x, top + size + i * lineH, size).toPathData(2)}" fill="${INK}"/>`;
    })
    .join('');
  return { paths, bottom: top + size + (lines.length - 1) * lineH + size * 0.3 };
}

async function roundedImage(buf, w, h, r) {
  const img = await sharp(buf).resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
  return sharp(img).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

/** Scenes two by two, each cut from a running screen, centred in the space under the caption. */
async function gridShot(shot, size, k, cap) {
  const top0 = Math.round(Math.max(cap.bottom + 80 * k, 480 * k));
  const gap = Math.round(40 * k);
  const rows = Math.ceil(shot.grid.length / 2);
  const availH = size.height - top0 - 100 * k;
  const cell = Math.floor(Math.min((size.width - 120 * k - gap) / 2, (availH - gap * (rows - 1)) / rows));
  const left0 = Math.round((size.width - (2 * cell + gap)) / 2);
  const y0 = top0 + Math.round((availH - (rows * cell + (rows - 1) * gap)) / 2);
  const comps = [];
  for (let i = 0; i < shot.grid.length; i++) {
    const src = path.join(SRC, `${shot.grid[i]}.png`);
    const meta = await sharp(src).metadata();
    const s = meta.width / 393;
    const crop = await sharp(src)
      .extract({ left: Math.round(SCENE_BOX.x * s), top: Math.round(SCENE_BOX.y * s), width: Math.round(SCENE_BOX.size * s), height: Math.round(SCENE_BOX.size * s) })
      .png()
      .toBuffer();
    const x = left0 + (i % 2) * (cell + gap);
    const y = y0 + Math.floor(i / 2) * (cell + gap);
    comps.push({ input: await roundedImage(crop, cell, cell, Math.round(cell * (46 / 300))), left: x, top: y });
  }
  const bg = `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg"><rect width="${size.width}" height="${size.height}" fill="${TABLE}"/>${cap.paths}</svg>`;
  return sharp(Buffer.from(bg)).composite(comps).flatten({ background: TABLE }).png({ compressionLevel: 9 }).toBuffer();
}

async function one(shot, size) {
  const k = size.width / 1320;
  const cap = captionSvg(shot.caption, size.width, Math.round(150 * k), Math.round(120 * k));
  if (shot.grid) return gridShot(shot, size, k, cap);
  // The screen fills the rest: centred, its top under the caption, its foot just inside the edge.
  const top = Math.round(Math.max(cap.bottom + 70 * k, 470 * k));
  const screenH = size.height - top - Math.round(70 * k);
  const screenW = Math.round(screenH * (393 / 852));
  const left = Math.round((size.width - screenW) / 2);
  const r = Math.round(screenW * (55 / 393));
  const rounded = await roundedImage(path.join(SRC, `${shot.file}.png`), screenW, screenH, r);
  const bg = `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size.width}" height="${size.height}" fill="${TABLE}"/>
    ${cap.paths}
    <rect x="${left - 1.5}" y="${top - 1.5}" width="${screenW + 3}" height="${screenH + 3}" rx="${r + 1.5}" fill="${EDGE}"/>
  </svg>`;
  return sharp(Buffer.from(bg)).composite([{ input: rounded, left, top }]).flatten({ background: TABLE }).png({ compressionLevel: 9 }).toBuffer();
}

(async () => {
  for (const size of SIZES) {
    const dir = path.join(__dirname, 'screenshots', size.name);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < SHOTS.length; i++) {
      const out = path.join(dir, `${i + 1}-${SHOTS[i].caption.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}.png`);
      const buf = await one(SHOTS[i], size);
      fs.writeFileSync(out, buf);
      if (size.name === '6.9') await sharp(buf).resize(420).png({ palette: true, colors: 256 }).toFile(path.join(ROOT, 'docs', `shot-${i + 1}.png`));
      console.log(path.relative(ROOT, out));
    }
  }
})();
