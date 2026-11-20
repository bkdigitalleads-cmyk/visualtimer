// Build 4: the paywall appears on top from every place that asks for it.
// iOS presents a Modal from the view controller that holds it and will not
// present a second one from the root while a sheet is up, so every sheet
// hosts its own copy of the paywall and only the copy in the sheet on top
// shows. These checks drive the open and close sequence (src/paywallGate.ts)
// and fail if any Modal in the app could ask for Pro without hosting it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const U = await import('../src/rules.ts');
const P = await import('../src/paywallGate.ts');
const ROOT = new URL('..', import.meta.url).pathname;
const src = (f) => readFileSync(`${ROOT}${f}`, 'utf8');
function walk(dir, ext) {
  return readdirSync(dir).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(p).isDirectory() ? walk(p, ext) : ext.some((e) => p.endsWith(e)) ? [p] : [];
  });
}

/** A gate with a fake clock: `tick(ms)` runs due timers, `shown` is what is on screen. */
function makeGate(pro = false) {
  let now = 0;
  const timers = new Map();
  let next = 1;
  const state = { open: false, host: U.ROOT_LAYER, pro };
  const gate = new P.PaywallGate({
    onChange: (open, host) => {
      state.open = open;
      state.host = host;
    },
    isPro: () => state.pro,
    setTimer: (fn, ms) => {
      const id = next++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
  });
  const tick = (ms) => {
    now += ms;
    for (const [id, t] of [...timers]) if (t.at <= now) {
      timers.delete(id);
      t.fn();
    }
  };
  return { gate, state, tick };
}
const flush = () => new Promise((r) => setImmediate(r));

test('the paywall opens in the sheet on top: root with nothing open, Settings when Settings is up, the deeper sheet when one is on Settings', () => {
  assert.equal(U.topLayer([]), U.ROOT_LAYER);
  assert.equal(U.topLayer([{ id: 'settings', depth: 1, seq: 1 }]), 'settings');
  assert.equal(U.topLayer([{ id: 'settings', depth: 1, seq: 1 }, { id: 'lock', depth: 2, seq: 2 }]), 'lock');
  // A sheet still finishing its close next to a new one at the same depth: the newer one.
  assert.equal(U.topLayer([{ id: 'old', depth: 1, seq: 1 }, { id: 'new', depth: 1, seq: 2 }]), 'new');
  // Depth wins over order (a nested sheet registers before its parent in one commit).
  assert.equal(U.topLayer([{ id: 'child', depth: 2, seq: 1 }, { id: 'parent', depth: 1, seq: 2 }]), 'child');
  // Exactly one copy shows.
  const copies = [U.ROOT_LAYER, 'settings', 'editor'];
  for (const host of copies) {
    assert.deepEqual(copies.filter((l) => U.paywallShowsIn(l, { visible: true, host })), [host]);
    assert.deepEqual(copies.filter((l) => U.paywallShowsIn(l, { visible: false, host })), []);
  }
});

test('gate: See Pro in Settings opens the copy inside Settings; with Settings closed, the root copy', async () => {
  const { gate, state } = makeGate();
  gate.register('settings', 1);
  gate.ask();
  assert.deepEqual([state.open, state.host], [true, 'settings']);
  gate.hide();
  gate.dismissed();
  gate.unregister('settings');
  gate.ask();
  assert.deepEqual([state.open, state.host], [true, U.ROOT_LAYER]);
});

test('gate: never two paywalls; a double tap joins the open one, and it stays in the sheet it opened in', async () => {
  const { gate, state } = makeGate();
  gate.register('editor', 1);
  const a = gate.ask();
  gate.register('late', 2); // cannot happen behind a paywall, but even so the host does not move
  const b = gate.ask();
  assert.equal(state.host, 'editor');
  // Three quick taps: one paywall, opened once.
  const g2 = makeGate();
  let opens = 0;
  const show = g2.gate.deps.onChange;
  g2.gate.deps.onChange = (open, host) => {
    if (open) opens++;
    show(open, host);
  };
  g2.gate.ask();
  g2.gate.ask();
  g2.gate.ask();
  assert.equal(opens, 1);
  assert.equal(g2.state.open, true);
  gate.hide();
  gate.dismissed();
  assert.deepEqual(await Promise.all([a, b]), [false, false]);
});

test('gate: callers wait until the paywall has finished closing (onDismiss), so the child lock sheet can follow it', async () => {
  const { gate, state, tick } = makeGate();
  let answer = null;
  gate.ask().then((pro) => (answer = pro));
  state.pro = true; // bought
  gate.hide();
  await flush();
  assert.equal(answer, null, 'not while the paywall is still sliding away');
  tick(300);
  await flush();
  assert.equal(answer, null);
  gate.dismissed(); // the Modal's onDismiss
  await flush();
  assert.equal(answer, true, 'Pro, after the close is over');
});

test('gate: without onDismiss (web, Android) a fallback settles after a short wait; asked again while closing, the old callers settle first', async () => {
  const { gate, state, tick } = makeGate();
  let a = null;
  gate.ask().then((v) => (a = v));
  gate.hide();
  tick(P.SETTLE_FALLBACK_MS - 1);
  await flush();
  assert.equal(a, null);
  tick(1);
  await flush();
  assert.equal(a, false);
  // Again, and asked once more before the close is over.
  let b = null;
  let c = null;
  gate.ask().then((v) => (b = v));
  gate.hide();
  gate.ask().then((v) => (c = v));
  await flush();
  assert.equal(b, false, 'the first caller is answered');
  assert.equal(c, null, 'the second waits for its own paywall');
  assert.equal(state.open, true);
  tick(5000);
  await flush();
  assert.equal(c, null, 'the old timer cannot answer for the new paywall');
  gate.hide();
  gate.dismissed();
  await flush();
  assert.equal(c, false);
});

test('gate: if the sheet holding the paywall goes away, the paywall closes and the caller is answered', async () => {
  const { gate, state } = makeGate();
  gate.register('editor', 1);
  let a = null;
  gate.ask().then((v) => (a = v));
  gate.unregister('editor');
  assert.equal(state.open, false);
  gate.dismissed();
  await flush();
  assert.equal(a, false);
});

test('every Modal in the app hosts the paywall, so no control inside one can ask for Pro without it appearing', () => {
  const files = [...walk(`${ROOT}src`, ['.tsx']), `${ROOT}App.tsx`];
  let checked = 0;
  for (const f of files) {
    const s = readFileSync(f, 'utf8');
    const blocks = [...s.matchAll(/<Modal\b[\s\S]*?<\/Modal>/g)].map((m) => m[0]);
    for (const b of blocks) {
      const rel = f.slice(ROOT.length);
      checked++;
      if (rel === 'src/screens/Paywall.tsx') {
        // The paywall itself: never inside a layer of its own, and it reports when it is gone.
        assert.ok(!/<ModalLayer>/.test(b), 'the paywall does not host a paywall');
        assert.match(b, /onDismiss=\{paywallDismissed\}/);
        continue;
      }
      // The first thing inside any other Modal is a ModalLayer, which mounts the paywall copy.
      const inner = b.slice(b.indexOf('>') + 1).trimStart();
      assert.ok(inner.startsWith('<ModalLayer>'), `a Modal in ${rel} does not host the paywall`);
    }
  }
  assert.ok(checked >= 3, 'found the sheets and the paywall');
  // Every askPro outside the state lives in a screen, sheet or flow that one of the hosts covers.
  const layer = src('src/ui/Layer.tsx');
  assert.match(layer, /registerLayer\(id, depth\);\s*return \(\) => unregisterLayer\(id\);/);
  assert.match(layer, /\{Paywall \? <Paywall layer=\{id\} \/> : null\}/);
  const app = src('App.tsx');
  assert.match(app, /registerPaywallHost\(PaywallModal\);/);
  assert.match(app, /<PaywallModal layer=\{ROOT_LAYER\} \/>/);
  const pay = src('src/screens/Paywall.tsx');
  assert.match(pay, /const paywallVisible = paywallShowsIn\(layer, \{ visible: anyOpen, host: paywallHost \}\);/);
  // The 3 second wait stays on the first-launch paywall only, and the close X stays pinned.
  assert.match(pay, /const ONBOARDING_CLOSE_DELAY_MS = 3000;/);
  assert.match(pay, /close: \{ position: 'absolute', top: space\.m, right: space\.l/);
  // Only the root copies get the onboarding flag.
  assert.match(app, /<PaywallModal onboarding layer=\{ROOT_LAYER\} \/>/);
  assert.ok(!/onboarding/.test(layer));
});

test('the child lock explanation follows the paywall only after it has closed, from the Run screen and from Settings', () => {
  const run = src('src/screens/Run.tsx');
  assert.match(run, /const pro = await askPro\(\);\s*\/\/[^\n]*\n\s*if \(afterLockPaywall\(pro\) === 'explain'\) setTimeout\(\(\) => setExplain\(true\), 150\);/);
  const set = src('src/screens/Settings.tsx');
  assert.match(set, /if \(!\(await askPro\(\)\)\) return;[\s\S]{0,200}setTimeout\(\(\) => setExplain\(true\), 150\)/);
  // The Settings explanation is a sheet inside the Settings sheet, so it presents from Settings too.
  assert.ok(set.indexOf('<LockSheet') > set.indexOf('<Sheet theme={theme} visible={visible} title="Settings"'));
  assert.ok(set.indexOf('<LockSheet') < set.lastIndexOf('</Sheet>'));
});
