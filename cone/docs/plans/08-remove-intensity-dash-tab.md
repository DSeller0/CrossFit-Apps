# 08 — Remove the "—" intensity tab (#36)

> ✅ Done: 3bd11e4 · 2026-07-04 — see BACKLOG.md

## Context
The `none` / "—" tab in `IntensityInput` (`Criador.jsx:99-200`) is dead weight: `emptyEx()` already defaults `intensity: null`, so the tab only exists as a *clear* affordance. Removing it declutters the intensity picker without losing the ability to clear — the clear action just moves onto the active tab. This is UX hygiene and the first link in the **#36 → #37 → #38** chain (each reshapes what the next builds on), so it should land before #37 (load × distance). Source analysis: [reviews/2026-07-04-feature-ideas.md](../reviews/2026-07-04-feature-ideas.md) §#36.

Model: Sonnet · Size: S

## Acceptance
- The intensity mode tab strip no longer shows a "—"/`none` tab.
- A freshly-added exercise starts with **no** intensity mode selected (unchanged — `emptyEx()` already gives `intensity:null`).
- Clicking the **currently-active** mode tab clears intensity back to `null` (the exact behaviour the "—" tab provided), and the active tab carries a small ✕ hint so the clear affordance is discoverable.
- Existing saved WODs whose exercises have an intensity still open and edit correctly; nothing downstream throws on `intensity:null`.

## Files
- [src/components/tabs/Criador.jsx](../../src/components/tabs/Criador.jsx) — `IntensityInput` (`:99-200`); leave the defensive `mode==='none'` reads at `:402,445` (harmless, and safe against any legacy `mode:'none'` data).

## Approach
1. Drop `['none','—']` from the tab array driving the mode strip in `IntensityInput`.
2. Make a tab's `onClick` toggle: if the clicked mode is already the active one, set intensity to `null`; otherwise switch to it (existing behaviour). Reuse the same state-setter the old "—" tab called.
3. Add the ✕ hint to the active tab (visual only — e.g. a trailing glyph on the selected tab); keep it token-styled, no new hardcoded colors, no border-radius on the (SPA) tab is fine but match the surrounding tabs.
4. Confirm no other code branches on the literal `'none'` mode beyond the two defensive checks (grep `mode === 'none'` / `'none'`).

## Verification
- `/verify` in the builder (local `supabase start` + `npm run dev`): add an exercise → no "—" tab, no mode preselected; pick a mode → values edit; click the active mode tab → intensity clears (pill/summary shows no intensity). Open an existing WOD with a `%`/`gender`/`progression` intensity → it still renders and edits.
- `npm test` green.
