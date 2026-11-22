import { describe, test, expect } from 'vitest'
import {
  normExName,
  ALIASES,
  buildRegistryIndex,
  resolveExercise,
  firstAlternative,
  peelTrailing,
  dropStepLabel,
} from './registry.js'

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
    // #211: a bare HSPU is the general entry "Handstand Push-up (HSPU)", reached through its derived
    // key — it is no longer an alias to Strict HSPU.
    expect(ALIASES.hspu).toBeUndefined()
  })
})

describe('buildRegistryIndex + resolveExercise', () => {
  const registry = {
    LPO: [{ name: 'Bar Muscle-up' }, { name: 'Clean & Jerk' }],
    Skill: [{ name: 'Toes to Bar', videoUrl: 'https://youtu.be/x' }],
    Cardio: [{ name: 'Run' }, { name: 'Bike (Assault/Echo)' }],
    Força: [{ name: 'Deadlift', defaults: { sets: 5, reps: '5' } }],
  }

  test('direct case/accent/whitespace-insensitive match, no alias needed', () => {
    const entry = resolveExercise('  bar muscle-up  ', registry)
    expect(entry?.name).toBe('Bar Muscle-up')
  })

  test('shorthand alias resolves to canonical entry', () => {
    expect(resolveExercise('BMU', registry)?.name).toBe('Bar Muscle-up')
    expect(resolveExercise('T2B', registry)?.name).toBe('Toes to Bar')
    // #211: bare HSPU → the general entry (any form), not Strict HSPU.
    expect(
      resolveExercise(
        'HSPU ',
        buildRegistryIndex({
          Skill: [{ name: 'Strict HSPU' }, { name: 'Handstand Push-up (HSPU)' }],
        }),
      )?.name,
    ).toBe('Handstand Push-up (HSPU)')
  })

  test('pt-BR / English machine-name alias resolves', () => {
    expect(resolveExercise('Corrida', registry)?.name).toBe('Run')
    expect(
      resolveExercise('ROW', buildRegistryIndex({ Cardio: [{ name: 'Remo (Ergômetro)' }] }))?.name,
    ).toBe('Remo (Ergômetro)')
  })

  test('leading volume prefix stripped before alias lookup', () => {
    expect(resolveExercise("10' BIKE", registry)?.name).toBe('Bike (Assault/Echo)')
    expect(resolveExercise("10' Run", registry)?.name).toBe('Run')
  })

  test('stripping a leading count never INVENTS a match', () => {
    expect(resolveExercise('12 GHD', registry)).toBeNull()
    expect(resolveExercise('800m Nonsense Movement', registry)).toBeNull()
  })

  test('trailing zone suffix stripped before alias lookup', () => {
    expect(resolveExercise('Run Z1', registry)?.name).toBe('Run')
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
      { name: 'Toes to Bar' },
      { name: 'Chest-to-Bar' },
      { name: 'Strict HSPU' },
      { name: 'Handstand Walk' },
      { name: 'Nordic Curl' },
      { name: 'Pistol Squat' },
      // #211: the strict / general / variant entries the fixture rows below now resolve to.
      { name: 'Strict Toes to Bar' },
      { name: 'Handstand Push-up (HSPU)' },
      { name: 'Supinated Strict Pull-up' },
      { name: 'Ring Strict Pull-up' },
    ],
    Cardio: [
      { name: 'Run' },
      { name: 'Remo (Ergômetro)' },
      { name: 'Bike (Assault/Echo)' },
      { name: 'Ski Erg' },
    ],
    Força: [
      { name: 'Overhead Squat' },
      { name: 'Double Under' },
      { name: 'Strict Pull-up' },
      { name: 'Plank' },
      { name: 'Side Plank' },
      { name: 'Barbell Row' },
      { name: 'Bicep Curl' },
      { name: "Farmer's Carry" },
      { name: 'Front Raise' },
      { name: 'Lateral Raise' },
      { name: 'Deadlift' },
      { name: 'Deficit Deadlift' },
      { name: 'Strict Press' },
      { name: 'Seated Strict Press' },
      { name: 'Bulgarian Split Squat' },
      { name: 'Hip Thrust' },
      { name: 'Ring Dip' },
    ],
  }
  const index = buildRegistryIndex(registry)

  // #211 changed these rows — a spelled-out Strict / supinated / ring / deficit / seated is its own
  // entry, and a plain name (T2B, HSPU) is the general one. Rows marked below moved from the base.
  const cases = [
    ['BMU', 'Bar Muscle-up'],
    ['BMU ', 'Bar Muscle-up'],
    ['RING MU', 'Ring Muscle-up'],
    ['T2B', 'Toes to Bar'],
    ['STRICT T2B ', 'Strict Toes to Bar'], // #211 (was Toes to Bar)
    ['Strict T2B', 'Strict Toes to Bar'], // #211
    ['C2B ', 'Chest-to-Bar'],
    ['HSPU', 'Handstand Push-up (HSPU)'], // #211 (was Strict HSPU)
    ['HSPU ', 'Handstand Push-up (HSPU)'], // #211
    ['6 STRICT HSPU ', 'Strict HSPU'],
    ['DU ', 'Double Under'],
    ['DU', 'Double Under'],
    ['50 DU ', 'Double Under'],
    ['OHS ', 'Overhead Squat'],
    ['OHS', 'Overhead Squat'],
    [' C&J ', 'Clean & Jerk'],
    ['C&J', 'Clean & Jerk'],
    ['Run', 'Run'],
    ['RUN', 'Run'],
    ['Run ', 'Run'],
    ["20' Run", 'Run'],
    ['Run Z1', 'Run'],
    ['Corrida', 'Run'],
    ['CORRIDA ', 'Run'],
    ['Row', 'Remo (Ergômetro)'],
    ['ROW', 'Remo (Ergômetro)'],
    ['ROW ', 'Remo (Ergômetro)'],
    ["10' BIKE ", 'Bike (Assault/Echo)'],
    ["10' BIKE", 'Bike (Assault/Echo)'],
    ["10' SKI", 'Ski Erg'],
    ['Ski', 'Ski Erg'],
    ['SKI ', 'Ski Erg'],
    ['PISTOLS ', 'Pistol Squat'],
    ['Pistol', 'Pistol Squat'],
    ['FLEXÃO NÓRDICA ', 'Nordic Curl'],
    ['HSW ', 'Handstand Walk'],
    ['HSW', 'Handstand Walk'],
    ['RING DIPS ', 'Ring Dip'],
    ['PRANCHA ', 'Plank'],
    ['PRANCHA LATERAL ', 'Side Plank'],
    ['BENT OVER ROW ', 'Barbell Row'],
    ['ROSCA DIRETA', 'Bicep Curl'],
    ['FARM CARRY ', "Farmer's Carry"],
    ['ELEVAÇÃO FRONTAL ', 'Front Raise'],
    ['Elevacao Lateral', 'Lateral Raise'],
    ['DÉFICIT DEADLIFT ', 'Deficit Deadlift'], // #211 (was Deadlift)
    ['STRICT PRESS SENTADO ', 'Seated Strict Press'], // #211 (was Strict Press)
    ['BÚLGARO SQUAT ', 'Bulgarian Split Squat'],
    ['HIP THRUSTER ', 'Hip Thrust'],
    ['STRICT PULL UP SUPINADO', 'Supinated Strict Pull-up'], // #211 (was Strict Pull-up)
    ['STRICT PULL UP ARGOLA ', 'Ring Strict Pull-up'], // #211 (was Strict Pull-up)
  ]

  test.each(cases)('%j resolves to %j', (typed, canonical) => {
    expect(resolveExercise(typed, index)?.name).toBe(canonical)
  })
})

