import { normaliseType, normaliseZone } from './config'
import { uid } from '../public/lib/wod.js'
import { toISO, todayISO } from '../public/lib/week.js'
import { getTargets, matchesAthlete, normalizeSessionIds } from '../public/lib/sessions.js'
import {
  dbSaveSessions,
  dbSaveAthletes,
  dbSaveResults,
  dbSaveEvents,
  dbSaveLocations,
  dbSaveCoach,
  dbSaveSettings,
  dbSaveRegistry,
  dbSaveGoalsData,
  dbSaveTemplates,
  dbLoadSessions,
  dbLoadAthletes,
  dbLoadResults,
  dbLoadEvents,
  dbLoadLocations,
  dbLoadCoach,
  dbLoadSettings,
  dbLoadRegistry,
  dbLoadGoalsData,
  dbLoadTemplates,
  dbGetUpdatedAt,
} from './supabase'

export { uid, toISO, todayISO, getTargets, matchesAthlete }

// Tracks the updated_at timestamp of the sessions row at last sync/save.
// Used to detect when another device has written to Supabase since we loaded.
let _sessionsTs = null
export const getSessionsTs = () => _sessionsTs
export const markSessionsSaved = () => {
  // Set slightly into the future so the async Supabase write has time to land
  // before the next 30s poll compares against it.
  _sessionsTs = new Date(Date.now() + 6000).toISOString()
}

// ── Storage keys (cone_* naming, Phase 4) ────────────────────────────────────
export const LS_KEY = 'cone_sessions_v1'
export const LS_ATHLETES = 'cone_athletes_v1'
export const LS_RESULTS = 'cone_results_v1'
export const LS_SETTINGS = 'cone_settings_v1'
export const LS_REGISTRY = 'cone_registry_v1'
export const LS_GOALS = 'cone_goals_v1'
export const LS_EVENTS = 'cone_events_v1'
export const LS_LOCATIONS = 'cone_locations_v1'
export const LS_COACH = 'cone_coach_v1'
export const LS_TEMPLATES = 'cone_templates_v1'

// One-time shim: copy old eagles_*/gym_v9 keys to cone_* equivalents.
// Runs on module load; safe to call multiple times (noop after first run).
;(function migrateLocalStorageKeys() {
  const renames = [
    ['gym_v9', 'cone_sessions_v1'],
    ['eagles_athletes_v1', 'cone_athletes_v1'],
    ['eagles_results_v1', 'cone_results_v1'],
    ['eagles_settings_v1', 'cone_settings_v1'],
    ['eagles_block_registry_v1', 'cone_registry_v1'],
    ['eagles_athlete_goals_v1', 'cone_goals_v1'],
    ['eagles_events_v1', 'cone_events_v1'],
    ['eagles_locations_v1', 'cone_locations_v1'],
    ['eagles_coach_v1', 'cone_coach_v1'],
  ]
  try {
    renames.forEach(([oldKey, newKey]) => {
      const old = localStorage.getItem(oldKey)
      if (old !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, old)
        localStorage.removeItem(oldKey)
      }
    })
  } catch {
    /* localStorage unavailable (SSR/test env) */
  }
})()

// ── Utility helpers ───────────────────────────────────────────────────────────
// uid/toISO/todayISO/getTargets/matchesAthlete now live in ../public/lib/
// (wod.js/week.js/sessions.js) — re-exported above so existing SPA imports from
// './storage' keep working.

// Cache-only write: localStorage only, never Supabase. Every table's save*
// composes this with its dbSave*; syncFromSupabase (the pull) calls the
// cache-only half directly so a read never re-upserts what it just read
// (#111 — extends #76's cacheResultsLS, the original instance of this
// pattern, to every blob table; "a load/read path never writes", CLAUDE.md).
const cacheLS = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    /* localStorage best-effort; dbSave* still runs from save* */
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────────
const migrateTypes = sessions => {
  const out = {}
  Object.keys(sessions).forEach(k => {
    out[k] = (sessions[k] || []).map(s => ({
      ...s,
      blocks: (s.blocks || []).map(b => ({
        ...b,
        type: normaliseType(b.type),
        zone: normaliseZone(b.zone),
      })),
    }))
  })
  return out
}

export const loadLS = () => {
  try {
    const d = localStorage.getItem(LS_KEY)
    if (!d) return {}
    return normalizeSessionIds(migrateTypes(JSON.parse(d)))
  } catch {
    return {}
  }
}
export const cacheSessionsLS = d => cacheLS(LS_KEY, d)
export const saveLS = d => {
  cacheSessionsLS(d)
  markSessionsSaved()
  dbSaveSessions(d)
}

// ── Athletes ──────────────────────────────────────────────────────────────────
export const loadAthletes = () => {
  try {
    const d = localStorage.getItem(LS_ATHLETES)
    return d ? JSON.parse(d) : []
  } catch {
    return []
  }
}
export const cacheAthletesLS = d => cacheLS(LS_ATHLETES, d)
export const saveAthletes = d => {
  cacheAthletesLS(d)
  dbSaveAthletes(d)
}

