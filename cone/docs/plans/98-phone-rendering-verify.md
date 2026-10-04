# 98 — #227 + #231 · Two phone rendering bugs: verify on device, then fix

*Planned 2026-10-02 (Opus). Two execution sessions, both **Sonnet**: **Phase 0** (local repro +
the Android script) now; **Phase 1** (the fixes) only after the user's phone run comes back.*

*Phase 0 ran 2026-10-02 (Sonnet): both bugs reproduce locally in a phone-sized viewport and are
located. Results, the steps the run proved wrong (corrected in place) and the verified Android script
are under "Phase 0 — result" and "Phase 0b".*

*The user's S22 run (2026-10-02) confirmed #227 and did not show #231, and redirected the fix to
by-line rows; #209 joined (see "Phase 0b — result"). **Phase 1 ran 2026-10-04 (Sonnet)** and is under
"Phase 1 — result". This plan carries no `> ✅ Done:` marker until the S22 re-check in
[DEVICE-TESTS.md](../DEVICE-TESTS.md) passes — its marker is `> 🟡 Shipped:` until then.*

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
| `results/Results.module.css:206` `.successModal` | centred, fixed, no max-height/overflow | **measured:** 775px with 8 long notes; loses `Fechar` at ≤700px high (a backdrop tap still closes it). Fix with #227 |
| `schedule/Schedule.module.css:352` `.ckSheet` | bottom sheet, no max-height | **bounded** (`.ckList` max 160px → ≈410px): clips only in landscape. Give it a max-height with #227; not driven |
| `schedule/Schedule.module.css:200` `.logPane` | fixed, `overflow-y:auto` | **control, measured:** scrolls (2045px in 800), `Registrar` reachable at all 4 viewports — unchanged. The dialog is the fault |
| `resultados/Resultados.module.css:594-606` (SPA sheet) | sticky save row | not needed — the LogPane is not at fault |
| `ConfirmReview` call sites (20 in 14 files, +5 gallery fixtures) | shared shell | one shell fix covers them all; regression-check the SPA ones at 360 |

## Acceptance

Both bugs are reproduced and located before any fix: a surface × viewport table backed by
screenshots, from the local repro **and** from the user's Android phone. Then, after Phase 1, the
test WOD logs end to end at 360px with `Confirmar` reachable, and no exercise row on schedule.html,
index.html, the LogPane's list or the review dialog's list has overlapping text or overflows its
card (results.html's `WodSummary` was already clean in Phase 0 — re-check it, don't touch it).

## Must-haves

Phase 1's gate, driven on the local stack with the test WOD (results.html's block A for the
short-phone one), then confirmed on the user's phone. Each one fails before the fix — the pre-fix
number is in brackets — and the appendix harness is the instrument. *Rewritten after the phone run
(2026-10-02): the S22's 384px width joins the viewports, #231 becomes by-line rows, #209 joins.*

- At **360×800** and **384×854** the test WOD's `Revisar registro` shows `Confirmar` inside the
  viewport without scrolling the page **and** its body scrolls on its own.
  [schedule.html · pre-fix: dialog 1524px, `Confirmar` at y 1105]
- A touch swipe inside that open dialog — through the end of its body and past it — leaves
  `window.scrollY` unchanged.                            [schedule.html · pre-fix: 1000 → 1536]
- In **TotK Dark** at 360px no exercise row of the test WOD has intersecting text boxes **and**
  none overflows its row or card, on schedule.html, index.html, the LogPane's list and the review
  dialog's list.                                   [pre-fix: 7 · 4 · 1 · 4 rows, re-measured]
