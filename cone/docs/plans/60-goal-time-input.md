# 60 — #125 · A colonless `Meta:` time is read as seconds, inverting the goal badge

> ✅ Done: `0720f77` — 2026-08-03. See BACKLOG.md "Done" for the shipped summary.
>
> ⚠️ **PARTIAL — corrected 2026-08-04. This plan closed the BLUR path, not the WRITE path.**
> Moving the `expandMMSS`-on-blur contract into `MaskedTimeInput` was right and holds, and the one
> corrupt prod row was repaired. But `GoalInput.jsx:41` persists on **every keystroke**
> (`onChange={v => put({ min: v })}`), so a value that never receives a blur — the modal closed, the
> block saved, focus never leaving the field the way this plan's live test made it — is still stored
> as `min: '14'`. `scripts/audit-text-roundtrip.mjs` found exactly that on a prod row created
> **2026-08-03, after this shipped** (`goal-kind: 1`), which is what makes it evidence rather than
> theory. Filed as **BACKLOG #139** with two candidate fixes; 61·A's A2 regression guard was written
> on this marker's "input closed" wording and inherits the same correction.

## Context

Found by the 2026-08-03 targeted review ([reviews/2026-08-03-criador-text-logging.md](../reviews/2026-08-03-criador-text-logging.md), §Blocker) and filed as
[BACKLOG #125](../BACKLOG.md). `criador/GoalInput.jsx:36,46` wraps `MaskedTimeInput` **directly**,
skipping the `expandMMSS`-on-blur contract that `ScoreFields.jsx:107`'s `TimeField` exists to own.
`maskMMSS` fills from the right, so a coach typing `14` into the Meta field gets back `14`, not
`14:00`. Downstream: `toSecs('14')` reads **14 seconds**; `goalStr` renders `14` instead of `14'`
(looks almost right); `goalOutcome` compares `toSecs(perfTime) <= 14`, so an athlete finishing
13:45 resolves to `'missed'` — every finisher misses. This is #115's bug class (colonless prod
result times, fixed in plans/52) recurring in the one time input that class didn't cover, because
`GoalInput` uses `MaskedTimeInput` and therefore *looks* converted.

Prod holds one such row today: `{"min":"14","kind":"time"}`, block `msclpzw5gcc3sna588q`, session
"Eagles Monday Test" (2 logged results already in it).

## Decisions (made explicit per the work item's three open questions)

**1 — Where the fix goes: move the `expandMMSS`-on-blur contract INTO `MaskedTimeInput` itself
(option c), not into a `TimeField` import (option a) or a new shared file (option b).**
`MaskedTimeInput` already forwards `onBlur` through its `...rest` spread onto the `<input>` — the
plumbing is present, just unused. Three direct consumers exist today (`GoalInput.jsx` ×2,
`StationEditor.jsx` ×1 for `restBetweenCycles`) plus `TimeField` — baking the contract into the
component itself means **every current and future direct consumer gets it for free**, and
`GoalInput.jsx` needs **zero code changes** (the bug disappears because the field it renders now
carries the fix intrinsically). Option (a) was ruled out without needing the bundle check: it
solves only `GoalInput`, not `StationEditor`, which has the identical gap.
Verified safe for `StationEditor`'s `restBetweenCycles`: it's read by `blockModel.js`'s `parse()`
and `scheduleHelpers.js`'s `parseDurMins()`, both of which **already treat a colonless value as
whole minutes** (`blockModel.test.js:208-211` asserts this) — the same convention `expandMMSS`
encodes. Appending `:00` on blur changes display only (`"2"` → `"02:00"`), not the parsed value
(`parse('2') === parse('2:00')`), so this is a neutral, cosmetic-only side effect there.

