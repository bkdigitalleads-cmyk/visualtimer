// Unit checks for the engine port: plan and trial rules, the rating guard,
// stored formats, and the app config (identity, the three Cowork
// placeholders, plugins). Run with `npm test` (Node 22+ strips the
// TypeScript types itself).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const O = await import('../src/offer.ts');
const U = await import('../src/rules.ts');
const M = await import('../src/model.ts');
const G = await import('../src/gates.ts');

const ROOT = new URL('..', import.meta.url).pathname;

export function walk(dir, ext, skip = ['node_modules', '.git', 'dist', '.expo']) {
  return readdirSync(dir).flatMap((f) => {
    if (skip.includes(f)) return [];
    const p = `${dir}/${f}`;
    return statSync(p).isDirectory() ? walk(p, ext, skip) : ext.some((e) => p.endsWith(e)) ? [p] : [];
  });
}

// ---------- plans and trials ----------

test('trial: "3 days free" only for a free intro offer this Apple ID can still get', () => {
  const intro = { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' };
  assert.equal(O.trialLength(intro), '3 days');
  assert.equal(O.trialLength({ ...intro, periodNumberOfUnits: 1, periodUnit: 'WEEK' }), '1 week');
  assert.equal(O.trialLength({ ...intro, price: 0.99 }), null);
  assert.equal(O.trialLength(null), null);
  assert.equal(O.trialLabelFrom(intro, true), '3 days free');
  assert.equal(O.trialLabelFrom(intro, false), null);
});

test('trial reminder: a day before the trial ends; sandbox-short or unknown ends fall back to 2 days out', () => {
  const H = 3_600_000;
  const now = Date.UTC(2026, 10, 17, 12);
  assert.equal(O.trialReminderAt(now + 72 * H, now), now + 48 * H);
  assert.equal(O.trialReminderAt(now + 5 * 60_000, now), now + 48 * H);
  assert.equal(O.trialReminderAt(null, now), now + 48 * H);
});

test('plans: Yearly first and preselected, Lifetime second, Weekly third; other packages after', () => {
  assert.deepEqual(O.PLAN_ORDER, ['ANNUAL', 'LIFETIME', 'WEEKLY']);
  const sorted = ['WEEKLY', 'MONTHLY', 'LIFETIME', 'ANNUAL'].sort((a, b) => O.planRank(a) - O.planRank(b));
  assert.deepEqual(sorted, ['ANNUAL', 'LIFETIME', 'WEEKLY', 'MONTHLY']);
  assert.equal(O.preselect(['WEEKLY', 'LIFETIME', 'ANNUAL']), 'ANNUAL');
  assert.equal(O.preselect(['WEEKLY', 'LIFETIME']), 'LIFETIME');
  assert.equal(O.preselect([]), null);
  assert.equal(O.planTypeOf('MONTHLY'), null);
  assert.equal(O.planTag('ANNUAL'), 'BEST VALUE');
  assert.equal(O.planTag('WEEKLY'), null);
  assert.equal(O.planTag('LIFETIME'), null);
});

test('plans: row lines, the weekly equivalent under Yearly, the button and the disclosure all use store prices', () => {
  assert.equal(O.planLine('ANNUAL', '$24.99', '3 days free'), '3 days free, then $24.99/year');
  assert.equal(O.planLine('ANNUAL', '$24.99', null), '$24.99/year');
  assert.equal(O.planLine('WEEKLY', '$4.99', null), '$4.99/week');
  assert.equal(O.planLine('LIFETIME', '$49.99', null), 'Pay once, keep forever');
  assert.equal(O.perWeekLine(24.99, 'USD'), `About ${(24.99 / 52).toLocaleString(undefined, { style: 'currency', currency: 'USD' })} a week`);
  assert.match(O.perWeekLine(24.99, 'USD'), /0\.48/);
  assert.equal(O.perWeekLine(0, 'USD'), null);
  assert.equal(O.perWeekLine(null, 'USD'), null);
  assert.equal(O.buttonLabel('3 days free'), 'Continue with 3 days free');
  assert.equal(O.buttonLabel(null), 'Continue');
  assert.match(O.disclosureFor('ANNUAL', '$24.99', '3 days free'), /Yearly \$24\.99\/year is an auto-renewing subscription.*3 days free/);
  assert.match(O.disclosureFor('LIFETIME', '$49.99', null), /one-time purchase, not a subscription/);
  assert.match(O.disclosureFor('WEEKLY', '$4.99', null), /Weekly \$4\.99\/week/);
  assert.match(O.disclosureFor(null, null, null), /yearly or weekly/);
  // No price is ever written into the source of the paywall or onboarding.
  for (const f of walk(`${ROOT}src`, ['.ts', '.tsx'])) {
    // Code only: comments may give an example price.
    const s = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/\$\d+\.\d\d/.test(s), `hard-coded price in ${f}`);
  }
});

