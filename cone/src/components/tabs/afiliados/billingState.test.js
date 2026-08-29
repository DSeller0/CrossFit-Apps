import { describe, it, expect } from 'vitest'
import {
  periodKey,
  periodBounds,
  periodLabel,
  stampFor,
  allStamps,
  setStamp,
  singleTotal,
  advance,
  columnOf,
} from './billingState.js'

describe('periodKey', () => {
  it('derives YYYY-MM from an ISO date string', () => {
    expect(periodKey('2026-08-15')).toBe('2026-08')
  })

  it('derives YYYY-MM from a Date object', () => {
    expect(periodKey(new Date(2026, 0, 5))).toBe('2026-01')
  })
})

describe('periodBounds', () => {
  it('returns the first/last ISO day of the month', () => {
    expect(periodBounds('2026-08')).toEqual({ from: '2026-08-01', to: '2026-08-31' })
  })

  it('handles a 30-day month', () => {
    expect(periodBounds('2026-04')).toEqual({ from: '2026-04-01', to: '2026-04-30' })
  })

  it('handles February in a leap year', () => {
    expect(periodBounds('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })
})

describe('periodLabel', () => {
  it('renders the pt-BR month name + year', () => {
    expect(periodLabel('2026-08')).toBe('Agosto 2026')
  })
})

describe('stampFor', () => {
  it('returns the stamp when it exists', () => {
    const billing = { l1: { '2026-08': { status: 'draft' } } }
    expect(stampFor(billing, 'l1', '2026-08')).toEqual({ status: 'draft' })
  })

  it('returns null when the affiliate has no billing at all', () => {
    expect(stampFor({}, 'l1', '2026-08')).toBeNull()
  })

  it('returns null when the affiliate exists but not this period', () => {
    const billing = { l1: { '2026-07': { status: 'paid' } } }
    expect(stampFor(billing, 'l1', '2026-08')).toBeNull()
  })

  it('returns null for a missing/undefined billing blob', () => {
    expect(stampFor(undefined, 'l1', '2026-08')).toBeNull()
  })
})

describe('allStamps', () => {
  it('flattens every (affiliate, period) stamp', () => {
    const billing = {
      l1: { '2026-07': { status: 'paid' }, '2026-08': { status: 'sent' } },
      l2: { '2026-08': { status: 'draft' } },
    }
    const flat = allStamps(billing)
    expect(flat).toHaveLength(3)
    expect(flat).toContainEqual({ affiliateId: 'l1', period: '2026-07', stamp: { status: 'paid' } })
    expect(flat).toContainEqual({ affiliateId: 'l1', period: '2026-08', stamp: { status: 'sent' } })
    expect(flat).toContainEqual({
      affiliateId: 'l2',
      period: '2026-08',
      stamp: { status: 'draft' },
    })
  })

  it('returns an empty array for an empty/missing blob', () => {
    expect(allStamps(undefined)).toEqual([])
    expect(allStamps({})).toEqual([])
  })
})

describe('setStamp', () => {
  it('writes a new affiliate + period immutably', () => {
    const billing = {}
    const next = setStamp(billing, 'l1', '2026-08', { status: 'draft' })
    expect(next).toEqual({ l1: { '2026-08': { status: 'draft' } } })
    expect(billing).toEqual({}) // original untouched
  })

  it('preserves sibling periods on the same affiliate', () => {
    const billing = { l1: { '2026-07': { status: 'paid' } } }
    const next = setStamp(billing, 'l1', '2026-08', { status: 'draft' })
    expect(next.l1).toEqual({ '2026-07': { status: 'paid' }, '2026-08': { status: 'draft' } })
  })

  it('preserves sibling affiliates', () => {
    const billing = { l2: { '2026-08': { status: 'sent' } } }
    const next = setStamp(billing, 'l1', '2026-08', { status: 'draft' })
    expect(next.l2).toEqual({ '2026-08': { status: 'sent' } })
  })
})

describe('singleTotal', () => {
  it('returns the one currency pair', () => {
    expect(singleTotal({ totals: { R$: 150 }, currencies: ['R$'] })).toEqual({
      total: 150,
      currency: 'R$',
    })
  })

  it('returns null for a mixed-currency result', () => {
    expect(singleTotal({ totals: { R$: 100, US$: 20 }, currencies: ['R$', 'US$'] })).toBeNull()
  })

  it('returns null for an empty result (no rate)', () => {
    expect(singleTotal({ totals: {}, currencies: [] })).toBeNull()
  })

  it('returns null for a falsy input', () => {
    expect(singleTotal(null)).toBeNull()
  })
})

describe('advance', () => {
  const NOW = '2026-08-29T10:00:00.000Z'

  it('creates a bare draft stamp regardless of any prior stamp', () => {
    expect(advance(null, 'draft', null, NOW)).toEqual({ status: 'draft' })
  })

  it('freezes total + currency when moving to sent', () => {
    const stamp = { status: 'draft' }
    const next = advance(stamp, 'sent', { total: 1480, currency: 'R$' }, NOW)
    expect(next).toEqual({ status: 'sent', sentAt: NOW, total: 1480, currency: 'R$' })
  })

  it('refuses to move to sent without a resolvable single-currency total', () => {
    const stamp = { status: 'draft' }
    expect(advance(stamp, 'sent', null, NOW)).toBe(stamp)
  })

  it('moving to paid keeps the frozen total untouched and stamps paidAt', () => {
    const stamp = {
      status: 'sent',
      sentAt: '2026-08-20T00:00:00.000Z',
      total: 1480,
      currency: 'R$',
    }
    const next = advance(stamp, 'paid', null, NOW)
    expect(next).toEqual({
      status: 'paid',
      sentAt: '2026-08-20T00:00:00.000Z',
      total: 1480,
      currency: 'R$',
      paidAt: NOW,
    })
  })

  it('refuses to move to paid with no existing stamp', () => {
    expect(advance(null, 'paid', null, NOW)).toBeNull()
  })

  it('🔴 the freeze: a later re-advance to sent with a DIFFERENT computed total still only reflects what was passed — the caller controls when recomputation happens, not this function', () => {
    const draft = { status: 'draft' }
    const sentOnce = advance(draft, 'sent', { total: 1480, currency: 'R$' }, NOW)
    // Simulate the caller recomputing from live events after a past edit and
    // calling advance('sent', …) again — advance itself will re-freeze to
    // whatever it's given; it is the CALLER's job (InvoiceCard/InvoiceDetail)
    // never to call this a second time once a stamp is already 'sent'/'paid'.
    // This test pins that advance is a pure reducer with no built-in guard
    // against being called twice — the freeze is enforced by callers reading
    // the stamp instead of live events once status !== 'draft'.
    const recomputed = advance(sentOnce, 'sent', { total: 999, currency: 'R$' }, NOW)
    expect(recomputed.total).toBe(999)
  })
})

describe('columnOf', () => {
  const loc = { id: 'l1', type: 'box' }
  const events = {
    '2026-08-05': [{ type: 'aula', locationId: 'l1', time: '18:00', status: 'completed' }],
  }

  it('is the stamp status when a stamp exists', () => {
    const billing = { l1: { '2026-08': { status: 'sent' } } }
    expect(columnOf(loc, '2026-08', billing, events)).toBe('sent')
  })

  it('is "open" when there are events but no stamp', () => {
    expect(columnOf(loc, '2026-08', {}, events)).toBe('open')
  })

  it('is null when there is neither a stamp nor any events', () => {
    expect(columnOf(loc, '2026-08', {}, {})).toBeNull()
  })

  it('ignores events outside the period', () => {
    expect(columnOf(loc, '2026-07', {}, events)).toBeNull()
  })
})
