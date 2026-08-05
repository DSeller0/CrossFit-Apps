import { useState, useRef } from 'react'
import HeroCard from '../../me/HeroCard.jsx'
import KpiStrip from '../../me/KpiStrip.jsx'
import AthletePicker from '../../me/AthletePicker.jsx'
import SessionList from '../../me/SessionList.jsx'
import EventList from '../../me/EventList.jsx'
import GoalList from '../../me/GoalList.jsx'
import BarList from '../../me/BarList.jsx'
import PrSection from '../../me/PrSection.jsx'
import PrLogSheet from '../../me/PrLogSheet.jsx'
import BodySheet from '../../me/BodySheet.jsx'
import ConfirmSheet from '../../me/ConfirmSheet.jsx'
import { blkColor } from '../../lib/wod.js'
import { Case, Section } from '../harness.jsx'
import { NOOP } from '../fixtures.js'
import s from '../Gallery.module.css'

// ── Mock fixtures — me/ components (#52) ──
// The real gym has ~zero logged results (plans/22), so these fixtures are the only
// way to see most of these states at all.
const meAthletes = [
  { id: 'a1', name: 'Bruna Medrado', level: 'Competidor', color: '#c84038', since: '2025-03-14' },
  { id: 'a2', name: 'Arthur Souza', level: 'Avançado', color: '#4878d8', since: '2025-09-01' },
  { id: 'a3', name: 'Camila Rocha', level: 'Intermediário', color: '#48b860' },
  {
    id: 'a4',
    name: 'Maria Fernanda Albuquerque de Vasconcelos',
    level: 'Iniciante',
    color: '#d8a840',
  },
]

const mePd = {
  color: '#c84038',
  nowY: 2026,
  nowM: 7,
  hearts: [
    'full',
    'full',
    'full',
    'full',
    'full',
    'full',
    'full',
    'today',
    'empty',
    'empty',
    'empty',
    'empty',
  ],
  heartTotal: 12,
  thisMon: 8,
  totalSess: 143,
  streak: 4,
  maxStreak: 11,
  totalPrs: 9,
  prsThisMon: 2,
  rxRate: 72,
  rxCount: 13,
  rxTotal: 18,
  sinceStr: '14 Mar 2025',
  days: 486,
}
// The "nothing yet" athlete — the state a new member actually lands in.
const mePdEmpty = {
  ...mePd,
  color: '#48b860',
  hearts: Array(12).fill('empty'),
  thisMon: 0,
  totalSess: 0,
  streak: 0,
  maxStreak: 0,
  totalPrs: 0,
  prsThisMon: 0,
  rxRate: null,
  rxCount: 0,
  rxTotal: 0,
  sinceStr: '',
  days: 0,
}

const meSessRows = [
  { date: '2026-07-11', name: 'WOD + Força', rpe: 8, scale: 'RX', hasPr: true },
  { date: '2026-07-09', name: 'Metcon', rpe: 9, scale: 'Inter', hasPr: false },
  {
    date: '2026-07-07',
    name: 'Sessão com um nome absurdamente longo',
    rpe: 7,
    scale: 'SC',
    hasPr: false,
  },
  { date: '2026-07-05', name: 'Open Gym', rpe: null, scale: 'Adaptado', hasPr: false },
  { date: '2026-07-03', name: 'Treino', rpe: 6, scale: null, hasPr: false },
]

const meEvents = [
  {
    date: '2026-07-11',
    title: 'PR — Back Squat',
    sub: 'Anterior: 95 kg · melhora de +10 kg',
    val: '105 kg',
    tone: 'good',
  },
  {
    date: '2026-07-04',
    title: 'Marco — Primeiro Muscle-up',
    sub: 'Kipping consistente',
    val: '2/4 marcos',
    tone: 'good',
  },
]

const meGoals = [
  {
    name: 'Primeiro Muscle-up',
    totalSessions: 10,
    completedSessions: 6,
    milestones: [
      { label: 'Kipping no chão', pct: 20, hit: true, hitDate: '2026-06-10' },
      { label: 'Transição na barra', pct: 50, hit: true, hitDate: '2026-07-04' },
      { label: 'Muscle-up completo', pct: 90, hit: false },
    ],
  },
  {
    name: 'Meta concluída',
    totalSessions: 8,
    completedSessions: 8,
    milestones: [{ label: 'Feito', pct: 100, hit: true, hitDate: '2026-05-02' }],
  },
  { name: 'Objetivo sem marcos', totalSessions: 12, completedSessions: 3, milestones: [] },
]

