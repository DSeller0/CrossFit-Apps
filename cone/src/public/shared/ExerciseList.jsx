import { exVolStr, fmtIntensity } from '../lib/wod.js'
import s from './ExerciseList.module.css'

export function ExerciseList({ exercises = [], color, size = 'compact' }) {
  const cls = `${s.list} ${size === 'large' ? s.large : ''}`

  return (
    <div className={cls}>
      {exercises.map((ex, i) => {
        const ins = fmtIntensity(ex.intensity)

        if (ex.isComplex) {
          const mvs = (ex.complexMovements || []).filter(m => m.name)
          const notation = mvs.map(m => m.reps || '?').join('+')
          const displayName = ex.name || mvs.map(m => m.name).join(' + ') || 'Complexo'
          const setsStr = ex.sets ? `${ex.sets}×` : ''
          const volStr = notation ? `${setsStr}(${notation})` : setsStr || ''
          return (
            <div key={ex.id || i} className={s.complexBlock}>
              <div className={s.row}>
                <span className={s.dot} style={{ background: color }} />
                <div className={s.body}>
                  {volStr && <span className={s.vol}>{volStr}</span>}
                  <span className={s.name}>{displayName}</span>
                  {ins && <span className={s.ins}>{ins}</span>}
                </div>
              </div>
              {mvs.length > 0 && (
                <div className={s.mvs}>
                  {mvs.map((mv, mi) => (
                    <div key={mv.id || mi} className={s.mvRow}>
                      {mv.reps && <span className={s.mvReps}>{mv.reps}</span>}
                      <span className={s.mvName}>{mv.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {ex.note && <div className={s.note}>{ex.note}</div>}
            </div>
          )
        }

        const vol = exVolStr(ex)
        return (
          <div key={ex.id || i} className={s.exBlock}>
            <div className={s.row}>
              <span className={s.dot} style={{ background: color }} />
              <div className={s.body}>
                {vol && <span className={s.vol}>{vol}</span>}
                <span className={s.name}>{ex.name}</span>
                {ins && <span className={s.ins}>{ins}</span>}
              </div>
            </div>
            {ex.note && <div className={s.note}>{ex.note}</div>}
          </div>
        )
      })}
    </div>
  )
}
