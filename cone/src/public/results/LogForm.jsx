import styles from './Results.module.css'
import ScoreFields from '../shared/ScoreFields.jsx'

// Log/edit form for one block. `mode='edit'` is the self-correction entry point
// (#51, decision 2) — same fields, same confirm step, different affordance.
//
// Since #115 the fields themselves live in the shared ScoreFields; this file owns only the
// frame — spinner, submit/cancel pair, create-vs-edit wording. The five logging surfaces
// had drifted three ways before that extraction (see ScoreFields.jsx).
export default function LogForm({
  bl,
  inp,
  isSubmitting,
  mode = 'create',
  onRpe,
  onScale,
  onField,
  onSubmit,
  onCancel = null,
}) {
  const dis = isSubmitting || undefined

  if (isSubmitting)
    return (
      <div className={styles.formSpinner}>
        <i className={`ti ti-loader-2 ${styles.spin}`} aria-hidden="true" />
        <div>Salvando...</div>
      </div>
    )

  // ScoreFields emits a partial patch; Results.jsx still routes rpe and scale through their
  // own callbacks, so unpack rather than widening the page's prop contract.
  const onChange = patch => {
    if ('rpe' in patch) return onRpe(patch.rpe)
    if ('scale' in patch) return onScale(patch.scale)
    Object.entries(patch).forEach(([f, v]) => onField(f, v))
  }

  return (
    <div className={styles.form}>
      <ScoreFields block={bl} value={inp} onChange={onChange} disabled={dis} />

      <div className={styles.formBtns}>
        {onCancel && (
          <button
            type="button"
            className={styles.btnCancelInline}
            disabled={dis}
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          className={styles.btnSubmit}
          disabled={dis || !inp.scale || !inp.rpe}
          onClick={onSubmit}
        >
          <i className="ti ti-check" aria-hidden="true" />{' '}
          {mode === 'edit' ? 'Salvar alteração' : 'Registrar resultado'}
        </button>
      </div>
    </div>
  )
}
