import { describe, test, expect } from 'vitest'
import { SEM_BOX } from '../../../../public/lib/sessions.js'
import { buildRegistryIndex, resolveExercise } from '../../../../public/lib/registry.js'
import { rootGroup } from '../../../../public/lib/exerciseGroups.js'
import { addDays, buildHistory, weekdayOf } from './history.js'
import { buildContext, goalRatio, themeStats } from './stats.js'
import { streamFor } from './rng.js'
import {
  PATTERN_FOCUS_WEIGHT,
  chooseFamily,
  chooseLift,
  displayName,
  drawMovement,
  genForca,
  genLpo,
  genMovementBlock,
  genWod,
  snapIntensity,
} from './synth.js'
import { REGISTRY, blob, session, standardBox } from './testFixtures.js'

const index = buildRegistryIndex(REGISTRY)
const ctxFor = (sessions, date, { lookAhead = false } = {}) =>
  buildContext(buildHistory({ sessions, scope: SEM_BOX, date, lookAhead }), {
    index,
    date,
    dow: weekdayOf(date),
  })
const envFor = (
  ctx,
  { options = {}, rules = { runLength: true }, variant = 0, type = 'Força' } = {},
) => ({
  rand: streamFor(SEM_BOX, ctx.date, type, variant),
  take: new Set(),
  options,
  rules,
  variant,
  day: { family: chooseFamily(ctx, options), theme: themeStats(ctx), goal: goalRatio(ctx) },
})

// One Força block per Monday from 2026-06-01, in the order given.
const LIFT = { BS: 'Back Squat', FS: 'Front Squat', OHS: 'Overhead Squat' }
const MON0 = '2026-06-01'
const mondays = seq =>
  blob(seq.map((k, i) => session(addDays(MON0, 7 * i), `Força\n2x2 ${LIFT[k]} 80/85%`)))
const nextMonday = seq => addDays(MON0, 7 * seq.length)
const liftFor = (seq, rules = { runLength: true }) => {
  const ctx = ctxFor(mondays(seq), nextMonday(seq))
  return chooseLift(ctx, envFor(ctx, { rules }))
}

describe('chooseLift — the run-length rule (review §7c)', () => {
  test('switch: the 3rd Back Squat Monday, after two 3-week blocks that ended there', () => {
    const seq = ['BS', 'BS', 'BS', 'FS', 'BS', 'BS', 'BS', 'FS', 'BS', 'BS', 'BS']
    expect(liftFor(seq)).toMatchObject({ key: 'Front Squat', rule: 'switch', k: 3 })
    // Markov alone sees Back Squat follow Back Squat 6 of 8 times.
    expect(liftFor(seq, { runLength: false })).toMatchObject({ key: 'Back Squat', rule: 'markov' })
  })

  test('keep: most runs that reached week k went on', () => {
    const seq = ['BS', 'BS', 'FS', 'BS', 'BS', 'FS', 'BS']
    expect(liftFor(seq)).toMatchObject({ key: 'Back Squat', rule: 'keep', k: 1 })
    // Markov alone: BS→BS 2, BS→FS 2 — a tie, so the latest transition (BS→FS).
    expect(liftFor(seq, { runLength: false })).toMatchObject({ key: 'Front Squat', rule: 'markov' })
  })

  test('fewer than 2 completed runs that reached k: back to Markov', () => {
    const seq = ['BS', 'BS', 'BS', 'FS', 'BS', 'BS', 'BS']
    expect(liftFor(seq)).toMatchObject({ key: 'Back Squat', rule: 'markov' })
    // The evidence threshold is a parameter the backtest can vary.
    expect(liftFor(seq, { runLength: true, runEvidence: 1 })).toMatchObject({
      key: 'Front Squat',
      rule: 'switch',
    })
  })

  test('the why names the run and its evidence', () => {
    const lift = liftFor(['BS', 'BS', 'BS', 'FS', 'BS', 'BS', 'BS', 'FS', 'BS', 'BS', 'BS'])
    expect(lift.why.join(' ')).toMatch(/3ª segunda seguida de Back Squat — nas 2 vezes anteriores/)
  })
})

describe('chooseLift — once per week', () => {
  test('a lift already in the week is out, and the why says where it was', () => {
    const fri = ['FS', 'FS', 'OHS', 'FS']
    const sessions = blob([
      ...fri.map((k, i) =>
        session(addDays('2026-06-05', 7 * i), `Força\n3x3 ${LIFT[k]} 70/80/90%`),
      ),
      session('2026-06-29', 'Força\n3x3 Front Squat 70/80/90%'),
    ])
    const ctx = ctxFor(sessions, '2026-07-03')
    const lift = chooseLift(ctx, envFor(ctx))
    expect(lift.key).not.toBe('Front Squat')
    expect(lift.key).toBe('Overhead Squat')
    expect(lift.why[0]).toBe('Já na semana: Front Squat (segunda 29/06) — fora.')
  })

  test('a lift the registry cannot resolve is never suggested, however frequent', () => {
    const sessions = blob([
      ...[0, 1, 2].map(i => session(addDays('2026-06-02', 7 * i), 'Força\n3x5 Shoulder Press 70%')),
      session('2026-06-23', 'Força\n3x5 Bench Press 70%'),
    ])
    const ctx = ctxFor(sessions, '2026-06-30')
    expect(chooseLift(ctx, envFor(ctx)).key).toBe('Bench Press')
  })
})

