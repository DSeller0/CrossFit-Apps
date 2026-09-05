import { describe, it, expect } from 'vitest'
import {
  fmtDateNum,
  fmtDur,
  fmtMoney,
  calcTotal,
  sumByCurrency,
  rateAsOf,
  effectiveRateSource,
} from './billing.js'

// #149/#104(c) · plans/71 — calcTotal is the only money arithmetic in the app and had zero
// tests before this row, including the two behavior changes plans/68 shipped unpinned on
// 2026-08-05 (#104a's fractional-hour billing, #104b's per-currency subtotals). These tests
// pin what the code already does, not what it should do — see the plan for the two edges
// flagged as "arguably wrong, not changed here."

describe('fmtDateNum', () => {
  it('renders an ISO date as dd/mm/yy', () => {
    expect(fmtDateNum('2026-08-06')).toBe('06/08/26')
  })
})

describe('fmtMoney', () => {
  it('renders a currency + amount with two decimal places', () => {
    expect(fmtMoney(150, 'R$')).toBe('R$ 150,00')
  })
})

describe('fmtDur', () => {
  it('renders under an hour as plain minutes', () => {
    expect(fmtDur(45)).toBe('45min')
  })

  it('renders exactly an hour with no minutes suffix', () => {
    expect(fmtDur(60)).toBe('1h')
  })

  it('renders over an hour with both parts', () => {
    expect(fmtDur(90)).toBe('1h30min')
  })

  it('renders zero as plain minutes', () => {
    expect(fmtDur(0)).toBe('0min')
  })
})

const loc = (rate, rateUnit = 'per_session', currency = 'R$') => ({ rate, rateUnit, currency })
const ev = (durationMin, extra = {}) => ({ durationMin, ...extra })

describe('calcTotal', () => {
  it('bills a per_hour location for fractional hours (#104a)', () => {
    const t = calcTotal([ev(90)], loc(100, 'per_hour'))
    expect(t.totals['R$']).toBe(150) // 1.5h × 100
  })

  it('clamps a per_hour event under an hour to a one-hour minimum', () => {
    const t = calcTotal([ev(30)], loc(100, 'per_hour'))
    expect(t.totals['R$']).toBe(100)
  })

  it('treats a zero durationMin as the 60-minute default', () => {
    const t = calcTotal([ev(0)], loc(100, 'per_hour'))
    expect(t.totals['R$']).toBe(100)
  })

  it('treats a missing durationMin as the 60-minute default', () => {
    const t = calcTotal([ev(undefined)], loc(100, 'per_hour'))
    expect(t.totals['R$']).toBe(100)
  })

  it('ignores durationMin entirely for a per_session location', () => {
    const t = calcTotal([ev(180), ev(15)], loc(50, 'per_session'))
    expect(t.totals['R$']).toBe(100) // 2 × 50, not duration-weighted
  })

  it('yields no total row for a rate of zero — pinned, not changed here', () => {
    const t = calcTotal([ev(60)], loc(0, 'per_session'))
    expect(t.currencies).toEqual([])
    expect(t.totals).toEqual({})
  })

  it('yields no total row when there is no location at all', () => {
    const t = calcTotal([ev(60)], null)
    expect(t.currencies).toEqual([])
  })

  it("prefers an event's own rateSnapshot over the location's current rate (#104c)", () => {
    const t = calcTotal(
      [ev(60, { rateSnapshot: { rate: 40, rateUnit: 'per_session', currency: 'R$' } })],
      loc(999, 'per_session'),
    )
    expect(t.totals['R$']).toBe(40)
  })

  it('falls back to the live location rate for an event booked before snapshots existed', () => {
    const t = calcTotal([ev(60)], loc(60, 'per_session'))
    expect(t.totals['R$']).toBe(60)
  })

  it('buckets a mixed-snapshot group into separate currencies', () => {
    const t = calcTotal(
      [
        ev(60, { rateSnapshot: { rate: 40, rateUnit: 'per_session', currency: 'R$' } }),
        ev(60, { rateSnapshot: { rate: 20, rateUnit: 'per_session', currency: 'US$' } }),
      ],
      loc(999, 'per_session'),
    )
    expect(t.totals).toEqual({ R$: 40, US$: 20 })
    expect(t.currencies.sort()).toEqual(['R$', 'US$'])
  })
})

