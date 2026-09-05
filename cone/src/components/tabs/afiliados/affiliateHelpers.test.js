import { describe, it, expect } from 'vitest'
import {
  typeLabel,
  rateLabel,
  toCentavos,
  centavosDisplay,
  digitsToCentavos,
  boxLink,
  monthBounds,
  eventsForAffiliate,
  resolveEventLoc,
  appendRateVersion,
} from './affiliateHelpers.js'

// affiliateHelpers imports only public/lib/week.js (also client-free), so no
// utils/supabase mock is needed.

describe('typeLabel', () => {
  it('names both affiliate kinds', () => {
    expect(typeLabel('box')).toBe('Aula / Box')
    expect(typeLabel('personal')).toBe('Personal')
  })
  it('treats anything unrecognised as personal, matching the old ternary', () => {
    expect(typeLabel(undefined)).toBe('Personal')
  })
})

describe('rateLabel', () => {
  it('renders per-session and per-hour', () => {
    expect(rateLabel({ rate: 120, rateUnit: 'per_session', currency: 'R$' })).toBe('R$ 120/sessão')
    expect(rateLabel({ rate: 40, rateUnit: 'per_hour', currency: 'R$' })).toBe('R$ 40/hora')
  })
  it('defaults the currency to R$', () => {
    expect(rateLabel({ rate: 40, rateUnit: 'per_hour' })).toBe('R$ 40/hora')
  })
  it('states the absence rather than printing a zero rate', () => {
    expect(rateLabel({ rate: 0 })).toBe('Sem taxa configurada')
    expect(rateLabel({})).toBe('Sem taxa configurada')
    expect(rateLabel(undefined)).toBe('Sem taxa configurada')
  })
  it('with an isoDate (#154), reads the version in effect on that date', () => {
    const loc = {
      rate: 60,
      rateUnit: 'per_session',
      currency: 'R$',
      rateHistory: [
        { rate: 40, rateUnit: 'per_session', currency: 'R$', from: '1970-01-01' },
        { rate: 60, rateUnit: 'per_session', currency: 'R$', from: '2026-08-01' },
      ],
    }
    expect(rateLabel(loc, '2026-01-01')).toBe('R$ 40/sessão')
    expect(rateLabel(loc, '2026-09-01')).toBe('R$ 60/sessão')
  })
  it('with no isoDate, ignores history and reads the current head', () => {
    const loc = {
      rate: 60,
      rateUnit: 'per_session',
      currency: 'R$',
      rateHistory: [{ rate: 40, rateUnit: 'per_session', currency: 'R$', from: '1970-01-01' }],
    }
    expect(rateLabel(loc)).toBe('R$ 60/sessão')
  })
})

