import { useState } from 'react'
import { Case, Section } from '../harness.jsx'
import { FIXED_WEEK, exStandard, exComplex } from '../fixtures.js'
import { toISO } from '../../lib/week.js'
import DatePicker from '../../../components/tabs/tv/DatePicker.jsx'
import ClassPanel from '../../../components/tabs/tv/ClassPanel.jsx'
import GroupsPanel from '../../../components/tabs/tv/GroupsPanel.jsx'
import { WodSlide, TimerSlide, ResultsSlide, QrSlide } from '../../tv/slides.jsx'

// ── TV group (#174/plans/86) ──
// TvController.jsx / TV.jsx are the client boundary (a direct Supabase import, plus
// 4 of TvController's 5 hooks reach one transitively) and cannot render here. Everything
// below is the client-free half this pass extracted or audited for exactly that: the
// week strip (DatePicker, newly pulled out of TvController.jsx), the roster + rotation
// panels (ClassPanel/GroupsPanel — every write already arrived as a prop), and the four
// wall slides (slides.jsx). All are props-in; state is either local to the component
// (the accordion, the roster edit row) or owned by these demo wrappers.

const SEL_DATE = toISO(FIXED_WEEK[3])
const SESSIONS_WITH_DOTS = {
  [toISO(FIXED_WEEK[1])]: [{ id: 's1' }],
  [SEL_DATE]: [{ id: 's2' }],
  [toISO(FIXED_WEEK[5])]: [{ id: 's3' }],
}

function DatePickerDemo() {
  const [sel, setSel] = useState(SEL_DATE)
  return <DatePicker selDate={sel} sessions={SESSIONS_WITH_DOTS} onChange={setSel} />
}

// ── ClassPanel fixtures ──
const cpAthletes = [
  { id: 'a1', name: 'Rafael Souza' },
  { id: 'a2', name: 'Camila Rocha' },
  { id: 'a3', name: 'Bruno Alves' },
]
const cpActiveClass = {
  id: 'c-active',
  class_label: '18h',
  athlete_ids: ['a1', 'a2', 'a3'],
  anon_names: ['Visitante'],
}
const cpEndedClass = { ...cpActiveClass, id: 'c-ended', class_label: '7h' }
const cpResults = [
  {
    athleteId: 'a1',
    blocks: [{ blockId: 'b1', scale: 'RX', perfTime: '9:42' }],
  },
]
// registerLive/editLive/removeLive resolve synchronously here (no Supabase round-trip
// to await), which is what makes the roster's inline edit/remove actually work in the
// gallery instead of just rendering their static "before" state.
function useDemoLiveReg(initialResults) {
  const [results, setResults] = useState(initialResults)
  const [liveScales, setLiveScales] = useState({})
  return {
    liveScales,
    setLiveScales,
    liveOverride: {},
    registerLive: (m, scale) =>
      setResults(prev => [
        ...prev.filter(r => r.athleteId !== m.id),
        { athleteId: m.id, blocks: [{ blockId: 'b1', scale, perfTime: '' }] },
      ]),
    editLive: (m, draft) =>
      setResults(prev =>
        prev.map(r =>
          r.athleteId === m.id
            ? { ...r, blocks: [{ blockId: 'b1', scale: draft.scale, perfTime: draft.perfTime }] }
            : r,
        ),
      ),
    removeLive: m => setResults(prev => prev.filter(r => r.athleteId !== m.id)),
    results,
  }
}

function ClassPanelDemo({ todayClasses, activeClass, initialResults = cpResults }) {
  const { results, ...liveReg } = useDemoLiveReg(initialResults)
  const [classLabel, setClassLabel] = useState('')
  return (
    <ClassPanel
      tv={null}
      selSessId="s1"
      todayClasses={todayClasses}
      activeClass={activeClass}
      athletes={cpAthletes}
      results={results}
      activeBlockId="b1"
      timerType="For Time"
      timerRun={false}
      classLabel={classLabel}
      setClassLabel={setClassLabel}
      startClass={() => {}}
      endClass={() => {}}
      liveReg={liveReg}
    />
  )
}

// ── GroupsPanel fixtures ──
const gpWodBlocks = [
  { id: 'b1', type: 'For Time', label: 'WOD' },
  { id: 'b2', type: 'Força', label: 'Força' },
]
const gpGroups = [
  { id: 'g1', name: 'Grupo A', color: '#4ac8c0', athleteIds: ['a1'], anonNames: [] },
  { id: 'g2', name: 'Grupo B', color: '#d8a840', athleteIds: ['a2'], anonNames: ['Visitante'] },
]

