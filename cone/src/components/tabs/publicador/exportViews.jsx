import React from 'react'
import { ZONES, ECOL, DSHORT, PLC } from '../../../utils/config'
import { fmtIntensity, blkMeta } from '../../../public/lib/wod.js'
import { MONTH_PT } from '../../../public/lib/week.js'
import { toISO } from '../../../utils/storage'
import { getWeeksOfMonth, exLine, complexLine, buildProgressionLines } from './exportHelpers'

// ── DailyExportView ───────────────────────────────────────────────────────────
export function DailyExportView({
  sessions,
  label,
  weekDates,
  gymName,
  fontScale,
  zoneScales,
  blockTitleScales,
  selectedDate,
  logoDataUrl,
  logoScale,
  dvColors,
}) {
  const dv = dvColors || {}
  const daysList = weekDates
    .map((date, i) => ({
      date,
      dateKey: toISO(date),
      di: i,
      sessions: sessions[toISO(date)] || [],
    }))
    .filter(d => d.sessions.length > 0)
  const day = selectedDate
    ? daysList.find(d => d.dateKey === selectedDate) || daysList[0]
    : daysList[0]
  const fs = fontScale || 1
  if (!day)
    return React.createElement(
      'div',
      { className: 'dv-wrap', style: { '--fs': fs, background: dv.bg || '#000' } },
      React.createElement('div', { className: 'dv-empty-zone' }, 'Sem sessões nesta semana'),
    )
  const s = day.sessions[0]
  const dateObj = day.date
  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()
  const dateNum = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const byZone = {}
  ZONES.forEach(z => {
    byZone[z] = []
  })
  ;(s.blocks || []).forEach(bl => {
    const z = bl.zone || 'Zone 01'
    if (!byZone[z]) byZone[z] = []
    byZone[z].push(bl)
  })
  return React.createElement(
    'div',
    { className: 'dv-wrap', style: { '--fs': fs } },
    React.createElement(
      'div',
      { className: 'dv-topbar', style: { background: dv.bg || '#0a0a0a' } },
      React.createElement(
        'div',
        { className: 'dv-top-left' },
        logoDataUrl &&
          React.createElement(
            'div',
            {
              style: {
                width: `${Math.round(64 * (logoScale || 1))}px`,
                height: `${Math.round(64 * (logoScale || 1))}px`,
                background: 'transparent',
                overflow: 'hidden',
                flexShrink: 0,
                borderRadius: '4px',
              },
            },
            React.createElement('img', {
              src: logoDataUrl,
              style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
            }),
          ),
        React.createElement(
          'span',
          { className: 'dv-gym-name', style: { color: dv.gymName || '#fff' } },
          gymName || 'Cone',
        ),
      ),
      React.createElement(
        'div',
        { className: 'dv-top-right' },
        React.createElement(
          'div',
          { className: 'dv-date-label', style: { color: dv.date || '#e87820' } },
          weekday + ' · ' + dateNum,
        ),
        s.mainTraining &&
          React.createElement(
            'div',
            { className: 'dv-main-training', style: { color: dv.mainTraining || '#888' } },
            s.mainTraining,
          ),
        label &&
          React.createElement(
            'div',
            {
              style: {
                fontSize: '13px',
                color: '#555',
                marginTop: '3px',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              },
            },
            label,
          ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dv-zones' },
      ZONES.map((zoneName, zi) => {
        const zoneBlocks = byZone[zoneName] || []
        const primaryBlock = zoneBlocks[0] || null
        const ec0 = primaryBlock ? ECOL[primaryBlock.type] || ECOL.Strength : null
        return React.createElement(
          'div',
          {
            key: zoneName,
            className: 'dv-zone',
            style: {
              '--zfs': zoneScales?.[zi] || 1,
              '--bts': blockTitleScales?.[zi] || 1,
              borderRight: `2px solid ${dv.divider || '#1a1a1a'}`,
            },
          },
          React.createElement(
            'div',
            {
              className: 'dv-zone-header',
              style: { borderBottom: `1px solid ${dv.divider || '#1e1e1e'}` },
            },
            ec0
              ? React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'div',
                    { className: 'dv-zone-type', style: { color: dv.zoneType || '#e87820' } },
                    zoneBlocks[0].label && zoneBlocks[0].label !== '-'
                      ? React.createElement(
                          'div',
                          null,
                          React.createElement('div', null, zoneBlocks[0].label),
                          React.createElement(
                            'div',
                            {
                              style: {
                                fontSize: 'calc(16px * var(--fs,1) * var(--bts,1))',
                                opacity: 0.75,
                                marginTop: '2px',
                                color: dv.zoneType || '#e87820',
                              },
                            },
                            zoneBlocks[0].type,
                          ),
                        )
                      : zoneBlocks[0].type,
                  ),
                  primaryBlock &&
                    primaryBlock.duration &&
                    React.createElement(
                      'div',
                      { className: 'dv-zone-subtitle', style: { color: dv.cap || '#e87820' } },
                      `CAP ${primaryBlock.duration}'`,
                    ),
                  primaryBlock &&
                    primaryBlock.rounds &&
                    React.createElement(
                      'div',
                      { className: 'dv-rounds-label', style: { color: dv.rounds || '#f5c842' } },
                      `${primaryBlock.rounds} ROUNDS`,
                    ),
                )
              : React.createElement(
                  'div',
                  {
                    className: 'dv-zone-type',
                    style: { color: '#1a1a1a', fontSize: 'calc(22px * var(--fs,1))' },
                  },
                  '—',
                ),
          ),
          zoneBlocks.length === 0
            ? React.createElement('div', { className: 'dv-empty-zone' }, '—')
            : React.createElement(
                'div',
                { className: 'dv-zone-body' },
                zoneBlocks.map((bl, bli) => {
                  const ec = ECOL[bl.type] || ECOL.Strength
                  return React.createElement(
                    'div',
                    { key: bl.id, className: 'dv-block-in-zone' },
                    bli > 0 &&
                      React.createElement(
                        'div',
                        {
                          className: 'dv-block-type-label',
                          style: { color: dv.blockLabel || ec.text || '#e87820' },
                        },
                        bl.type,
                        (bl.rounds || bl.duration) &&
                          React.createElement(
                            'span',
                            {
                              className: 'dv-block-cap',
                              style: { color: dv.blockLabel || ec.text || '#e87820' },
                            },
                            blkMeta(bl),
                          ),
                      ),
                    (bl.exercises || [])
                      .filter(e => e.name || e.isComplex)
                      .map(ex => {
                        if (ex.isComplex) {
                          const movs = ex.complexMovements || []
                          return React.createElement(
                            'div',
                            {
                              key: ex.id,
                              className: 'dv-ex-item',
                              style: { borderBottom: `1px solid ${dv.divider || 'transparent'}` },
                            },
                            React.createElement(
                              'div',
                              { className: 'dv-ex-name', style: { color: dv.exName || '#fff' } },
                              complexLine(ex),
                            ),
                            ...movs.map((m, mi) =>
                              React.createElement(
                                'div',
                                {
                                  key: mi,
                                  className: 'dv-ex-note',
                                  style: { color: dv.note || '#888' },
                                },
                                `· ${[m.reps, m.name].filter(Boolean).join(' ')}`,
                              ),
                            ),
                            ex.note
                              ? React.createElement(
                                  'div',
                                  {
                                    key: 'n',
                                    className: 'dv-ex-note',
                                    style: { color: dv.note || '#888' },
                                  },
                                  ex.note,
                                )
                              : null,
                          )
                        }
                        const isProg = ex.intensity?.mode === 'progression'
                        const line = exLine(ex)
                        if (isProg) {
                          const progLines = buildProgressionLines(ex)
                          if (!progLines || !progLines.length) {
                            return React.createElement(
                              'div',
                              {
                                key: ex.id,
                                className: 'dv-ex-item',
                                style: { borderBottom: `1px solid ${dv.divider || 'transparent'}` },
                              },
                              React.createElement(
                                'div',
                                { className: 'dv-ex-name', style: { color: dv.exName || '#fff' } },
                                line,
                              ),
                              ex.note &&
                                React.createElement(
                                  'div',
                                  { className: 'dv-ex-note', style: { color: dv.note || '#888' } },
                                  ex.note,
                                ),
                            )
                          }
                          return React.createElement(
                            'div',
                            {
                              key: ex.id,
                              className: 'dv-ex-item',
                              style: { borderBottom: `1px solid ${dv.divider || 'transparent'}` },
                            },
                            progLines.map((pl, si) =>
                              React.createElement(
                                'div',
                                { key: si },
                                React.createElement(
                                  'div',
                                  {
                                    className: 'dv-ex-name',
                                    style: { color: dv.exName || '#fff' },
                                  },
                                  pl.nameLine,
                                ),
                                pl.loadStr &&
                                  React.createElement(
                                    'div',
                                    {
                                      className: 'dv-ex-vol',
                                      style: {
                                        color: dv.intensity || '#f5c842',
                                        display: 'inline-block',
                                        marginTop: '2px',
                                      },
                                    },
                                    pl.loadStr,
                                  ),
                              ),
                            ),
                            ex.note &&
                              React.createElement(
                                'div',
                                { className: 'dv-ex-note', style: { color: dv.note || '#888' } },
                                ex.note,
                              ),
                          )
                        }
                        return React.createElement(
                          'div',
                          {
                            key: ex.id,
                            className: 'dv-ex-item',
                            style: { borderBottom: `1px solid ${dv.divider || 'transparent'}` },
                          },
                          React.createElement(
                            'div',
                            { className: 'dv-ex-name', style: { color: dv.exName || '#fff' } },
                            line,
                          ),
                          ex.note &&
                            React.createElement(
                              'div',
                              { className: 'dv-ex-note', style: { color: dv.note || '#888' } },
                              ex.note,
                            ),
                        )
                      }),
                    (() => {
                      const loads = [
                        ...new Set(
                          (bl.exercises || [])
                            .filter(
                              e =>
                                e.name &&
                                fmtIntensity(e.intensity) &&
                                e.intensity?.mode !== 'cardio' &&
                                e.intensity?.mode !== 'progression',
                            )
                            .map(e => fmtIntensity(e.intensity)),
                        ),
                      ]
                      return (
                        loads.length > 0 &&
                        React.createElement(
                          'div',
                          {
                            className: 'dv-block-notes',
                            style: {
                              borderTop: `1px solid ${dv.divider || '#1a1a1a'}`,
                              marginTop: '6px',
                              paddingTop: '6px',
                              color: dv.intensity || '#f5c842',
                              fontStyle: 'normal',
                              fontWeight: 700,
                            },
                          },
                          loads.join(' · '),
                        )
                      )
                    })(),
                    bl.notes &&
                      React.createElement(
                        'div',
                        {
                          className: 'dv-block-notes',
                          style: {
                            color: dv.blockNotes || '#888',
                            borderTopColor: dv.divider || '#1a1a1a',
                          },
                        },
                        bl.notes,
                      ),
                  )
                }),
              ),
        )
      }),
    ),
  )
}

