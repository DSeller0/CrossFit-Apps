import { describe, test, expect } from 'vitest'
import {
  materializeEx,
  normalizeCardioEx,
  normalizeLegacyCardio,
  blockSummary,
  stationsCapStr,
  loadBadgeStr,
} from './blockModel.js'

describe('materializeEx', () => {
  const reg = {
    Força: [
      {
        name: 'Back Squat',
        defaults: { sets: '5', reps: '5', intensity: { mode: 'pct', pct: 80 } },
      },
    ],
  }

  test('fills empty sets/reps from registry defaults', () => {
    const out = materializeEx(
      { name: 'Back Squat', sets: '', reps: '', dist: '', intensity: null },
      reg,
    )
    expect(out.sets).toBe('5')
    expect(out.reps).toBe('5')
  })

  test('does not overwrite already-filled sets/reps', () => {
    const out = materializeEx(
      { name: 'Back Squat', sets: '3', reps: '10', dist: '', intensity: null },
      reg,
    )
    expect(out.sets).toBe('3')
    expect(out.reps).toBe('10')
  })

  test('dist and reps are mutually exclusive: existing reps blocks a dist default', () => {
    const distReg = { Cardio: [{ name: 'Run', defaults: { dist: '400', distUnit: 'm' } }] }
    const out = materializeEx(
      { name: 'Run', sets: '', reps: '10', dist: '', intensity: null },
      distReg,
    )
    expect(out.dist).toBe('')
    expect(out.reps).toBe('10')
  })

  test('dist and reps are mutually exclusive: existing dist blocks a reps default', () => {
    const repsReg = { X: [{ name: 'Foo', defaults: { reps: '10' } }] }
    const out = materializeEx(
      { name: 'Foo', sets: '', reps: '', dist: '50', intensity: null },
      repsReg,
    )
    expect(out.reps).toBe('')
    expect(out.dist).toBe('50')
  })

  test('intensityDefaultDismissed suppresses the registry intensity default and is stripped from the saved shape', () => {
    const out = materializeEx(
      {
        name: 'Back Squat',
        sets: '5',
        reps: '5',
        dist: '',
        intensity: null,
        intensityDefaultDismissed: true,
      },
      reg,
    )
    expect(out.intensity).toBeNull()
    expect(out).not.toHaveProperty('intensityDefaultDismissed')
  })

  test('without dismissal, registry intensity default applies', () => {
    const out = materializeEx(
      { name: 'Back Squat', sets: '5', reps: '5', dist: '', intensity: null },
      reg,
    )
    expect(out.intensity).toEqual({ mode: 'pct', pct: 80 })
  })

  test('a complex exercise never takes registry defaults', () => {
    const out = materializeEx(
      {
        name: 'Back Squat',
        isComplex: true,
        sets: '',
        reps: '',
        dist: '',
        intensity: null,
        complexMovements: [],
      },
      reg,
    )
    expect(out.sets).toBe('')
    expect(out.reps).toBe('')
    expect(out.intensity).toBeNull()
  })
})

describe('normalizeCardioEx', () => {
  test('legacy cardio mode → dist/distUnit siblings, intensity cleared', () => {
    const out = normalizeCardioEx({
      name: 'Run',
      intensity: { mode: 'cardio', cardioVal: '400', cardioUnit: 'm' },
    })
    expect(out.dist).toBe('400')
    expect(out.distUnit).toBe('m')
    expect(out.intensity).toBeNull()
  })

  test('non-cardio exercise passes through untouched', () => {
    const ex = { name: 'Back Squat', intensity: { mode: 'pct', pct: 80 } }
    expect(normalizeCardioEx(ex)).toEqual(ex)
  })
})

