# Cone — Project Context for Claude Code

## What this project is

Cone is a CrossFit coaching management app built by a solo developer (no prior coding background),
working entirely with Claude AI assistance. Started as a single-file HTML app, now migrated to
Vite + React + Supabase. In active use by coaches (Rod / Team Medrado).

---

## Current file structure

```
/                           ← GitHub Pages root
  index.html                ← PUBLIC: athlete landing page (today's sessions, live refresh)
  me.html                   ← PUBLIC: athlete self-profile (name picker → personal history)
  log.html                  ← PUBLIC: athlete self-log (QR code target)
  leaderboard.html          ← PUBLIC: WOD results leaderboard
  schedule.html             ← PUBLIC/COACH: weekly training schedule
  athletes.html             ← COACH: athlete profiles (legacy HTML, still in use)
  recover.html              ← UTILITY: mobile localStorage data export
  manifest.json             ← PWA manifest
  sw.js                     ← Service worker
  config.json               ← Runtime config (legacy)
  icon-192.png / icon-512.png

cone/                       ← Vite + React 19 app (main coach builder)
  src/
    App.jsx                 ← Auth gating, Supabase sync on startup, tab router
    index.css               ← Global styles (TotK dark theme + all tab namespaces)
    utils/
      supabase.js           ← createClient, dbLoad/dbSave generics, per-table helpers
      storage.js            ← localStorage read/write + syncFromSupabase()
      config.js             ← APP_CONFIG, ZONES, BTC, PLC constants
    components/
      LoginScreen.jsx       ← 8-digit OTP auth (email → code boxes)
      PresenterView.jsx     ← Full-screen TV mode (scales DailyExportView)
      tabs/
        Criador.jsx         ← Session builder + block editor + templates + recurring sessions
        Atletas.jsx         ← Athlete management
        Exercicios.jsx      ← Exercise registry
        Servicos.jsx        ← Services / billing locations
        Resultados.jsx      ← Coach result logging
        QuickLog.jsx        ← Log Rápido — fast mobile result entry
        Publicador.jsx      ← Session publisher + Apresentar button

  dist/                     ← Vite build output (deployed to /cone/)

.github/workflows/deploy.yml ← CI: builds cone/, copies public pages, deploys to gh-pages
CONE_CONTEXT.md             ← This file
```

GitHub Pages URLs:
- Hub (athlete home): `https://dseller0.github.io/CrossFit-Apps/`  ← index.html at root
- Athlete profile:    `https://dseller0.github.io/CrossFit-Apps/me.html?id=<athleteId>`
- Cone (coach app):  `https://dseller0.github.io/CrossFit-Apps/cone/`
- Log:               `https://dseller0.github.io/CrossFit-Apps/log.html`
- Leaderboard:       `https://dseller0.github.io/CrossFit-Apps/leaderboard.html`
- Schedule:          `https://dseller0.github.io/CrossFit-Apps/schedule.html`
- Recover:           `https://dseller0.github.io/CrossFit-Apps/recover.html`

---

## Architecture

### Backend — Supabase
Project: `https://crsalcpvsedmiabkeibp.supabase.co`

Single-row JSONB tables (all `id=1`, `value=JSONB`):

| Table             | Contents                                        |
|-------------------|-------------------------------------------------|
| `sessions`        | `{ "YYYY-MM-DD": [session, ...] }`              |
| `athletes`        | `[athlete, ...]`                                |
| `results`         | `[result, ...]`                                 |
| `settings`        | `{ gymName, ... }`                              |
| `templates`       | `[template, ...]`  ← session block templates    |
| `athletes_goals`  | goals + PRs per athlete                         |
| `exercise_registry` | exercise registry                             |
| `lb_colors`       | leaderboard colour config                       |
| `events`          | coach agenda events                             |
| `locations`       | services/billing locations                      |
| `coach_profile`   | coach profile (Pix key, etc.)                   |

RLS:
- Public read: anon key on all tables
- Public insert: `results` table only (athletes self-log without auth)
- Write (all tables): restricted to `allowed_emails` via `is_allowed_user()` security-definer fn
- New sign-ups: DISABLED in Supabase dashboard

### Authentication
- Email OTP, 8-digit code (NOT magic links — Outlook Safe Links broke those)
- Phase 1: enter email → `signInWithOtp({ email, options: { shouldCreateUser: false } })`
- Phase 2: 8 input boxes → `verifyOtp({ email, token, type: 'email' })`
- Email delivery: configured via Gmail SMTP (smtp.gmail.com:587, App Password) — no domain required
- Supabase email template must include `{{ .Token }}` (not just the magic link)

