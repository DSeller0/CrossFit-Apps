import { useEffect, useRef } from 'react'
import s from './Toast.module.css'

// The one SPA toast (#59 · C5·b2 · plans/83 T9) — a single transient message for a
// state change that has no other visible feedback. Publicador's manual auto-shrink
// is the first caller: shrinking a format's font scale is a silent mutation
// otherwise (D3 — auto-shrink must never be silent). NOT a notification centre: one
// message at a time, the caller owns `open`. CLIENT-FREE (renders in the gallery).
//
//   open      render + start the auto-dismiss timer when true
//   message   the text
//   onDismiss called after `duration` ms, and on manual close
//   duration  ms before auto-dismiss (default 3200)
export default function Toast({ open, message, onDismiss, duration = 3200 }) {
  // Latest onDismiss in a ref (same pattern as ConfirmReview's hRef) so the timer
  // effect only depends on [open, duration, message] — a caller passing an inline
  // arrow must not reset the countdown on every one of its own re-renders.
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })
  // `message` is in the deps ON PURPOSE (#59/C5·c) — a caller that re-triggers the
  // SAME literal string while a toast is already open (ReportModal's Pix-copy
  // success message is one fixed string across every location) would otherwise
  // see `open` stay `true→true`, React bail out of the identical-string setState,
  // and the second event silently inherit whatever time was left on the first
  // one's timer instead of getting its own full `duration`.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => onDismissRef.current?.(), duration)
    return () => clearTimeout(t)
  }, [open, duration, message])

  if (!open) return null
  return (
    <div className={s.toast} role="status">
      <span>{message}</span>
      <button
        type="button"
        className={s.close}
        onClick={() => onDismissRef.current?.()}
        aria-label="Fechar aviso"
      >
        <i className="ti ti-x" aria-hidden="true" />
      </button>
    </div>
  )
}
