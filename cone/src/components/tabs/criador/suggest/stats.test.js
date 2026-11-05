import { describe, test, expect } from 'vitest'
import { SEM_BOX } from '../../../../public/lib/sessions.js'
import { buildRegistryIndex } from '../../../../public/lib/registry.js'
import { addDays, buildHistory, weekdayOf } from './history.js'
import {
  baseLift,
  blockParams,
  buildContext,
  canonicalOrder,
  familyScores,
  goalRatio,
  isStructuralName,
  liftRuns,
  mainLiftOf,
  median,
  pairRule,
  poolFor,
  presence,
  recency,
  registryMisses,
  roundReps,
  snap5,
  volumeFor,
} from './stats.js'
import { REGISTRY, blob, session, standardBox } from './testFixtures.js'

const index = buildRegistryIndex(REGISTRY)
const ctxFor = (sessions, date, { lookAhead = false } = {}) =>
  buildContext(buildHistory({ sessions, scope: SEM_BOX, date, lookAhead }), {
    index,
    date,
    dow: weekdayOf(date),
  })

describe('numerics', () => {
  test('snap5 puts any %RM on the 0/5 grid (87 → 85, 92 → 90)', () => {
    expect([87, 92, 91, 85, 92.5].map(snap5)).toEqual([85, 90, 90, 85, 95])
  })
  test('median of an even count averages the middle pair', () => {
    expect(median([95, 90, 90, 75])).toBe(90)
    expect(median([])).toBe(null)
  })
  test('recency lowers a movement used yesterday to 0.13 — it never removes it', () => {
    expect(recency(1)).toBeCloseTo(0.133, 3)
    expect(recency(14)).toBeCloseTo(0.865, 3)
    expect(recency(1)).toBeGreaterThan(0)
  })
  test('computed reps round to the numbers the user writes', () => {
    expect(roundReps(16.7)).toBe(15)
    expect(roundReps(10)).toBe(10)
    expect(roundReps(7)).toBe(6)
    expect(roundReps(1.25)).toBe(1)
  })
})

describe('presence', () => {
  test('a type joins a weekday when it is on at least half of its sessions', () => {
    const sessions = blob([
      session('2026-09-07', "Core\n15 V-up\n\nCardio\n40' Run"),
      session('2026-09-14', 'Core\n15 V-up\n\nSkill\n5 Pull-up'),
      session('2026-09-21', "Cardio\n40' Run"),
    ])
    const p = presence(ctxFor(sessions, '2026-09-28'))
    expect(p.n).toBe(3)
    expect(p.types).toEqual(expect.arrayContaining(['Core', 'Cardio']))
    expect(p.types).not.toContain('Skill')
  })

  test('a weekday whose WOD format varies still gets its most common WOD type', () => {
    const sessions = blob([
      session('2026-09-03', 'For Time\n800m Run'),
      session('2026-09-10', "AMRAP 12'\n10 Burpee"),
      session('2026-09-17', 'For Time\n800m Run'),
      session('2026-09-24', 'Skill\n5 Pull-up'),
      session('2026-08-27', "EMOM 10'\n10 Burpee"),
    ])
    const p = presence(ctxFor(sessions, '2026-10-01'))
    // For Time is on 2 of 5 Thursdays, but 4 of 5 hold some WOD.
    expect(p.wodFallback).toMatchObject({ type: 'For Time', withWod: 4, typeCount: 2 })
    expect(p.types).toContain('For Time')
  })
})