describe('genForca', () => {
  test('the chosen scheme keeps its own ramp, snapped to the 0/5 grid (87 → 85, 92 → 90)', () => {
    const ctx = ctxFor(blob([session('2026-09-07', 'Força\n2x2 Front Squat 87/92%')]), '2026-09-14')
    const r = genForca(ctx, envFor(ctx))
    const [ex] = r.block.exercises
    expect(ex).toMatchObject({ name: 'Front Squat', sets: '2', reps: '2' })
    expect(ex.intensity.steps.map(s => s.load)).toEqual(['85', '90'])
    expect(r.why.join(' ')).toMatch(/no grid de 5: 87→85, 92→90/)
  })

  test('a box that never writes a %RM still gets its Força block', () => {
    const sessions = blob(
      [0, 1, 2].map(i => session(addDays('2026-09-07', 7 * i), 'Força\n5x5 Back Squat 100kg')),
    )
    const ctx = ctxFor(sessions, '2026-09-28')
    const r = genForca(ctx, envFor(ctx))
    expect(r.block.exercises[0]).toMatchObject({ name: 'Back Squat', sets: '5', reps: '5' })
    expect(r.why.join(' ')).toMatch(/sem %RM/)
  })

  test("last week's block is the scheme only when nothing else has the target top", () => {
    const sessions = blob([
      session('2026-09-07', 'Força\n3x3 Front Squat 70/80/90%'),
      session('2026-09-14', 'Força\n2x2 Front Squat 85/90%'),
    ])
    const ctx = ctxFor(sessions, '2026-09-21')
    const r = genForca(ctx, envFor(ctx))
    expect(r.block.exercises[0]).toMatchObject({ sets: '3', reps: '3' })
    expect(r.why.join(' ')).toMatch(/Esquema de 07\/09/)
  })
})

describe('genLpo', () => {
  const sessions = standardBox({ weeks: 8 })
  const monday = '2026-08-03'

  test('drills by slot, ordered by complexity, each from its median %RM, never dropping, +5 per round', () => {
    const ctx = ctxFor(sessions, monday)
    const r = genLpo(ctx, envFor(ctx, { options: { lpoLift: 'Snatch' }, type: 'LPO' }))
    const b = r.block
    expect(b).toMatchObject({
      type: 'LPO',
      label: 'Snatch',
      rounds: '3',
      interval: '01:30',
      lettered: true,
    })
    expect(b.exercises.map(e => e.name)).toEqual(['Drop Snatch', 'Power Snatch', 'Snatch'])
    expect(b.exercises.map(e => e.intensity.steps.map(s => s.load).join('/'))).toEqual([
      '30/35/40',
      '65/70/75',
      // Snatch's own median is 60; it may not open below the slot before it.
      '65/70/75',
    ])
    expect(r.why.join(' ')).toMatch(/Snatch 60→65/)
  })

  test('the ramp stops at 100% — or at the drill’s own recorded top when that is higher', () => {
    const lpo = d =>
      session(
        d,
        'LPO – Snatch\n5 rounds\nA 2 Power Snatch 85/90/95/95/95%\nB 3 Snatch Deadlift 95/100/105/105/105%',
      )
    const sessions = blob([0, 1, 2, 3].map(i => lpo(addDays('2026-06-01', 7 * i))))
    const ctx = ctxFor(sessions, '2026-06-29')
    const r = genLpo(ctx, envFor(ctx, { options: { lpoLift: 'Snatch' }, type: 'LPO' }))
    const tops = Object.fromEntries(
      r.block.exercises.map(e => [e.name, Math.max(...e.intensity.steps.map(s => +s.load))]),
    )
    expect(tops['Power Snatch']).toBe(100) // 85 + 5 × 4 = 105, capped
    expect(tops['Snatch Deadlift']).toBe(105) // its own history reached 105
    expect(r.why.join(' ')).toMatch(/Rampa limitada ao teto/)
  })

  test('lpoLift overrides the family score and the pair rule', () => {
    const wed = '2026-08-05' // Monday 03/08 is Snatch: the pair rule alone would say Clean
    const ctx = ctxFor(sessions, wed, { lookAhead: true })
    expect(chooseFamily(ctx, {}).family).toBe('Clean')
    const chosen = chooseFamily(ctx, { lpoLift: 'Jerk' })
    expect(chosen).toEqual({ family: 'Jerk', line: 'Jerk: escolhido por você.' })
  })
})

