import { useState, useEffect, useRef, useMemo } from 'react'
import { WodSlide } from '../../../public/tv/slides.jsx'
import { todayISO, loadSettings } from '../../../utils/storage'
import cr from './criador.module.css'

// ── TvPreviewPane (Phase 4) ───────────────────────────────────────────────────
// The gym wall, live, beside the editor — built from the local form+blocks state,
// with no Supabase round-trip. Desktop only; the container decides when it renders,
// so this component is only ever mounted while the preview is open.
//
// Self-contained on purpose: `Publicador.jsx` (and TvController) each carry a
// hand-written copy of this ResizeObserver-scaled 1920×1080 frame, and #108 named
// this one as the shape to port. Keep it portable — don't reach out of it.
export function TvPreviewPane({ form, blocks }) {
  const previewPaneRef = useRef(null)
  const [prevScale, setPrevScale] = useState(1)

  // Scale preview pane to fit container width
  useEffect(() => {
    const el = previewPaneRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setPrevScale(el.clientWidth / 1920))
    obs.observe(el)
    setPrevScale(el.clientWidth / 1920)
    return () => obs.disconnect()
  }, [])

  const gymName = loadSettings()?.gymName || ''
  const sess = useMemo(() => ({ ...form, blocks }), [form, blocks])
  const sessions = useMemo(() => ({ [form.date || todayISO()]: [sess] }), [form.date, sess])
  const tv = useMemo(
    () => ({ session_id: form.id, date_key: form.date || todayISO() }),
    [form.id, form.date],
  )

  return (
    <div className={cr.splitAside}>
      <div className={cr.previewTitle}>
        <i className="ti ti-device-tv" aria-hidden="true" /> Preview TV
        <span className={cr.previewSub}>· atualiza em tempo real</span>
      </div>
      <div ref={previewPaneRef} className={cr.previewFrame}>
        <div
          style={{
            width: 1920,
            height: 1080,
            transform: `scale(${prevScale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <WodSlide sessions={sessions} tv={tv} gymName={gymName} />
        </div>
      </div>
    </div>
  )
}
