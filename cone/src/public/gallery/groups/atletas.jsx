import { useState } from 'react'
import AthleteList from '../../../components/tabs/atletas/AthleteList.jsx'
import AthleteDetail from '../../../components/tabs/atletas/AthleteDetail.jsx'
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

// #56/C2 · plans/75 — the Atletas design pass. Every component here is client-free:
// the tab's own storage reads stay in the container, so these render unmodified.

const TODAY = '2026-08-04'

const athletes = [
  { id: 'a1', name: 'Ana Medrado', color: '#e87820', level: 'Intermediário' },
  { id: 'a2', name: 'Bruno Sacchetto', color: '#4ac8c0', level: 'Avançado' },
  { id: 'a3', name: 'Carla Nepomuceno de Albuquerque', color: '#a878d8', level: 'Iniciante' },
]
const goalsByAthlete = {
  a1: [{ id: 'g1', totalSessions: 10, completedSessions: 4 }],
  a2: [
    { id: 'g2', totalSessions: 10, completedSessions: 10 },
    { id: 'g3', totalSessions: 6, completedSessions: 3 },
  ],
}

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

// ── stateful demo wrappers (single-group, so they live here) ────────────────
function ListDemo({ items = athletes, showChevron = false }) {
  const [sel, setSel] = useState(items[0]?.id ?? null)
  const [added, setAdded] = useState(items)
  return (
    <div style={{ width: 240, height: 330, border: '1px solid var(--divider)' }}>
      <AthleteList
        athletes={added}
        goalsByAthlete={goalsByAthlete}
        selectedId={sel}
        showChevron={showChevron}
        onSelect={setSel}
        onAdd={name => setAdded(a => [...a, { id: 'n' + a.length, name, color: '#e87820' }])}
      />
    </div>
  )
}

function DetailDemo({
  athlete = athFull,
  compact = false,
  groups = prGroups,
  goals = [goalMs],
  sessions = sessionItems,
  height = 640,
}) {
  return (
    // overflow:auto, not hidden — the pane's own sticky header only reads correctly
    // against a real scrollport, and the reviewer needs to reach the #39 slot.
    <div style={{ height, overflow: 'auto', border: '1px solid var(--divider)' }}>
      <AthleteDetail
        athlete={athlete}
        compact={compact}
        sessionItems={sessions}
        todayKey={TODAY}
        prGroups={groups}
        prCount={groups.reduce((n, [, ps]) => n + ps.length, 0)}
        goals={goals}
        onEditProfile={NOOP}
        onAddPr={NOOP}
        onAddGoal={NOOP}
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

export default {
  group: 'Atletas',
  items: [
    {
      id: 'atl-list',
      label: 'AthleteList',
      render: () => (
        <Section
          title="AthleteList"
          sub="tabs/atletas/AthleteList.jsx — cada linha era um <div onClick> sem caminho de teclado; agora é <button> (Enter/Espaço, anel de foco). A cor da faixa e do ponto é a cor do atleta: DATA color, fica inline. O estado vazio leva a ação junto, em vez de uma linha em itálico no meio do nada."
        >
          <Case label="Com atletas · selecionado (interativo — clique, dê Tab)">
            <ListDemo />
          </Case>
          <Case label="Vazio — a ação está no próprio estado vazio">
            <ListDemo items={[]} />
          </Case>
          <Case label="Mobile — chevron por linha">
            <ListDemo showChevron />
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
      id: 'atl-detail',
      label: 'AthleteDetail',
      render: () => (
        <Section
          title="AthleteDetail"
          sub="tabs/atletas/AthleteDetail.jsx — a pilha plana de SecLabel virou três Cards com <h2> real e a ação no cabeçalho da seção. Abaixo de Objetivos há um SLOT reservado e vazio para as Adaptações (#39) — sem placeholder na tela, de propósito."
        >
          <Case label="Completo — 1280 (Sessões · PRs · Objetivos + slot #39)">
            <DetailDemo />
          </Case>
          <Case label="Vazio — nenhum atleta selecionado (era itálico centralizado num painel inteiro)">
            <div style={{ height: 300, border: '1px solid var(--divider)' }}>
              <AthleteDetail athlete={null} />
            </div>
          </Case>
          <Case label="Atleta novo — as três seções vazias, cada uma levando a ação">
            <DetailDemo athlete={athMinimal} groups={[]} goals={[]} sessions={[]} height={420} />
          </Case>
          <Case label="compact (390px)">
            <div style={{ width: 390 }}>
              <DetailDemo compact />
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
