import styles from './Results.module.css'
import AccordionCard from '../shared/AccordionCard.jsx'
import { sessName } from './resultsHelpers.js'

// Collapsed session card, mobile (#51). The old header carried a dot, the name
// and a chevron — nothing you could act on without opening it. It now answers
// the three questions you open it to ask: how many logged, who is leading, and
// where you stand (the SugarWOD-whiteboard pattern the benchmark called out).
//
// The disclosure itself is AccordionCard, shared with leaderboard's WodCard —
// same gesture, same keyboard contract. Only this header's contents are local.
export default function SessionCard({
  sess,
  dk,
  isExpanded,
  onToggle,
  summary,
  hasAthlete = false,
  children,
}) {
  const { count = 0, leaderName = '', leaderPerf = '', ownPerf = '' } = summary || {}

  const meta = (
    <>
      {count > 0 ? (
        <>
          <span className={styles.cardCount}>
            {count} resultado{count !== 1 ? 's' : ''}
          </span>
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

      {hasAthlete &&
        (ownPerf ? (
          <span className={styles.cardOwn}>
            Você <b>{ownPerf}</b>
          </span>
        ) : (
          <span className={styles.cardOwnCta}>Registrar</span>
        ))}
    </>
  )

  return (
    <AccordionCard
      dataId={sess.id}
      title={sessName(sess, dk)}
      meta={meta}
      filled={count > 0}
      expanded={isExpanded}
      onToggle={onToggle}
    >
      {children}
    </AccordionCard>
  )
}