### Cone app (Vite + React 19)
- `App.jsx`: detects Supabase session → shows LoginScreen or main tabs
- On startup: `syncFromSupabase()` pulls all tables into localStorage + updates React state
- On every save: fire-and-forget Supabase upsert
- localStorage key prefix: `gym_v9` (sessions), `eagles_*` (athletes, results, etc.), `cone_templates_v1` (templates)
- Tab order: Criador · Atletas · Exercícios · Serviços · Resultados · Log Rápido · Publicador

### Data sync helpers (`storage.js`)
```js
loadLS() / saveLS(d)               // sessions
loadAthletes() / saveAthletes(d)
loadResults() / saveResults(d)
loadTemplates() / saveTemplates(d) // ← cone_templates_v1
syncFromSupabase()                 // pulls all 11 tables in parallel, returns fresh data
```

---

## Data model

### Session
```javascript
{
  id: string,
  date: "YYYY-MM-DD",
  sessionName: string,       // display name (field is sessionName, not name)
  time: string,              // "HH:MM" (optional)
  mainTraining: string[],    // athlete names assigned (shim: getTargets(s) handles old string)
  blocks: [{
    id, label, type,         // e.g. label:"Chipper", type:"For Time"
    zone, duration, rounds, notes, ladderMode,
    exercises: [{
      id, name, sets, reps, intensity, note,
      isComplex: bool,              // true = complex set
      complexMovements: [{ id, name, reps }]  // sub-movements of a complex
    }],
    // Estações blocks only (type === 'Estações'):
    stationRepeat: number,          // how many times the station sequence repeats
    restBetweenCycles: string,      // "MM:SS" rest after each full cycle (optional)
    stations: [{
      id, name, duration,           // name e.g. "Grupo A", duration e.g. "10:00"
      isRest: bool,                 // true = rest/transition, no exercises
      exercises: [...]              // same exercise structure as block exercises
    }]
  }]
}
```

Block label display pattern:
```javascript
b.label && b.type && b.label !== b.type ? `${b.label} · ${b.type}` : b.label || b.type
```

Estações blocks: `exercises` key is absent; `stations` replaces it. Old blocks with `exercises` are unaffected.

### Result
```javascript
{
  id, date, athleteId, sessionId,
  presence,              // "Presente" | "Ausente" | "Atrasado"
  energyLevel,           // 1–5
  blocks: [{
    blockId, blockType, blockLabel,
    scale,               // "RX" | "Inter" | "SC" | "Adaptado"
    perfTime,            // "MM:SS" (For Time blocks)
    perfRounds, perfReps,
    rpe,                 // 1–10
    exerciseRows: [{ name, scale, load }]
  }],
  coachNote, flagForReview,
  loggedByAthlete: true  // set when athlete self-logs via log.html
}
```

### Template (`cone_templates_v1`)
```javascript
{
  id: string,
  name: string,
  blocks: [block, ...]   // same structure as session blocks, IDs cloned on apply
}
```

### Athlete
```javascript
{
  id, name, color,       // color is CSS hex, used as avatar accent
  ...                    // contact, goals, PRs etc. (managed in athletes.html / Atletas tab)
}
```

---

## Feature inventory

### Coach app (cone/)

| Tab | Description |
|-----|-------------|
| **Criador** | Session builder. Block type picker (15 types across 4 color families). Adaptive meta fields per type. Compact exercise rows with ⚙ expand-to-reveal (intensity + note). Complex sets: Complexo toggle → sub-movements + notation. Escada mode toggle in exercise detail. Estações block type → station groups with per-station exercises and cycle repeat. Mobile: bottom sheet for exercise detail. Week grid, templates, recurring sessions, sync/conflict detection. |
| **Atletas** | Athlete list, profiles, goals, PRs. |
| **Exercícios** | Exercise registry. Two-pane desktop (block list left, exercises right). Todos view shows all exercises with colored block tags. ExerciseCombobox ranks current-block exercises first when typing. |
| **Serviços** | Billing services / locations. |
| **Resultados** | Coach result logging with full block detail, RPE, energy level, coach note. |
| **Log Rápido** | Fast mobile entry. Sticky session bar, 2-col athlete grid, scale chips, perf fields, RPE bar. Quick-submit per athlete. |
| **Publicador** | Publish daily session. Apresentar → PresenterView (TV mode with QR). |

### Public pages

| Page | Description |
|------|-------------|
| **index.html** | Today's sessions. First card = "Sessão do dia". Result count per session. Live refresh every 30s (updates count spans in-place, pulsing live dot in header). Bottom nav: Leaderboard · Meu Perfil · Agenda. |
| **me.html** | Athlete self-profile. `?id=<athleteId>` → full profile. No `?id` → searchable name picker. Sections: hero + stats, week strip, scale bar, last 15 results with blocks/scale/perf/RPE/coach note. |
| **log.html** | Athlete self-log. Reads `?date=` + `?session=` params. Saves result with `loggedByAthlete: true`. |
| **leaderboard.html** | WOD leaderboard. Filter by block + scale. Custom colours via `lb_colors` table. |
| **schedule.html** | Weekly schedule view. Slide-in result log pane. Athlete filter. |

