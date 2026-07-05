# App review — 2026-07-05 (fourth pass)

Method: `/app-review` (all 9 dimensions; see [WORKFLOW.md](../WORKFLOW.md) "Review cadence"). Trigger: **Ready column emptied** after `#16` shipped. Mechanical sweeps (dims 2/3/4/7) by parallel Explore agents; **dimension 1 (UX walk) actually driven this time** — both the local Supabase stack (Docker, up 10h) and a Playwright browser tool were available in this session, neither of which any of the prior three passes had (each deferred dim 1, 3× consecutive as of the last pass). Security/performance/testing/docs (5/6/8/9) by hand. **No code changed** — findings triaged into [BACKLOG.md](../BACKLOG.md) (rows referenced as #N); one pure-docs fix applied inline to `CLAUDE.md`. Legend: 🔴 high · 🟡 medium · ⚪ low · ✅ verified/resolved.

This is the **fourth** pass today/this week ([first](./2026-07-02.md) 07-02, [second](./2026-07-04-full-pass.md) 07-04, [third](./2026-07-05-full-pass.md) 07-05 earlier). The third pass's own process note flagged that back-to-back full passes for one small shipped chain are wasteful — but this pass's dim 1 (finally driven, first time ever with real browser automation + a live local stack) surfaced a real, live, previously-invisible bug and dim 3/7's agents surfaced two duplication families and a systemic a11y gap that pure "did anything regress" greps had been under-reporting. So the full-pass cadence paid for itself this time; the lesson from 07-05's third pass (prefer targeted passes for small chains) still holds for *mechanical* dimensions, just not for the never-yet-driven dim 1.

## 1 · Product / UX walk — driven for the first time
Walked the full athlete-facing journey (index → schedule → timer → results self-log → me profile → leaderboard → athletes lookup → tv) at 1280×800, plus a mobile pass (390×844) on schedule.html, plus a real OTP-authenticated coach-SPA walk (Criador → Atletas → Resultados → Quadro ao Vivo), confirming `#16`'s changes render correctly live end-to-end with zero console errors anywhere (only a cosmetic `favicon.ico` 404, not worth tracking) and zero regressions from the consolidation:
- ✅ `fmtDate`/`DAY_PT_TITLE`/`MONTH_PT_SHORT` render correctly: "Sáb 27 Jun" (Atletas detail sessions), "SÁB, 11 JUL" (TV comma variant), "SÁB 11" (TvController date-picker) — all three surviving-variant formats confirmed live.
- ✅ `fmtSecs`/`toSecs` render correctly: timer.html ring shows "00:08" elapsed; TV's `timer_paused_elapsed` accumulator renders via the new `fmtSecs()` call.
- ✅ `CriadorTypePicker` rename: block-type modal renders all 12 types, correctly color-coded by family.
- ✅ `useIsMobile(800)` explicit-breakpoint calls: Resultados/Publicador mobile layouts unaffected.
- ✅ Coach login as a **non-allowlisted** test account (`is_allowed_user()` gate) renders the full SPA read-side with no errors — matches documented behavior (signup open to any email, writes gated separately); anon POST attempts pre-login correctly 401 (RLS working as designed, not a bug).
- 🟡 **NEW: `toTitleCase()` in `Schedule.jsx` (:61-62, called at :371,378,415,449,991) is a live, visible bug**, not caused by `#16`. It does `name.toLowerCase().replace(/\b\w/g, c=>c.toUpperCase())`, which (a) mangles apostrophes — confirmed live, both desktop and mobile: **"Farmer's Carry" renders as "Farmer'S Carry"** (`\b\w` treats the letter right after `'` as a new word-boundary start); (b) destroys coach-entered acronyms by lowercasing first — confirmed live: **"15 GHD · 6 Strict T2B · 20m Dual KB OH Walking…" renders as "15 Ghd · 6 Strict T2b · 20m Dual Kb Oh Walking…"**. Scope confirmed narrow: only `Schedule.jsx` re-cases names (5 call sites); TV/Timer/Results/Publicador all display `ex.name` verbatim and render correctly. → **#46**.
- The leaderboard's "no WOD this week" empty state when a WOD IS scheduled but has 0 logged results appears to be by design (leaderboards for zero-result WODs are pointless to show) — not filed, but flag if it turns out to be a filter bug on a future pass with real result data to test against.

## 2 · Design consistency
- ✅ Essentially **flat vs the 07-05 baseline**: hex 91 vs 93 (noise), border-radius 92 vs 92 (exact match, same TV.module.css stragglers). No regression from `#16` (pure JS, touched zero CSS).
- ⚪ **NEW:** `Me.jsx:710` — "Scale" column header in English; `Results.jsx:301,339` uses "Escala" for the same concept. → fold into **#15**.
- Existing #15/#28 design-token debt unchanged, still valid as filed.

## 3 · Code quality
- ✅ `#16`'s consolidation confirmed clean: zero stragglers for `toSecs`/`fmtSecs`/`DAY_PT`/`MON_PT`/`rankResults`/`useIsMobile`. File sizes flat-to-shrinking (Publicador 2152→2144, Resultados 980→962, Me 936→931, Atletas 829→821) — consolidation reduced code, no bloat.
- 🟡 **NEW: 3 more `toISO`-equivalent stragglers**, missed by `#16`'s name-based search since they use different names for the same "YYYY-MM-DD from a Date" logic: `Resultados.jsx:22` (`dateToDK`), `Leaderboard.jsx:52-54` (`toDateKey`), `Index.jsx:27-30` (`dateKey`). → **#47**.
- 🟡 **NEW: `prBest()`/`prPct()` PR-progress-helper triplication** — identical bodies in `Atletas.jsx:24-51`, `Athletes.jsx:109,118-122`, `Me.jsx:27,34-41` (compute an athlete's best PR result + % progress toward a goal). Same shape as the family `#16` just finished consolidating, not yet tracked. → **#48**.
- ⚪ Confirmed still-open, unchanged: `Publicador.jsx`'s `buildProgressionLines()` (now **#45**, corrected from a stale "#16" self-reference in CLAUDE.md — fixed inline this session). `Timer.jsx:6` unused `BENCHMARK_GIRLS`/`BENCHMARK_HEROES` import, `Atletas.jsx:432`/`Publicador.jsx:1496` unused destructured props — both pre-existing, both already covered by **#32**'s lint-debt census.

## 4 · Architecture & contracts
**All 5 documented invariants re-verified, all PASS, zero drift:**
- ✅ Dual-client boundary intact — every `src/components/**` import chain into `src/public/**` traced; `supabaseClient.js` reachable only from `src/public/**`, never from SPA code (the #41-class bug has not recurred).
- ✅ `push()`/`tv_state` patch discipline intact — every call site across `useTimer`/`useTvSync`/`useGroupRotation`/`useClassTracking`/`TvController` spreads only real `tv_state` columns.
- ✅ Three render paths (TV `BlockCard`/`TimerSlide`, `Schedule.jsx` `ExRow`) all still converge on canonical `wod.js` helpers.
- ✅ `session.public !== false` visibility filter confirmed present on all 6 public pages (TV's documented exception confirmed intentional, no `session.public` filter there).
- ✅ `#16`'s `storage.js → wod.js/week.js` re-export chain confirmed pure (zero imports in either target file) — no dual-client violation introduced.

## 5 · Security
- ✅ No new migrations since `#34` (2026-07-03) — RLS surface unchanged, last live probe ([2026-07-03-rls-probe.md](./2026-07-03-rls-probe.md)) still current.
- ✅ Zero `dangerouslySetInnerHTML`/`innerHTML=`/`eval(`/`service_role`/`SERVICE_ROLE` anywhere in `src/`.
- ✅ `.env.development`/`.env.production` committed by design (documented in CLAUDE.md — local stack has no real secret boundary; prod anon key is public by design). No new secret exposure.
- `#16` touched zero RLS/auth/DOM-sink surface (pure JS formatter refactor) — no `/security-review` needed for it specifically, consistent with its own plan's call.

## 6 · Performance
- ✅ **Flat.** SPA main chunk 423.58 kB (baseline 420.91 kB, +0.6% noise from the two new `week.js` arrays). Public `schedule` chunk 57.91 kB (baseline 58.41 kB, slightly smaller). No regression.
- Startup-fetch consolidation remains **#22** (untouched).

## 7 · Accessibility
- ✅ Confirmed **zero regression** from `#16` — `git diff` shows it touched zero `aria-`/`role=`/`tabIndex` lines (pure formatter refactor).
- Confirmed still-open at unchanged line numbers: `ClassPanel.jsx:62` bare `ti-trash` button, `:115` clickable accordion div, `:131` roster list (no `aria-live`/`role="status"`), countdown-pill gap (zero `aria-live`/`role="timer"` anywhere in `src/`), `IntensityInput.jsx:56-59`/`:102` mouse-only controls, unnamed unit `<select>`s, `--muted` contrast failure (~3.6-3.75:1 vs required 4.5:1 for body text, all 3 themes affected).
- 🟡 **NEW, systemic — the tracked gap is much narrower than reality:** only **3** `role=`/`tabIndex` attributes and only **2** `aria-label` attributes exist in the **entire** `src/` tree; **zero** `<main>` landmarks anywhere; only **1** heading tag in the whole app (`LoginScreen.jsx`'s `<h1>Cone</h1>` — the only heading a screen reader user would ever encounter on this site). **60** click-only `<div>`/`<span onClick>` elements across 13 files, vs. the 2 instances `#14` currently tracks — concrete new ones: `Schedule.jsx:366,410,444` (exercise-done checkboxes), `:995` (accordion header), `:1231` (check-in row), `Atletas.jsx:351,572,754`. → fold into **#14**, which materially undersizes this gap.

## 8 · Testing & gates
- ✅ CI gate active (`npm test` before `build:all` in `deploy.yml`); **92 tests / 5 files**, all green (up from 83 at the 07-05 baseline — some from the interim `#17`-partial chain, +4 from `#16`'s own `toSecs`-malformed-input and `fmtDate` regression coverage).
- Untested-pure-function gap (**#23**) unchanged; **#48**'s new `prBest`/`prPct` extraction (if picked up) should land tests alongside, per the same pattern `#16` used.
- Lint gate **#32** (155 pre-existing, unchanged) and Prettier **#24** still deferred.

## 9 · Docs & process hygiene (fixed inline this session)
- **CLAUDE.md** "Shared utilities" section (`:101-104`) was **stale** post-`#16`: `week.js`'s export list was missing `MONTH_PT_SHORT`/`DAY_PT_TITLE`/`fmtDate` (added today), and the `storage.js` dual-canonical note still described the *pre-#16* state (now corrected to describe the re-export relationship). Also fixed a stale self-reference in the "Shared rendering" note (`:95`) that still pointed `buildProgressionLines()`'s follow-up at "#16" — now correctly points at **#45** (the item that superseded it once #16 shipped without folding that piece in).
- **BACKLOG**: this report linked into the header; **#16** already Done from this morning's session; new items **#45** (carried from #16, already filed), **#46** (toTitleCase bug), **#47** (toISO stragglers), **#48** (prBest/prPct triplication) added to Icebox; corrections folded into #14 (a11y gap much wider than tracked), #15 (Me.jsx "Scale" pt-BR miss).

## Process notes for next review
- Dimension 1 finally driven end-to-end (first time this project has had both a running local stack and a browser-automation tool in the same session) — it paid for itself immediately (found **#46** live, something no amount of source-reading would have caught without also tracing the regex by hand). Recommend: whenever both preconditions hold again, always drive dim 1 rather than deferring it, even on an otherwise-targeted pass.
- The mechanical-sweep agents (dims 2/3/4/7) earned their keep this time specifically because they were told to hunt for *misses* in `#16`'s own stated scope (same-family stragglers under different names, e.g. `dateToDK`), not just "did anything visibly break" — that framing is what surfaced **#47** and **#48**. Worth keeping as standard framing after any consolidation-style item, not just this one.
- Today's earlier `/code-review` on `#16` (8 parallel finder + verify agents) hit a session API rate limit mid-run and failed entirely; this review's own dim 2/3/4/7 agents ran fine later in the same session — the limit appears to reset/replenish over the session rather than being a hard per-session cap. Worth knowing if it recurs: retry after a pause rather than assuming agent-based review is unavailable for the rest of the session.
