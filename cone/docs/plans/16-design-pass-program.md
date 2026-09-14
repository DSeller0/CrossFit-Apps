# 16 — Design-pass program (umbrella)

> ✅ **PROGRAM CLOSED 2026-09-13 · [plans/87](./87-new-themes.md) · `9004a12`+`43d448c`+`c17cac1`+
> `d99cc30`+`be66a5e`+`1094cb0` — see BACKLOG.md.** #43 was the last open row (table below); Halo
> Reach + Common shipped as 4 new `html.theme-*` classes, Lane B, mockup-approved before any code.
> Every session B1 through C6 plus #43 is now ✅ — the **12** rows in the table below (B1–B4, C0–C6,
> #43; C5 and C2 each grew real sub-sessions of their own, tracked at their own rows, not recounted
> here). The program ran **2026-07-09 → 2026-09-13**, just over two months.

> **Program doc, not a single-session plan.** Sessions #49–#59 each get their own `plans/NN` when promoted to Ready (2–3 at a time, per WORKFLOW). Born from the 2026-07-09 planning session that restructured #27+#28; analysis in [reviews/2026-07-09-design-benchmark.md](../reviews/2026-07-09-design-benchmark.md).

## Context
Feature-complete app; goal is the "Common" theme (#43) to show Cone beyond the current gym. #43 is blocked mostly by token debt (hardcoded hex won't respond to new themes), and the UX-refinement backlog (#27/#28) touches the same files page-by-page — so one unified program: every surface gets one session that does design refinement **plus** that surface's slice of #15 (hex→vars), #14 (mechanical a11y: aria-labels, keyboard on click-divs, headings), and #18 (desktop scroll-in-panes, public pages).

## Session bundles (order of execution)

*Shipped-state column added 2026-07-26 — this table had never been updated as sessions landed, so it still
carried prerequisites that were long satisfied and an Agenda assignment that moved 4 days after it was written.*

| # | Bundle | Item | Size | State | Content beyond fold-ins |
|---|---|---|---|---|---|
| B1 | schedule.html | #50 | L | ✅ [plans/18](./18-design-b1-schedule.md) | Desktop card dead-zones, chip palette, sheet consistency; after #49 fix ships. Re-drive desktop-reg entry. |
| B2 | results.html + leaderboard.html | #51 | M | ✅ [plans/20](./20-design-b2-results-leaderboard.md) | Auto-select today/latest WOD (both), collapsed-card info density, re-log policy decision, cyan→teal |
| B3 | me.html + athletes.html | #52 | M | ✅ [plans/21](./21-design-b3-me-athletes.md) | First-visit picker layout; **decided: athletes.html RETIRED to a redirect stub**; "Scale"/"RPE" pt-BR |
| B4 | index.html + timer.html + tv.html + recover.html | #53 | M→L | ✅ [plans/31](./31-design-b4-public-finale.md) | index desktop width, icon-language decision (emoji vs Tabler) applied to Nav, tv font-scale idea, radius squares |
| C0 | SPA design standard | #54 | M | ✅ [plans/33](./33-design-c0-spa-standard.md) | Card/button/input/spacing standard from theme tokens; button hierarchy; confirm-modal policy; masked mm:ss input (#35 absorbed) — **gates C1–C5** |
| C1 | Exercícios + Configurações | #55/#87 | M→L | ✅ [plans/38](./38-design-c1-exercicios-config.md) | Apply standard; remove "Salvar config.json". **Agenda moved OFF this bundle to C5 on 2026-07-22** — it is `AgendaView`, which C5 restructures, so design-passing it here then immediately restructuring it was wasted work. |
| C2 | Atletas + Afiliados | #56 | M→L | ✅ [plans/75](./75-design-c2-atletas-servicos.md), shipped 2026-08-28 (planned + gated 2026-08-13, wired + verified live 2026-08-28) | Apply standard; empty states; Serviços pane overflow; reserve #39 card slot. **Absorbed the Serviços → Afiliados restructure** ([plans/42](./42-afiliados-direction.md)). Grew a tail — see the note below the table (#160/#161/#162). |
| C3 | Resultados (SPA) | #57 | ~~M~~ **L** | ✅ [plans/80](./80-design-c3-resultados.md), shipped 2026-08-30 | ⚠️ **LANE B — the only C-session that is** (see the correction under rule 1). Not a restyle: the user reports two of the three sub-tabs are unfound in live use, so **Leaderboard is deleted** (a second copy of `leaderboard.html`) and **Histórico is dissolved** into the Atletas ficha + a class read-back on the session. Rides #157 and #169 — **both closed with it.** ✅ **SHIPPED: the sub-tab bar is gone and Resultados is ONE surface** (a 260px week rail + THE CLASS), because the roster became the form container. Histórico's halves landed as the ficha's "Histórico de resultados" Card and as `ClassHeader`/`SessionKpis`. ✅ **[plans/44](./44-resultados-decomposition.md) shipped 2026-07-26** — `Resultados.jsx` 912 → a shell over `resultados/` (**49 raw lines** today; the "27" was a pre-reformat figure, re-measured 2026-08-29). |
| C4 | Criador | #58 | L | ✅ [plans/37](./37-design-c4-criador.md) | #26 decomposition ([plans/35](./35-criador-decomposition.md)) + #92 text mode ([plans/36](./36-criador-text-mode.md)) ran first, as required. Standard + the 2026-07-21 layout brief. |
| C5 | Publicador **+ Agenda** | #59 | L | ✅ **[plans/81](./81-design-c5-publicador-agenda.md) · [plans/82](./82-c5b1-publicador-shell-e-cores.md) · [plans/83](./83-c5b2-publicador-renderer.md)**, shipped 2026-09-04 (last piece: C5·b2/plans/83) | ⚠️ **LANE B, both surfaces** (user-confirmed — see rule 1). ✅ #25 prerequisite satisfied ([plans/39](./39-publicador-decomposition.md), `e957b57`). Split: **Phase 0** (dead `MicButton` + 3 one-line bugs) → **C5·a Agenda** (closed #105/#106) → **C5·b Publicador** (b1 shell+colour, b2 the parametric renderer — closed #113, #170, #15; deleted the `.b*` zoo; `index.css` ends with zero `TAB-OWNED → Publicador` tags). Both halves of this row's own scope — Publicador and Agenda — are done. ⚠️ **C5·c (Relatório + #154, [plans/81 §C5·c](./81-design-c5-publicador-agenda.md)) was NOT part of this row's scope** (the row title never named Relatório) but shipped anyway, 2026-09-04, tracked on its own in BACKLOG.md — it never blocked #43 or this row's ✅, and plans/81 now carries its own top-level Done marker covering all four sessions. |
| C6 | **TvController (SPA) + timer.html** | #174 | L | ✅ [plans/86](./86-tv-timer-surface-pass.md), shipped 2026-09-06 | ⚠️ **THIS ROW DID NOT EXIST UNTIL THE SESSION SHIPPED, AND THAT IS THE FINDING.** The program's table went C0→C5 with **no C-session for `TvController`** — the SPA tab that runs a live class — and B4 covered `tv.html`/`timer.html` in 2026-07 *before the C0 primitives existed*, so neither surface was ever measured against the standard. The cost was not cosmetic: `Quadro ao Vivo` was **illegible on both light themes** (`--cream` ink on a hardcoded `#111`, measured **1.04:1** / **1.00:1**) and the tab held the worst a11y ratio in the app (21 buttons · 0 `aria-label` · 5 click-`<div>`s, the whole date picker keyboard-unreachable). 🔑 **A surface absent from the program's own table is invisible to it** — when adding a program, enumerate the surfaces from the router/tab list, not from the sessions you already intend to run. **Lane A** (only its execution was wrong) — ⚠️ **but the usage half of that argument was WRONG for one of its three surfaces, confirmed by the user 2026-09-13: `Quadro ao Vivo` is still not used live.** The plan justified Lane A with *"TV and Timer are used at the gym every day"* and argued past the C5 addendum (*a defect obvious on first use, left unreported for weeks, is evidence about usage*) by saying the illegibility hid on a theme the box never selects. The simpler explanation — nobody opens the tab — was available and unexamined; **the addendum was right and got talked out of.** 🔑 **A usage premise is per-SURFACE, not per-plan**: `timer.html` and the `tv.html` wall really are in daily use, and bundling the unused controller tab with them let the weak half inherit the strong half's evidence. Check each surface's usage separately — #171 and #191 both target this directory. Rides #178, #182, #184, #188; the clock rewrite stays #191's. |
| — | #43 themes | #43 | L | ✅ [plans/87](./87-new-themes.md), shipped 2026-09-13 | **The program's last row, closed.** Lane B (mockup-approved 2026-09-13): `design/mockups/65-halo-reach-theme.html`/`66-common-theme.html`. Halo Reach's palette came from pixels sampled off a real menu screenshot (halopedia), not memory — v1 guessed mono headings and a cool-tinted text colour, both wrong, corrected against the measurement; Common was de-tinted to true neutral after reading too close to Halo Reach. 4 new `html.theme-*` classes, 8 themes total, each exactly 29 tokens; `--border` derived per palette; every one of #14's 9 pairs plus 3 later-load-bearing cells passes in all four — no exception needed, unlike any of the original four. `lb_colors` table dropped in the same session (#60). Two hardcoded "4 themes" guards (`exportPalette.js`, `build-design-cards.mjs`) caught real wiring gaps exactly as built to; the second now cross-checks `theme.js`'s `THEMES.length` instead of a literal, so it can't go stale at theme #9. |

> 🔑 **C2 GREW A TAIL — three follow-on rows, added 2026-08-28.** C2 was planned and built to its
> gate, at which point the user took the two design directions to a coach and settled on **mockup 51
> · Atletas Fichas** and **mockup 60 · Afiliados completo**. Those are product surfaces, not
> restyles, so they are *not* folded back into #56 — C2 stays what it was (tokens, primitives, the
> Serviços → Afiliados rename) and the new layouts sit on top of it:
>
> | row | surface | plan | size |
> |---|---|---|---|
> | **#160** | Atletas → Fichas (grade by next session + 1:1 ficha) | [plans/76](./76-atletas-fichas.md) | L |
> | **#161** | Afiliados → Meus afiliados + Meu perfil (rail, 3 columns) | [plans/77](./77-afiliados-paineis-coach.md) | M |
> | **#162** | Fechamento + Minha semana + the invoice status stamp | [plans/78](./78-fechamento-semana.md) | L |
>
> **Run order is a real gate:** #56 → #160 / #161 (either order) → #162.
>
> ⚠️ **This does not change the program's own order** — C3 (#57) and C5 (#59) are still the next
> *C-sessions*, and they are unblocked. The three rows above are a design-direction branch off C2,
> ranked with the rest of the board, not a fourth C-session.
>
> 🔑 **The measurement worth carrying forward:** mockup 51 is **~35% buildable** and mockup 60
> **~20%** against today's data. Both mockups' gaps are *data* gaps. That is why rule 1's "the
> surfaces exist, so work gallery-first" held for C2 but only half-holds for its tail: the
> components exist, the **fields behind them mostly do not**. Any future session that adopts a
> mockup wholesale should measure it against the schema first — this is the first time in the
> program that a design direction outran the data model, and it will not be the last.

