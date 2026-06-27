import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../../utils/supabase'
import { loadLS, loadAthletes, toISO } from '../../utils/storage'
import { uid, blkLabel, blkColor, isWodBlock, rankResults, perfStr } from '../../public/lib/wod.js'
import { WodSlide, TimerSlide, ResultsSlide, QrSlide } from '../../public/tv/TV.jsx'

const SLIDES = [
  { id: 'blank',   icon: 'ti-square-off', lbl: 'Apagado' },
  { id: 'wod',     icon: 'ti-barbell',    lbl: 'WOD' },
  { id: 'timer',   icon: 'ti-clock',      lbl: 'Timer' },
  { id: 'results', icon: 'ti-trophy',     lbl: 'Resultados' },
  { id: 'qr',      icon: 'ti-qrcode',     lbl: 'QR Code' },
]
const TIMER_TYPES = ['For Time', 'AMRAP', 'EMOM', 'Benchmark']
const DAY_PT      = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MON_PT      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const GROUP_COLORS = ['#4ac8c0','#d8a840','#d05878','#6a88d0','#70b070','#c880c0']
const GROUP_NAMES  = ['Grupo A','Grupo B','Grupo C','Grupo D','Grupo E','Grupo F']

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_PT[d.getDay()]} ${d.getDate()} ${MON_PT[d.getMonth()]}`
}
function sessLabel(s) {
  return s.sessionName || (Array.isArray(s.mainTraining) ? s.mainTraining[0] : s.mainTraining) || 'Sessão'
}
function fmtSecs(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ── Weekly calendar strip ─────────────────────────────────────────────────────
function WeekStrip({ selDate, sessions, onChange }) {
  function startOfWeek(iso) {
    const d = new Date((iso || toISO(new Date())) + 'T12:00:00')
    d.setDate(d.getDate() - d.getDay())
    return toISO(d)
  }
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selDate))

  useEffect(() => {
    const ws = startOfWeek(selDate)
    if (ws !== weekStart) setWeekStart(ws)
  }, [selDate])

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return { iso: toISO(d), d }
  })
  const today = toISO(new Date())

  function prevWeek() {
    const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() - 7); setWeekStart(toISO(d))
  }
  function nextWeek() {
    const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() + 7); setWeekStart(toISO(d))
  }

  const navBtn = {
    background: 'transparent', border: '1px solid #2a231c', borderRadius: 4,
    color: '#806850', cursor: 'pointer', width: 28, height: 52,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 4 }}>
      <button style={navBtn} onClick={prevWeek}><i className="ti ti-chevron-left" /></button>
      {days.map(({ iso, d }) => {
        const isSel = iso === selDate, isToday = iso === today
        const hasSess = (sessions[iso] || []).length > 0
        return (
          <div key={iso} onClick={() => onChange(iso)} style={{
            flex: 1, minWidth: 0, cursor: 'pointer', borderRadius: 4, padding: '6px 2px', textAlign: 'center',
            background: isSel ? '#0d1a1a' : '#161210',
            border: `1px solid ${isSel ? '#4ac8c0' : isToday ? '#6a4a0a' : '#2a231c'}`,
            boxShadow: isSel ? '0 0 0 1px #4ac8c0' : 'none', transition: 'border-color .15s',
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: isSel ? '#4ac8c0' : '#806850', textTransform: 'uppercase', letterSpacing: '.07em', lineHeight: 1.2 }}>
              {DAY_PT[d.getDay()]}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: isSel ? '#4ac8c0' : isToday ? '#d8a840' : '#c8b090', lineHeight: 1.15, marginTop: 1 }}>
              {d.getDate()}
            </div>
            {hasSess && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? '#4ac8c0' : '#d8a840', margin: '3px auto 0' }} />}
          </div>
        )
      })}
      <button style={navBtn} onClick={nextWeek}><i className="ti ti-chevron-right" /></button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TvController({ sessions: propSessions }) {
  const [tv,          setTv]          = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [results,     setResults]     = useState([])
  const [athletes,    setAthletes]    = useState([])
  const [gymName,     setGymName]     = useState('')
  const [selDate,     setSelDate]     = useState(() => toISO(new Date()))
  const [selSessId,   setSelSessId]   = useState(null)
  const [timerType,   setTimerType]   = useState('For Time')
  const [timerCap,    setTimerCap]    = useState(20)
  const [timerBlkId,  setTimerBlkId]  = useState(null)
  const [resLoading,  setResLoading]  = useState(false)
  // Phase 3 — class tracking
  const [classLabel,  setClassLabel]  = useState('Turma')
  const [todayClasses, setTodayClasses] = useState([])
  // Live registration
  const [liveRegs,    setLiveRegs]    = useState({}) // { [athleteId]: { perfTime, scale } }
  const [liveScales,  setLiveScales]  = useState({}) // { [athleteId]: 'Rx'|'Sc'|'Adp' }
  // Groups
  const [autoAdvance, setAutoAdvance] = useState(false)
  const hasAutoAdvRef    = useRef(false)
  const autoAdvanceRef   = useRef(false)
  const rotationCountRef = useRef(0)
  const selSessObjRef    = useRef(null)
  const activeClassRef   = useRef(null)
  const previewRef  = useRef(null)
  const [prevScale, setPrevScale]     = useState(1)
  const tvRef = useRef(tv)
  tvRef.current = tv

  // Early derived — needed in useEffect dependency arrays before the later derived block
  const activeClass = todayClasses.find(c => c.id === tv?.class_id && !c.reset_at) || null
  const groups      = activeClass?.groups || []

  // Scale preview
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setPrevScale(el.clientWidth / 1920))
    obs.observe(el); setPrevScale(el.clientWidth / 1920)
    return () => obs.disconnect()
  }, [])

  // Initial load
  useEffect(() => {
    async function init() {
      setAthletes(loadAthletes())
      const [tvR, stR] = await Promise.all([
        supabase.from('tv_state').select('*').eq('id', 1).maybeSingle(),
        supabase.from('settings').select('value').eq('id', 1).maybeSingle(),
      ])
      if (stR.data?.value?.gymName) setGymName(stR.data.value.gymName)
      if (!tvR.data) return
      const t = tvR.data
      setTv(t)
      if (t.date_key)       setSelDate(t.date_key)
      if (t.session_id)     setSelSessId(t.session_id)
      if (t.timer_type)     setTimerType(t.timer_type)
      if (t.timer_cap_secs) setTimerCap(Math.round(t.timer_cap_secs / 60))
      setTimerBlkId(t.timer_block_id || null)
    }
    init()
  }, [])

  // Subscribe to tv_state for multi-device sync
  useEffect(() => {
    const chan = supabase.channel('tv-ctrl-coach')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tv_state' }, p => setTv(p.new))
      .subscribe()
    return () => { chan.unsubscribe() }
  }, [])

  // Load + subscribe to class_executions for selected session
  const loadClasses = useCallback(async () => {
    if (!selSessId || !selDate) return
    const { data } = await supabase.from('class_executions')
      .select('*').eq('session_id', selSessId).eq('date_key', selDate)
      .order('created_at', { ascending: true })
    if (data) setTodayClasses(data)
  }, [selSessId, selDate])

  useEffect(() => { loadClasses() }, [loadClasses])

  useEffect(() => {
    if (!selSessId) return
    const chan = supabase.channel(`ce-ctrl-${selSessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_executions',
        filter: `session_id=eq.${selSessId}` }, () => loadClasses())
      .subscribe()
    return () => { chan.unsubscribe() }
  }, [selSessId, loadClasses])

  // Load results
  const loadResults = useCallback(async () => {
    if (!selSessId) return
    setResLoading(true)
    const { data } = await supabase.from('results_v2').select('*').eq('session_id', selSessId)
    if (data) setResults(data.map(r => ({
      id: r.id, date: r.date, athleteId: r.athlete_id, sessionId: r.session_id, blocks: r.blocks,
    })))
    setResLoading(false)
  }, [selSessId])

  useEffect(() => { loadResults() }, [loadResults])

  // push tv_state — safe when tv is null
  const push = useCallback(async (patch) => {
    const base = tvRef.current ?? { slide: 'blank', timer_type: 'For Time', timer_cap_secs: 1200, timer_paused_elapsed: 0 }
    const next = { ...base, ...patch, updated_at: Date.now() }
    setTv(next)
    setSaving(true)
    await supabase.from('tv_state').upsert({ id: 1, ...next })
    setSaving(false)
  }, [])

  // Keep autoAdvanceRef in sync for use inside ref-based functions
  useEffect(() => { autoAdvanceRef.current = autoAdvance }, [autoAdvance])

  // Auto-advance: reset flag (and rotation count) when a new timer run starts
  useEffect(() => {
    hasAutoAdvRef.current    = false
    rotationCountRef.current = 0
  }, [tv?.timer_started_at])

  // Auto-advance: advance groups when timer cap is reached (respects rest)
  useEffect(() => {
    if (!autoAdvance || !tv?.timer_started_at) return
    const id = setInterval(() => {
      const t = tvRef.current
      if (!t?.timer_started_at || !t?.timer_cap_secs) return
      const elapsed = Math.floor((Date.now() - t.timer_started_at) / 1000 + (t.timer_paused_elapsed ?? 0))
      if (elapsed >= t.timer_cap_secs && !hasAutoAdvRef.current) {
        hasAutoAdvRef.current = true
        const rSecs = t.rotation_rest_secs || 0
        if (rSecs > 0) {
          push({ rotation_rest_until: Date.now() + rSecs * 1000 })
        } else {
          advanceFromRefs()
        }
      }
    }, 500)
    return () => clearInterval(id)
  }, [autoAdvance, tv?.timer_started_at, push])

  // No-groups sequential advance: auto-advance block when timer cap is reached
  useEffect(() => {
    if (groups.length > 0 || !tv?.timer_started_at || !tv?.timer_block_id) return
    const id = setInterval(() => {
      const t = tvRef.current
      if (!t?.timer_started_at || !t?.timer_cap_secs || !t?.timer_block_id) return
      const elapsed = Math.floor((Date.now() - t.timer_started_at) / 1000 + (t.timer_paused_elapsed ?? 0))
      if (elapsed >= t.timer_cap_secs && !hasAutoAdvRef.current) {
        hasAutoAdvRef.current = true
        const rSecs = t.rotation_rest_secs || 0
        if (rSecs > 0) {
          push({ rotation_rest_until: Date.now() + rSecs * 1000 })
        } else {
          advanceFromRefs()
        }
      }
    }, 500)
    return () => clearInterval(id)
  }, [groups.length, tv?.timer_started_at, tv?.timer_block_id, push])

  // Rest expiry: fires for both groups and no-groups
  useEffect(() => {
    const until = tv?.rotation_rest_until
    if (!until) return
    const delay = until - Date.now()
    if (delay <= 0) { advanceFromRefs(); return }
    const id = setTimeout(advanceFromRefs, delay + 300)
    return () => clearTimeout(id)
  }, [tv?.rotation_rest_until, push])

  // Class tracking
  async function startClass() {
    if (!selSessId) return
    const id = uid()
    const row = { id, date_key: selDate, session_id: selSessId, class_label: classLabel.trim() || 'Turma', athlete_ids: [], anon_names: [], created_at: Date.now() }
    await supabase.from('class_executions').insert(row)
    await push({ class_id: id })
  }

  async function endClass() {
    const classId = tvRef.current?.class_id
    if (!classId) return
    await supabase.from('class_executions').update({ reset_at: Date.now() }).eq('id', classId)
    await push({ class_id: null })
  }

  // Derived
  const sessions    = propSessions || loadLS()
  const dayS        = sessions[selDate] || []
  const selSessObj  = dayS.find(s => s.id === selSessId) || null
  const wodBlocks   = (selSessObj?.blocks || []).filter(isWodBlock)
  const selBl       = wodBlocks[0]
  const blockRes    = selBl
    ? results.filter(r => r.sessionId === selSessId).flatMap(r =>
        (r.blocks || []).filter(b => b.blockId === selBl.id).map(b => ({
          ...b, athleteId: r.athleteId,
          athleteName: athletes.find(a => a.id === r.athleteId)?.name || '—',
        })))
    : []
  const ranked      = selBl ? rankResults(blockRes, selBl.type) : []
  const slide       = tv?.slide || 'blank'
  const timerRun    = !!tv?.timer_started_at
  const pastClasses = todayClasses.filter(c => c.reset_at)
  const groupPositions    = tv?.group_positions || {}
  const rotationBlockIds  = tv?.rotation_block_ids || []
  const rotationBlocks    = rotationBlockIds.length > 0
    ? wodBlocks.filter(b => rotationBlockIds.includes(b.id))
    : wodBlocks
  const restSecs          = tv?.rotation_rest_secs || 0
  selSessObjRef.current  = selSessObj
  activeClassRef.current = activeClass
  const checkinUrl  = (id) => `${window.location.origin}/CrossFit-Apps/schedule.html?date=${selDate}&session=${selSessId}&checkin=${id}`

  const previewTv = useMemo(() => ({
    ...(tv ?? {}), slide, session_id: selSessId, date_key: selDate,
    timer_type: timerType, timer_cap_secs: timerCap * 60, timer_block_id: timerBlkId,
  }), [tv, slide, selSessId, selDate, timerType, timerCap, timerBlkId])

  function selectSlide(id) { push({ slide: id, session_id: selSessId, date_key: selDate }) }

  function selectSession(id) {
    setSelSessId(id)
    const sess = dayS.find(s => s.id === id)
    const blks = (sess?.blocks || []).filter(isWodBlock)
    const first = blks[0]
    if (first) {
      setTimerBlkId(first.id)
      if (first.type && TIMER_TYPES.includes(first.type)) setTimerType(first.type)
      setTimerCap(parseInt(first.duration) || 20)
    } else { setTimerBlkId(null) }
    push({ session_id: id, date_key: selDate, timer_block_id: first?.id || null })
  }

  function selectBlock(id) {
    setTimerBlkId(id || null)
    const bl = id ? (selSessObj?.blocks || []).find(b => b.id === id) : null
    if (bl) {
      if (bl.type && TIMER_TYPES.includes(bl.type)) setTimerType(bl.type)
      setTimerCap(parseInt(bl.duration) || timerCap)
    }
    push({ timer_block_id: id || null })
  }

  async function startTimer() {
    rotationCountRef.current = 0
    await push({ slide: 'timer', timer_type: timerType, timer_cap_secs: timerCap * 60,
      timer_block_id: timerBlkId, timer_started_at: Date.now(),
      timer_paused_elapsed: tv?.timer_paused_elapsed ?? 0 })
  }
  async function pauseTimer() {
    const elapsed = tv?.timer_started_at
      ? (Date.now() - tv.timer_started_at) / 1000 + (tv.timer_paused_elapsed ?? 0)
      : (tv?.timer_paused_elapsed ?? 0)
    await push({ timer_started_at: null, timer_paused_elapsed: Math.floor(elapsed) })
  }
  async function resetTimer() {
    await push({ timer_started_at: null, timer_paused_elapsed: 0 })
    setLiveRegs({})
  }

  // Live registration helpers
  function elapsedSecs() {
    const t = tvRef.current
    if (!t) return 0
    if (t.timer_started_at) return Math.floor((Date.now() - t.timer_started_at) / 1000 + (t.timer_paused_elapsed ?? 0))
    return t.timer_paused_elapsed ?? 0
  }
  function currentTimerBlock() {
    const bid = tvRef.current?.timer_block_id || timerBlkId
    if (!bid || !selSessObj) return null
    return (selSessObj.blocks || []).find(b => b.id === bid) || null
  }

  async function registerLive(athleteId, scale) {
    const secs = elapsedSecs()
    const block = currentTimerBlock()
    const { data: existing } = await supabase.from('results_v2')
      .select('id,blocks').eq('athlete_id', athleteId)
      .eq('session_id', selSessId).eq('date', selDate)
      .maybeSingle()
    const newBlk = {
      blockId: block?.id || 'live', blockType: 'For Time',
      blockLabel: block?.label || block?.type || 'For Time',
      perfTime: secs, scale, rpe: null,
    }
    const merged = existing
      ? [...(existing.blocks || []).filter(b => b.blockId !== newBlk.blockId), newBlk]
      : [newBlk]
    await supabase.from('results_v2').upsert({
      ...(existing ? { id: existing.id } : {}),
      date: selDate, athlete_id: athleteId, session_id: selSessId,
      blocks: merged, logged_by_athlete: false,
    })
    setLiveRegs(r => ({ ...r, [athleteId]: { perfTime: secs, scale } }))
    loadResults()
  }

  async function undoLive(athleteId) {
    const block = currentTimerBlock()
    const bid = block?.id || 'live'
    const { data: existing } = await supabase.from('results_v2')
      .select('id,blocks').eq('athlete_id', athleteId)
      .eq('session_id', selSessId).eq('date', selDate)
      .maybeSingle()
    if (!existing) return
    const trimmed = (existing.blocks || []).filter(b => b.blockId !== bid)
    await supabase.from('results_v2').update({ blocks: trimmed }).eq('id', existing.id)
    setLiveRegs(r => { const n = { ...r }; delete n[athleteId]; return n })
    loadResults()
  }

  // Advance timer state — handles both group rotation and no-group sequential advance.
  // Reads from refs so it's safe to call from effects without stale closure issues.
  function advanceFromRefs() {
    const wods    = (selSessObjRef.current?.blocks || []).filter(isWodBlock)
    const rotIds  = tvRef.current?.rotation_block_ids || []
    const rotBlks = rotIds.length > 0 ? wods.filter(b => rotIds.includes(b.id)) : wods
    const grps    = activeClassRef.current?.groups || []

    if (grps.length > 0) {
      // ── Groups: rotate positions, check cycle cap, transition to finisher ──
      if (rotBlks.length === 0) { push({ rotation_rest_until: null }); return }
      const curPos = tvRef.current?.group_positions || {}
      const newPos = {}
      for (const g of grps) {
        const idx   = rotBlks.findIndex(b => b.id === curPos[g.id])
        newPos[g.id] = rotBlks[(idx + 1) % rotBlks.length].id
      }
      rotationCountRef.current += 1
      const cycleComplete = rotationCountRef.current >= rotBlks.length

      if (cycleComplete) {
        rotationCountRef.current = 0
        // Finisher = WOD blocks outside the rotation selection
        const finishers = rotIds.length > 0 ? wods.filter(b => !rotIds.includes(b.id)) : []
        if (finishers.length > 0) {
          const first = finishers[0]
          push({
            group_positions: newPos,
            rotation_rest_until: null,
            timer_block_id: first.id,
            timer_type: first.type || 'For Time',
            timer_cap_secs: (parseInt(first.duration) || 20) * 60,
            ...(autoAdvanceRef.current ? { timer_started_at: Date.now(), timer_paused_elapsed: 0 } : {}),
          })
          setTimerBlkId(first.id)
          setTimerType(first.type || 'For Time')
          setTimerCap(parseInt(first.duration) || 20)
          setAutoAdvance(false) // finisher is manual — coach controls from here
        } else {
          // Cycle done, no finisher — stop
          push({ group_positions: newPos, rotation_rest_until: null })
        }
      } else {
        // Mid-cycle: rotate and restart timer (only if autoAdvance is on)
        push({
          group_positions: newPos,
          rotation_rest_until: null,
          ...(autoAdvanceRef.current ? { timer_started_at: Date.now(), timer_paused_elapsed: 0 } : {}),
        })
      }
    } else {
      // ── No groups: sequential block advance ──
      const curId   = tvRef.current?.timer_block_id
      const idx     = rotBlks.findIndex(b => b.id === curId)
      const next    = idx >= 0 ? rotBlks[idx + 1] : null
      if (next) {
        push({
          timer_block_id: next.id,
          timer_type: next.type || 'For Time',
          timer_cap_secs: (parseInt(next.duration) || 20) * 60,
          timer_started_at: Date.now(),
          timer_paused_elapsed: 0,
          rotation_rest_until: null,
        })
        setTimerBlkId(next.id)
        setTimerType(next.type || 'For Time')
        setTimerCap(parseInt(next.duration) || 20)
      } else {
        // Last block done — stop
        push({ rotation_rest_until: null })
      }
    }
  }

  // Groups
  async function createGroups(n) {
    if (!activeClass) return
    const allAthIds = activeClass.athlete_ids || []
    const allAnons  = activeClass.anon_names  || []
    const newGroups = Array.from({ length: n }, (_, i) => ({
      id: uid(), name: GROUP_NAMES[i], color: GROUP_COLORS[i], athleteIds: [], anonNames: [],
    }))
    allAthIds.forEach((id, i) => newGroups[i % n].athleteIds.push(id))
    allAnons.forEach((name, i) => newGroups[i % n].anonNames.push(name))
    await supabase.from('class_executions').update({ groups: newGroups }).eq('id', activeClass.id)
    if (wodBlocks.length > 0) {
      const newPos = {}
      newGroups.forEach((g, i) => { newPos[g.id] = wodBlocks[i % wodBlocks.length].id })
      await push({ group_positions: newPos })
    }
  }

  async function dissolveGroups() {
    if (!activeClass) return
    await supabase.from('class_executions').update({ groups: [] }).eq('id', activeClass.id)
    await push({ group_positions: {}, rotation_block_ids: [], rotation_rest_secs: 0, rotation_rest_until: null })
  }

  async function setGroupBlock(groupId, blockId) {
    await push({ group_positions: { ...groupPositions, [groupId]: blockId } })
  }

  async function reassignMember(m, targetGroupId) {
    if (!activeClass) return
    const newGroups = groups.map(g => {
      const ng = { ...g, athleteIds: [...(g.athleteIds || [])], anonNames: [...(g.anonNames || [])] }
      if (m.type === 'real') {
        ng.athleteIds = ng.athleteIds.filter(id => id !== m.id)
        if (g.id === targetGroupId) ng.athleteIds.push(m.id)
      } else {
        ng.anonNames = ng.anonNames.filter(n => n !== m.name)
        if (g.id === targetGroupId) ng.anonNames.push(m.name)
      }
      return ng
    })
    await supabase.from('class_executions').update({ groups: newGroups }).eq('id', activeClass.id)
  }

  async function advanceAll() {
    if (rotationBlocks.length === 0 || groups.length === 0) return
    const newPos = {}
    for (const g of groups) {
      const idx = rotationBlocks.findIndex(b => b.id === groupPositions[g.id])
      newPos[g.id] = rotationBlocks[(idx + 1) % rotationBlocks.length].id
    }
    await push({ group_positions: newPos, rotation_rest_until: null })
  }

  async function toggleRotationBlock(blId) {
    const cur = tv?.rotation_block_ids || []
    const isAll = cur.length === 0
    const base  = isAll ? wodBlocks.map(b => b.id) : cur
    const next  = base.includes(blId) ? base.filter(id => id !== blId) : [...base, blId]
    const normalized = next.length === wodBlocks.length ? [] : next
    await push({ rotation_block_ids: normalized })
  }

  // Styles
  const card      = { background: '#111', border: '1px solid #2a231c', borderRadius: 6, padding: '16px 18px' }
  const cardTitle = { fontSize: 11, fontWeight: 900, color: '#d8a840', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 14 }
  const inputSt   = { fontSize: 12, padding: '5px 8px', background: '#111', border: '1px solid #2a231c', color: '#c8b090', borderRadius: 4, outline: 'none', width: '100%', fontFamily: 'inherit' }
  const roInputSt = { ...inputSt, background: '#0d1a10', color: '#4ac8c0', borderColor: '#1a3a20', cursor: 'default' }
  const lblSt     = { fontSize: 10, fontWeight: 700, color: '#806850', textTransform: 'uppercase', letterSpacing: '.1em', display: 'block', marginBottom: 4 }
  const btnBase   = { padding: '6px 12px', fontSize: 12, fontWeight: 700, border: '1px solid #2a231c', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }
  const pill      = { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: '1px solid #2a231c', color: '#c8b090', background: '#161210' }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto', fontFamily: 'var(--font, inherit)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderBottom: '1px solid #2a231c', paddingBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#f0e8d0', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            <i className="ti ti-device-tv" style={{ marginRight: 8, color: '#4ac8c0' }} />Quadro ao Vivo
          </div>
          <div style={{ fontSize: 11, color: '#554a3a', marginTop: 3 }}>
            {tv?.slide && tv.slide !== 'blank'
              ? <span style={{ color: '#48b860' }}>● TV ativa · {SLIDES.find(s=>s.id===tv.slide)?.lbl}</span>
              : <span>● TV apagada</span>}
            {saving && <span style={{ color: '#806850', marginLeft: 10 }}>Salvando...</span>}
          </div>
        </div>
        <button onClick={() => window.open('/CrossFit-Apps/tv.html', '_blank')}
          style={{ ...btnBase, background: '#4ac8c0', borderColor: '#4ac8c0', color: '#0d0b09', fontSize: 13, padding: '8px 18px' }}>
          <i className="ti ti-device-tv" /> Abrir TV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

        {/* ── Left: controls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Session picker */}
          <div style={card}>
            <div style={cardTitle}>Sessão</div>
            <div style={{ marginBottom: 14 }}>
              <WeekStrip selDate={selDate} sessions={sessions}
                onChange={d => { setSelDate(d); setSelSessId(null) }} />
            </div>
            {dayS.length === 0
              ? <div style={{ fontSize: 12, color: '#554a3a', fontStyle: 'italic', marginTop: 4 }}>Nenhuma sessão neste dia</div>
              : <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {dayS.map(sess => {
                    const sel = selSessId === sess.id
                    const blocks = (sess.blocks || []).filter(bl => bl.exercises?.length || bl.stations?.length)
                    return (
                      <div key={sess.id} onClick={() => selectSession(sess.id)} style={{
                        background: sel ? '#0d1a1a' : '#161210',
                        border: `1px solid ${sel ? '#4ac8c0' : '#2a231c'}`,
                        boxShadow: sel ? '0 0 0 1px #4ac8c0' : 'none',
                        borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
                        minWidth: 160, maxWidth: 220, flexShrink: 0, transition: 'border-color .15s',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: sel ? '#4ac8c0' : '#f0e8d0', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sessLabel(sess)}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {blocks.slice(0, 5).map(bl => {
                            const col = blkColor(bl)
                            return <span key={bl.id} style={{ fontSize: 9, fontWeight: 700, color: col, background: col+'1a', border: `1px solid ${col}44`, borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{blkLabel(bl)}</span>
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
            }
          </div>

          {/* ── Aula (Class tracking) ── */}
          <div style={card}>
            <div style={cardTitle}>Aula</div>

            {!tv?.class_id ? (
              /* No active class */
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={lblSt}>Turma</label>
                  <input value={classLabel} onChange={e => setClassLabel(e.target.value)}
                    placeholder="ex: 7h, 9h, Turma A" style={inputSt} />
                </div>
                <button onClick={startClass} disabled={!selSessId}
                  style={{ ...btnBase, background: selSessId ? '#48b860' : '#1a1a1a', borderColor: selSessId ? '#48b860' : '#2a231c', color: selSessId ? '#0d0b09' : '#554a3a', flexShrink: 0 }}>
                  <i className="ti ti-whistle" /> Iniciar Aula
                </button>
              </div>
            ) : (
              /* Active class */
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#48b860', display: 'inline-block', boxShadow: '0 0 6px #48b860' }} />
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#4ac8c0' }}>{activeClass?.class_label || 'Aula ativa'}</span>
                  </div>
                  <button onClick={endClass} style={{ ...btnBase, fontSize: 11, borderColor: '#c84038', color: '#c84038', background: 'transparent' }}>
                    <i className="ti ti-square-off" /> Encerrar
                  </button>
                </div>

                {/* Check-in count */}
                <div style={{ fontSize: 13, color: '#c8b090', marginBottom: 10 }}>
                  {((activeClass?.athlete_ids?.length || 0) + (activeClass?.anon_names?.length || 0))} atletas presentes
                  <button onClick={loadClasses} style={{ ...btnBase, fontSize: 10, padding: '2px 6px', marginLeft: 8, background: 'transparent', color: '#806850' }}>
                    <i className="ti ti-refresh" />
                  </button>
                </div>

                {/* Athlete pills */}
                {((activeClass?.athlete_ids?.length || 0) + (activeClass?.anon_names?.length || 0)) > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {(activeClass?.athlete_ids || []).map(id => {
                      const a = athletes.find(x => x.id === id)
                      return a ? <span key={id} style={{ ...pill, borderColor: '#1a3a1a', color: '#48b860', background: '#0a1a0a' }}>{a.name}</span> : null
                    })}
                    {(activeClass?.anon_names || []).map((name, i) => (
                      <span key={i} style={{ ...pill, borderStyle: 'dashed' }}>{name}</span>
                    ))}
                  </div>
                )}

                {/* Check-in link */}
                <div style={{ fontSize: 11, color: '#554a3a', background: '#161210', border: '1px solid #2a231c', borderRadius: 4, padding: '6px 10px' }}>
                  <i className="ti ti-qrcode" style={{ marginRight: 4 }} />
                  QR no slide <strong style={{ color: '#c8b090' }}>QR Code</strong> leva ao check-in
                </div>
              </>
            )}

            {/* Previous classes today */}
            {pastClasses.length > 0 && (
              <div style={{ marginTop: 14, borderTop: '1px solid #2a231c', paddingTop: 12 }}>
                <div style={{ fontSize: 10, color: '#554a3a', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Aulas anteriores hoje</div>
                {pastClasses.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
                    <span style={{ color: '#806850', fontWeight: 700 }}>{c.class_label}</span>
                    <span style={{ color: '#554a3a' }}>{(c.athlete_ids?.length || 0) + (c.anon_names?.length || 0)} atletas</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Slide selector */}
          <div style={card}>
            <div style={cardTitle}>Slide</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SLIDES.map(({ id, icon, lbl }) => (
                <button key={id} onClick={() => selectSlide(id)}
                  style={{ ...btnBase, background: slide === id ? '#4ac8c0' : '#1a1a1a', borderColor: slide === id ? '#4ac8c0' : '#2a231c', color: slide === id ? '#0d0b09' : '#c8b090' }}>
                  <i className={`ti ${icon}`} /> {lbl}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 11, color: '#554a3a' }}>QR Code:</span>
              {[{ label: 'Ativo', val: true }, { label: 'Oculto', val: false }].map(({ label, val }) => {
                const active = val ? tv?.show_qr !== false : tv?.show_qr === false
                return (
                  <button key={label} onClick={() => push({ show_qr: val })}
                    style={{
                      padding: '3px 10px', fontSize: 11, fontWeight: 700, borderRadius: 4, fontFamily: 'inherit',
                      border: `1px solid ${active ? (val ? '#4ac8c0' : '#806850') : '#2a231c'}`,
                      background: active ? (val ? 'rgba(74,200,192,.1)' : 'rgba(128,104,80,.12)') : 'transparent',
                      color: active ? (val ? '#4ac8c0' : '#806850') : '#554a3a',
                      cursor: 'pointer',
                    }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Timer */}
          <div style={card}>
            <div style={cardTitle}>Timer</div>

            {groups.length > 0 ? (() => {
              // Groups mode: show rotation summary, hide block selector
              const rotCap      = parseInt(rotationBlocks[0]?.duration) || timerCap
              const finishers   = rotationBlockIds.length > 0 ? wodBlocks.filter(b => !rotationBlockIds.includes(b.id)) : []
              const totalSecs   = rotationBlocks.length * (rotCap * 60 + restSecs)
              const totalMin    = Math.ceil(totalSecs / 60)
              return (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#806850', marginBottom: 6 }}>
                    {rotationBlocks.length} blocos × {rotCap} min
                    {restSecs > 0 ? ` + ${restSecs}s descanso` : ''}
                    {' '}= <strong style={{ color: '#c8b090' }}>{totalMin} min total</strong>
                    {finishers.length > 0 && (
                      <span style={{ color: '#554a3a' }}> → {finishers.map(b => b.label || b.type).join(' + ')} (finisher)</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={lblSt}>Tipo <span style={{ color: '#4ac8c0', fontSize: 9 }}>(do bloco)</span></label>
                      <div style={roInputSt}>{timerType}</div>
                    </div>
                    <div>
                      <label style={lblSt}>Cap (min)</label>
                      <div style={roInputSt}>{rotCap}</div>
                    </div>
                  </div>
                </div>
              )
            })() : (
              // No-groups mode: block selector + optional descanso
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={lblSt}>Bloco WOD</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <div onClick={() => selectBlock(null)} style={{
                      background: !timerBlkId ? '#1a120a' : '#161210',
                      border: `1px solid ${!timerBlkId ? '#d8a840' : '#2a231c'}`,
                      boxShadow: !timerBlkId ? '0 0 0 1px #d8a840' : 'none',
                      borderRadius: 4, padding: '6px 12px', cursor: 'pointer', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: !timerBlkId ? '#d8a840' : '#806850', textTransform: 'uppercase', letterSpacing: '.06em' }}>Personalizado</div>
                    </div>
                    {wodBlocks.map(bl => {
                      const col = blkColor(bl), sel = timerBlkId === bl.id
                      return (
                        <div key={bl.id} onClick={() => selectBlock(bl.id)} style={{
                          background: sel ? col+'18' : '#161210', border: `1px solid ${sel ? col : '#2a231c'}`,
                          boxShadow: sel ? `0 0 0 1px ${col}` : 'none',
                          borderRadius: 4, padding: '6px 12px', cursor: 'pointer', textAlign: 'center', minWidth: 80,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: sel ? col : '#c8b090', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{blkLabel(bl)}</div>
                          <div style={{ fontSize: 9, color: sel ? col+'cc' : '#554a3a', fontWeight: 700, textTransform: 'uppercase' }}>{bl.type || bl.label}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: timerBlkId && wodBlocks.length > 1 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={lblSt}>Tipo {timerBlkId && <span style={{ color: '#4ac8c0', fontSize: 9 }}>(do bloco)</span>}</label>
                    {timerBlkId
                      ? <div style={roInputSt}>{timerType}</div>
                      : <select value={timerType} onChange={e => setTimerType(e.target.value)} style={inputSt}>
                          {TIMER_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>}
                  </div>
                  <div>
                    <label style={lblSt}>Cap (min)</label>
                    <input type="number" min={1} max={120} value={timerCap} onChange={e => setTimerCap(Number(e.target.value))} style={inputSt} />
                  </div>
                  {timerBlkId && wodBlocks.length > 1 && (
                    <div>
                      <label style={lblSt}>Descanso (seg)</label>
                      <input type="number" min={0} max={600} value={restSecs}
                        onChange={e => push({ rotation_rest_secs: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={inputSt} />
                    </div>
                  )}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {!timerRun
                ? <button onClick={startTimer} style={{ ...btnBase, background: '#48b860', borderColor: '#48b860', color: '#0d0b09' }}><i className="ti ti-player-play" /> Iniciar</button>
                : <button onClick={pauseTimer} style={{ ...btnBase, background: '#d8a840', borderColor: '#d8a840', color: '#0d0b09' }}><i className="ti ti-player-pause" /> Pausar</button>}
              <button onClick={resetTimer} style={{ ...btnBase, background: 'transparent', borderColor: '#3a3a3a', color: '#806850' }}>
                <i className="ti ti-player-stop" /> Resetar
              </button>
              {(tv?.timer_paused_elapsed > 0) && (
                <span style={{ fontSize: 12, color: '#c8b090', fontFamily: 'monospace', marginLeft: 8 }}>
                  {String(Math.floor(tv.timer_paused_elapsed/60)).padStart(2,'0')}:{String(tv.timer_paused_elapsed%60).padStart(2,'0')} acumulado
                </span>
              )}
            </div>
          </div>

          {/* Live results */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={cardTitle}>Resultados ao vivo</div>
              <button onClick={loadResults} disabled={resLoading}
                style={{ ...btnBase, fontSize: 11, padding: '4px 10px', background: 'transparent', color: '#806850' }}>
                <i className={`ti ${resLoading ? 'ti-loader-2' : 'ti-refresh'}`} /> Atualizar
              </button>
            </div>
            {ranked.length === 0
              ? <div style={{ fontSize: 12, color: '#554a3a' }}>Nenhum resultado ainda.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ranked.slice(0, 10).map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 8px', background: '#161210', borderRadius: 3 }}>
                      <span style={{ fontSize: 11, color: '#554a3a', width: 22 }}>#{i+1}</span>
                      <span style={{ fontSize: 12, color: '#f0e8d0', fontWeight: 700, flex: 1 }}>{r.athleteName}</span>
                      <span style={{ fontSize: 11, color: '#806850' }}>{r.scale || 'RX'}</span>
                      <span style={{ fontSize: 12, color: '#4ac8c0', fontFamily: 'monospace' }}>{perfStr(r, selBl?.type)}</span>
                    </div>
                  ))}
                </div>}
          </div>

          {/* ── Registro ao Vivo (For Time only) ── */}
          {timerType === 'For Time' && activeClass &&
           ((activeClass.athlete_ids?.length || 0) + (activeClass.anon_names?.length || 0)) > 0 &&
           (timerRun || (tv?.timer_paused_elapsed > 0)) && (
            <div style={card}>
              <div style={{ ...cardTitle, color: '#4ac8c0' }}>
                <i className="ti ti-flag-check" style={{ marginRight: 6 }} />Registro ao Vivo
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(activeClass.athlete_ids || []).map(aid => {
                  const ath = athletes.find(a => a.id === aid)
                  if (!ath) return null
                  const reg = liveRegs[aid]
                  const scale = liveScales[aid] ?? 'Rx'
                  const scaleStyle = (s) => ({
                    padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${scale === s ? '#4ac8c0' : '#2a231c'}`,
                    background: scale === s ? '#0d1a1a' : 'transparent',
                    color: scale === s ? '#4ac8c0' : '#806850',
                    borderRadius: 3,
                  })
                  return (
                    <div key={aid} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                      background: reg ? '#0d1a0a' : '#161210',
                      border: `1px solid ${reg ? '#48b86044' : '#2a231c'}`,
                      borderRadius: 4, opacity: reg ? 0.7 : 1,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: reg ? '#48b860' : '#f0e8d0', flex: 1 }}>{ath.name}</span>
                      {!reg ? (
                        <>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {['Rx','Sc','Adp'].map(s => (
                              <button key={s} style={scaleStyle(s)}
                                onClick={() => setLiveScales(ls => ({ ...ls, [aid]: s }))}>
                                {s}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => registerLive(aid, scale)}
                            style={{ ...btnBase, background: '#4ac8c0', borderColor: '#4ac8c0', color: '#0d0b09', padding: '5px 12px', fontSize: 12 }}>
                            ✓ Registrar
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 12, color: '#48b860', fontFamily: 'monospace', fontWeight: 700 }}>{fmtSecs(reg.perfTime)}</span>
                          <span style={{ fontSize: 10, color: '#806850' }}>{reg.scale}</span>
                          <button onClick={() => undoLive(aid)}
                            style={{ ...btnBase, background: 'transparent', borderColor: '#c84038', color: '#c84038', padding: '4px 10px', fontSize: 11 }}>
                            ✕ Desfazer
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
                {/* Anon athletes — display only (no results_v2 registration) */}
                {(activeClass.anon_names || []).map((name, i) => (
                  <div key={`anon-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    background: '#161210', border: '1px dashed #2a231c', borderRadius: 4, opacity: 0.5,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#806850', flex: 1 }}>{name}</span>
                    <span style={{ fontSize: 10, color: '#554a3a' }}>visitante</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Grupos (rotation system) ── */}
          {activeClass && (
            <div style={card}>
              <div style={cardTitle}>Grupos</div>

              {groups.length === 0 ? (
                <div>
                  <div style={{ fontSize: 12, color: '#806850', marginBottom: 12 }}>
                    Divida a turma em grupos para rotação de blocos
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[2, 3, 4].map(n => (
                      <button key={n} onClick={() => createGroups(n)}
                        style={{ ...btnBase, background: '#1a1a1a', color: '#c8b090', fontSize: 13, padding: '8px 18px' }}>
                        {n} grupos
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Group cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {groups.map(grp => (
                      <div key={grp.id} style={{ border: `1px solid ${grp.color}44`, borderLeft: `4px solid ${grp.color}`, borderRadius: 4, padding: '10px 12px', background: '#161210' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ color: grp.color, fontWeight: 900, fontSize: 13, minWidth: 72 }}>{grp.name}</span>
                          <select value={groupPositions[grp.id] || ''} onChange={e => setGroupBlock(grp.id, e.target.value)}
                            style={{ ...inputSt, flex: 1, fontSize: 11 }}>
                            <option value="">— bloco —</option>
                            {wodBlocks.map(bl => (
                              <option key={bl.id} value={bl.id}>{blkLabel(bl)}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ fontSize: 11, color: '#806850' }}>
                          {[...(grp.athleteIds || []).map(id => athletes.find(a => a.id === id)?.name).filter(Boolean),
                            ...(grp.anonNames || [])].join(' · ') || <em style={{ color: '#554a3a' }}>Sem atletas</em>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Athlete assignment */}
                  {((activeClass.athlete_ids?.length || 0) + (activeClass.anon_names?.length || 0)) > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#554a3a', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Atribuir atletas</div>
                      {[
                        ...(activeClass.athlete_ids || []).map(id => ({ type: 'real', id, name: athletes.find(a => a.id === id)?.name || '?' })),
                        ...(activeClass.anon_names  || []).map(name => ({ type: 'anon', id: null, name })),
                      ].map(m => {
                        const inGroup = groups.find(g =>
                          m.type === 'real' ? (g.athleteIds || []).includes(m.id) : (g.anonNames || []).includes(m.name)
                        )
                        return (
                          <div key={m.type === 'real' ? m.id : `anon-${m.name}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #1a1a1a' }}>
                            <span style={{ flex: 1, fontSize: 12, color: '#f0e8d0' }}>{m.name}</span>
                            {groups.map(g => (
                              <button key={g.id} onClick={() => reassignMember(m, g.id)} style={{
                                width: 34, height: 28,
                                border: `2px solid ${inGroup?.id === g.id ? g.color : '#2a231c'}`,
                                background: inGroup?.id === g.id ? g.color + '22' : 'transparent',
                                color: inGroup?.id === g.id ? g.color : '#554a3a',
                                borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 800,
                              }}>
                                {g.name.replace('Grupo ', '')}
                              </button>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Rotation block selection */}
                  {wodBlocks.length > 0 && (
                    <div style={{ borderTop: '1px solid #2a231c', paddingTop: 12, marginTop: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#806850', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Rotação</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {wodBlocks.map(bl => {
                          const inRot = rotationBlockIds.length === 0 || rotationBlockIds.includes(bl.id)
                          return (
                            <button key={bl.id} onClick={() => toggleRotationBlock(bl.id)}
                              style={{ ...btnBase, fontSize: 10, padding: '4px 10px',
                                background: inRot ? '#0d1a10' : '#111',
                                borderColor: inRot ? '#4ac8c0' : '#2a231c',
                                color: inRot ? '#4ac8c0' : '#554a3a' }}>
                              {inRot ? '✓' : '○'} {bl.label || bl.type}
                            </button>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#806850', textTransform: 'uppercase', letterSpacing: '.1em', flexShrink: 0 }}>Descanso</span>
                        <input type="number" min="0" max="600" value={restSecs}
                          onChange={e => push({ rotation_rest_secs: Math.max(0, parseInt(e.target.value) || 0) })}
                          style={{ ...inputSt, width: 64, textAlign: 'center' }} />
                        <span style={{ fontSize: 10, color: '#554a3a' }}>seg</span>
                      </div>
                    </div>
                  )}

                  {/* Rotation controls */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={advanceAll}
                      style={{ ...btnBase, background: '#4ac8c0', borderColor: '#4ac8c0', color: '#0d0b09' }}>
                      Avançar todos →
                    </button>
                    <button onClick={() => setAutoAdvance(a => !a)}
                      style={{ ...btnBase, borderColor: autoAdvance ? '#d8a840' : '#2a231c', background: autoAdvance ? '#1a120a' : '#1a1a1a', color: autoAdvance ? '#d8a840' : '#806850' }}>
                      ⏩ Auto: {autoAdvance ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={dissolveGroups}
                      style={{ ...btnBase, background: 'transparent', borderColor: '#c84038', color: '#c84038' }}>
                      Dissolve ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: preview ── */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#806850', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Preview</div>
          <div ref={previewRef} style={{ width: '100%', aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#0d0b09', border: '1px solid #2a231c', borderRadius: 6 }}>
            <div style={{ width: 1920, height: 1080, transform: `scale(${prevScale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
              {slide === 'blank'   && <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 28, color: '#222', textTransform: 'uppercase', letterSpacing: '.2em' }}>Apagado</span></div>}
              {slide === 'wod'     && <WodSlide     sessions={sessions} tv={previewTv} gymName={gymName} classExecs={todayClasses} athletes={athletes} />}
              {slide === 'timer'   && <TimerSlide   tv={previewTv}      sessions={sessions} classExecs={todayClasses} athletes={athletes} />}
              {slide === 'results' && <ResultsSlide tv={previewTv}      sessions={sessions} athletes={athletes} results={results} classExecs={todayClasses} />}
              {slide === 'qr'      && <QrSlide      tv={previewTv} />}
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#554a3a', marginTop: 6, textAlign: 'center' }}>
            Slide atual na TV: <strong style={{ color: '#c8b090' }}>{SLIDES.find(s=>s.id===slide)?.lbl || '—'}</strong>
          </div>
        </div>

      </div>
    </div>
  )
}
