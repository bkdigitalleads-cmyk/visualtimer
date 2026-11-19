import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { space, Theme, type } from '../theme';
import { BottomSheet, MainButton, QuietButton } from './Kit';

/**
 * Shown the first time child lock is turned on by hand (from the lock on a
 * running timer, or Settings' "Child lock when a timer starts"), and always
 * after a purchase started from the lock button, so nobody comes back to a
 * locked screen without knowing the way out. The flag is set only by the
 * main button (Lock now or Turn on); Not now leaves it for next time.
 */
export default function LockSheet({
  theme,
  visible,
  primaryLabel,
  onPrimary,
  onNotNow,
}: {
  theme: Theme;
  visible: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  onNotNow: () => void;
}) {
  return (
    <BottomSheet theme={theme} visible={visible} title="Child lock" onClose={onNotNow}>
      <View style={{ alignItems: 'center', marginBottom: space.l }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <HoldPicture theme={theme} />
      </View>
      <Text style={[type.body, { color: theme.ink, textAlign: 'center' }]}>
        While the timer runs, the screen ignores every touch, so little fingers cannot stop or change it.
      </Text>
      <Text style={[type.strong, { color: theme.ink, textAlign: 'center', marginTop: space.s, marginBottom: space.xl }]}>
        To unlock, a grown-up holds any corner of the screen for 2 seconds.
      </Text>
      <View style={{ gap: space.s }}>
        <MainButton theme={theme} label={primaryLabel} icon="lock" onPress={onPrimary} />
        <QuietButton theme={theme} label="Not now" onPress={onNotNow} />
      </View>
    </BottomSheet>
  );
}

/** A phone with the four corner marks the locked screen shows, and the hold ring filling in one corner. */
function HoldPicture({ theme }: { theme: Theme }) {
  const mark = (x: number, y: number, dx: number, dy: number) => `M${x} ${y + dy * 12}L${x} ${y}L${x + dx * 12} ${y}`;
  return (
    <Svg width={92} height={140} viewBox="0 0 92 140">
      <Rect x={4} y={4} width={84} height={132} rx={16} fill={theme.surface} stroke={theme.inkFaint} strokeWidth={2.5} />
      <Path d={mark(14, 14, 1, 1)} stroke={theme.inkFaint} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Path d={mark(78, 14, -1, 1)} stroke={theme.inkFaint} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Path d={mark(14, 126, 1, -1)} stroke={theme.inkFaint} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Path d={mark(78, 126, -1, -1)} stroke={theme.accent} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Circle cx={66} cy={114} r={14} stroke={theme.raised} strokeWidth={4} fill="none" />
      <Path d="M66 100A14 14 0 1 1 52 114" stroke={theme.accent} strokeWidth={4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
