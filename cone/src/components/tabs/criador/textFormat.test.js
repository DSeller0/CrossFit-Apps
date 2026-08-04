import { readFileSync } from 'node:fs'
import { describe, test, expect } from 'vitest'
import {
  parseWeek,
  parseSession,
  parseBlock,
  parseExerciseLine,
  parseStructure,
  parseGoal,
  serializeGoal,
  serializeBlock,
  serializeExercise,
  serializeSession,
  matchDayHeader,
  resolveType,
  isTextEditable,
  splitLockedBlocks,
  mergeLockedBlocks,
  normLine,
  WARNING_KINDS,
  FORMAT_REFERENCE,
  FORMAT_EXAMPLE,
  FORMAT_EXAMPLE_BLOCK,
} from './textFormat.js'
import { TYPE_CONFIG } from './blockModel.js'

// The real coach artefact is the fixture, read from disk so it can never drift
// from the file the parser was designed against.
const COACH_WEEK = readFileSync(
  new URL('../../../../Coach training week example.txt', import.meta.url),
  'utf8',
)

const stripIds = v => JSON.parse(JSON.stringify(v, (k, x) => (k === 'id' ? undefined : x)))
const ex1 = line => parseExerciseLine(line).ex
const blk = (text, opts) => parseBlock(text, opts).block

// ── Day header ────────────────────────────────────────────────────────────────
describe('matchDayHeader', () => {
  test('accented, unaccented and abbreviated weekday forms all resolve', () => {
    expect(matchDayHeader('SEGUNDA-FEIRA')).toEqual({ dayIndex: 1, sessionName: '' })
    expect(matchDayHeader('TERÇA-FEIRA')).toEqual({ dayIndex: 2, sessionName: '' })
    expect(matchDayHeader('terca feira')).toEqual({ dayIndex: 2, sessionName: '' })
    expect(matchDayHeader('Sáb')).toEqual({ dayIndex: 6, sessionName: '' })
  })
  test('parenthetical becomes the session name', () => {
    expect(matchDayHeader('QUINTA-FEIRA (HYROX)')).toEqual({ dayIndex: 4, sessionName: 'HYROX' })
  })
  test('a non-weekday line is not a day header', () => {
    expect(matchDayHeader('Warm Up')).toBeNull()
    expect(matchDayHeader('')).toBeNull()
  })
  // #128 · plans/61·C — Brazilian civil weekday numbering (domingo=1º dia, so
  // segunda-feira is "2ª feira" through sábado "7ª feira"), both spellings of the
  // ordinal (ª/a), spaced and hyphenated. The two that were tested and failed
  // before this fix.
  test('numbered weekday notation (2a/2ª feira … 7a/7ª) resolves', () => {
    expect(matchDayHeader('2a feira')).toEqual({ dayIndex: 1, sessionName: '' })
    expect(matchDayHeader('2ª feira')).toEqual({ dayIndex: 1, sessionName: '' })
    expect(matchDayHeader('2ª-feira')).toEqual({ dayIndex: 1, sessionName: '' })
    expect(matchDayHeader('3ª feira')).toEqual({ dayIndex: 2, sessionName: '' })
    expect(matchDayHeader('4ª feira')).toEqual({ dayIndex: 3, sessionName: '' })
    expect(matchDayHeader('5ª feira')).toEqual({ dayIndex: 4, sessionName: '' })
    expect(matchDayHeader('6ª feira (HYROX)')).toEqual({ dayIndex: 5, sessionName: 'HYROX' })
    expect(matchDayHeader('7ª feira')).toEqual({ dayIndex: 6, sessionName: '' })
    expect(matchDayHeader('7a')).toEqual({ dayIndex: 6, sessionName: '' })
  })
})

// ── Block header ──────────────────────────────────────────────────────────────
describe('block header', () => {
  test('type aliases resolve to TYPE_CONFIG keys', () => {
    expect(resolveType('Warm Up')).toBe('Aquecimento')
    expect(resolveType('Strength')).toBe('Força')
    expect(resolveType('Complex')).toBe('LPO')
    expect(resolveType('Emom')).toBe('EMOM')
    expect(resolveType('Estacoes')).toBe('Estações')
    expect(resolveType('Quem já faz')).toBeNull()
  })

  test('"<type> – <label>" splits into type + label', () => {
    const b = blk('Skill – Handstand Walk\n10 Wall Walk')
    expect(b.type).toBe('Skill')
    expect(b.label).toBe('Handstand Walk')
  })

  test('a bare WOD resolves its type from the structure line', () => {
    expect(blk("WOD – TC 14'\n5 Rounds For Time\n10 Toes to Bar")).toMatchObject({
      type: 'For Time',
      rounds: '5',
      duration: '14',
    })
    expect(blk("WOD – AMRAP 15'\n10 Burpee").type).toBe('AMRAP')
    expect(blk("WOD\nEmom 12'\n10 HSPU").type).toBe('EMOM')
  })

  test('separators – — - / : are all accepted', () => {
    expect(blk('Skill / LPO – Complex\n1 Snatch')).toMatchObject({
      type: 'Skill',
      label: 'LPO – Complex',
    })
    expect(blk('Skill: Muscle Up\n3 MU').label).toBe('Muscle Up')
    expect(blk('Skill - Muscle Up\n3 MU').label).toBe('Muscle Up')
  })

  test('an unresolved header becomes the label and flags the type — nothing is guessed', () => {
    const b = blk("Quem já faz tc 15'\n5 sets\n5M HSW")
    expect(b.type).toBe('')
    expect(b.typeUnresolved).toBe(true)
    expect(b.label).toBe("Quem já faz tc 15'")
    expect(b.rounds).toBe('5')
  })

  test('an unresolved header still takes a type from its structure line', () => {
    const b = blk("Quem já faz !\nEmom 15'\nA 4 Strict C2B")
    expect(b.type).toBe('EMOM')
    expect(b.typeUnresolved).toBeUndefined()
    expect(b.label).toBe('Quem já faz !')
  })

  test('...and does NOT warn about it — the warning waits for the structure line', () => {
    const resolved = parseBlock("Quem já faz !\nEmom 15'\nA 4 Strict C2B")
    expect(resolved.warnings.map(w => w.kind)).not.toContain('type-unresolved')
    // still warns when nothing resolves it
    const unresolved = parseBlock("Quem já faz tc 15'\n5 sets\n5M HSW")
    expect(unresolved.warnings.map(w => w.kind)).toContain('type-unresolved')
  })

  test('with a knownType the first line is never eaten as a header', () => {
    const b = blk('Deslocamento com apoio\n10 Wall Walk', { knownType: 'Skill' })
    expect(b.type).toBe('Skill')
    expect(b.exercises.map(e => e.name)).toEqual(['Deslocamento com apoio', 'Wall Walk'])
  })
})

