import { useState } from 'react'
import FormatRail, { FORMATS } from '../../../components/tabs/publicador/publisher/FormatRail.jsx'
import WhenPicker from '../../../components/tabs/publicador/publisher/WhenPicker.jsx'
import OrigemCores from '../../../components/tabs/publicador/publisher/OrigemCores.jsx'
import LogoPanel from '../../../components/tabs/publicador/publisher/LogoPanel.jsx'
import TamanhoPanel from '../../../components/tabs/publicador/publisher/TamanhoPanel.jsx'
import LayoutPanel from '../../../components/tabs/publicador/publisher/LayoutPanel.jsx'
import BlocosPanel from '../../../components/tabs/publicador/publisher/BlocosPanel.jsx'
import TitulosPanel from '../../../components/tabs/publicador/publisher/TitulosPanel.jsx'
import AparenciaPanel from '../../../components/tabs/publicador/publisher/AparenciaPanel.jsx'
import PreviewPane from '../../../components/tabs/publicador/publisher/PreviewPane.jsx'
import {
  EmptyWeekState,
  NoSessionThatDayState,
  ExportErrorState,
} from '../../../components/tabs/publicador/publisher/ExportStates.jsx'
import { renderArtefact } from '../../../components/tabs/publicador/publisher/renderArtefact.jsx'
import { resolveExportPalette } from '../../../components/tabs/publicador/exportPalette.js'
import {
  ALL_WEEK_DAYS,
  distributeZones,
  zoneCollapseMessage,
} from '../../../components/tabs/publicador/layoutHelpers.js'
import {
  DEFAULT_BLOCK_TREATMENT,
  DEFAULT_BLOCK_CONTENT,
} from '../../../components/tabs/publicador/blockTreatments.js'
import { computedTitle } from '../../../components/tabs/publicador/titleHelpers.js'
import { Case, Section } from '../harness.jsx'
import { NOOP } from '../fixtures.js'

// #59 · C5·b1 (plans/82) — Publicador's new surface: one when-picker, a 5-format
// rail, a preview pane that's always the true-ratio selected artefact, and a
// 6-panel Aparência column (Origem/Cores · Logo · Tamanho · Layout · Blocos ·
// Títulos — the last 3 are #59 · C5·b2 · plans/83).
//
// CLIENT-FREE: every component here takes data as props (no Supabase, direct or
// transitive). The export-view components below (DailyExportView etc., reached
// through renderArtefact) are export-artefact palette exempt (plans/82) — they
// read `--a-*` custom properties, which this file sets literally via
// resolveExportPalette(), never `var(--accent)` — an artefact's colours must not
// shift with the gallery's own theme switcher, which is the whole point of the
// exemption.

const BOXES = [
  { id: 'b1', name: 'Eagles', color: '#4ac8c0' },
  { id: 'b2', name: 'Box Centro', color: '#e05848' },
]

