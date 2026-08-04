import { SessionTextPane } from '../../../components/tabs/criador/SessionTextPane.jsx'
import { BlockTextEditor } from '../../../components/tabs/criador/BlockTextEditor.jsx'
import { WeekSessionCard } from '../../../components/tabs/criador/WeekSessionCard.jsx'
import { WeekImportModal } from '../../../components/tabs/criador/WeekImportModal.jsx'
import { GoalInput } from '../../../components/tabs/criador/GoalInput.jsx'
import { SessionMetaModal } from '../../../components/tabs/criador/SessionMetaModal.jsx'
import { ParseWarnings } from '../../../components/tabs/criador/ParseWarnings.jsx'
import { parseSession } from '../../../components/tabs/criador/textFormat.js'
import { getWeek, toISO } from '../../lib/week.js'
import { Case, Section, TallModalBox } from '../harness.jsx'
import { NOOP } from '../fixtures.js'

// ── Criador text-mode fixtures (#92) ──────────────────────────────────────────
// The blocks are the PARSER'S OWN OUTPUT for the real coach file (Monday), not a
// hand-written shape — so this entry cannot drift from what textFormat.js does.
const MONDAY_TEXT = `Warm Up
3 rounds
100m Run
10 Shoulder Taps
5 Inchworm + Push Up

Skill – Handstand Walk
3 sets cada letra
A 20" Handstand Hold wall
B 10 Wall Shoulder Taps
C Deslocamento com apoio

Quem já faz tc 15'
5 sets
5M HSW
200m Row
5mM HSW
Rest 1'

WOD – TC 14'
5 Rounds For Time
8 Power Clean 60/45kg – 50/35kg
10 Toes to Bar
10 Box Jump
100m Run
Meta: 11-12'`

// The leading two lines are a PREAMBLE — text before the first day header, which
// parseWeek has nowhere to attach but the loss of it (#128). ParseWarnings is its
// first real consumer: the modal now reports it instead of silently dropping it.
const WEEK_TEXT = `SEMANA 32 — Eagles
Foco: gimnastico

SEGUNDA-FEIRA

${MONDAY_TEXT}

TERÇA-FEIRA

Warm Up
2 rounds
10 Ring Row
10 Scap Pull Up

Quem já faz !
Emom 15'
A 4 Strict C2B
B 8 Kipping Pull Up

QUARTA-FEIRA
Warm Up
2 rounds
200m Run
10 KB Deadlift

QUINTA-FEIRA (HYROX)
Warm Up
3 rounds
200 Run
20m Farmer Carry`

