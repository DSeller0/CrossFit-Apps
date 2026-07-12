import styles from './Results.module.css'
import { onKey } from '../schedule/scheduleHelpers.js'
import { sessName } from './resultsHelpers.js'

// Collapsed session card, mobile (#51). The old header carried a dot, the name
// and a chevron — nothing you could act on without opening it. It now answers
// the three questions you open it to ask: how many logged, who is leading, and
// where you stand (the SugarWOD-whiteboard pattern the benchmark called out).
//
// Presentational: the expanded body is passed as children, so this stays
// renderable from fixtures in the gallery.
export default function SessionCard({ sess, dk, isExpanded, onToggle, summary, hasAthlete = false, children }) {
  const { count = 0, leaderName = '', leaderPerf = '', ownPerf = '' } = summary || {}
  const name = sessName(sess, dk)

  return (
    <div data-sess-id={sess.id} className={`${styles.card}${isExpanded ? ' ' + styles.cardExpanded : ''}`}>
      <div className={styles.cardHdr} role="button" tabIndex={0} aria-expanded={isExpanded}
        onClick={onToggle} onKeyDown={onKey(onToggle)}>
        <div className={styles.cardTop}>
          <span className={`${styles.cardDot}${count > 0 ? ' ' + styles.cardDotFilled : ''}`} />
          <span className={styles.cardName}>{name}</span>
          <i className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-down'} ${styles.cardChevron}`} aria-hidden="true" />
        </div>

        <div className={styles.cardMeta}>
          {count > 0 ? (
            <>
              <span className={styles.cardCount}>{count} resultado{count !== 1 ? 's' : ''}</span>
              {leaderName && (
                <span className={styles.cardLeader}>
                  <i className="ti ti-trophy" aria-hidden="true" />
                  <span className={styles.cardLeaderName}>{leaderName}</span>
                  <span className={styles.cardLeaderPerf}>{leaderPerf}</span>
                </span>
              )}
            </>
          ) : (
            <span className={styles.cardCountEmpty}>Nenhum resultado ainda</span>
          )}

          {hasAthlete && (
            ownPerf
              ? <span className={styles.cardOwn}>Você <b>{ownPerf}</b></span>
              : <span className={styles.cardOwnCta}>Registrar</span>
          )}
        </div>
      </div>

      {isExpanded && <div className={styles.cardBody}>{children}</div>}
    </div>
  )
}