// ── WeeklyExportView ──────────────────────────────────────────────────────────
export function WeeklyExportView({ sessions, label, year, month, onDayClick }) {
  const weeks = getWeeksOfMonth(year, month)
  const monthName = new Date(year, month, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })
  const today = new Date()
  return React.createElement(
    'div',
    { className: 'weekly-wrap' },
    React.createElement(
      'div',
      { className: 'wk-header' },
      React.createElement('div', { className: 'wk-title' }, 'Grade de Treinos · ', monthName),
      label && React.createElement('div', { className: 'wk-sub' }, label),
    ),
    React.createElement(
      'div',
      { className: 'wk-col-head-row' },
      React.createElement(
        'div',
        { className: 'wk-col-head', style: { color: '#333', textAlign: 'center' } },
        'WK',
      ),
      DSHORT.map(d => React.createElement('div', { key: d, className: 'wk-col-head' }, d)),
    ),
    weeks.map((week, wi) =>
      React.createElement(
        'div',
        { key: wi, className: 'wk-week-row' },
        React.createElement('div', { className: 'wk-week-num' }, wi + 1),
        week.map((date, di) => {
          const dateKey = toISO(date)
          const inMonth = date.getMonth() === month
          const daySessions = sessions[dateKey] || []
          const s = daySessions[0] || null
          const isToday = date.toDateString() === today.toDateString()
          return React.createElement(
            'div',
            {
              key: di,
              className: `wk-day-cell ${!s ? 'empty' : ''}`,
              onClick: s && onDayClick ? () => onDayClick(week, date) : undefined,
            },
            React.createElement(
              'div',
              { className: `wk-day-num${isToday ? ' today' : ''}` },
              inMonth ? date.getDate() : '',
            ),
            s &&
              React.createElement(
                'div',
                null,
                React.createElement(
                  'div',
                  { className: 'wk-day-training', style: { color: inMonth ? '#ddd' : '#444' } },
                  s.mainTraining || '—',
                ),
                React.createElement(
                  'div',
                  { className: 'wk-day-blocks' },
                  (s.blocks || [])
                    .slice(0, 4)
                    .map(bl =>
                      React.createElement(
                        'span',
                        {
                          key: bl.id,
                          className: `wg-pill ${PLC[bl.type] || 'p-st'}`,
                          style: { fontSize: '9px', padding: '1px 5px' },
                        },
                        bl.type,
                      ),
                    ),
                ),
              ),
          )
        }),
      ),
    ),
  )
}

