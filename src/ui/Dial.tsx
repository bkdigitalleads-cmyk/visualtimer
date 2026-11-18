import React, { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';

/**
 * Set the minutes by turning: one full turn is 60 minutes, starting at
 * twelve o'clock. The colored arc is the time picked. It stops at 1 and at
 * 60 instead of wrapping round, and gives a small tick each minute. The
 * scene sits in the middle (children).
 */
export default function Dial({
  theme,
  size,
  minutes,
  onChange,
  children,
}: {
  theme: Theme;
  size: number;
  minutes: number;
  onChange: (m: number) => void;
  children?: React.ReactNode;
}) {
  const stroke = 16;
  const r = size / 2 - stroke / 2 - 6;
  const c = size / 2;
  const value = Math.max(0, Math.min(60, minutes));
  const last = useRef(value);
  last.current = value;

  const pick = (x: number, y: number) => {
    const dx = x - c;
    const dy = y - c;
    if (Math.hypot(dx, dy) < r * 0.35) return;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    let m = Math.round(deg / 6);
    const prev = last.current;
    // No wrapping: past 60 stays 60, back past 0 stays 1.
    if (prev >= 45 && m <= 15) m = 60;
    else if (prev <= 15 && m >= 45) m = 1;
    m = Math.max(1, Math.min(60, m === 0 ? (prev > 30 ? 60 : 1) : m));
    if (m !== prev) {
      last.current = m;
      Haptics.selectionAsync().catch(() => {});
      onChange(m);
    }
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderMove: (e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size]
  );

  const a = (value / 60) * 360;
  const rad = ((a - 90) * Math.PI) / 180;
  const kx = c + r * Math.cos(rad);
  const ky = c + r * Math.sin(rad);
  const arc =
    value >= 60
      ? `M${c} ${c - r}A${r} ${r} 0 1 1 ${c} ${c + r}A${r} ${r} 0 1 1 ${c} ${c - r}`
      : `M${c} ${c - r}A${r} ${r} 0 ${a > 180 ? 1 : 0} 1 ${kx} ${ky}`;

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Minutes"
      accessibilityValue={{ text: `${value} minute${value === 1 ? '' : 's'}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(60, value + 1));
        if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(1, value - 1));
      }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={c} cy={c} r={r} stroke={theme.raised} strokeWidth={stroke} fill="none" />
        {Array.from({ length: 12 }, (_, i) => {
          const t = ((i * 30 - 90) * Math.PI) / 180;
          return <Circle key={i} cx={c + r * Math.cos(t)} cy={c + r * Math.sin(t)} r={2} fill={theme.inkFaint} opacity={0.5} />;
        })}
        {value > 0 ? <Path d={arc} stroke={theme.accent} strokeWidth={stroke} strokeLinecap="round" fill="none" /> : null}
        <Circle cx={kx} cy={ky} r={stroke * 0.95} fill={theme.surface} stroke={theme.accent} strokeWidth={4} />
      </Svg>
      <View style={{ position: 'absolute', top: 32, left: 32, right: 32, bottom: 32, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        {children}
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} {...pan.panHandlers} />
    </View>
  );
}
