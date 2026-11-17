import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, space, type, Theme } from '../theme';
import { useApp } from '../state';
import { createTimer, fractionLeft, remainingMs, settle, start, TimerState } from '../timer';
import { askForAlerts } from '../alerts';
import { playEnd } from '../sound';
import { colorHex, IconId, SceneId } from '../model';
import Scene from '../scenes/Scene';
import { TimerIcon } from '../ui/Glyph';
import { MainButton, Tap, useReduceMotion } from '../ui/Kit';
import { useFrame } from '../ui/useFrame';

/**
 * First launch, before the paywall:
 *   1-3. Three screens, each with a real scene running (sped up, on a loop)
 *   4.   Try it: the parent starts a 10 second timer and watches it finish,
 *        then allows notifications so the end is heard with the phone locked
 * Then App.tsx opens the paywall, whose close button shows after 3 seconds.
 */
const PAGES: { scene: SceneId; color: string; loop: number; title: string; body: string; steps?: IconId[] }[] = [
  {
    scene: 'wedge',
    color: 'teal',
    loop: 7,
    title: 'Time they can see',
    body: 'A child who cannot read a clock can still watch the time go. When the color is gone, time is up.',
  },
  {
    scene: 'caterpillar',
    color: 'teal',
    loop: 8,
    title: 'A picture they love',
    body: 'A caterpillar eating its leaf, a rocket on its way to the moon, sand, a candle, a train. Nine scenes, all made for this app.',
  },
  {
    scene: 'train',
    color: 'teal',
    loop: 8,
    title: 'Routines, one step at a time',
    body: 'Morning, bedtime, leaving the house. Each step has its own picture and time, with a little cheer in between.',
    steps: ['potty', 'shirt', 'bowl', 'tooth', 'shoe'],
  },
];

const TRY_SECONDS = 10;

export default function Welcome({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space.l) }}>
      {page < PAGES.length ? <ValuePage theme={theme} index={page} onNext={() => setPage(page + 1)} /> : <TryIt theme={theme} onDone={onDone} />}
    </View>
  );
}

function ValuePage({ theme, index, onNext }: { theme: Theme; index: number; onNext: () => void }) {
  const p = PAGES[index];
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const now = useFrame(true, reduce ? 8 : 24);
  const born = useRef(Date.now());
  useEffect(() => {
    born.current = Date.now();
  }, [index]);
  // Plays down once over `loop` seconds, rests on the ending, and plays again.
  const el = ((now - born.current) / 1000) % (p.loop + 2);
  const f = Math.max(0, 1 - el / p.loop);
  const size = Math.min(width - 64, height * 0.42, 340);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.xl }}>
        <View style={{ alignItems: 'center', marginBottom: space.xl }}>
          <Scene id={p.scene} f={f} t={reduce ? 0 : now / 1000} color={colorHex(p.color)} dark={theme.isDark} done={f === 0} size={size} />
          {p.steps ? (
            <View style={{ flexDirection: 'row', gap: space.s, marginTop: space.l }}>
              {p.steps.map((s, i) => (
                <View key={s} style={{ opacity: i <= Math.floor((1 - f) * p.steps!.length) ? 1 : 0.4 }}>
                  <TimerIcon id={s} size={38} dark={theme.isDark} />
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          {p.title}
        </Text>
        <Text style={[type.body, { color: theme.inkSoft, marginTop: space.s }]}>{p.body}</Text>
      </ScrollView>
      <Dots theme={theme} index={index} count={PAGES.length + 1} />
      <View style={{ paddingHorizontal: space.xl }}>
        <MainButton theme={theme} label="Continue" onPress={onNext} />
      </View>
    </View>
  );
}

function TryIt({ theme, onDone }: { theme: Theme; onDone: () => void }) {
  const { settings } = useApp();
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const [timer, setTimer] = useState<TimerState>(() => createTimer(TRY_SECONDS));
  const [asking, setAsking] = useState(false);
  const running = timer.status === 'running';
  const now = useFrame(running || timer.status === 'done', reduce ? 8 : 24);
  const t = settle(timer, now);
  const done = t.status === 'done';

  useEffect(() => {
    if (running && done) {
      setTimer(t);
      playEnd(settings.endSound === 'none' ? 'chime' : settings.endSound);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [running, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const size = Math.min(width - 64, height * 0.42, 340);
  const secs = Math.ceil(remainingMs(t, now) / 1000);
  const next = async () => {
    setAsking(true);
    await askForAlerts();
    setAsking(false);
    onDone();
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.xl }}>
        <View style={{ alignItems: 'center', marginBottom: space.xl }}>
          <Scene id="wedge" f={fractionLeft(t, now)} t={reduce ? 0 : now / 1000} color={colorHex('teal')} dark={theme.isDark} done={done} size={size} label={done ? 'Time is up' : `${secs} seconds left`} />
          <Text style={[type.clock, { color: t.status === 'ready' ? theme.inkFaint : theme.ink, fontSize: 48, marginTop: space.m }]} accessibilityElementsHidden>
            0:{String(done ? 0 : secs).padStart(2, '0')}
          </Text>
        </View>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          {done ? 'That is all there is to it' : 'Try it now'}
        </Text>
        <Text style={[type.body, { color: theme.inkSoft, marginTop: space.s }]}>
          {done
            ? 'Next, allow notifications so you hear the end even with the phone locked or another app open.'
            : running
              ? 'Watch the color go. You can put the phone down.'
              : 'Press Start and watch ten seconds go by.'}
        </Text>
      </ScrollView>
      <Dots theme={theme} index={PAGES.length} count={PAGES.length + 1} />
      <View style={{ paddingHorizontal: space.xl, gap: space.s }}>
        {done ? (
          <MainButton theme={theme} label={asking ? 'One moment' : 'Continue'} onPress={next} disabled={asking} />
        ) : running ? (
          <MainButton theme={theme} label="Running" onPress={() => {}} disabled />
        ) : (
          <MainButton theme={theme} label="Start" icon="play" onPress={() => setTimer(start(createTimer(TRY_SECONDS), Date.now()))} />
        )}
        {!done && !running ? (
          <Tap onPress={next} accessibilityRole="button" accessibilityLabel="Skip" style={{ alignSelf: 'center', padding: space.s }}>
            <Text style={[type.body, { color: theme.inkSoft }]}>Skip</Text>
          </Tap>
        ) : null}
      </View>
    </View>
  );
}

function Dots({ theme, index, count }: { theme: Theme; index: number; count: number }) {
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i === index ? theme.accent : theme.raised, width: i === index ? 22 : 8 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: space.l },
  dot: { height: 8, borderRadius: 4 },
});
