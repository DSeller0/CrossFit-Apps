-- Phase 4 schema — normalized results table
-- Run in Supabase Dashboard → SQL Editor → New query
-- BEFORE running scripts/migrate-phase4.mjs
--
-- What this does NOT change:
--   sessions, athletes, events, locations, coach_profile, settings,
--   exercise_registry, goals_data, lb_colors, templates — all stay as
--   single-row JSONB blobs (see supabase-schema.sql).
--
-- is_allowed_user() and allowed_emails already exist from supabase-auth-policies.sql.

-- ── results_v2 ────────────────────────────────────────────────────────────────
-- One row per result (one athlete per session).
-- Replaces: results table (id=1, value=JSONB array).

CREATE TABLE IF NOT EXISTS results_v2 (
  id                TEXT PRIMARY KEY,
  date              TEXT NOT NULL,
  athlete_id        TEXT,
  session_id        TEXT,
  presence          TEXT DEFAULT 'Presente',
  energy_level      SMALLINT,
  blocks            JSONB DEFAULT '[]',
  coach_note        TEXT DEFAULT '',
  flag_for_review   BOOLEAN DEFAULT FALSE,
  logged_by_athlete BOOLEAN DEFAULT FALSE,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  -- Safety net: one result row per athlete per session.
  UNIQUE (athlete_id, session_id)
);

ALTER TABLE results_v2 ENABLE ROW LEVEL SECURITY;

-- Public pages read results (leaderboard, schedule, me, athletes)
CREATE POLICY "public read"
  ON results_v2 FOR SELECT USING (true);

-- Athletes (anon) log results: INSERT for new, UPDATE for re-logging same session
CREATE POLICY "public result insert"
  ON results_v2 FOR INSERT WITH CHECK (true);

CREATE POLICY "public result update"
  ON results_v2 FOR UPDATE USING (true) WITH CHECK (true);

-- Coach full access (delete, admin edits)
CREATE POLICY "auth write"
  ON results_v2 FOR ALL
  USING (is_allowed_user())
  WITH CHECK (is_allowed_user());
