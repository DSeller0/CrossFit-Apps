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
import { visibleWeekDates } from './layoutHelpers'
import { blockTitle, DEFAULT_BLOCK_CONTENT } from './blockTreatments'

// Export artefacts — see exportViews.jsx's file header for the `--a-*` contract these
// share. `MobileWeeklyExportView`'s `variant` prop is GONE (plans/82 constraint): its two
// call sites ("Eagles"/"MegaMan") differed only by colour, which is now `--a-*` on both,
// so there is exactly one Semana mobile view.
//
// Blocos treatment (plans/83 T5's 5 card treatments) is deliberately NOT wired into the
// mobile views — MobileEagles/MobileMegaMan keep their own distinct block-header look
// (that IS the structural difference the b1-inherited decision keeps them apart for; a
// shared BlockHeader would erase it). Content toggles (Intensidade/carga · Observação do
// bloco) are content-level facts, not structural, so they DO apply everywhere below.

// ── MobileBlock — shared block renderer for both Dia mobile artefacts ───────────────
function MobileBlock({ bl, fs, blockContent = DEFAULT_BLOCK_CONTENT }) {
  const f = fs || 1
  const pad = Math.round(20 * f)
  const title = blockTitle(bl)
  const meta = blkMeta(bl)
  return (
    <div style={{ borderBottom: '1px solid var(--a-div)' }} data-fitblock>
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
                      {blockContent.intensity && pl.loadStr && (
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
            const ins =
              blockContent.intensity && ex.intensity?.mode !== 'cardio'
                ? fmtIntensity(ex.intensity)
                : null
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
        {blockContent.notes && bl.notes && (
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

// The header title caption + Rodapé footer are the same shape across every mobile
// artefact (T7 — per-format Título, global Rodapé, mobile-only) — one small pair of
// helpers instead of 3 copies.
function MobileTitleCaption({ title, f }) {
  if (!title) return null
  return (
    <div
      style={{
        fontSize: mfs(13, f),
        color: 'var(--a-sub)',
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        marginTop: mfs(2, f),
        fontFamily: GF(),
      }}
    >
      {title}
    </div>
  )
}

function MobileFooter({ footer, f, pad }) {
  if (!footer) return null
  return (
    <div
      style={{
        background: 'var(--a-bg)',
        padding: `${Math.round(14 * f)}px ${pad}px`,
        fontSize: mfs(13, f),
        color: 'var(--a-sub)',
        textAlign: 'center',
        letterSpacing: '.08em',
        fontFamily: GF(),
      }}
    >
      {footer}
    </div>
  )
}

// ── MobileEaglesExportView ────────────────────────────────────────────────────
export function MobileEaglesExportView({
  sessions,
  title,
  footer,
  selectedDate,
  currentWeekDates,
  gymName,
  logoDataUrl,
  logoScale,
  fontScale,
  blockContent = DEFAULT_BLOCK_CONTENT,
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
          <MobileTitleCaption title={title} f={f} />
        </div>
      </div>
      {(s.blocks || []).map(bl => (
        <MobileBlock key={bl.id} bl={bl} fs={f} blockContent={blockContent} />
      ))}
      <MobileFooter footer={footer} f={f} pad={pad} />
    </div>
  )
}

// ── MobileMegaManExportView ───────────────────────────────────────────────────
// ⚠️ Kept as its own file/component pair, NOT collapsed into MobileEagles — measured
// structurally different (415 vs 274 raw lines, 6 vs 2 borderBottom, 4 vs 2 borderRadius
// before b1; b2 (plans/83) names the pair a "modelo" choice on the Dia mobile format —
// see AparenciaPanel's LayoutPanel — rather than deleting either.
export function MobileMegaManExportView({
  sessions,
  title,
  footer,
  selectedDate,
  currentWeekDates,
  gymName,
  logoDataUrl,
  logoScale,
  fontScale,
  blockContent = DEFAULT_BLOCK_CONTENT,
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
          <MobileTitleCaption title={title} f={f} />
        </div>
      </div>
      {(s.blocks || []).map(bl => (
        <MegaManBlock key={bl.id} bl={bl} fs={f} blockContent={blockContent} />
      ))}
      <MobileFooter footer={footer} f={f} pad={pad} />
    </div>
  )
}

// MegaMan's block treatment differs from MobileBlock's (a solid meta chip beside the
// title, not a second line) — that IS the structural difference the comment above
// names, so it keeps its own renderer rather than sharing MobileBlock.
function MegaManBlock({ bl, fs, blockContent = DEFAULT_BLOCK_CONTENT }) {
  const f = fs || 1
  const pad = Math.round(20 * f)
  const title = blockTitle(bl)
  const meta = blkMeta(bl)
  return (
    <div style={{ borderBottom: '1px solid var(--a-div)' }} data-fitblock>
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
                      {blockContent.intensity && pl.loadStr && (
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
            const ins =
              blockContent.intensity && ex.intensity?.mode !== 'cardio'
                ? fmtIntensity(ex.intensity)
                : null
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
        {blockContent.notes && bl.notes && (
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
function MobileWeeklySingleDay({ date, sessions, f, blockContent = DEFAULT_BLOCK_CONTENT }) {
  const dateKey = toISO(date)
  const s = (sessions[dateKey] || [])[0] || null
  const dow = DAY_PT[date.getDay()]
  const dateNum = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
  const restLabel = APP_CONFIG.restDayLabel || 'Descanso'
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
            const title = blockTitle(bl)
            const meta = blkMeta(bl)
            const exNames = (bl.exercises || []).filter(e => e.name || e.isComplex)
            return (
              <div key={bl.id} data-fitblock>
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
                  const ins =
                    blockContent.intensity && ex.intensity?.mode !== 'cardio'
                      ? fmtIntensity(ex.intensity)
                      : null
                  return (
                    <div
                      key={ex.id}
                      style={{
                        padding: `${Math.round(5 * f)}px ${pad}px`,
                        borderBottom: '1px solid var(--a-div)',
                      }}
                    >
                      <div
                        style={{
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
                      {ins && (
                        <div
                          style={{
                            fontSize: mfs(11, f),
                            color: 'var(--a-int)',
                            fontWeight: 700,
                            fontFamily,
                          }}
                        >
                          {ins}
                        </div>
                      )}
                    </div>
                  )
                })}
                {blockContent.notes && bl.notes && (
                  <div
                    style={{
                      padding: `${Math.round(5 * f)}px ${pad}px`,
                      fontSize: mfs(11, f),
                      color: 'var(--a-note)',
                      fontStyle: 'italic',
                      fontFamily,
                    }}
                  >
                    {bl.notes}
                  </div>
                )}
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
// ⚠️ B2-adjacent (plans/83, T6): reordered from Monday-first (`[1,2,3,4,5,6,0]`) to
// Sunday-first per decision 2, and now respects the same day picker Semana uses
// (`visibleWeekDates`) instead of always rendering all 7.
export function MobileWeeklyExportView({
  sessions,
  title,
  footer,
  gymName,
  logoDataUrl,
  logoScale,
  fontScale,
  weekDates,
  visibleDays,
  blockContent = DEFAULT_BLOCK_CONTENT,
}) {
  const f = fontScale || 1
  const ls = logoScale || 1
  const pad = Math.round(22 * f)
  const fontFamily = GF()
  const days = visibleWeekDates(weekDates, visibleDays)
  const sun = weekDates[0]
  const sat = weekDates[6]
  const weekLabel = `${sun.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} – ${sat.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
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
          <MobileTitleCaption title={title} f={f} />
        </div>
      </div>
      {days.map((date, i) => (
        <MobileWeeklySingleDay
          key={i}
          date={date}
          sessions={sessions}
          f={f}
          blockContent={blockContent}
        />
      ))}
      <MobileFooter footer={footer} f={f} pad={pad} />
    </div>
  )
}
