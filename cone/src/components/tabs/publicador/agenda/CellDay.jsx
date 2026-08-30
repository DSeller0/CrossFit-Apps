import { IconCalendarEvent, IconCheck } from '@tabler/icons-react'
import { sessName } from '../../../../public/lib/sessions.js'
import { evStatus } from '../eventFilter.js'
import { dayCards, dayTitle } from './agendaHelpers.js'
import s from './Agenda.module.css'

// ── CellDay — one day of the month grid ──────────────────────────────────────
// Hoisted out of AgendaView's render body in step (a); converted to JSX + module
// CSS here. It was 213 lines of React.createElement carrying a frozen totk-dark
// palette inline, which is why Agenda rendered wrong in three of the four themes.
//
// Below 540px the chips drop their text and become coloured stubs — the compact
// month a phone can read. Those rules already existed in index.css and were
// unreachable, because useIsMobile(800) meant the grid never rendered that narrow.
// The view toggle is what makes them live.
//
// CLIENT-FREE.

export default function CellDay({
  iso,
  day,
  isToday,
  isPast,
  isSelected,
  gymSessions,
  evs,
  athletes,
  onSelect,
}) {
  const cards = dayCards(gymSessions, evs)
  const visible = cards.slice(0, 3)

  // The cell's text content is the day number plus up to three truncated chips,
  // which reads as noise to a screen reader; `aria-label` states the day and how
  // much is on it instead.
  return (
    <button
      type="button"
      className={`${s.mCell}${isSelected ? ' ' + s.sel : ''}`}
      aria-current={isToday ? 'date' : undefined}
      aria-pressed={isSelected}
      aria-label={`${dayTitle(iso)} — ${cards.length} ${cards.length === 1 ? 'item' : 'itens'}`}
      onClick={() => onSelect(iso)}
    >
      <div className={s.mCellTop}>
        <span className={`${s.mNum}${isToday ? ' ' + s.today : isPast ? ' ' + s.past : ''}`}>
          {day}
        </span>
        {cards.length > 0 && <span className={s.mCount}>{cards.length}</span>}
      </div>

      {visible.map((card, ci) => {
        if (card.kind === 'session') {
          return (
            <span key={'s' + ci} className={`${s.chip} ${s.sess}`}>
              <IconCalendarEvent size={8} aria-hidden="true" />
              <span className={s.chipText}>{sessName(card.data, iso)}</span>
            </span>
          )
        }
        const ev = card.data
        const isPers = ev.type === 'personal'
        const done = evStatus(ev) === 'completed'
        const ath =
          isPers && ev.athleteIds?.[0] ? athletes.find(a => a.id === ev.athleteIds[0]) : null
        return (
          <span
            key={'e' + ci}
            className={`${s.chip} ${isPers ? s.pers : s.aula}${done ? ' ' + s.done : ''}`}
          >
            {done && (
              <span className={s.chipCk} aria-hidden="true">
                <IconCheck size={8} />
              </span>
            )}
            <span className={s.chipT}>{ev.time}</span>
            <span className={s.chipText}>
              {ath && (
                <span
                  className={s.dotSm}
                  style={{ background: ath.color, marginRight: '3px' }}
                  aria-hidden="true"
                />
              )}
              {ev.label || (isPers ? 'Personal' : 'Aula')}
            </span>
          </span>
        )
      })}

      {cards.length > 3 && <div className={s.mMore}>+{cards.length - 3} mais</div>}
    </button>
  )
}
