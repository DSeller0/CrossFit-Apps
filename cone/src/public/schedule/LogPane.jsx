import { Fragment } from 'react'
import styles from './Schedule.module.css'
import { blkColor, blockExercises, perfStr, isTimeBlock } from '../lib/wod.js'
import { ExerciseList } from '../shared/ExerciseList.jsx'
import ScoreFields from '../shared/ScoreFields.jsx'
import ConfirmReview, { ReadBox, ReadRow } from '../shared/ConfirmReview.jsx'

// ── Log Pane (mobile) ─────────────────────────────────────────────────────────
export default function LogPane({
  pane,
  athId,
  onAthId,
  blocks,
  onBlocks,
  submitting,
  success,
  error,
  confirming,
  onConfirming,
  onSubmit,
  onClose,
  lockedAthName,
}) {
  const isOpen = !!pane
  // ScoreFields emits a partial patch, which is exactly what this reducer already wanted —
  // the three setRpe/setScale/setField variants collapse into one (#115).
  function patchBlock(i, patch) {
    onBlocks(prev => prev.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  }
  const dateStr = pane
    ? new Date(pane.dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      })
    : ''
  // #133 — one ReadBox pair (score · #132's #116 notes) per block, shared by the
  // confirm dialog and the success step so both read back the same way. Flattened as
  // direct children (Fragment, not a wrapping div) so ConfirmReview's/`.lpBody`'s own
  // flex `gap` spaces every box evenly, across blocks and within a block alike.
  function blockReadBoxes(bl) {
    const perf = perfStr(bl, bl.blockType)
    const fullBl = pane?.sess.blocks?.find(b => b.id === bl.blockId)
    const exs = blockExercises(fullBl)
    return (
      <Fragment key={bl.blockId}>
        <ReadBox title={bl.blockLabel}>
          {exs.length > 0 && <ExerciseList exercises={exs} color={blkColor(fullBl)} size="tiny" />}
          <ReadRow label="Escala" value={bl.scale} />
          {bl.rpe && <ReadRow label="RPE" value={`${bl.rpe} / 10`} />}
          {perf && <ReadRow label="Resultado" value={perf} mono={isTimeBlock(bl.blockType)} />}
        </ReadBox>
        {bl.exerciseRows?.length > 0 && (
          <ReadBox title="O que foi adaptado">
            {bl.exerciseRows.map(r => (
              <ReadRow key={r.exId} label={r.name} value={r.note} />
            ))}
          </ReadBox>
        )}
      </Fragment>
    )
  }
  // #140/note 1 — a fixed overlay above a still-open pane, not a swap of its content:
  // `.logPane` carries `transform` even at rest (translateX(100%)/(0)), which makes it
  // a containing block for `position:fixed` descendants, so ConfirmReview must render
  // OUTSIDE it (a sibling below), never nested inside.
  const confirmBody = pane && (
    <>
      <div className={styles.lpDate}>
        {lockedAthName || pane.assignedAth.find(a => String(a.id) === String(athId))?.name || ''}
        {pane.sess.sessionName ? ` · ${pane.sess.sessionName}` : ''}
      </div>
      {blocks.map(blockReadBoxes)}
    </>
  )
  return (
    <>
      <div
        className={`${styles.lpOverlay}${isOpen ? ' ' + styles.lpOverlayOpen : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`${styles.logPane}${isOpen ? ' ' + styles.logPaneOpen : ''}`}>
        {!pane ? null : success ? (
          <div>
            <div className={styles.lpHeader}>
              <div className={styles.lpTitle}>Resultado registrado</div>
              <button className={styles.lpClose} onClick={onClose} aria-label="Fechar">
                <i className="ti ti-x" />
              </button>
            </div>
            <div className={styles.lpSuccess}>
              <i className={`ti ti-circle-check ${styles.lpSuccessIcon}`} />
              <div className={styles.lpSuccessTitle}>Resultado registrado!</div>
              <div className={styles.lpSuccessSub}>Salvo com sucesso.</div>
              <a href="./leaderboard.html" className={styles.lbLink} style={{ marginTop: 8 }}>
                <i className="ti ti-trophy" /> Ver leaderboard
              </a>
            </div>
            {/* #132 — same read-back the confirm dialog shows, now surviving past submit. */}
            {blocks.length > 0 && <div className={styles.lpBody}>{blocks.map(blockReadBoxes)}</div>}
          </div>
        ) : (
          <div>
            <div className={styles.lpHeader}>
              <div className={styles.lpTitle}>
                <i className="ti ti-pencil" /> Registrar Resultado
              </div>
              <button className={styles.lpClose} onClick={onClose} aria-label="Fechar">
                <i className="ti ti-x" />
              </button>
            </div>
            <div className={styles.lpBody}>
              <div className={styles.lpDate}>
                {dateStr}
                {pane.sess.sessionName ? ` · ${pane.sess.sessionName}` : ''}
              </div>
              <div className={styles.lpSection}>
                <div className={styles.lpSectionTitle}>Atleta</div>
                {lockedAthName ? (
                  <div
                    style={{
                      padding: '4px 0',
                      color: 'var(--cream)',
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {lockedAthName}
                  </div>
                ) : (
                  <select
                    className={styles.lpSelect}
                    value={athId}
                    onChange={e => onAthId(e.target.value)}
                  >
                    <option value="">— Selecione —</option>
                    {pane.assignedAth.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {blocks.length > 0 && (
                <div className={styles.lpSection}>
                  <div className={styles.lpSectionTitle}>Resultados</div>
                  {blocks.map((bl, i) => {
                    const fullBl = pane.sess.blocks?.find(b => b.id === bl.blockId)
                    const exs = blockExercises(fullBl)
                    return (
                      <div key={bl.blockId} className={styles.lpBlock}>
                        <div className={styles.lpBlockTitle}>{bl.blockLabel}</div>
                        {exs.length > 0 && (
                          <ExerciseList exercises={exs} color={blkColor(fullBl)} size="tiny" />
                        )}
                        <ScoreFields
                          block={fullBl}
                          blockType={bl.blockType}
                          rounds={fullBl?.rounds}
                          value={bl}
                          onChange={patch => patchBlock(i, patch)}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
              <button
                className={styles.lpSubmit}
                disabled={submitting || blocks.some(b => !b.scale || !b.rpe) || undefined}
                onClick={() => onConfirming(true)}
              >
                <i className="ti ti-check" /> Registrar
              </button>
              {/* Confirming's own error renders inside ConfirmReview instead — this pane
                  stays mounted (unchanged) behind the dialog, so avoid showing it twice. */}
              {error && !confirming && <div className={styles.lpErr}>{error}</div>}
            </div>
          </div>
        )}
      </div>

      <ConfirmReview
        open={!!pane && !success && !!confirming}
        onEdit={() => onConfirming(false)}
        onConfirm={onSubmit}
        onClose={() => onConfirming(false)}
        submitting={submitting}
        error={confirming ? error : ''}
      >
        {confirmBody}
      </ConfirmReview>
    </>
  )
}
