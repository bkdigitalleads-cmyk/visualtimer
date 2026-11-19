// Build 3, fixes from the TestFlight test of build 2: any time from 5
// seconds to 4 hours (30 sec quick pick, Custom), natural duration words,
// the dial with any value, the child lock explanation flow, the silent
// switch, the label inset and the pinned paywall close button.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import('../src/model.ts');
const U = await import('../src/rules.ts');
const T = await import('../src/timer.ts');
const ROOT = new URL('..', import.meta.url).pathname;
const src = (f) => readFileSync(`${ROOT}${f}`, 'utf8');

test('duration words: seconds under a minute, one unit in full, mixed units read naturally', () => {
  assert.equal(M.durationWords(30), '30 seconds');
  assert.equal(M.durationWords(1), '1 second');
  assert.equal(M.durationWords(5), '5 seconds');
  assert.equal(M.durationWords(60), '1 minute');
  assert.equal(M.durationWords(45 * 60), '45 minutes');
  assert.equal(M.durationWords(150), '2 min 30 sec');
  assert.equal(M.durationWords(5400), '1 hr 30 min');
  assert.equal(M.durationWords(3600), '1 hour');
  assert.equal(M.durationWords(4 * 3600), '4 hours');
  assert.equal(M.durationWords(3600 + 5 * 60 + 10), '1 hr 5 min 10 sec');
  assert.equal(M.durationShort(30), '30 sec');
  assert.equal(M.durationShort(5400), '1 hr 30 min');
  assert.equal(M.durationShort(4 * 3600), '4 hr');
});

test('quick picks: 30 sec first, then minutes; a chip is highlighted only on an exact match, otherwise Custom', () => {
  assert.deepEqual(M.QUICK_PICKS[0], { seconds: 30, label: '30', sub: 'sec' });
  assert.ok(M.QUICK_PICKS.slice(1).every((p) => p.sub === 'min' && p.seconds === Number(p.label) * 60));
  assert.equal(M.quickPickFor(30), 0);
  assert.equal(M.quickPickFor(300), M.QUICK_PICKS.findIndex((p) => p.seconds === 300));
  assert.equal(M.quickPickFor(301), null);
  assert.equal(M.quickPickFor(150), null);
  assert.equal(M.quickPickFor(5400), null);
  assert.equal(M.quickPickFor(45), null);
});

test('custom time: 5 seconds to 4 hours, the same limit as the timer engine; stored values keep parsing', () => {
  assert.equal(M.MIN_SECONDS, 5);
  assert.equal(M.MAX_SECONDS * 1000, T.MAX_TOTAL_MS);
  assert.equal(M.clampSeconds(1), 5);
  assert.equal(M.clampSeconds(5), 5);
  assert.equal(M.clampSeconds(5400), 5400);
  assert.equal(M.clampSeconds(99999), 4 * 3600);
  assert.equal(M.clampSeconds(NaN), 300);
  // Values build 1 and 2 could store (10 seconds to 2 hours) read back unchanged.
  assert.equal(M.parseSettings({ seconds: 10 }).seconds, 10);
  assert.equal(M.parseSettings({ seconds: 7200 }).seconds, 7200);
  // A saved timer and a routine step can now be seconds or longer than an hour.
  assert.equal(M.parseSaved([{ id: 'a', name: 'Quick tidy', seconds: 45 }])[0].seconds, 45);
  const r = M.parseRoutines([{ id: 'r', name: 'Long', steps: [{ id: 's', name: 'Movie', seconds: 5400 }, { id: 't', name: 'Hop', seconds: 30 }] }]);
  assert.equal(M.routineSeconds(r[0]), 5430);
  assert.equal(M.durationShort(M.routineSeconds(r[0])), '1 hr 30 min 30 sec');
});

