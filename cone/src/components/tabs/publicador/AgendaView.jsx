import { useState, useEffect, useMemo } from 'react'
import { IconChevronLeft, IconChevronRight, IconFileAnalytics } from '@tabler/icons-react'
import { loadLocations, getTargets, toISO } from '../../../utils/storage'
import { MONTH_PT, DAY_PT_TITLE, monthGridCells } from '../../../public/lib/week.js'
import { uid } from '../../../public/lib/wod.js'
import { useIsMobile } from '../../../hooks/useIsMobile'
import Button from '../../ui/Button.jsx'
import { EventFormInner, ReportModal } from './events'
import EventFilter from './agenda/EventFilter.jsx'
import { agendaFilter, filterDay } from './eventFilter.js'
import CellDay from './agenda/CellDay.jsx'
import DayList from './agenda/DayList.jsx'
import DayPane from './agenda/DayPane.jsx'
import DeleteEventConfirm from './agenda/DeleteEventConfirm.jsx'
import { monthStats, weekRangeLabel } from './agenda/agendaHelpers.js'
import s from './agenda/Agenda.module.css'

// ── AgendaView (#59 · plans/81 C5·a) ─────────────────────────────────────────
//
// 🔴 WHAT THIS TAB IS FOR. #162 moved three of Agenda's jobs into Afiliados:
// `MinhaSemanaPane` shows the week, `AffiliateSessions` an affiliate's month,
// `Fechamento` bills them. All three are READ-projections by money — per
// affiliate, per period; none writes. Agenda is the only surface that writes
// `events`, and the only one where `events` meets `sessions` (the WOD from
// Criador): `dayGymSessions`, `linkedSession`, `onEditSession` and `onLogResult`
// exist nowhere else. THE AGENDA IS THE EDITOR. Everything below follows.
//
// Corollary worth keeping: an event with no affiliate produces no line in
// `calcTotal`, so Fechamento cannot see it. Agenda is the only place that hole
// can be both shown and fixed — hence EventCard's explicit "sem afiliado" tag,
// where a null `svcLoc` used to render nothing at all.
//
// Two views over one selection (#105's second half):
//   Mês   — the grid: navigate, read density, pick the day.
//   Lista — a run of days: read and act in sequence.
// Lista is NOT a second `WeekEventGrid` (that is a time-grid, a different
// question, and it lives in Afiliados). It is `renderMobileDayList` promoted out
// of the `isMobile` fork it was trapped in — a fork deleted, not a surface added.
// The same toggle finally lets a phone see the month grid, whose 540px CSS had sat
// in index.css unreachable behind `useIsMobile(800)`.

// Deliberate per-type rainbow that tints block chips in the day pane and the event
// cards — distinct colour per block *type*, not the 4-family blkColor taxonomy,
// because at chip size the type itself is the useful signal. Verified #84; the two
// consumers were reconciled onto one fallback chain in Phase 0. DATA colours: they
// identify a thing, so they stay literal and are exempt from #15 — do not collapse
// into blkColor and do not tokenize.
const BLOCK_C = {
  Força: '#d8a840',
  LPO: '#4ac8c0',
  'For Time': '#e87820',
  Core: '#68d8a0',
  Acessórios: '#c884f0',
  AMRAP: '#e87820',
  Cardio: '#64b5f6',
  EMOM: '#ff8a65',
  WOD: '#e87820',
  HIIT: '#ff6d00',
}

