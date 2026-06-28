import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../../utils/supabase'
import { loadLS, loadAthletes, toISO } from '../../utils/storage'
import { blkLabel, blkColor, isWodBlock, rankResults, perfStr } from '../../public/lib/wod.js'
import { WodSlide, TimerSlide, ResultsSlide, QrSlide } from '../../public/tv/TV.jsx'
import { useTvSync }           from '../../hooks/useTvSync'
import { useTimer }             from '../../hooks/useTimer'
import { useClassTracking }     from '../../hooks/useClassTracking'
import { useGroupRotation }     from '../../hooks/useGroupRotation'
import { useLiveRegistration }  from '../../hooks/useLiveRegistration'
import ClassPanel               from './tv/ClassPanel'
import GroupsPanel              from './tv/GroupsPanel'
import LiveRegistrationPanel    from './tv/LiveRegistrationPanel'

const SLIDES     = [
  { id: 'blank',   icon: 'ti-square-off', lbl: 'Apagado' },
  { id: 'wod',     icon: 'ti-barbell',    lbl: 'WOD' },
  { id: 'timer',   icon: 'ti-clock',      lbl: 'Timer' },
  { id: 'results', icon: 'ti-trophy',     lbl: 'Resultados' },
  { id: 'qr',      icon: 'ti-qrcode',     lbl: 'QR Code' },
]
const TIMER_TYPES = ['For Time', 'AMRAP', 'EMOM', 'Benchmark']
const DAY_PT      = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MON_PT      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

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
    const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() + i)
    return { iso: toISO(d), d }
  })
  const today = toISO(new Date())
  const navBtn = {
    background: 'transparent', border: '1px solid #2a231c', borderRadius: 4,
    color: '#806850', cursor: 'pointer', width: 28, height: 52,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
  }
  function prevWeek() { const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() - 7); setWeekStart(toISO(d)) }
  function nextWeek() { const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() + 7); setWeekStart(toISO(d)) }

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
            <div style={{ fontSize: 9, fontWeight: 800, color: isSel ? '#4ac8c0' : '#806850', textTransform: 'uppercase', letterSpacing: '.07em', lineHeight: 1.2 }}>{DAY_PT[d.getDay()]}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: isSel ? '#4ac8c0' : isToday ? '#d8a840' : '#c8b090', lineHeight: 1.15, marginTop: 1 }}>{d.getDate()}</div>
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
  const [selDate,     setSelDate]     = useState(() => toISO(new Date()))
  const [selSessId,   setSelSessId]   = useState(null)
  const [athletes,    setAthletes]    = useState([])
  const [results,     setResults]     = useState([])
  const [resLoading,  setResLoading]  = useState(false)
  const [gymName,     setGymName]     = useState('')
  const [prevScale,   setPrevScale]   = useState(1)
  const previewRef      = useRef(null)
  const selSessObjRef   = useRef(null)
  const activeClassRef  = useRef(null)
  const syncedFromTv    = useRef(false)

  const { tv, saving, tvRef, push } = useTvSync()
  const timer = useTimer({ tv, tvRef, push })

  // Derived session data — needed before remaining hooks
  const sessions   = propSessions || loadLS()
  const dayS       = sessions[selDate] || []
  const selSessObj = dayS.find(s => s.id === selSessId) || null
  const wodBlocks  = (selSessObj?.blocks || []).filter(isWodBlock)

  const classes = useClassTracking({ selSessId, selDate, push, classId: tv?.class_id })
  const groups  = classes.activeClass?.groups || []

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

  const liveReg = useLiveRegistration({
    tvRef, selSessId, selDate, timerBlkId: timer.timerBlkId, selSessObj, loadResults,
  })

  const rotation = useGroupRotation({
    push, tvRef, selSessObjRef, activeClassRef,
    setTimerBlkId: timer.setTimerBlkId, setTimerType: timer.setTimerType, setTimerCap: timer.setTimerCap,
    timerStartedAt: tv?.timer_started_at, timerBlockId: tv?.timer_block_id,
    rotationRestUntil: tv?.rotation_rest_until, groupsLength: groups.length,
  })

  // Scale the preview pane to fit its container
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setPrevScale(el.clientWidth / 1920))
    obs.observe(el); setPrevScale(el.clientWidth / 1920)
    return () => obs.disconnect()
  }, [])

  // One-time sync: when tv_state first loads, restore form controls to match current TV state
  useEffect(() => {
    if (!tv || syncedFromTv.current) return
    syncedFromTv.current = true
    if (tv.date_key)       setSelDate(tv.date_key)
    if (tv.session_id)     setSelSessId(tv.session_id)
    if (tv.timer_type)     timer.setTimerType(tv.timer_type)
    if (tv.timer_cap_secs) timer.setTimerCap(Math.round(tv.timer_cap_secs / 60))
    timer.setTimerBlkId(tv.timer_block_id || null)
  }, [tv]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load athletes from localStorage + gymName from Supabase
  useEffect(() => {
    setAthletes(loadAthletes())
    supabase.from('settings').select('value').eq('id', 1).maybeSingle()
      .then(({ data }) => { if (data?.value?.gymName) setGymName(data.value.gymName) })
  }, [])

  // Keep refs in sync for hooks that read them inside intervals/timeouts
  selSessObjRef.current  = selSessObj
  activeClassRef.current = classes.activeClass

  // Remaining derived values
  const selBl    = wodBlocks[0]
  const blockRes = selBl
    ? results.filter(r => r.sessionId === selSessId).flatMap(r =>
        (r.blocks || []).filter(b => b.blockId === selBl.id).map(b => ({
          ...b, athleteId: r.athleteId,
          athleteName: athletes.find(a => a.id === r.athleteId)?.name || '—',
        })))
    : []
  const ranked          = selBl ? rankResults(blockRes, selBl.type) : []
  const slide           = tv?.slide || 'blank'
  const timerRun        = !!tv?.timer_started_at
  const groupPositions  = tv?.group_positions   || {}
  const rotationBlockIds = tv?.rotation_block_ids || []
  const rotationBlocks  = rotationBlockIds.length > 0
    ? wodBlocks.filter(b => rotationBlockIds.includes(b.id))
    : wodBlocks
  const restSecs = tv?.rotation_rest_secs || 0

  function selectSlide(id) { push({ slide: id, session_id: selSessId, date_key: selDate }) }

  function selectSession(id) {
    setSelSessId(id)
    const sess = dayS.find(s => s.id === id)
    const blks = (sess?.blocks || []).filter(isWodBlock)
    const first = blks[0]
    if (first) {
      timer.setTimerBlkId(first.id)
      if (first.type && TIMER_TYPES.includes(first.type)) timer.setTimerType(first.type)
      timer.setTimerCap(parseInt(first.duration) || 20)
    } else { timer.setTimerBlkId(null) }
    push({ session_id: id, date_key: selDate, timer_block_id: first?.id || null })
  }

  async function handleStartTimer() {
    rotation.rotationCountRef.current = 0
    await timer.startTimer()
  }
  async function handleResetTimer() {
    await timer.resetTimer()
    liveReg.setLiveRegs({})
  }

  const previewTv = useMemo(() => ({
    ...(tv ?? {}), slide, session_id: selSessId, date_key: selDate,
    timer_type: timer.timerType, timer_cap_secs: timer.timerCap * 60, timer_block_id: timer.timerBlkId,
  }), [tv, slide, selSessId, selDate, timer.timerType, timer.timerCap, timer.timerBlkId])

  const roInput = { fontSize: 12, padding: '5px 8px', background: '#0d1a10', border: '1px solid #1a3a20', color: '#4ac8c0', borderRadius: 4, outline: 'none', width: '100%', fontFamily: 'inherit', cursor: 'default' }
  const s = {
    card:      { background: '#111', border: '1px solid #2a231c', borderRadius: 6, padding: '16px 18px' },
    cardTitle: { fontSize: 11, fontWeight: 900, color: '#d8a840', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 14 },
    input:     { fontSize: 12, padding: '5px 8px', background: '#111', border: '1px solid #2a231c', color: '#c8b090', borderRadius: 4, outline: 'none', width: '100%', fontFamily: 'inherit' },
    lbl:       { fontSize: 10, fontWeight: 700, color: '#806850', textTransform: 'uppercase', letterSpacing: '.1em', display: 'block', marginBottom: 4 },
    btn:       { padding: '6px 12px', fontSize: 12, fontWeight: 700, border: '1px solid #2a231c', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 },
    pill:      { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: '1px solid #2a231c', color: '#c8b090', background: '#161210' },
  }

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
          style={{ ...s.btn, background: '#4ac8c0', borderColor: '#4ac8c0', color: '#0d0b09', fontSize: 13, padding: '8px 18px' }}>
          <i className="ti ti-device-tv" /> Abrir TV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

        {/* ── Left: controls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Session picker */}
          <div style={s.card}>
            <div style={s.cardTitle}>Sessão</div>
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

          <ClassPanel tv={tv} selSessId={selSessId} activeClass={classes.activeClass}
            pastClasses={classes.pastClasses} athletes={athletes}
            classLabel={classes.classLabel} setClassLabel={classes.setClassLabel}
            startClass={classes.startClass} endClass={classes.endClass}
            loadClasses={classes.loadClasses} s={s} />

          {/* Slide selector */}
          <div style={s.card}>
            <div style={s.cardTitle}>Slide</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SLIDES.map(({ id, icon, lbl }) => (
                <button key={id} onClick={() => selectSlide(id)}
                  style={{ ...s.btn, background: slide === id ? '#4ac8c0' : '#1a1a1a', borderColor: slide === id ? '#4ac8c0' : '#2a231c', color: slide === id ? '#0d0b09' : '#c8b090' }}>
                  <i className={`ti ${icon}`} /> {lbl}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 11, color: '#554a3a' }}>QR Code:</span>
              {(() => {
                const qrOn = tv?.show_qr !== false
                return (
                  <button onClick={() => push({ show_qr: !qrOn })}
                    style={{ padding: '3px 12px', fontSize: 11, fontWeight: 700, borderRadius: 4, fontFamily: 'inherit',
                      border: `1px solid ${qrOn ? '#4ac8c0' : '#806850'}`,
                      background: qrOn ? 'rgba(74,200,192,.1)' : 'rgba(128,104,80,.12)',
                      color: qrOn ? '#4ac8c0' : '#806850', cursor: 'pointer' }}>
                    {qrOn ? 'Ativo' : 'Oculto'}
                  </button>
                )
              })()}
            </div>
          </div>

          {/* Timer */}
          <div style={s.card}>
            <div style={s.cardTitle}>Timer</div>

            {groups.length > 0 ? (() => {
              const rotCap    = parseInt(rotationBlocks[0]?.duration) || timer.timerCap
              const finishers = rotationBlockIds.length > 0 ? wodBlocks.filter(b => !rotationBlockIds.includes(b.id)) : []
              const totalSecs = rotationBlocks.length * (rotCap * 60 + restSecs)
              return (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#806850', marginBottom: 6 }}>
                    {rotationBlocks.length} blocos × {rotCap} min
                    {restSecs > 0 ? ` + ${restSecs}s descanso` : ''}
                    {' '}= <strong style={{ color: '#c8b090' }}>{Math.ceil(totalSecs / 60)} min total</strong>
                    {finishers.length > 0 && <span style={{ color: '#554a3a' }}> → {finishers.map(b => b.label || b.type).join(' + ')} (finisher)</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={s.lbl}>Tipo <span style={{ color: '#4ac8c0', fontSize: 9 }}>(do bloco)</span></label><div style={roInput}>{timer.timerType}</div></div>
                    <div><label style={s.lbl}>Cap (min)</label><div style={roInput}>{rotCap}</div></div>
                  </div>
                </div>
              )
            })() : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={s.lbl}>Bloco WOD</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <div onClick={() => timer.selectBlock(null, null)} style={{
                      background: !timer.timerBlkId ? '#1a120a' : '#161210',
                      border: `1px solid ${!timer.timerBlkId ? '#d8a840' : '#2a231c'}`,
                      boxShadow: !timer.timerBlkId ? '0 0 0 1px #d8a840' : 'none',
                      borderRadius: 4, padding: '6px 12px', cursor: 'pointer', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: !timer.timerBlkId ? '#d8a840' : '#806850', textTransform: 'uppercase', letterSpacing: '.06em' }}>Personalizado</div>
                    </div>
                    {wodBlocks.map(bl => {
                      const col = blkColor(bl), sel = timer.timerBlkId === bl.id
                      return (
                        <div key={bl.id} onClick={() => timer.selectBlock(bl.id, bl)} style={{
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
                <div style={{ display: 'grid', gridTemplateColumns: timer.timerBlkId && wodBlocks.length > 1 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={s.lbl}>Tipo {timer.timerBlkId && <span style={{ color: '#4ac8c0', fontSize: 9 }}>(do bloco)</span>}</label>
                    {timer.timerBlkId
                      ? <div style={roInput}>{timer.timerType}</div>
                      : <select value={timer.timerType} onChange={e => timer.setTimerType(e.target.value)} style={s.input}>
                          {TIMER_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>}
                  </div>
                  <div>
                    <label style={s.lbl}>Cap (min)</label>
                    <input type="number" min={1} max={120} value={timer.timerCap} onChange={e => timer.setTimerCap(Number(e.target.value))} style={s.input} />
                  </div>
                  {timer.timerBlkId && wodBlocks.length > 1 && (
                    <div>
                      <label style={s.lbl}>Descanso (seg)</label>
                      <input type="number" min={0} max={600} value={restSecs}
                        onChange={e => push({ rotation_rest_secs: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={s.input} />
                    </div>
                  )}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {!timerRun
                ? <button onClick={handleStartTimer} style={{ ...s.btn, background: '#48b860', borderColor: '#48b860', color: '#0d0b09' }}><i className="ti ti-player-play" /> Iniciar</button>
                : <button onClick={timer.pauseTimer} style={{ ...s.btn, background: '#d8a840', borderColor: '#d8a840', color: '#0d0b09' }}><i className="ti ti-player-pause" /> Pausar</button>}
              <button onClick={handleResetTimer} style={{ ...s.btn, background: 'transparent', borderColor: '#3a3a3a', color: '#806850' }}>
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
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={s.cardTitle}>Resultados ao vivo</div>
              <button onClick={loadResults} disabled={resLoading}
                style={{ ...s.btn, fontSize: 11, padding: '4px 10px', background: 'transparent', color: '#806850' }}>
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

          <LiveRegistrationPanel timerType={timer.timerType} activeClass={classes.activeClass}
            timerRun={timerRun} tv={tv} athletes={athletes}
            liveRegs={liveReg.liveRegs} liveScales={liveReg.liveScales}
            setLiveScales={liveReg.setLiveScales}
            registerLive={liveReg.registerLive} undoLive={liveReg.undoLive} s={s} />

          <GroupsPanel activeClass={classes.activeClass} groups={groups}
            wodBlocks={wodBlocks} rotationBlocks={rotationBlocks}
            rotationBlockIds={rotationBlockIds} groupPositions={groupPositions}
            restSecs={restSecs} timerCap={timer.timerCap} timerType={timer.timerType}
            autoAdvance={rotation.autoAdvance} setAutoAdvance={rotation.setAutoAdvance}
            athletes={athletes}
            createGroups={rotation.createGroups} dissolveGroups={rotation.dissolveGroups}
            setGroupBlock={rotation.setGroupBlock} reassignMember={rotation.reassignMember}
            advanceAll={rotation.advanceAll} toggleRotationBlock={rotation.toggleRotationBlock}
            push={push} s={s} />

        </div>

        {/* ── Right: preview ── */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#806850', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Preview</div>
          <div ref={previewRef} style={{ width: '100%', aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#0d0b09', border: '1px solid #2a231c', borderRadius: 6 }}>
            <div style={{ width: 1920, height: 1080, transform: `scale(${prevScale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
              {slide === 'blank'   && <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 28, color: '#222', textTransform: 'uppercase', letterSpacing: '.2em' }}>Apagado</span></div>}
              {slide === 'wod'     && <WodSlide     sessions={sessions} tv={previewTv} gymName={gymName} classExecs={classes.todayClasses} athletes={athletes} />}
              {slide === 'timer'   && <TimerSlide   tv={previewTv}      sessions={sessions} classExecs={classes.todayClasses} athletes={athletes} />}
              {slide === 'results' && <ResultsSlide tv={previewTv}      sessions={sessions} athletes={athletes} results={results} classExecs={classes.todayClasses} />}
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