const meWodRows = [
  { type: 'For Time', pl: 6, ex: 5, pct: 83, color: blkColor({ type: 'For Time' }) },
  { type: 'AMRAP', pl: 4, ex: 2, pct: 50, color: blkColor({ type: 'AMRAP' }) },
  { type: 'MetCon', pl: 3, ex: 3, pct: 100, color: blkColor({ type: 'MetCon' }) },
]
const meDistRows = [
  { type: 'Força', pl: 8, ex: 7, pct: 88, color: blkColor({ type: 'Força' }) },
  { type: 'LPO', pl: 5, ex: 2, pct: 40, color: blkColor({ type: 'LPO' }) },
  { type: 'Cardio', pl: 4, ex: 0, pct: 0, color: blkColor({ type: 'Cardio' }) },
]

const meRegistry = {
  Força: ['Back Squat', 'Deadlift', 'Bench Press', 'Overhead Press'],
  LPO: ['Clean and Jerk', 'Snatch'],
  Skill: ['Muscle-up', 'Handstand Push-up'],
  'For Time': ['Fran'], // a WOD format — PR_SKIP must drop this whole block
  // Benchmark carries a dedicated time-PR card (#87); entries may be objects with a
  // description that renders as the tile's prescription sub-line.
  Benchmark: [
    { name: 'Fran', description: '21-15-9 · Thrusters + Pull-ups' },
    { name: 'Grace', description: '30 Clean & Jerks' },
    { name: 'Murph', description: '1mi Run · 100 Pull · 200 Push · 300 Squat · 1mi Run' },
  ],
}
const mePrs = [
  {
    name: 'Back Squat',
    type: 'load',
    unit: 'kg',
    target: 120,
    categories: ['Força'],
    results: [
      { value: '95', date: '2026-05-01' },
      { value: '105', date: '2026-07-11' },
    ],
  },
  {
    name: 'Deadlift',
    type: 'load',
    unit: 'kg',
    target: 180,
    categories: ['Força'],
    results: [
      { value: '150', date: '2026-06-01' },
      { value: '145', date: '2026-07-02' },
    ],
  }, // regrediu
  {
    name: 'Bench Press',
    type: 'load',
    unit: 'kg',
    categories: ['Força'], // sem meta → sem barra
    results: [{ value: '60', date: '2026-06-20' }],
  },
  {
    name: 'Clean and Jerk',
    type: 'load',
    unit: 'kg',
    target: 100,
    categories: ['LPO'],
    results: [{ value: '70', date: '2026-07-01' }],
  },
  // A benchmark PR is a completion time (type:'time'); faster is better.
  {
    name: 'Fran',
    type: 'time',
    target: '3:30',
    categories: ['Benchmark'],
    results: [
      { value: '3:56', date: '2026-05-10' },
      { value: '3:42', date: '2026-07-15' },
    ],
  },
  {
    name: 'Grace',
    type: 'time',
    categories: ['Benchmark'],
    results: [
      { value: '3:04', date: '2026-06-05' },
      { value: '2:58', date: '2026-07-18' },
    ],
  },
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
    ? parseFloat(val) > 105
      ? { txt: '↑ +' + (parseFloat(val) - 105) + ' kg vs melhor', tone: 'good' }
      : { txt: '↓ abaixo do melhor', tone: 'bad' }
    : { txt: '', tone: 'none' }

  return (
    <div className={s.sheetBtns}>
      <button
        className={s.demoBtn}
        onClick={() => {
          setVal('')
          setPending(null)
          setOpen('pr')
        }}
      >
        Abrir PrLogSheet
      </button>
      <button
        className={s.demoBtn}
        onClick={() => {
          setVal('90')
          setPending({ bestStr: '105 kg' })
          setOpen('pr')
        }}
      >
        PrLogSheet · confirmar tentativa
      </button>
      <button className={s.demoBtn} onClick={() => setOpen('body')}>
        Abrir BodySheet
      </button>
      <button className={s.demoBtn} onClick={() => setOpen('clear')}>
        Abrir ConfirmSheet (destrutivo)
      </button>

      <PrLogSheet
        open={open === 'pr'}
        onClose={() => setOpen(null)}
        valRef={valRef}
        name="Back Squat"
        cats={['Força']}
        pr={pr}
        unit="kg"
        date="2026-07-12"
        val={val}
        reps=""
        goal="120"
        note=""
        delta={delta}
        pending={pending}
        saving={false}
        saveResult={null}
        warn=""
        onVal={setVal}
        onUnit={NOOP}
        onDate={NOOP}
        onReps={NOOP}
        onGoal={NOOP}
        onNote={NOOP}
        onSave={NOOP}
        onCancelPending={() => setPending(null)}
      />
      <BodySheet
        open={open === 'body'}
        onClose={() => setOpen(null)}
        date="2026-07-12"
        athlete={{ bodyMetrics: [{ date: '2026-06-01', weight: 72, height: 168, bodyFat: 19 }] }}
        weight=""
        height=""
        bodyFat=""
        note=""
        warn={true}
        onWeight={NOOP}
        onHeight={NOOP}
        onBodyFat={NOOP}
        onNote={NOOP}
        onSave={NOOP}
      />
      <ConfirmSheet
        open={open === 'clear'}
        onClose={() => setOpen(null)}
        title="Apagar registros"
        body={'Todos os registros de "Back Squat" serão apagados. Isso não pode ser desfeito.'}
        confirmLabel="APAGAR"
        onConfirm={NOOP}
        busy={false}
        error=""
      />
    </div>
  )
}

