# 30 — Registry alias / normalization layer (#62)

Backlog: **#62** (Icebox → Ready). Capture-chain step 2 — [plans/22](./22-athlete-character-stats.md) §3 step 2. **Independently valuable, do it whether or not the stats card ships.**

## Context

Only **12.4%** of the 225 real session-exercise names join the registry (plans/22 §2): the
coach free-types shorthand (`"BMU"`, `"T2B"`, `"HSPU "`, `"FLEXÃO NÓRDICA "`) while the registry
is English long-form, and **57% of names carry stray whitespace**. The join is done today by
raw exact-lowercase string equality at every consumer, so it silently fails and degrades
**already-shipped** features:

- **Demo videos don't resolve** — `ExRow.jsx:13,48,93` build a `demoMap` keyed by
  `(name).toLowerCase()`; `DemoPanel.jsx:24-26` reads `videoUrl`/`description`/`muscles`.
- **#38 ghost defaults never fire** — Criador's `materializeEx`/`materializeBlocks` look up the
  registry entry by name to prefill `sets`/`reps`/`dist`/`intensity`.
- **PR category tagging falls into `'Sem categoria'`** — `Atletas.jsx:575-579`
  (`blockOrder.find(...) || 'Sem categoria'`), and the equality checks at `Atletas.jsx:216`,
  `Exercicios.jsx:67/121`.

Registry shape: `{ [blockFamily]: [{ name, videoUrl?, description?, muscles?, defaults?, … }] }`
(`exercise_registry` blob). `muscles` is **100% populated** — mineable once the join works.

## Acceptance

- A canonical normalizer + alias map + registry resolver exists in `src/public/lib/` and is the
  single path every name→registry lookup goes through.
- On a representative sample of the **real** prod exercise names, the join rate rises from ~12%
  to the large majority (target: the shorthand cases plans/22 lists all resolve).
- Demo videos resolve, ghost defaults fire, and PR tagging lands in a real category for
  shorthand-named exercises — verified live.
- Normalization is **match-only**: the coach's typed name is never rewritten in prescriptions or
  display.
- New unit tests cover the normalizer + alias resolution + a real-miss fixture table.
- `npm test` + `build:all` green.

## Files

- `src/public/lib/wod.js` (or a **new** `src/public/lib/registry.js` re-exported from both client
  paths) + its test — `normExName`, `ALIASES`, `buildRegistryIndex`, `resolveExercise`.
- Consumers refactored to the resolver: `src/public/schedule/ExRow.jsx`,
  `src/public/schedule/DemoPanel.jsx`, `src/components/tabs/Criador.jsx` (materialize),
  `src/components/tabs/Atletas.jsx`, `src/components/tabs/Exercicios.jsx`.

## Approach

1. **Canonical normalizer + resolver** (pure, no import cycle):
   - `normExName(name)` = trim + casefold + accent-strip (`String.normalize('NFD')` + strip
     combining marks) + collapse internal whitespace.
   - `ALIASES`: shorthand → canonical registry name (`BMU→Bar Muscle-up`, `T2B→Toes to Bar`,
     `DU→Double Under`, `HSPU→Strict HSPU`, `C&J→Clean and Jerk`, …). **Author from real data** —
     enumerate the prod snapshot (`cone/backups/2026-06-24_13-17-42/` or a fresh `db dump`)
     exercise names, diff against registry names, hand-map the misses. This enumeration is part of
     the session, not a guess.
   - `buildRegistryIndex(registry)` → `Map<normKey, entry>` (flatten all families, apply aliases);
     `resolveExercise(name, registryOrIndex)` → `entry | null`.
2. **Route every consumer through `resolveExercise`** instead of raw `.toLowerCase()` equality.
   Keep the coach's typed name as the display/prescription value.
3. **Tests**: `normExName` (accent/whitespace/case), alias resolution, and a fixture table of the
   real shorthand→registry misses proving the join rate jump on a representative sample.

## Verification

Local stack seeded with real-shaped data:
- Prescribe an exercise typed `"BMU"` → schedule.html demo panel shows Bar Muscle-up's
  video/muscles (was: nothing).
- A `pct`/registry-`defaults` exercise fires its ghost default in Criador.
- A logged PR on a shorthand-named movement tags to a real category (not `'Sem categoria'`) in
  Atletas.
- `npm test` (new normalizer/alias cases) + `npm run build:all` green.

## Not in scope
Match-quality only. The strength-logging keystone (#64) and the Desenvolvimento card (#65)
remain downstream; #62 pays for itself on the shipped features above.

Model: Sonnet · Size: M
