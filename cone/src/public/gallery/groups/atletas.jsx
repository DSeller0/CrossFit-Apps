import { useState } from 'react'
import AthleteGrid from '../../../components/tabs/atletas/AthleteGrid.jsx'
import AthleteCard from '../../../components/tabs/atletas/AthleteCard.jsx'
import DayGroupHeader from '../../../components/tabs/atletas/DayGroupHeader.jsx'
import Ficha from '../../../components/tabs/atletas/Ficha.jsx'
import PresenceGrid from '../../../components/tabs/atletas/PresenceGrid.jsx'
import SinceLastOneOnOne from '../../../components/tabs/atletas/SinceLastOneOnOne.jsx'
import CoachNotePanel from '../../../components/tabs/atletas/CoachNotePanel.jsx'
import PrRow from '../../../components/tabs/atletas/PrRow.jsx'
import GoalBar from '../../../components/tabs/atletas/GoalBar.jsx'
import GoalConfigPanel from '../../../components/tabs/atletas/GoalConfigPanel.jsx'
import AthleteProfileModal from '../../../components/tabs/atletas/AthleteProfileModal.jsx'
import AddResultModal from '../../../components/tabs/atletas/AddResultModal.jsx'
import PrModal from '../../../components/tabs/atletas/PrModal.jsx'
import Input from '../../../components/ui/Input.jsx'
import { groupPrsByCategory } from '../../../components/tabs/atletas/atletasHelpers.js'
import { Case, Section, ModalBox, TallModalBox } from '../harness.jsx'
import { NOOP } from '../fixtures.js'

// #160/plans/76 — the Atletas grade + ficha design pass. Every component here is
// client-free: the tab's own storage reads/date arithmetic (nextSessionGroups,
// adherence, presenceGrid, sinceLastNote…) stay in the container, so these render
// unmodified from precomputed props.

const TODAY = '2026-08-04'

const athletes = [
  { id: 'a1', name: 'Ana Medrado', color: '#e87820', level: 'Intermediário' },
  { id: 'a2', name: 'Bruno Sacchetto', color: '#4ac8c0', level: 'Avançado' },
  { id: 'a3', name: 'Carla Nepomuceno de Albuquerque', color: '#a878d8', level: 'Iniciante' },
]

const prLoad = {
  id: 'p1',
  name: 'Back Squat',
  category: 'Força',
  categories: ['Força'],
  type: 'load',
  unit: 'kg',
  target: 140,
  results: [
    { value: 110, date: '2026-05-02' },
    { value: 120, date: '2026-07-19' },
  ],
}
const prTime = {
  id: 'p2',
  name: 'Fran',
  category: 'Benchmark',
  categories: ['Benchmark'],
  type: 'time',
  target: '03:00',
  results: [
    { value: '04:10', date: '2026-04-11' },
    { value: '03:42', date: '2026-07-02' },
  ],
}
const prReps = {
  id: 'p3',
  name: 'Toes to Bar',
  category: 'Ginástica',
  categories: ['Ginástica'],
  type: 'reps',
  results: [{ value: 25, date: '2026-06-30' }],
}
const prRegressed = {
  ...prLoad,
  id: 'p4',
  name: 'Snatch',
  results: [
    { value: 80, date: '2026-05-02' },
    { value: 72, date: '2026-07-19' },
  ],
}
const prLongName = {
  ...prLoad,
  id: 'p5',
  name: 'Dumbbell Single-Arm Overhead Walking Lunge',
  target: null,
}

const goalPlain = { id: 'g1', name: 'Muscle-up estrito', totalSessions: 10, completedSessions: 4 }
const goalMs = {
  id: 'g2',
  name: 'Primeira competição',
  totalSessions: 12,
  completedSessions: 7,
  milestones: [
    { label: 'Inscrição feita', pct: 20, hit: true },
    { label: 'Rx nos WODs abertos', pct: 50, hit: false },
    { label: 'Simulado completo', pct: 90, hit: false },
  ],
}
const goalDone = {
  id: 'g3',
  name: 'Base aeróbica',
  totalSessions: 8,
  completedSessions: 8,
  milestones: [{ label: '5k abaixo de 25min', pct: 100, hit: true }],
}
const goalEmpty = { id: 'g4', name: 'Novo objetivo', totalSessions: 10, completedSessions: 0 }