describe('canonicalOrder', () => {
  // Strength days whose Acessórios sits before or after LPO, from a given date on.
  const day = (date, accFirst) =>
    session(
      date,
      [
        'Core\n15 V-up',
        accFirst ? 'Acessórios\n8 Russian Row' : null,
        'Força\n3x3 Back Squat 70/80/90%',
        'LPO\n3 Power Snatch 60/65/70%',
        accFirst ? null : 'Acessórios\n8 Russian Row',
        'For Time\n400m Run',
        "Cardio\n40' Run",
      ]
        .filter(Boolean)
        .join('\n\n'),
    )
  const weeks = (from, n, accFirst) =>
    Array.from({ length: n }, (_, i) => [
      day(addDays(from, 7 * i), accFirst),
      day(addDays(from, 7 * i + 2), accFirst),
    ]).flat()

  test('one order for the box, from the majority of the last 6 weeks of strength days', () => {
    const sessions = blob(weeks('2026-08-03', 6, false))
    const { order, seen, basis } = canonicalOrder(ctxFor(sessions, '2026-09-14'))
    expect(basis).toBe('strength')
    expect(order.filter(t => seen.includes(t))).toEqual([
      'Core',
      'Força',
      'LPO',
      'Acessórios',
      'For Time',
      'Cardio',
    ])
  })

  test('a one-off move does not change it; a durable one does once it holds the window', () => {
    const before = weeks('2026-07-06', 6, true) // Acessórios before Força for six weeks…
    const oneOff = [day('2026-08-17', false)] // …then once after LPO
    const ctxA = ctxFor(blob([...before, ...oneOff]), '2026-08-24')
    expect(canonicalOrder(ctxA).order.indexOf('Acessórios')).toBeLessThan(
      canonicalOrder(ctxA).order.indexOf('Força'),
    )
    const durable = weeks('2026-08-17', 4, false) // four weeks after LPO: 8 of the 12 days
    const ctxB = ctxFor(blob([...before, ...durable]), '2026-09-14')
    const ob = canonicalOrder(ctxB).order
    expect(ob.indexOf('Acessórios')).toBeGreaterThan(ob.indexOf('LPO'))
  })

  test('every day of a week gets the same order — the window is anchored on the week', () => {
    const sessions = blob([...weeks('2026-07-06', 5, true), ...weeks('2026-08-10', 2, false)])
    const orders = ['2026-08-24', '2026-08-26', '2026-08-28'].map(
      d => canonicalOrder(ctxFor(sessions, d, { lookAhead: true })).order,
    )
    expect(orders[1]).toEqual(orders[0])
    expect(orders[2]).toEqual(orders[0])
  })

  test('a type the box never used is placed, but cannot reorder the ones it did', () => {
    const sessions = blob(weeks('2026-08-03', 6, false))
    const { order, seen } = canonicalOrder(ctxFor(sessions, '2026-09-14'))
    expect(order).toContain('Mobilidade')
    expect(seen).not.toContain('Mobilidade')
    expect(order.filter(t => seen.includes(t))).toEqual(
      seen.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    )
  })
})

describe('blockParams', () => {
  test("from the EXACT type: an EMOM's minutes never become a For Time cap", () => {
    const sessions = blob(
      ['2026-09-07', '2026-09-14', '2026-09-21'].map(d =>
        session(
          d,
          "EMOM\n5 rounds A cada 3'\n10 Burpee\n\nFor Time\n3 rounds Cap 15'\n400m Run\n10 Burpee",
        ),
      ),
    )
    const ctx = ctxFor(sessions, '2026-09-28')
    expect(blockParams(ctx, 'For Time')).toMatchObject({ rounds: 3, duration: 15 })
    expect(blockParams(ctx, 'EMOM')).toMatchObject({
      rounds: 5,
      duration: 0,
      timing: { every: 180 },
    })
  })

  test('an interval written as a note before #228 is read through the parser', () => {
    const sessions = blob(
      ['2026-09-07', '2026-09-14'].map(d =>
        session(d, 'Core\n3 rounds\n15 V-up\nObs: 40" on 20" off 3 Sets'),
      ),
    )
    expect(blockParams(ctxFor(sessions, '2026-09-21'), 'Core').timing).toEqual({
      every: 60,
      work: 40,
    })
  })

  test('an interval seen once each is no mode', () => {
    const sessions = blob([
      session('2026-09-07', "LPO\n3 rounds A cada 2'\n3 Power Snatch 60/65/70%"),
      session('2026-09-14', 'LPO\n3 rounds A cada 1\'30"\n3 Power Snatch 60/65/70%'),
    ])
    expect(blockParams(ctxFor(sessions, '2026-09-21'), 'LPO').timing).toBe(null)
  })
})

