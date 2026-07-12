import Sheet from './Sheet.jsx'
import styles from './Me.module.css'

// Destructive-action confirm, on the same sheet shell as the others.
//
// Replaces the page's window.confirm()/window.alert() pair (#52) — native dialogs in
// a themed, pt-BR app, on a page an athlete opens on a phone. Small and local by
// design: the shared ConfirmReview component is #54 (C0)'s to mint, and this must not
// become a fourth hand-rolled copy of the review-before-submit block.
export default function ConfirmSheet({ open, onClose, title, body, confirmLabel, onConfirm, busy, error }) {
  return (
    <Sheet open={open} onClose={onClose} titleId="confirmSheetTitle">
      <div className={styles.lsHdr}>
        <h2 className={styles.lsExName} id="confirmSheetTitle">{title}</h2>
      </div>
      <div className={styles.lsBody}>
        <p className={styles.confirmBody}>{body}</p>
        {error && <div className={styles.lsWarn} role="alert">⚠ {error}</div>}
        <div className={styles.lsActions}>
          <button className={styles.lsBtnCancel} onClick={onClose}>CANCELAR</button>
          <button className={styles.lsBtnDanger} onClick={onConfirm} disabled={busy}>
            {busy ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
