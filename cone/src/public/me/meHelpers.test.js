import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  initials, getTargets, matchesAthlete, prValLabel, unitLabel,
  calcStreak, calcMaxStreak, calcBlockStats, buildEvents, catToInputType, computeDelta,
  DIST_TYPES, PR_SKIP,
} from './meHelpers.js'

// me.html's helpers had zero tests before #52 — they lived as module-level functions
// inside a 907-line component. calcStreak in particular is the one the retired
// athletes.html got catastrophically wrong (it counted training *dates* without ever
// checking day-adjacency, then called the total "weeks"), so it's pinned hard here.

const R = (date, presence = 'Presente', blocks = []) => ({ date, presence, blocks })

describe('initials', () => {
  it('takes the first two words', () => {
    expect(initials('Camila Medrado')).toBe('CM')
    expect(initials('Arthur')).toBe('A')
    expect(initials('  ana  paula  souza ')).toBe('AP')
  })
})

describe('getTargets / matchesAthlete', () => {
  it('coerces a legacy bare-string mainTraining into an array', () => {
    expect(getTargets({ mainTraining: 'Bruna' })).toEqual(['Bruna'])
    expect(getTargets({ mainTraining: ['Bruna', 'Arthur'] })).toEqual(['Bruna', 'Arthur'])
    expect(getTargets({})).toEqual([])
    expect(getTargets(null)).toEqual([])
  })
  it('matches by name', () => {
    expect(matchesAthlete({ mainTraining: ['Bruna'] }, 'Bruna')).toBe(true)
    expect(matchesAthlete({ mainTraining: ['Bruna'] }, 'Arthur')).toBe(false)
    expect(matchesAthlete({}, 'Bruna')).toBe(false)
  })
})

describe('prValLabel / unitLabel', () => {
  it('labels by PR type', () => {
    expect(prValLabel('80', { type: 'load', unit: 'kg' })).toBe('80 kg')
    expect(prValLabel('80', { type: 'load' })).toBe('80 kg')
    expect(prValLabel('80', { type: 'load', unit: 'lb' })).toBe('80 lb')
    expect(prValLabel('20', { type: 'reps' })).toBe('20 reps')
    expect(prValLabel('3:21', { type: 'time' })).toBe('3:21')
  })
  it('maps a unit to its display label', () => {
    expect(unitLabel('time')).toBe('mm:ss')
    expect(unitLabel('reps')).toBe('reps')
    expect(unitLabel('m')).toBe('m')
    expect(unitLabel('kg')).toBe('kg')
  })
})

describe('calcStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-12T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('counts consecutive CALENDAR days back from today', () => {
    expect(calcStreak([R('2026-07-12'), R('2026-07-11'), R('2026-07-10')])).toBe(3)
  })

  it('still counts when the last session was yesterday (today is not over yet)', () => {
    expect(calcStreak([R('2026-07-11'), R('2026-07-10')])).toBe(2)
  })

  it('is zero once two days have been missed', () => {
    expect(calcStreak([R('2026-07-09'), R('2026-07-08')])).toBe(0)
  })

  it('BREAKS on a gap — the bug that made athletes.html report a 12-day streak for someone who trained once a month', () => {
    const monthly = [R('2026-07-12'), R('2026-06-12'), R('2026-05-12'), R('2026-04-12')]
    expect(calcStreak(monthly)).toBe(1)
  })

  it('counts a day once even if it holds several results', () => {
    expect(calcStreak([R('2026-07-12'), R('2026-07-12'), R('2026-07-11')])).toBe(2)
  })

  it('is zero with no sessions', () => {
    expect(calcStreak([])).toBe(0)
  })
})

describe('calcMaxStreak', () => {
  it('finds the longest run of consecutive days anywhere in history', () => {
    const rs = [
      R('2026-01-01'), R('2026-01-02'), R('2026-01-03'), // 3
      R('2026-02-10'),                                    // 1
      R('2026-03-01'), R('2026-03-02'),                   // 2
    ]
    expect(calcMaxStreak(rs)).toBe(3)
  })
  it('handles a single session and none at all', () => {
    expect(calcMaxStreak([R('2026-01-01')])).toBe(1)
    expect(calcMaxStreak([])).toBe(0)
  })
})

describe('calcBlockStats', () => {
  const FORCA = 'Força'
  const sessions = {
    '2026-07-06': [{ public: true, mainTraining: ['Bruna'], blocks: [{ type: FORCA }, { type: 'For Time' }] }],
    '2026-07-07': [{ public: true, mainTraining: ['Bruna'], blocks: [{ type: FORCA }] }],
    '2026-07-08': [{ public: true, mainTraining: ['Arthur'], blocks: [{ type: FORCA }] }],  // not hers
    '2026-07-09': [{ public: false, mainTraining: ['Bruna'], blocks: [{ type: FORCA }] }],  // hidden
    '2026-06-01': [{ public: true, mainTraining: ['Bruna'], blocks: [{ type: FORCA }] }],   // out of window
  }
  const present = [
    R('2026-07-06', 'Presente', [{ blockType: 'For Time' }]),
    R('2026-06-01', 'Presente', [{ blockType: FORCA }]),  // out of window
  ]

  it('counts only in-window, public, assigned sessions as planned', () => {
    const { planned } = calcBlockStats(sessions, present, 'Bruna', [FORCA, 'For Time'], '2026-07-01', '2026-07-31')
    expect(planned[FORCA]).toBe(2)      // the 8th is Arthur's, the 9th is hidden, June is out
    expect(planned['For Time']).toBe(1)
  })

  it('counts executed blocks from results inside the same window', () => {
    const { executed } = calcBlockStats(sessions, present, 'Bruna', [FORCA, 'For Time'], '2026-07-01', '2026-07-31')
    expect(executed['For Time']).toBe(1)
    expect(executed[FORCA]).toBe(0)     // June's result is out of window
  })
})

