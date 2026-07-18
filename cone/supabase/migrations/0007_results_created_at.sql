-- 0007 — results_v2 gains a created_at column (#76).
--
-- The load-time write-back in src/utils/storage.js re-upserted every results_v2
-- row on every authed SPA pull (saveResults → dbSaveResults stamps updated_at =
-- now() on each row), which destroyed updated_at as a per-row provenance signal
-- (see #75/#76). storage.js is fixed to cache-only on pull in the same change.
--
-- created_at is the companion: a durable "logged when" the pull can never clobber.
-- Client payloads (resultMappers.js `resultToRow`) intentionally OMIT created_at,
-- so INSERT fills the column default and a conflict-UPDATE leaves the existing
-- value untouched (supabase-js upsert only SETs the columns it is given).
--
-- Additive + IF NOT EXISTS: safe against prod, whose results_v2 predates the CLI
-- migration workflow. Recorded LOCAL-ONLY — do NOT `supabase db push` (it would drag
-- the local-only 0005/0006 onto prod and error). Apply to prod as the standalone
-- ALTER + backfill below (SQL editor / targeted psql), then:
--   supabase migration repair --status applied 0007

alter table results_v2
  add column if not exists created_at timestamptz not null default now();

-- One-time backfill: after ADD COLUMN every existing row's created_at was just
-- defaulted to the migration's transaction time. Overwrite with updated_at, the
-- best available proxy for when the row was actually logged. Rows created AFTER
-- this migration get created_at from the default and are never touched by this.
update results_v2
  set created_at = updated_at
  where updated_at is not null;
