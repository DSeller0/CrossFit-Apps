import { DAY_PT_TITLE } from '../../../public/lib/week.js'
import { shortDate } from './atletasHelpers.js'
import s from './Atletas.module.css'

// The athlete's session strip — last two, next one (#56/C2).
//
// `items` are precomputed by the container (`sessionStrip()` in atletasHelpers,
// plus the athlete's own result for each date), and `todayKey` is injected rather
// than read from the clock: `new Date()` in a render body is a react-hooks/purity
// violation, and it makes both this and the helper untestable.
//
//   items    [{ date, session, perf, logged }]
//   todayKey 'yyyy-mm-dd'
// CLIENT-FREE.
export default function SessionStrip({ items = [], todayKey }) {
  return (
    <div>
      {items.map(({ date, session, perf, logged }) => {
        const isToday = date === todayKey
        const isPast = date <= todayKey
        const day = DAY_PT_TITLE[new Date(date + 'T12:00:00').getDay()]
        return (
          <div key={date + '|' + session.id} className={s.sess}>
            <div
              className={`${s.sessBar}${
                isToday ? ' ' + s.sessBarToday : isPast ? ' ' + s.sessBarPast : ''
              }`}
            />
            <div className={s.sessBody}>
              <div className={`${s.sessName}${isToday ? ' ' + s.sessNameToday : ''}`}>
                {session.sessionName || day}
              </div>
              <div className={s.sessDate}>
                {day} · {shortDate(date)}
              </div>
            </div>
            {isToday && <span className={s.sessToday}>Hoje</span>}
            {isPast && !isToday && perf && <span className={s.sessPerf}>{perf}</span>}
            {isPast && !isToday && !logged && <span className={s.sessNone}>—</span>}
            {!isPast && <span className={s.sessNext}>Próxima</span>}
          </div>
        )
      })}
    </div>
  )
}
