# 16 — Design-pass program (umbrella)

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
| C3 | Resultados (SPA) | #57 | M | ⏳ open | Apply standard; 51 hex. ✅ **[plans/44](./44-resultados-decomposition.md) shipped 2026-07-26** — `Resultados.jsx` 912 → 27-line shell over `resultados/`. |
| C4 | Criador | #58 | L | ✅ [plans/37](./37-design-c4-criador.md) | #26 decomposition ([plans/35](./35-criador-decomposition.md)) + #92 text mode ([plans/36](./36-criador-text-mode.md)) ran first, as required. Standard + the 2026-07-21 layout brief. |
| C5 | Publicador **+ Agenda** | #59 | L | ⏳ open | ✅ **#25 decomposition prerequisite SATISFIED** ([plans/39](./39-publicador-decomposition.md), `e957b57`) — this now inherits `publicador/AgendaView.jsx` (408 raw) instead of 838 lines buried in 2125. Then standard; `createElement`→JSX; JULY→pt-BR export fix; dedupe "Mobile Semanal" labels; classify jsPDF hex as exempt. |
| — | #43 themes | #43 | L | ⏳ open | Only after B/C: token-clean codebase, verified under 4 themes per page |

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
> **The resume point is now C3 (#57) → C5 (#59).** Both are unblocked: plans/44 left
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
2. Fold-ins for the surface's own files: hex→vars (except jsPDF/print literals + `config.js` data colors), rounded-rects→square (circles `50%` exempt, pills are rects — policy in CLAUDE.md), click-divs get role/tabIndex/keyboard, icon-only buttons get aria-label, `<main>`/heading where the page lacks one.
3. Verify at 1280×800 + 390×844 **under all 4 themes**; `npm test` + `npm run build:all`; `/verify` live; `/code-review` (M/L).
4. First session that touches a font-weight 500/800 use adds `@fontsource/cinzel/500.css` + `/800.css` to `src/fonts.js` (policy: load real Cinzel weights; Amarante stays synthesized — it only ships 400).
5. Global residues NOT absorbed: #14's site-wide landmark/heading architecture (own session), realtime/live-region a11y.

## Acceptance (program-level)
- Every surface shipped or explicitly deferred with a reason (the #27 bar).
- `src/public` hardcoded hex ≈ 0 (minus exemptions); public rounded-rects = 0.
- #43 can add a theme by touching only `themes.css` + Configurações.
