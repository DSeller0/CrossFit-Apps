import styles from './Results.module.css'
import { SCALES, isTimeBlock } from '../lib/wod.js'

const RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Log/edit form for one block. `mode='edit'` is the self-correction entry point
// (#51, decision 2) — same fields, same confirm step, different affordance.
export default function LogForm({ bl, inp, isSubmitting, mode = 'create', onRpe, onScale, onField, onSubmit, onCancel = null }) {
  const btype = bl.type, blRounds = Number(bl.rounds) || 0
  const dis = isSubmitting || undefined

  if (isSubmitting) return (
    <div className={styles.formSpinner}>
      <i className={`ti ti-loader-2 ${styles.spin}`} aria-hidden="true" />
      <div>Salvando...</div>
    </div>
  )

  return (
    <div className={styles.form}>
      <div>
        <div className={styles.formLbl} id="lf-rpe">RPE (1–10)</div>
        <div className={styles.rpeRow} role="group" aria-labelledby="lf-rpe">
          {RPE.map(n => (
            <button key={n} type="button" disabled={dis} aria-pressed={inp.rpe === n}
              className={`${styles.rpeBtn}${inp.rpe === n ? ' ' + styles.rpeBtnOn : ''}`}
              onClick={() => onRpe(n)}>{n}</button>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.formLbl} id="lf-scale">Escala</div>
        <div className={styles.scaleRow} role="group" aria-labelledby="lf-scale">
          {SCALES.map(sc => (
            <button key={sc} type="button" disabled={dis} aria-pressed={inp.scale === sc}
              className={`${styles.scaleBtn}${inp.scale === sc ? ' ' + styles.scaleBtnOn : ''}`}
              onClick={() => onScale(sc)}>{sc}</button>
          ))}
        </div>
      </div>

      {isTimeBlock(btype) ? (
        <>
          <label className={styles.field}>
            <span className={styles.formLbl}>Tempo (MM:SS)</span>
            <input className={styles.perfInput} type="text" inputMode="numeric" placeholder="12:34"
              value={inp.perfTime} disabled={dis} onChange={e => onField('perfTime', e.target.value)} />
          </label>
          {blRounds > 0 && (
            <label className={styles.field}>
              <span className={styles.formLbl}>Rounds completos de {blRounds} (DNF)</span>
              <input className={`${styles.perfInput} ${styles.perfInputSm}`} type="number" min="0" max={blRounds}
                inputMode="numeric" placeholder={`0/${blRounds}`}
                value={inp.perfRounds} disabled={dis} onChange={e => onField('perfRounds', e.target.value)} />
            </label>
          )}
        </>
      ) : (
        <div className={styles.numRow}>
          <label className={styles.field}>
            <span className={styles.formLbl}>Rounds</span>
            <input className={`${styles.perfInput} ${styles.perfInputSm}`} type="number" min="0" inputMode="numeric" placeholder="0"
              value={inp.perfRounds} disabled={dis} onChange={e => onField('perfRounds', e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.formLbl}>Reps</span>
            <input className={`${styles.perfInput} ${styles.perfInputSm}`} type="number" min="0" inputMode="numeric" placeholder="0"
              value={inp.perfReps} disabled={dis} onChange={e => onField('perfReps', e.target.value)} />
          </label>
        </div>
      )}

      <div className={styles.formBtns}>
        {onCancel && (
          <button type="button" className={styles.btnCancelInline} disabled={dis} onClick={onCancel}>Cancelar</button>
        )}
        <button type="button" className={styles.btnSubmit} disabled={dis || !inp.scale || !inp.rpe} onClick={onSubmit}>
          <i className="ti ti-check" aria-hidden="true" /> {mode === 'edit' ? 'Salvar alteração' : 'Registrar resultado'}
        </button>
      </div>
    </div>
  )
}
