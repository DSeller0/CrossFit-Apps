import { describe, it, expect } from 'vitest'
import {
  typeLabel,
  rateLabel,
  toCentavos,
  centavosDisplay,
  digitsToCentavos,
  boxLink,
} from './affiliateHelpers.js'

// affiliateHelpers has no imports at all, so no utils/supabase mock is needed.

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
