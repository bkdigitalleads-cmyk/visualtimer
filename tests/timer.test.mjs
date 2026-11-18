// The timer and routine engines: time left across pause, the background
// (a jump in the wall clock with no ticks in between), added time, restart,
// the one-minute warning, stored state, and routines stepping through their
// steps while the app is away. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const T = await import('../src/timer.ts');
const R = await import('../src/routine.ts');

const S = 1000;
const MIN = 60 * S;
const t0 = Date.UTC(2026, 10, 17, 9, 0, 0);

test('a timer counts down from its end time: half way, the last second, the end, and never below zero', () => {
  let t = T.createTimer(300);
  assert.equal(t.status, 'ready');
  assert.equal(T.remainingMs(t, t0), 5 * MIN);
  assert.equal(T.fractionLeft(t, t0), 1);
  t = T.start(t, t0);
  assert.equal(t.status, 'running');
  assert.equal(t.endAt, t0 + 5 * MIN);
  assert.equal(T.remainingMs(t, t0 + 150 * S), 150 * S);
  assert.equal(T.fractionLeft(t, t0 + 150 * S), 0.5);
  assert.equal(T.remainingMs(t, t0 + 299_500), 500);
  assert.equal(T.remainingMs(t, t0 + 10 * MIN), 0);
  assert.equal(T.fractionLeft(t, t0 + 10 * MIN), 0);
  const done = T.settle(t, t0 + 5 * MIN);
  assert.equal(done.status, 'done');
  assert.equal(done.doneAt, t0 + 5 * MIN);
  assert.equal(T.settle(t, t0 + 5 * MIN - 1).status, 'running');
});

test('background: no ticks for minutes (phone locked), the time left is still right, and the end is the real end', () => {
  const t = T.start(T.createTimer(10 * 60), t0);
  // Nothing runs while the app is in the background; the next look is 7 minutes later.
  assert.equal(T.remainingMs(t, t0 + 7 * MIN), 3 * MIN);
  assert.equal(T.fractionLeft(t, t0 + 7 * MIN), 0.3);
  // Back after it should have ended: done, and done at its end time, not at the time we looked.
  const back = T.settle(t, t0 + 25 * MIN);
  assert.equal(back.status, 'done');
  assert.equal(back.doneAt, t0 + 10 * MIN);
  assert.equal(T.ranSeconds(back), 600);
  // A stored running timer read back after the app was closed works the same way.
  const again = T.parseTimer(JSON.parse(JSON.stringify(t)));
  assert.deepEqual(again, t);
  assert.equal(T.remainingMs(again, t0 + 4 * MIN), 6 * MIN);
});

test('pause keeps what was left however long it stays paused, also across the background; resume picks up from there', () => {
  let t = T.start(T.createTimer(300), t0);
  t = T.pause(t, t0 + 100 * S);
  assert.equal(t.status, 'paused');
  assert.equal(t.endAt, null);
  assert.equal(T.remainingMs(t, t0 + 100 * S), 200 * S);
  assert.equal(T.remainingMs(t, t0 + 3 * 60 * MIN), 200 * S, 'three hours paused, nothing lost');
  assert.equal(T.settle(t, t0 + 3 * 60 * MIN).status, 'paused');
  t = T.resume(t, t0 + 60 * MIN);
  assert.equal(t.status, 'running');
  assert.equal(t.endAt, t0 + 60 * MIN + 200 * S);
  assert.equal(T.fractionLeft(t, t0 + 60 * MIN), 200 / 300);
  // Pause twice, resume twice: the pauses add up.
  t = T.pause(t, t0 + 60 * MIN + 50 * S);
  t = T.resume(t, t0 + 90 * MIN);
  assert.equal(T.remainingMs(t, t0 + 90 * MIN), 150 * S);
  // Pausing after the end has passed gives a done timer, not a paused one.
  const late = T.pause(T.start(T.createTimer(60), t0), t0 + 2 * MIN);
  assert.equal(late.status, 'done');
});

