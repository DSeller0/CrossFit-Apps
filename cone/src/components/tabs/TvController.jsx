import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../utils/supabase'
import { loadLS, loadAthletes, toISO } from '../../utils/storage'
import { blkLabel, blkColor, isWodBlock, rankResults, perfStr } from '../../public/lib/wod.js'

const SLIDES = [
  { id: 'blank',   icon: 'ti-square-off',   lbl: 'Apagado' },
  { id: 'wod',     icon: 'ti-barbell',       lbl: 'WOD' },
  { id: 'timer',   icon: 'ti-clock',         lbl: 'Timer' },
  { id: 'results', icon: 'ti-trophy',        lbl: 'Resultados' },
  { id: 'qr',      icon: 'ti-qrcode',        lbl: 'QR Code' },
]
const TIMER_TYPES = ['For Time', 'AMRAP', 'EMOM', 'Benchmark']
const DAY_PT  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MON_PT  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec))
  return `${String(Math.floor(sec / 60)).padStart(2,'0')}:${String(sec % 60).padStart(2,'0')}`
}
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_PT[d.getDay()]} ${d.getDate()} ${MON_PT[d.getMonth()]}`
}

// ── Mini preview components ───────────────────────────────────────────────────
function PreviewWod({ sess, dateKey }) {
  if (!sess) return <div style={pSt.empty}>Nenhuma sessão</div>
  const blocks = (sess.blocks || []).filter(bl => bl.exercises?.length || bl.stations?.length)
  return (
    <div style={{ ...pSt.slide, padding: '8px 12px', gap: 6, display: 'flex', flexDirection: 'column' }}>
      <div style={pSt.sessName}>{sess.sessionName || (Array.isArray(sess.mainTraining) ? sess.mainTraining[0] : sess.mainTraining) || 'Sessão'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflow: 'hidden' }}>
        {blocks.slice(0, 4).map(bl => {
          const col = blkColor(bl)
          return (
            <div key={bl.id} style={{ borderLeft: `3px solid ${col}`, paddingLeft: 6, gap: 2, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: col, textTransform: 'uppercase', letterSpacing: '.06em' }}>{blkLabel(bl)}</div>
              {(bl.exercises || []).slice(0, 2).map((ex, i) => (
                <div key={i} style={{ fontSize: 8, color: '#c8b090' }}>{ex.name}</div>
              ))}
            </div>
          )
        })}
        {blocks.length > 4 && <div style={{ fontSize: 8, color: '#554a3a' }}>+{blocks.length - 4} blocos</div>}
      </div>
      <div style={{ fontSize: 7, color: '#554a3a', textTransform: 'uppercase', letterSpacing: '.08em' }}>{fmtDate(dateKey)} · QR ▼</div>
    </div>
  )
}

function PreviewTimer({ tv, sess }) {
  const block = sess?.blocks?.find(b => b.id === tv?.timer_block_id) || (sess?.blocks || []).find(isWodBlock)
  const bt = tv?.timer_type || 'For Time'
  const cap = tv?.timer_cap_secs ?? 1200
  const col = tv?.timer_started_at ? '#48b860' : '#d8a840'
  return (
    <div style={{ ...pSt.slide, flexDirection: 'row', alignItems: 'center', padding: '8px 12px', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '38%' }}>
        <div style={{ fontSize: 7, color: '#806850', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em' }}>{bt}</div>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: col, fontFamily: 'monospace' }}>
            {fmt(tv?.timer_paused_elapsed || 0)}
          </span>
        </div>
        <div style={{ fontSize: 7, color: '#554a3a' }}>Cap {Math.round(cap/60)}'</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
        {block && (() => {
          const exes = block.type === 'Estações' ? (block.stations||[]).flatMap(st=>st.exercises||[]) : (block.exercises||[])
          return exes.slice(0, 4).map((ex, i) => (
            <div key={i} style={{ fontSize: 9, color: '#f0e8d0', fontWeight: 700, textTransform: 'uppercase', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {ex.name}
            </div>
          ))
        })()}
      </div>
    </div>
  )
}

function PreviewResults({ ranked, selBl }) {
  return (
    <div style={{ ...pSt.slide, padding: '8px 12px', gap: 4 }}>
      <div style={{ fontSize: 9, fontWeight: 900, color: '#4ac8c0', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 4 }}>RESULTADOS</div>
      {selBl && <div style={{ fontSize: 8, color: '#c8b090', marginBottom: 4 }}>{blkLabel(selBl)}</div>}
      {ranked.slice(0, 5).map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#554a3a', width: 14 }}>#{i+1}</span>
          <span style={{ fontSize: 9, color: '#f0e8d0', fontWeight: 700, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.athleteName}</span>
          <span style={{ fontSize: 9, color: '#4ac8c0', fontFamily: 'monospace' }}>{perfStr(r, selBl?.type)}</span>
        </div>
      ))}
      {ranked.length === 0 && <div style={{ fontSize: 8, color: '#554a3a' }}>Aguardando resultados...</div>}
    </div>
  )
}

function PreviewQr() {
  return (
    <div style={{ ...pSt.slide, alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'column' }}>
      <div style={{ fontSize: 9, fontWeight: 900, color: '#f0e8d0', letterSpacing: '.15em', textTransform: 'uppercase' }}>REGISTRE</div>
      <div style={{ width: 60, height: 60, background: '#161210', border: '1px solid #2a231c', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="ti ti-qrcode" style={{ fontSize: 32, color: '#806850' }} />
      </div>
      <div style={{ fontSize: 7, color: '#554a3a', textTransform: 'uppercase', letterSpacing: '.1em' }}>Escaneie para registrar</div>
    </div>
  )
}

const pSt = {
  slide: { width: '100%', height: '100%', background: '#0d0b09', display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden' },
  sessName: { fontSize: 10, fontWeight: 900, color: '#f0e8d0', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 9, color: '#554a3a', textTransform: 'uppercase' },
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TvController({ sessions: propSessions }) {
  const [tv,         setTv]         = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [results,    setResults]    = useState([])
  const [athletes,   setAthletes]   = useState([])
  const [selDate,    setSelDate]    = useState(() => toISO(new Date()))
  const [selSessId,  setSelSessId]  = useState(null)
  const [timerType,  setTimerType]  = useState('For Time')
  const [timerCap,   setTimerCap]   = useState(20)
  const [timerBlkId, setTimerBlkId] = useState(null)
  const [resLoading, setResLoading] = useState(false)
  const chanRef   = useRef(null)
  const tvRef     = useRef(tv)
  tvRef.current   = tv

  // Load initial data
  useEffect(() => {
    async function init() {
      const [tvR, athR] = await Promise.all([
        supabase.from('tv_state').select('*').eq('id', 1).maybeSingle(),
        Promise.resolve({ data: { value: loadAthletes() } }),
      ])
      if (tvR.data) {
        const t = tvR.data
        setTv(t)
        if (t.date_key)       setSelDate(t.date_key)
        if (t.session_id)     setSelSessId(t.session_id)
        if (t.timer_type)     setTimerType(t.timer_type)
        if (t.timer_cap_secs) setTimerCap(Math.round(t.timer_cap_secs / 60))
        if (t.timer_block_id) setTimerBlkId(t.timer_block_id)
      }
      if (athR.data?.value) setAthletes(athR.data.value)
    }
    init()
  }, [])

  // Subscribe to tv_state for multi-device sync
  useEffect(() => {
    chanRef.current = supabase.channel('tv-ctrl-coach')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tv_state' }, p => setTv(p.new))
      .subscribe()
    return () => { chanRef.current?.unsubscribe() }
  }, [])

  // Load results for selected session
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

  // Push tv_state update to Supabase
  const push = useCallback(async (patch) => {
    const next = { ...tvRef.current, ...patch, updated_at: Date.now() }
    setTv(next)
    setSaving(true)
    await supabase.from('tv_state').upsert({ id: 1, ...next })
    setSaving(false)
  }, [])

  // Derived
  const sessions   = propSessions || loadLS()
  const dayS       = sessions[selDate] || []
  const selSessObj = dayS.find(s => s.id === selSessId) || null
  const wodBlocks  = (selSessObj?.blocks || []).filter(isWodBlock)
  const selBl      = wodBlocks[0]
  const blockRes   = selBl
    ? results.filter(r => r.sessionId === selSessId).flatMap(r =>
        (r.blocks || []).filter(b => b.blockId === selBl.id).map(b => ({
          ...b, athleteId: r.athleteId,
          athleteName: athletes.find(a => a.id === r.athleteId)?.name || '—',
        })))
    : []
  const ranked = selBl ? rankResults(blockRes, selBl.type) : []

  const slide    = tv?.slide || 'blank'
  const isLive   = tv?.slide && tv?.slide !== 'blank'
  const timerRun = !!tv?.timer_started_at

  function selectSlide(id) {
    push({ slide: id, session_id: selSessId, date_key: selDate })
  }

  function selectSession(id) {
    setSelSessId(id)
    const blks = (sessions[selDate]?.find(s => s.id === id)?.blocks || []).filter(isWodBlock)
    const firstBlk = blks[0]
    if (firstBlk) {
      setTimerBlkId(firstBlk.id)
      if (firstBlk.duration) setTimerCap(parseInt(firstBlk.duration) || 20)
    }
    push({ session_id: id, date_key: selDate })
  }

  async function startTimer() {
    await push({
      slide: 'timer',
      timer_type: timerType,
      timer_cap_secs: timerCap * 60,
      timer_block_id: timerBlkId,
      timer_started_at: Date.now(),
      timer_paused_elapsed: tv?.timer_paused_elapsed ?? 0,
    })
  }

  async function pauseTimer() {
    const elapsed = tv?.timer_started_at
      ? (Date.now() - tv.timer_started_at) / 1000 + (tv.timer_paused_elapsed ?? 0)
      : (tv?.timer_paused_elapsed ?? 0)
    await push({ timer_started_at: null, timer_paused_elapsed: Math.floor(elapsed) })
  }

  async function resetTimer() {
    await push({ timer_started_at: null, timer_paused_elapsed: 0 })
  }

  function openTv() {
    window.open('/CrossFit-Apps/tv.html', '_blank')
  }

  // Week days for date picker
  const today = new Date()
  const weekDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 6 + i)
    return toISO(d)
  })

  const inputSt = { fontSize: 12, padding: '5px 8px', background: '#111', border: '1px solid #2a231c', color: '#c8b090', borderRadius: 4, outline: 'none', width: '100%', fontFamily: 'inherit' }
  const lblSt   = { fontSize: 10, fontWeight: 700, color: '#806850', textTransform: 'uppercase', letterSpacing: '.1em', display: 'block', marginBottom: 4 }
  const btnBase = { padding: '6px 12px', fontSize: 12, fontWeight: 700, border: '1px solid #2a231c', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'border-color .15s, color .15s' }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto', fontFamily: 'var(--font, inherit)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderBottom: '1px solid #2a231c', paddingBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#f0e8d0', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            <i className="ti ti-device-tv" style={{ marginRight: 8, color: '#4ac8c0' }} />
            Quadro ao Vivo
          </div>
          <div style={{ fontSize: 11, color: '#554a3a', marginTop: 3 }}>
            {isLive ? <span style={{ color: '#48b860' }}>● TV ativa · slide: {SLIDES.find(s=>s.id===slide)?.lbl}</span> : '● TV apagada'}
            {saving && <span style={{ color: '#806850', marginLeft: 10 }}>Salvando...</span>}
          </div>
        </div>
        <button onClick={openTv} style={{ ...btnBase, background: '#4ac8c0', borderColor: '#4ac8c0', color: '#0d0b09', fontSize: 13, padding: '8px 18px' }}>
          <i className="ti ti-device-tv" /> Abrir TV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

        {/* Left: controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Session picker */}
          <div style={{ background: '#111', border: '1px solid #2a231c', borderRadius: 6, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#d8a840', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 14 }}>Sessão</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lblSt}>Data</label>
                <select value={selDate} onChange={e => { setSelDate(e.target.value); setSelSessId(null) }} style={inputSt}>
                  {weekDays.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
                </select>
              </div>
              <div>
                <label style={lblSt}>Sessão</label>
                <select value={selSessId || ''} onChange={e => selectSession(e.target.value)} style={inputSt} disabled={!dayS.length}>
                  <option value="">— selecionar —</option>
                  {dayS.map(s => <option key={s.id} value={s.id}>{s.sessionName || (Array.isArray(s.mainTraining) ? s.mainTraining[0] : s.mainTraining) || s.id.slice(-6)}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Slide selector */}
          <div style={{ background: '#111', border: '1px solid #2a231c', borderRadius: 6, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#d8a840', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 14 }}>Slide</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SLIDES.map(({ id, icon, lbl }) => (
                <button
                  key={id}
                  onClick={() => selectSlide(id)}
                  style={{ ...btnBase, background: slide === id ? '#4ac8c0' : '#1a1a1a', borderColor: slide === id ? '#4ac8c0' : '#2a231c', color: slide === id ? '#0d0b09' : '#c8b090' }}
                >
                  <i className={`ti ${icon}`} /> {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Timer controls */}
          <div style={{ background: '#111', border: '1px solid #2a231c', borderRadius: 6, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#d8a840', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 14 }}>Timer</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={lblSt}>Tipo</label>
                <select value={timerType} onChange={e => setTimerType(e.target.value)} style={inputSt}>
                  {TIMER_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={lblSt}>Cap (min)</label>
                <input type="number" min={1} max={120} value={timerCap} onChange={e => setTimerCap(Number(e.target.value))} style={inputSt} />
              </div>
              <div>
                <label style={lblSt}>Bloco WOD</label>
                <select value={timerBlkId || ''} onChange={e => setTimerBlkId(e.target.value)} style={inputSt} disabled={!wodBlocks.length}>
                  <option value="">— auto —</option>
                  {wodBlocks.map(b => <option key={b.id} value={b.id}>{blkLabel(b)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {!timerRun
                ? <button onClick={startTimer} style={{ ...btnBase, background: '#48b860', borderColor: '#48b860', color: '#0d0b09' }}><i className="ti ti-player-play" /> Iniciar</button>
                : <button onClick={pauseTimer} style={{ ...btnBase, background: '#d8a840', borderColor: '#d8a840', color: '#0d0b09' }}><i className="ti ti-player-pause" /> Pausar</button>
              }
              <button onClick={resetTimer} style={{ ...btnBase, background: 'transparent', borderColor: '#3a3a3a', color: '#806850' }}><i className="ti ti-player-stop" /> Resetar</button>
              {tv?.timer_paused_elapsed > 0 && (
                <span style={{ fontSize: 12, color: '#c8b090', fontFamily: 'monospace', marginLeft: 8 }}>
                  {fmt(tv.timer_paused_elapsed)} acumulado
                </span>
              )}
            </div>
          </div>

          {/* Live results */}
          <div style={{ background: '#111', border: '1px solid #2a231c', borderRadius: 6, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#d8a840', letterSpacing: '.15em', textTransform: 'uppercase' }}>Resultados ao vivo</div>
              <button onClick={loadResults} disabled={resLoading} style={{ ...btnBase, fontSize: 11, padding: '4px 10px', background: 'transparent', color: '#806850' }}>
                <i className={`ti ${resLoading ? 'ti-loader-2 spin' : 'ti-refresh'}`} /> Atualizar
              </button>
            </div>
            {ranked.length === 0 ? (
              <div style={{ fontSize: 12, color: '#554a3a' }}>Nenhum resultado ainda.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ranked.slice(0, 10).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 8px', background: '#161210', borderRadius: 3 }}>
                    <span style={{ fontSize: 11, color: '#554a3a', width: 22 }}>#{i+1}</span>
                    <span style={{ fontSize: 12, color: '#f0e8d0', fontWeight: 700, flex: 1 }}>{r.athleteName}</span>
                    <span style={{ fontSize: 11, color: '#806850' }}>{r.scale || 'RX'}</span>
                    <span style={{ fontSize: 12, color: '#4ac8c0', fontFamily: 'monospace' }}>{perfStr(r, selBl?.type)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right: preview */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#806850', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Preview</div>
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#0d0b09', border: '1px solid #2a231c', borderRadius: 6, overflow: 'hidden' }}>
            {slide === 'blank'   && <div style={{ ...pSt.slide, background: '#000', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '.15em' }}>Apagado</span></div>}
            {slide === 'wod'     && <PreviewWod sess={selSessObj} dateKey={selDate} />}
            {slide === 'timer'   && <PreviewTimer tv={tv} sess={selSessObj} />}
            {slide === 'results' && <PreviewResults ranked={ranked} selBl={selBl} />}
            {slide === 'qr'      && <PreviewQr />}
          </div>
          <div style={{ fontSize: 10, color: '#554a3a', marginTop: 6, textAlign: 'center' }}>
            Slide atual na TV: <strong style={{ color: '#c8b090' }}>{SLIDES.find(s => s.id === slide)?.lbl || '—'}</strong>
          </div>
        </div>

      </div>
    </div>
  )
}
