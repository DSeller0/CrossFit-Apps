import { useEffect, useRef } from 'react'
import s from './ConfirmReview.module.css'

// Read-back building blocks — the labelled rows the 3 forks share. Callers compose
// them as ConfirmReview children so the review body stays consistent everywhere.
export function ReadBox({ title = null, children }) {
  return (
    <div className={s.readbox}>
      {title && <div className={s.wodline}>{title}</div>}
      {children}
    </div>
  )
}
export function ReadRow({ label, value, mono = false }) {
  return (
    <div className={s.row}>
      <span className={s.rowLbl}>{label}</span>
      <span className={`${s.rowVal}${mono ? ' ' + s.mono : ''}`}>{value}</span>
    </div>
  )
}

// The one confirm-review dialog (#54/C0). Collapses the 3 forks (public Results
// "Confirmar registro"; schedule DeskRegPane "Registrar ✓"; LogPane "Confirmar ✓")
// into one role="dialog" shell with a real a11y contract: focus moves into the
// dialog on open and is trapped, Escape returns to the form (onEdit), focus is
// restored on close. Cross-surface (all 3 forks are public) → lives in public/shared,
// client-free. Its footer buttons are self-contained (token-based) rather than the
// SPA Button, so a public page's bundle never reaches into src/components/.
//
//   open              render + trap when true
//   onEdit            secondary "Editar" — back to the form WITHOUT discarding
//   onConfirm         primary "Confirmar"
//   onClose           backdrop click / Escape when there's no onEdit
//   title             default "Revisar registro"
//   submitting        disables both, primary shows submittingLabel
//   error             message under the read-back body
//   children          the labelled read-back rows
export default function ConfirmReview({
  open,
  onEdit,
  onConfirm,
  onClose,
  title = 'Revisar registro',
  editLabel = 'Editar',
  confirmLabel = 'Confirmar',
  submitting = false,
  submittingLabel = 'Enviando…',
  error = '',
  children,
}) {
  const dialogRef = useRef(null)
  const restoreRef = useRef(null)
  // Latest handlers in a ref so the key listener reads current values without the
  // effect re-subscribing (and re-stealing focus) on every parent re-render.
  const hRef = useRef({})
  hRef.current = { onEdit, onClose }

  useEffect(() => {
    if (!open) return
    const dlg = dialogRef.current
    restoreRef.current = document.activeElement
    dlg?.focus()

    const focusables = () => dlg
      ? [...dlg.querySelectorAll('button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')]
      : []

    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); (hRef.current.onEdit || hRef.current.onClose)?.(); return }
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) { e.preventDefault(); dlg?.focus(); return }
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      restoreRef.current?.focus?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div className={s.overlay} onClick={onClose}>
      <div ref={dialogRef} className={s.modal} role="dialog" aria-modal="true"
        aria-labelledby="cr-title" tabIndex={-1} onClick={e => e.stopPropagation()}>
        <div id="cr-title" className={s.title}>{title}</div>
        <div className={s.body}>{children}</div>
        {error && <div className={s.err}>{error}</div>}
        <div className={s.btns}>
          <button type="button" className={`${s.btn} ${s.edit}`} disabled={submitting || undefined} onClick={onEdit}>
            {editLabel}
          </button>
          <button type="button" className={`${s.btn} ${s.confirm}`} disabled={submitting || undefined} onClick={onConfirm}>
            {submitting ? submittingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
