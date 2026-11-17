/**
 * The countdown, as pure functions on a small plain object (no imports, no
 * React), checked by `npm test`. Time left is always worked out from the
 * wall-clock end time, never by counting ticks, so it is right after the
 * app was in the background, the phone was locked, or the app was closed
 * and opened again (the state is stored as JSON by the runner).
 *
 * A timer is `ready` (set, not started), `running` (has an end time),
 * `paused` (keeps what was left) or `done`. Added time makes the whole
 * longer too, so the scene grows back by that much.
 */

export type TimerStatus = 'ready' | 'running' | 'paused' | 'done';

export interface TimerState {
  status: TimerStatus;
  /** The length that was picked, ms. Restart goes back to this. */
  baseMs: number;
  /** The whole, ms: the length picked plus any time added. The scene's full amount. */
  totalMs: number;
  /** Running only: the wall-clock time it ends, epoch ms. */
  endAt: number | null;
  /** Ready or paused: what is left, ms. Running and done: 0 (use remainingMs). */
  leftMs: number;
  /** Done only: when it reached zero, epoch ms. */
  doneAt: number | null;
  /** The one-minute warning has been given for this run. */
  warned: boolean;
}

/** The longest a timer can be, with added time: 4 hours. */
export const MAX_TOTAL_MS = 4 * 60 * 60 * 1000;

/** The one-minute warning is given at this much left... */
export const WARNING_AT_MS = 60_000;
/** ...only on timers longer than this, so a 1 minute timer does not warn as it starts. */
export const WARNING_MIN_TOTAL_MS = 2 * 60_000;

const clampMs = (ms: number) => Math.max(0, Math.min(MAX_TOTAL_MS, Math.round(Number.isFinite(ms) ? ms : 0)));

export function createTimer(seconds: number): TimerState {
  const ms = Math.max(1000, clampMs(seconds * 1000));
  return { status: 'ready', baseMs: ms, totalMs: ms, endAt: null, leftMs: ms, doneAt: null, warned: false };
}

/** Time left, ms, at `now`. */
export function remainingMs(t: TimerState, now: number): number {
  if (t.status === 'running') return Math.max(0, (t.endAt ?? now) - now);
  if (t.status === 'done') return 0;
  return t.leftMs;
}

/** How much of the whole is left, 1 at the start down to 0 at the end. What every scene draws. */
export function fractionLeft(t: TimerState, now: number): number {
  if (t.totalMs <= 0) return 0;
  return Math.max(0, Math.min(1, remainingMs(t, now) / t.totalMs));
}

/**
 * Brings the state up to `now`: a running timer whose end has passed is
 * done, with doneAt set to its end time (not to now), so history and a
 * routine's next step line up even when the app was away.
 */
export function settle(t: TimerState, now: number): TimerState {
  if (t.status === 'running' && t.endAt != null && now >= t.endAt) {
    return { ...t, status: 'done', leftMs: 0, doneAt: t.endAt, endAt: null };
  }
  return t;
}

/** Start or resume. A done timer is left as it is (use restart). */
export function start(t: TimerState, now: number): TimerState {
  if (t.status !== 'ready' && t.status !== 'paused') return t;
  if (t.leftMs <= 0) return { ...t, status: 'done', leftMs: 0, doneAt: now, endAt: null };
  return { ...t, status: 'running', endAt: now + t.leftMs, leftMs: 0 };
}

export function pause(t: TimerState, now: number): TimerState {
  const s = settle(t, now);
  if (s.status !== 'running') return s;
  return { ...s, status: 'paused', leftMs: remainingMs(s, now), endAt: null };
}

export const resume = start;

/** Back to the length that was picked, running from now. */
export function restart(t: TimerState, now: number): TimerState {
  return { status: 'running', baseMs: t.baseMs, totalMs: t.baseMs, endAt: now + t.baseMs, leftMs: 0, doneAt: null, warned: false };
}

/**
 * Adds time. Running or paused: the end moves out and the whole grows by
 * the same amount. Ready: the length grows. Done: it runs again for just
 * the added time, which becomes the whole (no warning for that short run).
 * Never past MAX_TOTAL_MS.
 */
export function addTime(t: TimerState, ms: number, now: number): TimerState {
  const s = settle(t, now);
  const add = Math.max(0, Math.round(ms));
  if (add === 0) return s;
  if (s.status === 'done') {
    const len = Math.min(add, MAX_TOTAL_MS);
    return { ...s, status: 'running', totalMs: len, endAt: now + len, leftMs: 0, doneAt: null, warned: true };
  }
  const room = Math.max(0, MAX_TOTAL_MS - s.totalMs);
  const a = Math.min(add, room);
  if (a === 0) return s;
  // With more than a minute left again, the warning can be given again later.
  const warned = s.warned && remainingMs(s, now) + a <= WARNING_AT_MS;
  if (s.status === 'running') return { ...s, totalMs: s.totalMs + a, endAt: (s.endAt ?? now) + a, warned };
  if (s.status === 'ready') return { ...s, baseMs: s.baseMs + a, totalMs: s.totalMs + a, leftMs: s.leftMs + a };
  return { ...s, totalMs: s.totalMs + a, leftMs: s.leftMs + a, warned };
}

/** True when the one-minute warning should be given now (then call markWarned). */
export function warningDue(t: TimerState, now: number): boolean {
  if (t.status !== 'running' || t.warned || t.totalMs <= WARNING_MIN_TOTAL_MS) return false;
  const left = remainingMs(t, now);
  return left > 0 && left <= WARNING_AT_MS;
}

export function markWarned(t: TimerState): TimerState {
  return t.warned ? t : { ...t, warned: true };
}

/** How long it actually ran for history: the whole, including added time. */
export function ranSeconds(t: TimerState): number {
  return Math.round(t.totalMs / 1000);
}

/** Reads a stored timer back; null when it is not one. */
export function parseTimer(raw: unknown): TimerState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const statuses: TimerStatus[] = ['ready', 'running', 'paused', 'done'];
  if (!statuses.includes(r.status as TimerStatus)) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const baseMs = num(r.baseMs);
  const totalMs = num(r.totalMs);
  if (baseMs == null || totalMs == null || totalMs <= 0) return null;
  const endAt = num(r.endAt);
  if (r.status === 'running' && endAt == null) return null;
  return {
    status: r.status as TimerStatus,
    baseMs: clampMs(baseMs),
    totalMs: clampMs(totalMs),
    endAt: r.status === 'running' ? endAt : null,
    leftMs: clampMs(num(r.leftMs) ?? 0),
    doneAt: num(r.doneAt),
    warned: r.warned === true,
  };
}
