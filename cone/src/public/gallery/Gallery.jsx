import { useState, useRef } from 'react'
import { ExerciseList } from '../shared/ExerciseList.jsx'
import RankList from '../shared/RankList.jsx'
import AccordionCard from '../shared/AccordionCard.jsx'
import Nav from '../Nav.jsx'
import RdCounter from '../schedule/RdCounter.jsx'
import DemoPanel from '../schedule/DemoPanel.jsx'
import LogPane from '../schedule/LogPane.jsx'
import DeskRegPane from '../schedule/DeskRegPane.jsx'
import ExRow from '../schedule/ExRow.jsx'
import BlockDetail from '../schedule/BlockDetail.jsx'
import SessionDetail from '../schedule/SessionDetail.jsx'
import CheckinSheet from '../schedule/CheckinSheet.jsx'
import SessionCard from '../results/SessionCard.jsx'
import KpiGrid from '../results/KpiGrid.jsx'
import LoggedResult from '../results/LoggedResult.jsx'
import LogForm from '../results/LogForm.jsx'
import WodSummary from '../results/WodSummary.jsx'
import WodBlockCard from '../shared/WodBlockCard.jsx'
import TallyBar from '../shared/TallyBar.jsx'
import HeroCard from '../me/HeroCard.jsx'
import KpiStrip from '../me/KpiStrip.jsx'
import AthletePicker from '../me/AthletePicker.jsx'
import SessionList from '../me/SessionList.jsx'
import EventList from '../me/EventList.jsx'
import GoalList from '../me/GoalList.jsx'
import BarList from '../me/BarList.jsx'
import PrSection from '../me/PrSection.jsx'
import PrLogSheet from '../me/PrLogSheet.jsx'
import BodySheet from '../me/BodySheet.jsx'
import ConfirmSheet from '../me/ConfirmSheet.jsx'
// ScaleFilter lives in shared/, not leaderboard/ — #51 moved it (three copies existed)
// but left this import on the old path, which made gallery.html a hard 500 until #52
// caught it. The gallery is dev-only and never built, so no CI gate can see a broken
// import here: open the page after touching it.
import ScaleFilter from '../shared/ScaleFilter.jsx'
import WodSelectCard from '../leaderboard/WodSelectCard.jsx'
import WodCard from '../leaderboard/WodCard.jsx'
import lb from '../leaderboard/Leaderboard.module.css'
import { calcKpis, cardSummary } from '../results/resultsHelpers.js'
import MobileFrame from './MobileFrame.jsx'
import { blkColor } from '../lib/wod.js'
import s from './Gallery.module.css'

// ── Component gallery (dev-only) ───────────────────────────────────────────────
// The all-states source of truth: renders the REAL components in every state so
// it cannot drift from what ships. Grows page-by-page as reusable pieces are
// extracted (see #17 / the design program). Coverage standard + process:
// cone/docs/WORKFLOW.md → "Design / component gallery".

const THEMES = [
  { v: 'totk-dark',            label: 'TotK Dark' },
  { v: 'totk-light',           label: 'TotK Light' },
  { v: 'spirit-blossom',       label: 'Spirit Blossom' },
  { v: 'spirit-blossom-light', label: 'Spirit Blossom Light' },
]

// Family (data) colors come from the real blkColor(), not theme tokens.
const AMBER = blkColor({ type: 'For Time' })
const BLUE  = blkColor({ type: 'Força' })
const RED   = blkColor({ type: 'WOD' })
const GREEN = blkColor({ type: 'Aquecimento' })

// ── Mock fixtures — the exercise state matrix (data-shape variants) ──
const exStandard = { id: 'e1', name: 'Thruster', sets: 5, reps: '5', intensity: { mode: 'pct', pct: 75 }, note: 'Quebrar cedo nos thrusters.' }
const exScheme   = { id: 'e2', name: 'Wall Ball', reps: '21,15,9', intensity: { mode: 'gender', Masculino_RX: '9', Masculino_Inter: '7', Feminino_RX: '6', Feminino_Inter: '5', Masculino_unit: 'kg', Feminino_unit: 'kg' } }
const exProg     = { id: 'e3', name: 'Back Squat', sets: 5, reps: '3', intensity: { mode: 'progression', steps: [{ reps: '3', load: '70' }, { reps: '3', load: '80' }, { reps: '3', load: '90' }] } }
// Reps live only in intensity.steps[].reps (no top-level ex.reps) — the shape that
// dropped the rep scheme on the TV wall before exVolStr learned to fall back (#72).
const exProgStepsOnly = { id: 'e10', name: 'Front Squat', intensity: { mode: 'progression', steps: [{ reps: '5', load: '60' }, { reps: '5', load: '70' }, { reps: '5', load: '80' }] } }
const exComplex  = { id: 'e4', isComplex: true, name: '', sets: 4, complexMovements: [{ id: 'm1', name: 'Clean Pull', reps: '2' }, { id: 'm2', name: 'Power Clean', reps: '1' }, { id: 'm3', name: 'Push Jerk', reps: '1' }], intensity: { mode: 'pct', pct: 70 } }
const exDist     = { id: 'e5', name: 'Row', dist: '500', distUnit: 'm' }
const exCal      = { id: 'e6', name: 'Assault Bike', dist: '15', distUnit: 'cal' }
const exCardio   = { id: 'e7', name: 'Corrida', intensity: { mode: 'cardio', cardioVal: '400', cardioUnit: 'm' } }
const exLong     = { id: 'e8', name: 'Dumbbell Devil Press Alternating Bare-Hand', sets: 3, reps: '10', intensity: { mode: 'pct', pct: 60 } }
const exNoteOnly = { id: 'e9', name: 'Alongamento', note: '2 min cada lado' }

const FULL_LIST = [exStandard, exScheme, exProg, exComplex, exDist, exCal, exCardio, exLong, exNoteOnly]

// ── Mock fixtures — schedule/ components (blocks, sessions, panes) ──
const NOOP = () => {}

const schedBlPlain = { id: 'erb1', rounds: 0 }
const schedBlRound = { id: 'erb2', rounds: 4 }

const demoMapFull     = { thruster: { videoUrl: 'https://youtu.be/dQw4w9WgXcQ', videoPublished: true, description: 'Padrão de agachamento com arremesso acima da cabeça.', muscles: 'Pernas, ombros, core.', notes: 'Cotovelos altos na recepção; não deixar o peso cair para frente.' } }
const demoMapTextOnly = { 'wall ball': { description: 'Agachamento completo com arremesso da bola na parede.' } }
const demoMapEmpty    = {}
const demoMapComplex  = { 'clean pull': { description: 'Puxada de chão explosiva, sem receber a barra.' } }

const logPaneBlk        = { id: 'b1', type: 'For Time', exercises: [exStandard] }
const logPaneSess       = { id: 'sess-lp', sessionName: 'Treino A', blocks: [logPaneBlk] }
const logPaneAthletes   = [{ id: 'a1', name: 'Bruna' }, { id: 'a2', name: 'Arthur' }]
const logPaneBlockForm  = [{ blockId: 'b1', blockLabel: 'For Time', blockType: 'For Time', rpe: null, scale: null, perfTime: '', perfRounds: '', perfReps: '' }]
const logPaneBlockDone  = [{ blockId: 'b1', blockLabel: 'For Time', blockType: 'For Time', rpe: 8, scale: 'RX', perfTime: '12:34', perfRounds: '', perfReps: '' }]

const deskRegBlFixture = { bl: { type: 'For Time' } }
const deskRegBlAmrap   = { bl: { type: 'AMRAP' } }

const checkinAthletes = [{ id: 'a1', name: 'Bruna' }, { id: 'a2', name: 'Arthur' }, { id: 'a3', name: 'Camila' }]

const bdSess          = { id: 'bds1', sessionName: 'Treino A' }
const bdBlWodWithAth  = { id: 'bdb1', type: 'For Time', exercises: [exStandard] }
const bdBlWodIdle     = { id: 'bdb2', type: 'AMRAP', duration: '20', exercises: [exStandard, exProg] }
const bdBlPlain       = { id: 'bdb3', type: 'Força', exercises: [exStandard, exComplex] }
const bdBlRound       = { id: 'bdb5', type: 'Força', rounds: 4, exercises: [exStandard] }
const bdBlEstacoes    = {
  id: 'bdb4', type: 'Estações', stationRepeat: 2, restBetweenCycles: '1:00',
  stations: [
    { name: 'Estação 1', duration: '0:45', exercises: [exStandard] },
    { name: 'Descanso', isRest: true, duration: '0:15' },
    { name: 'Estação 2', duration: '0:45', exercises: [exComplex] },
  ],
}

const sdSessNamed   = { id: 'sds1', sessionName: 'Treino A', blocks: [bdBlWodWithAth, bdBlPlain] }
const sdSessUnnamed = { id: 'sds2', blocks: [bdBlPlain] }

