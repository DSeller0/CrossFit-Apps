-- Run this in the Supabase SQL Editor (dashboard → SQL Editor → New query)
-- Creates submit_pr and clear_pr RPCs used by me.html PR log sheet

-- Drop ALL overloads of these functions before recreating
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname IN ('submit_pr', 'clear_pr')
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END;
$$;

-- ============================================================
-- submit_pr
--   Appends a result to an athlete's PR, creating the PR if
--   it does not yet exist. Keeps the last 5 results (matches
--   the Atletas tab addResult behaviour).
-- ============================================================
CREATE OR REPLACE FUNCTION submit_pr(
  p_athlete_id  TEXT,
  p_exercise    TEXT,
  p_value       TEXT,
  p_unit        TEXT,
  p_reps        TEXT     DEFAULT NULL,
  p_categories  TEXT[]   DEFAULT '{}',
  p_is_pr_best  BOOLEAN  DEFAULT FALSE,
  p_note        TEXT     DEFAULT NULL,
  p_date        TEXT     DEFAULT NULL,
  p_target      TEXT     DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goals    JSONB;
  v_prs      JSONB;
  v_ath_prs  JSONB;
  v_pr_idx   INT := -1;
  v_pr       JSONB;
  v_result   JSONB;
  v_results  JSONB;
  v_rebuilt  JSONB;
  i          INT;
BEGIN
  -- Load row
  SELECT value INTO v_goals FROM goals_data WHERE id = 1;
  v_goals   := COALESCE(v_goals, '{"prs":{},"athleteGoals":{}}'::JSONB);
  v_prs     := COALESCE(v_goals -> 'prs',         '{}'::JSONB);
  v_ath_prs := COALESCE(v_prs  -> p_athlete_id,   '[]'::JSONB);

  -- Build result entry
  v_result := jsonb_build_object(
    'value', p_value,
    'date',  COALESCE(p_date, to_char(NOW(), 'YYYY-MM-DD'))
  );
  IF p_reps IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('reps', p_reps);
  END IF;
  IF p_note IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('note', p_note);
  END IF;

  -- Find existing PR by name (case-insensitive)
  FOR i IN 0 .. jsonb_array_length(v_ath_prs) - 1 LOOP
    IF lower(v_ath_prs -> i ->> 'name') = lower(p_exercise) THEN
      v_pr_idx := i; EXIT;
    END IF;
  END LOOP;

  IF v_pr_idx >= 0 THEN
    -- Existing PR: append result, cap at 5
    v_pr      := v_ath_prs -> v_pr_idx;
    v_results := COALESCE(v_pr -> 'results', '[]'::JSONB) || jsonb_build_array(v_result);

    IF jsonb_array_length(v_results) > 5 THEN
      SELECT jsonb_agg(el ORDER BY ord ASC) INTO v_results
      FROM (
        SELECT el, ord
        FROM jsonb_array_elements(v_results) WITH ORDINALITY AS t(el, ord)
        ORDER BY ord DESC
        LIMIT 5
      ) sub;
    END IF;

    v_pr := v_pr || jsonb_build_object('results', v_results);
    IF p_target IS NOT NULL THEN
      v_pr := v_pr || jsonb_build_object('target', p_target);
    END IF;

    -- Rebuild athlete PR array with updated entry
    v_rebuilt := '[]'::JSONB;
    FOR i IN 0 .. jsonb_array_length(v_ath_prs) - 1 LOOP
      v_rebuilt := v_rebuilt || CASE
        WHEN i = v_pr_idx THEN jsonb_build_array(v_pr)
        ELSE jsonb_build_array(v_ath_prs -> i)
      END;
    END LOOP;
    v_ath_prs := v_rebuilt;

  ELSE
    -- New PR
    v_pr := jsonb_build_object(
      'id',         gen_random_uuid()::TEXT,
      'name',       p_exercise,
      'type',       CASE
                      WHEN p_unit = 'time'            THEN 'time'
                      WHEN p_unit IN ('reps', 'm')    THEN 'reps'
                      ELSE 'load'
                    END,
      'unit',       p_unit,
      'target',     p_target,
      'category',   CASE WHEN array_length(p_categories, 1) > 0
                         THEN p_categories[1] ELSE NULL END,
      'categories', to_jsonb(p_categories),
      'results',    jsonb_build_array(v_result)
    );
    v_ath_prs := v_ath_prs || jsonb_build_array(v_pr);
  END IF;

  -- Write back
  v_prs   := jsonb_set(v_prs, ARRAY[p_athlete_id], v_ath_prs);
  v_goals := jsonb_set(v_goals, '{prs}', v_prs);

  UPDATE goals_data SET value = v_goals WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO goals_data(id, value) VALUES(1, v_goals);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_pr TO anon, authenticated;


-- ============================================================
-- clear_pr
--   Removes all results for an exercise from an athlete's PRs.
-- ============================================================
CREATE OR REPLACE FUNCTION clear_pr(
  p_athlete_id  TEXT,
  p_exercise    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goals    JSONB;
  v_prs      JSONB;
  v_ath_prs  JSONB;
  v_rebuilt  JSONB;
  i          INT;
BEGIN
  SELECT value INTO v_goals FROM goals_data WHERE id = 1;
  IF v_goals IS NULL THEN RETURN; END IF;

  v_prs     := COALESCE(v_goals -> 'prs',       '{}'::JSONB);
  v_ath_prs := COALESCE(v_prs  -> p_athlete_id, '[]'::JSONB);

  -- Filter out the matching PR
  v_rebuilt := '[]'::JSONB;
  FOR i IN 0 .. jsonb_array_length(v_ath_prs) - 1 LOOP
    IF lower(v_ath_prs -> i ->> 'name') <> lower(p_exercise) THEN
      v_rebuilt := v_rebuilt || jsonb_build_array(v_ath_prs -> i);
    END IF;
  END LOOP;

  v_prs   := jsonb_set(v_prs, ARRAY[p_athlete_id], v_rebuilt);
  v_goals := jsonb_set(v_goals, '{prs}', v_prs);

  UPDATE goals_data SET value = v_goals WHERE id = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION clear_pr TO anon, authenticated;
