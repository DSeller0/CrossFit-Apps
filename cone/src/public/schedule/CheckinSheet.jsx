import ConfirmReview, { ReadBox, ReadRow } from '../shared/ConfirmReview.jsx'
import styles from './Schedule.module.css'

// ── Check-in bottom sheet (from QR code: ?checkin=CLASS_EXEC_ID) ─────────────
export default function CheckinSheet({
  checkinExec,
  checkinDone,
  checkinMode,
  onCheckinMode,
  checkinSearch,
  onCheckinSearch,
  athletes,
  checkinAthId,
  onCheckinAthId,
  checkinAnonName,
  onCheckinAnonName,
  checkinSubmitting,
  checkinError,
  dupe,
  dupeName = '',
  onDupeName,
  onDupeConfirm,
  onDupeCancel,
  onSubmit,
  onClose,
}) {
  return (
    <div className={styles.ckSheet}>
      {checkinDone ? (
        <div className={styles.ckDone}>
          <i className={`ti ti-circle-check ${styles.ckDoneIcon}`} />
          <div className={styles.ckDoneTitle}>Check-in feito!</div>
          <div className={styles.ckDoneSub}>{checkinExec?.class_label || 'Aula'}</div>
        </div>
      ) : (
        <>
          <div className={styles.ckHdr}>
            <div>
              <div className={styles.ckKicker}>Check-in</div>
              {checkinExec?.class_label && (
                <div className={styles.ckClass}>{checkinExec.class_label}</div>
              )}
            </div>
            <button className={styles.ckClose} onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          </div>

          <div className={styles.ckModes}>
            <button
              className={`${styles.ckMode}${checkinMode === 'athlete' ? ' ' + styles.ckModeOn : ''}`}
              onClick={() => onCheckinMode('athlete')}
            >
              Estou na lista
            </button>
            <button
              className={`${styles.ckMode}${checkinMode === 'anon' ? ' ' + styles.ckModeOn : ''}`}
              onClick={() => onCheckinMode('anon')}
            >
              Não estou na lista
            </button>
          </div>

          {checkinMode === 'athlete' ? (
            <>
              <input
                className={styles.ckInput}
                placeholder="Buscar nome..."
                value={checkinSearch}
                onChange={e => onCheckinSearch(e.target.value)}
              />
              <div className={styles.ckList}>
                {athletes
                  .filter(
                    a =>
                      !checkinSearch || a.name.toLowerCase().includes(checkinSearch.toLowerCase()),
                  )
                  .map(a => (
                    <button
                      key={a.id}
                      type="button"
                      className={`${styles.ckRow}${checkinAthId === String(a.id) ? ' ' + styles.ckRowOn : ''}`}
                      onClick={() => onCheckinAthId(String(a.id))}
                    >
                      {a.name}
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <input
              className={styles.ckInput}
              placeholder="Seu nome (placeholder)..."
              value={checkinAnonName}
              onChange={e => onCheckinAnonName(e.target.value)}
            />
          )}

          {/* While the duplicate-name dialog is open it carries the error itself (below) —
              the sheet's copy would be behind the overlay. */}
          {checkinError && !dupe && <div className={styles.ckErr}>{checkinError}</div>}

          <button
            className={styles.ckGo}
            onClick={onSubmit}
            disabled={
              checkinSubmitting ||
              (checkinMode === 'athlete' && !checkinAthId) ||
              (checkinMode === 'anon' && !checkinAnonName.trim())
            }
          >
            {checkinSubmitting ? 'Registrando...' : 'Fazer Check-in'}
          </button>

          {/* #71 — a guest whose name is already on the roster is ASKED to distinguish
              themselves, never silently merged: two real people can share a first name.
              Rendered inside .ckSheet on purpose — the sheet is position:fixed z-index:999
              with no transform, so it is a stacking context (above the page) but not a
              containing block for the dialog's own position:fixed overlay (z-index 600),
              which would otherwise paint UNDER the sheet as a sibling. */}
          <ConfirmReview
            open={!!dupe}
            title="Esse nome já está na lista"
            /* Not the canonical "Editar": the dialog carries the editable field itself,
               so this button's job is going back to the sheet, not into a form. */
            editLabel="Voltar"
            confirmLabel="Confirmar"
            submitting={checkinSubmitting}
            submittingLabel="Registrando…"
            confirmDisabled={!dupeName.trim()}
            error={checkinError}
            onEdit={onDupeCancel}
            onClose={onDupeCancel}
            onConfirm={onDupeConfirm}
          >
            <ReadBox>
              <ReadRow label="Você digitou" value={dupe?.typed || ''} />
              <ReadRow label="Já na lista" value={dupe?.match || ''} />
            </ReadBox>
            <div>
              <div className={styles.ckDupeHint}>
                Se for outra pessoa, ajuste seu nome para o coach saber quem é quem. Se for você
                mesmo, é só confirmar.
              </div>
              <input
                className={styles.ckInput}
                value={dupeName}
                onChange={e => onDupeName(e.target.value)}
                aria-label="Seu nome"
              />
            </div>
          </ConfirmReview>
        </>
      )}
    </div>
  )
}