// ── Mock fixtures — RankList + results/ components ──
// Athlete-identity colors (rl*.color) are real per-athlete data, not tokens.
const rlFT = [
  { id: 'r1', athleteId: 'a1', name: 'Bruna Medrado',  scale: 'RX',       rpe: 9, perfTime: '08:12', color: '#c84038' },
  { id: 'r2', athleteId: 'a2', name: 'Arthur Souza',   scale: 'RX',       rpe: 8, perfTime: '09:05', color: '#4878d8' },
  { id: 'r3', athleteId: 'a3', name: 'Camila Rocha',   scale: 'Inter',    rpe: 8, perfTime: '10:47', color: '#48b860' },
  { id: 'r4', athleteId: 'a4', name: 'Diego Lima',     scale: 'Inter',    rpe: 7, perfTime: '11:30', color: '#d8a840' },
  { id: 'r5', athleteId: 'a5', name: 'Elisa Prado',    scale: 'SC',       rpe: 6, perfTime: '13:02' },
  { id: 'r6', athleteId: 'a6', name: 'Fábio Neves',    scale: 'Adaptado',        perfTime: '15:20' }, // sem RPE
]
const rlDNF = [
  ...rlFT.slice(0, 3),
  { id: 'r7', athleteId: 'a7', name: 'Gabriel Antunes', scale: 'RX', perfRounds: '4' }, // capped — no time
  { id: 'r8', athleteId: 'a8', name: 'Helena Dias',     scale: 'SC' },                  // nothing logged
]
const rlAmrap = [
  { id: 'r1', athleteId: 'a1', name: 'Bruna Medrado', scale: 'RX',    perfRounds: '9', perfReps: '12' },
  { id: 'r2', athleteId: 'a2', name: 'Arthur Souza',  scale: 'RX',    perfRounds: '9', perfReps: '4' },
  { id: 'r3', athleteId: 'a3', name: 'Camila Rocha',  scale: 'Inter', perfRounds: '8' },
  { id: 'r4', athleteId: 'a4', name: 'Diego Lima',    scale: 'SC',    perfRounds: '6', perfReps: '15' },
]
const rlLong = [
  { id: 'r1', athleteId: 'a1', name: 'Maria Fernanda Albuquerque de Vasconcelos', scale: 'Adaptado', perfTime: '14:58' },
  { id: 'r2', athleteId: 'a2', name: 'João', scale: 'RX', perfTime: '15:02' },
]
const rlMany = [
  ...rlFT,
  { id: 'r9',  athleteId: 'a9',  name: 'Igor Salles',    scale: 'RX',    perfTime: '16:04' },
  { id: 'r10', athleteId: 'a10', name: 'Júlia Moraes',   scale: 'Inter', perfTime: '17:11' },
  { id: 'r11', athleteId: 'a11', name: 'Karla Bastos',   scale: 'SC',    perfTime: '18:40' },
  { id: 'r12', athleteId: 'a12', name: 'Lucas Ferreira', scale: 'RX',    perfTime: '19:25' },
]

const rcSess    = { id: 'rc1', sessionName: 'Treino A · 18h' }
const rcSessDay = { id: 'rc2' } // no name → falls back to the day name
const rcBlFT    = { id: 'rcb1', type: 'For Time', duration: '12', exercises: [exScheme, exDist] }
const rcBlFTCap = { id: 'rcb2', type: 'For Time', rounds: 5, duration: '20', exercises: [exStandard, exCal] } // rounds → DNF field
const rcBlAmrap = { id: 'rcb3', type: 'AMRAP', duration: '20', exercises: [exStandard, exScheme, exDist] }
const rcBlComplex = { id: 'rcb4', type: 'For Time', label: 'Barra', duration: '15', exercises: [exComplex, exProg] } // complexo: sem `name` próprio
const rcBlBare  = { id: 'rcb5', type: 'AMRAP' } // sem meta e sem exercícios → não renderiza nada

const rcInpEmpty = { rpe: null, scale: null, perfTime: '', perfRounds: '', perfReps: '' }
const rcInpDone  = { rpe: 9, scale: 'Inter', perfTime: '11:24', perfRounds: '', perfReps: '' }
const rcInpAmrap = { rpe: 8, scale: 'RX', perfTime: '', perfRounds: '9', perfReps: '12' }

const rcBrFT    = { blockId: 'rcb1', rpe: 8, scale: 'RX', perfTime: '10:32' }
const rcBrDNF   = { blockId: 'rcb2', rpe: 9, scale: 'Inter', perfRounds: '4' }
const rcBrAmrap = { blockId: 'rcb3', rpe: 7, scale: 'SC', perfRounds: '9', perfReps: '12' }

// ── Mock fixtures — leaderboard/ chrome ──
const lbWods = [
  { key: 'w1', label: 'For Time',  sessName: 'Treino A',  dt: 'sex., 10/07', count: 6 },
  { key: 'w2', label: 'MetCon',    sessName: 'Treino B',  dt: 'qui., 09/07', count: 4 },
  { key: 'w3', label: 'Fran',      sessName: '',          dt: 'qua., 08/07', count: 3 },
  { key: 'w4', label: 'Benchmark de Resistência Muscular', sessName: 'Treino de Sábado — Turma da Manhã', dt: 'sáb., 11/07', count: 23 },
]

// The mockup's WOD, as real data: MetCon (red family), 4 rounds, CAP 40'.
const kg = { Masculino_unit: 'kg', Feminino_unit: 'kg' }
const lbBlMetcon = {
  id: 'lbb1', type: 'MetCon', rounds: 4, duration: '40',
  exercises: [
    { id: 'x1', name: 'Wall Ball', reps: '15', intensity: { mode: 'gender', Masculino_RX: '9', Feminino_RX: '6', ...kg } },
    { id: 'x2', name: 'Box Jump',  reps: '12', intensity: { mode: 'gender', Masculino_RX: '24', Feminino_RX: '20', Masculino_unit: '"', Feminino_unit: '"' } },
    { id: 'x3', name: 'Burpee',    reps: '9' },
  ],
}
const lbBlForTime = { id: 'lbb2', type: 'For Time', label: 'Fran', duration: '12', exercises: [exScheme, exDist] }
const lbBlEstacoes = bdBlEstacoes // flattens into one list, like TV
const lbBlBare     = { id: 'lbb4', type: 'AMRAP', duration: '20' } // sem exercícios

// Stateful wrappers: selection, the active pill and the accordion are real
// interactions, so the gallery drives them rather than freezing one visual state.
function ScaleFilterDemo({ initial = 'Todos' }) {
  const [v, setV] = useState(initial)
  return <ScaleFilter value={v} onChange={setV} />
}
function AccordionCardDemo({ initial = false, title = 'Treino A', tag = null }) {
  const [open, setOpen] = useState(initial)
  return (
    <AccordionCard title={title} tag={tag} filled={open} expanded={open} onToggle={() => setOpen(o => !o)}
      meta={<span style={{ color: 'var(--muted)' }}>linha de meta — cada página passa a sua</span>}>
      <div style={{ padding: '10px', color: 'var(--sub)', fontSize: 13 }}>corpo (children) — só monta quando aberto</div>
    </AccordionCard>
  )
}
function WodSelectColDemo() {
  const [sel, setSel] = useState('w2')
  return (
    <div className={s.lbCol}>
      {lbWods.map(w => <WodSelectCard key={w.key} w={w} selected={sel === w.key} onSelect={setSel} />)}
    </div>
  )
}

// The whole mobile leaderboard: week nav → WOD cards → the open one holds the
// scale filter, the WOD, and the ranking. Replaces the <select> picker.
const LB_MOBILE = [
  { w: lbWods[0], bl: lbBlForTime, entries: rlFT,             blType: 'For Time' },
  { w: lbWods[1], bl: lbBlMetcon,  entries: rlAmrap,          blType: 'AMRAP' },
  { w: lbWods[2], bl: lbBlForTime, entries: rlFT.slice(0, 3), blType: 'For Time' },
]
function LbMobileDemo({ initialOpen = 'w2', highlightAthleteId = '' }) {
  const [openKey, setOpenKey] = useState(initialOpen)
  const [scale, setScale]     = useState('Todos')
  return (
    <div className={s.lbMobile}>
      <div className={lb.weekNav}>
        <button type="button" className={lb.weekBtn} aria-label="Semana anterior">‹</button>
        <span className={lb.weekLabel}>5 – 11 Jul, 2026</span>
        <button type="button" className={lb.weekBtn} aria-label="Próxima semana">›</button>
      </div>
      {LB_MOBILE.map(({ w, bl, entries, blType }) => (
        <WodCard key={w.key} w={w} summary={cardSummary(entries, blType, '')}
          expanded={openKey === w.key} onToggle={() => setOpenKey(k => (k === w.key ? '' : w.key))}>
          <div className={lb.cardOpen}>
            <ScaleFilter value={scale} onChange={setScale} />
            <WodBlockCard bl={bl} dt={w.dt} sessName={w.sessName} scaleFilter={scale} />
            <RankList entries={entries} blType={blType} scaleFilter={scale} highlightAthleteId={highlightAthleteId} />
          </div>
        </WodCard>
      ))}
    </div>
  )
}

function Case({ label, children }) {
  return (
    <div className={s.case}>
      <div className={s.caseLbl}>{label}</div>
      <div className={s.caseStage}>{children}</div>
    </div>
  )
}

// Wraps position:fixed components in the transform-containment trick, so
// each Case's fixed panel is isolated to its own box instead of all of them
// stacking at the real viewport edge when several Cases render on one page
// at once. Needed in both Full and MobileFrame's real-iframe mode — the
// iframe fixes @media viewport correctness, not per-Case isolation. `.frameSide`
// is sized wide enough (see Gallery.module.css) that LogPane's hardcoded
// `width:400px` never clips against this box's own width.
function FixedFrame({ variant, children }) {
  return <div className={`${s.frame} ${s[variant]}`}>{children}</div>
}

function Section({ title, sub, children }) {
  return (
    <section className={s.section}>
      <div className={s.sectionHdr}>
        <h2 className={s.sectionTitle}>{title}</h2>
        {sub && <span className={s.sectionSub}>{sub}</span>}
      </div>
      {children}
    </section>
  )
}

// ── Picker groups — one item per component, each rendering its own Section ──
// ── Mock fixtures — me/ components (#52) ──
// The real gym has ~zero logged results (plans/22), so these fixtures are the only
// way to see most of these states at all.
const meAthletes = [
  { id: 'a1', name: 'Bruna Medrado', level: 'Competidor',   color: '#c84038', since: '2025-03-14' },
  { id: 'a2', name: 'Arthur Souza',  level: 'Avançado',     color: '#4878d8', since: '2025-09-01' },
  { id: 'a3', name: 'Camila Rocha',  level: 'Intermediário', color: '#48b860' },
  { id: 'a4', name: 'Maria Fernanda Albuquerque de Vasconcelos', level: 'Iniciante', color: '#d8a840' },
]

