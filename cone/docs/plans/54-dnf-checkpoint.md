# 54 — #112 · DNF checkpoint (where the athlete actually landed)

> ✅ Done: e6b5764 · 2026-07-29 — see BACKLOG.md "Ready" for the shipped summary.

> Step 3 of the **result fidelity chain** ([plans/52](./52-result-fidelity-chain.md)).
> Run order: #115 ✅ → #118 ([plans/53](./53-block-entry-durability.md)) → **#112 (this)** → #117 → #116.
> ⚠️ **Blocked on #118.** Without it the `checkpoint` written here is destroyed by the next re-log
> from any other surface — measured, not theoretical. Do not start this before 53 has landed.

## Context

DNF is inferred today and never recorded: *"time block + empty `perfTime` + non-empty
`perfRounds`"*. There is no DNF flag in the schema or the code. Two measured consequences:

- **`rankResults` ties every capped athlete.** `wod.js:285` does
  `toSecs(a.perfTime) - toSecs(b.perfTime)`; for two DNFs that is `Infinity - Infinity` = **NaN**,
  which `Array.sort` treats as equal. So 4 rounds ranks identically to 1 round, and the
  `perfRounds` the form already captures feeds display and nothing else.
- **On most blocks a capped athlete can record nothing at all.** The DNF input is gated on
  `Number(bl.rounds) > 0`, and **18 of 41 prod time blocks (43.9%) have no `rounds`**
  ([reviews/115-results-audit.md](../reviews/115-results-audit.md)). Prod already holds 2
  time-block entries with no score whatsoever.

The user's original ask: *"a For Time with 4 exercises — you can DNF with 3 rounds and finishing 3
out of the 4 from the last round; or in an AMRAP, how much of an exercise you completed before
time (reps can then be auto calculated)."*

## Decisions (user, 2026-07-28)

- **One component, two labellings — not two shapes.** An AMRAP has no DNF: everyone stops at the
  cap, so every AMRAP result is "finished" and the checkpoint is merely *where you were*. A For
  Time checkpoint exists precisely *because* you didn't finish. Same stored shape, wording driven
  by `isTimeBlock`: For Time reads **"Não terminei" / "Rounds completos de N"**, AMRAP reads
  **"Onde parou"**. `finished` is only meaningful on the time branch.
- **Revealed by a toggle**, not always visible and not inferred from an empty time field. Most
  results are finished and must stay as fast to log as today; and inference is the thing this item
  exists to remove — an empty Tempo means "hasn't typed it yet" just as often as "capped".

## Data shape (additive — no migration)

```js
{ blockId, blockType, blockLabel, rpe, scale,
  perfTime, perfRounds, perfReps,   // unchanged — still what rankResults sorts on
  finished: true|false,             // time blocks only; AMRAP is always finished
  checkpoint: {                     // present only when there is one
    roundsDone, roundsTotal,        // roundsTotal SNAPSHOTS bl.rounds at log time
    exIdx, exName, exReps } }       // exName snapshots too
```

**Snapshot `roundsTotal` and `exName` deliberately.** The coach edits sessions in Criador after
results exist, so a bare `exIdx` would silently point at a different movement later. Same reasoning
that already puts `blockType`/`blockLabel` on the entry.

## Acceptance

- Rounds render as **"X de N"** with the `bl.rounds > 0` gate gone; N falls back to **1** where the
  coach set none (a chipper is one round). `finished === (roundsDone === roundsTotal)` — the
  *"2/2 means completed as prescribed"* standard the user asked for.
- **`rankResults` no longer ties DNFs.** Compare `toSecs` with `!==` before subtracting; when both
  are `Infinity`, order by `roundsDone → exIdx → exReps`, falling back to `perfRounds` for legacy
  rows that have no checkpoint.
