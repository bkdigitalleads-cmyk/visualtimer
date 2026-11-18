# Visual Timer design notes (1.0.0, Nov 17, 2026)

## Concept: the kitchen table

The person holding the phone is a parent at the kitchen table, a teacher at the front of a room, or a therapist with a child who finds transitions hard. The child is the one looking. So the screens around the timer stay calm and warm, and the scene brings the color.

- The table is warm oat (#F5EFE4), never white. Cards are cream (#FFFAF2), like index cards. Text is a soft brown-black (#2B2622), never pure black.
- One accent, a deep teal (#1F7F74), and it means one thing: the main action on the screen (Start, Save, Continue, Pause). Tags (PRO, BEST VALUE) are sunflower (#F2B43D). Nothing else competes.
- The dark theme follows the system and is a warm night (#1C1916), never blue-black, so a bedtime timer does not glare. The teal lifts to #5CC2B4 with dark text on it. Every scene has its own dark version.
- Motion is quiet and comes from the scenes: a flame that flickers, sand that runs, steam that puffs. Feedback is by touch: a selection tick on chips and pickers, a success buzz at the end, a warning buzz at one minute left. With Reduce Motion on, the living touches stop and only the time moves.

## Type

Two rounded faces, both SIL OFL (licences in assets/fonts/licences):

- Fredoka (Medium and SemiBold) for numbers and titles. It is soft and round with a slightly hand-cut feel, and its digits are wide and friendly at 64 points. `type.clock` 64, `type.title` 30, `type.heading` 21.
- Nunito (Regular and Bold) for everything people read: rounded ends, very legible at small sizes. `type.body` 17, `type.strong` 17, `type.small` 14, `type.label` 13 (uppercase, letter-spaced, for section labels).

The paywall's legal lines stay at 11 and 12, as in the engine.

## The system

- Spacing (`space`): 4, 8, 12, 16, 24, 32. Screens sit 16 in from the edge.
- Corners (`radius`): large 24 (cards, the main button), medium 16 (chips, plan rows), small 12 (fields, quiet buttons). Scenes have their own soft window, 46 on a 300 box.
- Sizes: the main button is 60 points and fills the width. Preset chips are 64 by 66. The run screen's pause is 76; its other buttons 52. Every other target is at least 44.
- Glyphs (src/ui/Glyph.tsx): drawn for this app on a 24 grid with round ends, like a soft marker. 24 UI glyphs and 20 timer icons (toothbrush, tablet, blocks, pencil, moon, sun, shirt, bowl, shoe, backpack, book, bath, bed, snack, music, ball, coat, door, potty, heart). Each timer icon sits in a tinted circle of its own color, so a child can find "their" timer by color and shape before they can read. No icon pack, no emoji.

## The scenes (what makes this not a template)

Nine scenes, drawn in code with react-native-svg (src/scenes/), each a function of the time left and a clock. None copies another timer product. The color disc is deliberately not a red disc on a white clock face: it is a teal (or any of eight colors) wedge on a cream plate in a tinted window, the whole disc is always the whole timer, and there are no numbers or minute marks round it. `scenes-light.png` and `scenes-dark.png` show every scene at 1, 0.62, 0.25, 0.04 and its ending.

| Scene | Time left is | Ending |
| --- | --- | --- |
| Color disc (free) | the wedge | sparkles |
| Sand jar (free) | the sand in the jar; the heap in the bowl is the time used | sparkles |
| Caterpillar (free) | the leaf, eaten from the tip in round bites | a butterfly |
| Candle | the candle | the flame goes out, smoke curls up |
| Rocket | the dotted path to the moon | it lands and plants a flag |
| Ice pop | the pop, melting from the top; the puddle grows | the stick in the puddle |
| Train | the track to the station | at the platform, the flag waves |
| Stars | ten stars; the one going out drains from the top | the moon comes out |
| Sunset | the height of the sun; the sky goes to night | moon, stars, a lit window |

## The "does it look AI-built" pass

The tells we looked for, from the portfolio's earlier passes: stock emoji as icons, a generic system font, flat grey cards stacked the same way on every screen, a gradient hero, a feature list of six identical rows, "Unlock Premium", exclamation marks, and a clip-art drawing on onboarding. This app started from those rules, and the renders were checked against them. What was found and changed:

- The scene picked on the timer screen sat in the dial as a square; its corners poked past the ring. It is now a round window inside the dial.
- The running controls had an empty spacer to fake symmetry, which read as a missing button. Gone; the controls are a centred group.
- With child lock on, the controls stayed on screen doing nothing. They now go away and a small lock shows in their place, so it is obvious the screen is locked.
- The paywall had six feature rows with a sub-line each, and the plans fell below the fold behind them. It now has four short lines, three small live scenes on top instead of an illustration, and Continue in the footer, so all three plans and the button show on a 6.1 inch phone.
- History showed an empty dot next to a plain timer. It now shows that timer's scene, small.
- "Screen time" was cut to "Screen ti..." by its PRO tag. The tag moved to the second line.
- In landscape the close button sat on the scene's corner. The scene now leaves 56 points at the top for the buttons.
- The train only crept 114 points; it now travels 136. The sun set too early (behind the hills with a quarter left); it now goes down in a straight line.

## Icon

The shipped icon, from build 2, is a friendly hourglass: a pale glass with cream caps on a teal tile, golden sand running from the top bulb into the bottom one, and a small smiling face in the sand below. Brian chose it to replace the leaf. The drawing is kept exactly as he gave it in `store/icon-hourglass.svg`, and `store/icon.js` renders the shipped files from that file without changing any shape or color (`node icon.js`). A test checks that `assets/icon.png` is a 1024 square in RGB with no alpha channel. It has square corners, because iOS rounds them itself.

`icon-options.png` shows every option, each large and at 60 px on a light and a dark wallpaper (`node icon.js options`). The first four are drawn from the app's own scene geometry:

1. plate: the color disc, three quarters left, teal on a cream plate, on oat. Clear, but a pale tile disappears among white app icons.
2. sunny: the same disc in sunflower on a cream plate, on the deep teal. The strongest disc at 60 px, warm rather than clinical. It was the first draft of 1.0.0 (Nov 17) and was replaced before any build.
3. leaf: the bitten leaf with the caterpillar looking out, on pale green. Brian's pick on Nov 18, because it stands apart from the disc icons other timers use in search results. It shipped in build 1 (TestFlight). At 60 px the caterpillar was small.
4. jar: the sand jar. Reads as an hourglass, which says "timer" but was the most generic of the four.
5. hourglass (shipped from build 2): from `store/icon-hourglass.svg`. The teal tile and golden sand read clearly at 60 px on both wallpapers, and the face keeps it warm and made for children.

No clock face, no numbers, no hands, no red disc. The splash is the hourglass tile with its corners on the app's background, in light and dark. The Android adaptive icon uses the same art on the tile's teal (#2A9D8F). The website's icon, touch icon and Open Graph image come from the same file.

## Renders

`light/` and `dark/` hold every screen at 393x852 points @3x (landscape at 852x393), reduced to 256 colours. They come from a throwaway web copy of the app (not in the repo): the real screens, kit and scenes on react-native-web, with a stubbed store ($24.99 yearly with 3 days free, $49.99 lifetime, $4.99 weekly, the prices Brian set), seeded history, and Playwright's clock moving time forward so the scenes are part way through. Haptics, sounds, notifications, Dynamic Type and VoiceOver do not show in them. On the web the confirm alerts do nothing, and sheets show as the browser draws a page sheet.

- First launch: `01` to `03` the three screens with their scenes playing, `04` to `06` try it (ready, running, done), `07` and `08` the paywall before and after its close button shows.
- Free: `10-home`, `11-saved-free`, `12-routines-free`, `13-history`, `14-paywall-in-app` (from a locked scene).
- Pro: `20-home-pro-rocket`, `21-home-disc-sky`, `22` to `25` a 15 minute disc running, paused, at one minute left, done; `30-run-*` every other scene part way through a 10 minute timer; `40` to `43` saved timers and routines with their editors; `44-routine-step`, `45-routine-cheer`, `46-child-lock`; `47-landscape`, `48-classroom`; `49-hold-gear` (the ring filling), `50-settings`.

The store screenshots (`store/screenshots/`, by `store/screenshots.js`) are built from the light renders.

## Checklist

- [x] Tokens in src/theme.ts; light by default, dark follows the system; no white flash at launch.
- [x] One type scale in two rounded OFL faces; one spacing scale; three corners; one accent on the main action.
- [x] Scenes drawn in code, each with an ending and a dark version; drawn glyphs; own component kit.
- [x] Main button 60 pt; every target at least 44 pt.
- [x] VoiceOver labels on every control; the scene reads as one image with the time left in words; the dial is adjustable; the hold has an accessibility action.