const sessionItems = [
  {
    date: '2026-08-01',
    session: { id: 's1', sessionName: 'Treino A · Força' },
    perf: '11:42',
    logged: true,
  },
  { date: '2026-08-03', session: { id: 's2' }, perf: null, logged: false },
  { date: '2026-08-04', session: { id: 's3', sessionName: 'Fran' }, perf: null, logged: false },
  { date: '2026-08-07', session: { id: 's4', sessionName: 'Treino B' }, perf: null, logged: false },
]

const REGISTRY_ORDER = ['Força', 'Ginástica', 'Benchmark']
const prGroups = groupPrsByCategory([prLoad, prRegressed, prReps, prTime], REGISTRY_ORDER)

const athFull = {
  id: 'a1',
  name: 'Ana Medrado',
  color: '#e87820',
  level: 'Intermediário',
  goal: 'Competição',
  since: '2025-03-10',
  notes: 'Joelho direito — evitar caixa alta',
}
const athMinimal = { id: 'a9', name: 'Novo Atleta', color: '#4ac8c0' }

const LEVELS = ['Iniciante', 'Intermediário', 'Avançado', 'Competidor']
const GOALS = ['Saúde geral', 'Força', 'Condicionamento', 'Competição']

// ── AthleteCard signal fixtures (each covers one state the card must render) ─
const signalDefault = {
  lastSession: { days: 1, label: '1 d' },
  adherence: { pct: 58, trend: 'down' },
  daysSinceFeedback: { days: 21, label: '3 sem' },
  goal: {
    goal: { name: 'Primeira competição', completedSessions: 7, totalSessions: 12 },
    pct: 70,
    stalledWeeks: 5,
  },
}
const signalNeverTrained = {
  lastSession: null,
  adherence: null,
  daysSinceFeedback: null,
  goal: null,
}
const signalNoNotes = {
  lastSession: { days: 0, label: 'hoje' },
  adherence: { pct: 82, trend: 'up' },
  daysSinceFeedback: null,
  goal: {
    goal: { name: 'Muscle-up estrito', completedSessions: 4, totalSessions: 10 },
    pct: 40,
    stalledWeeks: null,
  },
}
const signalFlat = {
  lastSession: { days: 2, label: '2 d' },
  adherence: { pct: 100, trend: 'flat' },
  daysSinceFeedback: { days: 0, label: 'hoje' },
  goal: null,
}

const groupHoje = {
  date: TODAY,
  time: '18:00',
  label: 'Hoje',
  athletes: [athletes[0], athletes[1]],
}
const groupAmanha = { date: '2026-08-05', time: null, label: 'Amanhã', athletes: [athletes[2]] }
const groupNoSession = {
  date: null,
  time: null,
  label: 'Sem sessão marcada',
  athletes: [{ id: 'a4', name: 'Diego Rezende', color: '#4878d8', level: 'Iniciante' }],
}

const signalsByAthlete = {
  a1: signalDefault,
  a2: signalNoNotes,
  a3: signalFlat,
  a4: signalNeverTrained,
}

// ── presence / since-1:1 / coach-note fixtures ───────────────────────────────
function makeWeek(states) {
  return states.map((state, i) => ({ date: `2026-07-2${i}`, state }))
}
const presenceFull = Array.from({ length: 4 }, () => makeWeek(Array(7).fill('presente')))
const presenceSparse = [
  makeWeek(['none', 'presente', 'unlogged', 'presente', 'none', 'presente', 'none']),
  makeWeek(['none', 'presente', 'presente', 'unlogged', 'none', 'presente', 'none']),
  makeWeek(['none', 'unlogged', 'presente', 'presente', 'none', 'none', 'none']),
  makeWeek(['none', 'presente', 'presente', 'presente', 'none', 'unlogged', 'none']),
]
const presenceEmpty = Array.from({ length: 4 }, () => makeWeek(Array(7).fill('none')))

const sinceWithAnchor = {
  anchorDate: '2026-07-20',
  items: [
    {
      kind: 'event',
      date: '2026-08-01',
      title: 'PR — Back Squat',
      sub: 'Anterior: 110 kg · melhora de +10 kg',
    },
    { kind: 'missed', date: '2026-07-28', session: { sessionName: 'Treino B · Condicionamento' } },
  ],
}
const sinceNoItems = { anchorDate: '2026-07-30', items: [] }
const sinceNoAnchor = { anchorDate: null, items: [] }

const notesNone = []
const notesOne = [
  { id: 'n1', date: '2026-07-20', text: 'Focar em técnica de recepção do snatch — cotovelos.' },
]

