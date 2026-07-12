import styles from './Me.module.css'

// The four headline numbers. "Streak" was the page's last English label — it's
// "Sequência" now (#52); RPE stays RPE, which is what the box actually says.
export default function KpiStrip({ pd }) {
  return (
    <div className={styles.kpiStrip}>
      <div className={styles.kpi}>
        <div className={styles.kpiV}>{pd.totalSess}</div>
        <div className={styles.kpiL}>Sessões</div>
        <div className={styles.kpiSub}>↑ {pd.thisMon} este mês</div>
      </div>

      <div className={styles.kpi}>
        <div className={styles.kpiV}>{pd.streak > 0 ? pd.streak + ' 🔥' : pd.streak}</div>
        <div className={styles.kpiL}>Sequência</div>
        <div className={styles.kpiSub}>
          {pd.maxStreak > pd.streak ? 'recorde: ' + pd.maxStreak + ' dias' : pd.streak > 0 ? 'recorde atual' : 'sem sequência'}
        </div>
      </div>

      <div className={styles.kpi}>
        <div className={`${styles.kpiV} ${styles.kpiVTeal}`}>{pd.totalPrs}</div>
        <div className={styles.kpiL}>PRs</div>
        <div className={styles.kpiSub}>{pd.prsThisMon > 0 ? pd.prsThisMon + ' este mês' : 'nenhum este mês'}</div>
      </div>

      <div className={styles.kpi}>
        <div className={`${styles.kpiV} ${styles.kpiVSub}`}>{pd.rxRate !== null ? pd.rxRate + '%' : '—'}</div>
        <div className={styles.kpiL}>Taxa RX</div>
        <div className={styles.kpiSub}>
          {pd.rxDelta !== null ? (pd.rxDelta >= 0 ? '↑' : '↓') + ' ' + Math.abs(pd.rxDelta) + '% vs mês ant.' : ''}
        </div>
      </div>
    </div>
  )
}
