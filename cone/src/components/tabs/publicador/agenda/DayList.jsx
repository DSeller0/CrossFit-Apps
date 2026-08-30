import { IconCalendarEvent } from '@tabler/icons-react'
import { DAY_PT_TITLE, MONTH_PT_SHORT } from '../../../../public/lib/week.js'
import { sessName } from '../../../../public/lib/sessions.js'
import { evStatus } from '../eventFilter.js'
import { dayTitle, weekRangeLabel } from './agendaHelpers.js'
import s from './Agenda.module.css'

// ── DayList — the Lista view: a run of days (#105, second half) ──────────────
//
// #105 asks for "a way to read a run of days". The tempting answer is to copy
// `MinhaSemanaPane`'s `WeekEventGrid`, and it would be wrong: that is a TIME-GRID
// (rows = the times that actually occur, columns = 7 days) answering "what shape is
// my week", and it lives in Afiliados as a read-only projection. A LIST answers a
// different question — "what is coming, in order, and let me act on each" — which is
// the editor's question.
//
// 🔴 And it was already written. `renderMobileDayList` (the `.pub-day-row` markup)
// WAS this list; it just never reached the desktop, because it sat on the isMobile
// side of an `if`. Promoting it deletes a fork rather than opening a surface.
//
// A rest day says "— descanso" rather than going blank, so an empty row can't be
// mistaken for a rendering failure.
//
// CLIENT-FREE.

export default function DayList({
  week,
  month,
  todayISO,
  selDay,
  events,
  athletes,
  dayGymSessions,
  dayEvents,
  toISO,
  showWeekHeader = true,
  onSelect,
}) {
  if (!week) return null

  return (
    <div className={s.lst}>
      {showWeekHeader && <div className={s.lstWkHdr}>Semana de {weekRangeLabel(week)}</div>}

      {week.map(date => {
        const iso = toISO(date)
        const inMonth = date.getMonth() === month
        const isToday = iso === todayISO
        const isSel = selDay === iso
        const gymSessions = dayGymSessions(iso)
        const evs = dayEvents(iso)
        const empty = gymSessions.length === 0 && evs.length === 0
        const allEvs = events[iso] || []
        const hidden = allEvs.length - evs.length

        return (
          <button
            key={iso}
            type="button"
            className={`${s.lstDay}${isSel ? ' ' + s.sel : ''}${inMonth ? '' : ' ' + s.out}`}
            aria-current={isToday ? 'date' : undefined}
            aria-label={dayTitle(iso)}
            onClick={() => onSelect(iso)}
          >
            <div className={s.lstLeft}>
              <span className={`${s.lstDow}${isToday ? ' ' + s.today : ''}`}>
                {DAY_PT_TITLE[date.getDay()]}
              </span>
              <span className={`${s.lstNum}${isToday ? ' ' + s.today : ''}`}>{date.getDate()}</span>
              <span className={s.lstMon}>{MONTH_PT_SHORT[date.getMonth()].toLowerCase()}</span>
            </div>

            <div className={s.lstRows}>
              {empty ? (
                <div className={s.lstRest}>
                  {hidden > 0 ? `— ${hidden} oculto(s) pelo filtro` : '— descanso'}
                </div>
              ) : (
                <>
                  {gymSessions.map((sess, si) => (
                    <div key={'s' + si} className={`${s.lstRow} ${s.sess}`}>
                      <span className={s.lstT} aria-hidden="true">
                        <IconCalendarEvent size={12} />
                      </span>
                      <span className={`${s.lstNm} ${s.sess}`}>{sessName(sess, iso)}</span>
                      <span className={s.lstSub}>
                        {(sess.blocks || []).length}{' '}
                        {(sess.blocks || []).length === 1 ? 'bloco' : 'blocos'}
                      </span>
                    </div>
                  ))}

                  {evs.map(ev => {
                    const isPers = ev.type === 'personal'
                    const done = evStatus(ev) === 'completed'
                    const athList = (ev.athleteIds || [])
                      .map(id => athletes.find(a => a.id === id))
                      .filter(Boolean)
                    return (
                      <div
                        key={ev.id}
                        className={`${s.lstRow} ${isPers ? s.pers : s.aula}${
                          done ? ' ' + s.done : ''
                        }`}
                      >
                        <span className={s.lstT}>{ev.time}</span>
                        <span className={s.lstNm}>
                          {ev.label || (isPers ? 'Personal' : 'Aula')}
                        </span>
                        <span className={s.lstSub}>
                          {done ? 'feita' : `${ev.durationMin || 60}min`}
                        </span>
                        {athList.length > 0 && (
                          <span className={s.lstAths}>
                            {athList.slice(0, 4).map(a => (
                              <span
                                key={a.id}
                                className={s.dotSm}
                                style={{ background: a.color }}
                                title={a.name}
                              />
                            ))}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