const mePd = {
  color: '#c84038', nowY: 2026, nowM: 7,
  hearts: ['full','full','full','full','full','full','full','today','empty','empty','empty','empty'],
  heartTotal: 12, thisMon: 8, totalSess: 143,
  streak: 4, maxStreak: 11, totalPrs: 9, prsThisMon: 2,
  rxRate: 72, rxCount: 13, rxTotal: 18,
  sinceStr: '14 Mar 2025', days: 486,
}
// The "nothing yet" athlete — the state a new member actually lands in.
const mePdEmpty = {
  ...mePd, color: '#48b860',
  hearts: Array(12).fill('empty'), thisMon: 0, totalSess: 0,
  streak: 0, maxStreak: 0, totalPrs: 0, prsThisMon: 0,
  rxRate: null, rxCount: 0, rxTotal: 0, sinceStr: '', days: 0,
}

const meSessRows = [
  { date: '2026-07-11', name: 'WOD + Força',   rpe: 8, scale: 'RX',       hasPr: true },
  { date: '2026-07-09', name: 'Metcon',        rpe: 9, scale: 'Inter',    hasPr: false },
  { date: '2026-07-07', name: 'Sessão com um nome absurdamente longo', rpe: 7, scale: 'SC', hasPr: false },
  { date: '2026-07-05', name: 'Open Gym',      rpe: null, scale: 'Adaptado', hasPr: false },
  { date: '2026-07-03', name: 'Treino',        rpe: 6, scale: null,       hasPr: false },
]

const meEvents = [
  { date: '2026-07-11', title: 'PR — Back Squat', sub: 'Anterior: 95 kg · melhora de +10 kg', val: '105 kg', tone: 'good' },
  { date: '2026-07-04', title: 'Marco — Primeiro Muscle-up', sub: 'Kipping consistente', val: '2/4 marcos', tone: 'good' },
]

const meGoals = [
  { name: 'Primeiro Muscle-up', totalSessions: 10, completedSessions: 6, milestones: [
    { label: 'Kipping no chão', pct: 20, hit: true, hitDate: '2026-06-10' },
    { label: 'Transição na barra', pct: 50, hit: true, hitDate: '2026-07-04' },
    { label: 'Muscle-up completo', pct: 90, hit: false },
  ]},
  { name: 'Meta concluída', totalSessions: 8, completedSessions: 8, milestones: [
    { label: 'Feito', pct: 100, hit: true, hitDate: '2026-05-02' },
  ]},
  { name: 'Objetivo sem marcos', totalSessions: 12, completedSessions: 3, milestones: [] },
]

const meWodRows = [
  { type: 'For Time', pl: 6, ex: 5, pct: 83, color: blkColor({ type: 'For Time' }) },
  { type: 'AMRAP',    pl: 4, ex: 2, pct: 50, color: blkColor({ type: 'AMRAP' }) },
  { type: 'MetCon',   pl: 3, ex: 3, pct: 100, color: blkColor({ type: 'MetCon' }) },
]
const meDistRows = [
  { type: 'Força',  pl: 8, ex: 7, pct: 88, color: blkColor({ type: 'Força' }) },
  { type: 'LPO',    pl: 5, ex: 2, pct: 40, color: blkColor({ type: 'LPO' }) },
  { type: 'Cardio', pl: 4, ex: 0, pct: 0,  color: blkColor({ type: 'Cardio' }) },
]

const meRegistry = {
  'Força': ['Back Squat', 'Deadlift', 'Bench Press', 'Overhead Press'],
  'LPO':   ['Clean and Jerk', 'Snatch'],
  'Skill': ['Muscle-up', 'Handstand Push-up'],
  'For Time': ['Fran'],   // a WOD format — PR_SKIP must drop this whole block
}
const mePrs = [
  { name: 'Back Squat', type: 'load', unit: 'kg', target: 120, categories: ['Força'],
    results: [{ value: '95', date: '2026-05-01' }, { value: '105', date: '2026-07-11' }] },
  { name: 'Deadlift', type: 'load', unit: 'kg', target: 180, categories: ['Força'],
    results: [{ value: '150', date: '2026-06-01' }, { value: '145', date: '2026-07-02' }] },  // regrediu
  { name: 'Bench Press', type: 'load', unit: 'kg', categories: ['Força'],   // sem meta → sem barra
    results: [{ value: '60', date: '2026-06-20' }] },
  { name: 'Clean and Jerk', type: 'load', unit: 'kg', target: 100, categories: ['LPO'],
    results: [{ value: '70', date: '2026-07-01' }] },
]

// The three sheets are position:fixed overlays — they only tell the truth when they
// actually open over the page, so the gallery drives the real components rather than
// rendering a flattened copy of them.
function MeSheetHarness() {
  const [open, setOpen] = useState(null)
  const valRef = useRef(null)
  const [val, setVal] = useState('')
  const [pending, setPending] = useState(null)
  const pr = mePrs[0]
  const delta = val.trim()
    ? (parseFloat(val) > 105 ? { txt: '↑ +' + (parseFloat(val) - 105) + ' kg vs melhor', tone: 'good' }
      : { txt: '↓ abaixo do melhor', tone: 'bad' })
    : { txt: '', tone: 'none' }

  return (
    <div className={s.sheetBtns}>
      <button className={s.demoBtn} onClick={() => { setVal(''); setPending(null); setOpen('pr') }}>Abrir PrLogSheet</button>
      <button className={s.demoBtn} onClick={() => { setVal('90'); setPending({ bestStr: '105 kg' }); setOpen('pr') }}>PrLogSheet · confirmar tentativa</button>
      <button className={s.demoBtn} onClick={() => setOpen('body')}>Abrir BodySheet</button>
      <button className={s.demoBtn} onClick={() => setOpen('clear')}>Abrir ConfirmSheet (destrutivo)</button>

      <PrLogSheet
        open={open === 'pr'} onClose={() => setOpen(null)} valRef={valRef}
        name="Back Squat" cats={['Força']} pr={pr} unit="kg" date="2026-07-12"
        val={val} reps="" goal="120" note="" delta={delta}
        pending={pending} saving={false} saveResult={null} warn=""
        onVal={setVal} onUnit={NOOP} onDate={NOOP} onReps={NOOP} onGoal={NOOP} onNote={NOOP}
        onSave={NOOP} onCancelPending={() => setPending(null)}
      />
      <BodySheet
        open={open === 'body'} onClose={() => setOpen(null)}
        athlete={{ bodyMetrics: [{ date: '2026-06-01', weight: 72, height: 168, bodyFat: 19 }] }}
        weight="" height="" bodyFat="" note="" warn={true}
        onWeight={NOOP} onHeight={NOOP} onBodyFat={NOOP} onNote={NOOP} onSave={NOOP}
      />
      <ConfirmSheet
        open={open === 'clear'} onClose={() => setOpen(null)}
        title="Apagar registros"
        body={'Todos os registros de "Back Squat" serão apagados. Isso não pode ser desfeito.'}
        confirmLabel="APAGAR" onConfirm={NOOP} busy={false} error=""
      />
    </div>
  )
}

// PrSection owns its own open/closed state in me.html — mirror that here so the
// gallery can actually exercise the two disclosure levels and their keyboard path.
function PrSectionDemo(props) {
  const [openBlock, setOpenBlock] = useState('Força')
  const [openEx, setOpenEx] = useState('Força:Back Squat')
  return (
    <PrSection
      registry={meRegistry} prs={mePrs}
      openBlock={openBlock} setOpenBlock={b => { setOpenBlock(b); setOpenEx(null) }}
      openEx={openEx} setOpenEx={setOpenEx}
      onOpen={NOOP} onClear={NOOP}
      {...props}
    />
  )
}

function AthletePickerDemo({ variant, athletes }) {
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(variant === 'rail' ? athletes[0] : null)
  return (
    <AthletePicker variant={variant} athletes={athletes} selected={sel}
      query={query} onQuery={setQuery} onSelect={setSel} onClear={() => setSel(null)} />
  )
}

