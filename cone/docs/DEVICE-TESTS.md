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

Run plans/98's **Phase 0b** script in Safari, with the same test session (recreate it if it was
already deleted — it lives on this week's Sunday, because index.html shows only the current week).
In step 5 report iPhone model · iOS version · Safari or home-screen app · whether Safari's bottom
bar was showing, instead of Chrome's items. On top of what that script asks, watch for what only
iOS does:

- **The toolbars.** Does Safari's bottom bar cover `Registrar` or `Confirmar`? Does the dialog fit
  between the top and bottom bars once the Phase 1 fix (if shipped) uses `dvh`?
- **Font widths.** iOS draws text in a different system font, so rows may overlap at different
  names than on Android — screenshot every row in blocks D and E, not just the ones Android flagged.
- **A baseline to compare with** (local Chromium, 360px, before any fix): schedule.html has 7
  overlapping rows — B `Kettlebell Swing`, C `Deadlift`, D both lunges, E the lunges, `Thruster`
  and `Farmer's Carry` — and the review dialog is 1524px tall with `Confirmar` off the screen.

Say whether plans/98's Phase 1 fix had shipped on the day you ran it. Result → plans/98's marker.

### Timer cues on iPhone — an observation, not an item yet

The timer marks a new round or phase **by vibration only** (`timer/Timer.jsx:315,323,327`), and iOS
Safari has no Vibration API — an iPhone gets no cue at all. Whenever a timer is tested on an iPhone
(#228's "A cada" timer, once shipped), note whether the missing cue matters in class. If it does, it
becomes its own row (a sound or screen-flash cue).

## Android — pending

- **plans/98 Phase 0b** — the Android script was handed over 2026-10-02 (its creation steps were
  driven at 360×800 on the local stack); the user's result, the five items in its step 5, decides
  Phase 1. The local repro already reproduces both bugs, so the phone run confirms where, not whether.
