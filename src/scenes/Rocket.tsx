import React from 'react';
import { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { clamp01, tripDots, tripPoint, TRIP, wobble } from './geometry';
import { SceneProps, SKY_STARS, Sparkles, Window } from './parts';

/**
 * A little rocket on its way from a hill to the moon. The dotted path
 * ahead is the time left. At the end it has landed and put up its flag.
 */
export default function Rocket({ f, t, dark, done, uid }: SceneProps) {
  const k = 1 - clamp01(f);
  const p = done ? { x: 236, y: 92, angle: 28 } : tripPoint(k);
  const trail: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const q = tripPoint((k * i) / 24);
    trail.push(`${q.x.toFixed(1)} ${q.y.toFixed(1)}`);
  }
  const dots = done ? [] : tripDots(k, Math.max(0, Math.round(12 * (1 - k))));
  const flame = done ? 0 : 1 + 0.18 * wobble(t, 14);
  return (
    <Window
      uid={uid}
      bg={
        <G>
          <Defs>
            <LinearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={dark ? '#141A3C' : '#2B3672'} />
              <Stop offset="1" stopColor={dark ? '#2D2F63' : '#5B5FA6'} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={300} height={300} fill={`url(#${uid}-sky)`} />
        </G>
      }
    >
      {SKY_STARS.map(([x, y, r], i) => (
        <Circle key={i} cx={x} cy={y} r={r} fill="#FFF6DA" opacity={0.45 + 0.4 * Math.sin(t * 1.6 + i * 1.9)} />
      ))}
      {/* the moon */}
      <Circle cx={250} cy={58} r={40} fill="#F3E7C4" />
      <Circle cx={236} cy={46} r={8} fill="#E2D3A8" />
      <Circle cx={262} cy={70} r={6} fill="#E2D3A8" />
      <Circle cx={266} cy={40} r={4} fill="#E2D3A8" />
      {/* the hill and the launch pad */}
      <Path d="M-20 300L-20 248Q40 214 112 236Q160 252 190 300Z" fill={dark ? '#2C5A4C' : '#3F8068'} />
      <Path d="M-20 300L-20 270Q60 250 130 278L150 300Z" fill={dark ? '#24493E' : '#346C58'} />
      <Rect x={46} y={244} width={32} height={6} rx={3} fill="#C9C3D9" />
      <Rect x={50} y={250} width={4} height={14} fill="#A7A1BB" />
      <Rect x={70} y={250} width={4} height={14} fill="#A7A1BB" />
      {/* where it has been, and the dots still to go */}
      {k > 0.01 && !done ? <Path d={`M${trail.join('L')}`} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={8} strokeLinecap="round" fill="none" /> : null}
      {dots.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3.2} fill="#FFE29A" opacity={0.85} />
      ))}
      {done ? (
        <G>
          <Path d="M262 38L262 14" stroke="#F3ECE1" strokeWidth={3} strokeLinecap="round" />
          <Path d="M262 14L282 20L262 26Z" fill="#EA7B5B" />
        </G>
      ) : null}
      <G transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`}>
        {flame > 0 ? (
          <G transform={`scale(1 ${flame})`}>
            <Path d="M-8 22Q0 52 8 22Z" fill="#F7A13B" />
            <Path d="M-4 22Q0 38 4 22Z" fill="#FFE07A" />
          </G>
        ) : null}
        <Path d="M-11 10L-20 24L-11 22Z" fill="#EA7B5B" />
        <Path d="M11 10L20 24L11 22Z" fill="#EA7B5B" />
        <Path d="M0 -30C14 -18 13 6 11 22L-11 22C-13 6 -14 -18 0 -30Z" fill="#F4F1EA" />
        <Path d="M0 -30C7 -24 10 -18 11 -13L-11 -13C-10 -18 -7 -24 0 -30Z" fill="#EA7B5B" />
        <Circle cx={0} cy={-1} r={7} fill="#2A9D8F" />
        <Circle cx={0} cy={-1} r={7} fill="none" stroke="#CFC6D8" strokeWidth={2.5} />
        <Circle cx={-2} cy={-3} r={2} fill="#FFFFFF" opacity={0.7} />
        <Rect x={-11} y={18} width={22} height={5} rx={2} fill="#CFC6D8" />
      </G>
      {done ? <Sparkles t={t} color="#FFE29A" /> : null}
    </Window>
  );
}
