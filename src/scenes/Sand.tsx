import React from 'react';
import { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { clamp01, lerp } from './geometry';
import { SceneProps, Sparkles, Window } from './parts';

const GLASS =
  'M104 52Q94 52 94 64L94 128Q94 146 128 162L143 170L143 182L157 182L157 170L172 162Q206 146 206 128L206 64Q206 52 196 52Z';

/**
 * A glass jar of sand with a little spout, emptying into a wooden bowl.
 * The sand in the jar is the time left; the heap in the bowl is the time
 * used. A thin stream runs while the timer runs.
 */
export default function Sand({ f, t, dark, done, uid }: SceneProps) {
  const k = clamp01(f);
  const level = lerp(184, 62, Math.pow(k, 0.85));
  const dip = k > 0.01 && k < 0.999 ? 9 : 0;
  const used = 1 - k;
  const moundH = 4 + used * 40;
  const moundW = 50 + used * 104;
  const sand = '#E8B04B';
  const sandDeep = '#D29637';
  const flowing = !done && k > 0.002 && k < 0.999;
  return (
    <Window uid={uid} bg={<Rect x={0} y={0} width={300} height={300} fill={dark ? '#2A241F' : '#F7EAD6'} />}>
      <Defs>
        <ClipPath id={`${uid}-glass`}>
          <Path d={GLASS} />
        </ClipPath>
      </Defs>
      {/* the shelf shadow */}
      <Ellipse cx={150} cy={286} rx={110} ry={10} fill={dark ? '#1C1814' : '#EAD8BE'} />
      {/* bowl, inside */}
      <Ellipse cx={150} cy={240} rx={86} ry={14} fill="#8A5634" />
      {/* the heap of sand in the bowl */}
      <Path d={`M${150 - moundW / 2} 241Q150 ${241 - moundH * 2} ${150 + moundW / 2} 241Z`} fill={sand} />
      <Path d={`M${150 - moundW / 4} 238Q150 ${240 - moundH * 1.6} ${150 + moundW / 6} 236`} stroke="#F3C877" strokeWidth={3} fill="none" strokeLinecap="round" opacity={used > 0.1 ? 0.8 : 0} />
      {/* bowl, front */}
      <Path d="M64 240Q150 262 236 240Q226 288 150 288Q74 288 64 240Z" fill="#B5774A" />
      <Path d="M80 254Q150 270 220 254" stroke="#C98F5F" strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* the stream */}
      {flowing ? (
        <G>
          <Rect x={148.5} y={182} width={3} height={Math.max(0, 241 - moundH * 1.1 - 182)} fill={sandDeep} rx={1.5} />
          {[0, 1, 2, 3].map((i) => {
            const len = Math.max(8, 241 - moundH * 1.1 - 186);
            const y = 186 + ((t * 70 + i * (len / 4)) % len);
            return <Circle key={i} cx={150 + (i % 2 ? 2.5 : -2.5)} cy={y} r={1.6} fill={sand} />;
          })}
        </G>
      ) : null}
      {/* the jar: glass behind, sand, glass front */}
      <Path d={GLASS} fill={dark ? '#3A4A4E' : '#E3F0F2'} opacity={0.55} />
      <G clipPath={`url(#${uid}-glass)`}>
        <Path
          d={`M80 ${level}Q150 ${level + dip * 2} 220 ${level}L220 200L80 200Z`}
          fill={sand}
        />
        <Path d={`M96 ${level + 8}Q120 ${level + 12} 132 ${level + 20}`} stroke="#F3C877" strokeWidth={3} fill="none" strokeLinecap="round" opacity={k > 0.15 ? 0.7 : 0} />
        <Circle cx={124} cy={level + 30} r={2} fill={sandDeep} opacity={k > 0.3 ? 0.6 : 0} />
        <Circle cx={176} cy={level + 44} r={2} fill={sandDeep} opacity={k > 0.4 ? 0.6 : 0} />
        <Circle cx={160} cy={level + 22} r={1.6} fill={sandDeep} opacity={k > 0.25 ? 0.6 : 0} />
      </G>
      <Path d={GLASS} fill="none" stroke={dark ? '#7FA9B2' : '#A9CDD4'} strokeWidth={4} strokeLinejoin="round" />
      <Path d="M106 72L106 124" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={dark ? 0.25 : 0.7} />
      <Path d="M106 136L110 142" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={dark ? 0.25 : 0.7} />
      {/* the lid */}
      <Rect x={98} y={34} width={104} height={22} rx={8} fill="#C9874E" />
      <Rect x={98} y={34} width={104} height={8} rx={4} fill="#D99B62" />
      {done ? <Sparkles t={t} color="#F3C877" /> : null}
    </Window>
  );
}
