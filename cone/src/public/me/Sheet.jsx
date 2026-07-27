import { useEffect, useRef } from 'react'
import styles from './Me.module.css'

const FOCUSABLE =
  'button:not([disabled]),[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

// The bottom-sheet / centered-modal shell behind both of me.html's sheets (PR log,
// body metrics). Before #52 each hand-rolled its own overlay and neither was a real
// dialog: no role, no Esc, no focus management, and — because both rendered
// unconditionally at the same z-index — they could be open simultaneously, and a
// *closed* sheet's inputs still sat in the tab order.
//
// The sheet stays mounted (so the slide-in transition still plays) but toggles
// `visibility`, which both removes it from the tab order and hides it from assistive
// tech. `initialFocus` lets the caller aim the first focus at the field that matters.
export default function Sheet({ open, onClose, titleId, initialFocus, children }) {
  const ref = useRef(null)
  const restoreTo = useRef(null)

  useEffect(() => {
    if (!open) return
    const node = ref.current
    restoreTo.current = document.activeElement

    const target = initialFocus?.current || node.querySelector(FOCUSABLE)
    // Wait out the slide-in: focusing a mid-transition element scroll-jumps iOS.
    const t = setTimeout(() => target?.focus(), 320)

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const f = [...node.querySelectorAll(FOCUSABLE)]
      if (!f.length) return
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
    document.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKeyDown)
      restoreTo.current?.focus?.()
    }
  }, [open, onClose, initialFocus])

  return (
    <>
      <div
        className={`${styles.lsOverlay}${open ? ' ' + styles.lsOverlayOpen : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        className={`${styles.lsSheet}${open ? ' ' + styles.lsSheetOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  )
}