// ── Structure line ────────────────────────────────────────────────────────────
describe('parseStructure', () => {
  test.each([
    ['3 rounds', { rounds: '3' }],
    ['5 sets', { rounds: '5' }],
    ['2 voltas', { rounds: '2' }],
    ['5 Rounds For Time', { rounds: '5', type: 'For Time' }],
    ["AMRAP 15'", { type: 'AMRAP', duration: '15' }],
    ["Emom 12'", { type: 'EMOM', duration: '12' }],
    ["TC 14'", { duration: '14' }],
    ["(Cap 15')", { duration: '15' }],
    ["4 Rounds For Time tc 16'", { rounds: '4', type: 'For Time', duration: '16' }],
    ['21-15-9', { ladder: '21-15-9' }],
  ])('%s', (line, expected) => {
    const st = parseStructure(line)
    expect(st.consumed).toBe(true)
    expect(st.rest).toBe('')
    expect(st).toMatchObject(expected)
  })

  test('"3 sets cada letra" keeps the unconsumed remainder', () => {
    expect(parseStructure('3 sets cada letra')).toMatchObject({ rounds: '3', rest: 'cada letra' })
  })

  test('"A cada 1\'20\\" 5 sets" reads as an interval + rounds', () => {
    expect(parseStructure('A cada 1\'20" 5 sets')).toMatchObject({ everySecs: 80, rounds: '5' })
  })

  test('an exercise line consumes nothing', () => {
    expect(parseStructure('100m Run').consumed).toBe(false)
    expect(parseStructure('10 Shoulder Taps').consumed).toBe(false)
    expect(parseStructure('8 Power Clean 60/45kg – 50/35kg').consumed).toBe(false)
  })

  test('an interval block keeps the original line verbatim in notes (no interval field exists)', () => {
    const b = blk("Skill\nA cada 3'\nBack Squat\n5x5 65/70/75/80/85%")
    expect(b.duration).toBe('3')
    expect(b.notes).toBe("A cada 3'")
  })

  test('an interval that is not whole minutes warns instead of inventing a field', () => {
    const { block, warnings } = parseBlock(
      'Skill / LPO – Complex\nA cada 1\'20" 5 sets\n1 Hang Squat Snatch\n1 Squat Snatch',
    )
    expect(block.duration).toBe('1')
    expect(block.rounds).toBe('5')
    expect(block.notes).toBe('A cada 1\'20" 5 sets')
    expect(warnings.map(w => w.kind)).toContain('interval-approximated')
  })

  test('a ladder structure line distributes its reps to every bare exercise', () => {
    const b = blk(
      "WOD – For Time (Cap 15')\n21-15-9\nThruster 42,5/30kg\nChest to Bar\nBurpee Over Bar",
    )
    expect(b.ladderMode).toBe(true)
    expect(b.duration).toBe('15')
    expect(b.exercises.map(e => e.reps)).toEqual(['21,15,9', '21,15,9', '21,15,9'])
  })
})

// ── Exercise lines ────────────────────────────────────────────────────────────
describe('exercise line — slot letter', () => {
  test.each(['A 20" Handstand Hold', 'B) 20" Handstand Hold', 'C - 20" Handstand Hold'])(
    '%s',
    line => {
      const { ex, hadSlot } = parseExerciseLine(line)
      expect(hadSlot).toBe(true)
      expect(ex.name).toBe('Handstand Hold')
    },
  )
  test('the block records that it was lettered so the serializer re-emits A/B/C', () => {
    const b = blk('Skill\n3 sets\nA 20" Hold\nB 10 Taps')
    expect(b.lettered).toBe(true)
    expect(serializeBlock(b).split('\n')).toEqual(['Skill', '3 rounds', 'A 20" Hold', 'B 10 Taps'])
  })
  test('"A cada" is an interval, not a slot letter', () => {
    expect(parseExerciseLine("A cada 3'").hadSlot).toBe(false)
  })
})

describe('exercise line — leading quantity', () => {
  test.each([
    ['100m Run', { dist: '100', distUnit: 'm', name: 'Run' }],
    ['2km Run', { dist: '2000', distUnit: 'm', name: 'Run' }], // km folds to metres
    ['20cal Row', { dist: '20', distUnit: 'cal', name: 'Row' }],
    ['20 cal Row', { dist: '20', distUnit: 'cal', name: 'Row' }],
    ['5M HSW', { dist: '5', distUnit: 'm', name: 'HSW' }],
    ['20" Handstand Hold', { reps: '20"', name: 'Handstand Hold' }],
    ["45' Plank", { reps: "45'", name: 'Plank' }],
    ['5x5 Back Squat', { sets: '5', reps: '5', name: 'Back Squat' }],
    ['21-15-9 Thruster', { reps: '21,15,9', name: 'Thruster' }],
    ['10 Toes to Bar', { reps: '10', name: 'Toes to Bar' }],
    ['Deslocamento com apoio', { reps: '', dist: '', name: 'Deslocamento com apoio' }],
  ])('%s', (line, expected) => expect(ex1(line)).toMatchObject(expected))

  test('a bare line with no quantity is still an exercise, not a note', () => {
    const b = blk('Skill\n3 sets\nDeslocamento com apoio')
    expect(b.exercises.map(e => e.name)).toEqual(['Deslocamento com apoio'])
    expect(b.notes).toBe('')
  })
})

describe('exercise line — trailing load', () => {
  test('one gender pair → RX', () => {
    expect(ex1('12 Devil Press 15/10kg').intensity).toEqual({
      mode: 'gender',
      Masculino_unit: 'kg',
      Feminino_unit: 'kg',
      Masculino_RX: '15',
      Feminino_RX: '10',
    })
  })
  test('two pairs → RX + Inter, in written order', () => {
    expect(ex1('8 Power Clean 60/45kg – 50/35kg').intensity).toEqual({
      mode: 'gender',
      Masculino_unit: 'kg',
      Feminino_unit: 'kg',
      Masculino_RX: '60',
      Feminino_RX: '45',
      Masculino_Inter: '50',
      Feminino_Inter: '35',
    })
  })
  test('three pairs → RX + Inter + SC', () => {
    expect(ex1('8 Power Clean 60/45kg – 50/35kg – 40/30kg').intensity).toMatchObject({
      Masculino_SC: '40',
      Feminino_SC: '30',
    })
  })
  test('decimal comma and upper-case unit', () => {
    expect(ex1('Thruster 42,5/30kg').intensity).toMatchObject({
      Masculino_RX: '42.5',
      Feminino_RX: '30',
    })
    expect(ex1('20m Lunges 22/15 KG').intensity).toMatchObject({
      Masculino_RX: '22',
      Feminino_RX: '15',
      Masculino_unit: 'kg',
    })
  })
  test('a single percentage → pct mode', () => {
    expect(ex1('5 Back Squat 75%').intensity).toEqual({ mode: 'pct', pct: '75' })
  })
  test('a percentage list → progression steps', () => {
    expect(ex1('5x5 Back Squat 65/70/75%').intensity).toEqual({
      mode: 'progression',
      steps: [65, 70, 75].map(l => ({ reps: '', load: String(l), unit: '% do RM' })),
    })
  })
  test('an unslashed movement list is NOT a load ("choose one" notation survives)', () => {
    expect(ex1('6 RMU /8 BMU / 10 C2B')).toMatchObject({
      reps: '6',
      name: 'RMU /8 BMU / 10 C2B',
      intensity: null,
    })
    expect(ex1('12 DB/KB Deadlift')).toMatchObject({ name: 'DB/KB Deadlift', intensity: null })
  })
})