- On schedule.html, in all four font families (TotK Dark · Spirit Blossom · Halo Reach Dark ·
  Common Dark), every row with a load shows it **under** the name, with `Demo` still on the name's
  line; a row that carries an `RM` chip (the Back Squat, the % progression, the % complex) has it
  **on its own line, first under the name** (or after a complex row's movements), above the load —
  and once RM = 100 kg the chip reads `RM · 100 kg` and `75 kg` appears under `75% RM`; the Deadlift
  row reads `60/70/80 kg` with no RM line and no computed load.  [pre-fix: load beside the name · no
  RM chip · `60/70/80% RM` + an invented load. *The RM line was the user's call at the Lane A gate;
  before it the chip sat beside `Demo`.*]
- At **360×667**, after logging block A as `Adaptado` with a ~90-character note on all 8
  exercises, results.html's confirm dialog shows `Confirmar` and its success modal shows `Fechar`.
  [results.html · pre-fix: 772px and 775px in a 667px screen]
- The user's Android phone reports both fixed, in TotK Dark as well as in Halo Reach.  [device]

## Files

- Phase 0: docs only — this plan, `docs/DEVICE-TESTS.md`, the board's `▶ Now` block and this row.
- Phase 1, expected: `public/shared/ConfirmReview.module.css` · `public/results/Results.module.css`
  · `public/schedule/Schedule.module.css` · `public/schedule/ExRow.jsx` ·
  `public/shared/ExerciseList.module.css` · gallery fixtures in
  `public/gallery/groups/{spa,schedule,shared}.jsx` · regenerated `cone/design/` cards.
  **Not** `results/WodSummary.jsx` — Phase 0 measured it clean (it renders no loads).

## Approach

### Phase 0 — local repro (Sonnet, this plan's first session — **done 2026-10-02**; steps corrected where the run proved them wrong)

1. `supabase start` if down · inside `cone/`, **`npm run dev` (SPA) first**, then
   `npm run dev:public`. The Playwright profile is signed in on `localhost:5173` and localStorage
   is per-port, so the SPA has to be the server that gets 5173 (public takes 5174) — the other
   order shows the login screen. Read each port from its log; browse `localhost`, never
   `127.0.0.1` (the servers bind IPv6).
2. Pick a **free day in the current week** (weeks start on Sunday). `index.html` shows only the
   current week — no "›", no date parameter — so a session in another week can never appear there.
   In the **local** SPA Criador (run it at 360px so it also validates the steps the user repeats in
   prod): that day's `+ sessão` → the **"Nova sessão" form comes first** (no gear step): name
   `TESTE MOBILE — apagar`, Para quem **Atleta00**, Público, Sem box → `Criar sessão` → `¶ Texto` →
   paste the test WOD → check the preview ends "5 blocos · 30 exercícios" (gender pairs, the
   progression list and the complex all parsed) → `Aplicar` → `Salvar sessão`. Local DB only.
3. Viewports: **360×800** and **412×915** (Android), plus **375×667** and **390×844** recorded for
   `DEVICE-TESTS.md`. Emulate with the Playwright viewport + CDP scrollbars-hidden + touch only — see
   the appendix for why `Emulation.setDeviceMetricsOverride` is a trap.
4. **#231** on schedule.html (`?box=all&date=<day>`, athlete Atleta00, `Detalhes` open), the
   index.html day panel (`?box=all`, tap the day, **then tap every block header** — an
   `ExerciseList` row only exists once its block is open), results.html's WodSummary (`?box=all`; the
   session card is open by default when it is the latest past day) and the LogPane's lists. With
   `browser_evaluate`, for every exercise row: collect the
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
   both reproduce on any phone. **Not needed:** the unmodified WOD gives 1.67× at 412×915, and
   #231 hits at 412px (4 rows on schedule.html).
7. **Report, no fix:** one table per bug — surface × viewport → reproduced? — with the screenshots.
   Hand the user the Android script below (with the real date filled in) and update
   `DEVICE-TESTS.md` if any step changed.

