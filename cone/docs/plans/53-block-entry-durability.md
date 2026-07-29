# 53 — #118 · Block-entry durability (the five writers preserve unknown keys)

> Step 2 of the **result fidelity chain** ([plans/52](./52-result-fidelity-chain.md)), and a
> **hard prerequisite** for #112 (plans/54) and #116 (plans/56).
> Run order: #115 ✅ → **#118 (this)** → #112 → #117 → #116.

## Context

Found while planning #112/#116 (2026-07-28), and it invalidates a premise of both: **not one of the
five logging surfaces preserves unknown keys on a block entry.** Every writer builds a fresh object
literal with a fixed key whitelist, so a `checkpoint` or `exerciseRows` written by an athlete is
silently destroyed by the next re-log from any other surface. Adding those fields before this lands
would ship a feature that quietly deletes its own data.

`results_v2.blocks` is `jsonb` and `log_result` passes it through as opaque `p_blocks` — **the
database will carry any key. The JS is what drops it.**

| Surface | Builds | Spreads existing? | Blast radius on re-log |
|---|---|---|---|
| `results/Results.jsx` `doSubmit` | fresh literal, 8 keys | ❌ | that block |
| `schedule/Schedule.jsx` `submitLog` | fresh literals from `doOpenLog` | ❌ | **every block in `logBlocks`** |
| `schedule/Schedule.jsx` `submitDeskReg` | fresh literal from 5 scalar states | ❌ | that block |
| `resultados/RegistroView.jsx` `saveLog` | fresh literals, **whole-array replace** | ❌ | **every block on the row** |
| `hooks/useLiveRegistration.js` `writeEntry` | fresh literal, 6 keys | ❌ | that block, **+ wipes `rpe`** |

Row-level protection exists (`Results.jsx:343` `{...prev, blocks}` keeps `coachNote`/`flagForReview`;
the merges keep *sibling* blocks). It does not exist at the **within-block key** level. That is
exactly the gap the new fields fall into.

Worst case is `RegistroView.saveLog:212` — `blocks: presence === 'Presente' ? blockLogs : []` — a
wholesale replacement built from `wodBlocks = (selSession.blocks||[]).filter(isWodBlock)`. One coach
save therefore also drops any entry for a **non-WOD** block or for a block since deleted in Criador,
and flipping presence away from `Presente` writes `[]`.

Two traps in the fix:

- ⚠️ **`Schedule.jsx:553` `changeLogAthId` spreads `...b` — the OUTGOING athlete's form entry** —
  and resets only 5 named keys. Add a key naively and **athlete A's data rides into athlete B's
  submission**. Its own comment (`:549-552`) records this leak being fixed once already for
  rpe/scale/perfTime.
- ⚠️ **`useLiveRegistration.js:41` hardcodes `rpe: null`** — TV registration already destroys a
  logged RPE today. Same bug class, shipping now; this item fixes it.

The read side is already permissive: `blockEntries` (`resultsHelpers.js:47`) does `...br`, so
anything persisted reaches `RankList` and the KPI grid with no further work.

Same family as #76/#109/#111 (a path that should preserve state and doesn't) — see CLAUDE.md's
"A load/read path never writes" note, which this extends to "a write path never truncates".

## Acceptance

- Every block-entry writer **spreads the persisted entry** before overriding the fields it owns.
- `RegistroView.saveLog` **merges** into the existing blocks array; entries for non-WOD blocks and
  for blocks deleted from the session survive a coach save, and a presence change no longer
  discards them.
- `changeLogAthId` resets **every athlete-scoped key** from one declared list — no `...b`
  carry-over, and adding a future key without adding it there is not silently possible.
- `useLiveRegistration.writeEntry` preserves `rpe` and every other existing key.
- Tests prove an unknown key survives the merge shape each writer uses.
- `npm test` green · `npm run lint` at **0** · `npm run format:check` clean · `build:all` clean.
- **No behavior change beyond durability.** This item adds no field and no UI.

## Files