describe('buildEvents', () => {
  it('reports a load PR improvement, newest first, and ignores a regression', () => {
    const prs = [
      { name: 'Back Squat', type: 'load', unit: 'kg', results: [
        { value: '90', date: '2026-07-01' }, { value: '100', date: '2026-07-05' },
      ]},
      { name: 'Deadlift', type: 'load', unit: 'kg', results: [
        { value: '140', date: '2026-07-02' }, { value: '130', date: '2026-07-06' },  // went down
      ]},
    ]
    const evs = buildEvents(prs, [])
    expect(evs).toHaveLength(1)
    expect(evs[0].title).toContain('Back Squat')
    expect(evs[0].sub).toContain('+10 kg')
    expect(evs[0].val).toBe('100 kg')
    expect(evs[0].tone).toBe('good')
  })

  it('treats a FASTER time as the improvement', () => {
    const prs = [{ name: 'Fran', type: 'time', results: [
      { value: '5:00', date: '2026-07-01' }, { value: '4:30', date: '2026-07-05' },
    ]}]
    const evs = buildEvents(prs, [])
    expect(evs).toHaveLength(1)
    expect(evs[0].sub).toContain('-00:30')   // canonical fmtSecs pads the minutes
  })

  it('needs two results to have anything to compare', () => {
    expect(buildEvents([{ name: 'Snatch', type: 'load', results: [{ value: '60', date: '2026-07-01' }] }], [])).toEqual([])
  })

  it('includes milestones that were hit, and caps the list at 5', () => {
    const goals = [{ name: 'Primeiro Muscle-up', milestones: [
      { label: 'Kipping', pct: 30, hit: true, hitDate: '2026-07-04' },
      { label: 'Transicao', pct: 60, hit: false },
    ]}]
    const evs = buildEvents([], goals)
    expect(evs).toHaveLength(1)
    expect(evs[0].title).toContain('Primeiro Muscle-up')
    expect(evs[0].val).toBe('1/2 marcos')

    const many = Array.from({ length: 8 }, (_, i) => ({
      name: 'G' + i,
      milestones: [{ label: 'm', pct: 10, hit: true, hitDate: `2026-07-0${(i % 8) + 1}` }],
    }))
    expect(buildEvents([], many)).toHaveLength(5)
  })
})

describe('catToInputType', () => {
  it('picks the input from the registry category', () => {
    expect(catToInputType(['Força'])).toBe('load')
    expect(catToInputType(['LPO'])).toBe('load')
    expect(catToInputType(['Cardio'])).toBe('dist')
    expect(catToInputType(['Skill'])).toBe('reps')
    expect(catToInputType(['Benchmark'])).toBe('time')
    expect(catToInputType([])).toBe('load')
    expect(catToInputType(null)).toBe('load')
  })
  it('lets Benchmark win over a strength category', () => {
    expect(catToInputType(['Força', 'Benchmark'])).toBe('time')
  })
})

describe('computeDelta', () => {
  const loadPr = { type: 'load', unit: 'kg', results: [{ value: '100', date: '2026-07-01' }] }
  const timePr = { type: 'time', results: [{ value: '5:00', date: '2026-07-01' }] }

  it('says nothing for an empty input', () => {
    expect(computeDelta('', loadPr, 'kg')).toEqual({ txt: '', tone: 'none' })
    expect(computeDelta('   ', loadPr, 'kg').tone).toBe('none')
  })

  it('celebrates a first-ever record', () => {
    expect(computeDelta('80', null, 'kg').tone).toBe('first')
  })

  it('grades a load against the best', () => {
    expect(computeDelta('110', loadPr, 'kg')).toMatchObject({ tone: 'good' })
    expect(computeDelta('110', loadPr, 'kg').txt).toContain('+10 kg')
    expect(computeDelta('90', loadPr, 'kg')).toMatchObject({ tone: 'bad' })
    expect(computeDelta('100', loadPr, 'kg').tone).toBe('even')
  })

  it('grades a time the other way round — lower is better', () => {
    expect(computeDelta('4:30', timePr, 'time')).toMatchObject({ tone: 'good' })
    expect(computeDelta('5:30', timePr, 'time')).toMatchObject({ tone: 'bad' })
    expect(computeDelta('5:00', timePr, 'time').tone).toBe('even')
  })

  it('stays silent on an unparseable time rather than inventing a delta', () => {
    expect(computeDelta('abc', timePr, 'time')).toEqual({ txt: '', tone: 'none' })
  })
})

describe('constants', () => {
  it('DIST_TYPES holds the non-WOD block types', () => {
    expect(DIST_TYPES).toContain('Força')
    expect(DIST_TYPES).not.toContain('For Time')
  })
  it('PR_SKIP excludes WOD formats and filler from the PR board', () => {
    expect(PR_SKIP.has('For Time')).toBe(true)
    expect(PR_SKIP.has('AMRAP')).toBe(true)
    expect(PR_SKIP.has('Aquecimento')).toBe(true)
    expect(PR_SKIP.has('Força')).toBe(false)
  })
})
