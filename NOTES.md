# Visual Timer change log

Newest first. One entry per commit: date, version/build, what changed and why, and how it was checked.

- 2026-11-17: 1.0.0 build 1, step 1 of 7: scaffold and engine port.
  - Engine: Attendance Tracker main (f064830, 1.0.6). Same Expo SDK (expo 57.0.12 from attend's lockfile) and React Native 0.86.2. Copied: package-lock as the starting point, eas.json, .eas/workflows/deploy.yml and submit.yml, plugins/withoutPushEntitlement.js, AGENTS.md, src/purchases.ts (unchanged apart from Signature Maker's appl_ key check, so the placeholder key never reaches Purchases.configure), src/trial.ts, src/reminder.ts, src/reviews.ts, src/state.tsx's Pro handling (listener plus re-check after a real trip to the background).
  - From Signature Maker: the startup guard (index.ts loads App inside a try and shows a message; App.tsx wraps everything in a Guard error boundary), the pure-logic test setup (node --test, `.ts` imports), src/offer.ts and src/rules.ts as pure functions, docs/ site layout.
  - Dropped from attend: expo-sqlite, expo-print, expo-sharing, expo-file-system, expo-local-authentication, the Face ID lock, roll calls, reports, the Free-mode (Lifetime at 0) launch offer and the "where did you hear about us" question.
  - Added: expo-audio, expo-keep-awake, expo-screen-orientation, expo-font, expo-splash-screen and react-native-svg 15.15.4, each in SDK 57's bundled range. expo-asset pinned to ~57.0.10 because expo-audio's open peer range pulled an SDK 58 expo-asset (and with it a second expo-constants). That bumped expo-constants to 57.0.24, still SDK 57.
  - Fonts: Fredoka Medium and SemiBold, Nunito Regular and Bold (SIL OFL, from the @expo-google-fonts packages), licences in assets/fonts/licences.
  - app.json: Visual Timer, com.bwk.visualtimer, 1.0.0 build 1, iPhone only, orientation default (portrait and landscape). expo-audio with the microphone and background audio off. expo-notifications is listed so the end sounds can be bundled as notification sounds; because it is listed, the entitlement remover now has to be FIRST in the plugin list (mods run newest first). Checked with `npx expo config --type introspect`: ios.entitlements {}, no NSMicrophoneUsageDescription, no UIBackgroundModes.
  - Placeholders for Cowork: app.json extra.eas.projectId, app.json extra.revenueCatApiKeyIos, eas.json ascAppId. A test checks there are exactly these three in the repo.
  - Checked: npx tsc --noEmit clean; npm test 11/11.