// ── WeeklyCalendarExportView — 1920×1080 single week Mon-Fri ─────────────────
export function WeeklyCalendarExportView({
  sessions,
  label,
  month,
  gymName,
  logoDataUrl,
  logoScale,
  fontScale,
  weekDates,
  wkColors,
}) {
  const wk = wkColors || {}
  const ls = logoScale || 1
  const fs = fontScale || 1
  const today = new Date()
  const SHOW = [1, 2, 3, 4, 5]
  const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX']
  const midDate = weekDates[3]
  const weekStart = weekDates[1]
  const weekEnd = weekDates[5]
  const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const weekLabel = `${fmt(weekStart)} – ${fmt(weekEnd)}`
  return React.createElement(
    'div',
    {
      style: {
        background: wk.bg || '#000',
        color: '#fff',
        width: '1920px',
        height: '1080px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Arial Black',Arial,sans-serif",
        overflow: 'hidden',
        '--fs': fs,
      },
    },
    React.createElement(
      'div',
      {
        style: {
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 40px',
          borderBottom: '2px solid #1a1a1a',
          flexShrink: 0,
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '18px' } },
        logoDataUrl &&
          React.createElement(
            'div',
            {
              style: {
                width: `${Math.round(56 * ls)}px`,
                height: `${Math.round(56 * ls)}px`,
                background: 'transparent',
                overflow: 'hidden',
                borderRadius: '4px',
                flexShrink: 0,
              },
            },
            React.createElement('img', {
              src: logoDataUrl,
              style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
            }),
          ),
        React.createElement(
          'span',
          {
            style: {
              fontSize: `calc(32px * var(--fs,1))`,
              fontWeight: 900,
              color: wk.gymName || '#fff',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            },
          },
          gymName || 'Cone',
        ),
      ),
      React.createElement(
        'div',
        { style: { textAlign: 'right' } },
        React.createElement(
          'div',
          {
            style: {
              fontSize: `calc(32px * var(--fs,1))`,
              fontWeight: 900,
              color: wk.header || '#e87820',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              lineHeight: 1,
            },
          },
          weekLabel,
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: `calc(18px * var(--fs,1))`,
              color: wk.dateNum || '#666',
              marginTop: '4px',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
            },
          },
          MONTH_PT[midDate.getMonth()] + ' ' + midDate.getFullYear(),
        ),
        label &&
          React.createElement(
            'div',
            {
              style: {
                fontSize: `calc(14px * var(--fs,1))`,
                color: '#444',
                marginTop: '2px',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
              },
            },
            label,
          ),
      ),
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(5,1fr)',
          background: '#0d0d0d',
          borderBottom: '1px solid #1a1a1a',
          flexShrink: 0,
        },
      },
      SHOW.map((dayIdx, ci) => {
        const date = weekDates[dayIdx]
        const dateNum = date.getDate()
        const inMonth = date.getMonth() === month
        const isToday = date.toDateString() === today.toDateString()
        return React.createElement(
          'div',
          {
            key: ci,
            style: {
              padding: '10px 20px',
              borderRight: ci < 4 ? `1px solid ${wk.divider || '#1a1a1a'}` : 'none',
              display: 'flex',
              alignItems: 'baseline',
              gap: '10px',
            },
          },
          React.createElement(
            'span',
            {
              style: {
                fontSize: `calc(16px * var(--fs,1))`,
                fontWeight: 900,
                color: wk.header || '#e87820',
                textTransform: 'uppercase',
                letterSpacing: '.1em',
              },
            },
            DAY_LABELS[ci],
          ),
          React.createElement(
            'span',
            {
              style: {
                fontSize: `calc(20px * var(--fs,1))`,
                fontWeight: 900,
                color: isToday ? wk.header || '#e87820' : inMonth ? wk.dateNum || '#555' : '#333',
              },
            },
            inMonth ? dateNum : '',
          ),
        )
      }),
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(5,1fr)',
          flex: 1,
          overflow: 'hidden',
        },
      },
      SHOW.map((dayIdx, ci) => {
        const date = weekDates[dayIdx]
        const dateKey = toISO(date)
        const inMonth = date.getMonth() === month
        const daySessions = sessions[dateKey] || []
        const s = daySessions[0] || null
        return React.createElement(
          'div',
          {
            key: ci,
            style: {
              borderRight: ci < 4 ? '1px solid #1a1a1a' : 'none',
              padding: '14px 20px',
              background: s && inMonth ? '#060606' : '#000',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
          s && inMonth
            ? React.createElement(
                'div',
                {
                  style: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      fontSize: `calc(14px * var(--fs,1))`,
                      fontWeight: 900,
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      lineHeight: 1.2,
                      marginBottom: '10px',
                      flexShrink: 0,
                      borderBottom: '1px solid #1a1a1a',
                      paddingBottom: '8px',
                    },
                  },
                  s.mainTraining || '—',
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      flex: 1,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    },
                  },
                  (s.blocks || []).map(bl => {
                    const ec = ECOL[bl.type] || ECOL['Força']
                    const blCol = wk.blockType || ec.text
                    const meta = blkMeta(bl)
                    const exs = bl.exercises?.filter(e => e.name || e.isComplex) || []
                    return React.createElement(
                      'div',
                      {
                        key: bl.id,
                        style: {
                          borderLeft: `2px solid ${blCol}`,
                          paddingLeft: '8px',
                          flexShrink: 0,
                        },
                      },
                      React.createElement(
                        'div',
                        {
                          style: {
                            fontSize: `calc(12px * var(--fs,1))`,
                            fontWeight: 900,
                            color: blCol,
                            textTransform: 'uppercase',
                            letterSpacing: '.07em',
                            lineHeight: 1.2,
                          },
                        },
                        bl.type + (meta ? ` · ${meta}` : ''),
                      ),
                      exs
                        .slice(0, 4)
                        .map(ex =>
                          React.createElement(
                            'div',
                            { key: ex.id, style: { marginTop: '3px' } },
                            React.createElement(
                              'div',
                              {
                                style: {
                                  fontSize: `calc(13px * var(--fs,1))`,
                                  fontWeight: 900,
                                  color: wk.exName || '#fff',
                                  textTransform: 'uppercase',
                                  letterSpacing: '.04em',
                                  lineHeight: 1.15,
                                },
                              },
                              ex.isComplex ? complexLine(ex) : exLine(ex),
                            ),
                          ),
                        ),
                      bl.notes &&
                        React.createElement(
                          'div',
                          {
                            style: {
                              fontSize: `calc(10px * var(--fs,1))`,
                              color: '#555',
                              marginTop: '3px',
                              fontStyle: 'italic',
                              fontWeight: 400,
                              lineHeight: 1.4,
                            },
                          },
                          bl.notes,
                        ),
                    )
                  }),
                ),
              )
            : React.createElement(
                'div',
                {
                  style: {
                    color: '#1a1a1a',
                    fontSize: `calc(12px * var(--fs,1))`,
                    textTransform: 'uppercase',
                    letterSpacing: '.1em',
                    marginTop: '8px',
                  },
                },
                '—',
              ),
        )
      }),
    ),
  )
}

