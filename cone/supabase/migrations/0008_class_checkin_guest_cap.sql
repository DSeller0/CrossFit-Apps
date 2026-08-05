-- Cap class_checkin's guest roster — closes backlog #71 (docs/plans/68-tier3-closeout.md §5).
--
-- 0003's athlete branch guards with `IF NOT (v_athlete_ids ? p_athlete_id)`; the guest branch
-- appended UNCONDITIONALLY. Five taps of Confirmar → five "Fulano" on the gym-wall roster, and
-- because class_checkin is anon-callable (GRANT ... TO anon) with no rate limit, anon_names was
-- an unbounded JSONB array any visitor could grow without limit.
--
-- 🔑 The fix is a CAP, deliberately NOT a server-side dedupe. Two real guests can genuinely
-- share a first name and BOTH must land on the roster — the coach reading the wall needs to see
-- two people. Distinguishing them is a question only the guest can answer, so it is asked on the
-- client (Schedule.jsx's check-in sheet opens a ConfirmReview-family prompt suggesting an initial
-- — "Fulano da Silva" → "Fulano S.") and this function stores whatever they confirm. A blind
-- `IF NOT (v_anon_names ? p_guest_name)` here would silently swallow the second real guest.
--
-- 20 is a class-roster ceiling, not a spam threshold: no real class fills 20 GUEST slots on top
-- of its enrolled athletes, so it never fires for a legitimate check-in while bounding the blob.
-- The client reads anon_names immediately before submitting and refuses at the same number
-- (GUEST_CAP in schedule/scheduleHelpers.js), so a full roster surfaces as a message instead of
-- this function's silent no-op. Keep the two in sync.
--
-- ⚠️ BACKLOG:319 records that #102 absorbs #71 — its migration recreates this same RPC.
-- 0008 IS NOW THE BASELINE #102 MUST BUILD ON; do not restart from 0003's uncapped body.
--
-- Everything else about the function is preserved verbatim from 0003: SECURITY DEFINER,
-- SET search_path = '', the append-only contract (no roster wipe, no group/anon_results
-- tampering), and the NOT FOUND early return. CREATE OR REPLACE keeps existing privileges,
-- but the GRANT is re-issued below so a stack replaying migrations from scratch is identical.
-- 0003's `REVOKE UPDATE ON public.class_executions FROM anon` is a table privilege and is
-- untouched by this migration.

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
    IF jsonb_array_length(v_anon_names) < 20 THEN
      UPDATE public.class_executions
      SET anon_names = v_anon_names || to_jsonb(p_guest_name)
      WHERE id = p_class_id;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION class_checkin TO anon, authenticated;
