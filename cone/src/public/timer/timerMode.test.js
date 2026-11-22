import { describe, test, expect } from 'vitest'
import { timerMode, cycleOf, cycleEnd, exLabel, formFromCfg, cfgFromForm } from './timerMode.js'
import { timerConfigFor } from '../schedule/scheduleHelpers.js'

// #228 — the timer's first tests. Which mode a config runs in used to be ~20 scattered
// `cfg.blockType === …` checks with EMOM and AMRAP tried before Estações, so an EMOM carrying its
// own interval would have taken the 60-second branches. The precedence is the whole point.
describe('timerMode', () => {
  test('Estações and any interval block run the cycle', () => {
    expect(timerMode({ blockType: 'Estações' })).toBe('cycle')
    expect(timerMode({ blockType: 'Força', intervalMode: true })).toBe('cycle')
    expect(timerMode({ blockType: 'LPO', intervalMode: true })).toBe('cycle')
  })

  test('an EMOM or AMRAP that carries its own interval takes the cycle, not the minute / the cap', () => {
    expect(timerMode({ blockType: 'EMOM', intervalMode: true })).toBe('cycle')
    expect(timerMode({ blockType: 'AMRAP', intervalMode: true })).toBe('cycle')
  })

  test('an EMOM or AMRAP without one keeps its own mode', () => {
    expect(timerMode({ blockType: 'EMOM' })).toBe('emom')
    expect(timerMode({ blockType: 'AMRAP' })).toBe('amrap')
  })

  test('everything else counts up — WOD types and the types that never had a timer alike', () => {
    for (const blockType of [
      'For Time',
      'Benchmark',
      'MetCon',
      'HIIT',
      'Força',
      'LPO',
      'Core',
      'Skill',
    ])
      expect(timerMode({ blockType }), blockType).toBe('up')
  })

  test('a missing config is the stopwatch', () => {
    expect(timerMode(undefined)).toBe('up')
    expect(timerMode({})).toBe('up')
  })
})

describe('cycleOf', () => {
  test('defaults to the Estações 45s work / 15s transition', () => {
    expect(cycleOf({})).toEqual({ st: 45, tt: 15, cycle: 60 })
  })

  test('reads the config, and keeps a zero rest', () => {
    expect(cycleOf({ stationTime: 120, transitionTime: 0 })).toEqual({ st: 120, tt: 0, cycle: 120 })
  })

  test('a zero-length cycle still has length 1, so the clock cannot divide by zero', () => {
    expect(cycleOf({ stationTime: 0, transitionTime: 0 }).cycle).toBe(1)
  })
})

