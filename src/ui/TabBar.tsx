import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, Theme, type } from '../theme';
import { Glyph, UiGlyph } from './Glyph';
import { Tap } from './Kit';

export type Tab = 'timer' | 'saved' | 'routines' | 'history';

const TABS: { key: Tab; label: string; icon: UiGlyph }[] = [
  { key: 'timer', label: 'Timer', icon: 'timer' },
  { key: 'saved', label: 'Saved', icon: 'saved' },
  { key: 'routines', label: 'Routines', icon: 'routine' },
  { key: 'history', label: 'History', icon: 'history' },
];

export default function TabBar({ theme, tab, onTab }: { theme: Theme; tab: Tab; onTab: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: theme.surface, borderTopColor: theme.rule, paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tabbar">
      {TABS.map((t) => {
        const on = t.key === tab;
        return (
          <Tap key={t.key} onPress={() => onTab(t.key)} haptic accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label} style={styles.item}>
            <Glyph name={t.icon} color={on ? theme.accent : theme.inkFaint} size={26} weight={on ? 2.4 : 2} />
            <Text style={[type.label, { fontSize: 12, color: on ? theme.accent : theme.inkFaint }]}>{t.label}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.s },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48, justifyContent: 'center' },
});