test('custom time steppers: hours, minutes and seconds (steps of 5) stop at their ends and never pass 4 hours', () => {
  assert.equal(M.stepHMS(150, 's', 1), 155);
  assert.equal(M.stepHMS(150, 's', -1), 145);
  assert.equal(M.stepHMS(152, 's', 1), 155, 'an odd value snaps up to the next step');
  assert.equal(M.stepHMS(152, 's', -1), 150, 'and down to the one below');
  assert.equal(M.stepHMS(55, 's', 1), 55, 'seconds stop at 55, no wrap into minutes');
  assert.equal(M.stepHMS(0, 's', -1), 0);
  assert.equal(M.stepHMS(59 * 60, 'm', 1), 59 * 60);
  assert.equal(M.stepHMS(0, 'm', -1), 0);
  assert.equal(M.stepHMS(90, 'm', 1), 150);
  assert.equal(M.stepHMS(3 * 3600 + 1800, 'h', 1), 4 * 3600, '4 hr 30 min is cut to 4 hours');
  assert.equal(M.stepHMS(4 * 3600, 'm', 1), 4 * 3600);
  assert.equal(M.stepHMS(4 * 3600, 'h', -1), 3 * 3600);
  assert.equal(M.canStepHMS(4 * 3600, 'h', 1), false);
  assert.equal(M.canStepHMS(4 * 3600, 's', 1), false);
  assert.equal(M.canStepHMS(0, 'h', -1), false);
  assert.equal(M.canStepHMS(300, 'm', 1), true);
  assert.deepEqual(M.splitHMS(5430), { h: 1, m: 30, s: 30 });
  assert.equal(M.joinHMS({ h: 1, m: 30, s: 30 }), 5430);
});

