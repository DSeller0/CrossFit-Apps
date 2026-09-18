import { describe, test, expect } from 'vitest'
import {
  normalizeSessionIds,
  SEM_BOX,
  sessionScopes,
  athleteScopes,
  matchesAthlete,
  calcBlockStats,
} from './sessions.js'

describe('normalizeSessionIds', () => {
  test('numeric id becomes a string, value preserved byte-exact', () => {
    const blob = { '2026-06-06': [{ id: 1780763563709.0518, name: 'Legacy' }] }
    const out = normalizeSessionIds(blob)
    expect(out['2026-06-06'][0].id).toBe('1780763563709.0518')
    expect(typeof out['2026-06-06'][0].id).toBe('string')
  })

  test('string id passes through untouched — no double-stringify', () => {
    const blob = { '2026-07-20': [{ id: 'mrp7h0cxieicdy0v66', name: 'New' }] }
    const out = normalizeSessionIds(blob)
    expect(out['2026-07-20'][0].id).toBe('mrp7h0cxieicdy0v66')
  })

  test('missing id gets a fresh uid()', () => {
    const blob = { '2026-07-20': [{ name: 'No id' }] }
    const out = normalizeSessionIds(blob)
    expect(typeof out['2026-07-20'][0].id).toBe('string')
    expect(out['2026-07-20'][0].id.length).toBeGreaterThan(0)
  })

  test('idempotent — running twice produces the same output', () => {
    const blob = {
      '2026-06-06': [{ id: 1780763563709.0518, name: 'Legacy' }],
      '2026-07-20': [{ name: 'No id' }],
    }
    const once = normalizeSessionIds(blob)
    const twice = normalizeSessionIds(once)
    expect(twice).toEqual(once)
  })

  test('empty blob does not throw', () => {
    expect(normalizeSessionIds({})).toEqual({})
  })

  test('null/undefined blob passes through without throwing', () => {
    expect(normalizeSessionIds(null)).toBe(null)
    expect(normalizeSessionIds(undefined)).toBe(undefined)
  })

  test('a non-array dateKey value does not throw and is left as-is', () => {
    const blob = { '2026-07-20': null, '2026-07-21': undefined, '2026-07-22': 'oops' }
    const out = normalizeSessionIds(blob)
    expect(out['2026-07-20']).toBe(null)
    expect(out['2026-07-21']).toBe(undefined)
    expect(out['2026-07-22']).toBe('oops')
  })

  test('null entries within a dateKey array do not throw and pass through', () => {
    const blob = { '2026-07-20': [null, { id: 'abc' }] }
    const out = normalizeSessionIds(blob)
    expect(out['2026-07-20'][0]).toBe(null)
    expect(out['2026-07-20'][1].id).toBe('abc')
  })

  test('a results_v2-shaped sessionId string matches its normalized session — the actual bug, pinned', () => {
    const blob = { '2026-06-06': [{ id: 1780763563709.0518, name: 'Legacy' }] }
    const out = normalizeSessionIds(blob)
    const resultSessionId = String(1780763563709.0518) // what Results.jsx/Schedule.jsx write to results_v2
    expect(out['2026-06-06'][0].id).toBe(resultSessionId)
  })
})

// #164/plans/91 — who an untargeted session reaches.
describe('sessionScopes', () => {
  test('an untagged session is the Sem box scope', () => {
    expect(sessionScopes({})).toEqual([SEM_BOX])
    expect(sessionScopes({ locationIds: [] })).toEqual([SEM_BOX])
  })

  test('a tagged session is its own boxes', () => {
    expect(sessionScopes({ locationIds: ['eagles', 'garra'] })).toEqual(['eagles', 'garra'])
  })

  test('a legacy singular locationId still counts', () => {
    expect(sessionScopes({ locationId: 'eagles' })).toEqual(['eagles'])
  })

  test('SEM_BOX cannot collide with a base36 uid', () => {
    expect(/^[0-9a-z]+$/.test(SEM_BOX)).toBe(false)
  })
})