describe('exercise line — complex', () => {
  test('both sides carry a quantity → one complex, two movements', () => {
    const ex = ex1('1 Hang Squat Snatch + 1 Squat Snatch')
    expect(ex.isComplex).toBe(true)
    expect(stripIds(ex.complexMovements)).toEqual([
      { name: 'Hang Squat Snatch', reps: '1' },
      { name: 'Squat Snatch', reps: '1' },
    ])
  })
  test('only the first side carries a quantity → one ordinary exercise', () => {
    const ex = ex1('5 Inchworm + Push Up')
    expect(ex.isComplex).toBeUndefined()
    expect(ex).toMatchObject({ reps: '5', name: 'Inchworm + Push Up' })
  })
  test('two-line assist: a bare load list under 2+ movement lines makes a complex, loudly', () => {
    const { block, warnings } = parseBlock(
      'Skill / LPO – Complex\n5 sets\n1 Hang Squat Snatch\n1 Squat Snatch\n70%75%80%82%85%',
    )
    expect(block.exercises).toHaveLength(1)
    expect(block.exercises[0].isComplex).toBe(true)
    expect(block.exercises[0].sets).toBe('5')
    expect(block.exercises[0].intensity.steps.map(s => s.load)).toEqual([
      '70',
      '75',
      '80',
      '82',
      '85',
    ])
    expect(warnings.map(w => w.kind)).toContain('complex-detected')
  })
  test('a bare load list under ONE movement is just that movement’s progression', () => {
    const { block, warnings } = parseBlock('Força\n5 sets\n5 Back Squat\n70/75/80%')
    expect(block.exercises).toHaveLength(1)
    expect(block.exercises[0].isComplex).toBeUndefined()
    expect(block.exercises[0].intensity.mode).toBe('progression')
    expect(warnings.map(w => w.kind)).not.toContain('complex-detected')
  })
  test('a distance movement is never swept into a complex', () => {
    const b = blk('Força\n100m Run\n200m Row\n70/75/80%')
    expect(b.exercises).toHaveLength(2)
    expect(b.exercises[1].intensity.mode).toBe('progression')
  })
})

describe('name-then-prescription', () => {
  test('a nameless prescription line merges into the exercise above it', () => {
    const b = blk('Força\nBack Squat\n5x5 65/70/75/80/85%')
    expect(b.exercises).toHaveLength(1)
    expect(b.exercises[0]).toMatchObject({ name: 'Back Squat', sets: '5', reps: '5' })
    expect(b.exercises[0].intensity.steps.map(s => s.load)).toEqual(['65', '70', '75', '80', '85'])
  })
})

describe('rest', () => {
  test("Rest 1' / Descanso 1' → an exercise named Rest carrying the duration", () => {
    expect(ex1("Rest 1'")).toMatchObject({ name: 'Rest', reps: "1'" })
    expect(ex1("Descanso 1'")).toMatchObject({ name: 'Rest', reps: "1'" })
  })
  test('a lone Rest group joins the block above it instead of becoming a block', () => {
    const { blocks } = parseSession("For Time\n400m Row\n\nRest 2'\n\nFor Time\n400m Run")
    expect(blocks).toHaveLength(2)
    expect(blocks[0].exercises.map(e => e.name)).toEqual(['Row', 'Rest'])
  })
})

// ── Meta ──────────────────────────────────────────────────────────────────────
describe('goal', () => {
  test.each([
    ["11-12'", { kind: 'time', min: '11:00', max: '12:00' }],
    ['5 rounds', { kind: 'rounds', min: '5' }],
    ["sub 10'", { kind: 'time', max: '10:00' }],
    ['o mais rápido possível', { kind: 'text', text: 'o mais rápido possível' }],
  ])('%s', (raw, expected) => expect(parseGoal(raw)).toEqual(expected))

  test.each(['Meta:', 'Alvo:', 'Goal:'])('%s prefix', prefix => {
    expect(blk(`For Time\n10 Thruster\n${prefix} 11-12'`).goal).toEqual({
      kind: 'time',
      min: '11:00',
      max: '12:00',
    })
  })

  test('goal serialization is stable through a re-parse', () => {
    ;[
      { kind: 'time', min: '11:00', max: '12:00' },
      { kind: 'time', min: '11:30', max: '12:00' },
      { kind: 'time', max: '10:00' },
      { kind: 'rounds', min: '5' },
      { kind: 'rounds', min: '5', reps: '10' },
      { kind: 'text', text: 'sem cap' },
    ].forEach(goal => expect(parseGoal(serializeGoal(goal))).toEqual(goal))
  })
})

// ── The contract: nothing is dropped ──────────────────────────────────────────
describe('never drops a line', () => {
  test('the unconsumed half of a structure line lands verbatim in notes and is warned about', () => {
    const { block, warnings } = parseBlock('Skill\n3 sets cada letra\n20" Hold')
    expect(block.rounds).toBe('3')
    expect(block.notes).toBe('cada letra')
    expect(warnings.find(x => x.kind === 'unparsed-line')).toMatchObject({
      line: '3 sets cada letra',
      lineNo: 2,
    })
  })
  test('an orphan load list is kept as a note, not attached to nothing', () => {
    const { block, warnings } = parseBlock('For Time\n70/75/80%')
    expect(block.notes).toBe('70/75/80%')
    expect(warnings.map(w => w.kind)).toContain('orphan-load')
  })
  test('Obs:/Nota: lines round-trip as block notes', () => {
    expect(blk('For Time\n10 Thruster\nObs: usar barra leve').notes).toBe('usar barra leve')
  })
})

