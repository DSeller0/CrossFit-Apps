import { describe, test, expect } from 'vitest'
import { normalizeSessionIds } from './sessions.js'

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
