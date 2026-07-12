# 20 — Design pass B2: results.html + leaderboard.html (#51)

> ✅ Done: `14fba36` + `76d1d71` + `d5a779a` + `1ffe087` + `aba6328` (2026-07-12)

## What changed vs. this plan (read before trusting the sections below)

**The mobile leaderboard was redesigned mid-session** from the user's Claude Design print (2026-07-12), which superseded parts of §2:
- The mobile `<select>` WOD picker is **retired**, not restyled. The week is a list of accordion cards (`leaderboard/WodCard.jsx`) and the ranking lives **inside** the card you open — the same gesture as results' `SessionCard`. Both now run on a shared `shared/AccordionCard.jsx` (one disclosure/keyboard/aria implementation, two headers).
- A **`shared/WodBlockCard.jsx`** renders the WOD above the ranking, reusing TV's shape (family rule + badge + the shared `ExerciseList`). It **absorbed the planned `LbHeader`**, which was built and then deleted — the badge is the label, the chips are rounds/CAP, the footer is date · session · scale.
- `RankList`'s scale + perf sit in fixed **left-aligned** columns, and the row becomes **two lines** in a narrow container. That is a **container query**, not a viewport one: the list is narrow both on a phone *and* inside results' 300px desktop pane.
- `ScaleFilter` ended up in `shared/` (not `leaderboard/`) — three copies existed, since leaderboard rendered it twice and results had its own.
- "Adaptado" renders as **"Adap"** in RankList (`SCALE_SHORT`): at full length it outgrew its column and knocked that row's left edge out of line.

**Already fixed before this session started:** the 🔴 schedule.html mobile `submitLog` data-loss bug landed in `b96d954` (merge + prefill + `existing?.id`). Verification step 3 was re-confirmed, not re-fixed.

**Bugs found and fixed while building (none were in the plan):**
- `perfStr()` returned `—` for a For Time athlete who capped, hiding the rounds they *did* complete → now `"N rds (DNF)"` everywhere (reaches TV + leaderboard).
- Both KPI calculators averaged RPE over **all** entries, so one athlete with no RPE dragged the gym's average toward zero → now averages over those who logged one.
- `WodSummary`/the old results copies filtered exercises on `e.name`, and a **complex exercise has no name of its own** → a WOD built from a complex rendered *no movements*. Now renders `4×(2+1+1) Clean Pull + Power Clean + Push Jerk`.
- `ExerciseList`'s `tiny` size had no overrides for complex sub-movements or notes, so they fell back to `compact`'s TV-wall 20px/16px (reaches LogPane).
- `.wodTypeTag` was `flex-shrink:0`, so a long block label ate the row and collapsed the session name to zero width.
- Shared components used the `ti` icon **webfont**, which `leaderboard.html` does not load (results/schedule do) — chevrons and trophies silently rendered as nothing there. Shared components now use `@tabler/icons-react`.

**Scope kept:** the SPA's `lb_colors` picker is gone, but its **image export** (html2canvas → shareable PNG) still needed colors — it now uses a fixed `LB_IMG` palette mirroring totk-dark + the podium tokens (concrete hex: html2canvas can't be trusted with `color-mix()`). The config load/save buttons the picker's modal hosted were preserved, moved into the card header.

## Context
Second execution session of the design-pass program ([plans/16](./16-design-pass-program.md)), unblocked by #50 (B1 — schedule.html). Findings from [reviews/2026-07-09-design-benchmark.md](../reviews/2026-07-09-design-benchmark.md): both pages open **empty** until the user manually picks a WOD; results.html's collapsed day cards carry almost no information; the two pages disagree with schedule.html about whether an athlete may correct their own result; leaderboard.html is the app's worst token offender (off-palette cyan `#00b8d4`).

Per the program, this session does design refinement **plus** these two pages' slice of #15 (hex→tokens), #14 (mechanical a11y), #18 (desktop scroll-in-panes), and #17 (component extraction that feeds the gallery).

**Three decisions settled with the user up front (2026-07-11):**
1. **Retire the `lb_colors` custom-color system.** leaderboard.html renders purely from theme tokens; the 20-slot coach color picker in the SPA is removed. It predates the 4-theme system and force-writes `--accent` onto `<html>` — the same bug class #50 deleted from `Schedule.jsx`'s `load()`.
2. **Allow self-correction everywhere**, one merge semantic. Also kills a live silent data-loss path.
3. **Add `--podium-1/2/3` tokens** to `themes.css` so medal colors are theme-tunable.

