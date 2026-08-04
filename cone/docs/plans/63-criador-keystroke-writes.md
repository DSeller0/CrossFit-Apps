# 63 — #139 + #140 · Criador inputs that rewrite what the coach typed, per keystroke

> ✅ Done: `<commit>` · 2026-08-04 — see BACKLOG.md
>
> Planned + executed 2026-08-04 in one session (S), alongside the plan files for 64–66.
>
> **Shipped as planned. Both #139 fixes landed** (they are complements, not alternatives — that
> finding held up): `normalizeGoal`/`normalizeBlockGoals` in `blockModel.js` applied last in
> `saveS`'s existing `materializeBlocks(normalizeLegacyCardio(…))` pipeline, and `serializeGoal`
> completing `min`/`max` through `expandMMSS` before its own `short()`.
>
> **Two things learned at execution, both recorded in code:**
> - 🔴 **The render-phase draft sync had to key on what the field LAST SENT UP, not on the derived
>   prop.** The plan said "same shape as `ExerciseCombobox`'s `query`" — but the parent *transforms*
>   what this field writes (`label` collapses to an empty `customName` when it equals the type), so a
>   plain `prev !== prop` sync resyncs the draft to `''` on that very keystroke and **defeats the
>   draft in the exact case it exists for**. Caught by reasoning through "WOD" typed into a WOD block
>   before running it, not by the tests. `lastSent` is why the comment in `BlockEditor.jsx` is long.
> - **`expandMMSS` zero-pads and `parseTimeToken` strips the zero again**, so a single-digit goal
>   makes one padding shift (`'9'` → `"sub 09'"` → `'9:00'`) and is stable from there. That is the
>   "stabilizes rather than returns byte-identical" standard `audit-text-roundtrip.mjs` already
>   judges by, so it is pinned as such rather than "fixed" — the time itself never changes, and it is
>   the only thing `toSecs`/`goalOutcome` read.
>
> **⚠️ The audit's `goal-kind` counter still reads 1, and that is the fix working, not the bug.**
> It now reports `goal.min: "14" → "14:00"` — storage still holds the legacy bare value on the one
> prod row, and the round trip *corrects* it instead of degrading it to `{kind:'text'}`. The counter
> reaches 0 when the data is repaired; `scripts/repair-goal-time.mjs` printed the one-row SQL, which
> was handed to the user (prod has no service-role key in this repo). **Re-run the audit after the
> SQL is applied to confirm 0.**
>
> **Live-verified** against the local stack at 1280 (no service worker present — checked first):
> `Aquecimento geral` typed left to right in one pass, space intact; clearing the field falls back to
> the type; `For Time` typed into a For Time block is no longer blanked mid-word; `14` typed into
> `Meta` and flipped to `¶ Texto` **without blurring** projected `Meta: 14'`; the same unblurred `14`
> saved as `{kind:'time', min:'14:00'}`; the week grid's Texto mode renders
> `For Time – Teste 139 / Thruster / Meta: 14'`. Test session created and deleted; 53 day keys
> intact. 704 tests (+6) / lint 0 / `build:all` clean / `format` clean. Gallery opened —
> `GoalInput` and `BlockTextEditor` render; no gallery-rendered markup changed, so no `design:cards`.

## Context

Two bugs with **one root cause**: a Criador input does normalization work on **every keystroke** that
belongs at commit time. #139 was found by `scripts/audit-text-roundtrip.mjs` against live prod;
#140 was reported by the user from live use on 2026-08-04. They ship together because the second is
the first's mechanism seen from another angle, and both fixes land in the same editor.

Neither is theoretical. #139 is a **live regression in a shipped fix** —
[plans/60](./60-goal-time-input.md) was written to kill exactly this bug, repaired the one corrupt
prod row, and closed only half the path; the audit then read `goal-kind: 1` on a row created
**2026-08-03, after plans/60 shipped**. #140 has a workaround the user has been performing by hand
("write everything, then go back and add the spaces"), which is what a swallowed keystroke feels like.

**Intended outcome:** a `Meta:` typed as `14` is 14 *minutes* everywhere, on every path out of the
editor; and a block name with a space in it can be typed left to right, in one pass.