// #94 (2026-07-25) — the prod audit's second bucket was 179 unresolved occurrences that
// were only ever "movement name with the prescription glued to the front". Every `typed`
// string below is verbatim from that report.
describe('#94 · leading prescription volume is peeled off', () => {
  const index = buildRegistryIndex({
    Cardio: [
      { name: 'Run' },
      { name: 'Remo (Ergômetro)' },
      { name: 'Bike (Assault/Echo)' },
      { name: 'Ski Erg' },
      { name: "Farmer's Carry" },
      { name: 'Sled Pull' },
      { name: 'Wall Ball' },
    ],
    Core: [
      { name: 'Hollow Hold' },
      { name: 'GHD Sit-up' },
      { name: 'Plank' },
      { name: 'Side Plank' },
    ],
    Skill: [
      { name: 'Chest-to-Bar' },
      { name: 'Bar Muscle-up' },
      { name: 'Strict Pull-up' },
      { name: 'Supinated Strict Pull-up' }, // #211
      { name: 'Strict HSPU' },
    ],
    Força: [
      { name: 'Bulgarian Split Squat' },
      { name: 'Deadlift' },
      { name: 'Deficit Deadlift' }, // #211
      { name: 'Front Squat' },
      { name: 'Thruster' },
      { name: 'DB Thruster' },
    ],
  })

  const cases = [
    ['800m Run', 'Run'],
    ['600m run', 'Run'],
    ['100m Run', 'Run'],
    ['7200m Run', 'Run'],
    ['5k Run z2', 'Run'],
    ['20’ z1 Run', 'Run'],
    ['200m Row', 'Remo (Ergômetro)'],
    ['1000m Row', 'Remo (Ergômetro)'],
    ['12 cal row', 'Remo (Ergômetro)'],
    ['15/10 cal Row', 'Remo (Ergômetro)'],
    ['40 cal bike', 'Bike (Assault/Echo)'],
    ['20’ z2 bike', 'Bike (Assault/Echo)'],
    ['8/10 cal bike', 'Bike (Assault/Echo)'],
    ['500m Ski', 'Ski Erg'],
    ['30M Farm carry', "Farmer's Carry"],
    ['100m Farm carry', "Farmer's Carry"],
    ['10m sled pull', 'Sled Pull'],
    ['30m sled pull', 'Sled Pull'],
    ['50 Wall Ball', 'Wall Ball'],
    ['30 wall ball', 'Wall Ball'],
    ['20 WALL BALL', 'Wall Ball'],
    ['40” Hollow Hold', 'Hollow Hold'],
    ['15 GHD', 'GHD Sit-up'],
    ['12 GHD', 'GHD Sit-up'],
    ['1’ Prancha Ventral', 'Plank'],
    ['40” prancha', 'Plank'],
    ['30/30” prancha lat', 'Side Plank'],
    ['30/30” Prancha lateral', 'Side Plank'],
    ['21-15-9 C2B', 'Chest-to-Bar'],
    ['2-3-4-5… C2B', 'Chest-to-Bar'],
    ['2-4-6-8… BMU', 'Bar Muscle-up'],
    ['2-3-4-5…… Strict HSPU', 'Strict HSPU'],
    ['21-15-9 S Hspu', 'Strict HSPU'],
    ['8/8 Búlgaro Squat', 'Bulgarian Split Squat'],
    ['10/10 heavy búlgaro', 'Bulgarian Split Squat'],
    ['20-15-10-5 Deadlift', 'Deadlift'],
    ['3 Deadlift déficit', 'Deficit Deadlift'], // #211 (was Deadlift)
    ['10-8-6-4-2 FRONT SQUAT', 'Front Squat'],
    // Load variants are their own entries (coach's call), so DB Thruster ≠ Thruster.
    ['10 Thruster', 'Thruster'],
    ['4 DB Thruster', 'DB Thruster'],
    // The unit letter must not eat a real word: "5 s|trict…" would mangle the name.
    ['5 Strict Pull Up supinada', 'Supinated Strict Pull-up'], // #211 (was Strict Pull-up)
    ['8 Strict Pull Up', 'Strict Pull-up'],
    ['10 Strict Pull Up', 'Strict Pull-up'],
  ]
  test.each(cases)('%j resolves to %j', (typed, canonical) => {
    expect(resolveExercise(typed, index)?.name).toBe(canonical)
  })

  test('a bare rep scheme with no movement resolves to nothing', () => {
    expect(resolveExercise('10-8-6-4-2', index)).toBeNull()
    expect(resolveExercise('600m z3', index)).toBeNull()
  })
})

