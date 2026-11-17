import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTheme, space, type, Theme } from '../theme';
import { useApp } from '../state';
import { useRunner } from '../runner';
import { fractionLeft, remainingMs } from '../timer';
import { CHEER_MS } from '../routine';
import { canUseChildLock, canUseClassroom } from '../gates';
import { clockText, colorHex, durationWords, IconId, sceneInfo } from '../model';
import Scene from '../scenes/Scene';
import { Glyph, TimerIcon } from '../ui/Glyph';
import { HoldRing, MainButton, RoundButton, Tap, useHold, useReduceMotion } from '../ui/Kit';
import { useFrame } from '../ui/useFrame';

/**
 * The running timer: the scene as big as the screen allows, the time in
 * digits under it (a setting), and the grown-up's controls. No links out,
 * nothing to buy, nothing to wander into. With child lock on, the whole
 * screen ignores touches until a grown-up holds a corner for 2 seconds.
 */
export default function RunScreen() {
  const runner = useRunner();
  if (!runner.visible || !runner.active) return null;
  return <Run />;
}

function Run() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { settings, isPro, askPro } = useApp();
  const runner = useRunner();
  const a = runner.active!;
  const reduce = useReduceMotion();
  const [locked, setLocked] = useState(() => settings.autoLock && canUseChildLock(isPro));
  const [classroom, setClassroom] = useState(false);
  const now = useFrame(true, reduce ? 4 : 24);
  const t = reduce ? 0 : now / 1000;

  // Classroom mode turns the phone on its side; leaving it (or the run) frees the rotation again.
  useEffect(() => {
    if (classroom) ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    else ScreenOrientation.unlockAsync().catch(() => {});
  }, [classroom]);
  useEffect(() => () => void ScreenOrientation.unlockAsync().catch(() => {}), []);

  const isRoutine = a.kind === 'routine';
  const timer = a.kind === 'timer' ? a.timer : a.run.timer;
  const phase = a.kind === 'routine' ? a.run.phase : timer.status === 'done' ? 'finished' : 'step';
  const done = phase === 'finished';
  const cheer = phase === 'cheer';
  const paused = timer.status === 'paused';
  const left = done || cheer ? 0 : remainingMs(timer, now);
  const f = done || cheer ? 0 : fractionLeft(timer, now);
  const look = a.look;
  const color = colorHex(look.color);
  const step = isRoutine ? a.run.steps[a.run.index] : null;
  const nextStep = isRoutine ? a.run.steps[a.run.index + 1] ?? null : null;
  const title = step ? step.name : look.name;
  const icon = (step?.icon ?? look.icon) as IconId | null;

  const landscape = width > height || classroom;
  // Landscape keeps 56 points at the top for the close, lock and classroom buttons.
  const sceneSize = landscape
    ? Math.min(height - insets.top - insets.bottom - (classroom ? 72 : 88), width * 0.5)
    : Math.min(width - 40, height * (settings.showDigits ? 0.5 : 0.58));

  const close = () => {
    if (done) return runner.close();
    Alert.alert(isRoutine ? 'Stop this routine?' : 'Stop this timer?', undefined, [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: runner.close },
    ]);
  };

  const lock = async () => {
    if (canUseChildLock(isPro)) return setLocked(true);
    runner.pause();
    if (await askPro()) setLocked(true);
  };

  const toClassroom = async () => {
    if (canUseClassroom(isPro)) return setClassroom(true);
    if (await askPro()) setClassroom(true);
  };

  const sceneLabel = `${sceneInfo(look.scene).describe}. ${done ? 'Time is up.' : cheer ? 'Well done.' : `${durationWords(Math.ceil(left / 1000))} left${paused ? ', paused' : ''}.`}`;

  const scene = <Scene id={look.scene} f={f} t={t} color={color} dark={theme.isDark} done={done || cheer} size={sceneSize} label={sceneLabel} />;

  const digits = settings.showDigits && !done && !cheer ? (
    <Text
      style={[type.clock, { color: paused ? theme.inkFaint : theme.ink, fontSize: classroom ? Math.min(140, width * 0.14) : landscape ? 72 : 64, fontVariant: ['tabular-nums'] }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {clockText(left)}
    </Text>
  ) : null;

  const heading = done ? (
    <Text style={[type.title, { color: theme.ink, fontSize: 36, lineHeight: 42, textAlign: 'center' }]} accessibilityRole="header">
      {isRoutine ? `${a.run.name} is all done` : 'All done'}
    </Text>
  ) : cheer ? (
    <View style={{ alignItems: 'center' }}>
      <Text style={[type.title, { color: theme.ink, fontSize: 36, lineHeight: 42 }]} accessibilityRole="header">
        Well done
      </Text>
      {nextStep ? <Text style={[type.heading, { color: theme.inkSoft, marginTop: space.xs }]}>Next: {nextStep.name}</Text> : null}
      <CheerDots theme={theme} until={a.kind === 'routine' ? a.run.cheerUntil ?? now : now} now={now} />
    </View>
  ) : null;

  const controls = locked && !done ? (
    <View style={{ height: 76, alignItems: 'center', justifyContent: 'center' }}>
      <Glyph name="lock" color={theme.inkFaint} size={22} />
    </View>
  ) : done ? (
    <View style={{ gap: space.m, width: '100%', maxWidth: 420 }}>
      {!isRoutine ? (
        <View style={{ flexDirection: 'row', gap: space.m }}>
          <View style={{ flex: 1 }}>
            <Tap onPress={runner.restart} haptic accessibilityRole="button" accessibilityLabel="Again" style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.edge }]}>
              <Glyph name="restart" color={theme.ink} size={20} />
              <Text style={[type.strong, { color: theme.ink }]}>Again</Text>
            </Tap>
          </View>
          <View style={{ flex: 1 }}>
            <Tap onPress={() => runner.add(60_000)} haptic accessibilityRole="button" accessibilityLabel="One more minute" style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.edge }]}>
              <Glyph name="plus" color={theme.ink} size={20} />
              <Text style={[type.strong, { color: theme.ink }]}>1 minute</Text>
            </Tap>
          </View>
        </View>
      ) : null}
      <MainButton theme={theme} label="Close" onPress={runner.close} />
    </View>
  ) : cheer ? null : (
    <View style={styles.controls}>
      <RoundButton theme={theme} icon="restart" label={isRoutine ? 'Restart this step' : 'Restart'} onPress={runner.restart} size={52} />
      <RoundButton theme={theme} text="+1" label="Add one minute" onPress={() => runner.add(60_000)} size={52} />
      <RoundButton theme={theme} icon={paused ? 'play' : 'pause'} label={paused ? 'Resume' : 'Pause'} onPress={paused ? runner.resume : runner.pause} size={76} filled />
      <RoundButton theme={theme} text="+5" label="Add five minutes" onPress={() => runner.add(300_000)} size={52} />
      {isRoutine ? <RoundButton theme={theme} icon="next" label="Next step" onPress={runner.next} size={52} /> : null}
    </View>
  );

  const nameRow = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, maxWidth: '100%' }}>
      {icon ? <TimerIcon id={icon} size={classroom ? 52 : 40} dark={theme.isDark} /> : null}
      <Text style={[type.heading, { color: theme.ink, fontSize: classroom ? 30 : 22, lineHeight: classroom ? 36 : 28, flexShrink: 1 }]} numberOfLines={2}>
        {title}
      </Text>
    </View>
  );

  const topBar = (
    <View style={[styles.top, { paddingTop: insets.top + space.s, paddingLeft: insets.left + space.l, paddingRight: insets.right + space.l }]}>
      {classroom ? (
        <RoundButton theme={theme} icon="close" label="Leave classroom mode" onPress={() => setClassroom(false)} size={44} />
      ) : (
        <RoundButton theme={theme} icon="close" label={done ? 'Close' : 'Stop'} onPress={close} size={44} />
      )}
      <View style={{ flex: 1 }} />
      {!done && !classroom ? (
        <View style={{ flexDirection: 'row', gap: space.s }}>
          <RoundButton theme={theme} icon="expand" label={`Classroom mode${canUseClassroom(isPro) ? '' : ', Pro'}`} onPress={toClassroom} size={44} />
          <RoundButton theme={theme} icon="lock" label={`Child lock${canUseChildLock(isPro) ? '' : ', Pro'}`} onPress={lock} size={44} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]}>
      <StatusBar hidden={classroom} style={theme.isDark ? 'light' : 'dark'} />
      {isRoutine && !classroom ? <StepTrail theme={theme} run={a.run} top={insets.top + 64} /> : null}
      {landscape ? (
        <View style={[styles.row, { paddingLeft: insets.left + space.xl, paddingRight: insets.right + space.xl, paddingTop: insets.top + (classroom ? 48 : 56), paddingBottom: insets.bottom + space.s }]}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>{scene}</View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.l, paddingLeft: space.xl }}>
            {nameRow}
            {heading}
            {digits}
            {nextStep && !cheer && !done ? <Text style={[type.body, { color: theme.inkSoft }]}>Next: {nextStep.name}</Text> : null}
            {controls}
          </View>
        </View>
      ) : (
        <View style={[styles.column, { paddingTop: insets.top + (isRoutine ? 112 : 72), paddingBottom: insets.bottom + space.l }]}>
          {nameRow}
          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            {scene}
            {digits}
            {heading}
          </View>
          {nextStep && !cheer && !done ? <Text style={[type.body, { color: theme.inkSoft, marginBottom: space.m }]}>Next: {nextStep.name}</Text> : null}
          {controls}
        </View>
      )}
      {!locked ? topBar : null}
      {locked ? <LockLayer theme={theme} onUnlock={() => setLocked(false)} /> : null}
    </View>
  );
}

