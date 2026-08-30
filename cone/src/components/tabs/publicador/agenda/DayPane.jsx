import { IconPlus, IconCalendarPlus, IconCopy, IconCalendarOff } from '@tabler/icons-react'
import { sessName } from '../../../../public/lib/sessions.js'
import { dayTitle, hiddenCount, seriesEvents } from './agendaHelpers.js'
import EventCard from './EventCard.jsx'
import s from './Agenda.module.css'

// ── DayPane — the selected day ───────────────────────────────────────────────
// Hoisted out of AgendaView's render body in step (a); converted to JSX + module
// CSS here (it was 725 lines of React.createElement over a frozen palette).
//
// 🔴 It is NO LONGER CONDITIONAL. The pane always shows a real day — today, or the
// first of whatever month was navigated to. That kills two things at once: the grid
// reflowing 100% ↔ 60% on every click, and 40% of the editor's surface spent
// rendering "Clique num dia para ver detalhes" in grey italics. In an editor the
// object being edited is always on screen.
//
// This is also the ONLY place `events` meets `sessions` — the commitment and the
// WOD the coach wrote in Criador, on the same day. None of the Afiliados panes
// knows `sessions` exists, which is half of why Agenda is still the editor.
//
// CLIENT-FREE.

export default function DayPane({
  iso,
  events,
  sessions,
  athletes,
  locs,
  gymSessions,
  evs,
  BLOCK_C,
  openForm,
  toggleStatus,
  requestDelete,
  copyLastEvent,
  onEditSession,
  onLogResult,
}) {
  const allEvs = events[iso] || []
  const hidden = hiddenCount(allEvs, evs)
  const nothingAtAll = gymSessions.length === 0 && allEvs.length === 0
  const count = gymSessions.length + evs.length

  return (
    <div className={s.dp}>
      <div className={s.dpHdr}>
        <div className={s.dpTop}>
          <h2 className={s.dpDate}>{dayTitle(iso)}</h2>
          {count > 0 && (
            <span className={s.dpCount}>
              {count} {count === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>
        <div className={s.dpAdds}>
          <button
            type="button"
            className={`${s.addBtn} ${s.aula}`}
            onClick={() => openForm('aula', iso)}
          >
            <IconPlus size={13} aria-hidden="true" /> Aula
          </button>
          <button
            type="button"
            className={`${s.addBtn} ${s.pers}`}
            onClick={() => openForm('personal', iso)}
          >
            <IconPlus size={13} aria-hidden="true" /> Personal
          </button>
          {onEditSession && (
            <button
              type="button"
              className={`${s.addBtn} ${s.sess}`}
              onClick={() => onEditSession({ _newForDate: iso })}
            >
              <IconCalendarPlus size={13} aria-hidden="true" /> Sessão
            </button>
          )}
        </div>
      </div>

      <div className={s.dpBody}>
        {gymSessions.length > 0 && (
          <>
            <div className={s.dpSecLbl}>Treino do dia · Criador</div>
            {gymSessions.map((sess, si) => (
              <div key={si} className={s.sessCard}>
                <div className={s.sessTop}>
                  <span className={s.sessName}>{sessName(sess, iso)}</span>
                  {onEditSession && (
                    <button
                      type="button"
                      className={s.weekBtn}
                      onClick={e => {
                        e.stopPropagation()
                        onEditSession(sess)
                      }}
                    >
                      Editar
                    </button>
                  )}
                </div>
                <div className={s.blkRow}>
                  {(sess.blocks || []).map((bl, bi) => {
                    const lbl = bl.label && bl.label !== '-' ? bl.label : bl.type
                    const col = BLOCK_C[lbl] || BLOCK_C[bl.type] || 'var(--dim)'
                    return (
                      <span
                        key={bi}
                        className={s.blk}
                        style={{
                          color: col,
                          borderColor: col,
                          background: `color-mix(in srgb, ${col} 13%, transparent)`,
                        }}
                      >
                        {lbl}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {evs.length > 0 && (
          <>
            <div className={`${s.dpSecLbl}${gymSessions.length > 0 ? ' ' + s.mt : ''}`}>
              Agenda do dia
            </div>
            {evs.map(ev => {
              const series = seriesEvents(events, ev.recurrenceGroup)
              return (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  iso={iso}
                  athletes={athletes}
                  locs={locs}
                  sessions={sessions}
                  BLOCK_C={BLOCK_C}
                  seriesCount={series.length}
                  seriesIndex={series.findIndex(e => e.id === ev.id) + 1}
                  onEdit={e => openForm(e.type, iso, e)}
                  onToggleStatus={toggleStatus}
                  onDelete={requestDelete}
                  onLogResult={onLogResult}
                  onEditSession={onEditSession}
                />
              )
            })}
          </>
        )}

        {/* A day whose events the filter hid is NOT the same state as an empty day,
            and the pane has to say which one it is. */}
        {evs.length === 0 && hidden > 0 && (
          <p className={s.hiddenNote}>
            {hidden === 1
              ? '1 evento deste dia está oculto'
              : `${hidden} eventos deste dia estão ocultos`}{' '}
            pelo filtro.
          </p>
        )}
        {evs.length > 0 && hidden > 0 && (
          <p className={s.hiddenNote}>
            Mais {hidden} {hidden === 1 ? 'evento' : 'eventos'} deste dia{' '}
            {hidden === 1 ? 'está oculto' : 'estão ocultos'} pelo filtro.
          </p>
        )}

        {nothingAtAll && (
          <div className={s.empty}>
            <IconCalendarOff size={26} className={s.emptyIc} aria-hidden="true" />
            <div className={s.emptyT}>Nada marcado neste dia</div>
            <div className={s.emptyX}>
              Use os botões acima, ou copie o último evento que você criou.
            </div>
            <button type="button" className={s.addBtn} onClick={() => copyLastEvent(iso)}>
              <IconCopy size={13} aria-hidden="true" /> Copiar último evento
            </button>
          </div>
        )}

        {!nothingAtAll && evs.length > 0 && (
          <button
            type="button"
            className={s.addBtn}
            style={{ marginTop: '4px' }}
            onClick={() => copyLastEvent(iso)}
          >
            <IconCopy size={13} aria-hidden="true" /> Copiar último evento
          </button>
        )}
      </div>
    </div>
  )
}