**Two findings are real bugs, not polish:**
- 🔴 **Silent data loss (schedule.html mobile).** `submitLog` (`Schedule.jsx:335-346`) rebuilds the session's `blocks` array from scratch and mints a fresh `uid()`. `log_result` upserts on `(athlete_id, session_id)`, so an athlete who logged block A earlier (from results.html or the desktop pane) and later logs block B on their phone **overwrites block A with an empty default entry**. The desktop path (`submitDeskReg:365-378`) already merges correctly — mobile never got the same treatment.
- 🔴 **Desktop WOD selection is keyboard-unreachable on both pages.** The only selector is a click-only `<div>` (`Results.jsx:397`, `Leaderboard.jsx:262`) with no `role`/`tabIndex`/`onKeyDown`. Since nothing renders until a WOD is picked, a keyboard user sees a permanently empty page.

## Lane + approval gate
**Lane A (gallery-first)** — both pages exist, so no static mockup (WORKFLOW "Design work"). Build the real components, render every state in `gallery.html` across **4 themes × 2 widths**, screenshot into the Design System, and **stop for approval before continuing into the page rewrites**. Do not self-certify.

## 1. Component extraction (#17 — feeds the gallery)

### `src/public/shared/RankList.jsx` + `RankList.module.css` — the headline extraction
Three hand-rolled ranking lists exist today, and they disagree:

| Copy | Location | Diverges by |
|---|---|---|
| Leaderboard rows | `Leaderboard.jsx:302-325` | podium bg + scale badge |
| Results mobile flyout | `Results.jsx:252-283`, rendered `:316-322` | own sort comparator; **no** scale filter, **no** self-highlight |
| Results desktop pane | `Results.jsx:234-250`, rendered `:532-567` | own sort comparator; has both |

Collapse to one component taking the superset: `entries`, `blType`, `scaleFilter`, `highlightAthleteId`, `podium`. Internally it must call canonical `rankResults`/`perfStr` (`lib/wod.js`) — that alone deletes 2 duplicate comparators and 5 near-copies of the perf-string formatter in Results (`:210-211, 274, 294-295, 548, 727-729`, each with slightly different DNF/separator handling).

**TV's podium rows stay out of it** — same recorded reasoning as `ExerciseList` vs Schedule: TV's wall-display CSS diverges enough that unifying markup means a new CSS variant for no visible change.

### Other extractions
- Split `src/public/results/` the way #50 split `schedule/`: `SessionCard.jsx`, `LogForm.jsx`, `LoggedResult.jsx`, `KpiGrid.jsx` (`Results.jsx` is 787 lines with subcomponents inlined at `:621-786`).
- **Results adopts the shared `Header.jsx`** — it hand-rolls `<div className={styles.hdr}>` (`:350-353`) while Leaderboard already uses the shared one. This is what gives the page its `<header>` + `<h1>` for free.
- Gallery entries: `RankList` (empty / 1 / 3 / podium+rest / many / long-name overflow / scale-filtered / self-highlighted / `For Time` vs `AMRAP` blType / DNF) and the extracted results cards (0 results / has results / you-logged / you-not-logged).

**Not extracted here:** the shared `ConfirmReview` component — **#54 (C0)** owns it. Do not mint a fourth copy of the confirm block.

## 2. Design refinement

**a. Auto-select (the headline UX fix — both pages).**
- **leaderboard.html:** `selWod` initialises to `wodList[0]`. `buildWodList` (`:59-80`) is already newest-first and already drops WODs with zero results, so `[0]` *is* "latest WOD with results". A `?wod=` deep-link still wins. Delete the `"← Selecione um WOD para ver o ranking."` empty state (`:329`) — the `←` points at a pane that is `display:none` on mobile anyway.
- **results.html desktop:** select today's WOD if today is in the visible week, else the most recent past day's WOD in that week, else the first. Re-run when `weekOffset` changes or the current selection isn't in the visible week. Also make the `?session=` deep-link set `selWod` — today it only sets mobile `expanded` (`:79-89`), so a desktop deep-link lands on two empty panes.
- **results.html mobile:** auto-expand the same session's card. Unlike leaderboard, do **not** require the WOD to have results — results.html is where you go to *log*, so landing on an empty-but-loggable WOD is correct.

**b. Collapsed-card info density (results mobile).** `SessionCard`'s header (`:657-662`) shows a dot, the session name, and a chevron — nothing else. Add result count, leader preview (name + perf), and the athlete's own status ("Você: 11:22" vs "Registrar"). The SugarWOD-whiteboard pattern the benchmark called out.

