import Card from '../../ui/Card.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import { calcTotal, sumByCurrency } from '../publicador/billing.js'
import { eventsForAffiliate } from './affiliateHelpers.js'
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
// CLIENT-FREE.
export default function ReceivableRail({
  locs = [],
  events = {},
  from,
  to,
  monthLabel = '',
  selectedId = null,
  onSelect,
}) {
  const rows = locs.map(loc => ({
    loc,
    total: calcTotal(eventsForAffiliate(events, loc, from, to), loc),
  }))
  const grand = sumByCurrency(
    rows.flatMap(({ total }) =>
      Object.entries(total.totals).map(([currency, amt]) => ({ total: amt, currency })),
    ),
  )
  const activeCount = rows.filter(({ total }) => total.currencies.length > 0).length

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
          {rows.map(({ loc, total }) => (
            <button
              key={loc.id}
              type="button"
              className={`${s.receivableRow}${selectedId === loc.id ? ' ' + s.receivableRowOn : ''}`}
              aria-current={selectedId === loc.id ? 'true' : undefined}
              onClick={() => onSelect?.(loc.id)}
            >
              <span className={s.dot} style={{ background: loc.color || 'var(--muted)' }} />
              <span className={s.receivableName}>{loc.name}</span>
              <span className={s.receivableValue}>{total.label || '—'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