function GroupsPanelDemo({ groups: initialGroups }) {
  const [groups, setGroups] = useState(initialGroups)
  const [groupPositions, setGroupPositions] = useState({})
  const [rotationBlockIds, setRotationBlockIds] = useState([])
  const [restSecs, setRestSecs] = useState(60)
  const [autoAdvance, setAutoAdvance] = useState(false)
  return (
    <GroupsPanel
      activeClass={cpActiveClass}
      groups={groups}
      wodBlocks={gpWodBlocks}
      rotationBlockIds={rotationBlockIds}
      groupPositions={groupPositions}
      restSecs={restSecs}
      autoAdvance={autoAdvance}
      setAutoAdvance={setAutoAdvance}
      athletes={cpAthletes}
      createGroups={n =>
        setGroups(
          Array.from({ length: n }, (_, i) => ({
            id: `g${i + 1}`,
            name: `Grupo ${String.fromCharCode(65 + i)}`,
            color: ['#4ac8c0', '#d8a840', '#fa3c3c', '#18cc30'][i % 4],
            athleteIds: [],
            anonNames: [],
          })),
        )
      }
      dissolveGroups={() => setGroups([])}
      setGroupBlock={(gid, bid) => setGroupPositions(p => ({ ...p, [gid]: bid }))}
      reassignMember={(m, gid) =>
        setGroups(prev =>
          prev.map(g => {
            const key = m.type === 'real' ? 'athleteIds' : 'anonNames'
            const val = m.type === 'real' ? m.id : m.name
            const already = (g[key] || []).includes(val)
            if (g.id === gid) return { ...g, [key]: already ? g[key] : [...(g[key] || []), val] }
            return { ...g, [key]: (g[key] || []).filter(x => x !== val) }
          }),
        )
      }
      advanceAll={() => {}}
      toggleRotationBlock={bid =>
        setRotationBlockIds(prev =>
          prev.includes(bid) ? prev.filter(x => x !== bid) : [...prev, bid],
        )
      }
      push={patch => {
        if ('rotation_rest_secs' in patch) setRestSecs(patch.rotation_rest_secs)
      }}
    />
  )
}

// ── Wall slides — TV.jsx renders these onto a fixed 1920×1080 canvas and scales it
// to fill the screen; the gallery reproduces that exact box at a fixed 0.32 scale
// instead of the real "fill the window" logic, so every card is the same size. ──
const DV_W = 1920,
  DV_H = 1080,
  GALLERY_SCALE = 0.32
