import { blkColor } from '../lib/wod.js'
import { THEMES as REAL_THEMES } from '../lib/theme.js'

// #114 — a Sunday-start week of real Date objects, built from a fixed calendar date
// rather than `new Date()`. `getWeek(0)` (lib/week.js) always reads the wall clock with
// no way to pin it, so any group that fed it straight into a fixture (index.jsx,
// criador.jsx) produced a `design:cards` diff every day. Shared here so both groups
// derive the same week instead of each hand-rolling its own fixed date.
function weekFrom(refDate) {
  const sun = new Date(refDate)
  sun.setDate(refDate.getDate() - refDate.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sun)
    d.setDate(sun.getDate() + i)
    return d
  })
}
export const FIXED_WEEK = weekFrom(new Date(2026, 0, 7))

// ── Component gallery (dev-only) — shared mock fixtures ────────────────────────
// Pure data, no JSX: the state matrix every group's Case fixtures draw from.
// See Gallery.jsx for the gallery shell and cone/docs/WORKFLOW.md → "Design /
// component gallery" for the coverage standard + process.

// Derived from the canonical list (public/lib/theme.js) since #143 — this was a fourth
// hand-maintained copy, and it had already drifted ("Spirit Blossom" vs "Spirit Blossom
// Dark"). Only the key name differs: the gallery's <select> is written against `v`.
export const THEMES = REAL_THEMES.map(t => ({ v: t.id, label: t.label }))

// Family (data) colors come from the real blkColor(), not theme tokens.
export const AMBER = blkColor({ type: 'For Time' })
export const BLUE = blkColor({ type: 'Força' })
export const RED = blkColor({ type: 'WOD' })
export const GREEN = blkColor({ type: 'Aquecimento' })

// ── Mock fixtures — the exercise state matrix (data-shape variants) ──
export const exStandard = {
  id: 'e1',
  name: 'Thruster',
  sets: 5,
  reps: '5',
  intensity: { mode: 'pct', pct: 75 },
  note: 'Quebrar cedo nos thrusters.',
}
export const exScheme = {
  id: 'e2',
  name: 'Wall Ball',
  reps: '21,15,9',
  intensity: {
    mode: 'gender',
    Masculino_RX: '9',
    Masculino_Inter: '7',
    Feminino_RX: '6',
    Feminino_Inter: '5',
    Masculino_unit: 'kg',
    Feminino_unit: 'kg',
  },
}
export const exProg = {
  id: 'e3',
  name: 'Back Squat',
  sets: 5,
  reps: '3',
  intensity: {
    mode: 'progression',
    steps: [
      { reps: '3', load: '70' },
      { reps: '3', load: '80' },
      { reps: '3', load: '90' },
    ],
  },
}
// Reps live only in intensity.steps[].reps (no top-level ex.reps) — the shape that
// dropped the rep scheme on the TV wall before exVolStr learned to fall back (#72).
export const exProgStepsOnly = {
  id: 'e10',
  name: 'Front Squat',
  intensity: {
    mode: 'progression',
    steps: [
      { reps: '5', load: '60' },
      { reps: '5', load: '70' },
      { reps: '5', load: '80' },
    ],
  },
}
export const exComplex = {
  id: 'e4',
  isComplex: true,
  name: '',
  sets: 4,
  complexMovements: [
    { id: 'm1', name: 'Clean Pull', reps: '2' },
    { id: 'm2', name: 'Power Clean', reps: '1' },
    { id: 'm3', name: 'Push Jerk', reps: '1' },
  ],
  intensity: { mode: 'pct', pct: 70 },
}
export const exDist = { id: 'e5', name: 'Row', dist: '500', distUnit: 'm' }
export const exCal = { id: 'e6', name: 'Assault Bike', dist: '15', distUnit: 'cal' }
export const exCardio = {
  id: 'e7',
  name: 'Corrida',
  intensity: { mode: 'cardio', cardioVal: '400', cardioUnit: 'm' },
}
export const exLong = {
  id: 'e8',
  name: 'Dumbbell Devil Press Alternating Bare-Hand',
  sets: 3,
  reps: '10',
  intensity: { mode: 'pct', pct: 60 },
}
export const exNoteOnly = { id: 'e9', name: 'Alongamento', note: '2 min cada lado' }

export const FULL_LIST = [
  exStandard,
  exScheme,
  exProg,
  exComplex,
  exDist,
  exCal,
  exCardio,
  exLong,
  exNoteOnly,
]

// ── Mock fixtures — schedule/ components (blocks, sessions, panes) ──
export const NOOP = () => {}

export const schedBlPlain = { id: 'erb1', rounds: 0 }
export const schedBlRound = { id: 'erb2', rounds: 4 }

