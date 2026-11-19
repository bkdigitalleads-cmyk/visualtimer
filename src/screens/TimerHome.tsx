import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme, space, type } from '../theme';
import { useApp } from '../state';
import { plainLook, useRunner } from '../runner';
import { askForAlerts } from '../alerts';
import { colorHex, durationShort, durationWords, QUICK_PICKS, quickPickFor, sceneInfo } from '../model';
import Scene from '../scenes/Scene';
import Dial from '../ui/Dial';
import { Chip, HoldGear, Label, MainButton, Tap } from '../ui/Kit';
import { Glyph } from '../ui/Glyph';
import { ColorPicker, ScenePicker } from '../ui/Pickers';
import TimeSheet from '../ui/TimeSheet';

/**
 * Pick a time (a quick pick, the dial, or Custom for anything from 5
 * seconds to 4 hours), pick a scene, press Start. The scene in the middle
 * of the dial is the one that will run. Tapping the time under the dial
 * opens the same custom time sheet as the Custom chip.
 */
export default function TimerHome({ onSettings }: { onSettings: () => void }) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { settings, updateSettings, isPro, askPro } = useApp();
  const runner = useRunner();
  const [custom, setCustom] = useState(false);
  const match = quickPickFor(settings.seconds);
  const dial = Math.min(width - 56, 320, Math.max(220, height - 470));

  const startNow = async () => {
    // The first Start asks to allow alerts, so the end is heard with the phone locked.
    await askForAlerts();
    runner.startTimer(settings.seconds, plainLook(settings.seconds, settings.scene, settings.color));
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          Timer
        </Text>
        <HoldGear theme={theme} onOpen={onSettings} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginTop: space.s }}>
          <Dial theme={theme} size={dial} seconds={settings.seconds} onChange={(m) => updateSettings({ seconds: m * 60 })}>
            <View style={{ width: dial - 64, height: dial - 64, borderRadius: (dial - 64) / 2, overflow: 'hidden' }}>
              <Scene id={settings.scene} f={1} t={1.3} color={colorHex(settings.color)} dark={theme.isDark} size={dial - 64} label={sceneInfo(settings.scene).name} />
            </View>
          </Dial>
          <Tap
            onPress={() => setCustom(true)}
            accessibilityRole="button"
            accessibilityLabel={durationWords(settings.seconds)}
            accessibilityHint="Opens the custom time"
            accessibilityLiveRegion="polite"
            style={styles.time}
          >
            <Text style={[type.clock, { color: theme.ink, fontSize: 40, flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
              {durationWords(settings.seconds)}
            </Text>
            <Glyph name="edit" color={theme.inkFaint} size={20} />
          </Tap>
        </View>

        <Label theme={theme} inset>Quick picks</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s, paddingHorizontal: space.l }}>
          {QUICK_PICKS.map((p, i) => (
            <Chip key={p.seconds} theme={theme} label={p.label} sub={p.sub} active={match === i} onPress={() => updateSettings({ seconds: p.seconds })} style={{ width: 66 }} />
          ))}
          <Chip theme={theme} label="Custom" sub={match === null ? durationShort(settings.seconds) : 'time'} active={match === null} onPress={() => setCustom(true)} />
        </ScrollView>

        <Label theme={theme} inset>Scene</Label>
        <ScenePicker theme={theme} value={settings.scene} color={settings.color} isPro={isPro} onPick={(scene) => updateSettings({ scene })} onLocked={() => askPro()} />

        {settings.scene === 'wedge' ? (
          <>
            <Label theme={theme} inset>Disc color</Label>
            <ColorPicker theme={theme} value={settings.color} isPro={isPro} onPick={(color) => updateSettings({ color })} onLocked={() => askPro()} />
          </>
        ) : null}
      </ScrollView>
      <View style={[styles.foot, { borderTopColor: theme.rule, backgroundColor: theme.bg }]}>
        <MainButton theme={theme} label="Start" icon="play" onPress={startNow} />
      </View>
      <TimeSheet
        theme={theme}
        visible={custom}
        seconds={settings.seconds}
        onClose={() => setCustom(false)}
        onDone={(seconds) => {
          setCustom(false);
          updateSettings({ seconds });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.l, paddingTop: space.s, height: 60, zIndex: 2 },
  time: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s, marginTop: space.m, paddingHorizontal: space.l, minHeight: 48, maxWidth: '100%' },
  foot: { paddingHorizontal: space.l, paddingTop: space.m, paddingBottom: space.m, borderTopWidth: StyleSheet.hairlineWidth },
});
