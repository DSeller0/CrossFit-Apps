# 98 — #227 + #231 · Two phone rendering bugs: verify on device, then fix

*Planned 2026-10-02 (Opus). Two execution sessions, both **Sonnet**: **Phase 0** (local repro +
the Android script) now; **Phase 1** (the fixes) only after the user's phone run comes back.*

## Context

Both user-reported 2026-10-02, both seen on a phone, neither reproduced yet:

- **#227** — logging a result for a WOD with many exercises: the dialog does not scroll and its
  confirm button is lost.
- **#231** — when an exercise's name plus its loads is long enough, the row's text renders on top
  of itself.

The user asked to **verify before choosing a fix**: a local repro, one test WOD that triggers
both, and a step-by-step script to run on their phone so they can point at the exact spot. The
phone is **Android** — no iPhone is available, so every Safari check goes to
[`DEVICE-TESTS.md`](../DEVICE-TESTS.md) for later (the user's call, 2026-10-02).

### Suspects — read from code, not yet driven

**#227.** `shared/ConfirmReview.module.css:2-21` — `.overlay` is `position:fixed` + flex-centred
with no `overflow`, and `.modal` has **no `max-height` and no scrolling body**. A body taller than
the viewport is clipped top *and* bottom, and the fixed overlay can't scroll, so `Confirmar` (its
last child) is unreachable. schedule.html's `LogPane` is the worst case: the review stacks one
`ReadBox` per WOD block **with that block's full `ExerciseList`** (`schedule/LogPane.jsx:41-75`;
only WOD blocks are included, `Schedule.jsx:655`). `shared/Modal.module.css:16-27,73-82` already
carries the fix idiom (`max-height`, an `overflow-y:auto` body, `flex-shrink:0` header/footer).
plans/74 traced #155's iPhone "confirm modal off-centre" report to this same overlay.

