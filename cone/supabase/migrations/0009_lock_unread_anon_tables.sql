-- Close the anon read surface on four tables no public page reads — closes backlog #150
-- (docs/reviews/2026-08-05-full-pass.md, finding R2).
--
-- Same finding shape as #81/`0006`, which closed `coach_profile` (Pix key) and `locations`
-- (service rates) and left these four behind. Every anon-readable table was mapped against its
-- real `.from()` call sites in the 2026-08-05 full pass; four have ZERO public-page readers:
--
--   events      — the coach's agenda: label · notes · athleteIds · local · durationMin, i.e.
--                 personal-training appointments and free-text notes. Reached only through
--                 src/utils/supabase.js:74, the AUTHENTICATED SPA client. The worst of the four.
--   templates   — session templates (Criador), SPA-only.
--   results     — the legacy v1 results blob, superseded by results_v2.
--   lb_colors   — zero references anywhere in src/ since plans/48 deleted the client leg;
--                 #60 wants the table gone entirely, and this is the conservative half of that.
--
-- Each table keeps its own `is_allowed_user()` write policy, which is `FOR ALL` (no `FOR`
-- clause = ALL) and therefore covers the coach's READ too — exactly the mechanism `0006` relies
-- on. Verified against prod's dump, not assumed: `events`/`results`/`lb_colors` carry
-- "auth write", `templates` carries "allowed write templates", all four with
-- USING (is_allowed_user()) WITH CHECK (is_allowed_user()).
--
-- 🔴 AND A WRITE HOLE, found while dumping prod's real policy names for the reads above:
-- legacy `results` still carries a permissive "public result insert" AND `GRANT ALL ... TO anon`.
-- #7/`0003` revoked anon INSERT/UPDATE on results_v2 and dropped its permissive policies, but
-- never touched the v1 table — so the public anon key can still insert rows there today. Closed
-- below the same way `0003` closed results_v2: drop the policy AND revoke the grant.
-- (The other three need no revoke: `GRANT ALL` is inert without a permissive policy, and none of
-- them has one — RLS, not the grant, is the defense. Only `results` had both.)
--
-- ⚠️ POLICY NAMES DIVERGE BETWEEN PROD AND 0001, which is why both spellings are dropped:
-- prod's read policy on `templates` is "public read templates" while 0001 reconstructed it as
-- "public read". Enumerated with `supabase db dump --linked --schema public` (authoritative);
-- do NOT trust `db diff --linked` for this — it silently ignores RLS-policy divergence, the #34
-- lesson. IF EXISTS everywhere makes this idempotent across both histories.
--
-- ⚠️ This does NOT make hidden `public:false` sessions private — `sessions` is still one
-- anon-readable JSONB blob (#82), and `?box=` is a view filter, not access control (#80).

DROP POLICY IF EXISTS "public read"           ON public.events;
DROP POLICY IF EXISTS "public read"           ON public.templates;
DROP POLICY IF EXISTS "public read templates" ON public.templates;
DROP POLICY IF EXISTS "public read"           ON public.results;
DROP POLICY IF EXISTS "public read"           ON public.lb_colors;

-- The legacy-results write hole (see above).
DROP POLICY IF EXISTS "public result insert" ON public.results;
DROP POLICY IF EXISTS "public result update" ON public.results;

REVOKE INSERT, UPDATE, DELETE ON public.results FROM anon;
