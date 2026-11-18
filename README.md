# Visual Timer

A visual countdown timer for young children. Pick a time, pick a scene, press Start, and the scene shows the time going away: a color disc shrinking, sand running out of a jar, a caterpillar eating a leaf, a candle burning down, a rocket flying to the moon, an ice pop melting, a train reaching the station, stars going out, the sun setting. For parents, teachers and therapists. Offline, no account.

On the App Store as "Visual Timer: Kids Timer". iPhone, Expo SDK 57.

- Run the checks: `npx tsc --noEmit` and `npm test`.
- Bundle check: `npx expo export --platform ios`.
- Store tools (icon, sounds, screenshots): `cd store && npm install`, then `node icon.js`, `node sounds.js`, `node screenshots.js`.
- Website: `docs/` (GitHub Pages from the `docs` folder).

See CLAUDE.md for how shipping works and the rules, and NOTES.md for the change log.
