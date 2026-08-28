import { describe, it, expect } from 'vitest'
import {
  snapPct,
  goalPct,
  combinedPct,
  milestoneTicks,
  prValueLabel,
  prTargetLabel,
  shortDate,
  monthYear,
  groupPrsByCategory,
  sessionStrip,
  agoLabel,
  nextSessionGroups,
  lastSessionSignal,
  adherence,
  daysSinceNote,
  goalSignal,
  presenceGrid,
  sinceLastNote,
} from './atletasHelpers.js'

// atletasHelpers imports only public/lib/sessions.js (client-free), so unlike
// stateBackup.test.js this needs no utils/supabase mock.

describe('snapPct', () => {
  it('rounds to the 10% grid', () => {
    expect(snapPct(0)).toBe(0)
    expect(snapPct(44)).toBe(40)
    expect(snapPct(45)).toBe(50)
    expect(snapPct(100)).toBe(100)
  })
  it('treats a missing value as 0 rather than NaN', () => {
    expect(snapPct(undefined)).toBe(0)
    expect(snapPct(null)).toBe(0)
  })
})

describe('goalPct', () => {
  it('is the completion percentage', () => {
    expect(goalPct({ completedSessions: 4, totalSessions: 10 })).toBe(40)
    expect(goalPct({ completedSessions: 1, totalSessions: 3 })).toBe(33)
  })
  it('is 0 — not NaN — when no sessions are planned', () => {
    expect(goalPct({ completedSessions: 0, totalSessions: 0 })).toBe(0)
    expect(goalPct(undefined)).toBe(0)
  })
  it('clamps an over-completed goal to 100', () => {
    expect(goalPct({ completedSessions: 12, totalSessions: 10 })).toBe(100)
  })
})

describe('combinedPct', () => {
  it('averages across the athlete goals', () => {
    expect(
      combinedPct([
        { completedSessions: 5, totalSessions: 10 },
        { completedSessions: 10, totalSessions: 10 },
      ]),
    ).toBe(75)
  })
  it('returns null with no goals, so the row prints nothing instead of 0%', () => {
    expect(combinedPct([])).toBeNull()
    expect(combinedPct(undefined)).toBeNull()
  })
  it('counts a zero-total goal as 0 without dividing by zero', () => {
    expect(combinedPct([{ completedSessions: 0, totalSessions: 0 }])).toBe(0)
  })
})

describe('milestoneTicks', () => {
  it('marks the first unhit milestone as next and sorts by percentage', () => {
    const ticks = milestoneTicks([
      { pct: 80, hit: false },
      { pct: 20, hit: true },
      { pct: 50, hit: false },
    ])
    expect(ticks).toEqual([
      { pct: 20, state: 'hit' },
      { pct: 50, state: 'next' },
      { pct: 80, state: 'future' },
    ])
  })
  it('has no next once every milestone is hit', () => {
    const ticks = milestoneTicks([{ pct: 50, hit: true }])
    expect(ticks).toEqual([{ pct: 50, state: 'hit' }])
  })
  it('snaps to the 10% grid the bar actually renders on', () => {
    expect(milestoneTicks([{ pct: 44, hit: false }])[0].pct).toBe(40)
  })
  it('is empty for a goal with no milestones', () => {
    expect(milestoneTicks(undefined)).toEqual([])
  })
})

describe('prValueLabel / prTargetLabel', () => {
  it('appends the unit for a load PR and defaults to kg', () => {
    expect(prValueLabel({ type: 'load', unit: 'lb' }, 225)).toBe('225 lb')
    expect(prValueLabel({ type: 'load' }, 100)).toBe('100 kg')
  })
  it('labels reps and leaves a time value alone', () => {
    expect(prValueLabel({ type: 'reps' }, 25)).toBe('25 reps')
    expect(prValueLabel({ type: 'time' }, '03:45')).toBe('03:45')
  })
  it('renders an em dash for a missing value', () => {
    expect(prValueLabel({ type: 'load' }, null)).toBe('—')
    expect(prValueLabel({ type: 'load' }, undefined)).toBe('—')
  })
  it('gives null when the PR carries no target', () => {
    expect(prTargetLabel({ type: 'load' })).toBeNull()
    expect(prTargetLabel({ type: 'load', target: 140 })).toBe('140 kg')
  })
})

