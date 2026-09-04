import { useEffect, useRef, useState } from 'react'
import { toISO } from '../../../../utils/storage'
import { MONTH_PT, DAY_PT } from '../../../../public/lib/week.js'
import { getWeeksOfMonth } from '../exportHelpers'
import { FORMATS, isDayFormat } from './FormatRail'
import { renderArtefact } from './renderArtefact'
import { EmptyWeekState, NoSessionThatDayState } from './ExportStates'
import s from '../Publicador.module.css'

// ── PreviewPane — the true-ratio, always-on render of whatever format/when is
// selected (#59 C5·b1 step d). Replaces the toggled "Pré-visualizar" panel: the
// preview IS the surface now, not something opened on top of a toolbar. Pure display —
// it does not trigger exports; the container owns Baixar/Apresentar and the busy state.
export default function PreviewPane({
  format,
  year,
  month,
  selectedWeekIdx,
  currentWeekDates,
  selectedDate,
  filteredSessions,
  label,
  gymName,
  fontScale,
  zoneScales,
  blockTitleScales,
  logoDataUrl,
  logoScale,
  palette,
  busy,
  fname,
  sizeEstimate,
  onPickAltDate,
  onSwitchToWeekFormat,
}) {
  const wrapRef = useRef()
  const [wrapW, setWrapW] = useState(800)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setWrapW(el.offsetWidth || 800)
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    measure()
    return () => obs.disconnect()
  }, [])

  const dims = FORMATS.find(f => f.id === format) || FORMATS[0]
  const dayFmt = isDayFormat(format)
  const weekDates = getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates
  const weekDays = weekDates.slice(1, 6) // Seg–Sex, matching the export week's own body
  const weekHasSessions = weekDays.filter(d => filteredSessions[toISO(d)]?.length)
  const monthLabel = `${MONTH_PT[month]} ${year}`
  const weekLabel = weekDays.length
    ? `${weekDays[0].getDate()}–${weekDays[weekDays.length - 1].getDate()}`
    : ''

  if (!weekHasSessions.length) {
    return <EmptyWeekState monthLabel={monthLabel} weekLabel={weekLabel} />
  }
  if (dayFmt && !filteredSessions[selectedDate]?.length) {
    const dateObj = selectedDate ? new Date(selectedDate + 'T12:00:00') : null
    return (
      <NoSessionThatDayState
        dateLabel={dateObj ? `${DAY_PT[dateObj.getDay()]} ${dateObj.getDate()}` : 'Este dia'}
        altDates={weekHasSessions}
        onPickDate={onPickAltDate}
        onSwitchToWeek={onSwitchToWeekFormat}
      />
    )
  }

  const isMobileFmt = format === 'diaMobile' || format === 'semanaMobile'
  const scale = Math.min(wrapW / dims.w, isMobileFmt ? 470 / 1920 : 1)

  return (
    <div>
      <div ref={wrapRef} className={s.pvWrap}>
        <div
          className={s.pvStage}
          style={{
            width: Math.round(dims.w * scale),
            height: dims.h ? Math.round(dims.h * scale) : undefined,
          }}
        >
          <div
            style={{
              width: `${dims.w}px`,
              height: dims.h ? `${dims.h}px` : undefined,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
              ...palette,
            }}
          >
            {renderArtefact(format, {
              filteredSessions,
              label,
              gymName,
              fontScale,
              zoneScales,
              blockTitleScales,
              selectedDate,
              logoDataUrl,
              logoScale,
              currentWeekDates,
              year,
              month,
              selectedWeekIdx,
            })}
          </div>
        </div>
        {busy && (
          <div className={s.busy} role="status">
            rasterizando…
          </div>
        )}
      </div>
      <div className={s.pvMeta}>
        <span>{dims.h ? `${dims.w}×${dims.h}` : `${dims.w}×auto`}</span>
        <span>·</span>
        <span>PNG</span>
        <span>·</span>
        <span className={s.pvFname}>{fname}</span>
        {sizeEstimate && <span className={s.pvPush}>~{sizeEstimate}</span>}
      </div>
    </div>
  )
}
