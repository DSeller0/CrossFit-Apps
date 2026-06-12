# Cone — Project Context for Claude Code

## What this project is

Cone is a CrossFit coaching management app built by a solo developer (non-technical background) 
working entirely with Claude AI assistance over several weeks. It is currently a collection of 
single-file HTML applications hosted on GitHub Pages. No build system, no backend, no framework — 
everything runs in the browser with localStorage for persistence.

The app is functional and in active use for testing by a coach.

---

## Current file structure

All files live flat in the GitHub Pages repo root:

```
schedule_builder_pt_V2.html   ← Main builder app (~503KB, 8400+ lines)
athletes.html                 ← Public athlete profile page
schedule.html                 ← Public weekly training schedule
leaderboard.html              ← Public WOD results leaderboard
sw.js                         ← Service worker (just added, PWA step)
manifest.json                 ← PWA manifest
config.json                   ← Runtime colour/font/gym config (read by public pages)
state.json                    ← Full app state export (read by public pages)
icon-192.png                  ← App icon
icon-512.png                  ← App icon
```

GitHub Pages URL: `https://dseller0.github.io/CrossFit-Apps/`

---

## Architecture — how it works today

### The builder (`schedule_builder_pt_V2.html`)

A single-file React app (CDN React 18, no build step). All components are defined inline.
State is stored in `localStorage` under these keys:

| Key | Contents |
|-----|----------|
| `gym_v9` | Sessions (workouts by date) |
| `eagles_athletes_v1` | Athletes array |
| `eagles_results_v1` | Training results |
| `eagles_settings_v1` | Publisher settings |
| `eagles_lb_colors_v1` | Leaderboard colour config |
| `eagles_block_registry_v1` | Exercise registry |
| `eagles_athlete_goals_v1` | Goals + PRs |
| `eagles_events_v1` | Agenda coaching events |
| `eagles_locations_v1` | Services/locations (billing) |
| `eagles_coach_v1` | Coach profile (name, Pix key, etc.) |

The coach exports state manually via "Salvar estado" → uploads `state.json` to GitHub → 
public pages fetch it. This is the main UX pain point to fix.

### Public pages

`athletes.html`, `schedule.html`, `leaderboard.html` all:
- Fetch `./config.json?v=timestamp` and `./state.json?v=timestamp` on load
- Are read-only — no editing, no auth
- Use the TotK (Zelda: Tears of the Kingdom) colour theme

### Data model

```javascript
// Core state structure (state.json)
{
  version: 2,
  sessions: {
    "2026-06-11": [
      {
        id: string,
        date: string,           // "YYYY-MM-DD"
        mainTraining: string[], // array of athlete names (was string, now array)
        sessionName: string,    // display name for the session
        blocks: [
          {
            id: string,
            label: string,      // e.g. "WOD", "Força"
            type: string,       // e.g. "For Time", "AMRAP"
            zone: string,
            duration: string,   // cap in minutes
            rounds: string,
            exercises: [
              { id, name, sets, reps, intensity, note, progression }
            ]
          }
        ]
      }
    ]
  },
  athletes: [
    { id, name, level, goal, notes, color, since }
  ],
  results: [
    {
      id, date, athleteId, presence,  // "Presente"|"Ausente"|"Atrasado"
      energyLevel,                     // 1-5
      sessionId,
      blocks: [
        {
          blockId, blockType, blockLabel,
          rpe,                          // 1-10
          perfTime, perfRounds, perfReps,
          exerciseRows: [{ name, scale, load }]
        }
      ],
      coachNote, flagForReview
    }
  ],
  athleteGoalsData: {
    athleteGoals: { [athleteId]: [{ id, name, totalSessions, completedSessions, milestones }] },
    prs: { [athleteId]: [{ id, name, category, type, unit, target, results: [{value, date}] }] }
  },
  events: {
    "2026-06-11": [
      {
        id, date, time,          // "HH:MM"
        durationMin,
        type,                    // "aula" | "personal"
        label,
        locationId,              // references a service/location
        local,                   // display location name (optional)
        localText,               // free text if local === "__outro__"
        athleteIds: [],
        status,                  // "scheduled" | "completed"
        sessionId,               // optional link to a session
        notes
      }
    ]
  },
  locations: [
    {
      id, name,
      type,                      // "box" | "personal"
      color,
      rate,                      // number
      rateUnit,                  // "per_session" | "per_hour"
      currency,                  // "R$"
      athleteIds: []             // for personal services
    }
  ],
  coachProfile: {
    name, contact, phone,
    pixKey,                      // Pix key for QR generation
    cidade,                      // city for Pix EMV payload
    pixTestCap,                  // max amount for test QR codes
    pixEnabled                   // boolean
  },
  settings: {},
  lbColors: { ...leaderboard colour overrides }
}
```

---

## Builder tabs (in order)

1. **Criador de Treinos** — session builder with blocks, exercises, DnD, progression
2. **Criar por Texto** — text parser (to be REMOVED in next refactor)
3. **Atletas** — athlete profiles, character stats, session summary, PRs, goals
4. **Exercícios** — exercise registry, two-pane desktop / accordion mobile
5. **Serviços** — billing services (boxes + personal rate tiers), coach Pix profile
6. **Resultados** — log training results per athlete
7. **Publicador de Grade** — agenda calendar + image export for social media

