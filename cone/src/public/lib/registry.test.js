import { describe, test, expect } from 'vitest'
import { normExName, ALIASES, buildRegistryIndex, resolveExercise } from './registry.js'

describe('normExName', () => {
  test('trims + casefolds', () => {
    expect(normExName('  Bar Muscle-up  ')).toBe('bar muscle-up')
  })
  test('strips accents (NFD combining marks)', () => {
    expect(normExName('FLEXÃO NÓRDICA')).toBe('flexao nordica')
  })
  test('collapses internal whitespace', () => {
    expect(normExName('DUAL DB  SQUAT CLEAN')).toBe('dual db squat clean')
  })
  test('empty/nullish → empty string', () => {
    expect(normExName('')).toBe('')
    expect(normExName(undefined)).toBe('')
  })
})

describe('ALIASES', () => {
  test('covers the shorthand cases plans/22 named', () => {
    expect(ALIASES.bmu).toBe('Bar Muscle-up')
    expect(ALIASES.t2b).toBe('Toes to Bar')
    expect(ALIASES.du).toBe('Double Under')
    expect(ALIASES.hspu).toBe('Strict HSPU')
  })
})

describe('buildRegistryIndex + resolveExercise', () => {
  const registry = {
    LPO: [{ name: 'Bar Muscle-up' }, { name: 'Clean & Jerk' }],
    Skill: [{ name: 'Toes to Bar', videoUrl: 'https://youtu.be/x' }],
    Cardio: [{ name: 'Corrida' }, { name: 'Bike (Assault/Echo)' }],
    Força: [{ name: 'Deadlift', defaults: { sets: 5, reps: '5' } }],
  }

  test('direct case/accent/whitespace-insensitive match, no alias needed', () => {
    const entry = resolveExercise('  bar muscle-up  ', registry)
    expect(entry?.name).toBe('Bar Muscle-up')
  })

  test('shorthand alias resolves to canonical entry', () => {
    expect(resolveExercise('BMU', registry)?.name).toBe('Bar Muscle-up')
    expect(resolveExercise('T2B', registry)?.name).toBe('Toes to Bar')
    expect(resolveExercise('HSPU ', buildRegistryIndex({ Skill: [{ name: 'Strict HSPU' }] }))?.name).toBe('Strict HSPU')
  })

  test('pt-BR / English machine-name alias resolves', () => {
    expect(resolveExercise('Run', registry)?.name).toBe('Corrida')
    expect(resolveExercise('ROW', buildRegistryIndex({ Cardio: [{ name: 'Remo (Ergômetro)' }] }))?.name).toBe('Remo (Ergômetro)')
  })

  test('leading volume prefix stripped before alias lookup', () => {
    expect(resolveExercise("10' BIKE", registry)?.name).toBe('Bike (Assault/Echo)')
    expect(resolveExercise("10' Run", registry)?.name).toBe('Corrida')
  })

  test('unrelated leading number does not accidentally resolve', () => {
    expect(resolveExercise('12 GHD', registry)).toBeNull()
  })

  test('trailing zone suffix stripped before alias lookup', () => {
    expect(resolveExercise('Run Z1', registry)?.name).toBe('Corrida')
  })

  test('resolved entry carries every category it appears under', () => {
    const multi = buildRegistryIndex({
      Skill: [{ name: 'Handstand Walk' }],
      Aquecimento: [{ name: 'Handstand Walk' }],
    })
    expect(resolveExercise('Handstand Walk', multi)?.categories).toEqual(['Skill', 'Aquecimento'])
  })

  test('registry entry data (defaults, videoUrl) rides through unchanged', () => {
    const entry = resolveExercise('deadlift', registry)
    expect(entry?.defaults).toEqual({ sets: 5, reps: '5' })
  })

  test('unmatched name → null', () => {
    expect(resolveExercise('Completely Unknown Movement', registry)).toBeNull()
  })

  test('empty name → null', () => {
    expect(resolveExercise('', registry)).toBeNull()
    expect(resolveExercise(undefined, registry)).toBeNull()
  })

  test('a prebuilt Map is reused, not rebuilt', () => {
    const index = buildRegistryIndex(registry)
    expect(resolveExercise('BMU', index)?.name).toBe('Bar Muscle-up')
  })

  test('string-only legacy registry entries (pre-migration shape) still resolve', () => {
    const legacy = { Skill: ['Handstand Walk'] }
    expect(resolveExercise('handstand walk', legacy)?.name).toBe('Handstand Walk')
  })
})

