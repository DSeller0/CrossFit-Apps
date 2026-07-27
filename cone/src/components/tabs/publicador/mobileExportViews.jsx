import React from 'react'
import { APP_CONFIG, GF } from '../../../utils/config'
import { fmtIntensity, blkMeta } from '../../../public/lib/wod.js'
import { DAY_PT, MONTH_PT } from '../../../public/lib/week.js'
import { toISO } from '../../../utils/storage'
import {
  mfs,
  exLine,
  complexLine,
  buildProgressionLines,
  buildMobileSession,
} from './exportHelpers'

// ── MobileBlockA ──────────────────────────────────────────────────────────────
function MobileBlockA({ bl, fs, bg, colors }) {
  const col = colors || {}
  const f = fs || 1
  const pad = Math.round(20 * f)
  const _lbl = bl.label && bl.label !== '-' ? bl.label : null
  const _typ = bl.type && bl.type !== '-' ? bl.type : null
  const title = _lbl && _typ && _lbl !== _typ ? `${_lbl} · ${_typ}` : _lbl || _typ || ''
  const meta = blkMeta(bl)
  const blockBg = bg || APP_CONFIG.mobileEaglesBg || '#000'
  return React.createElement(
    'div',
    { style: { borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
    React.createElement(
      'div',
      {
        style: {
          background: col.blockHdr || 'rgba(0,184,212,0.12)',
          padding: `${Math.round(10 * f)}px ${pad}px ${Math.round(6 * f)}px`,
          borderTop: '2px solid #00b8d4',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            fontSize: mfs(18, f),
            fontWeight: 900,
            color: col.blockType || '#00b8d4',
            textTransform: 'uppercase',
            letterSpacing: '.07em',
            fontFamily: GF(),
            lineHeight: 1.2,
          },
        },
        title,
      ),
      meta &&
        React.createElement(
          'div',
          {
            style: {
              fontSize: mfs(12, f),
              color: col.blockMeta || '#00b8d4',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginTop: mfs(2, f),
              fontFamily: GF(),
            },
          },
          meta,
        ),
    ),
    React.createElement(
      'div',
      {
        style: {
          background: blockBg,
          padding: `${Math.round(4 * f)}px ${pad}px ${Math.round(14 * f)}px`,
        },
      },
      (bl.exercises || [])
        .filter(e => e.name || e.isComplex)
        .map(ex => {
          if (ex.isComplex) {
            const movs = ex.complexMovements || []
            return React.createElement(
              'div',
              {
                key: ex.id,
                style: {
                  padding: `${Math.round(6 * f)}px 0`,
                  borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}`,
                },
              },
              React.createElement(
                'div',
                {
                  style: {
                    fontSize: mfs(17, f),
                    fontWeight: 900,
                    color: col.exName || '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                    fontFamily: GF(),
                    lineHeight: 1.2,
                  },
                },
                complexLine(ex),
              ),
              ...movs.map((m, mi) =>
                React.createElement(
                  'div',
                  {
                    key: mi,
                    style: {
                      fontSize: mfs(13, f),
                      color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa',
                      fontFamily: GF(),
                    },
                  },
                  `· ${[m.reps, m.name].filter(Boolean).join(' ')}`,
                ),
              ),
              ex.note
                ? React.createElement(
                    'div',
                    {
                      key: 'n',
                      style: {
                        fontSize: mfs(12, f),
                        color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa',
                        fontStyle: 'italic',
                        marginTop: mfs(2, f),
                      },
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
            if (!progLines || !progLines.length)
              return React.createElement(
                'div',
                {
                  key: ex.id,
                  style: {
                    padding: `${Math.round(6 * f)}px 0`,
                    borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}`,
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      fontSize: mfs(17, f),
                      fontWeight: 900,
                      color: col.exName || '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      fontFamily: GF(),
                      lineHeight: 1.2,
                    },
                  },
                  line,
                ),
              )
            return React.createElement(
              'div',
              {
                key: ex.id,
                style: {
                  padding: `${Math.round(6 * f)}px 0`,
                  borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}`,
                },
              },
              progLines.map((pl, si) =>
                React.createElement(
                  'div',
                  { key: si, style: { marginTop: si > 0 ? mfs(4, f) : '0' } },
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: mfs(17, f),
                        fontWeight: 900,
                        color: col.exName || '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                        fontFamily: GF(),
                        lineHeight: 1.2,
                      },
                    },
                    pl.nameLine,
                  ),
                  pl.loadStr &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'inline-block',
                          fontSize: mfs(13, f),
                          fontWeight: 700,
                          color: '#ffd700',
                          background: 'rgba(0,0,0,0.35)',
                          border: '1px solid rgba(255,215,0,0.25)',
                          borderRadius: '3px',
                          padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`,
                          marginTop: mfs(3, f),
                          fontFamily: GF(),
                        },
                      },
                      pl.loadStr,
                    ),
                ),
              ),
              ex.note &&
                React.createElement(
                  'div',
                  {
                    style: {
                      fontSize: mfs(12, f),
                      color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa',
                      fontStyle: 'italic',
                      marginTop: mfs(2, f),
                    },
                  },
                  ex.note,
                ),
            )
          }
          const ins = ex.intensity?.mode !== 'cardio' ? fmtIntensity(ex.intensity) : null
          return React.createElement(
            'div',
            {
              key: ex.id,
              style: {
                padding: `${Math.round(6 * f)}px 0`,
                borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}`,
              },
            },
            React.createElement(
              'div',
              {
                style: {
                  fontSize: mfs(17, f),
                  fontWeight: 900,
                  color: col.exName || '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  fontFamily: GF(),
                  lineHeight: 1.2,
                },
              },
              line,
            ),
            ins &&
              React.createElement(
                'div',
                {
                  style: {
                    display: 'inline-block',
                    fontSize: mfs(13, f),
                    fontWeight: 700,
                    color: '#ffd700',
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,215,0,0.25)',
                    borderRadius: '3px',
                    padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`,
                    marginTop: mfs(3, f),
                    fontFamily: GF(),
                  },
                },
                ins,
              ),
            ex.note &&
              React.createElement(
                'div',
                {
                  style: {
                    fontSize: mfs(12, f),
                    color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa',
                    fontStyle: 'italic',
                    marginTop: mfs(2, f),
                  },
                },
                ex.note,
              ),
          )
        }),
      bl.notes &&
        React.createElement(
          'div',
          {
            style: {
              fontSize: mfs(12, f),
              color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa',
              fontStyle: 'italic',
              marginTop: mfs(5, f),
              paddingTop: mfs(5, f),
              borderTop: '1px solid rgba(0,184,212,0.15)',
            },
          },
          bl.notes,
        ),
    ),
  )
}

