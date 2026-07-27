import { fmtDateShort } from '../lib/week.js'
import Sheet from './Sheet.jsx'
import styles from './Me.module.css'

// Body metrics. The inputs are real; the save is not yet — persistence is #19, which
// plans/22 promotes to a prerequisite for the Força stat bar (relative strength needs
// a bodyweight). Kept visible rather than hidden, since it's about to become real,
// but it says so plainly instead of pretending the SALVAR worked.
export default function BodySheet({
  open,
  onClose,
  athlete,
  weight,
  height,
  bodyFat,
  note,
  warn,
  onWeight,
  onHeight,
  onBodyFat,
  onNote,
  onSave,
}) {
  const bm = athlete?.bodyMetrics || []
  const prev = bm.length ? bm[bm.length - 1] : null
  const prevLine = prev
    ? 'Último (' +
      prev.date +
      '): ' +
      (prev.weight ? prev.weight + 'kg' : '') +
      (prev.height ? ' · ' + prev.height + 'cm' : '') +
      (prev.bodyFat ? ' · ' + prev.bodyFat + '%' : '')
    : 'Nenhum registro anterior.'

  return (
    <Sheet open={open} onClose={onClose} titleId="bodySheetTitle">
      <div className={styles.lsHdr}>
        <h2 className={styles.lsExName} id="bodySheetTitle">
          Corpo
        </h2>
        <span className={styles.lsHdrDate}>
          {fmtDateShort(new Date().toISOString().slice(0, 10))}
        </span>
      </div>

      <div className={styles.lsBody}>
        <div className={styles.lsPrev}>{prevLine}</div>

        <div className={styles.lsInpRow}>
          <label className={styles.lsInpWrap}>
            <input
              type="number"
              className={styles.lsInp}
              value={weight}
              placeholder="—"
              step="0.1"
              min="0"
              onChange={e => onWeight(e.target.value)}
            />
            <span className={styles.lsInpLbl}>Peso (kg)</span>
          </label>
          <label className={styles.lsInpWrap}>
            <input
              type="number"
              className={styles.lsInp}
              value={height}
              placeholder="—"
              step="1"
              min="0"
              max="300"
              onChange={e => onHeight(e.target.value)}
            />
            <span className={styles.lsInpLbl}>Altura (cm)</span>
          </label>
          <label className={styles.lsInpWrap}>
            <input
              type="number"
              className={styles.lsInp}
              value={bodyFat}
              placeholder="—"
              step="0.1"
              min="0"
              max="100"
              onChange={e => onBodyFat(e.target.value)}
            />
            <span className={styles.lsInpLbl}>Gordura (%)</span>
          </label>
        </div>

        <label className={styles.srOnly} htmlFor="bodyNote">
          Nota
        </label>
        <textarea
          id="bodyNote"
          className={styles.lsNote}
          rows="2"
          placeholder="Nota opcional..."
          value={note}
          onChange={e => onNote(e.target.value)}
        />

        {warn && (
          <div className={styles.lsWarn} role="alert">
            ⚠ Ainda não é possível salvar — estamos construindo isso.
          </div>
        )}

        <div className={styles.lsActions}>
          <button className={styles.lsBtnCancel} onClick={onClose}>
            CANCELAR
          </button>
          <button className={styles.lsBtnSave} onClick={onSave}>
            SALVAR
          </button>
        </div>
      </div>
    </Sheet>
  )
}
