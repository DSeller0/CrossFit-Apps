-- 0006: lock business-data reads (Pix key + service rates) to the coach.
--
-- Backlog #81. Surfaced while building #80 (per-box soft scoping): the SPA email
-- login gates WRITES, not READS. Every blob table shipped with BOTH
--   "auth write"  FOR ALL    USING (is_allowed_user())   -- coach read + write
--   "public read" FOR SELECT USING (true)                -- anon read
-- so anyone with the anon key (embedded in every public page + committed in
-- .env.production) could GET /rest/v1/coach_profile and read the Pix key, or
-- GET /rest/v1/locations and read every service rate — no login required.
--
-- Fix: drop the permissive "public read" on these two tables ONLY. The remaining
-- "auth write" policy is FOR ALL, so its USING(is_allowed_user()) also governs
-- SELECT — the authenticated coach still reads (and writes) both tables; anon now
-- gets zero rows. No public page renders either table (Leaderboard's dead fetch is
-- removed in the same change), so nothing on the public side regresses. The SPA is
-- fully behind login, and its startup sync is gated on the session (SyncContext),
-- so the coach's own reads always carry the authenticated JWT.
--
-- Prod verified (supabase db dump --linked, 2026-07-17): both tables carry exactly
-- "auth write" (FOR ALL) + "public read" (FOR SELECT USING true) — the policy names
-- match 0001, no divergence. Safe to drop by name. IF EXISTS keeps it idempotent.
--
-- NOT fixed here (structural, stays tracked in #81): hidden sessions (public:false)
-- can't be RLS-protected while `sessions` is a single JSONB blob — RLS filters rows,
-- not fields inside one blob row. That stays client-side/bypassable until sessions
-- normalize into per-row storage like results_v2.

drop policy if exists "public read" on public.coach_profile;
drop policy if exists "public read" on public.locations;
