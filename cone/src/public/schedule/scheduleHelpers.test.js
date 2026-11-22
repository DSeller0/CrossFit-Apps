import { describe, test, expect } from 'vitest'
import {
  GUEST_CAP,
  findNameCollision,
  suggestGuestName,
  findAthleteById,
  usesRm,
  calcFromRm,
  timerConfigFor,
} from './scheduleHelpers.js'

// #71 — the guest check-in name helpers. The whole point of this pair is that they never
// dedupe: findNameCollision only REPORTS, and suggestGuestName only PROPOSES. Two real
// guests sharing a first name must both be able to reach the roster.

describe('findNameCollision', () => {
  test('returns null on an empty roster', () => {
    expect(findNameCollision([], 'Fulano')).toBe(null)
  })

  test('returns null when nothing matches', () => {
    expect(findNameCollision(['Beltrano', 'Sicrano'], 'Fulano')).toBe(null)
  })

  test('returns the existing spelling, not the typed one', () => {
    expect(findNameCollision(['Fulano da Silva'], 'fulano  DA silva')).toBe('Fulano da Silva')
  })

  test('matches through case, accents and repeated whitespace (normExName)', () => {
    expect(findNameCollision(['João Conceição'], 'joao conceicao')).toBe('João Conceição')
    expect(findNameCollision(['  Ana  Paula '], 'ana paula')).toBe('  Ana  Paula ')
  })

  test('an empty or whitespace-only typed name never collides', () => {
    expect(findNameCollision(['Fulano'], '')).toBe(null)
    expect(findNameCollision(['Fulano'], '   ')).toBe(null)
    expect(findNameCollision([''], '')).toBe(null)
  })

  test('a distinct surname is not a collision', () => {
    expect(findNameCollision(['Fulano Silva'], 'Fulano Souza')).toBe(null)
  })

  test('tolerates a missing roster', () => {
    expect(findNameCollision(undefined, 'Fulano')).toBe(null)
    expect(findNameCollision(null, 'Fulano')).toBe(null)
  })
})

describe('suggestGuestName', () => {
  test('derives an initial from the surname', () => {
    expect(suggestGuestName('Fulano Silva', ['Fulano Silva'])).toBe('Fulano S.')
  })

  test('skips particles when picking the surname', () => {
    expect(suggestGuestName('Fulano da Silva', ['Fulano da Silva'])).toBe('Fulano S.')
    expect(suggestGuestName('Maria dos Santos', [])).toBe('Maria S.')
  })

  test('falls back to dropping the particle when the initial is taken', () => {
    expect(suggestGuestName('Fulano da Silva', ['Fulano da Silva', 'Fulano S.'])).toBe(
      'Fulano Silva',
    )
  })

  test('returns empty when the fallback would just be the typed name again', () => {
    // "Fulano Silva" has no particle to drop, so candidate 2 IS what they typed — which is
    // on the roster by definition (that's why the prompt opened).
    expect(suggestGuestName('Fulano Silva', ['Fulano Silva', 'Fulano S.'])).toBe('')
  })

  test('returns empty for a single-token name — no initial to derive', () => {
    expect(suggestGuestName('Fulano', ['Fulano'])).toBe('')
  })

  test('returns empty when every token after the first is a particle', () => {
    expect(suggestGuestName('Fulano de', ['Fulano de'])).toBe('')
  })

  test('uses the LAST non-particle token, not the second', () => {
    expect(suggestGuestName('Ana Maria Rocha', [])).toBe('Ana R.')
  })

  test('uppercases the initial of a lowercase surname', () => {
    expect(suggestGuestName('fulano silva', [])).toBe('fulano S.')
  })

  test('handles empty, whitespace and missing input', () => {
    expect(suggestGuestName('', [])).toBe('')
    expect(suggestGuestName('   ', [])).toBe('')
    expect(suggestGuestName(undefined)).toBe('')
  })

  test('never suggests a name that collides with the roster', () => {
    const roster = ['Fulano Silva', 'Fulano S.']
    const s = suggestGuestName('Fulano Silva', roster)
    if (s) expect(findNameCollision(roster, s)).toBe(null)
  })
})

