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
    expect(resolveExercise('HSPU ', buildRegistryIndex({ Skill: [{ name: 'Strict HSPU' }] }))?.name).toBe('Strict HSPU')
  })

  test('pt-BR / English machine-name alias resolves', () => {
    expect(resolveExercise('Corrida', registry)?.name).toBe('Run')
    expect(resolveExercise('ROW', buildRegistryIndex({ Cardio: [{ name: 'Remo (Ergômetro)' }] }))?.name).toBe('Remo (Ergômetro)')
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
      { name: 'Toes to Bar' }, { name: 'Chest-to-Bar' }, { name: 'Strict HSPU' },
      { name: 'Handstand Walk' }, { name: 'Nordic Curl' }, { name: 'Pistol Squat' },
    ],
    Cardio: [{ name: 'Run' }, { name: 'Remo (Ergômetro)' }, { name: 'Bike (Assault/Echo)' }, { name: 'Ski Erg' }],
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
    ['Run', 'Run'], ['RUN', 'Run'], ['Run ', 'Run'], ["20' Run", 'Run'], ['Run Z1', 'Run'],
    ['Corrida', 'Run'], ['CORRIDA ', 'Run'],
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

// #94 (2026-07-25) — the prod audit's second bucket was 179 unresolved occurrences that
// were only ever "movement name with the prescription glued to the front". Every `typed`
// string below is verbatim from that report.
describe('#94 · leading prescription volume is peeled off', () => {
  const index = buildRegistryIndex({
    Cardio: [
      { name: 'Run' }, { name: 'Remo (Ergômetro)' }, { name: 'Bike (Assault/Echo)' },
      { name: 'Ski Erg' }, { name: "Farmer's Carry" }, { name: 'Sled Pull' }, { name: 'Wall Ball' },
    ],
    Core: [{ name: 'Hollow Hold' }, { name: 'GHD Sit-up' }, { name: 'Plank' }, { name: 'Side Plank' }],
    Skill: [{ name: 'Chest-to-Bar' }, { name: 'Bar Muscle-up' }, { name: 'Strict Pull-up' }, { name: 'Strict HSPU' }],
    Força: [
      { name: 'Bulgarian Split Squat' }, { name: 'Deadlift' }, { name: 'Front Squat' },
      { name: 'Thruster' }, { name: 'DB Thruster' },
    ],
  })

  const cases = [
    ['800m Run', 'Run'], ['600m run', 'Run'], ['100m Run', 'Run'], ['7200m Run', 'Run'],
    ['5k Run z2', 'Run'], ["20’ z1 Run", 'Run'],
    ['200m Row', 'Remo (Ergômetro)'], ['1000m Row', 'Remo (Ergômetro)'],
    ['12 cal row', 'Remo (Ergômetro)'], ['15/10 cal Row', 'Remo (Ergômetro)'],
    ['40 cal bike', 'Bike (Assault/Echo)'], ["20’ z2 bike", 'Bike (Assault/Echo)'],
    ['8/10 cal bike', 'Bike (Assault/Echo)'],
    ['500m Ski', 'Ski Erg'],
    ['30M Farm carry', "Farmer's Carry"], ['100m Farm carry', "Farmer's Carry"],
    ['10m sled pull', 'Sled Pull'], ['30m sled pull', 'Sled Pull'],
    ['50 Wall Ball', 'Wall Ball'], ['30 wall ball', 'Wall Ball'], ['20 WALL BALL', 'Wall Ball'],
    ['40” Hollow Hold', 'Hollow Hold'],
    ['15 GHD', 'GHD Sit-up'], ['12 GHD', 'GHD Sit-up'],
    ['1’ Prancha Ventral', 'Plank'], ['40” prancha', 'Plank'],
    ['30/30” prancha lat', 'Side Plank'], ['30/30” Prancha lateral', 'Side Plank'],
    ['21-15-9 C2B', 'Chest-to-Bar'], ['2-3-4-5… C2B', 'Chest-to-Bar'],
    ['2-4-6-8… BMU', 'Bar Muscle-up'],
    ['2-3-4-5…… Strict HSPU', 'Strict HSPU'], ['21-15-9 S Hspu', 'Strict HSPU'],
    ['8/8 Búlgaro Squat', 'Bulgarian Split Squat'], ['10/10 heavy búlgaro', 'Bulgarian Split Squat'],
    ['20-15-10-5 Deadlift', 'Deadlift'], ['3 Deadlift déficit', 'Deadlift'],
    ['10-8-6-4-2 FRONT SQUAT', 'Front Squat'],
    // Load variants are their own entries (coach's call), so DB Thruster ≠ Thruster.
    ['10 Thruster', 'Thruster'], ['4 DB Thruster', 'DB Thruster'],
    // The unit letter must not eat a real word: "5 s|trict…" would mangle the name.
    ['5 Strict Pull Up supinada', 'Strict Pull-up'], ['8 Strict Pull Up', 'Strict Pull-up'],
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
    LPO: [{ name: 'Snatch Balance' }, { name: 'Muscle Snatch' }, { name: 'Clean' }, { name: 'Hang Clean' }],
    Força: [{ name: 'Bench Press' }, { name: 'Split Jerk' }, { name: 'Push Jerk' }, { name: 'Front Squat' }, { name: 'Back Squat' }],
    Cardio: [{ name: 'Remo (Ergômetro)' }],
    Core: [{ name: 'V-up' }, { name: 'Hollow Rock' }, { name: 'Dragon Flag' }, { name: 'American KB Swing' }],
    Acessórios: [{ name: 'Hammer Curl' }, { name: 'Nordic Curl' }, { name: 'Romanian Deadlift' }],
  })

  test.each([
    // Slot letter from a lettered block.
    ['A- 3 SNATCH BALANCE', 'Snatch Balance'], ['B 3 SNATCH BALANCE', 'Snatch Balance'],
    ['B- 2 Muscle Snatch', 'Muscle Snatch'],
    // Tempo / pause note glued to the end.
    ['3 Bench Press 3” pausa', 'Bench Press'], ['PAUSE BENCH PRESS 3"', 'Bench Press'],
    ['3 Bench Press pausa 2” no início e no meio', 'Bench Press'],
    ['3 Snatch balance 2”', 'Snatch Balance'], ['PUSH JERK 2”', 'Push Jerk'],
    ['2 split jerk 2” Dip 2” recepção', 'Split Jerk'],
    ['3 Front Squat 5” de pausa em baixo', 'Front Squat'],
    ['Squat clean 30" entre as reps', 'Clean'],
    // Trailing qualifier in parens.
    ['3 split jerk (BNK)', 'Split Jerk'], ['4’ Row ( forte )', 'Remo (Ergômetro)'],
    // Alternating-sides suffix.
    ['12 martelo alt', 'Hammer Curl'], ['15 Vups', 'V-up'], ['V ups Alt', 'V-up'],
    // Misspellings of existing entries.
    ['Back squay', 'Back Squat'], ['Hollowrock', 'Hollow Rock'],
    ['8 Romenian Deadlift', 'Romanian Deadlift'], ['10 Hummer Curl', 'Hammer Curl'],
    ['8 Nordic Hamstring CuRl', 'Nordic Curl'], ['12 DRAGON FLY', 'Dragon Flag'],
    ['1 Squat Celan', 'Clean'], ['3 Hang Squat Celan', 'Hang Clean'],
    ['15 A Swing', 'American KB Swing'],
  ])('%j → %j', (typed, canonical) => {
    expect(resolveExercise(typed, index)?.name).toBe(canonical)
  })

  test('a real entry whose own name ends in "(…)" still matches before any stripping', () => {
    const parens = buildRegistryIndex({ Mobilidade: [{ name: 'Hip Distraction (banded)' }] })
    expect(resolveExercise('Hip Distraction (banded)', parens)?.name).toBe('Hip Distraction (banded)')
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
      { name: 'Kipping HSPU' }, { name: 'Strict HSPU' }, { name: 'L-sit (rings)' },
      { name: 'Handstand Hold' }, { name: 'Strict Pull-up' }, { name: 'Rope Climb' },
      { name: 'Legless Rope Climb' }, { name: 'Wall Walk' }, { name: 'Shoulder Tap' },
      { name: 'Box Jump Over' }, { name: 'Burpee Box Jump Over' }, { name: 'Toes to Bar' },
    ],
    'Acessórios': [{ name: 'Barbell Row' }, { name: 'Bulgarian Split Squat' }, { name: 'Goblet Squat' }],
    'Força': [{ name: 'DB Bench Press' }, { name: 'Wall Sit' }],
  })

  test.each([
    // Coach: abs-with-a-plate IS the plate sit-up; prancha lat E/D are just left/right.
    ['ABS ANILHA', 'Plate Sit-up'], ['Abdominal com Anilha', 'Plate Sit-up'],
    ['Prancha lat E', 'Side Plank'], ['Prancha lat D', 'Side Plank'],
    // Coach: a bare handstand push-up means the kipping one.
    ['Handstand Push Up', 'Kipping HSPU'],
    ['20\'\' Handstand Hold Wall', 'Handstand Hold'], ['30" HSW HOLD', 'Handstand Hold'],
    // "S" is the coach's shorthand for strict.
    ['HEAVY  S PULL UP', 'Strict Pull-up'], ['8 S T2B', 'Toes to Bar'],
    // L-sit: argola (rings) is the existing entry, barra gets its own (in the SQL).
    ['30” Lsit argola', 'L-sit (rings)'], ['20\'\' L Sit Argola', 'L-sit (rings)'],
    // Spelling/plural variants of round-2 entries.
    ['3 Wall walking', 'Wall Walk'], ['Tap Shoulder', 'Shoulder Tap'],
    ['Wall Shoulder Taps', 'Shoulder Tap'],
    ['12 Bbjo step down', 'Box Jump Over'], ['9-15-21 Box jump step down', 'Box Jump Over'],
    ['Burpees box jump over', 'Burpee Box Jump Over'],
    ['12 dB bench press inclinado', 'DB Bench Press'],
    ['8 GLOBET Squat (Heels Elevated)', 'Goblet Squat'],
    ['8 Remada low curvada', 'Barbell Row'], ['Remada curvada peg supinada', 'Barbell Row'],
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
    ['SU', 'Single Under (SU)'], ['Single Under', 'Single Under (SU)'],
    ['single under (su)', 'Single Under (SU)'], ['30 SU Crossover', null],
    ['BOB', 'Burpee Over the Bar (BOB)'], ['BoB', 'Burpee Over the Bar (BOB)'],
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
    LPO: [{ name: 'Clean' }, { name: 'Hang Clean' }, { name: 'Snatch' }, { name: 'Hang Snatch' }],
    Core: [{ name: 'GHD Sit-up' }, { name: 'GHD Back Extension' }, { name: 'Plank' }, { name: 'Side Plank' }],
    Cardio: [{ name: 'Run' }, { name: 'Remo (Ergômetro)' }],
    Skill: [{ name: 'Pull-up' }],
    Acessórios: [{ name: 'Russian Row' }, { name: 'Barbell Row' }, { name: 'Hammer Curl' }, { name: 'Lateral Raise' }],
    Força: [{ name: 'Good Morning' }],
  })

  test.each([
    // A "squat" clean/snatch is the full lift.
    ['Squat Clean', 'Clean'], ['squat clean', 'Clean'], ['Floor Squat Clean', 'Clean'],
    ['2 Low Squat Clean', 'Clean'], ['6 Hang Squat Clean', 'Hang Clean'],
    ['Squat Snatch', 'Snatch'], ['Hang Squat Snatch', 'Hang Snatch'],
    // GHD.
    ['GHD', 'GHD Sit-up'], ['20 GHD Hiperextensão', 'GHD Back Extension'],
    ['GHD HIPERTENSÃO', 'GHD Back Extension'],
    // pt-BR.
    ['Corrida', 'Run'], ['Remador', 'Remo (Ergômetro)'], ['15 Abs remador', null],
    ['Remada Russa', 'Russian Row'], ['8 remada russa', 'Russian Row'],
    ['6 Remada curvada', 'Barbell Row'],
    ['10 bom dia', 'Good Morning'], ['12 martelo alt', 'Hammer Curl'], ['8 elevação lat', 'Lateral Raise'],
    ['Prancha ventral', 'Plank'], ['Prancha lat D', 'Side Plank'], ['Prancha lat E', 'Side Plank'],
    // Hyphen vs space — normExName keeps hyphens, so both spellings need to work.
    ['Pull-up', 'Pull-up'], ['Pull-Up', 'Pull-up'], ['PULL UP', 'Pull-up'],
    ['15 PuLl Up', 'Pull-up'], ['25 Pull Up', 'Pull-up'],
  ])('%j → %j', (typed, canonical) => {
    expect(resolveExercise(typed, index)?.name ?? null).toBe(canonical)
  })
})