**2 — `GoalInput.jsx:20`'s kind-mismatch scoping: leave it exactly as is, defer explicitly.**
The gallery already has a dedicated case for this (`criador.jsx:296-301`, "Tipo trocado... não
renderiza no campo errado") — a block whose *type* changed intentionally must not show a stale
goal in the wrong-shaped field, and that's working as designed. The review's actual concern (an
*unintentional* kind flip making a live goal invisible) is caused by the text-mode round trip
(`serializeGoal`/`parseGoal` not being inverses), filed as **#126** and owned by the dedicated
#120/#121 Opus planning session. Fixing display logic here would overlap that session's design
work on the actual root cause. Not touched in this plan.

**3 — Folding in #35's remaining rollout items: PrLogSheet yes, Timer.jsx no.**
- **`me/PrLogSheet.jsx`'s time-PR field (`val`, `unit === 'time'`, lines ~150-161): fix it.** It's
  a raw `<input type="text">` with **no masking of any kind** today, and it feeds
  `Me.jsx:249`'s `toSecs(raw) < toSecs(best.value)` PR-best comparison — the identical bug class,
  live on an athlete-facing page. Fix: wire `maskMMSS` (onChange) + `expandMMSS` (onBlur) directly
  onto the existing input, **not** a swap to the `MaskedTimeInput` component — that component's
  `.control` styling (16px, left-aligned, generic) would visibly break the sheet's distinctive
  large centered `.lsInp` treatment (24px/900-weight/`.lsInpWrap`) shared by all four unit
  variants (time/reps/m/kg) on that same row. Hand-wiring the two pure functions preserves the
  look exactly (same pattern `Timer.jsx:833` already uses for its own goal field, for the same
  reason). The "Objetivo" (target) field on the same sheet is a **separate, un-named field** —
  left untouched; noting it here rather than silently leaving it inconsistent.
- **`timer.html` (`Timer.jsx`)'s "Meta de Tempo" goal field: leave it, and say why.** It already
  runs `maskMMSS` on change (added by plans/37); it's missing only the blur-expand step. But
  `cfg.goal` is **display-only** (`Timer.jsx:682,942` — a text tag and a share string) — it is
  never passed through `toSecs`, never compared, never drives ranking or the running clock. A
  colonless value here is a cosmetic gap ("Meta: 8" instead of "Meta: 08:00"), not a correctness
  bug. Given `Timer.jsx` is used live at the gym mid-class and #108 records that a careless change
  there is an outage, the risk/reward doesn't justify touching it in this pass. Left as a known,
  low-priority cosmetic gap — recorded on the corrected #35 row, not silently dropped.

## Files

| File | Change |
|---|---|
| `src/public/shared/MaskedTimeInput.jsx` | Own the `expandMMSS`-on-blur contract internally (destructure `onBlur` out of props, compose it with the new internal handler). Update the header comment. |
| `src/public/shared/ScoreFields.jsx` | Simplify `TimeField` (~:107-123) — the manual `onBlur`/`expandMMSS` wrapper is now redundant; update the comment at :101-106 (the "must use TimeField, not MaskedTimeInput directly" rule is superseded). Keep `TimeField` exported (still used by `ClassPanel.jsx` and internally by `ScoreInputs`). |
| `src/public/me/PrLogSheet.jsx` | Add `maskMMSS`/`expandMMSS` wiring to the `unit === 'time'` input (~:150-161). Import both from `../lib/wod.js` (already imports `blkColor` from there). |
| `scripts/repair-goal-time.mjs` (new) | One-off repair script, mirrors `scripts/normalize-session-ids.mjs`'s shape: dry-run by default, `--env=production`\|`development`, `--write` (local only, refused against prod — prints a `jsonb_set` UPDATE to paste into the SQL editor instead). Walks `sessions.value[dateKey][i].blocks[j].goal`, applies `expandMMSS` to `min`/`max` where `kind === 'time'` and colonless, reports the diff. |
| `docs/BACKLOG.md` | Move #125 to Done with a `> ✅ Done: <commit>` marker. Correct the #35 row: `GoalInput` is now fixed (was missed by the original rollout list); `PrLogSheet`'s time-PR field is now fixed; `Timer.jsx`'s goal-display gap is recorded as an intentionally-deferred cosmetic item, not outstanding work. |
| `docs/plans/60-goal-time-input.md` | This file — gets its own `> ✅ Done: <commit>` marker once shipped. |

**`criador/GoalInput.jsx` and `criador/StationEditor.jsx` are not touched** — that's the point of
fixing this at the `MaskedTimeInput` level (decision 1).

## Approach

### 1 · `MaskedTimeInput.jsx`

```jsx
export default function MaskedTimeInput({
  value = '',
  onChange,
  label,
  error = '',
  hint = '',
  id,
  placeholder = '12:34',
  className = '',
  onBlur,
  ...rest
}) {
  ...
  <input
    ...
    onChange={e => onChange?.(maskMMSS(e.target.value))}
    onBlur={e => {
      const done = expandMMSS(value)
      if (done !== value) onChange?.(done)
      onBlur?.(e)
    }}
    aria-invalid={...}
    aria-describedby={...}
    {...rest}
  />
```
Import `expandMMSS` alongside the existing `maskMMSS` import from `../lib/wod.js`. Destructuring
`onBlur` out of props (rather than leaving it in `...rest`) means a future caller that legitimately
needs its own blur handler still gets composed behavior, and nothing can silently override the
contract by spread order.

### 2 · `ScoreFields.jsx`'s `TimeField`

Reduce to a thin, semantically-named pass-through now that the contract lives in
`MaskedTimeInput`:

```jsx
export function TimeField({ value, onChange, label, disabled, className, ...rest }) {
  return (
    <MaskedTimeInput
      className={className}
      label={label}
      placeholder="12:34"
      value={value || ''}
      disabled={disabled}
      onChange={onChange}
      {...rest}
    />
  )
}
```
Update the comment above it (currently :101-106) — it documents *why* the contract must live in
one place and fire on blur, not on change; keep that reasoning (still true) but drop the "route
through TimeField, not MaskedTimeInput directly" instruction, since that's no longer the rule.

### 3 · `PrLogSheet.jsx`

Add the import, then wire the existing `unit === 'time'` input:
```jsx
import { maskMMSS, expandMMSS } from '../lib/wod.js'
...
<input
  ref={valRef}
  type="text"
  className={styles.lsInp}
  value={val}
  placeholder="00:00"
  onChange={e => onVal(maskMMSS(e.target.value))}
  onBlur={() => {
    const done = expandMMSS(val)
    if (done !== val) onVal(done)
  }}
/>
```
No changes needed in `Me.jsx` — `onValChange`/`setLsVal` already accept a plain masked string.

### 4 · `scripts/repair-goal-time.mjs`

Mirror `normalize-session-ids.mjs` structurally (env file reading, `--env=`/`--write` flags, prod
refusal + printed SQL). Diff function walks every session's `blocks` array (not just top-level
session fields), checking `block.goal?.kind === 'time'` and applying `expandMMSS` to `min`/`max`.
Unlike `repair-results-time.mjs`, there is **no ambiguous case to gate behind a flag** —
`expandMMSS`'s "colonless in a WOD time field means minutes" rule is already the established,
unconditional convention (`wod.js:328`), so every colonless goal value is repaired unconditionally
in one pass. Build the `jsonb_set` path as
`{<dateKey>,<sessionIndex>,blocks,<blockIndex>,goal,min}` (and `,goal,max` when present),
composing multiple `jsonb_set` calls the same way `normalize-session-ids.mjs`'s `buildSql` nests
them for multiple changes.