test('add one minute and add five minutes: the end moves out, the whole grows, the scene grows back by that much', () => {
  let t = T.start(T.createTimer(300), t0);
  t = T.addTime(t, MIN, t0 + 240 * S); // 60 s left, add 1 min
  assert.equal(T.remainingMs(t, t0 + 240 * S), 2 * MIN);
  assert.equal(t.totalMs, 6 * MIN);
  assert.equal(t.endAt, t0 + 6 * MIN);
  assert.equal(T.fractionLeft(t, t0 + 240 * S), 2 / 6);
  t = T.addTime(t, 5 * MIN, t0 + 240 * S);
  assert.equal(T.remainingMs(t, t0 + 240 * S), 7 * MIN);
  assert.equal(T.ranSeconds(t), 11 * 60);
  // While paused.
  let p = T.pause(T.start(T.createTimer(120), t0), t0 + 30 * S);
  p = T.addTime(p, MIN, t0 + 5 * MIN);
  assert.equal(p.status, 'paused');
  assert.equal(T.remainingMs(p, t0 + 9 * MIN), 150 * S);
  // Before it starts: the picked length itself grows, so Restart keeps it.
  const r = T.addTime(T.createTimer(60), 5 * MIN, t0);
  assert.equal(r.baseMs, 6 * MIN);
  assert.equal(T.remainingMs(r, t0), 6 * MIN);
  // After it is done (also when the app was away past the end): a new short run of just the added time.
  const d = T.addTime(T.start(T.createTimer(60), t0), MIN, t0 + 10 * MIN);
  assert.equal(d.status, 'running');
  assert.equal(d.totalMs, MIN);
  assert.equal(T.remainingMs(d, t0 + 10 * MIN), MIN);
  assert.equal(T.fractionLeft(d, t0 + 10 * MIN), 1);
  // Never past four hours.
  const big = T.addTime(T.start(T.createTimer(2 * 60 * 60), t0), 3 * 60 * MIN, t0);
  assert.equal(big.totalMs, T.MAX_TOTAL_MS);
});

test('add time after a trip to the background: what was used up while away stays used up', () => {
  let t = T.start(T.createTimer(600), t0);
  t = T.addTime(t, 5 * MIN, t0 + 8 * MIN); // away for 8 minutes, then +5
  assert.equal(T.remainingMs(t, t0 + 8 * MIN), 7 * MIN);
  assert.equal(t.totalMs, 15 * MIN);
  assert.equal(T.fractionLeft(t, t0 + 8 * MIN), 7 / 15);
});

test('restart goes back to the length that was picked, running from now', () => {
  let t = T.start(T.createTimer(300), t0);
  t = T.addTime(t, 5 * MIN, t0 + MIN);
  t = T.restart(t, t0 + 2 * MIN);
  assert.equal(t.status, 'running');
  assert.equal(t.totalMs, 5 * MIN);
  assert.equal(T.remainingMs(t, t0 + 2 * MIN), 5 * MIN);
  const done = T.restart(T.settle(T.start(T.createTimer(60), t0), t0 + MIN), t0 + 2 * MIN);
  assert.equal(done.status, 'running');
  assert.equal(done.warned, false);
});

test('one-minute warning: once, at a minute left, only on timers over two minutes, again after time is added', () => {
  let t = T.start(T.createTimer(300), t0);
  assert.equal(T.warningDue(t, t0 + 3 * MIN), false);
  assert.equal(T.warningDue(t, t0 + 4 * MIN), true);
  t = T.markWarned(t);
  assert.equal(T.warningDue(t, t0 + 4 * MIN + 10 * S), false);
  t = T.addTime(t, 5 * MIN, t0 + 4 * MIN + 10 * S);
  assert.equal(t.warned, false);
  assert.equal(T.warningDue(t, t0 + 9 * MIN), true);
  // Short timers never warn; nor does a paused one or one at zero.
  assert.equal(T.warningDue(T.start(T.createTimer(60), t0), t0 + 5 * S), false);
  assert.equal(T.warningDue(T.start(T.createTimer(120), t0), t0 + 70 * S), false);
  assert.equal(T.warningDue(T.pause(T.start(T.createTimer(300), t0), t0 + 4 * MIN + 30 * S), t0 + 4 * MIN + 30 * S), false);
  assert.equal(T.warningDue(T.start(T.createTimer(300), t0), t0 + 5 * MIN), false);
});

test('stored timers: bad or partial values are refused, never half-read', () => {
  assert.equal(T.parseTimer(null), null);
  assert.equal(T.parseTimer({ status: 'running', baseMs: 1, totalMs: 1 }), null, 'running needs an end');
  assert.equal(T.parseTimer({ status: 'odd', baseMs: 1, totalMs: 1 }), null);
  assert.equal(T.parseTimer({ status: 'paused', baseMs: 60000, totalMs: 0 }), null);
  const p = T.parseTimer({ status: 'paused', baseMs: 60000, totalMs: 60000, leftMs: 30000 });
  assert.equal(T.remainingMs(p, t0), 30000);
});

