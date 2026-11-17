import React from 'react';
import { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { mix, polar, wedgeEdge, wedgePath } from './geometry';
import { SceneProps, Sparkles, Window } from './parts';

/**
 * The color disc: a soft plate with a wedge of color that gets smaller as
 * time goes. The whole disc is always the whole timer (5 minutes or 45),
 * so a full disc always means "just started". The empty part opens
 * clockwise from the top. No numbers or minute marks round the edge.
 */
export default function Wedge({ f, t, color, dark, done, uid }: SceneProps) {
  const cx = 150;
  const cy = 150;
  const R = 112;
  const bg = dark ? mix(color, '#1C1916', 0.86) : mix(color, '#FFFFFF', 0.86);
  const rim = dark ? mix(color, '#1C1916', 0.64) : mix(color, '#FFFFFF', 0.62);
  const plate = dark ? mix(color, '#1C1916', 0.78) : mix(color, '#FFFFFF', 0.93);
  const deep = mix(color, '#000000', 0.22);
  const [ex, ey] = wedgeEdge(cx, cy, R - 4, f);
  const knob = dark ? '#F3ECE1' : '#FFFAF2';
  return (
    <Window uid={uid} bg={<Rect x={0} y={0} width={300} height={300} fill={bg} />}>
      <Circle cx={cx} cy={cy + 5} r={R + 16} fill={mix(rim, '#000000', 0.08)} opacity={0.35} />
      <Circle cx={cx} cy={cy} r={R + 16} fill={rim} />
      <Circle cx={cx} cy={cy} r={R + 2} fill={plate} />
      {[0, 90, 180, 270].map((a) => {
        const [x, y] = polar(cx, cy, R + 9, a);
        return <Circle key={a} cx={x} cy={y} r={3.5} fill={plate} />;
      })}
      <Path d={wedgePath(cx, cy, R - 4, f)} fill={color} />
      {f > 0.002 && f < 0.998 ? (
        <Line x1={cx} y1={cy} x2={ex} y2={ey} stroke={deep} strokeWidth={5} strokeLinecap="round" />
      ) : null}
      {f >= 0.998 ? <Line x1={cx} y1={cy} x2={cx} y2={cy - R + 4} stroke={deep} strokeWidth={5} strokeLinecap="round" /> : null}
      <Circle cx={cx} cy={cy} r={21} fill={knob} />
      <Circle cx={cx} cy={cy} r={21} fill="none" stroke={deep} strokeOpacity={0.15} strokeWidth={2} />
      <Circle cx={cx} cy={cy} r={8} fill={deep} />
      {done ? (
        <G>
          <Sparkles t={t} color={color} />
        </G>
      ) : null}
    </Window>
  );
}
