import { useState } from 'react'
import AffiliateRow from '../../../components/tabs/afiliados/AffiliateRow.jsx'
import AffiliatesPane from '../../../components/tabs/afiliados/AffiliatesPane.jsx'
import AthleteAssignment from '../../../components/tabs/afiliados/AthleteAssignment.jsx'
import MeuPerfilPane from '../../../components/tabs/afiliados/MeuPerfilPane.jsx'
import AffiliateFormModal from '../../../components/tabs/afiliados/AffiliateFormModal.jsx'
import BoxQrModal from '../../../components/tabs/afiliados/BoxQrModal.jsx'
import PaneTabs from '../../../components/tabs/afiliados/PaneTabs.jsx'
import AffiliateRail from '../../../components/tabs/afiliados/AffiliateRail.jsx'
import DirectionPair from '../../../components/tabs/afiliados/DirectionPair.jsx'
import AffiliateSessions from '../../../components/tabs/afiliados/AffiliateSessions.jsx'
import ReceivableRail from '../../../components/tabs/afiliados/ReceivableRail.jsx'
import { Case, Section, ModalBox, TallModalBox } from '../harness.jsx'
import { NOOP } from '../fixtures.js'

// #56/C2 · plans/75 — Serviços → Afiliados. #161/plans/77 (mockup 60) — the
// vertical rail + the "Meus afiliados" three columns (list · detail · a receber).
// Client-free throughout: the locations blob, the coach profile, `events` and the
// QR generation all stay in the container.
//
// Every date below is a FIXED month (August 2026), never `new Date()` — the
// generated design cards are SSR'd once and must render the same events on every
// regeneration, not whatever "this month" happens to be when `design:cards` runs.

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
const locUsd = {
  id: 'l6',
  name: 'Miami Camp',
  type: 'personal',
  color: '#4ac8c0',
  rate: 80,
  rateUnit: 'per_session',
  currency: 'US$',
  athleteIds: ['a2'],
}
const LOCS = [locBox, locBox2, locPersonal, locNoRate]

const athletes = [
  { id: 'a1', name: 'Ana Medrado', color: '#e87820', level: 'Intermediário' },
  { id: 'a2', name: 'Bruno Sacchetto', color: '#4ac8c0', level: 'Avançado' },
  { id: 'a3', name: 'Carla Nepomuceno de Albuquerque', color: '#a878d8', level: 'Iniciante' },
]

// August 2026 — fixed, see the file-header note.
const FROM = '2026-08-01'
const TO = '2026-08-31'
const MONTH_LABEL = 'Agosto'
const EVENTS = {
  '2026-08-05': [
    {
      type: 'aula',
      locationId: 'l1',
      time: '18:00',
      durationMin: 90,
      label: 'WOD',
      status: 'completed',
    },
  ],
  '2026-08-12': [
    {
      type: 'aula',
      locationId: 'l1',
      time: '18:00',
      durationMin: 90,
      label: 'WOD',
      status: 'completed',
    },
    {
      type: 'personal',
      athleteIds: ['a3'],
      time: '07:00',
      durationMin: 60,
      label: 'Personal manhã',
      status: 'completed',
    },
  ],
  '2026-08-19': [
    {
      type: 'aula',
      locationId: 'l1',
      time: '18:00',
      durationMin: 90,
      label: 'WOD',
      status: 'scheduled',
    },
  ],
  '2026-08-26': [
    {
      type: 'aula',
      locationId: 'l2',
      time: '19:00',
      durationMin: 60,
      label: 'Condicionamento',
      status: 'completed',
    },
  ],
}
const EVENTS_USD = {
  '2026-08-08': [
    { type: 'personal', athleteIds: ['a2'], time: '09:00', durationMin: 60, status: 'completed' },
  ],
}

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
  { id: 'afiliados', label: 'Meus afiliados', group: 'Painéis', count: LOCS.length },
  { id: 'perfil', label: 'Meu perfil', group: 'Conta' },
]

// ── stateful demo wrappers ─────────────────────────────────────────────────
function PaneTabsDemo() {
  const [active, setActive] = useState('afiliados')
  return <PaneTabs panes={PANES} active={active} onChange={setActive} />
}

function RailDemo({ compact = false }) {
  const [active, setActive] = useState('afiliados')
  return (
    <div
      style={{
        display: 'flex',
        border: '1px solid var(--divider)',
        height: compact ? 'auto' : 320,
      }}
    >
      <AffiliateRail panes={PANES} active={active} onChange={setActive} compact={compact} />
    </div>
  )
}