describe('GUEST_CAP', () => {
  // Guards the client/server pair: migration 0008 hardcodes 20 in SQL and cannot import this.
  test('is 20, matching migration 0008', () => {
    expect(GUEST_CAP).toBe(20)
  })
})

// #207 — the one validator both Schedule.jsx's `?id=` and `?athlete=` branches resolve
// through. Empty/adjacency/ordering mirror the GUARD-01 must_haves truths in the plan.
describe('findAthleteById', () => {
  test('returns null for an empty roster', () => {
    expect(findAthleteById([], 'a')).toBe(null)
  })

  test('returns null for a null roster', () => {
    expect(findAthleteById(null, 'a')).toBe(null)
  })

  test('returns null for an undefined roster', () => {
    expect(findAthleteById(undefined, 'a')).toBe(null)
  })

  test('returns null for an empty string id', () => {
    expect(findAthleteById([{ id: 'a' }], '')).toBe(null)
  })

  test('returns null for a null id', () => {
    expect(findAthleteById([{ id: 'a' }], null)).toBe(null)
  })

  test('returns null for an undefined id', () => {
    expect(findAthleteById([{ id: 'a' }], undefined)).toBe(null)
  })

  test('matches a numeric roster id via a string id', () => {
    expect(findAthleteById([{ id: 7, name: 'X' }], '7')).toEqual({ id: 7, name: 'X' })
  })

  test('matches a numeric roster id via a numeric id', () => {
    expect(findAthleteById([{ id: 7, name: 'X' }], 7)).toEqual({ id: 7, name: 'X' })
  })

  test('does not match a leading-zero variant', () => {
    expect(findAthleteById([{ id: 7 }], '07')).toBe(null)
  })

  test('does not match a leading-space variant', () => {
    expect(findAthleteById([{ id: 7 }], ' 7')).toBe(null)
  })

  test('does not match a trailing-space variant', () => {
    expect(findAthleteById([{ id: 7 }], '7 ')).toBe(null)
  })

  test('two entries sharing an id: the first in array order wins, every time', () => {
    const roster = [
      { id: 'a', name: 'first' },
      { id: 'a', name: 'second' },
    ]
    expect(findAthleteById(roster, 'a').name).toBe('first')
  })

  test('never mutates or reorders the roster array', () => {
    const roster = [
      { id: 'a', name: 'first' },
      { id: 'b', name: 'second' },
    ]
    const before = JSON.stringify(roster)
    findAthleteById(roster, 'b')
    expect(JSON.stringify(roster)).toBe(before)
  })
})

// #231 / #209 — "does this row get an RM chip?" and "what does a % of the RM weigh?". One rule,
// shared by ExRow (the chip, the computed load) and Schedule.jsx's autofillRm (the pre-fill).
describe('usesRm', () => {
  const prog = (...steps) => ({ intensity: { mode: 'progression', steps } })

  test('a plain %RM load uses an RM — only with a number in it', () => {
    expect(usesRm({ intensity: { mode: 'pct', pct: '75' } })).toBe(true)
    expect(usesRm({ intensity: { mode: 'pct', pct: '' } })).toBe(false)
    expect(usesRm({ intensity: { mode: 'pct' } })).toBe(false)
  })
  test('gender loads, legacy cardio and no intensity have nothing to compute from an RM', () => {
    expect(usesRm({ intensity: { mode: 'gender', Masculino_RX: '32' } })).toBe(false)
    expect(usesRm({ intensity: { mode: 'cardio', cardioVal: '500' } })).toBe(false)
    expect(usesRm({})).toBe(false)
    expect(usesRm(undefined)).toBe(false)
  })
  test('a % progression uses an RM, whichever way its unit is spelled', () => {
    for (const unit of ['% do RM', '%', '% RM', undefined])
      expect(usesRm(prog({ reps: '5', load: '70', unit }))).toBe(true)
  })
  test('a kg progression does not (#209)', () => {
    expect(
      usesRm(
        prog(
          { reps: '3', load: '60', unit: 'kg' },
          { reps: '3', load: '70', unit: 'kg' },
          { reps: '3', load: '80', unit: 'kg' },
        ),
      ),
    ).toBe(false)
  })
  test('a progression with no load at all does not', () => {
    expect(usesRm(prog({ reps: '5' }, { reps: '3' }))).toBe(false)
    expect(usesRm(prog())).toBe(false)
  })
  test('one % group among kg ones is enough', () => {
    expect(
      usesRm(prog({ reps: '5', load: '60', unit: 'kg' }, { reps: '3', load: '80', unit: '%' })),
    ).toBe(true)
  })
  test('a complex follows the same rule as a plain exercise', () => {
    expect(
      usesRm({
        isComplex: true,
        intensity: { mode: 'progression', steps: [{ load: '50', unit: '% do RM' }] },
      }),
    ).toBe(true)
    expect(
      usesRm({
        isComplex: true,
        intensity: { mode: 'progression', steps: [{ load: '50', unit: 'kg' }] },
      }),
    ).toBe(false)
  })
})

