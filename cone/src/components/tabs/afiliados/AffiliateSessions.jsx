import EmptyState from '../../ui/EmptyState.jsx'
import { fmtDateShort } from '../../../public/lib/week.js'
import { calcTotal, fmtDur } from '../publicador/billing.js'
import s from './Afiliados.module.css'

// This affiliate's sessions for the reporting month (#161/plans/77, mockup 60).
// `events` arrives pre-filtered to this affiliate + period (`eventsForAffiliate`,
// computed by the container/AffiliatesPane) — this component only lists and sums.
//
// A row not yet `status: 'completed'` (`publicador/AgendaView.jsx`'s `evStatus`)
// is flagged "Agendada": there is no "cancelled" status in the schema (only
// `scheduled`/`completed`, see events.jsx), so this reads the field that exists
// rather than inventing one.
//
// CLIENT-FREE.
export default function AffiliateSessions({ loc, events = [], monthLabel = '' }) {
  const totalMin = events.reduce((sum, ev) => sum + (ev.durationMin || 60), 0)

  return (
    <div>
      <div className={s.sessHdr}>
        <h3 className={s.assignTitle}>Sessões de {monthLabel.toLowerCase()}</h3>
        {events.length > 0 && (
          <span className={s.sessSummary}>
            {fmtDur(totalMin)} · {events.length} {events.length === 1 ? 'sessão' : 'sessões'}
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <EmptyState inline title="Nenhuma sessão neste mês" />
      ) : (
        <div className={s.sessList}>
          {events.map((ev, i) => {
            const scheduled = ev.status && ev.status !== 'completed'
            const value = calcTotal([ev], loc).label
            return (
              <div
                key={`${ev.date}-${ev.time}-${i}`}
                className={`${s.sessRow}${scheduled ? ' ' + s.sessRowPending : ''}`}
              >
                <span className={s.sessDate}>{fmtDateShort(ev.date)}</span>
                <span className={s.sessLabel}>
                  {ev.label || (ev.type === 'personal' ? 'Personal' : 'Aula')}
                </span>
                <span className={s.sessTime}>{ev.time}</span>
                <span className={s.sessDur}>{fmtDur(ev.durationMin || 60)}</span>
                <span className={s.sessValue}>{value || '—'}</span>
                {scheduled && <span className={s.sessBadge}>Agendada</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