// ── CalendarExportView — 1920×1080 monthly calendar ──────────────────────────
export function CalendarExportView({
  sessions,
  label,
  year,
  month,
  gymName,
  logoDataUrl,
  logoScale,
  fontScale,
  wkColors,
}) {
  const wk = wkColors || {}
  const weeks = getWeeksOfMonth(year, month)
  const monthName = MONTH_PT[month]
  const today = new Date()
  const ls = logoScale || 1
  const SHOW_DAYS = [1, 2, 3, 4, 5]
  const CAL_DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX']
  const fs = fontScale || 1
  return React.createElement(
    'div',
    {
      style: {
        background: wk.bg || '#000',
        color: '#fff',
        width: '1920px',
        height: '1080px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Arial Black',Arial,sans-serif",
        overflow: 'hidden',
        '--fs': fs,
      },
    },
    React.createElement(
      'div',
      {
        style: {
          background: wk.bg || '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 40px',
          borderBottom: `2px solid ${wk.divider || '#1a1a1a'}`,
          flexShrink: 0,
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '18px' } },
        logoDataUrl &&
          React.createElement(
            'div',
            {
              style: {
                width: `${Math.round(56 * ls)}px`,
                height: `${Math.round(56 * ls)}px`,
                background: 'transparent',
                overflow: 'hidden',
                borderRadius: '4px',
                flexShrink: 0,
              },
            },
            React.createElement('img', {
              src: logoDataUrl,
              style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
            }),
          ),
        React.createElement(
          'span',
          {
            style: {
              fontSize: `calc(32px * var(--fs,1))`,
              fontWeight: 900,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            },
          },
          gymName || 'Cone',
        ),
      ),
      React.createElement(
        'div',
        { style: { textAlign: 'right' } },
        React.createElement(
          'div',
          {
            style: {
              fontSize: `calc(36px * var(--fs,1))`,
              fontWeight: 900,
              color: wk.header || '#e87820',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              lineHeight: 1,
            },
          },
          monthName + ' ' + year,
        ),
        label &&
          React.createElement(
            'div',
            {
              style: {
                fontSize: `calc(16px * var(--fs,1))`,
                color: '#666',
                marginTop: '4px',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
              },
            },
            label,
          ),
      ),
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(5,1fr)',
          background: '#0d0d0d',
          borderBottom: '1px solid #1a1a1a',
          flexShrink: 0,
        },
      },
      CAL_DAY_LABELS.map((d, i) =>
        React.createElement(
          'div',
          {
            key: d,
            style: {
              padding: '10px 16px',
              fontSize: `calc(16px * var(--fs,1))`,
              fontWeight: 900,
              color: wk.header || '#e87820',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              borderRight: i < 4 ? `1px solid ${wk.divider || '#1a1a1a'}` : 'none',
            },
          },
          d,
        ),
      ),
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' } },
      weeks.map((week, wi) => {
        const weekdays = SHOW_DAYS.map(di => ({ date: week[di], di }))
        return React.createElement(
          'div',
          {
            key: wi,
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(5,1fr)',
              flex: 1,
              borderBottom: wi < weeks.length - 1 ? '1px solid #1a1a1a' : 'none',
            },
          },
          weekdays.map(({ date, di }, ci) => {
            const dateKey = toISO(date)
            const inMonth = date.getMonth() === month
            const s = (sessions[dateKey] || [])[0] || null
            const isToday = date.toDateString() === today.toDateString()
            return React.createElement(
              'div',
              {
                key: di,
                style: {
                  borderRight: ci < 4 ? `1px solid ${wk.divider || '#1a1a1a'}` : 'none',
                  padding: '10px 14px',
                  background: inMonth ? (s ? '#080808' : '#000') : '#030303',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                },
              },
              React.createElement(
                'div',
                {
                  style: {
                    fontSize: `calc(22px * var(--fs,1))`,
                    fontWeight: 900,
                    color: isToday
                      ? wk.header || '#e87820'
                      : inMonth
                        ? wk.dateNum || '#666'
                        : '#222',
                    marginBottom: '6px',
                    lineHeight: 1,
                    flexShrink: 0,
                  },
                },
                inMonth ? date.getDate() : '',
              ),
              s &&
                inMonth &&
                React.createElement(
                  'div',
                  {
                    style: {
                      flex: 1,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: `calc(15px * var(--fs,1))`,
                        fontWeight: 900,
                        color: wk.mainTraining || '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                        lineHeight: 1.2,
                        marginBottom: '4px',
                      },
                    },
                    s.mainTraining || '—',
                  ),
                  (s.blocks || []).map(bl => {
                    const ec = ECOL[bl.type] || ECOL['Força']
                    const exNames = bl.exercises
                      ?.filter(e => e.name)
                      .slice(0, 4)
                      .map(e => e.name)
                      .join(', ')
                    return React.createElement(
                      'div',
                      {
                        key: bl.id,
                        style: {
                          borderLeft: `2px solid ${ec.text}`,
                          paddingLeft: '6px',
                          marginBottom: '3px',
                        },
                      },
                      React.createElement(
                        'div',
                        {
                          style: {
                            fontSize: `calc(12px * var(--fs,1))`,
                            fontWeight: 900,
                            color: wk.blockType || ec.text,
                            textTransform: 'uppercase',
                            letterSpacing: '.06em',
                            lineHeight: 1.2,
                          },
                        },
                        bl.type,
                      ),
                      exNames &&
                        React.createElement(
                          'div',
                          {
                            style: {
                              fontSize: `calc(11px * var(--fs,1))`,
                              color: wk.exName || '#666',
                              lineHeight: 1.3,
                              marginTop: '1px',
                            },
                          },
                          exNames,
                        ),
                    )
                  }),
                ),
            )
          }),
        )
      }),
    ),
  )
}
