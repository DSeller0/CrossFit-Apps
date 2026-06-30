# 03 — timer.html: desktop running layout

## Context
The timer.html **config** screen is done (header + BlockTypePicker, Phase 2). What remains: the **running / paused / finished** screens don't use desktop real estate — the ring and controls don't scale to a wide viewport, and the sidebar nav offset (`margin-left: 220px`) isn't applied on the running screen.

## Acceptance
- Desktop ≥768px: running/paused/finished screens apply the sidebar offset.
- Ring scales with **`vh`** (not `%` — see CLAUDE.md pitfall), using available vertical space.
- Exercise list positioned alongside or below the ring (decide in mockup).
- Mobile layout unchanged.
- No horizontal scroll at 1280px.

## Files
- `src/public/timer/Timer.jsx` — running/paused/finished render branches.
- `src/public/timer/Timer.module.css` — desktop `@media(min-width:768px)` rules for the running screen.

## Mockup first (design item — mandatory)
ASCII + HTML mockup of the desktop running screen (ring size, exercise-list placement, controls) before implementation. Confirm with user.

## Approach
- Add a `@media(min-width:768px)` block scoped to the running/paused/finished container: apply `margin-left: 220px` (matching the config screen / Nav sidebar), and lay out ring + exercise list (side-by-side or stacked per mockup).
- Size the ring off `vh` so it grows on tall screens without overflowing; keep the existing mobile sizing untouched.
- Do **not** touch the dark backdrop of the running/paused/finished screens — that's intentional for the clock display (per the prior design decision).
- No timer-logic changes — layout/CSS only.

## Verification
- `npm run dev`, launch timer.html from schedule, start a timer at 1280×800: sidebar offset applied, ring scales to the viewport, exercise list placed per mockup, no horizontal scroll.
- Pause/resume/finish — each screen holds the desktop layout.
- Resize to 390px — mobile layout unchanged.

Model: Sonnet · Size: M
