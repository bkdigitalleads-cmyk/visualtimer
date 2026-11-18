/**
 * Shapes for the scenes, as pure functions (no imports) checked by
 * `npm test`. Every scene is drawn in a 300 by 300 box and gets two
 * numbers: `f`, how much time is left (1 at the start, 0 at the end), and
 * `t`, a clock in seconds for small living touches (a flicker, a puff of
 * steam). Nothing here knows about minutes.
 */

export const BOX = 300;

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : Number.isFinite(v) ? v : 0);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

const r1 = (n: number) => Math.round(n * 10) / 10;

/** A point on a circle; angle in degrees, 0 at twelve o'clock, going clockwise. */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/**
 * The disc's remaining wedge: the part of the circle still to go. The empty
 * part opens clockwise from twelve o'clock, like a hand sweeping round, so
 * the wedge ends at twelve and starts at 360 * (1 - f) degrees. Full disc
 * at f = 1 (as two half arcs, since one arc cannot close a circle), empty
 * string at f = 0.
 */
export function wedgePath(cx: number, cy: number, r: number, f: number): string {
  const k = clamp01(f);
  if (k <= 0.0005) return '';
  if (k >= 0.9995) return `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${cx} ${cy + r}A${r} ${r} 0 1 1 ${cx} ${cy - r}Z`;
  const from = 360 * (1 - k);
  const [x0, y0] = polar(cx, cy, r, from);
  const large = k > 0.5 ? 1 : 0;
  return `M${cx} ${cy}L${r1(x0)} ${r1(y0)}A${r} ${r} 0 ${large} 1 ${cx} ${cy - r}Z`;
}

/** Where the wedge's moving edge meets the rim (for the little hand). */
export function wedgeEdge(cx: number, cy: number, r: number, f: number): [number, number] {
  return polar(cx, cy, r, 360 * (1 - clamp01(f)));
}

/** A star with `points` tips, the first tip straight up. */
export function starPath(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const [x, y] = polar(cx, cy, r, (i * 180) / points);
    d += `${i === 0 ? 'M' : 'L'}${r1(x)} ${r1(y)}`;
  }
  return `${d}Z`;
}

/**
 * How many of `n` stars are still fully lit, and how much of the next one
 * is left (0..1). Stars go out from the last to the first.
 */
export function starsLit(f: number, n: number): { full: number; part: number } {
  const v = clamp01(f) * n;
  const full = Math.floor(v + 1e-9);
  return { full: Math.min(n, full), part: full >= n ? 0 : v - full };
}

// ---------- the leaf ----------

export const LEAF = { x0: 52, x1: 262, yc: 170, h: 70 };

/** The leaf's top and bottom edges at x (a fat almond, a little fuller near the stem). */
export function leafHalf(x: number): number {
  const u = clamp01((x - LEAF.x0) / (LEAF.x1 - LEAF.x0));
  return LEAF.h * Math.pow(Math.sin(Math.PI * u), 0.85) * (1 - 0.18 * u);
}

/** Where the bite edge is: the tip at f = 1, the stem at f = 0. */
export function leafEdgeX(f: number): number {
  return lerp(LEAF.x0, LEAF.x1, clamp01(f));
}

/**
 * The leaf that is left: from the stem along the top edge to the bite edge,
 * down the bite edge in round bites (each bite a concave arc), and back
 * along the bottom edge. Empty string when nothing is left.
 */
export function leafPath(f: number): string {
  const xe = leafEdgeX(f);
  if (xe - LEAF.x0 < 1) return '';
  const steps = 28;
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = lerp(LEAF.x0, xe, i / steps);
    top.push(`${r1(x)} ${r1(LEAF.yc - leafHalf(x))}`);
    bottom.push(`${r1(x)} ${r1(LEAF.yc + leafHalf(x))}`);
  }
  const yTop = LEAF.yc - leafHalf(xe);
  const yBot = LEAF.yc + leafHalf(xe);
  const span = yBot - yTop;
  let d = `M${top[0]}L${top.slice(1).join('L')}`;
  if (span > 2 && f < 0.999) {
    const n = Math.max(1, Math.round(span / 24));
    const seg = span / n;
    for (let i = 1; i <= n; i++) {
      // A concave bite: the arc bows back into the leaf.
      d += `A${r1(seg * 0.62)} ${r1(seg * 0.62)} 0 0 0 ${r1(xe)} ${r1(yTop + seg * i)}`;
    }
  } else {
    d += `L${r1(xe)} ${r1(yBot)}`;
  }
  d += `L${bottom.slice(0, -1).reverse().join('L')}Z`;
  return d;
}

// ---------- the rocket's trip ----------

/** The trip from the launch pad (bottom left) to the moon (top right), a quadratic curve. */
export const TRIP = { p0: [62, 236] as [number, number], c: [80, 70] as [number, number], p1: [232, 76] as [number, number] };

export function tripPoint(k: number): { x: number; y: number; angle: number } {
  const u = clamp01(k);
  const [x0, y0] = TRIP.p0;
  const [cx, cy] = TRIP.c;
  const [x1, y1] = TRIP.p1;
  const x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1;
  const y = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y1;
  const dx = 2 * (1 - u) * (cx - x0) + 2 * u * (x1 - cx);
  const dy = 2 * (1 - u) * (cy - y0) + 2 * u * (y1 - cy);
  // Degrees, 0 pointing up, clockwise (what an SVG rotate wants for a rocket drawn nose up).
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return { x, y, angle };
}

/** Dots along the part of the trip still to go, evenly spaced in k. */
export function tripDots(fromK: number, count: number): [number, number][] {
  const out: [number, number][] = [];
  const start = clamp01(fromK);
  for (let i = 1; i <= count; i++) {
    const k = start + ((1 - start) * i) / (count + 1);
    const p = tripPoint(k);
    out.push([p.x, p.y]);
  }
  return out;
}

// ---------- colors ----------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mixes two colors: k = 0 gives a, k = 1 gives b. */
export function mix(a: string, b: string, k: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(lerp(v, B[i], clamp01(k))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** A small steady wobble from the clock, for living touches. Same t, same value. */
export function wobble(t: number, speed: number, seed = 0): number {
  return Math.sin(t * speed + seed) * 0.6 + Math.sin(t * speed * 2.3 + seed * 1.7) * 0.4;
}
