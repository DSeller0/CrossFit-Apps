import { DAY_PT } from '../../../../public/lib/week.js'
import { toISO } from '../../../../utils/storage'
import { getWeeksOfMonth } from '../exportHelpers'
import s from '../Publicador.module.css'

// The ONE when-picker (#59 C5·b1 step d — plans/82's approach explicitly calls for one,
// not the old toolbar's month nav plus the preview modal's own separate week/day tabs).
// Month → week → day, always visible; the day row is disabled (not hidden) outside the
// two day-shaped formats — greying out is what tells the coach "not applicable here"
// without the row jumping around as they switch formats.
export default function WhenPicker({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  selectedWeekIdx,
  onSelectWeek,
  selectedDate,
  onSelectDate,
  sessions,
  dayFormat,
  monthLabel,
}) {
  const weeks = getWeeksOfMonth(year, month)
  const currentWeek = weeks[selectedWeekIdx] || weeks[0]
  const days = currentWeek ? currentWeek.slice(1).concat(currentWeek[0]) : [] // Seg…Sáb, Dom last — matches the export week's Mon-first body

  return (
    <div className={s.when}>
      <div className={s.mo}>
        <button type="button" className={s.wkBtn} onClick={onPrevMonth} aria-label="Mês anterior">
          ◀
        </button>
        <span>{monthLabel}</span>
        <button type="button" className={s.wkBtn} onClick={onNextMonth} aria-label="Próximo mês">
          ▶
        </button>
      </div>
      <span className={s.sep} aria-hidden="true" />
      <div className={s.wkRow} role="radiogroup" aria-label="Semana">
        {weeks.map((w, wi) => {
          const mon = w[1],
            fri = w[5]
          const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          const on = wi === selectedWeekIdx
          return (
            <button
              key={wi}
              type="button"
              role="radio"
              aria-checked={on}
              className={`${s.wkBtn} ${on ? s.on : ''}`}
              onClick={() => onSelectWeek(wi, w)}
            >
              {`${fmt(mon)}–${fmt(fri)}`}
            </button>
          )
        })}
      </div>
      <span className={s.sep} aria-hidden="true" />
      <div className={s.dyRow} role="radiogroup" aria-label="Dia">
        {days.map(d => {
          const iso = toISO(d)
          const has = !!sessions[iso]?.length
          const on = dayFormat && selectedDate === iso
          return (
            <button
              key={iso}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!dayFormat}
              className={`${s.dyBtn} ${has ? s.has : ''} ${on ? s.on : ''}`}
              onClick={() => onSelectDate(iso, currentWeek)}
            >
              {DAY_PT[d.getDay()]}
            </button>
          )
        })}
      </div>
      {!dayFormat && <span className={s.hint}>este formato não depende do dia selecionado</span>}
    </div>
  )
}
