import React from 'react';
import { Circle, ClipPath, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { clamp01, lerp, wobble } from './geometry';
import { SceneProps, Sparkles, Window } from './parts';

/**
 * A striped candle on a little dish, burning down. The candle left is the
 * time left. At the end the flame is out and a thread of smoke curls up.
 */
export default function Candle({ f, t, dark, done, uid }: SceneProps) {
  const k = clamp01(f);
  const base = 252;
  const h = lerp(16, 172, k);
  const top = base - h;
  const x0 = 124;
  const w = 52;
  const flick = done ? 0 : wobble(t, 9);
  const sway = done ? 0 : wobble(t, 4, 1.3) * 1.6;
  const fh = 36 * (1 + 0.08 * flick);
  const fx = 150 + sway;
  const fy = top - 10;
  return (
    <Window uid={uid} bg={<Rect x={0} y={0} width={300} height={300} fill={dark ? '#221C2C' : '#F1E8F4'} />}>
      <Defs>
        <RadialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFD873" stopOpacity={dark ? 0.55 : 0.45} />
          <Stop offset="1" stopColor="#FFD873" stopOpacity={0} />
        </RadialGradient>
        <ClipPath id={`${uid}-wax`}>
          <Rect x={x0} y={top} width={w} height={h + 2} rx={10} />
        </ClipPath>
      </Defs>
      {/* a window behind, for warmth */}
      <Rect x={196} y={36} width={74} height={92} rx={14} fill={dark ? '#2E2740' : '#E4D6EC'} />
      <Path d="M233 36L233 128M196 82L270 82" stroke={dark ? '#221C2C' : '#F1E8F4'} strokeWidth={6} />
      {dark ? <Circle cx={252} cy={58} r={9} fill="#F3E3B3" opacity={0.8} /> : null}
      {!done ? <Circle cx={fx} cy={fy - 6} r={84 + flick * 4} fill={`url(#${uid}-glow)`} /> : null}
      {/* the dish */}
      <Ellipse cx={150} cy={256} rx={78} ry={16} fill="#B98A5A" />
      <Ellipse cx={150} cy={252} rx={66} ry={11} fill="#D2A673" />
      <Path d="M220 258Q246 262 250 252Q252 244 238 246" stroke="#B98A5A" strokeWidth={7} fill="none" strokeLinecap="round" />
      {/* the candle */}
      <Rect x={x0} y={top} width={w} height={h + 2} rx={10} fill="#F6D9E3" />
      <G clipPath={`url(#${uid}-wax)`}>
        {Array.from({ length: 9 }, (_, i) => (
          <Path key={i} d={`M${x0 - 20} ${base - i * 24 + 10}L${x0 + w + 20} ${base - i * 24 - 16}`} stroke="#E9A9C0" strokeWidth={8} />
        ))}
        <Rect x={x0 + 6} y={top} width={8} height={h} fill="#FFFFFF" opacity={0.35} />
      </G>
      <Ellipse cx={150} cy={top + 3} rx={w / 2 - 2} ry={6} fill="#EFC2D2" />
      {h > 40 ? (
        <G>
          <Path d={`M${x0 + 4} ${top + 4}Q${x0 + 2} ${top + 26} ${x0 + 6} ${top + 30}Q${x0 + 12} ${top + 28} ${x0 + 11} ${top + 6}Z`} fill="#FBE7EE" />
          <Path d={`M${x0 + w - 12} ${top + 5}Q${x0 + w - 13} ${top + 16} ${x0 + w - 8} ${top + 18}Q${x0 + w - 4} ${top + 14} ${x0 + w - 5} ${top + 4}Z`} fill="#FBE7EE" />
        </G>
      ) : null}
      {/* wick */}
      <Path d={`M150 ${top + 2}Q151 ${top - 5} ${150 + sway * 0.5} ${top - 10}`} stroke="#4A3A33" strokeWidth={3} strokeLinecap="round" fill="none" />
      {done ? (
        <G>
          {[0, 1, 2].map((i) => {
            const c = (t * 0.35 + i / 3) % 1;
            const y = top - 14 - c * 90;
            const x = 150 + Math.sin(c * 7 + i) * 10;
            return <Circle key={i} cx={x} cy={y} r={5 + c * 10} fill={dark ? '#8A7F94' : '#C9BCD1'} opacity={0.55 * (1 - c)} />;
          })}
          <Sparkles t={t} color="#F2B43D" />
        </G>
      ) : (
        <G transform={`translate(${fx} ${fy}) scale(${1 + flick * 0.03} 1)`}>
          <Path d={`M0 ${-fh}C14 ${-fh * 0.5} 15 -4 0 4C-15 -4 -14 ${-fh * 0.5} 0 ${-fh}Z`} fill="#F7A13B" />
          <Path d={`M0 ${-fh * 0.62}C8 ${-fh * 0.3} 8 -2 0 3C-8 -2 -8 ${-fh * 0.3} 0 ${-fh * 0.62}Z`} fill="#FFE07A" />
          <Ellipse cx={0} cy={0} rx={3.5} ry={4.5} fill="#8FB4E8" opacity={0.8} />
        </G>
      )}
    </Window>
  );
}