// ---------- routines ----------

const steps = [
  { name: 'Get dressed', icon: 'shirt', seconds: 120 },
  { name: 'Breakfast', icon: 'bowl', seconds: 300 },
  { name: 'Brush teeth', icon: 'tooth', seconds: 60 },
];

test('a routine runs its steps in order with a short cheer between them', () => {
  let run = R.startRoutine('r', 'Morning', steps, t0);
  assert.equal(run.phase, 'step');
  assert.equal(T.remainingMs(run.timer, t0), 2 * MIN);
  let out = R.settleRoutine(run, t0 + 2 * MIN);
  assert.equal(out.run.phase, 'cheer');
  assert.deepEqual(out.finished, [{ index: 0, at: t0 + 2 * MIN, seconds: 120 }]);
  assert.equal(out.run.cheerUntil, t0 + 2 * MIN + R.CHEER_MS);
  out = R.settleRoutine(out.run, t0 + 2 * MIN + R.CHEER_MS);
  assert.equal(out.run.phase, 'step');
  assert.equal(out.run.index, 1);
  assert.equal(T.remainingMs(out.run.timer, t0 + 2 * MIN + R.CHEER_MS), 5 * MIN);
  assert.equal(out.finished.length, 0);
});

test('a routine left running in the background is in the right step, with the right time left, when the app comes back', () => {
  const run = R.startRoutine('r', 'Morning', steps, t0);
  // Back 4 minutes in: step 1 ended at 2:00, cheer to 2:05, breakfast since then.
  const back = R.settleRoutine(run, t0 + 4 * MIN);
  assert.equal(back.run.index, 1);
  assert.equal(back.run.phase, 'step');
  assert.equal(T.remainingMs(back.run.timer, t0 + 4 * MIN), 5 * MIN - (2 * MIN - R.CHEER_MS));
  // Back an hour later: all done, and every step is counted at its real end.
  const late = R.settleRoutine(run, t0 + 60 * MIN);
  assert.equal(late.run.phase, 'finished');
  assert.deepEqual(late.finished.map((f) => f.index), [0, 1, 2]);
  const end = t0 + 2 * MIN + R.CHEER_MS + 5 * MIN + R.CHEER_MS + MIN;
  assert.equal(late.run.finishedAt, end);
  assert.equal(late.finished[2].at, end);
  // The notifications scheduled at the start line up with those ends.
  assert.deepEqual(R.upcomingStepEnds(run, t0).map((e) => e.at), late.finished.map((f) => f.at));
  assert.equal(R.routineRemainingMs(run, t0), end - t0);
});

test('routines: pause, add time and restart work on the current step; Next skips; a stored run reads back', () => {
  let run = R.startRoutine('r', 'Morning', steps, t0);
  run = R.pauseRoutine(run, t0 + MIN);
  assert.deepEqual(R.upcomingStepEnds(run, t0 + MIN), [], 'paused: nothing to schedule');
  assert.equal(R.settleRoutine(run, t0 + 30 * MIN).run.index, 0, 'a paused step never ends');
  run = R.resumeRoutine(run, t0 + 30 * MIN);
  run = R.addRoutineTime(run, MIN, t0 + 30 * MIN);
  assert.equal(T.remainingMs(run.timer, t0 + 30 * MIN), 2 * MIN);
  run = R.restartStep(run, t0 + 31 * MIN);
  assert.equal(T.remainingMs(run.timer, t0 + 31 * MIN), 2 * MIN);
  run = R.skipStep(run, t0 + 32 * MIN);
  assert.equal(run.index, 1);
  assert.equal(T.remainingMs(run.timer, t0 + 32 * MIN), 5 * MIN);
  const stored = R.parseRoutineRun(JSON.parse(JSON.stringify(run)));
  assert.deepEqual(stored, run);
  run = R.skipStep(R.skipStep(run, t0 + 33 * MIN), t0 + 34 * MIN);
  assert.equal(run.phase, 'finished');
  assert.equal(R.parseRoutineRun({ steps: [], index: 0, timer: run.timer }), null);
});