function TvCanvas({ children }) {
  return (
    <div
      style={{
        width: DV_W * GALLERY_SCALE,
        height: DV_H * GALLERY_SCALE,
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid var(--divider)',
        background: '#000',
      }}
    >
      <div
        style={{
          width: DV_W,
          height: DV_H,
          transform: `scale(${GALLERY_SCALE})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}

const slideSess = {
  id: 's1',
  sessionName: 'Treino do dia',
  date: SEL_DATE,
  blocks: [
    { id: 'b1', type: 'For Time', label: 'WOD', duration: '12', exercises: [exStandard] },
    { id: 'b2', type: 'Força', label: 'Força', exercises: [exComplex] },
  ],
}
const slideSessions = { [SEL_DATE]: [slideSess] }
const slideAthletes = cpAthletes
const tvBlank = { slide: 'blank', date_key: SEL_DATE, session_id: 's1', show_qr: true }
const tvWod = { ...tvBlank, slide: 'wod' }
// A For Time block 1:35 into a 12:00 cap, expressed as PAUSED elapsed rather than a start
// timestamp (#200). slides.jsx's `elapsedSecs` computes `Date.now() - timer_started_at`, so
// ANY started_at — even a fixed one — makes the SSR'd ring read the wall clock: the card's
// stroke-dashoffset changed on every `design:cards` run, and a fixed epoch would have been
// worse (years of "elapsed" flips the slide to TIME!). `timer_paused_elapsed` is read as-is,
// and TimerSlide draws paused and running identically — only the live 250ms tick differs,
// and SSR never runs effects.
const tvTimerAt95s = {
  ...tvBlank,
  slide: 'timer',
  timer_block_id: 'b1',
  timer_type: 'For Time',
  timer_cap_secs: 720,
  timer_started_at: null,
  timer_paused_elapsed: 95,
}
const tvResults = { ...tvBlank, slide: 'results' }
const tvQr = { ...tvBlank, slide: 'qr', class_id: 'c-active' }
const slideResults = [
  {
    id: 'r1',
    athleteId: 'a1',
    sessionId: 's1',
    blocks: [{ blockId: 'b1', scale: 'RX', perfTime: '9:42' }],
  },
  {
    id: 'r2',
    athleteId: 'a2',
    sessionId: 's1',
    blocks: [{ blockId: 'b1', scale: 'RX', perfTime: '10:15' }],
  },
  {
    id: 'r3',
    athleteId: 'a3',
    sessionId: 's1',
    blocks: [{ blockId: 'b1', scale: 'Inter', perfTime: '11:03' }],
  },
]

export default {
  group: 'TV',
  items: [
    {
      id: 'tv-datepicker',
      label: 'DatePicker',
      render: () => (
        <Section
          title="DatePicker"
          sub="src/components/tabs/tv/DatePicker.jsx — a semana Sunday-start do topo do Quadro ao Vivo. Extraído de TvController.jsx (#174/plans/86): era o pior buraco de teclado do app (4 dos 5 click-div convertidos por essa pass viviam aqui)."
        >
          <Case label="Interativo — clique num dia, ‹ › trocam de semana (teclado: Tab + Enter/Espaço)">
            <div style={{ maxWidth: 640 }}>
              <DatePickerDemo />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'tv-classpanel',
      label: 'ClassPanel',
      render: () => (
        <Section
          title="ClassPanel"
          sub="src/components/tabs/tv/ClassPanel.jsx — a Aula ativa + roster mesclado (real + convidado). Client-free: toda escrita chega via a prop liveReg. O acordeão usa o mesmo contrato de shared/AccordionCard (role=button + onKeyDown) porque o cabeçalho contém um <button> (Encerrar) e não pode virar um."
        >
          <Case label="Nenhuma aula hoje ainda (vazio)">
            <ClassPanelDemo todayClasses={[]} activeClass={null} initialResults={[]} />
          </Case>
          <Case label="Aula ativa — roster misto (registrado, pendente, convidado). Editar/Remover funcionam de verdade">
            <ClassPanelDemo todayClasses={[cpActiveClass]} activeClass={cpActiveClass} />
          </Case>
          <Case label="Aula encerrada — mesmo acordeão, roster só-leitura (canRegister=false)">
            <ClassPanelDemo todayClasses={[cpEndedClass]} activeClass={null} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'tv-groupspanel',
      label: 'GroupsPanel',
      render: () => (
        <Section
          title="GroupsPanel"
          sub="src/components/tabs/tv/GroupsPanel.jsx — divide a turma em grupos para rotação de blocos durante uma aula. Retorna null sem activeClass (o fixture abaixo sempre fornece um)."
        >
          <Case label="Sem grupos — prompt de criação (2/3/4 grupos)">
            <GroupsPanelDemo groups={[]} />
          </Case>
          <Case label="Grupos criados — atribuição de atletas + rotação + descanso">
            <GroupsPanelDemo groups={gpGroups} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'tv-slides',
      label: 'Slides (parede)',
      render: () => (
        <Section
          title="Slides (parede)"
          sub="src/public/tv/slides.jsx — os 4 slides que TV.jsx alterna via tv_state.slide, renderizados aqui na mesma caixa 1920×1080 que a parede real usa, só que numa escala fixa (0.32) em vez de 'preencher a janela'."
        >
          <Case label="WOD">
            <TvCanvas>
              <WodSlide
                sessions={slideSessions}
                tv={tvWod}
                gymName="Cone"
                classExecs={[]}
                athletes={slideAthletes}
              />
            </TvCanvas>
          </Case>
          <Case label="Timer — For Time em 1:35 de 12:00 (relógio fixo, não corre)">
            <TvCanvas>
              <TimerSlide
                tv={tvTimerAt95s}
                sessions={slideSessions}
                classExecs={[]}
                athletes={slideAthletes}
              />
            </TvCanvas>
          </Case>
          <Case label="Resultados">
            <TvCanvas>
              <ResultsSlide
                tv={tvResults}
                sessions={slideSessions}
                athletes={slideAthletes}
                results={slideResults}
                classExecs={[]}
              />
            </TvCanvas>
          </Case>
          <Case label="QR — gera um código real (pacote qrcode, sem rede)">
            <TvCanvas>
              <QrSlide tv={tvQr} />
            </TvCanvas>
          </Case>
        </Section>
      ),
    },
  ],
}
