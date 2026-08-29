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