**Test WOD** (blocks A–C load the dialog; D–E carry long names + loads; parses to 5 blocks · 30
exercises. Força D is not a WOD block, so the LogPane and the review dialog carry A, B, C, E — 24
rows). ⚠️ Block E's ladder is on its **second** line on purpose: as the first line under a header,
`21-15-9 Thruster …` is read as the structure line and the Thruster falls to a note. Phase 1 added
the last two lines of block D (`5x5 Back Squat 75%` → a plain %RM row; `Deadlift 3x60kg / 3x70kg /
3x80kg` → a kg progression, #209) — Phase 0's tables below were measured on the 28-exercise version
without them:

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
5x5 Back Squat 75%
Deadlift 3x60kg / 3x70kg / 3x80kg

For Time – Teste E – TC 12'
5 Dual Kettlebell Front Rack Walking Lunges 32/24kg – 24/16kg
21-15-9 Thruster 43/30kg – 35/25kg
50m Dual KB Farmer's Carry 32/24kg
```

### Phase 0 — result (2026-10-02)

Both bugs reproduce on the local stack in a phone-sized viewport and are located. Setup: Playwright
at 360×800 · 412×915 · 375×667 · 390×844, scrollbars hidden (Android Chrome draws overlay scrollbars;
a classic one costs 10–15px of width) and touch on. The test session is on **Sunday 27/9/2026** —
Atleta00, Sem box, public — and stays in the local DB for Phase 1 (id `murlzzjojfvl6c1bjum`, no
results logged against it; delete it when Phase 1 closes). Screenshots:
`cone/.playwright-mcp/p0-*.png` (gitignored — they stay on this machine). The instrument is the
appendix harness: text-box intersection at 1px tolerance, `scrollWidth > clientWidth`, text past the
card edge.

**What the plan had wrong** — all corrected in the steps above: `index.html` has no "›" and shows
only the current week; `+ sessão` opens the "Nova sessão" form before anything else (no gear step);
a first-line ladder turns the Thruster into a note; Força D never reaches the dialog; the SPA has
to be started before the public server; no lengthening of the WOD was needed.

**#231 — overlapping / overflowing exercise rows**

| Surface (component) | 360×800 | 412×915 | 375×667 | 390×844 |
|---|---|---|---|---|
| schedule.html — session detail (`ExRow`, 28 rows) | **7 rows overlap**, worst 71px | **4**, 19px | **6**, 56px | **4**, 41px |
| index.html — day panel (`ExerciseList tiny`, 28 rows) | no overlap · **4 rows overflow their box**, one load **8.5px past the card** | clean | 3 overflow | 1 overflow |
| schedule.html — LogPane list (`tiny`, 24 rows) | 1 row overflows (card E 297 → 308px) | clean | clean | clean |
| review-dialog list (`tiny` in the fixed 300px `.modal`, 24 rows) | **4 rows overflow, 3 leave the card** — 54px past it, off the screen | same, on screen | same | same |
| results.html — `WodSummary` compact (24 rows) | clean | clean | clean | clean |
| results.html — "O que foi adaptado?" rows (block E, 3 rows) | clean | – | – | – |
| leaderboard card | not reachable with this WOD until a result is logged (Phase 1 does that); its 10 seeded rows are clean at 360 and 412 | | | |

Located: **`ExRow`** — in a 271px row the load pill + Demo cluster is 179–222px wide and
`flex-shrink:0`, leaving the name's column 3–86px. The name div has `min-width:auto`, so it cannot
shrink below its longest word (56–83px) and overruns the column by 20–102px — into the cluster. The
control, `Double Under` (cluster = Demo only, 57px), overruns by 0. The trigger is therefore any
**gender load** (`M: 24 kg | F: 16 kg`), not a long name: `Kettlebell Swing` and `Deadlift` collide
at 360px. **`ExerciseList tiny`** (index, LogPane, dialog) — `.body` is a no-wrap flex row without
`min-width:0` and `.ins` never shrinks, so a long load pushes sideways instead of overlapping; the
dialog is worst because `.modal` is a fixed 300px column at every phone width. **`WodSummary`**
renders names and volumes only — no loads, nothing to collide with.

**#227 — the review dialog**

| Surface | 360×800 | 412×915 | 375×667 | 390×844 |
|---|---|---|---|---|
| LogPane → `Revisar registro` (A, B, C, E) — dialog height | **1524px = 1.91×** the screen | **1.67×** | **2.28×** | **1.81×** |
| … `Confirmar` | y 1105–1145 — **off-screen** | 1163–1203, off | 1039–1079, off | 1127–1167, off |
| … touch swipe inside the dialog | the **page behind** scrolls (1000 → 1536); dialog and `Confirmar` don't move | → 1634 | → 1438 | → 1572 |
| LogPane `Registrar` (control) | reachable — the pane scrolls (2045px), y 739–784 | 854–899 | 606–651 | 783–828 |
| results.html confirm — block E, Adaptado, 3 notes | 422px = 0.53× · `Confirmar` visible | | | |
| results.html success modal — same | 457px = 0.57× · `Fechar` visible | | | |
| results.html — block A, Adaptado, 8 notes of ~90 chars | confirm **772px = 0.97×**, success **775px** | | | |

The 775px success modal (no max-height) loses `Fechar` once the viewport is ≤700px high — 800 ✓ ·
740 ✓ · 700 ✗ · 667 ✗ · 600 ✗ — which is any phone with the address bar showing; a backdrop tap still
closes it. The plan's own scenario (block E, 3 short notes) fits everywhere, so its Must-have was
replaced by the block-A one, which fails pre-fix.

Located: `.overlay` is `position:fixed` with `overflow:visible`; `.modal` has `max-height:none` and
no scrolling body, and `align-items:center` cuts a too-tall body equally top and bottom. `Confirmar`
is the last child, so it is the first thing lost, and with no scroll container anywhere a swipe
chains to the document and moves the page behind. The height doesn't depend on the viewport width
(fixed 300px column), so it fails at every phone width tested.

**What this changes for Phase 1.** #227's expected shape stands (bounded `.modal`, scrolling `.body`
with `overscroll-behavior:contain`, pinned `.btns`); `.successModal` takes the same; `.ckSheet` gets
its max-height for landscape only. #231 needs **two** fixes, not one: `ExRow` (load cluster to its
own line — it is 66–82% of the row — and a name that can wrap) **and** `ExerciseList tiny`
(`.body{min-width:0}`, `.ins` allowed to shrink/wrap; `grid` keeps its own rules). The gallery's
fixtures need the case none of them showed: a gender load beside a long name.

### Phase 0b — the Android script (handed to the user 2026-10-02; the creation steps were driven at 360×800 on the local stack)

English, with the app's pt-BR labels quoted exactly. About 15 minutes, in Chrome; if Cone is also
installed as a home-screen app, repeat steps 2–4 there.

1. **Create the test session** — Cone → Criador, on the phone. In the week list tap **`+ sessão`** on
   the **`DOM`** (Sunday) row of the *current* week: no class that day, and it is already past, so
   nobody looks at it. In "Nova sessão": name `TESTE MOBILE — apagar` (a plain hyphen is fine),
   "Para quem" → tick **Atleta00**, Visibilidade **Público**, Box **Sem box** → `Criar sessão`. Then
   tap **`¶ Texto`** beside "Blocos", paste the test WOD above, check the preview ends
   "5 blocos · 30 exercícios" → `Aplicar` → `Salvar sessão`.
2. **Open it, one page at a time.** Every link ends `?box=all` — a "Sem box" session only shows in
   the general view:
   - `https://dseller0.github.io/CrossFit-Apps/schedule.html?box=all` → athlete selector
     **Atleta00** → the **DOM** card → `Detalhes`.
   - `https://dseller0.github.io/CrossFit-Apps/index.html?box=all` → tap **DOM** in the week strip →
     tap each of the five blocks to open it.
   - `https://dseller0.github.io/CrossFit-Apps/results.html?box=all` → the **DOM** card (open it if
     it is collapsed).
3. **#231 — overlap.** schedule.html: scroll blocks B, C, D and E and screenshot every row where
   text sits on top of other text. index.html: screenshot every open block where a load
   (`M: … kg | F: … kg`) touches or crosses the card's right edge. results.html: just say whether
   any row looks wrong.
4. **#227 — the dialog.** schedule.html → bottom of the session → **`Registrar resultado`**. In
   **every** block tap `RX` and RPE `5`. Scroll *inside* the panel down to `Registrar` — **could you
   reach it?** Tap it. On **Revisar registro**: **(a)** is `Confirmar` on screen? **(b)** swipe up
   inside the dialog — does the dialog move, or the page behind it? Screenshot (a) and (b). Then tap
   **`Editar`** — never `Confirmar` (by accident: Cone → Resultados → delete Atleta00's row).
5. **Tell me:** phone model · Android version · Chrome version (⋮ → Settings → About Chrome) ·
   Chrome → Settings → Accessibility → *Text scaling* % · browser or home-screen app · whether the
   address bar was showing.
6. **Clean up in the same sitting.** Criador → tap the `DOM` row → the trash icon (`Remover`) →
   `Remover`. Until you do, anyone who opens index.html or results.html and taps Sunday sees the
   session. If your phone normally opens a box link, open it once more — `?box=all` cleared the
   stored box.

### Phase 0b — result: the user's Galaxy S22 Ultra (2026-10-02)

Samsung Galaxy S22 Ultra (SM-S908E) · Android 16 · Chrome 154.0.8037.92 · text scaling 100% ·
a Chrome tab · about 384 CSS px wide at the default display size (not measured). The user's three
screenshots are in the conversation only — nothing from the phone is in the repo.

- **#227 — confirmed on the device.** `Registrar` is reachable (the LogPane scrolls), but on
  `Revisar registro` the dialog is cut off, `Confirmar` is never on screen, and a swipe moves **only
  the page behind it**: the local repro, point for point.
- **#231 — not seen on the phone, with this WOD.** The phone runs the user's own theme, **Halo
  Reach** (body font `system-ui` — Roboto on Android), while Phase 0 measured in the default
  **TotK** (`theme.js` `DEFAULT_THEME = 'totk-dark'`; in the local snapshot of prod `settings.theme`
  is unset and the Eagles box default is `totk-light`), whose font is **Cinzel**, a wide one. First
  guess: the bug lives in the wide faces. **Phase 1's per-font baseline refuted that** (table in
  "Phase 1 — result"): all four families collide at 360–412px locally, Halo Reach included — but
  there `system-ui` resolves to Windows' Segoe UI, wider than Roboto, which cannot be measured on
  this machine. So the S22's clean run is consistent with Roboto being narrower, not proof that the
  bug needs a wide face; by-line rows remove the dependence on font width either way.
- **The user's direction:** render the rows **by line** — the name line carries the volume, the name,
  `RM` and `DEMO`; the loads sit on the line below. `RM` shows only where it applies to the
  exercise. "Some blocks already work like that" is right: `ExRow`'s progression and complex paths
  already put the load in a `.rmVolRow` under the name; the plain path and `ExerciseList`'s `tiny`
  size are the odd ones out.
- **Decisions (2026-10-02, with the user):** plain `% RM` rows (`Back Squat 75%`) gain the `RM` chip
  and a computed load; **every** `ExerciseList tiny` list goes by-line, not only the dialog's;
  #209 (a kg progression shown as `60/70/80% RM` with an invented load) is fixed in the same pass.

### Phase 1 — the fixes (Sonnet, after the phone run)

Phase 0's evidence supports these shapes; the phone run can still redirect them (**it did — see
"Phase 0b — result" above: #231 becomes by-line rows, and #209 joins**):

- **#227** — the suspect held: `ConfirmReview` adopts `Modal`'s idiom — `.modal{max-height:
  calc(100dvh - 40px)}` with a `vh` fallback, a flex column, `.body{overflow-y:auto; min-height:0;
  overscroll-behavior:contain}`, title and `.btns` `flex-shrink:0`. The same for `.successModal`;
  `.ckSheet` gets a max-height. Phase 0 found the LogPane itself fine (it scrolls, `Registrar` is
  reachable); only if the phone disagrees, pin `lpSubmit` as a sticky footer with
  `env(safe-area-inset-bottom)` (the SPA sheet's pattern).
- **#231** — two fixes: in `ExRow`, let the load cluster drop to its own line instead of squeezing
  the name — the complex path already does this with `rmVolRow` — give the name
  `overflow-wrap:anywhere`, and let pills wrap; in `ExerciseList`, `.body{min-width:0}` **and** let
  `.ins` shrink and wrap (it is `flex-shrink:0`, so `min-width:0` alone moves nothing).
  ⚠️ Respect the recorded `grid` decision (`ExerciseList.module.css:54-67`): `tiny` was kept apart
  from `grid` on purpose (LogPane and the leaderboard card are not 200px columns).
- **Lane A:** the gallery's `ConfirmReview` (`gallery/groups/spa.jsx:325-383`), `BlockDetail` and
  `ExerciseList` entries gain long-content fixtures; review at 390/1280 in the themes; then
  `npm run design:cards`.

### Phase 1 — result (2026-10-04)

**What changed**

- **#227 — the dialogs are bounded.** `ConfirmReview.module.css`: `.modal` is a flex column with
  `max-height:100%` of the padded fixed overlay (not `dvh`: it follows Chrome Android's moving
  address bar and also bounds the gallery's transformed `ModalBox`); title, error and buttons are
  `flex-shrink:0`; `.body` is the one scroller (`overflow-y:auto`, `min-height:0`,
  `overscroll-behavior:contain`, `touch-action:pan-y pinch-zoom`); the overlay is
  `touch-action:pinch-zoom`, so a swipe on the backdrop, title or buttons can't pan the page behind.
  One shell, so all 20 call sites. `Results.module.css` `.successModal` takes the same shape
  (`Fechar` pinned, `.successDetail` scrolls); `.ckSheet` gets a `max-height` and scrolls.
- **#231 — rows read by line.** `ExRow`: the name line (`ExHead` — volume pill + name on the left,
  `[Demo]` on the right; it wraps, as a safety net) and, under it, `LoadLines` — **one line each, in
  this order: `RM` (only where the load is a % of the RM; `RM · 100 kg` once known, its entry opening
  under it), the load, the load worked out from the RM** — on all three shapes (a complex row's lines
  follow its movements; a progression's RM sits under the first group's name). A plain %RM row gains
  the RM line and the computed kg; `RmChip`/`RmInput`/`LoadLines` replace three copies of the RM entry
  and of the line order; `usesRm()` is the one rule for "this row has an RM line" and for
  `autofillRm`'s PR pre-fill; `calcFromRm()` replaces four copies of the ceil-of-%-of-RM sum.
  `ExerciseList` `tiny` adopts the by-line rules `grid` already had (index day panel, LogPane, the
  review dialog, the leaderboard card, the Criador preview); `grid` keeps only its 12px name.
- **#209 — a kg progression stops being a % RM one.** `progressionGroupUnit(ex, reps)` in
  `lib/wod.js` is the single derivation of a group's unit; `buildProgressionLines` (exports) and
  `ExRow` (progression and complex shapes) both call it. A kg group reads `60/70/80 kg`, with no RM
  chip and no computed load.
- **Gallery (Lane A):** `exLongGender`, `exLadderGender`, `exProgKg`; ExRow cases at the 271px a
  360px phone leaves a row — RM not set / set / being typed, a long name with and without an RM, a
  complex row with an RM, the two gender loads and the kg progression; `tiny` cases (the index/LogPane
  list and the ≈242px review-dialog width) and `grid` with the new fixtures; ConfirmReview "Corpo
  longo (LogPane, 4 blocos)".
- **Tests:** +9 `progressionGroupUnit` (`wod.test.js`), +12 `usesRm` / `calcFromRm`
  (`scheduleHelpers.test.js`); `exportHelpers.test.js` untouched and green — 1158 in all.

**Per-font baseline, before the fix** (local Chromium, the 30-exercise test WOD on today's session,
at 360×800 / 384×854 / 412×915). schedule.html counts rows whose text overlaps; the other three
count rows that overflow their box; the last column is the review dialog's height as a multiple of
the screen:

| Theme · font | schedule.html | index.html | LogPane list | review-dialog list | dialog height |
|---|---|---|---|---|---|
| TotK Dark · Cinzel | 7 · 4 · 4 | 4 · 1 · 0 | 1 · 0 · 0 | 4 · 4 · 4 | 1524px · 1.91× · 1.78× · 1.67× |
| Spirit Blossom · Amarante | 4 · 3 · 0 | 0 · 0 · 0 | 0 · 0 · 0 | 2 · 2 · 2 | 1376px · 1.72× · 1.61× · 1.50× |
| Halo Reach Dark · `system-ui` (Segoe UI here) | 5 · 4 · 3 | 1 · 0 · 0 | 1 · 0 · 0 | 3 · 3 · 3 | 1467px · 1.83× · 1.72× · 1.60× |
| Common Dark · Arial | 6 · 4 · 3 | 4 · 1 · 0 | 1 · 0 · 0 | 5 · 5 · 5 | 1545px · 1.93× · 1.81× · 1.69× |

Every cell is a failure: `Confirmar` was off the screen in all twelve runs, and a touch swipe inside
the dialog moved only the page (TotK Dark 360×800: `scrollY` 2277 → 2630, the body never scrolled).

**After the fix** — the same driver, the same data, all four families at all three viewports: every
cell above is **0**; the dialog is 0.95× · 0.95× · 0.96× the screen (top 20px, bottom 20px from the
edge) with `Confirmar` on screen (y 723–763 of 800), its body scrolls on its own (1395px of content
in 640), and a swipe through and past the end leaves `scrollY` where it was (2431 → 2431) with the
body scrolled to its end. All 15 rows that carry a load show it under the name, with `Demo` still on
the name's line in every row of every cell — even in Cinzel at 360px. The 3 rows that carry an `RM`
chip (Complexo A, Romanian Deadlift, Back Squat) have it on its own line, first in the column under
the name (Complexo A: after its movements), and the lines stack — no chip beside another element. Typing
RM = 100 kg into each of the three opens the entry **under the chip**, and the chip then reads
`RM · 100 kg` with the load and the computed load below it: Back Squat `75% RM` / `75 kg`, the
`% do RM` progression `65/70/75/80/85% RM` / `65/70/75/80/85 kg`, the complex `50 / 60 / 70 % RM` /
`50/60/70 kg`; with all three RMs set, schedule.html still has 0 overlapping and 0 overflowing rows
(the widest chips of the run). The kg Deadlift reads `60/70/80 kg` with only `[Demo]`, no RM line.
results.html at 360×667, block A logged `Adaptado` with a
90-character note on all 8 exercises: confirm **627px** (was 772) with `Confirmar` at 590–630 of
667, success modal **635px** (was 775) with `Fechar` at 594–630, and a swipe on it leaves the page at
0. The check-in sheet in landscape (800×360): 344px with its title on screen (it is 406px of
content). `npm test` · `lint` · `format:check` · `build:all` clean.

**What the run found**

- **Every font family collides locally, not only the wide Cinzel** — see Phase 0b: the S22's clean
  run is consistent with Roboto being narrower than this PC's Segoe UI, which cannot be measured
  here. By-line rows make the outcome independent of the face.
- **The first by-line header was not enough — and neither was the wrap.** With a fixed actions
  cluster beside a flexible name column, a 271px row holding a stored RM (`[100 kg] [Demo]`) left the
  name ~60px, and `overflow-wrap:anywhere` split THRUSTER into "THRUSTE / R". The harness could not see
  it (no overlap, no overflow) — the gallery render did. `ExHead` was made to **wrap** (the name keeps
  its longest word, the actions drop to their own right-aligned line), which fixed the split but left
  a row that changed shape the moment an RM was typed — and a long name with an RM took three lines.
  At the Lane A gate the user's call was to give **`RM` its own line** (`Sets × Reps  Exercise Name
  DEMO` / `RM` / `Load` / `Calculated Load`): the chip leaves the name line, so only `Demo` is left
  beside the name, and the row no longer reflows when an RM is stored. `ExHead` keeps the wrap as a
  safety net; nothing in the test WOD needs it (`Demo` stays on the name's line in all 12 cells).
- **`sw.js` serves assets stale-while-revalidate**, so the first load after an edit renders the
  *previous* build while it refreshes the cache. A measurement or a screenshot needs a second load —
  the drivers `goto` then `reload`. (It also explains a first run that mixed old and new rows.)
- **Today's session renders twice on schedule.html** — the desktop pane (`display:none` at phone
  width) auto-selects it — so the harness counts rendered rows only (v3, below).
- **Not touched, but visible in the new screenshots:** `ReadRow` has no gap between label and value,
  so a short exercise name beside a long note reads "RunSubstituí pela versão…". Worth its own row.
- The gallery's 390px `MobileFrame` iframe auto-grows to its content; an item that sizes with
  viewport units (`SessionTextPane`) grows it without bound — a screenshot of it asked Chrome for a
  33-million-pixel bitmap and killed the browser. Shoot such items in Full mode.

**The checks can fail.** With the five pre-fix files swapped back in (stash-free: copies saved and
`sha1sum`-checked on the way out), the same driver on the same data reproduced the baseline exactly —
TotK Dark 360×800: 7 · 4 · 1 · 4 rows, dialog 1524px (1.91×) with `Confirmar` at y 1105, the swipe
moving the page 2277 → 2630 with the body at scrollTop 0, Back Squat with no `RM` chip and its load
beside the name, the kg Deadlift reading `60/70/80% RM` **with** an RM chip; Halo Reach Dark 360×800:
5 · 1 · 1 · 3 and 1467px. The RM-line checks (chip first in its column, below the name, lines
stacked, `Demo` on the name's line) were proved the same way against the layout they replaced — the
RM chip inside the `Demo` cluster, copies saved and `sha1sum`-checked: TotK Dark 360×800 reported the
chip not first in the load column on all 3 rows (Complexo A, Romanian Deadlift, Back Squat), not below
the name on 2, and `Demo` pushed off the name's line on Complexo A. `npm run design:cards`
regenerated the 17 cards (the CSS is inlined into each).

**Still open — the device:** the S22 re-check (the dialog, then tema.html → *TotK Dark* →
schedule.html blocks D/E) is in [DEVICE-TESTS.md](../DEVICE-TESTS.md). Until it passes the plan is
held at `> 🟡 Shipped:` (the plans/74 precedent) and #227/#231 stay on the board.

## Verification

Phase 0: the two tables with screenshots, and the script handed over — no code changed. ✔ done.
Phase 1: the must-haves above, driven with the appendix harness, with the pre-fix file proving each
check can fail (memory: live-verify recipe — the stash-free swap); re-run the harness on all five
surfaces, not only the ones that failed. `npm test` · `npm run lint` · `npm run format:check` ·
`npm run build:all` · `node scripts/audit-backlog-markers.mjs` clean. Update `DEVICE-TESTS.md` with
what is still pending on iPhone.

Model: Sonnet · Size: S–M

---

## Appendix — the measurement harness

Kept because Phase 1's must-haves are only worth anything if the *same* instrument shows them
failing on the pre-fix file. Save the code below to a file, register it once per browser context with
`await page.context().addInitScript({ path })`, and it is on `window.__h` after every navigation.
Read-only — it never changes the page.

**Phone emulation that worked:** `page.setViewportSize({ width, height })` + CDP
`Emulation.setScrollbarsHidden {hidden:true}` + `Emulation.setTouchEmulationEnabled
{enabled:true, maxTouchPoints:5}`. A swipe is `Input.dispatchTouchEvent` `touchStart` → ~25
`touchMove` → `touchEnd`; `Input.synthesizeScrollGesture` did nothing without touch emulation.
⚠️ Do **not** use `Emulation.setDeviceMetricsOverride`: Playwright's own element and clip
screenshots re-apply the page's stored viewport, so crops silently come out at the wrong width (a
"412px" run produced 298px crops byte-identical to the 360px ones). Check each crop's PNG width.

**Calls** — a surface passes when `hit`, `overflowRows`, `escapeRows` and `cardsOverflowing` are all
0 (`list[i].overlaps` names the colliding boxes):

| Surface | `window.__h.measureRows(cfg)` |
|---|---|
| schedule.html session detail (after `Detalhes`) | `{ rowTok: 'detailEx', cardTok: 'detailBlock' }` |
| index.html day panel (after tapping every `_blkHdr_`) | `{ rowSel: '[class*="_exBlock_"], [class*="_complexBlock_"]', cardSel: '[class*="_sessCard_"]' }` |
| LogPane list | `{ scope: '[class*="_logPane_"]', rowSel: <as above>, cardTok: 'lpBlock' }` |
| review-dialog list | `{ scope: '[role=dialog]', rowSel: <as above>, cardTok: 'readbox' }` |
| results.html `WodSummary` | `{ rowTok: 'wodSumEx', cardSel: '[class*="_wodSection_"]' }` |

`window.__h.dialogInfo('[role=dialog]')` returns the dialog's rect, the overlay/dialog/body
`overflow-y`, `max-height`, `pageScrollY` and each button's rect — `Confirmar` passes when
`t >= 0 && b <= innerHeight`. The LogPane flow: `Detalhes` → `Registrar resultado` → in each
`_lpBlock_` click `RX` and `5` → `_lpSubmit_`.

**Gotchas.** Row selectors are exact CSS-module tokens (`_detailEx_<hash>_<line>`): `[class*=detailEx]`
also matches `detailExName`; `_exBlock_` misses `_complexBlock_` only because of the leading
underscore. Rows that share a card count its overflow once (`cardsOverflowing`), never per row. Text
boxes come from `Range.getClientRects()` on each text node, so a wrapped name is compared line by
line; a ≤2px vertical touch between adjacent lines is line-box noise — the real hits are tens of px
wide (worst 71px). v3 counts **rendered rows only**: today's session also renders in schedule.html's
hidden desktop pane, which would double the count with boxes that have no size.

**Driving it (Phase 1).** Set `cone_theme_user` **and** `cone_theme`, `goto`, then `reload` — `sw.js`
serves assets stale-while-revalidate, so the first load after an edit is the previous build. Open the
dialog with `Registrar` and close it with **Escape** (`ConfirmReview`'s own "Editar"): pre-fix the
`Editar` button is itself off-screen, so a click just times out — and never `Confirmar` on the
LogPane. A swipe is three passes of `Input.dispatchTouchEvent` from 78% to 22% of the screen's height
at the dialog's centre, comparing `window.scrollY` and the body's `scrollTop` before and after. The
by-line probe reads every rendered `detailEx`: its load column (`rmVolRow`) starts below the name's
bottom edge, the `RM` chip is that column's first child and sits below the name, the column's
children stack, and `Demo` is above the name's bottom edge. Typing an RM (click the row's `RM`, fill
the input, Enter) is React state only — no storage, no DB — so it is safe to drive. results.html
(block A → `Adaptado` → RPE 5 → "O que foi adaptado?" → every exercise's toggle → a note in each input
→ `Registrar resultado`) **writes a `results_v2` row** when `Confirmar` is tapped: delete it afterwards
from the local REST by id + session_id. The gallery's 390 mode is a real 390px iframe — screenshot
`iframe[title="Mobile preview"]` on a tall page viewport (a short one stitches the sticky bar into the
image), and shoot `SessionTextPane` in Full mode only.

```js
// plans/98 Phase 0 measurement harness. Installed with page.addInitScript({ path }) so it is
// present after every navigation. Read-only: it never mutates the page.
;(() => {
  if (window.__h && window.__h.v >= 3) return

  // CSS-module class token: `_detailEx_10yne_253` -> base `detailEx`. An exact-token test, so
  // `detailEx` does NOT match `_detailExName_…` (a substring match would).
  const hasTok = (el, base) => {
    for (const t of el.classList) {
      if (t === base) return true
      if (t.startsWith('_' + base + '_') && /^[A-Za-z0-9-]+_\d+$/.test(t.slice(base.length + 2)))
        return true
    }
    return false
  }
  const byTok = (root, base) => [...root.querySelectorAll('[class]')].filter(e => hasTok(e, base))
  const closestTok = (el, base) => {
    for (let p = el.parentElement; p; p = p.parentElement) if (hasTok(p, base)) return p
    return null
  }
  const R = r => ({ l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height })
  const round = n => Math.round(n * 10) / 10

  function leafRects(row) {
    const out = []
    let nid = 0
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
    let n
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue
      const el = n.parentElement
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const range = document.createRange()
      range.selectNodeContents(n)
      const id = nid++
      for (const r of range.getClientRects()) {
        if (r.width < 0.5 || r.height < 0.5) continue
        out.push({ kind: 'text', id, owner: el, label: n.textContent.trim().slice(0, 30), ...R(r) })
      }
    }
    // chips: an element that paints its own box (pill / button) and holds text directly
    for (const el of row.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      const paints =
        (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') ||
        parseFloat(cs.borderTopWidth) > 0
      const hasDirectText = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())
      if (paints && hasDirectText && el !== row) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0)
          out.push({ kind: 'chip', id: 'c' + nid++, owner: el, label: '[' + el.textContent.trim().slice(0, 24) + ']', ...R(r) })
      }
    }
    return out
  }

  function pairHits(rects) {
    const hits = []
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i],
          b = rects[j]
        if (a.kind === 'text' && b.kind === 'text' && a.id === b.id) continue
        // a chip and the text that lives inside it are the same ink
        if (a.kind === 'chip' && b.kind === 'text' && a.owner.contains(b.owner)) continue
        if (b.kind === 'chip' && a.kind === 'text' && b.owner.contains(a.owner)) continue
        if (a.kind === 'chip' && b.kind === 'chip' && (a.owner.contains(b.owner) || b.owner.contains(a.owner))) continue
        // chip-vs-chip is only interesting when it is a real collision, text-vs-anything always is
        const w = Math.min(a.r, b.r) - Math.max(a.l, b.l)
        const h = Math.min(a.b, b.b) - Math.max(a.t, b.t)
        if (w > 1 && h > 1) hits.push({ a: a.label, b: b.label, kinds: a.kind + '/' + b.kind, w: round(w), h: round(h) })
      }
    }
    return hits
  }

  // cfg: { rowTok | rowSel, cardTok | cardSel, scope?: selector, minRows?: n }
  function measureRows(cfg) {
    const scope = cfg.scope ? document.querySelector(cfg.scope) : document
    if (!scope) return { error: 'scope not found: ' + cfg.scope }
    // Rendered rows only: schedule.html also renders TODAY's session in its desktop pane, which is
    // display:none at phone width — those rows have no boxes and would only inflate the count.
    const rows = (cfg.rowTok ? byTok(scope, cfg.rowTok) : [...scope.querySelectorAll(cfg.rowSel)]).filter(
      r => r.getClientRects().length > 0,
    )
    const res = { viewport: { w: innerWidth, h: innerHeight }, rows: rows.length, hit: 0, overflowRows: 0, escapeRows: 0, cards: [], list: [] }
    const seenCards = new Map()
    rows.forEach((row, idx) => {
      const card = cfg.cardTok ? closestTok(row, cfg.cardTok) : cfg.cardSel ? row.closest(cfg.cardSel) : null
      const cardR = card ? card.getBoundingClientRect() : null
      if (card && !seenCards.has(card)) {
        const info = { w: Math.round(cardR.width), sw: card.scrollWidth, cw: card.clientWidth, overflow: card.scrollWidth - card.clientWidth > 1 }
        seenCards.set(card, info)
        res.cards.push(info)
      }
      const rects = leafRects(row)
      const overlaps = pairHits(rects)
      const rowOverflow = row.scrollWidth - row.clientWidth > 1
      const escapes = cardR
        ? rects.filter(r => r.kind === 'text' && (r.r > cardR.right + 1 || r.l < cardR.left - 1)).map(r => r.label + ' r=' + round(r.r) + ' (card r=' + round(cardR.right) + ')')
        : []
      const text = row.innerText.replace(/\s+/g, ' ').trim().slice(0, 70)
      const bad = overlaps.length > 0 || rowOverflow || escapes.length > 0
      if (overlaps.length) res.hit++
      if (rowOverflow) res.overflowRows++
      if (escapes.length) res.escapeRows++
      res.list.push({ idx, text, bad, overlaps, rowOverflow, escapes, w: round(row.getBoundingClientRect().width) })
    })
    res.cardsOverflowing = res.cards.filter(c => c.overflow).length
    const doc = document.documentElement
    res.page = { scrollW: doc.scrollWidth, clientW: doc.clientWidth, overflowX: doc.scrollWidth > doc.clientWidth + 1 }
    return res
  }

  // The open ConfirmReview-like dialog: geometry of dialog, overlay, body and the action buttons.
  function dialogInfo(sel) {
    const dlg = document.querySelector(sel || '[role=dialog]')
    if (!dlg) return { error: 'no dialog' }
    const ov = dlg.parentElement
    const btns = [...dlg.querySelectorAll('button')].map(b => ({ text: b.textContent.trim(), ...Object.fromEntries(Object.entries(R(b.getBoundingClientRect())).map(([k, v]) => [k, round(v)])) }))
    const csO = getComputedStyle(ov),
      csD = getComputedStyle(dlg)
    const vv = window.visualViewport
    const body = [...dlg.children].find(c => c.scrollHeight > 0 && getComputedStyle(c).display === 'flex')
    return {
      innerHeight,
      innerWidth,
      visualViewportH: vv ? round(vv.height) : null,
      dialog: Object.fromEntries(Object.entries(R(dlg.getBoundingClientRect())).map(([k, v]) => [k, round(v)])),
      dialogScrollH: dlg.scrollHeight,
      dialogClientH: dlg.clientHeight,
      dialogOverflowY: csD.overflowY,
      dialogMaxH: csD.maxHeight,
      overlayPos: csO.position,
      overlayOverflowY: csO.overflowY,
      overlayScrollH: ov.scrollHeight,
      overlayClientH: ov.clientHeight,
      bodyOverflowY: body ? getComputedStyle(body).overflowY : null,
      bodyScrollH: body ? body.scrollHeight : null,
      bodyClientH: body ? body.clientHeight : null,
      pageScrollY: Math.round(scrollY),
      docScrollH: document.documentElement.scrollHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      btns,
    }
  }

  window.__h = { v: 3, measureRows, dialogInfo, byTok, hasTok, closestTok }
})()
```
