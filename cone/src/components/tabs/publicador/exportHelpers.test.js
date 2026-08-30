import { describe, test, expect, vi } from 'vitest'
import {
  buildProgressionLines,
  exLine,
  complexLine,
  buildMobileSession,
  getWeeksOfMonth,
  mfs,
} from './exportHelpers.js'

// #59 · plans/81 Phase 0 — this file only became importable under vitest once
// exportHelpers.js's module-scope `window.SpeechRecognition` read (the dictation hook
// deleted here as dead code) stopped forcing the whole module to need jsdom. It still
// imports toISO from utils/storage, which also constructs the SPA Supabase client at
// module scope — real env vars aren't present under vitest, so that throws. storage.js's
// toISO is just a re-export of week.js's, which has no such dependency, so the mock
// hands back the real implementation.
vi.mock('../../../utils/storage', async () => {
  const week = await import('../../../public/lib/week.js')
  return { toISO: week.toISO }
})

describe('buildProgressionLines', () => {
  test('returns null when the exercise has no intensity steps', () => {
    expect(buildProgressionLines({ name: 'Back Squat', sets: 3 })).toBeNull()
  })

  test('groups steps by reps, joining same-unit loads and prefixing sets×reps', () => {
    const ex = {
      name: 'back squat',
      sets: 3,
      intensity: {
        steps: [
          { reps: '5', load: 60, unit: 'kg' },
          { reps: '5', load: 65, unit: 'kg' },
          { reps: '3', load: 70, unit: '%' },
        ],
      },
    }
    expect(buildProgressionLines(ex)).toEqual([
      { nameLine: '3×5 BACK SQUAT', loadStr: '60/65 kg' },
      { nameLine: '3×3 BACK SQUAT', loadStr: '70 % RM' },
    ])
  })

  test('falls back to "% RM" when a group mixes units', () => {
    const ex = {
      name: 'clean',
      sets: 5,
      intensity: {
        steps: [
          { reps: '3', load: 60, unit: 'kg' },
          { reps: '3', load: 70, unit: '%' },
        ],
      },
    }
    expect(buildProgressionLines(ex)[0].loadStr).toBe('60/70 % RM')
  })

  test('uses the distance prefix instead of sets×reps when the exercise carries a dist', () => {
    const ex = {
      name: 'run',
      dist: 400,
      distUnit: 'm',
      sets: 4,
      intensity: { steps: [{ reps: '', load: '', unit: '' }] },
    }
    expect(buildProgressionLines(ex)[0].nameLine).toBe('4×400m RUN')
  })
})

describe('exLine', () => {
  test('joins the volume string and uppercased name', () => {
    expect(exLine({ name: 'push up', sets: 3, reps: '10' })).toBe('3×10 PUSH UP')
  })

  test('drops the volume when the exercise has no sets/reps', () => {
    expect(exLine({ name: 'burpee' })).toBe('BURPEE')
  })
})

describe('complexLine', () => {
  test('renders sets×(reps+reps) NAME from complexMovements when the exercise has no own name', () => {
    const ex = {
      sets: 3,
      complexMovements: [
        { name: 'Clean', reps: '2' },
        { name: 'Jerk', reps: '1' },
      ],
    }
    expect(complexLine(ex)).toBe('3×(2+1) CLEAN + JERK')
  })

  test('uses "?" for a movement missing reps and omits the sets prefix when unset', () => {
    const ex = {
      complexMovements: [{ name: 'Clean' }, { name: 'Jerk', reps: '1' }],
    }
    expect(complexLine(ex)).toBe('(?+1) CLEAN + JERK')
  })

  test('falls back to "Complexo" with no movements and no name', () => {
    expect(complexLine({ sets: 2, complexMovements: [] })).toBe('2× COMPLEXO')
  })
})

describe('getWeeksOfMonth', () => {
  test('unwraps monthGridCells to bare Dates, not {date,inMonth} cells', () => {
    const weeks = getWeeksOfMonth(2026, 1) // Feb 2026
    expect(weeks[0][0]).toBeInstanceOf(Date)
    expect(weeks[0][0].date).toBeUndefined()
  })
})

describe('buildMobileSession', () => {
  // Sun Jun 21 2026 – Sat Jun 27 2026, index 0 = Sunday.
  const weekDates = Array.from({ length: 7 }, (_, i) => new Date(2026, 5, 21 + i))

  test('returns the session on selectedDate directly, ignoring currentWeekDates', () => {
    const sessions = { '2026-06-21': [{ id: 'sel' }] }
    const result = buildMobileSession(sessions, '2026-06-21', weekDates)
    expect(result.s).toEqual({ id: 'sel' })
    expect(result.dateKey).toBe('2026-06-21')
  })

  test('falls back to the week when selectedDate has no session', () => {
    const sessions = { '2026-06-23': [{ id: 'tue' }] } // Tuesday, index 2
    const result = buildMobileSession(sessions, '2026-06-01', weekDates)
    expect(result.s).toEqual({ id: 'tue' })
    expect(result.dateKey).toBe('2026-06-23')
  })

  test('picks the first weekday (Mon-Fri) with a session when no selectedDate', () => {
    const sessions = { '2026-06-24': [{ id: 'wed' }] } // Wednesday, index 3
    const result = buildMobileSession(sessions, null, weekDates)
    expect(result.s).toEqual({ id: 'wed' })
    expect(result.dateKey).toBe('2026-06-24')
  })

  test('skips Saturday and Sunday even when they carry a session', () => {
    const sessions = {
      '2026-06-21': [{ id: 'sun' }], // index 0
      '2026-06-27': [{ id: 'sat' }], // index 6
    }
    expect(buildMobileSession(sessions, null, weekDates)).toBeNull()
  })

  test('returns null when nothing matches', () => {
    expect(buildMobileSession({}, null, weekDates)).toBeNull()
  })
})

describe('mfs', () => {
  test('scales a px value by a factor and rounds to a px string', () => {
    expect(mfs(10, 1.5)).toBe('15px')
  })

  test('rounds instead of truncating', () => {
    expect(mfs(10, 1.26)).toBe('13px')
  })
})
