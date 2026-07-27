import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import QRCode from 'qrcode'
import {
  blkLabel,
  blkColor,
  isWodBlock,
  rankResults,
  perfStr,
  fmtSecs,
  MODE_LBL,
  blkMeta,
  goalStr,
} from '../lib/wod.js'
import { DAY_PT_TITLE, MONTH_PT_SHORT } from '../lib/week.js'
import { sessName } from '../lib/sessions.js'
import { ExerciseList } from '../shared/ExerciseList.jsx'
import s from './TV.module.css'

// ── Constants ─────────────────────────────────────────────────────────────────
const RING_R = 115,
  RING_C = +(2 * Math.PI * RING_R).toFixed(1)

// column-major reorder: fills top→bottom first, then left→right
function columnMajor(items, cols) {
  const rows = Math.ceil(items.length / cols)
  const out = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = c * rows + r
      if (idx < items.length) out.push(items[idx])
    }
  }
  return out
}

// ── Timer helpers ─────────────────────────────────────────────────────────────
function elapsedSecs(tv) {
  if (!tv?.timer_started_at) return tv?.timer_paused_elapsed ?? 0
  return (Date.now() - tv.timer_started_at) / 1000 + (tv?.timer_paused_elapsed ?? 0)
}
function ringProg(e, cap, bt) {
  if (bt === 'AMRAP') return cap ? Math.max(0, (cap - e) / cap) : 1
  if (bt === 'EMOM') return Math.max(0, (60 - (e % 60)) / 60)
  return cap ? Math.min(1, e / cap) : Math.min(1, e / 1800)
}
function ringCol(e, cap, bt) {
  const countdown = bt === 'AMRAP' || bt === 'EMOM'
  const rem = countdown ? ringProg(e, cap, bt) : cap ? (cap - e) / cap : 1
  if (rem > 0.5) return '#48b860'
  if (rem > 0.2) return '#d8a840'
  return '#c84038'
}
function fmt(sec) {
  return fmtSecs(Math.max(0, Math.floor(sec)))
}

