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
| `index.html` | full-width week grid → selected-day panel (session + ranking) + box-warnings strip (#53) |
| `schedule.html` | week schedule + RM calculator |
| `results.html` | week results logging + leaderboard |
| `me.html` | athlete profile + PRs + goals |
| `leaderboard.html` | all-time rankings |
| `timer.html` | standalone WOD timer (launched from schedule.html) |
| `tv.html` | TV display for gym wall (no nav) |
| `athletes.html` | **RETIRED (#52) — a redirect stub, not an app.** Maps `?athlete=<id>` → `me.html?id=<id>`. Keep the file: `sw.js` precaches it and `cache.addAll` rejects **atomically** on a 404, so deleting it stops the service worker installing for every user, on every page. |
| `recover.html` | data recovery ("Recuperar dados") |

**Page whitelist** — the HTML entry list lives in `cone/vite.public.config.js` (`rollupOptions.input`, 9 pages). Every new public HTML page must be added there or it isn't built and 404s live. (`deploy.yml` at the repo root copies `public-dist/` wholesale — no whitelist there anymore.) The HTML entry files and `themes.css` live at the **repo root** (`CrossFit-Apps/`), not inside `cone/` — the public Vite config sets `root: '..'`.

### Criador layout (#58 / plans/37)

**The page opens on the week grid, not on a form.** `Criador.jsx` is the container;
the editor renders only while a session is open (`editorOpen`, which `editing` alone
can't carry — a *new* session is being edited but has no id/dateKey yet).

- **The week grid renders unconditionally** — an empty week is this page's empty
  state, with its day columns and their `+ sessão` affordances. (It used to be
  gated on `totalSessions > 0`.)
- **`criador/SessionMetaModal.jsx`** holds everything about a session that isn't a
  block (date · name · audience · visibility · box tags · briefing) — it was a
  permanent slab above the blocks. It holds a **draft** and commits on confirm, so
  Cancelar really cancels; the athlete picker is **inline inside it**, not a second
  modal on top; the briefing is **always visible** (it was a disclosure — a seventh
  field in a dialog doesn't need folding). It opens from an **icon-only gear beside
  the Público/Oculto tag in the editor title**, not from the action cluster: what it
  edits is what the title shows. The move-to-another-date confirm stays in
  `Criador.jsx` (only the container knows whether the session is saved, and on which
  day). Editor header order is **gear · Template · TV Preview · Salvar · ✕**.
- **Desktop keeps the week in view** while editing, auto-collapsed to a day strip
  (`weekGridCollapsed`); **mobile hides it** and the editor takes over with a
  `‹ Voltar à semana` link. That strip **is the index's own `WeekGrid`**
  (`public/index/rail.jsx`), not a private one — it shows each day's *session name*,
  which the retired `dayChip` set didn't. Three props exist for the coach's case:
  `dates` (he browses other weeks), `filter` (he sees `public:false` sessions and
  filters by his own box selector) and `showCount` (he has more than one session a
  day; the index renders only the first, so it stays off there). Imported aliased —
  `criador/WeekGrid.jsx` exports a `WeekGrid` of its own, the 7-column card grid.
- **The week picker + box tabs are sticky (`cr.stickyHead`); the toolbar and Avisos
  are not** — the two controls that decide *what* the grid shows stay reachable, the
  rest is content. Offset is **`var(--spa-sticky-top)`** (`index.css`), not the flat
  `88px` that `.ql-sess-bar`/`.sync-conflict-banner` still hardcode: that figure is
  topbar + tab bar, and at ≥768px the tab bar is `display:none` and the sidebar takes
  over, so 88px parks the block 39px *below* its own flow position, on top of Avisos.
- **Opening a session scrolls to the top of the page**, not to the editor —
  `scrollIntoView` on the editor put the day strip and the session header above the
  fold, so you landed mid-form not knowing which day you were on.
- **Closing the editor asks before discarding** (`requestClose` → `pendingClose`
  `ConfirmReview`), and only when `isDirty`. The close control is the same red ✕ as
  the exercise delete; it always threw the edit away, but as a red ✕ beside *Salvar*
  it is one slip from losing a session.
- **`block.goal` is the one new persisted field (#10)** — `{kind:'time'|'rounds'
  |'text', min?, max?, reps?, text?}`, written by `criador/GoalInput.jsx` (type-aware
  via `goalKindFor` in `blockModel.js`) and by textFormat's `parseGoal`, same shape
  either way. An all-empty goal is stored as `undefined`, never as a hollow object.
- **`goalStr(block)` in `public/lib/wod.js` is the one display formatter** —
  `WodBlockCard` · `schedule/BlockDetail` · `tv/slides` (BlockCard + TimerSlide) ·
  `WeekSessionCard`. It is deliberately **not** textFormat's `serializeGoal`: that
  one emits re-parseable ASCII notation (`11-12'`), this one is display-only and
  uses an en dash. Same data, different contracts — don't collapse them.
- **`block.duration` stays a minutes number field** (see the mm:ss note under #35 —
  `toSecs('14')` reads 14 as *seconds*; converting it is a data migration, #93).
- **On mobile the exercise name is a tap target, not a field** — the real
  `ExerciseCombobox` lives in the bottom sheet below Séries/Reps, where its dropdown
  has room; tapping the name and tapping the gear are the same gesture.
- **`TypePicker`'s three benchmark-category colours are data colours** (gold/blue/
  violet, the same values the block-family palette uses) — exempt from #15, recorded
  in a comment there.

### Criador text format (#92)

The Criador was built to *replace* the coach's free-text weekly file and didn't — he
writes the week in a phone notepad and re-types it. `src/components/tabs/criador/textFormat.js`
parses **his** notation into the real block model (deterministic grammar, **no LLM**) and
serializes back: `parseWeek`/`parseSession`/`parseBlock`/`parseExerciseLine` +
`serializeBlock`/`serializeSession`/`serializeGoal`. Pure — no React, no client; the
registry is passed in (same convention as `blockModel.js`). Grammar + recorded
refinements: [docs/plans/36](./docs/plans/36-criador-text-mode.md).

- **Blocks stay canonical — text is an input/output projection, never storage.** TV,
  `schedule.html`, `results.html` and Publicador read the same block objects as before.
  The only new persisted field is **`block.goal`** (`{kind:'time'|'rounds'|'text', …}`,
  the coach's `Meta:` line). Mode toggles are editor UI state and are **never persisted**.
- **The parser never drops a line.** Anything unclassified lands verbatim in
  `block.notes`; `audit` returns one entry per non-blank input line, which is how
  "nothing was lost" is asserted rather than hoped. Warning kinds: `type-unresolved` ·
  `unknown-exercise` · `complex-detected` · `interval-approximated` · `unparsed-line` ·
  `orphan-load` · `preamble`.
- **An unresolved block type is `type: ''` + `typeUnresolved: true`** — nothing is
  guessed; the preview's chip is a button onto the existing `TypePicker`.
- **The week grid has two render modes, it is not a new view** (`WeekGrid` `gridMode` +
  `WeekSessionCard`): **Grade** = the real `ExerciseList` at size `tiny`; **Texto** =
  `serializeSession`. Same 7 columns, same `boxFilter`. Texto is the copyable one and
  the only one carrying the structure line, `Meta:` and notes.
- **`isTextEditable(block)` is false for Estações and Benchmark** — neither is
  expressible in the grammar. The block toggle renders **disabled, not hidden**.
- **Flipping a session to text and back normalizes whitespace and curly quotes in
  names** (`40” prancha ` → `40" prancha`). Verified on real prod data: 4 diffs in 42
  lines, all of that kind — no semantic loss.
- **The gender-load emitter groups by SCALE** (`60/45kg – 50/35kg` = RX pair, Inter
  pair) while canonical `fmtIntensity` groups by GENDER (`M: 60/50 kg | F: 45/35 kg`).
  Different axis order, both correct for their surface — **do not "fix" `fmtIntensity`**.
- `SessionTextPane` takes its **type picker as a prop** and `WeekImportModal` imports
  `uid`/`toISO` from `public/lib/` rather than `utils/storage` — both render in the
  client-free gallery, and `utils/storage` pulls the SPA Supabase client.

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

**Local dev environment:** `supabase start` (Docker required) boots a local stack on ports shifted +10 from the CLI default (API `54331`, DB `54332`, Studio `54333`, Mailpit/mail `54334`) — the default ports collide with another local Supabase project already running on this machine. `node scripts/seed-dev.mjs` snapshots prod's blob tables + `results_v2` into it (reads `.env.production` for source, `.env.development`'s `SUPABASE_SERVICE_ROLE_KEY` for target — that key is local-only and must never carry a `VITE_` prefix). `supabase db reset` wipes and reapplies migrations from scratch. Login OTP emails never leave the stack — they land in Mailpit (`http://127.0.0.1:54334`), not a real inbox. `supabase/templates/magic_link.html` + the `[auth.email.template.magic_link]` block in `config.toml` are required for the email to show the 8-digit `{{ .Token }}` code at all — GoTrue's built-in default template only renders `{{ .ConfirmationURL }}` (a dead link locally, since `LoginScreen.jsx` never uses `emailRedirectTo` and only ever verifies a typed-in code). Changing `config.toml`'s `[auth.email]`/`[auth.email.template.*]` needs a `supabase stop` + `supabase start` cycle to take effect (data is preserved). **`npm run dev`** (SPA, base `/CrossFit-Apps/cone/`) and **`npm run dev:public`** (public pages, base `/CrossFit-Apps/`) are two independent Vite dev servers on different ports (Vite auto-increments from 5173 if occupied) — a relative link from one (e.g. Nav's "Coach" link to `cone/`) 404s-as-HTML if followed on the wrong server; open the SPA's own dev server URL directly instead of following that link. **Cross-port cache poisoning (2026-07-09):** because both servers share the `localhost` origin and swap ports between sessions, the browser can reuse a cached module transform from the *other* server's config — symptom: "Invalid hook call" + `useRef` null (two React copies, one from `/CrossFit-Apps/.vite/deps/` = the public config's cache at the repo root, one from `/CrossFit-Apps/cone/node_modules/.vite/deps/` = the SPA's). Not a product bug — fix with a cache-bypassed reload (DevTools "Disable cache" + reload, or Ctrl+Shift+R); do not chase it in `src/`. **Service-worker poisoning is the same family and bites harder (2026-07-22):** `sw.js` registers at scope `/CrossFit-Apps/`, which on localhost covers the SPA dev server too — so a previously-visited public page leaves a SW that serves the SPA *precached production assets*, and the dev server appears to be running code from weeks ago with **no console error at all**. Symptom: your edits simply do not appear, HMR looks healthy. Fix: unregister the worker and clear the `cone-v*` cache (DevTools → Application, or `navigator.serviceWorker.getRegistrations()` + `caches.delete`), then reload. Check this FIRST when a change does not show up.

**Schema source of truth: `supabase/migrations/`** (`0001_init.sql` — tables, RLS, grants; `0002_rpcs.sql` — `submit_pr`/`clear_pr` used by `me.html`'s PR log sheet; `0003_anon_write_rpcs.sql` — `class_checkin`/`log_result` RPCs + the anon-write revoke, see RLS note below; `0004_class_exec_auth_hardening.sql` — drops prod's `ce_insert_auth`/`ce_delete_auth` and adds `class_executions`' `"auth write"` (#34); `0005_enable_realtime.sql` — adds `tv_state`/`results_v2`/`class_executions` to the `supabase_realtime` publication, local-only fix (prod already has this, confirmed working live at the gym — likely dashboard-configured and never captured before); `0006_lock_business_reads.sql` — drops the permissive `"public read"` on `coach_profile` (Pix key) + `locations` (service rates) so anon can no longer GET them via REST, leaving each table's `"auth write"` (`FOR ALL`, `is_allowed_user()`) to cover the coach's read too (#81); `0007_results_created_at.sql` — adds `results_v2.created_at` (`timestamptz not null default now()`, backfilled to `updated_at`) after #76 stopped the load-time write-back that had destroyed `updated_at` as a provenance signal; `resultToRow` **omits** `created_at` so INSERT fills the default and a conflict-UPDATE preserves it (#76)). **`0005`, `0006` and `0007` are recorded local-only** (`migration list --linked` shows all three `remote:""`) — `0005`'s realtime effect already exists on prod, so `supabase db push` would try to re-apply it and error; apply `0006` to prod as the standalone two-line `DROP POLICY` (SQL editor or targeted psql), then `migration repair --status applied 0006`, rather than `db push`. `0007` is additive (`ALTER TABLE … ADD COLUMN IF NOT EXISTS` + a one-time backfill) — apply the standalone SQL to prod, then `migration repair --status applied 0007`, same reason (a `db push` would drag `0005`). The root-level `supabase-schema.sql` / `supabase-schema-v2.sql` / `supabase-auth-policies.sql` / `supabase-rpcs.sql` (the last one lives one level above `cone/`, not inside it) are historical (how the schema was built up via dashboard SQL) and no longer authoritative.

**Prod migration history:** prod's schema predates the CLI migration workflow and was built via dashboard SQL with its own policy-naming conventions that don't always match `0001`/`0002`'s hand-reconstruction (e.g. prod's real permissive-update policy on `class_executions` is named `ce_update_anon`, not `"public update"` — confirmed via `supabase db diff --linked`). `0001`/`0002` were marked applied on prod via `supabase migration repair --status applied 0001 0002` (metadata-only, never executed against prod) rather than replayed — replaying them risks `CREATE POLICY` collisions with prod's existing same-purpose-different-name objects. Any migration touching a table that existed before `0001` should use `IF EXISTS`/`IF NOT EXISTS` and not assume `0001`'s policy names are what's actually on prod — enumerate prod's real policies with **`supabase db dump --linked --schema public`** (authoritative — pg_dump emits every `CREATE POLICY`). Do **not** trust `supabase db diff --linked` for this: its pg-delta engine reported "No schema changes found" on `class_executions` while the dump showed prod actually had `ce_insert_auth`/`ce_delete_auth`/`ce_select_anon` and no `is_allowed_user()` policy (#34) — the diff engine silently ignores RLS-policy divergence. `templates`, `tv_state`, and `settings` are also known to have real prod policy names that diverge from `0001`. (Also: `supabase db push` may print a `pg-delta` "failed to cache migrations catalog … ENOENT pgdelta-target-ca.crt" warning *after* "Applying migration …" — that's a cosmetic post-apply catalog-cache step; the DDL still commits. Confirm via a re-dump + `supabase migration list --linked`.)

**Schema:** 11 single-row JSONB blobs (id=1, value=JSONB: `sessions, athletes, results, events, locations, coach_profile, settings, exercise_registry, goals_data, lb_colors, templates`), plus `results_v2` (normalized), `tv_state` and `class_executions` (both hand-reconstructed into the migration from code + docs — see TV system section below).  
**RLS:** anon read-all **except `coach_profile` + `locations`** (locked to `is_allowed_user()` read since #34-style hardening in `0006`, #81 — they hold the Pix key + service rates, business data no public page renders); write restricted to `is_allowed_user()` everywhere. ⚠️ **The login gates writes AND now these two reads — but every *other* table is still anon-readable**, so the SPA email login is not a general read gate; a scoped `?box=` link (#80) is a view filter, not access control. `results_v2`/`class_executions` direct anon INSERT/UPDATE closed (#7, `0003_anon_write_rpcs.sql`) — anon writes now go through `class_checkin`/`log_result` RPCs only. The authenticated-role gap on `class_executions` (prod's `ce_insert_auth`/`ce_delete_auth` scoped INSERT/DELETE to `auth.role()='authenticated'`, not `is_allowed_user()`, so an open-signup non-coach session could forge/delete class rows) is closed by #34 (`0004_class_exec_auth_hardening.sql`): it drops those two and adds the canonical `"auth write"` (`is_allowed_user()`, `FOR ALL`) — which prod's dashboard-built `class_executions` never had, so `0004` also **restored coach UPDATE** (end-class/live-registration/rotation) that `0003` had inadvertently removed on prod by dropping `ce_update_anon` with no `is_allowed_user()` fallback in place. Prod `class_executions` is now `auth write` (all writes) + `ce_select_anon` (public read); anon check-in stays on the `class_checkin` RPC.

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
timer_paused         BOOLEAN   (CONFIRMED unused by code — 0 hits, verified 2026-07-16)
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

**Shared components (`src/public/shared/`)** — each renders in the gallery:
- `ExerciseList.jsx` — read-only exercise rows. **Sizes: `grid` (tiny's scale with a 12px name, Criador week column) · `tiny` (12–15px, phone/web — LogPane, WodBlockCard) · `compact` (22–26px, TV-wall scale) · `large` (30–42px, TV).** `compact` is *not* a web-page size; picking it for a phone card is the mistake #51 made and fixed. **`grid` exists because `tiny` is shared** — a 200px column needs the 12px name and the intensity on its own line (inline, `63/70/75/80/85 %` clips at the column edge), and `tiny`'s other consumers are not in a 200px column. Its body is a **text block, not a flex row**: `flex-wrap` split the vol off onto its own line whenever the name was too long to sit beside it, so vol and name are inline and wrap as one run, and only `ins` is forced to break.
- `RankList.jsx` — the one ranking list (leaderboard + both results panes; 3 divergent copies collapsed in #51). Scale/perf are fixed **left-aligned** columns; rows go **two-line via a container query** (`@container (max-width:400px)`) because the list is narrow both on a phone and inside results' 300px desktop pane. Podium via `--podium-*`. TV's podium rows deliberately stay separate (wall-display CSS).
- `AccordionCard.jsx` — the disclosure shell behind results' `SessionCard` and leaderboard's `WodCard`. One keyboard contract / `aria-expanded` / chevron; the two headers stay separate because they carry different data.
- `WodBlockCard.jsx` — the WOD above a ranking (family rule + type badge + `ExerciseList`, then date · session footer). Same shape as TV's `BlockCard`.
- `ScaleFilter.jsx` — the scale pills (leaderboard rendered them twice, results had a third copy). **Lives in `shared/`, not `leaderboard/`** — #51 moved it and left `Gallery.jsx` importing the old path, which made `gallery.html` a hard 500 until #52 noticed. The gallery is dev-only and never built, so **no CI gate can catch a broken import there** — open it after touching it.
- `TallyBar.jsx` — **the app's one bar primitive** (Design mockup 24; replaced `SegBar`, #52's version). Used by me.html's goal bars + milestone ticks, its adherence bars (WODs/Distribuição), its PR mini-gauges + detail bars, and (plans/22) the Desenvolvimento stats card. **Reads in tens:** always 10 blocks of 10%, and the one block the value lands inside subdivides into 10 units — countable at a glance, still 1%-accurate where the value is. Always 10 blocks *whatever the denominator*: the caller turns its own "5 / 6" into a percentage and keeps printing the literal numbers beside the bar (a block-per-real-unit variant was designed and rejected — it degrades to hairlines past ~50 units). The three copies `SegBar` originally replaced each faked their segments with a `repeating-linear-gradient` that had the **dark theme's background baked in as a literal `rgba(13,11,9,.65)`**, so both light themes painted dark bands across the bar; every divider here is a real element in `var(--bg)`. Ticks are siblings of the blocks and only each *block* clips, so a milestone at 0%/100% isn't sliced in half — `SegBar` needed a separate non-clipping wrapper for that, this doesn't.

⚠️ **Shared components must not depend on the `ti` icon webfont.** `results.html`/`schedule.html`/`gallery.html` load it; **`leaderboard.html` does not** (it uses `@tabler/icons-react`). Icons in `shared/` come from `@tabler/icons-react` — a `ti` class there silently renders nothing on the leaderboard.

**Shared rendering:** `src/public/shared/ExerciseList.jsx` is the shared (read-only, compact) exercise-row component — TV uses it for both paths. Schedule.jsx still renders its own *interactive* markup (`ExRow`: check-off/rounds, RM chip+calc, Demo, progression-step expansion) — full markup adoption stays open under #17, deprioritized 2026-07-05: TV's big-font wall-display CSS and Schedule's dense pill/checkbox interaction model diverge enough that unifying markup would mean a new CSS variant for no visible change, on a page used live at the gym. `exVolStr`/`fmtIntensity` are **canonical-only** in `src/public/lib/wod.js` — #37 deleted the diverged local copies in `Schedule.jsx`/`Publicador.jsx`/`Resultados.jsx`; all re-import from `wod.js`. Progression-step grouping (`steps → {reps,loads}[]`) is canonical for `Schedule.jsx`'s own 4 call sites via `groupProgressionSteps()` in `wod.js` (2026-07-05) — **not yet cross-file canonical**: `Publicador.jsx`'s `buildProgressionLines()` still hand-rolls the same grouping independently (keyed on `reps`+`unit`, not just `reps`), so a grouping-semantics fix applied only to `wod.js` won't reach the printed/exported WOD view (tracked under #45). Estações: TV intentionally flattens stations into one exercise list (glanceable wall display) while Schedule renders full station structure (canonical detailed view) — a recorded decision, not drift (see BACKLOG.md "Decisions recorded").

---

## Shared utilities (`src/public/lib/`)

- `wod.js` — `uid`, `WOD_TYPES`, `isWodBlock`, `TIMER_TYPES` (#70 — the WOD types a timer can drive; a semantic subset of `WOD_TYPES`, not derived from it), `blkColor`, `blkLabel`, `exVolStr`, `groupProgressionSteps`, `toSecs`, `fmtSecs`, `maskMMSS` (#54 — the mm:ss input mask behind `MaskedTimeInput`; a mask not a validator), `rankResults`, `perfStr`, `fmtIntensity`, `SCALES`/`SCALE_COL`/`scaleColor`/`scaleLabel`/`deriveScale` (#51). `perfStr` renders a capped For Time athlete as `"N rds (DNF)"`, not `—`. (`loadRegistry` is `src/utils/storage.js`, SPA-side localStorage cache — not a `wod.js` export.)
- `registry.js` (#62) — `normExName`, `ALIASES`, `buildRegistryIndex`, `resolveExercise`: the one path every coach-typed-name→registry lookup goes through (demo videos, #38 ghost defaults, PR category tagging). Raw exact-lowercase equality at each consumer joined only ~12.7% of real prod exercise names (the registry is English long-form; the coach free-types shorthand/pt-BR and 57% of names carry stray whitespace) — `normExName` (trim/casefold/accent-strip/whitespace-collapse) + a hand-authored `ALIASES` table (real prod-data diff, not guessed) gets that to 51.3% on the same sample; the remaining misses are compound prescription notation (`"1 MUSCLE + 3 FRONT 3\""`, `"A- 3 SNATCH BALANCE"`) that isn't a single exercise name. Match-only: never rewrites what the coach typed. `buildRegistryIndex` returns a `Map<normKey, entry>` with a `categories` array per entry (every block family it's tagged under) — build once per registry fetch, pass the Map to `resolveExercise` for repeated lookups (`ExRow`/`DemoPanel`'s `demoMap` prop is this Map, not a plain object, since #62).
- `week.js` — `MONTH_PT`, `MONTH_PT_SHORT`, `DAY_PT`, `DAY_PT_TITLE`, `fmtDate`, `toISO`, `todayISO`, `getWeek`, `dateToWeekOffset` (`DAY_PT`/`MONTH_PT` are UPPERCASE/full-name; `DAY_PT_TITLE`/`MONTH_PT_SHORT` are the Titlecase/abbreviated variants most display call sites actually want — not drop-in for each other, see #16's casing-hazard note)
- `goals.js` — `prBest`, `prPct`, `prDelta` (PR-best-result / progress-% / delta-vs-previous; canonical since #48, 2026-07-05 — collapsed from 3 near-identical copies in `Atletas.jsx`/`Athletes.jsx`/`Me.jsx`)
- `sessions.js` — `getTargets`, `matchesAthlete` (#70; session-domain, not WOD- or date-domain, so it doesn't live in `wod.js`/`week.js`). Promoted from `me/meHelpers.js` (the copy with tests) over `storage.js`'s and `Schedule.jsx`'s untested equivalents; both now re-export from here.
- `blobTables.js` — now exports only `mapResultRow` (the `results_v2` snake→camel mapper), the widely-used half: `Me.jsx` was hand-writing a fourth copy of it until #52, and `src/utils/resultMappers.js`'s SPA-side `rowToResult` aliases it since #70. **`BLOB_TABLES` (the old 8-table fetch-order array) was removed in #81** — #52 retired its `athletes.html` consumer and #81 trimmed `Leaderboard.jsx` to fetch only the 3 tables it uses (`sessions`/`athletes`/`settings`), dropping the 5 dead round-trips (incl. the now-anon-locked `coach_profile`/`locations`). `scripts/seed-dev.mjs` keeps its own private copy of the list for the dev snapshot.
- `results/resultsHelpers.js` — results.html's pure helpers (`calcKpis` one calculator/two variants, `blockEntries`, `cardSummary`, `sessName`, `blkMeta`), mirroring `schedule/scheduleHelpers.js`
- `boxScope.js` (#80) — `getBoxScope`/`inBoxScope`/`clearBoxScope`/`sessionBoxIds`, the per-box **soft** view scope. A `?box=<locationId>` param filters every public page's session list (`inBoxScope(s, box)` alongside `s.public !== false`); it sticks via `cone_box_scope` localStorage (mirrors `cone_athlete_filter`) and `Nav` carries it across tabs, **deliberately with no visible indicator** — a `?box=` link is handed to testers/a specific box's members so they see "their" schedule without it looking filtered; a Nav banner surfacing the active scope was built and then reverted the same day (2026-07-19) once this was clarified as the intended behavior, not a bug. `?box=all`/empty clears. **View filter for sharing/testing, NOT access control** — sessions/athletes/results are anon-read-all, so a scoped link only tidies what's shown (real per-athlete/per-session gating is #30/#31; #81 separately closed the `coach_profile`/`locations` read leak, but hidden `public:false` sessions stay bypassable until `sessions` normalizes out of its single JSONB blob). **Partition, not overlay (2026-07-19):** a session's box tags put it in exactly one audience — untagged ("Sem box") sessions show only in the unscoped/all view; a session tagged with one or more boxes shows only under a scope matching one of those tags, and is hidden from the plain unscoped view. `sessionBoxIds(session)` is the one place that reads a session's tags: canonical field is `locationIds` (array, multi-box — same "toggle to add/remove" UX as exercise categories), with a read-side fallback to the legacy singular `locationId` for sessions saved before multi-box support (never written for new saves). Set in Criador's box picker (multi-select toggle chips, `Criador.jsx` ~554-581) — "Sem box" is the 0-tags state, not a tag. **Box warnings (#53):** the index's "Avisos do box" reads `settings.value.boxWarnings` — a **dated list** `[{ id, date, message, box, active }]` (`box` = a `locationId` or `'all'` gym-wide); it shows the 3 most recent active in-scope ones (desktop strip) / 1 (mobile), bolding the message part before `' — '`. The coach manages the list via `criador/BoxWarnings.jsx` (add/date/message/on-off/delete; state and handlers stay in the `Criador.jsx` container, passed down as props) scoped to the same `selBox` selector (Criador's own single-select browsing filter, owned by `criador/WeekGrid.jsx` — unrelated to a session's own multi-box tags). Stored on `settings` (anon-readable), **not `locations`** (anon-locked by #81, and the index is anon).

Always check these before reimplementing a formatting or date utility. `src/utils/storage.js` (SPA side) re-exports `uid`/`toISO`/`todayISO`/`getTargets`/`matchesAthlete` from these modules rather than reimplementing them (#16, 2026-07-05; `getTargets`/`matchesAthlete` added #70) — one canonical implementation, imported via either path. `Resultados.jsx` was the last SPA holdout still forking `wod.js`/`week.js`/`goals.js` constants directly; #70 folded it in.

---

## Design system

**TotK CSS variables (`themes.css` at the repo root — 4 themes as `html.theme-*` classes):**
```
--bg:#0d0b09  --stone:#161210  --stone2:#1e1a16  --divider:#2a231c
--gold:#d8a840  --gold2:#b88820  --teal:#4ac8c0  --cream:#f0e8d0
--sub:#c8b090  --muted:#806850  --dim:#554a3a
```
- `var(--card)` is NOT defined — it resolves to transparent, so use `var(--stone)`/`var(--stone2)`. (Historical: the codebase is **clean** as of 2026-07-16 — 0 usages remain. Kept as a don't-reintroduce note, not a live defect.) All 4 themes define exactly the same **30** tokens, verified (the 30th is `--font-mono`, added #53/4·C — a theme-invariant system-mono stack; TV numeric readouts + the index ranking use it) — the only undefined-token references left in the repo are in `src/App.css`, which **nothing imports** (→ backlog #73). **The `:root` fallback block *also* carries theme-invariant geometry (#54/C0): `--sp-1..--sp-5` (4/8/12/16/24) + `--radius-sm:4px`/`--radius-md:6px`. These live only in `:root` (not the per-theme blocks) on purpose — spacing/radius don't vary by palette, and keeping them out of the theme classes preserves the "30 tokens per theme" count. Every page loads themes.css, so `src/public/shared` primitives inherit them.**
- `var(--border)` = stronger (card outlines); `var(--divider)` = subtle (internal separators).
- No **rounded rectangles** on public pages — but `border-radius: 50%` (true circles: timer ring, avatar badges, dots) is an exempt shape primitive; pills (`999px` ends) count as rounded rects and get squared. Minimal radius on SPA components → `--radius-sm`/`--radius-md` (#54/C0). (Settled 2026-07-09 — BACKLOG "Decisions recorded".)
- **SPA UI primitives (#54/C0 — the standard C1–C5 adopt, page-by-page, *replacing* the global `.b`/`.bp`/`.bsec`/`.bd`/`.tb-btn` zoo, not wrapping it):** `Button` (primary/secondary/destructive/ghost × md/sm/xs; destructive = `--red`; icon-only requires `aria-label`), `Input`, `Card` live in **`src/components/ui/`** (SPA chrome; **client-free by rule** — the gallery renders them, so no Supabase import, direct or transitive). `ConfirmReview` (one `role="dialog"` confirm shell — focus-trap, Escape→Editar, canonical labels "Revisar registro"/"Editar"/"Confirmar"; collapses the 3 old forks) + `MaskedTimeInput` (#35, mm:ss) are cross-surface (public consumers too) → **`src/public/shared/`**. All token-only; hover via `filter`/`color-mix`, never hex. Built + gallery-covered in C0; **no tab adopts them yet** — that's C1–C5.
- Font: `var(--font)` → Cinzel (TotK themes) or Amarante (Spirit Blossom themes). Loaded weights (`src/fonts.js`): Cinzel **400/500/600/700/800/900** (500 + 800 added in #52, the first session to touch a weight-800 use), Crimson Pro 400/600, Amarante 400 **only** — Amarante ships no bold upstream, so its synthesized bolds are by design.
- All UI strings: pt-BR.
- **Design process is component-driven, two lanes (WORKFLOW.md "Design work"):** the all-states source of truth is the **in-app component gallery** (`gallery.html`, dev-only), which renders the *real* components — Lane A (changing existing UI) is gallery-first, no static mockup; Lane B (net-new) does a Claude Design ideation mockup first, then the built component enters the gallery. The moment code exists, the gallery is the truth — never hand-maintain a mirror. Claude Design (`cone/design/` → "Cone Design System" project) is token canon + **generated component cards** + Lane-B ideation + a screenshot archive, not a mirror.
- **Component gallery:** `gallery.html` (repo root) + `cone/src/public/gallery/` (`main.jsx`, `Gallery.jsx`) — theme switcher + width toggle rendering the real components in every state from mock fixtures; `GROUPS` holds 46 items across **SPA**/**Criador**/Shared/Results/Leaderboard/Me/Schedule/**Index** (the **SPA** group = the #54/C0 primitives `Button`/`Input`/`MaskedTimeInput`/`Card`/`ConfirmReview`; the **Criador** group = #92's text mode (`SessionTextPane`/`BlockTextEditor`/`WeekSessionCard`/`WeekImportModal`) plus #58's `GoalInput`/`SessionMetaModal`; the Index group = the #53 landing-page pieces: `WeekGrid`/`DaySessionCard`/`DayRanking`/`BoxWarnings`, all from `src/public/index/rail.jsx` — `WeekGrid` carries a second case for its Criador day-strip use, `filter`+`showCount`), picked from a sidebar. (The SPA group's card generates as `design/components/spa.html` — `design:cards` derives the filename from `group.toLowerCase()`, so that group name is a single clean token, not "SPA / UI".) **Dev-only:** NOT in `vite.public.config.js` `input`, so `npm run dev:public` serves it at `/CrossFit-Apps/gallery.html` but it is never built/deployed. Grows page-by-page as components are extracted (#17).
- **`npm run design:cards`** (`vite.design.config.js` + `scripts/build-design-cards.mjs`) SSRs the gallery's exported `GROUPS` into the self-contained Claude Design cards — real markup + real CSS + inlined themes/fonts + a 4-theme switcher — so Claude Design can read and compose from actual component markup. Cards are a **build artifact: never hand-edit one**, change the component and re-run (Lane A ends with regenerate + sync). Cards can't load the `ti` webfont or any external URL (CSP), so `results`/`schedule` cards show blank icon gaps — expected, noted on the card itself. `tokens/palette.html` is generated from `themes.css`, which is what finally killed its 13-vs-29 token drift. Details: `cone/design/README.md`.
- Design-pass program (restructured #27/#28, sessions #49–#59): `docs/plans/16-design-pass-program.md`. Product docs: `docs/FEATURES.md` (feature catalog + gate candidates), `docs/PRODUCT.md` (personas/tiers), `docs/MOBILE.md` (Android/iOS assessment — do nothing until a trigger fires). Consolidated interactive view: `docs/site/cone-docs.html` (open via `file://` — repo-only, NOT in the deploy whitelist by design; interactive tier board + coach-services worksheet for the tier meeting, full screenshot baseline in `docs/site/img/`; snapshot of the .md docs, regenerate on request).

**Data colors — exempt from tokenization (they identify a thing, so they must stay stable across all 4 themes):**

*Block families* (`blkColor`, `lib/wod.js`):
- RED: WOD / HIIT / MetCon
- AMBER: EMOM / For Time / AMRAP / Estações
- BLUE: Força / LPO / Core / Acessórios
- GREEN: Aquecimento / Skill / Cardio / Mobilidade

*Scales* (`SCALE_COL` / `scaleColor()`, `lib/wod.js` — canonical since #51): RX teal · Inter orange · SC violet · Adaptado warm-grey, plus one fallback grey. This reconciled two diverged copies (`Results.jsx` had Inter orange, `Athletes.jsx` had it gold; Results' red Adaptado collided with the RED block family and misread as an error). **All public pages are on it since #52** — `me.html` was a *third* copy that painted SC orange and Inter blue (the same result showed a different-colored badge depending on which page you opened), and `athletes.html`'s copy retired with the page. `scaleLabel()`/`SCALE_SHORT` gives the short form ("Adaptado" → "Adap") for tight aligned columns.

⚠️ **`exerciseRows` is a dead write path** (audited #52). It's read in 4 places — `deriveScale()` among them — but **written by nothing** in `cone/src`; only the retired root-level `schedule_builder_pt.html` ever wrote it. So `deriveScale(blk)` always falls through to the flat `blk.scale` on any row the current app produced, and **no per-exercise scale or load is captured anywhere**. Reviving it is the keystone of [plans/22](./docs/plans/22-athlete-character-stats.md). Do not assume a block carries per-exercise data.

**`--podium-1/2/3`** (themes.css, all 4 themes): medal colors, tuned per palette. Row tints derive from them via `color-mix()` at the call site — 3 tokens, not 6.

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
- Tests: `npm test` (378 tests across 13 files: wod.test.js, week.test.js, pix.test.js, resultMappers.test.js, useClassTracking.test.js, goals.test.js, meHelpers.test.js, boxScope.test.js, entries.test.js, storage.test.js, registry.test.js, blockModel.test.js, textFormat.test.js)
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
- `session.public === false` = hidden; `undefined` or `true` = public — all **5** session-rendering public pages filter on this (Index, Schedule, Results, Me, Leaderboard; verified 2026-07-16). It was 6 before `athletes.html` retired in #52. `timer.html` reads no sessions; `tv.html` deliberately doesn't filter (next line).
- TvController ignores session visibility — coach always sees all sessions
