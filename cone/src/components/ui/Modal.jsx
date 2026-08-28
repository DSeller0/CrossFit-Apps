import { useEffect, useId, useRef } from 'react'
import s from './Modal.module.css'

// The one SPA modal shell (#56/C2, C0 family). ConfirmReview (public/shared) covers
// the *confirm* case — a read-back plus Editar/Confirmar. This covers the other one:
// a titled form dialog. Before C2 that was the global `.settings-overlay` +
// `.settings-modal` + `.settings-drag-hdr` trio (backdrop .5, radius 12px, a "drag"
// header that never dragged) in Atletas and Publicador, plus three fully inline
// hand-rolled overlays in Serviços with their own backdrops (.75/.8) and radii.
//
// Same a11y contract as ConfirmReview so the two can't diverge: role="dialog" +
// aria-modal, focus moves in on open and is trapped, Escape closes, focus is
// restored on unmount. One backdrop opacity (rgba(0,0,0,.7)).
//
// CLIENT-FREE (renders in the gallery).
//
//   open      render + trap when true
//   title     dialog heading (also the accessible name)
//   onClose   backdrop click · Escape · the header ✕
//   size      'sm' 340 · 'md' 420 · 'lg' 560 (max-width; always 92vw-capped)
//   footer    optional node pinned under the body
export default function Modal({
  open,
  title,
  onClose,
  size = 'md',
  footer = null,
  className = '',
  children,
}) {
  const dialogRef = useRef(null)
  const restoreRef = useRef(null)
  const titleId = useId()
  // Latest onClose in a ref so the key listener reads the current value without the
  // effect re-subscribing (and re-stealing focus) on every parent re-render — the
  // same shape ConfirmReview uses, for the same reason.
  const hRef = useRef(null)
  useEffect(() => {
    hRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const dlg = dialogRef.current
    restoreRef.current = document.activeElement
    dlg?.focus()

    const focusables = () =>
      dlg
        ? [
            ...dlg.querySelectorAll(
              'button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
            ),
          ]
        : []

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        hRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) {
        e.preventDefault()
        dlg?.focus()
        return
      }
      const first = f[0],
        last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
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
      <div
        ref={dialogRef}
        className={`${s.modal} ${s[size]} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <div className={s.hdr}>
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
          <button type="button" className={s.close} aria-label="Fechar" onClick={onClose}>
            {/* Inline SVG, not `ti ti-x`: the generated design cards can't fetch the
                Tabler webfont (CSP), and on a close button the icon IS the control —
                a blank gap there would make the card unreviewable. */}
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className={s.body}>{children}</div>
        {footer && <div className={s.footer}>{footer}</div>}
      </div>
    </div>
  )
}
