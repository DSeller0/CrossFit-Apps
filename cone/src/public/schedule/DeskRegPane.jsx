import styles from './Schedule.module.css'
import { blkLabel, perfStr } from '../lib/wod.js'
import ScoreFields from '../shared/ScoreFields.jsx'

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
  athName,
  onScale,
  onRpe,
  onPerfTime,
  onPerfRounds,
  onPerfReps,
  onFinished,
  onCheckpoint,
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
  // finished/checkpoint added #112).
  const scoreValue = { rpe, scale, perfTime, perfRounds, perfReps, finished, checkpoint }
  const onScoreChange = patch => {
    if ('rpe' in patch) onRpe(patch.rpe)
    if ('scale' in patch) onScale(patch.scale)
    if ('perfTime' in patch) onPerfTime(patch.perfTime)
    if ('perfRounds' in patch) onPerfRounds(patch.perfRounds)
    if ('perfReps' in patch) onPerfReps(patch.perfReps)
    if ('finished' in patch) onFinished(patch.finished)
    if ('checkpoint' in patch) onCheckpoint(patch.checkpoint)
  }
  return (
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
        {step === 'form' && (
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
            {error && <div className={styles.deskRegErr}>{error}</div>}
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className={styles.deskConfirmBox}>
              <div className={styles.deskConfirmTitle}>Revisar registro</div>
              <div className={styles.deskConfirmRow}>
                <span className={styles.deskConfirmRowLbl}>Bloco</span>
                <span className={styles.deskConfirmRowVal}>{label}</span>
              </div>
              <div className={styles.deskConfirmRow}>
                <span className={styles.deskConfirmRowLbl}>Escala</span>
                <span className={styles.deskConfirmRowVal}>{scale}</span>
              </div>
              {perfVal && (
                <div className={styles.deskConfirmRow}>
                  <span className={styles.deskConfirmRowLbl}>Resultado</span>
                  <span className={styles.deskConfirmRowVal}>{perfVal}</span>
                </div>
              )}
              {rpe && (
                <div className={styles.deskConfirmRow}>
                  <span className={styles.deskConfirmRowLbl}>RPE</span>
                  <span className={styles.deskConfirmRowVal}>{rpe} / 10</span>
                </div>
              )}
            </div>
            <div className={styles.deskConfirmBtns}>
              <button className={styles.deskCancelBtn} onClick={onBack}>
                ← Editar
              </button>
              <button
                className={styles.deskConfirmBtn}
                disabled={submitting || undefined}
                onClick={onSubmit}
              >
                {submitting ? 'Enviando...' : 'Registrar ✓'}
              </button>
            </div>
            {error && <div className={styles.deskRegErr}>{error}</div>}
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
              <div className={styles.deskSuccessRow}>
                <span className={styles.deskSuccessRowLbl}>Escala</span>
                <span className={styles.deskSuccessRowVal}>{scale}</span>
              </div>
              {perfVal && (
                <div className={styles.deskSuccessRow}>
                  <span className={styles.deskSuccessRowLbl}>Resultado</span>
                  <span className={styles.deskSuccessRowVal}>{perfVal}</span>
                </div>
              )}
              {rpe && (
                <div className={styles.deskSuccessRow}>
                  <span className={styles.deskSuccessRowLbl}>RPE</span>
                  <span className={styles.deskSuccessRowVal}>{rpe} / 10</span>
                </div>
              )}
            </div>
            <button className={styles.deskDismissBtn} onClick={onClose}>
              Fechar ×
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
