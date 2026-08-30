import { describe, it, expect } from 'vitest'
import {
  getWeeksInMonth,
  weekLabel,
  calcSessionKPIs,
  isBlockResolved,
  saveGate,
  resultSummary,
  topScale,
  sessionProgress,
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

// ── #157 · the save gate ──────────────────────────────────────────────────────
// Tested as a pure predicate rather than through the component, per plans/80: the gate
// is the whole reason #157 exists, and "does Salvar light up" must not depend on
// rendering a form.
describe('isBlockResolved', () => {
  it('is false for an untouched block — scale and RPE start unselected on purpose (#61a)', () => {
    expect(isBlockResolved({ scale: null, rpe: null })).toBe(false)
  })

  it('needs BOTH scale and RPE, not either', () => {
    expect(isBlockResolved({ scale: 'RX', rpe: null })).toBe(false)
    expect(isBlockResolved({ scale: null, rpe: 8 })).toBe(false)
    expect(isBlockResolved({ scale: 'RX', rpe: 8 })).toBe(true)
  })

  it('is true for a skipped block, which carries no scale or RPE at all', () => {
    expect(isBlockResolved({ skipped: true, scale: null, rpe: null })).toBe(true)
  })
})

describe('saveGate', () => {
  it('lets an absent athlete save with nothing scored', () => {
    const g = saveGate('Ausente', [{ blockType: 'For Time' }])
    expect(g.canSave).toBe(true)
    expect(g.missing).toEqual([])
  })

  it('blocks a 3-WOD session until every block is complete OR skipped', () => {
    const logs = [
      { blockType: 'For Time', blockLabel: 'Fran', scale: 'RX', rpe: 8 },
      { blockType: 'EMOM', blockLabel: 'EMOM 12', skipped: true },
      { blockType: 'Força', blockLabel: 'Back Squat' },
    ]
    const g = saveGate('Presente', logs)
    expect(g.canSave).toBe(false)
    expect(g.missing).toEqual(['Back Squat'])
  })

  it('opens once the last block is resolved — by skipping, not only by scoring', () => {
    const logs = [
      { blockType: 'For Time', blockLabel: 'Fran', scale: 'RX', rpe: 8 },
      { blockType: 'Força', blockLabel: 'Back Squat', skipped: true },
    ]
    expect(saveGate('Presente', logs).canSave).toBe(true)
  })

  it('names the block by its type when it carries no custom label', () => {
    expect(saveGate('Presente', [{ blockType: 'AMRAP' }]).missing).toEqual(['AMRAP'])
  })

  it('saves a session with no WOD blocks at all', () => {
    expect(saveGate('Presente', []).canSave).toBe(true)
  })
})

// ── row read-back ─────────────────────────────────────────────────────────────
describe('resultSummary', () => {
  it('reports the presence word for an absent athlete', () => {
    expect(resultSummary(R('a1', '2026-07-01', 'Ausente'))).toBe('Ausente')
  })

  it('renders canonical perfStr — a capped For Time reads as DNF, never as a dash', () => {
    const r = R('a1', '2026-07-01', 'Presente', [
      { blockType: 'For Time', perfRounds: '3', rpe: 9, scale: 'RX' },
    ])
    expect(resultSummary(r)).toBe('3 rds (DNF) · RPE 9')
  })

  it('counts skipped blocks separately and never averages their (absent) RPE', () => {
    const r = R('a1', '2026-07-01', 'Presente', [
      { blockType: 'For Time', perfTime: '4:12', rpe: 8, scale: 'RX' },
      { blockType: 'EMOM', skipped: true },
    ])
    expect(resultSummary(r)).toBe('4:12 · RPE 8 · 1 não fez')
  })
})

describe('topScale', () => {
  it('takes the first real scale, skipping a skipped block', () => {
    const r = R('a1', '2026-07-01', 'Presente', [
      { skipped: true, scale: null },
      { scale: 'Inter' },
    ])
    expect(topScale(r)).toBe('Inter')
  })

  it('is null when nothing was scaled', () => {
    expect(topScale(R('a1', '2026-07-01', 'Presente', [{ rpe: 5 }]))).toBeNull()
  })
})

describe('sessionProgress', () => {
  const sess = { id: 's1' }

  it('counts an Ausente row as progress — it IS a decision the coach recorded', () => {
    const results = [
      { date: '2026-07-01', sessionId: 's1', athleteId: 'a1', presence: 'Presente' },
      { date: '2026-07-01', sessionId: 's1', athleteId: 'a2', presence: 'Ausente' },
    ]
    expect(sessionProgress(results, '2026-07-01', sess, 4)).toEqual({
      logged: 2,
      total: 4,
      pct: 50,
    })
  })

  it('does not count another session on the same day', () => {
    const results = [{ date: '2026-07-01', sessionId: 's2', athleteId: 'a1' }]
    expect(sessionProgress(results, '2026-07-01', sess, 4).logged).toBe(0)
  })

  it('is 0% rather than NaN with no athletes', () => {
    expect(sessionProgress([], '2026-07-01', sess, 0).pct).toBe(0)
  })
})

describe('calcSessionKPIs · #157', () => {
  it('drops skipped blocks from the class RPE and the scale distribution', () => {
    const results = [
      R('a1', '2026-07-01', 'Presente', [
        { rpe: 6, scale: 'RX' },
        { skipped: true, rpe: null, scale: null },
      ]),
    ]
    const k = calcSessionKPIs('2026-07-01', results)
    expect(k.avgRpe).toBe('6.0')
    expect(k.scaleTotal).toBe(1)
  })

  it('scopes to one session when a sessionId is given', () => {
    const results = [
      { ...R('a1', '2026-07-01', 'Presente', [{ rpe: 6, scale: 'RX' }]), sessionId: 's1' },
      { ...R('a2', '2026-07-01', 'Presente', [{ rpe: 10, scale: 'SC' }]), sessionId: 's2' },
    ]
    expect(calcSessionKPIs('2026-07-01', results, 's1').avgRpe).toBe('6.0')
    expect(calcSessionKPIs('2026-07-01', results, 's2').avgRpe).toBe('10.0')
    expect(calcSessionKPIs('2026-07-01', results).avgRpe).toBe('8.0') // unscoped: both
  })
})
