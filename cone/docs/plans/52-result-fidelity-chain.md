# 52 — Result fidelity chain (#115 → #118)

> ✅ **Step 1 (#115) Done: 2026-07-27** — see BACKLOG.md.
>
> **The remaining steps were planned in full on 2026-07-28 and now have their own plan files.
> This file is the program record; those four are what a session executes.** Three things changed
> from the outline below — read them before using it:
>
> 1. **A new step appeared: #118 ([plans/53](./53-block-entry-durability.md)), and it runs FIRST.**
>    None of the five logging writers preserves unknown keys on a block entry, so #112's
>    `checkpoint` and #116's `exerciseRows` would be written and then destroyed by the next re-log.
>    The outline below assumed the new fields could simply be added. They cannot.
> 2. **#116 is Lane A, not Lane B.** `ScoreFields` did not exist when this file was written; now it
>    does and is gallery-covered, so a static mockup would be a mirror of shipped UI — see
>    `design/README.md:41-42`.
> 3. **Run order is #118 → #112 → #117 → #116**, with #117 promoted ahead of #116 (it is small and
>    `goalOutcome` needs #112's checkpoint to classify a DNF as `missed`).
>
> | step | item | plan |
> |---|---|---|
> | 1 ✅ | #115 score fields | this file, below |
> | 2 | #118 block-entry durability | [plans/53](./53-block-entry-durability.md) |
> | 3 | #112 DNF checkpoint | [plans/54](./54-dnf-checkpoint.md) |
> | 4 | #117 goal badge | [plans/55](./55-goal-badge.md) |
> | 5 | #116 per-exercise notes | [plans/56](./56-per-exercise-notes.md) |

> Program plan, same shape as [plans/22](./22-athlete-character-stats.md): four steps, each its own
> backlog row and its own plan file at Ready. This file is **step 1 (#115)** at execution depth,
> plus the outline steps 2–4 inherit.
>
> Preflight measured 2026-07-27 → [reviews/115-results-audit.md](../reviews/115-results-audit.md)
> (`node scripts/audit-results.mjs`, read-only, anon).

## Context

The user logs results on a phone right after training. Four things are wrong with that, and three
share one root cause.

**1. The mm:ss mask was built and never rolled out — and prod data is already corrupt.**
`MaskedTimeInput` + `maskMMSS` shipped in #54/C0 with 10 tests; the call sites are two Criador
fields and the gallery, and **zero result-logging forms**. All five logging surfaces use a raw
`type="text" inputMode="numeric"` box.

> ⚠️ **Measured, not theorised: 9 of 16 logged times in prod (56.3%) have no colon.** `toSecs`
> falls through to its single-segment `parseInt` branch and reads them as **raw seconds** —
> `1400` ranks as 23:20, `3600` as 60:00, `1636` as 27:16. The leaderboard is wrong today.

**2. DNF is inferred, never recorded.** Deduced as *"time block + empty `perfTime` + non-empty
`perfRounds`"*. Two consequences:

- `rankResults` (`wod.js:249`) does `toSecs(a.perfTime) - toSecs(b.perfTime)`. For two DNFs that is
  `Infinity - Infinity` = **NaN**, which `Array.sort` treats as equal — **every capped athlete
  ties**, 4 rounds ranking identically to 1.
- The DNF input is gated on `Number(bl.rounds) > 0` (`LogForm.jsx:87`, `LogPane.jsx:231`), and
  **18 of 41 time blocks in prod (43.9%) have no `rounds`** — on those a capped athlete can record
  nothing at all. Prod already holds 2 time-block entries with no score whatsoever.
  `DeskRegPane` has no DNF field on any block; neither does the coach's own `RegistroView`.

**3. Nothing records what an athlete adapted.** One word for the whole block. `deriveScale()`
(`wod.js:78`) already implements per-exercise scaling — *"a block's effective scale is its WEAKEST
per-exercise scale"* — and `blockEntries()` (`resultsHelpers.js:52`) already calls it on every
results and leaderboard row. It reads `blk.exerciseRows`; a repo-wide grep finds **exactly one hit,
the reader itself**. The write side has never existed. The reader is live and armed.

**4. Nothing compares a result against its goal.** `block.goal` shipped with #10 and renders via
`goalStr`, but no code ever reads it back against a score. Only **3 of 294 prod blocks** carry a
goal today (all `kind:'time'`, 2 with results) — so the badge is as much an invitation for the
coach to start filling `Meta:` as it is a feature.

Underneath all of it: **the score fields are hand-copied into five surfaces** —
`results/LogForm.jsx`, `schedule/LogPane.jsx`, `schedule/DeskRegPane.jsx`,
`resultados/RegistroView.jsx`, `tv/ClassPanel.jsx` — and they have already drifted. `DeskRegPane`
lost the DNF field. `ClassPanel` writes `'Rx'`/`'Sc'`/`'Adp'`, not canonical `SCALES`, into the same
slot (0 such rows in prod today — fix at source, no cleanup needed). `resultadosHelpers.js:106`
carries `getPerformanceStr`, a fork of `perfStr` missing the DNF branch, pinned by a test. Three
features × five copies = fifteen implementations. **Consolidate first.**

## Decisions taken (user, 2026-07-27)

1. Extract the shared score fields **before** building any feature.
2. DNF becomes an **explicit checkpoint object**, not an inference.
3. Per-exercise capture is **free text only** — no per-exercise `scale`, so `deriveScale` stays
   dormant and no existing ranking silently re-derives.
4. The badge compares against `block.goal`, with **two marks** — filled for beating the fast end,
   outline for landing inside the range.
5. **MetCon and HIIT become time-scored**, resolving the `isTimeBlock` / `goalKindFor` split.
   Blast radius measured: **1 prod entry** re-ranks.

**On `min == max`:** not needed — leaving *até* blank already means a fixed goal (`goalStr` renders
`min` alone as `14'`, `max` alone as `sub 12'`, `wod.js:143-144`). Both set to `14:00` currently
renders the degenerate `"14–14'"`; step 4 collapses that.

---

## Step 1 — #115 · One score-field component, adopted by all five surfaces

### Acceptance

- One `ScoreInputs`; zero hand-rolled time/rounds/reps inputs left in the five surfaces.
- Every result-logging time input is masked: typing `0`,`9`,`0`,`0` shows `09:00`.
- **A colonless time can no longer be submitted** — see `expandMMSS` below.
- The 9 corrupt prod times are repaired (5 automatically) or explicitly listed for a human call.
- `ClassPanel` writes canonical `SCALES`.
- `getPerformanceStr` is gone; `Results.jsx` no longer hand-rolls the `(DNF)` string.
- `npm test` green, `npm run lint` at **0**, gallery renders every `LogForm` case plus new
  `ScoreFields` cases.

### `expandMMSS` — the gap the mask alone does not close

`maskMMSS` fills **from the right**: `'14'` stays `'14'` (≤2 digits are returned untouched), which
`toSecs` then reads as 14 **seconds**. Prod has exactly this — `14` and `18` on For Time blocks,
where the athlete plainly meant 14 and 18 minutes. So the mask is necessary and not sufficient.

Add **`expandMMSS(v)`** beside `maskMMSS` in `lib/wod.js` — pure, tested, applied **on blur only**:

```
''      → ''          (untouched — empty is still empty)
'9'     → '09:00'     bare digits are MINUTES
'14'    → '14:00'
'1:23'  → '1:23'      anything already carrying a colon is untouched
```

On-blur, not on-change: expanding while typing would fight the right-fill (`1` → `01:00` would make
`1`,`2`,`3` → `1:23` impossible). `ScoreInputs` owns the blur; `MaskedTimeInput` stays a pure mask.

### Build

**`src/public/shared/ScoreFields.jsx`** + `ScoreFields.module.css`. **Client-free by rule** (the
gallery renders it — no Supabase import, direct or transitive), same constraint as `RankList` /
`ExerciseList`. **Icons from `@tabler/icons-react`, never the `ti` webfont** — `leaderboard.html`
does not load it.

Three named exports plus a composed default:

- `ScaleRow` — 4 buttons from canonical `SCALES`, `role="group"` + `aria-pressed`, gold-on-selected.
- `RpeRow` — 1–10 buttons, teal-on-selected.
- **`ScoreInputs`** — the `isTimeBlock` fork, `{ block, value, onChange, disabled }` where `value`
  is the `DEF_INP()` shape. **This is the export steps 2–4 grow**; keep its prop surface deliberate.
- default `ScoreFields` = `RpeRow` + `ScaleRow` + `ScoreInputs`.

Time input inside `ScoreInputs` is `MaskedTimeInput` (+ `expandMMSS` on blur). While in that file,
add `autoComplete="off" autoCorrect="off" spellCheck={false}` to `MaskedTimeInput` — `type="text"`
on iOS otherwise floats the autocorrect bar over a numeric field.

Reuse, don't re-derive: `SCALES` / `isTimeBlock` / `blkColor` from `lib/wod.js`. `blockExercises()`
— the Estações flattener — exists identically in `schedule/LogPane.jsx:11-18` and
`shared/WodBlockCard.jsx`; promote **one** copy into `ScoreFields.jsx` and have both import it
(Estações passes `isWodBlock` but carries `stations[]`, not `exercises[]`).

### Adopt

| Surface | Change |
|---|---|
| `results/LogForm.jsx` | Thin wrapper over `ScoreFields`; its 6 gallery cases must still render. |
| `schedule/LogPane.jsx` | Same; drop the `LOG_SCALES` indirection (`scheduleHelpers.js:6` is already just `SCALES`). |
| `schedule/DeskRegPane.jsx` | Same — **gains the DNF field it never had.** |
| `resultados/RegistroView.jsx` | `ScaleRow` + `ScoreInputs`. **Leave its 10-segment RPE bar alone** — that is #57's call. |
| `tv/ClassPanel.jsx` | `ScaleRow` (kills the `'Rx'/'Sc'/'Adp'` drift at source) + `ScoreInputs` for the manual mm:ss edit, today a bare `<input>` with no `type` and no `inputMode`. |

### Also fold in

- **`scripts/repair-results-time.mjs`** — the 9 corrupt prod times. Mirrors
  `scripts/normalize-session-ids.mjs` exactly: dry-run by default, `--write` applies locally, and
  for prod it **prints the `jsonb_set` UPDATE to paste into the SQL editor** (this repo has no prod
  service-role key; CLAUDE.md's rule is standalone-SQL-then-`migration repair`, never `db push`).
  **Repairs only the unambiguous 4-digit case** (`1400` → `14:00`). The 2-digit values (`14`, `18`)
  and `11.50` are **reported, never auto-written** — `14` could be 14:00 or 00:14 and only the user
  knows which. Guessing here would be the #66 disease in a new place.
- **Delete `getPerformanceStr`** (`resultadosHelpers.js:106-117`) and its pinning test; import
  canonical `perfStr`. Step 2 changes what a DNF renders as, and a knowingly-divergent fork must
  not survive into that.
- Route `Results.jsx`'s two hand-rolled `"N rds (DNF)"` derivations (`doSubmit`, the confirm modal)
  through `perfStr`.
- **No scale-normalization script** — the audit found 0 non-canonical rows. Source fix only.

**No migration anywhere in this chain.** Everything lives inside `results_v2.blocks` (`jsonb`), and
`log_result` passes it through as opaque `p_blocks`.

---

## Steps 2–4 — outline (each gets its own plan file at Ready)

### Step 2 — #112 · DNF checkpoint · **M** · Sonnet

#112 already exists and describes exactly this; it inherits `ScoreInputs`. Additive keys, old rows
keep working via fallback:

```js
{ blockId, blockType, blockLabel, rpe, scale,
  perfTime, perfRounds, perfReps,        // unchanged — still the ranked score
  finished: true|false,                  // NEW, explicit
  checkpoint: {                          // NEW, only when !finished
    roundsDone, roundsTotal,             // roundsTotal snapshots bl.rounds at log time
    exIdx, exName, exReps } }            // exName snapshots too
```

**Snapshot `roundsTotal` and `exName` deliberately** — the coach edits sessions in Criador after
results exist, so a bare `exIdx` would silently point at a different movement. Same reasoning that
already puts `blockType`/`blockLabel` in the entry.

- **Rounds always shown as "X de N"**, no `bl.rounds > 0` gate (43.9% of prod time blocks fail it).
  Where the coach set no rounds, N falls back to 1 — a chipper is one round — and the checkpoint
  carries the signal. `finished` is `roundsDone === roundsTotal`: the *"2/2 means completed as
  prescribed"* standard.
- **`perfReps` is auto-derived from the checkpoint, not replaced by it.** New pure
  `repsBefore(bl, exIdx)` in `wod.js`: rep counts of the exercises preceding `exIdx`, plus
  `exReps`. Returns **`null`** whenever any preceding exercise's `reps` is not a plain integer —
  common, since real prod reps are `21-15-9`, `10-9-8-7`, `15,12,9`, and dist/cal exercises carry
  none. On `null` the field stays manual. **Never guess a number** (the #66 failure mode).
  `perfReps` keeps its meaning as partial-round reps; it is *not* repurposed to total reps, because
  `rankResults` sorts on it.
- **Fix the NaN tie.** Compare `toSecs` with `!==` before subtracting; when both are `Infinity`,
  order by `roundsDone → exIdx → exReps`, falling back to `perfRounds` for legacy rows.
  `wod.test.js` has **no DNF-ordering test and none for `perfStr`'s `"N rds (DNF)"` branch** — add
  both; they are this step's regression net.
- `perfStr` gains the reps (`3 rds + 7 (DNF)`), short enough for the TV wall; the exercise name
  renders only in the results/leaderboard detail row.

### Step 3 — #116 (new) · Per-exercise adaptation notes · **M** · Sonnet · **Lane B**

Net-new surface ⇒ Lane B: ASCII sketch → preview card in `cone/design/` → DesignSync →
**user approval gate** → build → gallery entry.

- Revealed only when the athlete picks a scale other than **RX**. Rows from `blockExercises(bl)`.
- Each row is a **toggle plus a text field revealed only when toggled**, not N open boxes — most
  athletes scale one or two movements, and eight free-text fields on a phone after a workout is how
  a field goes permanently empty.
- Written to **`exerciseRows: [{ exId, name, note }]`** — the dormant slot `deriveScale` reads.
  **No `scale` key** (decision 3), so `deriveScale` keeps falling through to flat `blk.scale` and
  nothing re-ranks on ship day.
- Ships with `scripts/audit-result-notes.mjs` reporting distinct note values from prod, so the
  structured vocabulary is **derived from real data** — the method #94 used to take registry
  misses 58.5% → 11.9%.
- **Cross-link:** third feature wanting `exerciseRows`. #64 wants `{load, loadUnit}` on the same
  rows, #112 wants reps. Keyed by `exId` and additive so #64 extends rather than re-revives it;
  #39 (coach-prescribed adaptations) is the mirror surface — one vocabulary, not two.

### Step 4 — #117 (new) · Goal badge · **S→M** · Sonnet

- New pure `goalOutcome(entry, bl)` in `lib/wod.js` → `'beat' | 'met' | 'missed' | null`. `null`
  whenever it cannot honestly judge: no goal, `kind:'text'`, no logged score.
  - **time, both ends:** `t < min` → beat · `t <= max` → met · else missed.
  - **time, one end:** `t <= min` (or `<= max` for `sub 12'`) → beat. No window, so no `met`.
  - **rounds:** `(roundsDone, perfReps)` compared lexicographically against `(goal.min, goal.reps)`.
  - A DNF is `missed`, never `null` — a judgement, not an absence.
- **Two marks** (decision 4): filled `IconTargetArrow` = beat, outline `IconTarget` = met, from
  `@tabler/icons-react`.
- Rendered in `RankList` (`blockEntries` / `entriesFor` gain a `bl` parameter and shape one new
  field), in the results success modal, and on the TV podium (`tv/slides.jsx` is a separate render
  path by design, same rule as `ExerciseList`).
- **Add MetCon + HIIT to `isTimeBlock`** (`wod.js:95`) so `goalKindFor`'s existing `'time'` mapping
  stops lying. **1 prod entry re-ranks** (measured) — small enough to fold in here, but say so in
  the commit.
- Fix `goalStr`'s degenerate `min === max` → render the single value (`14'`).

## Files

**New:** `src/public/shared/ScoreFields.jsx` + `.module.css` · `scripts/audit-results.mjs` (done) ·
`scripts/repair-results-time.mjs`

**Core (steps 2–4):** `src/public/lib/wod.js` (`expandMMSS`, `rankResults`, `perfStr`,
`isTimeBlock`, `goalStr`, new `repsBefore` / `goalOutcome`) · `src/public/lib/wod.test.js`

**Adopting surfaces:** `results/LogForm.jsx` · `schedule/LogPane.jsx` · `schedule/DeskRegPane.jsx` ·
`components/tabs/resultados/RegistroView.jsx` · `components/tabs/tv/ClassPanel.jsx`

**Downstream:** `results/{Results.jsx,resultsHelpers.js,LoggedResult.jsx}` ·
`leaderboard/Leaderboard.jsx` · `resultados/{resultadosHelpers.js,LeaderboardView.jsx}` ·
`shared/RankList.jsx` · `tv/slides.jsx`

**Gallery (part of Done):** `gallery/fixtures.js` — the three `rcInp*` fixtures are literally
`DEF_INP()`-shaped, so **any new field must be added to all three** or the cases render `undefined`
· `groups/results.jsx` · `groups/shared.jsx` · then `npm run design:cards` + commit the cards.

## Verification

Per step: `npm test`, `npm run lint` (floor **0**), `npm run build:all`, and a live drive.

- **Step 1 mask, at 390px:** on `results.html` type `0`,`9`,`0`,`0` into Tempo → `09:00`, without
  touching a `:` key. Type `1`,`4` and blur → `14:00`. Log it, reopen — the value round-trips.
  Repeat on `schedule.html` (LogPane and DeskRegPane) and in the SPA Registro view.
- **Step 1 five-surface parity:** log the same block from all five surfaces; every row carries the
  same field set and a scale that colours in `RankList` and matches in `ScaleFilter`.
- **Step 1 repair:** re-run `node scripts/audit-results.mjs` after applying the printed SQL — the
  4-digit malformed count reaches 0 and the ambiguous ones are listed for a decision.
- **Step 2 ranking:** two athletes capped on one For Time block, 4 rounds vs 1. They must order
  4-then-1 in `RankList` and on the leaderboard — today they tie. Assert in `wod.test.js` first.
- **Step 2 no-rounds block:** a For Time block with `bl.rounds` unset — the rounds field must be
  present (it isn't today) and a checkpoint recordable.
- **Step 3:** gallery review of every state across **4 themes × 390px and 1280px** before the cards
  regenerate.
- **Step 4:** a block with `Meta: 11–12'` and results at 10:45 / 11:30 / 12:40 → filled icon /
  outline icon / nothing. Confirm they render on `leaderboard.html`, which does **not** load the
  `ti` webfont.

Model: Opus (step 1 + this program) · Sonnet (steps 2–4) · Size: step 1 **M**, program **L**
