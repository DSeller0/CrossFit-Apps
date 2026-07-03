-- Anon write hardening (results_v2 + class_executions) — closes backlog #7
-- (docs/reviews/2026-07-03-rls-probe.md, docs/plans/05-anon-write-hardening.md).
-- The public anon key could UPDATE any row of results_v2 / class_executions, not just
-- the caller's own — including coach-only columns (coach_note, flag_for_review) and
-- athlete_id reassignment. Moves the two legitimate anon mutations behind SECURITY
-- DEFINER RPCs that perform exactly the intended change, then revokes direct anon
-- INSERT/UPDATE on both tables (SELECT stays public). Coach paths are unaffected —
-- they write directly under is_allowed_user(), which this migration does not touch.
-- Must run after 0001 (whose blanket grant this narrows) — ensured by file ordering.

-- ── class_checkin — append-only check-in for class_executions ──────────────────
-- Used by Schedule.jsx's public check-in (submitCheckin, ~697). Appends the athlete/guest
-- to the roster if not already present; touches nothing else on the row (no roster wipe,
-- no group/anon_results tampering).

CREATE OR REPLACE FUNCTION class_checkin(
  p_class_id    TEXT,
  p_athlete_id  TEXT DEFAULT NULL,
  p_guest_name  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_athlete_ids JSONB;
  v_anon_names  JSONB;
BEGIN
  SELECT COALESCE(athlete_ids, '[]'::JSONB), COALESCE(anon_names, '[]'::JSONB)
    INTO v_athlete_ids, v_anon_names
  FROM public.class_executions
  WHERE id = p_class_id;

  IF NOT FOUND THEN RETURN; END IF;

  IF p_athlete_id IS NOT NULL THEN
    IF NOT (v_athlete_ids ? p_athlete_id) THEN
      UPDATE public.class_executions
      SET athlete_ids = v_athlete_ids || to_jsonb(p_athlete_id)
      WHERE id = p_class_id;
    END IF;
  ELSIF p_guest_name IS NOT NULL THEN
    UPDATE public.class_executions
    SET anon_names = v_anon_names || to_jsonb(p_guest_name)
    WHERE id = p_class_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION class_checkin TO anon, authenticated;

REVOKE UPDATE ON public.class_executions FROM anon;

-- The old permissive update policy had no TO clause, so it applied to every role,
-- not just anon — an attacker could self-serve an `authenticated` session (email
-- OTP signup is open; is_allowed_user() is checked by "auth write" below, not by
-- this policy) and bypass the RPC above entirely via a direct PATCH. Dropping it
-- leaves "auth write" (is_allowed_user()) as the only UPDATE path, which SECURITY
-- DEFINER functions bypass anyway (their owner has BYPASSRLS). Named both ways —
-- prod's actual dashboard-built policy is "ce_update_anon"; a fresh stack built
-- purely from 0001_init.sql (which hand-reconstructed the policy as "public update"
-- since prod's real DDL was never captured in SQL before this migration) has the
-- other name. IF EXISTS makes this migration idempotent across both histories.
DROP POLICY IF EXISTS "public update" ON public.class_executions;
DROP POLICY IF EXISTS "ce_update_anon" ON public.class_executions;

-- ── log_result — athlete self-log for results_v2 ────────────────────────────────
-- Used by Schedule.jsx (submitLog ~906, submitDeskReg ~935) and Results.jsx (doSubmit ~187).
-- Upserts on the existing UNIQUE(athlete_id, session_id) constraint, writing only the
-- athlete-owned columns — never coach_note / flag_for_review, and an existing row always
-- keeps its own athlete_id since that's part of the conflict target, not an updated column.

CREATE OR REPLACE FUNCTION log_result(
  p_id            TEXT,
  p_date          TEXT,
  p_athlete_id    TEXT,
  p_session_id    TEXT,
  p_presence      TEXT,
  p_energy_level  SMALLINT,
  p_blocks        JSONB
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.results_v2
    (id, date, athlete_id, session_id, presence, energy_level, blocks, logged_by_athlete, updated_at)
  VALUES
    (p_id, p_date, p_athlete_id, p_session_id, p_presence, p_energy_level, p_blocks, TRUE, now())
  ON CONFLICT (athlete_id, session_id) DO UPDATE SET
    date              = excluded.date,
    presence          = excluded.presence,
    energy_level      = excluded.energy_level,
    blocks            = excluded.blocks,
    logged_by_athlete = TRUE,
    updated_at        = now();
$$;

GRANT EXECUTE ON FUNCTION log_result TO anon, authenticated;

REVOKE INSERT, UPDATE ON public.results_v2 FROM anon;

-- Same reasoning as class_executions above: these two policies had no TO clause
-- (applies to every role) and let a self-serve `authenticated` session bypass the
-- RPC via a direct PATCH/POST. "auth write" (is_allowed_user()) remains as the only
-- direct-table write path; SECURITY DEFINER functions bypass RLS regardless.
-- IF EXISTS for the same cross-history idempotency reason as class_executions above
-- (these two happen to be named identically in prod's real DDL and in 0001_init.sql).
DROP POLICY IF EXISTS "public result insert" ON public.results_v2;
DROP POLICY IF EXISTS "public result update" ON public.results_v2;