// ExRow/DemoPanel resolve names via registry.js's resolveExercise (#62), which reads
// either a raw registry blob or a buildRegistryIndex Map keyed by normalized name —
// these fixtures use the Map form directly since there's no family structure to mock.
export const demoMapFull = new Map([
  [
    'thruster',
    {
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      videoPublished: true,
      description: 'Padrão de agachamento com arremesso acima da cabeça.',
      muscles: 'Pernas, ombros, core.',
      notes: 'Cotovelos altos na recepção; não deixar o peso cair para frente.',
    },
  ],
])
export const demoMapTextOnly = new Map([
  ['wall ball', { description: 'Agachamento completo com arremesso da bola na parede.' }],
])
export const demoMapEmpty = new Map()
export const demoMapComplex = new Map([
  ['clean pull', { description: 'Puxada de chão explosiva, sem receber a barra.' }],
])

export const logPaneBlk = { id: 'b1', type: 'For Time', exercises: [exStandard] }
export const logPaneSess = { id: 'sess-lp', sessionName: 'Treino A', blocks: [logPaneBlk] }
export const logPaneAthletes = [
  { id: 'a1', name: 'Bruna' },
  { id: 'a2', name: 'Arthur' },
]
export const logPaneBlockForm = [
  {
    blockId: 'b1',
    blockLabel: 'For Time',
    blockType: 'For Time',
    rpe: null,
    scale: null,
    perfTime: '',
    perfRounds: '',
    perfReps: '',
  },
]
export const logPaneBlockDone = [
  {
    blockId: 'b1',
    blockLabel: 'For Time',
    blockType: 'For Time',
    rpe: 8,
    scale: 'RX',
    perfTime: '12:34',
    perfRounds: '',
    perfReps: '',
  },
]

export const deskRegBlFixture = { bl: { type: 'For Time' } }
export const deskRegBlAmrap = { bl: { type: 'AMRAP' } }

export const checkinAthletes = [
  { id: 'a1', name: 'Bruna' },
  { id: 'a2', name: 'Arthur' },
  { id: 'a3', name: 'Camila' },
]

export const bdSess = { id: 'bds1', sessionName: 'Treino A' }
export const bdBlWodWithAth = { id: 'bdb1', type: 'For Time', exercises: [exStandard] }
export const bdBlWodIdle = {
  id: 'bdb2',
  type: 'AMRAP',
  duration: '20',
  exercises: [exStandard, exProg],
}
export const bdBlPlain = { id: 'bdb3', type: 'Força', exercises: [exStandard, exComplex] }
export const bdBlRound = { id: 'bdb5', type: 'Força', rounds: 4, exercises: [exStandard] }
export const bdBlEstacoes = {
  id: 'bdb4',
  type: 'Estações',
  stationRepeat: 2,
  restBetweenCycles: '1:00',
  stations: [
    { name: 'Estação 1', duration: '0:45', exercises: [exStandard] },
    { name: 'Descanso', isRest: true, duration: '0:15' },
    { name: 'Estação 2', duration: '0:45', exercises: [exComplex] },
  ],
}

export const sdSessNamed = {
  id: 'sds1',
  sessionName: 'Treino A',
  blocks: [bdBlWodWithAth, bdBlPlain],
}
export const sdSessUnnamed = { id: 'sds2', blocks: [bdBlPlain] }

