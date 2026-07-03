import { describe, test, expect, vi } from 'vitest'

// useClassTracking.js imports the Supabase client, which throws at module load
// without VITE_SUPABASE_URL (not set in the vitest env) — stub it since this
// suite only exercises the pure defaultTurmaLabel helper, not any Supabase call.
vi.mock('../utils/supabase.js', () => ({ supabase: {} }))

const { defaultTurmaLabel } = await import('./useClassTracking.js')

describe('defaultTurmaLabel', () => {
  test('rounds down to :00 at the top of the hour', () => {
    expect(defaultTurmaLabel(new Date(2026, 5, 24, 9, 0))).toBe('Turma_09:00')
  })
  test('rounds down to :00 mid-hour (09:25 -> 09:00)', () => {
    expect(defaultTurmaLabel(new Date(2026, 5, 24, 9, 25))).toBe('Turma_09:00')
  })
  test('rounds down to :00 exactly at :30', () => {
    expect(defaultTurmaLabel(new Date(2026, 5, 24, 9, 30))).toBe('Turma_09:00')
  })
  test('rounds down to :30 just after the half-hour (19:32 -> 19:30)', () => {
    expect(defaultTurmaLabel(new Date(2026, 5, 24, 19, 32))).toBe('Turma_19:30')
  })
  test('rounds down to :30 near the top of the next hour (23:59 -> 23:30)', () => {
    expect(defaultTurmaLabel(new Date(2026, 5, 24, 23, 59))).toBe('Turma_23:30')
  })
  test('hour is never bumped, even at :59', () => {
    expect(defaultTurmaLabel(new Date(2026, 5, 24, 10, 59))).toBe('Turma_10:30')
  })
  test('pads single-digit hour', () => {
    expect(defaultTurmaLabel(new Date(2026, 5, 24, 5, 5))).toBe('Turma_05:00')
  })
})