// QR canvas can't take a CSS var, so read the live theme's tokens. --cream and --bg
// always contrast (text vs page background) in every theme, so dark-on-light on light
// themes / light-on-dark on dark themes — scannable both ways. Hardcoding cream fg on a
// transparent bg (the old behaviour) went near-white-on-light and stopped scanning (#53).
function qrColors() {
  const cs = getComputedStyle(document.documentElement)
  return {
    dark: cs.getPropertyValue('--cream').trim() || '#f0e8d0',
    light: cs.getPropertyValue('--bg').trim() || '#0d0b09',
  }
}
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_PT_TITLE[d.getDay()]}, ${d.getDate()} ${MONTH_PT_SHORT[d.getMonth()]}`
}

// ── Shared: mini QR footer for WOD + Timer slides ─────────────────────────────
function QrFooter({ dateKey, sessId, classId }) {
  const [qrUrl, setQrUrl] = useState('')
  const base = `${window.location.origin}/CrossFit-Apps/schedule.html?date=${dateKey}&session=${sessId}&from=tv`
  const url = classId ? `${base}&checkin=${classId}` : base
  useEffect(() => {
    if (!dateKey || !sessId) return
    QRCode.toDataURL(url, { width: 160, margin: 1, color: qrColors() })
      .then(setQrUrl)
      .catch(() => {})
  }, [url])
  if (!dateKey || !sessId) return null
  return (
    <div className={s.qrFooter}>
      {qrUrl && <img src={qrUrl} alt="QR" className={s.qrFooterImg} />}
      <span className={s.qrFooterText}>
        {classId ? 'Escaneie para fazer check-in' : 'Escaneie para registrar resultado'}
      </span>
    </div>
  )
}

// ── Slide: WOD ────────────────────────────────────────────────────────────────
export function WodSlide({ sessions, tv, gymName, classExecs, athletes }) {
  const gridRef = useRef(null)

  const dayS = sessions?.[tv?.date_key] || []
  const sess = dayS.find(x => x.id === tv?.session_id)

  const blocks = sess
    ? (sess.blocks || []).filter(bl => bl.exercises?.length || bl.stations?.length)
    : []
  const cols = blocks.length > 3 ? 2 : 1
  const ordered = columnMajor(blocks, cols)
  // 2·A (#53): with ≤2 blocks a fixed-size WOD leaves the wall half-empty. Render those
  // big (large ExerciseList + badge) and vertically centered; the scale-down effect below
  // still caps a rare long single block so it can't overflow.
  const few = blocks.length <= 2

  const activeClass = (classExecs || []).find(c => c.id === tv?.class_id && !c.reset_at)
  const groups = activeClass?.groups || []
  const groupPositions = tv?.group_positions || {}

  // Auto-scale grid to fit available height (prevents overflow when groups add chips)
  useLayoutEffect(() => {
    const el = gridRef.current
    if (!el) return
    el.style.transform = ''
    const parent = el.parentElement
    if (!parent) return
    const avail = parent.clientHeight
    const needed = el.scrollHeight
    if (needed > avail) {
      el.style.transformOrigin = 'top center'
      el.style.transform = `scale(${(avail / needed) * 0.98})`
    }
  })

  if (!sess)
    return (
      <div className={s.empty}>
        <i className="ti ti-calendar-off" /> Nenhuma sessão selecionada
      </div>
    )

  return (
    <div className={s.wodSlide}>
      <div className={s.wodHdr}>
        <div className={s.wodHdrLeft}>
          {gymName && <div className={s.wodGym}>{gymName}</div>}
          <div className={s.wodSessName}>{sessName(sess, tv.date_key)}</div>
        </div>
        <div className={s.wodDate}>{fmtDate(tv.date_key)}</div>
      </div>

      <div className={s.wodBlocksOuter}>
        <div
          ref={gridRef}
          className={`${s.wodBlocks}${few ? ' ' + s.wodBlocksFew : ''}`}
          style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}
        >
          {ordered.map(bl => (
            <BlockCard
              key={bl.id}
              bl={bl}
              groups={groups}
              groupPositions={groupPositions}
              athletes={athletes}
              big={few}
            />
          ))}
        </div>
      </div>

      {tv?.show_qr !== false && (
        <QrFooter dateKey={tv.date_key} sessId={tv.session_id} classId={tv?.class_id} />
      )}
    </div>
  )
}

export function BlockCard({ bl, groups, groupPositions, athletes, isActive, big }) {
  const groupsHere = (groups || []).filter(g => (groupPositions || {})[g.id] === bl.id)
  // Group color takes priority over block-type color when a group is assigned here
  const color = groupsHere.length > 0 ? groupsHere[0].color : blkColor(bl)
  const label = blkLabel(bl)
  // Estações intentionally flattens stations into one list — glanceable wall display.
  // Schedule.jsx keeps station structure as the canonical detailed view (#17, decision recorded in BACKLOG.md).
  const exes =
    bl.type === 'Estações'
      ? (bl.stations || []).flatMap(st => st.exercises || [])
      : bl.exercises || []
  const meta = blkMeta(bl)
  const goal = goalStr(bl)

  return (
    <div
      className={`${s.blockCard}${big ? ' ' + s.blockCardBig : ''}`}
      style={{ borderLeftColor: color }}
    >
      <div className={s.blockCardHdr}>
        <span className={s.blockBadge} style={{ background: color + '22', color }}>
          {label}
        </span>
        {isActive && <span className={s.timerBlockLiveBadge}>AO VIVO</span>}
        {meta && <span className={s.blockMeta}>{meta}</span>}
        {goal && <span className={s.blockGoal}>Meta {goal}</span>}
      </div>
      <ExerciseList exercises={exes} color={color} size={big ? 'large' : undefined} />
      {bl.notes && <div className={s.blockNote}>{bl.notes}</div>}
      {groupsHere.length > 0 && (
        <div className={s.blockGroups}>
          {groupsHere.map(g => {
            const names = [
              ...(g.athleteIds || [])
                .map(id => (athletes || []).find(a => a.id === id)?.name)
                .filter(Boolean),
              ...(g.anonNames || []),
            ]
            return (
              <div
                key={g.id}
                className={s.blockGroupChip}
                style={{ borderLeftColor: g.color, color: g.color }}
              >
                <span className={s.blockGroupName}>{g.name}</span>
                {names.length > 0 && (
                  <span className={s.blockGroupAthletes}>{names.join(' · ')}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Slide: Timer (WOD + countdown ring) ──────────────────────────────────────
export function TimerSlide({ tv, sessions, classExecs, athletes }) {
  const [elapsed, setElapsed] = useState(() => elapsedSecs(tv))
  const tickRef = useRef(null)
  const tvRef = useRef(tv)
  tvRef.current = tv

  useEffect(() => {
    clearInterval(tickRef.current)
    setElapsed(elapsedSecs(tv))
    const restUntilVal = tv?.rotation_rest_until || 0
    const isResting = restUntilVal > Date.now()
    if (tv?.timer_started_at || isResting) {
      tickRef.current = setInterval(() => setElapsed(elapsedSecs(tvRef.current)), 250)
    }
    return () => clearInterval(tickRef.current)
  }, [tv?.timer_started_at, tv?.timer_paused_elapsed, tv?.rotation_rest_until])

  const dayS = sessions?.[tv?.date_key] || []
  const sess = dayS.find(x => x.id === tv?.session_id)
  const block =
    sess?.blocks?.find(b => b.id === tv?.timer_block_id) ||
    (sess?.blocks || []).find(isWodBlock) ||
    sess?.blocks?.[0]
  const bt = tv?.timer_type || 'For Time'
  const cap = tv?.timer_cap_secs ?? 1200
  const exes = block
    ? block.type === 'Estações'
      ? (block.stations || []).flatMap(st => st.exercises || [])
      : block.exercises || []
    : []
  const bColor = block ? blkColor(block) : '#d8a840'
  const bLabel = block ? blkLabel(block) : bt
  const bMeta = block ? blkMeta(block) : ''
  const bGoal = block ? goalStr(block) : ''

  const activeClass = (classExecs || []).find(c => c.id === tv?.class_id && !c.reset_at)
  const groups = activeClass?.groups || []
  const groupPositions = tv?.group_positions || {}
  const hasGroups = groups.length > 0

  const allWodBlocks = hasGroups
    ? (sess?.blocks || []).filter(
        bl => isWodBlock(bl) && (bl.exercises?.length || bl.stations?.length),
      )
    : []
  const mapCols = allWodBlocks.length > 3 ? 2 : 1
  const orderedMap = hasGroups ? columnMajor(allWodBlocks, mapCols) : []

  // Rest between blocks
  const restUntil = tv?.rotation_rest_until || 0
  const restTotal = tv?.rotation_rest_secs || 0
  const restRemaining = restUntil > Date.now() ? Math.max(0, (restUntil - Date.now()) / 1000) : 0
  const isResting = restRemaining > 0
  const restProg = restTotal > 0 ? restRemaining / restTotal : 1

  const e = elapsed
  const prog = isResting ? restProg : ringProg(e, cap, bt)
  const col = isResting ? '#4878d8' : ringCol(e, cap, bt)
  const dashOff = RING_C * (1 - prog)
  const isFinished = !isResting && bt !== 'EMOM' && e >= cap
  const remaining = cap - e
  const showCountdown =
    !isResting &&
    !isFinished &&
    bt !== 'AMRAP' &&
    bt !== 'EMOM' &&
    cap > 0 &&
    remaining > 0 &&
    remaining <= 10

  const displaySecs = isResting
    ? restRemaining
    : bt === 'AMRAP'
      ? Math.max(0, cap - e)
      : bt === 'EMOM'
        ? Math.max(0, 60 - (e % 60))
        : Math.min(e, cap)

  return (
    <div className={s.timerSlide}>
      <div className={s.timerLeft}>
        <div className={s.timerMode}>
          {isResting ? 'DESCANSO' : MODE_LBL[bt] || bt.toUpperCase()}
        </div>
        <div className={s.ringWrap}>
          <svg className={s.ring} viewBox="0 0 260 260">
            {/* Track: theme-aware via the CSS `stroke` PROPERTY (not the SVG attribute,
                which can't take a var) — #85. Was hardcoded #1e1a16 (= totk-dark --stone2),
                which stayed dark on both light themes on the gym wall. */}
            <circle
              cx={130}
              cy={130}
              r={RING_R}
              fill="none"
              style={{ stroke: 'var(--stone2, #1e1a16)' }}
              strokeWidth={12}
            />
            <circle
              cx={130}
              cy={130}
              r={RING_R}
              fill="none"
              stroke={isFinished ? '#c84038' : col}
              strokeWidth={12}
              strokeDasharray={RING_C}
              strokeDashoffset={isFinished ? 0 : dashOff}
              strokeLinecap="round"
              transform="rotate(-90 130 130)"
              style={{ transition: 'stroke-dashoffset .25s linear, stroke .3s' }}
            />
          </svg>
          <div className={s.ringClock} style={{ color: isFinished ? '#c84038' : col }}>
            {isFinished ? 'TIME!' : fmt(displaySecs)}
          </div>
          {showCountdown && <div className={s.countdownPill}>{Math.ceil(remaining)}</div>}
        </div>
        <div className={s.timerCap}>
          {isResting
            ? 'Troca de bloco'
            : bt === 'AMRAP'
              ? `${Math.round(cap / 60)}' AMRAP`
              : bt === 'EMOM'
                ? `EMOM ${Math.round(cap / 60)}'`
                : `Cap ${Math.round(cap / 60)}'`}
        </div>
      </div>

      {hasGroups ? (
        <div className={s.timerGroupMap} style={{ gridTemplateColumns: `repeat(${mapCols},1fr)` }}>
          {orderedMap.map(bl => (
            <BlockCard
              key={bl.id}
              bl={bl}
              groups={groups}
              groupPositions={groupPositions}
              athletes={athletes}
              isActive={bl.id === tv?.timer_block_id}
            />
          ))}
        </div>
      ) : (
        <div className={s.timerRight}>
          <div className={s.timerBlockHdr} style={{ borderLeftColor: bColor }}>
            <span style={{ color: bColor }}>{bLabel}</span>
            {bMeta && <span className={s.blockMeta}>{bMeta}</span>}
            {bGoal && <span className={s.blockGoal}>Meta {bGoal}</span>}
          </div>
          <ExerciseList exercises={exes} color={bColor} size="large" />
          {exes.length === 0 && <div className={s.timerNoEx}>Nenhum exercício</div>}
          {block?.notes && <div className={s.timerBlockNote}>{block.notes}</div>}
        </div>
      )}
    </div>
  )
}