// ── Mock fixtures — RankList + results/ components ──
// Athlete-identity colors (rl*.color) are real per-athlete data, not tokens.
export const rlFT = [
  {
    id: 'r1',
    athleteId: 'a1',
    name: 'Bruna Medrado',
    scale: 'RX',
    rpe: 9,
    perfTime: '08:12',
    color: '#c84038',
  },
  {
    id: 'r2',
    athleteId: 'a2',
    name: 'Arthur Souza',
    scale: 'RX',
    rpe: 8,
    perfTime: '09:05',
    color: '#4878d8',
  },
  {
    id: 'r3',
    athleteId: 'a3',
    name: 'Camila Rocha',
    scale: 'Inter',
    rpe: 8,
    perfTime: '10:47',
    color: '#48b860',
  },
  {
    id: 'r4',
    athleteId: 'a4',
    name: 'Diego Lima',
    scale: 'Inter',
    rpe: 7,
    perfTime: '11:30',
    color: '#d8a840',
  },
  { id: 'r5', athleteId: 'a5', name: 'Elisa Prado', scale: 'SC', rpe: 6, perfTime: '13:02' },
  { id: 'r6', athleteId: 'a6', name: 'Fábio Neves', scale: 'Adaptado', perfTime: '15:20' }, // sem RPE
]
export const rlDNF = [
  ...rlFT.slice(0, 3),
  { id: 'r7', athleteId: 'a7', name: 'Gabriel Antunes', scale: 'RX', perfRounds: '4' }, // capped — no time
  { id: 'r8', athleteId: 'a8', name: 'Helena Dias', scale: 'SC' }, // nothing logged
]
export const rlAmrap = [
  {
    id: 'r1',
    athleteId: 'a1',
    name: 'Bruna Medrado',
    scale: 'RX',
    perfRounds: '9',
    perfReps: '12',
  },
  { id: 'r2', athleteId: 'a2', name: 'Arthur Souza', scale: 'RX', perfRounds: '9', perfReps: '4' },
  { id: 'r3', athleteId: 'a3', name: 'Camila Rocha', scale: 'Inter', perfRounds: '8' },
  { id: 'r4', athleteId: 'a4', name: 'Diego Lima', scale: 'SC', perfRounds: '6', perfReps: '15' },
]
export const rlLong = [
  {
    id: 'r1',
    athleteId: 'a1',
    name: 'Maria Fernanda Albuquerque de Vasconcelos',
    scale: 'Adaptado',
    perfTime: '14:58',
  },
  { id: 'r2', athleteId: 'a2', name: 'João', scale: 'RX', perfTime: '15:02' },
]
export const rlMany = [
  ...rlFT,
  { id: 'r9', athleteId: 'a9', name: 'Igor Salles', scale: 'RX', perfTime: '16:04' },
  { id: 'r10', athleteId: 'a10', name: 'Júlia Moraes', scale: 'Inter', perfTime: '17:11' },
  { id: 'r11', athleteId: 'a11', name: 'Karla Bastos', scale: 'SC', perfTime: '18:40' },
  { id: 'r12', athleteId: 'a12', name: 'Lucas Ferreira', scale: 'RX', perfTime: '19:25' },
]

// Goal badge (#117) — bl.goal shapes, not entries. A time WINDOW against rlFT's own
// perfTime spread (08:12/09:05/10:47/11:30/13:02/15:20) yields one beat, two met, and
// two missed rows in the same list — and against rlDNF (which reuses rlFT's first 3
// plus a capped row and a nothing-logged row) shows the capped/nothing-logged rows
// correctly render NO badge (missed and null both look like absence on screen).
export const rlGoalWindow = { kind: 'time', min: '09:00', max: '11:00' }
// Against rlAmrap's own rounds/reps (9+12 / 9+4 / 8+0 / 6+15) — rounds has no 'met'
// state, so this only ever shows beat or nothing.
export const rlGoalRounds = { kind: 'rounds', min: 8, reps: 5 }

export const rcSess = { id: 'rc1', sessionName: 'Treino A · 18h' }
export const rcSessDay = { id: 'rc2' } // no name → falls back to the day name
export const rcBlFT = {
  id: 'rcb1',
  type: 'For Time',
  duration: '12',
  exercises: [exScheme, exDist],
}
export const rcBlFTCap = {
  id: 'rcb2',
  type: 'For Time',
  rounds: 5,
  duration: '20',
  exercises: [exStandard, exCal],
} // rounds → DNF field
export const rcBlAmrap = {
  id: 'rcb3',
  type: 'AMRAP',
  duration: '20',
  exercises: [exStandard, exScheme, exDist],
}
export const rcBlComplex = {
  id: 'rcb4',
  type: 'For Time',
  label: 'Barra',
  duration: '15',
  exercises: [exComplex, exProg],
} // complexo: sem `name` próprio
export const rcBlBare = { id: 'rcb5', type: 'AMRAP' } // sem meta e sem exercícios → não renderiza nada

