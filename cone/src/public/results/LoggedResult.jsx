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
    <>
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
        {br.checkpoint?.exName && (
          <div className={styles.loggedItem}>
            <div className={styles.loggedLbl}>Parou em</div>
            <div className={styles.loggedVal}>{br.checkpoint.exName}</div>
          </div>
        )}
        {onEdit && (
          <button type="button" className={styles.editBtn} onClick={onEdit}>
            <i className="ti ti-pencil" aria-hidden="true" /> Editar
          </button>
        )}
      </div>
      {/* #116 — per-exercise adaptation notes. A separate block below .logged (not
          another .loggedItem inside it): .logged is a single-row flex, and a note's
          text can run to a full sentence, not a short value. */}
      {br.exerciseRows?.length > 0 && (
        <div className={styles.loggedNotes}>
          <div className={styles.loggedNotesLbl}>O que foi adaptado</div>
          {br.exerciseRows.map(r => (
            <div key={r.exId} className={styles.loggedNoteRow}>
              <span className={styles.loggedNoteEx}>{r.name}</span>
              <span className={styles.loggedNoteText}>{r.note}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