// ── Slide: Results (live leaderboard, with optional banter mode) ──────────────
export function ResultsSlide({ tv, sessions, athletes, results, classExecs }) {
  const dayS = sessions?.[tv?.date_key] || []
  const sess = dayS.find(x => x.id === tv?.session_id)
  const blocks = (sess?.blocks || []).filter(isWodBlock)
  const selBl = blocks[0]

  if (!selBl)
    return (
      <div className={s.empty}>
        <i className="ti ti-clipboard-off" /> Nenhum bloco WOD encontrado
      </div>
    )

  // Active classes (not reset) — banter mode when ≥2
  const activeClasses = (classExecs || []).filter(c => !c.reset_at)
  const banter = activeClasses.length >= 2

  const MEDALS = ['🥇', '🥈', '🥉']

  function getBlockResults(filterAthleteIds) {
    return results
      .filter(r => r.sessionId === tv?.session_id)
      .filter(r => !filterAthleteIds || filterAthleteIds.includes(r.athleteId))
      .flatMap(r =>
        (r.blocks || [])
          .filter(b => b.blockId === selBl.id)
          .map(b => ({
            ...b,
            athleteId: r.athleteId,
            athleteName: athletes.find(a => a.id === r.athleteId)?.name || '—',
          })),
      )
  }

  function ClassColumn({ cls }) {
    const ids = cls.athlete_ids || []
    const blockRes = getBlockResults(ids.length ? ids : null)
    const ranked = rankResults(blockRes, selBl.type)
    const top3 = ranked.slice(0, 3)
    const rest = ranked.slice(3)
    return (
      <div className={s.banterCol}>
        <div className={s.banterColHdr}>{cls.class_label}</div>
        {ranked.length === 0 ? (
          <div className={s.noResults} style={{ fontSize: 28 }}>
            Aguardando...
          </div>
        ) : (
          <>
            <div className={s.podium}>
              {[1, 0, 2].map(idx => {
                const r = top3[idx]
                if (!r) return <div key={idx} className={s.podiumEmpty} />
                const rank = idx === 0 ? 1 : idx === 1 ? 2 : 3
                return (
                  <div key={idx} className={`${s.podiumCard} ${rank === 1 ? s.podiumFirst : ''}`}>
                    <div className={s.podiumMedal}>{MEDALS[rank - 1]}</div>
                    <div className={s.podiumName}>{r.athleteName}</div>
                    <div className={s.podiumPerf}>{perfStr(r, selBl.type)}</div>
                    <div className={s.podiumScale}>{r.scale || '—'}</div>
                  </div>
                )
              })}
            </div>
            {rest.length > 0 && (
              <div className={s.restList}>
                {rest.map((r, i) => (
                  <div key={i} className={s.restRow}>
                    <span className={s.restRank}>#{i + 4}</span>
                    <span className={s.restName}>{r.athleteName}</span>
                    <span className={s.restScale}>{r.scale || '—'}</span>
                    <span className={s.restPerf}>{perfStr(r, selBl.type)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  if (banter) {
    return (
      <div className={s.resultsSlide}>
        <div className={s.resultsHdr}>
          <div className={s.resultsTitle}>BANTER MODE</div>
          <div className={s.resultsBlock}>{blkLabel(selBl)}</div>
          {tv?.date_key && <div className={s.resultsDate}>{fmtDate(tv.date_key)}</div>}
        </div>
        <div className={s.banterWrap}>
          {activeClasses.map(cls => (
            <ClassColumn key={cls.id} cls={cls} />
          ))}
        </div>
      </div>
    )
  }

  // Default single-class leaderboard
  const blockRes = getBlockResults(null)
  const ranked = rankResults(blockRes, selBl.type)
  const top3 = ranked.slice(0, 3)
  const rest = ranked.slice(3)

  return (
    <div className={s.resultsSlide}>
      <div className={s.resultsHdr}>
        <div className={s.resultsTitle}>RESULTADOS</div>
        <div className={s.resultsBlock}>{blkLabel(selBl)}</div>
        {tv?.date_key && <div className={s.resultsDate}>{fmtDate(tv.date_key)}</div>}
      </div>

      {ranked.length === 0 ? (
        <div className={s.noResults}>Aguardando resultados...</div>
      ) : (
        <>
          <div className={s.podium}>
            {[1, 0, 2].map(idx => {
              const r = top3[idx]
              if (!r) return <div key={idx} className={s.podiumEmpty} />
              const rank = idx === 0 ? 1 : idx === 1 ? 2 : 3
              return (
                <div key={idx} className={`${s.podiumCard} ${rank === 1 ? s.podiumFirst : ''}`}>
                  <div className={s.podiumMedal}>{MEDALS[rank - 1]}</div>
                  <div className={s.podiumName}>{r.athleteName}</div>
                  <div className={s.podiumPerf}>{perfStr(r, selBl.type)}</div>
                  <div className={s.podiumScale}>{r.scale || '—'}</div>
                </div>
              )
            })}
          </div>

          {rest.length > 0 && (
            <div className={s.restList}>
              {rest.map((r, i) => (
                <div key={i} className={s.restRow}>
                  <span className={s.restRank}>#{i + 4}</span>
                  <span className={s.restName}>{r.athleteName}</span>
                  <span className={s.restScale}>{r.scale || '—'}</span>
                  <span className={s.restPerf}>{perfStr(r, selBl.type)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Slide: QR ─────────────────────────────────────────────────────────────────
export function QrSlide({ tv }) {
  const [qrUrl, setQrUrl] = useState('')
  const base = `${window.location.origin}/CrossFit-Apps/schedule.html?date=${tv?.date_key || ''}&session=${tv?.session_id || ''}&from=tv`
  const url = tv?.class_id ? `${base}&checkin=${tv.class_id}` : base
  const title = tv?.class_id ? 'CHECK-IN DA AULA' : 'REGISTRE SEU RESULTADO'
  useEffect(() => {
    if (!tv?.date_key || !tv?.session_id) return
    QRCode.toDataURL(url, { width: 500, margin: 2, color: qrColors() })
      .then(setQrUrl)
      .catch(() => {})
  }, [url])
  return (
    <div className={s.qrSlide}>
      <div className={s.qrTitle}>{title}</div>
      {qrUrl ? (
        <img src={qrUrl} alt="QR Code" className={s.qrBig} />
      ) : (
        <div className={s.qrLoading}>Gerando QR...</div>
      )}
      <div className={s.qrUrl}>{url}</div>
    </div>
  )
}
