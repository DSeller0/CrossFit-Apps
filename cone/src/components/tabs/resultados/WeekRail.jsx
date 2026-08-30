import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import SessionCard from './SessionCard.jsx'
import { DAY_PT_TITLE } from '../../../public/lib/week.js'
import s from './Resultados.module.css'

// The week rail — month nav, the week strip, and the days with their sessions.
//
// An empty week still renders its seven days with "— descanso": the absence of a session
// is information, so it is the week's own empty state rather than a blank pane.
//
// The `‹`/`›` arrows carry real accessible names (#169) — they were bare glyph buttons.
// CLIENT-FREE: everything (weeks, days, progress) arrives computed.
export default function WeekRail({
  monthLabel,
  weeks,
  weekLabels,
  selWeekIdx,
  weekDays,
  viewMonth,
  selKey,
  progressFor,
  todayKey,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectWeek,
  onSelectSession,
}) {
  return (
    <div className={s.rail}>
      <div className={s.railTop}>
        <div className={s.monthNav}>
          <Button
            variant="ghost"
            size="xs"
            iconOnly
            aria-label="Mês anterior"
            onClick={onPrevMonth}
          >
            <IconChevronLeft size={16} />
          </Button>
          <span className={s.monthLabel}>{monthLabel}</span>
          <Button variant="ghost" size="xs" iconOnly aria-label="Próximo mês" onClick={onNextMonth}>
            <IconChevronRight size={16} />
          </Button>
        </div>
        <div className={s.weekRow}>
          {weeks.map((w, i) => (
            <Button
              key={i}
              size="xs"
              variant={selWeekIdx === i ? 'primary' : 'secondary'}
              aria-pressed={selWeekIdx === i}
              onClick={() => onSelectWeek(i)}
            >
              {weekLabels[i]}
            </Button>
          ))}
          <span className={s.todayBtn}>
            <Button size="xs" variant="ghost" onClick={onToday}>
              Hoje
            </Button>
          </span>
        </div>
      </div>

      {weekDays.map(({ date, dk, daySessions }) => {
        const inMonth = date.getMonth() === viewMonth
        const dayName = DAY_PT_TITLE[date.getDay()]
        const dayNum = String(date.getDate()).padStart(2, '0')
        if (!inMonth) {
          return (
            <div key={dk} className={s.outMonth}>
              {dayName} {dayNum}
            </div>
          )
        }
        const isToday = dk === todayKey
        return (
          <div key={dk}>
            <div className={`${s.dayHdr}${isToday ? ' ' + s.dayHdrToday : ''}`}>
              {dayName} {dayNum}
              {isToday ? ' · hoje' : ''}
            </div>
            {daySessions.length === 0 ? (
              <div className={s.restDay}>— descanso</div>
            ) : (
              daySessions.map(({ key, name, session }) => {
                const p = progressFor(dk, session)
                return (
                  <SessionCard
                    key={key}
                    name={name}
                    logged={p.logged}
                    total={p.total}
                    pct={p.pct}
                    selected={selKey === key}
                    onSelect={() => onSelectSession(key)}
                  />
                )
              })
            )}
          </div>
        )
      })}
    </div>
  )
}
