@AGENTS.md

# Visual Timer (visualtimer)

Part of Brian's iOS app portfolio (seller bkdigitalleads-cmyk). Expo SDK 57, React Native 0.86.2, TypeScript, react-native-svg (every scene is drawn in code), expo-audio (end sounds and ticking), expo-notifications (local only), expo-keep-awake, expo-screen-orientation, RevenueCat. Engine from Attendance Tracker (attend main, 1.0.6: purchases.ts, the Yearly-first paywall, onboarding, rating prompts, EAS workflows), with the startup guard (index.ts and the Guard in App.tsx), the test setup and the docs/ site layout from Signature Maker. Stored data is small JSON in AsyncStorage (src/store.ts); there is no database.

- App Store name: "Visual Timer: Kids Timer". Subtitle: "Countdown Clock, ADHD & Focus". Home screen and in-app name: "Visual Timer". Bundle ID com.bwk.visualtimer. Expo slug visualtimer, owner bkdeveloper123. GitHub: bkdigitalleads-cmyk/visualtimer. iPhone only, portrait and landscape.
- Not in the store yet. Build 1 (leaf icon) and build 2 (the hourglass icon, store/icon-hourglass.svg) went to TestFlight from PRs 1 and 2. Build 3 (fixes from the owner's test of build 2) is on branch claude/timer-test-fixes (PR, not merged).
- Set up from Cowork (Nov 17, 2026): app.json `extra.revenueCatApiKeyIos` (the public SDK key, starts with `appl_`) and eas.json `ascAppId` 6835862580. Nov 18: app.json `extra.eas.projectId` a6259bcd-f368-4505-a4ea-23e52568b6b9 (Expo project bkdeveloper123/visualtimer, matching `owner` and `slug`). No Cowork placeholder is left, and a test keeps it that way. The app runs with purchases off whenever the key does not start with `appl_`.
- App Store Connect and RevenueCat: visualtimer_pro_yearly (3 day free trial), visualtimer_pro_weekly (no trial), visualtimer_pro_lifetime; entitlement `pro`; offering `default` with $rc_annual, $rc_weekly and $rc_lifetime.
- What it is: a visual countdown timer for young children, used by parents, teachers and therapists, including families dealing with ADHD and autism. A child who cannot read a clock sees the time disappear in a scene. Offline, no accounts, no servers, no ads, no analytics.

## How shipping works (read before every push)

- A push to `main` that touches app.json, eas.json, package*.json, App.tsx, index.ts, src/ or assets/ starts an EAS workflow (.eas/workflows/deploy.yml) now that the Expo project is connected. It builds iOS in the cloud and uploads the build to App Store Connect / TestFlight. Every such push costs a paid build credit.
- Never merge to `main` without Brian. Work on a branch and open a PR.
- Pushes that only change Markdown files, store/ or docs/ do not build.
- Version numbers are local (`appVersionSource: local`, no auto-increment). Before any push that builds: raise `ios.buildNumber` in app.json by 1, and raise `version` (and package.json `version`) when it will become a new App Store release. A build number that was already used makes the upload fail.
- Before every commit: run `npx tsc --noEmit` and `npm test`, and fix every error.
- Batch the changes for one app into one push. Ask Brian before any push that builds, and say what is in it.
- Submitting for App Review, release dates, prices, the subtitle, keywords, the age rating and screenshots all happen in App Store Connect. Brian and his Cowork session handle that side. Do not try to do it from here.

## Rules

- Brian handles every credential and sign-in. Never type, paste, print or store passwords, tokens or API keys. If git push asks for credentials, stop and tell Brian.
- No spending (paid services, EAS builds beyond what Brian approved) without Brian saying go.
- Never change the RevenueCat entitlement id `pro`, the offering `default`, the product ids (visualtimer_pro_yearly, visualtimer_pro_lifetime, visualtimer_pro_weekly), the packages ($rc_annual, $rc_lifetime, $rc_weekly) or the logic in src/purchases.ts (a copy of the engine's) without Brian asking. Paying users must never lose Pro.
- Paywall order (src/offer.ts `PLAN_ORDER`): Yearly first and preselected with "BEST VALUE" and the per-week line, Lifetime second, Weekly third. Every price and trial length on screen comes from RevenueCat; never hard-code one in the app.
- Free (src/gates.ts holds the rules, with checks): the color disc, sand jar and caterpillar scenes, teal, the presets, the dial and custom times (5 seconds to 4 hours), one saved timer, every sound, history. Pro: every scene and color, unlimited saved timers, routines, child lock and classroom mode. The starter saved timers and routines are always visible; free users can run the first saved timer and see the rest locked.
- Children use this app. No ads, no analytics, no tracking, no network calls of our own, no links out from the timer screen. Settings sit behind the adult hold (hold the gear for 2 seconds). While child lock is on, the running timer ignores touches until an adult holds a corner for 2 seconds; the screen says so in a line at the bottom and shows a faint mark in each corner. The first time lock is turned on by hand (flag `lockExplained`), and always after buying Pro from the lock button, a short sheet explains it before anything locks.
- Timer correctness: remaining time is always computed from the end timestamp (src/timer.ts), never by counting ticks, so it stays right after the app is backgrounded or the phone is locked. The end of every timer and every routine step is a scheduled local notification with the chosen sound.
- Scenes are original drawings made in code (src/scenes/). Never a red disc on a white clock face, never minute numbers around a disc, never anything traced from another timer product. Scenes take the remaining fraction and a clock, nothing else.
- Stored formats must stay readable after launch: settings, saved timers, routines and history (src/model.ts parse functions) only ever gain optional fields; old values must still parse.
- Do not change the app name, subtitle, keywords or the rating-prompt triggers (third finished timer, closed by the parent; a trial starting; never while a timer is on screen) without asking.
- Keep changes small. Fix what the task needs and tidy only the files you already touch. List anything else you notice in NOTES.md under "Noticed, not changed" instead of fixing it. No broad refactors, dependency upgrades or Expo SDK upgrades unless Brian asks.
- Copy voice: plain, short, warm, like a calm teacher. No em dashes and no exclamation marks in any user-facing text (app, notifications, store text, website), and none in text Brian sends to other people. No "Unlock" as sales copy (the child lock line "Hold any corner for 2 seconds to unlock" is an instruction and is fine), no "Premium", "Seamless", "Effortless", "Welcome", "Let's", "Supercharge", "Elevate" or "Magic". The only support address anywhere is bkdigitalleads@gmail.com.
- Design, "the kitchen table" (docs/design/NOTES.md): warm oat background, cream cards, brown-black ink, one deep teal for the main action. Use the theme's tokens (src/theme.ts: `type`, `space`, `radius`), never ad hoc values. Fonts are Fredoka (numbers and titles) and Nunito (text), both SIL OFL with their licences in assets/fonts/licences. Icons are drawn in src/ui/Glyph.tsx; no icon pack and no emoji in the UI.
- plugins/withoutPushEntitlement.js stays FIRST in app.json plugins (mods run newest first, so the first one registered has the last word). After touching plugins, check `npx expo config --type introspect` still shows `ios.entitlements` as `{}`, no NSMicrophoneUsageDescription and no UIBackgroundModes.

## Logging (so Brian's Cowork session can follow along)

- With every commit, add an entry at the top of NOTES.md in the same commit: date, version/build, what changed and why, and how it was checked.

## Testing

- Type check: `npx tsc --noEmit`. Unit checks (the timer engine across pause, background and added time, routines, gates, plans and trial wording, the rating guard, stored formats, scenes, config and copy rules): `npm test`. Bundle check: `npx expo export --platform ios`. Config: `npx expo config --type introspect`.
- Pure logic lives in src/timer.ts, src/routine.ts, src/gates.ts, src/model.ts, src/offer.ts, src/rules.ts and src/scenes/geometry.ts, with no React or native imports (they import each other with a `.ts` extension so Node runs them directly), so `npm test` checks exactly what the app runs.
- Simulator (needs Xcode): a development build, since RevenueCat needs native code. Purchases do not complete in the simulator.
- Real-device check: TestFlight build from the EAS workflow, on Brian's iPhone. Sounds with the ring switch on silent, the end alert with the phone locked, haptics, keep-awake, rotation and VoiceOver can only be judged there. NOTES.md has the TestFlight checklist.