// #94 round 2 — the other three places prescription hides: a lettered block's slot letter,
// a tempo/pause note glued to the end, and a trailing qualifier. All strings are verbatim
// from the report.
describe('#94 · slot letters, trailing tempo notes and qualifiers', () => {
  const index = buildRegistryIndex({
    LPO: [
      { name: 'Snatch Balance' },
      { name: 'Muscle Snatch' },
      { name: 'Clean' },
      { name: 'Hang Clean' },
      { name: 'Squat Clean' }, // #211
      { name: 'Hang Squat Clean' }, // #211
    ],
    Força: [
      { name: 'Bench Press' },
      { name: 'Split Jerk' },
      { name: 'Push Jerk' },
      { name: 'Front Squat' },
      { name: 'Back Squat' },
    ],
    Cardio: [{ name: 'Remo (Ergômetro)' }],
    Core: [
      { name: 'V-up' },
      { name: 'Hollow Rock' },
      { name: 'Dragon Flag' },
      { name: 'American KB Swing' },
    ],
    Acessórios: [{ name: 'Hammer Curl' }, { name: 'Nordic Curl' }, { name: 'Romanian Deadlift' }],
  })

  test.each([
    // Slot letter from a lettered block.
    ['A- 3 SNATCH BALANCE', 'Snatch Balance'],
    ['B 3 SNATCH BALANCE', 'Snatch Balance'],
    ['B- 2 Muscle Snatch', 'Muscle Snatch'],
    // Tempo / pause note glued to the end.
    ['3 Bench Press 3” pausa', 'Bench Press'],
    ['PAUSE BENCH PRESS 3"', 'Bench Press'],
    ['3 Bench Press pausa 2” no início e no meio', 'Bench Press'],
    ['3 Snatch balance 2”', 'Snatch Balance'],
    ['PUSH JERK 2”', 'Push Jerk'],
    ['2 split jerk 2” Dip 2” recepção', 'Split Jerk'],
    ['3 Front Squat 5” de pausa em baixo', 'Front Squat'],
    ['Squat clean 30" entre as reps', 'Squat Clean'], // #211 (was Clean)
    // Trailing qualifier in parens.
    ['3 split jerk (BNK)', 'Split Jerk'],
    ['4’ Row ( forte )', 'Remo (Ergômetro)'],
    // Alternating-sides suffix.
    ['12 martelo alt', 'Hammer Curl'],
    ['15 Vups', 'V-up'],
    ['V ups Alt', 'V-up'],
    // Misspellings of existing entries.
    ['Back squay', 'Back Squat'],
    ['Hollowrock', 'Hollow Rock'],
    ['8 Romenian Deadlift', 'Romanian Deadlift'],
    ['10 Hummer Curl', 'Hammer Curl'],
    ['8 Nordic Hamstring CuRl', 'Nordic Curl'],
    ['12 DRAGON FLY', 'Dragon Flag'],
    ['1 Squat Celan', 'Squat Clean'], // #211 (was Clean)
    ['3 Hang Squat Celan', 'Hang Squat Clean'], // #211 (was Hang Clean)
    ['15 A Swing', 'American KB Swing'],
  ])('%j → %j', (typed, canonical) => {
    expect(resolveExercise(typed, index)?.name).toBe(canonical)
  })

  test('a real entry whose own name ends in "(…)" still matches before any stripping', () => {
    const parens = buildRegistryIndex({ Mobilidade: [{ name: 'Hip Distraction (banded)' }] })
    expect(resolveExercise('Hip Distraction (banded)', parens)?.name).toBe(
      'Hip Distraction (banded)',
    )
  })

  test('an interval line is not mistaken for a slot letter', () => {
    // "A cada 3'" = "every 3 minutes" — the A must survive, so nothing resolves.
    expect(resolveExercise("A cada 3'", index)).toBeNull()
  })
})

