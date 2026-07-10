# 16 — Design-pass program (umbrella)

> **Program doc, not a single-session plan.** Sessions #49–#59 each get their own `plans/NN` when promoted to Ready (2–3 at a time, per WORKFLOW). Born from the 2026-07-09 planning session that restructured #27+#28; analysis in [reviews/2026-07-09-design-benchmark.md](../reviews/2026-07-09-design-benchmark.md).

## Context
Feature-complete app; goal is the "Common" theme (#43) to show Cone beyond the current gym. #43 is blocked mostly by token debt (hardcoded hex won't respond to new themes), and the UX-refinement backlog (#27/#28) touches the same files page-by-page — so one unified program: every surface gets one session that does design refinement **plus** that surface's slice of #15 (hex→vars), #14 (mechanical a11y: aria-labels, keyboard on click-divs, headings), and #18 (desktop scroll-in-panes, public pages).

## Session bundles (order of execution)

| # | Bundle | Size | Content beyond fold-ins |
|---|---|---|---|
| B1 | schedule.html | L | Desktop card dead-zones, chip palette, sheet consistency; after #49 fix ships. Re-drive desktop-reg entry. |
| B2 | results.html + leaderboard.html | M | Auto-select today/latest WOD (both), collapsed-card info density, re-log policy decision, cyan→teal |
| B3 | me.html + athletes.html | M | First-visit picker layout; **decide: retheme athletes.html or retire into me/leaderboard**; "Scale"/"RPE" pt-BR |
| B4 | index.html + timer.html + tv.html + recover.html | M | index desktop width, icon-language decision (emoji vs Tabler) applied to Nav, tv font-scale idea, radius squares |
| C0 | SPA design standard | M | Card/button/input/spacing standard from theme tokens; button hierarchy (primary/secondary/destructive/ghost); confirm-modal policy; masked mm:ss input component (#35 absorbed); mockup cards in `cone/design/` — **gates C1–C5** |
| C1 | Exercícios + Configurações + Agenda | M | Apply standard; remove "Salvar config.json"; Agenda chip legibility |
| C2 | Atletas + Serviços | M | Apply standard; empty states; Serviços pane overflow; reserve #39 card slot |
| C3 | Resultados (SPA) | M | Apply standard; 51 hex |
| C4 | Criador | L | **#26 decomposition first (same or preceding session)**, then standard + header/destructive-action rework |
| C5 | Publicador | L | **#25 decomposition first**, then standard; JULY→pt-BR export fix; dedupe "Mobile Semanal" labels; classify jsPDF hex as exempt |
| — | #43 themes | L | Only after B/C: token-clean codebase, verified under 4 themes per page |

## Rules for every session
1. Mockup-first (WORKFLOW): ASCII → `cone/design/` card → DesignSync → approval → implement.
2. Fold-ins for the surface's own files: hex→vars (except jsPDF/print literals + `config.js` data colors), rounded-rects→square (circles `50%` exempt, pills are rects — policy in CLAUDE.md), click-divs get role/tabIndex/keyboard, icon-only buttons get aria-label, `<main>`/heading where the page lacks one.
3. Verify at 1280×800 + 390×844 **under all 4 themes**; `npm test` + `npm run build:all`; `/verify` live; `/code-review` (M/L).
4. First session that touches a font-weight 500/800 use adds `@fontsource/cinzel/500.css` + `/800.css` to `src/fonts.js` (policy: load real Cinzel weights; Amarante stays synthesized — it only ships 400).
5. Global residues NOT absorbed: #14's site-wide landmark/heading architecture (own session), realtime/live-region a11y.

## Acceptance (program-level)
- Every surface shipped or explicitly deferred with a reason (the #27 bar).
- `src/public` hardcoded hex ≈ 0 (minus exemptions); public rounded-rects = 0.
- #43 can add a theme by touching only `themes.css` + Configurações.