const WEEK_DATES = Array.from({ length: 7 }, (_, i) => new Date(2026, 7, 30 + i)) // Sun 30/8 … Sat 5/9
const DATE_KEY = i => {
  const d = WEEK_DATES[i]
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const BLOCK = {
  id: 'bl1',
  type: 'WOD',
  label: "AMRAP 12'",
  zone: 'Zona 01',
  rounds: 5,
  duration: 12,
  exercises: [
    { id: 'e1', name: 'Burpee', sets: 3, reps: '10' },
    { id: 'e2', name: 'Pull-up', sets: 3, reps: '8' },
  ],
  notes: 'Escalar para joelho se necessário.',
}
const SESSION = { id: 's1', mainTraining: 'WOD do dia', blocks: [BLOCK] }
const SESSIONS = { [DATE_KEY(1)]: [SESSION] }
const EMPTY_SESSIONS = {}

// A 3-zone session — the one fixture that lets the Layout panel demonstrate a
// real collapse (Zona 02/03 folding into whatever the last visible column is).
const ZONED_BLOCKS = [
  { ...BLOCK, id: 'z1', zone: 'Zona 01', label: 'Força', type: 'Força' },
  {
    id: 'z2',
    zone: 'Zona 02',
    type: 'Skill',
    label: 'Skill',
    exercises: [{ id: 'e3', name: 'Handstand hold', sets: 3, reps: '30s' }],
  },
  {
    id: 'z3',
    zone: 'Zona 03',
    type: 'Cardio',
    label: 'Cardio',
    exercises: [{ id: 'e4', name: 'Row', dist: 500, distUnit: 'm' }],
  },
]
const ZONED_SESSION = { id: 's2', mainTraining: 'Sessão com 3 zonas', blocks: ZONED_BLOCKS }
const ZONED_SESSIONS = { [DATE_KEY(1)]: [ZONED_SESSION] }

const PALETTE = resolveExportPalette({ themeId: 'totk-dark' })
const PALETTE_LIGHT = resolveExportPalette({ themeId: 'totk-light' })

function ColStage({ width = 240, children }) {
  return (
    <div
      style={{
        width,
        maxWidth: '100%',
        background: 'var(--stone)',
        border: '1px solid var(--divider)',
        borderRadius: 'var(--radius-md)',
        padding: 12,
      }}
    >
      {children}
    </div>
  )
}

function ArtStage({ palette = PALETTE, w = 640, h = 360, children }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        overflow: 'hidden',
        background: palette['--a-bg'],
        border: '1px solid var(--divider)',
        transform: `scale(${Math.min(w / 1920, 1)})`,
        transformOrigin: 'top left',
      }}
    >
      <div style={{ width: 1920, ...palette }}>{children}</div>
    </div>
  )
}

/** FormatRail is a controlled radiogroup — the gallery owns the selection. */
function FormatRailDemo() {
  const [format, setFormat] = useState('semana')
  return (
    <ColStage>
      <FormatRail format={format} onSelect={setFormat} />
    </ColStage>
  )
}

function AparenciaPanelDemo({ origin: initialOrigin }) {
  const [origin, setOrigin] = useState(initialOrigin)
  const [custom, setCustom] = useState({})
  const [zoneCount, setZoneCount] = useState(3)
  const [zoneSplit, setZoneSplit] = useState('iguais')
  const [visibleDays, setVisibleDays] = useState(ALL_WEEK_DAYS)
  const [mobileModel, setMobileModel] = useState('classico')
  const [blockTreatment, setBlockTreatment] = useState(DEFAULT_BLOCK_TREATMENT)
  const [blockContent, setBlockContent] = useState(DEFAULT_BLOCK_CONTENT)
  const [gymName, setGymName] = useState('Cone')
  const [footer, setFooter] = useState('')
  const [titles, setTitles] = useState({})
  const format = 'dia'
  const palette = resolveExportPalette({
    themeId: 'totk-dark',
    custom: origin === '__custom__' ? custom : null,
  })
  const { collapsed, collapseInto } = distributeZones(ZONED_BLOCKS, zoneCount)
  return (
    <ColStage width={280}>
      <AparenciaPanel
        boxes={BOXES}
        origin={origin === 'tema' ? null : origin}
        onSelectOrigin={next => setOrigin(next === null ? 'tema' : next)}
        palette={palette}
        custom={custom}
        onCustomChange={(role, hex) => setCustom(c => ({ ...c, [role]: hex }))}
        logoInputRef={{ current: null }}
        onLogoUpload={NOOP}
        logoDataUrl={null}
        onRemoveLogo={NOOP}
        logoScale={1}
        onLogoScaleStep={NOOP}
        fontScale={1.5}
        onFontScaleStep={NOOP}
        exportScale={2}
        onExportScaleStep={NOOP}
        zoneScales={[1, 1, 1]}
        onZoneScaleStep={NOOP}
        blockTitleScales={[1, 1, 1]}
        onBlockTitleScaleStep={NOOP}
        showZoneControls
        canvasLabel="1920×1080"
        onResetDefaults={NOOP}
        format={format}
        zoneCount={zoneCount}
        onZoneCount={setZoneCount}
        zoneSplit={zoneSplit}
        onZoneSplit={setZoneSplit}
        zoneCollapseMessage={zoneCollapseMessage({ collapsed, collapseInto })}
        visibleDays={visibleDays}
        onToggleDay={i =>
          setVisibleDays(d => (d.includes(i) ? d.filter(x => x !== i) : [...d, i].sort()))
        }
        mobileModel={mobileModel}
        onMobileModel={setMobileModel}
        blockTreatment={blockTreatment}
        onBlockTreatment={setBlockTreatment}
        blockContent={blockContent}
        onToggleBlockContent={key => setBlockContent(c => ({ ...c, [key]: !c[key] }))}
        gymName={gymName}
        onGymName={setGymName}
        footer={footer}
        onFooter={setFooter}
        title={titles[format] || ''}
        onTitleChange={v => setTitles(t => ({ ...t, [format]: v }))}
        computedDefault={computedTitle(format, { date: WEEK_DATES[1] })}
      />
    </ColStage>
  )
}