**c. Re-log — one policy, three call sites (decision 2).**
- **results.html:** `LoggedResult` gains an "Editar" affordance → reopens `LogForm` prefilled → existing confirm step → merge. The submit path already merges correctly (`:197-203`); only the presentational gate at `:695-696` / `:474` / `:508` blocks it.
- **schedule.html mobile:** fix `submitLog` to prefill `logBlocks` from the athlete's existing result (on athlete change — the athlete `<select>` lives *inside* the sheet, so open-time prefill isn't enough) and reuse `existing?.id` + `existing.energyLevel`, merging blocks. I.e. make it behave like `submitDeskReg`.
- Confirm against `0003_anon_write_rpcs.sql` that `log_result`'s `ON CONFLICT … DO UPDATE` set excludes `coach_note`/`flag_for_review` (it does — coach data survives an athlete re-log; verify live anyway).

This is the session's one deliberate edit outside its own two pages. Justified: the program assigns the re-log *policy decision* to B2, and a policy is only settled once both entry points obey it.

**d. Leaderboard de-cyan (decision 1).** Delete `buildLbc` (`:16-40`) and the `document.documentElement.style.setProperty('--accent', …)` side-effect (`:96-113`) — that one line is why even themed elements on this page render cyan. Render from tokens. Then remove the now-lying editor: the `lbSettingsOpen` panel, its 20 `useState`s, `saveLBC`, and the `eagles_lb_colors_v1` localStorage key in `Resultados.jsx:707-738`, plus the `lbColors` legs of config import/export (`:808`, `:837`).

Leave the `lb_colors` blob table and its `App.jsx` sync plumbing (`:128-132`, `:173`) **alone** — it just carries dead data now. Churning the sync layer inside a design session isn't worth it; see the new Icebox row (fold into #43).

**e. Podium tokens (decision 3).** Add `--podium-1/2/3` to all four `html.theme-*` blocks in `themes.css`. Row backgrounds use `color-mix(in srgb, var(--podium-1) 6%, transparent)` rather than three more `-bg` tokens — 3 new tokens, not 6.

**f. Scale colors → canonical data colors.** `SCALE_COL` (`Results.jsx:10`) and `Athletes.jsx:13` assign **different colors to the same scale** (Inter is teal-ish on one, gold on the other), and Results has *three* different fallback greys (`:273` `#666`, `:547` `#666`, `:726` `#888`). `RankList` needs one truth. Move `SCALE_COL` + a single fallback into `lib/wod.js` next to `blkColor`, and classify scale colors as **data colors — exempt from tokenization**, matching the block-family precedent in CLAUDE.md. Results + Leaderboard import it; `Athletes.jsx` aligns in #52 (B3), which owns that file.

## 3. Fold-ins (this session's files)

