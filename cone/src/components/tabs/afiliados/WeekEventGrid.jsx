import { DAY_PT_TITLE, toISO } from '../../../public/lib/week.js'
import { resolveEventLoc } from './affiliateHelpers.js'
import s from './Afiliados.module.css'

// The week grid itself (#162/plans/78, mockup 60) — rows are every DISTINCT
// event time in the week, not a fixed hourly scale (a coach's day is a handful
// of class times, not 24 slots); columns are the 7 days, Sunday-start
// (`weekDates` comes from `week.js`'s `getWeek(offset)`). A cell can hold more
// than one event at the same time on the same day — it stacks them rather than
// picking one.
//
// `compact` (mobile) drops the grid for a per-day list — an 8-column grid
// (52px + 7 day columns) has no room on a 390px screen.
//
// Each chip's colour comes from `resolveEventLoc` (a personal event carries no
// `locationId` of its own), and a not-yet-`completed` event is visually
// de-emphasised — never labelled "cancelada", since that status doesn't exist
// in the schema (only `scheduled`/`completed`, same honesty rule as
// AffiliateSessions.jsx).
//
// CLIENT-FREE.
export default function WeekEventGrid({
  weekDates,
  events = {},
  locs = [],
  compact = false,
  selectedKey,
  onSelect,
}) {
  const days = weekDates.map(d => {
    const iso = toISO(d)
    const evs = (events[iso] || [])
      .slice()
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    return { date: d, iso, evs }
  })

  if (compact) {
    return (
      <div className={s.weekList}>
        {days.map(({ date, iso, evs }) => (
          <div key={iso} className={s.weekListDay}>
            <div className={s.weekListDayHdr}>
              {DAY_PT_TITLE[date.getDay()]} {date.getDate()}
            </div>
            {evs.length === 0 ? (
              <div className={s.weekListEmpty}>—</div>
            ) : (
              evs.map((ev, i) => {
                const loc = resolveEventLoc(ev, locs)
                const key = `${iso}-${ev.time}-${i}`
                return (
                  <button
                    type="button"
                    key={key}
                    className={`${s.weekListRow}${selectedKey === key ? ' ' + s.weekListRowOn : ''}`}
                    style={{ borderLeftColor: loc?.color || 'var(--muted)' }}
                    onClick={() => onSelect?.({ ...ev, date: iso }, key)}
                  >
                    <span className={s.weekListTime}>{ev.time}</span>
                    <span className={s.weekListLabel}>
                      {ev.label || (ev.type === 'personal' ? 'Personal' : 'Aula')}
                    </span>
                    {ev.status !== 'completed' && <span className={s.weekListBadge}>Agendada</span>}
                  </button>
                )
              })
            )}
          </div>
        ))}
      </div>
    )
  }

  const times = Array.from(new Set(days.flatMap(d => d.evs.map(e => e.time || '')))).sort()
  if (times.length === 0) {
    return <div className={s.weekEmpty}>Nenhum evento nesta semana.</div>
  }

  return (
    <div className={s.weekGridWrap}>
      <div className={s.weekGrid}>
        <div className={s.weekCorner} />
        {days.map(({ date, iso }) => (
          <div key={iso} className={s.weekDayHdr}>
            <span className={s.weekDayName}>{DAY_PT_TITLE[date.getDay()]}</span>
            <span className={s.weekDayNum}>{date.getDate()}</span>
          </div>
        ))}
        {times.map(time => [
          <div key={`t-${time}`} className={s.weekTimeLbl}>
            {time}
          </div>,
          ...days.map(({ iso, evs }) => {
            const cellEvs = evs.filter(e => (e.time || '') === time)
            return (
              <div key={`${iso}-${time}`} className={s.weekCell}>
                {cellEvs.map((ev, i) => {
                  const loc = resolveEventLoc(ev, locs)
                  const key = `${iso}-${time}-${i}`
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`${s.weekChip}${selectedKey === key ? ' ' + s.weekChipOn : ''}${
                        ev.status !== 'completed' ? ' ' + s.weekChipPending : ''
                      }`}
                      style={{ borderLeftColor: loc?.color || 'var(--muted)' }}
                      onClick={() => onSelect?.({ ...ev, date: iso }, key)}
                    >
                      {ev.label || (ev.type === 'personal' ? 'Personal' : 'Aula')}
                    </button>
                  )
                })}
              </div>
            )
          }),
        ])}
      </div>
    </div>
  )
}