**The housekeeping pass that held back all three remaining C-sessions is now fully shipped**
([43](./43-lint-floor-ci-gate.md), [44](./44-resultados-decomposition.md), [45](./45-effect-write-sweep.md) —
all 2026-07-26). None of the three C-sessions is blocked technically or by the user's code-health-first call
any more; nothing has been picked from Ready yet.

> 🔑 **RESUME POINT — user instruction, 2026-08-07: "go back to the last design pass we were dealing
> with."** This program was **parked, not finished.** The 2026-07-26 scope call put the whole
> housekeeping program ahead of it; that program closed 2026-08-05
> ([plans/68](./68-tier3-closeout.md), Tiers 1–3 all shipped) and its Tier 4 successor closed
> 2026-08-06. **The last session actually worked here was C4 · Criador ·
> [plans/37](./37-design-c4-criador.md) · `aea2e9d` · 2026-07-22.**
>
> ✅ **EXECUTED 2026-08-13/28 — C2 is done as far as a planning session can take it.** #56 was
> planned ([plans/75](./75-design-c2-atletas-servicos.md)) and **built to its approval gate**;
> the wiring is queued in Ready and is an **S**. Then the user reviewed the two design
> directions with a coach and picked mockups **51** and **60**, which produced #160/#161/#162
> ([plans/76](./76-atletas-fichas.md)/[77](./77-afiliados-paineis-coach.md)/[78](./78-fechamento-semana.md))
> — see the note under the table.
>
> ✅ **C3 SHIPPED 2026-08-30 → [plans/80](./80-design-c3-resultados.md)** (Lane B, L; Phase 0
> ships alone, then a design gate, then the build). **After it closes — including any bugs it
> causes — the next item is C5 (#59), user-confirmed the same day.**
>
> ✅ **C5 PLANNED 2026-08-30 → [plans/81](./81-design-c5-publicador-agenda.md).** Lane B for both
> surfaces (user-confirmed), split into **four sessions** — Phase 0 · C5·a Agenda · C5·b Publicador ·
> C5·c Relatório — **all four in Ready at once, in order, ahead of every other board item** (user).
> **When row 4 closes, this program has one item left: #43.**
>
> ✅ **C5·b2 SHIPPED 2026-09-04 → [plans/83](./83-c5b2-publicador-renderer.md)** — the parametric
> renderer (Layout · Blocos · Títulos · fit), closing this row's own scope (Publicador + Agenda are
> both done: C5·a shipped 2026-08-30, C5·b1 shipped 2026-09-04, C5·b2 shipped 2026-09-04). **C5·c
> (Relatório + #154) was never part of this row's title and continued as its own tracked item in
> BACKLOG.md** — it did not gate the program. 🔑 **THE RESUME POINT IS #43** — the design-pass
> program's only remaining item.
>
> ✅ **C5·c SHIPPED 2026-09-04 too → [plans/81 §C5·c](./81-design-c5-publicador-agenda.md).** Closed
> **#154** (versioned rate history — `billing.js`'s `rateAsOf`, `calcTotal`'s three-tier precedence,
> `afiliados/Afiliados.jsx`'s `saveLoc` appending a version instead of overwriting) and converted
> `events.jsx`'s `EventFormInner`/`ReportModal` — the publicador family's last `createElement`
> holdout — to JSX over `ui/Modal`/`Input`/`Button`/`Toast`. **All four C5 sessions are now shipped;
> plans/81 carries its own top-level Done marker.** #43 remains the one item left in this program.
>
> ✅ **#43 SHIPPED 2026-09-13 → [plans/87](./87-new-themes.md).** The program's last item is closed;
> see the Done marker at the top of this file.
>
> 🔑 ~~THE RESUME POINT IS NOW C5 (#59) — the LAST design-pass session.~~ C3 closed 2026-08-30.
> ~~**The resume point is now C3 (#57) → C5 (#59).**~~ Both were unblocked: plans/44 left
> `Resultados.jsx` a 27-line shell over `resultados/`, and plans/39 left C5 inheriting
> `publicador/AgendaView.jsx` directly. ⚠️ **C3 has a prerequisite the board records but this
> table did not:** **#157** (Registro's Salvar is all-or-nothing) lives in
> `resultados/RegistroView.jsx:753` — the very file C3 rewrites — so it ships **before or
> inside** C3, never after.
>
> ⚠️ **BACKLOG.md's Tier 4 ranking does not contain C2/C3/C5 at all** — it announced that the design
> program *"is the queue now"* and then ranked only #96 and #14 out of the nine rows it named. Two
> consequences, both recorded on the board 2026-08-07: **#14 was ranked 8 despite its own row stating
> it runs after C5** (rule 5 below is why), and **#96 is a layout follow-up to C1, not a C-session** —
> it does not substitute for resuming this table.
>
> ⚠️ **Re-measure before quoting this table.** Its own header says it went stale once already, and the
> raw-line figures in the C5 row predate `9b82015`'s repo-wide reformat (BACKLOG.md's unit-discontinuity
> note): `AgendaView.jsx` is **1598** raw today, not the 408 recorded below, and `Servicos.jsx` — C2's
> real weight, with **no `.module.css` at all** — is **1199**.

## Rules for every session
1. **Two lanes (WORKFLOW "Design work")** — this rule used to read "mockup-first: ASCII → `cone/design/` card → DesignSync → approval → implement", which the 2026-07-10 process reform (plans/19) superseded; plans/20 and plans/21 had already overridden it locally. Every remaining **B session and C1–C5 is Lane A**: the surfaces exist, so work **gallery-first — no static mockup**. Adjust the real component → all states in the gallery across 4 themes + both widths → `npm run design:cards` + sync → **stop at the approval gate**. Only **C0** (defines a net-new standard) and **#43** (net-new themes) are Lane B, i.e. actually mockup-first.
   > 🔴 **CORRECTED 2026-08-29 — "C1–C5 is Lane A" is no longer true. C3 is Lane B.**
   > The rule's premise is *"the surfaces exist, so the real component is the truth"* — which
   > silently assumes the surfaces are **used**. For Resultados they are not: the user reports
   > that of its three sub-tabs, *"after the app running for some time not even I remember they
   > exist"*. Gallery-first would have repainted two surfaces nobody opens and called it a
   > design pass. **The test to apply from here on: Lane A when the surface is used and only its
   > execution is wrong; Lane B when the surface's own existence or structure is what is in
   > question.** ~~C5 has not been assessed against this yet — do it when C5 is planned, rather
   > than inheriting "Lane A" from this sentence.~~
   >
   > ✅ **ASSESSED 2026-08-30 → C5 IS LANE B, BOTH SURFACES** ([plans/81](./81-design-c5-publicador-agenda.md)).
   > User-confirmed, so this is decided, not inferred — **the deferral is closed and the rule is now
   > fully resolved for every session in the program.** Final tally: **C0, C3 and C5 are Lane B; B1–B4,
   > C1, C2 and C4 were Lane A.** The C5 evidence is the interesting half, because unlike C3 there was
   > no user statement to act on — it was read off the surfaces. **Publicador:** three of its outputs
   > have been visibly broken for ~7 weeks with none reported (two of eight export buttons render the
   > *identical* string, `.slice(0, 15)` cutting exactly at the disambiguating digit; Apresentar's
   > share link 404s in production, #113; the Semanal export prints the month in the *browser's*
   > locale). **Agenda:** #162 shipped a competing week grid over the same `events` blob into
   > **Afiliados** three days earlier, while Agenda itself still has no week or list view. 🔑 **The
   > generalisable test this adds to C3's:** a defect that would be obvious on first use, left
   > unreported for weeks, is evidence about *usage*, not just about quality.
2. Fold-ins for the surface's own files: hex→vars (except jsPDF/print literals + `config.js` data colors), rounded-rects→square (circles `50%` exempt, pills are rects — policy in CLAUDE.md), click-divs get role/tabIndex/keyboard, icon-only buttons get aria-label, `<main>`/heading where the page lacks one.
3. Verify at 1280×800 + 390×844 **under all 4 themes**; `npm test` + `npm run build:all`; `/verify` live; `/code-review` (M/L).
4. First session that touches a font-weight 500/800 use adds `@fontsource/cinzel/500.css` + `/800.css` to `src/fonts.js` (policy: load real Cinzel weights; Amarante stays synthesized — it only ships 400).
5. Global residues NOT absorbed: #14's site-wide landmark/heading architecture (own session), realtime/live-region a11y.
   > ⚠️ **AMENDED 2026-09-06 — the live-region half is no longer wholly excluded.** [plans/86](./86-tv-timer-surface-pass.md) (C6) absorbed it for its own two surfaces: the timer announces **state transitions** via `role="timer"` (start / pause / round advance / finish) and the ClassPanel roster took `aria-live="polite"`. The exclusion was written to stop surface sessions being open-ended, and that still holds as the default — but a surface **whose entire content is a live region** cannot be design-passed without deciding its announcement contract, and deferring it would have shipped a timer that says nothing. 🔑 The line that makes this bounded rather than a re-opening: **announce transitions, never the tick.** A 250 ms clock inside `aria-live` is continuous speech; `role="timer"` is implicitly `aria-live="off"` and names the element without narrating it. Everything else in this residue — site-wide landmarks, headings, and live regions on surfaces that merely *contain* one — stays out of surface sessions.

## Acceptance (program-level)
- Every surface shipped or explicitly deferred with a reason (the #27 bar). ✅ All 12 rows in the
  table above are ✅.
- `src/public` hardcoded hex ≈ 0 (minus exemptions); public rounded-rects = 0.
- ⚠️ **#43 can add a theme by touching only `themes.css` + Configurações — PARTIALLY TRUE, tested
  against reality rather than assumed.** The theme *mechanism itself* needed exactly that (plus
  `theme.js`'s `THEMES` array, which the bar implicitly required since Configurações reads from
  it) — rendering, resolution, the FOUC boot script and `?box=` precedence all worked end-to-end
  with just those three touched. But **two more files needed a matching update, and correctly
  refused to work silently without one:** `exportPalette.js` maintains its own literal-hex
  `THEME_TOKENS` table (deliberately not importing `themes.css`, since it must stay client-free)
  and throws at import time if it's missing a row for a theme `theme.js` knows about;
  `build-design-cards.mjs` asserts the two files agree on how many themes exist. Both are
  independent "which themes exist" tables that exist for their own reasons — not gaps in the
  bar's premise, but real additional touch points a future theme #9 should expect, not assume
  away. Full account: [plans/87](./87-new-themes.md)'s Done marker.
