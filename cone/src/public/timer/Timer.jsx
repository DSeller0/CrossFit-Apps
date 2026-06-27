import { useState, useEffect, useRef } from 'react'
import s from './Timer.module.css'
import Nav from '../Nav.jsx'
import { sb } from '../supabaseClient.js'
import { BENCHMARK_GIRLS, BENCHMARK_HEROES, benchmarkToTimerExes } from '../lib/benchmarks.js'

// ── Constants ──────────────────────────────────────────────────────────────
const DAY_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MON_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MODE_LBL = { 'For Time':'FOR TIME', AMRAP:'AMRAP', EMOM:'EMOM', Benchmark:'BENCHMARK', 'Estações':'ESTAÇÕES' }
const K_CFG = 'timer_config', K_STATE = 'timer_state', K_HIST = 'timer_history'
const RING_R = 85, RING_C = +(2 * Math.PI * RING_R).toFixed(1)

// ── Pure helpers ──────────────────────────────────────────────────────────
function fmt(sec) { sec = Math.max(0, Math.floor(sec)); return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}` }
function fmtDate(iso) { const d = new Date(iso + 'T12:00:00'); return `${DAY_PT[d.getDay()]} ${d.getDate()} ${MON_PT[d.getMonth()]}` }
function exLabel(ex) {
  if (typeof ex === 'string') return ex
  const v = []
  if (ex.sets && ex.sets > 1) v.push(ex.sets + 'x')
  if (ex.reps) v.push(ex.reps + ' reps')
  if (ex.load) v.push(ex.load + (ex.unit || 'kg'))
  return [ex.name || '', v.join(' ')].filter(Boolean).join(' · ')
}

// ── localStorage ──────────────────────────────────────────────────────────
function loadHist() { try { return JSON.parse(localStorage.getItem(K_HIST) || '[]') } catch { return [] } }
function pushHist(entry) {
  const h = [entry, ...loadHist()].slice(0, 3)
  try { localStorage.setItem(K_HIST, JSON.stringify(h)) } catch {}
}
function dropHist(i) {
  const h = loadHist(); h.splice(i, 1)
  try { localStorage.setItem(K_HIST, JSON.stringify(h)) } catch {}
}

const DEFAULT_CFG = {
  blockType: 'For Time', blockLabel: '', timeCap: 20, rounds: null,
  exercises: [], stationTime: 45, transitionTime: 15,
  sessionId: null, sessionDate: null, athleteId: null, blockId: null,
  goal: '', countdown: true,
}

function loadSaved() {
  try {
    const sv = JSON.parse(localStorage.getItem(K_STATE) || 'null')
    if (sv?.cfg && (sv.status === 'running' || sv.status === 'paused')) return sv
  } catch {}
  return null
}
function loadSavedCfg() { try { return JSON.parse(localStorage.getItem(K_CFG) || 'null') } catch { return null } }

// ── Component ─────────────────────────────────────────────────────────────
export default function Timer() {
  // State
  const fromSched  = new URLSearchParams(location.search).get('src') === 'sched'
  const initSaved  = loadSaved()
  const initCfg    = initSaved?.cfg ?? loadSavedCfg() ?? DEFAULT_CFG
  const initStatus = initSaved ? initSaved.status : (fromSched && loadSavedCfg() ? 'ready' : 'cfg')

  const [gymName,      setGymName]      = useState('Cone')
  const [status,       setStatus]       = useState(initStatus)
  const [cfg,          setCfg]          = useState(initCfg)
  const [splits,       setSplits]       = useState(() => initSaved?.splits ?? [])
  const [finalSecs,    setFinalSecs]    = useState(() => initSaved?.finalSecs ?? 0)
  const [hist,         setHist]         = useState(() => loadHist())
  const [,             forceUpdate]     = useState(0)
  const [getreadySecs, setGetreadySecs] = useState(10)
  const [bmCat,        setBmCat]        = useState(null) // 'Girls' | 'Heroes' | null

  const [form, setForm] = useState(() => ({
    type:      initCfg.blockType || 'For Time',
    cap:       initCfg.timeCap ?? 20,
    rounds:    initCfg.rounds ?? '',
    label:     initCfg.blockLabel || '',
    exes:      (initCfg.exercises || []).map(exLabel).join('\n'),
    st:        initCfg.stationTime ?? 45,
    tt:        initCfg.transitionTime ?? 15,
    goal:      initCfg.goal ?? '',
    countdown: initCfg.countdown ?? true,
  }))

  // Timing refs
  const startEpoch  = useRef(initSaved?.startEpoch ?? 0)
  const pausedMs    = useRef(initSaved?.pausedMs ?? 0)
  const pauseStart  = useRef(initSaved?.pauseStart ?? 0)
  const tickRef     = useRef(null)
  const wakeLockRef = useRef(null)
  const lastEmomMin = useRef(-1)
  const lastStKey   = useRef(null)
  const getreadyRef = useRef(null)
  const grSecsRef   = useRef(10)

  // Mirror state to refs so tick (setInterval callback) always sees current values
  const statusRef  = useRef(status)
  const cfgRef     = useRef(cfg)
  const splitsRef  = useRef(splits)
  const finSecsRef = useRef(finalSecs)
  statusRef.current  = status
  cfgRef.current     = cfg
  splitsRef.current  = splits
  finSecsRef.current = finalSecs

  // "Latest ref" pattern: tick function always reads newest version
  const tickFnRef = useRef(null)

  // ── Gym name ─────────────────────────────────────────────────────────────
  useEffect(() => {
    sb.from('settings').select('value').eq('id', 1).maybeSingle()
      .then(({ data }) => { if (data?.value?.gymName) setGymName(data.value.gymName) })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed helpers ─────────────────────────────────────────────────────
  function capSecs(c) { return ((c ?? cfgRef.current)?.timeCap ?? 0) * 60 }

  function elapsedRaw() {
    const st = statusRef.current
    if (st === 'ready' || st === 'cfg' || st === 'getready') return 0
    if (st === 'finished') return finSecsRef.current
    const now = st === 'paused' ? pauseStart.current : Date.now()
    return Math.max(0, (now - startEpoch.current - pausedMs.current) / 1000)
  }

  function stCycleRaw(e, c) {
    const st = c.stationTime ?? 45, tt = c.transitionTime ?? 15
    const cycle = Math.max(st + tt, 1) // guard divide-by-zero when both are 0
    return { st, tt, cycle, pos: e % cycle, totalCycles: Math.floor(e / cycle) }
  }
  function stInfoRaw(e, c) {
    const exes = c.exercises || [], { totalCycles } = stCycleRaw(e, c)
    return { idx: exes.length ? totalCycles % exes.length : 0, round: exes.length ? Math.floor(totalCycles / exes.length) : 0 }
  }
  function stPhaseRaw(e, c) { const { pos, st } = stCycleRaw(e, c); return pos < st ? 'work' : 'rest' }

  function isTimeUpRaw(e, c) {
    const cap = capSecs(c), bt = c.blockType
    if (bt === 'Estações') {
      const exes = c.exercises || [], r = c.rounds ?? 1, { st, tt } = stCycleRaw(e, c)
      const cycleDur = st + tt
      if (cycleDur <= 0) return false // can't determine end with 0-duration cycles
      return e >= exes.length * r * cycleDur
    }
    if (!cap) return false
    return e >= cap
  }

  function ringProgressRaw(e, c) {
    const cap = capSecs(c), bt = c.blockType
    if (bt === 'AMRAP') return cap ? Math.max(0, (cap - e) / cap) : 1
    if (bt === 'EMOM')  return Math.max(0, (60 - (e % 60)) / 60)
    if (bt === 'Estações') {
      const { pos, st, tt } = stCycleRaw(e, c), phase = stPhaseRaw(e, c)
      const phaseLen = phase === 'work' ? st : tt
      const phasePos = phase === 'work' ? pos : pos - st
      if (phaseLen <= 0) return 1
      return Math.max(0, (phaseLen - phasePos) / phaseLen)
    }
    return cap ? Math.min(1, e / cap) : Math.min(1, e / 1800)
  }

  function ringColorRaw(e, c) {
    const cap = capSecs(c), bt = c.blockType
    const isCountdown = bt === 'AMRAP' || bt === 'EMOM' || bt === 'Estações'
    const rem = isCountdown ? ringProgressRaw(e, c) : (cap ? (cap - e) / cap : 1)
    if (rem > 0.5) return 'var(--green)'
    if (rem > 0.2) return 'var(--gold)'
    return 'var(--red)'
  }

  // ── Wake Lock ────────────────────────────────────────────────────────────
  async function acquireWL() {
    if (!('wakeLock' in navigator)) return
    try { wakeLockRef.current = await navigator.wakeLock.request('screen') } catch {}
  }
  function releaseWL() {
    if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null }
  }

  // ── Persist ──────────────────────────────────────────────────────────────
  function saveStateRaw() {
    try {
      localStorage.setItem(K_STATE, JSON.stringify({
        cfg: cfgRef.current, status: statusRef.current,
        startEpoch: startEpoch.current, pausedMs: pausedMs.current,
        pauseStart: pauseStart.current, splits: splitsRef.current, finalSecs: finSecsRef.current
      }))
    } catch {}
  }

  // ── Tick ─────────────────────────────────────────────────────────────────
  function startTick() {
    if (tickRef.current) return
    tickRef.current = setInterval(() => tickFnRef.current?.(), 250)
  }
  function stopTick() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }

  tickFnRef.current = () => {
    if (statusRef.current !== 'running') return
    const c = cfgRef.current, e = elapsedRaw()
    if (Math.floor(e) % 5 === 0) saveStateRaw()
    if (c.blockType === 'EMOM') {
      const min = Math.floor(e / 60)
      if (lastEmomMin.current >= 0 && min !== lastEmomMin.current) navigator.vibrate?.([300,100,300])
      lastEmomMin.current = min
    }
    if (c.blockType === 'Estações') {
      const { idx } = stInfoRaw(e, c), phase = stPhaseRaw(e, c), key = `${idx}-${phase}`
      if (lastStKey.current !== null && key !== lastStKey.current)
        navigator.vibrate?.(phase === 'work' ? [400,100,400] : [200])
      lastStKey.current = key
    }
    if (isTimeUpRaw(e, c)) {
      navigator.vibrate?.([500,200,500,200,500])
      doFinishRaw()
      return
    }
    forceUpdate(n => n + 1)
  }

  function doFinishRaw() {
    const fe = elapsedRaw()
    const c = cfgRef.current, currentSplits = [...splitsRef.current]
    stopTick(); releaseWL()
    pushHist({
      blockType: c.blockType, blockLabel: c.blockLabel || c.blockType || 'Timer',
      sessionId: c.sessionId, sessionDate: c.sessionDate,
      athleteId: c.athleteId, blockId: c.blockId,
      totalTime: fmt(fe), totalSecs: fe,
      splits: currentSplits, date: new Date().toISOString().slice(0,10), timestamp: Date.now()
    })
    localStorage.removeItem(K_STATE)
    finSecsRef.current = fe
    statusRef.current  = 'finished'
    setFinalSecs(fe)
    setSplits(currentSplits)
    setHist(loadHist())
    setStatus('finished')
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  function startTimer() {
    startEpoch.current = Date.now()
    pausedMs.current = 0; pauseStart.current = 0; lastEmomMin.current = -1; lastStKey.current = null
    statusRef.current = 'running'
    setSplits([]); setFinalSecs(0); setStatus('running')
    acquireWL(); startTick()
  }

  function enterGetReady() {
    grSecsRef.current = 10
    setGetreadySecs(10)
    statusRef.current = 'getready'
    setStatus('getready')
    navigator.vibrate?.([80])
    getreadyRef.current = setInterval(() => {
      grSecsRef.current -= 1
      if (grSecsRef.current <= 0) {
        clearInterval(getreadyRef.current)
        getreadyRef.current = null
        startTimer()
      } else {
        navigator.vibrate?.([40])
        setGetreadySecs(grSecsRef.current)
      }
    }, 1000)
  }

  function handleStart() {
    if (cfg.countdown) enterGetReady()
    else startTimer()
  }

  function cancelGetReady() {
    if (getreadyRef.current) { clearInterval(getreadyRef.current); getreadyRef.current = null }
    statusRef.current = 'ready'
    setStatus('ready')
  }

  function pauseTimer() {
    if (statusRef.current !== 'running') return
    pauseStart.current = Date.now()
    stopTick()
    statusRef.current = 'paused'
    setStatus('paused')
    saveStateRaw()
  }
  function resumeTimer() {
    if (statusRef.current !== 'paused') return
    pausedMs.current += Date.now() - pauseStart.current
    pauseStart.current = 0
    statusRef.current = 'running'
    setStatus('running')
    acquireWL(); startTick()
  }
  function doLap() {
    if (statusRef.current !== 'running') return
    const e = elapsedRaw(), bt = cfgRef.current?.blockType
    const newSplits = [...splitsRef.current, e]
    splitsRef.current = newSplits
    if (cfgRef.current?.rounds && newSplits.length >= cfgRef.current.rounds && (bt === 'For Time' || bt === 'Benchmark')) {
      doFinishRaw(); return
    }
    setSplits(newSplits)
    saveStateRaw()
    forceUpdate(n => n + 1)
  }
  function doDiscard() { dropHist(0); window.history.back() }
  function goBack() {
    if (statusRef.current === 'running') { if (!confirm('Pausar e sair?')) return; pauseTimer() }
    if (statusRef.current === 'getready') cancelGetReady()
    window.history.back()
  }

  function buildScheduleUrl(sessId, sessDate, blockId, athId, perfTime, perfRounds) {
    const p = new URLSearchParams()
    if (sessDate)    p.set('date', sessDate)
    if (sessId)      p.set('openLog', sessId)
    if (blockId)     p.set('blockId', blockId)
    if (athId)       p.set('athlete', athId)
    if (perfTime)    p.set('prefill', perfTime)
    if (perfRounds)  p.set('prefillRounds', String(perfRounds))
    return 'schedule.html?' + p.toString()
  }
  function registerResult() {
    const c = cfg
    location.href = buildScheduleUrl(c.sessionId, c.sessionDate, c.blockId, c.athleteId, fmt(finalSecs), splits.length || '')
  }
  function registerHist(i) {
    const h = loadHist(), e = h[i]; if (!e) return
    location.href = buildScheduleUrl(e.sessionId, e.sessionDate, e.blockId, e.athleteId, e.totalTime, e.splits?.length || '')
  }

  function selectBenchmark(bm, category) {
    const exes = benchmarkToTimerExes(bm)
    setForm(f => ({
      ...f,
      type:   bm.type || 'For Time',
      cap:    bm.duration || 20,
      rounds: bm.rounds ?? '',
      label:  bm.name,
      exes,
      goal:   '',
    }))
    setBmCat(null)
  }

  function applyCfg() {
    const stVal = form.st === '' ? 45 : Number(form.st)
    const ttVal = form.tt === '' ? 15 : Number(form.tt)
    const newCfg = {
      blockType: form.type, blockLabel: form.label.trim(), timeCap: parseInt(form.cap) || 20,
      rounds: parseInt(form.rounds) || null,
      exercises: String(form.exes).split('\n').map(l => l.trim()).filter(Boolean),
      stationTime:  isNaN(stVal) ? 45 : stVal,
      transitionTime: isNaN(ttVal) ? 15 : ttVal,
      sessionId: null, sessionDate: null, athleteId: null, blockId: null,
      goal: form.goal?.trim() || '',
      countdown: form.countdown ?? true,
    }
    try { localStorage.setItem(K_CFG, JSON.stringify(newCfg)) } catch {}
    cfgRef.current = newCfg
    statusRef.current = 'ready'
    setCfg(newCfg); setStatus('ready')
  }

  // ── Mount effects ────────────────────────────────────────────────────────
  useEffect(() => {
    const sv = loadSaved()
    if (sv?.status === 'running') startTick()
    function fixVh() { const r = document.getElementById('root'); if (r) r.style.height = window.innerHeight + 'px' }
    fixVh()
    window.addEventListener('resize', fixVh)
    function onVisibility() { if (document.visibilityState === 'visible' && statusRef.current === 'running') acquireWL() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('resize', fixVh)
      document.removeEventListener('visibilitychange', onVisibility)
      stopTick(); releaseWL()
      if (getreadyRef.current) { clearInterval(getreadyRef.current); getreadyRef.current = null }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render values ────────────────────────────────────────────────────────
  const e      = elapsedRaw()
  const bt     = cfg.blockType
  const cap    = capSecs(cfg)
  const isPaused = status === 'paused'
  const exes   = cfg.exercises || []

  function getDisplay() {
    if (bt === 'AMRAP') return Math.max(0, cap - e)
    if (bt === 'EMOM')  return Math.max(0, 60 - (e % 60))
    if (bt === 'Estações') {
      const { pos, st, tt } = stCycleRaw(e, cfg)
      return pos < st ? Math.max(0, st - pos) : Math.max(0, st + tt - pos)
    }
    return e
  }
  const disp = getDisplay()

  const progress  = ringProgressRaw(e, cfg)
  const rOffset   = +(RING_C * (1 - progress)).toFixed(1)
  const rColor    = isPaused ? 'var(--dim)' : ringColor_s()
  function ringColor_s() { return ringColorRaw(e, cfg) }

  let clockCls = s.clock
  if (isPaused) clockCls += ' ' + s.paused
  else if (bt === 'AMRAP' && disp <= 30) clockCls += ' ' + s.warn
  else if ((bt === 'For Time' || bt === 'Benchmark') && cap && e >= cap * 0.85) clockCls += ' ' + s.warn

  // ── Sub-renders ──────────────────────────────────────────────────────────
  function renderRing(clockJsx) {
    return (
      <div className={s.ringArea}>
        <div className={s.ringWrap}>
          <svg className={s.ringSvg} viewBox="0 0 200 200" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
            <circle className={s.ringTrack} cx="100" cy="100" r={RING_R} />
            <circle className={s.ringFill} cx="100" cy="100" r={RING_R}
              style={{ strokeDasharray: RING_C, strokeDashoffset: rOffset, stroke: rColor }} />
          </svg>
          <div className={s.ringInner}>{clockJsx}</div>
        </div>
      </div>
    )
  }

  function renderClock() {
    let lbl = '', roundJsx = null
    if (bt === 'EMOM') {
      const min = Math.floor(e / 60), total = cfg.timeCap || 0
      lbl = isPaused ? 'pausado' : 'até o próximo'
      roundJsx = <div className={s.round}>MIN {min + 1} / {total}</div>
    } else if (bt === 'Estações') {
      const { idx, round } = stInfoRaw(e, cfg), phase = stPhaseRaw(e, cfg), rounds = cfg.rounds ?? 1
      lbl = isPaused ? 'pausado' : phase === 'work' ? 'trabalhando' : 'transição'
      roundJsx = <div className={s.round}>EST {idx + 1}/{exes.length} · RD {round + 1}/{rounds}</div>
    } else {
      const lapN = splits.length, rounds = cfg.rounds
      lbl = isPaused ? 'pausado' : bt === 'AMRAP' ? 'restando' : 'decorrido'
      if (lapN > 0 || rounds) roundJsx = <div className={s.round}>RD {lapN + 1}{rounds ? '/' + rounds : ''}</div>
    }
    return (
      <>
        <div className={clockCls}>{fmt(disp)}</div>
        <div className={s.clockLbl}>{lbl}</div>
        {roundJsx}
      </>
    )
  }

  function renderHdr(showCap = true) {
    const capStr = cfg.timeCap ? `${cfg.timeCap}:00` : ''
    return (
      <div className={s.hdr}>
        <div className={s.hdrMid}>
          <div className={s.type}>{MODE_LBL[bt] ?? bt}</div>
          <div className={s.label}>{cfg.blockLabel || 'Timer'}</div>
        </div>
        {showCap && capStr && <div className={s.capTag}>CAP {capStr}</div>}
        {cfg.goal && <div className={s.goalTag}>↗ {cfg.goal}</div>}
      </div>
    )
  }

  function renderRecentes(showRegister) {
    if (!hist.length) return null
    return (
      <div className={s.recentes}>
        <div className={s.recTtl}>Histórico local</div>
        {hist.map((h, i) => (
          <div key={h.timestamp ?? i} className={s.recItem}>
            <div className={s.recInfo}>
              <div className={s.recName}>{h.blockLabel || h.blockType || 'Timer'}</div>
              <div className={s.recT}>{h.totalTime || '—'}</div>
              <div className={s.recDate}>{h.date ? fmtDate(h.date) : ''}</div>
            </div>
            {showRegister && h.sessionId && (
              <button className={s.recBtn} onClick={() => registerHist(i)}>REGISTRAR</button>
            )}
          </div>
        ))}
      </div>
    )
  }

  // ── Screens ──────────────────────────────────────────────────────────────

  // Get-ready countdown screen
  if (status === 'getready') {
    return (
      <div className={s.wrap}>
        <div className={s.hdr}>
          <button className={s.back} onClick={cancelGetReady}>✕</button>
          <div className={s.hdrMid}><div className={s.label}>{cfg.blockLabel || 'Timer'}</div></div>
        </div>
        <div className={s.getreadyBody}>
          <div className={s.getreadyLbl}>Preparar</div>
          <div className={s.getreadyNum}>{getreadySecs}</div>
        </div>
        <Nav active="timer" gymName={gymName} />
      </div>
    )
  }

  if (status === 'cfg') {
    const showEst  = form.type === 'Estações'
    const isBench  = form.type === 'Benchmark'
    const isAmrap  = form.type === 'AMRAP'
    const isEmom   = form.type === 'EMOM'
    const isForTime = form.type === 'For Time'
    const showRounds = !isEmom && !isAmrap && !isBench

    // Cap label per type
    const capLabel = isAmrap ? 'Duração (min)' : isEmom ? 'Duração total (min)' : 'Cap (min)'

    // Benchmark picker
    const BM_CATS = [
      { key: 'Girls',  ic: '🎀', color: '#d05878', desc: `${BENCHMARK_GIRLS.length} WODs clássicos` },
      { key: 'Heroes', ic: '🏅', color: '#d8a840', desc: `${BENCHMARK_HEROES.length} WODs heróis` },
    ]
    const renderBenchmarkPicker = () => {
      if (!bmCat) {
        return (
          <div className={s.bmPickerBg}>
            <div className={s.cfgLbl}>Selecionar Benchmark</div>
            <div className={s.bmCatGrid}>
              {BM_CATS.map(cat => (
                <div key={cat.key} className={s.bmCatCard}
                  style={{ borderLeftColor: cat.color }}
                  onClick={() => setBmCat(cat.key)}>
                  <span className={s.bmCatIc} style={{ color: cat.color }}>{cat.ic}</span>
                  <span className={s.bmCatLbl}>{cat.key}</span>
                  <span className={s.bmCatDesc}>{cat.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )
      }
      const list = bmCat === 'Girls' ? BENCHMARK_GIRLS : BENCHMARK_HEROES
      const catColor = BM_CATS.find(c => c.key === bmCat)?.color || 'var(--teal)'
      return (
        <div className={s.bmList}>
          <button className={s.bmListBack} onClick={() => setBmCat(null)}>← {bmCat}</button>
          {list.map(bm => (
            <div key={bm.name} className={s.bmItem}
              style={{ borderLeftColor: catColor }}
              onClick={() => selectBenchmark(bm, bmCat)}>
              <div className={s.bmItemName}>{bm.name}</div>
              <div className={s.bmItemDesc}>{bm.desc}</div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className={s.wrap}>
        <div className={s.hdr}>
          <div className={s.hdrMid}><div className={s.label}>Configurar Timer</div></div>
        </div>
        <div className={s.cfg}>
          <div>
            <div className={s.cfgLbl}>Tipo de WOD</div>
            <select className={s.cfgSel} value={form.type}
              onChange={e => { setForm(f => ({ ...f, type: e.target.value })); setBmCat(null) }}>
              <option>For Time</option><option>AMRAP</option><option>EMOM</option>
              <option>Benchmark</option><option>Estações</option>
            </select>
          </div>

          {isBench ? renderBenchmarkPicker() : (
            <>
              <div className={s.cfgRow}>
                <div className={s.cfgHalf}>
                  <div className={s.cfgLbl}>{capLabel}</div>
                  <input className={s.cfgInp} type="number" min="1" max="90" value={form.cap}
                    onChange={e => setForm(f => ({ ...f, cap: e.target.value }))} />
                </div>
                {showRounds && (
                  <div className={s.cfgHalf}>
                    <div className={s.cfgLbl}>{showEst ? 'Rounds por estação' : 'Rounds (opcional)'}</div>
                    <input className={s.cfgInp} type="number" min="1" max="50" placeholder="—" value={form.rounds}
                      onChange={e => setForm(f => ({ ...f, rounds: e.target.value }))} />
                  </div>
                )}
                {isAmrap && (
                  <div className={s.cfgHalf}>
                    <div className={s.cfgLbl}>Meta (opcional)</div>
                    <input className={s.cfgInp} type="text" placeholder="ex: 20 rounds" value={form.goal}
                      onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
                  </div>
                )}
              </div>

              {isForTime && (
                <div>
                  <div className={s.cfgLbl}>Meta de Tempo (opcional)</div>
                  <input className={s.cfgInp} type="text" placeholder="ex: 08:30" value={form.goal}
                    onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
                </div>
              )}

              {showEst && (
                <div>
                  <div className={s.cfgLbl}>Estações</div>
                  <div className={s.estOpts}>
                    <div className={s.cfgHalf}>
                      <input className={s.cfgInp} type="number" min="0" value={form.st}
                        onChange={e => setForm(f => ({ ...f, st: e.target.value }))} />
                      <div className={s.cfgLbl} style={{ marginTop: 3 }}>Trabalho (seg)</div>
                    </div>
                    <div className={s.cfgHalf}>
                      <input className={s.cfgInp} type="number" min="0" value={form.tt}
                        onChange={e => setForm(f => ({ ...f, tt: e.target.value }))} />
                      <div className={s.cfgLbl} style={{ marginTop: 3 }}>Transição (seg)</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className={s.cfgLbl}>Nome (opcional)</div>
                <input className={s.cfgInp} type="text" placeholder="ex: Cindy, Murph..." value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>

              <div>
                <div className={s.cfgLbl}>Exercícios (um por linha)</div>
                <textarea className={s.cfgTa}
                  placeholder={isEmom ? '1 exercício por minuto\nCicla se houver menos exercícios que minutos' : '21 Pull-ups\n21 KB Swings 24kg\n400m Run'}
                  value={form.exes} onChange={e => setForm(f => ({ ...f, exes: e.target.value }))} />
                {isEmom && <div className={s.cfgHint}>1 exercício por minuto — cicla se houver menos exercícios que minutos.</div>}
              </div>

              <div>
                <div className={s.cfgLbl}>Opções</div>
                <div className={s.pillRow}>
                  <div
                    className={`${s.pillOpt}${form.countdown ? ' ' + s.pillOptActive : ''}`}
                    onClick={() => setForm(f => ({ ...f, countdown: !f.countdown }))}>
                    ⏱ Contagem regressiva 10s
                  </div>
                </div>
              </div>

              {renderRecentes(false)}
            </>
          )}
        </div>
        {!isBench && (
          <div className={s.ctrl}>
            <button className={`${s.btn} ${s.btnStart}`} onClick={applyCfg}>▶ INICIAR</button>
          </div>
        )}
        <Nav active="timer" gymName={gymName} />
      </div>
    )
  }

  if (status === 'ready') {
    const metaParts = [
      cfg.timeCap ? `${cfg.timeCap} min` : '',
      cfg.rounds  ? `${cfg.rounds} rounds` : '',
      cfg.goal    ? `Meta: ${cfg.goal}` : '',
      bt === 'Estações' ? `${cfg.stationTime ?? 45}s / ${cfg.transitionTime ?? 15}s transição` : '',
    ].filter(Boolean)
    return (
      <div className={s.wrap}>
        {renderHdr()}
        <div className={s.readyBody}>
          <div>
            <span className={s.badge}>{MODE_LBL[bt] ?? bt}</span>
            <div className={s.rLabel}>{cfg.blockLabel || 'WOD'}</div>
            {metaParts.length > 0 && <div className={s.rMeta}>{metaParts.join(' · ')}</div>}
          </div>
          {exes.length > 0 && (
            <div className={s.rExlist}>
              {exes.map((ex, i) => (
                <div key={i} className={s.rEx}>
                  <span className={s.rDot} />
                  <div className={s.rExBody}>
                    {exLabel(ex)}
                    {bt === 'Estações' && ex.exercises?.length > 0 && (
                      <div>{ex.exercises.map((se, j) => <div key={j} className={s.rSubEx}>{exLabel(se)}</div>)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {renderRecentes(false)}
        </div>
        <div className={s.ctrl}>
          <button className={`${s.btn} ${s.btnStart}`} onClick={handleStart}>▶ INICIAR</button>
        </div>
        <Nav active="timer" gymName={gymName} />
      </div>
    )
  }

  if (status === 'finished') {
    const rounds = splits.length
    const canReg = !!(cfg.sessionId)
    return (
      <div className={s.wrap}>
        {renderHdr(false)}
        <div className={s.finBody}>
          <div className={s.finTtl}>FINALIZADO</div>
          <div className={s.finTime}>{fmt(finalSecs)}</div>
          {rounds > 0 && <div className={s.finRounds}>{rounds} ROUND{rounds !== 1 ? 'S' : ''}</div>}
          {splits.length > 0 && (
            <>
              <div className={s.finSplitTtl}>Splits por round</div>
              <div className={s.finSplitGrid}>
                {splits.map((sp, i) => {
                  const prev = i > 0 ? splits[i-1] : 0
                  return (
                    <div key={i} className={s.finSplitCell}>
                      <div className={s.finSplitN}>RD {i+1}</div>
                      <div className={s.finSplitV}>{fmt(sp - prev)}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {renderRecentes(true)}
        </div>
        <div className={s.ctrl}>
          <button className={`${s.btn} ${s.btnDisc}`} onClick={doDiscard}>DESCARTAR</button>
          {canReg
            ? <button className={`${s.btn} ${s.btnReg}`} onClick={registerResult}>REGISTRAR</button>
            : <button className={`${s.btn} ${s.btnClose}`} onClick={goBack}>FECHAR</button>
          }
        </div>
        <Nav active="timer" gymName={gymName} />
      </div>
    )
  }

  // Running / Paused screen
  const showLap = bt !== 'EMOM' && bt !== 'Estações'
  return (
    <div className={s.wrap}>
      {renderHdr()}
      <div className={`${s.body} ${s.runLayout}`}>
        <div className={s.runLeft}>
          {renderRing(renderClock())}
          <div className={s.ctrl}>
            {showLap && <button className={`${s.btn} ${s.btnLap}`} onClick={doLap}>LAP</button>}
            {isPaused
              ? <button className={`${s.btn} ${s.btnResume}`} onClick={resumeTimer}>▶ RETOMAR</button>
              : <button className={`${s.btn} ${s.btnPause}`} onClick={pauseTimer}>❚❚</button>
            }
            <button className={`${s.btn} ${s.btnDone}`} onClick={() => doFinishRaw()}>✓ FIM</button>
          </div>
        </div>
        <div className={s.scroll}>
          {splits.length > 0 && (
            <div className={s.splits}>
              {splits.map((sp, i) => {
                const prev = i > 0 ? splits[i-1] : 0
                return <div key={i} className={s.splitItem}><b>R{i+1} </b>{fmt(sp - prev)}</div>
              })}
            </div>
          )}
          {exes.map((ex, i) => {
            let exCls = s.ex
            if (bt === 'Estações') {
              const { idx } = stInfoRaw(e, cfg), phase = stPhaseRaw(e, cfg)
              if (i === idx && phase === 'work') exCls += ' ' + s.exActive
              else if (i < idx) exCls += ' ' + s.exDone
            } else if (bt === 'EMOM' && exes.length > 0) {
              const curIdx = Math.floor(e / 60) % exes.length
              if (i === curIdx) exCls += ' ' + s.exActive
              else if (i < curIdx) exCls += ' ' + s.exDone
            }
            return (
              <div key={i} className={exCls}>
                <span className={s.exDot} />
                <div className={s.exBody}>
                  {exLabel(ex)}
                  {bt === 'Estações' && ex.exercises?.length > 0 && (
                    <div>{ex.exercises.map((se, j) => <div key={j} className={s.subEx}>{exLabel(se)}</div>)}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <Nav active="timer" gymName={gymName} />
    </div>
  )
}