---

## #139 — a `Meta:` typed as `14` is still stored as 14 seconds

### Mechanism

`GoalInput.jsx:41` persists on every keystroke:

```js
onChange={v => put({ min: v })}
```

`MaskedTimeInput` owns the `expandMMSS` completion and applies it **on blur** (plans/60 moved that
contract into the component so no consumer could skip it). So storage holds an unexpanded
`min: '14'` **whenever the value is read before the field is blurred**. Paths that beat the blur,
all reachable in normal use:

- flipping the block or the session to **`¶ Texto`** — the toggle unmounts a focused input, and no
  blur event fires for an element removed from the DOM;
- collapsing the block; changing the block type; closing the mobile exercise sheet.

Two independent consequences, both live:

1. **`toSecs('14')` is 14 seconds.** `goalStr` renders `14` (looks almost right) and `goalOutcome`
   resolves **every finisher to `'missed'`** — the plans/60 bug, undead.
2. **Round trip destroys the kind.** `serializeGoal` emits a bare `Meta: 14` (its `short()` only
   shortens a `:00`-suffixed value); `parseGoal` refuses a naked integer as a time
   (`if (one && /['":]/.test(s))`), so it comes back `{kind:'text', text:'14'}` → `goalOutcome`
   returns `null` for text → **#117's "Bateu a meta" badge silently stops rendering for that block.**

### 🔑 The two candidate fixes are not alternatives

#139's row asks to "pick deliberately" between normalizing in `serializeGoal` and stopping
`GoalInput` from persisting an unexpanded value. **They cover different paths and each alone leaves a
live hole**, so this plan does both:

| | Covers | Does not cover |
|---|---|---|
| **A · source** (`saveS`) | everything that reaches storage | the Texto pane, which serializes **unsaved** blocks |
| **B · projection** (`serializeGoal`) | the flip-to-text path + every legacy row already in storage | `toSecs`/`goalStr`/`goalOutcome`, which never go through the serializer |

**A · source.** New pure `normalizeGoal(goal)` in `criador/blockModel.js` (which already owns
`goalKindFor`), running `expandMMSS` (`public/lib/wod.js:335` — already exported and tested) over a
`kind:'time'` goal's `min`/`max` and returning the goal unchanged otherwise. Applied in
**`useSessionEditor.saveS`**, which at `:160` already runs
`materializeBlocks(normalizeLegacyCardio(blocks), loadRegistry())` — the persistence boundary, and an
existing normalization pipeline to extend rather than a new one to invent.

**B · projection.** `serializeGoal` (`textFormat.js:641-651`) normalizes `min`/`max` through
`expandMMSS` before its existing `short()` runs, so `'14'` → `'14:00'` → `14'`, which `parseGoal`
reads back as `{kind:'time', min:'14:00'}`. `textFormat.js` already imports from `wod.js`
(`uid`), so this costs one named import. Keep `textFormat.js` pure — no React, no client.

**C · data.** Re-run `node scripts/repair-goal-time.mjs` (dry-run default; `--write` is local-only,
and against prod it prints the `jsonb_set` SQL to paste into the SQL editor, per the standing
migration rule). Hand the user the SQL **with a short title**. Re-measure the row count against live
prod — do not quote #139's "1 prod block" without re-running.

⚠️ **Do not normalize inside `GoalInput.put`.** `expandMMSS('1')` is `'01:00'`, so per-keystroke
normalization makes the field untypable — the same class of bug as #140, introduced while fixing
#139. The blur contract in `MaskedTimeInput` stays exactly as it is.

---

## #140 — the block-name field swallows the space bar

### Mechanism

`BlockEditor.jsx:400-402`:

```js
onChange={e => onUpdate({ ...block, label: e.target.value.trim() || block.type })}
```

`.trim()` runs on **every keystroke**, so the trailing space of `Aquecimento ` is stripped before it
can ever be typed: press space → nothing appears; type `g` → `Aquecimentog`. Mid-string spaces
survive, which is exactly why typing the whole name first and inserting spaces afterwards works.
**This is the only trim-on-change input in `src/`** (verified repo-wide), so #140 is one field, not a
class.