// ── Round-trip fidelity (plans/61·A) ──────────────────────────────────────────
// One test per loss class the prod audit (scripts/audit-text-roundtrip.mjs) measured;
// the CORPUS entries below prove the round trip, these pin the specific defect.
describe('round-trip fidelity', () => {
  test('A1 · a legacy cardio exercise keeps its distance instead of serializing bare', () => {
    const ex = { name: 'HSW', intensity: { mode: 'cardio', cardioVal: '5', cardioUnit: 'm' } }
    expect(serializeExercise(ex)).toBe('5m HSW')
    expect(ex1(serializeExercise(ex))).toMatchObject({ dist: '5', distUnit: 'm', name: 'HSW' })
  })

  test('A1 · an exercise note is written on ONE line, so a "Meta:" second line is not eaten', () => {
    const b = mkBlk({
      type: 'For Time',
      exercises: [mkEx({ name: 'Run', dist: '2000', note: 'Ou 1600m.\nMeta: 8 minutos.' })],
    })
    const text = serializeBlock(b)
    expect(text.split('\n')).toHaveLength(2)
    const again = blk(text)
    expect(again.goal).toBeUndefined()
    expect(again.exercises[0].note).toBe('Ou 1600m. Meta: 8 minutos.')
  })

  test('A2 · a bare number is NOT a time — the pre-plans/60 {min:"14"} shape stays text', () => {
    // plans/60 closed the input that produced `{kind:'time',min:'14'}` and repaired the one
    // prod row; this is the regression guard, not a live shape. See docs/plans/60.
    expect(parseGoal('14')).toEqual({ kind: 'text', text: '14' })
    expect(parseGoal("14'")).toEqual({ kind: 'time', min: '14:00' })
  })

  test('A2 · a Meta: line right after the header is not swallowed as structure', () => {
    const b = blk("For Time\nMeta: correr abaixo de 1'.\n10 Thruster")
    expect(b.duration).toBe('')
    expect(b.notes).toBe('')
    expect(b.goal).toEqual({ kind: 'text', text: "correr abaixo de 1'." })
  })

  test('A3 · a bare WOD with no format is "escolher tipo", never a silent ""', () => {
    const { block, warnings } = parseBlock('WOD – -\n12 HSPU')
    expect(block.type).toBe('')
    expect(block.typeUnresolved).toBe(true)
    expect(warnings.map(w => w.kind)).toContain('type-unresolved')
    expect(block.exercises.map(e => e.name)).toEqual(['HSPU'])
  })

  test('A3 · a stale typeUnresolved never suppresses a type the block actually has', () => {
    const b = { type: 'Core', label: 'Segunda feira', typeUnresolved: true, exercises: [] }
    expect(serializeBlock(b).split('\n')[0]).toBe('Core – Segunda feira')
  })

  test('A4 · a block whose first line is an exercise keeps every exercise', () => {
    const { block, warnings } = parseBlock('40" Prancha\n30" Hollow Hold\n20 Sit Up')
    expect(block.exercises.map(e => e.name)).toEqual(['Prancha', 'Hollow Hold', 'Sit Up'])
    expect(block.label).toBe('')
    expect(warnings.map(w => w.kind)).toContain('type-unresolved')
  })

  test('A4 · a time-metric movement round-trips in every position', () => {
    // structure-line position — `50' Run` is a 50-second Run, not a 50-minute cap
    const b = blk("Cardio\n50' Run\n2' Bike")
    expect(b.duration).toBe('')
    expect(b.notes).toBe('')
    expect(b.exercises).toEqual([
      expect.objectContaining({ reps: "50'", name: 'Run' }),
      expect.objectContaining({ reps: "2'", name: 'Bike' }),
    ])
  })

  test('A4 · a structure line with prose after it is still a structure line', () => {
    // The discriminator is the SPAN: structure ate `3 sets`, the exercise could only eat `3`.
    expect(blk('Skill\n3 sets cada letra\n20" Hold')).toMatchObject({
      rounds: '3',
      notes: 'cada letra',
    })
  })

  test('A5 · a complex whose sets is not the step count keeps its sets', () => {
    const text = serializeBlock(CORPUS['complex whose sets is NOT the step count'])
    expect(text.split('\n')[1]).toBe('2x1 Hang Squat Snatch + 1 Squat Snatch 60/70/80kg')
    expect(blk(text).exercises[0].sets).toBe('2')
  })

  test('A6 · the pair form carries per-step reps and mixed units', () => {
    expect(ex1('Back Squat 3x60kg / 2x70%').intensity).toEqual({
      mode: 'progression',
      steps: [
        { reps: '3', load: '60', unit: 'kg' },
        { reps: '2', load: '70', unit: '% do RM' },
      ],
    })
  })

  test('A6 · a uniform single-unit progression keeps the plain list — nothing the coach writes changes shape', () => {
    expect(
      serializeExercise(
        mkEx({
          name: 'Back Squat',
          sets: '5',
          reps: '5',
          intensity: {
            mode: 'progression',
            steps: ['65', '70', '75'].map(load => ({ reps: '', load, unit: '% do RM' })),
          },
        }),
      ),
    ).toBe('5x5 Back Squat 65/70/75%')
  })

  test('A6 · a bare pair list is a load list, not a leading quantity', () => {
    const b = blk('LPO\n3 Low Squat\n2 Hang power\n3x55% / 3x65%')
    expect(b.exercises).toHaveLength(1)
    expect(b.exercises[0].isComplex).toBe(true)
    expect(b.exercises[0].intensity.steps.map(s => `${s.reps}x${s.load}`)).toEqual(['3x55', '3x65'])
  })

  test('A6 · a gender pair is never mistaken for the pair form', () => {
    expect(ex1('8 Power Clean 60/45kg – 50/35kg').intensity.mode).toBe('gender')
    expect(ex1('5x5 Back Squat 65/70/75%').intensity.mode).toBe('progression')
  })

  test('A7 · a named complex round-trips through the `<nome>:` form', () => {
    const ex = ex1('Complexo A: 3x1 Hang Squat Snatch + 1 Squat Snatch 60/70/80kg')
    expect(ex).toMatchObject({ name: 'Complexo A', sets: '3', isComplex: true })
    expect(stripIds(ex.complexMovements)).toEqual([
      { name: 'Hang Squat Snatch', reps: '1' },
      { name: 'Squat Snatch', reps: '1' },
    ])
  })

  test('A7 · a plain exercise with a colon in it is not turned into a named complex', () => {
    const ex = ex1('10 Row 500m: forte')
    expect(ex.isComplex).toBeFalsy()
    expect(ex).toMatchObject({ reps: '10', name: 'Row 500m: forte' })
  })

  test('A8 · a mixed ladder keeps ladderMode, and only the shared reps are stripped', () => {
    const text = serializeBlock(CORPUS['mixed ladder — only some exercises share the scheme'])
    expect(text.split('\n')).toEqual(['For Time', '21-15-9', '200m Run', 'Thruster', '10 Pull Up'])
    expect(blk(text).ladderMode).toBe(true)
  })

  test('A11 · per-gender units are deliberately NOT round-tripped (blast radius zero on prod)', () => {
    // Measured: 0 of 78 gender-intensity prod exercises carry different units per gender
    // (#121a/C-1). Pinned so a future session doesn't "fix" it blind — giving it notation
    // would destabilize the scale-vs-gender axis divergence serializeExercise relies on.
    const ins = {
      mode: 'gender',
      Masculino_RX: '60',
      Feminino_RX: '45',
      Masculino_unit: 'kg',
      Feminino_unit: 'lb',
    }
    expect(serializeExercise(mkEx({ name: 'Clean', reps: '3', intensity: ins }))).toBe(
      '3 Clean 60/45kg',
    )
  })

  test('a lone capital is only a slot letter when a quantity follows it', () => {
    expect(parseExerciseLine('V ups Alt')).toMatchObject({ hadSlot: false })
    expect(ex1('V ups Alt').name).toBe('V ups Alt')
    expect(parseExerciseLine('A 4 Strict C2B')).toMatchObject({ hadSlot: true })
    expect(parseExerciseLine('A) Deslocamento com apoio')).toMatchObject({ hadSlot: true })
  })

  test('a lettered block re-emits letters even for a name-first exercise', () => {
    const b = mkBlk({
      type: 'Skill',
      lettered: true,
      exercises: [mkEx({ name: 'Deslocamento com apoio' }), mkEx({ name: 'Wall Walk', reps: '5' })],
    })
    expect(serializeBlock(b).split('\n')).toEqual([
      'Skill',
      'A) Deslocamento com apoio',
      'B 5 Wall Walk',
    ])
    expect(blk(serializeBlock(b))).toMatchObject({ lettered: true })
  })

  test('a hollow complex (flag set, movements blank) is serialized as the exercise it is', () => {
    const ex = mkEx({
      name: '4-3-2-1 Snatch',
      sets: '4',
      isComplex: true,
      complexMovements: [
        { id: 'm', name: '', reps: '' },
        { id: 'm', name: '', reps: '' },
      ],
    })
    // The row survives as a row — which is the point; before this it serialized to two
    // BLANK lines and disappeared. The ladder in the name is prescription the coach typed
    // into the name field, so the grammar re-attributes it (a projection shift, stable).
    expect(serializeExercise(ex)).toBe('4x 4-3-2-1 Snatch')
    expect(ex1('4x 4-3-2-1 Snatch')).toMatchObject({ sets: '4', reps: '4' })
  })
})

