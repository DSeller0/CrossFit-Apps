import { calcTotal, fmtDur, fmtMoney } from '../publicador/billing.js'
import { periodLabel } from './billingState.js'
import s from './Afiliados.module.css'

const STATUS_NOTE = {
  draft: 'rascunho — revisar e enviar',
  sent: 'enviada — aguardando pagamento',
  paid: 'paga',
}

// A sent invoice isn't tracked against a due date — there is no such field on
// the stamp (plans/78 deliberately keeps this a status stamp, not an invoice
// entity with payment terms). "Overdue" is a computed courtesy flag only: sent
// more than 30 days ago and still waiting, so the coach's eye is drawn to it —
// not a claim that a specific due date has passed.
const OVERDUE_MS = 30 * 24 * 60 * 60 * 1000
const isOverdue = stamp =>
  stamp?.status === 'sent' &&
  stamp.sentAt &&
  Date.now() - new Date(stamp.sentAt).getTime() > OVERDUE_MS

// One card on the Fechamento board (#162/plans/78) — 'open' (no stamp yet, hours
// summed live) or a stamp's own draft/sent/paid. `events` arrives PRE-FILTERED to
// this card's own (affiliate, period), same convention as DirectionPair /
// AffiliateSessions — the container resolves it via `eventsForAffiliate`.
//
// 🔴 draft reads its total LIVE (`calcTotal` over `events`, so an edited event
// still moves it); sent/paid read the STAMP's own frozen total. That fork IS the
// freeze rule (billingState.js's `advance`) — this component just displays
// whichever one applies, it does not decide.
//
// CLIENT-FREE.
export default function InvoiceCard({
  loc,
  period,
  stamp,
  events = [],
  selected = false,
  onSelect,
}) {
  const status = stamp?.status || 'open'
  const frozen = status === 'sent' || status === 'paid'
  const totalLabel = frozen
    ? fmtMoney(stamp.total, stamp.currency)
    : calcTotal(events, loc).label || '—'
  const totalMin = events.reduce((sum, ev) => sum + (ev.durationMin || 60), 0)
  const overdue = isOverdue(stamp)

  return (
    <button
      type="button"
      className={`${s.invCard}${selected ? ' ' + s.invCardOn : ''}`}
      style={{ borderLeftColor: loc.color || 'var(--muted)' }}
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
    >
      <div className={s.invCardTop}>
        <span className={s.invCardName}>{loc.name}</span>
        <span className={s.invCardPeriod}>{periodLabel(period).toLowerCase()}</span>
      </div>
      <div className={s.invCardTotal}>{totalLabel}</div>
      <div className={`${s.invCardMeta}${overdue ? ' ' + s.invCardMetaWarn : ''}`}>
        {status === 'open'
          ? `${fmtDur(totalMin)} · ${events.length} ${events.length === 1 ? 'sessão' : 'sessões'}`
          : overdue
            ? 'vencida — mais de 30 dias sem pagamento'
            : STATUS_NOTE[status]}
      </div>
    </button>
  )
}
