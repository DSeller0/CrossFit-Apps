import { describe, it, expect } from 'vitest'
import {
  getWeeksInMonth,
  weekLabel,
  calcKPIs,
  calcSessionKPIs,
  getPerformanceStr,
} from './resultadosHelpers.js'
import { monthGridCells } from '../../../public/lib/week.js'

// Resultados.jsx's helpers had zero tests before #74-B/plans/44 — they lived as
// module-level functions inside a 912-line tab. Extracted verbatim (pure move,
// no behavior change); these tests pin what they already did.

describe('getWeeksInMonth', () => {
  it("matches monthGridCells' week count, each week Sunday→Saturday", () => {
    const weeks = getWeeksInMonth(2026, 6) // July 2026
    expect(weeks.length).toBe(monthGridCells(2026, 6).length)
    weeks.forEach(w => {
      expect(w.start.getDay()).toBe(0) // Sunday
      expect(w.end.getDay()).toBe(6) // Saturday
      expect(w.end.getTime() - w.start.getTime()).toBe(6 * 24 * 60 * 60 * 1000)
    })
  })
})

describe('weekLabel', () => {
  const year = 2026,
    month = 6 // July

  it('renders a plain in-month week as "start–end"', () => {
    const week = { start: new Date(2026, 6, 12), end: new Date(2026, 6, 18) }
    expect(weekLabel(week, year, month)).toBe('12–18')
  })

  it('clamps the start to 1 when the week bleeds into the previous month', () => {
    const week = { start: new Date(2026, 5, 28), end: new Date(2026, 6, 4) }
    expect(weekLabel(week, year, month)).toBe('1–4')
  })

  it("clamps the end to the month's last day when the week bleeds into the next month", () => {
    const week = { start: new Date(2026, 6, 26), end: new Date(2026, 7, 1) }
    expect(weekLabel(week, year, month)).toBe('26–31') // July has 31 days
  })
})

const R = (athleteId, date, presence, blocks = []) => ({ athleteId, date, presence, blocks })

describe('calcKPIs', () => {
  it('returns zeroed/null KPIs for an athlete with no results', () => {
    const k = calcKPIs('a1', [])
    expect(k).toEqual({
      freq: 0,
      avgRpe: null,
      rxRate: null,
      rxCount: 0,
      scaleCount: 0,
      loadTrend: null,
      lastRpes: [],
      totalSessions: 0,
    })
  })

  it('computes attendance frequency from Presente vs total results', () => {
    const results = [
      R('a1', '2026-07-01', 'Presente'),
      R('a1', '2026-07-02', 'Presente'),
      R('a1', '2026-07-03', 'Ausente'),
    ]
    const k = calcKPIs('a1', results)
    expect(k.totalSessions).toBe(2)
    expect(k.freq).toBe(67) // Math.round(2/3*100)
  })

  it('averages rpe across all logged blocks, and only counts athlete-picked scales', () => {
    const results = [
      R('a1', '2026-07-01', 'Presente', [{ rpe: 6, scale: 'RX' }]),
      R('a1', '2026-07-02', 'Presente', [{ rpe: 8, scale: null }]), // never-picked scale drops out
    ]
    const k = calcKPIs('a1', results)
    expect(k.avgRpe).toBe('7.0')
    expect(k.scaleCount).toBe(1) // only the RX entry counts
    expect(k.rxRate).toBe(100)
  })

  it('has no rxRate when no scale was ever picked (not a flattering 0%)', () => {
    const results = [R('a1', '2026-07-01', 'Presente', [{ rpe: 5, scale: null }])]
    expect(calcKPIs('a1', results).rxRate).toBeNull()
  })

  it('surfaces the biggest load trend across exercises with >=3 logged entries', () => {
    const results = [
      R('a1', '2026-07-01', 'Presente', [{ exerciseName: 'Back Squat', load: '80' }]),
      R('a1', '2026-07-08', 'Presente', [{ exerciseName: 'Back Squat', load: '85' }]),
      R('a1', '2026-07-15', 'Presente', [{ exerciseName: 'Back Squat', load: '100' }]),
      R('a1', '2026-07-01', 'Presente', [{ exerciseName: 'Deadlift', load: '100' }]),
      R('a1', '2026-07-08', 'Presente', [{ exerciseName: 'Deadlift', load: '101' }]),
      R('a1', '2026-07-15', 'Presente', [{ exerciseName: 'Deadlift', load: '102' }]),
    ]
    const k = calcKPIs('a1', results)
    expect(k.loadTrend.name).toBe('Back Squat') // 25% swing beats Deadlift's 2%
    expect(k.loadTrend.diff).toBe(25)
  })
})

describe('calcSessionKPIs', () => {
  it('returns null when nobody was Presente on that date', () => {
    expect(calcSessionKPIs('2026-07-01', [R('a1', '2026-07-01', 'Ausente')])).toBeNull()
  })

  it('aggregates rpe/scale distribution/flags across everyone Presente that date', () => {
    const results = [
      R('a1', '2026-07-01', 'Presente', [{ rpe: 6, scale: 'RX' }]),
      R('a2', '2026-07-01', 'Presente', [{ rpe: 8, scale: 'Inter' }]),
      R('a3', '2026-07-01', 'Ausente'),
    ]
    results[1].flagForReview = true
    const k = calcSessionKPIs('2026-07-01', results)
    expect(k.count).toBe(2)
    expect(k.avgRpe).toBe('7.0')
    expect(k.scaleDist).toEqual({ RX: 1, Inter: 1, SC: 0, Adaptado: 0 })
    expect(k.rxPct).toBe(50)
    expect(k.flags).toBe(1)
  })

  it('has no rxPct when nobody logged a scale (not a flattering 0%)', () => {
    const k = calcSessionKPIs('2026-07-01', [R('a1', '2026-07-01', 'Presente', [{ rpe: 5 }])])
    expect(k.rxPct).toBeNull()
  })
})

// ⚠️ getPerformanceStr is a KNOWN-BUGGY verbatim extraction (see resultadosHelpers.js)
// — it lacks canonical perfStr's DNF branch. This test pins the CURRENT behavior on
// purpose; it is expected to change in the separate follow-up commit that swaps this
// for canonical perfStr, which is the point of pinning it here rather than leaving it
// undocumented.
describe('getPerformanceStr (known divergence from canonical perfStr)', () => {
  it('renders a dash for a capped For Time result instead of "N rds (DNF)"', () => {
    expect(getPerformanceStr({ perfTime: '' }, 'For Time')).toBe('—')
  })
  it('renders perfTime as-is for a completed For Time result', () => {
    expect(getPerformanceStr({ perfTime: '12:34' }, 'For Time')).toBe('12:34')
  })
  it('joins rounds + reps for a non-time block', () => {
    expect(getPerformanceStr({ perfRounds: '5', perfReps: '10' }, 'AMRAP')).toBe('5 rds + 10 reps')
  })
})