describe('rateAsOf', () => {
  const hist = [
    { rate: 40, rateUnit: 'per_session', currency: 'R$', from: '1970-01-01' },
    { rate: 50, rateUnit: 'per_session', currency: 'R$', from: '2026-06-01' },
    { rate: 60, rateUnit: 'per_session', currency: 'R$', from: '2026-08-01' },
  ]

  it('returns null for a location with no rate history', () => {
    expect(rateAsOf(loc(50), '2026-08-06')).toBeNull()
  })

  it('returns null for a null location', () => {
    expect(rateAsOf(null, '2026-08-06')).toBeNull()
  })

  it('returns null when no date is given', () => {
    expect(rateAsOf({ rateHistory: hist }, undefined)).toBeNull()
  })

  it('returns the version in effect on a date between two changes', () => {
    expect(rateAsOf({ rateHistory: hist }, '2026-07-01').rate).toBe(50)
  })

  it('returns the version whose `from` exactly matches the date', () => {
    expect(rateAsOf({ rateHistory: hist }, '2026-08-01').rate).toBe(60)
  })

  it('returns the latest version for a date after every change', () => {
    expect(rateAsOf({ rateHistory: hist }, '2099-01-01').rate).toBe(60)
  })

  it('returns null for a date before every recorded version', () => {
    const noSentinel = hist.slice(1)
    expect(rateAsOf({ rateHistory: noSentinel }, '2026-01-01')).toBeNull()
  })

  it('resolves a same-day double-edit to whichever was appended last', () => {
    const sameDay = [
      { rate: 40, rateUnit: 'per_session', currency: 'R$', from: '2026-08-01' },
      { rate: 45, rateUnit: 'per_session', currency: 'R$', from: '2026-08-01' },
    ]
    expect(rateAsOf({ rateHistory: sameDay }, '2026-08-01').rate).toBe(45)
  })
})

describe('effectiveRateSource', () => {
  it('is the exact function calcTotal uses internally — a caller can rely on it agreeing', () => {
    const hist = [{ rate: 40, rateUnit: 'per_session', currency: 'R$', from: '1970-01-01' }]
    const loc999 = { rate: 999, rateUnit: 'per_session', currency: 'R$', rateHistory: hist }
    const e = ev(60, { date: '2026-01-01' })
    expect(effectiveRateSource(e, loc999)).toEqual(hist[0])
    expect(calcTotal([e], loc999).totals['R$']).toBe(40)
  })

  it("returns the location itself when nothing else resolves — the caller's own falsy-rate check must read THIS, not loc.rate", () => {
    // The location's CURRENT rate is 0 (deactivated), but a real historical rate covers
    // the event's date — effectiveRateSource must resolve to the historical entry, not
    // fall through to the (falsy) current loc, so a per-event "do we have a price"
    // check based on THIS return value doesn't disagree with calcTotal's own total.
    const loc = {
      rate: 0,
      rateHistory: [{ rate: 200, rateUnit: 'per_hour', currency: 'R$', from: '2026-01-01' }],
    }
    const e = ev(60, { date: '2026-06-01' })
    expect(effectiveRateSource(e, loc).rate).toBe(200)
  })
})

describe('calcTotal with rate history (#154)', () => {
  const loc999 = { rate: 999, rateUnit: 'per_session', currency: 'R$' }
  const hist = [
    { rate: 40, rateUnit: 'per_session', currency: 'R$', from: '1970-01-01' },
    { rate: 60, rateUnit: 'per_session', currency: 'R$', from: '2026-08-01' },
  ]

  it("prices an event by the location's rate AS OF the event's own date", () => {
    const t = calcTotal([ev(60, { date: '2026-07-15' })], { ...loc999, rateHistory: hist })
    expect(t.totals['R$']).toBe(40)
  })

  it('a rate change does not retroactively re-price a past undated-snapshot event', () => {
    const t = calcTotal(
      [ev(60, { date: '2026-01-01' })],
      { ...loc999, rateHistory: hist.slice(1) }, // no version covers this early a date
    )
    // Falls back to the location's CURRENT rate — same as pre-#154 behavior, since
    // there is no recorded history reaching back that far.
    expect(t.totals['R$']).toBe(999)
  })

  it('a still-live rateSnapshot beats rate history entirely (#104c precedence)', () => {
    const t = calcTotal(
      [
        ev(60, {
          date: '2026-08-15',
          rateSnapshot: { rate: 10, rateUnit: 'per_session', currency: 'R$' },
        }),
      ],
      { ...loc999, rateHistory: hist },
    )
    expect(t.totals['R$']).toBe(10)
  })
})

describe('sumByCurrency', () => {
  it('sums a single currency across entries', () => {
    const s = sumByCurrency([
      { total: 100, currency: 'R$' },
      { total: 50, currency: 'R$' },
    ])
    expect(s.totals).toEqual({ R$: 150 })
    expect(s.currencies).toEqual(['R$'])
    expect(s.label).toBe('R$ 150')
  })

  it('sums two currencies into one label instead of adding unlike units', () => {
    const s = sumByCurrency([
      { total: 100, currency: 'R$' },
      { total: 20, currency: 'US$' },
    ])
    expect(s.totals).toEqual({ R$: 100, US$: 20 })
    expect(s.label).toBe('R$ 100 + US$ 20')
  })

  it("keeps 'R$' and 'R$ ' as distinct buckets — currency is free text with no trimming", () => {
    const s = sumByCurrency([
      { total: 10, currency: 'R$' },
      { total: 10, currency: 'R$ ' },
    ])
    expect(s.totals).toEqual({ R$: 10, 'R$ ': 10 })
    expect(s.currencies.length).toBe(2)
  })

  it('skips falsy entries', () => {
    const s = sumByCurrency([null, { total: 10, currency: 'R$' }, undefined])
    expect(s.totals).toEqual({ R$: 10 })
  })

  it('returns an empty result for an empty set', () => {
    const s = sumByCurrency([])
    expect(s.totals).toEqual({})
    expect(s.currencies).toEqual([])
    expect(s.label).toBe('')
  })
})
