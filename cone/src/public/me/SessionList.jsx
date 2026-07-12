import { fmtDate } from '../lib/week.js'
import { scaleColor, scaleLabel } from '../lib/wod.js'
import styles from './Me.module.css'

// The athlete's last 5 sessions. The scale badge now renders in the canonical
// SCALE_COL (lib/wod.js, #51): me.html used to paint SC orange and Inter blue while
// results.html and leaderboard.html painted Inter orange and SC purple — the same
// result, a different color depending on which page you were looking at.
export default function SessionList({ rows }) {
  return (
    <section className={styles.sh}><div className={styles.shInner}>
      <h2 className={styles.shTitle}>Sessões Recentes <span className={styles.shTitleR}>últimas 5</span></h2>
      {!rows.length
        ? <p className={styles.emptyLine}>Nenhuma sessão registrada ainda.</p>
        : (
          <>
            <div className={styles.sessColHdr}>
              <span /><span>Sessão</span><span>Data</span><span>Escala</span><span>RPE</span>
            </div>
            {rows.map((r, i) => (
              <div key={i} className={styles.sessRow}>
                <span className={styles.sdi} aria-hidden="true">◈</span>
                <span className={styles.sname}>
                  {r.name}
                  {r.hasPr && <span className={`${styles.bdg} ${styles.bPr}`}>PR</span>}
                </span>
                <span className={styles.sdate}>{fmtDate(r.date)}</span>
                <span className={styles.sscale}>
                  {r.scale && r.scale !== '-' && (
                    <span
                      className={styles.bdg}
                      style={{
                        color: scaleColor(r.scale),
                        background: `color-mix(in srgb, ${scaleColor(r.scale)} 12%, transparent)`,
                      }}
                    >{scaleLabel(r.scale)}</span>
                  )}
                </span>
                <span className={styles.srpe}>{r.rpe || '—'}</span>
              </div>
            ))}
          </>
        )}
    </div></section>
  )
}