describe('shortDate / monthYear', () => {
  it('formats at noon so the UTC shift cannot move the day', () => {
    expect(shortDate('2026-08-04')).toBe('04/08')
    expect(monthYear('2026-08-04')).toMatch(/2026/)
  })
  it('returns null for a missing key', () => {
    expect(shortDate('')).toBeNull()
    expect(monthYear(undefined)).toBeNull()
  })
})

describe('groupPrsByCategory', () => {
  const order = ['Força', 'Ginástica', 'Cardio']

  it('orders groups by the registry block order', () => {
    const out = groupPrsByCategory(
      [
        { id: 'a', categories: ['Cardio'] },
        { id: 'b', categories: ['Força'] },
      ],
      order,
    )
    expect(out.map(([cat]) => cat)).toEqual(['Força', 'Cardio'])
  })

  it('picks the first category that exists in the registry, not categories[0]', () => {
    // "Acessórios" isn't in the registry order — the PR belongs under Ginástica.
    const out = groupPrsByCategory([{ id: 'a', categories: ['Acessórios', 'Ginástica'] }], order)
    expect(out).toEqual([['Ginástica', [{ id: 'a', categories: ['Acessórios', 'Ginástica'] }]]])
  })

  it('falls back to the legacy singular category field', () => {
    const out = groupPrsByCategory([{ id: 'a', category: 'Força' }], order)
    expect(out.map(([cat]) => cat)).toEqual(['Força'])
  })

  it('buckets an untagged PR under "Sem categoria", appended last', () => {
    const out = groupPrsByCategory([{ id: 'a' }, { id: 'b', categories: ['Força'] }], order)
    expect(out.map(([cat]) => cat)).toEqual(['Força', 'Sem categoria'])
  })

  it('is empty for no PRs', () => {
    expect(groupPrsByCategory([], order)).toEqual([])
    expect(groupPrsByCategory(undefined, order)).toEqual([])
  })
})

describe('sessionStrip', () => {
  // matchesAthlete reads `mainTraining` (getTargets), not an `athletes` field.
  const sessions = {
    '2026-08-01': [{ id: 's1', mainTraining: ['Ana'] }],
    '2026-08-02': [{ id: 's2', mainTraining: ['Ana'] }],
    '2026-08-03': [{ id: 's3', mainTraining: ['Ana'] }],
    '2026-08-04': [{ id: 's4', mainTraining: ['Ana'] }], // today
    '2026-08-06': [{ id: 's5', mainTraining: 'Ana' }], // legacy string form
    '2026-08-09': [{ id: 's6', mainTraining: ['Ana'] }],
    '2026-10-01': [{ id: 's7', mainTraining: ['Ana'] }], // outside the 30-day window
  }

  it('takes the last two up to today plus the next one', () => {
    const out = sessionStrip(sessions, 'Ana', '2026-08-04')
    expect(out.map(x => x.session.id)).toEqual(['s3', 's4', 's5'])
  })

  it('drops a future session beyond the 30-day window', () => {
    const out = sessionStrip({ '2026-10-01': sessions['2026-10-01'] }, 'Ana', '2026-08-04')
    expect(out).toEqual([])
  })

  it('excludes sessions the athlete is not on', () => {
    const out = sessionStrip(
      { '2026-08-04': [{ id: 'x', mainTraining: ['Bruno'] }] },
      'Ana',
      '2026-08-04',
    )
    expect(out).toEqual([])
  })

  it('is empty without an athlete or without sessions', () => {
    expect(sessionStrip(sessions, '', '2026-08-04')).toEqual([])
    expect(sessionStrip(null, 'Ana', '2026-08-04')).toEqual([])
  })
})

