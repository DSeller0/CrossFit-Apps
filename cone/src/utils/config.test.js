import { describe, test, expect } from 'vitest'
import { BTC, PLC, ECOL_BASE } from './config.js'
import { ALL_CATEGORIES } from '../public/lib/exerciseGroups.js'

// #98 — BTC/PLC/ECOL_BASE are hand-authored presentation maps keyed by category (CSS
// class / palette entry per type), not derived from ALL_CATEGORIES. A category missing
// here silently falls back to another category's styling. Coverage only — not a rewrite.
describe.each([
  ['BTC', BTC],
  ['PLC', PLC],
  ['ECOL_BASE', ECOL_BASE],
])('%s', (name, map) => {
  test('covers every registry category', () => {
    ALL_CATEGORIES.forEach(c => expect(map).toHaveProperty(c))
  })
})
