import styles from './Results.module.css'
import { perfStr, scaleColor, isTimeBlock } from '../lib/wod.js'

// An already-logged block result. `onEdit` is what makes self-correction real
// (#51, decision 2): the submit path always merged correctly — it was only this
// presentational gate that made a logged result final. Omit onEdit for a
// read-only render.
export default function LoggedResult({ br, btype, onEdit = null }) {
  const perf = perfStr(br, btype)
  const plbl = isTimeBlock(btype) ? 'Tempo' : 'Resultado'

  return (
    <div className={styles.logged}>
      <div className={styles.loggedItem}>
        <div className={styles.loggedLbl}>Escala</div>
        <div className={styles.loggedVal} style={{ color: scaleColor(br.scale) }}>
          {br.scale || '—'}
        </div>
      </div>
      <div className={styles.loggedItem}>
        <div className={styles.loggedLbl}>RPE</div>
        <div className={styles.loggedVal}>{br.rpe || '—'}</div>
      </div>
      <div className={styles.loggedItem}>
        <div className={styles.loggedLbl}>{plbl}</div>
        <div className={styles.loggedVal}>{perf}</div>
      </div>
      {onEdit && (
        <button type="button" className={styles.editBtn} onClick={onEdit}>
          <i className="ti ti-pencil" aria-hidden="true" /> Editar
        </button>
      )}
    </div>
  )
}
