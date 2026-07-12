import SegBar from '../shared/SegBar.jsx'
import styles from './Me.module.css'

// Executed-vs-planned bars, one row per block type. Renders both the "WODs" card
// (this month) and the "Distribuição" card (last 90 days) — they were two copies of
// identical markup in Me.jsx.
//
// Row colors come from canonical blkColor() (lib/wod.js) instead of the 13-entry
// per-type ECOL map that lived only on this page and disagreed with the documented
// four block families even where they overlapped. Rows sharing a family color is the
// point: the color says "this is strength" / "this is a WOD", and the label already
// says which one.
export default function BarList({ title, sub, rows }) {
  return (
    <section className={styles.sh}><div className={styles.shInner}>
      <h2 className={styles.shTitle}>{title} <span className={styles.shTitleR}>{sub}</span></h2>
      {rows.map((r, i) => (
        <div key={i} className={styles.distRow}>
          <span className={styles.distLbl}>{r.type}</span>
          <SegBar pct={r.pct} color={r.color} grow />
          <span className={styles.distVal} style={{ color: r.color }}>{r.ex}/{r.pl}</span>
        </div>
      ))}
    </div></section>
  )
}
