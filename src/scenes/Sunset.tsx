import React from 'react';
import { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { clamp01, lerp, mix } from './geometry';
import { SceneProps, SKY_STARS, Sparkles, Window } from './parts';

/** Sky colors at day, evening and night, top and bottom. */
const DAY = ['#8FCBEA', '#FCE9BF'];
const EVE = ['#E98E77', '#FBD08A'];
const NIGHT = ['#1E2350', '#4A3F70'];

function sky(k: number, i: 0 | 1): string {
  return k > 0.45 ? mix(EVE[i], DAY[i], (k - 0.45) / 0.55) : mix(NIGHT[i], EVE[i], k / 0.45);
}

/**
 * The sun going down behind the hills while the sky turns to evening and
 * then night. The height of the sun is the time left. At the end the moon
 * and the stars are out: good for quiet time and bedtime.
 */
export default function Sunset({ f, t, dark, done, uid }: SceneProps) {
  const k = clamp01(f);
  // Straight down, so the sun is half behind the hills at a quarter left and gone at the end.
  const sx = lerp(118, 176, 1 - k);
  const sy = lerp(70, 256, 1 - k);
  const sun = mix('#F98B5A', '#FFD25E', k);
  const starOpacity = done ? 1 : Math.max(0, (0.35 - k) / 0.35);
  const dim = dark ? 0.25 : 0;
  return (
    <Window
      uid={uid}
      bg={
        <G>
          <Defs>
            <LinearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={mix(sky(k, 0), '#000000', dim)} />
              <Stop offset="1" stopColor={mix(sky(k, 1), '#000000', dim)} />
            </LinearGradient>
            <RadialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={sun} stopOpacity={0.5} />
              <Stop offset="1" stopColor={sun} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={300} height={300} fill={`url(#${uid}-sky)`} />
        </G>
      }
    >
      {SKY_STARS.map(([x, y, r], i) => (
        <Circle key={i} cx={x} cy={y} r={r} fill="#FFF6DA" opacity={starOpacity * (0.5 + 0.4 * Math.sin(t * 1.4 + i * 2.1))} />
      ))}
      {starOpacity > 0 ? <Path d="M236 34A26 26 0 1 0 266 70A20 20 0 1 1 236 34Z" fill="#F3E7C4" opacity={starOpacity} /> : null}
      <Circle cx={sx} cy={sy} r={78} fill={`url(#${uid}-glow)`} />
      <Circle cx={sx} cy={sy} r={34} fill={sun} />
      {/* the hills, back to front, darkening with the evening */}
      <Path d="M-20 214Q60 166 150 206Q220 236 320 190L320 320L-20 320Z" fill={mix(mix('#3B4466', '#86B67C', k), '#000000', dim)} />
      <Path d="M-20 246Q80 206 170 246Q240 272 320 236L320 320L-20 320Z" fill={mix(mix('#2C3452', '#5F9B62', k), '#000000', dim)} />
      {/* a little house with a lit window once it gets dark */}
      <G transform="translate(214 222)">
        <Rect x={0} y={10} width={34} height={26} fill={mix(mix('#3D3A52', '#F6E7CF', k), '#000000', dim)} />
        <Path d="M-4 12L17 -6L38 12Z" fill={mix('#6D4A5A', '#EA7B5B', k)} />
        <Rect x={11} y={18} width={12} height={10} rx={2} fill={k < 0.5 ? '#FFD873' : '#BFE0EE'} />
      </G>
      {done ? <Sparkles t={t} color="#F3E7C4" /> : null}
    </Window>
  );
}
