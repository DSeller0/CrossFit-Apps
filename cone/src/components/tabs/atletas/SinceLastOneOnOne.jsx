import { shortDate } from './atletasHelpers.js'
import s from './Atletas.module.css'

// "Desde o último 1:1" (#160/plans/76) — what changed since the coach's last
// written note. The anchor is the newest coachNotes date; every row derives from
// data that already existed (PR improvements, milestones hit, sessions assigned
// with no result) — only the anchor itself (`since` from sinceLastNote) is new.
// CLIENT-FREE.
export default function SinceLastOneOnOne({ since }) {
  if (!since?.anchorDate) {
    return (
      <div className={s.sinceEmpty}>
        Sem 1:1 registrado ainda — a primeira nota abre o histórico.
      </div>
    )
  }
  if (since.items.length === 0) {
    return <div className={s.sinceEmpty}>Nada de novo desde {shortDate(since.anchorDate)}.</div>
  }
  return (
    <div>
      {since.items.map((item, i) => (
        <div key={i} className={s.sinceRow}>
          <span className={s.sinceDate}>{shortDate(item.date)}</span>
          {item.kind === 'event' ? (
            <span className={s.sinceText}>
              {item.title}
              {item.sub && <span className={s.sinceSub}> — {item.sub}</span>}
            </span>
          ) : (
            <span className={s.sinceText}>
              {item.session.sessionName || 'Sessão'} sem resultado registrado
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
