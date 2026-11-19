// Rules for an app children use, checked in the source: the copy voice (no
// em dashes, no exclamation marks, no stock words), the one support address,
// settings behind the grown-up hold, no links out from the timer screen, no
// analytics or ads, and the rating asks wired where they belong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
function walk(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    if (['node_modules', '.git', 'dist'].includes(f)) return [];
    const p = `${dir}/${f}`;
    return statSync(p).isDirectory() ? walk(p, ext) : ext.some((e) => p.endsWith(e)) ? [p] : [];
  });
}
const code = [...walk(`${ROOT}src`, ['.ts', '.tsx']), `${ROOT}App.tsx`, `${ROOT}index.ts`];
/** Only what people read: string literals and JSX text. */
const readable = (s) => (s.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`|>[^<>{}]+</g) ?? []).filter((t) => !/^'\.\.?\//.test(t) && !/^'(react|expo|@)/.test(t) && !/^['"`][a-z][a-zA-Z0-9-]*['"`]$/.test(t)).join('\n'); // single lowercase words are ids (glyph names), not copy

test('copy: no em dashes or exclamation marks, and none of the stock words, in the app, the website or the store text', () => {
  const files = [...code, ...walk(`${ROOT}docs`, ['.html']), ...walk(`${ROOT}store`, ['.md'])];
  for (const f of files) {
    let raw = readFileSync(f, 'utf8');
    // The line in metadata.md that names the rule.
    if (f.endsWith('metadata.md')) raw = raw.split('\n').filter((l) => !l.startsWith('Copy rules:')).join('\n');
    assert.ok(!raw.includes('\u2014') && !raw.includes('&mdash;'), `em dash in ${f}`);
    const s = /\.(ts|tsx)$/.test(f) ? readable(raw) : raw.replace(/<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
    const text = s.replace(/<[^>]+>/g, ' ');
    assert.ok(!/[A-Za-z]!(\s|$|['"`<)])/.test(text), `exclamation mark in ${f}`);
    // "to unlock" is the child lock instruction (hold a corner to unlock), not sales copy; "Unlock all scenes" still fails.
    for (const w of [/(?<!to )\bunlock(?!ing|ed)\b/i, /\bpremium\b/i, /\bseamless/i, /\beffortless/i, /\belevate/i, /\bsupercharge/i, /\bwelcome\b/i, /\blet's\b/i, /\bmagic(al)?\b/i]) {
      assert.equal(text.match(w), null, `${w} in ${f}`);
    }
  }
});

test('support: one address, bkdigitalleads@gmail.com, and no personal one anywhere', () => {
  const all = [...code, ...walk(`${ROOT}docs`, ['.html']), ...walk(`${ROOT}store`, ['.md', '.js']), `${ROOT}README.md`, `${ROOT}NOTES.md`, `${ROOT}CLAUDE.md`];
  for (const f of all) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g) ?? []) {
      if (/@(anthropic\.com|expo|react|shopify|types)/.test(m)) continue;
      assert.equal(m, 'bkdigitalleads@gmail.com', `${m} in ${f}`);
    }
    assert.ok(!/brianwkershner/i.test(s), `personal address in ${f}`);
  }
  assert.match(readFileSync(`${ROOT}src/links.ts`, 'utf8'), /SUPPORT_EMAIL = 'bkdigitalleads@gmail\.com'/);
});

test('children: no analytics, ads or tracking; no network calls of our own; no links out from the timer screen', () => {
  const pkg = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'));
  for (const d of Object.keys(pkg.dependencies)) assert.ok(!/analytics|firebase|segment|mixpanel|amplitude|admob|ads|sentry|tracking|facebook/i.test(d), d);
  for (const f of code) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!/\bfetch\(|XMLHttpRequest|axios/.test(s), `network call in ${f}`);
  }
  const run = readFileSync(`${ROOT}src/screens/Run.tsx`, 'utf8');
  assert.ok(!/Linking|openURL|PRIVACY_URL|SUPPORT/.test(run), 'the timer screen links nowhere');
  // Settings open only through the grown-up hold.
  const app = readFileSync(`${ROOT}App.tsx`, 'utf8');
  const opens = app.match(/setSettingsOpen\(true\)/g) ?? [];
  assert.equal(opens.length, 1);
  for (const f of ['TimerHome', 'Saved', 'Routines', 'History']) {
    const s = readFileSync(`${ROOT}src/screens/${f}.tsx`, 'utf8');
    assert.match(s, /<HoldGear theme=\{theme\} onOpen=\{onSettings\} \/>/, `${f} opens settings with the hold`);
  }
  const kit = readFileSync(`${ROOT}src/ui/Kit.tsx`, 'utf8');
  assert.match(kit, /export const HOLD_MS = 2000;/);
  assert.match(run, /const hold = useHold\(onUnlock\);/, 'child lock undoes with the 2 second hold');
});

test('timer correctness: the runner works from end times, keeps the screen awake, and schedules the end alert', () => {
  const r = readFileSync(`${ROOT}src/runner.tsx`, 'utf8');
  assert.match(r, /activateKeepAwakeAsync\('vt-run'\)/);
  assert.match(r, /scheduleAlerts\(\[\{ at: a\.timer\.endAt/);
  assert.match(r, /upcomingStepEnds\(a\.run, now\)/);
  assert.match(r, /saveJson\(KEYS\.run, a\)/, 'the run is stored on every change');
  assert.ok(!/setInterval\([^)]*remaining\s*-=/.test(r), 'never counts down by ticks');
});

test('rating asks: after the third finished timer when the parent closes it, and after a trial starts', () => {
  const r = readFileSync(`${ROOT}src/runner.tsx`, 'utf8');
  assert.match(r, /if \(finished\) setTimeout\(\(\) => maybeRequestReviewAfterFinish\(\), 600\)/);
  assert.match(r, /countFinished\(\)/);
  const rev = readFileSync(`${ROOT}src/reviews.ts`, 'utf8');
  assert.match(rev, /launchState !== 'idle' \|\| timerOnScreen\(\)/, 'one per launch, never with a timer on screen');
});

test('paywall: Yearly first and preselected from the store, close after 3 seconds on first launch, legal links always shown', () => {
  const pay = readFileSync(`${ROOT}src/screens/Paywall.tsx`, 'utf8');
  assert.match(pay, /const ONBOARDING_CLOSE_DELAY_MS = 3000;/);
  assert.match(pay, /\.sort\(\(a, b\) => planRank\(a\.packageType\) - planRank\(b\.packageType\)\)/);
  assert.match(pay, /const lead = preselect\(pkgs\.map\(\(p\) => p\.packageType\)\)/);
  assert.match(pay, /perWeekLine\(p\.product\.price, p\.product\.currencyCode\)/, 'the weekly equivalent under Yearly');
  assert.match(pay, /p\.product\.priceString/, 'prices from the store');
  assert.match(pay, /Terms of Use \(EULA\)/);
  assert.match(pay, /Privacy Policy/);
  assert.match(pay, /Restore purchases/);
  assert.match(pay, /maybeRequestReviewAfterPurchase\(true, trial\)/, 'a trial that starts asks for a rating');
  assert.match(pay, /scheduleTrialReminderIfTrial\(\)/);
});

test('onboarding: three screens with real scenes, a 10 second try, then the paywall', () => {
  const w = readFileSync(`${ROOT}src/screens/Welcome.tsx`, 'utf8');
  assert.equal((w.match(/^  \{\n    scene: '/gm) ?? []).length, 3, 'three value screens');
  assert.match(w, /const TRY_SECONDS = 10;/);
  assert.match(w, /<Scene id=\{p\.scene\}/);
  const app = readFileSync(`${ROOT}App.tsx`, 'utf8');
  assert.match(app, /<Welcome onDone=\{finish\} \/>\s*<PaywallModal onboarding \/>/);
  assert.match(app, /askPro\(\)\.then\(done\)/);
});

test('store text: name and subtitle fit, keywords fit and repeat no word from them, promo and description fit, six screenshots in both sizes', async () => {
  const md = readFileSync(`${ROOT}store/metadata.md`, 'utf8');
  const name = md.match(/- Name \(\d+\/30\): (.+)/)[1];
  const sub = md.match(/- Subtitle \(\d+\/30\): (.+)/)[1];
  assert.equal(name, 'Visual Timer: Kids Timer');
  assert.equal(sub, 'Countdown Clock, ADHD & Focus');
  assert.ok(name.length <= 30 && sub.length <= 30);
  const kw = md.match(/## Keywords \((\d+)\/100\)\n\n([^\n]+)/);
  assert.equal(kw[2].length, Number(kw[1]));
  assert.ok(kw[2].length <= 100);
  assert.ok(!/\s/.test(kw[2]), 'no spaces in the keyword field');
  const taken = new Set(`${name} ${sub}`.toLowerCase().match(/[a-z]+/g));
  for (const w of kw[2].split(',')) {
    assert.ok(!taken.has(w) && !taken.has(w.replace(/s$/, '')) && !taken.has(`${w}s`), `${w} repeats the name or subtitle`);
  }
  const promo = md.match(/## Promotional text \((\d+)\/170\)\n\n([^\n]+)/);
  assert.equal(promo[2].length, Number(promo[1]));
  const desc = md.split('## Description')[1].split('## What')[0].trim();
  assert.ok(desc.length > 500 && desc.length <= 4000, `description is ${desc.length}`);
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  let sharp;
  try {
    sharp = require(`${ROOT}store/node_modules/sharp`);
  } catch {
    sharp = null; // store tools not installed: check the PNG headers instead
  }
  for (const [dir, w, h] of [['6.9', 1320, 2868], ['6.3', 1206, 2622]]) {
    const files = readdirSync(`${ROOT}store/screenshots/${dir}`).filter((f) => f.endsWith('.png'));
    assert.equal(files.length, 6, `${dir} has six`);
    for (const f of files) {
      const b = readFileSync(`${ROOT}store/screenshots/${dir}/${f}`);
      assert.equal(b.readUInt32BE(16), w, `${f} width`);
      assert.equal(b.readUInt32BE(20), h, `${f} height`);
    }
  }
  void sharp;
});

test('website: landing, privacy and support pages; the privacy page says Purchases, not linked, and nothing else is collected', () => {
  for (const f of ['index.html', 'privacy.html', 'support.html', 'style.css', 'icon-512.png', 'og-image.png']) assert.ok(existsSync(`${ROOT}docs/${f}`), f);
  const priv = readFileSync(`${ROOT}docs/privacy.html`, 'utf8');
  assert.match(priv, /Purchases, not linked to you/);
  assert.match(priv, /RevenueCat/);
  assert.match(priv, /Nothing else is collected/);
  assert.ok(!/Data Not Collected/i.test(priv));
  const support = readFileSync(`${ROOT}docs/support.html`, 'utf8');
  assert.match(support, /mailto:bkdigitalleads@gmail\.com/);
  // No third-party requests from the site: fonts are served from docs/fonts.
  for (const f of walk(`${ROOT}docs`, ['.html', '.css'])) assert.ok(!/<script|fonts\.googleapis|googletagmanager|gtag\(/.test(readFileSync(f, 'utf8')), f);
});