// ── MobileEaglesExportView ────────────────────────────────────────────────────
export function MobileEaglesExportView({
  sessions,
  selectedDate,
  currentWeekDates,
  gymName,
  logoDataUrl,
  logoScale,
  fontScale,
  bgOverride,
  colors,
}) {
  const col = colors || {}
  const found = buildMobileSession(sessions, selectedDate, currentWeekDates)
  const f = fontScale || 1
  const pad = Math.round(28 * f)
  if (!found)
    return React.createElement(
      'div',
      {
        style: {
          background: '#000',
          color: '#555',
          padding: '40px',
          textAlign: 'center',
          fontFamily: GF(),
        },
      },
      '—',
    )
  const { s, date } = found
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()
  const dateNum = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const ls = logoScale || 1
  const bgA = bgOverride || APP_CONFIG.mobileEaglesBg || '#0d0b09'
  return React.createElement(
    'div',
    { style: { background: bgA, width: '1080px', fontFamily: GF() } },
    React.createElement(
      'div',
      {
        style: {
          background: bgA,
          padding: `${Math.round(22 * f)}px ${pad}px ${Math.round(18 * f)}px`,
          borderBottom: `2px solid ${col.date || '#4ac8c0'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: mfs(16, f) } },
        logoDataUrl &&
          React.createElement('img', {
            src: logoDataUrl,
            style: {
              width: `${Math.round(56 * ls)}px`,
              height: `${Math.round(56 * ls)}px`,
              objectFit: 'contain',
              borderRadius: '4px',
            },
          }),
        React.createElement(
          'span',
          {
            style: {
              fontSize: mfs(30, f),
              fontWeight: 900,
              color: col.gymName || '#fff',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
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
              fontSize: mfs(18, f),
              color: col.date || '#4ac8c0',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            },
          },
          `${weekday} · ${dateNum}`,
        ),
        s.mainTraining &&
          React.createElement(
            'div',
            {
              style: {
                fontSize: mfs(13, f),
                color: col.subtitle || '#3a8a80',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                marginTop: mfs(2, f),
              },
            },
            s.mainTraining,
          ),
      ),
    ),
    (s.blocks || []).map(bl =>
      React.createElement(MobileBlockA, { key: bl.id, bl, fs: f, bg: bgA, colors: col }),
    ),
  )
}

// ── MobileBlockB ──────────────────────────────────────────────────────────────
function MobileBlockB({ bl, fs, colors }) {
  const col = colors || {}
  const f = fs || 1
  const pad = Math.round(20 * f)
  const _lbl = bl.label && bl.label !== '-' ? bl.label : null
  const _typ = bl.type && bl.type !== '-' ? bl.type : null
  const title = _lbl && _typ && _lbl !== _typ ? `${_lbl} · ${_typ}` : _lbl || _typ || ''
  const meta = blkMeta(bl)
  return React.createElement(
    'div',
    { style: { borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
    React.createElement(
      'div',
      {
        style: {
          background: col.blockHdr || 'rgba(0,184,212,0.12)',
          padding: `${Math.round(10 * f)}px ${pad}px`,
          borderTop: `${Math.max(2, Math.round(3 * f))}px solid ${col.blockType || '#00b8d4'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            fontSize: mfs(16, f),
            fontWeight: 900,
            color: col.blockType || '#00b8d4',
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            fontFamily: GF(),
            lineHeight: 1.2,
          },
        },
        title,
      ),
      meta &&
        React.createElement(
          'span',
          {
            style: {
              fontSize: mfs(12, f),
              fontWeight: 900,
              color: col.blockMetaText || '#000',
              background: col.blockMetaBg || '#00b8d4',
              padding: `${Math.round(3 * f)}px ${Math.round(10 * f)}px`,
              borderRadius: '2px',
              fontFamily: GF(),
              whiteSpace: 'nowrap',
            },
          },
          meta,
        ),
    ),
    React.createElement(
      'div',
      {
        style: {
          background: APP_CONFIG.mobileMegaManBg || '#000',
          padding: `${Math.round(8 * f)}px ${pad}px ${Math.round(14 * f)}px`,
        },
      },
      (bl.exercises || [])
        .filter(e => e.name || e.isComplex)
        .map(ex => {
          if (ex.isComplex) {
            const movs = ex.complexMovements || []
            return React.createElement(
              'div',
              {
                key: ex.id,
                style: {
                  padding: `${Math.round(6 * f)}px 0`,
                  borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}`,
                },
              },
              React.createElement(
                'div',
                {
                  style: {
                    fontSize: mfs(17, f),
                    fontWeight: 900,
                    color: col.exName || '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em',
                    fontFamily: GF(),
                    lineHeight: 1.2,
                  },
                },
                complexLine(ex),
              ),
              ...movs.map((m, mi) =>
                React.createElement(
                  'div',
                  {
                    key: mi,
                    style: {
                      fontSize: mfs(13, f),
                      color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa',
                      fontFamily: GF(),
                    },
                  },
                  `· ${[m.reps, m.name].filter(Boolean).join(' ')}`,
                ),
              ),
              ex.note
                ? React.createElement(
                    'div',
                    {
                      key: 'n',
                      style: {
                        fontSize: mfs(11, f),
                        color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa',
                        fontStyle: 'italic',
                        marginTop: mfs(2, f),
                      },
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
            if (!progLines || !progLines.length)
              return React.createElement(
                'div',
                {
                  key: ex.id,
                  style: {
                    padding: `${Math.round(6 * f)}px 0`,
                    borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}`,
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      fontSize: mfs(17, f),
                      fontWeight: 900,
                      color: col.exName || '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      fontFamily: GF(),
                      lineHeight: 1.2,
                    },
                  },
                  line,
                ),
              )
            return React.createElement(
              'div',
              {
                key: ex.id,
                style: {
                  padding: `${Math.round(6 * f)}px 0`,
                  borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}`,
                },
              },
              progLines.map((pl, si) =>
                React.createElement(
                  'div',
                  { key: si, style: { marginTop: si > 0 ? mfs(4, f) : '0' } },
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: mfs(17, f),
                        fontWeight: 900,
                        color: col.exName || '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '.05em',
                        fontFamily: GF(),
                        lineHeight: 1.2,
                      },
                    },
                    pl.nameLine,
                  ),
                  pl.loadStr &&
                    React.createElement(
                      'div',
                      {
                        style: {
                          display: 'inline-block',
                          fontSize: mfs(13, f),
                          fontWeight: 700,
                          color: '#ffd700',
                          background: 'rgba(0,0,0,0.35)',
                          border: '1px solid rgba(255,215,0,0.25)',
                          borderRadius: '3px',
                          padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`,
                          marginTop: mfs(3, f),
                          fontFamily: GF(),
                        },
                      },
                      pl.loadStr,
                    ),
                ),
              ),
              ex.note &&
                React.createElement(
                  'div',
                  {
                    style: {
                      fontSize: mfs(11, f),
                      color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa',
                      fontStyle: 'italic',
                      marginTop: mfs(2, f),
                    },
                  },
                  ex.note,
                ),
            )
          }
          const ins = ex.intensity?.mode !== 'cardio' ? fmtIntensity(ex.intensity) : null
          return React.createElement(
            'div',
            {
              key: ex.id,
              style: {
                padding: `${Math.round(6 * f)}px 0`,
                borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}`,
              },
            },
            React.createElement(
              'div',
              {
                style: {
                  fontSize: mfs(17, f),
                  fontWeight: 900,
                  color: col.exName || '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                  fontFamily: GF(),
                  lineHeight: 1.2,
                },
              },
              line,
            ),
            ins &&
              React.createElement(
                'div',
                {
                  style: {
                    display: 'inline-block',
                    fontSize: mfs(13, f),
                    fontWeight: 700,
                    color: '#ffd700',
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,215,0,0.25)',
                    borderRadius: '3px',
                    padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`,
                    marginTop: mfs(3, f),
                    fontFamily: GF(),
                  },
                },
                ins,
              ),
            ex.note &&
              React.createElement(
                'div',
                {
                  style: {
                    fontSize: mfs(11, f),
                    color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa',
                    fontStyle: 'italic',
                    marginTop: mfs(2, f),
                  },
                },
                ex.note,
              ),
          )
        }),
      bl.notes &&
        React.createElement(
          'div',
          {
            style: {
              fontSize: mfs(12, f),
              color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa',
              marginTop: mfs(5, f),
              paddingTop: mfs(5, f),
              borderTop: '1px solid rgba(0,184,212,0.15)',
              fontFamily: GF(),
            },
          },
          bl.notes,
        ),
    ),
  )
}

