# 12 — Registry default loads (ghost values) (#38)

> ✅ Done: `0466dd6` · 2026-07-05 — see BACKLOG.md

## Context
Picking an exercise in the builder fills only the **name** (`ExerciseCombobox`, `Criador.jsx:255` → `onChange(name)`); the coach then re-types the same box-standard loads every day. The registry entry (`{name, videoUrl?, videoPublished?, description?, muscles?, notes?}`) has no defaults concept. Analysis: [reviews/2026-07-04-feature-ideas.md](../reviews/2026-07-04-feature-ideas.md) (#38). **Requires #37** (plans/11) so defaults can carry `dist`.

Design principle (from the review): defaults appear as **ghost/placeholder** values in the builder — visible but non-committal. Do nothing → the defaults *are* the values used; typing overwrites. Empty fields **materialize on session save** (render-time fallback was rejected: editing a registry default would retroactively rewrite past WODs, and TV/Publicador would need a registry fetch).

Model: Sonnet · Size: M

## Acceptance
- Registry entry supports `defaults: { sets?, reps?, dist?, distUnit?, intensity? }` — one per exercise **name**; editable in the Exercícios detail pane; **survives `saveDetail`**.
- In the builder, picking a registered exercise renders its defaults as **ghost placeholders** (visible, greyed); inputs operate normally; typing overwrites; empty → default is used.
- Empty fields **materialize** from defaults **on session save** (not at render time).
- Intensity default: when intensity is untouched and a default exists, the default mode's tab shows in a distinct **"suggested/ghost"** state with placeholder values inside; any interaction makes it real; its ✕ dismisses.
- **Opt-out**: a dismissed ghost does not materialize on save (in-session dismissal state; optional `defaultsOff` marker only if the re-edit case proves annoying).
- `IntensityInput` is **extracted to a shared component** reused by both Criador and Exercícios (down-payment on #26).
- `npm test` green.

## Files
- [src/components/tabs/Exercicios.jsx](../../src/components/tabs/Exercicios.jsx) — registry entry gains `defaults`; `goToEx` (`:88-101`) seeds `detail.defaults` from `o.defaults`; **`saveDetail` (`:121-144`) must persist `newEx.defaults`** — it rebuilds `newEx` from scratch (`:129`) and would silently drop `defaults` (the named trap); add a "Cargas padrão" editor to the detail pane.
- [src/components/tabs/Criador.jsx](../../src/components/tabs/Criador.jsx) — on exercise pick, look up `registry[…].defaults`; render ghost placeholders in the volume + intensity inputs; materialize empty fields on the session-save path.
- **New** `src/components/shared/IntensityInput.jsx` — extract from `Criador.jsx:99-200`; add a `ghost`/`suggested` visual state; imported by both Criador and Exercícios.
- [src/public/lib/wod.js](../../src/public/lib/wod.js) / `loadRegistry` — confirm `loadRegistry` passes `defaults` through untouched; no shape change (defaults ride inside the `exercise_registry` blob).

## Approach
1. **Fix the `saveDetail` trap first** — thread `defaults` through the rebuilt `newEx` (`if (defaults) newEx.defaults = defaults`) and seed `detail.defaults` in `goToEx`. Verify a video/description edit no longer drops defaults. (Do this before building the editor so nothing silently eats data mid-work.)
2. **Registry shape** — add optional `defaults` object to entries. No migration (`exercise_registry` JSONB blob). `initRegistry`'s `migrateEx` leaves it alone.
3. **Extract `IntensityInput`** to `src/components/shared/` (both tabs import it); add a `ghost`/`suggested` prop for the placeholder tab state. This is the #26 down-payment.
4. **Exercícios editor** — add a "Cargas padrão" block: sets/reps OR dist/distUnit (mirror #37's volume switch) + the shared `IntensityInput` for a default intensity.
5. **Builder ghosts** — when a picked exercise has `defaults`, show them as `placeholder`/ghost (greyed) in empty inputs; real typing overwrites. Track per-exercise dismissal in session state.
6. **Materialize on save** — in the Criador session-save path, for each exercise with empty volume/intensity + a registry default (and not dismissed), copy the default into the stored value so sessions stay self-contained.

## Verification
- Local stack: in **Exercícios**, set defaults on "Back Squat" (5×5 @ 80 % RM). In **Criador**, add "Back Squat" to a WOD → confirm the ghost `5×5` / `80% RM` shows; **save without typing** → the stored exercise holds real `5×5` / `80%`. Re-add and type `3×3` → overwrites. Dismiss the intensity ghost (✕) → save leaves intensity `null`.
- Regression: editing an Exercícios entry's video/description/muscles round-trips **and no longer drops `defaults`** (the `saveDetail` trap).
- Distance default (needs #37): set a Cardio-category exercise's default dist (e.g. Row 500 m) → ghost shows `500m`, materializes on save.
- `npm test` green + new cases. Run `/code-review` before pushing (M item).