// ── Full-file parse ───────────────────────────────────────────────────────────
describe('the real coach week', () => {
  const days = parseWeek(COACH_WEEK)

  test('creates 5 sessions, Seg–Sex, with the Thursday session name', () => {
    expect(days.map(d => d.dayIndex)).toEqual([1, 2, 3, 4, 5])
    expect(days.map(d => d.sessionName)).toEqual(['', '', '', 'HYROX', ''])
  })

  test('every input line is accounted for — zero dropped lines', () => {
    const audited = new Set(days.flatMap(d => d.audit.map(a => a.lineNo)))
    const missing = COACH_WEEK.split(/\r?\n/)
      .map((l, i) => [i + 1, l])
      .filter(([n, l]) => l.trim() && !audited.has(n))
    expect(missing).toEqual([])
  })

  test('block types and counts per day', () => {
    expect(days.map(d => d.blocks.map(b => b.type || '?'))).toEqual([
      ['Aquecimento', 'Skill', '?', 'For Time'],
      ['Aquecimento', 'Skill', 'EMOM', 'For Time'],
      ['Aquecimento', 'Skill', 'AMRAP'],
      ['Aquecimento', 'For Time', 'For Time'],
      ['Aquecimento', 'Skill', 'EMOM', 'For Time'],
    ])
    expect(days.map(d => d.blocks.reduce((n, b) => n + b.exercises.length, 0))).toEqual([
      14, 12, 10, 12, 11,
    ])
  })

  test('Meta lands on exactly the days that carry one', () => {
    expect(days.map(d => d.blocks.map(b => b.goal).find(Boolean) || null)).toEqual([
      { kind: 'time', min: '11:00', max: '12:00' },
      { kind: 'time', min: '9:00', max: '10:00' },
      { kind: 'rounds', min: '5' },
      null,
      { kind: 'time', min: '11:00', max: '13:00' },
    ])
  })

  test("Monday's WOD carries the cap, the rounds and both load pairs", () => {
    const wod = days[0].blocks[3]
    expect(wod).toMatchObject({ type: 'For Time', rounds: '5', duration: '14' })
    expect(wod.exercises[0]).toMatchObject({ reps: '8', name: 'Power Clean' })
    expect(wod.exercises[0].intensity).toMatchObject({
      Masculino_RX: '60',
      Feminino_RX: '45',
      Masculino_Inter: '50',
      Feminino_Inter: '35',
    })
  })

  test("Thursday's lone Rest 2' attaches to the WOD above it, not to a new block", () => {
    expect(days[3].blocks).toHaveLength(3)
    expect(days[3].blocks[1].exercises.at(-1)).toMatchObject({ name: 'Rest', reps: "2'" })
  })

  test('the whole week round-trips through text with no semantic loss', () => {
    days.forEach(d => {
      const again = parseSession(serializeSession({ blocks: d.blocks }))
      expect(stripIds(again.blocks)).toEqual(stripIds(d.blocks))
    })
  })
})

// ── Warnings ──────────────────────────────────────────────────────────────────
describe('warnings', () => {
  test('every warning kind is produced by a fixture and carries a usable lineNo', () => {
    const week = parseWeek(COACH_WEEK)
    const seen = new Map(week.flatMap(d => d.warnings).map(w => [w.kind, w]))
    parseBlock('For Time\n70/75/80%').warnings.forEach(w => seen.set(w.kind, w))
    parseBlock('Skill\n3 sets cada letra\n20" Hold').warnings.forEach(w => seen.set(w.kind, w))
    const reg = { Cardio: [{ name: 'Run' }] }
    parseBlock('For Time\n10 Movimento Inventado', { registry: reg }).warnings.forEach(w =>
      seen.set(w.kind, w),
    )

    expect([...seen.keys()].sort()).toEqual([
      'complex-detected',
      'interval-approximated',
      'orphan-load',
      'preamble',
      'type-unresolved',
      'unknown-exercise',
      'unparsed-line',
    ])
    seen.forEach((w, kind) => {
      expect(w.message, kind).toBeTruthy()
      if (kind !== 'unknown-exercise') expect(w.lineNo, kind).toBeGreaterThan(0)
    })
  })

  test('a name the registry knows produces no unknown-exercise warning', () => {
    const reg = { Cardio: [{ name: 'Run' }] }
    const { warnings } = parseBlock('For Time\n400m Run', { registry: reg })
    expect(warnings).toEqual([])
  })
})

// ── Format reference + warning kinds (#120/#129 · plans/61·C) ────────────────
describe('WARNING_KINDS', () => {
  test('covers exactly the 8 kinds the parser can produce, plus block-locked', () => {
    // The 7 parser-only kinds are asserted directly above; block-locked comes
    // from splitLockedBlocks (tested separately), not buildBlock/parseWeek.
    expect(Object.keys(WARNING_KINDS).sort()).toEqual([
      'block-locked',
      'complex-detected',
      'interval-approximated',
      'orphan-load',
      'preamble',
      'type-unresolved',
      'unknown-exercise',
      'unparsed-line',
    ])
  })
  test('every kind has a severity and both a singular and plural label', () => {
    Object.entries(WARNING_KINDS).forEach(([kind, cfg]) => {
      expect(['warn', 'info'], kind).toContain(cfg.severity)
      expect(cfg.label, kind).toBeTruthy()
      expect(cfg.labelOne, kind).toBeTruthy()
    })
  })
})