// PrSection owns its own open/closed state in me.html — mirror that here so the
// gallery can actually exercise the two disclosure levels and their keyboard path.
function PrSectionDemo(props) {
  const [openBlocks, setOpenBlocks] = useState(() => new Set(['Força', 'Benchmark']))
  const [prQuery, setPrQuery] = useState('')
  const toggle = bt =>
    setOpenBlocks(prev => {
      const n = new Set(prev)
      n.has(bt) ? n.delete(bt) : n.add(bt)
      return n
    })
  return (
    <PrSection
      registry={meRegistry}
      prs={mePrs}
      openBlocks={openBlocks}
      setOpenBlock={toggle}
      query={prQuery}
      onQuery={setPrQuery}
      onOpen={NOOP}
      onClear={NOOP}
      {...props}
    />
  )
}

function AthletePickerDemo({ variant, athletes }) {
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(variant === 'rail' ? athletes[0] : null)
  return (
    <AthletePicker
      variant={variant}
      athletes={athletes}
      selected={sel}
      query={query}
      onQuery={setQuery}
      onSelect={setSel}
      onClear={() => setSel(null)}
    />
  )
}

export default {
  group: 'Me',
  items: [
    {
      id: 'herocard',
      label: 'HeroCard',
      render: () => (
        <Section
          title="HeroCard"
          sub="src/public/me/HeroCard.jsx — identidade + corações do mês. O acesso ao Corpo era o próprio avatar: um <div onClick> sem rótulo, sem foco, sem nada além de cursor:pointer. Agora é um botão nomeado (#52)."
        >
          <Case label="Perfil completo (8 de 12 sessões, hoje já treinou)">
            <HeroCard athlete={meAthletes[0]} pd={mePd} onOpenBody={NOOP} onSwitch={NOOP} />
          </Case>
          <Case label="Atleta nova — nada registrado ainda (o estado real de quase todo mundo hoje)">
            <HeroCard athlete={meAthletes[2]} pd={mePdEmpty} onOpenBody={NOOP} onSwitch={NOOP} />
          </Case>
          <Case label="Nome longo (overflow) · sem nível · sem 'desde'">
            <HeroCard
              athlete={{ ...meAthletes[3], level: null }}
              pd={{ ...mePdEmpty, sinceStr: '' }}
              onOpenBody={NOOP}
              onSwitch={NOOP}
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'kpistrip',
      label: 'KpiStrip',
      render: () => (
        <Section
          title="KpiStrip"
          sub="src/public/me/KpiStrip.jsx — os quatro números do topo. 'Streak' era a última string em inglês da página; virou 'Sequência' (#52). RPE fica RPE — é o que se fala no box."
        >
          <Case label="Com sequência ativa e Taxa RX em alta">
            <KpiStrip pd={mePd} />
          </Case>
          <Case label="Sem sequência · Taxa RX sem dados (— e não 0%)">
            <KpiStrip pd={mePdEmpty} />
          </Case>
          <Case label="Recorde de sequência maior que a atual">
            <KpiStrip pd={{ ...mePd, streak: 2, maxStreak: 11 }} />
          </Case>
          <Case label="Taxa RX com denominador fino (mostra o que contou)">
            <KpiStrip pd={{ ...mePd, rxRate: 50, rxCount: 1, rxTotal: 2 }} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'athletepicker',
      label: 'AthletePicker',
      render: () => (
        <Section
          title="AthletePicker"
          sub="src/public/me/AthletePicker.jsx — um componente, dois layouts: a tela de primeira visita (mobile) e a trilha lateral (desktop). Desde o #52 a escolha é lembrada (cone_athlete_filter, a mesma chave de results/schedule), então o picker voltou a ser o que sempre se chamou: primeira visita."
        >
          <Case label="Picker · lista completa">
            <AthletePickerDemo variant="picker" athletes={meAthletes} />
          </Case>
          <Case label="Picker · um atleta só">
            <AthletePickerDemo variant="picker" athletes={meAthletes.slice(0, 1)} />
          </Case>
          <Case label="Picker · vazio (nenhum atleta cadastrado)">
            <AthletePickerDemo variant="picker" athletes={[]} />
          </Case>
          <Case label="Trilha (desktop) · com selecionado + níveis">
            <div style={{ display: 'flex', height: 320 }}>
              <AthletePickerDemo variant="rail" athletes={meAthletes} />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'sessionlist',
      label: 'SessionList',
      render: () => (
        <Section
          title="SessionList"
          sub="src/public/me/SessionList.jsx — últimas 5 sessões. A escala agora usa o SCALE_COL canônico (#51): o me.html pintava SC de laranja e Inter de azul, enquanto results/leaderboard pintavam Inter de laranja e SC de roxo — o mesmo resultado, cor diferente conforme a página."
        >
          <Case label="Cinco sessões (todas as escalas · PR · sem RPE · sem escala · nome longo)">
            <SessionList rows={meSessRows} />
          </Case>
          <Case label="Vazio">
            <SessionList rows={[]} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'eventlist',
      label: 'EventList',
      render: () => (
        <Section
          title="EventList"
          sub="src/public/me/EventList.jsx — os últimos acontecimentos bons (PRs batidos, marcos atingidos)."
        >
          <Case label="PR + marco">
            <EventList events={meEvents} />
          </Case>
          <Case label="Vazio">
            <EventList events={[]} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'goallist',
      label: 'GoalList',
      render: () => (
        <Section
          title="GoalList"
          sub="src/public/me/GoalList.jsx — metas com marcos, sobre o TallyBar compartilhado. Clique na barra para abrir os marcos."
        >
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
        <Section
          title="BarList"
          sub="src/public/me/BarList.jsx — executados/planejados por tipo de bloco. As cores vêm do blkColor() canônico, não do mapa ECOL de 13 cores que só existia nesta página. Linhas da mesma família dividirem a cor é o ponto: a cor diz 'isto é força' / 'isto é WOD', e o rótulo já diz qual."
        >
          <Case label="WODs (mês) — famílias vermelha + âmbar">
            <BarList title="WODs" sub="Jul 2026 · executados/planejados" rows={meWodRows} />
          </Case>
          <Case label="Distribuição (90 dias) — inclui uma linha em 0%">
            <BarList
              title="Distribuição"
              sub="Últimos 90 dias · executados/planejados"
              rows={meDistRows}
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'prsection',
      label: 'PrSection',
      render: () => (
        <Section
          title="PrSection"
          sub="src/public/me/PrSection.jsx (#55/#87 · plans/38 Phase B) — o quadro de PRs como CARDS DE FAMÍLIA com uma grade de TILES, cada valor recorde visível num toque (antes: lista de duas dobras, dois toques para ver um valor). Reutiliza blkColor (cor de família = dado, igual em todo tema), TallyBar e prBest/prPct/prDelta. Benchmarks (#87) ganham um card de tempo próprio, lido de BENCHMARK_CAT. Página pública → cantos retos. Várias famílias abrem ao mesmo tempo (openBlocks é um Set) e a busca filtra por nome via normExName."
        >
          <Case label="Força + Benchmarks abertos · tiles com meta/delta/tempo; Busca por nome">
            <PrSectionDemo />
          </Case>
          <Case label="Sem nenhum PR (todo o quadro por preencher → tiles tracejados)">
            <PrSection
              registry={meRegistry}
              prs={[]}
              openBlocks={new Set(['Força'])}
              setOpenBlock={NOOP}
              onOpen={NOOP}
              onClear={NOOP}
            />
          </Case>
          <Case label="Registro vazio → não renderiza nada">
            <PrSection
              registry={{}}
              prs={mePrs}
              openBlocks={new Set()}
              setOpenBlock={NOOP}
              onOpen={NOOP}
              onClear={NOOP}
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'mesheets',
      label: 'Sheets (PR · Corpo · Confirmar)',
      render: () => (
        <Section
          title="Sheets"
          sub="src/public/me/{PrLogSheet,BodySheet,ConfirmSheet}.jsx sobre src/public/me/Sheet.jsx — o shell compartilhado. Antes do #52 nenhum dos dois era um diálogo de verdade: sem role, sem Esc, sem foco — e, como os dois ficavam montados o tempo todo no mesmo z-index, podiam abrir juntos e os campos de um sheet FECHADO continuavam alcançáveis por Tab. O ConfirmSheet substitui o window.confirm()/alert() nativo. São overlays position:fixed, então abrem sobre a página — é a única forma de vê-los dizendo a verdade."
        >
          <Case label="Abrir cada sheet (Esc fecha · Tab fica preso dentro)">
            <MeSheetHarness />
          </Case>
        </Section>
      ),
    },
  ],
}
