# Cone — Pending device tests

On-device checks that are waiting for hardware. **As of 2026-10-02 the user has an Android phone
only**, so device scripts are written for Android Chrome and every iPhone/Safari check is collected
here until a tester's iPhone is available. Each entry says what to do, what to report and where the
result goes. Delete an entry once its result is recorded in that plan's marker.

## How to run a batch

- Use **Safari** on the iPhone. If Cone is installed as a home-screen app, repeat each check there
  too — the viewport differs (no Safari toolbars).
- Use the test athlete **Atleta00**. Never tap `Confirmar` on a real athlete.
- If a page looks out of date, close all of its tabs and open it again — the service worker can
  serve an old build for one load.
- Report for every check: iPhone model, iOS version, Safari or home-screen app, the date you ran it,
  and a screenshot of anything that looks wrong.

## iPhone / Safari — pending

### #155 · Does logging a result still zoom the page? ([plans/74](./plans/74-ios-input-zoom.md))

Shipped 2026-08-07 (every result-entry control at 16px). The row is held at `🟡 Shipped` until this
runs; nothing else is left to code.

1. Safari → `https://dseller0.github.io/CrossFit-Apps/results.html` → athlete **Atleta00** → any WOD.
2. Tap a score field (time, rounds or reps). **(a)** Does the page zoom in?
3. Pick Escala and RPE → `Registrar resultado`. **(b)** Is the `Revisar registro` dialog centred,
   or shifted / cut off?
4. Tap `Editar` — never `Confirmar`.

Result → plans/74's marker; #155 moves to Done. If (b) survives, it is the same overlay as #227 —
add it to that row rather than a new one.

### #227 + #231 · The logging dialog, and overlapping exercise rows ([plans/98](./plans/98-phone-rendering-verify.md))

plans/98's Phase 1 fixed both on Chromium (2026-10-04) and the user's Android phone confirmed it
(2026-10-23, plans/98 is Done): the review dialog is bounded — title and buttons pinned, only its
body scrolls — and exercise rows read by line. This entry is the Safari half. Run plans/98's **Phase 0b**
script in Safari, with the same test session (recreate it if it was already deleted — it lives on
this week's Sunday, because index.html shows only the current week) and the **current** test WOD,
whose block D now ends with `5x5 Back Squat 75%` and `Deadlift 3x60kg / 3x70kg / 3x80kg`. In step 5
report iPhone model · iOS version · Safari or home-screen app · whether Safari's bottom bar was
showing, instead of Chrome's items. On top of what that script asks, watch for what only iOS does:

- **The toolbars.** The dialog is bounded by its fixed overlay (`max-height:100%`), not `dvh` —
  does it fit between Safari's top and bottom bars? Is `Confirmar` on screen with the bottom bar
  showing, and does the dialog keep its margin from both bars?
- **Does the page behind still move?** Swipe up on the dialog's body past its end, and on the dark
  backdrop: the page must stay put (`touch-action` + `overscroll-behavior`). iOS before 16 ignores
  `overscroll-behavior`, so an old iPhone may still chain the scroll at the body's end — say the iOS
  version.
- **Font widths.** iOS draws text in a different system font. Rows are by line now, so nothing
  should overlap at any width — but screenshot every row in blocks D and E anyway.
- **Back Squat and Deadlift.** Back Squat has an `RM` chip on its own line under the name, with
  `Demo` beside the name; tap it and enter 100 kg — the chip reads `RM · 100 kg` and `75 kg` appears
  under `75% RM`. The kg Deadlift reads `60/70/80 kg` with no RM line.
- **A baseline to compare with** (local Chromium, 360×800): before the fix schedule.html had 7
  overlapping rows and the review dialog was 1524px tall with `Confirmar` off the screen; after it,
  0 and 760px (0.95× the screen) with `Confirmar` at y 723–763.

Say whether plans/98's fix had shipped on the day you ran it. Result → a line under plans/98's Done
marker; if Safari differs from Chrome, file it as a new row rather than reopening #227.

### Timer cues on iPhone — an observation, not an item yet

The timer marks a new round or phase **by vibration only** (`timer/Timer.jsx:309,320,324`), and iOS
Safari has no Vibration API — an iPhone gets no cue at all. Whenever a timer is tested on an iPhone
(#228's "A cada" timer, shipped 2026-10-17; buzzing confirmed on Android 2026-10-23), note whether
the missing cue matters in class. The row that would fix it already exists — **#238**, sound cues,
whose events the user picks in a planning session; this observation is evidence for it, not a new item.

## Android — pending

*(Nothing right now. The S22 re-checks for plans/98 (#227 · #231) and plans/99 (#228) passed on
2026-10-23; their results are in those plans' Done markers.)*
