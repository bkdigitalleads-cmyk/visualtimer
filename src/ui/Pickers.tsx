import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, ColorId, colorHex, durationWords, ICONS, IconId, QUICK_PICKS, quickPickFor, SCENES, SceneId } from '../model';
import TimeSheet from './TimeSheet';
import { canUseColor, canUseScene } from '../gates';
import { radius, space, Theme, type } from '../theme';
import Scene from '../scenes/Scene';
import { Glyph, TimerIcon } from './Glyph';
import { Tap } from './Kit';

/** The scenes as small live pictures, a little way along, so each one reads at a glance. */
export function ScenePicker({
  theme,
  value,
  color,
  isPro,
  onPick,
  onLocked,
}: {
  theme: Theme;
  value: SceneId;
  color: ColorId;
  isPro: boolean;
  onPick: (id: SceneId) => void;
  onLocked: () => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.m, paddingHorizontal: space.l }}>
      {SCENES.map((s) => {
        const ok = canUseScene(s.id, isPro);
        const on = s.id === value;
        return (
          <Tap
            key={s.id}
            haptic
            onPress={() => (ok ? onPick(s.id) : onLocked())}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${s.name}${ok ? '' : ', Pro'}`}
            style={{ alignItems: 'center', width: 84 }}
          >
            <View style={{ borderRadius: 26, borderWidth: 3, borderColor: on ? theme.accent : 'transparent', padding: 2 }}>
              <Scene id={s.id} f={0.62} t={1.3} color={colorHex(s.id === 'wedge' ? color : 'teal')} dark={theme.isDark} size={72} />
              {!ok ? (
                <View style={{ position: 'absolute', right: 4, bottom: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Glyph name="lock" color={theme.inkSoft} size={14} />
                </View>
              ) : null}
            </View>
            <Text style={[type.label, { color: on ? theme.accent : theme.inkSoft, marginTop: 4 }]} numberOfLines={1}>
              {s.name}
            </Text>
          </Tap>
        );
      })}
    </ScrollView>
  );
}

export function ColorPicker({ theme, value, isPro, onPick, onLocked }: { theme: Theme; value: ColorId; isPro: boolean; onPick: (id: ColorId) => void; onLocked: () => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.m, paddingHorizontal: space.l }}>
      {COLORS.map((c) => {
        const ok = canUseColor(c.id, isPro);
        const on = c.id === value;
        return (
          <Tap
            key={c.id}
            haptic
            onPress={() => (ok ? onPick(c.id) : onLocked())}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${c.name}${ok ? '' : ', Pro'}`}
            style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: on ? theme.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.hex, alignItems: 'center', justifyContent: 'center' }}>
              {!ok ? <Glyph name="lock" color="#FFFFFF" size={14} /> : null}
            </View>
          </Tap>
        );
      })}
    </View>
  );
}

export function IconPicker({ theme, value, onPick }: { theme: Theme; value: IconId; onPick: (id: IconId) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
      {ICONS.map((i) => {
        const on = i.id === value;
        return (
          <Tap
            key={i.id}
            haptic
            onPress={() => onPick(i.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={i.name}
            style={{ padding: 3, borderRadius: radius.medium, borderWidth: 2.5, borderColor: on ? theme.accent : 'transparent' }}
          >
            <TimerIcon id={i.id} size={46} dark={theme.isDark} />
          </Tap>
        );
      })}
    </View>
  );
}

/**
 * How long, for the saved timer editor and routine steps: the time in big
 * words (tap it to change it), the same quick picks as the timer screen, and
 * Custom for anything from 5 seconds to 4 hours.
 */
export function DurationField({ theme, seconds, onChange }: { theme: Theme; seconds: number; onChange: (s: number) => void }) {
  const [custom, setCustom] = useState(false);
  const match = quickPickFor(seconds);
  return (
    <View>
      <Tap onPress={() => setCustom(true)} accessibilityRole="button" accessibilityLabel={`${durationWords(seconds)}. Change the time`} style={{ alignItems: 'center', paddingVertical: space.s }}>
        <Text style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 36, color: theme.ink }}>{durationWords(seconds)}</Text>
        <Text style={[type.small, { color: theme.accent, fontFamily: 'Nunito-Bold' }]}>Change</Text>
      </Tap>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s, justifyContent: 'center', marginTop: space.m }}>
        {QUICK_PICKS.map((p, i) => {
          const on = match === i;
          return (
            <Tap
              key={p.seconds}
              haptic
              onPress={() => onChange(p.seconds)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={durationWords(p.seconds)}
              style={[styles.pill, { backgroundColor: on ? theme.accentSoft : theme.surface, borderColor: on ? theme.accent : theme.edge }]}
            >
              <Text style={[type.strong, { fontSize: 15, color: on ? theme.accent : theme.ink }]}>
                {p.label} {p.sub}
              </Text>
            </Tap>
          );
        })}
        <Tap
          haptic
          onPress={() => setCustom(true)}
          accessibilityRole="button"
          accessibilityState={{ selected: match === null }}
          accessibilityLabel="Custom time"
          style={[styles.pill, { backgroundColor: match === null ? theme.accentSoft : theme.surface, borderColor: match === null ? theme.accent : theme.edge }]}
        >
          <Text style={[type.strong, { fontSize: 15, color: match === null ? theme.accent : theme.ink }]}>Custom</Text>
        </Tap>
      </View>
      <TimeSheet
        theme={theme}
        visible={custom}
        seconds={seconds}
        onClose={() => setCustom(false)}
        onDone={(s) => {
          setCustom(false);
          onChange(s);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 14, height: 40, borderRadius: 20, justifyContent: 'center', borderWidth: 1 },
});