// ── stateful demo wrappers (single-group, so they live here) ────────────────
function GridDemo({ initialGroups = [groupHoje, groupAmanha, groupNoSession] }) {
  const [sel, setSel] = useState(initialGroups[0]?.athletes[0]?.id ?? null)
  const [groups, setGroups] = useState(initialGroups)
  return (
    <div style={{ width: 480, height: 420, border: '1px solid var(--divider)' }}>
      <AthleteGrid
        groups={groups}
        signalsByAthlete={signalsByAthlete}
        selectedId={sel}
        onSelect={setSel}
        onAdd={name =>
          setGroups(gs => {
            const added = { id: 'novo-' + Date.now(), name, color: '#e87820' }
            const rest = gs.filter(g => g.label !== 'Sem sessão marcada')
            const existing = gs.find(g => g.label === 'Sem sessão marcada')
            return [
              ...rest,
              {
                date: null,
                time: null,
                label: 'Sem sessão marcada',
                athletes: [...(existing?.athletes || []), added],
              },
            ]
          })
        }
      />
    </div>
  )
}

function FichaDemo({
  athlete = athFull,
  compact = false,
  groups = prGroups,
  goals = [goalMs],
  sessions = sessionItems,
  since = sinceWithAnchor,
  presence = presenceSparse,
  notes = notesOne,
  height = 900,
}) {
  return (
    // overflow:auto, not hidden — the pane's own sticky header only reads correctly
    // against a real scrollport, and the reviewer needs to reach both ▢ slots.
    <div style={{ height, overflow: 'auto', border: '1px solid var(--divider)' }}>
      <Ficha
        athlete={athlete}
        compact={compact}
        sessionItems={sessions}
        todayKey={TODAY}
        prGroups={groups}
        prCount={groups.reduce((n, [, ps]) => n + ps.length, 0)}
        goals={goals}
        sinceLastNote={since}
        presenceWeeks={presence}
        notes={notes}
        onEditProfile={NOOP}
        onAddPr={NOOP}
        onAddGoal={NOOP}
        onSaveNote={NOOP}
      />
    </div>
  )
}

function ProfileModalDemo() {
  const [form, setForm] = useState({
    name: 'Ana Medrado',
    level: 'Intermediário',
    goal: 'Competição',
    notes: 'Joelho direito',
    color: '#e87820',
    since: '2025-03-10',
  })
  return (
    <TallModalBox>
      <AthleteProfileModal
        open
        form={form}
        levels={LEVELS}
        goals={GOALS}
        onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))}
        onSave={NOOP}
        onDelete={NOOP}
        onClose={NOOP}
      />
    </TallModalBox>
  )
}

// The PR modal is the tallest dialog in the tab. `Modal`'s own `max-height:88vh`
// resolves against the VIEWPORT, not this containment box, so TallModalBox (560)
// clips it here even though it scrolls correctly in the app. Local, taller box —
// single-group use, co-located per the gallery's own convention.
function XTallModalBox({ children }) {
  return (
    <div
      style={{
        position: 'relative',
        transform: 'translateZ(0)',
        height: 760,
        overflow: 'hidden',
        border: '1px solid var(--divider)',
      }}
    >
      {children}
    </div>
  )
}

function PrModalDemo({ editPr = null }) {
  const [name, setName] = useState(editPr?.name || '')
  return (
    <XTallModalBox>
      <PrModal
        open
        editPr={editPr}
        today={TODAY}
        nameFilled={!!name.trim()}
        categories={name.trim() ? ['Força', 'LPO'] : []}
        combobox={
          <Input
            label="Nome"
            placeholder="Ex: Fran, Back Squat…"
            value={name}
            onChange={e => setName(e.target.value)}
            hint="no app real: ExerciseCombobox (lê o registry)"
          />
        }
        onSave={NOOP}
        onClose={NOOP}
      />
    </XTallModalBox>
  )
}

function CoachNoteDemo({ notes }) {
  return <CoachNotePanel notes={notes} onSave={NOOP} />
}