describe('FORMAT_REFERENCE / FORMAT_EXAMPLE', () => {
  test('the reference lists every real block type and cannot drift from TYPE_ALIASES', () => {
    Object.keys(TYPE_CONFIG).forEach(type => expect(FORMAT_REFERENCE).toContain(type))
    // A generated alias, not hand-copied — proves the table is built from
    // TYPE_ALIASES rather than a second, driftable copy of it.
    expect(FORMAT_REFERENCE).toContain('warmup')
    expect(FORMAT_REFERENCE).toContain('Sinônimos')
  })
  test('the example embeds verbatim in the reference and parses clean', () => {
    expect(FORMAT_REFERENCE).toContain(FORMAT_EXAMPLE)
    const { warnings } = parseSession(FORMAT_EXAMPLE)
    expect(warnings).toEqual([])
  })
  test('the block-only example is the example’s second block, and parses headerless', () => {
    expect(FORMAT_EXAMPLE.split('\n\n')[1]).toBe(FORMAT_EXAMPLE_BLOCK)
    const { warnings } = parseBlock(FORMAT_EXAMPLE_BLOCK, { knownType: 'For Time' })
    expect(warnings).toEqual([])
  })
})

// ── Round-trip corpus ─────────────────────────────────────────────────────────
const mkEx = o => ({
  id: 'x',
  name: '',
  sets: '',
  reps: '',
  dist: '',
  distUnit: 'm',
  intensity: null,
  note: '',
  ...o,
})
const mkBlk = o => ({
  id: 'b',
  label: o.type || 'For Time',
  type: 'For Time',
  zone: 'Zona 01',
  duration: '',
  rounds: '',
  notes: '',
  ladderMode: false,
  exercises: [],
  ...o,
})
const gender = o => ({ mode: 'gender', Masculino_unit: 'kg', Feminino_unit: 'kg', ...o })
const mkSt = o => ({ id: 's', name: '', duration: '', isRest: false, exercises: [], ...o })
// An Estações block keeps its exercises under `stations` and carries no `exercises` key
// at all — same shape as blockModel's emptyBlock('Estações').
const mkStBlk = o => {
  const b = mkBlk({ type: 'Estações', label: 'Estações', ...o })
  delete b.exercises
  return { ...b, stationRepeat: 1, ...o }
}

