import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FILTER,
  agendaFilter,
  reportFilter,
  evStatus,
  periodBounds,
  matchingAthleteIds,
  matchesEvent,
  filterEvents,
  filterDay,
  activeCount,
  clearFilter,
  toggleInSet,
} from './eventFilter.js'

const aula = (over = {}) => ({
  id: 'a1',
  type: 'aula',
  time: '07:00',
  label: 'Turma Manhã',
  locationId: 'loc-vila',
  athleteIds: [],
  status: 'scheduled',
  ...over,
})
const pers = (over = {}) => ({
  id: 'p1',
  type: 'personal',
  time: '10:00',
  label: 'Ana',
  athleteIds: ['ana'],
  status: 'scheduled',
  ...over,
})

describe('evStatus', () => {
  it('is a two-value manual toggle, never attendance', () => {
    expect(evStatus({ status: 'completed' })).toBe('completed')
    expect(evStatus({ status: 'scheduled' })).toBe('scheduled')
  })
  it('treats anything that is not "completed" as scheduled', () => {
    expect(evStatus({})).toBe('scheduled')
    expect(evStatus({ status: undefined })).toBe('scheduled')
    expect(evStatus({ status: 'cancelled' })).toBe('scheduled')
  })
})

describe('periodBounds', () => {
  it('returns null when the axis is off', () => {
    expect(periodBounds(null)).toBeNull()
  })
  it('spans a whole month, last day included', () => {
    expect(periodBounds({ mode: 'month', yr: 2026, mo: 7 })).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    })
  })
  it('handles a 30-day month and February', () => {
    expect(periodBounds({ mode: 'month', yr: 2026, mo: 8 }).to).toBe('2026-09-30')
    expect(periodBounds({ mode: 'month', yr: 2026, mo: 1 }).to).toBe('2026-02-28')
  })
  it('handles a leap February', () => {
    expect(periodBounds({ mode: 'month', yr: 2028, mo: 1 }).to).toBe('2028-02-29')
  })
  it('passes a custom range straight through', () => {
    expect(periodBounds({ mode: 'range', from: '2026-08-03', to: '2026-08-09' })).toEqual({
      from: '2026-08-03',
      to: '2026-08-09',
    })
  })
})

describe('matchesEvent — period', () => {
  const f = { ...DEFAULT_FILTER, period: { mode: 'month', yr: 2026, mo: 7 } }
  it('keeps a date inside the month, both ends inclusive', () => {
    expect(matchesEvent(aula(), '2026-08-01', f)).toBe(true)
    expect(matchesEvent(aula(), '2026-08-31', f)).toBe(true)
  })
  it('drops a date outside it', () => {
    expect(matchesEvent(aula(), '2026-07-31', f)).toBe(false)
    expect(matchesEvent(aula(), '2026-09-01', f)).toBe(false)
  })
  it('keeps every date when the axis is off', () => {
    expect(matchesEvent(aula(), '1999-01-01', DEFAULT_FILTER)).toBe(true)
  })
})

describe('matchesEvent — type', () => {
  it('narrows to one type', () => {
    const f = { ...DEFAULT_FILTER, types: { aula: false, personal: true } }
    expect(matchesEvent(aula(), '2026-08-05', f)).toBe(false)
    expect(matchesEvent(pers(), '2026-08-05', f)).toBe(true)
  })
})

describe('matchesEvent — status', () => {
  it('supports the scheduled-only branch ReportModal never had', () => {
    const f = { ...DEFAULT_FILTER, status: 'scheduled' }
    expect(matchesEvent(aula(), '2026-08-05', f)).toBe(true)
    expect(matchesEvent(aula({ status: 'completed' }), '2026-08-05', f)).toBe(false)
  })
  it('supports completed-only, ReportModal’s historical value', () => {
    const f = { ...DEFAULT_FILTER, status: 'completed' }
    expect(matchesEvent(aula({ status: 'completed' }), '2026-08-05', f)).toBe(true)
    expect(matchesEvent(aula(), '2026-08-05', f)).toBe(false)
  })
})

