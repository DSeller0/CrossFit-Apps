import styles from './Results.module.css'
import { isTimeBlock } from '../lib/wod.js'

// One grid, two densities (#51 — was two components over two near-identical
// calculators). `compact` is the mobile session card; `extended` is the desktop
// pane, which has room for the per-scale split.
export default function KpiGrid({ kpis, btype, variant = 'compact' }) {
  const { count, avgRpe, perfKpi, rxPct, rxPctStr, interPct, scPct } = kpis
  const perfLbl = isTimeBlock(btype) ? 'Tempo médio' : 'Rds médio'

  const items = variant === 'extended'
    ? [
        { val: count,          lbl: 'Atletas' },
        { val: avgRpe || '—',  lbl: 'RPE médio' },
        { val: perfKpi || '—', lbl: perfLbl },
        { val: rxPctStr,       lbl: '% RX' },
        { val: interPct,       lbl: '% Inter' },
        { val: scPct,          lbl: '% SC' },
      ]
    : [
        { val: count,                          lbl: 'Atletas' },
        { val: avgRpe || '—',                  lbl: 'RPE médio' },
        { val: rxPct !== null ? rxPct + '%' : '—', lbl: '% RX' },
        { val: perfKpi || '—',                 lbl: perfLbl },
      ]

  return (
    <div className={variant === 'extended' ? styles.kpiGridExt : styles.kpiGrid}>
      {items.map((k, i) => (
        <div key={i} className={styles.kpi}>
          <div className={styles.kpiVal}>{k.val}</div>
          <div className={styles.kpiLbl}>{k.lbl}</div>
        </div>
      ))}
    </div>
  )
}