// ── #160/plans/76 — the grade + ficha helpers ──────────────────────────────────

describe('agoLabel', () => {
  it('names today and yesterday', () => {
    expect(agoLabel(0)).toBe('hoje')
    expect(agoLabel(1)).toBe('ontem')
  })
  it('is days under a week, weeks from a week on', () => {
    expect(agoLabel(6)).toBe('6 d')
    expect(agoLabel(7)).toBe('1 sem')
    expect(agoLabel(21)).toBe('3 sem')
  })
  it('never goes negative — a same-day boundary reads as hoje', () => {
    expect(agoLabel(-2)).toBe('hoje')
  })
})

describe('nextSessionGroups', () => {
  const athletes = [
    { id: 'a1', name: 'Ana' },
    { id: 'a2', name: 'Bruno' },
    { id: 'a3', name: 'Carla' },
    { id: 'a4', name: 'Diego' },
  ]
  const sessions = {
    '2026-08-04': [{ id: 's1', mainTraining: ['Ana'] }], // today
    '2026-08-05': [{ id: 's2', mainTraining: ['Bruno'] }], // tomorrow
    '2026-08-10': [{ id: 's3', mainTraining: ['Carla'] }], // a dated group
    '2026-07-01': [{ id: 's0', mainTraining: ['Diego'] }], // in the past — doesn't count
  }
  const events = { '2026-08-04': [{ sessionId: 's1', time: '18:00' }] }
  const todayKey = '2026-08-04'

  it('groups Hoje/Amanhã/a dated group, and Diego (no future session) lands in Sem sessão marcada', () => {
    const groups = nextSessionGroups(sessions, athletes, events, todayKey)
    expect(groups.map(g => g.label)).toEqual([
      'Hoje',
      'Amanhã',
      expect.stringContaining('10/08'),
      'Sem sessão marcada',
    ])
    expect(groups[0].athletes.map(a => a.name)).toEqual(['Ana'])
    expect(groups[3].athletes.map(a => a.name)).toEqual(['Diego'])
  })

  it('appends the event time only when one links the session', () => {
    const groups = nextSessionGroups(sessions, athletes, events, todayKey)
    expect(groups[0].time).toBe('18:00')
    expect(groups[1].time).toBeNull()
  })

  it('sorts athletes A→Z within a group', () => {
    const twoUp = {
      '2026-08-04': [
        { id: 's1', mainTraining: ['Zeca'] },
        { id: 's2', mainTraining: ['Ana'] },
      ],
    }
    const two = [
      { id: 'z', name: 'Zeca' },
      { id: 'a', name: 'Ana' },
    ]
    const groups = nextSessionGroups(twoUp, two, {}, todayKey)
    expect(groups[0].athletes.map(a => a.name)).toEqual(['Ana', 'Zeca'])
  })

  it('omits the no-session group entirely when everyone has one', () => {
    const groups = nextSessionGroups(sessions, athletes.slice(0, 3), {}, todayKey)
    expect(groups.find(g => g.label === 'Sem sessão marcada')).toBeUndefined()
  })
})

describe('lastSessionSignal', () => {
  const results = [
    { athleteId: 'a1', date: '2026-08-03' },
    { athleteId: 'a1', date: '2026-07-01' },
  ]
  it('is the newest row, however it was logged', () => {
    expect(lastSessionSignal(results, 'a1', '2026-08-04')).toEqual({ days: 1, label: 'ontem' })
  })
  it('is null when the athlete has never logged anything', () => {
    expect(lastSessionSignal(results, 'a2', '2026-08-04')).toBeNull()
  })
  it('reads hoje for a same-day row', () => {
    expect(
      lastSessionSignal([{ athleteId: 'a1', date: '2026-08-04' }], 'a1', '2026-08-04'),
    ).toEqual({
      days: 0,
      label: 'hoje',
    })
  })
})