const CORPUS = {
  'standard rounds + cap + goal': mkBlk({
    type: 'For Time',
    label: 'For Time',
    rounds: '5',
    duration: '14',
    goal: { kind: 'time', min: '11:00', max: '12:00' },
    exercises: [mkEx({ name: 'Toes to Bar', reps: '10' }), mkEx({ name: 'Box Jump', reps: '10' })],
  }),
  'custom label': mkBlk({
    type: 'Skill',
    label: 'Handstand Walk',
    exercises: [mkEx({ name: 'Wall Walk', reps: '5' })],
  }),
  'AMRAP duration': mkBlk({
    type: 'AMRAP',
    label: 'AMRAP',
    duration: '15',
    exercises: [mkEx({ name: 'Burpee', reps: '10' })],
  }),
  'dist exercise': mkBlk({
    type: 'Cardio',
    label: 'Cardio',
    exercises: [
      mkEx({ name: 'Run', dist: '400', distUnit: 'm' }),
      mkEx({ name: 'Row', dist: '20', distUnit: 'cal' }),
      mkEx({ name: 'Run', sets: '3', dist: '400', distUnit: 'm' }),
    ],
  }),
  'gender intensity, three scales': mkBlk({
    type: 'For Time',
    label: 'For Time',
    exercises: [
      mkEx({
        name: 'Power Clean',
        reps: '8',
        intensity: gender({
          Masculino_RX: '60',
          Feminino_RX: '45',
          Masculino_Inter: '50',
          Feminino_Inter: '35',
          Masculino_SC: '40',
          Feminino_SC: '30',
        }),
      }),
      mkEx({
        name: 'Thruster',
        reps: '9',
        intensity: gender({ Masculino_RX: '42.5', Feminino_RX: '30' }),
      }),
    ],
  }),
  'pct + progression': mkBlk({
    type: 'Força',
    label: 'Força',
    exercises: [
      mkEx({
        name: 'Back Squat',
        sets: '5',
        reps: '5',
        intensity: {
          mode: 'progression',
          steps: ['65', '70', '75'].map(load => ({ reps: '', load, unit: '% do RM' })),
        },
      }),
      mkEx({ name: 'Front Squat', reps: '3', intensity: { mode: 'pct', pct: '80' } }),
      mkEx({
        name: 'Deadlift',
        reps: '5',
        intensity: {
          mode: 'progression',
          steps: ['60', '70', '80'].map(load => ({ reps: '', load, unit: 'kg' })),
        },
      }),
    ],
  }),
  'complex — inline and two-line': mkBlk({
    type: 'LPO',
    label: 'LPO',
    exercises: [
      mkEx({
        isComplex: true,
        complexMovements: [
          { id: 'm', name: 'Hang Squat Snatch', reps: '1' },
          { id: 'm', name: 'Squat Snatch', reps: '1' },
        ],
      }),
    ],
  }),
  'complex with progression steps': mkBlk({
    type: 'LPO',
    label: 'LPO',
    rounds: '5',
    exercises: [
      mkEx({
        sets: '5',
        isComplex: true,
        intensity: {
          mode: 'progression',
          steps: ['70', '75', '80', '82', '85'].map(load => ({ reps: '', load, unit: '% do RM' })),
        },
        complexMovements: [
          { id: 'm', name: 'Hang Squat Snatch', reps: '1' },
          { id: 'm', name: 'Squat Snatch', reps: '1' },
        ],
      }),
    ],
  }),
  ladder: mkBlk({
    type: 'For Time',
    label: 'For Time',
    duration: '15',
    ladderMode: true,
    exercises: [
      mkEx({
        name: 'Thruster',
        reps: '21,15,9',
        intensity: gender({ Masculino_RX: '42.5', Feminino_RX: '30' }),
      }),
      mkEx({ name: 'Chest to Bar', reps: '21,15,9' }),
    ],
  }),
  'lettered EMOM': mkBlk({
    type: 'EMOM',
    label: 'EMOM',
    duration: '12',
    lettered: true,
    exercises: [
      mkEx({ name: 'HSPU', reps: '12' }),
      mkEx({ name: 'T2B', reps: '12' }),
      mkEx({ name: 'Rest' }),
    ],
  }),
  'holds, notes and zone': mkBlk({
    type: 'Skill',
    label: 'Skill',
    zone: 'Zona 02',
    notes: 'usar caixa baixa\nsem pressa',
    exercises: [
      mkEx({ name: 'Handstand Hold', reps: '20"' }),
      mkEx({ name: 'Strict Pull Up', reps: '5', note: 'band' }),
      mkEx({ name: 'Rest', reps: "1'" }),
    ],
  }),
  // ── plans/61·A · one entry per loss class the prod audit measured ────────────
  'rounds goal with a reps tail': mkBlk({
    type: 'AMRAP',
    label: 'AMRAP',
    duration: '12',
    goal: { kind: 'rounds', min: '5', reps: '10' },
    exercises: [mkEx({ name: 'Burpee', reps: '10' })],
  }),
  'goal demoted to text on a type with no scoring axis': mkBlk({
    type: 'Skill',
    label: 'Skill',
    goal: { kind: 'text', text: "sub 10'" },
    exercises: [mkEx({ name: 'Wall Walk', reps: '5' })],
  }),
  'progression with per-step reps': mkBlk({
    type: 'Força',
    label: 'Força',
    exercises: [
      mkEx({
        name: 'Back Squat',
        intensity: {
          mode: 'progression',
          steps: [
            { reps: '3', load: '60', unit: 'kg' },
            { reps: '2', load: '70', unit: 'kg' },
            { reps: '1', load: '80', unit: 'kg' },
          ],
        },
      }),
    ],
  }),
  'progression with mixed units': mkBlk({
    type: 'Força',
    label: 'Força',
    exercises: [
      mkEx({
        name: 'Push Press',
        reps: '3',
        intensity: {
          mode: 'progression',
          steps: [
            { reps: '', load: '60', unit: 'kg' },
            { reps: '', load: '70', unit: '% do RM' },
          ],
        },
      }),
    ],
  }),
  'named complex': mkBlk({
    type: 'LPO',
    label: 'LPO',
    exercises: [
      mkEx({
        name: 'Complexo A',
        sets: '3',
        isComplex: true,
        intensity: {
          mode: 'progression',
          steps: ['60', '70', '80'].map(load => ({ reps: '', load, unit: 'kg' })),
        },
        complexMovements: [
          { id: 'm', name: 'Hang Squat Snatch', reps: '1' },
          { id: 'm', name: 'Squat Snatch', reps: '1' },
        ],
      }),
    ],
  }),
  'complex whose sets is NOT the step count': mkBlk({
    type: 'LPO',
    label: 'LPO',
    exercises: [
      mkEx({
        sets: '2',
        isComplex: true,
        intensity: {
          mode: 'progression',
          steps: ['60', '70', '80'].map(load => ({ reps: '', load, unit: 'kg' })),
        },
        complexMovements: [
          { id: 'm', name: 'Hang Squat Snatch', reps: '1' },
          { id: 'm', name: 'Squat Snatch', reps: '1' },
        ],
      }),
    ],
  }),
  'mixed ladder — only some exercises share the scheme': mkBlk({
    type: 'For Time',
    label: 'For Time',
    ladderMode: true,
    exercises: [
      mkEx({ name: 'Run', dist: '200', distUnit: 'm' }),
      mkEx({ name: 'Thruster', reps: '21,15,9' }),
      mkEx({ name: 'Pull Up', reps: '10' }),
    ],
  }),
  'gender scales with a gap — RX and SC, no Inter': mkBlk({
    type: 'For Time',
    label: 'For Time',
    exercises: [
      mkEx({
        name: 'Power Clean',
        reps: '8',
        intensity: gender({
          Masculino_RX: '60',
          Feminino_RX: '45',
          Masculino_SC: '40',
          Feminino_SC: '30',
        }),
      }),
    ],
  }),
  'sets times a hold': mkBlk({
    type: 'Skill',
    label: 'Skill',
    exercises: [mkEx({ name: 'Handstand Hold', sets: '3', reps: '20"' })],
  }),
  'decimal duration (#93)': mkBlk({
    type: 'LPO',
    label: 'LPO',
    duration: '2.3',
    exercises: [mkEx({ name: 'Clean Pull', reps: '3' })],
  }),
  'no header at all — the first line is an exercise': mkBlk({
    type: '',
    label: '',
    typeUnresolved: true,
    exercises: [
      mkEx({ name: 'Prancha', reps: '40"' }),
      mkEx({ name: 'Hollow Hold', reps: '30"' }),
      mkEx({ name: 'Sit Up', reps: '20' }),
    ],
  }),
  'unresolved type': mkBlk({
    type: '',
    label: "Quem já faz tc 15'",
    typeUnresolved: true,
    rounds: '5',
    exercises: [mkEx({ name: 'HSW', dist: '5', distUnit: 'm' })],
  }),
  'sets with no reps': mkBlk({
    type: 'Acessórios',
    label: 'Acessórios',
    exercises: [mkEx({ name: 'Bicep Curl', sets: '3' })],
  }),
  // ── plans/61·B · stations ───────────────────────────────────────────────────
  'stations — two groups, a rest station, repeat and inter-cycle rest': mkStBlk({
    stationRepeat: 2,
    restBetweenCycles: '01:00',
    stations: [
      mkSt({
        name: 'Grupo A',
        duration: '3:00',
        exercises: [mkEx({ name: 'Wall Ball', reps: '15' })],
      }),
      mkSt({
        name: 'Grupo B',
        duration: '3:00',
        exercises: [mkEx({ name: 'Box Jump', reps: '12' })],
      }),
      mkSt({ name: 'Descanso', duration: '1:00', isRest: true }),
    ],
  }),
  'stations — a duration-less group and an unnamed one': mkStBlk({
    stations: [
      mkSt({ name: 'Grupo A', exercises: [mkEx({ name: 'Clean & Jerk', reps: '5' })] }),
      mkSt({ duration: '10:00', exercises: [mkEx({ name: 'Run', dist: '400', distUnit: 'm' })] }),
    ],
  }),
  // The station NAME carries the coach's own `'`/`"` notation; only the trailing mm:ss
  // is the duration (prod, 2026-06-19 — this used to invent a 3-minute block duration).
  'stations — a name that looks like a duration': mkStBlk({
    stationRepeat: 4,
    stations: [
      mkSt({
        name: "AMRAP 3'30''",
        duration: '03:30',
        exercises: [mkEx({ name: 'DU', reps: '50' }), mkEx({ name: 'Max RMU' })],
      }),
      mkSt({ name: 'Descanso', duration: '02:00', isRest: true }),
    ],
  }),
  'stations — block-level rounds, cap, goal and zone survive alongside': mkStBlk({
    label: 'Estações – Cardio',
    zone: 'Zona 03',
    rounds: '3',
    duration: '30',
    stationRepeat: 3,
    restBetweenCycles: '00:00',
    goal: { kind: 'text', text: '3 voltas completas' },
    notes: 'terminar antes do fim do round',
    stations: [mkSt({ duration: '10:00', exercises: [mkEx({ name: 'Pull Up', reps: '15' })] })],
  }),
}

describe('round-trip: parseSession(serializeSession(s)).blocks === s.blocks', () => {
  test.each(Object.keys(CORPUS))('%s', name => {
    const block = CORPUS[name]
    const again = parseSession(serializeSession({ blocks: [block] }))
    expect(again.warnings.filter(w => w.kind === 'unparsed-line')).toEqual([])
    expect(stripIds(again.blocks)).toEqual(stripIds([block]))
  })

  test('a whole multi-block session round-trips at once', () => {
    const blocks = Object.values(CORPUS)
    const again = parseSession(serializeSession({ blocks }))
    expect(stripIds(again.blocks)).toEqual(stripIds(blocks))
  })

  test('the per-block form omits the header and re-parses against the known type', () => {
    const block = CORPUS['standard rounds + cap + goal']
    const text = serializeBlock(block, { header: false })
    expect(text.split('\n')[0]).toBe("5 rounds Cap 14'")
    expect(stripIds(parseBlock(text, { knownType: 'For Time' }).block.exercises)).toEqual(
      stripIds(block.exercises),
    )
  })
})

