// #76 — syncFromSupabase must NOT re-upsert results on a pull. A read that writes
// was rewriting every results_v2 row's updated_at on every SPA load, destroying it
// as a provenance signal. This locks the fix: the pull caches to localStorage only.
import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock the Supabase layer with a factory so the real supabase.js (createClient with
// possibly-undefined env) never executes. All loaders default to resolving undefined;
// the results loader is overridden per-test.
vi.mock('./supabase', () => {
  const names = [
    'dbSaveSessions', 'dbSaveAthletes', 'dbSaveResults', 'dbSaveEvents',
    'dbSaveLocations', 'dbSaveCoach', 'dbSaveSettings', 'dbSaveRegistry',
    'dbSaveGoalsData', 'dbSaveLBColors', 'dbSaveTemplates',
    'dbLoadSessions', 'dbLoadAthletes', 'dbLoadResults', 'dbLoadEvents',
    'dbLoadLocations', 'dbLoadCoach', 'dbLoadSettings', 'dbLoadRegistry',
    'dbLoadGoalsData', 'dbLoadLBColors', 'dbLoadTemplates', 'dbGetUpdatedAt',
  ]
  return Object.fromEntries(names.map(n => [n, vi.fn()]))
})

import * as db from './supabase'
import { syncFromSupabase, cacheResultsLS, saveResults, LS_RESULTS } from './storage.js'

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

beforeEach(() => {
  globalThis.localStorage = memLocalStorage()
  Object.values(db).forEach(f => f.mockReset())
})

describe('syncFromSupabase — pull never re-upserts results (#76)', () => {
  test('caches pulled results to localStorage without calling dbSaveResults', async () => {
    const pulled = [{ id: 'r1', date: '2026-06-24', athleteId: 'a1', sessionId: 's1', blocks: [] }]
    db.dbLoadResults.mockResolvedValue(pulled)

    const out = await syncFromSupabase()

    expect(db.dbSaveResults).not.toHaveBeenCalled()   // the core guarantee
    expect(out.results).toEqual(pulled)
    expect(JSON.parse(globalThis.localStorage.getItem(LS_RESULTS))).toEqual(pulled)
  })
})

describe('results cache helpers', () => {
  test('cacheResultsLS writes localStorage but never upserts', () => {
    cacheResultsLS([{ id: 'r1' }])
    expect(db.dbSaveResults).not.toHaveBeenCalled()
    expect(JSON.parse(globalThis.localStorage.getItem(LS_RESULTS))[0].id).toBe('r1')
  })

  test('saveResults still caches AND upserts (genuine writes unchanged)', () => {
    saveResults([{ id: 'r1' }])
    expect(db.dbSaveResults).toHaveBeenCalledTimes(1)
    expect(JSON.parse(globalThis.localStorage.getItem(LS_RESULTS))[0].id).toBe('r1')
  })
})