### 5 · Prod repair

Run the script against `--env=production` (default, read-only, anon key) to **re-verify** the
count — the work item is explicit that the "1 of 7" figure was measured against the local seed and
must be re-confirmed live. Hand the user the printed `jsonb_set` SQL with a short title, to paste
into the Supabase SQL editor themselves (no service-role key in this repo; prod writes go through
the coach's authenticated session or manual SQL, never a script — same policy as
`normalize-session-ids.mjs`).

### 6 · BACKLOG corrections

- #125 → Done, commit marker.
- #35's row: add a line noting `GoalInput` was in fact a third instance of the un-rolled-out
  gap (missed originally because it looked converted), now fixed here; `PrLogSheet`'s time-PR
  field now fixed; `Timer.jsx`'s "Meta de Tempo" display gap recorded as intentionally deferred
  (cosmetic only, elevated-risk file) rather than outstanding.

## Verification

Local stack: `supabase start` (if not already up) + `node scripts/seed-dev.mjs`. **Check for a
stale service worker FIRST** — the 2026-08-03 review found a live `cone-v7` worker serving
precached prod assets to the dev origin with no console error; clear it before trusting anything
that doesn't change.

**Drive it end to end, not just the input:**
1. Open Criador, create/open a For Time block, type `14` into Meta, blur → confirm the field shows
   `14:00` and `goalStr` (the block card / schedule view) renders `14'`.
2. Log a result on `results.html` that beats it (e.g. `13:45`) → confirm #117's goal badge now
   shows **beat/met**, not missed. This is the actual point of the fix, not just the input display.
3. Repeat the type/blur check on `StationEditor`'s "Descanso entre ciclos" field and confirm
   `stationsCapStr`'s displayed cap is unaffected (still computes the same total).
4. On `me.html`, open a time-type PR sheet, type a colonless value (e.g. `5`), blur → confirm it
   expands to `05:00` before Salvar, and that the PR-best comparison behaves sanely.
5. Gallery: `GoalInput` (criador group) and `MaskedTimeInput`/`TimeField` (SPA group) cases —
   walk all states across the 4 themes.

**Gates:** `npm test` · `npm run lint` · `npm run build:all` clean · `npm run design:cards`
re-run and the regenerated cards committed (both `GoalInput` and `MaskedTimeInput` are
gallery-rendered) · commit + push.

Model: Sonnet · Size: S
