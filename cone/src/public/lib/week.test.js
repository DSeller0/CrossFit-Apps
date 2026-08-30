import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  toISO,
  getWeek,
  dateToWeekOffset,
  fmtDate,
  monthGridCells,
  DAY_PT_TITLE,
  MONTH_PT_SHORT,
} from './week.js'

// June 24, 2026 is a Wednesday. Week: Sun Jun 21 – Sat Jun 27.

describe('toISO', () => {
  test('formats date to YYYY-MM-DD', () => {
    expect(toISO(new Date(2026, 5, 24))).toBe('2026-06-24')
  })
  test('pads single-digit month and day', () => {
    expect(toISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
  test('pads day only when month is already two digits', () => {
    expect(toISO(new Date(2026, 11, 3))).toBe('2026-12-03')
  })
})

describe('getWeek', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 24, 12, 0, 0)) // Wed Jun 24 noon local
  })
  afterEach(() => vi.useRealTimers())

  test('returns exactly 7 Date objects', () => {
    const week = getWeek(0)
    expect(week).toHaveLength(7)
    week.forEach(d => expect(d).toBeInstanceOf(Date))
  })

  test('offset 0 starts on the current Sunday (Jun 21)', () => {
    const week = getWeek(0)
    expect(toISO(week[0])).toBe('2026-06-21')
    expect(toISO(week[6])).toBe('2026-06-27')
  })

  test('first day is always a Sunday (getDay() === 0) for any offset', () => {
    for (const off of [-2, -1, 0, 1, 2]) {
      expect(getWeek(off)[0].getDay()).toBe(0)
    }
  })

  test('offset 1 starts next Sunday (Jun 28)', () => {
    expect(toISO(getWeek(1)[0])).toBe('2026-06-28')
  })

  test('offset -1 starts last Sunday (Jun 14)', () => {
    expect(toISO(getWeek(-1)[0])).toBe('2026-06-14')
  })

  test('days within a week are consecutive', () => {
    const week = getWeek(0)
    for (let i = 1; i < 7; i++) {
      expect(week[i] - week[i - 1]).toBe(24 * 60 * 60 * 1000)
    }
  })
})

describe('dateToWeekOffset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 24, 12, 0, 0)) // Wed Jun 24
  })
  afterEach(() => vi.useRealTimers())

  test('today returns 0', () => {
    expect(dateToWeekOffset('2026-06-24')).toBe(0)
  })
  test('this Sunday (Jun 21) returns 0', () => {
    expect(dateToWeekOffset('2026-06-21')).toBe(0)
  })
  test('this Saturday (Jun 27) returns 0', () => {
    expect(dateToWeekOffset('2026-06-27')).toBe(0)
  })
  test('next Sunday (Jun 28) returns 1', () => {
    expect(dateToWeekOffset('2026-06-28')).toBe(1)
  })
  test('last Sunday (Jun 14) returns -1', () => {
    expect(dateToWeekOffset('2026-06-14')).toBe(-1)
  })
  test('two weeks ahead returns 2', () => {
    expect(dateToWeekOffset('2026-07-05')).toBe(2)
  })
})

describe('monthGridCells', () => {
  test('month starting on Sunday (Feb 2026) begins the grid with day 1, no leading padding', () => {
    const weeks = monthGridCells(2026, 1) // Feb 1 2026 is a Sunday
    expect(weeks).toHaveLength(4)
    expect(weeks[0][0].date.getDate()).toBe(1)
    expect(weeks[0][0].date.getDay()).toBe(0)
    expect(weeks[0][0].inMonth).toBe(true)
  })

  test('month starting on Saturday (Aug 2026) pads the first week with July days', () => {
    const weeks = monthGridCells(2026, 7) // Aug 1 2026 is a Saturday
    const firstWeek = weeks[0]
    expect(firstWeek.slice(0, 6).every(c => c.inMonth === false)).toBe(true)
    expect(firstWeek[6].inMonth).toBe(true)
    expect(firstWeek[6].date.getDate()).toBe(1)
    expect(firstWeek[6].date.getMonth()).toBe(7)
  })

  test('a 6-row month (Aug 2026) produces 6 weeks of 7 cells each', () => {
    const weeks = monthGridCells(2026, 7)
    expect(weeks).toHaveLength(6)
    weeks.forEach(w => expect(w).toHaveLength(7))
  })

  test('28-day February (Feb 2027, starts on a Monday) covers exactly days 1-28', () => {
    const weeks = monthGridCells(2027, 1)
    expect(weeks).toHaveLength(5)
    const inMonthDates = weeks
      .flat()
      .filter(c => c.inMonth)
      .map(c => c.date.getDate())
    expect(inMonthDates).toEqual(Array.from({ length: 28 }, (_, i) => i + 1))
  })

  test('inMonth is false for padding days before the 1st and after the last day (Apr 2026)', () => {
    const weeks = monthGridCells(2026, 3) // Apr 1 2026 is a Wednesday, 30 days
    const firstWeek = weeks[0]
    const lastWeek = weeks[weeks.length - 1]
    expect(firstWeek[0].inMonth).toBe(false)
    expect(firstWeek[0].date.getMonth()).toBe(2) // trails from March
    expect(firstWeek[3].inMonth).toBe(true)
    expect(firstWeek[3].date.getDate()).toBe(1)
    const trailing = lastWeek.filter(c => !c.inMonth)
    expect(trailing.length).toBeGreaterThan(0)
    trailing.forEach(c => expect(c.date.getMonth()).toBe(4)) // spills into May
  })
})

describe('fmtDate', () => {
  test('formats as "Dom D Mon" (Titlecase day + short month)', () => {
    // June 21, 2026 is a Sunday.
    expect(fmtDate('2026-06-21')).toBe('Dom 21 Jun')
  })
  test('uses DAY_PT_TITLE/MONTH_PT_SHORT arrays', () => {
    const d = new Date('2026-06-24T12:00:00')
    expect(fmtDate('2026-06-24')).toBe(
      `${DAY_PT_TITLE[d.getDay()]} ${d.getDate()} ${MONTH_PT_SHORT[d.getMonth()]}`,
    )
  })
})
