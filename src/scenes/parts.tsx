import React from 'react';
import { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { BOX, polar } from './geometry';

export interface SceneProps {
  /** Time left, 1 at the start down to 0 at the end. */
  f: number;
  /** A clock in seconds for the small living touches. Frozen with Reduce Motion. */
  t: number;
  /** The disc color (only the color disc uses it). */
  color: string;
  dark: boolean;
  /** Time is up: the scene shows its ending. */
  done: boolean;
  /** A unique id prefix for gradients and clips. */
  uid: string;
}

/** The rounded window every scene sits in, with its background, clipped to the corners. */
export function Window({ uid, bg, children }: { uid: string; bg: React.ReactNode; children: React.ReactNode }) {
  return (
    <G>
      <Defs>
        <ClipPath id={`${uid}-win`}>
          <Rect x={0} y={0} width={BOX} height={BOX} rx={46} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${uid}-win)`}>
        {bg}
        {children}
      </G>
    </G>
  );
}

/** A four-pointed sparkle. */
export function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.28;
  return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
}

const SPOTS: [number, number, number][] = [
  [40, 56, 0],
  [252, 44, 1.3],
  [268, 168, 2.1],
  [30, 196, 0.7],
  [150, 22, 2.8],
  [214, 262, 1.9],
  [82, 268, 3.4],
];

/** The ending's sparkles, twinkling in turn. */
export function Sparkles({ t, color }: { t: number; color: string }) {
  return (
    <G>
      {SPOTS.map(([x, y, s], i) => {
        const k = 0.55 + 0.45 * Math.sin(t * 3 + s * 2);
        return <Path key={i} d={sparklePath(x, y, 7 + 6 * k)} fill={color} opacity={0.35 + 0.65 * k} />;
      })}
    </G>
  );
}

/** Stars scattered on a night sky, each twinkling at its own pace. */
export const SKY_STARS: [number, number, number][] = [
  [28, 40, 1.6],
  [70, 22, 1.2],
  [118, 50, 1.8],
  [160, 18, 1.1],
  [196, 112, 1.4],
  [270, 128, 1.7],
  [22, 118, 1.3],
  [104, 108, 1.0],
  [150, 150, 1.2],
  [282, 200, 1.1],
  [60, 160, 1.5],
  [230, 168, 1.0],
  [180, 64, 1.3],
];

export function ring(cx: number, cy: number, r: number, n: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => polar(cx, cy, r, (i * 360) / n));
}