All public pages: home button (ti-home icon) in topbar linking back to index.html.

---

## Design system — TotK dark theme

```css
--bg: #0d0b09            /* public pages */
--bg: #1a1410            /* coach app */
--card: #161210
--card2: #1e1a16
--accent: #4ac8c0        /* Sheikah teal */
--gold: #d8a840
--cream: #f0e8d0         /* primary text */
--sub: #c8b090
--muted: #a89880
--divider: #2a231c
--font: 'Raleway', sans-serif
```

Icon library: **Tabler Icons** (`ti-*` classes via CDN in public pages, imported in cone app).
No Zelda-specific icon library exists — sticking with Tabler.

Block type color families (CSS class prefix → types):
- **RED** (`bt-wd/hi/mc`): WOD · HIIT · MetCon — intensity-based
- **AMBER** (`bt-em/ft/am/es`): EMOM · For Time · AMRAP · Estações — time-structured
- **BLUE** (`bt-st/lp/co/ac`): Força · LPO · Core · Acessórios — barbell/lifting
- **GREEN** (`bt-wu/sk/ca/mo`): Aquecimento · Skill · Cardio · Mobilidade — movement quality
- **NEUTRAL** (`bt-re`): Descanso

Accent colors: purple `#9070d8` = exercise-layer state (Complexo/Escada toggles, ⚙ active). Teal `#4ac8c0` = navigation/action (drag-over, Feito button in bottom sheet).

WOD block types (leaderboard-linked): `['WOD', 'For Time', 'AMRAP', 'EMOM', 'MetCon', 'HIIT']`
Scales: `['RX', 'Inter', 'SC', 'Adaptado']`

---

## Branding rules

- App name: **Cone** only — never "Eagles" (old brand), never "CrossFit" (copyright)
- "CrossFit" is acceptable in internal/coach-only UI and code comments
- Public pages: no "CrossFit" anywhere

---

## PresenterView (Publicador tab)

- Full-screen overlay, scales 1920×1080 `DailyExportView` to fit viewport
- `scale = Math.min(window.innerWidth/1920, window.innerHeight/1080)`
- Auto-hide controls: mouse idle 3s → cursor + close button fade out
- QR code positioned in screen coords (outside scaled div) → always 130px
- QR links to `log.html?date=YYYY-MM-DD&session=<id>`
- ESC key closes

---

## Decisions already made (do not re-litigate)