// #94 round 2 — the coach's decisions: which typed names map onto an EXISTING entry rather
// than becoming a new one. The new entries themselves live in
// docs/reviews/94-round2-registry-additions.sql; this asserts the mapping half.
describe('#94 round 2 · decisions that map onto existing entries', () => {
  const index = buildRegistryIndex({
    Core: [{ name: 'Plate Sit-up' }, { name: 'Side Plank' }, { name: 'L-Sit' }],
    Skill: [
      { name: 'Kipping HSPU' },
      { name: 'Strict HSPU' },
      { name: 'Handstand Push-up (HSPU)' }, // #211
      { name: 'L-sit (rings)' },
      { name: 'Handstand Hold' },
      { name: 'Strict Pull-up' },
      { name: 'Rope Climb' },
      { name: 'Legless Rope Climb' },
      { name: 'Wall Walk' },
      { name: 'Shoulder Tap' },
      { name: 'Box Jump Over' },
      { name: 'Box Jump Step Down' }, // #211
      { name: 'Burpee Box Jump Over' },
      { name: 'Toes to Bar' },
      { name: 'Strict Toes to Bar' }, // #211
    ],
    Acessórios: [
      { name: 'Barbell Row' },
      { name: 'Supinated Barbell Row' }, // #211
      { name: 'Bulgarian Split Squat' },
      { name: 'Goblet Squat' },
      { name: 'DB Incline Press' }, // #211
    ],
    Força: [{ name: 'DB Bench Press' }, { name: 'Wall Sit' }],
  })

  test.each([
    // Coach: abs-with-a-plate IS the plate sit-up; prancha lat E/D are just left/right.
    ['ABS ANILHA', 'Plate Sit-up'],
    ['Abdominal com Anilha', 'Plate Sit-up'],
    ['Prancha lat E', 'Side Plank'],
    ['Prancha lat D', 'Side Plank'],
    // #211: a bare handstand push-up is the general entry (any form), not the kipping one — the same
    // logic as the bare Pull-up and Toes to Bar. (Round 2 had said "kipping".)
    ['Handstand Push Up', 'Handstand Push-up (HSPU)'],
    ["20'' Handstand Hold Wall", 'Handstand Hold'],
    ['30" HSW HOLD', 'Handstand Hold'],
    // "S" is the coach's shorthand for strict — R7 keeps the letter, so "8 S T2B" is not "8 seconds".
    ['HEAVY  S PULL UP', 'Strict Pull-up'],
    ['8 S T2B', 'Strict Toes to Bar'], // #211 (was Toes to Bar)
    // L-sit: argola (rings) is the existing entry, barra gets its own (in the SQL).
    ['30” Lsit argola', 'L-sit (rings)'],
    ["20'' L Sit Argola", 'L-sit (rings)'],
    // Spelling/plural variants of round-2 entries.
    ['3 Wall walking', 'Wall Walk'],
    ['Tap Shoulder', 'Shoulder Tap'],
    ['Wall Shoulder Taps', 'Shoulder Tap'],
    ['12 Bbjo step down', 'Burpee Box Jump Over'], // #211 (was Box Jump Over, which dropped the burpee)
    ['9-15-21 Box jump step down', 'Box Jump Step Down'], // #211 (was Box Jump Over)
    ['Burpees box jump over', 'Burpee Box Jump Over'],
    ['12 dB bench press inclinado', 'DB Incline Press'], // #211 (was DB Bench Press)
    ['8 GLOBET Squat (Heels Elevated)', 'Goblet Squat'],
    ['8 Remada low curvada', 'Barbell Row'],
    ['Remada curvada peg supinada', 'Supinated Barbell Row'], // #211 (was Barbell Row; a grip is a variant)
    ['BÚLGARO SQUAT COM (1 Anilha )', 'Bulgarian Split Squat'],
    ['40” Wall Sit hold', 'Wall Sit'],
    ['1 Legless', 'Legless Rope Climb'],
  ])('%j → %j', (typed, canonical) => {
    expect(resolveExercise(typed, index)?.name).toBe(canonical)
  })
})

// #94 — new entries carry the coach's shorthand in parens ("Single Under (SU)"), and both
// halves must resolve without a hand-written alias per entry.
describe('#94 · "(SHORTHAND)" in an entry name is indexed automatically', () => {
  const index = buildRegistryIndex({
    Skill: [{ name: 'Single Under (SU)' }, { name: 'Burpee Over the Bar (BOB)' }],
    Força: [{ name: 'Shoulder to Overhead (S2OH)' }],
    Cardio: [{ name: 'Remo (Ergômetro)' }, { name: 'Bike (Assault/Echo)' }],
    Mobilidade: [{ name: 'Hip Distraction (banded)' }],
  })

  test.each([
    ['SU', 'Single Under (SU)'],
    ['Single Under', 'Single Under (SU)'],
    ['single under (su)', 'Single Under (SU)'],
    ['30 SU Crossover', null],
    ['BOB', 'Burpee Over the Bar (BOB)'],
    ['BoB', 'Burpee Over the Bar (BOB)'],
    ['Burpee Over the Bar', 'Burpee Over the Bar (BOB)'],
    ['S2OH', 'Shoulder to Overhead (S2OH)'],
    ['Shoulder to Overhead', 'Shoulder to Overhead (S2OH)'],
    // A load variant is its own entry, so it must NOT collapse onto the base movement.
    ['10 DUAL DB S2OH', null],
  ])('%j → %j', (typed, canonical) => {
    expect(resolveExercise(typed, index)?.name ?? null).toBe(canonical)
  })

  test('a disambiguator paren is NOT treated as a shorthand key', () => {
    // The base name resolves…
    expect(resolveExercise('Remo', index)?.name).toBe('Remo (Ergômetro)')
    expect(resolveExercise('Hip Distraction', index)?.name).toBe('Hip Distraction (banded)')
    // …but the parenthetical itself is not a lookup key (it isn't a shorthand).
    expect(resolveExercise('Ergômetro', index)).toBeNull()
    expect(resolveExercise('banded', index)).toBeNull()
    expect(resolveExercise('Assault/Echo', index)).toBeNull()
  })

  test('a derived base name never shadows a real entry of that name', () => {
    const shadow = buildRegistryIndex({
      LPO: [{ name: 'Snatch', notes: 'the real one' }, { name: 'Snatch (Power)' }],
    })
    expect(resolveExercise('Snatch', shadow)?.notes).toBe('the real one')
  })

  test('derived keys share the entry object, so categories stay correct', () => {
    const multi = buildRegistryIndex({
      Skill: [{ name: 'Single Under (SU)' }],
      Cardio: [{ name: 'Single Under (SU)' }],
    })
    expect(resolveExercise('SU', multi)?.categories).toEqual(['Skill', 'Cardio'])
  })
})

