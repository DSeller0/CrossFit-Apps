# 11 — Load × distance exercises (dist as volume) (#37)

## Context
A loaded carry ("Farmer's Carry 2×100m @ M/F 20/12 kg") is currently unrepresentable. Distance only exists via the `cardio` intensity **mode**, and that mode *hijacks the volume slot*: `exVolStr` (`wod.js:20-28`) returns the distance and ignores sets/reps, while the real load modes (pct/progression/gender) carry no distance at all. Today coaches stuff half the prescription into the note. Analysis: [reviews/2026-07-04-feature-ideas.md](../reviews/2026-07-04-feature-ideas.md) (#37). Gate #36 (remove "—" intensity tab) shipped `3bd11e4`, so this chain (#37 → #38) can proceed.

This also **folds in the formatter half of #17**: `exVolStr`/`fmtIntensity` are duplicated in three places that would each need the dist change — consolidate to the canonical copies in `wod.js` instead.

Model: Sonnet · Size: M

## Acceptance
- Exercise object carries `dist` + `distUnit ('m'|'cal')` as **siblings of `sets`/`reps`** (additive; old data with no `dist` renders unchanged).
- Builder volume input switches **Sets×Reps ↔ Distância/Calorias**, driven by the exercise's registry categories: name present in `registry['Cardio']` → distance input; a manual toggle remains only as fallback for free-typed names not in the registry.
- Intensity is **orthogonal**: any load mode (pct/progression/gender) combines with a distance on the same exercise.
- The **Cardio intensity tab is removed** from `IntensityInput`.
- Legacy `intensity.mode==='cardio'` data still renders forever (via an `exVolStr` fallback) and **lazy-normalizes** to `dist`/`distUnit` when its session is next edited/saved — no bulk migration.
- `exVolStr` renders dist in the volume slot: `2×100m`, `500m`, `20cal`.
- Canonical `exVolStr`/`fmtIntensity` in `wod.js` are the **only** copies; the diverged copies are deleted and re-imported.
- `npm test` green with new `exVolStr` unit cases.

## Files
- [src/public/lib/wod.js](../../src/public/lib/wod.js) — extend `exVolStr` (`:20`) for `dist`/`distUnit` + keep the legacy `mode:'cardio'` fallback; `fmtIntensity` (`:59`) stays canonical/unchanged.
- [src/components/tabs/Criador.jsx](../../src/components/tabs/Criador.jsx) — `emptyEx()` (`:16`) gains `dist`/`distUnit`; `IntensityInput` (`:99-200`) drops the `cardio` tab (`:127`) and its UI (`:184-197`); the exercise-row **volume input** gains the Sets×Reps ↔ Distância/Cal switch (registry-`Cardio` driven, manual toggle fallback); lazy-normalize legacy cardio on edit/save.
- [src/public/schedule/Schedule.jsx](../../src/public/schedule/Schedule.jsx) — delete local `fmtIntensity` (`:14`), import from `wod.js`; render dist in the exercise rows.
- [src/components/tabs/Publicador.jsx](../../src/components/tabs/Publicador.jsx) — delete local `fmtIntensity` (`:14`) and **rewrite `exLine` (`:58`)** around canonical `exVolStr`/`fmtIntensity` (its diverged cardio branch is subsumed by exVolStr's dist handling).
- [src/components/tabs/Resultados.jsx](../../src/components/tabs/Resultados.jsx) — delete local `exVolStr` (`:23`), import from `wod.js`.
- TV render paths ([src/public/tv/TV.jsx](../../src/public/tv/TV.jsx) `BlockCard` + `TimerSlide`, [src/public/shared/ExerciseList.jsx](../../src/public/shared/ExerciseList.jsx)) — already use canonical `exVolStr`; **confirm** dist renders through all three sync'd paths (CLAUDE.md "Block/exercise rendering").
- `wod.test.js` — add `exVolStr` cases: dist (`2×100m`, `500m`, `20cal`), legacy cardio fallback, plain sets×reps regression.

## Approach
1. **Data shape** — add `dist` (string) + `distUnit` (`'m'|'cal'`, default `'m'`) to the exercise object. Additive; absent on old data. **No SQL migration** — exercises live inside the `sessions` JSONB blob.
2. **`exVolStr` precedence** — if `ex.dist` present → `sets ? \`${sets}×${dist}${unit}\` : \`${dist}${unit}\``; else if legacy `intensity.mode==='cardio'` → keep today's behavior (permanent fallback); else sets×reps as today.
3. **Builder volume switch** — in the exercise row, decide distance-mode by checking `loadRegistry()['Cardio']` membership for the exercise name (reuse `loadRegistry`); render Distância + unit select in place of Sets×Reps. Manual toggle only for free-typed names. The primary path for a carry is adding "Cardio" to its categories in the Exercícios tab (multi-category already supported).
4. **Remove Cardio intensity tab** — drop `['cardio','Cardio']` from the tab array (`:127`) and delete the cardio UI block (`:184-197`). Intensity ⟂ distance from here on.
5. **Legacy normalization** — when a session/block containing `intensity.mode==='cardio'` is edited, move `cardioVal`/`cardioUnit` → `dist`/`distUnit` and clear the cardio intensity. Lazy (on edit/save), never a bulk pass.
6. **Formatter consolidation (#17 half)** — delete the three copies, import canonical from `wod.js`; rewrite Publicador `exLine` on top of them.
7. **Sync all 3 render paths** — verify `2×100m` shows in TV WOD slide, TV timer panel, and Schedule rows.

## Verification
- Local stack (`supabase start` + reseed): build a WOD exercise "Farmer's Carry" with `2×100m` **and** a gender load (M/F 20/12 kg) — confirm dist + intensity coexist; save; confirm it renders `2×100m` volume + `M: 20 / F: 12 kg` pill in **schedule.html**, the **TV WOD slide**, and the **Publicador export**.
- Legacy: keep/seed an exercise with `intensity.mode:'cardio'` (e.g. 500 m) → confirm it still renders `500m`; edit its session → confirm it normalizes to `dist:'500'`/`distUnit:'m'` and the cardio intensity is gone.
- `npm test` green (new `exVolStr` cases). Run `/code-review` before pushing (M item). No `/security-review` needed — pure client render + JSONB, no RLS/auth/user-input surface.
- `npm run build:all` (both builds) succeed.