/** LayoutPanel forks entirely on `format` — one interactive demo per branch. */
function LayoutPanelDemo({ format }) {
  const [zoneCount, setZoneCount] = useState(2)
  const [zoneSplit, setZoneSplit] = useState('iguais')
  const [visibleDays, setVisibleDays] = useState(ALL_WEEK_DAYS)
  const [mobileModel, setMobileModel] = useState('classico')
  const { collapsed, collapseInto } = distributeZones(ZONED_BLOCKS, zoneCount)
  return (
    <ColStage width={260}>
      <LayoutPanel
        format={format}
        zoneCount={zoneCount}
        onZoneCount={setZoneCount}
        zoneSplit={zoneSplit}
        onZoneSplit={setZoneSplit}
        zoneCollapseMessage={zoneCollapseMessage({ collapsed, collapseInto })}
        visibleDays={visibleDays}
        onToggleDay={i =>
          setVisibleDays(d => (d.includes(i) ? d.filter(x => x !== i) : [...d, i].sort()))
        }
        mobileModel={mobileModel}
        onMobileModel={setMobileModel}
      />
    </ColStage>
  )
}

function BlocosPanelDemo({ format }) {
  const [treatment, setTreatment] = useState(DEFAULT_BLOCK_TREATMENT)
  const [content, setContent] = useState(DEFAULT_BLOCK_CONTENT)
  return (
    <ColStage width={260}>
      <BlocosPanel
        format={format}
        treatment={treatment}
        onTreatment={setTreatment}
        content={content}
        onToggleContent={key => setContent(c => ({ ...c, [key]: !c[key] }))}
      />
    </ColStage>
  )
}

function TitulosPanelDemo({ format }) {
  const [gymName, setGymName] = useState('Cone')
  const [footer, setFooter] = useState('@conebox')
  const [titles, setTitles] = useState({ semana: 'SEMANA DO CAOS' })
  return (
    <ColStage width={280}>
      <TitulosPanel
        gymName={gymName}
        onGymName={setGymName}
        footer={footer}
        onFooter={setFooter}
        format={format}
        title={titles[format] || ''}
        onTitleChange={v => setTitles(t => ({ ...t, [format]: v }))}
        computedDefault={computedTitle(format, {
          date: WEEK_DATES[1],
          weekDates: WEEK_DATES,
          year: 2026,
          month: 7,
        })}
      />
    </ColStage>
  )
}

/** PreviewPane with a fabricated `overflowInfo` — the two non-happy fit states
 * (T9): a warn-with-escape-hatch and the terminal floor state. Renders the REAL
 * component, not a mockup of it. */
