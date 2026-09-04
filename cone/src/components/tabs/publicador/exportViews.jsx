import { DSHORT, PLC, APP_CONFIG } from '../../../utils/config'
import { fmtIntensity, blkMeta } from '../../../public/lib/wod.js'
import { MONTH_PT, DAY_PT } from '../../../public/lib/week.js'
import { toISO } from '../../../utils/storage'
import {
  getWeeksOfMonth,
  exLine,
  complexLine,
  buildProgressionLines,
  resolveDaySession,
} from './exportHelpers'
import {
  distributeZones,
  zoneColumnWidths,
  visibleWeekDates,
  monthCellSessions,
} from './layoutHelpers'
import {
  blockTitle,
  wrapperStyle as blockWrapperStyle,
  DEFAULT_BLOCK_TREATMENT,
  DEFAULT_BLOCK_CONTENT,
} from './blockTreatments'
import BlockHeader from './BlockHeader'
// Aliased `css` (not the usual `s`) — both views in this file use `s` as the local
// session-object variable name (`resolveDaySession`'s `s`, `daySessions[0]`'s `s`),
// which would shadow a module import named `s` throughout the file.
import css from './Publicador.module.css'

// Every export view in this file is an EXPORT ARTEFACT (plans/82's colour model): it takes
// no colour prop and reads the 8 `--a-*` custom properties instead, set as literal hex on
// whatever mounts it via exportPalette.js's resolveExportPalette(). A rasterised PNG must
// not change colour when the coach's SPA theme changes underneath it — that's the whole
// point of resolving to hex up front rather than depending on live var() resolution.
// Family block-colouring (ECOL) is DROPPED here (plans/82 measurement 2: it fails the 3:1
// bar on both light themes) — every block-header accent is `--a-hdr` now, uniformly, via
// the 5 Blocos treatments (plans/83 T5, BlockHeader.jsx).
// `WeeklyExportView` below is the one exception: it's on-screen chrome (the always-visible
// week grid, never one of the 5 rasterised export targets — confirmed live, `doExport`
// never selects `exportWeeklyRef`), not an export artefact, so it keeps its own literal chrome
// colours rather than adopting `--a-*`.
//
// Every rendered block is tagged `data-fitblock` (T9, plans/83) — the one generic marker
// fitCheck.js's measureFit() queries to estimate how many blocks a fixed canvas cuts off.
// Blocks in a hidden zone COLLAPSE into the last visible zone (distributeZones,
// layoutHelpers.js) rather than being dropped — the same failure mode as B1, in this file.