export default {
  group: 'Atletas',
  items: [
    {
      id: 'atl-grid',
      label: 'AthleteGrid',
      render: () => (
        <Section
          title="AthleteGrid"
          sub="tabs/atletas/AthleteGrid.jsx — a grade que abre a aba (#160/plans/76). Substitui a AthleteList: os atletas agrupam pela PRÓXIMA sessão (Hoje/Amanhã/data/Sem sessão marcada), não por ordem alfabética — a pergunta do coach ao abrir a aba é 'com quem preciso falar antes da próxima turma', não 'quem está na lista'."
        >
          <Case label="Vários grupos · interativo (clique num card, adicione um atleta)">
            <GridDemo />
          </Case>
          <Case label="Um grupo só — Hoje">
            <GridDemo initialGroups={[groupHoje]} />
          </Case>
          <Case label="Vazio — a ação está no próprio estado vazio">
            <GridDemo initialGroups={[]} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'atl-card',
      label: 'AthleteCard',
      render: () => (
        <Section
          title="AthleteCard"
          sub="tabs/atletas/AthleteCard.jsx — 4 sinais + uma TallyBar de largura total, com a legenda ABAIXO da barra (nunca ao lado — numa grade 2-up a mesma % rende larguras diferentes se dividir espaço com um rótulo). Qualquer sinal pode faltar (atleta novo: nunca treinou, nunca foi anotado, sem objetivo aberto) e some para '—', nunca um 0/hoje/0% enganoso."
        >
          <Case label="Padrão — objetivo parado há 5 sem">
            <div style={{ width: 220 }}>
              <AthleteCard athlete={athletes[0]} signals={signalDefault} onClick={NOOP} />
            </div>
          </Case>
          <Case label="Selecionado">
            <div style={{ width: 220 }}>
              <AthleteCard athlete={athletes[0]} signals={signalDefault} selected onClick={NOOP} />
            </div>
          </Case>
          <Case label="Nunca treinou — todos os sinais em —">
            <div style={{ width: 220 }}>
              <AthleteCard athlete={athMinimal} signals={signalNeverTrained} onClick={NOOP} />
            </div>
          </Case>
          <Case label="Sem nota ainda (sem feedback em —) · aderência subindo">
            <div style={{ width: 220 }}>
              <AthleteCard athlete={athletes[1]} signals={signalNoNotes} onClick={NOOP} />
            </div>
          </Case>
          <Case label="Sem objetivo aberto — a barra some inteira">
            <div style={{ width: 220 }}>
              <AthleteCard athlete={athletes[2]} signals={signalFlat} onClick={NOOP} />
            </div>
          </Case>
          <Case label="Nome longo — trunca, o resto não encolhe">
            <div style={{ width: 220 }}>
              <AthleteCard
                athlete={{
                  id: 'a5',
                  name: 'Carla Nepomuceno de Albuquerque Santos',
                  color: '#a878d8',
                }}
                signals={signalDefault}
                onClick={NOOP}
              />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'atl-daygroupheader',
      label: 'DayGroupHeader',
      render: () => (
        <Section
          title="DayGroupHeader"
          sub="tabs/atletas/DayGroupHeader.jsx — um horário só aparece quando um evento da agenda vincula a sessão."
        >
          <Case label="Com horário — vinculado por um evento da agenda">
            <DayGroupHeader label="Hoje" time="18:00" />
          </Case>
          <Case label="Sem horário — nenhum evento vinculado ainda">
            <DayGroupHeader label="Sex 05/09" />
          </Case>
          <Case label="Sem sessão marcada">
            <DayGroupHeader label="Sem sessão marcada" />
          </Case>
        </Section>
      ),
    },
    {
      id: 'atl-prrow',
      label: 'PrRow',
      render: () => (
        <Section
          title="PrRow"
          sub="tabs/atletas/PrRow.jsx — linha densa (é a visão do coach: ele varre 20 delas). A barra agora é o TallyBar compartilhado; a anterior era um medidor de 10 blocos feito à mão cujo preenchimento parcial usava 'var(--theme-accent)88' — CSS inválido, ou seja, não pintava nada."
        >
          <Case label="Carga · com meta · PR melhorou">
            <PrRow
              pr={prLoad}
              color="#e87820"
              showActions
              onAddResult={NOOP}
              onEdit={NOOP}
              onDelete={NOOP}
            />
          </Case>
          <Case label="Tempo · meta · melhora (tempo menor)">
            <PrRow
              pr={prTime}
              color="#e87820"
              showActions
              onAddResult={NOOP}
              onEdit={NOOP}
              onDelete={NOOP}
            />
          </Case>
          <Case label="Reps · sem meta (sem barra) · sem delta">
            <PrRow
              pr={prReps}
              color="#e87820"
              showActions
              onAddResult={NOOP}
              onEdit={NOOP}
              onDelete={NOOP}
            />
          </Case>
          <Case label="Regressão — delta para baixo em --red">
            <PrRow
              pr={prRegressed}
              color="#e87820"
              showActions
              onAddResult={NOOP}
              onEdit={NOOP}
              onDelete={NOOP}
            />
          </Case>
          <Case label="Overflow — nome longo trunca, o resto não encolhe">
            <PrRow
              pr={prLongName}
              color="#e87820"
              showActions
              onAddResult={NOOP}
              onEdit={NOOP}
              onDelete={NOOP}
            />
          </Case>
          <Case label="Sem ações (leitura)">
            <PrRow pr={prLoad} color="#e87820" />
          </Case>
          <Case label="compact (390px) — a barra ganha a própria linha">
            <div style={{ width: 358 }}>
              <PrRow
                pr={prLoad}
                color="#e87820"
                compact
                showActions
                onAddResult={NOOP}
                onEdit={NOOP}
                onDelete={NOOP}
              />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'atl-goalbar',
      label: 'GoalBar',
      render: () => (
        <Section
          title="GoalBar"
          sub="tabs/atletas/GoalBar.jsx — era o HpBar: segundo medidor de 10 blocos feito à mão, com marcos desenhados como divs de 2px em #d8a840. Agora é TallyBar + ticks hit/next/future, a MESMA forma que me/GoalList.jsx monta. O '+1' não pergunta mais nada: é um incremento reversível."
        >
          <Case label="Parcial · com marcos (interativo — clique na barra)">
            <GoalBar
              goal={goalMs}
              color="#e87820"
              onAddSession={NOOP}
              onMilestoneHit={NOOP}
              onConfigure={NOOP}
              onDelete={NOOP}
            />
          </Case>
          <Case label="Marcos abertos">
            <GoalBar
              goal={goalMs}
              color="#e87820"
              defaultExpanded
              onAddSession={NOOP}
              onMilestoneHit={NOOP}
              onConfigure={NOOP}
              onDelete={NOOP}
            />
          </Case>
          <Case label="Sem marcos">
            <GoalBar
              goal={goalPlain}
              color="#4ac8c0"
              onAddSession={NOOP}
              onMilestoneHit={NOOP}
              onConfigure={NOOP}
              onDelete={NOOP}
            />
          </Case>
          <Case label="0% — recém-criado">
            <GoalBar
              goal={goalEmpty}
              color="#a878d8"
              onAddSession={NOOP}
              onMilestoneHit={NOOP}
              onConfigure={NOOP}
              onDelete={NOOP}
            />
          </Case>
          <Case label="100% — '+1' desabilitado, 10 blocos sólidos">
            <GoalBar
              goal={goalDone}
              color="#4ac8c0"
              defaultExpanded
              onAddSession={NOOP}
              onMilestoneHit={NOOP}
              onConfigure={NOOP}
              onDelete={NOOP}
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'atl-presencegrid',
      label: 'PresenceGrid',
      render: () => (
        <Section
          title="PresenceGrid"
          sub="tabs/atletas/PresenceGrid.jsx — 4 semanas × 7 dias, início no DOMINGO. 'Sem registro' é uma INFERÊNCIA (nenhuma linha de results_v2), nunca 'faltou' — não existe linha para uma falta até o #102 (join de presença) existir."
        >
          <Case label="Cheio — presença consistente">
            <div style={{ width: 260 }}>
              <PresenceGrid weeks={presenceFull} />
            </div>
          </Case>
          <Case label="Esparso — mistura presente/sem registro/sem sessão">
            <div style={{ width: 260 }}>
              <PresenceGrid weeks={presenceSparse} />
            </div>
          </Case>
          <Case label="Vazio — nenhuma sessão no período">
            <div style={{ width: 260 }}>
              <PresenceGrid weeks={presenceEmpty} />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'atl-since',
      label: 'SinceLastOneOnOne',
      render: () => (
        <Section
          title="SinceLastOneOnOne"
          sub="tabs/atletas/SinceLastOneOnOne.jsx — 'Desde o último 1:1'. A âncora é a nota mais recente de goals_data.coachNotes; cada linha já existia como dado (PR, marco, sessão sem resultado) — só a âncora é nova."
        >
          <Case label="Com âncora e itens">
            <SinceLastOneOnOne since={sinceWithAnchor} />
          </Case>
          <Case label="Com âncora, nada mudou desde então">
            <SinceLastOneOnOne since={sinceNoItems} />
          </Case>
          <Case label="Sem 1:1 registrado ainda — sem âncora">
            <SinceLastOneOnOne since={sinceNoAnchor} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'atl-coachnote',
      label: 'CoachNotePanel',
      render: () => (
        <Section
          title="CoachNotePanel"
          sub="tabs/atletas/CoachNotePanel.jsx — a única escrita nova da ficha. Salvar zera 'sem feedback' para hoje e vira a âncora de 'Desde o último 1:1' na próxima abertura — os dois leem a MESMA entrada. Escreve pelo mutator (persist), nunca por um efeito de montagem."
        >
          <Case label="Primeira nota — sem anterior">
            <div style={{ maxWidth: 420 }}>
              <CoachNoteDemo notes={notesNone} />
            </div>
          </Case>
          <Case label="Com nota anterior, somente leitura acima do campo">
            <div style={{ maxWidth: 420 }}>
              <CoachNoteDemo notes={notesOne} />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'atl-ficha',
      label: 'Ficha',
      render: () => (
        <Section
          title="Ficha"
          sub="tabs/atletas/Ficha.jsx — supersede a composição da AthleteDetail. 7 seções vivas; os dois slots ▢ (Limitações #39, Atributos plans/22) renderizam NADA de propósito — sem placeholder 'em breve'. Precedente oposto: locations[].coachName, campo escrito por um formulário que nada lia."
        >
          <Case label="Completo — 1280 (as 7 seções + os 2 slots ausentes + o fold Missões)">
            <FichaDemo />
          </Case>
          <Case label="Vazio — nenhum atleta selecionado">
            <div style={{ height: 300, border: '1px solid var(--divider)' }}>
              <Ficha athlete={null} />
            </div>
          </Case>
          <Case label="Atleta novo — todas as seções vazias, cada uma levando a ação">
            <FichaDemo
              athlete={athMinimal}
              groups={[]}
              goals={[]}
              sessions={[]}
              since={sinceNoAnchor}
              presence={presenceEmpty}
              notes={notesNone}
              height={620}
            />
          </Case>
          <Case label="compact (390px)">
            <div style={{ width: 390 }}>
              <FichaDemo compact />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'atl-goalconfig',
      label: 'GoalConfigPanel',
      render: () => (
        <Section
          title="GoalConfigPanel"
          sub="tabs/atletas/GoalConfigPanel.jsx — todos os campos passaram a ser o Input do C0 (<label htmlFor> real, um anel de foco) no lugar de .fg/.lbl/.ex-input. Segura um rascunho e só grava no Salvar."
        >
          <Case label="Com marcos">
            <div style={{ maxWidth: 460 }}>
              <GoalConfigPanel goal={goalMs} onSave={NOOP} onCancel={NOOP} />
            </div>
          </Case>
          <Case label="Sem marcos">
            <div style={{ maxWidth: 460 }}>
              <GoalConfigPanel goal={goalPlain} onSave={NOOP} onCancel={NOOP} />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'atl-modals',
      label: 'Modais',
      render: () => (
        <Section
          title="Modais de Atletas"
          sub="Casca única: ui/Modal.jsx (role=dialog, foco preso, Escape, foco restaurado) no lugar de .settings-overlay/.settings-modal/.settings-drag-hdr. ColorField substitui o proxy só-mouse com document.getElementById().click(). Campos de tempo usam o MaskedTimeInput (#35)."
        >
          <Case label="Perfil do atleta — Input + ColorField (interativo)">
            <ProfileModalDemo />
          </Case>
          <Case label="Registrar resultado · carga (com melhor atual)">
            <ModalBox>
              <AddResultModal open pr={prLoad} today={TODAY} onSave={NOOP} onClose={NOOP} />
            </ModalBox>
          </Case>
          <Case label="Registrar resultado · tempo → MaskedTimeInput">
            <ModalBox>
              <AddResultModal open pr={prTime} today={TODAY} onSave={NOOP} onClose={NOOP} />
            </ModalBox>
          </Case>
          <Case label="Novo PR — o combobox entra como PROP (aqui, um Input stub)">
            <PrModalDemo />
          </Case>
          <Case label="Editar PR — sem campos de primeiro resultado">
            <PrModalDemo editPr={prLoad} />
          </Case>
        </Section>
      ),
    },
  ],
}
