import React, { useState, useEffect, useMemo } from 'react'
import { loadLocations, getTargets, toISO } from '../../../utils/storage'
import { MONTH_PT, DAY_PT_TITLE } from '../../../public/lib/week.js'
import { sessName } from '../../../public/lib/sessions.js'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { getWeeksOfMonth } from './exportHelpers'
import { EventFormInner, ReportModal } from './events'
import EventFilter from './agenda/EventFilter.jsx'
import { agendaFilter, evStatus, filterDay } from './eventFilter.js'
import CellDay from './agenda/CellDay.jsx'
import DayPane from './agenda/DayPane.jsx'

// ── AgendaView ────────────────────────────────────────────────────────────────
export function AgendaView({ sessions, events, setEvents, athletes, onEditSession, onLogResult }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  // #105 — the one shared filter object, superset of this tab's old tri-state and
  // ReportModal's five axes. `agendaFilter()` opens with no period axis: the month
  // nav below IS the period.
  const [filter, setFilter] = useState(agendaFilter)
  const [selDay, setSelDay] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [showForm, setShowForm] = useState(null)
  const [formData, setFormData] = useState({})
  const [viewWeekIdx, setViewWeekIdx] = useState(0)
  const isMobile = useIsMobile(800)

  const todayISO = toISO(new Date())
  // Deliberate per-type rainbow that tints the block chips in the day pane and the
  // mobile day detail — distinct color per block *type*, not the 4-family blkColor
  // taxonomy, because at chip size the type itself is the useful signal, not the
  // coarser family grouping. Verified #84 — do not collapse into blkColor; its
  // hardcoded hex is #59's (Publicador design pass), not this one.
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
  // Memoized so the effect below can honestly depend on it (react-hooks/exhaustive-deps):
  // recomputed inline it changed identity every render, which is why the effect had to
  // omit it. Also stops rebuilding the month grid on every render — it feeds 4 call sites.
  const mobileWeeks = useMemo(() => getWeeksOfMonth(year, month), [year, month])

  const locs = loadLocations()
  function svcName(ev) {
    if (ev.type === 'personal') return 'Personal'
    const svc = ev.locationId ? locs.find(l => l.id === ev.locationId) : null
    return svc?.name || 'Aula'
  }
  function dayEvents(iso) {
    return filterDay(events, iso, filter)
  }
  function dayGymSessions(iso) {
    return (sessions[iso] || []).filter(s => getTargets(s).length === 0)
  }

  const weeks = mobileWeeks.map(week =>
    week.map(d => (d.getMonth() === month ? d.getDate() : null)),
  )
  const cells = weeks.flat()

  let totalAulas = 0,
    totalPersonal = 0,
    completedAulas = 0,
    completedPersonal = 0
  cells.filter(Boolean).forEach(d => {
    const iso = toISO2(year, month, d)
    const evs = events[iso] || []
    evs.forEach(ev => {
      const done = evStatus(ev) === 'completed'
      if (ev.type === 'aula') {
        totalAulas++
        if (done) completedAulas++
      }
      if (ev.type === 'personal') {
        totalPersonal++
        if (done) completedPersonal++
      }
    })
  })
  const totalEvs = totalAulas + totalPersonal
  const totalCompleted = completedAulas + completedPersonal

  // Resets the visible week when the month changes. Kept as an effect rather than adjusted
  // during render: it needs `new Date()`, and calling that in the render body is a purity
  // violation — this would trade one warning for another. Guarded by the deps, so it fires
  // once per month change, not per render.
  useEffect(() => {
    const now = new Date()
    if (now.getFullYear() === year && now.getMonth() === month) {
      const idx = mobileWeeks.findIndex(w => now >= w[0] && now <= w[6])
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewWeekIdx(idx >= 0 ? idx : 0)
    } else {
      setViewWeekIdx(0)
    }
  }, [year, month, mobileWeeks])

  function uid2() {
    // `uid2` is handler-only — its sole caller is `openForm`, itself reachable only from
    // an onClick. That is the "Date.now() inside a handler-only function" exemption
    // CLAUDE.md documents for react-hooks/purity. It only started firing when CellDay and
    // DayPane were hoisted out of this body, which is what had kept the call graph local
    // enough for the rule to see through. #59/plans/81 C5·a step (f) deletes this whole
    // function in favour of canonical `uid` (public/lib/wod.js), where the call sits behind
    // an import and the rule never sees it at all.
    // eslint-disable-next-line react-hooks/purity
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
  function toISO2(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

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
  function deleteEvent(date, id) {
    setEvents(prev => {
      const d = { ...prev }
      d[date] = (d[date] || []).filter(e => e.id !== id)
      if (!d[date].length) delete d[date]
      return { ...d }
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
  function openForm(type, date, existingEv) {
    const defaults = existingEv
      ? { ...existingEv, id: existingEv.id || uid2() }
      : {
          id: uid2(),
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

  // ── Mobile render helpers ────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear(y => y - 1)
    } else setMonth(m => m - 1)
    setSelDay(null)
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear(y => y + 1)
    } else setMonth(m => m + 1)
    setSelDay(null)
  }

  function renderMobileHeader() {
    return React.createElement(
      'div',
      { className: 'rp-sticktop pub-mobile-hdr' },
      React.createElement(
        'div',
        { className: 'rp-month-nav' },
        React.createElement(
          'button',
          { type: 'button', className: 'rp-nav-btn', onClick: prevMonth },
          '‹',
        ),
        React.createElement('span', { className: 'rp-month-label' }, `${MONTH_PT[month]} ${year}`),
        React.createElement(
          'button',
          { type: 'button', className: 'rp-nav-btn', onClick: nextMonth },
          '›',
        ),
      ),
      React.createElement(
        'div',
        { className: 'rp-weeks' },
        mobileWeeks.map((w, i) => {
          const lastDay = new Date(year, month + 1, 0).getDate()
          const s = w[0].getMonth() === month ? w[0].getDate() : 1
          const e = w[6].getMonth() === month ? w[6].getDate() : lastDay
          return React.createElement(
            'button',
            {
              key: i,
              type: 'button',
              className: `rp-week-btn${viewWeekIdx === i ? ' on' : ''}`,
              onClick: () => setViewWeekIdx(i),
            },
            `${s}–${e}`,
          )
        }),
      ),
      React.createElement(
        'div',
        { className: 'pub-mobile-meta' },
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '8px', fontSize: '10px', flexWrap: 'wrap', flex: 1 } },
          React.createElement(
            'span',
            { style: { color: 'var(--theme-accent)' } },
            `${completedAulas}/${totalAulas} aulas`,
          ),
          React.createElement(
            'span',
            { style: { color: '#d8a840' } },
            `${completedPersonal}/${totalPersonal} personal`,
          ),
          React.createElement(
            'span',
            { style: { color: '#68d8a0' } },
            `${totalCompleted}/${totalEvs} concluídas`,
          ),
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => setShowReport(true),
            style: {
              background: 'rgba(216,168,64,.1)',
              border: '1px solid rgba(216,168,64,.3)',
              color: '#d8a840',
              padding: '3px 8px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'inherit',
              flexShrink: 0,
            },
          },
          React.createElement('i', { className: 'ti ti-file-analytics' }),
          'Relatório',
        ),
      ),
      React.createElement(EventFilter, {
        value: filter,
        onChange: setFilter,
        axes: ['type', 'status', 'affiliate', 'athlete'],
        layout: 'row',
        locs,
        athletes,
      }),
    )
  }

  function renderMobileDayList() {
    const week = mobileWeeks[viewWeekIdx] || mobileWeeks[0]
    if (!week) return null
    return React.createElement(
      'div',
      { style: { overflowY: 'auto', flex: 1 } },
      week.map(date => {
        const iso = toISO(date)
        const inMonth = date.getMonth() === month
        const isToday = iso === todayISO
        const gymSessions = dayGymSessions(iso)
        const evs = dayEvents(iso)
        const allCards = [
          ...gymSessions.map(s => ({ kind: 'session', data: s })),
          ...evs.map(ev => ({ kind: 'event', data: ev })),
        ]
        return React.createElement(
          'div',
          {
            key: iso,
            className: 'pub-day-row',
            style: { opacity: inMonth ? 1 : 0.28 },
            onClick: () => {
              if (inMonth) setSelDay(iso)
            },
          },
          React.createElement(
            'div',
            { className: 'pub-day-left' },
            React.createElement(
              'div',
              {
                className: 'pub-day-name',
                style: { color: isToday ? 'var(--theme-accent)' : '#806850' },
              },
              DAY_PT_TITLE[date.getDay()],
            ),
            isToday
              ? React.createElement('div', { className: 'pub-day-num today' }, date.getDate())
              : React.createElement('div', { className: 'pub-day-num' }, date.getDate()),
          ),
          React.createElement(
            'div',
            { className: 'pub-day-chips' },
            allCards.length === 0
              ? React.createElement('span', { className: 'pub-day-rest' }, '— descanso')
              : React.createElement(
                  React.Fragment,
                  null,
                  allCards.slice(0, 9).map((card, ci) => {
                    if (card.kind === 'session') {
                      return React.createElement(
                        'span',
                        { key: ci, className: 'pub-chip pub-chip-sess' },
                        React.createElement('i', {
                          className: 'ti ti-calendar-event',
                          style: { fontSize: '8px' },
                        }),
                        ' ',
                        sessName(card.data, iso),
                      )
                    }
                    const ev = card.data
                    const isPers = ev.type === 'personal'
                    const done = evStatus(ev) === 'completed'
                    return React.createElement(
                      'span',
                      {
                        key: ci,
                        className: `pub-chip ${isPers ? 'pub-chip-pers' : 'pub-chip-aula'}`,
                        style: { opacity: done ? 0.65 : 1 },
                      },
                      done ? '✓ ' : '',
                      ev.time,
                      ' ',
                      svcName(ev),
                    )
                  }),
                  allCards.length > 9 &&
                    React.createElement(
                      'span',
                      { className: 'pub-chip-more' },
                      `+${allCards.length - 9} mais`,
                    ),
                ),
          ),
        )
      }),
    )
  }

  function renderMobileDayDetail() {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'button',
        { type: 'button', className: 'rp-mobile-back', onClick: () => setSelDay(null) },
        React.createElement('i', { className: 'ti ti-chevron-left' }),
        ' Semana',
      ),
      React.createElement(
        'div',
        { style: { flex: 1, overflowY: 'auto' } },
        React.createElement(DayPane, {
          selDay,
          setSelDay,
          events,
          sessions,
          athletes,
          dayGymSessions,
          openForm,
          toggleStatus,
          deleteEvent,
          onEditSession,
          onLogResult,
          BLOCK_C,
          evStatus,
        }),
      ),
    )
  }

  // ── Desktop render helpers ───────────────────────────────────────────────────
  function renderDesktopHeader() {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'div',
        {
          className: 'agenda-header',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: '1px solid #2a2318',
            flexWrap: 'wrap',
            flexShrink: 0,
          },
        },
        React.createElement(
          'button',
          {
            onClick: prevMonth,
            style: {
              background: 'transparent',
              border: '1px solid #2a2318',
              color: '#887060',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
            },
          },
          '‹',
        ),
        React.createElement(
          'button',
          {
            onClick: () => setShowReport(true),
            style: {
              background: 'rgba(216,168,64,.1)',
              border: '1px solid rgba(216,168,64,.3)',
              color: '#d8a840',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            },
          },
          React.createElement('i', { className: 'ti ti-file-analytics' }),
          ' Relatório',
        ),
        React.createElement(
          'span',
          {
            style: {
              fontSize: '14px',
              fontWeight: 700,
              color: '#c8b090',
              flex: '1 1 100px',
              minWidth: '80px',
              textTransform: 'uppercase',
              letterSpacing: '.03em',
            },
          },
          `${MONTH_PT[month]} ${year}`,
        ),
        React.createElement(
          'button',
          {
            onClick: nextMonth,
            style: {
              background: 'transparent',
              border: '1px solid #2a2318',
              color: '#887060',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
            },
          },
          '›',
        ),
        React.createElement(
          'button',
          {
            onClick: () => {
              const now = new Date()
              setMonth(now.getMonth())
              setYear(now.getFullYear())
              setSelDay(now.toISOString().slice(0, 10))
            },
            style: {
              background: 'transparent',
              border: '1px solid #2a2318',
              color: '#887060',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            },
          },
          'Hoje',
        ),
        React.createElement(
          'div',
          {
            className: 'agenda-stats',
            style: { display: 'flex', gap: '8px', fontSize: '11px', flexWrap: 'wrap' },
          },
          React.createElement(
            'span',
            { style: { color: 'var(--theme-accent)' } },
            [completedAulas, '/', totalAulas, ' aulas'].join(''),
          ),
          React.createElement(
            'span',
            { style: { color: '#d8a840' } },
            [completedPersonal, '/', totalPersonal, ' personal'].join(''),
          ),
          React.createElement(
            'span',
            { style: { color: '#68d8a0' } },
            [totalCompleted, '/', totalEvs, ' concluídas'].join(''),
          ),
        ),
      ),
      React.createElement(EventFilter, {
        value: filter,
        onChange: setFilter,
        axes: ['type', 'status', 'affiliate', 'athlete'],
        layout: 'row',
        locs,
        athletes,
      }),
    )
  }

  function renderDesktopBody() {
    return React.createElement(
      'div',
      { style: { display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' } },
      React.createElement(
        'div',
        {
          style: {
            flex: selDay ? '0 0 60%' : '1',
            minWidth: 0,
            overflowY: 'auto',
            borderRight: selDay ? '1px solid #2a2318' : 'none',
          },
        },
        React.createElement(
          'div',
          {
            className: 'agenda-day-hdrs',
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(7,1fr)',
              borderBottom: '1px solid #2a2318',
              position: 'sticky',
              top: 0,
              background: '#0d0b08',
              zIndex: 2,
            },
          },
          DAY_PT_TITLE.map(d =>
            React.createElement('div', { key: d, className: 'agenda-day-hdr' }, d),
          ),
        ),
        weeks.map((week, wi) =>
          React.createElement(
            'div',
            {
              key: wi,
              className: 'agenda-week-row',
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(7,1fr)',
                borderBottom: '1px solid #2a2318',
              },
            },
            week.map((day, di) =>
              day
                ? React.createElement(CellDay, {
                    key: di,
                    day,
                    year,
                    month,
                    todayISO,
                    selDay,
                    setSelDay,
                    dayGymSessions,
                    dayEvents,
                    evStatus,
                    athletes,
                    toISO2,
                  })
                : React.createElement('div', {
                    key: di,
                    style: {
                      borderRight: '1px solid #2a2318',
                      background: 'transparent',
                      minHeight: '46px',
                    },
                  }),
            ),
          ),
        ),
      ),
      React.createElement('div', {
        className: 'agenda-pane-backdrop',
        style: {
          display: selDay ? 'block' : 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,.5)',
          zIndex: 499,
        },
        onClick: () => setSelDay(null),
      }),
      selDay &&
        React.createElement(
          'div',
          {
            className: 'agenda-pane',
            style: { minWidth: 0, overflowY: 'auto', background: '#0d0b08' },
          },
          React.createElement(DayPane, {
            selDay,
            setSelDay,
            events,
            sessions,
            athletes,
            dayGymSessions,
            openForm,
            toggleStatus,
            deleteEvent,
            onEditSession,
            onLogResult,
            BLOCK_C,
            evStatus,
          }),
        ),
    )
  }

  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    isMobile ? (selDay ? null : renderMobileHeader()) : renderDesktopHeader(),
    isMobile ? (selDay ? renderMobileDayDetail() : renderMobileDayList()) : renderDesktopBody(),
    showReport &&
      React.createElement(ReportModal, { events, sessions, onClose: () => setShowReport(false) }),
    showForm &&
      React.createElement(EventFormInner, {
        showForm,
        sessions,
        athletes,
        initialData: formData,
        onSave: evs => {
          const arr = Array.isArray(evs) ? evs : [evs]
          arr.forEach(saveEvent)
          setShowForm(null)
        },
        onCancel: () => setShowForm(null),
      }),
  )
}
