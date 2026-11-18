/**
 * A routine running: its steps in order, each a timer, with a short
 * celebration between steps. Pure functions on plain objects, checked by
 * `npm test`. Like the timer, everything is worked out from wall-clock
 * times, so a routine that kept going while the phone was locked is in the
 * right step, with the right time left, when the app comes back.
 */
import {
  addTime,
  createTimer,
  pause,
  remainingMs,
  restart,
  resume,
  settle,
  start,
  parseTimer,
} from './timer.ts';
import type { TimerState } from './timer.ts';

export interface RunStep {
  name: string;
  icon: string;
  seconds: number;
}

export type RoutinePhase = 'step' | 'cheer' | 'finished';

export interface RoutineRun {
  routineId: string;
  name: string;
  steps: RunStep[];
  /** The step on screen (during a cheer: the one just finished). */
  index: number;
  phase: RoutinePhase;
  timer: TimerState;
  /** Cheer only: when the next step starts, epoch ms. */
  cheerUntil: number | null;
  /** When the whole routine finished, epoch ms. */
  finishedAt: number | null;
}

/** The celebration between steps. */
export const CHEER_MS = 5000;

export interface StepDone {
  index: number;
  at: number;
  seconds: number;
}

export function startRoutine(routineId: string, name: string, steps: RunStep[], now: number): RoutineRun {
  if (steps.length === 0) {
    return { routineId, name, steps, index: 0, phase: 'finished', timer: createTimer(60), cheerUntil: null, finishedAt: now };
  }
  return {
    routineId,
    name,
    steps,
    index: 0,
    phase: 'step',
    timer: start(createTimer(steps[0].seconds), now),
    cheerUntil: null,
    finishedAt: null,
  };
}

/**
 * Brings a routine up to `now`, step by step: a step whose end has passed
 * goes to its cheer, a cheer whose time is up starts the next step at the
 * moment the cheer ended. Returns the new run and the steps that finished
 * on the way (for history and sounds).
 */
export function settleRoutine(run: RoutineRun, now: number): { run: RoutineRun; finished: StepDone[] } {
  let r = run;
  const finished: StepDone[] = [];
  for (let guard = 0; guard < 1000; guard++) {
    if (r.phase === 'step') {
      const t = settle(r.timer, now);
      if (t.status !== 'done') {
        if (t !== r.timer) r = { ...r, timer: t };
        break;
      }
      const at = t.doneAt ?? now;
      finished.push({ index: r.index, at, seconds: Math.round(t.totalMs / 1000) });
      if (r.index >= r.steps.length - 1) {
        r = { ...r, timer: t, phase: 'finished', finishedAt: at, cheerUntil: null };
        break;
      }
      r = { ...r, timer: t, phase: 'cheer', cheerUntil: at + CHEER_MS };
      continue;
    }
    if (r.phase === 'cheer') {
      const until = r.cheerUntil ?? now;
      if (now < until) break;
      const next = r.index + 1;
      r = { ...r, index: next, phase: 'step', cheerUntil: null, timer: start(createTimer(r.steps[next].seconds), until) };
      continue;
    }
    break;
  }
  return { run: r, finished };
}

/** Pause or resume the current step. A cheer cannot be paused (it is a few seconds). */
export function pauseRoutine(run: RoutineRun, now: number): RoutineRun {
  if (run.phase !== 'step') return run;
  return { ...run, timer: pause(run.timer, now) };
}

export function resumeRoutine(run: RoutineRun, now: number): RoutineRun {
  if (run.phase !== 'step') return run;
  return { ...run, timer: resume(run.timer, now) };
}

export function addRoutineTime(run: RoutineRun, ms: number, now: number): RoutineRun {
  if (run.phase !== 'step') return run;
  return { ...run, timer: addTime(run.timer, ms, now) };
}

export function restartStep(run: RoutineRun, now: number): RoutineRun {
  if (run.phase === 'finished') return run;
  return { ...run, phase: 'step', cheerUntil: null, timer: restart(run.timer, now) };
}

/**
 * Next step now, without waiting (the parent's "Next" button). From the
 * last step, the routine finishes. The skipped step is not counted as done.
 */
export function skipStep(run: RoutineRun, now: number): RoutineRun {
  if (run.phase === 'finished') return run;
  const next = run.index + 1;
  if (next >= run.steps.length) return { ...run, phase: 'finished', finishedAt: now, cheerUntil: null };
  return { ...run, index: next, phase: 'step', cheerUntil: null, timer: start(createTimer(run.steps[next].seconds), now) };
}

/**
 * When every step left will end, if nothing is paused or changed: the
 * times for the local notifications. A paused step has no end, so nothing
 * is listed until it runs again.
 */
export function upcomingStepEnds(run: RoutineRun, now: number): { index: number; at: number }[] {
  const out: { index: number; at: number }[] = [];
  if (run.phase === 'finished') return out;
  let t: number;
  let i = run.index;
  if (run.phase === 'cheer') {
    t = run.cheerUntil ?? now;
    i = run.index + 1;
  } else {
    if (run.timer.status !== 'running') return out;
    t = now + remainingMs(run.timer, now);
    out.push({ index: i, at: t });
    t += CHEER_MS;
    i += 1;
  }
  for (; i < run.steps.length; i++) {
    t += run.steps[i].seconds * 1000;
    out.push({ index: i, at: t });
    t += CHEER_MS;
  }
  return out;
}

/** Seconds left in the whole routine at `now`, counting the cheers. */
export function routineRemainingMs(run: RoutineRun, now: number): number {
  if (run.phase === 'finished') return 0;
  let ms = run.phase === 'cheer' ? Math.max(0, (run.cheerUntil ?? now) - now) : remainingMs(run.timer, now);
  for (let i = run.index + 1; i < run.steps.length; i++) ms += CHEER_MS + run.steps[i].seconds * 1000;
  return ms;
}

export function parseRoutineRun(raw: unknown): RoutineRun | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const timer = parseTimer(r.timer);
  if (!timer || !Array.isArray(r.steps) || typeof r.index !== 'number') return null;
  const steps = (r.steps as unknown[])
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .filter((s) => typeof s.name === 'string' && typeof s.seconds === 'number')
    .map((s) => ({ name: s.name as string, icon: typeof s.icon === 'string' ? s.icon : 'heart', seconds: s.seconds as number }));
  if (steps.length === 0 || r.index < 0 || r.index >= steps.length) return null;
  const phase = (['step', 'cheer', 'finished'] as RoutinePhase[]).includes(r.phase as RoutinePhase) ? (r.phase as RoutinePhase) : 'step';
  return {
    routineId: typeof r.routineId === 'string' ? r.routineId : '',
    name: typeof r.name === 'string' ? r.name : 'Routine',
    steps,
    index: r.index,
    phase,
    timer,
    cheerUntil: typeof r.cheerUntil === 'number' ? r.cheerUntil : null,
    finishedAt: typeof r.finishedAt === 'number' ? r.finishedAt : null,
  };
}
