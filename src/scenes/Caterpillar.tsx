import React from 'react';
import { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { clamp01, LEAF, leafEdgeX, leafHalf, leafPath, wobble } from './geometry';
import { SceneProps, Sparkles, Window } from './parts';

const BODY = ['#F4B740', '#F0A83A'];

/**
 * A caterpillar eating a leaf from the tip to the stem. The leaf left is
 * the time left. At the end the caterpillar has turned into a butterfly.
 */
export default function Caterpillar({ f, t, dark, done, uid }: SceneProps) {
  const k = clamp01(f);
  const xe = leafEdgeX(k);
  const d = leafPath(k);
  const chew = done ? 0 : wobble(t, 7) * 1.5;
  // The head sits on the bite edge, a little above the midrib; the body trails back over the leaf.
  const hx = Math.min(xe + 4, LEAF.x1 - 6);
  const hy = LEAF.yc - 14 + chew;
  const segs = Array.from({ length: 7 }, (_, i) => {
    const x = hx - 20 - i * 15;
    const arch = Math.sin(t * 3.2 - i * 0.8) * (done ? 0 : 3.5);
    return { x, y: LEAF.yc - 10 - Math.max(0, arch), r: 13 - i * 0.6 };
  });
  return (
    <Window uid={uid} bg={<Rect x={0} y={0} width={300} height={300} fill={dark ? '#1E281F' : '#EEF4E1'} />}>
      <Defs>
        <LinearGradient id={`${uid}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8FCB66" />
          <Stop offset="1" stopColor="#5FA548" />
        </LinearGradient>
        <ClipPath id={`${uid}-leafclip`}>
          <Path d={d || 'M0 0Z'} />
        </ClipPath>
      </Defs>
      {/* soft hills of other leaves behind */}
      <Ellipse cx={40} cy={300} rx={120} ry={60} fill={dark ? '#26352A' : '#DCEACB'} />
      <Ellipse cx={270} cy={296} rx={110} ry={50} fill={dark ? '#223026' : '#E3EED4'} />
      {/* the twig */}
      <Path d="M-10 196Q20 182 58 172" stroke="#8C6440" strokeWidth={11} strokeLinecap="round" fill="none" />
      <Path d="M18 186Q8 160 22 140" stroke="#8C6440" strokeWidth={6} strokeLinecap="round" fill="none" />
      <Ellipse cx={26} cy={132} rx={14} ry={9} fill="#7DBB5B" transform="rotate(-40 26 132)" />
      {d ? (
        <G>
          <Path d={d} fill={`url(#${uid}-leaf)`} />
          <G clipPath={`url(#${uid}-leafclip)`}>
            <Line x1={LEAF.x0} y1={LEAF.yc} x2={LEAF.x1} y2={LEAF.yc} stroke="#4F8F3A" strokeWidth={3} strokeLinecap="round" />
            {[0.18, 0.34, 0.5, 0.66, 0.82].map((u) => {
              const x = LEAF.x0 + (LEAF.x1 - LEAF.x0) * u;
              const h = leafHalf(x + 14) * 0.8;
              return (
                <G key={u}>
                  <Path d={`M${x} ${LEAF.yc}Q${x + 10} ${LEAF.yc - h * 0.5} ${x + 22} ${LEAF.yc - h}`} stroke="#4F8F3A" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.7} />
                  <Path d={`M${x} ${LEAF.yc}Q${x + 10} ${LEAF.yc + h * 0.5} ${x + 22} ${LEAF.yc + h}`} stroke="#4F8F3A" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.7} />
                </G>
              );
            })}
            <Path d={`M${LEAF.x0 + 20} ${LEAF.yc - 30}Q${LEAF.x0 + 80} ${LEAF.yc - 58} ${LEAF.x0 + 150} ${LEAF.yc - 44}`} stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.18} />
          </G>
        </G>
      ) : null}
      {done ? (
        <G>
          <Butterfly x={150} y={104 + wobble(t, 1.4) * 6} t={t} />
          <Sparkles t={t} color="#F4B740" />
        </G>
      ) : (
        <G>
          {segs
            .slice()
            .reverse()
            .map((s, i) => (
              <G key={i}>
                <Circle cx={s.x} cy={s.y + s.r - 2} r={2.6} fill="#6B4A2B" />
                <Circle cx={s.x} cy={s.y} r={s.r} fill={BODY[(segs.length - 1 - i) % 2]} />
                <Circle cx={s.x - 3} cy={s.y - 4} r={2.4} fill="#FFE29A" opacity={0.9} />
              </G>
            ))}
          {/* head */}
          <Path d={`M${hx - 6} ${hy - 14}Q${hx - 10} ${hy - 32} ${hx - 16} ${hy - 34}`} stroke="#6B4A2B" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={`M${hx + 4} ${hy - 15}Q${hx + 6} ${hy - 32} ${hx + 12} ${hy - 35}`} stroke="#6B4A2B" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Circle cx={hx - 16} cy={hy - 34} r={3.5} fill="#EF8354" />
          <Circle cx={hx + 12} cy={hy - 35} r={3.5} fill="#EF8354" />
          <Circle cx={hx} cy={hy} r={17} fill="#EF8354" />
          <Circle cx={hx - 5} cy={hy - 4} r={5} fill="#FFFFFF" />
          <Circle cx={hx + 6} cy={hy - 4} r={5} fill="#FFFFFF" />
          <Circle cx={hx - 4} cy={hy - 3} r={2.6} fill="#2B2622" />
          <Circle cx={hx + 7} cy={hy - 3} r={2.6} fill="#2B2622" />
          <Circle cx={hx - 9} cy={hy + 6} r={3} fill="#F7A6A0" opacity={0.8} />
          <Circle cx={hx + 11} cy={hy + 6} r={3} fill="#F7A6A0" opacity={0.8} />
          <Path d={`M${hx - 2} ${hy + 8}Q${hx + 2} ${hy + 12 + chew} ${hx + 6} ${hy + 8}`} stroke="#7A3A22" strokeWidth={2} fill="none" strokeLinecap="round" />
        </G>
      )}
    </Window>
  );
}

function Butterfly({ x, y, t }: { x: number; y: number; t: number }) {
  const flap = 0.45 + 0.55 * Math.abs(Math.sin(t * 5));
  return (
    <G transform={`translate(${x} ${y})`}>
      <G transform={`scale(${flap} 1)`}>
        <Path d="M0 0C-30 -44 -66 -30 -58 -4C-52 14 -20 12 0 0Z" fill="#F4B740" />
        <Path d="M0 0C-26 8 -50 28 -36 44C-24 56 -6 30 0 0Z" fill="#EF8354" />
        <Path d="M0 0C30 -44 66 -30 58 -4C52 14 20 12 0 0Z" fill="#F4B740" />
        <Path d="M0 0C26 8 50 28 36 44C24 56 6 30 0 0Z" fill="#EF8354" />
        <Circle cx={-34} cy={-14} r={7} fill="#FFE29A" />
        <Circle cx={34} cy={-14} r={7} fill="#FFE29A" />
      </G>
      <Rect x={-4} y={-18} width={8} height={44} rx={4} fill="#6B4A2B" />
      <Path d="M-2 -18Q-8 -30 -14 -32M2 -18Q8 -30 14 -32" stroke="#6B4A2B" strokeWidth={2} fill="none" strokeLinecap="round" />
    </G>
  );
}
