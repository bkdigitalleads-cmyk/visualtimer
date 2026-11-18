import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useApp } from './state';
import { KEYS, loadJson, saveJson } from './store';
import {
  addTime,
  createTimer,
  markWarned,
  parseTimer,
  pause as pauseTimer,
  ranSeconds,
  remainingMs,
  restart as restartTimer,
  resume as resumeTimer,
  settle,
  start,
  TimerState,
  warningDue,
} from './timer';
import {
  addRoutineTime,
  parseRoutineRun,
  pauseRoutine,
  restartStep,
  resumeRoutine,
  RoutineRun,
  settleRoutine,
  skipStep,
  startRoutine as beginRoutine,
  upcomingStepEnds,
} from './routine';
import { cancelAlerts, scheduleAlerts } from './alerts';
import { playEnd, playTick, playWarning, preloadSounds, stopAll } from './sound';
import { countFinished, maybeRequestReviewAfterFinish, setReviewGuard } from './reviews';
import { dayKey } from './rules';
import { fallbackLook } from './gates';
import { ColorId, IconId, plainTimerName, Routine, SceneId } from './model';

/**
 * The timer or routine that is running, kept here so it survives the run
 * screen closing, the app going to the background and the app being
 * closed (it is stored as JSON on every change). All timing comes from the
 * pure engines in timer.ts and routine.ts; this file adds the phone: the
 * end alerts, sounds, haptics, keep-awake, history and the rating ask.
 */

export interface RunLook {
  name: string;
  icon: IconId | null;
  scene: SceneId;
  color: ColorId;
}

export type Active =
  | { kind: 'timer'; timer: TimerState; look: RunLook; recorded: boolean; onboarding?: boolean }
  | { kind: 'routine'; run: RoutineRun; look: RunLook; recorded: boolean };

/** A finished run older than this is not reopened when the app starts. */
const STALE_MS = 10 * 60 * 1000;
/** The end sound plays only if the end was this recent (otherwise the notification already played it). */
const FRESH_MS = 4000;

interface Runner {
  active: Active | null;
  /** The run screen is showing. */
  visible: boolean;
  startTimer: (seconds: number, look: RunLook, opts?: { onboarding?: boolean }) => void;
  startRoutine: (r: Routine) => void;
  pause: () => void;
  resume: () => void;
  add: (ms: number) => void;
  restart: () => void;
  next: () => void;
  close: () => void;
  /** Bumped on every logic tick, so screens re-read the time. */
  beat: number;
}

const Ctx = createContext<Runner | null>(null);

function parseActive(raw: unknown): Active | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const look = r.look as RunLook | undefined;
  if (!look || typeof look.name !== 'string') return null;
  if (r.kind === 'timer') {
    const timer = parseTimer(r.timer);
    return timer ? { kind: 'timer', timer, look, recorded: r.recorded === true } : null;
  }
  if (r.kind === 'routine') {
    const run = parseRoutineRun(r.run);
    return run ? { kind: 'routine', run, look, recorded: r.recorded === true } : null;
  }
  return null;
}

