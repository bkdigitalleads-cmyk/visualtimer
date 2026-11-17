import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { COLORS, ColorId, colorHex, ICONS, IconId, SCENES, SceneId } from '../model';
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

/** Minutes for an editor: the presets as chips, and minus and plus for anything else. */
export function MinutesField({ theme, seconds, onChange }: { theme: Theme; seconds: number; onChange: (s: number) => void }) {
  const m = Math.max(1, Math.round(seconds / 60));
  const set = (v: number) => onChange(Math.max(1, Math.min(120, v)) * 60);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xl }}>
        <Tap onPress={() => set(m - 1)} haptic accessibilityRole="button" accessibilityLabel="One minute less" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.raised, alignItems: 'center', justifyContent: 'center' }}>
          <Glyph name="minus" color={theme.ink} size={24} weight={2.4} />
        </Tap>
        <View style={{ minWidth: 110, alignItems: 'center' }} accessible accessibilityLabel={`${m} minute${m === 1 ? '' : 's'}`}>
          <Text style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 44, color: theme.ink }}>{m}</Text>
          <Text style={[type.small, { color: theme.inkSoft, marginTop: -4 }]}>{m === 1 ? 'minute' : 'minutes'}</Text>
        </View>
        <Tap onPress={() => set(m + 1)} haptic accessibilityRole="button" accessibilityLabel="One minute more" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.raised, alignItems: 'center', justifyContent: 'center' }}>
          <Glyph name="plus" color={theme.ink} size={24} weight={2.4} />
        </Tap>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s, justifyContent: 'center', marginTop: space.l }}>
        {[1, 2, 3, 5, 10, 15, 20, 30, 45, 60].map((v) => (
          <Tap
            key={v}
            haptic
            onPress={() => set(v)}
            accessibilityRole="button"
            accessibilityLabel={`${v} minutes`}
            style={{ paddingHorizontal: 14, height: 40, borderRadius: 20, justifyContent: 'center', backgroundColor: v === m ? theme.accentSoft : theme.surface, borderWidth: 1, borderColor: v === m ? theme.accent : theme.edge }}
          >
            <Text style={[type.strong, { fontSize: 15, color: v === m ? theme.accent : theme.ink }]}>{v}</Text>
          </Tap>
        ))}
      </View>
    </View>
  );
}
