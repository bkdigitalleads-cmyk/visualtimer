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
    const raw = readFileSync(f, 'utf8');
    assert.ok(!raw.includes('—') && !raw.includes('&mdash;'), `em dash in ${f}`);
    const s = /\.(ts|tsx)$/.test(f) ? readable(raw) : raw.replace(/<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
    const text = s.replace(/<[^>]+>/g, ' ');
    assert.ok(!/[A-Za-z]!(\s|$|['"`<)])/.test(text), `exclamation mark in ${f}`);
    for (const w of [/\bunlock(?!ing|ed)\b/i, /\bpremium\b/i, /\bseamless/i, /\beffortless/i, /\belevate/i, /\bsupercharge/i, /\bwelcome\b/i, /\blet's\b/i, /\bmagic(al)?\b/i]) {
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
