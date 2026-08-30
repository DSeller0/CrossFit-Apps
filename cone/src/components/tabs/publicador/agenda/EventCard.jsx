import {
  IconRepeat,
  IconClipboardList,
  IconCalendarEvent,
  IconCalendarPlus,
  IconPencil,
  IconTrash,
  IconMapPin,
  IconAlertTriangle,
  IconCheck,
} from '@tabler/icons-react'
import { evStatus } from '../eventFilter.js'
import s from './Agenda.module.css'

// ── EventCard — one event in the day pane ────────────────────────────────────
// The card the whole surface is really about: Agenda is the editor, so this is
// where an event is read, retitled, moved, marked and removed.
//
// Six independent axes, one shell — type (aula/personal) · status (a lançar/feita) ·
// affiliate (com/sem) · series (avulso/recorrente) · linked session · athletes.
// None hides another: the title row accumulates tags and wraps.
//
// 🔴 `evStatus` is carried across verbatim (plans/81 decision 1) and nothing here
// assumes `status` is a manual toggle in its SHAPE — the labels are "A lançar" /
// "Feita", what the coach did with the RECORD, never what the athlete did. When
// #102 derives status from `class_executions`, this button changes source without
// changing form.
//
// CLIENT-FREE — `locs`, `athletes` and `sessions` all arrive as props.