function PaneDemo({ locs = LOCS, compact = false, height = 720 }) {
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
        events={EVENTS}
        from={FROM}
        to={TO}
        monthLabel={MONTH_LABEL}
        pixKey="joao@cone.fit"
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

function PerfilDemo({ initial, height = 620 }) {
  const [coach, setCoach] = useState(initial)
  return (
    // overflow:auto — the pane scrolls in the app too, and with Pix on the cap field
    // sits below a clipped box.
    <div style={{ height, overflow: 'auto', border: '1px solid var(--divider)', display: 'flex' }}>
      <MeuPerfilPane coach={coach} setCoach={setCoach} locs={LOCS} onSelectAffiliate={NOOP} />
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
          sub="tabs/afiliados/PaneTabs.jsx — a arquitetura da plans/42 tem quatro painéis (Afiliados · Coaches · Turmas · Meu negócio). DOIS entram: Coaches é #103 e Turmas é #40, e nenhum dos dois tem dado ainda. A casca recebe os painéis como ARRAY, então cada um deles acrescenta uma linha — em vez de duas abas 'em breve' agora. `orientation='vertical'` (#161/plans/77) é um branch de render SEPARADO, não o mesmo markup com CSS — role=tablist/tab exige o tab como filho DIRETO da lista, e só o horizontal usa esse par."
        >
          <Case label="Horizontal — dois painéis vivos (interativo)">
            <PaneTabsDemo />
          </Case>
          <Case label="Vertical — com grupos e contador (interativo)">
            <div style={{ display: 'flex', border: '1px solid var(--divider)', width: 240 }}>
              <PaneTabs panes={PANES} active="afiliados" onChange={NOOP} orientation="vertical" />
            </div>
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
      id: 'afl-rail',
      label: 'AffiliateRail',
      render: () => (
        <Section
          title="AffiliateRail"
          sub="tabs/afiliados/AffiliateRail.jsx — o nav de topo do #161/plans/77 (mockup 60). 214px vertical em ≥768px, agrupado 'Painéis'/'Conta'; abaixo disso cai pra faixa horizontal existente (PaneTabs) — um rail de 214px numa tela de 390px não deixa espaço pro conteúdo. O troca-de-papel do mockup ('Sou dono do box' + 4 painéis) foi descartado de vez: o app não tem modelo de papéis pra alternar (plans/42)."
        >
          <Case label="Desktop — vertical, agrupado (interativo)">
            <RailDemo />
          </Case>
          <Case label="Mobile — faixa horizontal (< 768px, interativo)">
            <RailDemo compact />
          </Case>
          <Case label="Com contador — 'Meus afiliados' mostra quantos existem">
            <div style={{ display: 'flex', border: '1px solid var(--divider)', width: 240 }}>
              <PaneTabs
                panes={[
                  { id: 'afiliados', label: 'Meus afiliados', group: 'Painéis', count: 0 },
                  { id: 'perfil', label: 'Meu perfil', group: 'Conta' },
                ]}
                active="afiliados"
                onChange={NOOP}
                orientation="vertical"
              />
            </div>
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
          sub="tabs/afiliados/AffiliatesPane.jsx — três colunas agora (#161/plans/77, mockup 60): lista ('Onde eu trabalho') · detalhe (DirectionPair + AffiliateSessions + AthleteAssignment) · ReceivableRail ('A receber'). O perfil do coach, que ficava empilhado em cima da lista na mesma coluna de 260px com rolagem, virou o painel 'Meu perfil' desde o #56 — é isso que conserta o overflow do painel esquerdo naquela linha."
        >
          <Case label="Desktop — lista + detalhe + a receber (interativo: selecione, marque atletas)">
            <PaneDemo />
          </Case>
          <Case label="Nenhum afiliado — o estado vazio leva a ação">
            <PaneDemo locs={[]} />
          </Case>
          <Case label="Mobile — acordeão, com o par de direção e as sessões dentro de cada card">
            <div style={{ width: 390 }}>
              <PaneDemo compact height={760} />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'afl-direction',
      label: 'DirectionPair',
      render: () => (
        <Section
          title="DirectionPair"
          sub="tabs/afiliados/DirectionPair.jsx — a melhor ideia do mockup 60, e não custa nada construir: locations[].rate é o que o BOX paga ao coach; a chave Pix é o que o COACH cobra do atleta. Mesmo campo, mesma identidade Pix, sentidos opostos conforme loc.type — plans/42 decisão 2 existe porque essa ambiguidade é como sai uma cobrança errada em silêncio."
        >
          <Case label="Box — o box paga você">
            <div style={{ width: 460 }}>
              <DirectionPair
                loc={locBox}
                events={[EVENTS['2026-08-05'][0], EVENTS['2026-08-12'][0]]}
                pixKey="joao@cone.fit"
                monthLabel={MONTH_LABEL}
              />
            </div>
          </Case>
          <Case label="Personal — você cobra o atleta">
            <div style={{ width: 460 }}>
              <DirectionPair
                loc={locPersonal}
                events={[EVENTS['2026-08-12'][1]]}
                pixKey="joao@cone.fit"
                monthLabel={MONTH_LABEL}
              />
            </div>
          </Case>
          <Case label="Sem taxa configurada">
            <div style={{ width: 460 }}>
              <DirectionPair loc={locNoRate} events={[]} pixKey="" monthLabel={MONTH_LABEL} />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'afl-sessions',
      label: 'AffiliateSessions',
      render: () => (
        <Section
          title="AffiliateSessions"
          sub="tabs/afiliados/AffiliateSessions.jsx — as sessões do mês, já resolvidas pelo container/AffiliatesPane via eventsForAffiliate. Uma linha ainda não `completed` (não existe status 'cancelada' no schema — só scheduled/completed) aparece com 'Agendada', em vez de inventar um estado que os dados não têm."
        >
          <Case label="Vazio">
            <div style={{ width: 420 }}>
              <AffiliateSessions loc={locBox} events={[]} monthLabel={MONTH_LABEL} />
            </div>
          </Case>
          <Case label="Poucas sessões">
            <div style={{ width: 420 }}>
              <AffiliateSessions
                loc={locBox}
                events={[
                  { ...EVENTS['2026-08-05'][0], date: '2026-08-05' },
                  { ...EVENTS['2026-08-12'][0], date: '2026-08-12' },
                ]}
                monthLabel={MONTH_LABEL}
              />
            </div>
          </Case>
          <Case label="Uma sessão ainda não concluída (agendada)">
            <div style={{ width: 420 }}>
              <AffiliateSessions
                loc={locBox}
                events={[
                  { ...EVENTS['2026-08-05'][0], date: '2026-08-05' },
                  { ...EVENTS['2026-08-19'][0], date: '2026-08-19' },
                ]}
                monthLabel={MONTH_LABEL}
              />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'afl-receivable',
      label: 'ReceivableRail',
      render: () => (
        <Section
          title="ReceivableRail"
          sub="tabs/afiliados/ReceivableRail.jsx — o total do mês por afiliado, e o grande total. Recebe o blob de events cru e resolve cada afiliado sozinho (eventsForAffiliate) — a galeria entrega um único fixture, sem o container pré-calcular nada. O grande total é POR MOEDA (sumByCurrency), nunca achatado — a mesma razão pela qual o Relatório da Agenda nunca soma R$ com US$ num número só."
        >
          <Case label="Uma moeda">
            <div style={{ width: 280, display: 'flex', border: '1px solid var(--divider)' }}>
              <ReceivableRail
                locs={LOCS}
                events={EVENTS}
                from={FROM}
                to={TO}
                monthLabel={MONTH_LABEL}
                selectedId="l1"
                onSelect={NOOP}
              />
            </div>
          </Case>
          <Case label="Moedas mistas — R$ e US$ no mesmo total">
            <div style={{ width: 280, display: 'flex', border: '1px solid var(--divider)' }}>
              <ReceivableRail
                locs={[locBox, locUsd]}
                events={{ ...EVENTS, ...EVENTS_USD }}
                from={FROM}
                to={TO}
                monthLabel={MONTH_LABEL}
                onSelect={NOOP}
              />
            </div>
          </Case>
          <Case label="Zero — nenhum evento faturável no mês">
            <div style={{ width: 280, display: 'flex', border: '1px solid var(--divider)' }}>
              <ReceivableRail
                locs={[locNoRate]}
                events={{}}
                from={FROM}
                to={TO}
                monthLabel={MONTH_LABEL}
                onSelect={NOOP}
              />
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
          sub="tabs/afiliados/AthleteAssignment.jsx — a associação é guardada INVERTIDA, em locations[].athleteIds. Ganhou um estado de zero atletas de verdade: antes, sem atletas cadastrados, renderizava um <div> vazio e o painel parecia quebrado. #161/plans/77: um id em athleteIds sem atleta correspondente (nenhum banco garante integridade dentro de um array JSONB) vira uma linha 'Atleta removido' removível, em vez de sumir da lista sem explicação."
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
              <AthleteAssignment
                loc={{ ...locBox, athleteIds: [] }}
                athletes={[]}
                onToggle={NOOP}
              />
            </div>
          </Case>
          <Case label="Um atleta vinculado foi excluído (id órfão)">
            <div style={{ maxWidth: 420 }}>
              <AthleteAssignment
                loc={{ ...locBox, athleteIds: ['a1', 'deleted-1'] }}
                athletes={athletes}
                onToggle={NOOP}
              />
            </div>
          </Case>
        </Section>
      ),
    },
    {
      id: 'afl-perfil',
      label: 'MeuPerfilPane',
      render: () => (
        <Section
          title="MeuPerfilPane"
          sub="tabs/afiliados/MeuPerfilPane.jsx (era MeuNegocioPane, #161/plans/77) — ganhou o card 'Taxas por afiliado', só leitura: a taxa é editada no próprio afiliado, clicar numa linha leva pra lá (onSelectAffiliate). 'Quem vê o quê' do mockup 60 NÃO entra — descreveria uma visibilidade por afiliado que nenhuma camada do app implementa (plans/42, plans/77 Approach 4)."
        >
          <Case label="Pix ativado — chave, cidade e cap de teste">
            <PerfilDemo
              height={760}
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
            <PerfilDemo
              initial={{ name: 'Zé Arthur', contact: '', phone: '', pixEnabled: false }}
            />
          </Case>
          <Case label="Vazio — primeira visita">
            <PerfilDemo initial={{}} />
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
