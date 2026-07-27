import { useRef } from 'react'
import styles from './Schedule.module.css'
import { onKey } from './scheduleHelpers.js'

// ── Round Counter ─────────────────────────────────────────────────────────────
export default function RdCounter({ total, cur, onAdvance, onReset }) {
  const pressRef = useRef(null),
    didLongRef = useRef(false),
    touchHandledRef = useRef(false)
  const isDone = cur >= total,
    isActive = cur > 0 && !isDone
  function onTouchStart() {
    didLongRef.current = false
    touchHandledRef.current = false
    pressRef.current = setTimeout(() => {
      didLongRef.current = true
      touchHandledRef.current = true
      onReset()
    }, 600)
  }
  function onTouchEnd(e) {
    e.preventDefault()
    clearTimeout(pressRef.current)
    if (!didLongRef.current) {
      touchHandledRef.current = true
      onAdvance()
    }
  }
  function onClick(e) {
    e.stopPropagation()
    if (touchHandledRef.current) {
      touchHandledRef.current = false
      return
    }
    onAdvance()
  }
  function onContextMenu(e) {
    e.preventDefault()
    e.stopPropagation()
    onReset()
  }
  const cls = isDone ? styles.bCounterDone : isActive ? styles.bCounterActive : styles.bCounterIdle
  return (
    <div
      className={`${styles.bCounter} ${cls}`}
      role="button"
      tabIndex={0}
      aria-label={`Rodadas: ${cur} de ${total}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={onKey(onAdvance)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={() => clearTimeout(pressRef.current)}
    >
      {isDone ? (
        <i className="ti ti-check" style={{ fontSize: 9 }} />
      ) : isActive ? (
        String(cur)
      ) : (
        <i className="ti ti-minus" style={{ fontSize: 8, opacity: 0.4 }} />
      )}
    </div>
  )
}
