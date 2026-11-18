import React from 'react';
import { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { starPath, starsLit } from './geometry';
import { SceneProps, SKY_STARS, Sparkles, Window } from './parts';

export const STAR_COUNT = 10;
const SPOTS: [number, number][] = [];
for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) SPOTS.push([42 + i * 54, 122 + row * 84]);

/**
 * Ten stars in two rows. They go out one by one from the last; the one
 * going out drains from the top, so a child sees exactly how much of it is
 * left. At the end the sky has its moon.
 */
export default function Stars({ f, t, dark, done, uid }: SceneProps) {
  const { full, part } = starsLit(f, STAR_COUNT);
  return (
    <Window
      uid={uid}
      bg={
        <G>
          <Defs>
            <LinearGradient id={`${uid}-night`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={dark ? '#151B3A' : '#2B3672'} />
              <Stop offset="1" stopColor={dark ? '#262A55' : '#4A4F94'} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={300} height={300} fill={`url(#${uid}-night)`} />
        </G>
      }
    >
      {SKY_STARS.map(([x, y, r], i) => (
        <Circle key={i} cx={x} cy={y * 0.5 + 4} r={r * 0.8} fill="#FFF6DA" opacity={0.25 + 0.25 * Math.sin(t * 1.3 + i)} />
      ))}
      {SPOTS.map(([x, y], i) => {
        const lit = done ? 0 : i < full ? 1 : i === full ? part : 0;
        const tw = lit === 1 ? 1 + 0.05 * Math.sin(t * 2.2 + i * 1.3) : 1;
        const d = starPath(0, 0, 24, 11);
        return (
          <G key={i} transform={`translate(${x} ${y}) scale(${tw})`}>
            <Defs>
              <ClipPath id={`${uid}-s${i}`}>
                <Rect x={-30} y={24 - 48 * lit} width={60} height={48 * lit + 2} />
              </ClipPath>
            </Defs>
            <Path d={d} fill={dark ? '#2F3767' : '#3D4787'} stroke={dark ? '#4B5596' : '#6470B5'} strokeWidth={2.5} strokeLinejoin="round" />
            {lit > 0 ? (
              <G clipPath={`url(#${uid}-s${i})`}>
                <Path d={d} fill="#FFD45C" stroke="#FFE59A" strokeWidth={2.5} strokeLinejoin="round" />
                <Path d={starPath(-3, -4, 9, 4)} fill="#FFF1B8" opacity={0.8} />
              </G>
            ) : null}
          </G>
        );
      })}
      {done ? (
        <G>
          <Path d="M150 30A30 30 0 1 0 186 70A24 24 0 1 1 150 30Z" fill="#F3E7C4" />
          <Sparkles t={t} color="#FFD45C" />
        </G>
      ) : null}
    </Window>
  );
}