describe('adherence', () => {
  const athlete = { id: 'a1', name: 'Bruna' }
  const todayKey = '2026-08-04'

  it('is null with nothing prescribed in the current 30-day window', () => {
    expect(adherence({}, [], athlete, todayKey)).toBeNull()
  })

  it('is % of prescribed WOD blocks logged, flat with no prior-window data to compare', () => {
    const sessions = {
      '2026-08-01': [{ public: true, mainTraining: ['Bruna'], blocks: [{ type: 'For Time' }] }],
      '2026-08-02': [{ public: true, mainTraining: ['Bruna'], blocks: [{ type: 'AMRAP' }] }],
    }
    const results = [
      {
        athleteId: 'a1',
        date: '2026-08-01',
        presence: 'Presente',
        blocks: [{ blockType: 'For Time' }],
      },
    ]
    expect(adherence(sessions, results, athlete, todayKey)).toEqual({ pct: 50, trend: 'flat' })
  })

  it('trends up when this window beats the prior one, down when it falls behind', () => {
    const upSessions = {
      '2026-08-01': [{ public: true, mainTraining: ['Bruna'], blocks: [{ type: 'For Time' }] }],
      '2026-06-10': [{ public: true, mainTraining: ['Bruna'], blocks: [{ type: 'For Time' }] }],
    }
    const upResults = [
      {
        athleteId: 'a1',
        date: '2026-08-01',
        presence: 'Presente',
        blocks: [{ blockType: 'For Time' }],
      },
    ]
    expect(adherence(upSessions, upResults, athlete, todayKey).trend).toBe('up')

    const downResults = [
      {
        athleteId: 'a1',
        date: '2026-06-10',
        presence: 'Presente',
        blocks: [{ blockType: 'For Time' }],
      },
    ]
    expect(adherence(upSessions, downResults, athlete, todayKey).trend).toBe('down')
  })
})

describe('daysSinceNote', () => {
  it('is days since the newest note', () => {
    const notes = [{ date: '2026-07-20' }, { date: '2026-07-25' }]
    expect(daysSinceNote(notes, '2026-08-04')).toEqual({ days: 10, label: '1 sem' })
  })
  it('is null with no notes yet', () => {
    expect(daysSinceNote([], '2026-08-04')).toBeNull()
    expect(daysSinceNote(undefined, '2026-08-04')).toBeNull()
  })
})

describe('goalSignal', () => {
  const todayKey = '2026-08-04'

  it('is null once every goal is complete', () => {
    expect(goalSignal([{ completedSessions: 10, totalSessions: 10 }], todayKey)).toBeNull()
    expect(goalSignal([], todayKey)).toBeNull()
  })

  it('picks the OPEN goal nearest completion', () => {
    const goals = [
      { id: 'low', completedSessions: 2, totalSessions: 10 },
      { id: 'high', completedSessions: 8, totalSessions: 10 },
      { id: 'done', completedSessions: 10, totalSessions: 10 },
    ]
    expect(goalSignal(goals, todayKey).goal.id).toBe('high')
  })

  it('flags stalled when the newest hit milestone is more than 21 days old', () => {
    const goal = {
      completedSessions: 4,
      totalSessions: 10,
      milestones: [{ hit: true, hitDate: '2026-06-01' }],
    }
    expect(goalSignal([goal], todayKey)).toEqual({ goal, pct: 40, stalledWeeks: 9 })
  })

  it('is not stalled inside the 21-day window, and null (not stalled) with no hit milestone', () => {
    const recent = {
      completedSessions: 4,
      totalSessions: 10,
      milestones: [{ hit: true, hitDate: '2026-08-01' }],
    }
    expect(goalSignal([recent], todayKey).stalledWeeks).toBeNull()

    const noHits = {
      completedSessions: 4,
      totalSessions: 10,
      milestones: [{ hit: false, pct: 50 }],
    }
    expect(goalSignal([noHits], todayKey).stalledWeeks).toBeNull()
  })
})

