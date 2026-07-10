# Design benchmark pass — 2026-07-09

Session A of the unified design-pass program (see `plans/16-design-pass-program.md`). **Read-only analysis** — no product code changed. Every surface (9 public pages + 9 SPA tabs) driven live against the local stack (Playwright, 1280×800 + 390×844), assessed for design/UX direction, compared against market equivalents, and inventoried for the per-page fold-ins (#15 tokens · #14 mechanical a11y · #18 fixed-height). Output feeds: per-surface backlog rows, `FEATURES.md`, and the first per-page plans.

Legend: 🔴 must-fix in the page session · 🟡 should-fix · ⚪ nice-to-have · ✦ market-informed direction idea.

## Market reference points (research 2026-07-09)

Compared against SugarWOD / Wodify / BTWB / PushPress (precedent: `2026-07-04-feature-ideas.md`). Scoped to interaction patterns and information hierarchy — Cone's visual identity is deliberately its own.

- **SugarWOD** (community standard, 5k+ boxes): mobile UX is *today's-WOD-first* — open the app, the workout is the first thing you see, logging is ≤2 taps away. Live TV whiteboard/leaderboard during class. Social loop: fist-bumps + comments on results; PRs auto-detected and celebrated at log time. Personal logbook for off-box workouts. 2026 refresh: floating sticky headers on long scrolling lists.
- **Wodify** (programming + management): builder emphasizes *publish visibility windows* (program ahead, reveal on schedule), embedded demo videos, per-workout coach notes. Weakness per reviews: single-strength-movement programming less intuitive — same tension Cone's Força blocks already solve better with structured sets/loads.
- **BTWB** (analytics depth): 1,500+ benchmark library, per-movement progression charts over years, global percentile leaderboards. UI dated — depth ≠ polish.
- **PushPress** (ops): one-tap class booking/waitlist/check-in with push reminders; member self-service. Cone's equivalent (#40) is deliberately gated on identity (#30/#31).

**Cone's standing:** data model (structured load×dist×intensity, per-gender Rx/Inter/SC) exceeds all four (they model movements as free text). Community loop (SugarWOD's fist-bumps/comments) and analytics depth (BTWB's progression charts) are the two market patterns Cone lacks that fit the current identity-less architecture worst and best respectively — progression charts need no social identity, only the data Cone already has.

Sources: [SugarWOD athlete features](https://www.sugarwod.com/athlete-features/), [SugarWOD vs BTWB](https://www.sugarwod.com/sugarwod-vs-btwb/), [DroidLore box-member app comparison 2026](https://droidlore.com/crossfit/crossfit-apps-boxmembers), [Wodify workout builder](https://help.wodify.com/hc/en-us/articles/36971376330263-Explore-Perform-The-Workout-Builder), [Wodify reviews (Capterra)](https://www.capterra.com/p/159663/Wodify/reviews/), [BTWB review (Garage Gym Reviews)](https://www.garagegymreviews.com/beyond-the-whiteboard-review), [PushPress member app](https://www.pushpress.com/feature-list/member-app).

---

## Global policy decisions (settled this pass)

### Border-radius rule → **Option A: circles exempt**
Census: 230 `border-radius` declarations across `src/` (92 public / 138 SPA), of which 27 are `border-radius: 50%` true circles (19 public / 8 SPA). Amended rule (now in CLAUDE.md): **no rounded rectangles on public pages; `border-radius: 50%` (perfect circles) exempt as a shape primitive; pills (`999px` etc.) are rounded rects → squared; SPA keeps minimal radius.** Sweep target: ~73 public rounded-rect declarations, page-by-page.

### Font weights → **load Cinzel 500 + 800; Amarante stays synthesized**
`src/fonts.js` loads Cinzel 400/600/700/900, Crimson Pro 400/600/400-italic, Amarante 400. CSS uses 500/800 in 20 places (6 files). Cinzel has real 500/800 upstream (`@fontsource/cinzel/{500,800}.css`, ~15 kB each) — load them. Amarante ships **only 400**: every bold in Spirit Blossom themes is already browser-synthesized and will stay so (no action possible short of changing the font). Decision: add the two Cinzel imports in the first page session that touches a 500/800 use; do **not** re-map declarations.

## Fold-in inventory (mechanical census, per file)

Hardcoded hex (`#nnn…`): **~986 across 28 files in `src/`** — far beyond #15's public-only census of 93 (which still matches: `src/public` ≈ 93). The SPA masses: `index.css` **284**, `Publicador.jsx` **305** (large share is jsPDF print colors — *legitimately* literal, PDF has no CSS vars; classify during that tab's session), `Criador.jsx` 84, `Servicos.jsx` 64, `Resultados.jsx` 51, `tvController.module.css` 29, `Exercicios.jsx` 13, `Atletas.jsx` 17, `App.jsx` 6, `PresenterView.jsx` 4, `IntensityInput.jsx` 3, `config.js` 30 (leaderboard color defaults — data, not styling; exempt).

Click-only `<div|span onClick>` (keyboard-dead): 60 across 13 files — `Schedule.jsx` 14, `Atletas.jsx` 11, `Criador.jsx` 6, `Exercicios.jsx` 5, `Resultados.jsx` 4, `TvController.jsx` 4, `Results.jsx` 4, `Me.jsx` 4, `Athletes.jsx` 3, `BlockTypePicker.jsx` 2, `Nav.jsx` 1, `Index.jsx` 1, `ClassPanel.jsx` 1.

Border-radius per public file: `Schedule.module.css` 38 (5 circles), `Athletes.module.css` 18 (1), `TV.module.css` 9 (2), `Timer.module.css` 7 (2), `Me.module.css` 5 (3), `Results.module.css` 5 (3), `Recover.module.css` 4 (0), `Leaderboard.module.css` 2 (2 — all circles, clean), `Nav.module.css` 2 (0), `Index.module.css` 1 (0), `ExerciseList.module.css` 1 (1).

---

## Per-surface findings

All 18 surfaces driven live (local stack + Playwright, 1280×800 + 390×844, seeded prod snapshot). Zero console errors on any public page or SPA tab (one dev-environment-only crash documented under "Dev-environment finding" below). The #7-debt athlete-log click-through was executed in full — see "Athlete-log click-through" at the end.

### Public pages

**index.html — S.** IA is right and matches the market's strongest pattern (SugarWOD "today's WOD first"): ontem/hoje/amanhã cards, Registrar CTA. Mobile excellent. 🔴 Desktop: content column occupies only the left ~45% — the right half of a 1280px viewport is dead space (#18 fold-in). ⚪ Nav icons are full-color emoji (🏠🏆📊👤📅⏱️) in a duotone gold/dark UI — clashes with the Tabler-icon standard; a cross-cutting decision for the B-sessions (swap to themed Tabler icons vs. keep deliberately). ✦ Note: a custom in-theme PWA install banner already exists here (`Index.jsx:195` `beforeinstallprompt`) — see MOBILE.md.

**schedule.html — L (flagship).** Mobile day-accordions with family-colored type pills + athlete filter: strong. Desktop: athlete rail + cards work, but each WOD card's right 35% pane renders empty when no results/RM exist — large dead zones. 🟡 The bright-green `CAP 30'` chip and several pill styles sit off-palette. Heaviest fold-in load: 24 hex, 38 radius (5 circles), 14 click-divs. 🔴 **Log-sheet athlete-select bug (found live, new):** the "Registrar Resultado" sheet's Atleta `<select>` is populated ONLY from `sess.mainTraining` names (`Schedule.jsx:874-875`) — for group sessions (empty `mainTraining`) the list is empty. With the page-level athlete filter set, the sheet still *displays* "— Selecione —" (the filter athlete isn't among the options, so the browser falls back to the placeholder) while the submit state invisibly holds the filter athlete — **confirmed live: the form submitted successfully as Bruna while showing "— Selecione —"**. With no filter set, it's a hard dead-end (empty select, no way to pick yourself). Filed as its own Ready fix (#49) ahead of the design session. 🟡 Submit here has no confirmation step while results.html has a "Confirmar registro" modal — inconsistent policies for the same action.

**results.html — M.** Confirm-modal on submit is good. 🟡 Collapsed day cards are information-sparse (just a session name) — no result count, no leader preview; market pattern (SugarWOD whiteboard) surfaces results immediately. 🟡 Desktop 3-pane requires manually picking a WOD chip before anything renders — should auto-select today's (or latest) WOD with results. 🟡 Once an athlete has a result the page goes read-only (no self-correction), while schedule.html allows re-logging the same result — the two entry points disagree; pick one policy. Moon glyph for no-WOD days is a nice touch.

**me.html — M.** The richest public page and the closest to a market differentiator: stat tiles, streak hearts, RX-rate, per-category PR progress bars (BTWB-lite). Corner-bracket framing is the best TotK detail in the app. 🟡 First visit (desktop) shows a picker rail with a vast empty right pane. ⚪ "Scale"/"RPE" English column headers (Scale already in #15). ✦ Direction: per-movement progression charts over time (BTWB's core value) need zero new data — `results_v2` + PRs already hold it; pairs with #21.

**leaderboard.html — S/M.** 🟡 Opens empty until a WOD is manually selected — auto-select the latest WOD with results. The cyan `#00b8d4` accents (17 hex) are #15's poster child, visibly foreign next to `--teal`. Rank rows + gold first-place row: good bones.

**athletes.html — S–M + decision.** 🔴 The design outlier: visibly pre-theme (sans-serif font, rounded cards, no TotK ornaments, no bottom nav, different header) — it looks like a different product. Its content (athlete cards + goals) heavily overlaps me.html's picker + goals display. **Decision for its session: retheme it, or retire it and fold goal-lookup into me.html/leaderboard.** 18 radius declarations (1 circle).

**timer.html — S.** Config screen clean; running screens already fixed (#3). The "Meta de tempo (EX: 08:30)" field is a prime #35 masked-input target. Light fold-in load (3 hex, 7 radius).

**tv.html — S (light touch).** Recently designed (#2, #12); intentional flat exercise list. ⚪ A single-block WOD slide leaves ~60% of the screen empty at wall distance — consider scaling type/card size by block count (glanceability win, no layout change). Leave otherwise.

**recover.html — XS.** Utility card, works, 4 rounded-rect declarations to square in whatever batch touches it. No dedicated session.

### SPA tabs

**Criador — L, after #26.** Dense but functional; the week rail mirroring public schedule cards is good continuity. 🟡 Button-style zoo: bright cyan `SALVAR SESSÃO`, red `Limpar estado`, blue `Carregar/Salvar estado` — none from the TotK palette (84 hex in the file; `index.css` carries 284 more for the SPA shell). 🟡 "Limpar estado" (destructive) sits directly beside routine buttons in the header with equal visual weight. Decompose first (#26, overdue at 1953 lines), then apply the C0 standard.

**Atletas — M.** 3-pane with a rich detail (PR bars with metas, sessions, objetivos). Same empty-state dead space pattern as public me.html. Cyan progress bars off-palette; 17 hex; 11 click-divs (worst SPA a11y file). This is where #39 (adaptações) will land — design its card slot in this session.

**Exercícios — S.** Best-structured tab (categories → list → detail; 146-entry registry with chips + video badges). ⚪ "Salvar config.json" button is a developer-era export leftover in a coach-facing UI — remove or move into Configurações.

**Serviços — M.** The business tab: coach profile + Pix config, locais ("boxes") with hourly rates, per-local athlete assignment. 🟡 Left pane has a horizontal scrollbar (Cap teste Pix row overflows). 64 hex. Its data model (locations, rates) is a key input to PRODUCT.md's services/tiers.

**Resultados — M.** Registro / Histórico-KPIs / Leaderboard sub-tabs, month + week-chunk navigation, per-session reg counts — solid coach flow. 51 hex. Empty state panes fine.

**Agenda — S/M.** Month calendar (Sunday-start ✓), stats row (aulas/personal/concluídas), Relatório export. 🟡 Event chips are tiny low-contrast teal slivers — legibility at a glance is poor; day cells could use the block-color families.

**Publicador — L, after #25.** 8 export surfaces from one toolbar. 🔴 The export preview grid header renders "**GRADE DE TREINOS · JULY 2026**" — English month name in the exported/printed artifact (pt-BR miss; the toolbar itself correctly says "Julho 2026"). 🟡 Two adjacent buttons are both labeled "Mobile Semanal" — indistinguishable. 🟡 The preview grid overflows the viewport with no inner horizontal scroll container. 305 hex — but a large share are jsPDF print colors that CANNOT become CSS vars (PDF has no CSS); the C5 session must classify jsPDF-hex as exempt rather than sweep blindly.

**Quadro ao Vivo (TvController) — S.** Recently designed (#2); date-picker + two-pane layout works well; roster/registration verified live this session. The 29-hex debt in `tvController.module.css` (#28's named item) + font-weight 800 stand. Otherwise light touch.

**Configurações — XS.** Clean; the theme cards grid is exactly where #43's four new theme entries will land. No session needed beyond the C1 batch.

### Cross-cutting (all sessions)

- **Icon language:** emoji in public Nav + colored emoji in SPA sidebar vs. Tabler `ti-*` everywhere else. Decide once in C0/B1 and apply per page.
- **Button hierarchy:** SPA has ≥4 unrelated button styles (filled cyan, outlined blue/red, dark chip, green). C0 defines primary/secondary/destructive/ghost from theme tokens.
- **Pre-auth write storm:** the SPA fires ~14 doomed write requests (401) before login on every cold load (`SyncContext` pushes before auth). Harmless but noisy — ⚪ suppress-until-auth candidate, fold into any C-session touching SyncContext.
- **Confirm-modal policy:** results.html confirms, schedule.html doesn't; "Limpar estado" (destructive) has no confirm friction while a routine self-log does. One policy, applied everywhere.

## Dev-environment finding (no product impact — documented in CLAUDE.md)

Opening Quadro ao Vivo initially crashed with "Invalid hook call" + `useRef` null at `slides.jsx:103` — **two React copies in one page**: `react` resolved from `/CrossFit-Apps/.vite/deps/` (the *public* config's dep cache — its `root` is the repo root, so its cacheDir lands at repo-root `.vite/`) while `react-dom` came from `/CrossFit-Apps/cone/node_modules/.vite/deps/` (the SPA's cache). Cause: both dev servers share the `localhost` origin and swap ports between sessions (Vite auto-increments); the browser reused a cached module transform of `slides.jsx` from a previous session in which the *public* server held this port. **A cache-bypassed reload fully fixed it — zero errors after.** Not a product bug (prod builds are separate bundles); recorded as a CLAUDE.md dev-environment warning.

## Athlete-log click-through (#7 debt — executed and verified)

Run on the local stack with DB-side verification after every step; all test data reverted afterward (class row deleted, Bruna's test result deleted, Arthur's coach fields restored, `tv_state.class_id` nulled).

1. Coach started a class from Quadro ao Vivo (`Turma_22:30`, today's session) → `class_executions` row created.
2. **Real-athlete check-in** via `schedule.html?checkin=<classId>&from=tv` (nav correctly hidden): picked Bruna from "Estou na lista" → `athlete_ids` gained her id via the `class_checkin` RPC. ✅
3. **Guest check-in** via "Não estou na lista" → `anon_names` gained "Convidado Teste". ✅
4. **results.html self-log** (Bruna, 25/06 MetCon): confirm modal → new `results_v2` row via `log_result`, `logged_by_athlete=true`, `coach_note`/`flag_for_review` at defaults; Arthur's pre-seeded coach-note fixture on the same session **untouched** (cross-row isolation). ✅
5. **schedule.html self-log** onto Bruna's now-fixtured row (coach_note + flag set via SQL between steps): upsert kept the **same row id**, updated `blocks`, and **preserved `coach_note` and `flag_for_review` exactly** — the precise tamper-resistance #7's RPC design promised, now confirmed from the real UI. ✅
   (This step is also what surfaced the athlete-select display bug above.)
6. Desktop-reg note: the desktop registration path funnels into the same `doOpenLog` sheet + `log_result` RPC exercised in step 5, so its write path is covered; its distinct UI entry (roster row at desktop width) should be re-driven in the schedule design session (#50) after the #49 select fix, since the select bug sits in that exact sheet.

## Program consequences

Sequencing and per-surface sizing feed the restructured backlog (rows #49–#59) and `plans/16-design-pass-program.md`. Bundles: **B1** schedule (L) · **B2** results+leaderboard (M) · **B3** me+athletes (M, incl. retire-or-retheme decision) · **B4** index+timer+tv+recover (M batch) · **C0** SPA standard (M, gates C1–C5) · **C1** Exercícios+Configurações+Agenda (M) · **C2** Atletas+Serviços (M) · **C3** Resultados (M) · **C4** #26+Criador (L) · **C5** #25+Publicador (L) → then **#43** themes. 10 sessions instead of a naive 18.
