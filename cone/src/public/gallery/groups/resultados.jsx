import { useState } from 'react'
import WeekRail from '../../../components/tabs/resultados/WeekRail.jsx'
import SessionCard from '../../../components/tabs/resultados/SessionCard.jsx'
import ClassHeader from '../../../components/tabs/resultados/ClassHeader.jsx'
import SessionKpis from '../../../components/tabs/resultados/SessionKpis.jsx'
import AthleteRow from '../../../components/tabs/resultados/AthleteRow.jsx'
import AthleteRoster from '../../../components/tabs/resultados/AthleteRoster.jsx'
import BlockLogCard from '../../../components/tabs/resultados/BlockLogCard.jsx'
import LogForm from '../../../components/tabs/resultados/LogForm.jsx'
import ResultHistoryCard from '../../../components/tabs/atletas/ResultHistoryCard.jsx'
import { calcSessionKPIs } from '../../../components/tabs/resultados/resultadosHelpers.js'
import { resultKpis, resultHistory } from '../../../components/tabs/atletas/atletasHelpers.js'
import { Case, Section } from '../harness.jsx'
import { NOOP } from '../fixtures.js'

// #57/plans/80 · C3 (mockup 61) — Resultados as ONE surface. The sub-tab bar is gone:
// Histórico's "Por atleta" half became the Atletas ficha Card at the bottom of this file,
// its "Por sessão" half became ClassHeader/SessionKpis, and Leaderboard was deleted in
// Phase 0 as a second copy of leaderboard.html.
//
// Client-free throughout — the container (RegistroView) owns loadResults/loadAthletes and
// every write; everything here arrives as props.
//
// Every date is a FIXED week (August 2026), never `new Date()`: the design cards are SSR'd
// once and must render the same week on every regeneration.

const ATHLETES = [
  { id: 'a1', name: 'Marina Souza', color: '#4ac8c0', level: 'Avançado' },
  { id: 'a2', name: 'Rafael Marinho', color: '#e87820', level: 'Intermediário' },
  { id: 'a3', name: 'Bruno Teixeira', color: '#9070d8', level: 'Iniciante' },
  { id: 'a4', name: 'Carla Pinto', color: '#60a840', level: 'Iniciante' },
]

const FRAN = {
  id: 'b1',
  type: 'For Time',
  label: 'Fran',
  rounds: 3,
  exercises: [
    { id: 'e1', name: 'Thruster', reps: '21-15-9', intensity: { mode: 'pct', pct: 43 } },
    { id: 'e2', name: 'Pull-up', reps: '21-15-9' },
  ],
}
const EMOM = {
  id: 'b2',
  type: 'EMOM',
  label: 'EMOM 12',
  duration: 12,
  exercises: [{ id: 'e3', name: 'Clean', reps: '3' }],
}
const FORCA = {
  id: 'b3',
  type: 'Força',
  label: 'Back Squat',
  exercises: [{ id: 'e4', name: 'Back Squat', sets: 5, reps: '5' }],
}
const SESSION = { id: 's1', mainTraining: 'WOD A · Fran retest', blocks: [FRAN, EMOM, FORCA] }

const ENTRY = (over = {}) => ({
  blockId: 'b1',
  blockType: 'For Time',
  blockLabel: 'Fran',
  rpe: null,
  scale: null,
  perfTime: '',
  perfRounds: '',
  perfReps: '',
  finished: null,
  checkpoint: null,
  exerciseRows: null,
  skipped: null,
  ...over,
})

const RESULTS = [
  {
    id: 'r1',
    date: '2026-08-21',
    sessionId: 's1',
    athleteId: 'a1',
    presence: 'Presente',
    energyLevel: 4,
    blocks: [
      { blockId: 'b1', blockType: 'For Time', scale: 'RX', rpe: 8, perfTime: '4:12' },
      { blockId: 'b2', blockType: 'EMOM', scale: 'RX', rpe: 7, perfRounds: '12' },
    ],
  },
  {
    id: 'r2',
    date: '2026-08-21',
    sessionId: 's1',
    athleteId: 'a3',
    presence: 'Ausente',
    blocks: [],
  },
  {
    id: 'r3',
    date: '2026-08-19',
    sessionId: 's1',
    athleteId: 'a1',
    presence: 'Presente',
    flagForReview: true,
    coachNote: 'ombro travando no overhead',
    blocks: [
      { blockId: 'b1', blockType: 'For Time', scale: 'Inter', rpe: 9, perfRounds: '2' },
      { blockId: 'b2', blockType: 'EMOM', skipped: true },
    ],
  },
]