const txtMondayBlocks = parseSession(MONDAY_TEXT).blocks
// Covers every movement in the fixture EXCEPT "5mM HSW" — the real typo in the
// coach's file. That one miss is exactly what the ⓘ counter exists to surface:
// the name won't attach a demo video or a PR category until he fixes it.
// ("Run"→Corrida and "HSW"→Handstand Walk resolve through registry.js's aliases.)
const txtRegistry = {
  Cardio: [{ name: 'Corrida' }, { name: 'Remo (Ergômetro)' }],
  Ginástica: [
    { name: 'Toes to Bar' },
    { name: 'Handstand Walk' },
    { name: 'Shoulder Taps' },
    { name: 'Wall Shoulder Taps' },
    { name: 'Handstand Hold wall' },
    { name: 'Deslocamento com apoio' },
    { name: 'Inchworm + Push Up' },
    { name: 'Box Jump' },
  ],
  LPO: [{ name: 'Power Clean' }],
}
// plans/61·B — the two states the station grammar and the locked passthrough added.
// The Estações block is the PARSER'S output for its own notation, same rule as Monday's.
const txtStationsBlock = parseSession(
  `Estações
Ciclos: 2
Entre ciclos: 01:00
Grupo A 3:00
15 Wall Ball
12 Box Jump
Grupo B 3:00
400m Corrida
Descanso 1:00`,
).blocks[0]
// A LINKED benchmark is the one block text can't express: its movements come from the
// benchmark definition, so the pane holds it out of the textarea and puts it back.
const txtLockedBlocks = [
  txtMondayBlocks[0],
  {
    id: 'bm1',
    type: 'Benchmark',
    label: 'Fran',
    benchmarkRef: 'Fran',
    zone: 'Zona 01',
    notes: '21-15-9 Thruster / Pull Up',
    exercises: [
      { id: 'e1', name: 'Thruster', reps: '21,15,9', intensity: null, note: '' },
      { id: 'e2', name: 'Pull Up', reps: '21,15,9', intensity: null, note: '' },
    ],
  },
  txtMondayBlocks[3],
]
const txtWeekDates = getWeek(0)
const txtBoxLocs = [
  { id: 'b1', name: 'Eagles', color: '#4ac8c0' },
  { id: 'b2', name: 'Garra', color: '#e87820' },
]
// Thursday already booked → the import lists it and skips it, never overwrites.
const txtExistingSessions = {
  [toISO(txtWeekDates[4])]: [{ id: 's1', sessionName: 'HYROX', blocks: [] }],
}
// #58 fixtures — the Meta field and the session dialog that replaced the permanent
// form slab. Both are client-free, which is why they render here at all.
const goalAthletes = [
  { id: 'a1', name: 'Ana', level: 'RX', color: '#4ac8c0' },
  { id: 'a2', name: 'Bruno', level: 'Inter', color: '#e87820' },
  { id: 'a3', name: 'Carla', level: 'SC', color: '#9070d8' },
]
const goalMetaDraft = {
  id: 'sX',
  date: toISO(txtWeekDates[1]),
  sessionName: 'Semana 3 · D1 · Força Lower',
  mainTraining: ['Ana'],
  locationIds: ['b1'],
  notes: '',
  public: true,
  blocks: [],
}
const gridColStyle = {
  width: 200,
  background: 'var(--stone2)',
  border: '1px solid var(--divider)',
  borderRadius: 6,
  padding: 8,
}
// ParseWarnings fixtures (#129) — every one of WARNING_KINDS' 8 kinds, a repeated
// kind to show the plural label, and a lone one for the singular. Only `kind` is
// read by the component; line/message/lineNo are irrelevant to it.
const pwAllKinds = [
  'type-unresolved',
  'type-unresolved',
  'complex-detected',
  'block-locked',
  'unknown-exercise',
  'unparsed-line',
  'orphan-load',
  'interval-approximated',
  'preamble',
].map(kind => ({ kind }))
const pwSingle = [{ kind: 'type-unresolved' }]
const statusDemoStyle = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'center',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: 'var(--muted)',
}

// The real picker reaches utils/storage for custom benchmarks (→ Supabase client),
// so the gallery injects a stub: the chip-as-button state is what matters here.
function StubTypePicker({ onClose }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--stone)',
          border: '1px solid var(--divider)',
          borderRadius: 6,
          padding: 20,
          fontSize: 12,
          color: 'var(--sub)',
        }}
      >
        CriadorTypePicker (injetado pelo Criador)
      </div>
    </div>
  )
}

