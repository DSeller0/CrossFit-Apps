import { useState } from 'react'
import EventFilter from '../../../components/tabs/publicador/agenda/EventFilter.jsx'
import EventCard from '../../../components/tabs/publicador/agenda/EventCard.jsx'
import CellDay from '../../../components/tabs/publicador/agenda/CellDay.jsx'
import DayList from '../../../components/tabs/publicador/agenda/DayList.jsx'
import DayPane from '../../../components/tabs/publicador/agenda/DayPane.jsx'
import { agendaFilter, reportFilter } from '../../../components/tabs/publicador/eventFilter.js'
import { Case, Section } from '../harness.jsx'
import { NOOP } from '../fixtures.js'

// #59/plans/81 · C5·a (mockup 62) — Agenda.
//
// The structural answer the mockup picked: with MinhaSemanaPane showing the week,
// AffiliateSessions an affiliate's month and Fechamento billing them — all three
// read-only projections by money — AGENDA IS THE EDITOR. It is the only surface
// that writes `events`, and the only one where `events` meets `sessions`.
//
// Everything here is CLIENT-FREE: locs / athletes / sessions / events all arrive
// as props, which is what lets these render in the gallery and in the design cards.
//
// ⚠️ Every date is FIXED (August 2026), never `new Date()` — the design cards are
// SSR'd once and must render the same month on every regeneration.
//
// ⚠️ The design cards cannot load the `ti` webfont or any external URL (CSP), but
// these components use @tabler/icons-react (inline SVG), so unlike the
// results/schedule cards they have no blank icon gaps.

const LOCS = [
  { id: 'l1', name: 'CrossFit Vila', type: 'box', color: '#4ac8c0' },
  { id: 'l2', name: 'Studio Norte', type: 'personal', color: '#e87820', athleteIds: ['a1'] },
]
const ATHLETES = [
  { id: 'a1', name: 'Ana Prado', color: '#c884f0' },
  { id: 'a2', name: 'Bruno Teixeira', color: '#68d8a0' },
  { id: 'a3', name: 'Caio Reis', color: '#64b5f6' },
  { id: 'a4', name: 'Marina Souza', color: '#4ac8c0' },
]

const BLOCK_C = {
  Força: '#d8a840',
  LPO: '#4ac8c0',
  'For Time': '#e87820',
  Core: '#68d8a0',
  Acessórios: '#c884f0',
  AMRAP: '#e87820',
  Cardio: '#64b5f6',
  EMOM: '#ff8a65',
  WOD: '#e87820',
  HIIT: '#ff6d00',
}

const SESSION = {
  id: 's1',
  mainTraining: 'WOD C — Fran retest',
  blocks: [
    { type: 'Aquecimento', label: '-' },
    { type: 'For Time', label: 'Fran' },
    { type: 'Acessórios', label: '-' },
  ],
}
const SESSIONS = { '2026-08-05': [SESSION] }

const EV_AULA_DONE = {
  id: 'e1',
  type: 'aula',
  time: '07:00',
  durationMin: 60,
  label: 'Turma Manhã',
  locationId: 'l1',
  sessionId: 's1',
  athleteIds: ['a1', 'a2', 'a3', 'a4'],
  status: 'completed',
  recurrenceGroup: 'g1',
}
const EV_PERS = {
  id: 'e2',
  type: 'personal',
  time: '10:00',
  durationMin: 50,
  label: 'Ana — força',
  athleteIds: ['a1'],
  status: 'scheduled',
  local: 'Studio Norte — sala 2',
  notes: 'Levar as bandas leves. Ombro direito ainda sensível.',
}
const EV_NOAFF = {
  id: 'e3',
  type: 'aula',
  time: '19:00',
  durationMin: 60,
  label: 'Turma Noite',
  athleteIds: [],
  status: 'scheduled',
  recurrenceGroup: 'g1',
}
const EV_PERS_NOAFF = {
  id: 'e4',
  type: 'personal',
  time: '18:00',
  durationMin: 50,
  label: 'Caio — avaliação',
  athleteIds: ['a3'],
  status: 'scheduled',
}

const EVENTS = { '2026-08-05': [EV_AULA_DONE, EV_PERS, EV_NOAFF] }

const CARD_PROPS = {
  iso: '2026-08-05',
  athletes: ATHLETES,
  locs: LOCS,
  sessions: SESSIONS,
  BLOCK_C,
  onEdit: NOOP,
  onToggleStatus: NOOP,
  onDelete: NOOP,
  onLogResult: NOOP,
  onEditSession: NOOP,
}