// Exported for scripts/design-cards-entry.jsx: `npm run design:cards` SSRs these same
// items into the Claude Design cards, so the cards cannot drift from the gallery.
export const GROUPS = [
  {
    group: 'Shared',
    items: [
      {
        id: 'tallybar',
        label: 'TallyBar',
        render: () => (
          <Section title="TallyBar" sub="src/public/shared/TallyBar.jsx — a única barra do app (mockup 24). Lê em dezenas: 10 blocos de 10%, e o bloco onde o valor cai se divide em 10 unidades. Sempre 10 blocos, qualquer que seja o denominador — quem chama converte o seu '5 / 6' em % e mantém os números literais ao lado. Substituiu o SegBar (trilho contínuo + grid de 1%).">
            <Case label="0 · 35 · 72 · 100%">
              <div style={{ display: 'grid', gap: 10 }}>
                <TallyBar pct={0} /><TallyBar pct={35} /><TallyBar pct={72} /><TallyBar pct={100} />
              </div>
            </Case>
            <Case label="Bloco parcial · 60 (redondo, sem parcial) · 76 (7 + 6/10) · 87,5 (8 + 8/10) · 100 (dez blocos cheios)">
              <div style={{ display: 'grid', gap: 10 }}>
                <TallyBar pct={60} size="lg" /><TallyBar pct={76} size="lg" />
                <TallyBar pct={87.5} size="lg" /><TallyBar pct={100} size="lg" />
              </div>
            </Case>
            <Case label="Valores pequenos · 1 · 4 · 5 · 9% (só o bloco parcial acende)">
              <div style={{ display: 'grid', gap: 10 }}>
                <TallyBar pct={1} size="lg" /><TallyBar pct={4} size="lg" />
                <TallyBar pct={5} size="lg" /><TallyBar pct={9} size="lg" />
              </div>
            </Case>
            <Case label="Tamanhos · sm (mini-bar e detalhe de PR) / md (BarList) / lg (meta, stats)">
              <div style={{ display: 'grid', gap: 10 }}>
                <TallyBar pct={76} size="sm" /><TallyBar pct={76} size="md" /><TallyBar pct={76} size="lg" />
              </div>
            </Case>
            <Case label="Cores de dados (famílias de bloco, não tokens)">
              <div style={{ display: 'grid', gap: 10 }}>
                <TallyBar pct={83} color={AMBER} /><TallyBar pct={88} color={BLUE} />
                <TallyBar pct={45} color={RED} /><TallyBar pct={30} color={GREEN} />
              </div>
            </Case>
            <Case label="Marcos como na GoalList (a configuração real · lg + ticks)">
              <TallyBar pct={55} size="lg" ticks={[{ pct: 20, state: 'hit' }, { pct: 50, state: 'hit' }, { pct: 75, state: 'next' }, { pct: 95, state: 'future' }]} />
            </Case>
            <Case label="Marcos nos extremos (0% e 100% não podem ser cortados ao meio)">
              <TallyBar pct={100} size="lg" ticks={[{ pct: 0, state: 'hit' }, { pct: 100, state: 'hit' }]} />
            </Case>
            <Case label="Fora da faixa (−20 e 140 são fixados em 0/100)">
              <div style={{ display: 'grid', gap: 10 }}>
                <TallyBar pct={-20} size="lg" /><TallyBar pct={140} size="lg" />
              </div>
            </Case>
            <Case label="Denominador grande — o motivo das dezenas: 12/20 · 30/45 · 70/100 nunca viram sopa">
              <div style={{ display: 'grid', gap: 10 }}>
                <TallyBar pct={60} color={BLUE} /><TallyBar pct={66.7} color={BLUE} /><TallyBar pct={70} color={BLUE} />
              </div>
            </Case>
          </Section>
        ),
      },
      {
        id: 'exerciselist',
        label: 'ExerciseList',
        render: () => (
          <Section title="ExerciseList" sub="src/public/shared/ExerciseList.jsx — read-only, compartilhado (TV + schedule)">
            <Case label="Matriz completa · compact"><ExerciseList exercises={FULL_LIST} color={AMBER} /></Case>
            <Case label="Padrão · pct"><ExerciseList exercises={[exStandard]} color={BLUE} /></Case>
            <Case label="Esquema 21-15-9 · gender"><ExerciseList exercises={[exScheme]} color={RED} /></Case>
            <Case label="Progressão"><ExerciseList exercises={[exProg]} color={BLUE} /></Case>
            <Case label="Progressão · reps só em steps"><ExerciseList exercises={[exProgStepsOnly]} color={BLUE} /></Case>
            <Case label="Complexo"><ExerciseList exercises={[exComplex]} color={BLUE} /></Case>
            <Case label="Distância m / cal + cardio legado"><ExerciseList exercises={[exDist, exCal, exCardio]} color={GREEN} /></Case>
            <Case label="Nome longo (overflow)"><ExerciseList exercises={[exLong]} color={AMBER} /></Case>
            <Case label="Só nota (sem volume)"><ExerciseList exercises={[exNoteOnly]} color={GREEN} /></Case>
            <Case label="Vazio"><ExerciseList exercises={[]} color={AMBER} /></Case>
            <Case label="size='large' (TV)"><ExerciseList exercises={[exStandard, exComplex, exProgStepsOnly]} color={AMBER} size="large" /></Case>
          </Section>
        ),
      },
      {
        id: 'ranklist',
        label: 'RankList',
        render: () => (
          <Section title="RankList" sub="src/public/shared/RankList.jsx — ranking compartilhado (leaderboard + painéis do results). Pódio via --podium-1/2/3; cores de escala são data-colors (SCALE_COL).">
            <Case label="Pódio + demais · For Time"><RankList entries={rlFT} blType="For Time" /></Case>
            <Case label="Atleta em destaque (você é o 3º)"><RankList entries={rlFT} blType="For Time" highlightAthleteId="a3" /></Case>
            <Case label="Filtro de escala · RX"><RankList entries={rlFT} blType="For Time" scaleFilter="RX" /></Case>
            <Case label="Filtro de escala · Adaptado (1 resultado)"><RankList entries={rlFT} blType="For Time" scaleFilter="Adaptado" /></Case>
            <Case label="AMRAP (rounds + reps, desempate por reps)"><RankList entries={rlAmrap} blType="AMRAP" /></Case>
            <Case label="DNF · capped (4 rds) e sem resultado ordenam por último"><RankList entries={rlDNF} blType="For Time" /></Case>
            <Case label="Nome longo (overflow)"><RankList entries={rlLong} blType="For Time" /></Case>
            <Case label="Muitos (zebra além do pódio)"><RankList entries={rlMany} blType="For Time" /></Case>
            <Case label="Um só (pódio de 1)"><RankList entries={rlFT.slice(0, 1)} blType="For Time" /></Case>
            <Case label="Vazio"><RankList entries={[]} blType="For Time" /></Case>
            <Case label="Sem pódio (podium=false)"><RankList entries={rlFT} blType="For Time" podium={false} /></Case>
            <Case label="size='large' + dots do atleta (página leaderboard)">
              <RankList entries={rlFT} blType="For Time" size="large" showDots highlightAthleteId="a2" />
            </Case>
          </Section>
        ),
      },
      {
        id: 'wodblockcard',
        label: 'WodBlockCard',
        render: () => (
          <Section title="WodBlockCard" sub="src/public/shared/WodBlockCard.jsx — o WOD acima de um ranking, com a mesma forma do BlockCard da TV (régua lateral da família + selo do tipo, depois a ExerciseList compartilhada). Absorve o antigo cabeçalho do leaderboard: o selo é o rótulo, as fichas são rounds/CAP, e o rodapé leva data · sessão · escala ativa.">
            <Case label="MetCon (família vermelha) · 4 rounds · CAP 40'">
              <WodBlockCard bl={lbBlMetcon} dt="qui., 25/06" sessName="Treino B" />
            </Case>
            <Case label="Com filtro de escala ativo (entra no rodapé)">
              <WodBlockCard bl={lbBlMetcon} dt="qui., 25/06" sessName="Treino B" scaleFilter="RX" />
            </Case>
            <Case label="For Time (família âmbar) · só CAP, sem rounds">
              <WodBlockCard bl={lbBlForTime} dt="qua., 08/07" sessName="Treino A" />
            </Case>
            <Case label="Estações — achatado numa lista só, como na TV">
              <WodBlockCard bl={lbBlEstacoes} dt="ter., 07/07" sessName="Treino C" />
            </Case>
            <Case label="Sem exercícios (só selo + fichas + rodapé)">
              <WodBlockCard bl={lbBlBare} dt="seg., 06/07" sessName="Treino D" />
            </Case>
            <Case label="size='large' (coluna de ranking do desktop)">
              <WodBlockCard bl={lbBlMetcon} dt="qui., 25/06" sessName="Treino B" size="large" />
            </Case>
          </Section>
        ),
      },
      {
        id: 'accordioncard',
        label: 'AccordionCard',
        render: () => (
          <Section title="AccordionCard" sub="src/public/shared/AccordionCard.jsx — a casca de expansão por trás do SessionCard (results) e do WodCard (leaderboard). Os cabeçalhos levam dados diferentes, mas a interação é uma só: um contrato de teclado, um aria-expanded, um chevron. Tab + Enter/Espaço.">
            <Case label="Colapsado">
              <AccordionCardDemo />
            </Case>
            <Case label="Expandido (com tag)">
              <AccordionCardDemo initial tag="AMRAP" />
            </Case>
            <Case label="Título + tag longos (ambos truncam)">
              <AccordionCardDemo title="Treino de Sábado — Turma da Manhã" tag="Benchmark de Resistência Muscular" />
            </Case>
          </Section>
        ),
      },
      {
        id: 'nav',
        label: 'Nav',
        render: () => (
          <Section title="Nav" sub="src/public/Nav.jsx — chrome fixo; a forma muda por viewport (barra ≤767 / sidebar ≥768). Redimensione o navegador para ver a sidebar.">
            <Case label="active='schedule' — contido num quadro (fixed→relativo via transform)">
              <div className={s.navFrame}><Nav active="schedule" gymName="Team Medrado" /></div>
            </Case>
          </Section>
        ),
      },
    ],
  },
  {
    group: 'Results',
    items: [
      {
        id: 'sessioncard',
        label: 'SessionCard',
        render: () => (
          <Section title="SessionCard" sub="src/public/results/SessionCard.jsx — cartão de sessão (mobile). O cabeçalho colapsado agora responde às 3 perguntas que se abre o cartão para fazer: quantos registraram, quem lidera, e como você está.">
            <Case label="Com resultados · você já registrou">
              <SessionCard sess={rcSess} dk="2026-07-12" isExpanded={false} onToggle={NOOP} hasAthlete
                summary={cardSummary(rlFT, 'For Time', 'a3')} />
            </Case>
            <Case label="Com resultados · você ainda não registrou (CTA)">
              <SessionCard sess={rcSess} dk="2026-07-12" isExpanded={false} onToggle={NOOP} hasAthlete
                summary={cardSummary(rlFT, 'For Time', 'a99')} />
            </Case>
            <Case label="Com resultados · nenhum atleta selecionado (sem coluna 'Você')">
              <SessionCard sess={rcSess} dk="2026-07-12" isExpanded={false} onToggle={NOOP}
                summary={cardSummary(rlFT, 'For Time', '')} />
            </Case>
            <Case label="Zero resultados · loggável">
              <SessionCard sess={rcSess} dk="2026-07-12" isExpanded={false} onToggle={NOOP} hasAthlete
                summary={cardSummary([], 'For Time', 'a1')} />
            </Case>
            <Case label="Sem nome de sessão → cai para o nome do dia">
              <SessionCard sess={rcSessDay} dk="2026-07-12" isExpanded={false} onToggle={NOOP} hasAthlete
                summary={cardSummary(rlAmrap, 'AMRAP', 'a2')} />
            </Case>
            <Case label="Líder com nome longo (overflow)">
              <SessionCard sess={rcSess} dk="2026-07-12" isExpanded={false} onToggle={NOOP} hasAthlete
                summary={cardSummary(rlLong, 'For Time', 'a2')} />
            </Case>
            <Case label="Expandido · você já registrou (WOD + KPIs + resultado)">
              <SessionCard sess={rcSess} dk="2026-07-12" isExpanded onToggle={NOOP} hasAthlete
                summary={cardSummary(rlFT, 'For Time', 'a3')}>
                <div className={s.rcBody}>
                  <WodSummary bl={rcBlFT} showTitle />
                  <KpiGrid kpis={calcKpis(rlFT, 'For Time')} btype="For Time" />
                  <LoggedResult br={rcBrFT} btype="For Time" onEdit={NOOP} />
                </div>
              </SessionCard>
            </Case>
            <Case label="Expandido · você ainda não registrou (WOD + formulário)">
              <SessionCard sess={rcSess} dk="2026-07-12" isExpanded onToggle={NOOP} hasAthlete
                summary={cardSummary(rlFT, 'For Time', 'a99')}>
                <div className={s.rcBody}>
                  <WodSummary bl={rcBlFTCap} showTitle />
                  <LogForm bl={rcBlFTCap} inp={rcInpEmpty} isSubmitting={false} onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} />
                </div>
              </SessionCard>
            </Case>
          </Section>
        ),
      },
      {
        id: 'wodsummary',
        label: 'WodSummary',
        render: () => (
          <Section title="WodSummary" sub="src/public/results/WodSummary.jsx — o WOD em si (meta + exercícios), o que o atleta lê enquanto registra. compact = cartão mobile; extended = painel desktop.">
            <Case label="compact · For Time (CAP + esquema 21-15-9 + distância)"><WodSummary bl={rcBlFT} /></Case>
            <Case label="compact · com título do bloco"><WodSummary bl={rcBlFT} showTitle /></Case>
            <Case label="compact · rounds + CAP"><WodSummary bl={rcBlFTCap} /></Case>
            <Case label="compact · complexo (sem nome próprio — os movimentos carregam)"><WodSummary bl={rcBlComplex} showTitle /></Case>
            <Case label="compact · sem meta e sem exercícios → não renderiza nada"><WodSummary bl={rcBlBare} /></Case>
            <Case label="extended · For Time"><WodSummary bl={rcBlFT} variant="extended" /></Case>
            <Case label="extended · com título do bloco"><WodSummary bl={rcBlFT} variant="extended" showTitle /></Case>
            <Case label="extended · rounds + CAP"><WodSummary bl={rcBlFTCap} variant="extended" /></Case>
            <Case label="extended · complexo"><WodSummary bl={rcBlComplex} variant="extended" showTitle /></Case>
            <Case label="extended · AMRAP (3 exercícios)"><WodSummary bl={rcBlAmrap} variant="extended" /></Case>
          </Section>
        ),
      },
      {
        id: 'kpigrid',
        label: 'KpiGrid',
        render: () => (
          <Section title="KpiGrid" sub="src/public/results/KpiGrid.jsx — uma grade, duas densidades (compact = cartão mobile; extended = painel desktop, com a divisão por escala). Mostrado sob o WOD, como aparece na página.">
            <Case label="compact · For Time (sob o WOD)">
              <div className={s.rcBody}><WodSummary bl={rcBlFT} showTitle /><KpiGrid kpis={calcKpis(rlFT, 'For Time')} btype="For Time" /></div>
            </Case>
            <Case label="compact · AMRAP (sob o WOD)">
              <div className={s.rcBody}><WodSummary bl={rcBlAmrap} showTitle /><KpiGrid kpis={calcKpis(rlAmrap, 'AMRAP')} btype="AMRAP" /></div>
            </Case>
            <Case label="compact · zero resultados">
              <div className={s.rcBody}><WodSummary bl={rcBlFT} showTitle /><KpiGrid kpis={calcKpis([], 'For Time')} btype="For Time" /></div>
            </Case>
            <Case label="extended · For Time (sob o WOD)">
              <div className={s.rcBody}><WodSummary bl={rcBlFT} variant="extended" showTitle /><KpiGrid kpis={calcKpis(rlFT, 'For Time', 'extended')} btype="For Time" variant="extended" /></div>
            </Case>
            <Case label="extended · AMRAP (sob o WOD)">
              <div className={s.rcBody}><WodSummary bl={rcBlAmrap} variant="extended" showTitle /><KpiGrid kpis={calcKpis(rlAmrap, 'AMRAP', 'extended')} btype="AMRAP" variant="extended" /></div>
            </Case>
            <Case label="extended · zero resultados">
              <div className={s.rcBody}><WodSummary bl={rcBlFT} variant="extended" showTitle /><KpiGrid kpis={calcKpis([], 'For Time', 'extended')} btype="For Time" variant="extended" /></div>
            </Case>
          </Section>
        ),
      },
      {
        id: 'loggedresult',
        label: 'LoggedResult',
        render: () => (
          <Section title="LoggedResult" sub="src/public/results/LoggedResult.jsx — resultado já registrado. O botão Editar é a autocorreção (#51, decisão 2): o caminho de submit já mesclava certo, era só este bloqueio visual que tornava o resultado final.">
            <Case label="For Time · com Editar"><LoggedResult br={rcBrFT} btype="For Time" onEdit={NOOP} /></Case>
            <Case label="For Time · somente leitura (sem onEdit)"><LoggedResult br={rcBrFT} btype="For Time" /></Case>
            <Case label="For Time · DNF (capped em 4 rds)"><LoggedResult br={rcBrDNF} btype="For Time" onEdit={NOOP} /></Case>
            <Case label="AMRAP"><LoggedResult br={rcBrAmrap} btype="AMRAP" onEdit={NOOP} /></Case>
            <Case label="Sem escala / sem RPE (dados antigos)"><LoggedResult br={{ blockId: 'x' }} btype="For Time" onEdit={NOOP} /></Case>
          </Section>
        ),
      },
      {
        id: 'logform',
        label: 'LogForm',
        render: () => (
          <Section title="LogForm" sub="src/public/results/LogForm.jsx — formulário de registro/edição de um bloco (mesmos campos, mesma etapa de confirmação; muda só a afordância). Mostrado sob o WOD, como aparece na página.">
            <Case label="Criar · For Time (mobile — WOD compact)">
              <div className={s.rcBody}><WodSummary bl={rcBlFT} showTitle /><LogForm bl={rcBlFT} inp={rcInpEmpty} isSubmitting={false} onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} /></div>
            </Case>
            <Case label="Criar · For Time (desktop — WOD extended)">
              <div className={s.rcBody}><WodSummary bl={rcBlFT} variant="extended" showTitle /><LogForm bl={rcBlFT} inp={rcInpEmpty} isSubmitting={false} onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} /></div>
            </Case>
            <Case label="Criar · For Time com CAP (campo de rounds DNF)">
              <div className={s.rcBody}><WodSummary bl={rcBlFTCap} showTitle /><LogForm bl={rcBlFTCap} inp={rcInpEmpty} isSubmitting={false} onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} /></div>
            </Case>
            <Case label="Criar · AMRAP (rounds + reps)">
              <div className={s.rcBody}><WodSummary bl={rcBlAmrap} showTitle /><LogForm bl={rcBlAmrap} inp={rcInpAmrap} isSubmitting={false} onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} /></div>
            </Case>
            <Case label="Editar · preenchido + Cancelar">
              <div className={s.rcBody}><WodSummary bl={rcBlFT} showTitle /><LogForm bl={rcBlFT} inp={rcInpDone} isSubmitting={false} mode="edit" onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} onCancel={NOOP} /></div>
            </Case>
            <Case label="Enviando">
              <div className={s.rcBody}><WodSummary bl={rcBlFT} showTitle /><LogForm bl={rcBlFT} inp={rcInpDone} isSubmitting onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} /></div>
            </Case>
          </Section>
        ),
      },
    ],
  },
  {
    group: 'Leaderboard',
    items: [
      {
        id: 'wodcard',
        label: 'WodCard (mobile)',
        render: () => (
          <Section title="WodCard + a leaderboard mobile inteira" sub="src/public/leaderboard/WodCard.jsx — o <select> de WOD foi aposentado: a semana vira uma lista de cartões e o ranking mora dentro do que você abre. Mesmo gesto do SessionCard (ambos rodam sobre AccordionCard). Clique nos cartões; o filtro de escala é escopado ao WOD aberto. O ranking vira duas linhas sozinho — é uma container query, então ele reage à largura do cartão, não à da janela.">
            <Case label="Lista completa · interativa (abra/feche, filtre, veja o ranking dentro)">
              <LbMobileDemo />
            </Case>
            <Case label="Com o atleta em destaque (você é o 3º)">
              <LbMobileDemo initialOpen="w1" highlightAthleteId="a3" />
            </Case>
            <Case label="Tudo colapsado — a semana legível sem abrir nada (data · atletas · líder)">
              <LbMobileDemo initialOpen="" />
            </Case>
          </Section>
        ),
      },
      {
        id: 'scalefilter',
        label: 'ScaleFilter',
        render: () => (
          <Section title="ScaleFilter" sub="src/public/shared/ScaleFilter.jsx — pílulas de escala. Renderizadas duas vezes na página (barra mobile + coluna desktop), o que é justamente por que as duas cópias divergiram. Clique para ver o estado ativo; Tab para o foco.">
            <Case label="Interativo · 'Todos' inicial"><ScaleFilterDemo /></Case>
            <Case label="Interativo · 'RX' inicial"><ScaleFilterDemo initial="RX" /></Case>
            <Case label="Interativo · 'Adaptado' inicial (pílula mais larga)"><ScaleFilterDemo initial="Adaptado" /></Case>
          </Section>
        ),
      },
      {
        id: 'wodselectcard',
        label: 'WodSelectCard',
        render: () => (
          <Section title="WodSelectCard" sub="src/public/leaderboard/WodSelectCard.jsx — um WOD na coluna seletora do desktop. Agora alcançável pelo teclado (#14): era um <div> só de clique, e como nada renderiza até escolher um WOD, quem usa teclado via a página permanentemente vazia. Tab + Enter/Espaço para selecionar.">
            <Case label="Coluna interativa (selecionado = 'Treino B'; Tab/Enter funciona)">
              <WodSelectColDemo />
            </Case>
            <Case label="Não selecionado">
              <div className={s.lbCol}><WodSelectCard w={lbWods[0]} selected={false} onSelect={NOOP} /></div>
            </Case>
            <Case label="Selecionado">
              <div className={s.lbCol}><WodSelectCard w={lbWods[0]} selected onSelect={NOOP} /></div>
            </Case>
            <Case label="Sem nome de sessão → cai para o rótulo do bloco">
              <div className={s.lbCol}><WodSelectCard w={lbWods[2]} selected={false} onSelect={NOOP} /></div>
            </Case>
            <Case label="Nome longo (overflow) + muitos atletas">
              <div className={s.lbCol}><WodSelectCard w={lbWods[3]} selected={false} onSelect={NOOP} /></div>
            </Case>
          </Section>
        ),
      },
    ],
  },
  {
    group: 'Me',
    items: [
      {
        id: 'herocard',
        label: 'HeroCard',
        render: () => (
          <Section title="HeroCard" sub="src/public/me/HeroCard.jsx — identidade + corações do mês. O acesso ao Corpo era o próprio avatar: um <div onClick> sem rótulo, sem foco, sem nada além de cursor:pointer. Agora é um botão nomeado (#52).">
            <Case label="Perfil completo (8 de 12 sessões, hoje já treinou)">
              <HeroCard athlete={meAthletes[0]} pd={mePd} onOpenBody={NOOP} onSwitch={NOOP} />
            </Case>
            <Case label="Atleta nova — nada registrado ainda (o estado real de quase todo mundo hoje)">
              <HeroCard athlete={meAthletes[2]} pd={mePdEmpty} onOpenBody={NOOP} onSwitch={NOOP} />
            </Case>
            <Case label="Nome longo (overflow) · sem nível · sem 'desde'">
              <HeroCard athlete={{ ...meAthletes[3], level: null }} pd={{ ...mePdEmpty, sinceStr: '' }} onOpenBody={NOOP} onSwitch={NOOP} />
            </Case>
          </Section>
        ),
      },
      {
        id: 'kpistrip',
        label: 'KpiStrip',
        render: () => (
          <Section title="KpiStrip" sub="src/public/me/KpiStrip.jsx — os quatro números do topo. 'Streak' era a última string em inglês da página; virou 'Sequência' (#52). RPE fica RPE — é o que se fala no box.">
            <Case label="Com sequência ativa e Taxa RX em alta"><KpiStrip pd={mePd} /></Case>
            <Case label="Sem sequência · Taxa RX sem dados (— e não 0%)"><KpiStrip pd={mePdEmpty} /></Case>
            <Case label="Recorde de sequência maior que a atual"><KpiStrip pd={{ ...mePd, streak: 2, maxStreak: 11 }} /></Case>
            <Case label="Taxa RX com denominador fino (mostra o que contou)"><KpiStrip pd={{ ...mePd, rxRate: 50, rxCount: 1, rxTotal: 2 }} /></Case>
          </Section>
        ),
      },
      {
        id: 'athletepicker',
        label: 'AthletePicker',
        render: () => (
          <Section title="AthletePicker" sub="src/public/me/AthletePicker.jsx — um componente, dois layouts: a tela de primeira visita (mobile) e a trilha lateral (desktop). Desde o #52 a escolha é lembrada (cone_athlete_filter, a mesma chave de results/schedule), então o picker voltou a ser o que sempre se chamou: primeira visita.">
            <Case label="Picker · lista completa"><AthletePickerDemo variant="picker" athletes={meAthletes} /></Case>
            <Case label="Picker · um atleta só"><AthletePickerDemo variant="picker" athletes={meAthletes.slice(0, 1)} /></Case>
            <Case label="Picker · vazio (nenhum atleta cadastrado)"><AthletePickerDemo variant="picker" athletes={[]} /></Case>
            <Case label="Trilha (desktop) · com selecionado + níveis">
              <div style={{ display: 'flex', height: 320 }}><AthletePickerDemo variant="rail" athletes={meAthletes} /></div>
            </Case>
          </Section>
        ),
      },
      {
        id: 'sessionlist',
        label: 'SessionList',
        render: () => (
          <Section title="SessionList" sub="src/public/me/SessionList.jsx — últimas 5 sessões. A escala agora usa o SCALE_COL canônico (#51): o me.html pintava SC de laranja e Inter de azul, enquanto results/leaderboard pintavam Inter de laranja e SC de roxo — o mesmo resultado, cor diferente conforme a página.">
            <Case label="Cinco sessões (todas as escalas · PR · sem RPE · sem escala · nome longo)">
              <SessionList rows={meSessRows} />
            </Case>
            <Case label="Vazio"><SessionList rows={[]} /></Case>
          </Section>
        ),
      },
      {
        id: 'eventlist',
        label: 'EventList',
        render: () => (
          <Section title="EventList" sub="src/public/me/EventList.jsx — os últimos acontecimentos bons (PRs batidos, marcos atingidos).">
            <Case label="PR + marco"><EventList events={meEvents} /></Case>
            <Case label="Vazio"><EventList events={[]} /></Case>
          </Section>
        ),
      },
      {
        id: 'goallist',
        label: 'GoalList',
        render: () => (
          <Section title="GoalList" sub="src/public/me/GoalList.jsx — metas com marcos, sobre o TallyBar compartilhado. Clique na barra para abrir os marcos.">
            <Case label="Em progresso · concluída (100%) · sem marcos">
              <GoalList goals={meGoals} totalMarcosHit={3} />
            </Case>
            <Case label="Uma meta, nenhum marco atingido">
              <GoalList goals={[meGoals[0]]} totalMarcosHit={0} />
            </Case>
          </Section>
        ),
      },
      {
        id: 'barlist',
        label: 'BarList',
        render: () => (
          <Section title="BarList" sub="src/public/me/BarList.jsx — executados/planejados por tipo de bloco. As cores vêm do blkColor() canônico, não do mapa ECOL de 13 cores que só existia nesta página. Linhas da mesma família dividirem a cor é o ponto: a cor diz 'isto é força' / 'isto é WOD', e o rótulo já diz qual.">
            <Case label="WODs (mês) — famílias vermelha + âmbar">
              <BarList title="WODs" sub="Jul 2026 · executados/planejados" rows={meWodRows} />
            </Case>
            <Case label="Distribuição (90 dias) — inclui uma linha em 0%">
              <BarList title="Distribuição" sub="Últimos 90 dias · executados/planejados" rows={meDistRows} />
            </Case>
          </Section>
        ),
      },
      {
        id: 'prsection',
        label: 'PrSection',
        render: () => (
          <Section title="PrSection" sub="src/public/me/PrSection.jsx — o quadro de PRs: bloco → exercício → detalhe. NÃO usa o AccordionCard (ver comentário no arquivo): estas são linhas densas dentro de um card, e a linha de exercício hospeda os próprios botões de ação, que não podem aninhar dentro de um header role='button'. O que ele adota é o contrato de interação — role/tabIndex/aria-expanded + onKey. Antes do #52 os dois níveis eram divs só de clique, sem caminho de teclado.">
            <Case label="Força aberto · Back Squat expandido (com meta, delta positivo)">
              <PrSectionDemo />
            </Case>
            <Case label="Sem nenhum PR (todo o quadro por preencher)">
              <PrSection registry={meRegistry} prs={[]} openBlock="Força" setOpenBlock={NOOP} openEx={null} setOpenEx={NOOP} onOpen={NOOP} onClear={NOOP} />
            </Case>
            <Case label="Registro vazio → não renderiza nada">
              <PrSection registry={{}} prs={mePrs} openBlock={null} setOpenBlock={NOOP} openEx={null} setOpenEx={NOOP} onOpen={NOOP} onClear={NOOP} />
            </Case>
          </Section>
        ),
      },
      {
        id: 'mesheets',
        label: 'Sheets (PR · Corpo · Confirmar)',
        render: () => (
          <Section title="Sheets" sub="src/public/me/{PrLogSheet,BodySheet,ConfirmSheet}.jsx sobre src/public/me/Sheet.jsx — o shell compartilhado. Antes do #52 nenhum dos dois era um diálogo de verdade: sem role, sem Esc, sem foco — e, como os dois ficavam montados o tempo todo no mesmo z-index, podiam abrir juntos e os campos de um sheet FECHADO continuavam alcançáveis por Tab. O ConfirmSheet substitui o window.confirm()/alert() nativo. São overlays position:fixed, então abrem sobre a página — é a única forma de vê-los dizendo a verdade.">
            <Case label="Abrir cada sheet (Esc fecha · Tab fica preso dentro)">
              <MeSheetHarness />
            </Case>
          </Section>
        ),
      },
    ],
  },
  {
    group: 'Schedule',
    items: [
      {
        id: 'rdcounter',
        label: 'RdCounter',
        render: () => (
          <Section title="RdCounter" sub="src/public/schedule/RdCounter.jsx — contador de rodadas (toque = avança, toque longo / botão direito = reset)">
            <Case label="Idle"><RdCounter blId="b1" exId="e1" total={3} cur={0} onAdvance={NOOP} onReset={NOOP} /></Case>
            <Case label="Active"><RdCounter blId="b1" exId="e1" total={3} cur={1} onAdvance={NOOP} onReset={NOOP} /></Case>
            <Case label="Done"><RdCounter blId="b1" exId="e1" total={3} cur={3} onAdvance={NOOP} onReset={NOOP} /></Case>
          </Section>
        ),
      },
      {
        id: 'demopanel',
        label: 'DemoPanel',
        render: () => (
          <Section title="DemoPanel" sub="src/public/schedule/DemoPanel.jsx — overlay de vídeo/descrição (position: fixed — contido num quadro abaixo via transform em Full; viewport real do MobileFrame em 390)">
            <Case label="Conteúdo completo (vídeo + descrição + músculos + notas)">
              <FixedFrame variant="frameBottom"><DemoPanel target={[{ name: 'Thruster' }]} demoMap={demoMapFull} onClose={NOOP} /></FixedFrame>
            </Case>
            <Case label="Somente texto (sem vídeo)">
              <FixedFrame variant="frameBottom"><DemoPanel target={[{ name: 'Wall Ball' }]} demoMap={demoMapTextOnly} onClose={NOOP} /></FixedFrame>
            </Case>
            <Case label="Sem conteúdo disponível">
              <FixedFrame variant="frameBottom"><DemoPanel target={[{ name: 'Burpee' }]} demoMap={demoMapEmpty} onClose={NOOP} /></FixedFrame>
            </Case>
            <Case label="Complexo (múltiplos movimentos, conteúdo misto)">
              <FixedFrame variant="frameBottom"><DemoPanel target={[{ name: 'Clean Pull' }, { name: 'Power Clean' }]} demoMap={demoMapComplex} onClose={NOOP} /></FixedFrame>
            </Case>
          </Section>
        ),
      },
      {
        id: 'exrow',
        label: 'ExRow',
        render: () => (
          <Section title="ExRow" sub="src/public/schedule/ExRow.jsx — linha de exercício interativa (checkbox/contador, chip de RM, Demo)">
            <Case label="Padrão · pct">
              <ExRow ex={exStandard} bl={schedBlPlain} isWod={false} isRd={false}
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} />
            </Case>
            <Case label="Concluído (checked)">
              <ExRow ex={exStandard} bl={schedBlPlain} isWod={false} isRd={false}
                checked={new Set([`${schedBlPlain.id}|${exStandard.id}`])} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} />
            </Case>
            <Case label="Progressão (sem RM definido)">
              <ExRow ex={exProg} bl={schedBlPlain} isWod={false} isRd={false}
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} />
            </Case>
            <Case label="Progressão (RM definido · calculado)">
              <ExRow ex={exProg} bl={schedBlPlain} isWod={false} isRd={false}
                checked={new Set()} roundState={{}} rmValues={{ [exProg.id]: { rm: 100, unit: 'kg', source: 'manual' } }} rmEditKey={null} demoMap={{}}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} />
            </Case>
            <Case label="Progressão (editando RM)">
              <ExRow ex={exProg} bl={schedBlPlain} isWod={false} isRd={false}
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={exProg.id} demoMap={{}}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} />
            </Case>
            <Case label="Complexo (% RM, sem RM definido)">
              <ExRow ex={exComplex} bl={schedBlPlain} isWod={false} isRd={false}
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} />
            </Case>
            <Case label="Complexo (% RM, RM definido · calculado)">
              <ExRow ex={exComplex} bl={schedBlPlain} isWod={false} isRd={false}
                checked={new Set()} roundState={{}} rmValues={{ [exComplex.id]: { rm: 100, unit: 'kg', source: 'manual' } }} rmEditKey={null} demoMap={{}}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} />
            </Case>
            <Case label="Em bloco de rodadas (RdCounter no lugar do checkbox)">
              <ExRow ex={exStandard} bl={schedBlRound} isWod={false} isRd={true}
                checked={new Set()} roundState={{ [`${schedBlRound.id}|${exStandard.id}`]: 2 }} rmValues={{}} rmEditKey={null} demoMap={{}}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} />
            </Case>
            <Case label="Em bloco WOD (sem checkbox/contador)">
              <ExRow ex={exStandard} bl={schedBlPlain} isWod={true} isRd={false}
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} />
            </Case>
          </Section>
        ),
      },
      {
        id: 'blockdetail',
        label: 'BlockDetail',
        render: () => (
          <Section title="BlockDetail" sub="src/public/schedule/BlockDetail.jsx — cartão de bloco (2 colunas; só blocos WOD ganham Timer/Leaderboard/registro — rodadas não-WOD são só check-off)">
            <Case label="WOD com atleta selecionado (resultado registrado)">
              <BlockDetail bl={bdBlWodWithAth} sess={bdSess} dateKey="2026-07-11"
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                isWodLogged={() => true}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} onTimer={NOOP}
                onLogBlock={NOOP} athResult={{ scale: 'RX', rpe: 7, perfTime: '12:34' }} athName="Bruna" />
            </Case>
            <Case label="WOD sem atleta selecionado (idle hint)">
              <BlockDetail bl={bdBlWodIdle} sess={bdSess} dateKey="2026-07-11"
                deskIdleHint={true}
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                isWodLogged={() => false}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} onTimer={NOOP}
                onLogBlock={null} athResult={null} athName="" />
            </Case>
            <Case label="Não-WOD (largura total, sem ações)">
              <BlockDetail bl={bdBlPlain} sess={bdSess} dateKey="2026-07-11"
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                isWodLogged={() => false}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} onTimer={NOOP} />
            </Case>
            <Case label="Bloco de rodadas (idle · não-WOD — onLogBlock passado mas ignorado, prova de que só WOD registra)">
              <BlockDetail bl={bdBlRound} sess={bdSess} dateKey="2026-07-11"
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                isWodLogged={() => false}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} onTimer={NOOP}
                onLogBlock={NOOP} athResult={null} athName="Bruna" />
            </Case>
            <Case label="Bloco de rodadas (parcialmente completo)">
              <BlockDetail bl={bdBlRound} sess={bdSess} dateKey="2026-07-11"
                checked={new Set()} roundState={{ [`${bdBlRound.id}|${exStandard.id}`]: 2 }} rmValues={{}} rmEditKey={null} demoMap={{}}
                isWodLogged={() => false}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} onTimer={NOOP} />
            </Case>
            <Case label="Bloco de rodadas (completo)">
              <BlockDetail bl={bdBlRound} sess={bdSess} dateKey="2026-07-11"
                checked={new Set()} roundState={{ [`${bdBlRound.id}|${exStandard.id}`]: 4 }} rmValues={{}} rmEditKey={null} demoMap={{}}
                isWodLogged={() => false}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} onTimer={NOOP} />
            </Case>
            <Case label="Estações">
              <BlockDetail bl={bdBlEstacoes} sess={bdSess} dateKey="2026-07-11"
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                isWodLogged={() => false}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} onTimer={NOOP}
                onLogBlock={NOOP} athResult={null} athName="Bruna" />
            </Case>
          </Section>
        ),
      },
      {
        id: 'sessiondetail',
        label: 'SessionDetail',
        render: () => (
          <Section title="SessionDetail" sub="src/public/schedule/SessionDetail.jsx — expansão mobile de uma sessão (lista de blocos, cada um com seu próprio botão de registro quando é WOD, + botão de registro da sessão inteira)">
            <Case label="Com nome de sessão · múltiplos blocos (1 WOD já registrado + 1 não-WOD)">
              <SessionDetail sess={sdSessNamed} dateKey="2026-07-11"
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                isWodLogged={bl => bl.id === bdBlWodWithAth.id}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} onTimer={NOOP}
                onLog={NOOP}
                onLogBlock={NOOP} getAthResult={bl => bl.id === bdBlWodWithAth.id ? { scale: 'RX', rpe: 7, perfTime: '12:34' } : null} athName="Bruna" />
            </Case>
            <Case label="Sem nome de sessão · um bloco (não-WOD, sem ações de registro)">
              <SessionDetail sess={sdSessUnnamed} dateKey="2026-07-11"
                checked={new Set()} roundState={{}} rmValues={{}} rmEditKey={null} demoMap={{}}
                isWodLogged={() => false}
                onCheck={NOOP} onAdvance={NOOP} onReset={NOOP} onRmToggle={NOOP} onRmConfirm={NOOP} onDemo={NOOP} onTimer={NOOP}
                onLog={NOOP}
                onLogBlock={NOOP} getAthResult={() => null} athName="Bruna" />
            </Case>
          </Section>
        ),
      },
      {
        id: 'logpane',
        label: 'LogPane',
        render: () => (
          <Section title="LogPane" sub="src/public/schedule/LogPane.jsx — painel de registro mobile (position: fixed — contido num quadro via transform em Full; viewport real do MobileFrame em 390)">
            <Case label="Formulário">
              <FixedFrame variant="frameSide">
                <LogPane pane={{ sess: logPaneSess, dateKey: '2026-07-11', assignedAth: logPaneAthletes }} athId="a1" onAthId={NOOP}
                  blocks={logPaneBlockForm} onBlocks={NOOP}
                  submitting={false} success={false} error="" confirming={false} onConfirming={NOOP}
                  onSubmit={NOOP} onClose={NOOP} lockedAthName="" />
              </FixedFrame>
            </Case>
            <Case label="Formulário · RPE + Escala selecionados (#78)">
              <FixedFrame variant="frameSide">
                <LogPane pane={{ sess: logPaneSess, dateKey: '2026-07-11', assignedAth: logPaneAthletes }} athId="a1" onAthId={NOOP}
                  blocks={logPaneBlockDone} onBlocks={NOOP}
                  submitting={false} success={false} error="" confirming={false} onConfirming={NOOP}
                  onSubmit={NOOP} onClose={NOOP} lockedAthName="" />
              </FixedFrame>
            </Case>
            <Case label="Revisão (confirmar)">
              <FixedFrame variant="frameSide">
                <LogPane pane={{ sess: logPaneSess, dateKey: '2026-07-11', assignedAth: logPaneAthletes }} athId="a1" onAthId={NOOP}
                  blocks={logPaneBlockDone} onBlocks={NOOP}
                  submitting={false} success={false} error="" confirming={true} onConfirming={NOOP}
                  onSubmit={NOOP} onClose={NOOP} lockedAthName="Bruna" />
              </FixedFrame>
            </Case>
            <Case label="Sucesso">
              <FixedFrame variant="frameSide">
                <LogPane pane={{ sess: logPaneSess, dateKey: '2026-07-11', assignedAth: logPaneAthletes }} athId="a1" onAthId={NOOP}
                  blocks={logPaneBlockDone} onBlocks={NOOP}
                  submitting={false} success={true} error="" confirming={false} onConfirming={NOOP}
                  onSubmit={NOOP} onClose={NOOP} lockedAthName="" />
              </FixedFrame>
            </Case>
            <Case label="Erro no envio (RPC falhou)">
              <FixedFrame variant="frameSide">
                <LogPane pane={{ sess: logPaneSess, dateKey: '2026-07-11', assignedAth: logPaneAthletes }} athId="a1" onAthId={NOOP}
                  blocks={logPaneBlockDone} onBlocks={NOOP}
                  submitting={false} success={false} error="Erro ao enviar. Tente novamente." confirming={true} onConfirming={NOOP}
                  onSubmit={NOOP} onClose={NOOP} lockedAthName="Bruna" />
              </FixedFrame>
            </Case>
          </Section>
        ),
      },
      {
        id: 'deskregpane',
        label: 'DeskRegPane',
        render: () => (
          <Section title="DeskRegPane" sub="src/public/schedule/DeskRegPane.jsx — painel de registro desktop (3ª coluna)">
            <Case label="Formulário · For Time">
              <DeskRegPane regBl={deskRegBlFixture} step="form" scale={null} rpe={null} perfTime="" perfRounds="" perfReps="" athName="Bruna"
                onScale={NOOP} onRpe={NOOP} onPerfTime={NOOP} onPerfRounds={NOOP} onPerfReps={NOOP}
                onConfirm={NOOP} onSubmit={NOOP} onBack={NOOP} onClose={NOOP} submitting={false} error="" />
            </Case>
            <Case label="Formulário · RPE + Escala selecionados (#78)">
              <DeskRegPane regBl={deskRegBlFixture} step="form" scale="RX" rpe={7} perfTime="12:34" perfRounds="" perfReps="" athName="Bruna"
                onScale={NOOP} onRpe={NOOP} onPerfTime={NOOP} onPerfRounds={NOOP} onPerfReps={NOOP}
                onConfirm={NOOP} onSubmit={NOOP} onBack={NOOP} onClose={NOOP} submitting={false} error="" />
            </Case>
            <Case label="Formulário · AMRAP (rounds/reps + dica)">
              <DeskRegPane regBl={deskRegBlAmrap} step="form" scale={null} rpe={null} perfTime="" perfRounds="" perfReps="" athName="Bruna"
                onScale={NOOP} onRpe={NOOP} onPerfTime={NOOP} onPerfRounds={NOOP} onPerfReps={NOOP}
                onConfirm={NOOP} onSubmit={NOOP} onBack={NOOP} onClose={NOOP} submitting={false} error="" />
            </Case>
            <Case label="Revisão (confirmar)">
              <DeskRegPane regBl={deskRegBlFixture} step="confirm" scale="RX" rpe={7} perfTime="12:34" perfRounds="" perfReps="" athName="Bruna"
                onScale={NOOP} onRpe={NOOP} onPerfTime={NOOP} onPerfRounds={NOOP} onPerfReps={NOOP}
                onConfirm={NOOP} onSubmit={NOOP} onBack={NOOP} onClose={NOOP} submitting={false} error="" />
            </Case>
            <Case label="Revisão (erro no envio)">
              <DeskRegPane regBl={deskRegBlFixture} step="confirm" scale="RX" rpe={7} perfTime="12:34" perfRounds="" perfReps="" athName="Bruna"
                onScale={NOOP} onRpe={NOOP} onPerfTime={NOOP} onPerfRounds={NOOP} onPerfReps={NOOP}
                onConfirm={NOOP} onSubmit={NOOP} onBack={NOOP} onClose={NOOP} submitting={false} error="Erro ao enviar. Tente novamente." />
            </Case>
            <Case label="Sucesso">
              <DeskRegPane regBl={deskRegBlFixture} step="success" scale="RX" rpe={7} perfTime="12:34" perfRounds="" perfReps="" athName="Bruna"
                onScale={NOOP} onRpe={NOOP} onPerfTime={NOOP} onPerfRounds={NOOP} onPerfReps={NOOP}
                onConfirm={NOOP} onSubmit={NOOP} onBack={NOOP} onClose={NOOP} submitting={false} error="" />
            </Case>
          </Section>
        ),
      },
      {
        id: 'checkinsheet',
        label: 'CheckinSheet',
        render: () => (
          <Section title="CheckinSheet" sub="src/public/schedule/CheckinSheet.jsx — bottom sheet de check-in via QR (position: fixed — contido num quadro via transform em Full; viewport real do MobileFrame em 390)">
            <Case label="Modo atleta (busca na lista)">
              <FixedFrame variant="frameBottom">
                <CheckinSheet checkinExec={{ class_label: 'WOD 18h' }} checkinDone={false}
                  checkinMode="athlete" onCheckinMode={NOOP}
                  checkinSearch="" onCheckinSearch={NOOP}
                  athletes={checkinAthletes}
                  checkinAthId="a1" onCheckinAthId={NOOP}
                  checkinAnonName="" onCheckinAnonName={NOOP}
                  checkinSubmitting={false} onSubmit={NOOP} onClose={NOOP} />
              </FixedFrame>
            </Case>
            <Case label="Modo visitante (não está na lista)">
              <FixedFrame variant="frameBottom">
                <CheckinSheet checkinExec={{ class_label: 'WOD 18h' }} checkinDone={false}
                  checkinMode="anon" onCheckinMode={NOOP}
                  checkinSearch="" onCheckinSearch={NOOP}
                  athletes={checkinAthletes}
                  checkinAthId="" onCheckinAthId={NOOP}
                  checkinAnonName="Visitante" onCheckinAnonName={NOOP}
                  checkinSubmitting={false} onSubmit={NOOP} onClose={NOOP} />
              </FixedFrame>
            </Case>
            <Case label="Concluído">
              <FixedFrame variant="frameBottom">
                <CheckinSheet checkinExec={{ class_label: 'WOD 18h' }} checkinDone={true}
                  checkinMode="athlete" onCheckinMode={NOOP}
                  checkinSearch="" onCheckinSearch={NOOP}
                  athletes={checkinAthletes}
                  checkinAthId="" onCheckinAthId={NOOP}
                  checkinAnonName="" onCheckinAnonName={NOOP}
                  checkinSubmitting={false} onSubmit={NOOP} onClose={NOOP} />
              </FixedFrame>
            </Case>
          </Section>
        ),
      },
    ],
  },
]