test('dial: any value shows, over an hour shows full; turning still sets whole minutes 1 to 60', () => {
  assert.equal(M.dialFill(30), 30 / 3600);
  assert.equal(M.dialFill(150), 150 / 3600);
  assert.equal(M.dialFill(3600), 1);
  assert.equal(M.dialFill(5400), 1);
  assert.equal(M.dialFill(0), 0);
  const dial = src('src/ui/Dial.tsx');
  assert.match(dial, /const value = dialFill\(seconds\) \* 60;/);
  assert.match(dial, /m = Math\.max\(1, Math\.min\(60,/);
  const home = src('src/screens/TimerHome.tsx');
  assert.match(home, /onChange=\{\(m\) => updateSettings\(\{ seconds: m \* 60 \}\)\}/);
});

test('timer screen: 30 sec chip first, Custom chip last, the time under the dial opens the same sheet; editors use the same field', () => {
  const home = src('src/screens/TimerHome.tsx');
  assert.match(home, /QUICK_PICKS\.map\(\(p, i\) => \(\s*<Chip key=\{p\.seconds\} theme=\{theme\} label=\{p\.label\} sub=\{p\.sub\} active=\{match === i\}/);
  assert.match(home, /<Chip theme=\{theme\} label="Custom"[^>]*active=\{match === null\} onPress=\{\(\) => setCustom\(true\)\} \/>/);
  assert.match(home, /accessibilityHint="Opens the custom time"/);
  assert.match(home, /<TimeSheet/);
  for (const f of ['src/screens/Saved.tsx', 'src/screens/Routines.tsx']) {
    assert.match(src(f), /<DurationField theme=\{theme\} seconds=\{s\.seconds\}/, f);
    assert.ok(!/MinutesField/.test(src(f)), `${f} no longer limits to whole minutes`);
  }
  const sheet = src('src/ui/TimeSheet.tsx');
  assert.match(sheet, /label="Done"/);
  assert.match(sheet, /onDone\(clampSeconds\(value\)\)/);
  // Custom times are free: nothing about Pro in the sheet or the field.
  assert.ok(!/isPro|askPro|canUse/.test(sheet));
});

test('child lock: the explanation first until a grown-up has turned it on by hand; after buying from the lock, never a straight lock', () => {
  assert.equal(U.LOCK_EXPLAINED_FLAG, 'lockExplained');
  assert.equal(U.lockTap({ isPro: false, explained: false }), 'paywall');
  assert.equal(U.lockTap({ isPro: false, explained: true }), 'paywall');
  assert.equal(U.lockTap({ isPro: true, explained: false }), 'explain');
  assert.equal(U.lockTap({ isPro: true, explained: true }), 'lock');
  assert.equal(U.afterLockPaywall(true), 'explain');
  assert.equal(U.afterLockPaywall(false), 'none');
  assert.equal(U.autoLockSwitch({ on: false, isPro: true, explained: false }), 'set');
  assert.equal(U.autoLockSwitch({ on: true, isPro: false, explained: true }), 'paywall');
  assert.equal(U.autoLockSwitch({ on: true, isPro: true, explained: false }), 'explain');
  assert.equal(U.autoLockSwitch({ on: true, isPro: true, explained: true }), 'set');
  const run = src('src/screens/Run.tsx');
  assert.match(run, /if \(afterLockPaywall\(pro\) === 'explain'\) setTimeout\(\(\) => setExplain\(true\), 150\);/);
  assert.match(run, /flagSet\(LOCK_EXPLAINED_FLAG, '1'\)/, 'the flag is set by Lock now');
  assert.match(run, /Locked\. Hold any corner for 2 seconds to unlock\./);
  assert.match(run, /<CornerMark key=/);
  assert.match(run, /const hold = useHold\(onUnlock\);/, 'the same 2 second hold');
  assert.match(run, /Locked\. A grown-up can hold a corner for 2 seconds\./, 'the toast on touch stays');
  const lockSheet = src('src/ui/LockSheet.tsx');
  assert.match(lockSheet, /ignores every touch/);
  assert.match(lockSheet, /holds any corner of the screen for 2 seconds/);
  assert.match(lockSheet, /label="Not now"/);
  assert.match(src('src/screens/Settings.tsx'), /<LockSheet[\s\S]{0,80}primaryLabel="Turn on"/);
});

test('sound: Play sound when the phone is on silent, on by default, sets playsInSilentMode; the help text says how it works', () => {
  assert.equal(M.DEFAULT_SETTINGS.playOnSilent, true);
  assert.equal(M.parseSettings({}).playOnSilent, true);
  assert.equal(M.parseSettings({ playOnSilent: false }).playOnSilent, false);
  assert.match(src('src/sound.ts'), /playsInSilentMode: playOnSilent,/);
  assert.match(src('src/runner.tsx'), /setPlayOnSilent\(settings\.playOnSilent\)/);
  const set = src('src/screens/Settings.tsx');
  assert.match(set, /title="Play sound when the phone is on silent"/);
  assert.match(set, /plays even with the ring switch on silent, unless you turn this off/);
  assert.match(set, /comes as a notification instead, which needs notifications allowed for Visual Timer and follows the ring switch/);
});

test('label inset lines up with the chips (space.l), and the paywall close button is pinned outside the scrolling content', () => {
  const kit = src('src/ui/Kit.tsx');
  assert.match(kit, /label: \{[^}]*marginHorizontal: space\.xs \}/);
  assert.ok(!/label: \{[^}]*marginLeft/.test(kit), 'no marginLeft to override the inset');
  assert.match(kit, /labelInset: \{ marginHorizontal: space\.l \}/);
  assert.match(src('src/screens/TimerHome.tsx'), /contentContainerStyle=\{\{ gap: space\.s, paddingHorizontal: space\.l \}\}/);
  const pay = src('src/screens/Paywall.tsx');
  assert.match(pay, /close: \{ position: 'absolute', top: space\.m, right: space\.l/);
  const scroll = pay.slice(pay.indexOf('<ScrollView'), pay.indexOf('</ScrollView>'));
  assert.ok(!/accessibilityLabel="Close"/.test(scroll), 'the close button is not inside the ScrollView');
  assert.match(pay, /const ONBOARDING_CLOSE_DELAY_MS = 3000;/);
});
