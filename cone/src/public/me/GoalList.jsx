import SegBar from '../shared/SegBar.jsx'
import styles from './Me.module.css'

// The athlete's goals, each an HP bar with milestone markers you can expand.
// The bar is the shared SegBar (#52) — the same primitive the Desenvolvimento stats
// card will use (plans/22), so the two can't drift apart the way the three
// hand-rolled copies of this bar already had.
export default function GoalList({ goals, totalMarcosHit }) {
  return (
    <section className={styles.sh}><div className={styles.shInner}>
      <h2 className={styles.shTitle}>
        Objetivos
        <span className={styles.shTitleR}>
          {totalMarcosHit} marco{totalMarcosHit !== 1 ? 's' : ''} atingido{totalMarcosHit !== 1 ? 's' : ''}
        </span>
      </h2>

      {goals.map((goal, gi) => {
        const pct = goal.totalSessions > 0
          ? Math.min(100, Math.round(goal.completedSessions / goal.totalSessions * 100))
          : 0
        const ms = (goal.milestones || []).slice().sort((a, b) => a.pct - b.pct)
        const hitCount = ms.filter(m => m.hit).length
        const nextMs = ms.find(m => !m.hit)
        const ticks = ms.map(m => ({
          pct: m.pct,
          state: m.hit ? 'hit' : m === nextMs ? 'next' : 'future',
        }))

        return (
          <div key={gi} className={styles.goalItem}>
            <div className={styles.goalHdr}>
              <span className={styles.goalName}>{goal.name}</span>
              <span className={`${styles.goalPct} ${pct >= 100 ? styles.goalPctDone : styles.goalPctOn}`}>{pct}%</span>
              {ms.length > 0 && <span className={styles.goalMarcos}>{hitCount}/{ms.length} marcos</span>}
            </div>

            <details className={styles.msDetails}>
              <summary>
                <SegBar pct={pct} color="var(--teal)" ticks={ticks} segments={100} size="lg" />
                {ms.length > 0 && <div className={styles.msHint}>◈ ver marcos</div>}
              </summary>
              {ms.length > 0 && (
                <div className={styles.msList}>
                  {ms.map((m, mi) => {
                    const cls = m.hit ? styles.msRowHit : m === nextMs ? styles.msRowNxt : styles.msRowFut
                    const status = m.hit ? 'atingido ✓' : m === nextMs ? 'próximo →' : ''
                    return (
                      <div key={mi} className={`${styles.msRow} ${cls}`}>
                        <span className={styles.msRowIcon} aria-hidden="true">{m.hit ? '◆' : '◇'}</span>
                        <span className={styles.msRowName}>{m.label}</span>
                        <span className={styles.msRowPct}>{m.pct}%</span>
                        {status && <span className={styles.msRowStatus}>{status}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </details>

            <div className={styles.goalSub}>{goal.completedSessions} de {goal.totalSessions} sessões</div>
          </div>
        )
      })}
    </div></section>
  )
}
