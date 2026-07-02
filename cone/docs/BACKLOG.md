# Cone — Backlog Board

Process: see [WORKFLOW.md](./WORKFLOW.md). Row format: `#Priority Title · size · model · context`.
Status columns: **Icebox → Ready → In Progress → Done**. Only items with a `plans/NN-*.md` are Ready.
Review findings feeding this board: [reviews/2026-07-02.md](./reviews/2026-07-02.md).

---

## 🟢 Ready (planned — pick from the top)

- **#3 timer.html — desktop running layout** · M · Sonnet · sidebar offset + `vh`-scaled ring on running/paused screens — [plans/03-timer-desktop-running.md](./plans/03-timer-desktop-running.md)
- **#4 Dev environment — local Supabase (Docker)** · L · Sonnet · Supabase CLI stack, env-var clients, schema as migrations, seed script; unblocks the RLS probes — [plans/04-dev-environment.md](./plans/04-dev-environment.md)

## 🔵 In Progress

- **#2 Quadro ao Vivo — desktop refinement + design pass** · implementation complete, pending user click-through — coach-side TvController is behind real Supabase OTP auth with no dev bypass, so the merged-roster/register-edit-guest flow couldn't be automated-tested this session (public tv.html side was: theme-init + real-data render confirmed via headless screenshot, no console errors). User to manually verify the roster flow, then move to Done.

## 🧊 Icebox (captured + prioritized — no plan yet)

- **#7 class_executions anon-write review** · S · Sonnet · public check-in UPDATEs `class_executions` (Schedule.jsx:701,705) — undocumented write surface; verify RLS scope on dev env (needs #4), then document the rule
- **#9 Tap-flash fix (rest of FOUC audit done)** · S · Sonnet · round counter flashes blue on tap; theme-init verified on all pages except tv.html (→ #2)
- **#10 Goals for WOD-type blocks** · M · Sonnet · builder sets a goal/target on WOD blocks; shown wherever WODs render (schedule card slot reserved, TV)
- **#11 Reposition Sets/Reps inputs in builder** · S · Sonnet · in Criador, Sets+Reps inputs precede the exercise-name text field
- **#12 TV slide — 10s countdown pill** · S · Sonnet · when `cap − elapsed ≤ 10s`, show a counting-down pill on the TV timer slide; not during AMRAP
- **#13 tv.html outbound links — hide nav** · S · Sonnet · pages opened via QR/link from tv.html (e.g. `?from=tv`) hide the nav component
- **#14 Accessibility pass** · M · Sonnet · ~32 icon-only buttons need aria-label; add aria-live to timer/leaderboard; `<main>` landmarks; document contrast roles (`--muted` 4.0:1 fails body text)
- **#15 Design-token sweep** · M · Sonnet · 93 hardcoded hex in src/public (Leaderboard `#00b8d4`→`--teal` worst); refine border-radius rule (circles exempt?) then sweep 103 violations; fix font-weights 500/800 (used but not loaded); decide `--font-mono`
- **#16 Util/formatter consolidation** · M · Sonnet · storage.js dual `toISO`/`todayISO`/`uid`; `fmtSecs` ×5, `toSecs` ×2 (NaN guard), `fmtDate` ×5, `DAY_PT`/`MON_PT` ×6 → canonical homes in lib; unify `useIsMobile` (2 divergent inline copies); rename duplicate `BlockTypePicker`
- **#17 ExerciseList adoption** · S · Sonnet · TV already uses shared ExerciseList; adopt in Schedule.jsx rows + reconcile Publicador's exLine; first fold Publicador's diverged fmtIntensity (cardio branch) into wod.js
- **#18 Public pages — fixed-height layout** · M · Sonnet · desktop ≥768px: no page-level scrollbar; all scroll isolated inside panes
- **#19 Body metrics persistence** · M · Sonnet · `body_metrics` Supabase table; me.html UI exists but save is a no-op
- **#20 Result splits** · S · Sonnet · `splits: number[]` on result blocks; timer captures them but doesn't pass to submission
- **#21 Leaderboard all-time PRs** · M · Sonnet · best performance per movement across all sessions
- **#22 Startup fetch consolidation** · S · Sonnet · count/merge per-page Supabase fetches on load (rest of old perf item: html2canvas already lazy, fonts moot, jsPDF → #8)
- **#23 Testing** · M · Sonnet · Vitest units: push() patch behavior, advanceAll() rotation, fmtIntensity() all modes (pairs with #5)
- **#24 Prettier + format gate** · S · Sonnet · add Prettier config + check script; wire into #5's CI gate
- **#25 Publicador decomposition (2197 lines)** · M · Sonnet · split along seams: export views / mobile export views / agenda+events / shell
- **#26 Criador decomposition (1952 lines)** · M · Sonnet · split along seams: block model+summaries / field editors / block+station editors / container
- **#27 UX walk + mobile pass** · L · Opus · interactive session: every page @1280px+@390px, 3 journeys (coach publish, athlete log, TV cycle); each page updated or explicitly deferred
- **#28 Cone SPA UI/UX standardization** · L · Opus · shared card/button/input/spacing standard, then audit every builder tab (planning session first; builds on #25/#26)
- **#29 Vercel migration** · L · Sonnet · fixes chunk-hash 404 + preview deploys; cost = base-path rework + porting dual-build assembly; natural moment to consolidate root-level loose files (themes.css, cone-client.js, config.json)
- **#30 Per-athlete RLS / access** · L · Opus · `me.html?id=<athleteId>`, `isPublic` on result rows, QR codes in Atletas tab
- **#31 Email-gated athlete access** · L · Opus · Supabase OTP + email allowlist; depends on #30
- **#32 Fix pre-existing lint debt, then enable lint CI gate** · M · Sonnet · `npm run lint` currently fails with 155 problems across 26 files: ~87 mechanical (44 no-unused-vars, 30 no-empty, 10 no-useless-escape, 3 no-useless-assignment) + ~87 real react-hooks correctness findings (22 set-state-in-effect, 21 exhaustive-deps, 18 refs, 14 immutability, 8 purity, 4 static-components) from the upgraded `eslint-plugin-react-hooks` v7 ruleset; deploy.yml's CI gate (#5) only runs `npm test` for now — add `npm run lint` once this is clean
- **#33 Turma default-name auto-fill** · S · Sonnet · `classLabel` in `useClassTracking.js:6` defaults to plain `'Turma'`; round current clock to nearest full hour and default to `Turma_HH:MM` (e.g. 10:05 → `Turma_10:00`)