export function RunnerProvider({ children }: { children: React.ReactNode }) {
  const { ready, settings, isPro, addHistory } = useApp();
  const [active, setActiveState] = useState<Active | null>(null);
  const [visible, setVisible] = useState(false);
  const [beat, setBeat] = useState(0);
  const activeRef = useRef<Active | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const lastSecond = useRef<number | null>(null);
  const visibleRef = useRef(false);
  visibleRef.current = visible;

  useEffect(() => {
    setReviewGuard(() => visibleRef.current);
  }, []);

  const setActive = useCallback((a: Active | null) => {
    activeRef.current = a;
    setActiveState(a);
    saveJson(KEYS.run, a);
  }, []);

  /** Puts the notifications in line with the run as it is now. */
  const syncAlerts = useCallback((a: Active | null) => {
    const sound = settingsRef.current.endSound;
    if (!a) return void cancelAlerts();
    const now = Date.now();
    if (a.kind === 'timer') {
      if (a.timer.status !== 'running' || a.timer.endAt == null) return void cancelAlerts();
      scheduleAlerts([{ at: a.timer.endAt, title: 'Time is up', body: a.look.name }], sound);
      return;
    }
    const ends = upcomingStepEnds(a.run, now);
    scheduleAlerts(
      ends.map(({ index, at }) => {
        const step = a.run.steps[index];
        const next = a.run.steps[index + 1];
        return {
          at,
          title: `${step.name} is done`,
          body: next ? `Next: ${next.name}` : `${a.run.name} is all done.`,
        };
      }),
      sound
    );
  }, []);

  const record = useCallback(
    (at: number, seconds: number, name: string, look: RunLook) => {
      addHistory({ at, day: dayKey(at), seconds, name, icon: look.icon, scene: look.scene });
      countFinished();
    },
    [addHistory]
  );

  /** The logic tick: endings, cheers, warnings, ticking. Runs 4 times a second while something is active. */
  const step = useCallback(() => {
    const a = activeRef.current;
    if (!a) return;
    const now = Date.now();
    const s = settingsRef.current;
    if (a.kind === 'timer') {
      let t = settle(a.timer, now);
      if (t.status === 'done' && a.timer.status !== 'done') {
        const fresh = now - (t.doneAt ?? now) < FRESH_MS;
        if (fresh) {
          playEnd(s.endSound);
          if (s.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        let recorded = a.recorded;
        if (!recorded && !a.onboarding) {
          record(t.doneAt ?? now, ranSeconds(t), a.look.name, a.look);
          recorded = true;
        }
        setActive({ ...a, timer: t, recorded });
        cancelAlerts();
        return;
      }
      if (s.warning && warningDue(t, now)) {
        t = markWarned(t);
        playWarning();
        if (s.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        setActive({ ...a, timer: t });
      }
      if (s.ticking && t.status === 'running') {
        const sec = Math.ceil(remainingMs(t, now) / 1000);
        if (lastSecond.current != null && sec !== lastSecond.current && sec > 0) playTick();
        lastSecond.current = sec;
      }
      return;
    }
    const before = a.run;
    const { run, finished } = settleRoutine(before, now);
    if (run !== before) {
      const fresh = finished.some((f) => now - f.at < FRESH_MS);
      if (fresh) {
        playEnd(s.endSound);
        if (s.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      let recorded = a.recorded;
      if (run.phase === 'finished' && !recorded) {
        const secs = run.steps.reduce((t2, st) => t2 + st.seconds, 0);
        record(run.finishedAt ?? now, secs, `${run.name} routine`, a.look);
        recorded = true;
      }
      setActive({ ...a, run, recorded });
      return;
    }
    if (run.phase === 'step') {
      let t = run.timer;
      if (s.warning && warningDue(t, now)) {
        t = markWarned(t);
        playWarning();
        if (s.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        setActive({ ...a, run: { ...run, timer: t } });
      }
      if (s.ticking && t.status === 'running') {
        const sec = Math.ceil(remainingMs(t, now) / 1000);
        if (lastSecond.current != null && sec !== lastSecond.current && sec > 0) playTick();
        lastSecond.current = sec;
      }
    }
  }, [record, setActive]);

  // Pick up a run left from before the app was closed.
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const a = await loadJson(KEYS.run, parseActive, null);
      if (!a) return;
      const now = Date.now();
      activeRef.current = a;
      // Bring it up to now first: anything that ended while closed is recorded without a sound.
      let b: Active = a;
      if (a.kind === 'timer') {
        const t = settle(a.timer, now);
        if (t.status === 'done' && !a.recorded) {
          record(t.doneAt ?? now, ranSeconds(t), a.look.name, a.look);
          b = { ...a, timer: t, recorded: true };
        } else b = { ...a, timer: t };
        if (t.status === 'done' && now - (t.doneAt ?? now) > STALE_MS) return setActive(null);
      } else {
        const { run } = settleRoutine(a.run, now);
        if (run.phase === 'finished' && !a.recorded) {
          record(run.finishedAt ?? now, run.steps.reduce((t2, st) => t2 + st.seconds, 0), `${run.name} routine`, a.look);
          b = { ...a, run, recorded: true };
        } else b = { ...a, run };
        if (run.phase === 'finished' && now - (run.finishedAt ?? now) > STALE_MS) return setActive(null);
      }
      setActive(b);
      setVisible(true);
      syncAlerts(b);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // The logic tick while a run is active, and an immediate one on coming back to the app.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      step();
      setBeat((b) => (b + 1) % 1_000_000);
    }, 250);
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active') {
        lastSecond.current = null;
        step();
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [active != null, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the screen awake while the run screen is up.
  useEffect(() => {
    if (!visible || !active) return;
    activateKeepAwakeAsync('vt-run').catch(() => {});
    return () => {
      deactivateKeepAwake('vt-run').catch(() => {});
    };
  }, [visible, active != null]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = useCallback(
    (fn: (a: Active, now: number) => Active) => {
      const a = activeRef.current;
      if (!a) return;
      const next = fn(a, Date.now());
      lastSecond.current = null;
      setActive(next);
      syncAlerts(next);
    },
    [setActive, syncAlerts]
  );

  const startTimer = useCallback(
    (seconds: number, look: RunLook, opts?: { onboarding?: boolean }) => {
      const now = Date.now();
      const l = { ...look, ...fallbackLook(look.scene, look.color, isPro || !!opts?.onboarding) } as RunLook;
      const end = settingsRef.current.endSound;
      preloadSounds(end === 'none' ? ['tick', 'warn'] : ['tick', 'warn', end]);
      const a: Active = { kind: 'timer', timer: start(createTimer(seconds), now), look: l, recorded: false, onboarding: opts?.onboarding };
      lastSecond.current = null;
      setActive(a);
      setVisible(true);
      syncAlerts(a);
    },
    [isPro, setActive, syncAlerts]
  );

  const startRoutine = useCallback(
    (r: Routine) => {
      const now = Date.now();
      const look: RunLook = { name: r.name, icon: r.icon, scene: r.scene, color: r.color };
      const run = beginRoutine(r.id, r.name, r.steps.map((s) => ({ name: s.name, icon: s.icon, seconds: s.seconds })), now);
      const a: Active = { kind: 'routine', run, look, recorded: false };
      lastSecond.current = null;
      setActive(a);
      setVisible(true);
      syncAlerts(a);
    },
    [setActive, syncAlerts]
  );

  const value = useMemo<Runner>(
    () => ({
      active,
      visible,
      beat,
      startTimer,
      startRoutine,
      pause: () => change((a, now) => (a.kind === 'timer' ? { ...a, timer: pauseTimer(a.timer, now) } : { ...a, run: pauseRoutine(a.run, now) })),
      resume: () => change((a, now) => (a.kind === 'timer' ? { ...a, timer: resumeTimer(a.timer, now) } : { ...a, run: resumeRoutine(a.run, now) })),
      add: (ms: number) =>
        change((a, now) =>
          a.kind === 'timer' ? { ...a, timer: addTime(a.timer, ms, now), recorded: a.timer.status === 'done' ? false : a.recorded } : { ...a, run: addRoutineTime(a.run, ms, now) }
        ),
      restart: () =>
        change((a, now) => (a.kind === 'timer' ? { ...a, timer: restartTimer(a.timer, now), recorded: false } : { ...a, run: restartStep(a.run, now) })),
      next: () => change((a, now) => (a.kind === 'routine' ? { ...a, run: skipStep(a.run, now) } : a)),
      close: () => {
        const a = activeRef.current;
        const finished = a && ((a.kind === 'timer' && a.timer.status === 'done') || (a.kind === 'routine' && a.run.phase === 'finished'));
        stopAll();
        cancelAlerts();
        setVisible(false);
        setActive(null);
        // The parent closed a finished timer: the third one asks for a rating.
        if (finished) setTimeout(() => maybeRequestReviewAfterFinish(), 600);
      },
    }),
    [active, visible, beat, startTimer, startRoutine, change, setActive]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRunner(): Runner {
  const c = useContext(Ctx);
  if (!c) throw new Error('useRunner must be used inside RunnerProvider');
  return c;
}

/** "5 minute timer" style names for a plain timer from the timer screen. */
export function plainLook(seconds: number, scene: SceneId, color: ColorId): RunLook {
  return { name: plainTimerName(seconds), icon: null, scene, color };
}
