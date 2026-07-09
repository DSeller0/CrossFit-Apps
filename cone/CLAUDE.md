# Cone — CLAUDE.md

## App overview
CrossFit coaching management app. Vite + React 19 + Supabase.  
**Repo:** https://github.com/DSeller0/CrossFit-Apps  
**Deploy:** GitHub Pages at https://dseller0.github.io/CrossFit-Apps/ via GitHub Actions (push to `main`).  
**Working dir:** `cone/` subfolder. Dev server: `npm run dev` inside `cone/`.

---

## Structure

### Public pages (standalone HTML + vanilla JS)
Each page is a self-contained HTML file. Most use a React component mounted at `#root`.

| Page | Source |
|---|---|
| `index.html` | today's session + bottom nav |
| `schedule.html` | week schedule + RM calculator |
| `results.html` | week results logging + leaderboard |
| `me.html` | athlete profile + PRs + goals |
| `leaderboard.html` | all-time rankings |
| `timer.html` | standalone WOD timer (launched from schedule.html) |
| `tv.html` | TV display for gym wall (no nav) |
| `athletes.html` | athlete lookup (public) |
| `recover.html` | data recovery ("Recuperar dados") |

**Page whitelist** — the HTML entry list lives in `cone/vite.public.config.js` (`rollupOptions.input`, 9 pages). Every new public HTML page must be added there or it isn't built and 404s live. (`deploy.yml` at the repo root copies `public-dist/` wholesale — no whitelist there anymore.) The HTML entry files and `themes.css` live at the **repo root** (`CrossFit-Apps/`), not inside `cone/` — the public Vite config sets `root: '..'`.

### SPA (React — `src/`)
Entry: `src/App.jsx`. All tabs lazy-loaded with `React.lazy()`:  
Criador, Atletas, Exercícios, Serviços, Resultados, Agenda, Publicador, Configurações, TvController.  
Providers: `AuthContext` (session), `SyncContext` (sessions + events + Supabase sync).

---

## Supabase clients — CRITICAL

**Two clients exist — use the correct one:**
- `src/utils/supabase.js` → SPA only (components under `src/components/`)
- `src/public/supabaseClient.js` → public pages (components under `src/public/`)

Importing both in the same bundle causes a GoTrueClient warning (non-fatal but visible in console).

Both clients read `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — never hardcode a URL/key in `src/`. Vite picks the file by mode: `npm run dev` / `dev:public` → `.env.development` (local stack); `npm run build` / CI → `.env.production` (prod, `https://crsalcpvsedmiabkeibp.supabase.co`, committed — anon key is public by design). `vite.public.config.js` needs `envDir` set explicitly (its `root` is the repo root, but the env files live in `cone/`).