describe('normalizeLegacyCardio', () => {
  test('Estações block walks stations[].exercises[]', () => {
    const blocks = [
      {
        type: 'Estações',
        stations: [
          {
            exercises: [
              { name: 'Run', intensity: { mode: 'cardio', cardioVal: '200', cardioUnit: 'm' } },
            ],
          },
        ],
      },
    ]
    const out = normalizeLegacyCardio(blocks)
    expect(out[0].stations[0].exercises[0].dist).toBe('200')
    expect(out[0].stations[0].exercises[0].intensity).toBeNull()
  })

  test('standard block walks exercises[] directly', () => {
    const blocks = [
      {
        type: 'For Time',
        exercises: [
          { name: 'Row', intensity: { mode: 'cardio', cardioVal: '500', cardioUnit: 'm' } },
        ],
      },
    ]
    const out = normalizeLegacyCardio(blocks)
    expect(out[0].exercises[0].dist).toBe('500')
    expect(out[0].exercises[0].intensity).toBeNull()
  })
})

describe('blockSummary', () => {
  test('benchmarkRef short-circuits everything else', () => {
    expect(
      blockSummary({ benchmarkRef: 'Fran', type: 'For Time', duration: '20', rounds: '5' }),
    ).toBe('Fran')
  })

  test('Estações: groups/rests/repeat/cap', () => {
    const block = {
      type: 'Estações',
      stationRepeat: 2,
      stations: [
        { duration: '1:00', isRest: false },
        { duration: '0:30', isRest: true },
      ],
    }
    expect(blockSummary(block)).toBe("Cap 3' · 1 grupos · 1 descanso · ×2")
  })

  test('standard block: duration/rounds/movement count', () => {
    const block = {
      type: 'For Time',
      duration: '20',
      rounds: '5',
      exercises: [{ name: 'Run' }, { name: '' }, { name: 'Row' }],
    }
    expect(blockSummary(block)).toBe("20' · 5× · 2 mov.")
  })
})

describe('stationsCapStr', () => {
  test('non-Estações block → null', () => {
    expect(stationsCapStr({ type: 'For Time' })).toBeNull()
  })

  test('no station durations set → null', () => {
    expect(stationsCapStr({ type: 'Estações', stations: [{ duration: '' }] })).toBeNull()
  })

  test('mm:ss station durations sum to a cap', () => {
    const block = { type: 'Estações', stations: [{ duration: '1:30' }, { duration: '2:00' }] }
    expect(stationsCapStr(block)).toBe('Cap 3:30')
  })

  test('bare-minute station duration (no colon) is treated as whole minutes', () => {
    const block = { type: 'Estações', stations: [{ duration: '2' }] }
    expect(stationsCapStr(block)).toBe("Cap 2'")
  })

  test('stationRepeat multiplies the single-cycle total', () => {
    const block = { type: 'Estações', stationRepeat: 3, stations: [{ duration: '1:00' }] }
    expect(stationsCapStr(block)).toBe("Cap 3'")
  })

  test('restBetweenCycles counts only between cycles, not after the last one', () => {
    const block = {
      type: 'Estações',
      stationRepeat: 2,
      restBetweenCycles: '1:00',
      stations: [{ duration: '1:00' }],
    }
    expect(stationsCapStr(block)).toBe("Cap 3'")
  })
})

describe('loadBadgeStr', () => {
  test('no intensity or mode "none" → null', () => {
    expect(loadBadgeStr({ intensity: null })).toBeNull()
    expect(loadBadgeStr({ intensity: { mode: 'none' } })).toBeNull()
  })

  test('pct mode → percentage string', () => {
    expect(loadBadgeStr({ intensity: { mode: 'pct', pct: '80' } })).toBe('80%')
  })

  test('pct mode with no value → null', () => {
    expect(loadBadgeStr({ intensity: { mode: 'pct', pct: '' } })).toBeNull()
  })

  test('gender mode with any scale value → M/F', () => {
    expect(loadBadgeStr({ intensity: { mode: 'gender', Masculino_RX: '50' } })).toBe('M/F')
  })

  test('gender mode with no values → null', () => {
    expect(loadBadgeStr({ intensity: { mode: 'gender' } })).toBeNull()
  })

  test('progression mode with a load on the first step → load+unit', () => {
    expect(
      loadBadgeStr({
        intensity: { mode: 'progression', steps: [{ load: '70', unit: '% do RM' }] },
      }),
    ).toBe('70%')
  })

  test('progression mode with no loads on any step → stepless arrow', () => {
    expect(loadBadgeStr({ intensity: { mode: 'progression', steps: [{ reps: '5' }] } })).toBe('↗')
  })
})
