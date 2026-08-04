import styles from './Schedule.module.css'
import { blkLabel, perfStr, isTimeBlock } from '../lib/wod.js'
import ScoreFields from '../shared/ScoreFields.jsx'
import ConfirmReview, { ReadBox, ReadRow } from '../shared/ConfirmReview.jsx'

// ── Desktop Reg Pane ──────────────────────────────────────────────────────────
export default function DeskRegPane({
  regBl,
  step,
  scale,
  rpe,
  perfTime,
  perfRounds,
  perfReps,
  finished,
  checkpoint,
  exerciseRows,
  athName,
  onScale,
  onRpe,
  onPerfTime,
  onPerfRounds,
  onPerfReps,
  onFinished,
  onCheckpoint,
  onExerciseRows,
  onConfirm,
  onSubmit,
  onBack,
  onClose,
  submitting,
  error,
}) {
  if (!regBl) return null
  const { bl } = regBl
  const label = blkLabel(bl)
  const perfVal = perfStr({ perfTime, perfRounds, perfReps, checkpoint }, bl.type)
  // This pane keeps its separate value/callback props (Schedule.jsx owns the state);
  // ScoreFields speaks one value object + one patch, so translate at the boundary (#115,
  // finished/checkpoint added #112, exerciseRows added #116).
  const scoreValue = {
    rpe,
    scale,
    perfTime,
    perfRounds,
    perfReps,
    finished,
    checkpoint,
    exerciseRows,
  }
  const onScoreChange = patch => {
    if ('rpe' in patch) onRpe(patch.rpe)
    if ('scale' in patch) onScale(patch.scale)
    if ('perfTime' in patch) onPerfTime(patch.perfTime)
    if ('perfRounds' in patch) onPerfRounds(patch.perfRounds)
    if ('perfReps' in patch) onPerfReps(patch.perfReps)
    if ('finished' in patch) onFinished(patch.finished)
    if ('checkpoint' in patch) onCheckpoint(patch.checkpoint)
    if ('exerciseRows' in patch) onExerciseRows(patch.exerciseRows)
  }
  // #133 — shared between the confirm dialog and the success step, so both read back
  // the same way. `withTitle` off for success: `.deskSuccessSub` already names the
  // block, and the pane header (`.deskRegPaneWod`) names it in every step — the
  // confirm dialog is the one place neither is already on screen.
  function scoreBox(withTitle) {
    return (
      <ReadBox title={withTitle ? label : undefined}>
        <ReadRow label="Escala" value={scale} />
        {perfVal && <ReadRow label="Resultado" value={perfVal} mono={isTimeBlock(bl.type)} />}
        {rpe && <ReadRow label="RPE" value={`${rpe} / 10`} />}
      </ReadBox>
    )
  }
  // #132
  const noteBox = exerciseRows?.length > 0 && (
    <ReadBox title="O que foi adaptado">
      {exerciseRows.map(r => (
        <ReadRow key={r.exId} label={r.name} value={r.note} />
      ))}
    </ReadBox>
  )
  return (
    <>
      <div className={styles.deskRegPane}>
        <div className={styles.deskRegPaneHdr}>
          <span className={styles.deskRegPaneLbl}>
            {step === 'success' ? 'Registrado' : athName || 'Registro'}
          </span>
          <span className={styles.deskRegPaneWod}>{label}</span>
          <button className={styles.deskRegClose} onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className={styles.deskRegScroll}>
          {/* #133/note 1 — 'confirm' no longer swaps this away; ConfirmReview (below,
              OUTSIDE .deskRegPane) overlays it instead, so the form's scroll position
              and field values survive a submit failure without a remount. */}
          {step !== 'success' && (
            <>
              <div className={styles.deskRegSec}>
                {/* Gains the DNF rounds field it never had — this pane was the surface that had
                    drifted furthest from the other four (#115). */}
                <ScoreFields block={bl} value={scoreValue} onChange={onScoreChange} />
                {bl.type === 'AMRAP' && (
                  <div className={styles.deskRegHint}>Rounds completos + reps extras</div>
                )}
              </div>
              <button
                className={styles.deskRegSubmitBtn}
                disabled={!scale || !rpe}
                onClick={onConfirm}
              >
                Confirmar →
              </button>
              {/* The 'confirm' step's error renders inside ConfirmReview instead. */}
              {error && step === 'form' && <div className={styles.deskRegErr}>{error}</div>}
            </>
          )}

          {step === 'success' && (
            <div className={styles.deskSuccessBox}>
              <div className={styles.deskSuccessIcon}>✓</div>
              <div className={styles.deskSuccessTitle}>Resultado registrado</div>
              <div className={styles.deskSuccessSub}>
                {athName && `${athName} · `}
                {label}
              </div>
              <div className={styles.deskSuccessDetail}>
                {scoreBox(false)}
                {noteBox}
              </div>
              <button className={styles.deskDismissBtn} onClick={onClose}>
                Fechar ×
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmReview
        open={step === 'confirm'}
        onEdit={onBack}
        onConfirm={onSubmit}
        onClose={onBack}
        submitting={submitting}
        error={step === 'confirm' ? error : ''}
      >
        {scoreBox(true)}
        {noteBox}
      </ConfirmReview>
    </>
  )
}
