import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../../utils/supabase'
import { loadLS, loadAthletes, toISO } from '../../utils/storage'
import { blkLabel, blkColor, isWodBlock, fmtSecs, TIMER_TYPES } from '../../public/lib/wod.js'
import { DAY_PT_TITLE } from '../../public/lib/week.js'
import { sessName } from '../../public/lib/sessions.js'
import { WodSlide, TimerSlide, ResultsSlide, QrSlide } from '../../public/tv/slides.jsx'
import { useTvSync }           from '../../hooks/useTvSync'
import { useTimer }             from '../../hooks/useTimer'
import { useClassTracking }     from '../../hooks/useClassTracking'
import { useGroupRotation }     from '../../hooks/useGroupRotation'
import { useLiveRegistration }  from '../../hooks/useLiveRegistration'
import ClassPanel               from './tv/ClassPanel'
import GroupsPanel              from './tv/GroupsPanel'
import st                       from './tv/tvController.module.css'

const SLIDES     = [
  { id: 'blank',   icon: 'ti-square-off', lbl: 'Apagado' },
  { id: 'wod',     icon: 'ti-barbell',    lbl: 'WOD' },
  { id: 'timer',   icon: 'ti-clock',      lbl: 'Timer' },
  { id: 'results', icon: 'ti-trophy',     lbl: 'Resultados' },
  { id: 'qr',      icon: 'ti-qrcode',     lbl: 'QR Code' },
]

