import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Pressable,
  PressableProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { radius, space, Theme, type } from '../theme';
import { Glyph, UiGlyph } from './Glyph';
import { ModalLayer } from './Layer';

/**
 * The app's own small kit. Tap is the only way something becomes tappable,
 * always with a pressed state. Sizes: the main button is 60 points tall,
 * every other target at least 44.
 */

export function tick(): void {
  Haptics.selectionAsync().catch(() => {});
}

export function Tap({ style, children, haptic = false, onPress, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; haptic?: boolean }) {
  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        if (haptic) tick();
        onPress?.(e);
      }}
      style={({ pressed }) => [style, { opacity: rest.disabled ? 0.45 : pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {children}
    </Pressable>
  );
}

export function MainButton({ theme, label, onPress, disabled, icon }: { theme: Theme; label: string; onPress: () => void; disabled?: boolean; icon?: UiGlyph }) {
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      haptic
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.main, { backgroundColor: theme.accent }]}
    >
      {icon ? <Glyph name={icon} color={theme.onAccent} size={22} weight={2.4} /> : null}
      <Text style={[type.strong, { color: theme.onAccent, fontSize: 19 }]}>{label}</Text>
    </Tap>
  );
}

export function QuietButton({ theme, label, onPress, icon, danger }: { theme: Theme; label: string; onPress: () => void; icon?: UiGlyph; danger?: boolean }) {
  const c = danger ? theme.danger : theme.ink;
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.quiet, { backgroundColor: theme.raised }]}>
      {icon ? <Glyph name={icon} color={c} size={18} /> : null}
      <Text style={[type.strong, { color: c, fontSize: 16 }]}>{label}</Text>
    </Tap>
  );
}

/** A round icon button, for the run screen's controls and headers. */
export function RoundButton({
  theme,
  icon,
  label,
  onPress,
  size = 56,
  filled = false,
  text,
}: {
  theme: Theme;
  icon?: UiGlyph;
  label: string;
  onPress: () => void;
  size?: number;
  filled?: boolean;
  /** Short text instead of a glyph: "+1", "+5". */
  text?: string;
}) {
  const fg = filled ? theme.onAccent : theme.ink;
  return (
    <Tap
      onPress={onPress}
      haptic
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: filled ? theme.accent : theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: filled ? 0 : 1, borderColor: theme.edge }}
    >
      {text ? (
        <Text style={{ fontFamily: 'Fredoka-SemiBold', fontSize: size * 0.34, color: fg }}>{text}</Text>
      ) : icon ? (
        <Glyph name={icon} color={fg} size={size * 0.44} weight={2.3} />
      ) : null}
    </Tap>
  );
}

export function Chip({ theme, label, sub, active, onPress, locked, style }: { theme: Theme; label: string; sub?: string; active?: boolean; onPress: () => void; locked?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Tap
      onPress={onPress}
      haptic
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={`${label}${sub ? ` ${sub}` : ''}${locked ? ', Pro' : ''}`}
      style={[
        styles.chip,
        { backgroundColor: active ? theme.accentSoft : theme.surface, borderColor: active ? theme.accent : theme.edge },
        style,
      ]}
    >
      <Text style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 22, color: active ? theme.accent : theme.ink }}>{label}</Text>
      {sub ? <Text style={[type.label, { color: active ? theme.accent : theme.inkSoft }]}>{sub}</Text> : null}
      {locked ? (
        <View style={styles.chipLock}>
          <Glyph name="lock" color={theme.inkFaint} size={13} />
        </View>
      ) : null}
    </Tap>
  );
}

export function Card({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.edge }, style]}>{children}</View>;
}

export function Label({ theme, children, inset }: { theme: Theme; children: React.ReactNode; inset?: boolean }) {
  return (
    <Text style={[type.label, styles.label, { color: theme.inkSoft }, inset && styles.labelInset]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function ProTag({ theme }: { theme: Theme }) {
  return (
    <View style={[styles.pro, { backgroundColor: theme.sun }]}>
      <Text style={{ fontFamily: 'Nunito-Bold', fontSize: 11, letterSpacing: 0.6, color: theme.onSun }}>PRO</Text>
    </View>
  );
}

export function Row({
  theme,
  title,
  sub,
  onPress,
  right,
  last,
  danger,
}: {
  theme: Theme;
  title: string;
  sub?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  last?: boolean;
  danger?: boolean;
}) {
  const body = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.rule }]}>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: danger ? theme.danger : theme.ink }]}>{title}</Text>
        {sub ? <Text style={[type.small, { color: theme.inkSoft, marginTop: 2 }]}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Glyph name="chevron" color={theme.inkFaint} size={18} /> : null)}
    </View>
  );
  if (!onPress) return body;
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {body}
    </Tap>
  );
}

export function ToggleRow({ theme, title, sub, value, onChange, last, locked }: { theme: Theme; title: string; sub?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean; locked?: boolean }) {
  return (
    <Row
      theme={theme}
      title={title}
      sub={sub}
      last={last}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
          {locked ? <ProTag theme={theme} /> : null}
          <Switch
            value={value}
            onValueChange={(v) => {
              tick();
              onChange(v);
            }}
            trackColor={{ true: theme.accent, false: theme.raised }}
            accessibilityLabel={title}
          />
        </View>
      }
    />
  );
}

export function Field({ theme, value, onChange, placeholder, label }: { theme: Theme; value: string; onChange: (s: string) => void; placeholder?: string; label: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.inkFaint}
      accessibilityLabel={label}
      maxLength={40}
      returnKeyType="done"
      style={[type.body, styles.field, { color: theme.ink, backgroundColor: theme.surface, borderColor: theme.edge }]}
    />
  );
}

