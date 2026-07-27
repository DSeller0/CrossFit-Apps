import { fmtDateShort } from '../lib/week.js'
import styles from './Me.module.css'

// "Eventos Recentes" — the last 5 good things: PR improvements and milestones hit.
// buildEvents() returns a semantic `tone`, not a color (meHelpers.js), which is what
// let the three hardcoded green/red hex pairs leave the page.
export default function EventList({ events }) {
  return (
    <section className={styles.sh}>
      <div className={styles.shInner}>
        <h2 className={styles.shTitle}>
          Eventos Recentes <span className={styles.shTitleR}>últimos 5</span>
        </h2>
        {!events.length ? (
          <p className={styles.emptyLine}>Nenhum evento recente.</p>
        ) : (
          events.map((ev, i) => (
            <div key={i} className={styles.evItem}>
              <span className={styles.di} aria-hidden="true">
                ◈
              </span>
              <div className={styles.evMain}>
                <div className={styles.evTitle}>{ev.title}</div>
                <div className={styles.evSub}>{ev.sub}</div>
              </div>
              <div className={styles.evRight}>
                <span className={`${styles.evVal} ${styles.toneGood}`}>{ev.val}</span>
                <span className={styles.evDate}>{fmtDateShort(ev.date)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
