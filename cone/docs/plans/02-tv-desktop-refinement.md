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
- `push()` patch contract and subscriptions untouched (see CLAUDE.md TV system notes).

## Scope note (added during implementation, 2026-07-02)

The approved design card (`design/mockups/02-tv-desktop-refinement-done.html`) went beyond pure layout: it merged the old separate "Resultados ao vivo" / "Registro ao Vivo" cards into one per-class accordion roster in `ClassPanel.jsx`, and added guest (visitante) live registration. This required:
- `useLiveRegistration.js` rewritten to handle real athletes (`results_v2`) and guests (`class_executions.anon_results`, new JSONB column, day-scoped only) through one unified member/key model, plus a manual mm:ss "Editar" path (not just register/undo).
- Schema migration: `ALTER TABLE class_executions ADD COLUMN IF NOT EXISTS anon_results JSONB NOT NULL DEFAULT '{}'::jsonb;` (applied by user).

See CLAUDE.md's TV system section for the shipped shape. Coach-side (`TvController`) is behind real Supabase OTP auth with no dev bypass, so this session's browser verification covered `tv.html` only (theme-init + real-data render, no console errors) — the roster register/edit/guest flow needs a manual click-through before moving this item to Done.

## Verification
- Open tv.html on one screen, TvController in the SPA on another at 1080p: controller fills width, no empty side margins, no vertical scroll for primary content.
- Smoke test the full push cycle (slide switches, timer start/pause/resume, group advance, QR toggle) — TV updates within ~1s, no regression.
- Reload tv.html — no flash of unstyled/wrong-theme content.

Model: Sonnet · Size: M
