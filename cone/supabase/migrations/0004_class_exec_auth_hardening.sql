-- class_executions authenticated INSERT/DELETE hardening — closes backlog #34
-- (docs/plans/06-class-exec-auth-hardening.md).
--
-- #7 (0003_anon_write_rpcs.sql) closed anon UPDATE-tampering but left
-- class_executions' INSERT/DELETE open to ANY authenticated role. Prod's real
-- (dashboard-built) policies — confirmed by a live `supabase db dump --linked` on
-- 2026-07-03 — were exactly these three, and nothing else:
--   ce_select_anon  SELECT USING (true)
--   ce_insert_auth  INSERT WITH CHECK (auth.role() = 'authenticated')
--   ce_delete_auth  DELETE USING     (auth.role() = 'authenticated')
-- So on prod there was no is_allowed_user() ("auth write") policy and — after 0003
-- dropped ce_update_anon — no UPDATE policy at all. Two problems:
--   1. #34: OTP signup is open to any email (is_allowed_user() is enforced by policy,
--      not by signup), so any self-served `authenticated` session could forge new
--      class rows or delete real ones via ce_insert_auth / ce_delete_auth.
--   2. A regression 0003 introduced on prod only: the coach's own end-class,
--      live-registration and group-rotation writes are UPDATEs, which now had no
--      permissive policy to allow them. (The 0001 local reconstruction already
--      carries "auth write", so local never lost coach UPDATE and didn't surface it.)
--
-- Fix: add the canonical is_allowed_user() "auth write" (FOR ALL) — restoring coach
-- INSERT/UPDATE/DELETE — then drop the two role-only policies so only allowlisted
-- coaches can write directly. Anon still reads (ce_select_anon / "public read") and
-- still checks in through the class_checkin SECURITY DEFINER RPC (owner bypasses RLS).
--
-- Idempotent across both histories (prod dashboard-built vs. 0001 reconstruction):
-- DROP IF EXISTS before CREATE for "auth write" (prod lacks it, local has it from
-- 0001), and IF EXISTS on the two role-only drops (prod has them, local never did).
-- Must run after 0003 — ensured by file ordering.

DROP POLICY IF EXISTS "auth write" ON public.class_executions;
CREATE POLICY "auth write" ON public.class_executions
  FOR ALL USING (is_allowed_user()) WITH CHECK (is_allowed_user());

DROP POLICY IF EXISTS "ce_insert_auth" ON public.class_executions;
DROP POLICY IF EXISTS "ce_delete_auth" ON public.class_executions;
