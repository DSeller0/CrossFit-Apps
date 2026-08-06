// The "Dados" section of Configurações (#95/plans/69) — Salvar/Carregar/Limpar
// estado moved here verbatim out of App.jsx, where they'd lived as inline handlers
// with zero tests. Pure pieces first (buildSnapshot/stateFileName/parseStateFile),
// the two with real side effects (file download, applying a parsed file) last.
import {
  loadSettings,
  loadResults,
  loadAthletes,
  loadRegistry,
  loadGoalsData,
  loadEvents,
  loadLocations,
  loadCoach,
  saveRegistry,
  saveGoalsData,
  saveAthletes,
  saveResults,
  saveLocations,
  saveCoach,
  saveSettings,
  toISO,
} from '../../../utils/storage'
import { normaliseType, normaliseZone } from '../../../utils/config'

// The version-2 export shape. `sessions` is passed in (the live in-memory value
// from useSync()) rather than re-read from localStorage — every other table has
// no live SPA-wide state to prefer, so those still read straight from storage.
export function buildSnapshot(sessions) {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    sessions,
    settings: loadSettings(),
    results: loadResults(),
    athletes: loadAthletes(),
    exerciseRegistry: loadRegistry() || {},
    athleteGoalsData: loadGoalsData(),
    events: loadEvents(),
    locations: loadLocations(),
    coachProfile: loadCoach(),
  }
}

// A custom name wins verbatim (slugged); otherwise falls back to the gym slug
// (or a generic default) plus today's date.
export function stateFileName(customName, gymName) {
  const name = (customName || '')
    .trim()
    .replace(/[^a-zA-Z0-9À-ɏ\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (name) return `${name}.json`
  const gymSlug = (gymName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const base = gymSlug ? `grade-${gymSlug}` : 'grade-treino'
  return `${base}-${toISO(new Date())}.json`
}

// Unwraps a v2 export (or accepts a bare v1 sessions blob) and normalises every
// block's type/zone. Throws on anything that isn't a plain sessions-by-date object.
export function parseStateFile(text) {
  const parsed = JSON.parse(text)
  const incoming = parsed.version && parsed.sessions ? parsed.sessions : parsed
  if (typeof incoming !== 'object' || incoming === null || Array.isArray(incoming))
    throw new Error('Invalid format')
  const sessions = {}
  Object.keys(incoming).forEach(dateKey => {
    sessions[dateKey] = (incoming[dateKey] || []).map(session => ({
      ...session,
      blocks: (session.blocks || []).map(bl => ({
        ...bl,
        type: normaliseType(bl.type),
        zone: normaliseZone(bl.zone),
      })),
    }))
  })
  return {
    sessions,
    exerciseRegistry: parsed.exerciseRegistry,
    athleteGoalsData: parsed.athleteGoalsData,
    athletes: parsed.athletes,
    results: parsed.results,
    events: parsed.events,
    locations: parsed.locations,
    coachProfile: parsed.coachProfile,
    settings: parsed.settings,
  }
}

export function downloadSnapshot(snapshot, filename) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.download = filename
  a.href = URL.createObjectURL(blob)
  a.click()
  URL.revokeObjectURL(a.href)
}

// Writes every table a parsed file carries. Returns { needsReload } instead of
// calling window.location.reload() itself — same "the reader returns a flag, the
// caller decides" shape CLAUDE.md makes canonical for initRegistry's
// { registry, needsSave } (a settings change needs a reload because so much of
// the app reads APP_CONFIG/theme at mount, not on every render).
export function applyState(parsed, { setSessions, setEvents }) {
  setSessions(parsed.sessions)
  if (parsed.exerciseRegistry && typeof parsed.exerciseRegistry === 'object')
    saveRegistry(parsed.exerciseRegistry)
  if (parsed.athleteGoalsData && typeof parsed.athleteGoalsData === 'object')
    saveGoalsData(parsed.athleteGoalsData)
  if (parsed.athletes?.length) saveAthletes(parsed.athletes)
  if (parsed.results) saveResults(parsed.results)
  if (parsed.events && typeof parsed.events === 'object') setEvents(parsed.events)
  if (parsed.locations) saveLocations(parsed.locations)
  if (parsed.coachProfile && typeof parsed.coachProfile === 'object') saveCoach(parsed.coachProfile)
  let needsReload = false
  if (parsed.settings && typeof parsed.settings === 'object') {
    saveSettings(parsed.settings)
    needsReload = true
  }
  return { needsReload }
}
