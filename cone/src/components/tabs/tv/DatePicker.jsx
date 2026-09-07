import { useState } from 'react'
import { toISO, DAY_PT_TITLE } from '../../../public/lib/week.js'
import st from './tvController.module.css'

// ── DatePicker — TvController's full-width, Sunday-start week strip ──────────
//
// Extracted from TvController.jsx (#174/plans/86) so it can render in the
// gallery: it was the worst of the tab's keyboard gaps (4 of the 5 click-<div>s
// this pass converted lived in this one component) and there was no way to
// exercise every state without opening the whole tab against a live class.
//
// CLIENT-FREE — imports only public/lib (never utils/storage, which reaches
// the SPA Supabase client transitively; see #193 for the same trap elsewhere).
//
//   selDate    the selected day, 'YYYY-MM-DD'
//   sessions   { [dateKey]: session[] } — only used to place the has-sessions dot
//   onChange   (iso) => void, called when a day is clicked
export default function DatePicker({ selDate, sessions, onChange }) {
  function startOfWeek(iso) {
    const d = new Date((iso || toISO(new Date())) + 'T12:00:00')
    d.setDate(d.getDate() - d.getDay())
    return toISO(d)
  }
  // weekStart is real local state — the ‹ › arrows below move it independently of selDate —
  // that re-syncs whenever selDate jumps to another week. Adjusted during render rather
  // than from an effect (react-hooks/set-state-in-effect), React's documented replacement.
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selDate))
  const [prevSelDate, setPrevSelDate] = useState(selDate)
  if (prevSelDate !== selDate) {
    setPrevSelDate(selDate)
    const ws = startOfWeek(selDate)
    if (ws !== weekStart) setWeekStart(ws)
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return { iso: toISO(d), d }
  })
  const today = toISO(new Date())
  function prevWeek() {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    setWeekStart(toISO(d))
  }
  function nextWeek() {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + 7)
    setWeekStart(toISO(d))
  }

  return (
    <div className={st.datePicker}>
      <button className={st.dpArrow} onClick={prevWeek} aria-label="Semana anterior">
        <i className="ti ti-chevron-left" aria-hidden="true" />
      </button>
      <div className={st.dpDays}>
        {days.map(({ iso, d }) => {
          const isSel = iso === selDate,
            isToday = iso === today
          const hasSess = (sessions[iso] || []).length > 0
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onChange(iso)}
              aria-pressed={isSel}
              className={`${st.dpDay} ${isSel ? st.sel : ''} ${isToday ? st.today : ''}`}
            >
              <span className={st.dpDow}>{DAY_PT_TITLE[d.getDay()]}</span>
              <span className={st.dpNum}>{d.getDate()}</span>
              {hasSess && <span className={st.dpDot} />}
            </button>
          )
        })}
      </div>
      <button className={st.dpArrow} onClick={nextWeek} aria-label="Semana seguinte">
        <i className="ti ti-chevron-right" aria-hidden="true" />
      </button>
    </div>
  )
}
