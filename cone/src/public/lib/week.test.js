import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { toISO, getWeek, dateToWeekOffset } from './week.js'

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