describe('appendRateVersion', () => {
  const loc = { rate: 40, rateUnit: 'per_session', currency: 'R$' }

  it('returns undefined history unchanged when the rate did not change', () => {
    expect(
      appendRateVersion(loc, { rate: 40, rateUnit: 'per_session', currency: 'R$' }, '2026-08-06'),
    ).toBe(undefined)
  })

  it('backfills the OLD rate at the epoch on the first versioned edit', () => {
    const hist = appendRateVersion(
      loc,
      { rate: 50, rateUnit: 'per_session', currency: 'R$' },
      '2026-08-06',
    )
    expect(hist).toEqual([
      { rate: 40, rateUnit: 'per_session', currency: 'R$', from: '1970-01-01' },
      { rate: 50, rateUnit: 'per_session', currency: 'R$', from: '2026-08-06' },
    ])
  })

  it('appends without re-backfilling once history already exists', () => {
    const withHist = { ...loc, rateHistory: [{ ...loc, from: '1970-01-01' }] }
    const hist = appendRateVersion(
      withHist,
      { rate: 70, rateUnit: 'per_session', currency: 'R$' },
      '2026-09-01',
    )
    expect(hist).toEqual([
      { rate: 40, rateUnit: 'per_session', currency: 'R$', from: '1970-01-01' },
      { rate: 70, rateUnit: 'per_session', currency: 'R$', from: '2026-09-01' },
    ])
  })

  it('does not append when only rateUnit/currency changed to the same values', () => {
    expect(
      appendRateVersion(loc, { rate: 40, rateUnit: 'per_session', currency: 'R$' }, '2026-08-06'),
    ).toBe(undefined)
  })

  it('does not mint a spurious version on a legacy location missing rateUnit/currency', () => {
    // Pre-#154 data can have `rate` with no `rateUnit`/`currency` ever stored.
    // `startEdit` always defaults the FORM to 'per_session'/'R$' — comparing that
    // against the location's raw (undefined) fields must not read as "changed".
    const legacy = { rate: 40 }
    expect(
      appendRateVersion(
        legacy,
        { rate: 40, rateUnit: 'per_session', currency: 'R$' },
        '2026-08-06',
      ),
    ).toBe(undefined)
  })

  it('still detects a real change on a legacy location missing rateUnit/currency', () => {
    const legacy = { rate: 40 }
    const hist = appendRateVersion(
      legacy,
      { rate: 60, rateUnit: 'per_session', currency: 'R$' },
      '2026-08-06',
    )
    expect(hist).toEqual([
      { rate: 40, rateUnit: 'per_session', currency: 'R$', from: '1970-01-01' },
      { rate: 60, rateUnit: 'per_session', currency: 'R$', from: '2026-08-06' },
    ])
  })

  it('appends on a rateUnit-only change even when the number stayed the same', () => {
    const hist = appendRateVersion(
      loc,
      { rate: 40, rateUnit: 'per_hour', currency: 'R$' },
      '2026-08-06',
    )
    expect(hist).toHaveLength(2)
    expect(hist[1]).toEqual({ rate: 40, rateUnit: 'per_hour', currency: 'R$', from: '2026-08-06' })
  })

  it('treats a location that never had a rate as rate 0 for comparison', () => {
    const hist = appendRateVersion(
      {},
      { rate: 30, rateUnit: 'per_session', currency: 'R$' },
      '2026-08-06',
    )
    expect(hist).toEqual([
      { rate: 0, rateUnit: 'per_session', currency: 'R$', from: '1970-01-01' },
      { rate: 30, rateUnit: 'per_session', currency: 'R$', from: '2026-08-06' },
    ])
  })
})

describe('centavos round trip', () => {
  it('converts reais to centavos without float drift', () => {
    expect(toCentavos(40)).toBe(4000)
    expect(toCentavos(0.07)).toBe(7)
    expect(toCentavos(1234.56)).toBe(123456)
  })
  it('treats a blank or non-numeric value as zero', () => {
    expect(toCentavos('')).toBe(0)
    expect(toCentavos(undefined)).toBe(0)
    expect(toCentavos('abc')).toBe(0)
  })
  it('renders centavos in pt-BR with two decimals', () => {
    expect(centavosDisplay(4000)).toBe('R$ 40,00')
    expect(centavosDisplay(7)).toBe('R$ 0,07')
    expect(centavosDisplay(123456)).toBe('R$ 1.234,56')
  })
  it('renders zero as empty, so an unset rate shows its placeholder', () => {
    expect(centavosDisplay(0)).toBe('')
    expect(centavosDisplay(undefined)).toBe('')
  })
  it('fills digits from the right', () => {
    expect(digitsToCentavos('4')).toBe(4)
    expect(digitsToCentavos('40')).toBe(40)
    expect(digitsToCentavos('4000')).toBe(4000)
    expect(digitsToCentavos('R$ 40,00')).toBe(4000)
  })
  it('caps at 8 digits so a stuck key cannot produce a nonsense rate', () => {
    expect(digitsToCentavos('1234567890')).toBe(34567890)
  })
  it('is empty-safe', () => {
    expect(digitsToCentavos('')).toBe(0)
    expect(digitsToCentavos(null)).toBe(0)
  })
  it('survives display → digits → display', () => {
    const shown = centavosDisplay(toCentavos(40))
    expect(centavosDisplay(digitsToCentavos(shown))).toBe(shown)
  })
})