function PaneFrame({ width = 430, children }) {
  return (
    <div
      style={{
        width,
        maxWidth: '100%',
        background: 'var(--bg)',
        border: '1px solid var(--divider)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

function GridFrame({ children }) {
  return (
    <div
      style={{
        width: 640,
        maxWidth: '100%',
        background: 'var(--bg)',
        border: '1px solid var(--divider)',
      }}
    >
      {children}
    </div>
  )
}

/** The filter is a controlled component; the gallery owns the state so it is live. */
function FilterDemo({ layout, axes, initial }) {
  const [f, setF] = useState(initial)
  return (
    <PaneFrame width={layout === 'column' ? 280 : 780}>
      <EventFilter
        value={f}
        onChange={setF}
        axes={axes}
        layout={layout}
        locs={LOCS}
        athletes={ATHLETES}
      />
    </PaneFrame>
  )
}

const toISO = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const WEEK = Array.from({ length: 7 }, (_, i) => new Date(2026, 7, 2 + i))

export default {
  group: 'Agenda',
  items: [
    {
      id: 'ag-eventcard',
      label: 'EventCard',
      render: () => (
        <Section
          title="EventCard"
          sub="tabs/publicador/agenda/EventCard.jsx — seis eixos numa casca só: tipo · status · afiliado · série · sessão vinculada · atletas. Nenhum esconde outro (a linha do título acumula tags e quebra). O corpo é um <button> real, não um click-div, e a barra de ações é irmã dele — cada ação é um botão com nome acessível. ⚠️ O slot reservado do #102 fica logo abaixo dos atletas marcados e NÃO RENDERIZA NADA: o vazio dele é o vazio, nunca '0 presentes' (events não sabe quem apareceu). Os rótulos são 'A lançar'/'Feita' — o que o coach fez com o registro, nunca o que o atleta fez."
        >
          <Case label="Aula · feita · série · afiliado · sessão vinculada · 4 atletas">
            <PaneFrame>
              <div style={{ padding: 12 }}>
                <EventCard {...CARD_PROPS} ev={EV_AULA_DONE} seriesCount={13} seriesIndex={6} />
              </div>
            </PaneFrame>
          </Case>
          <Case label="Personal · a lançar · afiliado resolvido pelo atleta · nota">
            <PaneFrame>
              <div style={{ padding: 12 }}>
                <EventCard {...CARD_PROPS} ev={EV_PERS} />
              </div>
            </PaneFrame>
          </Case>
          <Case label="Aula SEM afiliado — o buraco que o Fechamento não vê">
            <PaneFrame>
              <div style={{ padding: 12 }}>
                <EventCard {...CARD_PROPS} ev={EV_NOAFF} seriesCount={13} seriesIndex={6} />
              </div>
            </PaneFrame>
          </Case>
          <Case label="Personal sem afiliado — nenhum afiliado tem este atleta">
            <PaneFrame>
              <div style={{ padding: 12 }}>
                <EventCard {...CARD_PROPS} ev={EV_PERS_NOAFF} />
              </div>
            </PaneFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'ag-filter',
      label: 'EventFilter',
      render: () => (
        <Section
          title="EventFilter"
          sub="tabs/publicador/agenda/EventFilter.jsx sobre o puro eventFilter.js — UM filtro, superset do tri-estado da Agenda e dos cinco eixos do ReportModal (#105). `axes` decide o que cada chamador rende; a Agenda omite 'period' porque a navegação de mês É o período. ⚠️ A fronteira com o agrupamento: o filtro é dono do predicado nas DUAS granularidades (matchesEvent no evento, matchingAthleteIds nos atletas dele) e o relatório é dono do agrupamento — groupByLocation chama matchingAthleteIds em vez de reimplementar a regra. Dois eixos são pílulas e dois são popovers, por cardinalidade; a linha QUEBRA, nunca rola de lado."
        >
          <Case label='layout="row" — Agenda, nada ativo'>
            <FilterDemo
              layout="row"
              axes={['type', 'status', 'affiliate', 'athlete']}
              initial={agendaFilter()}
            />
          </Case>
          <Case label='layout="row" — três eixos ativos, "N filtros · Limpar" aparece'>
            <FilterDemo
              layout="row"
              axes={['type', 'status', 'affiliate', 'athlete']}
              initial={{
                ...agendaFilter(),
                types: { aula: true, personal: false },
                status: 'scheduled',
                affiliates: new Set(['l1']),
              }}
            />
          </Case>
          <Case label='layout="row" — Personal isolado, dois afiliados, um atleta'>
            <FilterDemo
              layout="row"
              axes={['type', 'status', 'affiliate', 'athlete']}
              initial={{
                ...agendaFilter(),
                types: { aula: false, personal: true },
                affiliates: new Set(['l1', 'l2']),
                athletes: new Set(['a1']),
              }}
            />
          </Case>
          <Case label='layout="column" — o MESMO componente no Relatório (tem altura, então nada vira popover)'>
            <FilterDemo
              layout="column"
              axes={['period', 'type', 'status', 'affiliate', 'athlete']}
              initial={reportFilter(2026, 7)}
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'ag-cellday',
      label: 'CellDay',
      render: () => (
        <Section
          title="CellDay"
          sub="tabs/publicador/agenda/CellDay.jsx — uma célula do mês. Mostra no máximo 3 itens e depois '+N mais'; sessões do Criador vêm antes dos eventos. Abaixo de 540px os chips perdem o texto e viram tocos coloridos — regras que já existiam no index.css e eram INALCANÇÁVEIS, porque useIsMobile(800) impedia a grade de renderizar nessa largura. O seletor de visão é o que as tornou vivas. aria-label diz o dia e quantos itens tem, em vez de deixar o leitor de tela soletrar chips truncados."
        >
          <Case label="Dia denso · hoje · selecionado">
            <GridFrame>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
                <CellDay
                  iso="2026-08-05"
                  day={5}
                  isToday
                  isPast={false}
                  isSelected
                  gymSessions={[SESSION]}
                  evs={[EV_AULA_DONE, EV_PERS, EV_NOAFF]}
                  athletes={ATHLETES}
                  onSelect={NOOP}
                />
                <CellDay
                  iso="2026-08-06"
                  day={6}
                  isToday={false}
                  isPast={false}
                  isSelected={false}
                  gymSessions={[]}
                  evs={[EV_PERS]}
                  athletes={ATHLETES}
                  onSelect={NOOP}
                />
                <CellDay
                  iso="2026-07-30"
                  day={30}
                  isToday={false}
                  isPast
                  isSelected={false}
                  gymSessions={[]}
                  evs={[]}
                  athletes={ATHLETES}
                  onSelect={NOOP}
                />
              </div>
            </GridFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'ag-daylist',
      label: 'DayList (visão Lista)',
      render: () => (
        <Section
          title="DayList"
          sub="tabs/publicador/agenda/DayList.jsx — a segunda metade do #105. NÃO é uma segunda WeekEventGrid: aquilo é uma grade de HORÁRIOS respondendo 'qual a forma da minha semana' e mora em Afiliados; esta lista responde 'o que vem, em ordem, e me deixe agir'. E já estava escrita — era o renderMobileDayList, preso no lado isMobile de um if. Promovê-la apaga um fork em vez de abrir uma superfície. Um dia de descanso diz '— descanso' em vez de ficar em branco."
        >
          <Case label="Semana com sessões, aulas, personal e dois dias de descanso">
            <GridFrame>
              <DayList
                week={WEEK}
                month={7}
                todayISO="2026-08-05"
                selDay="2026-08-05"
                events={EVENTS}
                athletes={ATHLETES}
                dayGymSessions={iso => SESSIONS[iso] || []}
                dayEvents={iso => EVENTS[iso] || []}
                toISO={toISO}
                onSelect={NOOP}
              />
            </GridFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'ag-daypane',
      label: 'DayPane',
      render: () => (
        <Section
          title="DayPane"
          sub="tabs/publicador/agenda/DayPane.jsx — o dia selecionado, e o ÚNICO lugar em que `events` encontra `sessions` (o compromisso e o WOD que o coach escreveu no Criador, no mesmo dia). Nenhuma das panes de Afiliados sabe que `sessions` existe. 🔴 Não é condicional: mostra sempre um dia real, o que mata de uma vez a grade refluindo 100%↔60% a cada clique e os 40% de tela gastos com 'Clique num dia para ver detalhes' em itálico cinza."
        >
          <Case label="Dia cheio — sessão do Criador + 3 eventos">
            <PaneFrame width={430}>
              <DayPane
                iso="2026-08-05"
                events={EVENTS}
                sessions={SESSIONS}
                athletes={ATHLETES}
                locs={LOCS}
                gymSessions={[SESSION]}
                evs={[EV_AULA_DONE, EV_PERS, EV_NOAFF]}
                BLOCK_C={BLOCK_C}
                openForm={NOOP}
                toggleStatus={NOOP}
                requestDelete={NOOP}
                copyLastEvent={NOOP}
                onEditSession={NOOP}
                onLogResult={NOOP}
              />
            </PaneFrame>
          </Case>
          <Case label="Dia vazio — o convite à ação mora onde ele é acionável">
            <PaneFrame width={430}>
              <DayPane
                iso="2026-09-01"
                events={{}}
                sessions={{}}
                athletes={ATHLETES}
                locs={LOCS}
                gymSessions={[]}
                evs={[]}
                BLOCK_C={BLOCK_C}
                openForm={NOOP}
                toggleStatus={NOOP}
                requestDelete={NOOP}
                copyLastEvent={NOOP}
                onEditSession={NOOP}
                onLogResult={NOOP}
              />
            </PaneFrame>
          </Case>
          <Case label="Tudo oculto pelo filtro — estado DIFERENTE de um dia vazio, e ele diz por quê">
            <PaneFrame width={430}>
              <DayPane
                iso="2026-08-05"
                events={EVENTS}
                sessions={{}}
                athletes={ATHLETES}
                locs={LOCS}
                gymSessions={[]}
                evs={[]}
                BLOCK_C={BLOCK_C}
                openForm={NOOP}
                toggleStatus={NOOP}
                requestDelete={NOOP}
                copyLastEvent={NOOP}
                onEditSession={NOOP}
                onLogResult={NOOP}
              />
            </PaneFrame>
          </Case>
        </Section>
      ),
    },
  ],
}
