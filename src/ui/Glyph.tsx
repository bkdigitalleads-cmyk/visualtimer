import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';
import type { IconId } from '../model';

/**
 * Every icon in the app, drawn for it on a 24 grid with round ends, like a
 * soft marker. No icon pack, no emoji. UI glyphs are one color; the timer
 * icons (toothbrush, moon and so on) sit in a tinted circle of their own
 * color so a child can find "their" timer by color and shape.
 */

type Shape = { d: string; fill?: boolean };

function gear(): string {
  let d = '';
  const teeth = 8;
  for (let i = 0; i < teeth * 4; i++) {
    const a = ((i / (teeth * 4)) * 360 - 90 + 360 / teeth / 8) * (Math.PI / 180);
    const r = i % 4 < 2 ? 9.4 : 7.2;
    d += `${i === 0 ? 'M' : 'L'}${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
}

export type UiGlyph =
  | 'gear'
  | 'play'
  | 'pause'
  | 'plus'
  | 'minus'
  | 'restart'
  | 'close'
  | 'lock'
  | 'unlock'
  | 'check'
  | 'chevron'
  | 'back'
  | 'trash'
  | 'up'
  | 'down'
  | 'edit'
  | 'expand'
  | 'timer'
  | 'saved'
  | 'routine'
  | 'history'
  | 'sound'
  | 'star'
  | 'next';

const UI: Record<UiGlyph, Shape[]> = {
  gear: [{ d: gear() }, { d: 'M12 9a3 3 0 1 0 0.01 0Z' }],
  play: [{ d: 'M8.5 5.8v12.4a1 1 0 0 0 1.5.9l9.6-6.2a1 1 0 0 0 0-1.7L10 4.9a1 1 0 0 0-1.5.9Z', fill: true }],
  pause: [
    { d: 'M7 5h3v14H7z', fill: true },
    { d: 'M14 5h3v14h-3z', fill: true },
  ],
  plus: [{ d: 'M12 5v14M5 12h14' }],
  minus: [{ d: 'M5 12h14' }],
  restart: [{ d: 'M5.5 13a6.5 6.5 0 1 0 2-5.2' }, { d: 'M5 4.5v4h4' }],
  close: [{ d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' }],
  lock: [{ d: 'M8 11V8.5a4 4 0 0 1 8 0V11' }, { d: 'M6.5 11h11a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-7a1 1 0 0 1 1-1Z' }],
  unlock: [{ d: 'M8 11V8.5a4 4 0 0 1 7.6-1.7' }, { d: 'M6.5 11h11a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-7a1 1 0 0 1 1-1Z' }],
  check: [{ d: 'M5 12.5l4.5 4.5L19 7.5' }],
  chevron: [{ d: 'M9.5 6l6 6-6 6' }],
  back: [{ d: 'M14.5 6l-6 6 6 6' }],
  trash: [{ d: 'M5 7h14M10 7V5h4v2M7 7l1 12.2a1 1 0 0 0 1 .8h6a1 1 0 0 0 1-.8L17 7' }],
  up: [{ d: 'M12 18V6M6.5 11.5L12 6l5.5 5.5' }],
  down: [{ d: 'M12 6v12M6.5 12.5L12 18l5.5-5.5' }],
  edit: [{ d: 'M5 19l1-4.2L15.8 5a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L9.2 18Z' }, { d: 'M14 7l3 3' }],
  expand: [{ d: 'M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4' }],
  timer: [{ d: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z' }, { d: 'M12 13V9.5M10 2.8h4' }],
  saved: [{ d: 'M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.5L12 16.5l-6.5 4V5A1.5 1.5 0 0 1 7 3.5Z' }],
  routine: [{ d: 'M10 6.5h10M10 12h10M10 17.5h10' }, { d: 'M4.5 6.5h.5M4.5 12h.5M4.5 17.5h.5' }],
  history: [{ d: 'M5.5 5h13a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z' }, { d: 'M4 10h16M8.5 3v4M15.5 3v4' }],
  sound: [{ d: 'M4 10v4a1 1 0 0 0 1 1h3l4.5 3.5V5.5L8 9H5a1 1 0 0 0-1 1Z' }, { d: 'M16 9a4.2 4.2 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11' }],
  star: [{ d: 'M12 3.5l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.1l-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7Z', fill: true }],
  next: [{ d: 'M6 6l7 6-7 6' }, { d: 'M17 6v12' }],
};

const ICON: Record<IconId, Shape[]> = {
  tooth: [{ d: 'M3 15.5h10.5' }, { d: 'M13.5 13.5h6.5a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-6.5Z' }, { d: 'M15 13.5V10M17.5 13.5V9.5M20 13.5V10' }],
  screen: [{ d: 'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z' }, { d: 'M11 17.5h2' }],
  blocks: [{ d: 'M4 14h7v7H4zM13 14h7v7h-7zM8.5 5h7v7h-7z' }],
  pencil: [{ d: 'M4.5 19.5l1.4-5L15.7 4.7a1.4 1.4 0 0 1 2 0l1.6 1.6a1.4 1.4 0 0 1 0 2L9.5 18.1Z' }, { d: 'M14 6.5l3.5 3.5' }],
  moon: [{ d: 'M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10Z' }],
  sun: [{ d: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' }, { d: 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4' }],
  shirt: [{ d: 'M8.5 4L4 7l2 4 2-1v10h8V10l2 1 2-4-4.5-3c-.6 1.5-2 2.5-3.5 2.5S9.1 5.5 8.5 4Z' }],
  bowl: [{ d: 'M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z' }, { d: 'M9 3.5c1 1 0 2 1 3.2M14 3.5c1 1 0 2 1 3.2' }],
  shoe: [{ d: 'M3.5 9v8.5h17v-1.3c0-1.6-1.5-2.7-3.5-3.2L13 12l-3-3.5Z' }, { d: 'M9 12l1.5-1M11 13.5l1.5-1' }],
  backpack: [{ d: 'M8 7h8a3 3 0 0 1 3 3v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a3 3 0 0 1 3-3Z' }, { d: 'M9.5 7V5.5a2.5 2.5 0 0 1 5 0V7M8.5 14h7v4h-7z' }],
  book: [{ d: 'M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5Z' }, { d: 'M12 6.5V20' }],
  bath: [{ d: 'M3 12h18v1.5a5.5 5.5 0 0 1-5.5 5.5h-7A5.5 5.5 0 0 1 3 13.5Z' }, { d: 'M6 12V6.5a2 2 0 0 1 3.7-1M7.5 19l-1 2M16.5 19l1 2' }],
  bed: [{ d: 'M3 6v13M3 15h18v4M21 15v-2.5a3 3 0 0 0-3-3h-7.5V15' }, { d: 'M6.8 12.5a1.5 1.5 0 1 0 0-.01' }],
  apple: [{ d: 'M12 7.5c-3-2-8-1-8 4.5S8 21 10 21c1 0 1.4-.5 2-.5s1 .5 2 .5c2 0 6-3.5 6-9S15 5.5 12 7.5Z' }, { d: 'M12 7.5c0-2 1-3.5 3-4.5' }],
  music: [{ d: 'M9 17.5V5.5l10-2v12' }, { d: 'M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM19 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z' }],
  ball: [{ d: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z' }, { d: 'M4 12h16M12 4c-3.2 3.2-3.2 12.8 0 16M12 4c3.2 3.2 3.2 12.8 0 16' }],
  coat: [{ d: 'M9 3.5h6l5 4-2 4-2-1V20.5H8V10.5l-2 1-2-4Z' }, { d: 'M12 6v14.5M10 13h.01M10 16.5h.01' }],
  door: [{ d: 'M6.5 20.5V4.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M3.5 20.5h17' }, { d: 'M14.5 12.5h.01' }],
  potty: [{ d: 'M7.5 3.5h6v6.5h-6z' }, { d: 'M4.5 10h15a7.5 7.5 0 0 1-15 0ZM9.5 17l-1 3.5h7l-1-3.5' }],
  heart: [{ d: 'M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z' }],
};

/** Each timer icon's own color, for its circle. */
export const ICON_TINT: Record<IconId, string> = {
  tooth: '#4A97D6',
  screen: '#9784D2',
  blocks: '#EA7B5B',
  pencil: '#EDB13A',
  moon: '#7C6FC4',
  sun: '#E9A23B',
  shirt: '#2A9D8F',
  bowl: '#D98B4E',
  shoe: '#93664A',
  backpack: '#D0619A',
  book: '#5C8FCB',
  bath: '#3FA7B5',
  bed: '#8B7BCB',
  apple: '#D9604A',
  music: '#B66DB8',
  ball: '#6AA84F',
  coat: '#C77F4A',
  door: '#7E8B5A',
  potty: '#56A0C9',
  heart: '#DB6F8E',
};

function draw(shapes: Shape[], color: string, weight: number) {
  return shapes.map((s, i) => (
    <Path
      key={i}
      d={s.d}
      stroke={color}
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={s.fill ? color : 'none'}
    />
  ));
}

export function Glyph({ name, size = 24, color, weight = 2 }: { name: UiGlyph; size?: number; color: string; weight?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {draw(UI[name], color, weight)}
    </Svg>
  );
}

/** A timer icon in its tinted circle. */
export function TimerIcon({ id, size = 44, dark = false }: { id: IconId; size?: number; dark?: boolean }) {
  const tint = ICON_TINT[id] ?? '#2A9D8F';
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Circle cx={22} cy={22} r={22} fill={tint} opacity={dark ? 0.28 : 0.16} />
      <G transform={`translate(9 9) scale(${26 / 24})`}>{draw(ICON[id] ?? ICON.heart, dark ? lighten(tint) : tint, 2.1)}</G>
    </Svg>
  );
}

function lighten(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * 0.35));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
