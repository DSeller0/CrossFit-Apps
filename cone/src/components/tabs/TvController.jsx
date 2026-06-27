import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../utils/supabase'
import { loadLS, loadAthletes, toISO } from '../../utils/storage'
import { blkLabel, blkColor, isWodBlock, rankResults, perfStr } from '../../public/lib/wod.js'

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

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec))
  return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`
}
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_PT[d.getDay()]} ${d.getDate()} ${MON_PT[d.getMonth()]}`
}
function sessLabel(s) {
  return s.sessionName || (Array.isArray(s.mainTraining) ? s.mainTraining[0] : s.mainTraining) || 'Sessão'
}

// ── Shared style objects ──────────────────────────────────────────────────────
const pSt = {
  slide:    { width: '100%', height: '100%', background: '#0d0b09', display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden' },
  sessName: { fontSize: 10, fontWeight: 900, color: '#f0e8d0', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 },
  empty:    { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 9, color: '#554a3a', textTransform: 'uppercase' },
}

// ── Mini preview components ───────────────────────────────────────────────────
function PreviewWod({ sess, dateKey }) {
  if (!sess) return <div style={pSt.empty}>Nenhuma sessão</div>
  const blocks = (sess.blocks || []).filter(bl => bl.exercises?.length || bl.stations?.length)
  return (
    <div style={{ ...pSt.slide, padding: '8px 12px', gap: 6, display: 'flex', flexDirection: 'column' }}>
      <div style={pSt.sessName}>{sessLabel(sess)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflow: 'hidden' }}>
        {blocks.slice(0, 4).map(bl => {
          const col = blkColor(bl)
          return (
            <div key={bl.id} style={{ borderLeft: `3px solid ${col}`, paddingLeft: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
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

// PreviewTimer uses LOCAL timerBlkId/timerType/timerCap so it updates instantly
// on block selection, without waiting for the Supabase write to return
function PreviewTimer({ sess, timerBlkId, timerType, timerCap, tv }) {
  const block = timerBlkId
    ? (sess?.blocks || []).find(b => b.id === timerBlkId)
    : (sess?.blocks || []).find(isWodBlock)
  const col = tv?.timer_started_at ? '#48b860' : '#d8a840'
  const exes = block
    ? (block.type === 'Estações' ? (block.stations||[]).flatMap(st=>st.exercises||[]) : (block.exercises||[]))
    : []
  return (
    <div style={{ ...pSt.slide, flexDirection: 'row', alignItems: 'center', padding: '8px 12px', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '38%' }}>
        <div style={{ fontSize: 7, color: '#806850', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em' }}>{timerType}</div>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: col, fontFamily: 'monospace' }}>
            {fmt(tv?.timer_paused_elapsed || 0)}
          </span>
        </div>
        <div style={{ fontSize: 7, color: '#554a3a' }}>Cap {timerCap}'</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
        {exes.slice(0, 4).map((ex, i) => (
          <div key={i} style={{ fontSize: 9, color: '#f0e8d0', fontWeight: 700, textTransform: 'uppercase', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {ex.name}
          </div>
        ))}
        {exes.length === 0 && block && <div style={{ fontSize: 8, color: '#554a3a' }}>Sem exercícios</div>}
        {!block && <div style={{ fontSize: 8, color: '#554a3a' }}>Personalizado</div>}
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
  const [timerBlkId, setTimerBlkId] = useState(null)  // null = personalizado
  const [resLoading, setResLoading] = useState(false)
  const chanRef = useRef(null)
  const tvRef   = useRef(tv)
  tvRef.current = tv

  // Load initial data
  useEffect(() => {
    async function init() {
      const [tvR] = await Promise.all([
        supabase.from('tv_state').select('*').eq('id', 1).maybeSingle(),
      ])
      setAthletes(loadAthletes())
      if (tvR.data) {
        const t = tvR.data
        setTv(t)
        if (t.date_key)       setSelDate(t.date_key)
        if (t.session_id)     setSelSessId(t.session_id)
        if (t.timer_type)     setTimerType(t.timer_type)
        if (t.timer_cap_secs) setTimerCap(Math.round(t.timer_cap_secs / 60))
        if (t.timer_block_id !== undefined) setTimerBlkId(t.timer_block_id || null)
      }
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

  // Push tv_state — safe defaults when tv is null (e.g. table just created)
  const push = useCallback(async (patch) => {
    const base = tvRef.current ?? { slide: 'blank', timer_type: 'For Time', timer_cap_secs: 1200, timer_paused_elapsed: 0 }
    const next = { ...base, ...patch, updated_at: Date.now() }
    setTv(next)  // optimistic update — preview refreshes immediately
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
  const ranked   = selBl ? rankResults(blockRes, selBl.type) : []
  const slide    = tv?.slide || 'blank'
  const isLive   = tv?.slide && tv?.slide !== 'blank'
  const timerRun = !!tv?.timer_started_at

  function selectSlide(id) {
    push({ slide: id, session_id: selSessId, date_key: selDate })
  }

  function selectSession(id) {
    setSelSessId(id)
    const sess = dayS.find(s => s.id === id)
    const blks = (sess?.blocks || []).filter(isWodBlock)
    const first = blks[0]
    if (first) {
      setTimerBlkId(first.id)
      if (first.type && TIMER_TYPES.includes(first.type)) setTimerType(first.type)
      const mins = parseInt(first.duration) || 20
      setTimerCap(mins)
    } else {
      setTimerBlkId(null)
    }
    push({ session_id: id, date_key: selDate })
  }

  // Block selection auto-fills type and cap from block data
  function selectBlock(id) {
    setTimerBlkId(id || null)
    if (!id) return  // personalizado — leave type/cap as-is
    const bl = (selSessObj?.blocks || []).find(b => b.id === id)
    if (!bl) return
    if (bl.type && TIMER_TYPES.includes(bl.type)) setTimerType(bl.type)
    const mins = parseInt(bl.duration) || timerCap
    setTimerCap(mins)
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

  // Week days for date picker (-6 to +7 from today)
  const today = new Date()
  const weekDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 6 + i); return toISO(d)
  })

  const inputSt  = { fontSize: 12, padding: '5px 8px', background: '#111', border: '1px solid #2a231c', color: '#c8b090', borderRadius: 4, outline: 'none', width: '100%', fontFamily: 'inherit' }
  const roInputSt = { ...inputSt, background: '#0d1a10', color: '#4ac8c0', borderColor: '#1a3a20', cursor: 'default' }
  const lblSt    = { fontSize: 10, fontWeight: 700, color: '#806850', textTransform: 'uppercase', letterSpacing: '.1em', display: 'block', marginBottom: 4 }
  const btnBase  = { padding: '6px 12px', fontSize: 12, fontWeight: 700, border: '1px solid #2a231c', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }
  const card     = { background: '#111', border: '1px solid #2a231c', borderRadius: 6, padding: '16px 18px' }
  const cardTitle = { fontSize: 11, fontWeight: 900, color: '#d8a840', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 14 }

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
            {isLive
              ? <span style={{ color: '#48b860' }}>● TV ativa · {SLIDES.find(s=>s.id===slide)?.lbl}</span>
              : <span>● TV apagada</span>}
            {saving && <span style={{ color: '#806850', marginLeft: 10 }}>Salvando...</span>}
          </div>
        </div>
        <button onClick={() => window.open('/CrossFit-Apps/tv.html', '_blank')}
          style={{ ...btnBase, background: '#4ac8c0', borderColor: '#4ac8c0', color: '#0d0b09', fontSize: 13, padding: '8px 18px' }}>
          <i className="ti ti-device-tv" /> Abrir TV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

        {/* ── Left: controls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Session picker — date select + session cards */}
          <div style={card}>
            <div style={cardTitle}>Sessão</div>

            {/* Date row */}
            <div style={{ marginBottom: 14 }}>
              <label style={lblSt}>Data</label>
              <select value={selDate} onChange={e => { setSelDate(e.target.value); setSelSessId(null) }} style={{ ...inputSt, width: 200 }}>
                {weekDays.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
              </select>
            </div>

            {/* Session cards */}
            {dayS.length === 0
              ? <div style={{ fontSize: 12, color: '#554a3a', fontStyle: 'italic' }}>Nenhuma sessão neste dia</div>
              : (
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {dayS.map(sess => {
                    const sel = selSessId === sess.id
                    const blocks = (sess.blocks || []).filter(bl => bl.exercises?.length || bl.stations?.length)
                    return (
                      <div
                        key={sess.id}
                        onClick={() => selectSession(sess.id)}
                        style={{
                          background: sel ? '#0d1a1a' : '#161210',
                          border: `1px solid ${sel ? '#4ac8c0' : '#2a231c'}`,
                          boxShadow: sel ? '0 0 0 1px #4ac8c0' : 'none',
                          borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
                          minWidth: 160, maxWidth: 220, flexShrink: 0,
                          transition: 'border-color .15s, box-shadow .15s',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, color: sel ? '#4ac8c0' : '#f0e8d0', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sessLabel(sess)}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {blocks.slice(0, 5).map(bl => {
                            const col = blkColor(bl)
                            return (
                              <span key={bl.id} style={{ fontSize: 9, fontWeight: 700, color: col, background: col + '1a', border: `1px solid ${col}44`, borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>
                                {blkLabel(bl)}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
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

          {/* Timer controls — block first, then type/cap auto-filled */}
          <div style={card}>
            <div style={cardTitle}>Timer</div>

            {/* 1. Block WOD picker */}
            <div style={{ marginBottom: 12 }}>
              <label style={lblSt}>Bloco WOD</label>
              <select value={timerBlkId || ''} onChange={e => selectBlock(e.target.value)} style={inputSt} disabled={!selSessObj}>
                <option value="">— personalizado —</option>
                {wodBlocks.map(b => <option key={b.id} value={b.id}>{blkLabel(b)}</option>)}
              </select>
            </div>

            {/* 2. Type + Cap */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={lblSt}>
                  Tipo {timerBlkId && <span style={{ color: '#4ac8c0', fontSize: 9 }}>(do bloco)</span>}
                </label>
                {timerBlkId
                  ? <div style={roInputSt}>{timerType}</div>
                  : <select value={timerType} onChange={e => setTimerType(e.target.value)} style={inputSt}>
                      {TIMER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                }
              </div>
              <div>
                <label style={lblSt}>Cap (min)</label>
                <input type="number" min={1} max={120} value={timerCap}
                  onChange={e => setTimerCap(Number(e.target.value))} style={inputSt} />
              </div>
            </div>

            {/* 3. Controls */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {!timerRun
                ? <button onClick={startTimer} style={{ ...btnBase, background: '#48b860', borderColor: '#48b860', color: '#0d0b09' }}><i className="ti ti-player-play" /> Iniciar</button>
                : <button onClick={pauseTimer} style={{ ...btnBase, background: '#d8a840', borderColor: '#d8a840', color: '#0d0b09' }}><i className="ti ti-player-pause" /> Pausar</button>
              }
              <button onClick={resetTimer} style={{ ...btnBase, background: 'transparent', borderColor: '#3a3a3a', color: '#806850' }}>
                <i className="ti ti-player-stop" /> Resetar
              </button>
              {(tv?.timer_paused_elapsed > 0) && (
                <span style={{ fontSize: 12, color: '#c8b090', fontFamily: 'monospace', marginLeft: 8 }}>
                  {fmt(tv.timer_paused_elapsed)} acumulado
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
                </div>
            }
          </div>

        </div>

        {/* ── Right: preview ── */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#806850', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Preview</div>
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#0d0b09', border: '1px solid #2a231c', borderRadius: 6, overflow: 'hidden' }}>
            {slide === 'blank'   && <div style={{ ...pSt.slide, background: '#000', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '.15em' }}>Apagado</span></div>}
            {slide === 'wod'     && <PreviewWod sess={selSessObj} dateKey={selDate} />}
            {slide === 'timer'   && <PreviewTimer sess={selSessObj} timerBlkId={timerBlkId} timerType={timerType} timerCap={timerCap} tv={tv} />}
            {slide === 'results' && <PreviewResults ranked={ranked} selBl={selBl} />}
            {slide === 'qr'      && <PreviewQr />}
          </div>
          <div style={{ fontSize: 10, color: '#554a3a', marginTop: 6, textAlign: 'center' }}>
            Slide atual na TV: <strong style={{ color: '#c8b090' }}>{SLIDES.find(s=>s.id===slide)?.lbl || '—'}</strong>
          </div>
        </div>

      </div>
    </div>
  )
}