describe('matchesEvent — affiliate', () => {
  it('keeps a selected affiliate and drops an unselected one', () => {
    const f = { ...DEFAULT_FILTER, affiliates: new Set(['loc-vila']) }
    expect(matchesEvent(aula(), '2026-08-05', f)).toBe(true)
    expect(matchesEvent(aula({ locationId: 'loc-norte' }), '2026-08-05', f)).toBe(false)
  })
  it('drops an event with NO affiliate — the unbillable case', () => {
    const f = { ...DEFAULT_FILTER, affiliates: new Set(['loc-vila']) }
    expect(matchesEvent(aula({ locationId: undefined }), '2026-08-05', f)).toBe(false)
  })
  it('keeps an event with no affiliate when the axis is off', () => {
    expect(matchesEvent(aula({ locationId: undefined }), '2026-08-05', DEFAULT_FILTER)).toBe(true)
  })
})

describe('matchingAthleteIds — the second granularity', () => {
  it('narrows a personal event to the selected athletes only', () => {
    const ev = pers({ athleteIds: ['ana', 'bruno', 'caio'] })
    const f = { ...DEFAULT_FILTER, athletes: new Set(['bruno']) }
    expect(matchingAthleteIds(ev, f)).toEqual(['bruno'])
  })
  it('returns every athlete when the axis is off', () => {
    const ev = pers({ athleteIds: ['ana', 'bruno'] })
    expect(matchingAthleteIds(ev, DEFAULT_FILTER)).toEqual(['ana', 'bruno'])
  })
  it('leaves a CLASS untouched even under an athlete selection', () => {
    const ev = aula({ athleteIds: ['ana', 'bruno'] })
    const f = { ...DEFAULT_FILTER, athletes: new Set(['caio']) }
    expect(matchingAthleteIds(ev, f)).toEqual(['ana', 'bruno'])
  })
  it('is safe on an event with no athleteIds at all', () => {
    expect(matchingAthleteIds({ type: 'personal' }, DEFAULT_FILTER)).toEqual([])
  })
})

describe('matchesEvent — athlete axis is personal-only', () => {
  it('keeps a personal event when at least one athlete matches', () => {
    const ev = pers({ athleteIds: ['ana', 'bruno'] })
    const f = { ...DEFAULT_FILTER, athletes: new Set(['bruno']) }
    expect(matchesEvent(ev, '2026-08-05', f)).toBe(true)
  })
  it('drops a personal event when none match', () => {
    const ev = pers({ athleteIds: ['ana'] })
    const f = { ...DEFAULT_FILTER, athletes: new Set(['caio']) }
    expect(matchesEvent(ev, '2026-08-05', f)).toBe(false)
  })
  it('does NOT narrow a class by athlete — a class the athlete was not ticked on is not a claim', () => {
    const f = { ...DEFAULT_FILTER, athletes: new Set(['caio']) }
    expect(matchesEvent(aula({ athleteIds: ['ana'] }), '2026-08-05', f)).toBe(true)
  })
})

describe('filterEvents', () => {
  const events = {
    '2026-08-05': [
      aula({ id: 'e2', time: '19:00' }),
      aula({ id: 'e1', time: '07:00', status: 'completed' }),
    ],
    '2026-08-03': [pers({ id: 'e0', time: '10:00' })],
    '2026-09-01': [aula({ id: 'e9' })],
  }
  it('stamps each event with its date', () => {
    const out = filterEvents(events, DEFAULT_FILTER)
    expect(out.every(e => typeof e.date === 'string')).toBe(true)
  })
  it('sorts by date then time', () => {
    const out = filterEvents(events, DEFAULT_FILTER)
    expect(out.map(e => e.id)).toEqual(['e0', 'e1', 'e2', 'e9'])
  })
  it('applies the period axis', () => {
    const f = { ...DEFAULT_FILTER, period: { mode: 'month', yr: 2026, mo: 7 } }
    expect(filterEvents(events, f).map(e => e.id)).toEqual(['e0', 'e1', 'e2'])
  })
  it('does not mutate the source events', () => {
    const out = filterEvents(events, DEFAULT_FILTER)
    out[0].label = 'mutated'
    expect(events['2026-08-03'][0].label).toBe('Ana')
  })
  it('is safe on an empty blob', () => {
    expect(filterEvents({}, DEFAULT_FILTER)).toEqual([])
    expect(filterEvents(undefined, DEFAULT_FILTER)).toEqual([])
  })
})

