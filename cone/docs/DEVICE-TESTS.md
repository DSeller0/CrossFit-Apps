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

plans/98's Phase 1 fixed both on Chromium (2026-10-04): the review dialog is bounded — title and
buttons pinned, only its body scrolls — and exercise rows read by line. Run plans/98's **Phase 0b**
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

Say whether plans/98's fix had shipped on the day you ran it. Result → plans/98's marker.

### Timer cues on iPhone — an observation, not an item yet

The timer marks a new round or phase **by vibration only** (`timer/Timer.jsx:315,323,327`), and iOS
Safari has no Vibration API — an iPhone gets no cue at all. Whenever a timer is tested on an iPhone
(#228's "A cada" timer, once shipped), note whether the missing cue matters in class. If it does, it
becomes its own row (a sound or screen-flash cue).

## Android — pending

### #227 + #231 · The S22 re-check after plans/98's Phase 1 (≈5 minutes)

Phase 0b ran on the S22 on 2026-10-02 (#227 confirmed; #231 not seen in Halo Reach). Phase 1 shipped
2026-10-04; this closes both rows. After the deploy, close every Cone tab and reopen it — the service
worker can serve the old build for one load, so open each page twice.

1. **The test session.** If the old one is still there, add the two new lines to block D (`5x5 Back
   Squat 75%` and `Deadlift 3x60kg / 3x70kg / 3x80kg`); otherwise recreate it from plans/98's Test
   WOD (Criador → this week's `DOM` → `+ sessão` → `¶ Texto` → paste → check "5 blocos · 30
   exercícios" → `Aplicar` → `Salvar sessão`).
2. **Rows, in your own theme.** `schedule.html?box=all` → Atleta00 → the `DOM` card → `Detalhes`.
   Blocks D and E: is every load **under** its exercise's name, with `Demo` beside it? Back Squat has
   `RM` on its own line under the name; tap it, enter 100 → does the chip read `RM · 100 kg`, with
   `75 kg` under `75% RM`? Deadlift reads `60/70/80 kg` with **no** `RM`.
3. **Rows, in the default theme.** `tema.html` → **TotK Dark** → repeat step 2 (this is the wide face
   where the overlap was measured). Then put your own theme back.
4. **The dialog.** `Registrar resultado` → `RX` and RPE `5` in every block → `Registrar`. On
   **Revisar registro**: is `Confirmar` on screen without scrolling the page? Swipe up inside the
   dialog, past the end of its list — does only the list move? Swipe on the dark backdrop — does the
   page stay put? Then `Editar` — never `Confirmar` by accident.
5. **Tell me:** both fixed? In both themes? A screenshot of anything that still looks wrong.
6. **Clean up:** Criador → `DOM` → `Remover`. Result → plans/98's marker, which turns `> 🟡 Shipped:`
   into `> ✅ Done:` and closes #227 and #231.
