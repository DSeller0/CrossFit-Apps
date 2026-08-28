import { useState } from 'react'
import AffiliateRow from '../../../components/tabs/afiliados/AffiliateRow.jsx'
import AffiliatesPane from '../../../components/tabs/afiliados/AffiliatesPane.jsx'
import AthleteAssignment from '../../../components/tabs/afiliados/AthleteAssignment.jsx'
import MeuNegocioPane from '../../../components/tabs/afiliados/MeuNegocioPane.jsx'
import AffiliateFormModal from '../../../components/tabs/afiliados/AffiliateFormModal.jsx'
import BoxQrModal from '../../../components/tabs/afiliados/BoxQrModal.jsx'
import PaneTabs from '../../../components/tabs/afiliados/PaneTabs.jsx'
import { Case, Section, ModalBox, TallModalBox } from '../harness.jsx'
import { NOOP } from '../fixtures.js'

// #56/C2 · plans/75 — Serviços → Afiliados. Client-free throughout: the locations
// blob, the coach profile and the QR generation all stay in the container.

const locBox = {
  id: 'l1',
  name: 'Eagles',
  type: 'box',
  color: '#4ac8c0',
  rate: 40,
  rateUnit: 'per_hour',
  currency: 'R$',
  athleteIds: ['a1', 'a2'],
}
const locBox2 = {
  id: 'l2',
  name: 'Garra',
  type: 'box',
  color: '#d8a840',
  rate: 45,
  rateUnit: 'per_hour',
  currency: 'R$',
  athleteIds: ['a2'],
}
const locPersonal = {
  id: 'l3',
  name: 'Personal manhã',
  type: 'personal',
  color: '#a878d8',
  rate: 120,
  rateUnit: 'per_session',
  currency: 'R$',
  athleteIds: ['a3'],
}
const locNoRate = { id: 'l4', name: 'Novo box', type: 'box', color: '#e87820', athleteIds: [] }
const locLong = {
  ...locBox,
  id: 'l5',
  name: 'CrossFit Zona Sul — Unidade Extremamente Comprida',
}
const LOCS = [locBox, locBox2, locPersonal, locNoRate]

const athletes = [
  { id: 'a1', name: 'Ana Medrado', color: '#e87820', level: 'Intermediário' },
  { id: 'a2', name: 'Bruno Sacchetto', color: '#4ac8c0', level: 'Avançado' },
  { id: 'a3', name: 'Carla Nepomuceno de Albuquerque', color: '#a878d8', level: 'Iniciante' },
]

