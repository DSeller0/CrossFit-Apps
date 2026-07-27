import {
  WeekGrid,
  DaySessionCard,
  DayRanking,
  BoxWarnings,
  MobileWarning,
} from '../../index/rail.jsx'
import { getWeek, toISO } from '../../lib/week.js'
import { Case, Section } from '../harness.jsx'
import { NOOP } from '../fixtures.js'

// ── Mock fixtures — index/ pieces (#53) ──
// Sessions on Mon–Fri of the current week so WeekGrid shows names/dots; today is whatever it is.
const idxWeek = getWeek(0)
const idxNames = ['', 'Treino A', 'Treino B', 'Treino C', 'Treino A', 'Treino A', '']
const idxSessions = Object.fromEntries(
  [1, 2, 3, 4, 5].map(i => [
    toISO(idxWeek[i]),
    [{ id: 's' + i, public: true, sessionName: idxNames[i] }],
  ]),
)
const idxToday = toISO(idxWeek[new Date().getDay()])
// The same week as the COACH sees it in the Criador's day strip: a second session
// on Wednesday (the count badge) and a hidden one on Saturday (which his filter
// keeps and the public one drops).
const idxSessionsCoach = {
  ...idxSessions,
  [toISO(idxWeek[3])]: [
    { id: 's3', public: true, sessionName: 'Treino C' },
    { id: 's3b', public: true, sessionName: 'Treino C · turma 2' },
  ],
  [toISO(idxWeek[6])]: [{ id: 's6', public: false, sessionName: 'Open gym' }],
}
const idxRankRows = [
  { name: 'Bruna', scale: 'RX', perf: '7:42' },
  { name: 'Léo', scale: 'RX', perf: '8:13' },
  { name: 'Ana', scale: 'Inter', perf: '9:05' },
]
const idxSess = {
  id: 's-today',
  sessionName: 'Treino A',
  blocks: [
    {
      id: 'b1',
      type: 'Aquecimento',
      label: 'Mobilidade geral',
      exercises: [{ id: 'e1', name: 'Air Squat', sets: 2, reps: '10' }],
    },
    {
      id: 'b2',
      type: 'For Time',
      label: 'Fran',
      duration: 12,
      exercises: [
        { id: 'e2', name: 'Thruster', sets: 3, reps: '21-15-9' },
        { id: 'e3', name: 'Pull-up', sets: 3, reps: '21-15-9' },
      ],
    },
    {
      id: 'b3',
      type: 'MetCon',
      label: 'Chipper',
      exercises: [
        { id: 'e4', name: 'Burpee', reps: '50' },
        { id: 'e5', name: 'Wall Ball', reps: '40' },
      ],
    },
  ],
}
const idxWarnings = [
  {
    id: 'w1',
    date: toISO(idxWeek[6]),
    box: 'all',
    active: true,
    message: 'Sem aula 18h hoje — feriado municipal. Sexta extra amanhã às 9h.',
  },
  {
    id: 'w2',
    date: toISO(idxWeek[4]),
    box: 'all',
    active: true,
    message: 'Manutenção nos anéis — estação 3 interditada até quarta.',
  },
  {
    id: 'w3',
    date: toISO(idxWeek[2]),
    box: 'all',
    active: true,
    message: 'Nova turma 6h — a partir de segunda-feira, todos os dias.',
  },
]

export default {
  group: 'Index',
  items: [
    {
      id: 'weekgrid',
      label: 'WeekGrid',
      render: () => (
        <Section
          title="WeekGrid"
          sub="src/public/index/rail.jsx — grade da semana (começa no Dom), largura toda; cada dia mostra o nome da sessão (ou Descanso). Clicar seleciona o dia; hoje/selecionado em teal. Também é a tira de dias do Criador: dates/filter/showCount são props justamente por isso — o coach navega outras semanas, enxerga sessões ocultas e tem mais de uma sessão por dia."
        >
          <Case label="Semana atual (hoje selecionado)">
            <WeekGrid sessions={idxSessions} box={null} selectedDate={idxToday} onSelect={NOOP} />
          </Case>
          <Case label="showCount — uso do Criador (filtro do coach, sessões ocultas incluídas)">
            <WeekGrid
              sessions={idxSessionsCoach}
              box={null}
              selectedDate={idxToday}
              onSelect={NOOP}
              filter={() => true}
              showCount
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'daysessioncard',
      label: 'DaySessionCard',
      render: () => (
        <Section
          title="DaySessionCard"
          sub="src/public/index/rail.jsx — sessão do dia selecionado; blocos expansíveis (clique → ExerciseList compartilhada) e rodapé Agenda + Registrar."
        >
          <Case label="Sessão com blocos + rodapé">
            <div style={{ maxWidth: 540 }}>
              <DaySessionCard
                sess={idxSess}
                tag="◈ Sessão do dia"
                count={8}
                isFuture={false}
                box={null}
              />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'dayranking',
      label: 'DayRanking',
      render: () => (
        <Section
          title="DayRanking"
          sub="src/public/index/rail.jsx — top-3 do WOD do dia (rankResults/perfStr canônicos). Tempos em --font-mono. Estado vazio quando não há resultados."
        >
          <Case label="Com resultados">
            <div style={{ maxWidth: 340 }}>
              <DayRanking
                wodLabel="Fran · For Time"
                wodMeta="Cap 12' · 8 resultados"
                rows={idxRankRows}
                href="leaderboard.html"
              />
            </div>
          </Case>
          <Case label="Vazio (sem resultados)">
            <div style={{ maxWidth: 340 }}>
              <DayRanking rows={[]} href="leaderboard.html" />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'boxwarnings',
      label: 'BoxWarnings',
      render: () => (
        <Section
          title="BoxWarnings"
          sub="src/public/index/rail.jsx — faixa de até 3 avisos recentes com data (desktop); MobileWarning mostra só o mais recente. Coach define em settings.boxWarnings via Criador."
        >
          <Case label="Desktop — 3 avisos datados">
            <BoxWarnings warnings={idxWarnings} />
          </Case>
          <Case label="Mobile — só o mais recente">
            <div style={{ maxWidth: 360 }}>
              <MobileWarning warning={idxWarnings[0]} />
            </div>
          </Case>
        </Section>
      ),
    },
  ],
}
