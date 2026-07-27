# 50 — #98 · One source for the 15-category taxonomy

> ✅ Done: `f936a87` · 2026-07-27 — see BACKLOG.md

> Planned 2026-07-27, **Tier 2** of the housekeeping program. Run order:
> [49 prettier baseline](./49-prettier-format-baseline.md) → **50 (this)** →
> [51 react-hooks triage](./51-react-hooks-triage.md).
> ⚠️ Line numbers below were measured **before** plans/49's reformat. Re-locate by symbol name, not by
> line, if 49 has already landed.

## Context

CLAUDE.md's rule is "extend `FAMILY_GROUPS`/`ROOTS` in `exerciseGroups.js`, never at a call site". The
same 15 registry categories are nonetheless declared **five** times, and the one that actually creates
registry buckets is not the canonical one. So **a category added to `FAMILY_GROUPS` renders in Exercícios
Pane 1 and holds nothing** — `initRegistry` never creates its bucket, and the tab shows a permanently
empty category with a 0% coverage bar.

Verified 2026-07-27:

| Where | What | Role |
|---|---|---|
| `src/public/lib/exerciseGroups.js:16-28` | `FAMILY_GROUPS` → `ALL_CATEGORIES` | **canonical**, family order |
| `src/components/tabs/exerciciosHelpers.js:3-7` | `BLOCK_ORDER` | what `initRegistry` iterates to create buckets |
| `src/utils/config.js:15` | `APP_CONFIG.blockNames` | 16 entries — a `'-'` sentinel + `BLOCK_ORDER` verbatim |
| `src/components/tabs/criador/blockModel.js:73-94` | `TYPE_CONFIG` keys | consumed as `known` by `criador/TypePicker.jsx:13` |
| `src/public/lib/exerciseGroups.test.js:8-11` | `CATEGORIES` | deliberate fixed-contract duplicate |

All five hold the same 15 members today. **The only live divergence is ORDER:** `ALL_CATEGORIES` hoists
Benchmark to position 7 and runs the green family Skill→Cardio→Aquecimento→Mobilidade; the other four run
Aquecimento→Skill→Cardio→Mobilidade with Benchmark last.

## 🟢 The row's open question, answered

The #98 row says: *"Verify the persisted registry key order matters to no reader before changing which
order wins — this is not a pure rename."* Resolved 2026-07-27, and the answer is more interesting than
either yes or no:

**A reader does depend on key order — and it happens to be immune to this particular change.**

`initRegistry` builds the registry object by iterating `BLOCK_ORDER`, so JSON key insertion order *is*
`BLOCK_ORDER`. `src/public/me/PrSection.jsx:179` then renders me.html's PR family cards straight from
`Object.keys(registry)` **with no sort**. But it filters with `PR_SKIP`
(`meHelpers.js:22` = `{'-', 'Aquecimento', 'Descanso', ...WOD_TYPES}`) and excludes `BENCHMARK_CAT`
separately — and **Aquecimento and Benchmark are precisely the two categories whose relative position
differs between the two orders.** Both survive as:

```
Força · LPO · Core · Acessórios · Skill · Cardio · Mobilidade
```

So the switch is invisible on me.html. Record this as *verified-safe-by-coincidence*, not as "no reader
uses key order" — if `PR_SKIP` ever stops skipping Aquecimento, the coupling is live again.

The other three `Object.entries(registry)` consumers (`registry.js:215` `buildRegistryIndex`,
`Atletas.jsx:37`, `ExerciseCombobox.jsx:18`) build order-insensitive lookup maps.
`exerciseGroups.test.js:15` compares **sorted**, so it neither catches nor blocks an order change.

