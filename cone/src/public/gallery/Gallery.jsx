import { useState } from 'react'
import { ExerciseList } from '../shared/ExerciseList.jsx'
import RankList from '../shared/RankList.jsx'
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
const logPaneBlockForm  = [{ blockId: 'b1', blockLabel: 'For Time', blockType: 'For Time', rpe: 7, scale: 'RX', perfTime: '', perfRounds: '', perfReps: '' }]
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
const rcBlFT    = { id: 'rcb1', type: 'For Time' }
const rcBlFTCap = { id: 'rcb2', type: 'For Time', rounds: 5 } // exposes the DNF rounds field
const rcBlAmrap = { id: 'rcb3', type: 'AMRAP', duration: '20' }

const rcInpEmpty = { rpe: 7, scale: 'RX', perfTime: '', perfRounds: '', perfReps: '' }
const rcInpDone  = { rpe: 9, scale: 'Inter', perfTime: '11:24', perfRounds: '', perfReps: '' }
const rcInpAmrap = { rpe: 8, scale: 'RX', perfTime: '', perfRounds: '9', perfReps: '12' }

const rcBrFT    = { blockId: 'rcb1', rpe: 8, scale: 'RX', perfTime: '10:32' }
const rcBrDNF   = { blockId: 'rcb2', rpe: 9, scale: 'Inter', perfRounds: '4' }
const rcBrAmrap = { blockId: 'rcb3', rpe: 7, scale: 'SC', perfRounds: '9', perfReps: '12' }

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
const GROUPS = [
  {
    group: 'Shared',
    items: [
      {
        id: 'exerciselist',
        label: 'ExerciseList',
        render: () => (
          <Section title="ExerciseList" sub="src/public/shared/ExerciseList.jsx — read-only, compartilhado (TV + schedule)">
            <Case label="Matriz completa · compact"><ExerciseList exercises={FULL_LIST} color={AMBER} /></Case>
            <Case label="Padrão · pct"><ExerciseList exercises={[exStandard]} color={BLUE} /></Case>
            <Case label="Esquema 21-15-9 · gender"><ExerciseList exercises={[exScheme]} color={RED} /></Case>
            <Case label="Progressão"><ExerciseList exercises={[exProg]} color={BLUE} /></Case>
            <Case label="Complexo"><ExerciseList exercises={[exComplex]} color={BLUE} /></Case>
            <Case label="Distância m / cal + cardio legado"><ExerciseList exercises={[exDist, exCal, exCardio]} color={GREEN} /></Case>
            <Case label="Nome longo (overflow)"><ExerciseList exercises={[exLong]} color={AMBER} /></Case>
            <Case label="Só nota (sem volume)"><ExerciseList exercises={[exNoteOnly]} color={GREEN} /></Case>
            <Case label="Vazio"><ExerciseList exercises={[]} color={AMBER} /></Case>
            <Case label="size='large' (TV)"><ExerciseList exercises={[exStandard, exComplex]} color={AMBER} size="large" /></Case>
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
            <Case label="Expandido (corpo via children)">
              <SessionCard sess={rcSess} dk="2026-07-12" isExpanded onToggle={NOOP} hasAthlete
                summary={cardSummary(rlFT, 'For Time', 'a3')}>
                <div style={{ padding: '8px 10px', borderTop: '1px solid var(--divider)' }}>
                  <KpiGrid kpis={calcKpis(rlFT, 'For Time')} btype="For Time" />
                  <LoggedResult br={rcBrFT} btype="For Time" onEdit={NOOP} />
                </div>
              </SessionCard>
            </Case>
          </Section>
        ),
      },
      {
        id: 'kpigrid',
        label: 'KpiGrid',
        render: () => (
          <Section title="KpiGrid" sub="src/public/results/KpiGrid.jsx — uma grade, duas densidades (compact = cartão mobile; extended = painel desktop, com a divisão por escala)">
            <Case label="compact · For Time"><KpiGrid kpis={calcKpis(rlFT, 'For Time')} btype="For Time" /></Case>
            <Case label="compact · AMRAP"><KpiGrid kpis={calcKpis(rlAmrap, 'AMRAP')} btype="AMRAP" /></Case>
            <Case label="compact · zero resultados"><KpiGrid kpis={calcKpis([], 'For Time')} btype="For Time" /></Case>
            <Case label="extended · For Time"><KpiGrid kpis={calcKpis(rlFT, 'For Time', 'extended')} btype="For Time" variant="extended" /></Case>
            <Case label="extended · AMRAP"><KpiGrid kpis={calcKpis(rlAmrap, 'AMRAP', 'extended')} btype="AMRAP" variant="extended" /></Case>
            <Case label="extended · zero resultados"><KpiGrid kpis={calcKpis([], 'For Time', 'extended')} btype="For Time" variant="extended" /></Case>
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
          <Section title="LogForm" sub="src/public/results/LogForm.jsx — formulário de registro/edição de um bloco (mesmos campos, mesma etapa de confirmação; muda só a afordância)">
            <Case label="Criar · For Time"><LogForm bl={rcBlFT} inp={rcInpEmpty} isSubmitting={false} onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} /></Case>
            <Case label="Criar · For Time com CAP (campo de rounds DNF)"><LogForm bl={rcBlFTCap} inp={rcInpEmpty} isSubmitting={false} onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} /></Case>
            <Case label="Criar · AMRAP (rounds + reps)"><LogForm bl={rcBlAmrap} inp={rcInpAmrap} isSubmitting={false} onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} /></Case>
            <Case label="Editar · preenchido + Cancelar"><LogForm bl={rcBlFT} inp={rcInpDone} isSubmitting={false} mode="edit" onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} onCancel={NOOP} /></Case>
            <Case label="Enviando"><LogForm bl={rcBlFT} inp={rcInpDone} isSubmitting onRpe={NOOP} onScale={NOOP} onField={NOOP} onSubmit={NOOP} /></Case>
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
              <DeskRegPane regBl={deskRegBlFixture} step="form" scale="RX" rpe={7} perfTime="" perfRounds="" perfReps="" athName="Bruna"
                onScale={NOOP} onRpe={NOOP} onPerfTime={NOOP} onPerfRounds={NOOP} onPerfReps={NOOP}
                onConfirm={NOOP} onSubmit={NOOP} onBack={NOOP} onClose={NOOP} submitting={false} error="" />
            </Case>
            <Case label="Formulário · AMRAP (rounds/reps + dica)">
              <DeskRegPane regBl={deskRegBlAmrap} step="form" scale="RX" rpe={7} perfTime="" perfRounds="" perfReps="" athName="Bruna"
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
