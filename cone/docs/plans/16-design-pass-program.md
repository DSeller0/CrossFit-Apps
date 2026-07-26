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
| C2 | Atletas + Serviços | #56 | M→L | ⏳ open | Apply standard; empty states; Serviços pane overflow; reserve #39 card slot. **Now also absorbs the Serviços → Afiliados restructure** ([plans/42](./42-afiliados-direction.md)). ⚠️ [plans/45](./45-effect-write-sweep.md) touches `Servicos.jsx` first. |
| C3 | Resultados (SPA) | #57 | M | ⏳ open | Apply standard; 51 hex. ⚠️ **[plans/44](./44-resultados-decomposition.md) runs first** — 912 raw lines. |
| C4 | Criador | #58 | L | ✅ [plans/37](./37-design-c4-criador.md) | #26 decomposition ([plans/35](./35-criador-decomposition.md)) + #92 text mode ([plans/36](./36-criador-text-mode.md)) ran first, as required. Standard + the 2026-07-21 layout brief. |
| C5 | Publicador **+ Agenda** | #59 | L | ⏳ open | ✅ **#25 decomposition prerequisite SATISFIED** ([plans/39](./39-publicador-decomposition.md), `e957b57`) — this now inherits `publicador/AgendaView.jsx` (408 raw) instead of 838 lines buried in 2125. Then standard; `createElement`→JSX; JULY→pt-BR export fix; dedupe "Mobile Semanal" labels; classify jsPDF hex as exempt. |
| — | #43 themes | #43 | L | ⏳ open | Only after B/C: token-clean codebase, verified under 4 themes per page |

**All three remaining C-sessions are held behind the housekeeping pass** ([plans/43](./43-lint-floor-ci-gate.md)
→ [44](./44-resultados-decomposition.md) → [45](./45-effect-write-sweep.md)) on the user's standing call
that code health precedes design and feature work. None of the three is blocked *technically* any more.

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