describe('genWod', () => {
  test('no variation root twice in one block, whatever the draw', () => {
    const sessions = blob(
      [0, 1, 2, 3].map(i =>
        session(
          addDays('2026-06-01', 7 * i),
          "For Time\n3 rounds Cap 12'\n5 Power Snatch 50/35kg\n5 Hang Snatch 50/35kg\n10 DB Snatch 22/15kg\n10 Burpee",
        ),
      ),
    )
    const ctx = ctxFor(sessions, '2026-06-29')
    for (let v = 0; v < 12; v++) {
      const r = genWod(ctx, 'For Time', envFor(ctx, { variant: v, type: 'For Time' }))
      const roots = r.block.exercises.map(e => rootGroup(e.name)).filter(Boolean)
      expect(new Set(roots).size).toBe(roots.length)
    }
  })

  test("the theme rule puts the day's LPO family in the WOD", () => {
    const sessions = blob(
      [0, 1, 2, 3].map(i =>
        session(
          addDays('2026-06-01', 7 * i),
          "LPO – Snatch\n3 rounds\n2 Power Snatch 65/70/75%\n\nFor Time\n3 rounds Cap 15'\n10 DB Snatch 22/15kg\n12 Toes to Bar\n10 Burpee\nMeta: 12'",
        ),
      ),
    )
    const ctx = ctxFor(sessions, '2026-06-29')
    const env = envFor(ctx, { options: { lpoLift: 'Snatch' }, type: 'For Time' })
    expect(env.day.theme).toMatchObject({ both: 4, themed: 4, rate: 1 })
    const r = genWod(ctx, 'For Time', env)
    expect(r.block.exercises[0].name).toMatch(/Snatch/)
    expect(r.why.join(' ')).toMatch(/tema Snatch: 4 de 4 dias/)
  })

  test('Meta = the median goal/cap ratio × cap', () => {
    const ctx = ctxFor(standardBox({ weeks: 4 }), '2026-07-06')
    const r = genWod(ctx, 'For Time', envFor(ctx, { type: 'For Time' }))
    expect(r.block.duration).toBe('15')
    expect(r.block.goal).toEqual({ kind: 'time', min: '12:00' })
  })

  test('a movement with no volume history gets a flagged fallback — the registry default here', () => {
    const sessions = blob(
      [0, 1, 2].map(i => session(addDays('2026-06-01', 7 * i), "For Time\nCap 10'\nWall Ball")),
    )
    const ctx = ctxFor(sessions, '2026-06-22')
    const r = genWod(ctx, 'For Time', envFor(ctx, { type: 'For Time' }))
    expect(r.block.exercises[0]).toMatchObject({ name: 'Wall Ball', reps: '20' })
    expect(r.why.join(' ')).toMatch(/sem histórico de volume, padrão/)
  })
})

describe('focus — options.pattern', () => {
  const sessions = standardBox({ weeks: 8 })

  test('restricts Acessórios to the pattern', () => {
    const ctx = ctxFor(sessions, '2026-08-03')
    const r = genMovementBlock(
      ctx,
      'Acessórios',
      envFor(ctx, { options: { pattern: 'Puxar' }, type: 'Acessórios' }),
    )
    expect(r.block.exercises.length).toBeGreaterThan(0)
    r.block.exercises.forEach(e =>
      expect(['Strict Pull-up', 'Russian Row', 'Barbell Row']).toContain(e.name),
    )
  })

  test('restricts the Força lift to the pattern, or says so when the box has none', () => {
    const ctx = ctxFor(sessions, '2026-08-04') // Tuesday: only Bench Press here
    const squat = chooseLift(ctx, envFor(ctx, { options: { pattern: 'Agachamento' } }))
    expect(['Back Squat', 'Front Squat', 'Overhead Squat']).toContain(squat.key)
    const none = chooseLift(ctx, envFor(ctx, { options: { pattern: 'Carregar' } }))
    expect(none.why[0]).toMatch(/foco ignorado/)
  })

  test('weighs the pattern up by PATTERN_FOCUS_WEIGHT where it does not restrict', () => {
    const pool = [
      { name: 'A', pattern: 'Core', root: null, weight: 1 },
      { name: 'B', pattern: 'Puxar', root: null, weight: 1 },
    ]
    const sets = { take: new Set(), here: new Set(), roots: new Set(), focus: 'Puxar' }
    const d = drawMovement(pool, () => 0.99, sets)
    expect(d.m.name).toBe('B')
    expect(d.p).toBeCloseTo(PATTERN_FOCUS_WEIGHT / (PATTERN_FOCUS_WEIGHT + 1), 9)
  })
})

describe('helpers', () => {
  test('displayName drops a parenthetical only when the short form is the same entry', () => {
    const name = n => displayName(resolveExercise(n, index), index)
    expect(name('Remo (Ergômetro)')).toBe('Remo')
    expect(name('Bike (Assault/Echo)')).toBe('Bike')
    expect(name('Back Squat')).toBe('Back Squat')
  })

  test('snapIntensity snaps every %RM and leaves kilos as written', () => {
    expect(snapIntensity({ mode: 'pct', pct: '87' })).toEqual({ mode: 'pct', pct: '85' })
    const log = []
    const p = snapIntensity(
      {
        mode: 'progression',
        steps: [
          { load: '92', unit: '% do RM' },
          { load: '62', unit: 'kg' },
        ],
      },
      log,
    )
    expect(p.steps.map(s => s.load)).toEqual(['90', '62'])
    expect(log).toEqual(['92→90'])
  })
})