// #94 — the alias batch the coach signed off on.
describe('#94 · alias batch', () => {
  const index = buildRegistryIndex({
    LPO: [
      { name: 'Clean' },
      { name: 'Hang Clean' },
      { name: 'Snatch' },
      { name: 'Hang Snatch' },
      // #211: the squat forms are entries of their own.
      { name: 'Squat Clean' },
      { name: 'Hang Squat Clean' },
      { name: 'Floor Squat Clean' },
      { name: 'Low Hang Squat Clean' },
      { name: 'Squat Snatch' },
      { name: 'Hang Squat Snatch' },
    ],
    Core: [
      { name: 'GHD Sit-up' },
      { name: 'GHD Back Extension' },
      { name: 'Plank' },
      { name: 'Side Plank' },
    ],
    Cardio: [{ name: 'Run' }, { name: 'Remo (Ergômetro)' }],
    Skill: [{ name: 'Pull-up' }],
    Acessórios: [
      { name: 'Russian Row' },
      { name: 'Barbell Row' },
      { name: 'Hammer Curl' },
      { name: 'Lateral Raise' },
    ],
    Força: [{ name: 'Good Morning' }],
  })

  test.each([
    // #211 retired "a squat clean/snatch IS the full lift": the coach writes "squat" when he wants
    // it, so each form is its own entry, and "low" means the low HANG.
    ['Squat Clean', 'Squat Clean'],
    ['squat clean', 'Squat Clean'],
    ['Floor Squat Clean', 'Floor Squat Clean'],
    ['2 Low Squat Clean', 'Low Hang Squat Clean'],
    ['6 Hang Squat Clean', 'Hang Squat Clean'],
    ['Squat Snatch', 'Squat Snatch'],
    ['Hang Squat Snatch', 'Hang Squat Snatch'],
    // …and the plain lifts stay plain.
    ['Clean', 'Clean'],
    ['Hang Clean', 'Hang Clean'],
    ['Snatch', 'Snatch'],
    // GHD.
    ['GHD', 'GHD Sit-up'],
    ['20 GHD Hiperextensão', 'GHD Back Extension'],
    ['GHD HIPERTENSÃO', 'GHD Back Extension'],
    // pt-BR.
    ['Corrida', 'Run'],
    ['Remador', 'Remo (Ergômetro)'],
    ['15 Abs remador', null],
    ['Remada Russa', 'Russian Row'],
    ['8 remada russa', 'Russian Row'],
    ['6 Remada curvada', 'Barbell Row'],
    ['10 bom dia', 'Good Morning'],
    ['12 martelo alt', 'Hammer Curl'],
    ['8 elevação lat', 'Lateral Raise'],
    ['Prancha ventral', 'Plank'],
    ['Prancha lat D', 'Side Plank'],
    ['Prancha lat E', 'Side Plank'],
    // Hyphen vs space — normExName keeps hyphens, so both spellings need to work.
    ['Pull-up', 'Pull-up'],
    ['Pull-Up', 'Pull-up'],
    ['PULL UP', 'Pull-up'],
    ['15 PuLl Up', 'Pull-up'],
    ['25 Pull Up', 'Pull-up'],
  ])('%j → %j', (typed, canonical) => {
    expect(resolveExercise(typed, index)?.name ?? null).toBe(canonical)
  })
})

// ── #211 (2026-11-22) — the exercise-names pass ──────────────────────────────────────────────
// docs/reviews/2026-11-22-exercise-names-decisions.md. The user's rules, which the suites below
// pin: a variant is its own entry; a plain name means any form and a spelled-out "Strict" means the
// strict entry; "squat" is not the plain lift; "low" means low hang; Devil Press is one dumbbell.
// The fixture is a slice of the registry AFTER the #211 SQL — only the names these suites need.
const R211 = {
  Skill: [
    { name: 'Double Under' },
    { name: 'Double Under Crossover' },
    { name: 'Single Under (SU)' },
    { name: 'Single Under Crossover' },
    { name: 'Handstand Push-up (HSPU)' },
    { name: 'Strict HSPU' },
    { name: 'Kipping HSPU' },
    { name: 'Toes to Ring' },
    { name: 'Pull-up' },
    { name: 'Strict Pull-up' },
    { name: 'Supinated Strict Pull-up' },
    { name: 'Pronated Strict Pull-up' },
    { name: 'Ring Strict Pull-up' },
    { name: 'Box Jump Over' },
    { name: 'Box Jump Step Down' },
    { name: 'Burpee Box Jump Over' },
    { name: 'Chest-to-Bar' },
    { name: 'Ring Muscle-up' },
    { name: 'Bar Muscle-up' },
    { name: 'Legless Rope Climb' },
    { name: 'Rope Climb' },
    { name: 'Handstand Walk' },
    { name: 'Wall Walk' },
    { name: 'Pike up Row' },
    { name: 'Devil Press' },
    { name: 'Dual DB Devil Press' },
  ],
  Core: [
    { name: 'Toes to Bar' },
    { name: 'Strict Toes to Bar' },
    { name: 'Plank' },
    { name: 'Prancha Lateral Dinâmica' },
    { name: 'American KB Swing' },
    { name: 'Russian KB Swing' },
    { name: 'Arch Hold (Superman)' },
    { name: 'DUal KB Overhead Walking' },
  ],
  LPO: [
    { name: 'Clean' },
    { name: 'Hang Clean' },
    { name: 'Power Clean' },
    { name: 'Snatch' },
    { name: 'Hang Snatch' },
    { name: 'Power Snatch' },
    { name: 'Squat Clean' },
    { name: 'Hang Squat Clean' },
    { name: 'Squat Snatch' },
    { name: 'Hang Squat Snatch' },
    { name: 'Low Hang Squat Snatch' },
    { name: 'Low Hang Snatch' },
    { name: 'Low Hang Power Clean' },
    { name: 'Power Snatch Balance' },
    { name: 'Jerk Balance' },
    { name: 'DB Clean & Jerk' },
    { name: 'DB Hang Clean & Jerk' },
  ],
  Força: [
    { name: 'Deadlift' },
    { name: 'Deficit Deadlift' },
    { name: 'Strict Press' },
    { name: 'Seated Strict Press' },
    { name: 'DB Strict Press' },
    { name: 'KB Strict Press' },
    { name: 'Bench Press' },
    { name: 'DB Bench Press' },
    { name: 'Thruster' },
    { name: 'Back Squat' },
    { name: 'Overhead Squat' },
    { name: 'KB Deadlift' },
    { name: 'KB Sumo Deadlift High Pull (SDHP)' },
    { name: 'Barbell Row' },
    { name: 'Supinated Barbell Row' },
  ],
  Acessórios: [
    { name: 'Incline Press' },
    { name: 'DB Incline Press' },
    { name: 'Walking Lunge' },
    { name: 'Lunge' },
    { name: 'Step-up' },
    { name: 'Box Step Over' },
    { name: 'Dumbbell Row' },
    { name: 'Dual DB Row' },
    { name: 'Front Raise' },
    { name: 'Front Plate Raise' },
    { name: 'Hammer Curl' },
    { name: 'Bulgarian Split Squat' },
  ],
  Aquecimento: [
    { name: 'Kipping Swing' },
    { name: 'KB Halo' },
    { name: 'Mountain Climber' },
    { name: 'Kang Squat' },
    { name: 'Plate Jump' },
    { name: 'Hip 90/90' },
    { name: 'C-Skip' },
    { name: 'A-Skip' },
  ],
  Cardio: [
    { name: 'Run' },
    { name: 'Wall Ball' },
    { name: 'Burpee' },
    { name: 'Burpee Box Step-up' },
    { name: 'Burpee Over the Bar (BOB)' },
    { name: 'Bike (Assault/Echo)' },
    { name: 'Remo (Ergômetro)' },
    { name: "Farmer's Carry" },
    { name: 'Sandbag Carry' },
  ],
}
const i211 = buildRegistryIndex(R211)
const name211 = typed => resolveExercise(typed, i211)?.name ?? null