describe('cycleEnd', () => {
  test('Estações: stations × rounds × cycle — one round when rounds is missing', () => {
    const exercises = [{ name: 'A' }, { name: 'B' }]
    expect(
      cycleEnd({
        blockType: 'Estações',
        exercises,
        stationTime: 45,
        transitionTime: 15,
        rounds: 3,
      }),
    ).toBe(360)
    expect(
      cycleEnd({ blockType: 'Estações', exercises, stationTime: 45, transitionTime: 15 }),
    ).toBe(120)
  })

  test('an interval block: rounds × cycle — a rest counts', () => {
    expect(cycleEnd({ intervalMode: true, stationTime: 120, transitionTime: 0, rounds: 3 })).toBe(
      360,
    )
    expect(cycleEnd({ intervalMode: true, stationTime: 40, transitionTime: 20, rounds: 3 })).toBe(
      180,
    )
  })

  test('rounds may arrive as the string the block stores', () => {
    expect(cycleEnd({ intervalMode: true, stationTime: 120, transitionTime: 0, rounds: '3' })).toBe(
      360,
    )
  })

  test('an interval block with no rounds ends only on FIM', () => {
    expect(
      cycleEnd({ intervalMode: true, stationTime: 120, transitionTime: 0, rounds: null }),
    ).toBeNull()
    expect(cycleEnd({ intervalMode: true, stationTime: 120, transitionTime: 0 })).toBeNull()
  })

  test('a zero-length cycle cannot be timed — null, never an instant finish', () => {
    expect(
      cycleEnd({ intervalMode: true, stationTime: 0, transitionTime: 0, rounds: 3 }),
    ).toBeNull()
    expect(
      cycleEnd({ blockType: 'Estações', exercises: [{}], stationTime: 0, transitionTime: 0 }),
    ).toBeNull()
  })

  // #242 (review #11) — a cycle with nothing in it multiplied out to 0, and `e >= 0` finished the
  // timer at 00:00, against the comment two tests up.
  test('a cycle with no stations is null too — the product being 0 is the same as nothing to count to', () => {
    expect(cycleEnd({ intervalMode: false, exercises: [] })).toBeNull()
    expect(cycleEnd({ blockType: 'Estações' })).toBeNull()
    expect(cycleEnd({ blockType: 'Estações', exercises: [], rounds: 3 })).toBeNull()
  })

  test('zero rounds is nothing to count to as well', () => {
    expect(cycleEnd({ blockType: 'Estações', exercises: [{}], rounds: 0 })).toBeNull()
    expect(
      cycleEnd({ intervalMode: true, stationTime: 60, transitionTime: 0, rounds: 0 }),
    ).toBeNull()
  })
})

// #242 (review #13) — `400m Run` reached the timer as `Run`.
describe('exLabel', () => {
  test('a string line is its own label', () => {
    expect(exLabel('21 Pull-ups')).toBe('21 Pull-ups')
  })

  test('a row reads through the shared volume formatter — distance first', () => {
    expect(exLabel({ name: 'Run', dist: '400', distUnit: 'm' })).toBe('Run · 400m')
    expect(exLabel({ name: 'Row', dist: '500' })).toBe('Row · 500m')
    expect(exLabel({ name: 'Back Squat', sets: 5, reps: '5' })).toBe('Back Squat · 5×5')
    expect(exLabel({ name: 'Pull-ups', reps: '21' })).toBe('Pull-ups · 21')
  })

  test('a name that already says the distance is not said twice', () => {
    expect(exLabel({ name: '400m Run', dist: '400' })).toBe('400m Run')
  })

  test('a load (a config saved before timerExs dropped it) still rides along', () => {
    expect(exLabel({ name: 'Thruster', reps: '21', load: 43, unit: 'kg' })).toBe(
      'Thruster · 21 @ 43kg',
    )
    expect(exLabel({ name: 'Deadlift', load: 100 })).toBe('Deadlift · 100kg')
  })

  // `timerExs` passes no `intensity`, so a row with sets and no reps (a progression) has nothing for
  // the shared formatter to print — the timer used to say `Back Squat · 5x`.
  test('sets with no reps still say how many', () => {
    expect(exLabel({ name: 'Back Squat', sets: 5, reps: '' })).toBe('Back Squat · 5x')
    expect(exLabel({ name: 'Back Squat', sets: 5 })).toBe('Back Squat · 5x')
    expect(exLabel({ name: 'Back Squat', sets: 1 })).toBe('Back Squat')
  })

  test('a name with nothing else is just the name', () => {
    expect(exLabel({ name: 'Burpees' })).toBe('Burpees')
  })
})

