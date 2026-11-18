import React from 'react';
import { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { clamp01, lerp, wobble } from './geometry';
import { SceneProps, Sparkles, Window } from './parts';

const X0 = 106;
const W = 88;
const BOTTOM = 210;
const FULL = 172;

/**
 * A three-color ice pop on a stick, melting in the sun. The pop left is the
 * time left; the puddle under it is the time used. At the end only the
 * stick is left, in the puddle.
 */
export default function IcePop({ f, t, dark, done, uid }: SceneProps) {
  const k = clamp01(f);
  const h = lerp(0, FULL, k);
  const top = BOTTOM - h;
  const used = 1 - k;
  const rx = 14 + used * 70;
  const r = Math.min(40, h / 2);
  const shape = h > 1 ? `M${X0} ${BOTTOM}L${X0} ${top + r}Q${X0} ${top} ${X0 + r} ${top}L${X0 + W - r} ${top}Q${X0 + W} ${top} ${X0 + W} ${top + r}L${X0 + W} ${BOTTOM}Z` : '';
  const melting = !done && k < 0.999 && h > 14;
  return (
    <Window uid={uid} bg={<Rect x={0} y={0} width={300} height={300} fill={dark ? '#2A221C' : '#FFF1DB'} />}>
      <Defs>
        <ClipPath id={`${uid}-pop`}>
          <Path d={shape || 'M0 0Z'} />
        </ClipPath>
      </Defs>
      {/* the sun */}
      <Circle cx={252} cy={48} r={dark ? 22 : 30} fill={dark ? '#F3E3B3' : '#FFD66B'} />
      {!dark
        ? Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4 + t * 0.15;
            return (
              <Path
                key={i}
                d={`M${252 + Math.cos(a) * 40} ${48 + Math.sin(a) * 40}L${252 + Math.cos(a) * 52} ${48 + Math.sin(a) * 52}`}
                stroke="#FFD66B"
                strokeWidth={5}
                strokeLinecap="round"
              />
            );
          })
        : null}
      {/* the table edge */}
      <Rect x={0} y={262} width={300} height={40} fill={dark ? '#3A2E26' : '#F3DDBD'} />
      {/* the puddle */}
      <Ellipse cx={150} cy={268} rx={rx} ry={rx * 0.2} fill="#E86A8A" opacity={0.55} />
      <Ellipse cx={150 - rx * 0.25} cy={266} rx={rx * 0.45} ry={rx * 0.08} fill="#F7A35C" opacity={0.6} />
      {/* the stick */}
      <Rect x={140} y={done ? 196 : 150} width={20} height={done ? 74 : 112} rx={10} fill="#DDB27A" />
      <Rect x={144} y={done ? 202 : 160} width={4} height={done ? 56 : 96} rx={2} fill="#EBC694" />
      {shape ? (
        <G>
          <G clipPath={`url(#${uid}-pop)`}>
            <Rect x={X0} y={BOTTOM - FULL - 2} width={W} height={64} fill="#E86A8A" />
            <Rect x={X0} y={BOTTOM - FULL + 60} width={W} height={56} fill="#F7A35C" />
            <Rect x={X0} y={BOTTOM - FULL + 114} width={W} height={60} fill="#FFD36B" />
            <Rect x={X0 + 10} y={BOTTOM - FULL} width={10} height={FULL - 16} rx={5} fill="#FFFFFF" opacity={0.35} />
            {/* a sleepy smile on the bottom band */}
            <Path d="M134 176Q138 181 142 176M158 176Q162 181 166 176" stroke="#8A4B2E" strokeWidth={3} fill="none" strokeLinecap="round" />
            <Path d="M144 188Q150 194 156 188" stroke="#8A4B2E" strokeWidth={3} fill="none" strokeLinecap="round" />
            <Circle cx={128} cy={186} r={4} fill="#F59A8C" opacity={0.7} />
            <Circle cx={172} cy={186} r={4} fill="#F59A8C" opacity={0.7} />
          </G>
          {/* drips hanging off the bottom */}
          {melting
            ? [
                [116, 10],
                [150, 14],
                [180, 8],
              ].map(([x, len], i) => {
                const l = len + wobble(t, 1.2, i) * 3;
                return <Path key={i} d={`M${x - 6} ${BOTTOM - 2}L${x - 4} ${BOTTOM + l - 4}Q${x} ${BOTTOM + l + 4} ${x + 4} ${BOTTOM + l - 4}L${x + 6} ${BOTTOM - 2}Z`} fill={i === 1 ? '#FFD36B' : '#FFC95A'} />;
              })
            : null}
          {melting
            ? [0, 1].map((i) => {
                const c = (t * 0.9 + i * 0.5) % 1;
                return <Circle key={i} cx={i ? 180 : 116} cy={BOTTOM + 16 + c * 46} r={3.5} fill="#F7A35C" opacity={1 - c * 0.6} />;
              })
            : null}
        </G>
      ) : null}
      {done ? <Sparkles t={t} color="#E86A8A" /> : null}
    </Window>
  );
}
