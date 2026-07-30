# 56 — #116 · Per-exercise adaptation notes (what the athlete actually scaled)

> ✅ Done: 527dff5 · 2026-07-30 — see BACKLOG.md "Ready" for the shipped summary. **Result fidelity
> chain complete**: #115 → #118 → #112 → #117 → #116, all shipped.

> Step 5 of the **result fidelity chain** ([plans/52](./52-result-fidelity-chain.md)), and the last.
> Run order: #115 ✅ → #118 ([plans/53](./53-block-entry-durability.md)) →
> #112 ([plans/54](./54-dnf-checkpoint.md)) → #117 ([plans/55](./55-goal-badge.md)) → **#116 (this)**.
> ⚠️ **Blocked on #118** — without it these notes are destroyed by the next re-log. Last in the
> chain because it is the only step whose value depends on athlete adoption.

## Context

Picking "Inter" / "SC" / "Adaptado" stores **one word for the whole block**; nothing records which
movement was changed or how. The user: *"when not doing RX it is not possible to determine what the
athlete adapted. I would leave a text input for each exercise, if the athlete selects any scale
other than RX. Then, after gathering some data, determine if this input can be set instead of free
text."*

That second half is the real design: **capture free text first, derive the vocabulary from it
later** — exactly the method #94 used to take registry misses from 58.5% to 11.9%.

`deriveScale()` (`wod.js:78`) already implements per-exercise scaling — *"a block's effective scale
is its WEAKEST per-exercise scale"* — and `blockEntries()` (`resultsHelpers.js:52`) already calls it
on every results and leaderboard row. It reads `blk.exerciseRows`, and a repo-wide grep finds
**exactly one hit: the reader itself.** The write side has never existed. The reader is live and armed.

## ⚠️ Lane corrected: A, not B

[plans/52](./52-result-fidelity-chain.md) filed this as Lane B (mockup → DesignSync → approval
gate). **That was right when written and is wrong now.** `design/README.md:41-42`:

> Existing UI is **Lane A**: gallery-first, no static mockup. A hand-written card here is only ever
> for something that doesn't exist yet.

`ScoreFields` shipped with #115 and is gallery-covered, so these rows are an addition to an
**existing** component — a hand-written card would be a mirror of shipped UI, which is precisely
what the rule forbids. **Work gallery-first**: build into `ScoreInputs`, review every state in the
real gallery across 4 themes × 390/1280, then `npm run design:cards`. No static mockup, no
approval stall mid-session.

## Decisions

- Rows appear **only when the scale is not RX**. Sourced from `blockExercises(bl)` (`wod.js:228`).
- Each row is a **toggle plus a text field revealed only when toggled** — not N open boxes. Most
  athletes scale one or two movements, and eight free-text fields on a phone after a workout is how
  a field goes permanently empty (the `energy_level`/#66 failure mode arrived at from the other
  direction).
- Stored as **`exerciseRows: [{ exId, name, note }]`** — `name` snapshotted for the same reason
  #112 snapshots `exName`: the coach edits sessions after results exist.
- ⚠️ **No `scale` key on the row** (user decision, 2026-07-27). The moment a row carries a scale,
  `deriveScale` goes live and **every existing ranking, KPI and `ScaleFilter` silently re-derives**,
  because `blockEntries` already calls it on every row. Block-level `scale` stays the single source
  of truth; nothing re-ranks on ship day.
- **Design the row as the superset, once.** This is the third feature wanting `exerciseRows`:
  **#64** wants `{load, loadUnit}` on these same rows for strength blocks
  ([plans/22](./22-athlete-character-stats.md) step 4) and **#112** wants reps. Key by `exId` and
  keep it additive so #64 *extends* the shape rather than re-reviving it. **#39** (coach-prescribed
  adaptations) is the mirror surface — one vocabulary, not two.
- Ships with **`scripts/audit-result-notes.mjs`** (read-only, anon, same shape as
  `scripts/audit-results.mjs`) reporting the distinct note values from prod, so the eventual
  structured vocabulary is derived from real data rather than guessed.

## Acceptance

- A non-RX scale reveals one collapsed row per exercise; toggling a row reveals its text field.
- Nothing is written for untouched rows — an all-empty `exerciseRows` is stored as `undefined`,
  never as an array of hollow objects (same rule `GoalInput` follows for an empty goal).
- `deriveScale`'s behaviour is **unchanged** — verified by rendering a leaderboard before and after
  logging a note and seeing identical scales.
- The note reads back in `LoggedResult` on `results.html`.
- `scripts/audit-result-notes.mjs` runs clean against prod and writes a dated report to
  `docs/reviews/`.
- `npm test` green · lint **0** · `format:check` clean · `build:all` clean.

## Docs to correct — part of Done

Both claims are false, both are load-bearing, and both would mislead the next session:

- **`CLAUDE.md`** (Criador section) — *"It's read in 4 places — `deriveScale()` among them"*.
  Verified 2026-07-28: **one** read site, `wod.js:79`. What actually exists is 1 field read + 4
  files that *call* `deriveScale()` (`LeaderboardView.jsx`, `leaderboard/Leaderboard.jsx`,
  `results/resultsHelpers.js`, `me/Me.jsx`). The distinction matters: only `deriveScale` lights up
  for free; everything else is net-new UI.
- **[plans/22](./22-athlete-character-stats.md) `:82`** — *"a schema slot 4 read-sites already
  understand, so no migration and no new column"*. The **no-migration half is true**
  (`results_v2.blocks` is `jsonb`); the read-site half overstates the free lunch.

## Files

`src/public/shared/ScoreFields.jsx` + `.module.css` · `src/public/lib/resultEntry.js`
(`ATHLETE_KEYS` gains `exerciseRows` — #118 must have landed) ·
`src/public/results/resultsHelpers.js` (`DEF_INP`) · `src/public/results/LoggedResult.jsx` ·
**new** `scripts/audit-result-notes.mjs` · gallery `fixtures.js` + `groups/{results,shared}.jsx`,
then `npm run design:cards` · `CLAUDE.md` · `docs/plans/22-athlete-character-stats.md`.

⚠️ **Two of the five surfaces show no exercise list for an Estações block**, because they read
`bl.exercises` **directly** instead of `blockExercises(bl)`: `results/WodSummary.jsx:36` and
`resultados/RegistroView.jsx:610`. The notes rows themselves will work (they source from
`blockExercises`), but the WOD rendered above them is empty there. **Decide in-session**: either fix
those two reads (small, and it fixes a pre-existing display gap) or scope Estações out explicitly.

⚠️ **Fixtures:** the three `rcInp*` are `DEF_INP()`-shaped — a new field must be added to all three
or those gallery cases render `undefined`. `rcBrAmrap`/`rcInpAmrap` are the ones to grow rows on.

## Verification

Gallery, every state, **4 themes × 390 and 1280**: RX (no rows) · non-RX with rows collapsed · one
row toggled · many toggled · a long exercise name (truncation) · an Estações block (flattened
list) · a block with no exercises at all.

Then end-to-end on real data:

1. Log a non-RX result on `results.html` with a note on one movement; re-open it and confirm the
   note reads back in `LoggedResult`.
2. Open the leaderboard for that block — the athlete's **scale badge must be unchanged** (proving
   `deriveScale` stayed dormant).
3. Save that athlete's session from the SPA Registro view without touching it — **the note must
   survive** (#118's guarantee, re-verified at the point it finally matters).
4. Run `node scripts/audit-result-notes.mjs` and check the report reflects what was just logged.

Model: Sonnet · Size: M