// ── DailyExportView ───────────────────────────────────────────────────────────
export function DailyExportView({
  sessions,
  title,
  weekDates,
  gymName,
  fontScale,
  zoneScales,
  blockTitleScales,
  zoneCount = 3,
  zoneSplit = 'iguais',
  blockTreatment = DEFAULT_BLOCK_TREATMENT,
  blockContent = DEFAULT_BLOCK_CONTENT,
  selectedDate,
  logoDataUrl,
  logoScale,
}) {
  const resolved = resolveDaySession(sessions, weekDates, selectedDate)
  const fs = fontScale || 1
  if (!resolved)
    return (
      <div className={css.dvWrap} style={{ '--fs': fs, background: 'var(--a-bg)' }}>
        <div className={css.dvEmptyZone}>Sem sessões nesta semana</div>
      </div>
    )
  const { session: s, date: dateObj } = resolved
  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()
  const dateNum = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const { columns } = distributeZones(s.blocks, zoneCount)
  const gridTemplateColumns = zoneColumnWidths(zoneCount, zoneSplit).join(' ')
  return (
    <div className={css.dvWrap} style={{ '--fs': fs }}>
      <div className={css.dvTopbar} style={{ background: 'var(--a-bg)' }}>
        <div className={css.dvTopLeft}>
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
          <span className={css.dvGymName} style={{ color: 'var(--a-name)' }}>
            {gymName || 'Cone'}
          </span>
        </div>
        <div className={css.dvTopRight}>
          <div className={css.dvDateLabel} style={{ color: 'var(--a-hdr)' }}>
            {weekday + ' · ' + dateNum}
          </div>
          {s.mainTraining && (
            <div className={css.dvMainTraining} style={{ color: 'var(--a-sub)' }}>
              {s.mainTraining}
            </div>
          )}
          {title && (
            <div
              style={{
                fontSize: '13px',
                color: '#555',
                marginTop: '3px',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              {title}
            </div>
          )}
        </div>
      </div>
      <div className={css.dvZones} style={{ gridTemplateColumns }}>
        {columns.map((col, zi) => {
          const zoneBlocks = col.blocks
          const primaryBlock = zoneBlocks[0] || null
          return (
            <div
              key={col.zone}
              className={css.dvZone}
              style={{
                '--zfs': zoneScales?.[zi] || 1,
                '--bts': blockTitleScales?.[zi] || 1,
                borderRight: '2px solid var(--a-div)',
              }}
            >
              <div className={css.dvZoneHeader} style={{ borderBottom: '1px solid var(--a-div)' }}>
                {primaryBlock ? (
                  <BlockHeader
                    treatment={blockTreatment}
                    hdrColor="var(--a-hdr)"
                    onAccentColor="var(--a-on-accent)"
                    divColor="var(--a-div)"
                    title={blockTitle(primaryBlock)}
                    meta={blkMeta(primaryBlock)}
                    titleStyle={{
                      fontSize: 'calc(22px * var(--fs,1) * var(--bts,1))',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                      lineHeight: 1,
                    }}
                    metaStyle={{
                      fontSize: 'calc(19px * var(--fs,1) * var(--bts,1))',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                    }}
                  />
                ) : (
                  <div
                    className={css.dvZoneType}
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
                <div className={css.dvEmptyZone}>—</div>
              ) : (
                <div className={css.dvZoneBody}>
                  {zoneBlocks.map((bl, bli) => {
                    return (
                      <div
                        key={bl.id}
                        className={css.dvBlockInZone}
                        data-fitblock
                        style={blockWrapperStyle(blockTreatment, 'var(--a-hdr)')}
                      >
                        {bli > 0 && (
                          <BlockHeader
                            treatment={blockTreatment}
                            hdrColor="var(--a-hdr)"
                            onAccentColor="var(--a-on-accent)"
                            divColor="var(--a-div)"
                            title={blockTitle(bl)}
                            meta={blkMeta(bl)}
                            titleStyle={{
                              fontSize: 'calc(18px * var(--fs,1) * var(--bts,1))',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '.08em',
                            }}
                            metaStyle={{
                              fontSize: 'calc(15px * var(--fs,1) * var(--bts,1))',
                              fontWeight: 900,
                            }}
                            padding="0 0 10px"
                          />
                        )}
                        {(bl.exercises || [])
                          .filter(e => e.name || e.isComplex)
                          .map(ex => {
                            if (ex.isComplex) {
                              const movs = ex.complexMovements || []
                              return (
                                <div
                                  key={ex.id}
                                  className={css.dvExItem}
                                  style={{ borderBottom: '1px solid var(--a-div)' }}
                                >
                                  <div className={css.dvExName} style={{ color: 'var(--a-name)' }}>
                                    {complexLine(ex)}
                                  </div>
                                  {movs.map((m, mi) => (
                                    <div
                                      key={mi}
                                      className={css.dvExNote}
                                      style={{ color: 'var(--a-note)' }}
                                    >
                                      {`· ${[m.reps, m.name].filter(Boolean).join(' ')}`}
                                    </div>
                                  ))}
                                  {ex.note ? (
                                    <div
                                      key="n"
                                      className={css.dvExNote}
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
                                    className={css.dvExItem}
                                    style={{ borderBottom: '1px solid var(--a-div)' }}
                                  >
                                    <div
                                      className={css.dvExName}
                                      style={{ color: 'var(--a-name)' }}
                                    >
                                      {line}
                                    </div>
                                    {ex.note && (
                                      <div
                                        className={css.dvExNote}
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
                                  className={css.dvExItem}
                                  style={{ borderBottom: '1px solid var(--a-div)' }}
                                >
                                  {progLines.map((pl, si) => (
                                    <div key={si}>
                                      <div
                                        className={css.dvExName}
                                        style={{ color: 'var(--a-name)' }}
                                      >
                                        {pl.nameLine}
                                      </div>
                                      {blockContent.intensity && pl.loadStr && (
                                        <div
                                          className={css.dvExVol}
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
                                    <div
                                      className={css.dvExNote}
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
                                className={css.dvExItem}
                                style={{ borderBottom: '1px solid var(--a-div)' }}
                              >
                                <div className={css.dvExName} style={{ color: 'var(--a-name)' }}>
                                  {line}
                                </div>
                                {ex.note && (
                                  <div className={css.dvExNote} style={{ color: 'var(--a-note)' }}>
                                    {ex.note}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        {blockContent.intensity &&
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
                              loads.length > 0 && (
                                <div
                                  className={css.dvBlockNotes}
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
                        {blockContent.notes && bl.notes && (
                          <div
                            className={css.dvBlockNotes}
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
    <div className={css.weeklyWrap}>
      <div className={css.wkHeader}>
        <div className={css.wkTitle}>
          {'Grade de Treinos · '}
          {monthName}
        </div>
        {label && <div className={css.wkSub}>{label}</div>}
      </div>
      <div className={css.wkColHeadRow}>
        <div className={css.wkColHead} style={{ color: '#333', textAlign: 'center' }}>
          WK
        </div>
        {DSHORT.map(d => (
          <div key={d} className={css.wkColHead}>
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className={css.wkWeekRow}>
          <div className={css.wkWeekNum}>{wi + 1}</div>
          {week.map((date, di) => {
            const dateKey = toISO(date)
            const inMonth = date.getMonth() === month
            const daySessions = sessions[dateKey] || []
            const s = daySessions[0] || null
            const isToday = date.toDateString() === today.toDateString()
            return (
              <div
                key={di}
                className={`${css.wkDayCell} ${!s ? css.empty : ''}`}
                onClick={s && onDayClick ? () => onDayClick(week, date) : undefined}
              >
                <div className={`${css.wkDayNum}${isToday ? ' ' + css.today : ''}`}>
                  {inMonth ? date.getDate() : ''}
                </div>
                {s && (
                  <div>
                    <div className={css.wkDayTraining} style={{ color: inMonth ? '#ddd' : '#444' }}>
                      {s.mainTraining || '—'}
                    </div>
                    <div className={css.wkDayBlocks}>
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

// ── WeeklyCalendarExportView — 1920×1080, Sunday-start, all 7 days ───────────
// ⚠️ B2 (plans/83, from plans/82): this used to hardcode SHOW=[1,2,3,4,5] and drop
// Saturday/Sunday despite weekDates already carrying all 7 — fixed by rendering
// `visibleWeekDates(weekDates, visibleDays)` instead of a fixed Mon-Fri slice.
export function WeeklyCalendarExportView({
  sessions,
  title,
  month,
  gymName,
  logoDataUrl,
  logoScale,
  fontScale,
  weekDates,
  visibleDays,
  blockTreatment = DEFAULT_BLOCK_TREATMENT,
  blockContent = DEFAULT_BLOCK_CONTENT,
}) {
  const ls = logoScale || 1
  const fs = fontScale || 1
  const today = new Date()
  const days = visibleWeekDates(weekDates, visibleDays)
  const restLabel = APP_CONFIG.restDayLabel || 'Descanso'
  const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const weekLabel = days.length ? `${fmt(days[0])} – ${fmt(days[days.length - 1])}` : ''
  const cols = `repeat(${Math.max(days.length, 1)},1fr)`
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
            {MONTH_PT[month] + ' ' + days[0]?.getFullYear()}
          </div>
          {title && (
            <div
              style={{
                fontSize: `calc(14px * var(--fs,1))`,
                color: '#444',
                marginTop: '2px',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
              }}
            >
              {title}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: cols,
          background: '#0d0d0d',
          borderBottom: '1px solid var(--a-div)',
          flexShrink: 0,
        }}
      >
        {days.map((date, ci) => {
          const dateNum = date.getDate()
          const inMonth = date.getMonth() === month
          const isToday = date.toDateString() === today.toDateString()
          return (
            <div
              key={ci}
              style={{
                padding: '10px 20px',
                borderRight: ci < days.length - 1 ? '1px solid var(--a-div)' : 'none',
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
                {DAY_PT[date.getDay()]}
              </span>
              <span
                style={{
                  fontSize: `calc(20px * var(--fs,1))`,
                  fontWeight: 900,
                  color: isToday ? 'var(--a-hdr)' : inMonth ? 'var(--a-sub)' : '#333',
                }}
              >
                {dateNum}
              </span>
            </div>
          )
        })}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: cols,
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {days.map((date, ci) => {
          const dateKey = toISO(date)
          const daySessions = sessions[dateKey] || []
          const s = daySessions[0] || null
          return (
            <div
              key={ci}
              style={{
                borderRight: ci < days.length - 1 ? '1px solid var(--a-div)' : 'none',
                padding: '14px 20px',
                background: s ? '#060606' : '#000',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {s ? (
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
                      const exs = bl.exercises?.filter(e => e.name || e.isComplex) || []
                      return (
                        <div
                          key={bl.id}
                          data-fitblock
                          style={{
                            flexShrink: 0,
                            ...blockWrapperStyle(blockTreatment, 'var(--a-hdr)'),
                          }}
                        >
                          <BlockHeader
                            treatment={blockTreatment}
                            hdrColor="var(--a-hdr)"
                            onAccentColor="var(--a-on-accent)"
                            divColor="var(--a-div)"
                            title={blockTitle(bl)}
                            meta={blkMeta(bl)}
                            titleStyle={{
                              fontSize: `calc(12px * var(--fs,1))`,
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '.07em',
                              lineHeight: 1.2,
                            }}
                            metaStyle={{
                              fontSize: `calc(11px * var(--fs,1))`,
                              fontWeight: 900,
                            }}
                            padding="0 0 6px"
                          />
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
                              {blockContent.intensity &&
                                ex.intensity?.mode !== 'cardio' &&
                                fmtIntensity(ex.intensity) && (
                                  <div
                                    style={{
                                      fontSize: `calc(11px * var(--fs,1))`,
                                      color: 'var(--a-int)',
                                      fontWeight: 700,
                                    }}
                                  >
                                    {fmtIntensity(ex.intensity)}
                                  </div>
                                )}
                            </div>
                          ))}
                          {blockContent.notes && bl.notes && (
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
                    color: '#3a3a3a',
                    fontSize: `calc(12px * var(--fs,1))`,
                    textTransform: 'uppercase',
                    letterSpacing: '.1em',
                    marginTop: '8px',
                  }}
                >
                  {restLabel}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── CalendarExportView — 1920×1080 monthly calendar, per-box session names ───
// Decision 3 (plans/83): Mês shows WHICH sessions happened per day, not their
// block detail (that's Semana's job) — each cell is a short list of session
// titles dotted by the session's own box colour (`monthCellSessions`,
// layoutHelpers.js — the ONLY sanctioned read of a session's box tags is
// `sessionBoxIds`, never hand-rolled). Density is the risk here (6×7 cells at
// 1920×1080), so rows past MONTH_CELL_MAX_ROWS collapse into "+N mais" instead of
// shrinking text indefinitely.
// ⚠️ B2 (plans/83, from plans/82): this used to hardcode SHOW_DAYS/CAL_DAY_LABELS
// to Mon-Fri — fixed to all 7, Sunday-start, via ALL_WEEK_DAYS/DAY_PT.
export function CalendarExportView({
  sessions,
  title,
  year,
  month,
  gymName,
  logoDataUrl,
  logoScale,
  fontScale,
  locations,
}) {
  const weeks = getWeeksOfMonth(year, month)
  const monthName = MONTH_PT[month]
  const today = new Date()
  const ls = logoScale || 1
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
          {title && (
            <div
              style={{
                fontSize: `calc(16px * var(--fs,1))`,
                color: '#666',
                marginTop: '4px',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
              }}
            >
              {title}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7,1fr)',
          background: '#0d0d0d',
          borderBottom: '1px solid #1a1a1a',
          flexShrink: 0,
        }}
      >
        {DAY_PT.map((d, i) => (
          <div
            key={d}
            style={{
              padding: '10px 16px',
              fontSize: `calc(16px * var(--fs,1))`,
              fontWeight: 900,
              color: 'var(--a-hdr)',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              borderRight: i < 6 ? '1px solid var(--a-div)' : 'none',
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
        {weeks.map((week, wi) => (
          <div
            key={wi}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7,1fr)',
              flex: 1,
              borderBottom: wi < weeks.length - 1 ? '1px solid #1a1a1a' : 'none',
            }}
          >
            {week.map((date, ci) => {
              const dateKey = toISO(date)
              const inMonth = date.getMonth() === month
              const daySessions = sessions[dateKey] || []
              const isToday = date.toDateString() === today.toDateString()
              const { rows, overflow } = monthCellSessions(daySessions, locations)
              return (
                <div
                  key={ci}
                  style={{
                    borderRight: ci < 6 ? '1px solid var(--a-div)' : 'none',
                    padding: '10px 14px',
                    background: inMonth ? (rows.length ? '#080808' : '#000') : '#030303',
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
                  {inMonth && rows.length > 0 && (
                    <div
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                      data-fitblock
                    >
                      {rows.map(row => (
                        <div
                          key={row.id}
                          style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              width: 7,
                              height: 7,
                              flexShrink: 0,
                              borderRadius: '50%',
                              background: row.color || 'var(--a-sub)',
                            }}
                          />
                          <span
                            style={{
                              fontSize: `calc(13px * var(--fs,1))`,
                              fontWeight: 900,
                              color: '#fff',
                              textTransform: 'uppercase',
                              letterSpacing: '.03em',
                              lineHeight: 1.25,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.title}
                          </span>
                        </div>
                      ))}
                      {overflow > 0 && (
                        <div
                          style={{
                            fontSize: `calc(11px * var(--fs,1))`,
                            color: 'var(--a-sub)',
                            fontWeight: 700,
                          }}
                        >
                          {`+${overflow} mais`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
