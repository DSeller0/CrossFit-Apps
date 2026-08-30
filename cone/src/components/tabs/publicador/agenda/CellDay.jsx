import React from 'react'
import { sessName } from '../../../../public/lib/sessions.js'

// ── CellDay — one day cell of the month grid ────────────────────────
// Hoisted out of AgendaView's render body (#59/plans/81 C5·a step a, finding 4).
// Defined inline it was a NEW component type on every parent render, so React
// unmounted and remounted the whole subtree each time. events.jsx:9 already records
// what that costs ("EventFormInner — standalone so inputs don't lose focus").
// It holds no state today, which is the only reason lint stayed green — this move is
// what makes adding any safe.
//
// PURE MOVE: the body is byte-identical to what it was inline (dedented one level);
// the closure variables it used now arrive as props.

export default function CellDay({
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
}) {
  const iso = toISO2(year, month, day)
  const isToday = iso === todayISO
  const isPast = iso < todayISO
  const isSelected = selDay === iso
  const gymSessions = dayGymSessions(iso)
  const evs = dayEvents(iso)
  const allCards = [
    ...gymSessions.map(s => ({ kind: 'session', data: s })),
    ...evs.map(ev => ({ kind: 'event', data: ev })),
  ]
  return React.createElement(
    'div',
    {
      onClick: () => setSelDay(isSelected ? null : iso),
      className: 'agenda-cell',
      style: {
        borderRight: '1px solid #2a2318',
        padding: '5px',
        cursor: 'pointer',
        background: isSelected
          ? 'rgba(74,200,192,.07)'
          : isToday
            ? 'rgba(74,200,192,.04)'
            : 'transparent',
        borderBottom: 'none',
        transition: 'background .1s',
      },
    },
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '3px',
        },
      },
      isToday
        ? React.createElement(
            'span',
            {
              style: {
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'var(--theme-accent)',
                color: 'var(--theme-accent-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 900,
              },
            },
            day,
          )
        : React.createElement(
            'span',
            {
              style: {
                fontSize: '11px',
                color: isPast ? '#554a3a' : '#c8b090',
                fontWeight: isToday ? 700 : 400,
              },
            },
            day,
          ),
      allCards.length > 0 &&
        React.createElement(
          'span',
          { style: { fontSize: '9px', color: '#554a3a' } },
          allCards.length,
        ),
    ),
    allCards.slice(0, 3).map((card, ci) => {
      if (card.kind === 'session') {
        const s = card.data
        return React.createElement(
          'div',
          {
            key: 's' + ci,
            className: 'cell-card',
            style: {
              marginBottom: '2px',
              padding: '2px 4px',
              borderRadius: '3px',
              borderLeft: '2px solid var(--theme-accent)',
              background: 'rgba(74,200,192,.06)',
            },
          },
          React.createElement(
            'div',
            {
              className: 'cell-card-full',
              style: {
                fontSize: '9px',
                fontWeight: 700,
                color: 'var(--theme-accent)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                alignItems: 'center',
              },
            },
            React.createElement('i', {
              className: 'ti ti-calendar-event',
              style: { fontSize: '8px', marginRight: '2px' },
              'aria-hidden': 'true',
            }),
            sessName(s, iso),
          ),
          React.createElement(
            'div',
            { className: 'cell-card-mini' },
            React.createElement('span', {
              style: {
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'var(--theme-accent)',
                display: 'inline-block',
              },
            }),
          ),
        )
      }
      const ev = card.data
      const isPers = ev.type === 'personal'
      const done = evStatus(ev) === 'completed'
      const borderCol = isPers ? '#d8a840' : 'var(--theme-accent)'
      const ath =
        isPers && ev.athleteIds?.[0] ? athletes.find(a => a.id === ev.athleteIds[0]) : null
      return React.createElement(
        'div',
        {
          key: 'e' + ci,
          className: 'cell-card',
          style: {
            marginBottom: '2px',
            padding: '2px 4px',
            borderRadius: '3px',
            borderLeft: `2px solid ${borderCol}`,
            background: isPers ? 'rgba(216,168,64,.07)' : 'rgba(74,200,192,.06)',
            opacity: done ? 0.75 : 1,
          },
        },
        React.createElement(
          'div',
          { className: 'cell-card-full', style: { alignItems: 'center', gap: '3px' } },
          done &&
            React.createElement('span', { style: { fontSize: '8px', color: '#68d8a0' } }, '✓'),
          React.createElement('span', { style: { fontSize: '9px', color: '#888' } }, ev.time),
          React.createElement(
            'span',
            {
              style: {
                fontSize: '9px',
                fontWeight: 700,
                color: isPers ? '#d8a840' : '#c8b090',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '70px',
              },
            },
            ath
              ? React.createElement(
                  'span',
                  null,
                  React.createElement('span', {
                    style: {
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: ath.color,
                      display: 'inline-block',
                      marginRight: '2px',
                    },
                  }),
                  ev.label,
                )
              : ev.label,
          ),
        ),
        React.createElement(
          'div',
          { className: 'cell-card-mini', style: { alignItems: 'center', gap: '2px' } },
          done &&
            React.createElement('span', { style: { fontSize: '8px', color: '#68d8a0' } }, '✓'),
          React.createElement('span', { style: { fontSize: '9px', color: '#666' } }, ev.time),
          React.createElement('span', {
            style: {
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: ath ? ath.color : borderCol,
              display: 'inline-block',
              flexShrink: 0,
            },
          }),
        ),
      )
    }),
    allCards.length > 3 &&
      React.createElement(
        'div',
        { style: { fontSize: '8px', color: '#554a3a', paddingLeft: '4px' } },
        `+${allCards.length - 3} mais`,
      ),
  )
}