export default {
  group: 'Criador',
  items: [
    {
      id: 'criador-sessiontextpane',
      label: 'SessionTextPane',
      render: () => (
        <Section
          title="SessionTextPane"
          sub="src/components/tabs/criador/SessionTextPane.jsx — a sessão inteira na notação do próprio coach, com pré-visualização ao vivo do que o parser entendeu (#92). Texto é PROJEÇÃO: os blocos seguem canônicos, e nada é aplicado até o coach clicar em Aplicar. O tipo não reconhecido vira botão, não erro."
        >
          <Case label="Semana real do coach — segunda-feira (4 blocos, 14 exercícios, 1 tipo por definir)">
            <SessionTextPane
              blocks={txtMondayBlocks}
              registry={txtRegistry}
              onApply={NOOP}
              onCancel={NOOP}
              typePicker={StubTypePicker}
            />
          </Case>
          <Case label="Benchmark no meio da sessão — fora do texto, preservado no índice (plans/61·B)">
            <SessionTextPane
              blocks={txtLockedBlocks}
              registry={txtRegistry}
              onApply={NOOP}
              onCancel={NOOP}
              typePicker={StubTypePicker}
            />
          </Case>
          <Case label="Vazio — nada colado ainda">
            <SessionTextPane blocks={[]} onApply={NOOP} typePicker={StubTypePicker} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'criador-blocktexteditor',
      label: 'BlockTextEditor',
      render: () => (
        <Section
          title="BlockTextEditor"
          sub="src/components/tabs/criador/BlockTextEditor.jsx — um bloco por vez, SEM linha de cabeçalho: o tipo já está escolhido na barra do bloco, então a primeira linha só pode ser estrutura ou exercício. O commit é no blur (o parse gera ids novos; commitar a cada tecla trocaria as linhas embaixo do dedo dele)."
        >
          <Case label="For Time com carga por gênero e Meta">
            <BlockTextEditor block={txtMondayBlocks[3]} onApply={NOOP} registry={txtRegistry} />
          </Case>
          <Case label="Bloco com nome fora do registro (ⓘ no rodapé)">
            <BlockTextEditor block={txtMondayBlocks[2]} onApply={NOOP} registry={txtRegistry} />
          </Case>
          <Case label="Estações — grupos, descanso e ciclos, agora expressáveis (plans/61·B)">
            <BlockTextEditor block={txtStationsBlock} onApply={NOOP} registry={txtRegistry} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'criador-parsewarnings',
      label: 'ParseWarnings',
      render: () => (
        <Section
          title="ParseWarnings"
          sub="src/components/tabs/criador/ParseWarnings.jsx — uma renderização para os oito tipos de aviso que textFormat.js produz (#129), para que toda superfície que pode produzi-los também possa mostrá-los. WARNING_KINDS (textFormat.js) define ordem, severidade e rótulo — com plural — uma vez só; antes disso, SessionTextPane contava 4 dos 8, WeekImportModal 2, e BlockTextEditor imprimia a mensagem crua de cada linha."
        >
          <Case label="Os 8 tipos — singular e plural, aviso (⚠) e informativo (ⓘ), em bloco">
            <ParseWarnings warnings={pwAllKinds} />
          </Case>
          <Case label="Modo inline — a linha de status do BlockTextEditor">
            <div style={statusDemoStyle}>
              <span>✓ 3 exercícios · CAP 14&apos;</span>
              <ParseWarnings warnings={pwAllKinds} inline />
            </div>
          </Case>
          <Case label="Um só aviso — rótulo no singular">
            <ParseWarnings warnings={pwSingle} />
          </Case>
          <Case label="Vazio — não renderiza nada">
            <ParseWarnings warnings={[]} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'criador-weeksessioncard',
      label: 'WeekSessionCard (grade da semana)',
      render: () => (
        <Section
          title="WeekSessionCard"
          sub="src/components/tabs/criador/WeekSessionCard.jsx — o conteúdo do card dentro da grade da semana, nos dois modos. NÃO é tela nova: mesmas 7 colunas, mesmo filtro de box. Grade usa o ExerciseList real (tamanho grid: nome 12px, intensidade em linha própria); Texto usa serializeSession — o copiável, e o único que carrega estrutura, Meta: e notas."
        >
          <Case label="Modo Grade · coluna de 200px (a largura real da grade)">
            <div style={gridColStyle}>
              <WeekSessionCard session={{ blocks: txtMondayBlocks }} mode="grade" />
            </div>
          </Case>
          <Case label="Modo Texto · a mesma sessão, a notação dele">
            <div style={gridColStyle}>
              <WeekSessionCard session={{ blocks: txtMondayBlocks }} mode="texto" />
            </div>
          </Case>
          <Case label="Sessão sem blocos → não renderiza nada">
            <div style={gridColStyle}>
              <WeekSessionCard session={{ blocks: [] }} mode="grade" />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'criador-weekimportmodal',
      label: 'WeekImportModal',
      render: () => (
        <Section
          title="WeekImportModal"
          sub="src/components/tabs/criador/WeekImportModal.jsx — uma colagem, cinco sessões. A detecção roda ANTES de criar qualquer coisa, e a importação só ADICIONA: um dia que já tem sessão aparece marcado e é pulado. locationIds em array (multi-box), nunca o locationId singular legado. Cada dia expande num preview bloco-a-bloco (#128) — o mesmo PreviewBlock da sessão."
        >
          <Case label="Semana real colada — preâmbulo, 4 dias a criar, quinta já ocupada (expanda um dia)">
            <TallModalBox>
              <WeekImportModal
                weekDates={txtWeekDates}
                weekLabel="20/07 – 26/07"
                initialText={WEEK_TEXT}
                sessions={txtExistingSessions}
                boxFilter={() => true}
                boxLocs={txtBoxLocs}
                selBox="all"
                registry={txtRegistry}
                onPrevWeek={NOOP}
                onNextWeek={NOOP}
                onCreate={NOOP}
                onClose={NOOP}
              />
            </TallModalBox>
          </Case>
          <Case label="Vazio — nada colado">
            <TallModalBox>
              <WeekImportModal
                weekDates={txtWeekDates}
                weekLabel="20/07 – 26/07"
                sessions={{}}
                boxFilter={() => true}
                boxLocs={txtBoxLocs}
                selBox="all"
                onPrevWeek={NOOP}
                onNextWeek={NOOP}
                onCreate={NOOP}
                onClose={NOOP}
              />
            </TallModalBox>
          </Case>
        </Section>
      ),
    },
    {
      id: 'criador-goalinput',
      label: 'GoalInput (Meta)',
      render: () => (
        <Section
          title="GoalInput"
          sub="src/components/tabs/criador/GoalInput.jsx — a linha 'Meta:' do coach como campo, ciente do tipo (#10). Escreve block.goal, o ÚNICO campo novo persistido, na mesma forma que o parser de texto emite — então uma Meta digitada aqui e uma digitada no modo Texto são o mesmo objeto. Meta vazia vira undefined, nunca um objeto oco."
        >
          <Case label="For Time — faixa de tempo (MaskedTimeInput, mm:ss)">
            <GoalInput
              block={{ type: 'For Time', goal: { kind: 'time', min: '11:00', max: '12:00' } }}
              onUpdate={NOOP}
            />
          </Case>
          <Case label="For Time — vazia">
            <GoalInput block={{ type: 'For Time' }} onUpdate={NOOP} />
          </Case>
          <Case label="AMRAP — rounds + reps">
            <GoalInput
              block={{ type: 'AMRAP', goal: { kind: 'rounds', min: 5, reps: 12 } }}
              onUpdate={NOOP}
            />
          </Case>
          <Case label="Força — texto livre (sem eixo numérico de pontuação)">
            <GoalInput
              block={{ type: 'Força', goal: { kind: 'text', text: 'sem quebrar' } }}
              onUpdate={NOOP}
            />
          </Case>
          <Case label="Tipo trocado (goal antigo de outro kind) — não renderiza no campo errado">
            <GoalInput
              block={{ type: 'AMRAP', goal: { kind: 'time', min: '11:00' } }}
              onUpdate={NOOP}
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'criador-sessionmetamodal',
      label: 'SessionMetaModal',
      render: () => (
        <Section
          title="SessionMetaModal"
          sub="src/components/tabs/criador/SessionMetaModal.jsx — tudo o que uma sessão tem e não é bloco. Era uma laje permanente acima dos blocos; virou diálogo, aberto para criar e reaberto pelo cabeçalho do editor (#58). Segura um RASCUNHO e só aplica no confirmar, então Cancelar cancela de verdade. O seletor de atletas é inline, não um segundo modal por cima deste."
        >
          <Case label="Nova sessão">
            <TallModalBox>
              <SessionMetaModal
                initial={{ ...goalMetaDraft, sessionName: '', mainTraining: [], locationIds: [] }}
                athletes={goalAthletes}
                boxLocs={txtBoxLocs}
                onCancel={NOOP}
                onConfirm={NOOP}
              />
            </TallModalBox>
          </Case>
          <Case label="Editar dados — preenchida, sessão oculta">
            <TallModalBox>
              <SessionMetaModal
                initial={{ ...goalMetaDraft, public: false, notes: 'Buy-in: 400m corrida.' }}
                isEdit
                athletes={goalAthletes}
                boxLocs={txtBoxLocs}
                onCancel={NOOP}
                onConfirm={NOOP}
              />
            </TallModalBox>
          </Case>
        </Section>
      ),
    },
  ],
}
