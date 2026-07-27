// #76/#111 — syncFromSupabase must NOT write back to Supabase anything it just
// pulled. #76 fixed this for results_v2 only; #111 is the same disease at full
// scale: the pull used to call every table's normal save* (which always
// composes with dbSave*), re-upserting all 9 remaining blobs on every
// authenticated SPA mount. Worse than wasteful — on a device whose localStorage
// was stale (or empty), the mount-time auto-save effects in SyncContext.jsx
// then wrote that stale/empty state straight back over the server, which is
// how a session created on another device between visits got silently deleted
// (found live 2026-07-27, filed as the reason #111 was picked up).
import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock the Supabase layer with a factory so the real supabase.js (createClient with
// possibly-undefined env) never executes. All loaders default to resolving undefined;
// individual tests override what they need.
vi.mock('./supabase', () => {
  const names = [
    'dbSaveSessions', 'dbSaveAthletes', 'dbSaveResults', 'dbSaveEvents',
    'dbSaveLocations', 'dbSaveCoach', 'dbSaveSettings', 'dbSaveRegistry',
    'dbSaveGoalsData', 'dbSaveTemplates',
    'dbLoadSessions', 'dbLoadAthletes', 'dbLoadResults', 'dbLoadEvents',
    'dbLoadLocations', 'dbLoadCoach', 'dbLoadSettings', 'dbLoadRegistry',
    'dbLoadGoalsData', 'dbLoadTemplates', 'dbGetUpdatedAt',
  ]
  return Object.fromEntries(names.map(n => [n, vi.fn()]))
})

import * as db from './supabase'
import {
  syncFromSupabase, getSessionsTs,
  cacheResultsLS, saveResults, LS_RESULTS,
  cacheSessionsLS, saveLS, LS_KEY,
  cacheAthletesLS, saveAthletes, LS_ATHLETES,
  cacheEventsLS, saveEvents, LS_EVENTS,
  cacheLocationsLS, saveLocations, LS_LOCATIONS,
  cacheCoachLS, saveCoach, LS_COACH,
  cacheSettingsLS, saveSettings, LS_SETTINGS,
  cacheRegistryLS, saveRegistry, LS_REGISTRY,
  cacheGoalsDataLS, saveGoalsData, LS_GOALS,
  cacheTemplatesLS, saveTemplates, LS_TEMPLATES,
} from './storage.js'

// Minimal in-memory localStorage — the test env is 'node' (no jsdom), and we don't
// want to add a DOM dependency just for this.
function memLocalStorage() {
  const store = new Map()
  return {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: k => { store.delete(k) },
    clear: () => store.clear(),
  }
}

const ALL_DB_SAVE_NAMES = [
  'dbSaveSessions', 'dbSaveAthletes', 'dbSaveResults', 'dbSaveEvents',
  'dbSaveLocations', 'dbSaveCoach', 'dbSaveSettings', 'dbSaveRegistry',
  'dbSaveGoalsData', 'dbSaveTemplates',
]
const expectNoDbSaveCalls = () => {
  ALL_DB_SAVE_NAMES.forEach(name => expect(db[name]).not.toHaveBeenCalled())
}

beforeEach(() => {
  globalThis.localStorage = memLocalStorage()
  Object.values(db).forEach(f => f.mockReset())
})

describe('syncFromSupabase — pull never re-upserts anything it read (#76, #111)', () => {
  test('a full payload across all tables caches to localStorage and calls zero dbSave*', async () => {
    db.dbLoadSessions.mockResolvedValue({ '2026-07-27': [{ id: 's1', blocks: [] }] })
    db.dbLoadAthletes.mockResolvedValue([{ id: 'a1' }])
    db.dbLoadResults.mockResolvedValue([{ id: 'r1', date: '2026-06-24', athleteId: 'a1', sessionId: 's1', blocks: [] }])
    db.dbLoadEvents.mockResolvedValue({ '2026-07-27': [{ id: 'e1' }] })
    db.dbLoadLocations.mockResolvedValue([{ id: 'l1' }])
    db.dbLoadCoach.mockResolvedValue({ name: 'Coach' })
    db.dbLoadSettings.mockResolvedValue({ gymName: 'Box' })
    db.dbLoadRegistry.mockResolvedValue({ WOD: [] })
    db.dbLoadGoalsData.mockResolvedValue({ athleteGoals: {}, prs: {} })
    db.dbLoadTemplates.mockResolvedValue([{ id: 't1' }])
    db.dbGetUpdatedAt.mockResolvedValue('2026-07-27T10:00:00.000Z')

    const out = await syncFromSupabase()

    expectNoDbSaveCalls()

    expect(out.sessions['2026-07-27'][0].id).toBe('s1')
    expect(JSON.parse(globalThis.localStorage.getItem(LS_KEY))['2026-07-27'][0].id).toBe('s1')
    expect(JSON.parse(globalThis.localStorage.getItem(LS_ATHLETES))).toEqual([{ id: 'a1' }])
    expect(JSON.parse(globalThis.localStorage.getItem(LS_RESULTS))[0].id).toBe('r1')
    expect(JSON.parse(globalThis.localStorage.getItem(LS_EVENTS))['2026-07-27'][0].id).toBe('e1')
    expect(JSON.parse(globalThis.localStorage.getItem(LS_LOCATIONS))).toEqual([{ id: 'l1' }])
    expect(JSON.parse(globalThis.localStorage.getItem(LS_COACH))).toEqual({ name: 'Coach' })
    expect(JSON.parse(globalThis.localStorage.getItem(LS_SETTINGS))).toEqual({ gymName: 'Box' })
    expect(JSON.parse(globalThis.localStorage.getItem(LS_REGISTRY))).toEqual({ WOD: [] })
    expect(JSON.parse(globalThis.localStorage.getItem(LS_GOALS))).toEqual({ athleteGoals: {}, prs: {} })
    expect(JSON.parse(globalThis.localStorage.getItem(LS_TEMPLATES))).toEqual([{ id: 't1' }])

    // _sessionsTs comes straight from the real remote updated_at, not a provisional stamp.
    expect(getSessionsTs()).toBe('2026-07-27T10:00:00.000Z')
  })

  test('malformed/null payloads are skipped cleanly — no dbSave*, no throw', async () => {
    db.dbLoadSessions.mockResolvedValue(null)
    db.dbLoadAthletes.mockResolvedValue(null)
    db.dbLoadResults.mockResolvedValue(null)
    db.dbLoadEvents.mockResolvedValue(undefined)
    db.dbLoadLocations.mockResolvedValue(null)
    db.dbLoadCoach.mockResolvedValue(null)
    db.dbLoadSettings.mockResolvedValue(null)
    db.dbLoadRegistry.mockResolvedValue(null)
    db.dbLoadGoalsData.mockResolvedValue(null)
    db.dbLoadTemplates.mockResolvedValue(null)
    db.dbGetUpdatedAt.mockResolvedValue(null)

    const out = await syncFromSupabase()

    expectNoDbSaveCalls()
    expect(out).toEqual({})
    expect(globalThis.localStorage.getItem(LS_KEY)).toBeNull()
  })

  test('caches pulled results to localStorage without calling dbSaveResults (#76, still covered)', async () => {
    const pulled = [{ id: 'r1', date: '2026-06-24', athleteId: 'a1', sessionId: 's1', blocks: [] }]
    db.dbLoadResults.mockResolvedValue(pulled)

    const out = await syncFromSupabase()

    expect(db.dbSaveResults).not.toHaveBeenCalled()
    expect(out.results).toEqual(pulled)
    expect(JSON.parse(globalThis.localStorage.getItem(LS_RESULTS))).toEqual(pulled)
  })
})

describe('cache-only writers — localStorage only, never dbSave* (#111)', () => {
  test.each([
    ['cacheSessionsLS', cacheSessionsLS, LS_KEY, { '2026-07-27': [{ id: 's1' }] }, 'dbSaveSessions'],
    ['cacheAthletesLS', cacheAthletesLS, LS_ATHLETES, [{ id: 'a1' }], 'dbSaveAthletes'],
    ['cacheResultsLS', cacheResultsLS, LS_RESULTS, [{ id: 'r1' }], 'dbSaveResults'],
    ['cacheEventsLS', cacheEventsLS, LS_EVENTS, { '2026-07-27': [{ id: 'e1' }] }, 'dbSaveEvents'],
    ['cacheLocationsLS', cacheLocationsLS, LS_LOCATIONS, [{ id: 'l1' }], 'dbSaveLocations'],
    ['cacheCoachLS', cacheCoachLS, LS_COACH, { name: 'Coach' }, 'dbSaveCoach'],
    ['cacheSettingsLS', cacheSettingsLS, LS_SETTINGS, { gymName: 'Box' }, 'dbSaveSettings'],
    ['cacheRegistryLS', cacheRegistryLS, LS_REGISTRY, { WOD: [] }, 'dbSaveRegistry'],
    ['cacheGoalsDataLS', cacheGoalsDataLS, LS_GOALS, { athleteGoals: {}, prs: {} }, 'dbSaveGoalsData'],
    ['cacheTemplatesLS', cacheTemplatesLS, LS_TEMPLATES, [{ id: 't1' }], 'dbSaveTemplates'],
  ])('%s writes localStorage but never calls %s', (_name, cacheFn, key, data, dbSaveName) => {
    cacheFn(data)
    expect(db[dbSaveName]).not.toHaveBeenCalled()
    expect(JSON.parse(globalThis.localStorage.getItem(key))).toEqual(data)
  })
})

describe('save* — genuine writes are unchanged: cache AND upsert', () => {
  test.each([
    ['saveLS', saveLS, LS_KEY, { '2026-07-27': [{ id: 's1' }] }, 'dbSaveSessions'],
    ['saveAthletes', saveAthletes, LS_ATHLETES, [{ id: 'a1' }], 'dbSaveAthletes'],
    ['saveResults', saveResults, LS_RESULTS, [{ id: 'r1' }], 'dbSaveResults'],
    ['saveEvents', saveEvents, LS_EVENTS, { '2026-07-27': [{ id: 'e1' }] }, 'dbSaveEvents'],
    ['saveLocations', saveLocations, LS_LOCATIONS, [{ id: 'l1' }], 'dbSaveLocations'],
    ['saveCoach', saveCoach, LS_COACH, { name: 'Coach' }, 'dbSaveCoach'],
    ['saveSettings', saveSettings, LS_SETTINGS, { gymName: 'Box' }, 'dbSaveSettings'],
    ['saveRegistry', saveRegistry, LS_REGISTRY, { WOD: [] }, 'dbSaveRegistry'],
    ['saveGoalsData', saveGoalsData, LS_GOALS, { athleteGoals: {}, prs: {} }, 'dbSaveGoalsData'],
    ['saveTemplates', saveTemplates, LS_TEMPLATES, [{ id: 't1' }], 'dbSaveTemplates'],
  ])('%s still caches AND calls %s exactly once', (_name, saveFn, key, data, dbSaveName) => {
    saveFn(data)
    expect(db[dbSaveName]).toHaveBeenCalledTimes(1)
    expect(JSON.parse(globalThis.localStorage.getItem(key))).toEqual(data)
  })
})