describe('#211 · a variant is its own entry, a plain name means any form', () => {
  test.each([
    // Bare / strict pairs — "Strict" spelled out goes to the strict entry, the plain name to the
    // general one (Toes to Bar and Pull-up were already so; HSPU joined them).
    ['T2B', 'Toes to Bar'],
    ['Toes to Bar', 'Toes to Bar'],
    ['Strict T2B', 'Strict Toes to Bar'],
    ['Strict Toes to Bar', 'Strict Toes to Bar'],
    ['Stric T2B', 'Strict Toes to Bar'],
    ['HSPU', 'Handstand Push-up (HSPU)'],
    ['12 HSPU', 'Handstand Push-up (HSPU)'],
    ['Handstand Push Up', 'Handstand Push-up (HSPU)'],
    ['Handstand Push-up', 'Handstand Push-up (HSPU)'],
    ['Strict HSPU', 'Strict HSPU'],
    ['Kipping HSPU', 'Kipping HSPU'],
    ['Strict Handstand Push-Ups', 'Strict HSPU'],
    ['Pull Up', 'Pull-up'],
    ['Strict Pull Up', 'Strict Pull-up'],
    ['Strict Pull Up supinado', 'Supinated Strict Pull-up'],
    ['Strict Pull Up Pronado', 'Pronated Strict Pull-up'],
    ['strict pull up argola', 'Ring Strict Pull-up'],
    // "squat" is not the plain lift, and "low" means the low hang.
    ['Clean', 'Clean'],
    ['Squat Clean', 'Squat Clean'],
    ['Hang Squat Clean', 'Hang Squat Clean'],
    ['Snatch', 'Snatch'],
    ['Squat Snatch', 'Squat Snatch'],
    ['Low Squat Snatch', 'Low Hang Squat Snatch'],
    ['Low Snatch', 'Low Hang Snatch'],
    ['Low Power Clean', 'Low Hang Power Clean'],
    // Deficit, seated, grip.
    ['Deadlift', 'Deadlift'],
    ['Déficit Deadlift', 'Deficit Deadlift'],
    ['Defict Deadlift', 'Deficit Deadlift'],
    ['Deadlift déficit', 'Deficit Deadlift'],
    ['Strict Press', 'Strict Press'],
    ['Shoulder Press', 'Strict Press'],
    ['Shoulders Press sentado', 'Seated Strict Press'],
    ['Remada curvada pegada supinada', 'Supinated Barbell Row'],
    // Single vs dual, walking vs in place, step-over.
    ['Lunge', 'Lunge'],
    ['Walking Lunges', 'Walking Lunge'],
    ['Box Step over', 'Box Step Over'],
    ['Box Step Up over', 'Box Step Over'],
    ['Box Jump Over', 'Box Jump Over'],
    ['Box jump desce step down', 'Box Jump Step Down'],
    ['Dumbbell Row', 'Dumbbell Row'],
    ['Dual Dumbbell Row', 'Dual DB Row'],
    // In this box a Devil Press is ONE dumbbell; the pair is its own entry.
    ['Devil Press', 'Devil Press'],
    ['DB Devil Press', 'Devil Press'],
    ['Dual Devil press', 'Dual DB Devil Press'],
    ['Dual DB Devil press', 'Dual DB Devil Press'],
    // A press: the unspecified one is the barbell; a per-side scheme is single-arm.
    ['Military Press', 'Strict Press'],
    ['8/8 Military Press', 'DB Strict Press'],
    ['KB Military Press', 'KB Strict Press'],
    // Incline dumbbell press is its own entry; the bare incline press stays the base.
    ['db bench press inclinado', 'DB Incline Press'],
    ['DB Incline Bench Press', 'DB Incline Press'],
    ['Incline Press', 'Incline Press'],
    // Crossover skills are jump-rope techniques of their own, not Double Under.
    ['DU', 'Double Under'],
    ['DU Crossover', 'Double Under Crossover'],
    ['Double Under Crossover', 'Double Under Crossover'],
    ['SU Crossover', 'Single Under Crossover'],
    ['30 SU Crossover', 'Single Under Crossover'],
    ['DU/SU Crossover', 'Double Under Crossover'],
  ])('%j → %j', (typed, canonical) => {
    expect(name211(typed)).toBe(canonical)
  })

  test('DU Crossover no longer resolves to Double Under (it did, through an alias, until #211)', () => {
    expect(name211('DU Crossover')).not.toBe('Double Under')
  })

  test('the aliases #211 removed are gone, because the entries they pointed past now exist', () => {
    // Each was either an exact entry name (the index wins before ALIASES) or derived from one.
    const removed = [
      'hspu',
      'handstand push up',
      'handstand push-up',
      'deficit deadlift',
      'squat clean',
      'floor squat clean',
      'hang squat clean',
      'high hang squat clean',
      'squat snatch',
      'hang squat snatch',
      'low hang clean',
      'box jump step down',
    ]
    removed.forEach(k => expect(ALIASES[k], k).toBeUndefined())
  })

  test('retargeted aliases point at the new entries', () => {
    expect(ALIASES['du crossover']).toBe('Double Under Crossover')
    expect(ALIASES['strict t2b']).toBe('Strict Toes to Bar')
    expect(ALIASES['s t2b']).toBe('Strict Toes to Bar')
    expect(ALIASES['strict press sentado']).toBe('Seated Strict Press')
    expect(ALIASES['strict pull up supinado']).toBe('Supinated Strict Pull-up')
    expect(ALIASES['deadlift deficit']).toBe('Deficit Deadlift')
    expect(ALIASES['db bench press inclinado']).toBe('DB Incline Press')
    expect(ALIASES['bbjo step down']).toBe('Burpee Box Jump Over')
  })
})