// ── Results ───────────────────────────────────────────────────────────────────
export const loadResults = () => {
  try {
    const d = localStorage.getItem(LS_RESULTS)
    const p = d ? JSON.parse(d) : []
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}
// Cache to localStorage only — no Supabase write. Used by the startup pull so a
// *read* never re-upserts (#76): saveResults → dbSaveResults stamps updated_at on
// every row, so pulling on each SPA load was rewriting all provenance timestamps.
export const cacheResultsLS = d => cacheLS(LS_RESULTS, d)
export const saveResults = d => {
  cacheResultsLS(d)
  dbSaveResults(d)
}

// ── Settings ──────────────────────────────────────────────────────────────────
export const loadSettings = () => {
  try {
    const d = localStorage.getItem(LS_SETTINGS)
    return d ? JSON.parse(d) : {}
  } catch {
    return {}
  }
}
export const cacheSettingsLS = d => cacheLS(LS_SETTINGS, d)
export const saveSettings = d => {
  cacheSettingsLS(d)
  dbSaveSettings(d)
}

// ── Exercise registry ─────────────────────────────────────────────────────────
export const loadRegistry = () => {
  try {
    const d = localStorage.getItem(LS_REGISTRY)
    return d ? JSON.parse(d) : null
  } catch {
    return null
  }
}
export const cacheRegistryLS = d => cacheLS(LS_REGISTRY, d)
export const saveRegistry = d => {
  cacheRegistryLS(d)
  dbSaveRegistry(d)
}

// ── Goals & PRs ───────────────────────────────────────────────────────────────
export const loadGoalsData = () => {
  try {
    const d = localStorage.getItem(LS_GOALS)
    return d ? JSON.parse(d) : { athleteGoals: {}, prs: {} }
  } catch {
    return { athleteGoals: {}, prs: {} }
  }
}
export const cacheGoalsDataLS = d => cacheLS(LS_GOALS, d)
export const saveGoalsData = d => {
  cacheGoalsDataLS(d)
  dbSaveGoalsData(d)
}

// ── Events (agenda) ───────────────────────────────────────────────────────────
export const loadEvents = () => {
  try {
    const d = localStorage.getItem(LS_EVENTS)
    return d ? JSON.parse(d) : {}
  } catch {
    return {}
  }
}
export const cacheEventsLS = d => cacheLS(LS_EVENTS, d)
export const saveEvents = d => {
  cacheEventsLS(d)
  dbSaveEvents(d)
}

// ── Locations / services ──────────────────────────────────────────────────────
export const loadLocations = () => {
  try {
    const d = localStorage.getItem(LS_LOCATIONS)
    return d ? JSON.parse(d) : []
  } catch {
    return []
  }
}
export const cacheLocationsLS = d => cacheLS(LS_LOCATIONS, d)
export const saveLocations = d => {
  cacheLocationsLS(d)
  dbSaveLocations(d)
}

// ── Coach profile ─────────────────────────────────────────────────────────────
export const loadCoach = () => {
  try {
    const d = localStorage.getItem(LS_COACH)
    return d ? JSON.parse(d) : { name: '', contact: '', phone: '' }
  } catch {
    return { name: '', contact: '', phone: '' }
  }
}
export const cacheCoachLS = d => cacheLS(LS_COACH, d)
export const saveCoach = d => {
  cacheCoachLS(d)
  dbSaveCoach(d)
}

// ── Session templates ─────────────────────────────────────────────────────────
export const loadTemplates = () => {
  try {
    const d = localStorage.getItem(LS_TEMPLATES)
    return d ? JSON.parse(d) : []
  } catch {
    return []
  }
}
export const cacheTemplatesLS = d => cacheLS(LS_TEMPLATES, d)
export const saveTemplates = d => {
  cacheTemplatesLS(d)
  dbSaveTemplates(d)
}

// ── Pull all data from Supabase into localStorage ─────────────────────────────
// Called once on app startup. Returns an object with the fresh data so App.jsx
// can update React state without a reload.
export async function syncFromSupabase() {
  const [
    sessions,
    athletes,
    results,
    events,
    locations,
    coach,
    settings,
    registry,
    goalsData,
    templates,
    sessionsTs,
  ] = await Promise.all([
    dbLoadSessions(),
    dbLoadAthletes(),
    dbLoadResults(),
    dbLoadEvents(),
    dbLoadLocations(),
    dbLoadCoach(),
    dbLoadSettings(),
    dbLoadRegistry(),
    dbLoadGoalsData(),
    dbLoadTemplates(),
    dbGetUpdatedAt('sessions'),
  ])

  const out = {}

  // Cache-only throughout (#111 — extends #76's results-only fix to every blob
  // table): the pull is a read and must never call a dbSave*, or it re-upserts
  // everything it just read on every authenticated SPA mount, stamping a fresh
  // updated_at and (worse, on a stale device) overwriting the server with an
  // out-of-date local copy.
  if (sessions && typeof sessions === 'object' && !Array.isArray(sessions)) {
    const migrated = normalizeSessionIds(migrateTypes(sessions))
    cacheSessionsLS(migrated)
    out.sessions = migrated
  }
  if (Array.isArray(athletes)) {
    cacheAthletesLS(athletes)
    out.athletes = athletes
  }
  if (Array.isArray(results)) {
    cacheResultsLS(results)
    out.results = results
  }
  if (events && typeof events === 'object' && !Array.isArray(events)) {
    cacheEventsLS(events)
    out.events = events
  }
  if (Array.isArray(locations)) {
    cacheLocationsLS(locations)
    out.locations = locations
  }
  if (coach && typeof coach === 'object') {
    cacheCoachLS(coach)
    out.coach = coach
  }
  if (settings && typeof settings === 'object') {
    cacheSettingsLS(settings)
    out.settings = settings
  }
  if (registry && typeof registry === 'object') {
    cacheRegistryLS(registry)
    out.registry = registry
  }
  if (goalsData && typeof goalsData === 'object') {
    cacheGoalsDataLS(goalsData)
    out.goalsData = goalsData
  }
  if (Array.isArray(templates)) {
    cacheTemplatesLS(templates)
    out.templates = templates
  }

  // The pull no longer calls saveLS, so there's no provisional stamp to
  // overwrite — _sessionsTs is set directly from the real remote updated_at,
  // which is exactly what the 30s conflict poller (SyncContext.jsx) should be
  // comparing against.
  if (sessionsTs) _sessionsTs = sessionsTs

  return out
}
