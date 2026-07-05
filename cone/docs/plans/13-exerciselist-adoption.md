# 13 — ExerciseList adoption in Schedule + Estações reconciliation (#17)

> **2026-07-05 session note:** shipped via **Path B**, not Path A. Reading `ExerciseList.jsx`/`.module.css` next to `Schedule.jsx`'s `ExRow`/`Schedule.module.css` confirmed a bigger structural mismatch than expected: TV's component is a read-only, big-font (22-42px) wall-display renderer (dot + plain-text vol/name/ins) while Schedule's row is a dense interactive control (checkbox/round-counter leading slot, small 11-14px pill badges, RM chip + inline editor, Demo button, space-between header) on a wholly separate CSS module. True slot-based adoption would mean building a parallel CSS variant inside `ExerciseList` for a *zero visible change* outcome, on a page used live at the gym — not worth the regression risk this session. Shipped the two concrete Path-B consolidations (dist formatter, progression-grouping) plus the Estações decision; see BACKLOG.md's Done entry. The markup-slot work in Approach/Path A below remains open under #17. Not marked `✅ Done` since the plan's core acceptance (actual `ExerciseList` adoption) isn't met.

## Context
`src/public/shared/ExerciseList.jsx` is the shared exercise-row component; TV uses it on both render paths (BlockCard + TimerSlide, via `slides.jsx`). `Schedule.jsx` still hand-rolls its own rows (`ExRow`, `Schedule.jsx:326+`) — the last documented half of #17 (the `fmtIntensity`/`exVolStr` formatter half already shipped in #37, so only the *markup* adoption remains). Surfaced again in [reviews/2026-07-05-full-pass.md](../reviews/2026-07-05-full-pass.md) dim 4.

**Reality check the 2026-07-05 review found — #17 is not S.** `ExerciseList` is a **read-only, compact** renderer (dot · vol · name · intensity · note; handles complex + `exVolStr` dist). Schedule's `ExRow` is **interactive and much richer**: per-exercise check-off / `RdCounter` rounds, an RM chip + inline RM input + `Math.ceil` load calc, a Demo button, `toTitleCase` names, and **progression-step expansion** (one `progression` exercise fans out into grouped rows by reps, `Schedule.jsx:396-401`). A drop-in swap would silently delete all of that. So the row's **size is S → M** (recorded as a #17 correction).

Two concrete sub-findings from the review to fold in here:
- ⚪ **Duplicated dist formatter** at `Schedule.jsx:401` — a bespoke `ex.dist?...` string that is byte-identical to `exVolStr`'s dist branch but won't track a future `exVolStr` change.
- ⚪ **Estações render divergence** — Schedule preserves station structure (header + grouped exercises, `Schedule.jsx:507-516`) while TV flattens stations into a flat exercise list. Display-only; needs a *decision*, not necessarily a code change.

Model: Sonnet · Size: M

## Acceptance
- Schedule's exercise rows render through the shared `ExerciseList` (or a shared row primitive it exposes) **without losing** any current affordance: check-off/rounds, RM chip + input + calc, Demo, progression-step expansion, `toTitleCase`.
- The bespoke dist formatter at `Schedule.jsx:401` is gone — dist comes from `exVolStr` (single source).
- The 3 render paths (TV BlockCard, TV TimerSlide, Schedule rows) stay visually consistent for standard, complex, and cardio-distance exercises — verified by eye, not just by tests.
- Estações: either TV renders station structure too, **or** the flattening is recorded as an intentional decision (Decisions-recorded + a code comment at the flatten site) — not left as silent drift.

## Files
- [src/public/shared/ExerciseList.jsx](../../src/public/shared/ExerciseList.jsx) — the shared component to extend (currently read-only; 60 lines).
- [src/public/shared/ExerciseList.module.css](../../src/public/shared/ExerciseList.module.css) — shared row styles.
- [src/public/schedule/Schedule.jsx](../../src/public/schedule/Schedule.jsx) — `ExRow` (`:326`), station rendering (`:507-517`), the dist dup (`:401`), progression grouping (`:396-401`).
- [src/public/tv/slides.jsx](../../src/public/tv/slides.jsx) — the Estações flatten site (confirm exact line; the old `TV.jsx:132-133` ref moved here in the #41 slide extraction).

## Approach
**Path A (recommended — true adoption).** Extend `ExerciseList` to accept **optional slots** for the interactive bits, so Schedule reuses the shared row markup instead of duplicating it:
1. Add optional render-prop / children props to `ExerciseList`: a `leading` slot (check / `RdCounter`), a `trailing` slot (RM chip + Demo), an optional inline-RM-editor slot, and a `titleCase` flag. When no slots are passed (TV), it renders exactly as today.
2. Move progression-step expansion into a shared helper (it's pure: `steps → groups by reps`) so both a future shared renderer and Schedule use one implementation; delete the bespoke dist formatter at `:401` in favour of `exVolStr`.
3. Rewrite Schedule's `ExRow` as a thin wrapper that passes its interactive controls into the shared component's slots.
4. Estações: decide TV-flatten vs structure. Recommendation — **keep TV flat** (glanceable wall display) and record it as an intentional decision + a one-line comment at the flatten site; make Schedule's station header the canonical structured view. (If instead we want parity, teach `ExerciseList`/its caller to group by station.)

**Path B (fallback if Path A balloons).** Ship only the two concrete consolidations — kill the `:401` dist dup (use `exVolStr`) and settle the Estações decision — and leave `ExRow` interactive-but-unshared, keeping #17 open for the slot refactor. Smaller, but doesn't retire the markup duplication.

Reuse: `exVolStr`/`fmtIntensity` (`wod.js`, already canonical), `ExerciseList` structure/CSS. Do **not** reintroduce a local formatter.

## Verification
- Local stack (`supabase start` + reseed): open **schedule.html** for a day with (a) a standard block, (b) a complex exercise, (c) a progression exercise with multiple rep-groups + an RM set, (d) a cardio/distance exercise, (e) an **Estações** block with a rest station. Confirm every affordance still works: check a row, advance a round, open the RM input and confirm the calc, open Demo, and that progression rows still fan out.
- Cross-check the same exercises on the **TV WOD slide** and **TV timer panel** — identical vol/intensity strings, complex notation, and dist rendering.
- `npm test` green (add a unit test for the extracted progression-grouping helper if one is created). `/code-review` before pushing (M item). No `/security-review` (pure client render, no RLS/auth/user-input surface).
- `npm run build:all` both builds succeed.