const ALL_ITEMS = GROUPS.flatMap(g => g.items)

export default function Gallery() {
  const [theme, setTheme] = useState(() => localStorage.getItem('cone_theme') || 'totk-dark')
  const [w, setW] = useState('full')
  const [selectedId, setSelectedId] = useState(ALL_ITEMS[0]?.id)

  function changeTheme(v) {
    setTheme(v)
    document.documentElement.className = 'theme-' + v
    try { localStorage.setItem('cone_theme', v) } catch { /* ignore */ }
  }

  const selected = ALL_ITEMS.find(i => i.id === selectedId) || ALL_ITEMS[0]

  return (
    <div className={s.root}>
      <header className={s.bar}>
        <div className={s.barTitle}>Galeria de componentes <span className={s.barDev}>dev</span></div>
        <div className={s.barCtrls}>
          <label className={s.ctrl}>
            <span className={s.ctrlLbl}>Tema</span>
            <select className={s.select} value={theme} onChange={e => changeTheme(e.target.value)}>
              {THEMES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </label>
          <div className={s.wToggle} role="group" aria-label="Largura do palco">
            <button className={`${s.wBtn}${w === 'mobile' ? ' ' + s.wBtnOn : ''}`} onClick={() => setW('mobile')}>390</button>
            <button className={`${s.wBtn}${w === 'full' ? ' ' + s.wBtnOn : ''}`} onClick={() => setW('full')}>Full</button>
          </div>
        </div>
      </header>

      <div className={s.layout}>
        <nav className={s.sidebar} aria-label="Componentes">
          {GROUPS.map(g => (
            <div key={g.group} className={s.sidebarGroup}>
              <div className={s.sidebarGroupTitle}>{g.group}</div>
              {g.items.map(item => (
                <button key={item.id} type="button"
                  className={`${s.sidebarItem}${selectedId === item.id ? ' ' + s.sidebarItemOn : ''}`}
                  onClick={() => setSelectedId(item.id)}>
                  {item.label}
                </button>
              ))}
              {g.items.length === 0 && <div className={s.sidebarEmpty}>em breve</div>}
            </div>
          ))}
        </nav>

        <main className={s.main}>
          {w === 'mobile' ? (
            <MobileFrame theme={theme} width={390}>
              <div className={s.stage}>{selected ? selected.render() : null}</div>
            </MobileFrame>
          ) : (
            <div className={s.stage}>
              {selected ? selected.render() : null}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
