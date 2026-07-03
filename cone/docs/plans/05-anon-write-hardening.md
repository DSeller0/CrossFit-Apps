# 05 — Anon write hardening (results_v2 + class_executions)

## Context
The RLS probe on 2026-07-03 ([reviews/2026-07-03-rls-probe.md](../reviews/2026-07-03-rls-probe.md), backlog **#7**) confirmed empirically against the local stack: the public anon key — which ships in the client bundle — can UPDATE **any** row of `results_v2` and `class_executions`, not just the athlete's own. Concretely, a visitor with dev tools open can overwrite any athlete's logged result (including coach-only `coach_note`/`flag_for_review`), reassign a result's `athlete_id`, and wipe or forge any class's roster/guest-results/rotation-groups. DELETE and forged-INSERT are already blocked; the exposure is **overwrite/append tampering**. Root cause: the `using(true) with check(true)` policies can't scope to the acting athlete because public pages have no athlete login (deliberate — see the auth decision in CLAUDE.md).

The proportionate fix — matching the precedent already set by `submit_pr`/`clear_pr` — is to move the two legitimate anon mutations behind `SECURITY DEFINER` RPCs that perform exactly the intended change, then revoke direct anon write on both tables. This removes arbitrary-row and coach-column tampering. It does **not** stop a caller from passing someone else's `athlete_id` (that needs per-athlete identity, tracked separately as #30/#31) — but it collapses the surface from "PATCH any row/column" down to "append a check-in" and "upsert an athlete-owned result keyed by (athlete_id, session_id)."

## Acceptance
- With direct anon UPDATE revoked, a raw `PATCH /rest/v1/results_v2?id=eq.<any>` and `PATCH /rest/v1/class_executions?id=eq.<any>` from the anon key both fail (verified against local stack, the same way the probe demonstrated the hole).
- The real flows still work end-to-end on the local stack: athlete check-in (real + guest) from schedule.html, and athlete self-log of a result (schedule.html desktop-reg, schedule.html athlete self-log, results.html).
- Anon can no longer set `coach_note` / `flag_for_review` on `results_v2`, nor reassign `athlete_id` on an existing row.
- Coach paths (TvController live-registration, results editing) unchanged — they run authenticated under `is_allowed_user()`.

## Files
- `cone/supabase/migrations/0003_anon_write_rpcs.sql` (new) — the two RPCs + `REVOKE UPDATE` (and `INSERT` on results_v2) from `anon`.
- `cone/src/public/schedule/Schedule.jsx` — `submitCheckin()` (~697) → call `class_checkin` RPC; the two anon self-log upserts (~913 desktop-reg, ~943 athlete self-log) → call `log_result` RPC.
- `cone/src/public/results/Results.jsx` — anon self-log upsert (~204) → call `log_result` RPC.
- Reuse the existing normalized shape from `resultMappers.js` where the RPC params mirror it.

## Approach
1. **`class_checkin(p_class_id text, p_athlete_id text default null, p_guest_name text default null)`** — SECURITY DEFINER, `set search_path = ''`. Appends `p_athlete_id` to `athlete_ids` (only if absent) or `p_guest_name` to `anon_names`; touches nothing else. `GRANT EXECUTE ... TO anon`. This is the only write anon needs on `class_executions`, so follow with `REVOKE UPDATE ON class_executions FROM anon` (keep SELECT; INSERT/DELETE are already coach-only via the absence of a public policy + the RLS filter).
2. **`log_result(...)`** — SECURITY DEFINER, `set search_path = ''`. Params = the athlete-owned columns only (`p_id, p_date, p_athlete_id, p_session_id, p_presence, p_energy_level, p_blocks jsonb`). Upserts on the existing `UNIQUE (athlete_id, session_id)` constraint, writing only those columns and **never** `coach_note`/`flag_for_review` (leaves them at their existing/default value). `GRANT EXECUTE ... TO anon`, then `REVOKE INSERT, UPDATE ON results_v2 FROM anon` (keep SELECT). Coach still writes directly under `is_allowed_user()`.
3. **Client swaps** — replace the four `sb.from(...).upsert/update(...)` anon call sites with `sb.rpc('class_checkin'|'log_result', {...})`. Same inputs the code already computes; drop the coach-only fields from the payload. Error handling stays as-is (the call sites already surface an error string on failure).
4. **Migration hygiene** — because 0001's blanket grant runs `grant ... update ... to anon` on all tables, the REVOKEs in 0003 must come *after* it in migration order (they do, by number). Confirm on a fresh `supabase db reset` that anon ends up with SELECT-only on both tables (plus EXECUTE on the two RPCs).

## Alternatives considered (not chosen)
- **Column-level GRANT revoke only** (no RPC): `revoke update (coach_note, flag_for_review, athlete_id) on results_v2 from anon`. Lighter, but leaves blind cross-row overwrite of the athlete-owned columns intact, and doesn't help `class_executions` at all (its whole-row overwrite is the #7 core). Rejected as half a fix.
- **Full per-athlete auth (#30/#31):** the only thing that closes forged-identity inserts, but heavyweight and a separate track. This plan is the proportionate interim step and is compatible with #30/#31 landing later.

## Verification
- `supabase db reset` → `node scripts/seed-dev.mjs`. Re-run the probe's exact `curl` PATCHes against both tables with the anon key → both now rejected (was 204+persisted).
- `npm run dev:public`, drive on the local stack: check in a real athlete + a guest from schedule.html (confirm they land in `athlete_ids`/`anon_names` via a service-role read), self-log a result from schedule.html and results.html (confirm the row upserts and `coach_note`/`flag_for_review` are untouched).
- Confirm a coach-side edit (Results tab / TvController register) still writes, i.e. the `is_allowed_user()` path is unaffected.
- `npm test` green; commit + push.

Model: Sonnet · Size: M (grew from #7's original S scope — the probe turned "document the rule" into "close the hole")
