import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { space, Theme, type } from '../theme';
import { canStepHMS, clampSeconds, durationWords, HMS, MIN_SECONDS, splitHMS, stepHMS } from '../model';
import { Glyph } from './Glyph';
import { BottomSheet, MainButton, tick } from './Kit';

/**
 * Set any time from 5 seconds to 4 hours: hours, minutes and seconds, each
 * with a big minus and plus (hold one down and it keeps going), and Done at
 * the bottom where the thumb is. Free for everyone. Used by the timer
 * screen (the Custom chip and the time under the dial), the saved timer
 * editor and routine steps.
 */
export default function TimeSheet({
  theme,
  visible,
  seconds,
  onDone,
  onClose,
}: {
  theme: Theme;
  visible: boolean;
  seconds: number;
  onDone: (seconds: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(seconds);
  useEffect(() => {
    if (visible) setValue(seconds);
  }, [visible, seconds]);
  const hms = splitHMS(value);
  const tooShort = value < MIN_SECONDS;
  return (
    <BottomSheet theme={theme} visible={visible} title="Custom time" onClose={onClose}>
      <Text
        style={[type.clock, { color: tooShort ? theme.inkFaint : theme.ink, fontSize: 34, textAlign: 'center', marginBottom: space.l }]}
        accessibilityLiveRegion="polite"
      >
        {tooShort ? 'At least 5 seconds' : durationWords(value)}
      </Text>
      <View style={{ gap: space.m, marginBottom: space.xl }}>
        <Stepper theme={theme} label="Hours" part="h" hms={hms} value={value} onChange={setValue} />
        <Stepper theme={theme} label="Minutes" part="m" hms={hms} value={value} onChange={setValue} />
        <Stepper theme={theme} label="Seconds" part="s" hms={hms} value={value} onChange={setValue} />
      </View>
      <MainButton theme={theme} label="Done" onPress={() => onDone(clampSeconds(value))} />
    </BottomSheet>
  );
}

function Stepper({
  theme,
  label,
  part,
  hms,
  value,
  onChange,
}: {
  theme: Theme;
  label: string;
  part: keyof HMS;
  hms: HMS;
  value: number;
  onChange: (s: number) => void;
}) {
  const current = useRef(value);
  current.current = value;
  const n = hms[part];
  const unit = part === 'h' ? (n === 1 ? 'hour' : 'hours') : part === 'm' ? (n === 1 ? 'minute' : 'minutes') : n === 1 ? 'second' : 'seconds';
  return (
    <View style={styles.row} accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: `${n} ${unit}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(stepHMS(current.current, part, e.nativeEvent.actionName === 'increment' ? 1 : -1))}
    >
      <Text style={[type.strong, { color: theme.inkSoft, width: 84 }]}>{label}</Text>
      <StepButton theme={theme} glyph="minus" disabled={!canStepHMS(value, part, -1)} onStep={() => onChange(stepHMS(current.current, part, -1))} />
      <Text style={[type.clock, styles.value, { color: theme.ink }]}>{part === 'h' ? n : String(n).padStart(2, '0')}</Text>
      <StepButton theme={theme} glyph="plus" disabled={!canStepHMS(value, part, 1)} onStep={() => onChange(stepHMS(current.current, part, 1))} />
    </View>
  );
}

/** A big round minus or plus. A press steps once; holding it keeps stepping. */
function StepButton({ theme, glyph, disabled, onStep }: { theme: Theme; glyph: 'minus' | 'plus'; disabled: boolean; onStep: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const step = useRef(onStep);
  step.current = onStep;
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const repeat = (delay: number) => {
    timer.current = setTimeout(() => {
      step.current();
      tick();
      repeat(Math.max(70, delay * 0.8));
    }, delay);
  };
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        step.current();
        tick();
        repeat(420);
      }}
      onPressOut={stop}
      importantForAccessibility="no"
      accessibilityElementsHidden
      hitSlop={6}
      style={({ pressed }) => [styles.btn, { backgroundColor: theme.raised, opacity: disabled ? 0.35 : pressed ? 0.7 : 1 }]}
    >
      <Glyph name={glyph} color={theme.ink} size={26} weight={2.6} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { fontSize: 40, width: 72, textAlign: 'center' },
  btn: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