function PreviewFitDemo({ atFloor }) {
  const [autoShrinking, setAutoShrinking] = useState(false)
  return (
    <ColStage width={420}>
      <PreviewPane
        format="dia"
        year={2026}
        month={7}
        selectedWeekIdx={0}
        currentWeekDates={WEEK_DATES}
        selectedDate={DATE_KEY(1)}
        filteredSessions={SESSIONS}
        titles={{}}
        gymName="Cone"
        footer=""
        fontScaleByFormat={{
          dia: atFloor ? 0.5 : 1.5,
          semana: 1.5,
          mes: 1.5,
          diaMobile: 1.5,
          semanaMobile: 1.5,
        }}
        zoneScales={[1, 1, 1]}
        blockTitleScales={[1, 1, 1]}
        zoneCount={3}
        zoneSplit="iguais"
        blockTreatment={DEFAULT_BLOCK_TREATMENT}
        blockContent={DEFAULT_BLOCK_CONTENT}
        mobileModel="classico"
        visibleDays={ALL_WEEK_DAYS}
        locations={BOXES}
        logoDataUrl={null}
        logoScale={1}
        palette={PALETTE}
        busy={false}
        fname="cone-treino-qua-12082026.png"
        onPickAltDate={NOOP}
        onSwitchToWeekFormat={NOOP}
        overflowInfo={{ overflowing: true, cutBlocks: 2, clips: true }}
        autoShrinking={autoShrinking}
        onAutoShrink={() => setAutoShrinking(true)}
      />
    </ColStage>
  )
}