// ---------- rating prompts ----------

test('rating asks: never while a timer is on screen, once per launch, each trigger once, only when StoreKit can', () => {
  const ok = { timerOnScreen: false, askedThisLaunch: false, triggerUsed: false, storeCanAsk: true };
  assert.equal(U.shouldAsk(ok), true);
  assert.equal(U.shouldAsk({ ...ok, timerOnScreen: true }), false);
  assert.equal(U.shouldAsk({ ...ok, askedThisLaunch: true }), false);
  assert.equal(U.shouldAsk({ ...ok, triggerUsed: true }), false);
  assert.equal(U.shouldAsk({ ...ok, storeCanAsk: false }), false);
});

test('rating asks: after the third finished timer (or later if the third could not), and after a trial starts', () => {
  assert.equal(U.finishedReview(1), null);
  assert.equal(U.finishedReview(2), null);
  assert.equal(U.finishedReview(3), 'thirdTimer');
  assert.equal(U.finishedReview(7), 'thirdTimer');
  assert.equal(U.purchaseReview({ isPro: true, inTrial: true }), 'trialStarted');
  assert.equal(U.purchaseReview({ isPro: true, inTrial: false }), null, 'lifetime or a paid plan: no ask');
  assert.equal(U.purchaseReview({ isPro: false, inTrial: true }), null);
  assert.match(U.dayKey(Date.now()), /^\d{4}-\d{2}-\d{2}$/);
});

// ---------- stored formats ----------

test('settings: defaults, unknown values dropped, times clamped', () => {
  assert.deepEqual(M.parseSettings(null), M.DEFAULT_SETTINGS);
  assert.equal(M.DEFAULT_SETTINGS.color, 'teal');
  assert.equal(M.DEFAULT_SETTINGS.scene, 'wedge');
  const s = M.parseSettings({ endSound: 'bells', ticking: true, color: 'nope', scene: 'rocket', seconds: 99999, extra: 1 });
  assert.equal(s.endSound, 'bells');
  assert.equal(s.ticking, true);
  assert.equal(s.color, 'teal');
  assert.equal(s.scene, 'rocket');
  assert.equal(s.seconds, M.MAX_SECONDS);
  assert.equal(M.parseSettings({ seconds: 2 }).seconds, M.MIN_SECONDS);
});

test('saved timers and routines: the starters, round trips, bad entries skipped, old files still read', () => {
  const saved = M.starterSaved();
  assert.deepEqual(saved.map((s) => s.name), ['Brush teeth', 'Screen time', 'Clean up', 'Homework', 'Quiet time']);
  assert.deepEqual(M.parseSaved(JSON.parse(JSON.stringify(saved))), saved);
  assert.equal(M.parseSaved('x'), null);
  assert.deepEqual(M.parseSaved([{ id: 'a', name: 'Nap', seconds: 600 }, { name: 'no id' }, 5]), [
    { id: 'a', name: 'Nap', icon: 'heart', seconds: 600, scene: 'wedge', color: 'teal' },
  ]);
  const routines = M.starterRoutines();
  assert.deepEqual(routines.map((r) => r.name), ['Morning', 'Bedtime', 'Leaving the house']);
  assert.ok(routines.every((r) => r.steps.length >= 4 && r.steps.every((s) => s.seconds >= 60)));
  assert.deepEqual(M.parseRoutines(JSON.parse(JSON.stringify(routines))), routines);
  assert.equal(M.routineSeconds(routines[0]), (3 + 5 + 15 + 2 + 3) * 60);
  assert.deepEqual(M.moveStep([1, 2, 3], 0, 1), [2, 1, 3]);
  assert.deepEqual(M.moveStep([1, 2, 3], 0, -1), [1, 2, 3]);
  assert.deepEqual(M.moveStep([1, 2, 3], 2, 1), [1, 2, 3]);
});

