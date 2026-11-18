import React from 'react';
import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { clamp01, lerp } from './geometry';
import { SceneProps, Sparkles, Window } from './parts';

const RAIL_Y = 226;
const START = 92;
const END = 228;

function Wheel({ x, y, r, a }: { x: number; y: number; r: number; a: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${a})`}>
      <Circle cx={0} cy={0} r={r} fill="#3E3A44" />
      <Circle cx={0} cy={0} r={r - 3} fill="#5B5662" />
      <Line x1={-r + 3} y1={0} x2={r - 3} y2={0} stroke="#3E3A44" strokeWidth={2.5} />
      <Line x1={0} y1={-r + 3} x2={0} y2={r - 3} stroke="#3E3A44" strokeWidth={2.5} />
      <Circle cx={0} cy={0} r={2.5} fill="#C9C3D0" />
    </G>
  );
}

/**
 * A little train on its way to the station. The track between the engine
 * and the station is the time left. At the end it is at the platform.
 */
export default function Train({ f, t, dark, done, uid }: SceneProps) {
  const k = 1 - clamp01(f);
  const front = done ? END : lerp(START, END, k);
  const moving = !done && k > 0.001 && k < 0.999;
  const spin = moving ? t * 200 : 0;
  const bob = moving ? Math.sin(t * 16) * 0.8 : 0;
  const ex = front - 66; // engine's back
  return (
    <Window uid={uid} bg={<Rect x={0} y={0} width={300} height={300} fill={dark ? '#1C2436' : '#DCEEF6'} />}>
      {/* clouds drifting */}
      {[0, 1].map((i) => {
        const x = ((t * (4 + i * 2) + i * 160) % 380) - 60;
        return (
          <G key={i} opacity={dark ? 0.25 : 0.9}>
            <Ellipse cx={x} cy={52 + i * 34} rx={30} ry={13} fill="#FFFFFF" />
            <Ellipse cx={x + 22} cy={46 + i * 34} rx={20} ry={13} fill="#FFFFFF" />
          </G>
        );
      })}
      {dark ? <Circle cx={60} cy={56} r={14} fill="#F3E3B3" /> : null}
      {/* hills */}
      <Ellipse cx={70} cy={232} rx={140} ry={70} fill={dark ? '#24382F' : '#A9D59A'} />
      <Ellipse cx={250} cy={236} rx={120} ry={56} fill={dark ? '#1F3229' : '#93C887'} />
      <Rect x={0} y={226} width={300} height={80} fill={dark ? '#2B2A24' : '#D9C7A5'} />
      {/* the station */}
      <Rect x={230} y={150} width={62} height={58} rx={4} fill={dark ? '#C9B79B' : '#F6E7CF'} />
      <Path d="M222 154L261 122L300 154Z" fill="#EA7B5B" />
      <Rect x={252} y={176} width={16} height={32} rx={3} fill="#8C6440" />
      <Rect x={234} y={164} width={14} height={14} rx={3} fill={dark ? '#F3D98A' : '#BFE0EE'} />
      <Path d="M261 122L261 100" stroke="#6B5B4E" strokeWidth={3} strokeLinecap="round" />
      <Path d={`M261 100L${279 + (done ? Math.sin(t * 5) * 3 : 0)} 106L261 112Z`} fill="#2A9D8F" />
      <Rect x={224} y={206} width={76} height={10} fill={dark ? '#8E8476' : '#B9AA92'} />
      {/* the track */}
      {Array.from({ length: 20 }, (_, i) => (
        <Rect key={i} x={i * 16 - 2} y={RAIL_Y - 2} width={9} height={12} rx={2} fill="#8C6440" />
      ))}
      <Rect x={0} y={RAIL_Y} width={300} height={4} fill="#7C7484" />
      {/* steam */}
      {(moving || done) &&
        [0, 1, 2].map((i) => {
          const c = (t * (moving ? 0.8 : 0.4) + i / 3) % 1;
          return <Circle key={i} cx={front - 18 - c * 26} cy={150 - c * 44} r={6 + c * 12} fill="#FFFFFF" opacity={(dark ? 0.5 : 0.85) * (1 - c)} />;
        })}
      <G transform={`translate(0 ${bob})`}>
        {/* the car */}
        <Rect x={ex - 70} y={180} width={62} height={34} rx={8} fill="#F2B43D" />
        <Rect x={ex - 62} y={186} width={20} height={14} rx={4} fill={dark ? '#F3D98A' : '#FFF6DA'} />
        <Rect x={ex - 36} y={186} width={20} height={14} rx={4} fill={dark ? '#F3D98A' : '#FFF6DA'} />
        <Rect x={ex - 8} y={204} width={12} height={4} fill="#5B5662" />
        {/* the engine */}
        <Rect x={ex} y={162} width={30} height={52} rx={6} fill="#2A9D8F" />
        <Rect x={ex + 6} y={170} width={18} height={16} rx={4} fill={dark ? '#F3D98A' : '#FFF6DA'} />
        <Rect x={ex - 4} y={156} width={38} height={9} rx={4} fill="#1F7F74" />
        <Rect x={ex + 28} y={184} width={36} height={30} rx={10} fill="#3BB3A3" />
        <Rect x={ex + 46} y={164} width={10} height={22} rx={3} fill="#3E3A44" />
        <Rect x={ex + 43} y={160} width={16} height={7} rx={3} fill="#3E3A44" />
        <Circle cx={front - 1} cy={196} r={4} fill="#FFE29A" />
        <Path d={`M${front - 2} 214L${front + 8} 222L${front - 6} 222Z`} fill="#EA7B5B" />
      </G>
      <Wheel x={ex - 54} y={216} r={9} a={spin} />
      <Wheel x={ex - 24} y={216} r={9} a={spin} />
      <Wheel x={ex + 12} y={214} r={12} a={spin} />
      <Wheel x={ex + 48} y={217} r={9} a={spin} />
      {done ? <Sparkles t={t} color="#F2B43D" /> : null}
    </Window>
  );
}