/** The steps of a routine as a row of icons: done ones ticked, the current one ringed. */
function StepTrail({ theme, run, top }: { theme: Theme; run: import('../routine').RoutineRun; top: number }) {
  return (
    <View style={{ position: 'absolute', top, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: space.s, paddingHorizontal: space.l, flexWrap: 'wrap' }} accessible accessibilityLabel={`Step ${run.index + 1} of ${run.steps.length}`}>
      {run.steps.map((s, i) => {
        const doneStep = i < run.index || (i === run.index && run.phase !== 'step');
        const current = i === run.index && run.phase === 'step';
        return (
          <View key={i} style={{ opacity: doneStep || current ? 1 : 0.45, borderRadius: 24, borderWidth: 2.5, borderColor: current ? theme.accent : 'transparent', padding: 1 }}>
            <TimerIcon id={s.icon as IconId} size={34} dark={theme.isDark} />
            {doneStep ? (
              <View style={{ position: 'absolute', right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, backgroundColor: theme.success, alignItems: 'center', justifyContent: 'center' }}>
                <Glyph name="check" color="#FFFFFF" size={13} weight={3} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** Five dots that go out over the cheer, so a child sees the next step coming. */
function CheerDots({ theme, until, now }: { theme: Theme; until: number; now: number }) {
  const leftMs = Math.max(0, until - now);
  const on = Math.ceil((leftMs / CHEER_MS) * 5);
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: space.m }}>
      {Array.from({ length: 5 }, (_, i) => (
        <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i < on ? theme.accent : theme.raised }} />
      ))}
    </View>
  );
}

/**
 * Child lock. Every touch lands here and does nothing but show a small
 * note. Holding any corner for 2 seconds unlocks.
 */
function LockLayer({ theme, onUnlock }: { theme: Theme; onUnlock: () => void }) {
  const [note, setNote] = useState(false);
  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(false), 2500);
    return () => clearTimeout(id);
  }, [note]);
  const corners: ('tl' | 'tr' | 'bl' | 'br')[] = ['tl', 'tr', 'bl', 'br'];
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => setNote(true)}
        accessibilityLabel="Child lock is on"
        accessibilityHint="A grown-up can hold any corner of the screen for 2 seconds to unlock"
        accessibilityActions={[{ name: 'magicTap' }]}
        onAccessibilityAction={onUnlock}
      />
      {corners.map((c) => (
        <Corner key={c} where={c} theme={theme} onUnlock={onUnlock} onTouch={() => setNote(true)} />
      ))}
      {note ? (
        <View pointerEvents="none" style={[styles.note, { backgroundColor: theme.ink }]}>
          <Glyph name="lock" color={theme.bg} size={18} />
          <Text style={[type.small, { color: theme.bg, flexShrink: 1 }]}>Locked. A grown-up can hold a corner for 2 seconds.</Text>
        </View>
      ) : null}
    </View>
  );
}

function Corner({ where, theme, onUnlock, onTouch }: { where: 'tl' | 'tr' | 'bl' | 'br'; theme: Theme; onUnlock: () => void; onTouch: () => void }) {
  const hold = useHold(onUnlock);
  const size = 96;
  const pos = {
    top: where[0] === 't' ? 0 : undefined,
    bottom: where[0] === 'b' ? 0 : undefined,
    left: where[1] === 'l' ? 0 : undefined,
    right: where[1] === 'r' ? 0 : undefined,
  };
  return (
    <Pressable
      onPressIn={() => {
        onTouch();
        hold.begin();
      }}
      onPressOut={hold.end}
      style={[{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }, pos]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {hold.holding ? (
        <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
          <HoldRing progress={hold.progress} size={64} color={theme.accent} track={theme.raised} />
          <Glyph name="unlock" color={theme.ink} size={24} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  column: { flex: 1, alignItems: 'center', paddingHorizontal: space.l },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.m },
  pill: { height: 56, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  note: { position: 'absolute', left: 24, right: 24, bottom: 120, borderRadius: 16, padding: space.m, flexDirection: 'row', gap: space.s, alignItems: 'center', justifyContent: 'center' },
});
