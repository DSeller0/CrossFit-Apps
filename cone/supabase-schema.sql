-- Cone app — Supabase schema
-- Run this in Supabase → SQL Editor → New query

-- Each table stores a single row (id = 1) with a jsonb value column.
-- This mirrors the existing localStorage structure exactly,
-- making migration straightforward without changing component code.

create table if not exists sessions (
  id          int primary key default 1,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create table if not exists athletes (
  id          int primary key default 1,
  value       jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

create table if not exists results (
  id          int primary key default 1,
  value       jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

create table if not exists events (
  id          int primary key default 1,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create table if not exists locations (
  id          int primary key default 1,
  value       jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

create table if not exists coach_profile (
  id          int primary key default 1,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create table if not exists settings (
  id          int primary key default 1,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create table if not exists exercise_registry (
  id          int primary key default 1,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create table if not exists goals_data (
  id          int primary key default 1,
  value       jsonb not null default '{"athleteGoals":{},"prs":{}}',
  updated_at  timestamptz not null default now()
);

create table if not exists lb_colors (
  id          int primary key default 1,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- Allow public read/write (the anon key is safe for a single-coach private app).
-- We'll add proper auth in step 4.
alter table sessions        enable row level security;
alter table athletes        enable row level security;
alter table results         enable row level security;
alter table events          enable row level security;
alter table locations       enable row level security;
alter table coach_profile   enable row level security;
alter table settings        enable row level security;
alter table exercise_registry enable row level security;
alter table goals_data      enable row level security;
alter table lb_colors       enable row level security;

-- Temporary open policy (replaced with auth policy in step 4)
create policy "anon full access" on sessions        for all using (true) with check (true);
create policy "anon full access" on athletes        for all using (true) with check (true);
create policy "anon full access" on results         for all using (true) with check (true);
create policy "anon full access" on events          for all using (true) with check (true);
create policy "anon full access" on locations       for all using (true) with check (true);
create policy "anon full access" on coach_profile   for all using (true) with check (true);
create policy "anon full access" on settings        for all using (true) with check (true);
create policy "anon full access" on exercise_registry for all using (true) with check (true);
create policy "anon full access" on goals_data      for all using (true) with check (true);
create policy "anon full access" on lb_colors       for all using (true) with check (true);
