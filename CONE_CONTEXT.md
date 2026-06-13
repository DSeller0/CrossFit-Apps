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
    exercises: [{ id, name, sets, reps, intensity, note }]
  }]
}
```

Block label display pattern:
```javascript
b.label && b.type && b.label !== b.type ? `${b.label} · ${b.type}` : b.label || b.type
```

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
| **Criador** | Session builder. Blocks with exercises, zone, duration, ladder mode. Save as template (🔖). Apply template. Recurring sessions (repeat icon → day picker + date range → bulk create). |
| **Atletas** | Athlete list, profiles, goals, PRs. |
| **Exercícios** | Exercise registry (autocomplete source). |
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

WOD block types: `['WOD', 'For Time', 'AMRAP', 'EMOM', 'MetCon', 'HIIT']`
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
- Criador.jsx uses `React.createElement()` throughout — no JSX syntax in that file
- Rod's June 16–18 session data: accepted as permanently lost, moved on

---

## Pending / next steps

### Ideas in consideration
- **Gym settings UI** — coach sets gymName, logo, accent color from inside the app
- **QR per athlete** — coach generates shareable `me.html?id=<id>` QR for each athlete
- **me.html evolution** — currently shows results history + stats; direction TBD (personal client vs box client distinction to be thought through)
- **Leaderboard all-time PRs** — aggregate best performances per exercise across all sessions
- **PWA install prompt** — nudge athletes to add hub to home screen

### Operational
- Gmail SMTP: awaiting Rod's confirmation that auth email reached him
- Templates Supabase table: SQL has been run, verify sync is working after coach login

---

## Repo

GitHub: `https://github.com/DSeller0/CrossFit-Apps`
Deploy: GitHub Actions → `gh-pages` branch (auto on push to `main`)
Build: `npm run build` in `cone/` → `cone/dist/` → assembled into `deploy/` folder