## ✅ Done (recent)

**2026-07-02 — Quick-wins batch (#5, #6, #8)** · CI gate: `npm test` now runs before build in deploy.yml (lint deferred — see #32, pre-existing 155 problems) · Benchmark-bug fix: Index/Me/Results/Athletes/Leaderboard.jsx no longer hand-roll local WOD-type lists that omitted `Benchmark` (and in some cases `WOD`/`Estações`) — all now import canonical `WOD_TYPES` from `lib/wod.js` · Publicador.jsx PDF export: dropped CDN `<script>` loading of jsPDF/jspdf-autotable/qrcodejs, now dynamic-imports the npm packages (`jspdf-autotable` v5's `autoTable(doc, opts)` call form; `qrcode` npm package's `toDataURL()` replaces the old DOM-canvas qrcodejs hack) — build confirms separate lazy chunks; runtime PDF export not yet click-verified (blocked on no browser-automation tool + real Supabase OTP login, no dev-env yet — user to verify manually)

**2026-07-02 — Review process + first full review** · /app-review skill (9 dimensions) · WORKFLOW v2 (review cadence, Claude Design mockup flow, skills in ritual, docs-are-Done) · Cone Design System project seeded on claude.ai/design (5 cards from `cone/design/`) · first review report (reviews/2026-07-02.md) · dev-env architecture planned (#4) · CLAUDE.md drift fixed (tv_state `timer_block_id`, lib paths, whitelist location)

**#1 Schedule block-card redesign** · 65/35 two-column WOD cards, notes→top, Sets×Reps, RM calc below pill, icon-only mobile actions · timer.html config header + BlockTypePicker · me.html desktop layout · TvController hook refactor (5 hooks, 472 lines) · Benchmark block type in Criador · SPA desktop sidebar nav · desktop overhaul (Index/Leaderboard/Results) · theme system · Quadro ao Vivo rotation system

---

### Decisions recorded
- **Estações — KEEP.** Reviewed removal blast radius (dedicated render branch, CSS, TV paths, existing saved `type:'Estações'` data); not worth removing.
- **Estações** is woven through Criador, `Schedule.jsx` (`stations` loop, `restBetweenCycles`, `stationsCapMins()`), CSS `.detailStation*`, and likely TV — leave intact.
- **2026-07-02** — review numbering: rows renumbered #5–#31 after inserting #4 (dev env) and merging review findings; old #5 (mobile pass) merged into #27 (UX walk).