describe('matchesAthlete', () => {
  const eagles = new Set(['eagles'])
  const noBox = new Set([SEM_BOX])

  test('a null session matches nobody', () => {
    expect(matchesAthlete(null, 'Bruna')).toBe(false)
    expect(matchesAthlete(undefined, 'Bruna', noBox)).toBe(false)
  })

  test('a named session matches its names, and only them', () => {
    expect(matchesAthlete({ mainTraining: ['Bruna'] }, 'Bruna')).toBe(true)
    expect(matchesAthlete({ mainTraining: ['Bruna'] }, 'Arthur')).toBe(false)
    // …whatever its box tags: names are a narrower, explicit audience
    expect(matchesAthlete({ mainTraining: 'Bruna', locationIds: ['eagles'] }, 'Bruna', noBox)).toBe(
      true,
    )
    expect(matchesAthlete({ mainTraining: ['Bruna'] }, 'Arthur', noBox)).toBe(false)
  })

  test('untargeted with no scopes: the caller already scoped the list, so everyone', () => {
    expect(matchesAthlete({}, 'Bruna')).toBe(true)
    expect(matchesAthlete({ mainTraining: '' }, 'Bruna')).toBe(true)
    expect(matchesAthlete({ mainTraining: [], locationIds: ['eagles'] }, 'Bruna')).toBe(true)
  })

  test('untargeted Sem box reaches the no-box audience only', () => {
    expect(matchesAthlete({ mainTraining: [] }, 'Bruna', noBox)).toBe(true)
    expect(matchesAthlete({ mainTraining: [] }, 'Bruna', eagles)).toBe(false)
  })

  test('untargeted tagged reaches its own boxes only', () => {
    const s = { mainTraining: [], locationIds: ['eagles'] }
    expect(matchesAthlete(s, 'Bruna', eagles)).toBe(true)
    expect(matchesAthlete(s, 'Bruna', noBox)).toBe(false)
    expect(matchesAthlete(s, 'Bruna', new Set(['garra']))).toBe(false)
    expect(matchesAthlete(s, 'Bruna', new Set([SEM_BOX, 'eagles']))).toBe(true)
  })

  test('untargeted and hidden is a draft — prescribed to no one', () => {
    expect(matchesAthlete({ public: false }, 'Bruna')).toBe(false)
    expect(matchesAthlete({ public: false }, 'Bruna', noBox)).toBe(false)
  })

  test('named and hidden still matches its names', () => {
    expect(matchesAthlete({ public: false, mainTraining: ['Bruna'] }, 'Bruna')).toBe(true)
    expect(matchesAthlete({ public: false, mainTraining: ['Bruna'] }, 'Bruna', eagles)).toBe(true)
  })
})

describe('athleteScopes', () => {
  const sessions = {
    '2026-09-01': [{ id: 'semBox' }, { id: 'eaglesClass', locationIds: ['eagles'] }],
    '2026-09-02': [{ id: 1780763563709.0518, locationId: 'garra' }],
  }
  const locations = [
    { id: 'eagles', type: 'box', athleteIds: ['a1'] },
    { id: 'test00', type: 'box', athleteIds: ['a1', 'a2'] },
    { id: 'pers', type: 'personal', athleteIds: ['a3'] },
  ]
  const res = (athleteId, sessionId, presence = 'Presente', date = '2026-09-01') => ({
    athleteId,
    sessionId,
    presence,
    date,
  })
  const scopesOf = (id, results = []) =>
    [...athleteScopes({ id }, { locations, results, sessions })].sort()

  test('registered only: the boxes whose roster lists them', () => {
    expect(scopesOf('a1')).toEqual(['eagles', 'test00'])
    expect(scopesOf('a2')).toEqual(['test00'])
  })

  test('a personal location is not a scope — it can never tag a session', () => {
    expect(scopesOf('a3')).toEqual([SEM_BOX])
  })

  test('trained Sem box: a Presente result on an untagged session adds SEM_BOX', () => {
    expect(scopesOf('a2', [res('a2', 'semBox')])).toEqual([SEM_BOX, 'test00'].sort())
  })

  test('trained in a box: a Presente result adds that box', () => {
    expect(scopesOf('a9', [res('a9', 'eaglesClass')])).toEqual(['eagles'])
  })

  test('ids compare as strings on both sides (#110)', () => {
    expect(scopesOf('a9', [res('a9', '1780763563709.0518', 'Presente', '2026-09-02')])).toEqual([
      'garra',
    ])
    expect([
      ...athleteScopes({ id: 7 }, { locations: [], results: [res('7', 'eaglesClass')], sessions }),
    ]).toEqual(['eagles'])
  })

  test('neither registered nor trained → {SEM_BOX}', () => {
    expect(scopesOf('nobody')).toEqual([SEM_BOX])
    expect([...athleteScopes({ id: 'x' })]).toEqual([SEM_BOX])
  })

  test('a result whose session no longer exists is ignored', () => {
    expect(scopesOf('a9', [res('a9', 'deleted')])).toEqual([SEM_BOX])
  })

  test('a non-Presente row adds nothing', () => {
    expect(scopesOf('a9', [res('a9', 'eaglesClass', 'Ausente')])).toEqual([SEM_BOX])
  })

  test("another athlete's result adds nothing", () => {
    expect(scopesOf('a2', [res('a1', 'eaglesClass')])).toEqual(['test00'])
  })
})

describe('calcBlockStats — who counts as planned', () => {
  const wod = { type: 'AMRAP' }
  const sessions = {
    '2026-09-01': [
      { id: 's1', blocks: [wod] },
      { id: 's2', locationIds: ['eagles'], blocks: [wod] },
      { id: 's3', public: false, blocks: [wod] },
    ],
  }
  const planned = opts =>
    calcBlockStats(sessions, [], 'Bruna', ['AMRAP'], '2026-09-01', '2026-09-30', opts).planned.AMRAP

  test('no options: the Sem box view (box = null), untargeted = everyone in it', () => {
    expect(planned()).toBe(1)
  })

  test('{ box }: the viewer scope narrows the list first', () => {
    expect(planned({ box: 'eagles' })).toBe(1)
    expect(planned({ box: 'garra' })).toBe(0)
  })

  test('{ scopes }: the athlete scopes replace the box filter', () => {
    expect(planned({ scopes: new Set([SEM_BOX, 'eagles']) })).toBe(2)
    expect(planned({ scopes: new Set(['eagles']) })).toBe(1)
    expect(planned({ scopes: new Set(['garra']) })).toBe(0)
  })
})
