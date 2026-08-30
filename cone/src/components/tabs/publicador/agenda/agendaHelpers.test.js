import { describe, it, expect } from 'vitest'
import {
  dayTitle,
  weekRangeLabel,
  monthStats,
  dayCards,
  hiddenCount,
  seriesEvents,
  seriesScopes,
  SERIES_EDIT_FIELDS,
} from './agendaHelpers.js'
import { monthGridCells } from '../../../../public/lib/week.js'

describe('dayTitle', () => {
  it('capitalises only the weekday — not every word', () => {
    expect(dayTitle('2026-08-05')).toBe('Quarta-feira, 5 de agosto')
  })
  it('does not zero-pad the day', () => {
    expect(dayTitle('2026-08-05')).toContain(' 5 de ')
  })
  it('reads the local day, not the UTC one', () => {
    expect(dayTitle('2026-01-01')).toBe('Quinta-feira, 1 de janeiro')
  })
  it('handles a Sunday and a Saturday', () => {
    expect(dayTitle('2026-08-02')).toBe('Domingo, 2 de agosto')
    expect(dayTitle('2026-08-08')).toBe('Sábado, 8 de agosto')
  })
})

describe('weekRangeLabel', () => {
  const wk = (start, y = 2026, m = 7) =>
    Array.from({ length: 7 }, (_, i) => new Date(y, m, start + i))
  it('collapses the month when both ends share it', () => {
    expect(weekRangeLabel(wk(2))).toBe('2 – 8 ago')
  })
  it('names both months when the week straddles them', () => {
    expect(weekRangeLabel(wk(30))).toBe('30 ago – 5 set')
  })
})

describe('monthStats', () => {
  const weeks = monthGridCells(2026, 7) // August 2026
  const events = {
    '2026-08-03': [
      { type: 'aula', status: 'completed' },
      { type: 'aula', status: 'scheduled' },
    ],
    '2026-08-04': [{ type: 'personal', status: 'scheduled' }],
    '2026-07-31': [{ type: 'aula', status: 'scheduled' }], // padding day, other month
    '2026-09-02': [{ type: 'aula', status: 'scheduled' }], // padding day, other month
  }
  it('counts only days inside the month, never the padding days', () => {
    expect(monthStats(events, weeks).total).toBe(3)
  })
  it('splits by type', () => {
    const s = monthStats(events, weeks)
    expect(s.aulas).toBe(2)
    expect(s.personal).toBe(1)
  })
  it('counts "a lançar" as everything not toggled completed — never as absence', () => {
    expect(monthStats(events, weeks).open).toBe(2)
  })
  it('is all zeroes for an empty month', () => {
    expect(monthStats({}, weeks)).toEqual({ total: 0, aulas: 0, personal: 0, open: 0 })
  })
  it('treats a missing status as "a lançar"', () => {
    expect(monthStats({ '2026-08-05': [{ type: 'aula' }] }, weeks).open).toBe(1)
  })
})

describe('dayCards', () => {
  it('puts sessions before events', () => {
    const out = dayCards([{ id: 's1' }], [{ id: 'e1' }, { id: 'e2' }])
    expect(out.map(c => c.kind)).toEqual(['session', 'event', 'event'])
  })
  it('is empty for an empty day', () => {
    expect(dayCards([], [])).toEqual([])
  })
})

describe('hiddenCount', () => {
  it('reports what the filter is hiding', () => {
    expect(hiddenCount([1, 2, 3], [1])).toBe(2)
  })
  it('is zero when nothing is hidden', () => {
    expect(hiddenCount([1, 2], [1, 2])).toBe(0)
  })
  it('never goes negative', () => {
    expect(hiddenCount([], [1])).toBe(0)
  })
  it('is safe on undefined', () => {
    expect(hiddenCount(undefined, undefined)).toBe(0)
  })
})