**results.html** — `Results.jsx` (787 lines), `Results.module.css` (277)
- **hex:** 6 literals, all in JSX (`SCALE_COL` + 3 fallback greys) → canonical per 2f. `Results.module.css:67` `rgba(74,200,192,.5)` is `--teal` in decimal → token.
- **radius:** 1 rounded-rect (`.resRpeBtn` 4px, `:210`) → square. Delete the no-op `border-radius:0` on `.resScaleBtn` (`:213`). Keep the 3 `50%` dots.
- **a11y:** 7 click-only divs → `role`/`tabIndex`/`onKeyDown` (`:315`, `:325`, `:329` overlays; `:397` calCard; `:431`, `:434` athRows; `:658` resCardHdr). 3 icon-only buttons → `aria-label`, reusing Schedule's pt-BR strings ("Semana anterior" / "Próxima semana" / "Fechar"). `<main>` + `<h1>` arrive with the `Header.jsx` adoption. The file currently has **zero** `role`/`tabIndex`/`onKeyDown`/`aria-*` attributes.
- **dead CSS:** `.weekGrid { repeat(7,1fr) }` (`:161`) and the `@media(min-width:901px)` rule (`:167`) are unreachable — `.mobileView` is `display:none` above 768px. Delete.
- **dup utils:** `CAL_DAYS` (`:13`) is byte-identical to `DAY_PT_TITLE` (`lib/week.js`). `wodBlocks` (`:22`) → `isWodBlock` (behavior *change*: label-only WOD blocks become visible, matching Schedule/TV — that's a fix; verify live). `sessName` (`:28-32`) abbreviates day names while `SessionCard` (`:649-653`) spells them out — pick one. `calcKPIs`/`calcExtKpis` (`:133-175`) are ~90% identical → one function with a variant arg.

**leaderboard.html** — `Leaderboard.jsx` (340 lines), `Leaderboard.module.css`
- **hex:** 17 + several `rgba()` → **0**, all via 2d/2e/2f. (The CSS module is already 100% tokens; every literal is in the JSX.)
- **radius:** already clean — 2 declarations, both `50%`. Nothing to square.
- **a11y:** `wodCard` (`:262-274`) → `role="button"`/`tabIndex`/`aria-pressed`/`onKeyDown` (copy `Schedule.jsx:452`). `‹`/`›` week buttons (`:255`, `:257`) → `aria-label`. Add `<main>` + `<h1>` (`Header` already supplies `<header>`; the page has **no heading tag at all** today). Add `aria-live="polite"` to the ranking list + loading/empty/error regions — no realtime here, but the list swaps silently on every scale-filter click.
- **#18 desktop scroll:** the page scrolls as a whole, so the left WOD list scrolls away with the ranking. Make `.wodCol`/`.rankCol` scroll in their own panes (copy `Results.module.css:78, 103, 115, 148`).
- **dup utils:** `weekBounds` (`:42-51`) → `getWeek` (both Sunday-start — preserve that). Deep-link week math (`:145-150`) → `dateToWeekOffset`. `fetchState` (`:82-94`) is a near-verbatim clone of `Athletes.jsx:20-34` including an identical 11-field snake→camel `results_v2` mapper → extract `mapResultRow` into `lib/blobTables.js`, both import it. `SCALE_RANK`/`SCALE_NAMES` min-scale derivation (`:12-13`, `:176-181`) is a third copy (also `Athletes.jsx`, `Resultados.jsx`) → `lib/wod.js`.

**Fonts:** neither page uses weight 500 or 800 (only 700/900), so `src/fonts.js` stays untouched (program rule 4 not triggered).

## Out of scope
- Shared `ConfirmReview` component → **#54 (C0)**.
- TV's ranking rows → stay separate (wall-display CSS divergence, recorded decision).
- Dropping the `lb_colors` table + `App.jsx` sync plumbing → new Icebox row, folds into #43.
- `Athletes.jsx` adopting the canonical `SCALE_COL` → **#52 (B3)**.

## Acceptance
- **Gallery states built + screenshotted across 4 themes × 2 widths, handed back for approval, before the page rewrites proceed.**
- Zero hardcoded hex in Results + Leaderboard files (minus the documented data-color exemption: `SCALE_COL`, block families); zero rounded-rects.
- Neither page renders a "pick something first" empty state when it has data to show.
- Every interactive element on both pages reachable and operable via Tab/Enter/Space — specifically the desktop WOD selectors, unreachable today.
- One re-log semantic across results.html + schedule.html (both widths): prefill → confirm → merge, existing row id preserved, `coach_note`/`flag_for_review` untouched.
- Renders correctly at 1280×800 + 390×844 under **all 4 themes**.

## Files
**Public pages:** `src/public/results/Results.jsx` + `.module.css` (+ new `SessionCard.jsx`, `LogForm.jsx`, `LoggedResult.jsx`, `KpiGrid.jsx`), `src/public/leaderboard/Leaderboard.jsx` + `.module.css`
**Shared/new:** `src/public/shared/RankList.jsx` + `.module.css`, `src/public/lib/wod.js` (`SCALE_COL`, scale-derivation), `src/public/lib/blobTables.js` (`mapResultRow`)
**Cross-page (policy):** `src/public/schedule/Schedule.jsx` (`doOpenLog`/`submitLog` merge fix)
**SPA:** `src/components/tabs/Resultados.jsx` (remove the `lb_colors` picker + config legs)
**Tokens:** `themes.css` (3 podium tokens × 4 themes)
**Gallery:** `src/public/gallery/Gallery.jsx`
**Docs:** `BACKLOG.md`, this plan, CLAUDE.md (scale colors as an exempt data-color family)

## Verification
Local stack (`supabase start` → `npm run dev:public`), Playwright, **4 themes × 2 widths**, 0 console errors.
1. **Auto-select:** cold-load both pages → a WOD is selected and rendered, no empty panes. Desktop deep-link `results.html?session=<id>` → lands on that session's WOD.
2. **Re-log:** self-log on results.html → confirm the new `results_v2` row. **Edit that same result** → row **id unchanged**, `blocks` merged, and a pre-seeded `coach_note`/`flag_for_review` fixture on that row **preserved**.
3. **The regression this session fixes:** schedule.html **mobile** — log block A, then separately log block B in the same session → **block A's result must survive** (today it is silently wiped; capture before/after).
4. **Keyboard:** Tab to a desktop WOD card on each page, activate with Enter and Space, confirm the panes render.
5. **De-cyan:** grep both pages for hex → 0; confirm the leaderboard follows the theme switcher under all 4 themes (it cannot today — `--accent` is force-overridden).
6. Revert every test row; confirm the DB is clean.
7. `npm test` (108 green) + `npm run build:all`; confirm the gallery still emits no chunk.
8. `/code-review` (M item).

Model: Opus · Size: M→L (the extraction + the cross-page policy fix grew it past the original M estimate)