const KPIS = calcSessionKPIs('2026-08-21', RESULTS, 's1')

const D = (y, m, d) => new Date(y, m, d)
const WEEK_DAYS = [
  { date: D(2026, 7, 16), dk: '2026-08-16', daySessions: [] },
  {
    date: D(2026, 7, 17),
    dk: '2026-08-17',
    daySessions: [{ key: '2026-08-17|s0', name: 'Turma 19h', session: { id: 's0' } }],
  },
  { date: D(2026, 7, 18), dk: '2026-08-18', daySessions: [] },
  {
    date: D(2026, 7, 19),
    dk: '2026-08-19',
    daySessions: [{ key: '2026-08-19|s1', name: 'WOD A · Fran retest', session: SESSION }],
  },
  { date: D(2026, 7, 20), dk: '2026-08-20', daySessions: [] },
  { date: D(2026, 7, 21), dk: '2026-08-21', daySessions: [] },
  { date: D(2026, 7, 22), dk: '2026-08-22', daySessions: [] },
]
const EMPTY_WEEK = WEEK_DAYS.map(d => ({ ...d, daySessions: [] }))

const RAIL_PROPS = {
  monthLabel: 'Agosto 2026',
  weeks: [{}, {}, {}],
  weekLabels: ['2–8', '9–15', '16–22'],
  selWeekIdx: 2,
  viewMonth: 7,
  selKey: '2026-08-19|s1',
  todayKey: '2026-08-19',
  progressFor: (dk, sess) =>
    sess?.id === 's1' ? { logged: 2, total: 4, pct: 50 } : { logged: 0, total: 4, pct: 0 },
  onPrevMonth: NOOP,
  onNextMonth: NOOP,
  onToday: NOOP,
  onSelectWeek: NOOP,
  onSelectSession: NOOP,
}

function RailFrame({ children }) {
  return (
    <div style={{ width: 260, border: '1px solid var(--divider)', background: 'var(--stone)' }}>
      {children}
    </div>
  )
}
function PaneFrame({ children, width = 720 }) {
  return (
    <div style={{ width, border: '1px solid var(--divider)', background: 'var(--stone)' }}>
      {children}
    </div>
  )
}

// A live block card so the #157 toggle can actually be exercised in the gallery.
function BlockDemo({ block, initial }) {
  const [entry, setEntry] = useState(initial)
  return (
    <PaneFrame width={560}>
      <div style={{ padding: 12 }}>
        <BlockLogCard
          entry={entry}
          block={block}
          index={0}
          total={3}
          onChange={patch => setEntry(e => ({ ...e, ...patch }))}
        />
      </div>
    </PaneFrame>
  )
}

const FORM_PROPS = {
  presence: 'Presente',
  energyLevel: 3,
  coachNote: '',
  showNote: false,
  flag: false,
  session: SESSION,
  hasResult: false,
  hasNext: true,
  onPresence: NOOP,
  onEnergy: NOOP,
  onBlockChange: NOOP,
  onNote: NOOP,
  onToggleNote: NOOP,
  onToggleFlag: NOOP,
  onSave: NOOP,
  onSaveNext: NOOP,
  onDelete: NOOP,
}

const HISTORY = resultHistory(
  RESULTS.filter(r => r.athleteId === 'a1'),
  { '2026-08-21': [SESSION], '2026-08-19': [SESSION] },
  sess => sess.mainTraining,
)
const HISTORY_KPIS = resultKpis(RESULTS.filter(r => r.athleteId === 'a1'))