// ── Full-width date picker (Sunday-start) ────────────────────────────────────
function DatePicker({ selDate, sessions, onChange }) {
  function startOfWeek(iso) {
    const d = new Date((iso || toISO(new Date())) + 'T12:00:00')
    d.setDate(d.getDate() - d.getDay())
    return toISO(d)
  }
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selDate))
  useEffect(() => {
    const ws = startOfWeek(selDate)
    if (ws !== weekStart) setWeekStart(ws)
  }, [selDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() + i)
    return { iso: toISO(d), d }
  })
  const today = toISO(new Date())
  function prevWeek() { const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() - 7); setWeekStart(toISO(d)) }
  function nextWeek() { const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() + 7); setWeekStart(toISO(d)) }

  return (
    <div className={st.datePicker}>
      <button className={st.dpArrow} onClick={prevWeek}><i className="ti ti-chevron-left" /></button>
      <div className={st.dpDays}>
        {days.map(({ iso, d }) => {
          const isSel = iso === selDate, isToday = iso === today
          const hasSess = (sessions[iso] || []).length > 0
          return (
            <div key={iso} onClick={() => onChange(iso)}
              className={`${st.dpDay} ${isSel ? st.sel : ''} ${isToday ? st.today : ''}`}>
              <span className={st.dpDow}>{DAY_PT_TITLE[d.getDay()]}</span>
              <span className={st.dpNum}>{d.getDate()}</span>
              {hasSess && <span className={st.dpDot} />}
            </div>
          )
        })}
      </div>
      <button className={st.dpArrow} onClick={nextWeek}><i className="ti ti-chevron-right" /></button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TvController({ sessions: propSessions }) {
  const [selDate,     setSelDate]     = useState(() => toISO(new Date()))
  const [selSessId,   setSelSessId]   = useState(null)
  const [athletes,    setAthletes]    = useState([])
  const [results,     setResults]     = useState([])
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
    const { data } = await supabase.from('results_v2').select('*')
      .eq('session_id', selSessId).eq('date', selDate)
    if (data) setResults(data.map(r => ({
      id: r.id, date: r.date, athleteId: r.athlete_id, sessionId: r.session_id, blocks: r.blocks,
    })))
  }, [selSessId, selDate])
  useEffect(() => { loadResults() }, [loadResults])
  // Periodic refresh — results_v2 has no realtime subscription here (unlike class_executions),
  // so pick up results logged from other surfaces (e.g. athlete self-log) while the roster is open.
  useEffect(() => {
    if (!selSessId) return
    const id = setInterval(loadResults, 20000)
    return () => clearInterval(id)
  }, [selSessId, loadResults])

  const activeBlockId = tv?.timer_block_id || timer.timerBlkId || 'live'

  const liveReg = useLiveRegistration({
    selSessId, selDate, selSessObj, activeClassId: classes.activeClass?.id,
    elapsedSecs: timer.elapsedSecs, currentTimerBlock: timer.currentTimerBlock, loadResults,
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
  const slide           = tv?.slide || 'blank'
  const timerRun        = !!tv?.timer_started_at
  const groupPositions  = tv?.group_positions   || {}
  const rotationBlockIds = tv?.rotation_block_ids || []
  const rotationBlocks  = rotationBlockIds.length > 0
    ? wodBlocks.filter(b => rotationBlockIds.includes(b.id))
    : wodBlocks
  const restSecs = tv?.rotation_rest_secs || 0

  // Rotation mode: the Timer card's Tipo/Cap track whichever block currently leads the
  // rotation, not whatever "Personalizado" config was set before groups existed.
  const rotFirst = rotationBlocks[0]
  useEffect(() => {
    if (groups.length === 0 || !rotFirst) return
    if (timer.timerBlkId !== rotFirst.id) timer.setTimerBlkId(rotFirst.id)
    if (rotFirst.type && timer.timerType !== rotFirst.type) timer.setTimerType(rotFirst.type)
    const cap = parseInt(rotFirst.duration) || timer.timerCap
    if (timer.timerCap !== cap) timer.setTimerCap(cap)
  }, [groups.length, rotFirst?.id, rotFirst?.type, rotFirst?.duration]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }

  const previewTv = useMemo(() => ({
    ...(tv ?? {}), slide, session_id: selSessId, date_key: selDate,
    timer_type: timer.timerType, timer_cap_secs: timer.timerCap * 60, timer_block_id: timer.timerBlkId,
  }), [tv, slide, selSessId, selDate, timer.timerType, timer.timerCap, timer.timerBlkId])

  return (
    <div className={st.page}>

      {/* Header */}
      <div className={st.hdr}>
        <div>
          <div className={st.hdrTitle}>
            <i className="ti ti-device-tv" />Quadro ao Vivo
          </div>
          <div className={st.hdrSub}>
            {tv?.slide && tv.slide !== 'blank'
              ? <span className={st.hdrLive}>● TV ativa · {SLIDES.find(s=>s.id===tv.slide)?.lbl}</span>
              : <span>● TV apagada</span>}
            {saving && <span className={st.hdrSaving}>Salvando...</span>}
          </div>
        </div>
        <button className={`${st.btn} ${st.openBtn}`} onClick={() => window.open('/CrossFit-Apps/tv.html', '_blank')}>
          <i className="ti ti-device-tv" /> Abrir TV
        </button>
      </div>

      {/* Sessão — full width */}
      <div className={`${st.card} ${st.sessaoCard}`}>
        <div className={st.cardTitle}>Sessão</div>
        <DatePicker selDate={selDate} sessions={sessions}
          onChange={d => { setSelDate(d); setSelSessId(null) }} />
        {dayS.length === 0
          ? <div className={st.emptyNote}>Nenhuma sessão neste dia</div>
          : <div className={st.sessChips}>
              {dayS.map(sess => {
                const sel = selSessId === sess.id
                const blocks = (sess.blocks || []).filter(bl => bl.exercises?.length || bl.stations?.length)
                return (
                  <div key={sess.id} onClick={() => selectSession(sess.id)}
                    className={`${st.sessChip} ${sel ? st.sel : ''}`}>
                    <div className={st.sessChipTitle}>{sessName(sess, selDate)}</div>
                    <div className={st.sessChipBlocks}>
                      {blocks.slice(0, 5).map(bl => {
                        const col = blkColor(bl)
                        return <span key={bl.id} className={st.blockTag} style={{ color: col, background: col+'1a', border: `1px solid ${col}44` }}>{blkLabel(bl)}</span>
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
        }
      </div>

      <div className={st.layout2}>

        {/* ── Left: Aula + merged roster ── */}
        <div className={st.leftPane}>
          <ClassPanel tv={tv} selSessId={selSessId} todayClasses={classes.todayClasses}
            activeClass={classes.activeClass} athletes={athletes} results={results}
            activeBlockId={activeBlockId} timerType={timer.timerType} timerRun={timerRun}
            classLabel={classes.classLabel} setClassLabel={classes.setClassLabel}
            startClass={classes.startClass} endClass={classes.endClass} liveReg={liveReg} />
        </div>

        {/* ── Right: Slide/Timer/Grupos stack + Preview ── */}
        <div className={st.rightGrid}>
          <div className={st.rightStack}>

            {/* Slide selector */}
            <div className={st.card}>
              <div className={st.cardTitle}>Slide</div>
              <div className={st.slideRow}>
                {SLIDES.map(({ id, icon, lbl }) => (
                  <button key={id} className={`${st.btn} ${st.slideBtn} ${slide === id ? st.sel : ''}`}
                    onClick={() => selectSlide(id)}>
                    <i className={`ti ${icon}`} /> {lbl}
                  </button>
                ))}
              </div>
              <div className={st.qrRow}>
                <span className={st.qrLbl}>QR Code:</span>
                {(() => {
                  const qrOn = tv?.show_qr !== false
                  return (
                    <button className={`${st.qrToggle} ${qrOn ? st.on : st.off}`} onClick={() => push({ show_qr: !qrOn })}>
                      {qrOn ? 'Ativo' : 'Oculto'}
                    </button>
                  )
                })()}
              </div>
            </div>

            {/* Timer */}
            <div className={st.card}>
              <div className={st.cardTitle}>Timer</div>

              {groups.length > 0 ? (() => {
                const rotCap    = parseInt(rotationBlocks[0]?.duration) || timer.timerCap
                const rotType   = rotationBlocks[0]?.type || timer.timerType
                const finishers = rotationBlockIds.length > 0 ? wodBlocks.filter(b => !rotationBlockIds.includes(b.id)) : []
                const totalSecs = rotationBlocks.length * (rotCap * 60 + restSecs)
                return (
                  <div style={{ marginBottom: 12 }}>
                    <div className={st.timerHint}>
                      {rotationBlocks.length} blocos × {rotCap} min
                      {restSecs > 0 ? ` + ${restSecs}s descanso` : ''}
                      {' '}= <strong className={st.timerHintStrong}>{Math.ceil(totalSecs / 60)} min total</strong>
                      {finishers.length > 0 && <span className={st.timerHintDim}> → {finishers.map(b => b.label || b.type).join(' + ')} (finisher)</span>}
                    </div>
                    <div className={st.timerGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div><label className={st.lbl}>Tipo <span className={st.timerGridBadge}>(do bloco)</span></label><div className={st.roInput}>{rotType}</div></div>
                      <div><label className={st.lbl}>Cap (min)</label><div className={st.roInput}>{rotCap}</div></div>
                    </div>
                  </div>
                )
              })() : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label className={st.lbl}>Bloco WOD</label>
                    <div className={st.blkChips}>
                      <div onClick={() => timer.selectBlock(null, null)}
                        className={`${st.blkChipCustom} ${!timer.timerBlkId ? st.sel : ''}`}>
                        <div className={st.blkChipName}>Personalizado</div>
                      </div>
                      {wodBlocks.map(bl => {
                        const col = blkColor(bl), sel = timer.timerBlkId === bl.id
                        return (
                          <div key={bl.id} onClick={() => timer.selectBlock(bl.id, bl)} className={st.blkChip}
                            style={sel ? { background: col+'18', borderColor: col, boxShadow: `0 0 0 1px ${col}` } : undefined}>
                            <div className={st.blkChipName} style={sel ? { color: col } : undefined}>{blkLabel(bl)}</div>
                            <div className={st.blkChipType} style={sel ? { color: col+'cc' } : undefined}>{bl.type || bl.label}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className={st.timerGrid} style={{ gridTemplateColumns: timer.timerBlkId && wodBlocks.length > 1 ? '1fr 1fr 1fr' : '1fr 1fr' }}>
                    <div>
                      <label className={st.lbl}>Tipo {timer.timerBlkId && <span className={st.timerGridBadge}>(do bloco)</span>}</label>
                      {timer.timerBlkId
                        ? <div className={st.roInput}>{timer.timerType}</div>
                        : <select value={timer.timerType} onChange={e => timer.setTimerType(e.target.value)} className={st.input}>
                            {TIMER_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>}
                    </div>
                    <div>
                      <label className={st.lbl}>Cap (min)</label>
                      <input type="number" min={1} max={120} value={timer.timerCap} onChange={e => timer.setTimerCap(Number(e.target.value))} className={st.input} />
                    </div>
                    {timer.timerBlkId && wodBlocks.length > 1 && (
                      <div>
                        <label className={st.lbl}>Descanso (seg)</label>
                        <input type="number" min={0} max={600} value={restSecs}
                          onChange={e => push({ rotation_rest_secs: Math.max(0, parseInt(e.target.value) || 0) })}
                          className={st.input} />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className={st.timerBtns}>
                {!timerRun
                  ? <button className={`${st.btn} ${st.timerBtnPlay}`} onClick={handleStartTimer}><i className="ti ti-player-play" /> Iniciar</button>
                  : <button className={`${st.btn} ${st.timerBtnPause}`} onClick={timer.pauseTimer}><i className="ti ti-player-pause" /> Pausar</button>}
                <button className={`${st.btn} ${st.timerBtnStop}`} onClick={handleResetTimer}>
                  <i className="ti ti-player-stop" /> Resetar
                </button>
                {(tv?.timer_paused_elapsed > 0) && (
                  <span className={st.timerAccum}>
                    {fmtSecs(tv.timer_paused_elapsed)} acumulado
                  </span>
                )}
              </div>
            </div>

            <GroupsPanel activeClass={classes.activeClass} groups={groups}
              wodBlocks={wodBlocks} rotationBlocks={rotationBlocks}
              rotationBlockIds={rotationBlockIds} groupPositions={groupPositions}
              restSecs={restSecs}
              autoAdvance={rotation.autoAdvance} setAutoAdvance={rotation.setAutoAdvance}
              athletes={athletes}
              createGroups={rotation.createGroups} dissolveGroups={rotation.dissolveGroups}
              setGroupBlock={rotation.setGroupBlock} reassignMember={rotation.reassignMember}
              advanceAll={rotation.advanceAll} toggleRotationBlock={rotation.toggleRotationBlock}
              push={push} />

          </div>

          {/* ── Preview ── */}
          <div className={st.previewCard}>
            <div className={st.previewLbl}>Preview</div>
            <div ref={previewRef} className={st.previewFrame}>
              <div className={st.previewInner} style={{ transform: `scale(${prevScale})` }}>
                {slide === 'blank'   && <div className={st.previewBlank}><span>Apagado</span></div>}
                {slide === 'wod'     && <WodSlide     sessions={sessions} tv={previewTv} gymName={gymName} classExecs={classes.todayClasses} athletes={athletes} />}
                {slide === 'timer'   && <TimerSlide   tv={previewTv}      sessions={sessions} classExecs={classes.todayClasses} athletes={athletes} />}
                {slide === 'results' && <ResultsSlide tv={previewTv}      sessions={sessions} athletes={athletes} results={results} classExecs={classes.todayClasses} />}
                {slide === 'qr'      && <QrSlide      tv={previewTv} />}
              </div>
            </div>
            <div className={st.previewFoot}>
              Slide atual na TV: <strong className={st.previewFootStrong}>{SLIDES.find(s=>s.id===slide)?.lbl || '—'}</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