export default function EventCard({
  ev,
  iso,
  athletes = [],
  locs = [],
  sessions = {},
  BLOCK_C,
  seriesCount = 0,
  seriesIndex = 0,
  onEdit,
  onToggleStatus,
  onDelete,
  onLogResult,
  onEditSession,
}) {
  const isPers = ev.type === 'personal'
  const done = evStatus(ev) === 'completed'
  const athList = (ev.athleteIds || []).map(id => athletes.find(a => a.id === id)).filter(Boolean)
  const linkedSession = ev.sessionId ? (sessions[iso] || []).find(x => x.id === ev.sessionId) : null
  const locDisplay = ev.local && ev.local !== '__outro__' ? ev.local : ev.localText || ''
  const svcLoc = ev.locationId ? locs.find(l => l.id === ev.locationId) : null

  // A personal event carries no locationId of its own — the coach picks an athlete
  // and the rate comes from whichever affiliate holds them. Same reverse lookup
  // EventFormInner already does at booking time.
  const persLoc =
    isPers && (ev.athleteIds || []).length
      ? locs.find(l => l.type === 'personal' && (l.athleteIds || []).includes(ev.athleteIds[0]))
      : null
  const affiliate = svcLoc || persLoc

  const shown = athList.slice(0, 3)
  const extra = athList.length - shown.length

  return (
    <div className={s.evWrap}>
      <div className={s.evTime}>
        <div className={s.evTimeH}>{ev.time}</div>
        <div className={s.evTimeD}>{ev.durationMin || 60}m</div>
        <div className={s.evTimeLine} />
      </div>

      <div className={`${s.evCard}${isPers ? ' ' + s.pers : ''}${done ? ' ' + s.done : ''}`}>
        {/* A real <button>, not a click-<div> with role/tabIndex bolted on. Its
            accessible NAME stays the card's own content (the event's name, tags and
            time); `title` supplies the action without stealing that name. */}
        <button type="button" className={s.evBody} title="Editar evento" onClick={() => onEdit(ev)}>
          <div className={s.evTitleRow}>
            <span className={s.evName}>{ev.label || (isPers ? 'Personal' : 'Aula')}</span>
            <span className={`${s.tag} ${isPers ? s.pers : s.aula}`}>
              {isPers ? 'Personal' : 'Aula'}
            </span>
            {affiliate ? (
              <span
                className={`${s.tag} ${s.aff}`}
                style={{ color: affiliate.color || 'var(--sub)' }}
              >
                {affiliate.name}
              </span>
            ) : (
              /* Stated, not omitted. `svcLoc` null used to render NOTHING, so the one
                 condition that makes an event unbillable was invisible on the only
                 surface that can fix it. */
              <span className={`${s.tag} ${s.noaff}`}>sem afiliado</span>
            )}
            {ev.recurrenceGroup && (
              <span className={`${s.tag} ${s.serie}`}>
                <IconRepeat size={10} aria-hidden="true" />
                {seriesCount > 1 ? `série · ${seriesIndex}/${seriesCount}` : 'série'}
              </span>
            )}
          </div>

          <div className={s.evMeta}>
            {ev.time} · {ev.durationMin || 60} min
          </div>

          {linkedSession && (
            <div className={s.evLine}>
              <IconCalendarEvent size={12} className={s.ic} aria-hidden="true" />
              {linkedSession.mainTraining || linkedSession.name || 'Sessão do dia'}
            </div>
          )}

          {linkedSession && (linkedSession.blocks || []).length > 0 && (
            <div className={s.blkRow} style={{ marginTop: '5px' }}>
              {linkedSession.blocks.map((bl, bi) => {
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
          )}

          {athList.length > 0 ? (
            <div className={s.evAths}>
              {shown.map(a => (
                <span key={a.id} className={s.athPill}>
                  <span className={s.dot} style={{ background: a.color }} aria-hidden="true" />
                  {a.name}
                </span>
              ))}
              {extra > 0 && <span className={`${s.athPill} ${s.more}`}>+{extra} marcados</span>}
            </div>
          ) : (
            <div className={s.evAths}>
              <span className={`${s.athPill} ${s.none}`}>Nenhum atleta marcado</span>
            </div>
          )}

          {!affiliate && (
            <div className={`${s.evLine} ${s.warn}`}>
              <IconAlertTriangle size={12} className={s.ic} aria-hidden="true" />
              {isPers
                ? 'Nenhum afiliado tem este atleta — sem taxa, sem valor na fatura.'
                : 'Sem afiliado, esta aula não entra em nenhuma fatura.'}
            </div>
          )}

          {locDisplay && (
            <div className={s.evLine}>
              <IconMapPin size={11} className={s.ic} aria-hidden="true" />
              {locDisplay}
            </div>
          )}

          {ev.notes && <div className={s.evNote}>{ev.notes}</div>}

          {/* ── #102 reserved attendance slot ─────────────────────────────────
              Renders nothing, on purpose — the same device atletas/Ficha.jsx uses
              for #39 and plans/22. #102's real roster (the class_executions join)
              lands HERE, directly under the coach's manual `athleteIds`.
              ⚠️ Its empty state is EMPTY. Not "0 presentes", not "sem check-ins":
              `events` does not know who showed up, so a zero would be a claim.
              Do not redesign the card around this slot. */}
        </button>

        <div className={s.evBar}>
          <button
            type="button"
            className={`${s.statusBtn}${done ? ' ' + s.on : ''}`}
            title={done ? 'Marcar como a lançar' : 'Marcar como feita'}
            aria-pressed={done}
            onClick={() => onToggleStatus(iso, ev.id)}
          >
            <span className={s.statusBox} aria-hidden="true">
              {done && <IconCheck size={9} />}
            </span>
            {done ? 'Feita' : 'A lançar'}
          </button>

          {onLogResult && isPers && (
            <button
              type="button"
              className={s.icb}
              title="Lançar resultado"
              aria-label="Lançar resultado"
              onClick={() => onLogResult({ athleteId: ev.athleteIds?.[0] || null, date: iso })}
            >
              <IconClipboardList size={15} aria-hidden="true" />
            </button>
          )}

          {onEditSession && (
            <button
              type="button"
              className={s.icb}
              title={linkedSession ? 'Editar sessão vinculada' : 'Criar sessão para este dia'}
              aria-label={linkedSession ? 'Editar sessão vinculada' : 'Criar sessão para este dia'}
              onClick={() => onEditSession(linkedSession || { _newForDate: iso })}
            >
              {linkedSession ? (
                <IconCalendarEvent size={15} aria-hidden="true" />
              ) : (
                <IconCalendarPlus size={15} aria-hidden="true" />
              )}
            </button>
          )}

          <button
            type="button"
            className={s.icb}
            title="Editar evento"
            aria-label="Editar evento"
            onClick={() => onEdit(ev)}
          >
            <IconPencil size={15} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={`${s.icb} ${s.del}`}
            title="Excluir evento"
            aria-label="Excluir evento"
            onClick={() => onDelete(ev, iso)}
          >
            <IconTrash size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
