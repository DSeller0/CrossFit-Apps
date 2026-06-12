-- Step 4: Auth — update RLS policies
-- Run this in Supabase → SQL Editor → New query

-- Drop the old open-access policies
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

-- Public read — anyone (anon key) can read, so public pages still work
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

-- Authenticated write — only a logged-in coach can insert / update / delete
create policy "auth write" on sessions        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write" on athletes        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write" on results         for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write" on events          for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write" on locations       for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write" on coach_profile   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write" on settings        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write" on exercise_registry for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write" on goals_data      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write" on lb_colors       for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
