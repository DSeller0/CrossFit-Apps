# 45 — #109 · Effect-write sweep (read paths that write)

> Planned 2026-07-26 from the housekeeping pass. Run order:
> [43 lint floor + CI gate](./43-lint-floor-ci-gate.md) →
> [44 Resultados decomposition](./44-resultados-decomposition.md) → **45 (this)**.
> **Absorbs the write-on-load half of #101** (#101 keeps its test-coverage half).

## Context

This is a **bug class, not a bug** — three known sites, one already fixed, two live. It gets one row
because fixing them one at a time is how the third one appeared after the first was fixed.

**The precedent: #76.** `results_v2` wrote back on load. That was not merely wasteful — it destroyed
`updated_at` as a provenance signal, which is why migration `0007` then had to add a real `created_at`
(`timestamptz not null default now()`, backfilled from `updated_at`), and why `resultToRow` deliberately
**omits** `created_at` so an INSERT fills the default and a conflict-UPDATE preserves it. A read that
writes costs a column.

**Still live:**

### Site 1 — `Servicos.jsx:266-267` (the expensive one)

```js
const athletes = loadAthletes();               // :263 — every render, not state/memo
useEffect(() => { saveLocations(locs); }, [locs]);   // :266
useEffect(() => { saveCoach(coach);   }, [coach]);   // :267
```

`useEffect` with a dependency **runs on mount**, and `locs`/`coach` are seeded from
`useState(loadLocations)` / `useState(loadCoach)`. So **merely opening the Serviços tab re-upserts both
`locations` and `coach_profile`** and bumps both `updated_at` values — the same disease as #76, on two
whole-table blobs rather than per-row.

Two more in the same file:
- **`CoachProfileForm` has no debounce** — every field writes on change, and `saveCoach` goes straight to
  `dbSaveCoach`. Typing a Pix key is one Supabase round-trip **per character**.
- **`:263` calls `loadAthletes()` on every render** instead of state/memo.

### Site 2 — `initRegistry` (#101)

Called during load in `Exercicios.jsx`; when it decides `needsSave` (string→object migration, or a
category that needs re-sorting) it calls `saveRegistry` **from the read path**.

## Acceptance

- Opening the Serviços tab with no edits performs **zero writes** — verified by watching the network tab
  (or `updated_at` on both rows before/after).
- Opening the Exercícios tab on an already-migrated, already-sorted registry performs **zero writes**.
- Editing anything still persists exactly as before. No user-visible change.
- `npm test` 530/530, plus a regression test per site (see below).

## Files

| File | Change |
|---|---|
| `src/components/tabs/Servicos.jsx` | mount guard or move saves to the mutators; debounce the profile form; memo `athletes` |
| `src/components/tabs/Exercicios.jsx` | `initRegistry` stops writing during load |
| `src/components/tabs/exerciciosHelpers.js` *(new)* | extract `initRegistry` + friends so they're testable |
| `src/components/tabs/*.test.js` *(new)* | the regression tests |
| `CLAUDE.md` | record the rule (see below) |

## Approach

1. **Prefer moving the save to the mutators over adding a mount guard.** Every other tab already persists
   from its mutators; `Servicos.jsx` is the outlier. `saveLoc`/`deleteLoc`/`toggleAthlete` already exist
   (`:283`/`:295`/`:301`) — call `saveLocations` there. A `useRef` first-run flag works but leaves the
   "state change ⇒ write" coupling in place, which is what makes a mount write easy to reintroduce.
2. **Debounce the coach profile** (or persist on blur). This is a Pix key and an e-mail — per-keystroke
   upserts are also a correctness risk if two tabs are open.
3. **`athletes` → `useMemo`**, or lift it into the same state the rest of the tab uses.
4. **Extract `initRegistry`** into `exerciciosHelpers.js` and make it **return** `{ registry, needsSave }`
   instead of writing. The caller decides to write. This is what makes it testable and is the same shape
   #101 asks for.
5. **Write the rule into CLAUDE.md** so the fourth site doesn't appear: *a load/read path never writes;
   migrations and re-sorts return a "needs save" flag and the caller decides.* Cite #76 → `0007` as what
   it costs.

## Tests

The point of this row is that the class stops recurring, so the tests must assert **absence of a write**:
- `initRegistry` on a clean registry → `needsSave === false` and the save spy is never called.
- `initRegistry` on a string-entry registry → migration is **lossless** and `needsSave === true`.
- Re-sort is stable and `localeCompare(…, 'pt')` orders accented names as intended.
- For Serviços, a mount-render with a mocked client asserts **zero** `dbSaveLocations`/`dbSaveCoach` calls.

## Relationship to plans/43 and #108

`react-hooks/set-state-in-effect` (22 findings) and `react-hooks/purity` (8) overlap this class. **Take
the overlapping ones here**, where the fix is understood, and leave the rest to **#108** — do not fix the
same finding twice under two rows. Note in #108 which files this session already cleared.

## Verification

- `supabase start`, then `npm run dev`. Note both blobs' `updated_at` (Studio at `127.0.0.1:54333`),
  open Serviços, navigate away, re-check: **unchanged**. Then edit a rate and confirm it *does* change.
- Same for Exercícios / `exercise_registry`.
- DevTools Network: open Serviços, confirm no POST to `/rest/v1/locations` or `/coach_profile`.
- Type 8 characters into the Pix key field and count the requests — should be 1, not 8.
- ⚠️ If behavior looks stale, check for **service-worker poisoning first** (CLAUDE.md): `sw.js` scopes to
  `/CrossFit-Apps/` and on localhost serves the SPA precached production assets with **no console error**.

Model: Sonnet · Size: S–M