describe('seriesEvents', () => {
  const events = {
    '2026-08-10': [{ id: 'b', recurrenceGroup: 'g1', time: '07:00' }],
    '2026-08-03': [
      { id: 'a', recurrenceGroup: 'g1', time: '07:00' },
      { id: 'x', recurrenceGroup: 'g2', time: '19:00' },
    ],
    '2026-08-17': [{ id: 'c', recurrenceGroup: 'g1', time: '07:00' }],
  }
  it('collects the whole group, date-stamped and sorted', () => {
    expect(seriesEvents(events, 'g1').map(e => e.id)).toEqual(['a', 'b', 'c'])
    expect(seriesEvents(events, 'g1')[0].date).toBe('2026-08-03')
  })
  it('does not leak another group', () => {
    expect(seriesEvents(events, 'g2').map(e => e.id)).toEqual(['x'])
  })
  it('is empty for no group at all', () => {
    expect(seriesEvents(events, undefined)).toEqual([])
    expect(seriesEvents(events, null)).toEqual([])
  })
})

describe('seriesScopes', () => {
  const events = {
    '2026-08-03': [{ id: 'a', recurrenceGroup: 'g1', time: '07:00' }],
    '2026-08-10': [{ id: 'b', recurrenceGroup: 'g1', time: '07:00' }],
    '2026-08-17': [{ id: 'c', recurrenceGroup: 'g1', time: '07:00' }],
    '2026-08-24': [{ id: 'd', recurrenceGroup: 'g1', time: '07:00' }],
  }
  const target = { id: 'b', date: '2026-08-10', time: '07:00', recurrenceGroup: 'g1' }

  it('offers three scopes with honest counts', () => {
    const sc = seriesScopes(events, target)
    expect(sc.counts).toEqual({ one: 1, following: 3, all: 4 })
  })
  it('"following" includes the event acted on', () => {
    expect(seriesScopes(events, target).following.map(e => e.id)).toEqual(['b', 'c', 'd'])
  })
  it('"all" spans the whole series', () => {
    expect(seriesScopes(events, target).span).toEqual({ from: '2026-08-03', to: '2026-08-24' })
  })
  it('returns null for an event with no series', () => {
    expect(seriesScopes(events, { id: 'z', date: '2026-08-05', time: '09:00' })).toBeNull()
  })
  it('returns null for a "series" of one — a one-item scope picker is noise', () => {
    const solo = { '2026-08-03': [{ id: 'a', recurrenceGroup: 'solo', time: '07:00' }] }
    expect(
      seriesScopes(solo, { id: 'a', date: '2026-08-03', time: '07:00', recurrenceGroup: 'solo' }),
    ).toBeNull()
  })
  it('splits "following" on time within the same day', () => {
    const sameDay = {
      '2026-08-03': [
        { id: 'early', recurrenceGroup: 'g', time: '07:00' },
        { id: 'late', recurrenceGroup: 'g', time: '19:00' },
      ],
    }
    const sc = seriesScopes(sameDay, {
      id: 'late',
      date: '2026-08-03',
      time: '19:00',
      recurrenceGroup: 'g',
    })
    expect(sc.following.map(e => e.id)).toEqual(['late'])
  })
})

describe('SERIES_EDIT_FIELDS', () => {
  it('never propagates the date — each occurrence keeps its own', () => {
    expect(SERIES_EDIT_FIELDS).not.toContain('date')
  })
  it('never propagates status — "this and following" over a past state is a false claim', () => {
    expect(SERIES_EDIT_FIELDS).not.toContain('status')
  })
  it('never propagates the id or the group key', () => {
    expect(SERIES_EDIT_FIELDS).not.toContain('id')
    expect(SERIES_EDIT_FIELDS).not.toContain('recurrenceGroup')
  })
  it('carries the fields a coach actually edits on a series', () => {
    expect(SERIES_EDIT_FIELDS).toEqual(
      expect.arrayContaining(['time', 'durationMin', 'label', 'locationId', 'athleteIds']),
    )
  })
})
