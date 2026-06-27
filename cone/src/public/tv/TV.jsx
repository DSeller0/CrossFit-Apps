import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import QRCode from 'qrcode'
import { sb } from '../supabaseClient.js'
import { blkLabel, blkColor, isWodBlock, rankResults, perfStr, exVolStr } from '../lib/wod.js'
import s from './TV.module.css'

// ── Constants ─────────────────────────────────────────────────────────────────
const DV_W = 1920, DV_H = 1080
const RING_R = 115, RING_C = +(2 * Math.PI * RING_R).toFixed(1)
const DAY_PT  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MON_PT  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MODE_LBL = { 'For Time':'FOR TIME', AMRAP:'AMRAP', EMOM:'EMOM', Benchmark:'BENCHMARK', 'Estações':'ESTAÇÕES' }

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
  if (bt === 'EMOM')  return Math.max(0, (60 - (e % 60)) / 60)
  return cap ? Math.min(1, e / cap) : Math.min(1, e / 1800)
}
function ringCol(e, cap, bt) {
  const countdown = bt === 'AMRAP' || bt === 'EMOM'
  const rem = countdown ? ringProg(e, cap, bt) : (cap ? (cap - e) / cap : 1)
  if (rem > 0.5) return '#48b860'
  if (rem > 0.2) return '#d8a840'
  return '#c84038'
}
function fmt(sec) {
  sec = Math.max(0, Math.floor(sec))
  return `${String(Math.floor(sec / 60)).padStart(2,'0')}:${String(sec % 60).padStart(2,'0')}`
}
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_PT[d.getDay()]}, ${d.getDate()} ${MON_PT[d.getMonth()]}`
}

// ── Shared: mini QR footer for WOD + Timer slides ─────────────────────────────
function QrFooter({ dateKey, sessId, classId }) {
  const [qrUrl, setQrUrl] = useState('')
  const base = `${window.location.origin}/CrossFit-Apps/schedule.html?date=${dateKey}&session=${sessId}`
  const url  = classId ? `${base}&checkin=${classId}` : base
  useEffect(() => {
    if (!dateKey || !sessId) return
    QRCode.toDataURL(url, { width: 160, margin: 1, color: { dark: '#f0e8d0', light: '#00000000' } })
      .then(setQrUrl).catch(() => {})
  }, [url])
  if (!dateKey || !sessId) return null
  return (
    <div className={s.qrFooter}>
      {qrUrl && <img src={qrUrl} alt="QR" className={s.qrFooterImg} />}
      <span className={s.qrFooterText}>{classId ? 'Escaneie para fazer check-in' : 'Escaneie para registrar resultado'}</span>
    </div>
  )
}

// ── Slide: WOD ────────────────────────────────────────────────────────────────
export function WodSlide({ sessions, tv, gymName, classExecs, athletes }) {
  const gridRef = useRef(null)

  const dayS = sessions?.[tv?.date_key] || []
  const sess = dayS.find(x => x.id === tv?.session_id)

  const blocks  = sess ? (sess.blocks || []).filter(bl => (bl.exercises?.length || bl.stations?.length)) : []
  const cols    = blocks.length > 3 ? 2 : 1
  const ordered = columnMajor(blocks, cols)

  const activeClass    = (classExecs || []).find(c => c.id === tv?.class_id && !c.reset_at)
  const groups         = activeClass?.groups || []
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

  if (!sess) return <div className={s.empty}><i className="ti ti-calendar-off" /> Nenhuma sessão selecionada</div>

  return (
    <div className={s.wodSlide}>
      <div className={s.wodHdr}>
        <div className={s.wodHdrLeft}>
          {gymName && <div className={s.wodGym}>{gymName}</div>}
          <div className={s.wodSessName}>{sess.sessionName || (Array.isArray(sess.mainTraining) ? sess.mainTraining.join(', ') : sess.mainTraining) || 'Sessão'}</div>
        </div>
        <div className={s.wodDate}>{fmtDate(tv.date_key)}</div>
      </div>

      <div className={s.wodBlocksOuter}>
        <div ref={gridRef} className={s.wodBlocks} style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>
          {ordered.map(bl => <BlockCard key={bl.id} bl={bl} groups={groups} groupPositions={groupPositions} athletes={athletes} />)}
        </div>
      </div>

      <QrFooter dateKey={tv.date_key} sessId={tv.session_id} classId={tv?.class_id} />
    </div>
  )
}

export function BlockCard({ bl, groups, groupPositions, athletes, isActive }) {
  const groupsHere = (groups || []).filter(g => (groupPositions || {})[g.id] === bl.id)
  // Group color takes priority over block-type color when a group is assigned here
  const color = groupsHere.length > 0 ? groupsHere[0].color : blkColor(bl)
  const label = blkLabel(bl)
  const exes = bl.type === 'Estações'
    ? (bl.stations || []).flatMap(st => (st.exercises || []).map(e => ({ ...e, _station: st.name })))
    : (bl.exercises || [])
  const meta = [bl.duration && `${bl.duration}'`, bl.rounds && `${bl.rounds} rds`].filter(Boolean).join(' · ')

  return (
    <div className={s.blockCard} style={{ borderLeftColor: color }}>
      <div className={s.blockCardHdr}>
        <span className={s.blockBadge} style={{ background: color + '22', color }}>{label}</span>
        {isActive && <span className={s.timerBlockLiveBadge}>AO VIVO</span>}
        {meta && <span className={s.blockMeta}>{meta}</span>}
      </div>
      <div className={s.exList}>
        {exes.map((ex, i) => {
          if (ex.isComplex) {
            const mvs = (ex.complexMovements || []).filter(m => m.name)
            const notation = mvs.map(m => m.reps || '?').join('+')
            const displayName = ex.name || mvs.map(m => m.name).join(' + ') || 'Complexo'
            const setsStr = ex.sets ? `${ex.sets}×` : ''
            const volStr = notation ? `${setsStr}(${notation})` : setsStr || ''
            return (
              <div key={ex.id || i} className={s.complexBlock}>
                <div className={s.exRow}>
                  <span className={s.exDot} style={{ background: color }} />
                  {volStr && <span className={s.exVol}>{volStr}</span>}
                  <span className={s.exName}>{displayName}</span>
                </div>
                {mvs.length > 0 && (
                  <div className={s.complexMvs}>
                    {mvs.map((mv, mi) => (
                      <div key={mv.id || mi} className={s.complexMvRow}>
                        {mv.reps && <span className={s.complexMvReps}>{mv.reps}</span>}
                        <span className={s.complexMvName}>{mv.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }
          const vol = exVolStr(ex)
          return (
            <div key={ex.id || i} className={s.exRow}>
              <span className={s.exDot} style={{ background: color }} />
              {vol && <span className={s.exVol}>{vol}</span>}
              <span className={s.exName}>{ex.name}</span>
            </div>
          )
        })}
      </div>
      {groupsHere.length > 0 && (
        <div className={s.blockGroups}>
          {groupsHere.map(g => {
            const names = [
              ...(g.athleteIds || []).map(id => (athletes || []).find(a => a.id === id)?.name).filter(Boolean),
              ...(g.anonNames || []),
            ]
            return (
              <div key={g.id} className={s.blockGroupChip} style={{ borderLeftColor: g.color, color: g.color }}>
                <span className={s.blockGroupName}>{g.name}</span>
                {names.length > 0 && <span className={s.blockGroupAthletes}>{names.join(' · ')}</span>}
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

  const dayS  = sessions?.[tv?.date_key] || []
  const sess  = dayS.find(x => x.id === tv?.session_id)
  const block = sess?.blocks?.find(b => b.id === tv?.timer_block_id) || (sess?.blocks || []).find(isWodBlock) || sess?.blocks?.[0]
  const bt    = tv?.timer_type || 'For Time'
  const cap   = tv?.timer_cap_secs ?? 1200
  const exes  = block ? (block.type === 'Estações' ? (block.stations||[]).flatMap(st=>st.exercises||[]) : (block.exercises||[])) : []
  const bColor = block ? blkColor(block) : '#d8a840'
  const bLabel = block ? blkLabel(block) : bt

  const activeClass    = (classExecs || []).find(c => c.id === tv?.class_id && !c.reset_at)
  const groups         = activeClass?.groups || []
  const groupPositions = tv?.group_positions || {}
  const hasGroups      = groups.length > 0

  const allWodBlocks = hasGroups ? (sess?.blocks || []).filter(isWodBlock) : []
  const mapCols      = allWodBlocks.length > 3 ? 2 : 1
  const orderedMap   = hasGroups ? columnMajor(allWodBlocks, mapCols) : []

  // Rest between blocks
  const restUntil    = tv?.rotation_rest_until || 0
  const restTotal    = tv?.rotation_rest_secs  || 0
  const restRemaining = restUntil > Date.now() ? Math.max(0, (restUntil - Date.now()) / 1000) : 0
  const isResting    = restRemaining > 0
  const restProg     = restTotal > 0 ? restRemaining / restTotal : 1

  const e    = elapsed
  const prog = isResting ? restProg : ringProg(e, cap, bt)
  const col  = isResting ? '#4878d8' : ringCol(e, cap, bt)
  const dashOff    = RING_C * (1 - prog)
  const isFinished = !isResting && bt !== 'EMOM' && e >= cap

  const displaySecs = isResting
    ? restRemaining
    : bt === 'AMRAP' ? Math.max(0, cap - e) : bt === 'EMOM' ? Math.max(0, 60 - (e % 60)) : Math.min(e, cap)

  return (
    <div className={s.timerSlide}>
      <div className={s.timerLeft}>
        <div className={s.timerMode}>{isResting ? 'DESCANSO' : MODE_LBL[bt] || bt.toUpperCase()}</div>
        <div className={s.ringWrap}>
          <svg className={s.ring} viewBox="0 0 260 260">
            <circle cx={130} cy={130} r={RING_R} fill="none" stroke="#1e1a16" strokeWidth={12} />
            <circle
              cx={130} cy={130} r={RING_R} fill="none"
              stroke={isFinished ? '#c84038' : col} strokeWidth={12}
              strokeDasharray={RING_C} strokeDashoffset={isFinished ? 0 : dashOff}
              strokeLinecap="round" transform="rotate(-90 130 130)"
              style={{ transition: 'stroke-dashoffset .25s linear, stroke .3s' }}
            />
          </svg>
          <div className={s.ringClock} style={{ color: isFinished ? '#c84038' : col }}>
            {isFinished ? 'TIME!' : fmt(displaySecs)}
          </div>
        </div>
        <div className={s.timerCap}>
          {isResting
            ? 'Troca de bloco'
            : bt === 'AMRAP' ? `${Math.round(cap/60)}' AMRAP` : bt === 'EMOM' ? `EMOM ${Math.round(cap/60)}'` : `Cap ${Math.round(cap/60)}'`}
        </div>
      </div>

      {hasGroups ? (
        <div className={s.timerGroupMap} style={{ gridTemplateColumns: `repeat(${mapCols},1fr)` }}>
          {orderedMap.map(bl => (
            <BlockCard key={bl.id} bl={bl} groups={groups} groupPositions={groupPositions}
              athletes={athletes} isActive={bl.id === tv?.timer_block_id} />
          ))}
        </div>
      ) : (
        <div className={s.timerRight}>
          <div className={s.timerBlockHdr} style={{ borderLeftColor: bColor }}>
            <span style={{ color: bColor }}>{bLabel}</span>
          </div>
          <div className={s.timerExList}>
            {exes.map((ex, i) => {
              const vol = exVolStr(ex)
              return (
                <div key={ex.id || i} className={s.timerExRow}>
                  <span className={s.timerExDot} style={{ background: bColor }} />
                  <div className={s.timerExBody}>
                    {vol && <span className={s.timerExVol}>{vol}</span>}
                    <span className={s.timerExName}>{ex.name}</span>
                  </div>
                </div>
              )
            })}
            {exes.length === 0 && <div className={s.timerNoEx}>Nenhum exercício</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Slide: Results (live leaderboard, with optional banter mode) ──────────────
export function ResultsSlide({ tv, sessions, athletes, results, classExecs }) {
  const dayS   = sessions?.[tv?.date_key] || []
  const sess   = dayS.find(x => x.id === tv?.session_id)
  const blocks = (sess?.blocks || []).filter(isWodBlock)
  const selBl  = blocks[0]

  if (!selBl) return <div className={s.empty}><i className="ti ti-clipboard-off" /> Nenhum bloco WOD encontrado</div>

  // Active classes (not reset) — banter mode when ≥2
  const activeClasses = (classExecs || []).filter(c => !c.reset_at)
  const banter = activeClasses.length >= 2

  const MEDALS = ['🥇','🥈','🥉']

  function getBlockResults(filterAthleteIds) {
    return results
      .filter(r => r.sessionId === tv?.session_id)
      .filter(r => !filterAthleteIds || filterAthleteIds.includes(r.athleteId))
      .flatMap(r => (r.blocks || [])
        .filter(b => b.blockId === selBl.id)
        .map(b => ({ ...b, athleteId: r.athleteId, athleteName: athletes.find(a => a.id === r.athleteId)?.name || '—' }))
      )
  }

  function ClassColumn({ cls }) {
    const ids = cls.athlete_ids || []
    const blockRes = getBlockResults(ids.length ? ids : null)
    const ranked = rankResults(blockRes, selBl.type)
    const top3 = ranked.slice(0, 3)
    const rest  = ranked.slice(3)
    return (
      <div className={s.banterCol}>
        <div className={s.banterColHdr}>{cls.class_label}</div>
        {ranked.length === 0 ? (
          <div className={s.noResults} style={{ fontSize: 28 }}>Aguardando...</div>
        ) : (
          <>
            <div className={s.podium}>
              {[1, 0, 2].map(idx => {
                const r = top3[idx]
                if (!r) return <div key={idx} className={s.podiumEmpty} />
                const rank = idx === 0 ? 1 : idx === 1 ? 2 : 3
                return (
                  <div key={idx} className={`${s.podiumCard} ${rank === 1 ? s.podiumFirst : ''}`}>
                    <div className={s.podiumMedal}>{MEDALS[rank-1]}</div>
                    <div className={s.podiumName}>{r.athleteName}</div>
                    <div className={s.podiumPerf}>{perfStr(r, selBl.type)}</div>
                    <div className={s.podiumScale}>{r.scale || 'RX'}</div>
                  </div>
                )
              })}
            </div>
            {rest.length > 0 && (
              <div className={s.restList}>
                {rest.map((r, i) => (
                  <div key={i} className={s.restRow}>
                    <span className={s.restRank}>#{i+4}</span>
                    <span className={s.restName}>{r.athleteName}</span>
                    <span className={s.restScale}>{r.scale || 'RX'}</span>
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
          {activeClasses.map(cls => <ClassColumn key={cls.id} cls={cls} />)}
        </div>
      </div>
    )
  }

  // Default single-class leaderboard
  const blockRes = getBlockResults(null)
  const ranked = rankResults(blockRes, selBl.type)
  const top3 = ranked.slice(0, 3)
  const rest  = ranked.slice(3)

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
                  <div className={s.podiumScale}>{r.scale || 'RX'}</div>
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
                  <span className={s.restScale}>{r.scale || 'RX'}</span>
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
  const base = `${window.location.origin}/CrossFit-Apps/schedule.html?date=${tv?.date_key || ''}&session=${tv?.session_id || ''}`
  const url  = tv?.class_id ? `${base}&checkin=${tv.class_id}` : base
  const title = tv?.class_id ? 'CHECK-IN DA AULA' : 'REGISTRE SEU RESULTADO'
  useEffect(() => {
    if (!tv?.date_key || !tv?.session_id) return
    QRCode.toDataURL(url, { width: 500, margin: 2, color: { dark: '#f0e8d0', light: '#0d0b0900' } })
      .then(setQrUrl).catch(() => {})
  }, [url])
  return (
    <div className={s.qrSlide}>
      <div className={s.qrTitle}>{title}</div>
      {qrUrl
        ? <img src={qrUrl} alt="QR Code" className={s.qrBig} />
        : <div className={s.qrLoading}>Gerando QR...</div>
      }
      <div className={s.qrUrl}>{url}</div>
    </div>
  )
}

// ── Main TV ───────────────────────────────────────────────────────────────────
export default function TV() {
  const [scale,       setScale]       = useState(1)
  const [tv,          setTv]          = useState(null)
  const [sessions,    setSessions]    = useState({})
  const [athletes,    setAthletes]    = useState([])
  const [results,     setResults]     = useState([])
  const [classExecs,  setClassExecs]  = useState([])
  const [gymName,     setGymName]     = useState('')
  const chanRef    = useRef(null)
  const resChanRef = useRef(null)
  const ceChanRef  = useRef(null)
  const prevSessId = useRef(null)

  // Scale canvas to fill screen
  useEffect(() => {
    const upd = () => setScale(Math.min(window.innerWidth / DV_W, window.innerHeight / DV_H))
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  // Initial data load
  useEffect(() => {
    async function init() {
      const [tvR, sessR, athR, stR] = await Promise.all([
        sb.from('tv_state').select('*').eq('id', 1).maybeSingle(),
        sb.from('sessions').select('value').eq('id', 1).maybeSingle(),
        sb.from('athletes').select('value').eq('id', 1).maybeSingle(),
        sb.from('settings').select('value').eq('id', 1).maybeSingle(),
      ])
      if (tvR.data)           setTv(tvR.data)
      if (sessR.data?.value)  setSessions(sessR.data.value)
      if (athR.data?.value)   setAthletes(athR.data.value)
      if (stR.data?.value?.gymName) setGymName(stR.data.value.gymName)
    }
    init()
  }, [])

  // Subscribe to tv_state changes
  useEffect(() => {
    chanRef.current = sb.channel('tv-ctrl')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tv_state' }, p => setTv(p.new))
      .subscribe()
    return () => { chanRef.current?.unsubscribe() }
  }, [])

  // Subscribe to results when showing results/wod slides
  const slide   = tv?.slide || 'blank'
  const sessId  = tv?.session_id
  const dateKey = tv?.date_key
  useEffect(() => {
    if (slide !== 'results' && slide !== 'wod') return
    if (!sessId || sessId === prevSessId.current) return
    prevSessId.current = sessId

    resChanRef.current?.unsubscribe()

    sb.from('results_v2').select('*').eq('session_id', sessId).then(({ data }) => {
      if (data) setResults(data.map(mapRow))
    })

    resChanRef.current = sb.channel(`tv-res-${sessId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'results_v2',
        filter: `session_id=eq.${sessId}` }, p => setResults(prev => mergeRow(prev, p.new)))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'results_v2',
        filter: `session_id=eq.${sessId}` }, p => setResults(prev => mergeRow(prev, p.new)))
      .subscribe()

    return () => { resChanRef.current?.unsubscribe() }
  }, [slide, sessId])

  // Load + subscribe class_executions for current session
  useEffect(() => {
    if (!sessId || !dateKey) return

    ceChanRef.current?.unsubscribe()

    sb.from('class_executions').select('*')
      .eq('session_id', sessId).eq('date_key', dateKey)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setClassExecs(data) })

    ceChanRef.current = sb.channel(`tv-ce-${sessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_executions',
        filter: `session_id=eq.${sessId}` }, () => {
          sb.from('class_executions').select('*')
            .eq('session_id', sessId).eq('date_key', dateKey)
            .order('created_at', { ascending: true })
            .then(({ data }) => { if (data) setClassExecs(data) })
        })
      .subscribe()

    return () => { ceChanRef.current?.unsubscribe() }
  }, [sessId, dateKey])

  return (
    <div className={s.root}>
      <div className={s.canvas} style={{ width: DV_W, height: DV_H, transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        {slide === 'blank'   && <div className={s.blank} />}
        {slide === 'wod'     && <WodSlide     sessions={sessions} tv={tv} gymName={gymName} classExecs={classExecs} athletes={athletes} />}
        {slide === 'timer'   && <TimerSlide   tv={tv} sessions={sessions} classExecs={classExecs} athletes={athletes} />}
        {slide === 'results' && <ResultsSlide tv={tv} sessions={sessions} athletes={athletes} results={results} classExecs={classExecs} />}
        {slide === 'qr'      && <QrSlide      tv={tv} />}
        {!tv && <div className={s.loading}><i className={`ti ti-loader-2 ${s.spin}`} /> Conectando...</div>}
      </div>
    </div>
  )
}

function mapRow(r) {
  return { id: r.id, date: r.date, athleteId: r.athlete_id, sessionId: r.session_id, blocks: r.blocks }
}
function mergeRow(prev, row) {
  const mapped = mapRow(row)
  return [...prev.filter(x => x.id !== mapped.id), mapped]
}
