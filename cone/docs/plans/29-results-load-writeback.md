# 29 — Stop the load-time `results_v2` write-back (+ `created_at`) (#76)

Backlog: **#76** (Icebox → Ready). From the 2026-07-16 full pass; found while planning #75.

## Context

`syncFromSupabase()` (`storage.js:144-178`) runs on every authed SPA startup
(`SyncContext.jsx:21-27`, gated on `!!session` since #81). At `storage.js:161` it calls
`saveResults(results)` on the freshly-pulled rows, and `saveResults` (`storage.js:107`) writes
localStorage **and** calls `dbSaveResults` → `.upsert(rows, {onConflict:'id'})`
(`supabase.js:60-66`); `resultToRow` stamps `updated_at: new Date().toISOString()` on **every
row** (`resultMappers.js:17`).

Net effect: a **read rewrites every `results_v2` row's `updated_at` to "now" on each page
load**. Consequences:
- (a) `updated_at` is **destroyed as a provenance signal** — which is precisely what killed
  date-gating as an option in #75.
- (b) Write amplification: the whole results array is re-upserted on every load.
- (c) There is **no `created_at`** at all, so "logged when" is unrecoverable.

Only lands when the coach is authenticated (anon writes revoked in `0003`), but the coach is
the SPA's only user, so it fires on effectively every SPA session.

> The same "read that writes" pattern exists for the other tables in the pull (`saveLS`,
> `saveAthletes`, … each call their `dbSave*`), but those are **single-row JSONB blobs** where a
> whole-table `updated_at` bump is far less harmful (it isn't a per-record provenance signal).
> This item is **results-only**; the blob write-back is captured as a follow-up note (below).

## Acceptance

- Logging into the SPA (which triggers `syncFromSupabase`) **does not change** any existing
  `results_v2` row's `updated_at`.
- A genuine result write (self-log or coach `saveLog`) still upserts normally and bumps
  `updated_at`.
- `results_v2` has a `created_at` column: auto-set once on INSERT, **preserved** across
  subsequent upserts/edits of the same row.
- `npm test` green (with a new test locking the no-write-on-pull behaviour); `build:all` clean.
- Prod DDL delivered to the user as titled SQL for manual apply (not `db push`).

## Files

- `src/utils/storage.js` — the fix (pull caches results to LS only).
- `supabase/migrations/0007_results_created_at.sql` — **new**; add `created_at`.
- `src/utils/resultMappers.js` — surface `createdAt` in `mapResultRow`; keep `resultToRow`
  omitting `created_at` from its payload.
- A test under `src/` (extend `resultMappers.test.js` or a storage test) — assert `resultToRow`
  sends no `created_at`, and the pull path doesn't call `dbSaveResults`.

## Approach

1. **Break the pull→write coupling for results.** Add a localStorage-only helper next to
   `saveResults` (e.g. `cacheResultsLS(results)` that does the `localStorage.setItem(LS_RESULTS, …)`
   only), and call it from `syncFromSupabase` at `:161` instead of `saveResults`. The pull now
   populates the LS cache + returns data without re-upserting. `saveResults` is **unchanged** so
   genuine writes still persist and bump `updated_at`.
2. **Add `created_at`** via `0007_results_created_at.sql`:
   `ALTER TABLE results_v2 ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();`
   plus a backfill of existing rows to `updated_at` (best available proxy) in the same migration.
   - `resultToRow` continues to **omit** `created_at` — on INSERT the DB default fills it; on
     conflict-UPDATE it's absent from the SET list so the existing value is preserved (supabase-js
     upsert only SETs provided columns). `mapResultRow` gains `createdAt: row.created_at`.
   - `updated_at` provenance is restored by step 1 alone (client keeps stamping it only on real
     saves). A DB `BEFORE UPDATE` trigger to own `updated_at` server-side was considered and
     **deferred** — not needed once the pull stops writing, and it would add surface area.
3. **Migration discipline** (CLAUDE.md): additive + `IF NOT EXISTS`, safe. **Do not
   `supabase db push`** (would drag local-only `0005`/`0006` onto prod and error). Record `0007`
   local-only; hand the user the standalone `ALTER TABLE` + backfill as **titled SQL**, then
   `supabase migration repair --status applied 0007` after they apply it (same flow as #81).

## Verification

Local stack:
- Note an existing `results_v2` row's `updated_at` (REST or psql). Log into the SPA → the pull
  runs → re-query: `updated_at` **unchanged** (previously bumped to now). This is the core proof.
- Create a new result (self-log) → `created_at` populated, equals `updated_at` at creation.
- Edit that result via Resultados → `updated_at` bumps, `created_at` **stable**.
- `npm test` + `npm run build:all` green.

## Follow-up (capture, don't do here)
The blob-table write-back on pull (`saveLS`/`saveAthletes`/… inside `syncFromSupabase`) is the
same disease at lower cost — note it on the #76 row / a new icebox row rather than widening this
session.

Model: Sonnet · Size: M