describe('#211 · shorthand, spellings and the new entries', () => {
  test.each([
    ['WB', 'Wall Ball'],
    ['T2R', 'Toes to Ring'],
    ['BJO', 'Box Jump Over'],
    ['Kipping', 'Kipping Swing'],
    ['KB Swing', 'Russian KB Swing'],
    ['A Swing', 'American KB Swing'],
    ['Pike Up', 'Pike up Row'],
    ['Power Balance', 'Power Snatch Balance'],
    ['Kangoo Squat', 'Kang Squat'],
    ['Saltos na anilha', 'Plate Jump'],
    ['HWS com obstáculos', 'Handstand Walk'],
    ['Superman', 'Arch Hold (Superman)'],
    ['Superman Hold', 'Arch Hold (Superman)'],
    ['Moutain Climbers', 'Mountain Climber'],
    ['DB C&J', 'DB Clean & Jerk'],
    ['DB Hang C&J', 'DB Hang Clean & Jerk'],
    ['KB SDHP', 'KB Sumo Deadlift High Pull (SDHP)'],
    ['SDHP', 'KB Sumo Deadlift High Pull (SDHP)'],
    ['KB Sumo Deadlift High Pull', 'KB Sumo Deadlift High Pull (SDHP)'],
    ['Hallo KB', 'KB Halo'],
    ['halo', 'KB Halo'],
    ['Prancha lateral dinâmica E', 'Prancha Lateral Dinâmica'],
    ['Prancha lat dinâmica', 'Prancha Lateral Dinâmica'],
    ['Burpees Step Up', 'Burpee Box Step-up'],
    ['Burpee Box Step Up', 'Burpee Box Step-up'],
    ['Elevação Frontal plate', 'Front Plate Raise'],
    ['Kb oh walking 2kb', 'DUal KB Overhead Walking'],
    // The fixture keeps prod's pre-rename spelling of the Core entry; the SQL renames it "Dual…".
    ['Burpees over the bar', 'Burpee Over the Bar (BOB)'],
    ['Burpee over the line', 'Burpee Over the Bar (BOB)'],
    ['Farm', "Farmer's Carry"],
    ['Dual KB Walking', "Farmer's Carry"],
  ])('%j → %j', (typed, canonical) => {
    expect(name211(typed)).toBe(canonical)
  })
})