---

## Visual design system — TotK theme

```css
--bg: #1a1410          /* dark warm brown */
--bg2: #211c17
--bg3: #2a231c
--accent: #4ac8c0      /* Sheikah teal */
--gold: #d8a840        /* Sheikah gold */
--green: #68d8a0       /* Zonai green */
--cream: #f0e8d0       /* warm off-white text */
--sub: #c8b090         /* secondary text */
--muted: #a89880       /* muted/disabled text */
--divider: #3a3028     /* borders */
```

All new components should use these variables. No hardcoded dark colours.

---

## Key features already built

- Block-based session creator with DnD, ladder mode, progression intensity
- Exercise registry with per-block-type autocomplete
- Multi-athlete session assignment (Alvo field → array of athlete names)
- Character development screen (5 calculated stats: Força, Condicionamento, Habilidade, Progressão, Consistência)
- Session summary cards (2 past + 2 upcoming per athlete)
- PR tracking with progress bars
- Coach agenda (monthly calendar, 60/40 pane split, event creation)
- Billing: per-session or floor-hourly rates, Pix QR in PDF reports
- PDF report generation (jsPDF + autoTable) with Pix QR (EMV payload, CRC16)
- Mobile responsive: accordion layout for Exercícios and Serviços tabs at ≤600px
- PWA: service worker + manifest (just added)
- Image export for WhatsApp (multiple mobile formats)
- Leaderboard with deep-link from schedule page

---

## Known issues / technical debt

1. **503KB single file** — the builder is too large to open via `file://` on mobile
2. **No backend** — everything in localStorage, one device only, no sync
3. **Manual state export** — coach must manually export + upload to GitHub after changes
4. **Criar por Texto tab** — agreed to remove in next refactor
5. **mainTraining string→array migration** — done in builder and public pages, 
   but old state.json exports will have string values (backwards compat shim exists in all pages)
6. **No offline fallback page** — SW serves cached files but no custom offline.html
7. **No recurring sessions** — each week is manual
8. **No session templates** — common workflows not saved

---

## Immediately next steps (implementation order)

These are agreed and ready to build, in dependency order:

### 1. ✅ PWA + Service Worker — DONE
`sw.js` written, registration added to all pages, manifest updated.
To verify: DevTools → Application → Service Workers → should show "activated and running"

### 2. ✅ Vite + React migration — DONE
`cone/` directory — Vite + React 19, all tabs migrated, build pipeline set up,
GitHub Actions deploys to GitHub Pages on every push to main.
Live at: `https://dseller0.github.io/CrossFit-Apps/cone/`

### 3. ✅ Supabase integration — DONE
- 10 single-row JSONB tables mirror localStorage keys exactly
- All saves in Cone auto-sync to Supabase (fire-and-forget, non-blocking)
- App pulls from Supabase on startup via `syncFromSupabase()` in App.jsx
- Public pages (schedule.html, athletes.html, leaderboard.html) read live from Supabase
- Supabase project: `https://crsalcpvsedmiabkeibp.supabase.co`

### 4. ✅ Authentication — DONE
- Supabase magic link (email OTP, no password)
- Login screen gates the full builder UI
- RLS: public read (anon key) + write restricted to emails in `allowed_emails` table
- `is_allowed_user()` security-definer function enforces the email allowlist
- To add a coach: insert their email into `allowed_emails`, re-enable sign-ups briefly, disable again after first login
- Sign-ups disabled after coach's first login

### 5. Quick log mode — NEXT
Simplified result logging for mobile mid-WOD use.

### 6. Session templates + recurring sessions

### 7. Athlete self-logging

---

## Decisions already made (do not re-litigate)

- Language: Portuguese (Brazilian) — all UI strings in pt-BR
- Rate billing: `Math.max(1, Math.floor(durationMin / 60))` — floor hourly, minimum 1h
- "Locais" tab renamed to "Serviços" — a service is a billing arrangement, not just a place
- Aulas bill to the box (service), Personal bills to the athlete (via their assigned service)
- No emoji in UI — numbers only (e.g. energy level 1-5, not emoji)
- mainTraining is array — backwards compat shim `getTargets(s)` exists in all pages
- Pix QR: static QR with fixed amount, EMV payload, CRC16/CCITT
- `pixTestCap` safety limit on QR amount (stored in coachProfile)

---

## Repo

GitHub: `https://github.com/DSeller0/CrossFit-Apps`
Pages root: `https://dseller0.github.io/CrossFit-Apps/`
Builder (Cone app): `https://dseller0.github.io/CrossFit-Apps/cone/`
Public pages: `/schedule.html`, `/athletes.html`, `/leaderboard.html`
Deploy: GitHub Actions → `gh-pages` branch (auto on push to main)

---

## How this was built

Started as a single-file HTML app built entirely through Claude.ai chat with no local dev environment.
Migrated to Vite + React + Supabase with Claude Code (first local dev environment).
The developer has no prior coding background.

