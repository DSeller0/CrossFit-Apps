import { ZONES, DSHORT, PLC, normaliseZone } from '../../../utils/config'
import { fmtIntensity, blkMeta } from '../../../public/lib/wod.js'
import { MONTH_PT } from '../../../public/lib/week.js'
import { toISO } from '../../../utils/storage'
import { getWeeksOfMonth, exLine, complexLine, buildProgressionLines } from './exportHelpers'

// Every export view in this file is an EXPORT ARTEFACT (plans/82's colour model): it takes
// no colour prop and reads the 8 `--a-*` custom properties instead, set as literal hex on
// whatever mounts it via exportPalette.js's resolveExportPalette(). A rasterised PNG must
// not change colour when the coach's SPA theme changes underneath it — that's the whole
// point of resolving to hex up front rather than depending on live var() resolution.
// Family block-colouring (ECOL) is DROPPED here (plans/82 measurement 2: it fails the 3:1
// bar on both light themes) — every block-header accent is `--a-hdr` now, uniformly.
// `WeeklyExportView` below is the one exception: it's on-screen chrome (the always-visible
// week grid, never one of the 6 rasterised export targets — confirmed live, `doExport`
// never selects `exportWeeklyRef`), not an export artefact, so it keeps its own literal chrome
// colours rather than adopting `--a-*`.

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
}) {
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
    return (
      <div className="dv-wrap" style={{ '--fs': fs, background: 'var(--a-bg)' }}>
        <div className="dv-empty-zone">Sem sessões nesta semana</div>
      </div>
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
    const z = normaliseZone(bl.zone) || 'Zona 01'
    if (!byZone[z]) byZone[z] = []
    byZone[z].push(bl)
  })
  return (
    <div className="dv-wrap" style={{ '--fs': fs }}>
      <div className="dv-topbar" style={{ background: 'var(--a-bg)' }}>
        <div className="dv-top-left">
          {logoDataUrl && (
            <div
              style={{
                width: `${Math.round(64 * (logoScale || 1))}px`,
                height: `${Math.round(64 * (logoScale || 1))}px`,
                background: 'transparent',
                overflow: 'hidden',
                flexShrink: 0,
                borderRadius: '4px',
              }}
            >
              <img
                src={logoDataUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          )}
          <span className="dv-gym-name" style={{ color: 'var(--a-name)' }}>
            {gymName || 'Cone'}
          </span>
        </div>
        <div className="dv-top-right">
          <div className="dv-date-label" style={{ color: 'var(--a-hdr)' }}>
            {weekday + ' · ' + dateNum}
          </div>
          {s.mainTraining && (
            <div className="dv-main-training" style={{ color: 'var(--a-sub)' }}>
              {s.mainTraining}
            </div>
          )}
          {label && (
            <div
              style={{
                fontSize: '13px',
                color: '#555',
                marginTop: '3px',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              {label}
            </div>
          )}
        </div>
      </div>
      <div className="dv-zones">
        {ZONES.map((zoneName, zi) => {
          const zoneBlocks = byZone[zoneName] || []
          const primaryBlock = zoneBlocks[0] || null
          return (
            <div
              key={zoneName}
              className="dv-zone"
              style={{
                '--zfs': zoneScales?.[zi] || 1,
                '--bts': blockTitleScales?.[zi] || 1,
                borderRight: '2px solid var(--a-div)',
              }}
            >
              <div className="dv-zone-header" style={{ borderBottom: '1px solid var(--a-div)' }}>
                {primaryBlock ? (
                  <div>
                    <div className="dv-zone-type" style={{ color: 'var(--a-hdr)' }}>
                      {zoneBlocks[0].label && zoneBlocks[0].label !== '-' ? (
                        <div>
                          <div>{zoneBlocks[0].label}</div>
                          <div
                            style={{
                              fontSize: 'calc(16px * var(--fs,1) * var(--bts,1))',
                              opacity: 0.75,
                              marginTop: '2px',
                              color: 'var(--a-hdr)',
                            }}
                          >
                            {zoneBlocks[0].type}
                          </div>
                        </div>
                      ) : (
                        zoneBlocks[0].type
                      )}
                    </div>
                    {primaryBlock.duration && (
                      <div className="dv-zone-subtitle" style={{ color: 'var(--a-int)' }}>
                        {`CAP ${primaryBlock.duration}'`}
                      </div>
                    )}
                    {primaryBlock.rounds && (
                      <div className="dv-rounds-label" style={{ color: 'var(--a-int)' }}>
                        {`${primaryBlock.rounds} ROUNDS`}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="dv-zone-type"
                    style={{
                      color: '#1a1a1a',
                      fontSize: 'calc(22px * var(--fs,1))',
                    }}
                  >
                    —
                  </div>
                )}
              </div>
              {zoneBlocks.length === 0 ? (
                <div className="dv-empty-zone">—</div>
              ) : (
                <div className="dv-zone-body">
                  {zoneBlocks.map((bl, bli) => {
                    return (
                      <div key={bl.id} className="dv-block-in-zone">
                        {bli > 0 && (
                          <div className="dv-block-type-label" style={{ color: 'var(--a-hdr)' }}>
                            {bl.type}
                            {(bl.rounds || bl.duration) && (
                              <span className="dv-block-cap" style={{ color: 'var(--a-hdr)' }}>
                                {blkMeta(bl)}
                              </span>
                            )}
                          </div>
                        )}
                        {(bl.exercises || [])
                          .filter(e => e.name || e.isComplex)
                          .map(ex => {
                            if (ex.isComplex) {
                              const movs = ex.complexMovements || []
                              return (
                                <div
                                  key={ex.id}
                                  className="dv-ex-item"
                                  style={{ borderBottom: '1px solid var(--a-div)' }}
                                >
                                  <div className="dv-ex-name" style={{ color: 'var(--a-name)' }}>
                                    {complexLine(ex)}
                                  </div>
                                  {movs.map((m, mi) => (
                                    <div
                                      key={mi}
                                      className="dv-ex-note"
                                      style={{ color: 'var(--a-note)' }}
                                    >
                                      {`· ${[m.reps, m.name].filter(Boolean).join(' ')}`}
                                    </div>
                                  ))}
                                  {ex.note ? (
                                    <div
                                      key="n"
                                      className="dv-ex-note"
                                      style={{ color: 'var(--a-note)' }}
                                    >
                                      {ex.note}
                                    </div>
                                  ) : null}
                                </div>
                              )
                            }
                            const isProg = ex.intensity?.mode === 'progression'
                            const line = exLine(ex)
                            if (isProg) {
                              const progLines = buildProgressionLines(ex)
                              if (!progLines || !progLines.length) {
                                return (
                                  <div
                                    key={ex.id}
                                    className="dv-ex-item"
                                    style={{ borderBottom: '1px solid var(--a-div)' }}
                                  >
                                    <div className="dv-ex-name" style={{ color: 'var(--a-name)' }}>
                                      {line}
                                    </div>
                                    {ex.note && (
                                      <div
                                        className="dv-ex-note"
                                        style={{ color: 'var(--a-note)' }}
                                      >
                                        {ex.note}
                                      </div>
                                    )}
                                  </div>
                                )
                              }
                              return (
                                <div
                                  key={ex.id}
                                  className="dv-ex-item"
                                  style={{ borderBottom: '1px solid var(--a-div)' }}
                                >
                                  {progLines.map((pl, si) => (
                                    <div key={si}>
                                      <div
                                        className="dv-ex-name"
                                        style={{ color: 'var(--a-name)' }}
                                      >
                                        {pl.nameLine}
                                      </div>
                                      {pl.loadStr && (
                                        <div
                                          className="dv-ex-vol"
                                          style={{
                                            color: 'var(--a-int)',
                                            display: 'inline-block',
                                            marginTop: '2px',
                                          }}
                                        >
                                          {pl.loadStr}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {ex.note && (
                                    <div className="dv-ex-note" style={{ color: 'var(--a-note)' }}>
                                      {ex.note}
                                    </div>
                                  )}
                                </div>
                              )
                            }
                            return (
                              <div
                                key={ex.id}
                                className="dv-ex-item"
                                style={{ borderBottom: '1px solid var(--a-div)' }}
                              >
                                <div className="dv-ex-name" style={{ color: 'var(--a-name)' }}>
                                  {line}
                                </div>
                                {ex.note && (
                                  <div className="dv-ex-note" style={{ color: 'var(--a-note)' }}>
                                    {ex.note}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        {(() => {
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
                            loads.length > 0 && (
                              <div
                                className="dv-block-notes"
                                style={{
                                  borderTop: '1px solid var(--a-div)',
                                  marginTop: '6px',
                                  paddingTop: '6px',
                                  color: 'var(--a-int)',
                                  fontStyle: 'normal',
                                  fontWeight: 700,
                                }}
                              >
                                {loads.join(' · ')}
                              </div>
                            )
                          )
                        })()}
                        {bl.notes && (
                          <div
                            className="dv-block-notes"
                            style={{
                              color: 'var(--a-note)',
                              borderTopColor: 'var(--a-div)',
                            }}
                          >
                            {bl.notes}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── WeeklyExportView — on-screen chrome only (never rasterised, see file header) ─────
export function WeeklyExportView({ sessions, label, year, month, onDayClick }) {
  const weeks = getWeeksOfMonth(year, month)
  const monthName = MONTH_PT[month] + ' ' + year
  const today = new Date()
  return (
    <div className="weekly-wrap">
      <div className="wk-header">
        <div className="wk-title">
          {'Grade de Treinos · '}
          {monthName}
        </div>
        {label && <div className="wk-sub">{label}</div>}
      </div>
      <div className="wk-col-head-row">
        <div className="wk-col-head" style={{ color: '#333', textAlign: 'center' }}>
          WK
        </div>
        {DSHORT.map(d => (
          <div key={d} className="wk-col-head">
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="wk-week-row">
          <div className="wk-week-num">{wi + 1}</div>
          {week.map((date, di) => {
            const dateKey = toISO(date)
            const inMonth = date.getMonth() === month
            const daySessions = sessions[dateKey] || []
            const s = daySessions[0] || null
            const isToday = date.toDateString() === today.toDateString()
            return (
              <div
                key={di}
                className={`wk-day-cell ${!s ? 'empty' : ''}`}
                onClick={s && onDayClick ? () => onDayClick(week, date) : undefined}
              >
                <div className={`wk-day-num${isToday ? ' today' : ''}`}>
                  {inMonth ? date.getDate() : ''}
                </div>
                {s && (
                  <div>
                    <div className="wk-day-training" style={{ color: inMonth ? '#ddd' : '#444' }}>
                      {s.mainTraining || '—'}
                    </div>
                    <div className="wk-day-blocks">
                      {(s.blocks || []).slice(0, 4).map(bl => (
                        <span
                          key={bl.id}
                          className={`wg-pill ${PLC[bl.type] || 'p-st'}`}
                          style={{ fontSize: '9px', padding: '1px 5px' }}
                        >
                          {bl.type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
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
}) {
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
  return (
    <div
      style={{
        background: 'var(--a-bg)',
        color: '#fff',
        width: '1920px',
        height: '1080px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Arial Black',Arial,sans-serif",
        overflow: 'hidden',
        '--fs': fs,
      }}
    >
      <div
        style={{
          background: 'var(--a-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 40px',
          borderBottom: '2px solid var(--a-div)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {logoDataUrl && (
            <div
              style={{
                width: `${Math.round(56 * ls)}px`,
                height: `${Math.round(56 * ls)}px`,
                background: 'transparent',
                overflow: 'hidden',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            >
              <img
                src={logoDataUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          )}
          <span
            style={{
              fontSize: `calc(32px * var(--fs,1))`,
              fontWeight: 900,
              color: 'var(--a-name)',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            }}
          >
            {gymName || 'Cone'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: `calc(32px * var(--fs,1))`,
              fontWeight: 900,
              color: 'var(--a-hdr)',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              lineHeight: 1,
            }}
          >
            {weekLabel}
          </div>
          <div
            style={{
              fontSize: `calc(18px * var(--fs,1))`,
              color: 'var(--a-sub)',
              marginTop: '4px',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
            }}
          >
            {MONTH_PT[midDate.getMonth()] + ' ' + midDate.getFullYear()}
          </div>
          {label && (
            <div
              style={{
                fontSize: `calc(14px * var(--fs,1))`,
                color: '#444',
                marginTop: '2px',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5,1fr)',
          background: '#0d0d0d',
          borderBottom: '1px solid var(--a-div)',
          flexShrink: 0,
        }}
      >
        {SHOW.map((dayIdx, ci) => {
          const date = weekDates[dayIdx]
          const dateNum = date.getDate()
          const inMonth = date.getMonth() === month
          const isToday = date.toDateString() === today.toDateString()
          return (
            <div
              key={ci}
              style={{
                padding: '10px 20px',
                borderRight: ci < 4 ? '1px solid var(--a-div)' : 'none',
                display: 'flex',
                alignItems: 'baseline',
                gap: '10px',
              }}
            >
              <span
                style={{
                  fontSize: `calc(16px * var(--fs,1))`,
                  fontWeight: 900,
                  color: 'var(--a-hdr)',
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                }}
              >
                {DAY_LABELS[ci]}
              </span>
              <span
                style={{
                  fontSize: `calc(20px * var(--fs,1))`,
                  fontWeight: 900,
                  color: isToday ? 'var(--a-hdr)' : inMonth ? 'var(--a-sub)' : '#333',
                }}
              >
                {inMonth ? dateNum : ''}
              </span>
            </div>
          )
        })}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5,1fr)',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {SHOW.map((dayIdx, ci) => {
          const date = weekDates[dayIdx]
          const dateKey = toISO(date)
          const inMonth = date.getMonth() === month
          const daySessions = sessions[dateKey] || []
          const s = daySessions[0] || null
          return (
            <div
              key={ci}
              style={{
                borderRight: ci < 4 ? '1px solid var(--a-div)' : 'none',
                padding: '14px 20px',
                background: s && inMonth ? '#060606' : '#000',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {s && inMonth ? (
                <div
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      fontSize: `calc(14px * var(--fs,1))`,
                      fontWeight: 900,
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      lineHeight: 1.2,
                      marginBottom: '10px',
                      flexShrink: 0,
                      borderBottom: '1px solid var(--a-div)',
                      paddingBottom: '8px',
                    }}
                  >
                    {s.mainTraining || '—'}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {(s.blocks || []).map(bl => {
                      const meta = blkMeta(bl)
                      const exs = bl.exercises?.filter(e => e.name || e.isComplex) || []
                      return (
                        <div
                          key={bl.id}
                          style={{
                            borderLeft: '2px solid var(--a-hdr)',
                            paddingLeft: '8px',
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: `calc(12px * var(--fs,1))`,
                              fontWeight: 900,
                              color: 'var(--a-hdr)',
                              textTransform: 'uppercase',
                              letterSpacing: '.07em',
                              lineHeight: 1.2,
                            }}
                          >
                            {bl.type + (meta ? ` · ${meta}` : '')}
                          </div>
                          {exs.slice(0, 4).map(ex => (
                            <div key={ex.id} style={{ marginTop: '3px' }}>
                              <div
                                style={{
                                  fontSize: `calc(13px * var(--fs,1))`,
                                  fontWeight: 900,
                                  color: 'var(--a-name)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '.04em',
                                  lineHeight: 1.15,
                                }}
                              >
                                {ex.isComplex ? complexLine(ex) : exLine(ex)}
                              </div>
                            </div>
                          ))}
                          {bl.notes && (
                            <div
                              style={{
                                fontSize: `calc(10px * var(--fs,1))`,
                                color: '#555',
                                marginTop: '3px',
                                fontStyle: 'italic',
                                fontWeight: 400,
                                lineHeight: 1.4,
                              }}
                            >
                              {bl.notes}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    color: '#1a1a1a',
                    fontSize: `calc(12px * var(--fs,1))`,
                    textTransform: 'uppercase',
                    letterSpacing: '.1em',
                    marginTop: '8px',
                  }}
                >
                  —
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
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
}) {
  const weeks = getWeeksOfMonth(year, month)
  const monthName = MONTH_PT[month]
  const today = new Date()
  const ls = logoScale || 1
  const SHOW_DAYS = [1, 2, 3, 4, 5]
  const CAL_DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX']
  const fs = fontScale || 1
  return (
    <div
      style={{
        background: 'var(--a-bg)',
        color: '#fff',
        width: '1920px',
        height: '1080px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Arial Black',Arial,sans-serif",
        overflow: 'hidden',
        '--fs': fs,
      }}
    >
      <div
        style={{
          background: 'var(--a-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 40px',
          borderBottom: '2px solid var(--a-div)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {logoDataUrl && (
            <div
              style={{
                width: `${Math.round(56 * ls)}px`,
                height: `${Math.round(56 * ls)}px`,
                background: 'transparent',
                overflow: 'hidden',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            >
              <img
                src={logoDataUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          )}
          <span
            style={{
              fontSize: `calc(32px * var(--fs,1))`,
              fontWeight: 900,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            }}
          >
            {gymName || 'Cone'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: `calc(36px * var(--fs,1))`,
              fontWeight: 900,
              color: 'var(--a-hdr)',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              lineHeight: 1,
            }}
          >
            {monthName + ' ' + year}
          </div>
          {label && (
            <div
              style={{
                fontSize: `calc(16px * var(--fs,1))`,
                color: '#666',
                marginTop: '4px',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5,1fr)',
          background: '#0d0d0d',
          borderBottom: '1px solid #1a1a1a',
          flexShrink: 0,
        }}
      >
        {CAL_DAY_LABELS.map((d, i) => (
          <div
            key={d}
            style={{
              padding: '10px 16px',
              fontSize: `calc(16px * var(--fs,1))`,
              fontWeight: 900,
              color: 'var(--a-hdr)',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              borderRight: i < 4 ? '1px solid var(--a-div)' : 'none',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {weeks.map((week, wi) => {
          const weekdays = SHOW_DAYS.map(di => ({ date: week[di], di }))
          return (
            <div
              key={wi}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5,1fr)',
                flex: 1,
                borderBottom: wi < weeks.length - 1 ? '1px solid #1a1a1a' : 'none',
              }}
            >
              {weekdays.map(({ date, di }, ci) => {
                const dateKey = toISO(date)
                const inMonth = date.getMonth() === month
                const s = (sessions[dateKey] || [])[0] || null
                const isToday = date.toDateString() === today.toDateString()
                return (
                  <div
                    key={di}
                    style={{
                      borderRight: ci < 4 ? '1px solid var(--a-div)' : 'none',
                      padding: '10px 14px',
                      background: inMonth ? (s ? '#080808' : '#000') : '#030303',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        fontSize: `calc(22px * var(--fs,1))`,
                        fontWeight: 900,
                        color: isToday ? 'var(--a-hdr)' : inMonth ? 'var(--a-sub)' : '#222',
                        marginBottom: '6px',
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {inMonth ? date.getDate() : ''}
                    </div>
                    {s && inMonth && (
                      <div
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: `calc(15px * var(--fs,1))`,
                            fontWeight: 900,
                            color: '#fff',
                            textTransform: 'uppercase',
                            letterSpacing: '.04em',
                            lineHeight: 1.2,
                            marginBottom: '4px',
                          }}
                        >
                          {s.mainTraining || '—'}
                        </div>
                        {(s.blocks || []).map(bl => {
                          const exNames = bl.exercises
                            ?.filter(e => e.name)
                            .slice(0, 4)
                            .map(e => e.name)
                            .join(', ')
                          return (
                            <div
                              key={bl.id}
                              style={{
                                borderLeft: '2px solid var(--a-hdr)',
                                paddingLeft: '6px',
                                marginBottom: '3px',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: `calc(12px * var(--fs,1))`,
                                  fontWeight: 900,
                                  color: 'var(--a-hdr)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '.06em',
                                  lineHeight: 1.2,
                                }}
                              >
                                {bl.type}
                              </div>
                              {exNames && (
                                <div
                                  style={{
                                    fontSize: `calc(11px * var(--fs,1))`,
                                    color: 'var(--a-sub)',
                                    lineHeight: 1.3,
                                    marginTop: '1px',
                                  }}
                                >
                                  {exNames}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
