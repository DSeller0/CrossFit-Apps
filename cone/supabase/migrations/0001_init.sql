-- Cone app — initial schema (final state, not a step-by-step history)
-- Source of truth going forward. Historical dashboard-run SQL lives at the repo root
-- (supabase-schema.sql, supabase-schema-v2.sql, supabase-auth-policies.sql) for reference only.
--
-- tv_state and class_executions were reconstructed by hand from CLAUDE.md's documented
-- columns and every `.from('tv_state')` / `.from('class_executions')` call site in src/ —
-- they never existed as committed SQL before this migration.

-- ── Auth helper ────────────────────────────────────────────────────────────────
-- Add or remove rows in allowed_emails to grant/revoke write access. No code changes needed.

create table if not exists allowed_emails (
  email text primary key
);

-- RLS enabled, deliberately zero policies (default-deny) — nothing in the app ever
-- needs direct table access; it's only ever read through is_allowed_user() below,
-- which runs as the function owner and bypasses RLS. Matches prod's actual posture
-- (verified: an anon SELECT against prod's allowed_emails returns zero rows).
alter table allowed_emails enable row level security;

insert into allowed_emails (email)
values ('ze_do_arthur@hotmail.com')
on conflict do nothing;

create or replace function is_allowed_user()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_emails where email = auth.email()
  );
$$;

-- ── Single-row JSONB blob tables (11) ────────────────────────────────────────────
-- Used via dbLoad/dbSave in src/utils/supabase.js. Public read, is_allowed_user() write.

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

-- Legacy — superseded by results_v2 below. Kept for backup/restore script parity
-- (scripts/backup-supabase.mjs, restore-medrado.mjs both still reference it).
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

create table if not exists templates (
  id          int primary key default 1,
  value       jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

alter table sessions          enable row level security;
alter table athletes          enable row level security;
alter table results           enable row level security;
alter table events             enable row level security;
alter table locations          enable row level security;
alter table coach_profile      enable row level security;
alter table settings           enable row level security;
alter table exercise_registry  enable row level security;
alter table goals_data         enable row level security;
alter table lb_colors          enable row level security;
alter table templates          enable row level security;

create policy "public read" on sessions         for select using (true);
create policy "public read" on athletes         for select using (true);
create policy "public read" on results          for select using (true);
create policy "public read" on events           for select using (true);
create policy "public read" on locations        for select using (true);
create policy "public read" on coach_profile    for select using (true);
create policy "public read" on settings         for select using (true);
create policy "public read" on exercise_registry for select using (true);
create policy "public read" on goals_data       for select using (true);
create policy "public read" on lb_colors        for select using (true);
create policy "public read" on templates        for select using (true);

create policy "auth write" on sessions          for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on athletes          for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on results           for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on events            for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on locations         for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on coach_profile     for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on settings          for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on exercise_registry for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on goals_data        for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on lb_colors         for all using (is_allowed_user()) with check (is_allowed_user());
create policy "auth write" on templates         for all using (is_allowed_user()) with check (is_allowed_user());

-- ── results_v2 — normalized results (one row per athlete per session) ───────────
-- Verbatim from supabase-schema-v2.sql. Public insert/update are intentionally
-- unscoped (any anon can update any row) — this is the exact gap tracked as
-- backlog #7, reproduced here faithfully, not fixed by this migration.

create table if not exists results_v2 (
  id                text primary key,
  date              text not null,
  athlete_id        text,
  session_id        text,
  presence          text default 'Presente',
  energy_level      smallint,
  blocks            jsonb default '[]',
  coach_note        text default '',
  flag_for_review   boolean default false,
  logged_by_athlete boolean default false,
  updated_at        timestamptz default now(),
  unique (athlete_id, session_id)
);

alter table results_v2 enable row level security;

create policy "public read" on results_v2 for select using (true);
create policy "public result insert" on results_v2 for insert with check (true);
create policy "public result update" on results_v2 for update using (true) with check (true);
create policy "auth write" on results_v2 for all using (is_allowed_user()) with check (is_allowed_user());

-- ── tv_state — single-row TV display state ──────────────────────────────────────
-- Columns per CLAUDE.md "TV system" section + every push() call site
-- (src/components/tabs/TvController.jsx and its hooks). Reader (TV.jsx) is anon;
-- only TvController (authenticated coach) ever writes.

create table if not exists tv_state (
  id                    int primary key default 1,
  slide                 text,
  class_id              text,
  session_id            text,
  date_key              text,
  timer_block_id        text,
  timer_type            text,
  timer_cap_secs        int,
  timer_paused_elapsed  int,
  timer_started_at      bigint,
  timer_paused          boolean,
  group_positions       jsonb default '{}',
  rotation_block_ids    jsonb default '[]',
  rotation_rest_secs    int default 0,
  rotation_rest_until   bigint,
  show_qr               boolean default true,
  updated_at            bigint
);

alter table tv_state enable row level security;

create policy "public read" on tv_state for select using (true);
create policy "auth write" on tv_state for all using (is_allowed_user()) with check (is_allowed_user());

insert into tv_state (id, slide) values (1, 'blank') on conflict do nothing;

-- ── class_executions — one row per class started from Quadro ao Vivo ───────────
-- Columns per every .from('class_executions') call site: useClassTracking.js,
-- useLiveRegistration.js, useGroupRotation.js, TV.jsx, Schedule.jsx (public check-in).
-- Public UPDATE is unscoped (same #7-shaped gap as results_v2 — Schedule.jsx's
-- anon check-in needs it) — reproduced, not fixed, by this migration.

create table if not exists class_executions (
  id            text primary key,
  date_key      text,
  session_id    text,
  class_label   text,
  athlete_ids   jsonb default '[]',
  anon_names    jsonb default '[]',
  anon_results  jsonb default '{}',
  groups        jsonb default '[]',
  created_at    bigint,
  reset_at      bigint
);

alter table class_executions enable row level security;

create policy "public read" on class_executions for select using (true);
create policy "public update" on class_executions for update using (true) with check (true);
create policy "auth write" on class_executions for all using (is_allowed_user()) with check (is_allowed_user());

-- ── Data API role grants ─────────────────────────────────────────────────────────
-- The local CLI no longer auto-exposes new tables to the Data API roles (anon,
-- authenticated, service_role) — matches the cloud project's "always revoked"
-- default. Prod already has these grants (its tables were created before this
-- default existed); this migration needs to add them explicitly so RLS above is
-- ever reached at all. RLS, not these grants, is what actually restricts access.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;

-- Also cover tables added by *future* migrations — the one-time GRANT above only
-- applies to tables that exist right now.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
