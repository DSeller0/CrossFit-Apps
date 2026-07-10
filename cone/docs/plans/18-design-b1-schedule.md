# 18 — Design pass B1: schedule.html (#50)

> ✅ Done: `c29bf6a` · 2026-07-10 — see BACKLOG.md

## Context
First execution session of the design-pass program ([plans/16](./16-design-pass-program.md)); full findings in [reviews/2026-07-09-design-benchmark.md](../reviews/2026-07-09-design-benchmark.md) (schedule.html section). The flagship athlete page: mobile IA is strong; desktop has dead zones; heaviest fold-in load in the app. Run **after** #49 (plans/17) ships — this session re-drives the desktop-reg entry that sits in the same sheet.

## Scope
1. **Design refinement (mockup-first, WORKFLOW):**
   - Desktop WOD-card right pane: design an empty/idle state (or reflow to full-width when no results/RM content) instead of a blank 35% column.
   - Chip/pill palette: `CAP` chip and block pills onto token colors (block-family colors are canon; the bright green is not).
   - Sheet consistency: adopt the confirm-modal policy decided in the program (results.html confirms; schedule currently doesn't).
   - Icon-language decision from B4 applies here only if B1 lands later; otherwise defer Nav icons to B4.
2. **Fold-ins (this page's files only):** `Schedule.jsx` + `Schedule.module.css`
   - #15: 24 hardcoded hex → theme vars.
   - Radius: 38 declarations — square the 33 rounded-rects, keep the 5 `50%` circles (CLAUDE.md policy).
   - #14 mechanical: 14 click-only divs (`:366,410,444` checkboxes, `:995` accordion, `:1231` check-in row, etc.) get role/tabIndex/keyboard; icon-only buttons get aria-label; add `<main>` + a page heading.
   - #18: desktop ≥768px — no page-level scrollbar; week strip/athlete rail/cards scroll in their own panes.
   - Font-weights: if this page uses 500/800, add `@fontsource/cinzel/{500,800}.css` to `src/fonts.js` (program rule 4).
3. **Out of scope:** ExRow→ExerciseList markup unification (#17, still deliberately deferred); `toTitleCase`-class rendering changes (done, #46).

## Acceptance
- Approved mockup card(s) in `cone/design/` synced to the Design System project before implementation.
- Zero hardcoded hex left in Schedule files (minus documented exemptions); zero rounded-rects.
- Renders correctly at 1280×800 + 390×844 under **all 4 themes**.
- Keyboard: every interactive element on the page reachable and operable via Tab/Enter/Space.
- Desktop-reg flow re-driven live post-#49 (roster row → sheet → submit → DB verified → reverted).

## Files
`src/public/schedule/Schedule.jsx`, `src/public/schedule/Schedule.module.css`, `src/fonts.js` (weights), `cone/design/` (new mockup card).

## Verification
`/verify` live at both widths × 4 themes on the local stack; the #7-family click-through repeated for the desktop-reg path; `npm test` + `npm run build:all`; `/code-review` (L item).

Model: Opus · Size: L
