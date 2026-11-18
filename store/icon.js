const sharp = require('sharp');
const opentype = require('opentype.js');
const path = require('path');

// Visual Timer icon, in the app's "kitchen table" palette. Every shape comes
// from the app's own scene geometry (../src/scenes/geometry.ts), so the icon
// is the product. Four options for docs/design/icon-options.png
// (`node icon.js options`), each big and at 60 px on a light and a dark
// wallpaper; the chosen one is written to ../assets and the website
// (`node icon.js`).
//   plate  - the color disc, three quarters left, teal on a cream plate, on oat
//   sunny  - the same disc in sunflower on a cream plate, on the deep teal
//   leaf   - the bitten leaf with the caterpillar's head, on soft green
//   jar    - the sand jar half full, on oat
// No clock numbers, no hands, no red disc on a white face.
// Chosen: leaf, Brian's pick on Nov 18: it stands apart from the disc icons
// other timers use in search results (see docs/design/NOTES.md).
const CHOSEN = 'leaf';
const LEAF_BG = '#EAF3DD';

const ROOT = path.join(__dirname, '..');
const FRED = opentype.loadSync(ROOT + '/assets/fonts/Fredoka-SemiBold.ttf');
const NUN = opentype.loadSync(ROOT + '/assets/fonts/Nunito-Regular.ttf');
const OAT = '#F5EFE4';
const CREAM = '#FFFAF2';
const TEAL = '#2A9D8F';
const DEEP = '#1F7F74';
const SUN = '#F2B43D';
const INK = '#2B2622';

let G; // the scene geometry, loaded in main()

function disc({ bg, rim, plate, wedge, hand, knob, f = 0.75 }) {
  // The disc drawn in a 300 box and scaled to the 1024 tile, a little larger than in the app.
  const s = 1024 / 300;
  const R = 104;
  return `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="${bg}"/>
    <g transform="scale(${s})">
      <circle cx="150" cy="150" r="${R + 22}" fill="${rim}"/>
      <circle cx="150" cy="150" r="${R + 6}" fill="${plate}"/>
      <path d="${G.wedgePath(150, 150, R, f)}" fill="${wedge}"/>
      <path d="M150 150L${G.wedgeEdge(150, 150, R, f).map((v) => v.toFixed(1)).join(' ')}" stroke="${hand}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="150" cy="150" r="22" fill="${knob}"/>
      <circle cx="150" cy="150" r="9" fill="${hand}"/>
    </g>
  </svg>`;
}

const art = {
  plate: () => disc({ bg: OAT, rim: '#BFE2DC', plate: CREAM, wedge: TEAL, hand: DEEP, knob: CREAM }),
  sunny: () => disc({ bg: DEEP, rim: '#2E9488', plate: CREAM, wedge: SUN, hand: '#C98A1E', knob: CREAM }),
  leaf: () => {
    const s = 1024 / 300;
    return `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="${LEAF_BG}"/>
      <g transform="translate(-330 -330) scale(${s * 1.55})">
        <path d="${G.leafPath(0.62)}" fill="#6FB552"/>
        <path d="M52 170L${G.leafEdgeX(0.62)} 170" stroke="#4F8F3A" stroke-width="4" stroke-linecap="round"/>
        <circle cx="${G.leafEdgeX(0.62) + 2}" cy="150" r="22" fill="#EF8354"/>
        <circle cx="${G.leafEdgeX(0.62) - 5}" cy="145" r="6" fill="#FFFFFF"/>
        <circle cx="${G.leafEdgeX(0.62) + 9}" cy="145" r="6" fill="#FFFFFF"/>
        <circle cx="${G.leafEdgeX(0.62) - 4}" cy="146" r="3.2" fill="${INK}"/>
        <circle cx="${G.leafEdgeX(0.62) + 10}" cy="146" r="3.2" fill="${INK}"/>
      </g>
    </svg>`;
  },
  jar: () => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="${OAT}"/>
      <g transform="translate(-10 40) scale(${(1024 / 300) * 1.05})">
        <clipPath id="g"><path d="M104 52Q94 52 94 64L94 128Q94 146 128 162L143 170L143 182L157 182L157 170L172 162Q206 146 206 128L206 64Q206 52 196 52Z"/></clipPath>
        <path d="M104 52Q94 52 94 64L94 128Q94 146 128 162L143 170L143 182L157 182L157 170L172 162Q206 146 206 128L206 64Q206 52 196 52Z" fill="#E3F0F2"/>
        <g clip-path="url(#g)"><path d="M80 110Q150 128 220 110L220 200L80 200Z" fill="#E8B04B"/></g>
        <path d="M104 52Q94 52 94 64L94 128Q94 146 128 162L143 170L143 182L157 182L157 170L172 162Q206 146 206 128L206 64Q206 52 196 52Z" fill="none" stroke="#A9CDD4" stroke-width="6" stroke-linejoin="round"/>
        <rect x="98" y="34" width="104" height="22" rx="8" fill="#C9874E"/>
        <rect x="148.5" y="182" width="3" height="40" fill="#D29637"/>
        <path d="M110 232Q150 200 190 232Z" fill="#E8B04B"/>
      </g>
    </svg>`,
};

const LABELS = { plate: '1  plate', sunny: '2  sunny', leaf: '3  leaf (shipped)', jar: '4  jar' };

const textPath = (font, text, size, x, y) => font.getPath(text, x, y, size).toPathData(2);

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

/** The tile with the iOS corner mask, for showing on a wallpaper. */
async function rounded(svg, size) {
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.2237}" fill="#fff"/></svg>`);
  return sharp(await png(svg, size)).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