// ── Stations (plans/61·B) ─────────────────────────────────────────────────────
describe('stations', () => {
  const b = {
    type: 'Estações',
    label: 'Estações',
    stationRepeat: 2,
    restBetweenCycles: '01:00',
    stations: [
      {
        id: 's',
        name: 'Grupo A',
        duration: '3:00',
        isRest: false,
        exercises: [mkEx({ name: 'Wall Ball', reps: '15' })],
      },
      { id: 's', name: 'Descanso', duration: '1:00', isRest: true, exercises: [] },
    ],
  }

  test('the notation is the header, the two cycle keywords, then station-then-exercises', () => {
    expect(serializeBlock(b).split('\n')).toEqual([
      'Estações',
      'Ciclos: 2',
      'Entre ciclos: 01:00',
      'Grupo A 3:00',
      '15 Wall Ball',
      'Descanso 1:00',
    ])
  })

  test('`Descanso 1:00` is a rest STATION, not a Rest exercise (RE_REST would shadow it)', () => {
    const { block } = parseBlock(serializeBlock(b))
    expect(block.stations).toHaveLength(2)
    expect(block.stations[1]).toMatchObject({ name: 'Descanso', duration: '1:00', isRest: true })
    expect(block.stations[1].exercises).toEqual([])
  })

  test("a Rest EXERCISE inside a station still parses as one — it writes mm's, not mm:ss", () => {
    const { block } = parseBlock("Estações\nGrupo A 3:00\n15 Wall Ball\nRest 2'")
    expect(block.stations).toHaveLength(1)
    expect(block.stations[0].exercises.at(-1)).toMatchObject({ name: 'Rest', reps: "2'" })
  })

  test('a leading quantity means an exercise, never a station', () => {
    const { block } = parseBlock('Estações\nGrupo A 3:00\n15 Wall Ball 1:00')
    expect(block.stations).toHaveLength(1)
    expect(block.stations[0].exercises).toHaveLength(1)
  })

  test('an exercise before any station header opens an unnamed one — no line is lost', () => {
    const { block } = parseBlock('Estações\n15 Wall Ball\nGrupo B 2:00\n10 Box Jump')
    expect(block.stations.map(st => st.name)).toEqual(['', 'Grupo B'])
    expect(block.stations[0].exercises).toHaveLength(1)
  })

  test('the block carries stations, never an exercises array', () => {
    const { block } = parseBlock(serializeBlock(b))
    expect(block.exercises).toBeUndefined()
    expect(block).toMatchObject({ stationRepeat: 2, restBetweenCycles: '01:00' })
  })

  test('a repeat of 1 is the default everywhere it is read, so it carries no line', () => {
    expect(serializeBlock({ ...b, stationRepeat: 1 })).not.toContain('Ciclos:')
    expect(parseBlock('Estações\nGrupo A 3:00').block.stationRepeat).toBe(1)
  })

  test('station lines only exist inside an Estações block', () => {
    const { block } = parseBlock('For Time\nGrupo A 3:00\n15 Wall Ball')
    expect(block.stations).toBeUndefined()
    expect(block.exercises).toHaveLength(2)
  })
})

// ── Locked passthrough (plans/61·B) ───────────────────────────────────────────
describe('isTextEditable + locked blocks', () => {
  test('only a LINKED benchmark is locked out of text mode', () => {
    expect(isTextEditable({ type: 'For Time' })).toBe(true)
    expect(isTextEditable({ type: 'Estações', stations: [] })).toBe(true)
    expect(isTextEditable({ type: 'For Time', benchmarkRef: 'Fran' })).toBe(false)
  })

  const fran = { id: 'f', type: 'Benchmark', label: 'Fran', benchmarkRef: 'Fran', exercises: [] }
  const a = mkBlk({
    id: 'a',
    type: 'Aquecimento',
    label: 'Aquecimento',
    exercises: [mkEx({ name: 'Row', dist: '500', distUnit: 'm' })],
  })
  const c = mkBlk({
    id: 'c',
    type: 'For Time',
    label: 'For Time',
    exercises: [mkEx({ name: 'Burpee', reps: '20' })],
  })

  test('a locked block is held out of the text and warned about', () => {
    const { text, layout, warnings } = splitLockedBlocks([a, fran, c])
    expect(text).not.toContain('Fran')
    expect(layout.map(l => l.kind)).toEqual(['text', 'locked', 'text'])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatchObject({ kind: 'block-locked', lineNo: null })
  })

  test('it comes back byte-identical, at its own index', () => {
    const { text, layout } = splitLockedBlocks([a, fran, c])
    const merged = mergeLockedBlocks(parseSession(text).blocks, layout)
    expect(merged).toHaveLength(3)
    expect(merged[1]).toBe(fran) // the SAME object — not a re-parse of it
    expect(merged.map(b => b.type)).toEqual(['Aquecimento', 'Benchmark', 'For Time'])
  })

  test('it stays anchored when the coach adds or removes blocks in the textarea', () => {
    const { layout } = splitLockedBlocks([a, fran, c])
    // one text block deleted
    expect(mergeLockedBlocks([a], layout).map(b => b.id)).toEqual(['a', 'f'])
    // one added at the end — the locked block keeps the slot it had
    const extra = mkBlk({ id: 'd', type: 'Core' })
    expect(mergeLockedBlocks([a, c, extra], layout).map(b => b.id)).toEqual(['a', 'f', 'c', 'd'])
  })

  test('a session with nothing but a locked block still round-trips', () => {
    const { text, layout } = splitLockedBlocks([fran])
    expect(text).toBe('')
    expect(mergeLockedBlocks(parseSession(text).blocks, layout)).toEqual([fran])
  })
})

// ── Misc ──────────────────────────────────────────────────────────────────────
describe('normalization', () => {
  test('typographic quotes, NBSP and trailing space are folded before matching', () => {
    expect(normLine('  Skill – Handstand Walk  ')).toBe('Skill – Handstand Walk')
    expect(ex1('A 20” Handstand Hold')).toMatchObject({ reps: '20"', name: 'Handstand Hold' })
    expect(parseStructure('AMRAP 15’')).toMatchObject({ type: 'AMRAP', duration: '15' })
  })
})

describe('serializeExercise', () => {
  test('a gender load is written grouped by SCALE, the coach’s own axis order', () => {
    expect(
      serializeExercise(
        mkEx({
          name: 'Power Clean',
          reps: '8',
          intensity: gender({
            Masculino_RX: '60',
            Feminino_RX: '45',
            Masculino_Inter: '50',
            Feminino_Inter: '35',
          }),
        }),
      ),
    ).toBe('8 Power Clean 60/45kg – 50/35kg')
  })
  test('a half-filled gender pair keeps its empty side explicit', () => {
    expect(
      serializeExercise(
        mkEx({ name: 'Snatch', reps: '3', intensity: gender({ Masculino_RX: '60' }) }),
      ),
    ).toBe('3 Snatch 60/-kg')
  })
})
