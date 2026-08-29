import Card from '../../ui/Card.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import { calcTotal, sumByCurrency } from '../publicador/billing.js'
import { eventsForAffiliate } from './affiliateHelpers.js'
import { periodKey, stampFor, isReceivable } from './billingState.js'
import s from './Afiliados.module.css'

// "A receber" (#161/plans/77, mockup 60) — every affiliate's month total, and the
// grand total across all of them. `events` is the raw blob (keyed by date, same
// shape `useSync()` hands the rest of the app) so this component can resolve each
// affiliate's own events itself (`eventsForAffiliate`) rather than the container
// pre-computing N filtered arrays — the gallery can hand it one fixture.
//
// The grand total is per-currency (`sumByCurrency` over every affiliate's own
// per-currency totals) — the same reason `publicador/events.jsx`'s ReportModal
// never flattens a mixed-currency group into one number.
//
// #163: a `paid` invoice is money already received, not money owed — it's
// excluded from `grand` and from `activeCount`. The row still RENDERS (muted,
// with a "paga" marker) rather than going blank — blanking it would make a paid
// month indistinguishable from an affiliate with no sessions at all, which is a
// different state. `sent` stays counted: invoiced-and-waiting is exactly what "a
// receber" means. The rail shows a single month, so one `periodKey(from)` covers
// every row.
//
// CLIENT-FREE.
export default function ReceivableRail({
  locs = [],
  events = {},
  billing = {},
  from,
  to,
  monthLabel = '',
  selectedId = null,
  onSelect,
}) {
  const period = periodKey(from)
  const rows = locs.map(loc => ({
    loc,
    total: calcTotal(eventsForAffiliate(events, loc, from, to), loc),
    paid: !isReceivable(stampFor(billing, loc.id, period)),
  }))
  const grand = sumByCurrency(
    rows
      .filter(({ paid }) => !paid)
      .flatMap(({ total }) =>
        Object.entries(total.totals).map(([currency, amt]) => ({ total: amt, currency })),
      ),
  )
  const activeCount = rows.filter(({ total, paid }) => !paid && total.currencies.length > 0).length

  return (
    <div className={s.receivableRail}>
      <Card pad="sm" title={`A receber · ${monthLabel.toLowerCase()}`}>
        <div className={s.receivableTotal}>{grand.label || 'Nada a receber'}</div>
        {activeCount > 0 && (
          <div className={s.receivableCount}>
            {activeCount} afiliado{activeCount === 1 ? '' : 's'}
          </div>
        )}
      </Card>

      {rows.length === 0 ? (
        <EmptyState inline title="Nenhum afiliado ainda" />
      ) : (
        <div className={s.receivableList}>
          {rows.map(({ loc, total, paid }) => (
            <button
              key={loc.id}
              type="button"
              className={`${s.receivableRow}${selectedId === loc.id ? ' ' + s.receivableRowOn : ''}`}
              aria-current={selectedId === loc.id ? 'true' : undefined}
              onClick={() => onSelect?.(loc.id)}
            >
              <span className={s.dot} style={{ background: loc.color || 'var(--muted)' }} />
              <span className={s.receivableName}>{loc.name}</span>
              <span className={`${s.receivableValue}${paid ? ' ' + s.receivableValuePaid : ''}`}>
                {total.label || '—'}
              </span>
              {paid && <span className={s.receivablePaidTag}>paga</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
