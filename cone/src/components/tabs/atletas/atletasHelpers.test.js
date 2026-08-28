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