**Local dev environment:** `supabase start` (Docker required) boots a local stack on ports shifted +10 from the CLI default (API `54331`, DB `54332`, Studio `54333`, Mailpit/mail `54334`) — the default ports collide with another local Supabase project already running on this machine. `node scripts/seed-dev.mjs` snapshots prod's blob tables + `results_v2` into it (reads `.env.production` for source, `.env.development`'s `SUPABASE_SERVICE_ROLE_KEY` for target — that key is local-only and must never carry a `VITE_` prefix). `supabase db reset` wipes and reapplies migrations from scratch. Login OTP emails never leave the stack — they land in Mailpit (`http://127.0.0.1:54334`), not a real inbox. `supabase/templates/magic_link.html` + the `[auth.email.template.magic_link]` block in `config.toml` are required for the email to show the 8-digit `{{ .Token }}` code at all — GoTrue's built-in default template only renders `{{ .ConfirmationURL }}` (a dead link locally, since `LoginScreen.jsx` never uses `emailRedirectTo` and only ever verifies a typed-in code). Changing `config.toml`'s `[auth.email]`/`[auth.email.template.*]` needs a `supabase stop` + `supabase start` cycle to take effect (data is preserved). **`npm run dev`** (SPA, base `/CrossFit-Apps/cone/`) and **`npm run dev:public`** (public pages, base `/CrossFit-Apps/`) are two independent Vite dev servers on different ports (Vite auto-increments from 5173 if occupied) — a relative link from one (e.g. Nav's "Coach" link to `cone/`) 404s-as-HTML if followed on the wrong server; open the SPA's own dev server URL directly instead of following that link.

**Schema source of truth: `supabase/migrations/`** (`0001_init.sql` — tables, RLS, grants; `0002_rpcs.sql` — `submit_pr`/`clear_pr` used by `me.html`'s PR log sheet; `0003_anon_write_rpcs.sql` — `class_checkin`/`log_result` RPCs + the anon-write revoke, see RLS note below; `0004_class_exec_auth_hardening.sql` — drops prod's `ce_insert_auth`/`ce_delete_auth` and adds `class_executions`' `"auth write"` (#34); `0005_enable_realtime.sql` — adds `tv_state`/`results_v2`/`class_executions` to the `supabase_realtime` publication, local-only fix (prod already has this, confirmed working live at the gym — likely dashboard-configured and never captured before)). The root-level `supabase-schema.sql` / `supabase-schema-v2.sql` / `supabase-auth-policies.sql` / `supabase-rpcs.sql` (the last one lives one level above `cone/`, not inside it) are historical (how the schema was built up via dashboard SQL) and no longer authoritative.

**Prod migration history:** prod's schema predates the CLI migration workflow and was built via dashboard SQL with its own policy-naming conventions that don't always match `0001`/`0002`'s hand-reconstruction (e.g. prod's real permissive-update policy on `class_executions` is named `ce_update_anon`, not `"public update"` — confirmed via `supabase db diff --linked`). `0001`/`0002` were marked applied on prod via `supabase migration repair --status applied 0001 0002` (metadata-only, never executed against prod) rather than replayed — replaying them risks `CREATE POLICY` collisions with prod's existing same-purpose-different-name objects. Any migration touching a table that existed before `0001` should use `IF EXISTS`/`IF NOT EXISTS` and not assume `0001`'s policy names are what's actually on prod — enumerate prod's real policies with **`supabase db dump --linked --schema public`** (authoritative — pg_dump emits every `CREATE POLICY`). Do **not** trust `supabase db diff --linked` for this: its pg-delta engine reported "No schema changes found" on `class_executions` while the dump showed prod actually had `ce_insert_auth`/`ce_delete_auth`/`ce_select_anon` and no `is_allowed_user()` policy (#34) — the diff engine silently ignores RLS-policy divergence. `templates`, `tv_state`, and `settings` are also known to have real prod policy names that diverge from `0001`. (Also: `supabase db push` may print a `pg-delta` "failed to cache migrations catalog … ENOENT pgdelta-target-ca.crt" warning *after* "Applying migration …" — that's a cosmetic post-apply catalog-cache step; the DDL still commits. Confirm via a re-dump + `supabase migration list --linked`.)

**Schema:** 11 single-row JSONB blobs (id=1, value=JSONB: `sessions, athletes, results, events, locations, coach_profile, settings, exercise_registry, goals_data, lb_colors, templates`), plus `results_v2` (normalized), `tv_state` and `class_executions` (both hand-reconstructed into the migration from code + docs — see TV system section below).  
**RLS:** anon read-all; write restricted to `is_allowed_user()`. `results_v2`/`class_executions` direct anon INSERT/UPDATE closed (#7, `0003_anon_write_rpcs.sql`) — anon writes now go through `class_checkin`/`log_result` RPCs only. The authenticated-role gap on `class_executions` (prod's `ce_insert_auth`/`ce_delete_auth` scoped INSERT/DELETE to `auth.role()='authenticated'`, not `is_allowed_user()`, so an open-signup non-coach session could forge/delete class rows) is closed by #34 (`0004_class_exec_auth_hardening.sql`): it drops those two and adds the canonical `"auth write"` (`is_allowed_user()`, `FOR ALL`) — which prod's dashboard-built `class_executions` never had, so `0004` also **restored coach UPDATE** (end-class/live-registration/rotation) that `0003` had inadvertently removed on prod by dropping `ce_update_anon` with no `is_allowed_user()` fallback in place. Prod `class_executions` is now `auth write` (all writes) + `ce_select_anon` (public read); anon check-in stays on the `class_checkin` RPC.

---

## TV system

**Files:** `src/components/tabs/TvController.jsx` (SPA controller, desktop layout: full-width Sessão date-picker + two-pane grid — see `src/components/tabs/tv/tvController.module.css`) + `src/public/tv/TV.jsx` (display) + `src/public/tv/TV.module.css`

**Data flow:**
1. TvController calls `push(patch)` → upserts `{ id: 1, ...patch, updated_at: Date.now() }` to `tv_state`.
2. TV.html subscribes to `postgres_changes` on `tv_state` → receives delta → re-renders.
3. `push()` is **patch-only**. Never include local-only fields that are not DB columns — they poison the upsert and freeze all subsequent updates.

**Controller class roster (`tv/ClassPanel.jsx`):** every class started today renders as an accordion card (active one auto-expanded, live-updated via `class_executions` realtime subscription already in `useClassTracking`); ended classes render the same roster read-only. Roster rows merge ranking + live registration + editing (`useLiveRegistration.js`) for both real athletes (`results_v2`, keyed by `athlete_id`) and guests (`class_executions.anon_results`, keyed by name — day-scoped only, deliberately not in `results_v2` since guests don't need durable cross-day tracking). "Registrar" captures the live timer elapsed as `perfTime` (mm:ss string, `For Time` blocks only); "Editar" reveals scale + a manual mm:ss field to overwrite (covers both corrections and misclicks).

**tv_state columns (source of truth: `supabase/migrations/0001_init.sql:177-195` — plans/04 landed; the list below matches it):**
```
id                   INTEGER   PRIMARY KEY (always 1)
slide                TEXT      'blank'|'wod'|'timer'|'results'|'qr'
class_id             TEXT
session_id           TEXT
date_key             TEXT
timer_block_id       TEXT      (code reads/writes timer_block_id — NOT block_id)
timer_type           TEXT      'For Time'|'AMRAP'|'EMOM'|'TABATA'|...
timer_cap_secs       INTEGER
timer_paused_elapsed INTEGER
timer_started_at     BIGINT
timer_paused         BOOLEAN   (unused by code — confirm on schema dump, plans/04)
group_positions      JSONB     { [groupId]: blockId }
rotation_block_ids   JSONB     DEFAULT '[]'   (empty = all WOD blocks)
rotation_rest_secs   INTEGER   DEFAULT 0
rotation_rest_until  BIGINT    DEFAULT NULL
show_qr              BOOLEAN   DEFAULT TRUE
updated_at           BIGINT
```

**Block/exercise rendering** — three separate render paths that must always be kept in sync:
1. `TV.jsx` → `BlockCard` (WOD slide)
2. `TV.jsx` → `TimerSlide` right panel
3. `src/public/schedule/Schedule.jsx` → exercise rows

**Shared rendering:** `src/public/shared/ExerciseList.jsx` is the shared (read-only, compact) exercise-row component — TV uses it for both paths. Schedule.jsx still renders its own *interactive* markup (`ExRow`: check-off/rounds, RM chip+calc, Demo, progression-step expansion) — full markup adoption stays open under #17, deprioritized 2026-07-05: TV's big-font wall-display CSS and Schedule's dense pill/checkbox interaction model diverge enough that unifying markup would mean a new CSS variant for no visible change, on a page used live at the gym. `exVolStr`/`fmtIntensity` are **canonical-only** in `src/public/lib/wod.js` — #37 deleted the diverged local copies in `Schedule.jsx`/`Publicador.jsx`/`Resultados.jsx`; all re-import from `wod.js`. Progression-step grouping (`steps → {reps,loads}[]`) is canonical for `Schedule.jsx`'s own 4 call sites via `groupProgressionSteps()` in `wod.js` (2026-07-05) — **not yet cross-file canonical**: `Publicador.jsx`'s `buildProgressionLines()` still hand-rolls the same grouping independently (keyed on `reps`+`unit`, not just `reps`), so a grouping-semantics fix applied only to `wod.js` won't reach the printed/exported WOD view (tracked under #45). Estações: TV intentionally flattens stations into one exercise list (glanceable wall display) while Schedule renders full station structure (canonical detailed view) — a recorded decision, not drift (see BACKLOG.md "Decisions recorded").

---

## Shared utilities (`src/public/lib/`)

- `wod.js` — `uid`, `WOD_TYPES`, `isWodBlock`, `blkColor`, `blkLabel`, `exVolStr`, `groupProgressionSteps`, `toSecs`, `fmtSecs`, `rankResults`, `perfStr`, `fmtIntensity`, `loadRegistry`
- `week.js` — `MONTH_PT`, `MONTH_PT_SHORT`, `DAY_PT`, `DAY_PT_TITLE`, `fmtDate`, `toISO`, `todayISO`, `getWeek`, `dateToWeekOffset` (`DAY_PT`/`MONTH_PT` are UPPERCASE/full-name; `DAY_PT_TITLE`/`MONTH_PT_SHORT` are the Titlecase/abbreviated variants most display call sites actually want — not drop-in for each other, see #16's casing-hazard note)
- `goals.js` — `prBest`, `prPct`, `prDelta` (PR-best-result / progress-% / delta-vs-previous; canonical since #48, 2026-07-05 — collapsed from 3 near-identical copies in `Atletas.jsx`/`Athletes.jsx`/`Me.jsx`)
- `blobTables.js` — `BLOB_TABLES` (the 8-table fetch-order array shared by `Athletes.jsx`/`Leaderboard.jsx`'s `fetchState()`; positional, don't reorder without updating both files' destructuring)

Always check these before reimplementing a formatting or date utility. `src/utils/storage.js` (SPA side) re-exports `uid`/`toISO`/`todayISO` from these modules rather than reimplementing them (#16, 2026-07-05) — one canonical implementation, imported via either path.

---

## Design system

**TotK CSS variables (`themes.css` at the repo root — 4 themes as `html.theme-*` classes):**
```
--bg:#0d0b09  --stone:#161210  --stone2:#1e1a16  --divider:#2a231c
--gold:#d8a840  --gold2:#b88820  --teal:#4ac8c0  --cream:#f0e8d0
--sub:#c8b090  --muted:#806850  --dim:#554a3a
```
- `var(--card)` is NOT defined — resolves to transparent. Use `var(--stone)` or `var(--stone2)`.
- `var(--border)` = stronger (card outlines); `var(--divider)` = subtle (internal separators).
- No `border-radius` on public pages. Minimal radius on SPA components.
- Font: `var(--font)` → Cinzel (TotK themes) or Amarante (Spirit Blossom themes).
- All UI strings: pt-BR.
- Canonical design cards (tokens, components, mockups): `cone/design/` → synced to the "Cone Design System" project on claude.ai/design (see WORKFLOW.md mockup-first).

**Block color families:**
- RED: WOD / HIIT / MetCon
- AMBER: EMOM / For Time / AMRAP / Estações
- BLUE: Força / LPO / Core / Acessórios
- GREEN: Aquecimento / Skill / Cardio / Mobilidade

**Exercise data shapes:**
```js
// Standard exercise (dist/distUnit are siblings of sets/reps — #37; exVolStr renders dist first)
{ id, name, sets, reps, dist?, distUnit?: 'm'|'cal', intensity: { mode, ... }, note }

// Complex exercise
{ id, name?, isComplex: true, sets, complexMovements: [{ id, name, reps }], intensity, note }

// intensity modes: 'progression' | 'pct' | 'gender'   (+ legacy 'cardio')
// cardio: LEGACY — the Cardio intensity tab was removed in #37; distance now lives in
//         dist/distUnit. Old { mode:'cardio', cardioVal, cardioUnit } data still renders
//         (exVolStr fallback) and lazy-normalizes to dist/distUnit on edit/save.
// gender: { mode:'gender', Masculino_RX, Masculino_Inter, Masculino_SC, Feminino_*, *_unit }
// Registry entries may carry defaults{sets?,reps?,dist?,distUnit?,intensity?} (#38 ghost loads).
```

---

## Build + deploy

- Dev: `supabase start` (once per Docker session) then `npm run dev` inside `cone/` — talks to the local stack, never prod
- Build: `npm run build` → `dist/`
- Tests: `npm test` (5 test files: wod.test.js, week.test.js, pix.test.js, resultMappers.test.js, useClassTracking.test.js)
- CI: push to `main` → GitHub Actions → gh-pages deploy (cone/ subfolder)

**Chunk hash 404 (GitHub Pages limitation):** After every CI deploy, lazy-loaded chunk filenames change. Old hashes 404 until users hard-refresh (Ctrl+Shift+R). GitHub Pages cannot set `Cache-Control: no-cache`. This is structural — do not re-diagnose, just document and tell the user to hard-refresh.

**Always commit + push after completing changes** (user requirement).

---

## Key decisions (do not re-litigate)

- Auth: 8-digit OTP codes, not magic links (Outlook Safe Links breaks magic links)
- No React Router — URL params are sufficient at current scale
- No TypeScript — JSDoc comments if prop shapes need documenting
- All data: Supabase (no local persistence beyond localStorage for UX state)
- Icon library: Tabler Icons (`ti-*`)
- Product name: CONE. Gym name from `settings.value.gymName`.
- `session.public === false` = hidden; `undefined` or `true` = public (all 6 public pages filter on this)
- TvController ignores session visibility — coach always sees all sessions