test('history: newest first, capped, grouped by day with counts and minutes', () => {
  const e = (at, day, seconds) => ({ at, day, seconds, name: 'x', icon: null, scene: 'wedge' });
  const list = M.parseHistory([e(1, '2026-11-16', 60), e(3, '2026-11-17', 300), e(2, '2026-11-17', 120), { bad: true }]);
  assert.deepEqual(list.map((x) => x.at), [3, 2, 1]);
  const days = M.historyByDay(list);
  assert.deepEqual(days.map((d) => [d.day, d.count, d.seconds]), [['2026-11-17', 2, 420], ['2026-11-16', 1, 60]]);
  let big = [];
  for (let i = 0; i < M.HISTORY_LIMIT + 20; i++) big = M.pushHistory(big, e(i, '2026-11-17', 1));
  assert.equal(big.length, M.HISTORY_LIMIT);
  assert.equal(big[0].at, M.HISTORY_LIMIT + 19);
});

test('words: durations and the clock read the way a parent says them', () => {
  assert.equal(M.durationWords(300), '5 minutes');
  assert.equal(M.durationWords(90), '1 minute 30 seconds');
  assert.equal(M.durationWords(3600 + 900), '1 hour 15 minutes');
  assert.equal(M.durationWords(0), '0 seconds');
  assert.equal(M.durationShort(90), '1 min 30 s');
  assert.equal(M.clockText(299_001), '5:00');
  assert.equal(M.clockText(299_000), '4:59');
  assert.equal(M.clockText(0), '0:00');
  assert.equal(M.clockText(3_900_000), '1:05:00');
  assert.equal(M.plainTimerName(600), '10 minute timer');
  assert.equal(M.plainTimerName(10), '10 second timer');
});

// ---------- config ----------