The `|| block.type` half is *why* the trim is there — an empty custom name must fall back to the
type — and it carries **a second defect of the same shape**: `customName` (`:47`) is
`block.label && block.label !== block.type ? block.label : ''`, so typing a name that *equals* the
type (`WOD` into a WOD block) blanks the field mid-word.

### Fix

Give the input a **local draft**, synced from the prop **during render** — the
`prevValue`/`setPrevValue` shape at `ExerciseCombobox.jsx:45-49`, which CLAUDE.md records as React's
documented replacement for a sync effect and which `react-hooks/set-state-in-effect` requires (a
`useEffect` here fails CI). Then:

- `onChange` → write the draft **and** commit the raw value (`label: e.target.value`), so a
  half-typed name is never lost if the coach saves without blurring — the #139 lesson applied here;
- `onBlur` → commit the normalized value (`e.target.value.trim() || block.type`).

One draft fixes both defects: while focused, the field renders the draft, so neither the trim nor
the `label === type` derivation can rewrite it under the cursor.

⚠️ `customName` also feeds `:207` (the collapsed bar's `blk-custom-name`) and `:559` (the delete
confirm's `ReadRow`). Both read committed state, not the draft — leave them alone.

---

## Acceptance

- `Meta: 14` typed and left unblurred is `{kind:'time', min:'14:00'}` in storage **and** `Meta: 14'`
  in the text projection.
- `Aquecimento geral` types left to right in one pass; clearing the field still falls back to the type.
- `node scripts/audit-text-roundtrip.mjs` reports **`goal-kind: 0`** (was 1).
- `npm test` (with new cases) · `npm run lint` clean at `--max-warnings 0` · `npm run build:all`
  clean · `npm run format`.

## Verification

**Unit** — `normalizeGoal` (bare minutes → `MM:00`; a `:`-bearing value untouched; `rounds`/`text`
goals untouched; `undefined` in → `undefined` out) and the `serializeGoal` round trip
(`{kind:'time',min:'14'}` → `Meta: 14'` → `{kind:'time',min:'14:00'}`). The second is the regression
guard 61·A pinned on a false premise — this is where it becomes true.

**Then drive it live** (`supabase start`, then `npm run dev`).
⚠️ **Clear any stale service worker first** — `sw.js` scopes over the SPA dev server and serves
precached prod assets with **no console error**; a `cone-v7` worker was in fact present on this
origin on 2026-08-03.

1. **#140** — type `Aquecimento geral` into a block's name field, left to right, one pass. Clear it
   and confirm the fallback to the type name on blur. Type the type's own name (`WOD` on a WOD
   block) and confirm the field keeps it while focused.
2. **#139, the path that actually bites** — type `14` into `Meta` and, **without clicking away**, hit
   `¶ Texto`. The pane must read `Meta: 14'`; `▤ Detalhado` must come back `{kind:'time',
   min:'14:00'}`, not `{kind:'text'}`.
3. **#139, the save path** — type `14`, save without blurring, reload, confirm storage holds
   `14:00` and `goalStr` renders `14'`.
4. **The regression that started it** — log a result that beats that goal and confirm **#117's
   "Bateu a meta" badge renders** on `leaderboard.html` and in the `results.html` success modal. It
   cannot render against a 14-*second* goal for any athlete, which is what makes this the honest
   end-to-end check rather than a unit assertion.
5. `node scripts/audit-text-roundtrip.mjs` — `goal-kind` **1 → 0**. This is the instrument that found
   #139; it is the acceptance test.
6. **Gallery** — `GoalInput` and `BlockTextEditor` render there. Open `gallery.html` (dev-only, never
   built, so no CI gate catches a broken import) and confirm both still render. No `design:cards`
   run unless markup changed.

## Ritual

BACKLOG: Done entry; mark #139 and #140 shipped; **correct #139's own row** — its "two candidate
fixes, pick deliberately" framing is superseded by "both, they cover different paths". Done marker on
this plan. Commit + push.