export function AgendaView({ sessions, events, setEvents, athletes, onEditSession, onLogResult }) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [view, setView] = useState('month') // 'month' | 'list'
  // The selection is ALWAYS a real day — never null. That is what lets the day
  // pane be unconditional (see DayPane's header).
  const [selDay, setSelDay] = useState(() => toISO(new Date()))
  // #105 — one shared filter object, superset of this tab's old tri-state and
  // ReportModal's five axes. `agendaFilter()` opens with no period axis: the month
  // nav below IS the period.
  const [filter, setFilter] = useState(agendaFilter)
  const [showReport, setShowReport] = useState(false)
  const [showForm, setShowForm] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null) // { ev, iso } | null
  const [formData, setFormData] = useState({})
  const [viewWeekIdx, setViewWeekIdx] = useState(0)
  const isMobile = useIsMobile(800)

  const todayISO = toISO(new Date())
  const locs = loadLocations()

  const weeks = useMemo(() => monthGridCells(year, month), [year, month])
  const stats = useMemo(() => monthStats(events, weeks), [events, weeks])

  function dayEvents(iso) {
    return filterDay(events, iso, filter)
  }
  function dayGymSessions(iso) {
    return (sessions[iso] || []).filter(x => getTargets(x).length === 0)
  }

  // Resets the visible week when the month changes. Kept as an effect rather than
  // adjusted during render: it needs `new Date()`, and calling that in a render body
  // is a purity violation — this would trade one warning for another.
  useEffect(() => {
    const now = new Date()
    if (now.getFullYear() === year && now.getMonth() === month) {
      const idx = weeks.findIndex(w => now >= w[0].date && now <= w[6].date)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewWeekIdx(idx >= 0 ? idx : 0)
    } else {
      setViewWeekIdx(0)
    }
  }, [year, month, weeks])

  function saveEvent(ev) {
    setEvents(prev => {
      const d = { ...prev }
      const list = [...(d[ev.date] || [])]
      const idx = list.findIndex(e => e.id === ev.id)
      if (idx >= 0) list[idx] = ev
      else list.push(ev)
      list.sort((a, b) => a.time.localeCompare(b.time))
      return { ...d, [ev.date]: list }
    })
  }
  function toggleStatus(date, id) {
    setEvents(prev => {
      const list = prev[date] || []
      const ev = list.find(e => e.id === id)
      if (!ev) return prev
      const updated = { ...ev, status: ev.status === 'completed' ? 'scheduled' : 'completed' }
      return { ...prev, [date]: list.map(e => (e.id === id ? updated : e)) }
    })
  }
  // Was `window.confirm('Remover este evento?')` — destructive, unreviewable,
  // untrapped and unthemed. Now the app's one dialog shell, which is also where
  // #106's series scope lives (DeleteEventConfirm.jsx).
  function requestDelete(ev, iso) {
    setPendingDelete({ ev, iso })
  }
  function confirmDelete(list) {
    setEvents(prev => {
      const d = { ...prev }
      list.forEach(({ date, id }) => {
        d[date] = (d[date] || []).filter(e => e.id !== id)
        if (!d[date].length) delete d[date]
      })
      return d
    })
    setPendingDelete(null)
  }
  // ⚠️ Ids come from canonical `uid` (public/lib/wod.js), not the local `uid2` this
  // file used to hand-roll. That copy returned a DIFFERENT SHAPE from `uid()`, and
  // these ids go into the `events` blob and are what `recurrenceGroup` points at —
  // the #110 session-id type-mismatch family one door down, where a numeric id never
  // `===` its own rows. `events.jsx`'s `_uid` (which minted every recurrence
  // occurrence) was the same copy and went with it.
  function openForm(type, date, existingEv) {
    const defaults = existingEv
      ? { ...existingEv, id: existingEv.id || uid() }
      : {
          id: uid(),
          date,
          time: '07:00',
          durationMin: 60,
          type,
          label: type === 'aula' ? 'Turma Manhã' : '',
          sessionId: null,
          athleteIds: [],
          status: 'scheduled',
          notes: '',
        }
    setFormData(defaults)
    setShowForm({ type, eventId: existingEv?.id || null, date })
  }
  function copyLastEvent(iso) {
    const allEvs = Object.entries(events).sort((a, b) => b[0].localeCompare(a[0]))
    let last = null
    for (const [, evs2] of allEvs) {
      const sorted = [...evs2].sort((a, b) => b.time.localeCompare(a.time))
      if (sorted.length) {
        last = sorted[0]
        break
      }
    }
    if (!last) return
    openForm(last.type, iso, {
      ...last,
      id: undefined,
      date: iso,
      status: 'scheduled',
      recurrenceGroup: undefined,
      athleteIds: last.athleteIds || [],
      notes: last.notes || '',
      local: last.local || '',
      localText: last.localText || '',
    })
  }

  // Month nav keeps the selection on a real day: today when landing on the current
  // month, the 1st otherwise. The pane is never empty, so it never needs a
  // "pick a day" placeholder.
  function goMonth(delta) {
    const now = new Date()
    const m = month + delta
    const y = m < 0 ? year - 1 : m > 11 ? year + 1 : year
    const mm = (m + 12) % 12
    setYear(y)
    setMonth(mm)
    setSelDay(
      now.getFullYear() === y && now.getMonth() === mm
        ? toISO(now)
        : `${y}-${String(mm + 1).padStart(2, '0')}-01`,
    )
  }
  function goToday() {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    setSelDay(toISO(now))
  }

  const selGymSessions = dayGymSessions(selDay)
  const selEvs = dayEvents(selDay)

  const header = (
    <div className={`${s.hdr}${isMobile ? ' ' + s.hdrSticky : ''}`}>
      <div className={s.hdrTop}>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Mês anterior"
          onClick={() => goMonth(-1)}
        >
          <IconChevronLeft size={15} />
        </Button>
        {/* The surface's one real heading. */}
        <h1 className={s.title}>
          <span className={s.titleKicker}>Agenda</span>
          {MONTH_PT[month]} {year}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Próximo mês"
          onClick={() => goMonth(1)}
        >
          <IconChevronRight size={15} />
        </Button>
        <Button variant="secondary" size="xs" onClick={goToday}>
          Hoje
        </Button>
        <div className={s.viewSeg} role="group" aria-label="Visão">
          <button
            type="button"
            className={view === 'month' ? s.on : ''}
            aria-pressed={view === 'month'}
            onClick={() => setView('month')}
          >
            Mês
          </button>
          <button
            type="button"
            className={view === 'list' ? s.on : ''}
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            Lista
          </button>
        </div>
        {/* Actions live on the right, with the view toggle — not between the "‹"
            and the month label, which is where Relatório used to sit. */}
        <Button variant="secondary" size="xs" onClick={() => setShowReport(true)}>
          <IconFileAnalytics size={13} /> Relatório
        </Button>
      </div>

      {/* ⚠️ Every number says exactly what it counts. `status` is a manual toggle
          and `athleteIds` a checkbox list — neither is attendance (#102) — so this
          reads "a lançar", never anything about who was present. */}
      <div className={s.stats}>
        <div className={s.statItem}>
          <span className={`${s.statVal}${stats.total === 0 ? ' ' + s.zero : ''}`}>
            {stats.total}
          </span>
          <span className={s.statLbl}>eventos no mês</span>
        </div>
        {stats.total > 0 && (
          <>
            <div className={s.statItem}>
              <span className={`${s.statVal} ${s.aula}`}>{stats.aulas}</span>
              <span className={s.statLbl}>aulas</span>
            </div>
            <div className={s.statItem}>
              <span className={`${s.statVal} ${s.pers}`}>{stats.personal}</span>
              <span className={s.statLbl}>personal</span>
            </div>
            <div className={s.statItem}>
              <span className={s.statVal}>{stats.open}</span>
              <span className={s.statLbl}>a lançar</span>
            </div>
          </>
        )}
      </div>

      <EventFilter
        value={filter}
        onChange={setFilter}
        axes={['type', 'status', 'affiliate', 'athlete']}
        layout="row"
        locs={locs}
        athletes={athletes}
      />

      {/* The week strip only exists for the Lista view, which shows one week. */}
      {view === 'list' && (
        <div className={s.weekStrip}>
          {weeks.map((w, i) => (
            <button
              key={i}
              type="button"
              className={`${s.weekBtn}${viewWeekIdx === i ? ' ' + s.on : ''}`}
              onClick={() => setViewWeekIdx(i)}
            >
              {weekRangeLabel(w.map(c => c.date))}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const monthGrid = (
    <>
      <div className={s.mHdrs}>
        {DAY_PT_TITLE.map(d => (
          <div key={d} className={s.mHdr}>
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className={s.mWeek}>
          {week.map(({ date, inMonth }, di) => {
            const iso = toISO(date)
            if (!inMonth) return <div key={di} className={s.mCellOut} aria-hidden="true" />
            return (
              <CellDay
                key={di}
                iso={iso}
                day={date.getDate()}
                isToday={iso === todayISO}
                isPast={iso < todayISO}
                isSelected={selDay === iso}
                gymSessions={dayGymSessions(iso)}
                evs={dayEvents(iso)}
                athletes={athletes}
                onSelect={setSelDay}
              />
            )
          })}
        </div>
      ))}
    </>
  )

  const listView = (
    <DayList
      week={(weeks[viewWeekIdx] || weeks[0] || []).map(c => c.date)}
      month={month}
      todayISO={todayISO}
      selDay={selDay}
      events={events}
      athletes={athletes}
      dayGymSessions={dayGymSessions}
      dayEvents={dayEvents}
      toISO={toISO}
      showWeekHeader={!isMobile}
      onSelect={setSelDay}
    />
  )

  return (
    <div className={s.wrap}>
      {header}
      <div className={s.body}>
        <div className={s.gridCol}>{view === 'month' ? monthGrid : listView}</div>
        {/* Not conditional — see DayPane's header. */}
        <div className={s.paneCol}>
          <DayPane
            iso={selDay}
            events={events}
            sessions={sessions}
            athletes={athletes}
            locs={locs}
            gymSessions={selGymSessions}
            evs={selEvs}
            BLOCK_C={BLOCK_C}
            openForm={openForm}
            toggleStatus={toggleStatus}
            requestDelete={requestDelete}
            copyLastEvent={copyLastEvent}
            onEditSession={onEditSession}
            onLogResult={onLogResult}
          />
        </div>
      </div>

      <DeleteEventConfirm
        target={pendingDelete}
        events={events}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      {showReport && (
        <ReportModal events={events} sessions={sessions} onClose={() => setShowReport(false)} />
      )}
      {showForm && (
        <EventFormInner
          showForm={showForm}
          sessions={sessions}
          athletes={athletes}
          initialData={formData}
          onSave={evs => {
            const arr = Array.isArray(evs) ? evs : [evs]
            arr.forEach(saveEvent)
            setShowForm(null)
          }}
          onCancel={() => setShowForm(null)}
        />
      )}
    </div>
  )
}