/**
 * A full-height sheet with a title, a Cancel or Close, and an optional Save.
 * Its content sits in a ModalLayer, so the paywall can be asked for from
 * inside it and still appears on top (src/ui/Layer.tsx).
 */
export function Sheet({
  theme,
  visible,
  title,
  onClose,
  onSave,
  saveLabel = 'Save',
  children,
  footer,
}: {
  theme: Theme;
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <ModalLayer>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={[styles.sheetHead, { borderBottomColor: theme.rule }]}>
          <Tap onPress={onClose} accessibilityRole="button" accessibilityLabel={onSave ? 'Cancel' : 'Close'} hitSlop={10} style={styles.sheetSide}>
            <Text style={[type.body, { color: theme.inkSoft }]}>{onSave ? 'Cancel' : 'Close'}</Text>
          </Tap>
          <Text style={[type.heading, { color: theme.ink, flex: 1, textAlign: 'center' }]} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          <View style={[styles.sheetSide, { alignItems: 'flex-end' }]}>
            {onSave ? (
              <Tap onPress={onSave} accessibilityRole="button" accessibilityLabel={saveLabel} hitSlop={10}>
                <Text style={[type.strong, { color: theme.accent }]}>{saveLabel}</Text>
              </Tap>
            ) : null}
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.l, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer}
      </View>
      </ModalLayer>
    </Modal>
  );
}

/**
 * A short sheet from the bottom of the screen, within thumb reach: a title,
 * the content, and the buttons at the bottom. Used for the custom time and
 * the child lock explanation. Tapping the dimmed area outside closes it.
 * Like Sheet, its content sits in a ModalLayer.
 */
export function BottomSheet({
  theme,
  visible,
  title,
  onClose,
  children,
}: {
  theme: Theme;
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <ModalLayer>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={[styles.bottom, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, space.l) + space.s }]}>
          <View style={[styles.grabber, { backgroundColor: theme.rule }]} />
          <Text style={[type.heading, { color: theme.ink, textAlign: 'center', marginBottom: space.l }]} accessibilityRole="header">
            {title}
          </Text>
          {children}
        </View>
      </View>
      </ModalLayer>
    </Modal>
  );
}

/**
 * The adult hold: press and hold for two seconds while a ring fills. Used
 * for the settings gear and to undo child lock. A quick tap only shows the
 * hint, so a child poking at the screen never gets through.
 */
export const HOLD_MS = 2000;

export function useHold(onDone: () => void, ms = HOLD_MS) {
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);
  const begin = () => {
    setHolding(true);
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: ms, useNativeDriver: false }).start();
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onDone();
    }, ms);
  };
  const end = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
    progress.stopAnimation();
    progress.setValue(0);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return { begin, end, holding, progress };
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function HoldRing({ progress, size, color, track }: { progress: Animated.Value; size: number; color: string; track: string }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [c, 0] });
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={4} fill="none" />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={4}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

/** The settings gear: hold for two seconds. */
export function HoldGear({ theme, onOpen }: { theme: Theme; onOpen: () => void }) {
  const hold = useHold(onOpen);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 2200);
    return () => clearTimeout(t);
  }, [hint]);
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Pressable
        onPressIn={hold.begin}
        onPressOut={() => {
          if (hold.holding) setHint(true);
          hold.end();
        }}
        accessibilityRole="button"
        accessibilityLabel="Settings, for grown-ups"
        accessibilityHint="Hold for two seconds to open"
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onOpen}
        hitSlop={8}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <HoldRing progress={hold.progress} size={48} color={theme.accent} track={hold.holding ? theme.raised : 'transparent'} />
        <Glyph name="gear" color={theme.inkSoft} size={24} />
      </Pressable>
      {hint ? (
        <View style={[styles.hint, { backgroundColor: theme.ink }]} pointerEvents="none">
          <Text style={[type.small, { color: theme.bg }]}>Hold for 2 seconds</Text>
        </View>
      ) : null}
    </View>
  );
}

export function useReduceMotion(): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setV).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setV);
    return () => sub.remove();
  }, []);
  return v;
}

const styles = StyleSheet.create({
  main: { height: 60, borderRadius: radius.large, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.s },
  quiet: { minHeight: 48, borderRadius: radius.small, paddingHorizontal: space.l, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.s },
  chip: { minWidth: 64, height: 64, borderRadius: radius.medium, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.m },
  chipLock: { position: 'absolute', top: 5, right: 6 },
  card: { borderRadius: radius.large, borderWidth: 1, overflow: 'hidden' },
  // marginHorizontal, not marginLeft: a marginLeft here would win over the inset below.
  label: { textTransform: 'uppercase', letterSpacing: 1, marginTop: space.xl, marginBottom: space.s, marginHorizontal: space.xs },
  // On a screen whose rows of chips start at space.l: the label lines up with them.
  labelInset: { marginHorizontal: space.l },
  pro: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: space.m, paddingHorizontal: space.l, gap: space.m },
  field: { borderWidth: 1, borderRadius: radius.small, paddingHorizontal: space.l, height: 52 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.l, height: 58, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetSide: { width: 76 },
  bottom: { borderTopLeftRadius: radius.large, borderTopRightRadius: radius.large, paddingHorizontal: space.xl, paddingTop: space.s, maxWidth: 560, width: '100%', alignSelf: 'center' },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: space.m },
  hint: { position: 'absolute', top: 50, right: 0, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, width: 150, alignItems: 'center' },
});