describe('volumeFor', () => {
  const wod = (d, line, rounds = 3) =>
    session(d, `For Time\n${rounds ? `${rounds} rounds ` : ''}Cap 15'\n${line}\n400m Run`)

  test('the median per round, with at least two per-round observations', () => {
    const sessions = blob([
      wod('2026-09-07', '10 Burpee'),
      wod('2026-09-14', '15 Burpee'),
      wod('2026-09-21', '12 Burpee'),
    ])
    expect(
      volumeFor(ctxFor(sessions, '2026-09-28'), 'Burpee', 'For Time', { rounds: 3 }),
    ).toMatchObject({
      kind: 'reps',
      n: 12,
      rule: 'median',
      obs: 3,
    })
  })

  test('else a chipper total ÷ rounds, rounded to the usual numbers (50 ÷ 3 → 15)', () => {
    const sessions = blob([wod('2026-09-07', '50 Double Under', 0)])
    expect(
      volumeFor(ctxFor(sessions, '2026-09-14'), 'Double Under', 'For Time', { rounds: 3 }),
    ).toMatchObject({
      n: 15,
      rule: 'chipper',
      total: 50,
      rounds: 3,
    })
  })

  test('a distance snaps to the distances this movement has been given', () => {
    const sessions = blob([wod('2026-09-07', '10 Burpee'), wod('2026-09-14', '10 Burpee')])
    const v = volumeFor(ctxFor(sessions, '2026-09-21'), 'Run', 'For Time', { rounds: 3 })
    expect(v).toMatchObject({ kind: 'dist', n: 400, unit: 'm' })
  })

  test('metres and calories are never averaged together', () => {
    const row = (d, line) => session(d, `For Time\n3 rounds Cap 15'\n${line}\n10 Burpee`)
    const sessions = blob([
      row('2026-09-07', '12cal Remo'),
      row('2026-09-14', '12cal Remo'),
      row('2026-09-21', '400m Remo'),
      row('2026-09-28', '500m Remo'),
    ])
    const v = volumeFor(ctxFor(sessions, '2026-10-05'), 'Remo (Ergômetro)', 'For Time', {
      rounds: 3,
    })
    // A median over [12, 12, 400, 500] would be 206 — whichever unit wins, its value is its own.
    expect([`${v.n}${v.unit}`]).toEqual([expect.stringMatching(/^(12cal|400m|450m|500m)$/)])
  })

  test('a hold recorded without a unit stays as the user recorded it (#138)', () => {
    const sessions = blob(
      ['2026-09-07', '2026-09-14'].map(d => session(d, 'Core\n3 rounds\n40 Plank')),
    )
    expect(volumeFor(ctxFor(sessions, '2026-09-21'), 'Plank', 'Core', { rounds: 3 })).toMatchObject(
      {
        kind: 'reps',
        n: 40,
      },
    )
  })
})

describe('the main lift', () => {
  const ctx = ctxFor(blob([session('2026-09-07', 'Força\n3x3 Back Squat 70/80/90%')]), '2026-09-14')

  test('baseLift folds variants into the shortest Força entry they name', () => {
    expect(baseLift('Sumo Deadlift', ctx).key).toBe('Deadlift')
    expect(baseLift('Banded Deadlift', ctx).key).toBe('Deadlift')
    expect(baseLift('Deadlift pegada de Snatch', ctx).key).toBe('Deadlift')
    expect(baseLift('Snatch Deadlift', ctx).key).toBe('Deadlift')
    expect(baseLift('tempo Bench press 3" Descida', ctx).key).toBe('Bench Press')
  })

  test('Back, Front and Overhead Squat stay three lifts', () => {
    expect(['Back Squat', 'Front Squat', 'OHS'].map(n => baseLift(n, ctx)?.key)).toEqual([
      'Back Squat',
      'Front Squat',
      'Overhead Squat',
    ])
  })

  test('an unresolved lift keeps its spelling as identity and has no entry to suggest', () => {
    expect(baseLift('Shoulder Press', ctx)).toEqual({ key: 'shoulder press', entry: null })
    expect(baseLift('Power Snatch', ctx)).toBe(null)
  })

  test("a block's lift is its label when that names one, else its first movement row", () => {
    const [labelled] = session('2026-10-02', 'Força – Bench Press\n2x6 — 50/60%').blocks
    const [rows] = session('2026-10-05', 'Força\nFront squat\n2x6 — 50/60%').blocks
    expect(mainLiftOf(labelled, ctx).key).toBe('Bench Press')
    expect(mainLiftOf(rows, ctx).key).toBe('Front Squat')
  })

  test('liftRuns: consecutive observations of one lift, and what followed each', () => {
    const obs = ['BS', 'BS', 'BS', 'FS', 'BS'].map((key, i) => ({ key, date: `2026-09-0${i + 1}` }))
    expect(liftRuns(obs).map(r => [r.key, r.length, r.next])).toEqual([
      ['BS', 3, 'FS'],
      ['FS', 1, 'BS'],
      ['BS', 1, null],
    ])
  })

  test('a lift already in the week is collected for the once-per-week rule', () => {
    const sessions = standardBox({ weeks: 3 })
    // Friday of the second week: Monday's Back Squat, Tuesday's Bench, Wednesday's Deadlift.
    const c = ctxFor(sessions, '2026-06-19')
    expect([...c.strength.weekLifts.keys()]).toEqual(['Back Squat', 'Bench Press', 'Deadlift'])
  })
})

