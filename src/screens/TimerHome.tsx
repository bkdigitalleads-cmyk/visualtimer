import React from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme, space, type } from '../theme';
import { useApp } from '../state';
import { plainLook, useRunner } from '../runner';
import { askForAlerts } from '../alerts';
import { colorHex, durationWords, PRESETS, sceneInfo } from '../model';
import Scene from '../scenes/Scene';
import Dial from '../ui/Dial';
import { Chip, HoldGear, Label, MainButton } from '../ui/Kit';
import { ColorPicker, ScenePicker } from '../ui/Pickers';

/**
 * Pick a time (a big preset or the dial), pick a scene, press Start. The
 * scene in the middle of the dial is the one that will run.
 */
export default function TimerHome({ onSettings }: { onSettings: () => void }) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { settings, updateSettings, isPro, askPro } = useApp();
  const runner = useRunner();
  const minutes = Math.max(1, Math.round(settings.seconds / 60));
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
          <Dial theme={theme} size={dial} minutes={minutes} onChange={(m) => updateSettings({ seconds: m * 60 })}>
            <View style={{ width: dial - 64, height: dial - 64, borderRadius: (dial - 64) / 2, overflow: 'hidden' }}>
              <Scene id={settings.scene} f={1} t={1.3} color={colorHex(settings.color)} dark={theme.isDark} size={dial - 64} label={sceneInfo(settings.scene).name} />
            </View>
          </Dial>
          <Text style={[type.clock, { color: theme.ink, fontSize: 40, marginTop: space.m }]} accessibilityLiveRegion="polite">
            {durationWords(settings.seconds)}
          </Text>
        </View>

        <Label theme={theme} inset>Quick picks</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s, paddingHorizontal: space.l }}>
          {PRESETS.map((m) => (
            <Chip key={m} theme={theme} label={String(m)} sub="min" active={settings.seconds === m * 60} onPress={() => updateSettings({ seconds: m * 60 })} style={{ width: 66 }} />
          ))}
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
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.l, paddingTop: space.s, height: 60, zIndex: 2 },
  foot: { paddingHorizontal: space.l, paddingTop: space.m, paddingBottom: space.m, borderTopWidth: StyleSheet.hairlineWidth },
});