- Language: Portuguese (Brazilian) — all UI strings in pt-BR
- Auth: OTP code, not magic links (Outlook Safe Links consumed magic link tokens)
- Email delivery: Gmail SMTP with App Password (no domain required, works for any recipient)
- Rate billing: `Math.max(1, Math.floor(durationMin / 60))` — floor hourly, min 1h
- "Locais" tab = "Serviços" — billing arrangement, not just a place
- Energy level: numbers 1–5 (no emoji in UI)
- `mainTraining` is an array — `getTargets(s)` shims old string values
- Pix QR: static, fixed amount, EMV payload, CRC16/CCITT, `pixTestCap` safety limit
- Session field is `sessionName` (not `name`) — check both when reading old data
- Criador.jsx redesigned to use JSX (feature/criador-redesign branch); all other tabs also use JSX
- Rod's June 16–18 session data: accepted as permanently lost, moved on
- Complex sets use toggle buttons (not checkboxes) for "Complexo" and "Escada" modes in ExerciseRow detail
- schedule.html renders complex exercises: headline = sets×(notation) NAME, then sub-movement list, then load
- Mobile ExerciseRow: main row shows only name + ⚙ + delete; ⚙ opens bottom sheet (sets×reps, mode toggles, intensity, note). Desktop keeps inline expand. Body scroll locked while sheet is open.
- Estações block type: station-based (groups + rest stations), cycle repeat, renders in schedule.html with station headers + duration chips
- Block color families: 4 groups (RED/AMBER/BLUE/GREEN) — related block types share hue family for visual grouping
- EMOM got its own CSS class `bt-em` (separated from MetCon's `bt-mc`) when families were defined
- Exercícios tab: "Todos" view aggregates all exercises with colored block tags; ExerciseCombobox ranks current-block matches first when querying

### Exercícios tab — current state

**Data model** (unchanged): `{ [blockName]: string[] }` — exercises stored per block as plain strings.

**Implemented:**
- Two-pane desktop layout (block list left, exercise list right)
- "Todos" view: all exercises alphabetically with block tag pills; clicking a tag navigates to that block; delete removes from all blocks (with confirmation)
- ExerciseCombobox: when typing, current block's matches appear first, then all other blocks' matches alphabetically

**Future migration** (deferred): global flat list `{ exercises: [{id, name, tags:[]}] }` — not needed until the coach explicitly manages cross-block exercise relationships.

**What was dropped:** Default equipment loads, muscle maps, exercise demo links — deferred indefinitely.

**Block colors in Exercícios:** Each block type has its own accent color, editable via color picker in the left panel. Colors carry through to the block tag pills in the Todos view.

**New block types:** Added by code only (not via Exercícios UI).

**Design A prototype files** (in repo root, not deployed):
- `design-a.html` — approved reference design (two-pane, block tags, mobile responsive)
- `design-b.html`, `design-c.html` — rejected alternatives

---

## Pending / next steps

### Merged to main ✅ — `feature/criador-redesign`

All of the following is now live:
- Block type picker modal (grid of type cards across 4 color families)
- Adaptive meta fields per block type
- Compact exercise rows with ⚙ expand-to-reveal
- Complex sets: Complexo + Escada toggle buttons, sub-movements, notation
- Escada removed from Avançado section (now only in exercise detail)
- Mobile bottom sheet for exercise detail (name on main row; sets×reps + everything else in sheet)
- Progressive disclosure: zone + notes behind "Avançado ▼"
- Collapsed block summary bar
- Week grid with `sessionName`
- Sync + conflict detection
- OTP login fix
- schedule.html: complex exercises render correctly; Estações blocks render with station headers; progress bar bug fixed (progression exercise key mismatch + complex-exercise filter alignment)
- **Estações block type**: station groups + rest stations + cycle repeat
- **Block color families**: RED / AMBER / BLUE / GREEN (related types share hue)
- **Exercícios tab**: Todos view + block tag pills + ExerciseCombobox cross-block ranking
- Voice command (MicButton) removed — proved to have no purpose

### Criador QoL — agreed improvements (not yet built)

These were reviewed and approved. Build when prioritized:

1. **Insert block between blocks** — `+` button between existing blocks, not just at the bottom
2. **Block notes quick access** — surfaced directly in block body (collapsed one-liner, expands on click) without opening Avançado panel
3. **Copy block** — duplicate button on collapsed block bar, clones within session
4. **Always-accessible drag handle** — block reorder should not require collapsing first; a side rail or persistent handle when expanded
5. **Exercise load badge** — subtle dot/icon on collapsed ExerciseRow when intensity/load is programmed
6. **One-step undo for delete** — toast with "Desfazer" after removing a block or exercise (5-second window)
7. **Estações: total time display** — computed cap in block header (`Cap 42'`), excluding trailing rest, live-updating as durations change. Formula: `(sum of station durations × stationRepeat) - last rest duration if last station is rest`.
8. **Estações: MM:SS masked input** — digit-by-digit formatting: type `1500` → displays `15:00`. Colon auto-inserts after 2 digits; backspace removes last digit.
9. **Session-level notes field** — free-text for daily coaching brief / warmup direction
10. **Quick "Publicar hoje"** — shortcut button in Criador topbar to publish the current day's session without switching to Publicador tab
11. **Week grid collapse** — toggle to shrink to a single-row date strip, freeing vertical space for the block editor

### Queue after QoL
1. **Leaderboard all-time PRs** — best performance per movement across all sessions
2. **QR per athlete** — `me.html?id=<id>` QR in Atletas tab for coach to share
3. **PWA install prompt** — nudge athletes on index.html
4. **me.html evolution** — direction TBD

### Gym settings UI ✅
- Configurações tab in coach app (App.jsx + Config.jsx)
- Fields: gymName, label (PDF subtitle), logo URL with live preview
- Saves via `saveSettings()` → Supabase `settings` table on next sync

### Operational
- Gmail SMTP: awaiting Rod's confirmation that auth email reached him
- Templates Supabase table: SQL has been run, verify sync is working after coach login
- **Athlete data in Supabase:** First names are safe to store. Supabase uses TLS + AES-256 at rest, SOC 2 compliant. First names alone are low-sensitivity PII. LGPD (Brazil) applies — coach should inform athletes that data is stored in the app, no formal consent form needed at this scale.

---

## Repo

GitHub: `https://github.com/DSeller0/CrossFit-Apps`
Deploy: GitHub Actions → `gh-pages` branch (auto on push to `main`)
Build: `npm run build` in `cone/` → `cone/dist/` → assembled into `deploy/` folder
