import { GF } from '../../../utils/config'
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

// Export artefacts — see exportViews.jsx's file header for the `--a-*` contract these
// share. `MobileWeeklyExportView`'s `variant` prop is GONE (plans/82 constraint): its two
// call sites ("Eagles"/"MegaMan") differed only by colour, which is now `--a-*` on both,
// so there is exactly one Semana mobile view.

// ── MobileBlock — shared block renderer for both Dia mobile artefacts ───────────────
function MobileBlock({ bl, fs }) {
  const f = fs || 1
  const pad = Math.round(20 * f)
  const _lbl = bl.label && bl.label !== '-' ? bl.label : null
  const _typ = bl.type && bl.type !== '-' ? bl.type : null
  const title = _lbl && _typ && _lbl !== _typ ? `${_lbl} · ${_typ}` : _lbl || _typ || ''
  const meta = blkMeta(bl)
  return (
    <div style={{ borderBottom: '1px solid var(--a-div)' }}>
      <div
        style={{
          background: 'color-mix(in srgb, var(--a-hdr) 12%, transparent)',
          padding: `${Math.round(10 * f)}px ${pad}px ${Math.round(6 * f)}px`,
          borderTop: '2px solid var(--a-hdr)',
        }}
      >
        <div
          style={{
            fontSize: mfs(18, f),
            fontWeight: 900,
            color: 'var(--a-hdr)',
            textTransform: 'uppercase',
            letterSpacing: '.07em',
            fontFamily: GF(),
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        {meta && (
          <div
            style={{
              fontSize: mfs(12, f),
              color: 'var(--a-hdr)',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginTop: mfs(2, f),
              fontFamily: GF(),
            }}
          >
            {meta}
          </div>
        )}
      </div>
      <div
        style={{
          background: 'var(--a-bg)',
          padding: `${Math.round(4 * f)}px ${pad}px ${Math.round(14 * f)}px`,
        }}
      >
        {(bl.exercises || [])
          .filter(e => e.name || e.isComplex)
          .map(ex => {
            if (ex.isComplex) {
              const movs = ex.complexMovements || []
              return (
                <div
                  key={ex.id}
                  style={{
                    padding: `${Math.round(6 * f)}px 0`,
                    borderBottom: '1px solid var(--a-div)',
                  }}
                >
                  <div
                    style={{
                      fontSize: mfs(17, f),
                      fontWeight: 900,
                      color: 'var(--a-name)',
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      fontFamily: GF(),
                      lineHeight: 1.2,
                    }}
                  >
                    {complexLine(ex)}
                  </div>
                  {movs.map((m, mi) => (
                    <div
                      key={mi}
                      style={{
                        fontSize: mfs(13, f),
                        color: 'var(--a-note)',
                        fontFamily: GF(),
                      }}
                    >
                      {`· ${[m.reps, m.name].filter(Boolean).join(' ')}`}
                    </div>
                  ))}
                  {ex.note ? (
                    <div
                      key="n"
                      style={{
                        fontSize: mfs(12, f),
                        color: 'var(--a-note)',
                        fontStyle: 'italic',
                        marginTop: mfs(2, f),
                      }}
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
              if (!progLines || !progLines.length)
                return (
                  <div
                    key={ex.id}
                    style={{
                      padding: `${Math.round(6 * f)}px 0`,
                      borderBottom: '1px solid var(--a-div)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: mfs(17, f),
                        fontWeight: 900,
                        color: 'var(--a-name)',
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                        fontFamily: GF(),
                        lineHeight: 1.2,
                      }}
                    >
                      {line}
                    </div>
                  </div>
                )
              return (
                <div
                  key={ex.id}
                  style={{
                    padding: `${Math.round(6 * f)}px 0`,
                    borderBottom: '1px solid var(--a-div)',
                  }}
                >
                  {progLines.map((pl, si) => (
                    <div key={si} style={{ marginTop: si > 0 ? mfs(4, f) : '0' }}>
                      <div
                        style={{
                          fontSize: mfs(17, f),
                          fontWeight: 900,
                          color: 'var(--a-name)',
                          textTransform: 'uppercase',
                          letterSpacing: '.04em',
                          fontFamily: GF(),
                          lineHeight: 1.2,
                        }}
                      >
                        {pl.nameLine}
                      </div>
                      {pl.loadStr && (
                        <div
                          style={{
                            display: 'inline-block',
                            fontSize: mfs(13, f),
                            fontWeight: 700,
                            color: 'var(--a-int)',
                            background: 'rgba(0,0,0,0.35)',
                            border: '1px solid color-mix(in srgb, var(--a-int) 25%, transparent)',
                            borderRadius: '3px',
                            padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`,
                            marginTop: mfs(3, f),
                            fontFamily: GF(),
                          }}
                        >
                          {pl.loadStr}
                        </div>
                      )}
                    </div>
                  ))}
                  {ex.note && (
                    <div
                      style={{
                        fontSize: mfs(12, f),
                        color: 'var(--a-note)',
                        fontStyle: 'italic',
                        marginTop: mfs(2, f),
                      }}
                    >
                      {ex.note}
                    </div>
                  )}
                </div>
              )
            }
            const ins = ex.intensity?.mode !== 'cardio' ? fmtIntensity(ex.intensity) : null
            return (
              <div
                key={ex.id}
                style={{
                  padding: `${Math.round(6 * f)}px 0`,
                  borderBottom: '1px solid var(--a-div)',
                }}
              >
                <div
                  style={{
                    fontSize: mfs(17, f),
                    fontWeight: 900,
                    color: 'var(--a-name)',
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                    fontFamily: GF(),
                    lineHeight: 1.2,
                  }}
                >
                  {line}
                </div>
                {ins && (
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: mfs(13, f),
                      fontWeight: 700,
                      color: 'var(--a-int)',
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid color-mix(in srgb, var(--a-int) 25%, transparent)',
                      borderRadius: '3px',
                      padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`,
                      marginTop: mfs(3, f),
                      fontFamily: GF(),
                    }}
                  >
                    {ins}
                  </div>
                )}
                {ex.note && (
                  <div
                    style={{
                      fontSize: mfs(12, f),
                      color: 'var(--a-note)',
                      fontStyle: 'italic',
                      marginTop: mfs(2, f),
                    }}
                  >
                    {ex.note}
                  </div>
                )}
              </div>
            )
          })}
        {bl.notes && (
          <div
            style={{
              fontSize: mfs(12, f),
              color: 'var(--a-note)',
              fontStyle: 'italic',
              marginTop: mfs(5, f),
              paddingTop: mfs(5, f),
              borderTop: '1px solid var(--a-div)',
            }}
          >
            {bl.notes}
          </div>
        )}
      </div>
    </div>
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
}) {
  const found = buildMobileSession(sessions, selectedDate, currentWeekDates)
  const f = fontScale || 1
  const pad = Math.round(28 * f)
  if (!found)
    return (
      <div
        style={{
          background: 'var(--a-bg)',
          color: '#555',
          padding: '40px',
          textAlign: 'center',
          fontFamily: GF(),
        }}
      >
        —
      </div>
    )
  const { s, date } = found
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()
  const dateNum = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const ls = logoScale || 1
  return (
    <div style={{ background: 'var(--a-bg)', width: '1080px', fontFamily: GF() }}>
      <div
        style={{
          background: 'var(--a-bg)',
          padding: `${Math.round(22 * f)}px ${pad}px ${Math.round(18 * f)}px`,
          borderBottom: '2px solid var(--a-hdr)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: mfs(16, f) }}>
          {logoDataUrl && (
            <img
              src={logoDataUrl}
              style={{
                width: `${Math.round(56 * ls)}px`,
                height: `${Math.round(56 * ls)}px`,
                objectFit: 'contain',
                borderRadius: '4px',
              }}
            />
          )}
          <span
            style={{
              fontSize: mfs(30, f),
              fontWeight: 900,
              color: 'var(--a-name)',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
            }}
          >
            {gymName || 'Cone'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: mfs(18, f),
              color: 'var(--a-hdr)',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            }}
          >
            {`${weekday} · ${dateNum}`}
          </div>
          {s.mainTraining && (
            <div
              style={{
                fontSize: mfs(13, f),
                color: 'var(--a-sub)',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                marginTop: mfs(2, f),
              }}
            >
              {s.mainTraining}
            </div>
          )}
        </div>
      </div>
      {(s.blocks || []).map(bl => (
        <MobileBlock key={bl.id} bl={bl} fs={f} />
      ))}
    </div>
  )
}

// ── MobileMegaManExportView ───────────────────────────────────────────────────
// ⚠️ Kept as its own file/component pair, NOT collapsed into MobileEagles — measured
// structurally different (415 vs 274 raw lines, 6 vs 2 borderBottom, 4 vs 2 borderRadius
// before this pass; plans/83 T.o.c. decides what to name the two Dia mobile "modelos").
// Only the colour distinction (the one thing that WAS identical) is gone here.
export function MobileMegaManExportView({
  sessions,
  selectedDate,
  currentWeekDates,
  gymName,
  logoDataUrl,
  logoScale,
  fontScale,
}) {
  const found = buildMobileSession(sessions, selectedDate, currentWeekDates)
  const f = fontScale || 1
  const pad = Math.round(28 * f)
  if (!found)
    return (
      <div
        style={{
          background: 'var(--a-bg)',
          color: 'var(--a-note)',
          padding: '40px',
          textAlign: 'center',
          fontFamily: GF(),
        }}
      >
        —
      </div>
    )
  const { s, date } = found
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()
  const dateNum = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const ls = logoScale || 1
  return (
    <div style={{ background: 'var(--a-bg)', width: '1080px', fontFamily: GF() }}>
      <div
        style={{
          background: 'var(--a-bg)',
          padding: `${Math.round(22 * f)}px ${pad}px ${Math.round(18 * f)}px`,
          borderBottom: `${Math.max(2, Math.round(3 * f))}px solid var(--a-hdr)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: mfs(16, f) }}>
          {logoDataUrl && (
            <img
              src={logoDataUrl}
              style={{
                width: `${Math.round(56 * ls)}px`,
                height: `${Math.round(56 * ls)}px`,
                objectFit: 'contain',
                borderRadius: '4px',
              }}
            />
          )}
          <span
            style={{
              fontSize: mfs(30, f),
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
              fontSize: mfs(18, f),
              color: 'var(--a-hdr)',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            }}
          >
            {`${weekday} · ${dateNum}`}
          </div>
          {s.mainTraining && (
            <div
              style={{
                fontSize: mfs(12, f),
                color: 'var(--a-sub)',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                marginTop: mfs(2, f),
              }}
            >
              {s.mainTraining}
            </div>
          )}
        </div>
      </div>
      {(s.blocks || []).map(bl => (
        <MegaManBlock key={bl.id} bl={bl} fs={f} />
      ))}
    </div>
  )
}

// MegaMan's block treatment differs from MobileBlock's (a solid meta chip beside the
// title, not a second line) — that IS the structural difference the comment above
// names, so it keeps its own renderer rather than sharing MobileBlock.
function MegaManBlock({ bl, fs }) {
  const f = fs || 1
  const pad = Math.round(20 * f)
  const _lbl = bl.label && bl.label !== '-' ? bl.label : null
  const _typ = bl.type && bl.type !== '-' ? bl.type : null
  const title = _lbl && _typ && _lbl !== _typ ? `${_lbl} · ${_typ}` : _lbl || _typ || ''
  const meta = blkMeta(bl)
  return (
    <div style={{ borderBottom: '1px solid var(--a-div)' }}>
      <div
        style={{
          background: 'color-mix(in srgb, var(--a-hdr) 12%, transparent)',
          padding: `${Math.round(10 * f)}px ${pad}px`,
          borderTop: `${Math.max(2, Math.round(3 * f))}px solid var(--a-hdr)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontSize: mfs(16, f),
            fontWeight: 900,
            color: 'var(--a-hdr)',
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            fontFamily: GF(),
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        {meta && (
          <span
            style={{
              fontSize: mfs(12, f),
              fontWeight: 900,
              color: 'var(--a-on-accent)',
              background: 'var(--a-hdr)',
              padding: `${Math.round(3 * f)}px ${Math.round(10 * f)}px`,
              borderRadius: '2px',
              fontFamily: GF(),
              whiteSpace: 'nowrap',
            }}
          >
            {meta}
          </span>
        )}
      </div>
      <div
        style={{
          background: 'var(--a-bg)',
          padding: `${Math.round(8 * f)}px ${pad}px ${Math.round(14 * f)}px`,
        }}
      >
        {(bl.exercises || [])
          .filter(e => e.name || e.isComplex)
          .map(ex => {
            if (ex.isComplex) {
              const movs = ex.complexMovements || []
              return (
                <div
                  key={ex.id}
                  style={{
                    padding: `${Math.round(6 * f)}px 0`,
                    borderBottom: '1px solid var(--a-div)',
                  }}
                >
                  <div
                    style={{
                      fontSize: mfs(17, f),
                      fontWeight: 900,
                      color: 'var(--a-name)',
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      fontFamily: GF(),
                      lineHeight: 1.2,
                    }}
                  >
                    {complexLine(ex)}
                  </div>
                  {movs.map((m, mi) => (
                    <div
                      key={mi}
                      style={{
                        fontSize: mfs(13, f),
                        color: 'var(--a-note)',
                        fontFamily: GF(),
                      }}
                    >
                      {`· ${[m.reps, m.name].filter(Boolean).join(' ')}`}
                    </div>
                  ))}
                  {ex.note ? (
                    <div
                      key="n"
                      style={{
                        fontSize: mfs(11, f),
                        color: 'var(--a-note)',
                        fontStyle: 'italic',
                        marginTop: mfs(2, f),
                      }}
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
              if (!progLines || !progLines.length)
                return (
                  <div
                    key={ex.id}
                    style={{
                      padding: `${Math.round(6 * f)}px 0`,
                      borderBottom: '1px solid var(--a-div)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: mfs(17, f),
                        fontWeight: 900,
                        color: 'var(--a-name)',
                        textTransform: 'uppercase',
                        letterSpacing: '.05em',
                        fontFamily: GF(),
                        lineHeight: 1.2,
                      }}
                    >
                      {line}
                    </div>
                  </div>
                )
              return (
                <div
                  key={ex.id}
                  style={{
                    padding: `${Math.round(6 * f)}px 0`,
                    borderBottom: '1px solid var(--a-div)',
                  }}
                >
                  {progLines.map((pl, si) => (
                    <div key={si} style={{ marginTop: si > 0 ? mfs(4, f) : '0' }}>
                      <div
                        style={{
                          fontSize: mfs(17, f),
                          fontWeight: 900,
                          color: 'var(--a-name)',
                          textTransform: 'uppercase',
                          letterSpacing: '.05em',
                          fontFamily: GF(),
                          lineHeight: 1.2,
                        }}
                      >
                        {pl.nameLine}
                      </div>
                      {pl.loadStr && (
                        <div
                          style={{
                            display: 'inline-block',
                            fontSize: mfs(13, f),
                            fontWeight: 700,
                            color: 'var(--a-int)',
                            background: 'rgba(0,0,0,0.35)',
                            border: '1px solid color-mix(in srgb, var(--a-int) 25%, transparent)',
                            borderRadius: '3px',
                            padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`,
                            marginTop: mfs(3, f),
                            fontFamily: GF(),
                          }}
                        >
                          {pl.loadStr}
                        </div>
                      )}
                    </div>
                  ))}
                  {ex.note && (
                    <div
                      style={{
                        fontSize: mfs(11, f),
                        color: 'var(--a-note)',
                        fontStyle: 'italic',
                        marginTop: mfs(2, f),
                      }}
                    >
                      {ex.note}
                    </div>
                  )}
                </div>
              )
            }
            const ins = ex.intensity?.mode !== 'cardio' ? fmtIntensity(ex.intensity) : null
            return (
              <div
                key={ex.id}
                style={{
                  padding: `${Math.round(6 * f)}px 0`,
                  borderBottom: '1px solid var(--a-div)',
                }}
              >
                <div
                  style={{
                    fontSize: mfs(17, f),
                    fontWeight: 900,
                    color: 'var(--a-name)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em',
                    fontFamily: GF(),
                    lineHeight: 1.2,
                  }}
                >
                  {line}
                </div>
                {ins && (
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: mfs(13, f),
                      fontWeight: 700,
                      color: 'var(--a-int)',
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid color-mix(in srgb, var(--a-int) 25%, transparent)',
                      borderRadius: '3px',
                      padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`,
                      marginTop: mfs(3, f),
                      fontFamily: GF(),
                    }}
                  >
                    {ins}
                  </div>
                )}
                {ex.note && (
                  <div
                    style={{
                      fontSize: mfs(11, f),
                      color: 'var(--a-note)',
                      fontStyle: 'italic',
                      marginTop: mfs(2, f),
                    }}
                  >
                    {ex.note}
                  </div>
                )}
              </div>
            )
          })}
        {bl.notes && (
          <div
            style={{
              fontSize: mfs(12, f),
              color: 'var(--a-note)',
              marginTop: mfs(5, f),
              paddingTop: mfs(5, f),
              borderTop: '1px solid var(--a-div)',
              fontFamily: GF(),
            }}
          >
            {bl.notes}
          </div>
        )}
      </div>
    </div>
  )
}

// ── MobileWeeklySingleDay ─────────────────────────────────────────────────────
function MobileWeeklySingleDay({ date, sessions, f }) {
  const dateKey = toISO(date)
  const s = (sessions[dateKey] || [])[0] || null
  const dow = DAY_PT[date.getDay()]
  const dateNum = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
  const restLabel = 'Descanso'
  const pad = Math.round(18 * f)
  const fontFamily = GF()
  return (
    <div>
      <div
        style={{
          background: 'var(--a-bg)',
          padding: `${Math.round(8 * f)}px ${pad}px`,
          borderTop: `${Math.max(2, Math.round(3 * f))}px solid var(--a-hdr)`,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: mfs(15, f),
            fontWeight: 900,
            color: 'var(--a-hdr)',
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            fontFamily,
          }}
        >
          {dow}
        </span>
        <span
          style={{
            fontSize: mfs(12, f),
            fontWeight: 700,
            color: 'var(--a-sub)',
            fontFamily,
          }}
        >
          {dateNum}
        </span>
      </div>
      {s ? (
        <div style={{ background: 'var(--a-bg)' }}>
          {(s.blocks || []).map(bl => {
            const _lbl = bl.label && bl.label !== '-' ? bl.label : null
            const _typ = bl.type && bl.type !== '-' ? bl.type : null
            const title = _lbl && _typ && _lbl !== _typ ? `${_lbl} · ${_typ}` : _lbl || _typ || ''
            const meta = blkMeta(bl)
            const exNames = (bl.exercises || []).filter(e => e.name || e.isComplex)
            return (
              <div key={bl.id}>
                <div
                  style={{
                    background: 'color-mix(in srgb, var(--a-hdr) 12%, transparent)',
                    padding: `${Math.round(6 * f)}px ${pad}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: mfs(13, f),
                      fontWeight: 900,
                      color: 'var(--a-hdr)',
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                      fontFamily,
                    }}
                  >
                    {title}
                  </span>
                  {meta && (
                    <span
                      style={{
                        fontSize: mfs(11, f),
                        fontWeight: 900,
                        color: 'var(--a-on-accent)',
                        background: 'var(--a-hdr)',
                        padding: `${Math.round(2 * f)}px ${Math.round(7 * f)}px`,
                        borderRadius: '2px',
                        fontFamily,
                      }}
                    >
                      {meta}
                    </span>
                  )}
                </div>
                {exNames.map(ex => {
                  const line = ex.isComplex ? complexLine(ex) : exLine(ex)
                  return (
                    <div
                      key={ex.id}
                      style={{
                        padding: `${Math.round(5 * f)}px ${pad}px`,
                        borderBottom: '1px solid var(--a-div)',
                        fontSize: mfs(14, f),
                        fontWeight: 900,
                        color: '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                        fontFamily,
                        lineHeight: 1.2,
                      }}
                    >
                      {line}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      ) : (
        <div
          style={{
            background: 'var(--a-bg)',
            padding: `${Math.round(10 * f)}px ${pad}px`,
            fontSize: mfs(12, f),
            color: '#333',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            fontFamily,
          }}
        >
          {`— ${restLabel}`}
        </div>
      )}
    </div>
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
}) {
  const f = fontScale || 1
  const ls = logoScale || 1
  const pad = Math.round(22 * f)
  const fontFamily = GF()
  const orderedDays = [1, 2, 3, 4, 5, 6, 0].map(i => weekDates[i])
  const mon = weekDates[1]
  const sun = weekDates[0]
  const weekLabel = `${mon.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} – ${sun.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
  const midDate = weekDates[3]
  return (
    <div style={{ background: 'var(--a-bg)', width: '1080px', fontFamily }}>
      <div
        style={{
          background: 'var(--a-bg)',
          padding: `${Math.round(22 * f)}px ${pad}px ${Math.round(16 * f)}px`,
          borderBottom: `${Math.max(2, Math.round(3 * f))}px solid var(--a-hdr)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: mfs(14, f) }}>
          {logoDataUrl && (
            <img
              src={logoDataUrl}
              style={{
                width: `${Math.round(48 * ls)}px`,
                height: `${Math.round(48 * ls)}px`,
                objectFit: 'contain',
                borderRadius: '4px',
              }}
            />
          )}
          <span
            style={{
              fontSize: mfs(28, f),
              fontWeight: 900,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              fontFamily,
            }}
          >
            {gymName || 'Cone'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: mfs(16, f),
              fontWeight: 900,
              color: 'var(--a-hdr)',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              fontFamily,
            }}
          >
            {weekLabel}
          </div>
          <div
            style={{
              fontSize: mfs(12, f),
              color: 'var(--a-sub)',
              marginTop: mfs(2, f),
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              fontFamily,
            }}
          >
            {MONTH_PT[midDate.getMonth()] + ' ' + midDate.getFullYear()}
          </div>
        </div>
      </div>
      {orderedDays.map((date, i) => (
        <MobileWeeklySingleDay key={i} date={date} sessions={sessions} f={f} />
      ))}
    </div>
  )
}