// #112/#116 — every DEF_INP()-shaped fixture must carry finished/checkpoint/exerciseRows
// too, or those gallery cases render `undefined` for the new fields.
export const rcInpEmpty = {
  rpe: null,
  scale: null,
  perfTime: '',
  perfRounds: '',
  perfReps: '',
  finished: null,
  checkpoint: null,
  exerciseRows: null,
}
export const rcInpDone = {
  rpe: 9,
  scale: 'Inter',
  perfTime: '11:24',
  perfRounds: '',
  perfReps: '',
  finished: null,
  checkpoint: null,
  exerciseRows: null,
}
// #116 — scale is non-RX (was RX) specifically so this is also the gallery's live demo of
// per-exercise adaptation notes in an open form: 2 of rcBlAmrap's 3 exercises (Thruster,
// Wall Ball) carry a note and render open; the third (Row) renders closed. Paired with
// rcBrAmrap below, which carries the same rows for the READ-BACK side (LoggedResult).
export const rcInpAmrap = {
  rpe: 8,
  scale: 'SC',
  perfTime: '',
  perfRounds: '9',
  perfReps: '12',
  finished: null,
  checkpoint: null,
  exerciseRows: [
    { exId: 'e1', name: 'Thruster', note: 'Reduzi a carga pra 30kg' },
    { exId: 'e2', name: 'Wall Ball', note: 'Bola de 6kg em vez de 9kg' },
  ],
}
// The checkpoint toggle opened (#112) — paired with rcBlFTCap (rounds: 5), so
// "Rounds completos de 5" shows a real total rather than the N=1 chipper fallback.
export const rcInpDNF = {
  rpe: 9,
  scale: 'Inter',
  perfTime: '',
  perfRounds: '4',
  perfReps: '',
  finished: false,
  checkpoint: { roundsDone: 4, roundsTotal: 5, exIdx: 1, exName: 'Assault Bike', exReps: 7 },
  exerciseRows: null,
}
// "Onde parou" opened on an AMRAP (#112) — no roundsTotal, no `finished`: an AMRAP never DNFs.
export const rcInpAmrapCheckpoint = {
  rpe: 8,
  scale: 'RX',
  perfTime: '',
  perfRounds: '9',
  perfReps: '12',
  finished: null,
  checkpoint: { exIdx: 0, exName: 'Thruster', exReps: 6 },
  exerciseRows: null,
}

export const rcBrFT = { blockId: 'rcb1', rpe: 8, scale: 'RX', perfTime: '10:32' }
// The DNF checkpoint fixture (#112) — paired with rcBlFTCap (rounds: 5, exercises:
// [exStandard "Thruster", exCal "Assault Bike"]): 4 of 5 rounds, capped 7 reps into the
// Assault Bike.
export const rcBrDNF = {
  blockId: 'rcb2',
  rpe: 9,
  scale: 'Inter',
  perfRounds: '4',
  finished: false,
  checkpoint: { roundsDone: 4, roundsTotal: 5, exIdx: 1, exName: 'Assault Bike', exReps: 7 },
}
// #116 — same two rows as rcInpAmrap above, the read-back (LoggedResult) side of the pair.
export const rcBrAmrap = {
  blockId: 'rcb3',
  rpe: 7,
  scale: 'SC',
  perfRounds: '9',
  perfReps: '12',
  exerciseRows: [
    { exId: 'e1', name: 'Thruster', note: 'Reduzi a carga pra 30kg' },
    { exId: 'e2', name: 'Wall Ball', note: 'Bola de 6kg em vez de 9kg' },
  ],
}

// #116 — the extra ScoreFields states plans/56's Verification checklist calls for that
// rcBlAmrap/rcBlBare can't cover on their own: a long exercise name (truncation) and an
// Estações block (flattened list — reuses schedule's own bdBlEstacoes fixture below).
export const rcBlLongEx = { id: 'rcb6', type: 'AMRAP', duration: '15', exercises: [exLong] }

// ── Mock fixtures — leaderboard/ chrome ──
export const lbWods = [
  { key: 'w1', label: 'For Time', sessName: 'Treino A', dt: 'sex., 10/07', count: 6 },
  { key: 'w2', label: 'MetCon', sessName: 'Treino B', dt: 'qui., 09/07', count: 4 },
  { key: 'w3', label: 'Fran', sessName: '', dt: 'qua., 08/07', count: 3 },
  {
    key: 'w4',
    label: 'Benchmark de Resistência Muscular',
    sessName: 'Treino de Sábado — Turma da Manhã',
    dt: 'sáb., 11/07',
    count: 23,
  },
]

// The mockup's WOD, as real data: MetCon (red family), 4 rounds, CAP 40'.
const kg = { Masculino_unit: 'kg', Feminino_unit: 'kg' }
export const lbBlMetcon = {
  id: 'lbb1',
  type: 'MetCon',
  rounds: 4,
  duration: '40',
  exercises: [
    {
      id: 'x1',
      name: 'Wall Ball',
      reps: '15',
      intensity: { mode: 'gender', Masculino_RX: '9', Feminino_RX: '6', ...kg },
    },
    {
      id: 'x2',
      name: 'Box Jump',
      reps: '12',
      intensity: {
        mode: 'gender',
        Masculino_RX: '24',
        Feminino_RX: '20',
        Masculino_unit: '"',
        Feminino_unit: '"',
      },
    },
    { id: 'x3', name: 'Burpee', reps: '9' },
  ],
}
export const lbBlForTime = {
  id: 'lbb2',
  type: 'For Time',
  label: 'Fran',
  duration: '12',
  exercises: [exScheme, exDist],
}
export const lbBlEstacoes = bdBlEstacoes // flattens into one list, like TV
export const lbBlBare = { id: 'lbb4', type: 'AMRAP', duration: '20' } // sem exercícios