// ── The setup form ↔ the config (#242, review #22) ───────────────────────────────
// The cfg form is seeded from the last saved config and INICIAR rebuilt a config from it, so a
// form nobody touched ran a DIFFERENT timer: a stopwatch got a 20' cap (`?? 20`), and
// `intervalMode`/`loggable` were dropped.
describe('formFromCfg / cfgFromForm', () => {
  const row = { name: 'Back Squat', sets: 5, reps: '5' }
  const three = [{ name: 'Clean' }, { name: 'Jerk' }, { name: 'Snatch' }]
  // Each is a config the real mapping makes, sent through JSON like localStorage does.
  const viaStorage = cfg => JSON.parse(JSON.stringify(cfg))
  const configs = {
    'a capless Força stopwatch': timerConfigFor({ type: 'Força', exercises: [row] }),
    'a capped For Time with rounds': timerConfigFor({
      type: 'For Time',
      duration: '15',
      rounds: '3',
      exercises: [row],
    }),
    'an interval Força': timerConfigFor({
      type: 'Força',
      rounds: '3',
      interval: '02:00',
      exercises: [row],
    }),
    'an on/off HIIT': timerConfigFor({
      type: 'HIIT',
      rounds: '10',
      duration: '8',
      interval: '01:00',
      work: '00:40',
      exercises: [row],
    }),
    'a rotating interval EMOM': timerConfigFor({
      type: 'EMOM',
      interval: '02:00',
      rounds: '6',
      exercises: three,
    }),
    'an interval AMRAP': timerConfigFor({
      type: 'AMRAP',
      interval: '03:00',
      rounds: '4',
      exercises: three,
    }),
    'a plain EMOM': timerConfigFor({ type: 'EMOM', duration: '12', exercises: [row] }),
    'a decimal cap': timerConfigFor({ type: 'For Time', duration: '7.5', exercises: [row] }),
    Estações: timerConfigFor({
      type: 'Estações',
      stationRepeat: 2,
      stations: [
        { name: 'A', duration: '0:40', exercises: [row] },
        { name: 'Descanso', isRest: true, duration: '0:20' },
        { name: 'B', duration: '0:40', exercises: three },
      ],
    }),
    'a legacy block with no cap': timerConfigFor({
      type: 'Skill',
      rounds: '3',
      duration: '2',
      notes: '3 rounds A cada 1\'30"',
    }),
    'a config handed down from schedule.html, with its session': {
      ...timerConfigFor({ id: 'b1', type: 'For Time', duration: '12', exercises: [row] }),
      sessionId: 's1',
      sessionDate: '2026-11-22',
      athleteId: 'a1',
    },
    'a config the form built (string lines)': {
      blockType: 'AMRAP',
      blockLabel: 'Cindy',
      timeCap: 20,
      rounds: null,
      exercises: ['5 Pull-ups', '10 Push-ups', '15 Squats'],
      stationTime: 45,
      transitionTime: 15,
      goal: '20 rounds',
      countdown: false,
    },
  }

  describe('round trip: a form nobody touched returns the config it was seeded from', () => {
    for (const [name, cfg0] of Object.entries(configs)) {
      test(name, () => {
        const cfg = viaStorage(cfg0)
        expect(cfgFromForm(formFromCfg(cfg), cfg)).toEqual(cfg)
      })
    }

    test('timeCap: null survives — the cap field is blank, and blank is not 20', () => {
      const cfg = viaStorage(configs['a capless Força stopwatch'])
      expect(cfg.timeCap).toBeNull()
      expect(formFromCfg(cfg).cap).toBe('')
      expect(cfgFromForm(formFromCfg(cfg), cfg).timeCap).toBeNull()
    })

    test('the flags and the cycle times survive', () => {
      const cfg = viaStorage(configs['a rotating interval EMOM'])
      const back = cfgFromForm(formFromCfg(cfg), cfg)
      expect(back).toMatchObject({
        intervalMode: true,
        rotate: true,
        laps: false,
        stationTime: 120,
        transitionTime: 0,
        loggable: true,
      })
      expect(back.exercises).toEqual(cfg.exercises)
      expect(timerMode(back)).toBe('cycle')
    })

    test('an on/off block keeps its work and its rest', () => {
      const cfg = viaStorage(configs['an on/off HIIT'])
      expect(cfgFromForm(formFromCfg(cfg), cfg)).toMatchObject({
        stationTime: 40,
        transitionTime: 20,
      })
    })

    test('the session and block it was started from survive', () => {
      const cfg = viaStorage(configs['a config handed down from schedule.html, with its session'])
      expect(cfgFromForm(formFromCfg(cfg), cfg)).toMatchObject({
        sessionId: 's1',
        sessionDate: '2026-11-22',
        athleteId: 'a1',
        blockId: 'b1',
      })
    })
  })

  describe('formFromCfg', () => {
    test('seeds every field the form shows', () => {
      const form = formFromCfg({
        blockType: 'AMRAP',
        blockLabel: 'Cindy',
        timeCap: 20,
        rounds: 3,
        exercises: ['5 Pull-ups', { name: 'Run', dist: '400' }],
        stationTime: 30,
        transitionTime: 10,
        goal: '20 rounds',
        countdown: false,
      })
      expect(form).toEqual({
        type: 'AMRAP',
        cap: 20,
        rounds: 3,
        label: 'Cindy',
        exes: '5 Pull-ups\nRun · 400m',
        st: 30,
        tt: 10,
        goal: '20 rounds',
        countdown: false,
      })
    })

    // An interval config's one pseudo-station IS the block, so the form lists its movements; real
    // Estações keeps one line per station, which is what each string line becomes in cycle mode.
    test("an interval config lists its movements, not the pseudo-station's name", () => {
      const cfg = {
        blockType: 'Força',
        intervalMode: true,
        exercises: [{ name: 'Força', exercises: [{ name: 'Clean' }, { name: 'Jerk', reps: '3' }] }],
      }
      expect(formFromCfg(cfg).exes).toBe('Clean\nJerk · 3')
    })

    test('Estações lists its stations by name', () => {
      const cfg = {
        blockType: 'Estações',
        exercises: [
          { name: 'Grupo A', exercises: [{ name: 'Clean' }] },
          { name: 'Grupo B', exercises: [{ name: 'Jerk' }] },
        ],
      }
      expect(formFromCfg(cfg).exes).toBe('Grupo A\nGrupo B')
    })

    test('a config with nothing in it gets the form defaults', () => {
      expect(formFromCfg({})).toEqual({
        type: 'For Time',
        cap: '',
        rounds: '',
        label: '',
        exes: '',
        st: 45,
        tt: 15,
        goal: '',
        countdown: true,
      })
    })
  })

  describe('cfgFromForm — what the user changed wins', () => {
    const cfg = viaStorage(configs['a config handed down from schedule.html, with its session'])

    test('a cap, label, rounds or goal edit changes that field and nothing else', () => {
      const form = { ...formFromCfg(cfg), cap: '20', label: ' Murph ', rounds: '4', goal: '08:30' }
      expect(cfgFromForm(form, cfg)).toEqual({
        ...cfg,
        timeCap: 20,
        blockLabel: 'Murph',
        rounds: 4,
        goal: '08:30',
      })
    })

    test('the countdown toggle', () => {
      expect(cfgFromForm({ ...formFromCfg(cfg), countdown: false }, cfg).countdown).toBe(false)
    })

    test('clearing the cap on a stopwatch type is no cap — never a made-up 20', () => {
      expect(cfgFromForm({ ...formFromCfg(cfg), cap: '' }, cfg).timeCap).toBeNull()
    })

    test('a decimal cap stays decimal; nonsense is no cap', () => {
      expect(cfgFromForm({ ...formFromCfg(cfg), cap: '7.5' }, cfg).timeCap).toBe(7.5)
      expect(cfgFromForm({ ...formFromCfg(cfg), cap: '7,5' }, cfg).timeCap).toBe(7.5)
      expect(cfgFromForm({ ...formFromCfg(cfg), cap: '-3' }, cfg).timeCap).toBeNull()
    })

    test('a cap blanked on AMRAP/EMOM falls back to 20 — those count down from it, so none is no timer', () => {
      for (const blockType of ['AMRAP', 'EMOM']) {
        const base = { blockType, timeCap: 12, exercises: ['A'] }
        expect(cfgFromForm({ ...formFromCfg(base), cap: '' }, base).timeCap, blockType).toBe(20)
      }
    })

    // Duração on an interval block is only a tag (the cycle ends on its rounds), so blanking it must not
    // invent a 20' one — the mode here is 'cycle', not the type's own.
    test('a cap blanked on an interval EMOM is no cap: the cycle ends on its rounds', () => {
      const base = viaStorage({ ...configs['a rotating interval EMOM'], timeCap: 12 })
      expect(cfgFromForm({ ...formFromCfg(base), cap: '' }, base).timeCap).toBeNull()
    })

    // Whitespace is not an edit: a trailing space or a blank line must not turn an interval block into
    // a stopwatch.
    test('a cosmetic edit to the movements (spaces, blank lines) is not a change', () => {
      const cfg0 = viaStorage(configs['a rotating interval EMOM'])
      const form = { ...formFromCfg(cfg0) }
      form.exes = `\n  ${form.exes.split('\n').join('  \n\n  ')}  \n`
      expect(cfgFromForm(form, cfg0)).toEqual(cfg0)
    })

    test('a cleared rounds field is null', () => {
      expect(cfgFromForm({ ...formFromCfg(cfg), rounds: '' }, cfg).rounds).toBeNull()
    })

    test('blank or invalid station/transition times fall back to 45 / 15', () => {
      const out = cfgFromForm({ ...formFromCfg(cfg), st: '', tt: 'x' }, cfg)
      expect(out).toMatchObject({ stationTime: 45, transitionTime: 15 })
    })

    test('changing the movements rebuilds from the form: string lines, no session, no interval', () => {
      const base = viaStorage({
        ...configs['an interval Força'],
        sessionId: 's1',
        sessionDate: '2026-11-22',
        athleteId: 'a1',
        blockId: 'b2',
      })
      const out = cfgFromForm({ ...formFromCfg(base), exes: ' 5 Pull-ups \n\n10 Dips' }, base)
      expect(out).toMatchObject({
        blockType: 'Força',
        exercises: ['5 Pull-ups', '10 Dips'],
        sessionId: null,
        sessionDate: null,
        athleteId: null,
        blockId: null,
      })
      expect(out).not.toHaveProperty('intervalMode')
      expect(timerMode(out)).toBe('up')
    })

    test('changing the type rebuilds too, and loggable is recomputed with the block rule', () => {
      const lpo = viaStorage(configs['an interval Força'])
      expect(lpo.loggable).toBe(false)
      const toAmrap = cfgFromForm({ ...formFromCfg(lpo), type: 'AMRAP' }, lpo)
      expect(toAmrap).toMatchObject({ blockType: 'AMRAP', loggable: true })
      expect(toAmrap).not.toHaveProperty('intervalMode')
      const wod = viaStorage(configs['a capped For Time with rounds'])
      expect(wod.loggable).toBe(true)
      expect(cfgFromForm({ ...formFromCfg(wod), type: 'Força' }, wod).loggable).toBe(false)
    })

    test('a rebuilt config takes the form cap: blank is none for a stopwatch, 20 for a countdown', () => {
      const base = viaStorage(configs['a capless Força stopwatch'])
      expect(cfgFromForm({ ...formFromCfg(base), type: 'For Time' }, base).timeCap).toBeNull()
      expect(cfgFromForm({ ...formFromCfg(base), type: 'AMRAP' }, base).timeCap).toBe(20)
    })

    test('with no base at all it still builds a config', () => {
      const out = cfgFromForm({ ...formFromCfg({}), cap: '10', exes: 'A\nB' })
      expect(out).toMatchObject({ blockType: 'For Time', timeCap: 10, exercises: ['A', 'B'] })
    })
  })
})
