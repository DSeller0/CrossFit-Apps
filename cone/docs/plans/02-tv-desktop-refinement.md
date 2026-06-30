# 02 — Quadro ao Vivo: desktop refinement + design pass

## Context
Two problems on the TV controller (TvController) and the tv.html display:
- **(a) Layout:** on desktop there's empty horizontal space — cards don't use full width, excessive left/right margins, and content that should fit on screen requires scrolling.
- **(b) Styling debt:** `TV.module.css` uses hardcoded hex instead of CSS vars; tv.html has no theme-init script (FOUC risk); controller cards still carry large inline style objects (the `s` constants + per-element inline styles in the `tv/` panels).

## Acceptance
- **(a)** No visible empty left/right margins at 1280px. Card distribution fills available width. All primary TV-controller content visible without vertical scroll at 1080p.
- **(b)** `TV.module.css` uses CSS vars from themes.css where applicable. tv.html has a FOUC-prevention theme-init script. Controller card styling extracted from inline JSX into CSS. Passes visual check on TotK dark.

## Files
- `src/components/tabs/TvController.jsx` + `src/components/tabs/tv/` (`ClassPanel.jsx`, `GroupsPanel.jsx`, `LiveRegistrationPanel.jsx`) — the inline `s` style object and per-element inline styles.
- `src/public/tv/TV.jsx`, `src/public/tv/TV.module.css` — display + hex→var sweep.
- `tv.html` — add theme-init script.

## Mockup first (design item — mandatory)
ASCII + HTML mockup of the desktop controller layout (column/grid distribution, full-width usage, no-scroll target) before implementation. Confirm with user.

## Approach
- **Layout (a):** audit the controller's outer container max-width / margins; widen to fill, distribute the panels (Class / Groups / Live Registration / slide controls) across the available width via a responsive grid rather than a narrow centered column. Target: fits 1080p without vertical scroll.
- **Styling (b):**
  - Sweep `TV.module.css` hex → CSS vars (`#0d0b09→var(--bg)`, `#161210→var(--stone)`, `#1e1a16→var(--stone2)`, `#d8a840→var(--gold)`, `#4ac8c0→var(--teal)`, `#f0e8d0→var(--cream)`, etc.). Cross-check themes.css.
  - Extract the controller `s` constants and per-element inline styles into the relevant CSS module(s) so panels are class-driven.
  - Add the standard theme-init `<script>` to tv.html `<head>` (match the other public HTML pages) to prevent FOUC.
- No data-flow changes — `push()` patch contract and subscriptions untouched (see CLAUDE.md TV system notes).

## Verification
- Open tv.html on one screen, TvController in the SPA on another at 1080p: controller fills width, no empty side margins, no vertical scroll for primary content.
- Smoke test the full push cycle (slide switches, timer start/pause/resume, group advance, QR toggle) — TV updates within ~1s, no regression.
- Reload tv.html — no flash of unstyled/wrong-theme content.

Model: Sonnet · Size: M
