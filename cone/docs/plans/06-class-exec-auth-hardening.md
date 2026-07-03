# 06 — class_executions authenticated INSERT/DELETE hardening (#34)

> ✅ Done: 31b4f39 · 2026-07-03 — see BACKLOG.md "Done (recent)" for the shipped summary. `supabase db dump --linked` confirmed prod's real policy set (`ce_select_anon`/`ce_insert_auth`/`ce_delete_auth`, no `is_allowed_user()` policy, no UPDATE policy) — so #34 came bundled with an **active** coach-UPDATE regression `0003` had introduced on prod only; `0004` fixes both. 11/11 local reproduce→fix checks passed; shipped to prod and re-dumped to confirm.

## Context
#7 ([plans/05](./05-anon-write-hardening.md), `0003_anon_write_rpcs.sql`) closed anon UPDATE-tampering on `results_v2` + `class_executions` but deliberately left the **authenticated-role** hole on `class_executions`. Prod's real (dashboard-built) policies — names confirmed via `supabase db diff --linked` during #7 — include:
- `ce_insert_auth` — INSERT scoped to `auth.role() = 'authenticated'`
- `ce_delete_auth` — DELETE scoped to `auth.role() = 'authenticated'`

Because OTP signup is open to any email (`is_allowed_user()` is enforced by policy, not by signup), anyone can self-serve an `authenticated` session and **forge new class rows or delete real ones**, bypassing the coach-only intent. `0003` only fixed the UPDATE vector (in scope for #7); INSERT/DELETE is this separate fix.

**These two policies exist only on prod.** The local reconstruction ([0001_init.sql:225-227](../../supabase/migrations/0001_init.sql)) uses a clean `"auth write"` (`is_allowed_user()`, all commands). So #34 is a **prod-only policy fix**, made idempotent for local via `IF EXISTS` — the same cross-history pattern `0003` used.

**Latent risk to check first (possible #7 regression on prod):** `0003` dropped `ce_update_anon` on prod. The coach's live-registration/rotation UPDATEs ([useLiveRegistration.js:46/76](../../src/hooks/useLiveRegistration.js), [useGroupRotation.js:138/149/172](../../src/hooks/useGroupRotation.js)) now only work if prod has an `is_allowed_user()` write policy on `class_executions`. #7 verified coach writes on **local** (which has `"auth write"`) but not on prod (no service-role key). If prod lacks that policy, coach live-registration is already broken on prod — and this fix (guaranteeing `"auth write"`) resolves it either way.

## Coach paths that must keep working (verified via grep)
- **Class create** (INSERT): [useClassTracking.js:33](../../src/hooks/useClassTracking.js) — SPA authenticated coach.
- **End class** is an UPDATE (`reset_at`), not a delete: [useClassTracking.js:39](../../src/hooks/useClassTracking.js).
- **No client code deletes `class_executions`** anywhere → dropping `ce_delete_auth`, leaving only `is_allowed_user()` DELETE, breaks nothing.
- Anon check-in already goes through the `class_checkin` SECURITY DEFINER RPC (owner bypasses RLS) → unaffected.

## Acceptance
- A self-served **authenticated non-coach** session (e.g. `attacker@example.com`) can **no longer INSERT a forged `class_executions` row nor DELETE an existing one**.
- **Allowlisted coach** can still create a class (INSERT), end it (UPDATE `reset_at`), and run live-registration/rotation UPDATEs — on both local and prod.
- Anon check-in via `class_checkin` RPC still works.
- Migration idempotent across both histories: the two `DROP`s are no-ops on a fresh local stack (policies don't exist there), effective on prod.

## Files
- `cone/supabase/migrations/0004_class_exec_auth_hardening.sql` (new) — the whole fix.
- Docs: `cone/docs/BACKLOG.md` (#34 → Done), this file's Done marker, `cone/CLAUDE.md` RLS note (residual-gap paragraph → resolved).
- No client/JSX changes (policy-only).

## Approach
1. **Diagnose prod first** (`supabase link` done in #7): `supabase db diff --linked` and/or read-only `select * from pg_policies where tablename='class_executions'` to capture prod's actual policy set + the exact `ce_insert_auth`/`ce_delete_auth` definitions, and whether an `is_allowed_user()` write policy already exists (and its name).
2. **Write `0004`**, in order:
   - **Guarantee coach write path**: `DROP POLICY IF EXISTS "auth write" ON public.class_executions;` then `CREATE POLICY "auth write" ... FOR ALL USING (is_allowed_user()) WITH CHECK (is_allowed_user());`. Makes prod match local and closes any latent #7 UPDATE regression. (If diff shows an equivalently-named prod policy, keep this anyway — redundant permissive policies are harmless; note in a comment.)
   - **Close the hole**: `DROP POLICY IF EXISTS "ce_insert_auth" ...;` and `DROP POLICY IF EXISTS "ce_delete_auth" ...;`. `IF EXISTS` → no-op on local, effective on prod.
   - Header comment: prod-only scope + idempotency, mirroring `0003`'s style.
3. **Local verify** by reproducing prod's gap (see Verification).
4. **Ship to prod** via `supabase db push` (only `0004` applies; `0001`/`0002` repair-marked, `0003` already applied).
5. **Docs**: #34 → Done, add this file's Done marker, update CLAUDE.md RLS note.

## Verification
**Local — reproduce → fix:**
1. `supabase db reset` → `node scripts/seed-dev.mjs`. `class_executions` starts clean, so reproduce prod first via psql: `CREATE POLICY "ce_insert_auth" ON public.class_executions FOR INSERT TO authenticated WITH CHECK (true);` + the DELETE analog (exact defs from step 1's diff).
2. Sign up `attacker@example.com` (open OTP → authenticated, non-allowlisted JWT). Confirm attacker **can** INSERT a forged class row + DELETE an existing one → reproduces #34.
3. Apply `0004`. Confirm the same attacker JWT is now **denied** INSERT and DELETE.
4. Confirm coach path: an allowlisted `is_allowed_user()` session INSERTs a class + UPDATEs `reset_at`; anon `class_checkin` RPC still appends a roster entry.

**Prod — coach not broken (post-push):**
- Log into prod app as the real coach, create a class from Quadro ao Vivo, register a live result, end it → confirms `is_allowed_user()` INSERT + UPDATE (real authenticated session, no service key needed; also clears any latent #7 live-registration regression).
- Attack-vector re-verification stays on **local** to avoid writing/deleting real prod rows. Optional low-risk prod INSERT probe with a throwaway authenticated JWT (expect denial; nothing created) — do **not** attempt a prod DELETE probe.

**Gate:** `npm test` green; `/security-review` (touches RLS); commit + push.

Model: Sonnet · Size: M