**#231.** `schedule/ExRow.jsx:383-414` — the plain-exercise row is `[check] [vol pill + name] [load
pill + Demo]`. The middle column is `flex:1; minWidth:0`, but both pills are `white-space:nowrap;
flex-shrink:0` (`Schedule.module.css:137-138`) and the right cluster never shrinks
(`flexShrink:0`). A long load — a gender pair renders as `M: 32/24 kg | F: 24/16 kg` — squeezes the
middle column below the width of its own pill or of a long word, and that content overflows **on
top of** the right cluster; the name has no `overflow-wrap`. The progression (`:253-302`) and
complex (`:109-148`) paths share the outer row. Second renderer: `shared/ExerciseList.module.css:
18-24` at `tiny` (index rail, LogPane, the leaderboard card) — `.body` is a no-wrap flex row with no
`min-width:0` and `.vol`/`.ins` never shrink, which overflows the card sideways. Third:
`results/WodSummary.jsx` renders its own rows — measure it, don't assume.

### Sibling sweep (same shapes)

| Site | Shape | Disposition |
|---|---|---|
| `results/Results.module.css:206` `.successModal` | centred, fixed, no max-height/overflow | measured in Phase 0, fixed with #227 if it clips |
| `schedule/Schedule.module.css:352` `.ckSheet` | bottom sheet, no max-height | fixed with #227 (short content, low risk) |
| `schedule/Schedule.module.css:200` `.logPane` | fixed, `overflow-y:auto` | **control** — already scrolls; measure its own `Registrar` |
| `resultados/Resultados.module.css:594-606` (SPA sheet) | sticky save row | **control** — the pattern to copy if the LogPane is at fault |
| `ConfirmReview` call sites (~20, SPA included) | shared shell | one shell fix covers them all |

## Acceptance

Both bugs are reproduced and located before any fix: a surface × viewport table backed by
screenshots, from the local repro **and** from the user's Android phone. Then, after Phase 1, the
test WOD logs end to end at 360px with `Confirmar` reachable, and no exercise row on schedule.html,
index.html or results.html has overlapping text or overflows its card.

## Must-haves

Phase 1's gate, driven on the local stack with the test WOD, then confirmed on the user's phone:

- At **360×800** the test WOD's `Revisar registro` shows `Confirmar` inside the viewport without
  scrolling the page **and** its body scrolls on its own.                         [schedule.html]
- While that dialog is open, scrolling inside it does **not** move the page behind it. [schedule.html]
- No exercise row in blocks D–E has intersecting text boxes **and** none overflows its card, at
  360px, on all three surfaces.                  [schedule.html · index.html · results.html]
- results.html's success modal reaches `Fechar` after logging block E as `Adaptado` with a note
  on every exercise.                                                              [results.html]
- The user's Android phone reports both fixed, from the same test session.          [device]

## Files

- Phase 0: none (docs only — this plan, `docs/DEVICE-TESTS.md` if the steps change).
- Phase 1, expected: `public/shared/ConfirmReview.module.css` · `public/results/Results.module.css`
  · `public/schedule/Schedule.module.css` · `public/schedule/ExRow.jsx` ·
  `public/shared/ExerciseList.module.css` · possibly `public/results/WodSummary.jsx` · gallery
  fixtures in `public/gallery/groups/{spa,schedule,shared}.jsx` · regenerated `cone/design/` cards.

## Approach

### Phase 0 — local repro (Sonnet, this plan's first session)

1. `supabase start` if down · inside `cone/`, `npm run dev` (SPA) and `npm run dev:public`; read
   each port from its log. Browse `localhost`, never `127.0.0.1` (the servers bind IPv6).
2. Pick a **free day next week** (weeks start on Sunday) — one "›" tap on every public page,
   because `index.html` reads no date parameter. In the **local** SPA Criador (the Playwright
   profile is signed in): that day → `+ sessão` → `¶ Texto` → paste the test WOD → check the preview
   parsed the gender pairs, the progression lists and the complex → `Aplicar` → gear: name
   `TESTE MOBILE — apagar`, Para quem **Atleta00** (any athlete if the local roster lacks it),
   Público, Sem box → `Salvar`. Local DB only; this validates the steps the user repeats in prod.
3. Viewports: **360×800** and **412×915** (Android), plus **375×667** and **390×844** recorded for
   `DEVICE-TESTS.md`.
4. **#231** on schedule.html (`?box=all&date=<day>`, athlete Atleta00, session open), the
   index.html day panel (`?box=all`, "›", the day), results.html's WodSummary (`?box=all`, "›", the
   session) and the LogPane's lists. With `browser_evaluate`, for every exercise row: collect the
   rects of its leaf text boxes (pills, name, buttons), test each pair for intersection (1px
   tolerance), and test `scrollWidth > clientWidth` on the row and its card. Select rows by their
   CSS-module class token (`detailEx`, ExerciseList's `row`, WodSummary's row class) — not a
   substring, which also matches `detailExName`. Screenshot every hit to `.playwright-mcp/`.
5. **#227**: `Registrar resultado` → Escala + RPE on every block → `Registrar`. Measure the open
   dialog: `innerHeight`, the dialog's and `Confirmar`'s rects, `overflowY` on overlay and body,
   `scrollHeight` vs `clientHeight`; wheel inside it and re-measure. Also measure the LogPane's own
   `Registrar`, and results.html's confirm and success modals (block E, Escala `Adaptado`, a note on
   every exercise).
6. Lengthen the test WOD until the dialog is ≥1.3× a 915px viewport and #231 hits at 412px, so
   both reproduce on any phone.
7. **Report, no fix:** one table per bug — surface × viewport → reproduced? — with the screenshots.
   Hand the user the Android script below (with the real date filled in) and update
   `DEVICE-TESTS.md` if any step changed.

**Test WOD** (blocks A–C load the dialog; D–E carry long names + loads; step 6 may lengthen it):

```
For Time – Teste A – TC 20'
500m Run
3 Rounds
50 Double Under
25 Toes to Bar
2 Rounds
15 Power Clean 60/40kg
10 Burpee Over the Bar
500m Row

AMRAP – Teste B – 20'
10 Wall Ball 9/6kg
10 Box Jump Over
10 Kettlebell Swing 24/16kg
10 Pull-up
10 Push-up
10 Air Squat
10 Sit-up
200m Run

For Time – Teste C – 5 Rounds – TC 15'
12 Deadlift 100/70kg
9 Hang Power Clean 100/70kg
6 Push Jerk 100/70kg
15 Burpee
20 Double Under

