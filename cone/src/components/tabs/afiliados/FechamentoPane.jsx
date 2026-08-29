import { useState } from 'react'
import { IconInbox } from '@tabler/icons-react'
import EmptyState from '../../ui/EmptyState.jsx'
import InvoiceCard from './InvoiceCard.jsx'
import InvoiceDetail from './InvoiceDetail.jsx'
import { eventsForAffiliate } from './affiliateHelpers.js'
import { periodKey, periodBounds, allStamps, stampFor, columnOf } from './billingState.js'
import s from './Afiliados.module.css'

const COLUMNS = [
  { id: 'open', label: 'Sessões abertas' },
  { id: 'draft', label: 'Rascunho' },
  { id: 'sent', label: 'Enviada' },
  { id: 'paid', label: 'Paga' },
]

// Builds every card the board shows. 'open' is scoped to the CURRENT period only
// — a fresh invoice always starts from this month's unbilled sessions (via
// `columnOf`, the same per-(affiliate, period) resolution `InvoiceDetail`'s own
// "Iniciar rascunho" path relies on when reached through a cross-panel link for
// a different period) — while the other three columns show every stamp that
// exists, whichever period it's for: a July "Paga" card and an August "Enviada"
// one sit side by side, matching mockup 60. That second pass can't reuse
// `columnOf` — it resolves ONE (affiliate, period) pair, and this needs to
// enumerate every stamped period across every affiliate at once — so it walks
// `allStamps` directly instead.
function buildBoard(locs, events, billing) {
  const board = { open: [], draft: [], sent: [], paid: [] }
  const currentPeriod = periodKey(new Date())
  locs.forEach(loc => {
    if (columnOf(loc, currentPeriod, billing, events) === 'open') {
      board.open.push({ loc, period: currentPeriod })
    }
  })
  allStamps(billing).forEach(({ affiliateId, period, stamp }) => {
    const loc = locs.find(l => l.id === affiliateId)
    if (!loc || !board[stamp.status]) return
    board[stamp.status].push({ loc, period })
  })
  Object.values(board).forEach(col => col.sort((a, b) => b.period.localeCompare(a.period)))
  return board
}

// "Fechamento" (#162/plans/78, mockup 60) — the invoice board: Sessões abertas →
// Rascunho → Enviada → Paga. The STAMP decides the column; `publicador/
// billing.js`'s `calcTotal` still decides the number (see InvoiceCard/
// InvoiceDetail's own draft-vs-frozen fork). `coach` carries both `billing` and
// the Pix profile the detail pane needs.
//
// `selectedAffiliateId`/`selectedPeriod` are lifted to the container so "Ver na
// fatura →" (Minha semana) and the "Cobranças emitidas" rows (Meu perfil) can
// land on a specific invoice via the same `onSelect`.
//
// CLIENT-FREE.
export default function FechamentoPane({
  locs = [],
  events = {},
  coach,
  selectedAffiliateId = null,
  selectedPeriod = null,
  onSelect,
  onAdvance,
  compact = false,
}) {
  const [activeCol, setActiveCol] = useState('open')
  const board = buildBoard(locs, events, coach.billing)
  const selLoc = locs.find(l => l.id === selectedAffiliateId) || null
  const selStamp = selLoc ? stampFor(coach.billing, selLoc.id, selectedPeriod) : null
  const selBounds = selectedPeriod ? periodBounds(selectedPeriod) : null
  const selEvents =
    selLoc && selBounds ? eventsForAffiliate(events, selLoc, selBounds.from, selBounds.to) : []

  const detail = selLoc && (
    <InvoiceDetail
      loc={selLoc}
      period={selectedPeriod}
      stamp={selStamp}
      events={selEvents}
      coach={coach}
      onAdvance={(to, computed) => onAdvance?.(selLoc.id, selectedPeriod, to, computed)}
    />
  )

  if (compact) {
    return (
      <div className={s.fechMobile}>
        <div className={s.fechColTabs}>
          {COLUMNS.map(c => (
            <button
              key={c.id}
              type="button"
              className={`${s.fechColTab}${activeCol === c.id ? ' ' + s.fechColTabOn : ''}`}
              onClick={() => {
                setActiveCol(c.id)
                onSelect?.(null, null)
              }}
            >
              {c.label}
              <span className={s.fechColCount}>{board[c.id].length}</span>
            </button>
          ))}
        </div>
        {selLoc ? (
          <div className={s.fechMobileDetail}>
            <button type="button" className={s.fechBack} onClick={() => onSelect?.(null, null)}>
              ‹ Voltar à lista
            </button>
            {detail}
          </div>
        ) : board[activeCol].length === 0 ? (
          <EmptyState inline icon={<IconInbox />} title="Nada aqui" />
        ) : (
          <div className={s.fechCardList}>
            {board[activeCol].map(({ loc, period }) => {
              const { from: f, to: t } = periodBounds(period)
              return (
                <InvoiceCard
                  key={`${loc.id}-${period}`}
                  loc={loc}
                  period={period}
                  stamp={stampFor(coach.billing, loc.id, period)}
                  events={eventsForAffiliate(events, loc, f, t)}
                  onSelect={() => onSelect?.(loc.id, period)}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={s.fechBody}>
      <div className={s.fechBoard}>
        {COLUMNS.map(c => (
          <div key={c.id} className={s.fechCol}>
            <div className={s.fechColHdr}>
              <span className={s.fechColLabel}>{c.label}</span>
              <span className={s.fechColCount}>{board[c.id].length}</span>
            </div>
            <div className={s.fechColBody}>
              {board[c.id].length === 0 ? (
                <EmptyState inline title="Nada aqui" />
              ) : (
                board[c.id].map(({ loc, period }) => {
                  const { from: f, to: t } = periodBounds(period)
                  return (
                    <InvoiceCard
                      key={`${loc.id}-${period}`}
                      loc={loc}
                      period={period}
                      stamp={stampFor(coach.billing, loc.id, period)}
                      events={eventsForAffiliate(events, loc, f, t)}
                      selected={selectedAffiliateId === loc.id && selectedPeriod === period}
                      onSelect={() => onSelect?.(loc.id, period)}
                    />
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>
      <div className={s.fechDetail}>
        {detail || (
          <EmptyState
            pane
            icon={<IconInbox />}
            title="Selecione uma fatura"
            text="Escolha um cartão para ver o detalhe, o QR Pix e avançar o status."
          />
        )}
      </div>
    </div>
  )
}
