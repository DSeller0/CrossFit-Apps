# Cone — Backlog Board

Process: see [WORKFLOW.md](./WORKFLOW.md). Row format: `#Priority Title · size · model · context`.
Status columns: **Icebox → Ready → In Progress → Done**. Only items with a `plans/NN-*.md` are Ready.

---

## 🟢 Ready (planned — pick from the top)

- **#2 Quadro ao Vivo — desktop refinement + design pass** · M · Sonnet · kill empty side margins, fill width, no-scroll @1080p, CSS-vars/inline-style cleanup — [plans/02-tv-desktop-refinement.md](./plans/02-tv-desktop-refinement.md)
- **#3 timer.html — desktop running layout** · M · Sonnet · sidebar offset + `vh`-scaled ring on running/paused screens — [plans/03-timer-desktop-running.md](./plans/03-timer-desktop-running.md)

## 🔵 In Progress

_(none)_

## 🧊 Icebox (captured + prioritized — no plan yet)

- **#4 Mobile front-end update** · L · Opus · plan-mode pass over every public page @390px; each page updated or explicitly deferred
- **#5 Goals for WOD-type blocks** · M · Sonnet · builder sets a goal/target on WOD blocks; shown wherever WODs render (schedule card slot reserved in #1, TV)
- **#6 Reposition Sets/Reps inputs in builder** · S · Sonnet · in Criador, Sets+Reps inputs precede the exercise-name text field; pairs with #1's "Sets × Reps name" render
- **#7 TV slide — 10s countdown pill** · S · Sonnet · when `cap − elapsed ≤ 10s`, show a counting-down pill on the TV timer slide; not during AMRAP
- **#8 tv.html outbound links — hide nav** · S · Sonnet · pages opened via QR/link from tv.html (e.g. `?from=tv`) hide the nav component; other entry points unaffected
- **#9 Cone SPA UI/UX standardization** · L · Opus · define a shared card/button/input/spacing standard, then audit every builder tab against it (planning session first)
- **#10 Public pages — fixed-height layout** · M · Sonnet · desktop ≥768px: no page-level scrollbar; all scroll isolated inside panes
- **#11 Body metrics persistence** · M · Sonnet · `body_metrics` Supabase table; me.html UI exists but save is a no-op
- **#12 Result splits** · S · Sonnet · `splits: number[]` on result blocks; timer captures them but doesn't pass to submission
- **#13 Leaderboard all-time PRs** · M · Sonnet · best performance per movement across all sessions
- **#14 Performance** · M · Sonnet · lazy-load jspdf/html2canvas, startup fetch consolidation, self-host fonts
- **#15 Testing** · M · Sonnet · Vitest units: push() patch behavior, advanceAll() rotation, fmtIntensity() all modes
- **#16 ExerciseList shared component** · M · Sonnet · consolidate the 3 exercise render paths (TV BlockCard, TV TimerSlide, Schedule.jsx) into one component; no behavior change
- **#17 Vercel migration** · L · Sonnet · fixes chunk-hash 404 + kills deploy whitelist + preview deploys; cost = base-path rework (`/CrossFit-Apps/cone/`) + porting the dual-build `cp` assembly
- **#18 Per-athlete RLS / access** · L · Opus · `me.html?id=<athleteId>`, `isPublic` on result rows, QR codes in Atletas tab
- **#19 Email-gated athlete access** · L · Opus · Supabase OTP + email allowlist; depends on #18

## ✅ Done (recent)

**#1 Schedule block-card redesign** · 65/35 two-column WOD cards, notes→top, Sets×Reps, RM calc below pill, icon-only mobile actions · timer.html config header + BlockTypePicker · me.html desktop layout · TvController hook refactor (5 hooks, 472 lines) · Benchmark block type in Criador · SPA desktop sidebar nav · desktop overhaul (Index/Leaderboard/Results) · theme system · Quadro ao Vivo rotation system

---

### Decisions recorded
- **Estações — KEEP.** Reviewed removal blast radius (dedicated render branch, CSS, TV paths, existing saved `type:'Estações'` data); not worth removing.
- **Estações** is woven through Criador, `Schedule.jsx` (`stations` loop, `restBetweenCycles`, `stationsCapMins()`), CSS `.detailStation*`, and likely TV — leave intact.
