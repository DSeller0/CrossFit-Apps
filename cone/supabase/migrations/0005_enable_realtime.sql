-- Enable Realtime (postgres_changes) on the tables the app subscribes to.
--
-- Closes a local-dev gap found while testing the quick-wins batch: the local
-- supabase_realtime publication had ZERO tables in it (confirmed via
-- `select * from pg_publication_tables where pubname='supabase_realtime'`
-- returning 0 rows), so every .on('postgres_changes', ...) subscription in the
-- app silently never fired locally — symptoms: TV.jsx needed a manual reload
-- to show a newly pushed slide/QR, and TvController's "today's classes" list
-- needed a session switch to force loadClasses() after starting a new class.
-- Prod's publication was presumably configured via the dashboard (same class
-- of drift as the RLS policy-name gaps documented elsewhere in this repo) and
-- was never captured into a migration before now.
--
-- Tables, per every .on('postgres_changes', ...) call site:
--   tv_state          — TV.jsx, useTvSync.js
--   results_v2        — TV.jsx (live results slide)
--   class_executions  — TV.jsx, useClassTracking.js
--
-- Guarded per-table rather than a single ADD TABLE list so this is idempotent
-- whether run against a fresh local stack or a prod database that may already
-- have some/all of these tables published — plain `ALTER PUBLICATION ... ADD
-- TABLE` errors if the table is already a member, and Postgres has no native
-- IF NOT EXISTS for this operation.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tv_state'
  ) then
    alter publication supabase_realtime add table public.tv_state;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'results_v2'
  ) then
    alter publication supabase_realtime add table public.results_v2;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'class_executions'
  ) then
    alter publication supabase_realtime add table public.class_executions;
  end if;
end $$;