describe('#211 · resolver fallbacks', () => {
  describe('R2 · the first alternative of "A / B"', () => {
    test.each([
      ['RMU / 12 Pull Up', 'Ring Muscle-up'],
      ['RMU/ BMU', 'Ring Muscle-up'],
      ['Legless / RC', 'Legless Rope Climb'],
      ['HSW / 5 Wall Walk', 'Handstand Walk'],
      ['C2B /Pull Up', 'Chest-to-Bar'],
      ['Sandbag Carry/Farm carry Heavy', 'Sandbag Carry'],
      ['Row/ Run', 'Remo (Ergômetro)'],
    ])('%j → %j', (typed, canonical) => {
      expect(name211(typed)).toBe(canonical)
    })

    test('splits only with a letter on BOTH sides of the slash', () => {
      expect(firstAlternative('rmu / 12 pull up')).toBe('rmu')
      expect(firstAlternative('8/8 busca')).toBeNull() // a per-side scheme
      expect(firstAlternative('thruster 60/45')).toBeNull() // a load pair
      expect(firstAlternative('thrusters 40/30 30/25')).toBeNull()
      expect(firstAlternative('/ run')).toBeNull() // nothing on the left
      expect(firstAlternative('no slash')).toBeNull()
    })

    test('never moves a name that resolves without it', () => {
      // An exact alias with a slash wins before R2 is tried.
      expect(name211('DU/SU Crossover')).toBe('Double Under Crossover')
      expect(name211('8/8 Búlgaro Squat')).toBe('Bulgarian Split Squat')
    })

    test('an alternative that resolves to nothing stays unresolved', () => {
      expect(name211('Quem já faz / Aquecimento')).toBeNull()
    })
  })

  describe('R3 · a prescription glued to the END of the name', () => {
    test.each([
      ['Thruster 60/45', 'Thruster'],
      ['Thrusters 40/30 30/25', 'Thruster'],
      ['Back Squat 60% Rm', 'Back Squat'],
      ['OHS 50% rm', 'Overhead Squat'],
      ['Back Squat 80% do RM', 'Back Squat'],
      ['Hummer Curl 3 x 10', 'Hammer Curl'],
      ['Deadlift 100/75 90/65', 'Deadlift'],
      ['Power Snatch Unbrk', 'Power Snatch'],
      ['Wall Balls Unbroken', 'Wall Ball'],
      ['Run leve', 'Run'],
      ['Snatch 20kg', 'Snatch'],
    ])('%j → %j', (typed, canonical) => {
      expect(name211(typed)).toBe(canonical)
    })

    test('peelTrailing peels several in a row and nothing else', () => {
      expect(peelTrailing('deadlift 100/75 90/65')).toBe('deadlift')
      expect(peelTrailing('back squat 60% rm')).toBe('back squat')
      expect(peelTrailing('hummer curl 3 x 10')).toBe('hummer curl')
      expect(peelTrailing('power snatch unbrk')).toBe('power snatch')
      expect(peelTrailing('plain name')).toBe('plain name')
      expect(peelTrailing('c2b')).toBe('c2b') // a digit inside a word is not a trailing load
    })

    test('an entry that really ends in numbers still matches first', () => {
      expect(name211('Hip 90/90')).toBe('Hip 90/90')
    })
  })

  describe('R4 · a leading step label with no quantity after it', () => {
    test('A Jerk Balance → Jerk Balance', () => {
      expect(name211('A Jerk Balance')).toBe('Jerk Balance')
      expect(dropStepLabel('a jerk balance')).toBe('jerk balance')
    })

    test('a real entry that starts with a lone letter is untouched (it resolves before R4)', () => {
      expect(name211('C Skips')).toBe('C-Skip')
      expect(name211('A Skip')).toBe('A-Skip')
    })

    test('an interval line is still not a label', () => {
      expect(name211("A cada 3'")).toBeNull()
    })
  })

  describe('R5 · a multi-alternative parenthetical answers to each alternative', () => {
    test('Assault Bike / Echo Bike → Bike (Assault/Echo)', () => {
      expect(name211('Echo Bike')).toBe('Bike (Assault/Echo)')
      expect(name211('Assault Bike')).toBe('Bike (Assault/Echo)')
      expect(name211('10 cal Assault Bike')).toBe('Bike (Assault/Echo)')
    })

    test('a disambiguator paren adds no such key', () => {
      expect(name211('Ergômetro Remo')).toBeNull()
      expect(name211('Assault/Echo')).toBeNull()
    })
  })

  describe('R7 · "S" is the coach\'s strict, not seconds', () => {
    test.each([
      ['21-15-9 S Hspu', 'Strict HSPU'],
      ['5 S Pull Up', 'Strict Pull-up'],
      ['8 S T2B', 'Strict Toes to Bar'],
    ])('%j → %j', (typed, canonical) => {
      expect(name211(typed)).toBe(canonical)
    })

    test('a real unit still strips: it leaves nothing that resolves, so the old form runs', () => {
      expect(name211('800m Run')).toBe('Run')
      expect(name211('30 s Plank')).toBe('Plank')
      expect(name211('30s Plank')).toBe('Plank')
      expect(name211('10 x Burpee')).toBe('Burpee')
      expect(name211('5k Run z2')).toBe('Run')
    })

    test('"5 Strict Pull Up" keeps its S: the unit letter is followed by a letter', () => {
      expect(name211('5 Strict Pull Up')).toBe('Strict Pull-up')
    })
  })
})

describe('#211 · what must not move', () => {
  test.each([
    'Clean',
    'Snatch',
    'Hang Clean',
    'Hang Snatch',
    'Power Clean',
    'Power Snatch',
    'Toes to Bar',
    'Pull-up',
    'Deadlift',
    'Strict Press',
    'Bench Press',
    'Thruster',
    'Hip 90/90',
    'Bike (Assault/Echo)',
    'Box Jump Over',
    'Lunge',
    'Dumbbell Row',
  ])('%j still resolves to itself', n => {
    expect(name211(n)).toBe(n)
  })

  test('names held back for the user stay unresolved (no detail page beats the wrong one)', () => {
    // A bare LOW SQUAT is a position, and the lift comes from context. Jerk and Hang Power are
    // fragments of a complex. The September aliases that sent a variant to its base are #250.
    expect(name211('LOW SQUAT')).toBeNull()
    expect(name211('Jerk')).toBeNull()
    expect(name211('Hang Power')).toBeNull()
    expect(name211('Plate Overhead Lunge')).toBeNull()
    expect(name211('Banded Deadlift')).toBeNull()
    expect(name211('Push Up dog Down')).toBeNull()
  })

  test('every alias value is a non-empty string (the live dangling check is audit-session-registry)', () => {
    const bad = Object.entries(ALIASES).filter(([, v]) => typeof v !== 'string' || !v.trim())
    expect(bad).toEqual([])
    expect(Object.keys(ALIASES).length).toBe(297)
  })
})