async function options() {
  const names = Object.keys(art);
  const COL = 400;
  const W = 60 + names.length * COL;
  const H = 820;
  const comps = [];
  for (let i = 0; i < names.length; i++) {
    const x = 60 + i * COL;
    comps.push({ input: await rounded(art[names[i]](), 320), left: x, top: 60 });
    // At 60 px on a light and a dark wallpaper, the size on a home screen.
    comps.push({ input: await rounded(art[names[i]](), 60), left: x + 70, top: 560 });
    comps.push({ input: await rounded(art[names[i]](), 60), left: x + 210, top: 560 });
  }
  const labels = names.map((n, i) => `<path d="${textPath(FRED, LABELS[n], 30, 60 + i * COL, 450)}" fill="${INK}"/>`).join('');
  const bg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#EDE6D9"/>
    ${names.map((_, i) => `<rect x="${60 + i * COL + 40}" y="530" width="120" height="120" rx="22" fill="#D7E4EA"/><rect x="${60 + i * COL + 180}" y="530" width="120" height="120" rx="22" fill="#1E2230"/>`).join('')}
    ${labels}
    <path d="${textPath(NUN, '60 px, on a light and a dark wallpaper', 24, 60, 720)}" fill="#6B6158"/>
  </svg>`;
  await sharp(Buffer.from(bg)).composite(comps).png().toFile(ROOT + '/docs/design/icon-options.png');
  console.log('wrote docs/design/icon-options.png');
}

async function write() {
  const svg = art[CHOSEN]();
  await sharp(await png(svg, 1024)).flatten({ background: LEAF_BG }).png().toFile(ROOT + '/assets/icon.png');
  // Splash: the tile itself, with its corners, on the app's background (light and dark, set in app.json).
  await sharp(await rounded(svg, 512)).png().toFile(ROOT + '/assets/splash-icon.png');
  await sharp(await png(svg, 1024)).png().toFile(ROOT + '/assets/android-icon-foreground.png');
  await sharp(await png(svg, 48)).png().toFile(ROOT + '/assets/favicon.png');
  await sharp(await png(svg, 512)).png().toFile(ROOT + '/docs/icon-512.png');
  await sharp(await png(svg, 180)).png().toFile(ROOT + '/docs/apple-touch-icon.png');
  // Open Graph image: the icon, the name and a line, on oat.
  const og = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="${OAT}"/>
    <path d="${textPath(FRED, 'Visual Timer', 84, 470, 290)}" fill="${INK}"/>
    <path d="${textPath(NUN, 'A countdown a child can see, for home', 34, 474, 360)}" fill="#6B6158"/>
    <path d="${textPath(NUN, 'and the classroom. On iPhone.', 34, 474, 406)}" fill="#6B6158"/>
  </svg>`;
  await sharp(Buffer.from(og)).composite([{ input: await rounded(svg, 330), left: 90, top: 150 }]).png().toFile(ROOT + '/docs/og-image.png');
  console.log('wrote assets/ and docs/ images');
}

(async () => {
  G = await import(ROOT + '/src/scenes/geometry.ts');
  require('fs').mkdirSync(ROOT + '/docs/design', { recursive: true });
  if (process.argv[2] === 'options') await options();
  else await write();
})();
