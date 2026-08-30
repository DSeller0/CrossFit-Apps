import React from 'react'
import { loadLocations } from '../../../../utils/storage'
import { sessName } from '../../../../public/lib/sessions.js'

// ── DayPane — the selected day: its Criador session, then its events ──────
// Hoisted out of AgendaView's render body (#59/plans/81 C5·a step a, finding 4).
// 725 lines defined inside another component's render — same remount hazard as
// CellDay, and the bigger of the two.
//
// PURE MOVE: body byte-identical (dedented one level), closure variables now props.

export default function DayPane({
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
}) {
  if (!selDay)
    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#3a3028',
          fontSize: '12px',
          fontStyle: 'italic',
          padding: '40px 0',
        },
      },
      'Clique num dia para ver detalhes',
    )
  const iso = selDay
  const d = new Date(iso + 'T12:00:00')
  const dateLabel = d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
  const gymSessions = dayGymSessions(iso)
  const evs = (events[iso] || []).sort((a, b) => a.time.localeCompare(b.time))
  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
    React.createElement(
      'div',
      { style: { padding: '10px 14px', borderBottom: '1px solid #2a2318', flexShrink: 0 } },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          },
        },
        React.createElement(
          'span',
          {
            style: {
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--theme-accent)',
              textTransform: 'capitalize',
            },
          },
          dateLabel,
        ),
        React.createElement(
          'button',
          {
            onClick: () => setSelDay(null),
            style: {
              background: 'transparent',
              border: '1px solid #2a2318',
              color: '#887060',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              lineHeight: 1,
            },
          },
          '✕',
        ),
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
        React.createElement(
          'button',
          {
            onClick: () => openForm('aula', iso),
            style: {
              background: 'rgba(74,200,192,.08)',
              border: '1px solid rgba(74,200,192,.25)',
              color: 'var(--theme-accent)',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            },
          },
          React.createElement('i', { className: 'ti ti-plus', 'aria-hidden': 'true' }),
          'Aula',
        ),
        React.createElement(
          'button',
          {
            onClick: () => openForm('personal', iso),
            style: {
              background: 'rgba(216,168,64,.08)',
              border: '1px solid rgba(216,168,64,.25)',
              color: '#d8a840',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            },
          },
          React.createElement('i', { className: 'ti ti-plus', 'aria-hidden': 'true' }),
          'Personal',
        ),
        onEditSession &&
          React.createElement(
            'button',
            {
              onClick: () => onEditSession({ _newForDate: iso }),
              style: {
                background: 'rgba(104,216,160,.08)',
                border: '1px solid rgba(104,216,160,.25)',
                color: '#68d8a0',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              },
            },
            React.createElement('i', { className: 'ti ti-calendar-plus', 'aria-hidden': 'true' }),
            'Sessão',
          ),
      ),
    ),
    React.createElement(
      'div',
      { style: { flex: 1, overflowY: 'auto', padding: '10px 14px' } },
      gymSessions.length > 0 &&
        React.createElement(
          'div',
          { style: { marginBottom: '12px' } },
          React.createElement(
            'div',
            {
              style: {
                fontSize: '10px',
                color: '#554a3a',
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                marginBottom: '6px',
              },
            },
            'Sessão do dia',
          ),
          gymSessions.map((s, si) =>
            React.createElement(
              'div',
              {
                key: si,
                style: {
                  background: '#0d0b08',
                  border: '1px solid #2a2318',
                  borderTop: '2px solid var(--theme-accent)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  marginBottom: '6px',
                },
              },
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '5px',
                  },
                },
                React.createElement(
                  'span',
                  { style: { fontSize: '12px', fontWeight: 700, color: '#c8b090' } },
                  sessName(s, iso),
                ),
                React.createElement(
                  'div',
                  { style: { display: 'flex', gap: '4px' } },
                  onEditSession &&
                    React.createElement(
                      'button',
                      {
                        onClick: e => {
                          e.stopPropagation()
                          onEditSession(s)
                        },
                        style: {
                          background: 'transparent',
                          border: '1px solid #2a2318',
                          color: '#554a3a',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: 700,
                        },
                      },
                      'Editar',
                    ),
                ),
              ),
              React.createElement(
                'div',
                { style: { display: 'flex', gap: '3px', flexWrap: 'wrap' } },
                (s.blocks || []).map((bl, bi) => {
                  const lbl = bl.label && bl.label !== '-' ? bl.label : bl.type
                  return React.createElement(
                    'span',
                    {
                      key: bi,
                      style: {
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: '2px',
                        background: (BLOCK_C[lbl] || BLOCK_C[bl.type] || '#555') + '22',
                        color: BLOCK_C[lbl] || BLOCK_C[bl.type] || '#aaa',
                        border: `1px solid ${BLOCK_C[lbl] || BLOCK_C[bl.type] || '#555'}44`,
                      },
                    },
                    lbl,
                  )
                }),
              ),
            ),
          ),
        ),
      evs.length === 0 &&
        gymSessions.length === 0 &&
        React.createElement(
          'div',
          {
            style: {
              color: '#3a3028',
              fontSize: '12px',
              fontStyle: 'italic',
              padding: '20px 0 0',
            },
          },
          'Sem eventos. Use os botões acima para adicionar.',
        ),
      evs.length > 0 &&
        React.createElement(
          'div',
          { style: { marginBottom: '6px' } },
          React.createElement(
            'div',
            {
              style: {
                fontSize: '10px',
                color: '#554a3a',
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                marginBottom: '8px',
              },
            },
            'Agenda',
          ),
          evs.map(ev => {
            const isPers = ev.type === 'personal'
            const done = evStatus(ev) === 'completed'
            const borderCol = isPers ? '#d8a840' : 'var(--theme-accent)'
            const athList = (ev.athleteIds || [])
              .map(id => athletes.find(a => a.id === id))
              .filter(Boolean)
            const linkedSession = ev.sessionId
              ? (sessions[iso] || []).find(s => s.id === ev.sessionId)
              : null
            const locDisplay = ev.local && ev.local !== '__outro__' ? ev.local : ev.localText || ''
            const svcLoc = ev.locationId ? loadLocations().find(l => l.id === ev.locationId) : null
            return React.createElement(
              'div',
              { key: ev.id, style: { display: 'flex', gap: '8px', marginBottom: '12px' } },
              React.createElement(
                'div',
                {
                  style: {
                    minWidth: '38px',
                    flexShrink: 0,
                    paddingTop: '10px',
                    textAlign: 'center',
                  },
                },
                React.createElement(
                  'div',
                  { style: { fontSize: '11px', fontWeight: 700, color: '#887060' } },
                  ev.time,
                ),
                React.createElement('div', {
                  style: {
                    width: '1px',
                    background: '#2a2318',
                    margin: '4px auto 0',
                    height: 'calc(100% - 20px)',
                    minHeight: '20px',
                  },
                }),
              ),
              React.createElement(
                'div',
                {
                  style: {
                    flex: 1,
                    background: '#0d0b08',
                    border: '1px solid #2a2318',
                    borderTop: `2px solid ${borderCol}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    opacity: done ? 0.85 : 1,
                  },
                },
                /* Tappable info area → opens edit form */
                React.createElement(
                  'div',
                  {
                    onClick: () => openForm(ev.type, iso, ev),
                    style: { padding: '10px 12px', cursor: 'pointer' },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
                        marginBottom: '3px',
                      },
                    },
                    done &&
                      React.createElement('i', {
                        className: 'ti ti-circle-check',
                        style: { fontSize: '12px', color: '#68d8a0' },
                        'aria-hidden': 'true',
                      }),
                    React.createElement(
                      'span',
                      {
                        style: {
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isPers ? '#d8a840' : '#c8b090',
                        },
                      },
                      ev.label,
                    ),
                    React.createElement(
                      'span',
                      {
                        style: {
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          background: isPers ? 'rgba(216,168,64,.12)' : 'rgba(74,200,192,.1)',
                          color: isPers ? '#d8a840' : 'var(--theme-accent)',
                        },
                      },
                      isPers ? 'Personal' : 'Aula',
                    ),
                    ev.recurrenceGroup &&
                      React.createElement('i', {
                        className: 'ti ti-refresh',
                        style: { fontSize: '10px', color: '#554a3a' },
                        title: 'Evento recorrente',
                      }),
                    svcLoc &&
                      React.createElement(
                        'span',
                        {
                          style: {
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: (svcLoc.color || '#555') + '22',
                            color: svcLoc.color || '#aaa',
                            border: `1px solid ${svcLoc.color || '#555'}44`,
                          },
                        },
                        svcLoc.name,
                      ),
                  ),
                  React.createElement(
                    'div',
                    { style: { fontSize: '11px', color: '#554a3a' } },
                    `${ev.time} · ${ev.durationMin}min`,
                  ),
                  athList.length > 0 &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          gap: '5px',
                          flexWrap: 'wrap',
                          marginTop: '5px',
                        },
                      },
                      athList.map((a, ai) =>
                        React.createElement(
                          'span',
                          {
                            key: ai,
                            style: {
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '11px',
                              color: '#a89880',
                            },
                          },
                          React.createElement('span', {
                            style: {
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: a.color,
                              display: 'inline-block',
                            },
                          }),
                          a.name,
                        ),
                      ),
                    ),
                  locDisplay &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          fontSize: '10px',
                          color: '#554a3a',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        },
                      },
                      React.createElement('i', {
                        className: 'ti ti-map-pin',
                        style: { fontSize: '10px' },
                      }),
                      locDisplay,
                    ),
                  linkedSession &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          gap: '2px',
                          flexWrap: 'wrap',
                          marginTop: '5px',
                        },
                      },
                      (linkedSession.blocks || []).map((bl, bi) => {
                        const lbl = bl.label && bl.label !== '-' ? bl.label : bl.type
                        return React.createElement(
                          'span',
                          {
                            key: bi,
                            style: {
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 4px',
                              borderRadius: '2px',
                              background: (BLOCK_C[lbl] || BLOCK_C[bl.type] || '#555') + '22',
                              color: BLOCK_C[lbl] || BLOCK_C[bl.type] || '#aaa',
                              border: `1px solid ${BLOCK_C[lbl] || BLOCK_C[bl.type] || '#555'}44`,
                            },
                          },
                          lbl,
                        )
                      }),
                    ),
                  ev.notes &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          fontSize: '11px',
                          color: '#554a3a',
                          marginTop: '5px',
                          fontStyle: 'italic',
                        },
                      },
                      ev.notes,
                    ),
                ),
                /* Action bar — larger tap targets */
                React.createElement(
                  'div',
                  {
                    style: { display: 'flex', gap: 0, borderTop: '1px solid #1a1a12' },
                    onClick: e => e.stopPropagation(),
                  },
                  React.createElement(
                    'button',
                    {
                      onClick: () => toggleStatus(iso, ev.id),
                      title: done ? 'Marcar como agendado' : 'Marcar como concluído',
                      style: {
                        flex: 1,
                        background: done ? 'rgba(104,216,160,.07)' : 'transparent',
                        border: 'none',
                        borderRight: '1px solid #1a1a12',
                        color: done ? '#68d8a0' : '#554a3a',
                        padding: '9px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      },
                    },
                    React.createElement('i', {
                      className: done ? 'ti ti-circle-check' : 'ti ti-circle',
                      style: { fontSize: '14px' },
                    }),
                    done ? 'Feito' : 'Ag.',
                  ),
                  onLogResult &&
                    isPers &&
                    React.createElement(
                      'button',
                      {
                        onClick: () =>
                          onLogResult({ athleteId: ev.athleteIds[0] || null, date: iso }),
                        title: 'Lançar resultado',
                        style: {
                          background: 'transparent',
                          border: 'none',
                          borderRight: '1px solid #1a1a12',
                          color: 'var(--theme-accent)',
                          padding: '9px 14px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      },
                      React.createElement('i', { className: 'ti ti-clipboard-list' }),
                    ),
                  onEditSession &&
                    React.createElement(
                      'button',
                      {
                        onClick: () => onEditSession(linkedSession || { _newForDate: iso }),
                        title: linkedSession
                          ? 'Editar sessão vinculada'
                          : 'Criar sessão para este dia',
                        style: {
                          background: 'transparent',
                          border: 'none',
                          borderRight: '1px solid #1a1a12',
                          color: linkedSession ? '#887060' : '#68d8a0',
                          padding: '9px 14px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      },
                      React.createElement('i', {
                        className: linkedSession ? 'ti ti-calendar-event' : 'ti ti-calendar-plus',
                      }),
                    ),
                  React.createElement(
                    'button',
                    {
                      onClick: () => {
                        if (window.confirm('Remover este evento?')) deleteEvent(iso, ev.id)
                      },
                      title: 'Remover',
                      style: {
                        background: 'transparent',
                        border: 'none',
                        color: '#5a3030',
                        padding: '9px 14px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    },
                    React.createElement('i', { className: 'ti ti-trash' }),
                  ),
                ),
              ),
            )
          }),
          React.createElement(
            'div',
            {
              style: {
                borderTop: '1px solid #1e1e1e',
                marginTop: '10px',
                paddingTop: '10px',
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
              },
            },
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => openForm('aula', iso),
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '8px 14px',
                  background: 'rgba(74,200,192,.06)',
                  border: '1px solid rgba(74,200,192,.2)',
                  color: 'var(--theme-accent)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                },
              },
              React.createElement('i', { className: 'ti ti-plus' }),
              'Aula',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => openForm('personal', iso),
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '8px 14px',
                  background: 'rgba(216,168,64,.06)',
                  border: '1px solid rgba(216,168,64,.2)',
                  color: '#d8a840',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                },
              },
              React.createElement('i', { className: 'ti ti-plus' }),
              'Personal',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                title: 'Copiar último evento',
                onClick: () => {
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
                    time: last.time,
                    durationMin: last.durationMin,
                    label: last.label,
                    locationId: last.locationId,
                    athleteIds: last.athleteIds || [],
                    notes: last.notes || '',
                    local: last.local || '',
                    localText: last.localText || '',
                  })
                },
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid #2a2318',
                  color: '#887060',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                },
              },
              React.createElement('i', { className: 'ti ti-copy' }),
              'Copiar último',
            ),
          ),
        ),
    ),
  )
}