// ── MobileMegaManExportView ───────────────────────────────────────────────────
export function MobileMegaManExportView({
  sessions,
  selectedDate,
  currentWeekDates,
  gymName,
  logoDataUrl,
  logoScale,
  fontScale,
  bgOverride,
  colors,
}) {
  const col = colors || {}
  const found = buildMobileSession(sessions, selectedDate, currentWeekDates)
  const f = fontScale || 1
  const pad = Math.round(28 * f)
  if (!found)
    return React.createElement(
      'div',
      {
        style: {
          background: '#000',
          color: '#1a4a50',
          padding: '40px',
          textAlign: 'center',
          fontFamily: GF(),
        },
      },
      '—',
    )
  const { s, date } = found
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()
  const dateNum = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const ls = logoScale || 1
  const bg = bgOverride || APP_CONFIG.mobileMegaManBg || '#0a1a5c'
  return React.createElement(
    'div',
    { style: { background: bg, width: '1080px', fontFamily: GF() } },
    React.createElement(
      'div',
      {
        style: {
          background: bg,
          padding: `${Math.round(22 * f)}px ${pad}px ${Math.round(18 * f)}px`,
          borderBottom: `${Math.max(2, Math.round(3 * f))}px solid rgba(0,184,212,0.8)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: mfs(16, f) } },
        logoDataUrl &&
          React.createElement('img', {
            src: logoDataUrl,
            style: {
              width: `${Math.round(56 * ls)}px`,
              height: `${Math.round(56 * ls)}px`,
              objectFit: 'contain',
              borderRadius: '4px',
            },
          }),
        React.createElement(
          'span',
          {
            style: {
              fontSize: mfs(30, f),
              fontWeight: 900,
              color: col.gymName || '#fff',
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
              fontSize: mfs(18, f),
              color: col.date || '#00b8d4',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            },
          },
          `${weekday} · ${dateNum}`,
        ),
        s.mainTraining &&
          React.createElement(
            'div',
            {
              style: {
                fontSize: mfs(12, f),
                color: col.subtitle || '#3a6a80',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                marginTop: mfs(2, f),
              },
            },
            s.mainTraining,
          ),
      ),
    ),
    (s.blocks || []).map(bl =>
      React.createElement(MobileBlockB, { key: bl.id, bl, fs: f, colors: col }),
    ),
  )
}

// ── MobileWeeklySingleDay ─────────────────────────────────────────────────────
function MobileWeeklySingleDay({ date, sessions, f, variant }) {
  const dateKey = toISO(date)
  const s = (sessions[dateKey] || [])[0] || null
  const dow = DAY_PT[date.getDay()]
  const dateNum = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const restLabel = APP_CONFIG.restDayLabel || 'Descanso'
  const pad = Math.round(18 * f)
  const isA = variant === 'A'
  const cyan = '#00b8d4'
  const hdrAccent = isA ? '#4ac8c0' : cyan
  const fontFamily = GF()
  const bg = isA ? APP_CONFIG.mobileEaglesBg || '#000' : APP_CONFIG.mobileMegaManBg || '#000'
  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      {
        style: {
          background: isA ? '#161412' : '#050e14',
          padding: `${Math.round(8 * f)}px ${pad}px`,
          borderTop: `${Math.max(2, Math.round(3 * f))}px solid ${hdrAccent}`,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        },
      },
      React.createElement(
        'span',
        {
          style: {
            fontSize: mfs(15, f),
            fontWeight: 900,
            color: hdrAccent,
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            fontFamily,
          },
        },
        dow,
      ),
      React.createElement(
        'span',
        {
          style: {
            fontSize: mfs(12, f),
            fontWeight: 700,
            color: isA ? '#3a8a80' : '#3a6a80',
            fontFamily,
          },
        },
        dateNum,
      ),
    ),
    s
      ? React.createElement(
          'div',
          { style: { background: bg } },
          (s.blocks || []).map(bl => {
            const _lbl = bl.label && bl.label !== '-' ? bl.label : null
            const _typ = bl.type && bl.type !== '-' ? bl.type : null
            const title = _lbl && _typ && _lbl !== _typ ? `${_lbl} · ${_typ}` : _lbl || _typ || ''
            const meta = blkMeta(bl)
            const exNames = (bl.exercises || []).filter(e => e.name || e.isComplex)
            const blkBg = isA ? 'rgba(74,200,192,0.12)' : 'rgba(0,184,212,0.12)'
            const blkDiv = isA
              ? 'rgba(74,200,192,0.08) 1px solid'
              : 'rgba(0,184,212,0.08) 1px solid'
            return React.createElement(
              'div',
              { key: bl.id },
              React.createElement(
                'div',
                {
                  style: {
                    background: blkBg,
                    padding: `${Math.round(6 * f)}px ${pad}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
                },
                React.createElement(
                  'span',
                  {
                    style: {
                      fontSize: mfs(13, f),
                      fontWeight: 900,
                      color: hdrAccent,
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                      fontFamily,
                    },
                  },
                  title,
                ),
                meta &&
                  React.createElement(
                    'span',
                    {
                      style: {
                        fontSize: mfs(11, f),
                        fontWeight: 900,
                        color: '#000',
                        background: hdrAccent,
                        padding: `${Math.round(2 * f)}px ${Math.round(7 * f)}px`,
                        borderRadius: '2px',
                        fontFamily,
                      },
                    },
                    meta,
                  ),
              ),
              exNames.map(ex => {
                const line = ex.isComplex ? complexLine(ex) : exLine(ex)
                return React.createElement(
                  'div',
                  {
                    key: ex.id,
                    style: {
                      padding: `${Math.round(5 * f)}px ${pad}px`,
                      borderBottom: blkDiv,
                      fontSize: mfs(14, f),
                      fontWeight: 900,
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      fontFamily,
                      lineHeight: 1.2,
                    },
                  },
                  line,
                )
              }),
            )
          }),
        )
      : React.createElement(
          'div',
          {
            style: {
              background: bg,
              padding: `${Math.round(10 * f)}px ${pad}px`,
              fontSize: mfs(12, f),
              color: '#333',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              fontFamily,
            },
          },
          `— ${restLabel}`,
        ),
  )
}