test('app.json and eas.json: identity, the Expo project, RevenueCat key and ASC id from Cowork, no placeholder left, plugins, no push, no microphone', () => {
  const app = JSON.parse(readFileSync(`${ROOT}app.json`, 'utf8')).expo;
  assert.equal(app.name, 'Visual Timer');
  assert.equal(app.slug, 'visualtimer');
  assert.equal(app.ios.bundleIdentifier, 'com.bwk.visualtimer');
  assert.equal(app.version, '1.0.0');
  assert.equal(app.ios.buildNumber, '1');
  assert.equal(app.ios.supportsTablet, false);
  assert.equal(app.orientation, 'default', 'portrait and landscape');
  assert.equal(JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8')).version, app.version);
  assert.equal(app.owner, 'bkdeveloper123');
  assert.equal(app.plugins[0], './plugins/withoutPushEntitlement', 'first, so it runs last');
  const audio = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-audio')[1];
  assert.equal(audio.microphonePermission, false);
  assert.equal(audio.enableBackgroundPlayback, false);
  const notif = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-notifications')[1];
  assert.ok(notif.sounds.length >= 5);
  const eas = JSON.parse(readFileSync(`${ROOT}eas.json`, 'utf8'));
  assert.equal(eas.cli.appVersionSource, 'local');
  // From Cowork (Nov 17): the public RevenueCat SDK key and the App Store Connect app id.
  assert.match(app.extra.revenueCatApiKeyIos, /^appl_/);
  assert.equal(app.extra.revenueCatApiKeyIos, 'appl_YECdKqrHoSHtNUaIEPslGLkXDiR');
  assert.equal(eas.submit.production.ios.ascAppId, '6835862580');
  // From Cowork (Nov 18): the Expo project bkdeveloper123/visualtimer.
  assert.equal(app.extra.eas.projectId, 'a6259bcd-f368-4505-a4ea-23e52568b6b9');
  assert.equal(app.owner, 'bkdeveloper123');
  assert.equal(app.slug, 'visualtimer');
  // No Cowork placeholder is left anywhere in the repo.
  const files = walk(ROOT, ['.json', '.ts', '.tsx', '.js', '.mjs', '.md', '.html', '.yml', '.css', '.txt']).filter((f) => !f.endsWith('package-lock.json'));
  const found = files.flatMap((f) => readFileSync(f, 'utf8').match(/TODO_COWORK_[A-Z][A-Z_]*/g) ?? []);
  assert.deepEqual(found, []);
  // Package versions: SDK 57 on React Native 0.86.2, like the engine.
  const pkg = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'));
  assert.match(pkg.dependencies.expo, /^~57\./);
  assert.equal(pkg.dependencies['react-native'], '0.86.2');
});

// ---------- free and Pro ----------

test('gates: free gets the disc, sand and caterpillar, teal, one saved timer; Pro gets everything', () => {
  const free = M.SCENES.filter((s) => G.canUseScene(s.id, false)).map((s) => s.id);
  assert.deepEqual(free, ['wedge', 'sand', 'caterpillar']);
  assert.ok(M.SCENES.length >= 8, 'at least eight scenes');
  assert.ok(M.SCENES.every((s) => G.canUseScene(s.id, true)));
  assert.deepEqual(M.COLORS.filter((c) => G.canUseColor(c.id, false)).map((c) => c.id), ['teal']);
  assert.ok(M.COLORS.every((c) => G.canUseColor(c.id, true)));
  assert.equal(G.canUseSaved(0, false), true);
  assert.equal(G.canUseSaved(1, false), false);
  assert.equal(G.canUseSaved(9, true), true);
  assert.equal(G.canAddSaved(0, false), true);
  assert.equal(G.canAddSaved(1, false), false);
  assert.equal(G.canAddSaved(40, true), true);
  for (const f of [G.canUseRoutines, G.canUseChildLock, G.canUseClassroom]) {
    assert.equal(f(false), false);
    assert.equal(f(true), true);
  }
  assert.deepEqual(G.fallbackLook('rocket', 'berry', false), { scene: 'wedge', color: 'teal' });
  assert.deepEqual(G.fallbackLook('sand', 'teal', false), { scene: 'sand', color: 'teal' });
  assert.deepEqual(G.fallbackLook('rocket', 'berry', true), { scene: 'rocket', color: 'berry' });
  // Presets as asked: 1, 2, 5, 10, 15, 20, 30, 45, 60 minutes.
  assert.deepEqual(M.PRESETS, [1, 2, 5, 10, 15, 20, 30, 45, 60]);
});

test('sounds: every end sound and the tick and warning exist as real WAV files, short enough for a notification', () => {
  for (const s of [...M.SOUNDS.filter((x) => x.id !== 'none').map((x) => x.id), 'tick', 'warn']) {
    const b = readFileSync(`${ROOT}assets/sounds/${s}.wav`);
    assert.equal(b.toString('ascii', 0, 4), 'RIFF');
    assert.equal(b.toString('ascii', 8, 12), 'WAVE');
    const seconds = b.readUInt32LE(40) / b.readUInt32LE(28);
    assert.ok(seconds > 0.05 && seconds < 30, `${s} is ${seconds} s`);
  }
  const app = JSON.parse(readFileSync(`${ROOT}app.json`, 'utf8')).expo;
  const notif = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-notifications')[1];
  assert.deepEqual(notif.sounds.map((p) => p.replace(/^.*\/|\.wav$/g, '')).sort(), M.SOUNDS.filter((x) => x.id !== 'none').map((x) => x.id).sort());
});