describe('boxLink', () => {
  it('builds the soft-scope public link', () => {
    expect(boxLink('abc123', 'https://dseller0.github.io')).toBe(
      'https://dseller0.github.io/CrossFit-Apps/index.html?box=abc123',
    )
  })
})

describe('monthBounds', () => {
  it('spans the whole calendar month, leap year included', () => {
    expect(monthBounds(new Date(2026, 1, 15))).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
      label: 'Fevereiro',
    })
    expect(monthBounds(new Date(2028, 1, 3))).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
      label: 'Fevereiro',
    })
  })
  it('defaults to the current date', () => {
    const now = new Date()
    expect(monthBounds().label).toBe(
      [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
      ][now.getMonth()],
    )
  })
})

describe('eventsForAffiliate', () => {
  const box = { id: 'l1', type: 'box' }
  const personal = { id: 'l2', type: 'personal', athleteIds: ['a1', 'a2'] }
  const events = {
    '2026-08-05': [
      { type: 'aula', locationId: 'l1', time: '18:00' },
      { type: 'aula', locationId: 'l9', time: '19:00' },
    ],
    '2026-08-12': [{ type: 'personal', athleteIds: ['a2'], time: '07:00' }],
    '2026-09-01': [{ type: 'aula', locationId: 'l1', time: '18:00' }],
  }

  it('matches a box affiliate on locationId, within range, stamping the date', () => {
    const rows = eventsForAffiliate(events, box, '2026-08-01', '2026-08-31')
    expect(rows).toEqual([{ type: 'aula', locationId: 'l1', time: '18:00', date: '2026-08-05' }])
  })

  it('matches a personal affiliate on a shared athleteId, never on locationId', () => {
    const rows = eventsForAffiliate(events, personal, '2026-08-01', '2026-08-31')
    expect(rows).toEqual([
      { type: 'personal', athleteIds: ['a2'], time: '07:00', date: '2026-08-12' },
    ])
  })

  it('excludes dates outside [from, to] and is empty-safe', () => {
    expect(eventsForAffiliate(events, box, '2026-08-01', '2026-08-11')).toHaveLength(1)
    expect(eventsForAffiliate({}, box, '2026-08-01', '2026-08-31')).toEqual([])
    expect(eventsForAffiliate(undefined, box, '2026-08-01', '2026-08-31')).toEqual([])
  })

  it('sorts by date then time', () => {
    const evs = {
      '2026-08-05': [
        { type: 'aula', locationId: 'l1', time: '19:00' },
        { type: 'aula', locationId: 'l1', time: '08:00' },
      ],
    }
    const rows = eventsForAffiliate(evs, box, '2026-08-01', '2026-08-31')
    expect(rows.map(r => r.time)).toEqual(['08:00', '19:00'])
  })
})

describe('resolveEventLoc', () => {
  const locs = [
    { id: 'l1', type: 'box' },
    { id: 'l2', type: 'personal', athleteIds: ['a1', 'a2'] },
  ]

  it('resolves a box event by its own locationId', () => {
    expect(resolveEventLoc({ type: 'aula', locationId: 'l1' }, locs)).toBe(locs[0])
  })

  it('resolves a personal event through the first matching athlete', () => {
    expect(resolveEventLoc({ type: 'personal', athleteIds: ['a2'] }, locs)).toBe(locs[1])
  })

  it('returns null for a locationId that matches nothing', () => {
    expect(resolveEventLoc({ type: 'aula', locationId: 'l9' }, locs)).toBeNull()
  })

  it('returns null for a personal event whose athlete matches no affiliate', () => {
    expect(resolveEventLoc({ type: 'personal', athleteIds: ['a9'] }, locs)).toBeNull()
  })

  it('returns null for a personal event with no athletes at all', () => {
    expect(resolveEventLoc({ type: 'personal', athleteIds: [] }, locs)).toBeNull()
  })
})