- **`perfReps` is derived, never guessed.** New pure `repsBefore(bl, exIdx)` in `wod.js` sums the
  rep counts of the exercises preceding `exIdx` and adds `exReps`. It returns **`null`** whenever
  any preceding exercise's `reps` is not a plain integer — real prod reps are `21-15-9`,
  `10-9-8-7`, `15,12,9`, and dist/cal exercises carry none. On `null` the field stays manual.
  Fabricating a number that reads as data is the `energy_level`/#66 failure mode.
  ⚠️ **`perfReps` keeps its current meaning (partial-round reps) and is NOT repurposed to total
  reps** — `rankResults` sorts on it.
- `perfStr` renders the checkpoint (`3 rds + 7 (DNF)`), short enough for the TV wall. The exercise
  *name* appears only in the results/leaderboard detail row, not in the ranked string.
- **`fmtDeskPerf` is deleted.** `scheduleHelpers.js:52-59` is a fourth perf renderer with **no DNF
  branch at all** and casing drift (`Rds`/`Reps` vs canonical `rds`/`reps`). Its three consumers —
  `schedule/BlockDetail.jsx:52`, `schedule/LogPane.jsx:79`, `schedule/DeskRegPane.jsx:31` — move to
  canonical `perfStr`. Same fork-collapse #115 did for `getPerformanceStr`; do not leave a second
  one alive going into a change of what a DNF renders as.
- `wod.test.js` gains the two tests it has **never** had: DNF ordering, and `perfStr`'s
  `"N rds (DNF)"` branch (only the empty case is currently asserted, `:290`).
- `npm test` green · lint **0** · `format:check` clean · `build:all` clean.

## Files

`src/public/lib/wod.js` (`rankResults`, `perfStr`, new `repsBefore`) · `src/public/lib/wod.test.js`
· `src/public/shared/ScoreFields.jsx` + `.module.css` — the checkpoint UI belongs in `ScoreInputs`,
whose header already records that it is the export that grows here ·
`src/public/lib/resultEntry.js` (`ATHLETE_KEYS` gains `finished`/`checkpoint` — #118 must have
landed) · `src/public/schedule/scheduleHelpers.js` (delete `fmtDeskPerf`) + its 3 consumers ·
`src/public/results/resultsHelpers.js` (`DEF_INP`) · `src/public/results/LoggedResult.jsx` (where
the athlete reads the checkpoint back) · gallery `fixtures.js` + `groups/{results,shared}.jsx`,
then `npm run design:cards`.

⚠️ **`RankList.module.css:59` `.perf` is `flex: 0 0 108px`, sized off `"4 rds (DNF)"`** (its comment
says so). `"3 rds + 7 (DNF)"` is longer — re-check that basis and the `size="large"` 128px variant
(`:97`), and the `@container (max-width:400px)` two-line branch where `.perf` becomes `flex:0 0 auto`.

⚠️ **Fixtures:** `gallery/fixtures.js`'s three `rcInp*` are literally `DEF_INP()`-shaped, so a new
field must be added to **all three** or those cases render `undefined`. `rcBrDNF` is the fixture to
grow a `checkpoint` on.

## Estações — explicitly out of scope

`isTimeBlock('Estações')` is false and the type has no `rounds`, so it takes the rounds/reps branch
and gets no checkpoint. `blockExercises()` does flatten its stations, but **loses which station an
exercise belonged to**, so a checkpoint there could not say "station 3, exercise 2". Record the gap;
do not half-build it.

## Verification

- **Ranking, asserted in `wod.test.js` first, then live:** two athletes capped on one For Time
  block, 4 rounds vs 1 — they must order 4-then-1 in `RankList` and on the leaderboard. Today they
  tie.
- **A For Time block with `bl.rounds` unset:** the rounds field must be present (it is hidden
  today) and a checkpoint recordable.
- **An AMRAP:** the toggle reads "Onde parou", the word DNF never appears, and `finished` is not
  written.
- **A block whose exercises have non-integer reps (`21-15-9`):** `perfReps` stays a manual field,
  no number is invented.
- **Durability, re-verifying #118:** log a checkpoint on `results.html`, then save that athlete's
  session from the SPA Registro view without touching it — the checkpoint must survive.
- Gallery: every `ScoreFields` case across **4 themes × 390 and 1280**.

Model: Sonnet · Size: M