const QR_STUB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" shape-rendering="crispEdges">
      <rect width="120" height="120" fill="#fff"/>
      <g fill="#000">
        <rect x="8" y="8" width="28" height="28"/><rect x="14" y="14" width="16" height="16" fill="#fff"/>
        <rect x="84" y="8" width="28" height="28"/><rect x="90" y="14" width="16" height="16" fill="#fff"/>
        <rect x="8" y="84" width="28" height="28"/><rect x="14" y="90" width="16" height="16" fill="#fff"/>
        <rect x="48" y="16" width="8" height="8"/><rect x="60" y="28" width="8" height="8"/>
        <rect x="48" y="40" width="8" height="8"/><rect x="72" y="48" width="8" height="8"/>
        <rect x="24" y="48" width="8" height="8"/><rect x="48" y="64" width="8" height="8"/>
        <rect x="64" y="72" width="8" height="8"/><rect x="88" y="64" width="8" height="8"/>
        <rect x="96" y="88" width="8" height="8"/><rect x="72" y="96" width="8" height="8"/>
      </g>
    </svg>`,
  )
const LINK = 'https://dseller0.github.io/CrossFit-Apps/index.html?box=l1'

const PANES = [
  { id: 'afiliados', label: 'Afiliados' },
  { id: 'negocio', label: 'Meu negócio' },
]

// ── stateful demo wrappers ─────────────────────────────────────────────────
function PaneTabsDemo() {
  const [active, setActive] = useState('afiliados')
  return <PaneTabs panes={PANES} active={active} onChange={setActive} />
}

function PaneDemo({ locs = LOCS, compact = false, height = 460 }) {
  const [sel, setSel] = useState(locs[0]?.id ?? null)
  const [exp, setExp] = useState(locs[0]?.id ?? null)
  const [rows, setRows] = useState(locs)
  const toggle = (locId, athId) =>
    setRows(rs =>
      rs.map(l => {
        if (l.id !== locId) return l
        const ids = l.athleteIds || []
        return {
          ...l,
          athleteIds: ids.includes(athId) ? ids.filter(x => x !== athId) : [...ids, athId],
        }
      }),
    )
  return (
    // overflow:auto, not hidden — the list column has its own sticky header and the
    // mobile accordion is taller than any fixed box, so a clipped stage would read
    // as a missing row (it did, on the first pass: the third athlete was cut off).
    <div
      style={{
        height,
        overflow: 'auto',
        border: '1px solid var(--divider)',
        display: 'flex',
      }}
    >
      <AffiliatesPane
        locs={rows}
        athletes={athletes}
        compact={compact}
        selectedId={sel}
        expandedId={exp}
        onSelect={setSel}
        onToggleExpand={id => setExp(e => (e === id ? null : id))}
        onNew={NOOP}
        onQr={NOOP}
        onEdit={NOOP}
        onDelete={NOOP}
        onToggleAthlete={toggle}
      />
    </div>
  )
}

function NegocioDemo({ initial, height = 480 }) {
  const [coach, setCoach] = useState(initial)
  return (
    // overflow:auto — the pane scrolls in the app too, and with Pix on the cap field
    // sits below a clipped 480px box.
    <div style={{ height, overflow: 'auto', border: '1px solid var(--divider)', display: 'flex' }}>
      <MeuNegocioPane coach={coach} setCoach={setCoach} />
    </div>
  )
}

function FormDemo({ editId = null, initial }) {
  const [form, setForm] = useState(initial)
  return (
    <TallModalBox>
      <AffiliateFormModal
        open
        editId={editId}
        form={form}
        setF={(k, v) => setForm(f => ({ ...f, [k]: v }))}
        onSave={NOOP}
        onClose={NOOP}
      />
    </TallModalBox>
  )
}

const BLANK_FORM = {
  name: '',
  type: 'box',
  color: '#4ac8c0',
  rate: '',
  rateUnit: 'per_session',
  currency: 'R$',
  coachName: '',
}
const EDIT_FORM = {
  name: 'Eagles',
  type: 'box',
  color: '#4ac8c0',
  rate: 40,
  rateUnit: 'per_hour',
  currency: 'R$',
  coachName: 'Zé',
}

export default {
  group: 'Afiliados',
  items: [
    {
      id: 'afl-panetabs',
      label: 'PaneTabs',
      render: () => (
        <Section
          title="PaneTabs"
          sub="tabs/afiliados/PaneTabs.jsx — a arquitetura da plans/42 tem quatro painéis (Afiliados · Coaches · Turmas · Meu negócio). DOIS entram: Coaches é #103 e Turmas é #40, e nenhum dos dois tem dado ainda. A casca recebe os painéis como ARRAY, então cada um deles acrescenta uma linha — em vez de duas abas 'em breve' agora."
        >
          <Case label="Dois painéis vivos (interativo)">
            <PaneTabsDemo />
          </Case>
          <Case label="Como ficaria com #103 e #40 — só para conferir a largura, NÃO é o que entra">
            <PaneTabs
              panes={[
                { id: 'a', label: 'Afiliados' },
                { id: 'c', label: 'Coaches' },
                { id: 't', label: 'Turmas' },
                { id: 'n', label: 'Meu negócio' },
              ]}
              active="a"
              onChange={NOOP}
            />
          </Case>
        </Section>
      ),
    },
    {
      id: 'afl-row',
      label: 'AffiliateRow',
      render: () => (
        <Section
          title="AffiliateRow"
          sub="tabs/afiliados/AffiliateRow.jsx — o controle de seleção e os botões de ação são IRMÃOS, não aninhados: a linha antiga era um <div> com três <button> dentro, e transformá-la em <button> criaria elementos interativos aninhados. Isso também aposentou os três e.stopPropagation(). Cada ícone diz de qual afiliado é (há três lixeiras iguais na tela)."
        >
          <Case label="Box · selecionado / não selecionado">
            <div style={{ width: 300 }}>
              <AffiliateRow
                loc={locBox}
                selected
                onSelect={NOOP}
                onQr={NOOP}
                onEdit={NOOP}
                onDelete={NOOP}
              />
              <AffiliateRow
                loc={locBox2}
                onSelect={NOOP}
                onQr={NOOP}
                onEdit={NOOP}
                onDelete={NOOP}
              />
            </div>
          </Case>
          <Case label="Personal — sem botão de QR (o ?box= só existe para box)">
            <div style={{ width: 300 }}>
              <AffiliateRow
                loc={locPersonal}
                onSelect={NOOP}
                onQr={NOOP}
                onEdit={NOOP}
                onDelete={NOOP}
              />
            </div>
          </Case>
          <Case label="Sem taxa — a ausência é dita, não some">
            <div style={{ width: 300 }}>
              <AffiliateRow
                loc={locNoRate}
                onSelect={NOOP}
                onQr={NOOP}
                onEdit={NOOP}
                onDelete={NOOP}
              />
            </div>
          </Case>
          <Case label="Overflow — nome longo trunca, o tipo e as ações não encolhem">
            <div style={{ width: 300 }}>
              <AffiliateRow
                loc={locLong}
                onSelect={NOOP}
                onQr={NOOP}
                onEdit={NOOP}
                onDelete={NOOP}
              />
            </div>
          </Case>
          <Case label="Mobile — acordeão fechado / aberto">
            <div style={{ width: 358, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AffiliateRow
                loc={locBox2}
                variant="card"
                onToggle={NOOP}
                onQr={NOOP}
                onEdit={NOOP}
                onDelete={NOOP}
              />
              <AffiliateRow
                loc={locBox}
                variant="card"
                expanded
                onToggle={NOOP}
                onQr={NOOP}
                onEdit={NOOP}
                onDelete={NOOP}
              >
                <AthleteAssignment loc={locBox} athletes={athletes} onToggle={NOOP} />
              </AffiliateRow>
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'afl-pane',
      label: 'AffiliatesPane',
      render: () => (
        <Section
          title="AffiliatesPane"
          sub="tabs/afiliados/AffiliatesPane.jsx — a coluna da lista agora só tem a lista. O perfil do coach, que ficava empilhado em cima dela na mesma coluna de 260px com rolagem, virou o painel 'Meu negócio' — é isso que conserta o overflow do painel esquerdo na linha do #56."
        >
          <Case label="Desktop — lista + roster (interativo: selecione, marque atletas)">
            <PaneDemo />
          </Case>
          <Case label="Nenhum afiliado — o estado vazio leva a ação">
            <PaneDemo locs={[]} />
          </Case>
          <Case label="Mobile — acordeão">
            <div style={{ width: 390 }}>
              <PaneDemo compact height={620} />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'afl-assignment',
      label: 'AthleteAssignment',
      render: () => (
        <Section
          title="AthleteAssignment"
          sub="tabs/afiliados/AthleteAssignment.jsx — a associação é guardada INVERTIDA, em locations[].athleteIds. Ganhou um estado de zero atletas de verdade: antes, sem atletas cadastrados, renderizava um <div> vazio e o painel parecia quebrado."
        >
          <Case label="Box — com a nota sobre aulas em grupo">
            <div style={{ maxWidth: 420 }}>
              <AthleteAssignment loc={locBox} athletes={athletes} onToggle={NOOP} />
            </div>
          </Case>
          <Case label="Personal — sem a nota">
            <div style={{ maxWidth: 420 }}>
              <AthleteAssignment loc={locPersonal} athletes={athletes} onToggle={NOOP} />
            </div>
          </Case>
          <Case label="Nenhum atleta cadastrado (era um <div> vazio)">
            <div style={{ maxWidth: 420 }}>
              <AthleteAssignment loc={locBox} athletes={[]} onToggle={NOOP} />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'afl-negocio',
      label: 'MeuNegocioPane',
      render: () => (
        <Section
          title="MeuNegocioPane"
          sub="tabs/afiliados/MeuNegocioPane.jsx — era o CoachProfileForm, uma laje acima da lista com dois objetos de estilo escritos à mão (o prop `compact`) que diferiam só em padding. Fica num painel próprio porque a taxa do afiliado é box→coach e a chave Pix é a que VOCÊ cobra: um nome de campo e uma identidade Pix para duas direções é como sai uma cobrança errada em silêncio (plans/42)."
        >
          <Case label="Pix ativado — chave, cidade e cap de teste">
            <NegocioDemo
              height={620}
              initial={{
                name: 'Zé Arthur',
                contact: 'ze@exemplo.com',
                phone: '(11) 90000-0000',
                pixEnabled: true,
                pixKey: 'ze@exemplo.com',
                cidade: 'São Paulo',
                pixTestCap: 1,
              }}
            />
          </Case>
          <Case label="Pix desativado — os campos somem">
            <NegocioDemo
              initial={{ name: 'Zé Arthur', contact: '', phone: '', pixEnabled: false }}
            />
          </Case>
          <Case label="Vazio — primeira visita">
            <NegocioDemo initial={{}} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'afl-form',
      label: 'AffiliateFormModal',
      render: () => (
        <Section
          title="AffiliateFormModal"
          sub="tabs/afiliados/AffiliateFormModal.jsx — eram ~240 linhas de estilo inline com overlay, raios e cinzas próprios. Agora: Modal + Input + ColorField + CurrencyInput. `coachName` continua, mas rotulado como anotação: ele é escrito aqui e LIDO POR NADA (#103 o transforma numa referência de verdade)."
        >
          <Case label="Novo afiliado — nome vazio mostra o erro e trava o Salvar">
            <FormDemo initial={BLANK_FORM} />
          </Case>
          <Case label="Editar — taxa por hora (interativo: digite na Taxa)">
            <FormDemo editId="l1" initial={EDIT_FORM} />
          </Case>
        </Section>
      ),
    },
    {
      id: 'afl-qr',
      label: 'BoxQrModal',
      render: () => (
        <Section
          title="BoxQrModal"
          sub="tabs/afiliados/BoxQrModal.jsx — o fundo branco do QR é um literal DELIBERADO (precisa escanear em qualquer tema), comentado no CSS. O texto diz que ?box= é filtro de exibição, não restrição de acesso (#80)."
        >
          <Case label="QR pronto">
            <TallModalBox>
              <BoxQrModal open loc={locBox} qr={QR_STUB} link={LINK} onCopy={NOOP} onClose={NOOP} />
            </TallModalBox>
          </Case>
          <Case label="Gerando (estado pendente)">
            <TallModalBox>
              <BoxQrModal open loc={locBox} qr="" link={LINK} onCopy={NOOP} onClose={NOOP} />
            </TallModalBox>
          </Case>
          <Case label="Copiado">
            <ModalBox>
              <BoxQrModal
                open
                loc={locBox}
                qr={QR_STUB}
                link={LINK}
                copied
                onCopy={NOOP}
                onClose={NOOP}
              />
            </ModalBox>
          </Case>
        </Section>
      ),
    },
  ],
}