**New:** `src/public/lib/resultEntry.js` + `resultEntry.test.js`

**Writers:** `src/public/results/Results.jsx` (`doSubmit`, `startEdit`) ·
`src/public/schedule/Schedule.jsx` (`doOpenLog`, `changeLogAthId`, `submitLog`, `submitDeskReg`) ·
`src/components/tabs/resultados/RegistroView.jsx` (blockLogs init + `saveLog`) ·
`src/hooks/useLiveRegistration.js` (`writeEntry`)

## Approach

**`src/public/lib/resultEntry.js`** — pure, **client-free** (no Supabase import, direct or
transitive), importable from both `src/public/` and `src/components/`. Same convention as
`wod.js` / `sessions.js` / `goals.js`; it is result-domain, which is why it isn't in `wod.js`.

- **`ATHLETE_KEYS`** — the one list of keys that belong to *one athlete's performance*:
  `rpe`, `scale`, `perfTime`, `perfRounds`, `perfReps` today; `finished`/`checkpoint` arrive with
  #112 and `exerciseRows` with #116. **Declaring it once is the whole point** — `changeLogAthId`
  clears from this list, so a future field is added in one place and every reset site follows.
- **`mergeBlockEntry(prev, patch)`** — `{ ...prev, ...patch }`, with the identity fields
  (`blockId`/`blockType`/`blockLabel`) always taken from `patch` so a renamed or retyped block
  re-labels correctly. One helper, five call sites.
- **`clearAthleteKeys(entry)`** — returns the entry with every `ATHLETE_KEYS` field reset to its
  empty value. This is what `changeLogAthId` uses instead of listing five keys inline.

Per surface:

- **`Results.jsx`** — `doSubmit` looks up the previous entry for that `blockId` and builds
  `mergeBlockEntry(prevEntry, {...})`. `startEdit` (`:271`) currently cherry-picks 5 keys into form
  state; it must carry the whole entry so nothing is lost between edit and re-submit.
- **`Schedule.jsx`** — `doOpenLog` (`:516`) carries `...eb` into each form block;
  `changeLogAthId` (`:553`) uses `clearAthleteKeys` then applies the incoming athlete's entry;
  `submitLog` and `submitDeskReg` build via `mergeBlockEntry`.
- **`DeskRegPane` path** — the one that isn't a one-liner: the pane holds **5 scalar `useState`s,
  not an object**, so there is nowhere for an unknown key to live. `Schedule.jsx` stashes the
  persisted entry (a `deskRegPrev` state, set in `deskOpenReg` `:640`) and spreads it at submit.
- **`RegistroView.jsx`** — init spreads `...eb`; `saveLog` merges its `blockLogs` into
  `existing.blocks` (replacing matched `blockId`s, keeping the rest) instead of assigning the array,
  and stops writing `[]` on a presence change — the blocks stay, presence records the absence.
- **`useLiveRegistration.js`** — `writeEntry` already re-reads `existing` from the DB (`:28-34`);
  spread the matched entry and drop the `rpe: null`.

**Tests** (`resultEntry.test.js`): `mergeBlockEntry` preserves unknown keys · identity fields always
come from the patch · `clearAthleteKeys` clears every declared key and nothing else · a fixture
entry carrying an unknown key survives each writer's merge shape.

## Verification

Unit tests are the net, but the RPE clobber is observable today — drive it:

1. Log a result on `results.html` with **RPE 8** on a For Time block.
2. In the SPA TV controller, register that athlete live on the same block.
3. Re-open `results.html` — **RPE 8 must still be there.** Today it is `null`.
4. Open the coach's Registro view for that athlete/session, change nothing, save. Every field must
   survive; today the whole blocks array is rewritten from 8-key literals.
5. Add a second WOD block to the session in Criador, log both, then re-log only the first from
   `schedule.html` — the second must be untouched.
6. Set presence to `Ausente` and back to `Presente` in the SPA — the logged blocks must still exist.

Model: Sonnet · Size: S→M