describe('filterDay', () => {
  const events = {
    '2026-08-05': [
      aula({ id: 'e2', time: '19:00' }),
      aula({ id: 'e1', time: '07:00', status: 'completed' }),
    ],
  }
  it('returns one day, time-sorted', () => {
    expect(filterDay(events, '2026-08-05', DEFAULT_FILTER).map(e => e.id)).toEqual(['e1', 'e2'])
  })
  it('applies the status axis within the day', () => {
    const f = { ...DEFAULT_FILTER, status: 'scheduled' }
    expect(filterDay(events, '2026-08-05', f).map(e => e.id)).toEqual(['e2'])
  })
  it('is empty for a day with nothing', () => {
    expect(filterDay(events, '2026-08-06', DEFAULT_FILTER)).toEqual([])
  })
  it('ignores the period axis — the day IS the period here', () => {
    const f = { ...DEFAULT_FILTER, period: { mode: 'month', yr: 2026, mo: 7 } }
    expect(filterDay(events, '2026-08-05', f)).toHaveLength(2)
  })
})

describe('activeCount', () => {
  it('is zero for a fresh filter', () => {
    expect(activeCount(DEFAULT_FILTER)).toBe(0)
    expect(activeCount(agendaFilter())).toBe(0)
  })
  it('does not count the period — it is navigation, not a narrowing', () => {
    expect(activeCount({ ...DEFAULT_FILTER, period: { mode: 'month', yr: 2026, mo: 7 } })).toBe(0)
  })
  it('counts each narrowing axis once', () => {
    expect(activeCount({ ...DEFAULT_FILTER, types: { aula: true, personal: false } })).toBe(1)
    expect(activeCount({ ...DEFAULT_FILTER, status: 'completed' })).toBe(1)
    expect(activeCount({ ...DEFAULT_FILTER, affiliates: new Set(['x']) })).toBe(1)
    expect(activeCount({ ...DEFAULT_FILTER, athletes: new Set(['y']) })).toBe(1)
  })
  it('sums them', () => {
    expect(
      activeCount({
        ...DEFAULT_FILTER,
        types: { aula: false, personal: true },
        status: 'completed',
        affiliates: new Set(['x']),
        athletes: new Set(['y']),
      }),
    ).toBe(4)
  })
  it('counts ReportModal’s own default as one — it opens on "completed"', () => {
    expect(activeCount(reportFilter(2026, 7))).toBe(1)
  })
})

describe('clearFilter', () => {
  it('drops every narrowing axis', () => {
    const f = {
      period: { mode: 'month', yr: 2026, mo: 7 },
      types: { aula: false, personal: true },
      status: 'completed',
      affiliates: new Set(['x']),
      athletes: new Set(['y']),
    }
    const c = clearFilter(f)
    expect(activeCount(c)).toBe(0)
    expect(c.types).toEqual({ aula: true, personal: true })
  })
  it('keeps the period, since it is the surface’s navigation', () => {
    const p = { mode: 'month', yr: 2026, mo: 7 }
    expect(clearFilter({ ...DEFAULT_FILTER, period: p }).period).toEqual(p)
  })
  it('returns a fresh types object, not the frozen default', () => {
    const c = clearFilter(DEFAULT_FILTER)
    c.types.aula = false
    expect(DEFAULT_FILTER.types.aula).toBe(true)
  })
})

describe('toggleInSet', () => {
  it('adds to null', () => {
    expect([...toggleInSet(null, 'a')]).toEqual(['a'])
  })
  it('adds to an existing set', () => {
    expect([...toggleInSet(new Set(['a']), 'b')].sort()).toEqual(['a', 'b'])
  })
  it('removes a member', () => {
    expect([...toggleInSet(new Set(['a', 'b']), 'a')]).toEqual(['b'])
  })
  it('collapses an emptied set back to null ("all"), never to an empty selection', () => {
    expect(toggleInSet(new Set(['a']), 'a')).toBeNull()
  })
  it('does not mutate the input set', () => {
    const s = new Set(['a'])
    toggleInSet(s, 'b')
    expect([...s]).toEqual(['a'])
  })
})

describe('agendaFilter / reportFilter presets', () => {
  it('Agenda opens with no period axis — its month nav is the period', () => {
    expect(agendaFilter().period).toBeNull()
    expect(agendaFilter().status).toBe('all')
  })
  it('Relatório opens on the given month, completed only', () => {
    const f = reportFilter(2026, 7)
    expect(f.period).toEqual({ mode: 'month', yr: 2026, mo: 7 })
    expect(f.status).toBe('completed')
  })
  it('each preset gets its own types object', () => {
    const a = agendaFilter()
    a.types.aula = false
    expect(agendaFilter().types.aula).toBe(true)
  })
})
