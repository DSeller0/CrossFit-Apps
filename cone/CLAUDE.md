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

**deploy.yml whitelist** — `.github/workflows/deploy.yml` line 35 has an explicit list of HTML files to copy to gh-pages. Every new HTML file must be added here or it 404s on the live site.

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

**Supabase project URL:** `https://crsalcpvsedmiabkeibp.supabase.co`  
**Schema:** 11 single-row JSONB blobs (id=1, value=JSONB), plus `results_v2` normalized table, `templates` table.  
**RLS:** anon read-all; write restricted to `is_allowed_user()`; `results_v2` allows anon INSERT/UPDATE.

---

## TV system

**Files:** `src/components/tabs/TvController.jsx` (SPA controller) + `src/public/tv/TV.jsx` (display) + `src/public/tv/TV.module.css`

**Data flow:**
1. TvController calls `push(patch)` → upserts `{ id: 1, ...patch, updated_at: Date.now() }` to `tv_state`.
2. TV.html subscribes to `postgres_changes` on `tv_state` → receives delta → re-renders.
3. `push()` is **patch-only**. Never include local-only fields that are not DB columns — they poison the upsert and freeze all subsequent updates.

**tv_state columns (as of 2026-06-27):**
```
id                   INTEGER   PRIMARY KEY (always 1)
slide                TEXT      'blank'|'wod'|'timer'|'results'|'qr'
class_id             TEXT
session_id           TEXT
date_key             TEXT
block_id             TEXT
timer_type           TEXT      'For Time'|'AMRAP'|'EMOM'|'TABATA'|...
timer_cap_secs       INTEGER
timer_paused_elapsed INTEGER
timer_started_at     BIGINT
timer_paused         BOOLEAN
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

**fmtIntensity** is currently duplicated in `Schedule.jsx` and `TV.jsx`. Canonical home should be `src/lib/wod.js`.

---

## Shared utilities (`src/lib/`)

- `wod.js` — `uid`, `blkLabel`, `exVolStr`, `toSecs`, `fmtSecs`, `rankResults`, `perfStr`, `isWodBlock`, `loadRegistry`
- `week.js` — `MONTH_PT`, `DAY_PT`, `toISO`, `todayISO`, `getWeek`, `dateToWeekOffset`

Always check these before reimplementing a formatting or date utility.

---

## Design system

**TotK CSS variables (all public pages + `themes.css`):**
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

**Block color families:**
- RED: WOD / HIIT / MetCon
- AMBER: EMOM / For Time / AMRAP / Estações
- BLUE: Força / LPO / Core / Acessórios
- GREEN: Aquecimento / Skill / Cardio / Mobilidade

**Exercise data shapes:**
```js
// Standard exercise
{ id, name, sets, reps, intensity: { mode, ... }, note }

// Complex exercise
{ id, name?, isComplex: true, sets, complexMovements: [{ id, name, reps }], intensity, note }

// intensity modes: 'progression' | 'pct' | 'gender' | 'cardio'
// cardio: { mode:'cardio', cardioVal, cardioUnit }
// gender: { mode:'gender', Masculino_RX, Masculino_Inter, Masculino_SC, Feminino_*, *_unit }
```

---

## Build + deploy

- Dev: `npm run dev` inside `cone/`
- Build: `npm run build` → `dist/`
- Tests: `npm test` (3 test files: wod.test.js, pix.test.js, resultMappers.test.js)
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