export default {
  group: 'Publicador',
  items: [
    {
      id: 'pub-formatrail',
      label: 'FormatRail',
      render: () => (
        <Section
          title="FormatRail"
          sub="tabs/publicador/publisher/FormatRail.jsx — os 5 formatos (decisão 9: 'story' fora, Eagles/MegaMan somem da UI). Um radiogroup real; a proporção é um selo, não texto. diaMobile escolhe entre os dois modelos (Clássico/Impacto) no painel Layout (#59 C5·b2)."
        >
          <Case label="Interativo — clique para trocar de formato">
            <FormatRailDemo />
          </Case>
          {FORMATS.map(f => (
            <Case key={f.id} label={`Fixo — ${f.label}`}>
              <ColStage>
                <FormatRail format={f.id} onSelect={NOOP} />
              </ColStage>
            </Case>
          ))}
        </Section>
      ),
    },
    {
      id: 'pub-whenpicker',
      label: 'WhenPicker',
      render: () => (
        <Section
          title="WhenPicker"
          sub="tabs/publicador/publisher/WhenPicker.jsx — O ÚNICO seletor de quando (mês → semana → dia), substituindo o antigo par toolbar+modal. A linha de dias fica sempre visível — cinza e desabilitada fora dos formatos de dia — em vez de sumir e reaparecer conforme o formato muda."
        >
          <Case label="Formato de dia — linha de dias ativa">
            <ColStage width={620}>
              <WhenPicker
                year={2026}
                month={7}
                monthLabel="Agosto 2026"
                onPrevMonth={NOOP}
                onNextMonth={NOOP}
                selectedWeekIdx={0}
                onSelectWeek={NOOP}
                selectedDate={DATE_KEY(1)}
                onSelectDate={NOOP}
                sessions={SESSIONS}
                dayFormat
              />
            </ColStage>
          </Case>
          <Case label="Formato de semana/mês — linha de dias desabilitada, com dica">
            <ColStage width={620}>
              <WhenPicker
                year={2026}
                month={7}
                monthLabel="Agosto 2026"
                onPrevMonth={NOOP}
                onNextMonth={NOOP}
                selectedWeekIdx={0}
                onSelectWeek={NOOP}
                selectedDate={null}
                onSelectDate={NOOP}
                sessions={SESSIONS}
                dayFormat={false}
              />
            </ColStage>
          </Case>
        </Section>
      ),
    },
    {
      id: 'pub-origemcores',
      label: 'OrigemCores',
      render: () => (
        <Section
          title="OrigemCores"
          sub="tabs/publicador/publisher/OrigemCores.jsx — Origem resolve a paleta (tema do coach · preset por box · Personalizado); Cores só é editável (8 ColorField) sob Personalizado — nas outras origens é uma faixa de swatches somente-leitura, porque a paleta vem do tema, não é escolhida à mão (plans/82: 29 dos 37 valores antigos eram um token do totk-dark, copiado à mão)."
        >
          <Case label='Origem "Meu tema" — Cores somente-leitura'>
            <OrigemCores
              boxes={BOXES}
              origin={null}
              onSelectOrigin={NOOP}
              palette={PALETTE}
              custom={{}}
              onCustomChange={NOOP}
            />
          </Case>
          <Case label="Origem Personalizado — 8 ColorField editáveis">
            <OrigemCores
              boxes={BOXES}
              origin="__custom__"
              onSelectOrigin={NOOP}
              palette={PALETTE}
              custom={{ '--a-hdr': '#ff8a00' }}
              onCustomChange={NOOP}
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'pub-logopanel',
      label: 'LogoPanel',
      render: () => (
        <Section
          title="LogoPanel"
          sub="tabs/publicador/publisher/LogoPanel.jsx — o uploader relocated sem perda de capacidade. A caixa é um <div role=button tabIndex=0> com onKeyDown Enter/Espaço — não é um click-div, é um botão customizado de verdade."
        >
          <Case label="Sem logo">
            <ColStage width={200}>
              <LogoPanel
                logoInputRef={{ current: null }}
                onLogoUpload={NOOP}
                logoDataUrl={null}
                onRemoveLogo={NOOP}
                logoScale={1}
                onLogoScaleStep={NOOP}
              />
            </ColStage>
          </Case>
        </Section>
      ),
    },
    {
      id: 'pub-tamanhopanel',
      label: 'TamanhoPanel',
      render: () => (
        <Section
          title="TamanhoPanel"
          sub="tabs/publicador/publisher/TamanhoPanel.jsx — fonte + escala de export. Desde #59 C5·b2 a fonte é POR FORMATO (fontScaleByFormat) — o container passa o valor do formato atual; este painel em si não mudou de forma. Os controles por zona só aparecem no formato Dia."
        >
          <Case label="Formato Dia — inclui controles por zona">
            <ColStage width={260}>
              <TamanhoPanel
                fontScale={1.5}
                onFontScaleStep={NOOP}
                exportScale={2}
                onExportScaleStep={NOOP}
                zoneScales={[1, 1, 1]}
                onZoneScaleStep={NOOP}
                blockTitleScales={[1, 1, 1]}
                onBlockTitleScaleStep={NOOP}
                showZoneControls
                canvasLabel="1920×1080"
              />
            </ColStage>
          </Case>
          <Case label="Outro formato — sem controles por zona">
            <ColStage width={260}>
              <TamanhoPanel
                fontScale={1.5}
                onFontScaleStep={NOOP}
                exportScale={2}
                onExportScaleStep={NOOP}
                zoneScales={[1, 1, 1]}
                onZoneScaleStep={NOOP}
                blockTitleScales={[1, 1, 1]}
                onBlockTitleScaleStep={NOOP}
                showZoneControls={false}
                canvasLabel="1080×auto"
              />
            </ColStage>
          </Case>
        </Section>
      ),
    },
    {
      id: 'pub-layout',
      label: 'LayoutPanel',
      render: () => (
        <Section
          title="LayoutPanel"
          sub="tabs/publicador/publisher/LayoutPanel.jsx (#59 C5·b2 T6) — forka inteiramente no formato: Dia ganha Zonas (contagem + divisão, e o fato de colapso — 'nunca soltar em silêncio', a mesma regra do B1); Semana/Semana mobile ganham o seletor de 7 dias; Dia mobile ganha o par de modelos (Clássico/Impacto, mantidos vivos por decisão herdada do b1); Mês não tem nada para ajustar."
        >
          <Case label="Dia — 2 zonas, Zona 03 colapsa (fato mostrado no painel)">
            <LayoutPanelDemo format="dia" />
          </Case>
          <Case label="Semana — seletor de 7 dias (Dom-Sáb)">
            <LayoutPanelDemo format="semana" />
          </Case>
          <Case label="Dia mobile — par de modelos">
            <LayoutPanelDemo format="diaMobile" />
          </Case>
          <Case label="Mês — nada para ajustar">
            <LayoutPanelDemo format="mes" />
          </Case>
        </Section>
      ),
    },
    {
      id: 'pub-blocos',
      label: 'BlocosPanel',
      render: () => (
        <Section
          title="BlocosPanel"
          sub="tabs/publicador/publisher/BlocosPanel.jsx (#59 C5·b2 T5) — as 5 tratamentos de bloco (Nu · Acento · Contorno · Faixa · Etiqueta), todos ancorados em --a-hdr, mais os 2 toggles de conteúdo. Vale para Dia e Semana; Dia mobile/Semana mobile têm visual próprio (Eagles/MegaMan) e Mês não mostra blocos — o painel diz isso."
        >
          <Case label="Formato Semana — tratamento aplicável">
            <BlocosPanelDemo format="semana" />
          </Case>
          <Case label="Formato Mês — aviso de que não se aplica">
            <BlocosPanelDemo format="mes" />
          </Case>
        </Section>
      ),
    },
    {
      id: 'pub-titulos',
      label: 'TitulosPanel',
      render: () => (
        <Section
          title="TitulosPanel"
          sub="tabs/publicador/publisher/TitulosPanel.jsx (#59 C5·b2 T7) — Academia e Rodapé são globais (Rodapé só nos formatos mobile); o Título é POR FORMATO — a mesma string não significa a mesma coisa em Dia, Semana e Mês. Vazio = o placeholder computado, que também é o que a arte renderiza."
        >
          <Case label="Semana — título customizado ('SEMANA DO CAOS')">
            <TitulosPanelDemo format="semana" />
          </Case>
          <Case label="Dia — título vazio, mostra o placeholder computado">
            <TitulosPanelDemo format="dia" />
          </Case>
        </Section>
      ),
    },
    {
      id: 'pub-aparencia',
      label: 'AparenciaPanel (carrossel)',
      render: () => (
        <Section
          title="AparenciaPanel"
          sub="tabs/publicador/publisher/AparenciaPanel.jsx — o carrossel de 6 painéis (Origem/Cores · Logo · Tamanho · Layout · Blocos · Títulos, os 3 últimos de #59 C5·b2/plans/83) com navegação por seta e por ponto."
        >
          <Case label="Interativo — troque de painel e de Origem">
            <AparenciaPanelDemo origin="tema" />
          </Case>
        </Section>
      ),
    },
    {
      id: 'pub-states',
      label: 'ExportStates',
      render: () => (
        <Section
          title="ExportStates"
          sub="tabs/publicador/publisher/ExportStates.jsx — os 3 estados não-felizes do preview, todos sobre ui/EmptyState em vez da marcação .state/.state.err própria do mockup."
        >
          <Case label="Semana sem sessão nenhuma">
            <ColStage width={420}>
              <EmptyWeekState monthLabel="Agosto 2026" weekLabel="30–5" onJump={NOOP} />
            </ColStage>
          </Case>
          <Case label="Formato de dia, dia sem sessão — com alternativas">
            <ColStage width={420}>
              <NoSessionThatDayState
                dateLabel="TER 1"
                altDates={[WEEK_DATES[1]]}
                onPickDate={NOOP}
                onSwitchToWeek={NOOP}
              />
            </ColStage>
          </Case>
          <Case label="Falha na rasterização — com saída sem logo">
            <ColStage width={420}>
              <ExportErrorState onRetry={NOOP} onRetryNoLogo={NOOP} hasLogo />
            </ColStage>
          </Case>
        </Section>
      ),
    },
    {
      id: 'pub-fit',
      label: 'Fit / overflow (PreviewPane)',
      render: () => (
        <Section
          title="Fit e overflow"
          sub="tabs/publicador/fitCheck.js + PreviewPane.jsx (#59 C5·b2 T9) — o aviso de overflow nunca bloqueia Baixar (dobra no ConfirmReview existente); o ajuste automático é MANUAL (nunca automático) e só mexe na escala do formato atual; no piso, um estado terminal substitui o botão."
        >
          <Case label="Overflow — com escape (Ajustar automaticamente)">
            <PreviewFitDemo atFloor={false} />
          </Case>
          <Case label="No piso — estado terminal, sem botão">
            <PreviewFitDemo atFloor />
          </Case>
        </Section>
      ),
    },
    {
      id: 'pub-artefact',
      label: 'Artefato — Diário (totk-dark vs totk-light)',
      render: () => (
        <Section
          title="O artefato exportado"
          sub="exportViews.jsx's DailyExportView através de renderArtefact — a paleta --a-* é literal-hex (exportPalette.js), nunca var(--accent): o PNG não pode mudar de cor quando o coach troca de tema. As DUAS renderizações abaixo usam a MESMA sessão; só a paleta muda — essa é a inversão que a passada inteira comprova (plans/82: 'export a mesma semana nos 4 temas → as 4 devem DIFERIR')."
        >
          <Case label="Origem: totk-dark">
            <ArtStage palette={PALETTE}>
              {renderArtefact('dia', {
                filteredSessions: SESSIONS,
                titles: {},
                gymName: 'Cone',
                footer: '',
                fontScaleByFormat: { dia: 1 },
                zoneScales: [1, 1, 1],
                blockTitleScales: [1, 1, 1],
                zoneCount: 3,
                zoneSplit: 'iguais',
                blockTreatment: DEFAULT_BLOCK_TREATMENT,
                blockContent: DEFAULT_BLOCK_CONTENT,
                selectedDate: DATE_KEY(1),
                logoDataUrl: null,
                logoScale: 1,
                currentWeekDates: WEEK_DATES,
                year: 2026,
                month: 7,
                selectedWeekIdx: 0,
              })}
            </ArtStage>
          </Case>
          <Case label="Origem: totk-light — mesma sessão, paleta diferente">
            <ArtStage palette={PALETTE_LIGHT}>
              {renderArtefact('dia', {
                filteredSessions: SESSIONS,
                titles: {},
                gymName: 'Cone',
                footer: '',
                fontScaleByFormat: { dia: 1 },
                zoneScales: [1, 1, 1],
                blockTitleScales: [1, 1, 1],
                zoneCount: 3,
                zoneSplit: 'iguais',
                blockTreatment: DEFAULT_BLOCK_TREATMENT,
                blockContent: DEFAULT_BLOCK_CONTENT,
                selectedDate: DATE_KEY(1),
                logoDataUrl: null,
                logoScale: 1,
                currentWeekDates: WEEK_DATES,
                year: 2026,
                month: 7,
                selectedWeekIdx: 0,
              })}
            </ArtStage>
          </Case>
          <Case label="2 zonas — Zona 03 colapsa na Zona 02 (T6)">
            <ArtStage palette={PALETTE}>
              {renderArtefact('dia', {
                filteredSessions: ZONED_SESSIONS,
                titles: {},
                gymName: 'Cone',
                footer: '',
                fontScaleByFormat: { dia: 1 },
                zoneScales: [1, 1, 1],
                blockTitleScales: [1, 1, 1],
                zoneCount: 2,
                zoneSplit: '30-70',
                blockTreatment: DEFAULT_BLOCK_TREATMENT,
                blockContent: DEFAULT_BLOCK_CONTENT,
                selectedDate: DATE_KEY(1),
                logoDataUrl: null,
                logoScale: 1,
                currentWeekDates: WEEK_DATES,
                year: 2026,
                month: 7,
                selectedWeekIdx: 0,
              })}
            </ArtStage>
          </Case>
          <Case label="Semana vazia — daysList vazio">
            <ArtStage h={140}>
              {renderArtefact('dia', {
                filteredSessions: EMPTY_SESSIONS,
                titles: {},
                gymName: 'Cone',
                footer: '',
                fontScaleByFormat: { dia: 1 },
                zoneScales: [1, 1, 1],
                blockTitleScales: [1, 1, 1],
                zoneCount: 3,
                zoneSplit: 'iguais',
                blockTreatment: DEFAULT_BLOCK_TREATMENT,
                blockContent: DEFAULT_BLOCK_CONTENT,
                selectedDate: null,
                logoDataUrl: null,
                logoScale: 1,
                currentWeekDates: WEEK_DATES,
                year: 2026,
                month: 7,
                selectedWeekIdx: 0,
              })}
            </ArtStage>
          </Case>
        </Section>
      ),
    },
  ],
}