export default {
  group: 'Resultados',
  items: [
    {
      id: 'res-weekrail',
      label: 'WeekRail',
      render: () => (
        <Section
          title="WeekRail"
          sub="tabs/resultados/WeekRail.jsx — a trilha da semana. Cada sessão carrega o SEU progresso (TallyBar + 5/12): antes disso o único sinal de progresso em toda a aba era a string `3/12 reg.`, então 'qual turma ainda falta registrar' era uma pergunta que se respondia clicando. As setas ‹/› têm nome acessível (#169) e o card de sessão é um <button> de verdade, não um div clicável. Uma semana vazia continua listando os sete dias com '— descanso': a ausência de sessão é informação."
        >
          <Case label="Semana com sessões">
            <RailFrame>
              <WeekRail {...RAIL_PROPS} weekDays={WEEK_DAYS} />
            </RailFrame>
          </Case>
          <Case label="Semana vazia — o estado vazio da própria trilha">
            <RailFrame>
              <WeekRail {...RAIL_PROPS} weekDays={EMPTY_WEEK} selKey={null} />
            </RailFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'res-sessioncard',
      label: 'SessionCard',
      render: () => (
        <Section
          title="SessionCard"
          sub="tabs/resultados/SessionCard.jsx — uma sessão na trilha, com progresso."
        >
          <Case label="Não iniciada">
            <RailFrame>
              <SessionCard name="Turma 19h" logged={0} total={12} pct={0} onSelect={NOOP} />
            </RailFrame>
          </Case>
          <Case label="Parcial + selecionada">
            <RailFrame>
              <SessionCard
                name="WOD A · Fran retest"
                logged={5}
                total={12}
                pct={42}
                selected
                onSelect={NOOP}
              />
            </RailFrame>
          </Case>
          <Case label="Completa — o contador vira accent">
            <RailFrame>
              <SessionCard name="Turma 07h" logged={10} total={10} pct={100} onSelect={NOOP} />
            </RailFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'res-classheader',
      label: 'ClassHeader',
      render: () => (
        <Section
          title="ClassHeader"
          sub="tabs/resultados/ClassHeader.jsx — UM elemento que cresce, nunca uma grade de KPIs vazia. Com 0 registros seriam quatro azulejos em branco exatamente no momento em que o usuário quer começar a digitar; então: uma linha + barra de progresso sem dado → a corrida inline RPE · RX% · flags com dado → o painel de quatro KPIs sob disclosure. Os quatro KPIs são os da sub-aba 'Por sessão' aposentada."
        >
          <Case label="Sem dado — 0 de 4 registrados">
            <PaneFrame>
              <ClassHeader
                sessionName="Turma 19h"
                dateLabel="quinta-feira, 21 de agosto"
                logged={0}
                total={4}
                pct={0}
                kpis={null}
                expanded={false}
                onToggle={NOOP}
              />
            </PaneFrame>
          </Case>
          <Case label="Com dado, recolhido">
            <PaneFrame>
              <ClassHeader
                sessionName="WOD A · Fran retest"
                dateLabel="quinta-feira, 21 de agosto"
                logged={2}
                total={4}
                pct={50}
                kpis={KPIS}
                expanded={false}
                onToggle={NOOP}
              />
            </PaneFrame>
          </Case>
          <Case label="Com dado, expandido — o antigo painel 'Por sessão', no lugar">
            <PaneFrame>
              <ClassHeader
                sessionName="WOD A · Fran retest"
                dateLabel="quinta-feira, 21 de agosto"
                logged={4}
                total={4}
                pct={100}
                kpis={KPIS}
                expanded
                onToggle={NOOP}
              />
            </PaneFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'res-sessionkpis',
      label: 'SessionKpis',
      render: () => (
        <Section
          title="SessionKpis"
          sub="tabs/resultados/SessionKpis.jsx — a leitura da turma. Distribuição é uma barra empilhada real em SCALE_COL canônico (RX teal · Inter laranja · SC violeta · Adaptado cinza-quente) — é aqui que morre a QUARTA paleta divergente da SPA, que pintava RX verde / Inter azul / SC âmbar. Sem escala registrada, rxPct é null e não 0%: '0% RX' afirma 'registrado, tudo escalado', que é outra coisa."
        >
          <Case label="Com dado">
            <PaneFrame>
              <SessionKpis kpis={KPIS} />
            </PaneFrame>
          </Case>
          <Case label="Sem escala registrada — traço, nunca 0%">
            <PaneFrame>
              <SessionKpis
                kpis={{
                  avgRpe: null,
                  rxPct: null,
                  scaleDist: { RX: 0, Inter: 0, SC: 0, Adaptado: 0 },
                  scaleTotal: 0,
                  flags: 0,
                  count: 2,
                }}
              />
            </PaneFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'res-athleterow',
      label: 'AthleteRow',
      render: () => (
        <Section
          title="AthleteRow"
          sub="tabs/resultados/AthleteRow.jsx — QUATRO estados, uma casca. Antes eram dois componentes com duas linguagens visuais (rp-ath-row vs rp-add-item) e o atleta saltava de uma para a outra ao salvar. A linha é um <button> de verdade (#169). O ponto e a etiqueta de nível carregam a cor de identidade do ATLETA via color-mix — o tratamento do C2 —, por isso LEVEL_CLS e .lv-* foram deletados em vez de tokenizados. A pílula de escala usa o tratamento canônico da RankList (sem preenchimento, borda em currentColor): um preenchimento color-mix apaga o rótulo nos dois temas claros."
        >
          <Case label="Não registrado — [Ausente] é escrita de um clique">
            <PaneFrame width={560}>
              <div style={{ padding: 10 }}>
                <AthleteRow athlete={ATHLETES[3]} onOpen={NOOP} onMarkAbsent={NOOP} />
              </div>
            </PaneFrame>
          </Case>
          <Case label="Registrado — resumo em perfStr canônico">
            <PaneFrame width={560}>
              <div style={{ padding: 10 }}>
                <AthleteRow
                  athlete={ATHLETES[0]}
                  summary="4:12 · RPE 8"
                  scale="RX"
                  onOpen={NOOP}
                  onDelete={NOOP}
                />
              </div>
            </PaneFrame>
          </Case>
          <Case label="Registrado com DNF + flag — nunca um traço">
            <PaneFrame width={560}>
              <div style={{ padding: 10 }}>
                <AthleteRow
                  athlete={ATHLETES[1]}
                  summary="2 rds (DNF) · RPE 9 · 1 não fez"
                  scale="Inter"
                  flagged
                  onOpen={NOOP}
                  onDelete={NOOP}
                />
              </div>
            </PaneFrame>
          </Case>
          <Case label="Ausente — ponto vazado, nunca abre formulário">
            <PaneFrame width={560}>
              <div style={{ padding: 10 }}>
                <AthleteRow
                  athlete={ATHLETES[2]}
                  summary="Ausente"
                  absent
                  onOpen={NOOP}
                  onDelete={NOOP}
                />
              </div>
            </PaneFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'res-blocklogcard',
      label: 'BlockLogCard · #157',
      render: () => (
        <Section
          title="BlockLogCard"
          sub={
            'tabs/resultados/BlockLogCard.jsx — os campos são o ScoreFields COMPOSTO (#115), Escala → RPE → nota, aposentando a barra de RPE de 10 segmentos com rampa rgb() inline. O toggle "não fez" (#157) fica no CABEÇALHO: o que ele muda é o que o bloco É, não qual é a nota. Ligado, os campos são REMOVIDOS e não desabilitados — um "RPE —" cinza ainda afirma que o campo foi considerado — e o card fica tracejado + mudo, lendo como deliberadamente vazio. Nada fabrica escala ou RPE (#61a). Os dois primeiros são interativos: clique em "não fez".'
          }
        >
          <Case label="Vazio (interativo — clique em 'não fez')">
            <BlockDemo block={FRAN} initial={ENTRY()} />
          </Case>
          <Case label="Preenchido (interativo)">
            <BlockDemo block={FRAN} initial={ENTRY({ scale: 'RX', rpe: 8, perfTime: '04:12' })} />
          </Case>
          <Case label="Não fez — tracejado, corpo mudo, sem campos">
            <BlockDemo
              block={EMOM}
              initial={ENTRY({
                blockId: 'b2',
                blockType: 'EMOM',
                blockLabel: 'EMOM 12',
                skipped: true,
              })}
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'res-logform',
      label: 'LogForm',
      render: () => (
        <Section
          title="LogForm"
          sub="tabs/resultados/LogForm.jsx — renderiza DENTRO da linha do atleta (ou na folha no mobile): a lista é o container do formulário, que é o que devolve a largura inteira ao formulário no lugar da terceira coluna de 10–13px. O gate do Salvar DIZ POR QUÊ está desabilitado — um Salvar mudo numa sessão de 3 WODs é a cara do #157, e o conserto antigo teria sido pré-selecionar uma escala, exatamente o que o #61a proíbe. 'Salvar e próximo' fecha esta linha e abre a próxima não registrada: é o laço que a aba nunca teve, e é ele que substituiu o saveFlash."
        >
          <Case label="Gate fechado — falta um bloco, e ele é nomeado">
            <PaneFrame>
              <LogForm
                {...FORM_PROPS}
                blockLogs={[
                  ENTRY({ scale: 'RX', rpe: 8, perfTime: '04:12' }),
                  ENTRY({ blockId: 'b2', blockType: 'EMOM', blockLabel: 'EMOM 12', skipped: true }),
                  ENTRY({ blockId: 'b3', blockType: 'Força', blockLabel: 'Back Squat' }),
                ]}
              />
            </PaneFrame>
          </Case>
          <Case label="Gate aberto — resolvido por 'não fez', não só por nota">
            <PaneFrame>
              <LogForm
                {...FORM_PROPS}
                hasResult
                blockLogs={[
                  ENTRY({ scale: 'RX', rpe: 8, perfTime: '04:12' }),
                  ENTRY({
                    blockId: 'b3',
                    blockType: 'Força',
                    blockLabel: 'Back Squat',
                    skipped: true,
                  }),
                ]}
              />
            </PaneFrame>
          </Case>
          <Case label="Ausente — nada a pontuar, salva direto">
            <PaneFrame>
              <LogForm {...FORM_PROPS} presence="Ausente" blockLogs={[]} hasNext={false} />
            </PaneFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'res-roster',
      label: 'AthleteRoster',
      render: () => (
        <Section
          title="AthleteRoster"
          sub="tabs/resultados/AthleteRoster.jsx — todo atleta está SEMPRE na lista. O disclosure tracejado 'Registrar atleta', que escondia a turma inteira no caso normal (ninguém registrado ainda), deixou de existir. A lista 'Resultados da turma' que o painel 'Por sessão' renderizava separado ERA esta lista — então ela se funde aqui em vez de ser duplicada. A ordem é a da turma e não muda ao salvar: uma linha nunca salta debaixo do cursor."
        >
          <Case label="Turma parcialmente registrada">
            <PaneFrame>
              <AthleteRoster
                athletes={ATHLETES}
                resultFor={id => RESULTS.find(r => r.athleteId === id && r.date === '2026-08-21')}
                openId={null}
                onOpen={NOOP}
                onClose={NOOP}
                onMarkAbsent={NOOP}
                onDelete={NOOP}
                renderForm={() => null}
              />
            </PaneFrame>
          </Case>
          <Case label="Sem atletas cadastrados">
            <PaneFrame>
              <AthleteRoster
                athletes={[]}
                resultFor={() => null}
                openId={null}
                onOpen={NOOP}
                onClose={NOOP}
                onMarkAbsent={NOOP}
                onDelete={NOOP}
                renderForm={() => null}
              />
            </PaneFrame>
          </Case>
        </Section>
      ),
    },
    {
      id: 'res-historycard',
      label: 'ResultHistoryCard (ficha)',
      render: () => (
        <Section
          title="ResultHistoryCard"
          sub="tabs/atletas/ResultHistoryCard.jsx — o Card em que a sub-aba Histórico > Por atleta se transformou. Fica na posição 4 da ficha, logo depois de 'Presença · 4 semanas': o que foi ATRIBUÍDO → se APARECEU → o que de fato FEZ. Não consome os slots reservados do #39 nem da plans/22. ⚠️ SEM Frequência: o denominador de calcKPIs.freq eram as linhas de resultado que existem (família #164), então um atleta com uma sessão registrada marcava 100%. Todo KPI degrada para travessão, nunca para 0%."
        >
          <Case label="Com dado">
            <PaneFrame width={420}>
              <div style={{ padding: 14 }}>
                <ResultHistoryCard kpis={HISTORY_KPIS} history={HISTORY} onGoToResultados={NOOP} />
              </div>
            </PaneFrame>
          </Case>
          <Case label="Sem resultado registrado — travessões, não zeros">
            <PaneFrame width={420}>
              <div style={{ padding: 14 }}>
                <ResultHistoryCard kpis={resultKpis([])} history={[]} onGoToResultados={NOOP} />
              </div>
            </PaneFrame>
          </Case>
        </Section>
      ),
    },
  ],
}
