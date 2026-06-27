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
const DAY_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MON_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_PT[d.getDay()]} ${d.getDate()} ${MON_PT[d.getMonth()]}`
}
function sessLabel(s) {
  return s.sessionName || (Array.isArray(s.mainTraining) ? s.mainTraining[0] : s.mainTraining) || 'Sessão'
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
  const previewRef  = useRef(null)
  const [prevScale, setPrevScale]     = useState(1)
  const tvRef = useRef(tv)
  tvRef.current = tv

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
  const activeClass = todayClasses.find(c => c.id === tv?.class_id && !c.reset_at) || null
  const pastClasses = todayClasses.filter(c => c.reset_at)
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
  async function resetTimer() { await push({ timer_started_at: null, timer_paused_elapsed: 0 }) }

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
          </div>

          {/* Timer */}
          <div style={card}>
            <div style={cardTitle}>Timer</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
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
            </div>
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
        </div>

        {/* ── Right: preview ── */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#806850', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Preview</div>
          <div ref={previewRef} style={{ width: '100%', aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#0d0b09', border: '1px solid #2a231c', borderRadius: 6 }}>
            <div style={{ width: 1920, height: 1080, transform: `scale(${prevScale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
              {slide === 'blank'   && <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 28, color: '#222', textTransform: 'uppercase', letterSpacing: '.2em' }}>Apagado</span></div>}
              {slide === 'wod'     && <WodSlide     sessions={sessions} tv={previewTv} gymName={gymName} />}
              {slide === 'timer'   && <TimerSlide   tv={previewTv}      sessions={sessions} />}
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