describe('LPO family', () => {
  const sessions = standardBox({ weeks: 6 })

  test('score = weekday frequency × family recency', () => {
    const scores = familyScores(ctxFor(sessions, '2026-07-20'))
    const snatch = scores.find(s => s.family === 'Snatch')
    expect(snatch.freq).toBe(3) // Mondays 06/08, 06/22, 07/06
    expect(snatch.score).toBeCloseTo(snatch.freq * snatch.recency, 9)
  })

  test("the Mon/Wed pair: Wednesday takes the family Monday didn't", () => {
    // Monday 13/07 is a Clean day in the fixture (odd week), so Wednesday 15/07 is Snatch.
    const pair = pairRule(ctxFor(sessions, '2026-07-15'))
    expect(pair).toMatchObject({ partnerDow: 1, family: 'Snatch', partner: { family: 'Clean' } })
    expect(pair.opposite).toBeGreaterThanOrEqual(3)
  })

  test('no pair rule before the partner day of this week exists', () => {
    // Monday 13/07 asks before Wednesday is written: nothing to pair with yet.
    expect(pairRule(ctxFor(sessions, '2026-07-13'))).toBe(null)
  })
})

describe('goalRatio', () => {
  test('a legacy bare Meta (`12`, never blurred — #139) is read as minutes', () => {
    const wod = d => {
      const s = session(d, "For Time\n3 rounds Cap 15'\n10 Burpee\n400m Run")
      s.blocks[0].goal = { kind: 'time', min: '12' }
      return s
    }
    const g = goalRatio(ctxFor(blob([wod('2026-09-07'), wod('2026-09-14')]), '2026-09-21'))
    expect(g).toEqual({ ratio: 0.8, n: 2 })
  })
})

describe('pools', () => {
  test('a movement used yesterday is lowered by recency, not removed', () => {
    const sessions = blob([
      session('2026-09-07', 'Core\n3 rounds\n15 V-up\n15 Plate Sit-up'),
      session('2026-09-14', 'Core\n3 rounds\n15 V-up\n15 Plate Sit-up'),
      session('2026-09-20', 'Acessórios\n15 V-up'),
    ])
    const pool = poolFor(ctxFor(sessions, '2026-09-21'), 'Core')
    const vup = pool.find(m => m.name === 'V-up')
    const sit = pool.find(m => m.name === 'Plate Sit-up')
    expect(vup.recency).toBeCloseTo(recency(1), 9)
    expect(vup.weight).toBeGreaterThan(0)
    expect(vup.weight).toBeLessThan(sit.weight)
  })

  test("warm-up uses never lower another block's pick", () => {
    const sessions = blob([
      session('2026-09-07', 'Core\n3 rounds\n15 V-up'),
      session('2026-09-20', 'Aquecimento\n15 V-up'),
    ])
    const vup = poolFor(ctxFor(sessions, '2026-09-21'), 'Core').find(m => m.name === 'V-up')
    expect(vup.days).toBe(14)
  })
})

describe('registryMisses', () => {
  test('lists every unresolved name with its count; structure typed into a name is apart', () => {
    const sessions = blob([
      session('2026-09-07', 'Força\n3x5 Shoulder Press 70%\n\nCore\nCore\n3 rounds\n15 V-up'),
      session('2026-09-14', 'Força\n3x5 Shoulder Press 70%'),
    ])
    const { movements, structural } = registryMisses(ctxFor(sessions, '2026-09-21'))
    expect(movements).toEqual([expect.objectContaining({ name: 'Shoulder Press', count: 2 })])
    expect(structural.map(m => m.name)).toContain('Core')
  })

  test('isStructuralName: block types, structure lines, keyword lines, zones', () => {
    expect(['Core', "AMRAP 10'", "Meta 7'", 'Z1', '5/5', 'Rounds'].every(isStructuralName)).toBe(
      true,
    )
    expect(isStructuralName('Shoulder Press')).toBe(false)
  })
})