Remaining order-sensitive call sites, all benign and all moving to family order (which is what Exercícios
Pane 1 already groups by): `Exercicios.jsx:113` `blocksOf` (the order of an exercise's category chips),
`:117` `allEx` (re-sorted alphabetically at `:120` anyway), `:429` the category list render.
`TypePicker.jsx:14` uses `blockNames` only to find types *beyond* the 15, of which there are none.

## Approach

1. **`initRegistry` iterates `ALL_CATEGORIES`.** In `exerciciosHelpers.js`, import `ALL_CATEGORIES` from
   `../../public/lib/exerciseGroups.js` and make `BLOCK_ORDER` a re-export of it — keeping the *name* so
   `Exercicios.jsx:110,113,117,429,590` and `exerciciosHelpers.test.js` don't churn.
   Import direction is fine: `exerciciosHelpers.js` is SPA-side and already imports `utils/storage`;
   `exerciseGroups.js` is client-free, so nothing new enters the graph.
2. **`blockNames` derives.** `config.js:15` becomes `['-', ...ALL_CATEGORIES]`, replacing the hand-typed
   literal. ⚠️ **`blockNames` is not static at runtime** — `App.jsx:100` overwrites
   `APP_CONFIG.blockNames` from a stored `cfg.blockNames`, and `Exercicios.jsx:110`'s `persist` re-derives
   it as `['-', ...BLOCK_ORDER]` on every registry save (which is what resets it after `App.jsx` may have
   clobbered it). **Both stay** — only the literal changes.
3. **`TYPE_CONFIG` stays hand-authored — do not derive it.** Its keys carry per-type icon/colour/desc/
   duration-label, so it is a lookup table that happens to be keyed by category, not a fifth copy of the
   list. Instead add a test to `blockModel.test.js`: `Object.keys(TYPE_CONFIG)` **set**-equals
   `ALL_CATEGORIES` (set, not order). Without it, a new category silently falls through to
   `DEFAULT_TYPE_CFG` and renders as a grey "Bloco livre".
4. **Same treatment for the four other category-keyed maps, recorded in the #98 row as out of scope for a
   rewrite but in scope for a guard:** `config.js:45` `BTC`, `:71` `PLC`, `:97` `ECOL_BASE`,
   `wod.js:12` `BLOCK_FAMILY`. Each is a presentation map with per-entry values (same argument as
   `TYPE_CONFIG`), so **add coverage tests, don't rewrite them**. ⚠️ `BLOCK_FAMILY` legitimately holds a
   16th key (`'WOD'`, which is a block *label* not a registry category) — assert
   "covers every `ALL_CATEGORIES` member", not "has exactly these keys".
5. **Fix the dead doc pointers.** `exerciseGroups.test.js:6`'s comment cites "Exercicios.jsx BLOCK_ORDER";
   it moved to `exerciciosHelpers.js` in `32063e9`. Grep for other citations of the old location.
6. **Note the lazy migration in the code comment.** An already-persisted registry keeps its old key order
   until the next `saveRegistry` — `initRegistry` rebuilds the object in iteration order and only flags
   `needsSave` on a missing bucket or an unsorted category, so re-ordering alone does **not** trigger a
   write (and must not — a load path never writes, #109/#111). Say so, or the next session reads
   "the order didn't change on prod" as a bug.

## Acceptance

- Exactly **one** authored list of the 15 categories remains (`FAMILY_GROUPS` in `exerciseGroups.js`),
  plus the deliberate fixed-contract duplicate in `exerciseGroups.test.js` (which is the point of that
  test — leave it, and leave its comment explaining why).
- Adding a 16th category to `FAMILY_GROUPS` alone makes it appear in Exercícios Pane 1 **with a working,
  writable bucket**, and fails the new `TYPE_CONFIG`/`BTC`/`PLC`/`ECOL_BASE`/`BLOCK_FAMILY` coverage tests
  until each map is given an entry. That failure is the feature.
- `npm test` green (580 + the new coverage tests).
- `npm run lint` ≤ 84 (re-baseline in the same commit if it drops).

## Verification

- `npm test`.
- **Exercícios tab:** all 15 categories render in Pane 1, grouped under their 4 families, each with its
  count and coverage bar; a category with exercises still lists them; "+ Adicionar" still pre-lights the
  current category. Confirm the footer still reads `15 tipos · N exercícios` (`Exercicios.jsx:590`).
- **me.html PR section:** the movement family cards render as
  `Força · LPO · Core · Acessórios · Skill · Cardio · Mobilidade`, and the gold Benchmarks card still
  renders below them. This is the assertion behind the open-question resolution above — check it, don't
  assume it.
- **Criador TypePicker:** all 15 types listed, each with its own icon/colour (nothing falling through to
  the grey `DEFAULT_TYPE_CFG`).
- Local stack with real prod data (`node scripts/seed-dev.mjs`), not an empty registry — the migration
  branch in `initRegistry` only exercises against a populated blob.

Model: Sonnet · Size: S