describe('presenceGrid', () => {
  const athlete = { id: 'a1', name: 'Ana' }
  // Anchored on the Sunday of whatever week 2026-08-04 falls in, so "today" is
  // provably the first day of the grid's last week regardless of the real
  // calendar — every other day that week is unambiguously in the future.
  const sunday = new Date('2026-08-04T12:00:00')
  sunday.setDate(sunday.getDate() - sunday.getDay())
  const p = n => String(n).padStart(2, '0')
  const toKey = d => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  const todayKey = toKey(sunday)
  const addD = (key, delta) => {
    const d = new Date(key + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    return toKey(d)
  }
  const yesterday = addD(todayKey, -1)
  const tomorrow = addD(todayKey, 1)

  const sessions = {
    [yesterday]: [{ mainTraining: ['Ana'] }],
    [todayKey]: [{ mainTraining: ['Ana'] }],
    [tomorrow]: [{ mainTraining: ['Ana'] }],
  }
  const results = [{ athleteId: 'a1', date: yesterday, presence: 'Presente' }]

  it('returns 4 weeks of 7 days, Sunday-start, the last starting on todayKey', () => {
    const weeks = presenceGrid(sessions, results, athlete, todayKey)
    expect(weeks).toHaveLength(4)
    weeks.forEach(week => {
      expect(week).toHaveLength(7)
      expect(new Date(week[0].date + 'T12:00:00').getDay()).toBe(0)
    })
    expect(weeks[3][0].date).toBe(todayKey)
  })

  it('is presente for a logged day, unlogged for an assigned day with no result, and none for a future day even if assigned', () => {
    const weeks = presenceGrid(sessions, results, athlete, todayKey)
    const all = weeks.flat()
    expect(all.find(c => c.date === yesterday).state).toBe('presente')
    expect(all.find(c => c.date === todayKey).state).toBe('unlogged')
    expect(all.find(c => c.date === tomorrow).state).toBe('none')
  })

  it('is none with no session assigned that day', () => {
    const weeks = presenceGrid({}, [], athlete, todayKey)
    expect(weeks.flat().every(c => c.state === 'none')).toBe(true)
  })
})

describe('sinceLastNote', () => {
  const athlete = { id: 'a1', name: 'Ana' }
  const prs = [
    {
      id: 'p1',
      name: 'Back Squat',
      type: 'load',
      unit: 'kg',
      results: [
        { value: 100, date: '2026-07-10' },
        { value: 110, date: '2026-08-01' },
      ],
    },
  ]
  const goals = [
    {
      id: 'g1',
      name: 'Base',
      totalSessions: 10,
      completedSessions: 5,
      milestones: [{ label: 'M1', pct: 50, hit: true, hitDate: '2026-08-02' }],
    },
  ]
  const sessions = { '2026-07-25': [{ id: 's1', mainTraining: ['Ana'] }] }
  const results = []
  const todayKey = '2026-08-04'

  it('has no anchor and an empty list with no notes yet', () => {
    expect(sinceLastNote(athlete, [], prs, goals, sessions, results, todayKey)).toEqual({
      anchorDate: null,
      items: [],
    })
  })

  it('anchors on the newest note and lists PR/milestone events plus unlogged assigned sessions after it', () => {
    const notes = [{ id: 'n1', date: '2026-07-15', text: 'x' }]
    const out = sinceLastNote(athlete, notes, prs, goals, sessions, results, todayKey)
    expect(out.anchorDate).toBe('2026-07-15')
    const kinds = out.items.map(i => i.kind)
    expect(kinds).toContain('event')
    expect(kinds).toContain('missed')
  })

  it('excludes anything dated at or before the anchor', () => {
    const notes = [{ id: 'n1', date: '2026-08-03', text: 'x' }]
    const out = sinceLastNote(athlete, notes, prs, goals, sessions, results, todayKey)
    expect(out.items).toEqual([])
  })
})