// Real-miss fixture table — a slice of the actual prod name/registry diff behind #62
// (docs/plans/30-registry-normalization.md), so a future alias-table edit can't silently
// regress a case that used to resolve. Each entry is [as-typed by the coach, canonical
// registry name it must resolve to].
describe('real prod shorthand/pt-BR fixture table', () => {
  const registry = {
    LPO: [{ name: 'Bar Muscle-up' }, { name: 'Ring Muscle-up' }, { name: 'Clean & Jerk' }],
    Skill: [
      { name: 'Toes to Bar' }, { name: 'Chest-to-Bar' }, { name: 'Strict HSPU' },
      { name: 'Handstand Walk' }, { name: 'Nordic Curl' }, { name: 'Pistol Squat' },
    ],
    Cardio: [{ name: 'Corrida' }, { name: 'Remo (Ergômetro)' }, { name: 'Bike (Assault/Echo)' }, { name: 'Ski Erg' }],
    Força: [
      { name: 'Overhead Squat' }, { name: 'Double Under' }, { name: 'Strict Pull-up' },
      { name: 'Plank' }, { name: 'Side Plank' }, { name: 'Barbell Row' }, { name: 'Bicep Curl' },
      { name: "Farmer's Carry" }, { name: 'Front Raise' }, { name: 'Lateral Raise' },
      { name: 'Deadlift' }, { name: 'Strict Press' }, { name: 'Bulgarian Split Squat' },
      { name: 'Hip Thrust' }, { name: 'Ring Dip' },
    ],
  }
  const index = buildRegistryIndex(registry)

  const cases = [
    ['BMU', 'Bar Muscle-up'], ['BMU ', 'Bar Muscle-up'],
    ['RING MU', 'Ring Muscle-up'],
    ['T2B', 'Toes to Bar'], ['STRICT T2B ', 'Toes to Bar'], ['Strict T2B', 'Toes to Bar'],
    ['C2B ', 'Chest-to-Bar'],
    ['HSPU', 'Strict HSPU'], ['HSPU ', 'Strict HSPU'], ['6 STRICT HSPU ', 'Strict HSPU'],
    ['DU ', 'Double Under'], ['DU', 'Double Under'], ['50 DU ', 'Double Under'],
    ['OHS ', 'Overhead Squat'], ['OHS', 'Overhead Squat'],
    [' C&J ', 'Clean & Jerk'], ['C&J', 'Clean & Jerk'],
    ['Run', 'Corrida'], ['RUN', 'Corrida'], ['Run ', 'Corrida'], ["20' Run", 'Corrida'], ['Run Z1', 'Corrida'],
    ['Row', 'Remo (Ergômetro)'], ['ROW', 'Remo (Ergômetro)'], ['ROW ', 'Remo (Ergômetro)'],
    ["10' BIKE ", 'Bike (Assault/Echo)'], ["10' BIKE", 'Bike (Assault/Echo)'],
    ["10' SKI", 'Ski Erg'], ['Ski', 'Ski Erg'], ['SKI ', 'Ski Erg'],
    ['PISTOLS ', 'Pistol Squat'], ['Pistol', 'Pistol Squat'],
    ['FLEXÃO NÓRDICA ', 'Nordic Curl'],
    ['HSW ', 'Handstand Walk'], ['HSW', 'Handstand Walk'],
    ['RING DIPS ', 'Ring Dip'],
    ['PRANCHA ', 'Plank'], ['PRANCHA LATERAL ', 'Side Plank'],
    ['BENT OVER ROW ', 'Barbell Row'],
    ['ROSCA DIRETA', 'Bicep Curl'],
    ['FARM CARRY ', "Farmer's Carry"],
    ['ELEVAÇÃO FRONTAL ', 'Front Raise'], ['Elevacao Lateral', 'Lateral Raise'],
    ['DÉFICIT DEADLIFT ', 'Deadlift'],
    ['STRICT PRESS SENTADO ', 'Strict Press'],
    ['BÚLGARO SQUAT ', 'Bulgarian Split Squat'],
    ['HIP THRUSTER ', 'Hip Thrust'],
    ['STRICT PULL UP SUPINADO', 'Strict Pull-up'], ['STRICT PULL UP ARGOLA ', 'Strict Pull-up'],
  ]

  test.each(cases)('%j resolves to %j', (typed, canonical) => {
    expect(resolveExercise(typed, index)?.name).toBe(canonical)
  })
})
