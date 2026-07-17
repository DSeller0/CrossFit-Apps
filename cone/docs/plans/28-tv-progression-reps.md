# 28 — TV wall loses the rep scheme on progression exercises (#72)

> ✅ Done: `2d7c119`

Backlog: **#72** (Icebox → Ready). From the 2026-07-16 full pass — architecture invariant 3 ("three render paths stay in sync") FAILs in 4 places.

## Context

**The headline (🟡).** The shared `ExerciseList` — which **both** TV render paths use (WOD slide `BlockCard` and the TimerSlide right panel) — computes each exercise's volume via `exVolStr(ex)` (`wod.js:68-81`), and `exVolStr` reads **only `ex.reps`**. For a **progression** exercise whose reps live only in `intensity.steps[].reps` (not on the top-level `ex.reps`), `exVolStr` returns `''`, so `{vol && …}` (`ExerciseList.jsx:49`) renders **nothing** — the wall shows just the loads (`"60/70/80 % RM"` from `fmtIntensity`) with **no rep scheme at all**. Meanwhile the schedule's `ExRow` renders the same exercise *with* reps, because it groups via `progGroups` / `groupProgressionSteps` (`wod.js:88-97`), which reads `s.reps || ex.reps`. **The gym wall drops the rep scheme the schedule shows.** This is a real content loss on the display used live during every class — not the recorded Estações flatten decision.

**The 3 🔵 minors (fold in while in these files):**
1. `bl.rounds` / `bl.duration` render on `BlockCard` (`slides.jsx:131,138`) but **not** on the TimerSlide right panel (`:253-260`) — an AMRAP shows "3 rds" on the WOD slide, nothing on the timer slide.
2. `_station` is computed-and-discarded — `slides.jsx:129` attaches it; `ExerciseList` never reads it; TimerSlide's flatten (`:185`) doesn't attach it. Dead data.
3. Empty WOD blocks are filtered from WodSlide (`slides.jsx:75`) but **not** from the TimerSlide group map (`:194`).

## Acceptance

- A progression exercise whose reps live only in `intensity.steps[].reps` renders a glanceable rep scheme on **both** TV paths (WOD slide + TimerSlide panel), alongside its `% RM` loads.
- The schedule's grouped `ExRow` rendering of the same exercise is **byte-unchanged**.
- The three 🔵 minors are resolved (or, if any is deferred, a one-line note says why).
- The recorded **Estações flatten** decision (TV shows one flat exercise list) stays intact.

## Files

- `src/public/lib/wod.js:68-81` (`exVolStr`) and `:88-97` (`groupProgressionSteps`) — the divergence source.
- `src/public/shared/ExerciseList.jsx:43-52` — the TV volume render (`const vol = exVolStr(ex)` → `{vol && …}`).
- `src/public/tv/slides.jsx` — the two TV paths; minors at `:75` vs `:194`, `:129`, `:131,138` vs `:253-260`.
- `src/public/gallery/Gallery.jsx` — the `ExerciseList` progression fixture (ensure one variant has reps only in `intensity.steps[].reps`, so the fix is visible in the gallery at `compact` + `large`).
- `src/public/lib/wod.test.js` — add coverage for the progression-reps case in `exVolStr` (see below).

## Approach

1. **Design call (small — state it in this file):** the wall's rep rendering for a multi-step progression should be a **single glanceable line**, not `ExRow`'s multi-line grouped treatment. Reuse `groupProgressionSteps` to surface the distinct rep scheme (e.g. `5×5` when uniform, or a `5-3-1` ladder when steps differ). Decide the exact string form and record it.
2. **Fix canonically.** Teach `exVolStr` to fall back to progression-step reps when `ex.reps` is empty and `ex.intensity?.mode === 'progression'` (delegating to `groupProgressionSteps`, or a tiny shared helper `exVolStr` calls) — keeping it a pure formatter with no new import cycle (`groupProgressionSteps` is in the same module). **Verify this does not alter `ExRow`:** `ExRow` builds its progression reps from its own `progGroups` path (`ExRow.jsx:84-91`), not from `exVolStr` (except the `dist` case, which is unaffected), so only `ExerciseList`/TV output changes.
3. **Fold in the minors** in the same files: attach `rounds`/`duration` to the TimerSlide panel (`:253-260`) to match `BlockCard`; drop the dead `_station` attach (`:129`); apply the empty-WOD-block filter to the TimerSlide group map (`:194`) to match WodSlide (`:75`).
4. Update/confirm the gallery progression fixture and re-run `npm run design:cards` (Lane A ends with regenerate + sync) so the Design cards reflect the changed `ExerciseList`.

## Verification

Local stack + Playwright:
- Build a session with a progression block whose reps live **only** in `intensity.steps[].reps`; on `tv.html` confirm the WOD slide **and** the TimerSlide panel both show the rep scheme + `% RM`.
- Confirm the same exercise on `schedule.html` renders byte-unchanged (screenshot diff).
- Confirm the AMRAP `rounds`/`duration` now shows on the TimerSlide panel; confirm an empty WOD block no longer appears in the TimerSlide group map.
- Check the gallery `ExerciseList` progression fixture at `compact` and `large` across all 4 themes.
- `npm test` (with the new `exVolStr` progression case) + `npm run build:all` green.

Model: Sonnet · Size: S–M

## Outcome (shipped 2026-07-17)

- **Design call, recorded:** `exVolStr` now falls back to `groupProgressionSteps(ex)` when `ex.reps` is empty and `intensity.mode==='progression'`. One group (uniform reps across steps) → `${steps.length}×${reps}` (e.g. `3×5`), or just `reps` when there's a single step. Multiple groups (reps vary per step) → dash-joined ladder, e.g. `5-3-1`. Loads still render separately via `fmtIntensity`.
- Verified live against the local stack (a temp session with a `Front Squat` progression exercise, reps only in `intensity.steps[].reps`, no top-level `ex.reps`): `tv.html`'s WOD slide and TimerSlide right panel both show `3×5 FRONT SQUAT · 60/70/80% RM`; `schedule.html`'s `ExRow` renders the same exercise unchanged (`5 FRONT SQUAT · 60/70/80% RM`, single row since its own `progGroups` path was untouched). Test data was removed afterward.
- All three minors fixed as scoped: TimerSlide panel now shows `rounds`/`duration` meta (added `.timerBlockHdr` flex layout + `bMeta` in `slides.jsx`); dead `_station` attach removed from `BlockCard`'s Estações flatten; TimerSlide's `allWodBlocks` now filters empty blocks like `WodSlide` does.
- Gallery: added `exProgStepsOnly` ("Front Squat", reps only in steps) as its own case ("Progressão · reps só em steps") plus folded into the `size='large'` case, alongside the pre-existing `exProg` fixture (which keeps its top-level `reps`/`sets` and is unaffected).
- `npm test` (150 passed, incl. 6 new `exVolStr` progression cases) and `npm run build:all` green. `npm run design:cards` regenerated all 5 generated cards — `shared.html` for this change, plus `leaderboard`/`me`/`results`/`schedule` which had pre-existing unrelated drift (a `Results` CSS module rule) picked up by the same regen — all synced to DesignSync.