describe('calcFromRm', () => {
  const rm = (n, unit) => ({ rm: n, unit })

  test('one %: 75% of a 100 kg RM', () => {
    expect(calcFromRm(rm(100, 'kg'), [75])).toBe('75 kg')
  })
  test('a ladder reads slash-joined, in the athlete’s own unit', () => {
    expect(calcFromRm(rm(100, 'kg'), [60, 70, 80])).toBe('60/70/80 kg')
    expect(calcFromRm(rm(225, 'lbs'), [50, 100])).toBe('113/225 lbs')
  })
  test('rounds UP, so the bar is never under-loaded: 75% of 85 kg is 64 kg, not 63.75', () => {
    expect(calcFromRm(rm(85, 'kg'), [75])).toBe('64 kg')
  })
  test('no unit recorded → kg', () => {
    expect(calcFromRm({ rm: 100 }, [50])).toBe('50 kg')
  })
  test('no RM yet, or nothing to compute → empty (the pill is simply not drawn)', () => {
    expect(calcFromRm(undefined, [75])).toBe('')
    expect(calcFromRm(rm(0, 'kg'), [75])).toBe('')
    expect(calcFromRm(rm(100, 'kg'), [])).toBe('')
  })
})

// ── timerConfigFor (#228 · plans/99) ──────────────────────────────────────────
// The block half of openTimer — one case per row of the table in scheduleHelpers.js.
describe('timerConfigFor', () => {
  const complex = {
    isComplex: true,
    name: '',
    sets: 3,
    complexMovements: [
      { name: 'Hang Clean', reps: '1' },
      { name: 'Push Jerk', reps: '1' },
    ],
  }
  const row = { name: 'Back Squat', sets: 5, reps: '5' }

  test('Estações keeps its stations, durations and rounds exactly as before', () => {
    const cfg = timerConfigFor({
      id: 'b1',
      type: 'Estações',
      label: 'Estações',
      stationRepeat: 2,
      stations: [
        { name: 'Grupo A', duration: '0:45', exercises: [row, { name: '' }] },
        { name: 'Descanso', isRest: true, duration: '0:20' },
        { name: '', duration: '1:00', exercises: [complex] },
      ],
    })
    expect(cfg).toMatchObject({
      blockType: 'Estações',
      blockId: 'b1',
      rounds: 2,
      stationTime: 45,
      transitionTime: 20,
      loggable: true,
    })
    expect(cfg).not.toHaveProperty('intervalMode')
    expect(cfg.exercises).toEqual([
      { name: 'Grupo A', exercises: [{ name: 'Back Squat', sets: 5, reps: '5' }] },
      { name: 'Grupo', exercises: [{ name: 'Hang Clean + Push Jerk', sets: 3, reps: undefined }] },
    ])
  })

  test('an Estações block with no durations falls back to 45s / 15s', () => {
    const cfg = timerConfigFor({ type: 'Estações', stations: [{ name: 'A', exercises: [row] }] })
    expect(cfg).toMatchObject({ stationTime: 45, transitionTime: 15 })
  })

  test("the user's example — Força, 3 rounds a cada 2', a complex — runs the cycle", () => {
    const cfg = timerConfigFor({
      id: 'b2',
      type: 'Força',
      label: 'Força',
      rounds: '3',
      interval: '02:00',
      exercises: [complex],
    })
    expect(cfg).toMatchObject({
      blockType: 'Força',
      intervalMode: true,
      stationTime: 120,
      transitionTime: 0,
      rounds: 3,
      loggable: false,
    })
    expect(cfg.exercises).toEqual([
      { name: 'Força', exercises: [{ name: 'Hang Clean + Push Jerk', sets: 3, reps: undefined }] },
    ])
  })

  test('an on/off block times the work, then the rest', () => {
    const cfg = timerConfigFor({
      type: 'Core',
      rounds: '3',
      interval: '01:00',
      work: '00:40',
      exercises: [row],
    })
    expect(cfg).toMatchObject({
      intervalMode: true,
      stationTime: 40,
      transitionTime: 20,
      rounds: 3,
    })
  })

  test('with no Rounds, the rounds that fit Duração; with neither, null — it runs until FIM', () => {
    const lpo = { type: 'LPO', interval: '02:00', exercises: [row] }
    expect(timerConfigFor({ ...lpo, duration: '15' }).rounds).toBe(7)
    expect(timerConfigFor({ ...lpo, duration: '12' }).rounds).toBe(6)
    expect(timerConfigFor({ ...lpo, duration: '1' }).rounds).toBeNull()
    expect(timerConfigFor(lpo).rounds).toBeNull()
  })

  test('explicit Rounds beat what Duração would fit, and Duração still rides along as the cap tag', () => {
    const cfg = timerConfigFor({
      type: 'Força',
      rounds: '5',
      interval: '02:00',
      duration: '20',
      exercises: [row],
    })
    expect(cfg).toMatchObject({ rounds: 5, timeCap: 20 })
  })

  test('an EMOM that carries its own interval takes the cycle, whatever its type', () => {
    const cfg = timerConfigFor({
      type: 'EMOM',
      interval: '01:30',
      duration: '12',
      exercises: [row],
    })
    expect(cfg).toMatchObject({
      blockType: 'EMOM',
      intervalMode: true,
      stationTime: 90,
      transitionTime: 0,
      rounds: 8,
      loggable: true,
    })
  })

  test("an EMOM with no interval keeps today's config — the 60s minute stays the timer's", () => {
    const cfg = timerConfigFor({ type: 'EMOM', duration: '12', exercises: [row] })
    expect(cfg).toMatchObject({ blockType: 'EMOM', timeCap: 12, loggable: true })
    expect(cfg).not.toHaveProperty('intervalMode')
  })

  test('a WOD with no interval is untouched: its own type, cap and rounds', () => {
    const cfg = timerConfigFor({ type: 'For Time', duration: '15', rounds: '3', exercises: [row] })
    expect(cfg).toMatchObject({
      blockType: 'For Time',
      timeCap: 15,
      rounds: '3',
      stationTime: 45,
      transitionTime: 15,
      loggable: true,
    })
    expect(cfg).not.toHaveProperty('intervalMode')
  })

  test('a non-WOD block with a Duração counts up to it, and cannot be logged', () => {
    const cfg = timerConfigFor({ type: 'LPO', duration: '15', exercises: [row] })
    expect(cfg).toMatchObject({ blockType: 'LPO', timeCap: 15, loggable: false })
    expect(cfg).not.toHaveProperty('intervalMode')
  })

  test('a non-WOD block with nothing is a stopwatch: no cap, no rounds', () => {
    const cfg = timerConfigFor({ type: 'Força', exercises: [row, complex] })
    expect(cfg).toMatchObject({ blockType: 'Força', timeCap: null, rounds: null, loggable: false })
    expect(cfg.exercises.map(e => e.name)).toEqual(['Back Squat', 'Hang Clean + Push Jerk'])
  })

  // #242 (review #3) — this test was titled "does not" and asserted `.toBe('-')`: the placeholder
  // reached the timer header, the ready title and the history row.
  test('a custom label wins, and the placeholder "-" does not', () => {
    expect(timerConfigFor({ type: 'Força', label: 'Agacho pesado' }).blockLabel).toBe(
      'Agacho pesado',
    )
    expect(timerConfigFor({ type: 'Força', label: 'Força' }).blockLabel).toBe('Força')
    expect(timerConfigFor({ type: 'Força', label: '-' }).blockLabel).toBe('Força')
    expect(timerConfigFor({ type: 'Força' }).blockLabel).toBe('Força')
    expect(timerConfigFor({ type: '-', label: '-' }).blockLabel).toBe('WOD')
    expect(timerConfigFor({ label: '-' }).blockLabel).toBe('WOD')
  })

  // #242 (review #14) — the row at `:413` passed only because `'  '` was kept; the timer would have
  // shown a blank movement.
  test('empty exercise rows never reach the timer — a blank name is empty too', () => {
    const cfg = timerConfigFor({ type: 'Força', exercises: [{ name: '' }, row, { name: '  ' }] })
    expect(cfg.exercises).toHaveLength(1)
    expect(cfg.exercises[0].name).toBe('Back Squat')
  })

  test('a name is trimmed, and a complex with no movements is not a row', () => {
    const cfg = timerConfigFor({
      type: 'Força',
      exercises: [
        { name: '  Deadlift ', sets: 3, reps: '5' },
        { isComplex: true, name: '' },
      ],
    })
    expect(cfg.exercises).toEqual([{ name: 'Deadlift', sets: 3, reps: '5' }])
  })

  // #242 (review #13) — `400m Run` reached the timer as `Run`.
  test('a distance rides along with the row', () => {
    const cfg = timerConfigFor({
      type: 'Cardio',
      exercises: [
        { name: 'Run', dist: '400', distUnit: 'm' },
        { name: 'Row', dist: '500' },
      ],
    })
    expect(cfg.exercises).toEqual([
      { name: 'Run', dist: '400', distUnit: 'm' },
      { name: 'Row', dist: '500' },
    ])
  })

  test('a distance rides along inside an Estações station too', () => {
    const cfg = timerConfigFor({
      type: 'Estações',
      stations: [{ name: 'A', duration: '1:00', exercises: [{ name: 'Run', dist: '200' }] }],
    })
    expect(cfg.exercises[0].exercises).toEqual([{ name: 'Run', dist: '200' }])
  })

  // #242 (review #10) — `BlockDetail` and `stationsCapMins` read stationRepeat; this read rounds.
  test('Estações rounds are stationRepeat first, then rounds', () => {
    const stations = [{ name: 'A', duration: '0:45', exercises: [row] }]
    expect(
      timerConfigFor({ type: 'Estações', stations, stationRepeat: 3, rounds: '2' }).rounds,
    ).toBe(3)
    expect(timerConfigFor({ type: 'Estações', stations, rounds: '2' }).rounds).toBe('2')
    expect(timerConfigFor({ type: 'Estações', stations }).rounds).toBeNull()
  })

  // A count-up timer now ENDS at its last LAP, so a stale `stationRepeat` on a block converted from
  // Estações would have been a hidden lap limit.
  test('a non-Estações block reads rounds, never stationRepeat', () => {
    expect(timerConfigFor({ type: 'Força', rounds: '4', stationRepeat: 9 }).rounds).toBe('4')
    expect(timerConfigFor({ type: 'Força', stationRepeat: 3 }).rounds).toBeNull()
    expect(
      timerConfigFor({ type: 'Força', stationRepeat: 3, interval: '02:00', duration: '' }).rounds,
    ).toBeNull()
  })

  // ── The flags (#242, review #2) — decided HERE, read by the Timer ────────────
  describe('rotate / laps', () => {
    const three = [{ name: 'A' }, { name: 'B' }, { name: 'C' }]

    test('an interval EMOM with several movements rotates them, one per round', () => {
      const cfg = timerConfigFor({ type: 'EMOM', interval: '02:00', rounds: '6', exercises: three })
      expect(cfg).toMatchObject({ intervalMode: true, rotate: true, laps: false })
    })

    test('a single movement has nothing to rotate to', () => {
      const cfg = timerConfigFor({ type: 'EMOM', interval: '02:00', rounds: '6', exercises: [row] })
      expect(cfg.rotate).toBe(false)
    })

    test('an interval AMRAP counts rounds (LAP) and rotates nothing', () => {
      const cfg = timerConfigFor({
        type: 'AMRAP',
        interval: '03:00',
        rounds: '4',
        exercises: three,
      })
      expect(cfg).toMatchObject({ intervalMode: true, laps: true, rotate: false })
    })

    test('any other interval type is neither — it runs its movements as one set', () => {
      for (const type of ['Força', 'LPO', 'Core', 'HIIT', 'For Time'])
        expect(
          timerConfigFor({ type, interval: '02:00', rounds: '3', exercises: three }),
          type,
        ).toMatchObject({ rotate: false, laps: false })
    })

    test('a block with no interval carries no flag: its own mode already knows', () => {
      for (const type of ['EMOM', 'AMRAP', 'Força']) {
        const cfg = timerConfigFor({ type, duration: '12', exercises: three })
        expect(cfg, type).not.toHaveProperty('rotate')
        expect(cfg, type).not.toHaveProperty('laps')
      }
    })
  })

  // ── The decimal cap (#242, review #12) ───────────────────────────────────────
  describe('timeCap keeps its decimals', () => {
    test("EMOM 01:30 × Duração 7.5 is five rounds, not four — and the cap tag says 7.5'", () => {
      const cfg = timerConfigFor({
        type: 'EMOM',
        interval: '01:30',
        duration: '7.5',
        exercises: [row],
      })
      expect(cfg).toMatchObject({ timeCap: 7.5, rounds: 5 })
    })

    test('a comma is a decimal point; blank and zero are no cap', () => {
      expect(timerConfigFor({ type: 'For Time', duration: '7,5' }).timeCap).toBe(7.5)
      expect(timerConfigFor({ type: 'For Time', duration: '' }).timeCap).toBeNull()
      expect(timerConfigFor({ type: 'For Time', duration: '0' }).timeCap).toBeNull()
      expect(timerConfigFor({ type: 'For Time', duration: 'abc' }).timeCap).toBeNull()
      expect(timerConfigFor({ type: 'For Time', duration: 12 }).timeCap).toBe(12)
    })
  })

  // ── The legacy shape (#242, review #1) ───────────────────────────────────────
  // Before #228 a block had no interval field: "A cada 1'30" 3 Sets" was kept as a note, and the
  // parser wrote the nearest whole minute into Duração (`max(1, round(every / 60))`). #228 made
  // Duração a real cap, so the timer stopped such a block after ONE interval.
  describe('a legacy "A cada" block has no cap', () => {
    const legacy = (notes, duration, extra = {}) => ({
      type: 'LPO',
      rounds: '3',
      duration,
      notes,
      exercises: [row],
      ...extra,
    })

    test("the review's example — 3 rounds A cada 1'30\", Duração 2 — runs uncapped, rounds intact", () => {
      const cfg = timerConfigFor({
        type: 'Skill',
        rounds: '3',
        duration: '2',
        notes: '3 rounds A cada 1\'30"',
      })
      expect(cfg.timeCap).toBeNull()
      expect(cfg.rounds).toBe('3')
      expect(cfg).not.toHaveProperty('intervalMode')
    })

    test("Duração is the nearest whole minute of the note's interval: 1'30\" → 2, 2'30\" → 3", () => {
      expect(timerConfigFor(legacy('A cada 2\'30"', '3')).timeCap).toBeNull()
      expect(timerConfigFor(legacy("A cada 3'", '3')).timeCap).toBeNull()
      expect(timerConfigFor(legacy("A cada 1'10''", '1')).timeCap).toBeNull()
      expect(timerConfigFor(legacy('A cada 1\'30"', '1')).timeCap).toBe(1)
    })

    test('an EMOM whose Duração is its interval is legacy too', () => {
      const cfg = timerConfigFor({
        type: 'EMOM',
        rounds: '5',
        duration: '3',
        notes: "A cada 3' 5 Sets",
      })
      expect(cfg.timeCap).toBeNull()
      expect(
        timerConfigFor({ type: 'EMOM', duration: '2', notes: "x Every 2' x 5 sets" }).timeCap,
      ).toBeNull()
    })

    test('curly quotes in the note are read like straight ones', () => {
      expect(timerConfigFor(legacy('A cada 3’ executar um set', '3')).timeCap).toBeNull()
    })

    test('the interval may be in the label instead of the notes', () => {
      expect(
        timerConfigFor({ type: 'LPO', label: "A cada 2' x3 Sets", rounds: '3', duration: '2' })
          .timeCap,
      ).toBeNull()
    })

    // ⚠️ The line the rule exists to draw. Here the Duração is NOT the rounded interval — it is the
    // real total, so it stays a cap and the timer still ends at it.
    test('E2MOM with Duração 12 is a real total: it keeps its cap', () => {
      expect(timerConfigFor({ type: 'EMOM', duration: '12', notes: 'E2MOM' }).timeCap).toBe(12)
      expect(timerConfigFor({ type: 'EMOM', duration: '2', notes: 'E2MOM' }).timeCap).toBeNull()
    })

    test('a real total keeps its cap: rounds × interval, or a longer block', () => {
      expect(timerConfigFor(legacy("A cada 3'", '15', { rounds: '5' })).timeCap).toBe(15)
      expect(timerConfigFor(legacy('A cada 1\'30"', '12', { rounds: '8' })).timeCap).toBe(12)
      expect(timerConfigFor(legacy("Executar cada set a cada 2'", '12')).timeCap).toBe(12)
    })

    test('a note with no interval in it never makes a block legacy', () => {
      expect(timerConfigFor(legacy('Executar um set', '2')).timeCap).toBe(2)
      expect(
        timerConfigFor({ type: 'For Time', duration: '12', notes: 'A cada minuto 5 Burpees' })
          .timeCap,
      ).toBe(12)
    })

    test('a block with a real interval is not legacy — its cap is a cap', () => {
      const cfg = timerConfigFor(legacy("A cada 2'", '2', { interval: '02:00' }))
      expect(cfg).toMatchObject({ intervalMode: true, timeCap: 2 })
    })

    // A countdown has nothing to show without its cap: `Math.max(0, cap - e)` with no cap is 00:00 for
    // good, with the warn colour on. An AMRAP keeps its (rounded) Duração, as it did before.
    test('an AMRAP counts DOWN from its Duração, so it keeps it', () => {
      const cfg = timerConfigFor({ type: 'AMRAP', duration: '2', notes: "A cada 2' 3 sets" })
      expect(cfg.timeCap).toBe(2)
    })

    test('Estações times itself station by station: never legacy', () => {
      const cfg = timerConfigFor({
        type: 'Estações',
        duration: '4',
        notes: "A cada 4' 4 Sets",
        stations: [{ name: 'A', duration: '1:00', exercises: [row] }],
      })
      expect(cfg.timeCap).toBe(4)
    })

    test('no Duração at all is simply no cap, legacy or not', () => {
      expect(timerConfigFor(legacy("A cada 3'", '')).timeCap).toBeNull()
    })
  })
})
