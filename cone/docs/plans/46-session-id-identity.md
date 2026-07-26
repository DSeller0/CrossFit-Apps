# 46 — #110 · Session-id identity (a type-mismatch bug class)

> Planned 2026-07-26 from the housekeeping ranking pass. Run order:
> **46 (this)** → [47 load-path write-back](./47-load-path-writeback.md) →
> [48 dead-weight sweep](./48-dead-weight-sweep.md).
> **46 runs first** because it is the only one of the three that is corrupting data today, and because
> proving each site pre-existing needs `git blame`/`git show` — which the Prettier big-bang reformat
> (#24, queued behind these) will make much harder.

## Context

`uid()` returns a base36 **string** today (`public/lib/wod.js:1`). It didn't always — sessions created
before mid-June 2026 carry a raw `Date.now()+Math.random()` **number** (e.g. `1780763563709.0518`).
**7 sessions from 2026-06-06 → 2026-06-12 are still numeric.**

Meanwhile `results_v2.session_id` is declared `text` (`0001_init.sql:154`) and every writer coerces —
`Results.jsx:227`, `Schedule.jsx:357,388` all do `String(result.sessionId)`. So **anything read back from
the DB is a string, while the same session read from the `sessions` blob may be a number**, and every
`===` between them silently fails.

Found live-driving plans/44 (#110); the row was filed as "7 old sessions, one SPA view, low impact".
**Verification 2026-07-26 found it is ~12 sites across 6 public surfaces**, and that the row understated
the worst one.

## The sites (all verified against the current tree)

| Site | Effect when the id is a number |
|---|---|
| **`Results.jsx:215,224`** (`doSubmit`) | **`prev` is never found → a re-log INSERTS A SECOND ROW instead of merging blocks.** The only data-corrupting one. |
| `resultados/RegistroView.jsx:58` | Session card highlights but never opens (the original #110 report) |
| `Schedule.jsx:186` | Timer's "Registrar resultado" deep link (`openLog`) silently no-ops |
| `Schedule.jsx:208` (`isWodLogged`) | "already logged" checkmark never appears |
| `Results.jsx:102,108,139` | `?session=` deep link dead; expanded-card set never matches |
| `results/resultsHelpers.js:25` (`blockEntries`) | Leaderboards / KPIs render empty |
| `Me.jsx:329` | "Sessões recentes" loses the session name |
| `Index.jsx:132,139` | Result count reads 0; "Ranking de hoje" empty |
| `Leaderboard.jsx:57` · `tv/slides.jsx:85,199,294` · `resultados/LeaderboardView.jsx:52` | Same class (`tv_state.session_id` is also `text`) |

**Safe, do not touch:** `Schedule.jsx:400,538` and `Results.jsx:250,266,278` compare `s.id` against a
`sessId` that was itself assigned from `sess.id` — number-vs-number, consistent by construction.

## Approach — fix at the load boundary, NOT at the 12 call sites

Coercing 12 comparisons is how this bug survives: miss one, or add a thirteenth next month, and it's back.
**Normalize once, where sessions enter the app, and every downstream `===` is string-vs-string for free.**

1. **`normalizeSessionIds(blob)` → `src/public/lib/sessions.js`.** That module is the session domain, is
   **client-free**, and is **already imported by `src/utils/storage.js:4`** — so one implementation serves
   both sides. Shape: for every session in every dateKey, `id` becomes `String(id)`; a missing `id` gets a
   fresh `uid()` (folding in the stamping `loadLS` already does). Pure, no React, no client.
2. **SPA — two call sites, and note they are currently inconsistent:**
   - `storage.js:87-98` `loadLS` already stamps missing ids — replace that inline `.map()` with the helper.
   - `storage.js:159-163` `syncFromSupabase` runs `migrateTypes` but **never stamps ids at all**, so data
     fresh from Supabase is only normalized after it round-trips through localStorage. Add the helper here.
3. **Public pages — 6 independent fetch sites, there is no shared loader:** `Index.jsx:35`,
   `Schedule.jsx:137`, `Results.jsx:87`, `Me.jsx:122`, `Leaderboard.jsx:82`, `tv/TV.jsx:36`. Each does its
   own `sb.from('sessions').select('value')` and then `setSessions(sR.data?.value || {})`. Wrap each in the
   helper. *(Creating a genuinely shared public session loader is the better end state but is a bigger
   refactor across 6 components — out of scope here; note it for #82.)*
4. **One-time data normalization** so the stored blob is clean rather than only fixed-on-read: a small
   script (mirror `scripts/audit-session-registry.mjs`'s shape) that reads the `sessions` blob, stringifies
   every numeric id, writes it back once. Run against **local first**, then prod.

### ⚠️ The safety property that makes this work — verify it before writing anything

Existing `results_v2` rows already store `String(<the number>)`. Normalizing the blob produces
`String(<the same number>)`. **Both sides therefore produce the identical string and existing results keep
matching.** This must be confirmed, not assumed — `1780763563709.0518` is ~17 significant digits, at the
edge of double precision.

**First step of the session:** query the 7 legacy sessions' ids from the blob and the distinct
`session_id` values in `results_v2`, and confirm `String(blobId)` is byte-equal to the stored text. If it
is *not*, stop — this becomes a data-migration plan that must rewrite `results_v2.session_id` too, which
is a different and much larger job.

## Files

| File | Change |
|---|---|
| `src/public/lib/sessions.js` | **new** `normalizeSessionIds` |
| `src/public/lib/sessions.test.js` *(new)* | tests (below) |
| `src/utils/storage.js` | `loadLS` uses the helper; `syncFromSupabase` gains it |
| `src/public/{index,schedule,results,me,leaderboard,tv}/*.jsx` | wrap the 6 fetch sites |
| `scripts/normalize-session-ids.mjs` *(new)* | the one-time blob fix |
| `CLAUDE.md` | record the contract |

## Tests

- Numeric id → string, value preserved exactly (`1780763563709.0518` round-trips byte-identical).
- String id passes through untouched (no double-stringify, no `"undefined"`).
- Missing id gets a fresh `uid()`; existing ids are never regenerated (idempotent — run it twice, same output).
- Empty blob / missing dateKey arrays / `null` entries don't throw.
- A `results_v2`-shaped `sessionId` string matches its normalized session — the actual bug, pinned.

## Verification

- `npm test` → 551 + new, all green. `npm run lint` → still **84 (0 err)**; CI fails at 85.
- **Live, against the seeded local stack** (`supabase start` → `seed-dev.mjs` → `npm run dev`), on a
  **June 2026** session specifically — that is the only data that reproduces this:
  - Resultados → Registro: the June session **opens** (it currently highlights and does nothing).
  - Log a result against it, then **re-log** it → confirm in Studio that it **UPDATED one row**, not
    inserted a second. This is the #110 acceptance test.
  - `results.html?session=<legacy id>` deep-links correctly; the ranking renders instead of empty.
  - `schedule.html`: the "already logged" checkmark appears.
- ⚠️ If a change doesn't appear, check **service-worker poisoning first** (CLAUDE.md) — `sw.js` scopes to
  `/CrossFit-Apps/` and serves the SPA precached prod assets on localhost with no console error.

## Out of scope

Not fixing #82 (normalizing `sessions` out of the JSONB blob), which would kill this class permanently —
this plan makes the current shape correct. Not touching the safe number-vs-number comparisons listed above.

Model: Sonnet · Size: S–M