// ── MobileWeeklyExportView ────────────────────────────────────────────────────
export function MobileWeeklyExportView({
  sessions,
  gymName,
  logoDataUrl,
  logoScale,
  fontScale,
  weekDates,
  variant,
}) {
  const f = fontScale || 1
  const ls = logoScale || 1
  const pad = Math.round(22 * f)
  const isA = variant === 'A'
  const cyan = '#00b8d4'
  const accent = isA ? '#4ac8c0' : cyan
  const bg = isA ? APP_CONFIG.mobileEaglesBg || '#0d0b09' : APP_CONFIG.mobileMegaManBg || '#000'
  const fontFamily = GF()
  const orderedDays = [1, 2, 3, 4, 5, 6, 0].map(i => weekDates[i])
  const mon = weekDates[1]
  const sun = weekDates[0]
  const weekLabel = `${mon.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} – ${sun.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
  const midDate = weekDates[3]
  return React.createElement(
    'div',
    { style: { background: bg, width: '1080px', fontFamily } },
    React.createElement(
      'div',
      {
        style: {
          background: bg,
          padding: `${Math.round(22 * f)}px ${pad}px ${Math.round(16 * f)}px`,
          borderBottom: `${Math.max(2, Math.round(3 * f))}px solid ${accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: mfs(14, f) } },
        logoDataUrl &&
          React.createElement('img', {
            src: logoDataUrl,
            style: {
              width: `${Math.round(48 * ls)}px`,
              height: `${Math.round(48 * ls)}px`,
              objectFit: 'contain',
              borderRadius: '4px',
            },
          }),
        React.createElement(
          'span',
          {
            style: {
              fontSize: mfs(28, f),
              fontWeight: 900,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              fontFamily,
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
              fontSize: mfs(16, f),
              fontWeight: 900,
              color: accent,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              fontFamily,
            },
          },
          weekLabel,
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: mfs(12, f),
              color: isA ? '#3a8a80' : '#3a6a80',
              marginTop: mfs(2, f),
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              fontFamily,
            },
          },
          MONTH_PT[midDate.getMonth()] + ' ' + midDate.getFullYear(),
        ),
      ),
    ),
    orderedDays.map((date, i) =>
      React.createElement(MobileWeeklySingleDay, { key: i, date, sessions, f, col: {}, variant }),
    ),
  )
}
