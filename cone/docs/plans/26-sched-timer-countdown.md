# 26 — Schedule-launched timer skips the 10s countdown (#79)

> ✅ Done: a6ea617 · 2026-07-17 — see BACKLOG.md

Backlog: **#79** (Icebox → Ready). Captured from a user report on 2026-07-17. Root-caused.

## Context

`timer.html` has two entry paths. Its own **config screen** (`status:'cfg'`) offers a "⏱ Contagem regressiva 10s" toggle pill (`Timer.jsx:606-615`, `form.countdown`, default `true`) that runs a get-ready countdown (`enterGetReady()`) before the clock starts. But launching a timer **from a schedule WOD** goes a different way: `schedule.html`'s `openTimer()` (`Schedule.jsx:290-304`) writes a `timer_config` object to localStorage with **no `countdown` key at all**, then navigates to `timer.html?src=sched`, which opens straight on the **`ready`** screen (`Timer.jsx:59` → `initStatus`), skipping the `cfg` screen entirely. The `ready` screen (`Timer.jsx:641-679`) renders only a WOD summary + a bare "▶ INICIAR" button — **no countdown toggle**.

`handleStart()` (`Timer.jsx:271-274`) does `if (cfg.countdown) enterGetReady(); else startTimer()`. Because `cfg` is seeded directly from schedule's handoff object (`Timer.jsx:58` spreads `loadSavedCfg()`), `cfg.countdown` is `undefined` (the `?? true` fallback only exists in the separate `form` state the `cfg` screen uses, which this flow never reaches) — so a schedule-launched timer **always** skips the countdown and starts immediately.

## Acceptance

- Launching a timer from a schedule WOD runs the 10s get-ready countdown before the clock starts.
- The `ready` screen shows a countdown toggle pill the coach can turn off per-launch, matching the `cfg` screen's pill.
- Toggling it off → INICIAR starts the clock immediately; toggling on → the countdown returns.
- `timer.html` opened directly (the `cfg`-screen flow) is unchanged.

## Files

- `src/public/schedule/Schedule.jsx:301` — the `config` object literal in `openTimer()`. Add `countdown:true`.
- `src/public/timer/Timer.jsx:641-679` — the `status==='ready'` render. Add the toggle pill, mirroring the `cfg`-screen pill at `:606-615`. `handleStart()` (`:271-274`) already reads `cfg.countdown` — no change needed there.

## Approach

1. In `openTimer()`, add `countdown:true` to the handoff `config` so the schedule launch defaults to on, matching the timer page's own default.
2. On the `ready` screen, render a toggle pill styled like `:609-613` (`s.pillOpt` / `s.pillOptActive`) but bound to **`cfg`**, not `form`: `onClick={() => setCfg(c => ({ ...c, countdown: !c.countdown }))}`, active class when `cfg.countdown`. Place it near the INICIAR control (`:674-676`).
3. Defensive default: read `cfg.countdown ?? true` at the `handleStart` check and the pill's active state, so a `timer_config` written to localStorage **before** this fix (no `countdown` key) still defaults the countdown on rather than off.

## Verification

Local stack + Playwright:
- From `schedule.html`, open a For Time WOD → "Abrir timer" → confirm the 10s get-ready screen appears before the clock runs.
- Toggle the pill off → INICIAR → clock starts immediately (no countdown).
- Re-launch with the pill on → countdown returns.
- Open `timer.html` directly and confirm the `cfg`-screen flow (its own countdown pill) is unchanged.
- `npm test` + `npm run build:all` green.

Model: Sonnet · Size: S
