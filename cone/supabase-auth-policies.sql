-- Step 4: Auth — update RLS policies
-- Run this in Supabase → SQL Editor → New query

-- ── Allowed users table ───────────────────────────────────────────────────────
-- Add or remove rows here to grant / revoke write access.
-- No code changes needed — RLS checks this table automatically.
create table if not exists allowed_emails (
  email text primary key
);

-- Seed with the coach's email (change if needed)
insert into allowed_emails (email)
values ('ze_do_arthur@hotmail.com')
on conflict do nothing;

-- Helper function — runs as superuser so it can always read allowed_emails
-- regardless of the calling user's permissions.
create or replace function is_allowed_user()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from allowed_emails where email = auth.email()
  );
$$;

-- ── Drop old policies ─────────────────────────────────────────────────────────
drop policy if exists "anon full access" on sessions;
drop policy if exists "anon full access" on athletes;
drop policy if exists "anon full access" on results;
drop policy if exists "anon full access" on events;
drop policy if exists "anon full access" on locations;
drop policy if exists "anon full access" on coach_profile;
drop policy if exists "anon full access" on settings;
drop policy if exists "anon full access" on exercise_registry;
drop policy if exists "anon full access" on goals_data;
drop policy if exists "anon full access" on lb_colors;

drop policy if exists "auth write" on sessions;
drop policy if exists "auth write" on athletes;
drop policy if exists "auth write" on results;
drop policy if exists "auth write" on events;
drop policy if exists "auth write" on locations;
drop policy if exists "auth write" on coach_profile;
drop policy if exists "auth write" on settings;
drop policy if exists "auth write" on exercise_registry;
drop policy if exists "auth write" on goals_data;
drop policy if exists "auth write" on lb_colors;

drop policy if exists "public read" on sessions;
drop policy if exists "public read" on athletes;
drop policy if exists "public read" on results;
drop policy if exists "public read" on events;
drop policy if exists "public read" on locations;
drop policy if exists "public read" on coach_profile;
drop policy if exists "public read" on settings;
drop policy if exists "public read" on exercise_registry;
drop policy if exists "public read" on goals_data;
drop policy if exists "public read" on lb_colors;

-- ── Public read — schedule.html, athletes.html, leaderboard.html ──────────────
create policy "public read" on sessions        for select using (true);
create policy "public read" on athletes        for select using (true);
create policy "public read" on results         for select using (true);
create policy "public read" on events          for select using (true);
create policy "public read" on locations       for select using (true);
create policy "public read" on coach_profile   for select using (true);
create policy "public read" on settings        for select using (true);
create policy "public read" on exercise_registry for select using (true);
create policy "public read" on goals_data      for select using (true);
create policy "public read" on lb_colors       for select using (true);

-- ── Allowed-email write — only emails in allowed_emails table can write ────────
create policy "auth write" on sessions        for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on athletes        for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on results         for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on events          for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on locations       for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on coach_profile   for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on settings        for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on exercise_registry for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on goals_data      for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on lb_colors       for all using (is_allowed_user()) with check (is_allowed_user());