Força – Teste D – 3 Rounds
Complexo A: 1 Hang Clean + 1 Push Jerk 50/60/70%
5 Dual Kettlebell Front Rack Walking Lunges 32/24kg – 24/16kg
8 Single Arm Dumbbell Overhead Walking Lunge 22.5/15kg – 15/10kg
6 Romanian Deadlift 65/70/75/80/85%

For Time – Teste E – TC 12'
21-15-9 Thruster 43/30kg – 35/25kg
5 Dual Kettlebell Front Rack Walking Lunges 32/24kg – 24/16kg
50m Dual KB Farmer's Carry 32/24kg
```

### Phase 0b — the Android script (handed to the user at the end of Phase 0)

English, with the app's pt-BR labels quoted exactly.

1. **Create the test session.** Cone → Criador → the free day next week → `+ sessão` → `¶ Texto`
   → paste the test WOD → `Aplicar` → gear: name `TESTE MOBILE — apagar`, Para quem **Atleta00**,
   Público, **Sem box** → `Salvar`.
2. **Open it in Chrome on the phone:**
   `https://dseller0.github.io/CrossFit-Apps/schedule.html?box=all` → "›" to next week → athlete
   selector **Atleta00** → open the session.
3. **#231 — overlap.** Screenshot every row in blocks D and E where text touches or overlaps.
   Then `index.html?box=all` → "›" → the day, and `results.html?box=all` → "›" → the session;
   screenshot the same rows there.
4. **#227 — the dialog.** Back on schedule.html: `Registrar resultado` → every block: Escala `RX`,
   RPE `5` → `Registrar`. Could you reach `Registrar`? On **Revisar registro**: is `Confirmar`
   visible? After scrolling *inside* the dialog? Does the page behind move instead? Screenshot
   each. Then tap **Editar** — never `Confirmar` (if tapped by accident: delete Atleta00's row in
   Resultados).
5. **Tell me:** phone model, Android and Chrome versions, and Chrome → Settings → Accessibility →
   *Text scaling* %. If Cone is installed as a home-screen app, repeat steps 2–4 there.
6. **Clean up in the same sitting** — athletes can see next week: delete the session in Criador;
   if the phone normally opens a box link, open it again (`?box=all` cleared the stored box).

### Phase 1 — the fixes (Sonnet, after the phone run)

Choose from the evidence — these are the expected shapes, not commitments:

- **#227**, if the suspect holds: `ConfirmReview` adopts `Modal`'s idiom — `.modal{max-height:
  calc(100dvh - 40px)}` with a `vh` fallback, a flex column, `.body{overflow-y:auto; min-height:0;
  overscroll-behavior:contain}`, title and `.btns` `flex-shrink:0`. The same for `.successModal`;
  `.ckSheet` gets a max-height. If the phone instead points at the **LogPane** itself, pin
  `lpSubmit` as a sticky footer with `env(safe-area-inset-bottom)` (the SPA sheet's pattern).
- **#231**, per surface the phone confirms: in `ExRow`, let the load cluster drop to its own line
  instead of squeezing the name — the complex path already does this with `rmVolRow` — give the
  name `overflow-wrap:anywhere`, and let pills wrap; in `ExerciseList`, `.body{min-width:0}`.
  ⚠️ Respect the recorded `grid` decision (`ExerciseList.module.css:54-67`): `tiny` was kept apart
  from `grid` on purpose (LogPane and the leaderboard card are not 200px columns).
- **Lane A:** the gallery's `ConfirmReview` (`gallery/groups/spa.jsx:325-383`), `BlockDetail` and
  `ExerciseList` entries gain long-content fixtures; review at 390/1280 in the themes; then
  `npm run design:cards`.

## Verification

Phase 0: the two tables with screenshots, and the script handed over — no code changed.
Phase 1: the must-haves above, driven, with the pre-fix file proving each check can fail (memory:
live-verify recipe — the stash-free swap). `npm test` · `npm run lint` · `npm run format:check` ·
`npm run build:all` · `node scripts/audit-backlog-markers.mjs` clean. Update `DEVICE-TESTS.md` with
what is still pending on iPhone.

Model: Sonnet · Size: S–M
