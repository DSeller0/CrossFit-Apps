import { describe, test, expect } from 'vitest'
import { prBest, prDelta, prPct } from './goals.js'

describe('prBest', () => {
  test('null pr → null', () => expect(prBest(null)).toBe(null))
  test('undefined pr → null', () => expect(prBest(undefined)).toBe(null))
  test('empty results → null', () => expect(prBest({ results: [] })).toBe(null))
  test('type time: lowest value wins', () => {
    const pr = {
      type: 'time',
      results: [{ value: '05:30' }, { value: '04:45' }, { value: '06:00' }],
    }
    expect(prBest(pr).value).toBe('04:45')
  })
  test('type load/reps: highest value wins', () => {
    const pr = { type: 'load', results: [{ value: '80' }, { value: '100' }, { value: '90' }] }
    expect(prBest(pr).value).toBe('100')
  })
})

describe('prPct', () => {
  test('no best result → null', () => expect(prPct({ results: [] })).toBe(null))
  test('no target → null', () => {
    const pr = { type: 'load', results: [{ value: '80' }] }
    expect(prPct(pr)).toBe(null)
  })
  test('type load: percent of target', () => {
    const pr = { type: 'load', target: '100', results: [{ value: '80' }] }
    expect(prPct(pr)).toBe(80)
  })
  test('type load: caps at 100', () => {
    const pr = { type: 'load', target: '100', results: [{ value: '120' }] }
    expect(prPct(pr)).toBe(100)
  })
  test('type time: reaching target from first result → 100', () => {
    const pr = { type: 'time', target: '10:00', results: [{ value: '09:00', date: '2026-01-01' }] }
    expect(prPct(pr)).toBe(100)
  })
  test('type time: progress toward target from first result', () => {
    const pr = {
      type: 'time',
      target: '10:00',
      results: [
        { value: '20:00', date: '2026-01-01' },
        { value: '15:00', date: '2026-01-15' },
      ],
    }
    // first=20:00(1200s), target=10:00(600s), best=15:00(900s) -> (1200-900)/(1200-600)*100 = 50
    expect(prPct(pr)).toBe(50)
  })
})

describe('prDelta', () => {
  test('fewer than 2 results → null', () =>
    expect(prDelta({ results: [{ value: '80' }] })).toBe(null))
  test('type load: improvement', () => {
    const pr = {
      type: 'load',
      results: [
        { value: '80', date: '2026-01-01' },
        { value: '90', date: '2026-01-15' },
      ],
    }
    expect(prDelta(pr)).toEqual({ label: '+10 kg', good: true })
  })
  test('type load: no change', () => {
    const pr = {
      type: 'load',
      results: [
        { value: '80', date: '2026-01-01' },
        { value: '80', date: '2026-01-15' },
      ],
    }
    expect(prDelta(pr)).toEqual({ label: '=', good: null })
  })
  test('type time: faster is good', () => {
    const pr = {
      type: 'time',
      results: [
        { value: '10:00', date: '2026-01-01' },
        { value: '09:00', date: '2026-01-15' },
      ],
    }
    expect(prDelta(pr)).toEqual({ label: '-01:00', good: true })
  })
  test('type time: slower is bad', () => {
    const pr = {
      type: 'time',
      results: [
        { value: '09:00', date: '2026-01-01' },
        { value: '10:00', date: '2026-01-15' },
      ],
    }
    expect(prDelta(pr)).toEqual({ label: '+01:00', good: false })
  })
})
