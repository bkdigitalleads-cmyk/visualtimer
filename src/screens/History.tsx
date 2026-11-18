import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, space, type } from '../theme';
import { useApp } from '../state';
import { dayKey } from '../rules';
import { durationShort, historyByDay, HistoryDay } from '../model';
import { TimerIcon } from '../ui/Glyph';
import Scene from '../scenes/Scene';
import { colorHex } from '../model';
import { Card, HoldGear } from '../ui/Kit';

function dayTitle(day: string, now: number): string {
  if (day === dayKey(now)) return 'Today';
  if (day === dayKey(now - 86_400_000)) return 'Yesterday';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function daySummary(d: HistoryDay): string {
  return `${d.count} ${d.count === 1 ? 'timer' : 'timers'}, ${durationShort(d.seconds)}`;
}

/** Finished timers and routines, by day. Kept on the phone only. */
export default function History({ onSettings }: { onSettings: () => void }) {
  const theme = useTheme();
  const { history } = useApp();
  const days = historyByDay(history);
  const now = Date.now();
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          History
        </Text>
        <HoldGear theme={theme} onOpen={onSettings} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingTop: space.s, paddingBottom: 40 }}>
        {days.length === 0 ? (
          <Text style={[type.body, { color: theme.inkSoft, textAlign: 'center', marginTop: space.xxl }]}>
            Finished timers show up here, day by day.
          </Text>
        ) : null}
        {days.map((d) => (
          <View key={d.day} style={{ marginBottom: space.xl }}>
            <View style={styles.dayHead}>
              <Text style={[type.heading, { color: theme.ink }]} accessibilityRole="header">
                {dayTitle(d.day, now)}
              </Text>
              <Text style={[type.small, { color: theme.inkSoft }]}>{daySummary(d)}</Text>
            </View>
            <Card theme={theme}>
              {d.entries.map((e, i) => (
                <View
                  key={`${e.at}-${i}`}
                  style={[styles.row, i < d.entries.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.rule }]}
                  accessible
                  accessibilityLabel={`${e.name}, ${durationShort(e.seconds)}, finished at ${new Date(e.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
                >
                  {e.icon ? (
                    <TimerIcon id={e.icon} size={36} dark={theme.isDark} />
                  ) : (
                    <Scene id={e.scene} f={0.62} t={1.3} color={colorHex('teal')} dark={theme.isDark} size={36} />
                  )}
                  <Text style={[type.body, { color: theme.ink, flex: 1 }]} numberOfLines={1}>
                    {e.name}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[type.strong, { color: theme.ink, fontSize: 15 }]}>{durationShort(e.seconds)}</Text>
                    <Text style={[type.small, { color: theme.inkFaint }]}>
                      {new Date(e.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.l, paddingTop: space.s, height: 60, zIndex: 2 },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.s, paddingHorizontal: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.l, paddingVertical: space.m },
});
