import styles from './Results.module.css'
import { exVolStr, blkLabel } from '../lib/wod.js'
import { blkMeta } from './resultsHelpers.js'

// The WOD itself — what the athlete reads while logging. Two densities, both
// reproducing what results.html renders today: `compact` is the mobile session
// card (meta line + one line per exercise), `extended` is the desktop pane
// (meta as pills + a labelled volume/name table).
//
// Complex exercises are rendered here, not dropped. Both pre-#51 copies filtered
// on `e.name`, and a complex exercise has no name of its own (the movements
// carry it) — so a WOD built from a complex simply showed no movements at all.
function exName(ex) {
  if (!ex.isComplex) return ex.name
  return (
    ex.name ||
    (ex.complexMovements || [])
      .map(m => m.name)
      .filter(Boolean)
      .join(' + ')
  )
}

function exVol(ex) {
  if (!ex.isComplex) return exVolStr(ex)
  const notation = (ex.complexMovements || [])
    .filter(m => m.name)
    .map(m => m.reps || '?')
    .join('+')
  const sets = ex.sets ? `${ex.sets}×` : ''
  return notation ? `${sets}(${notation})` : sets
}

export default function WodSummary({ bl, variant = 'compact', showTitle = false }) {
  const meta = blkMeta(bl)
  const exs = (bl.exercises || []).filter(e => e.name || e.isComplex)
  if (!meta && !exs.length && !showTitle) return null

  const title = showTitle && blkLabel(bl)

  if (variant === 'extended') {
    return (
      <div className={styles.wodSum}>
        {title && <div className={styles.wodSumTitle}>{title}</div>}
        {meta && (
          <div className={styles.wodSumPills}>
            {meta.split(' · ').map((m, i) => (
              <span key={i} className={styles.wodSumPill}>
                {m}
              </span>
            ))}
          </div>
        )}
        {exs.length > 0 && (
          <div className={styles.wodSumList}>
            <div className={styles.wodSumListLbl}>Exercícios</div>
            {exs.map((e, i) => {
              const vol = exVol(e)
              return (
                <div key={e.id || i} className={styles.wodSumRow}>
                  {vol && <span className={styles.wodSumVol}>{vol}</span>}
                  <span className={styles.wodSumName}>{exName(e)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.wodSum}>
      {title && <div className={styles.wodSumTitle}>{title}</div>}
      {meta && <div className={styles.wodSumMeta}>{meta}</div>}
      {exs.map((e, i) => (
        <div key={e.id || i} className={styles.wodSumEx}>
          {[exVol(e), exName(e)].filter(Boolean).join(' ')}
        </div>
      ))}
    </div>
  )
}
