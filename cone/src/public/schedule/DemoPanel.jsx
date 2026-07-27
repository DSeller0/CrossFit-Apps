import { useRef } from 'react'
import styles from './Schedule.module.css'
import { extractYtId } from './scheduleHelpers.js'
import { resolveExercise } from '../lib/registry.js'

// ── Demo Panel ────────────────────────────────────────────────────────────────
export default function DemoPanel({ target, demoMap, onClose }) {
  const iframeRef = useRef(null)
  const isOpen = !!target
  function handleClose() {
    if (iframeRef.current) iframeRef.current.src = ''
    onClose()
  }
  if (!target)
    return <div className={`${styles.demoOverlay}`} onClick={handleClose} aria-hidden="true" />
  const multi = target.length > 1,
    title = multi ? 'Demo' : target[0].name
  return (
    <>
      <div
        className={`${styles.demoOverlay}${isOpen ? ' ' + styles.demoOverlayOpen : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className={`${styles.demoPanel}${isOpen ? ' ' + styles.demoPanelOpen : ''}`}>
        <div className={styles.demoHdr}>
          <span className={styles.demoTitle}>{title}</span>
          <button className={styles.demoClose} onClick={handleClose} aria-label="Fechar">
            <i className="ti ti-x" />
          </button>
        </div>
        <div className={styles.demoBody}>
          {target.map((mv, i) => {
            const data = resolveExercise(mv.name, demoMap) || {}
            const videoId = extractYtId(data.videoUrl || '')
            const hasVideo = !!videoId && data.videoPublished === true
            const desc = data.description || '',
              muscles = data.muscles || '',
              notes = data.notes || ''
            const hasAny = hasVideo || desc || muscles || notes
            return (
              <div key={i}>
                {multi && <div className={styles.demoSectionName}>{mv.name}</div>}
                {hasVideo && (
                  <div className={styles.demoVideoWrap}>
                    <iframe
                      ref={i === 0 ? iframeRef : null}
                      src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                )}
                {desc && <div className={styles.demoDesc}>{desc}</div>}
                {muscles && (
                  <div className={styles.demoDesc}>
                    <span className={styles.demoSubLbl}>Músculos</span>
                    {muscles}
                  </div>
                )}
                {notes && <div className={`${styles.demoDesc} ${styles.demoNotes}`}>{notes}</div>}
                {!hasAny && (
                  <div className={styles.demoNoContent}>Sem conteúdo de demo disponível.</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
