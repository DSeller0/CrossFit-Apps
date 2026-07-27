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
        </>
      )}
    </div>
  )
}
