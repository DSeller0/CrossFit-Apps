import { useState, useEffect, useRef } from 'react'
import { sb } from '../supabaseClient.js'
import { WodSlide, TimerSlide, ResultsSlide, QrSlide } from './slides.jsx'
import { normalizeSessionIds } from '../lib/sessions.js'
import s from './TV.module.css'

// ── Constants ─────────────────────────────────────────────────────────────────
const DV_W = 1920,
  DV_H = 1080

// ── Main TV ───────────────────────────────────────────────────────────────────
export default function TV() {
  const [scale, setScale] = useState(1)
  const [tv, setTv] = useState(null)
  const [sessions, setSessions] = useState({})
  const [athletes, setAthletes] = useState([])
  const [results, setResults] = useState([])
  const [classExecs, setClassExecs] = useState([])
  const [gymName, setGymName] = useState('')
  const chanRef = useRef(null)
  const resChanRef = useRef(null)
  const ceChanRef = useRef(null)
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
      if (tvR.data) setTv(tvR.data)
      if (sessR.data?.value) setSessions(normalizeSessionIds(sessR.data.value))
      if (athR.data?.value) setAthletes(athR.data.value)
      if (stR.data?.value?.gymName) setGymName(stR.data.value.gymName)
    }
    init()
  }, [])

  // Subscribe to tv_state changes
  useEffect(() => {
    chanRef.current = sb
      .channel('tv-ctrl')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tv_state' }, p =>
        setTv(p.new),
      )
      .subscribe()
    return () => {
      chanRef.current?.unsubscribe()
    }
  }, [])

  // Subscribe to results when showing results/wod slides
  const slide = tv?.slide || 'blank'
  const sessId = tv?.session_id
  const dateKey = tv?.date_key
  useEffect(() => {
    if (slide !== 'results' && slide !== 'wod') return
    if (!sessId || sessId === prevSessId.current) return
    prevSessId.current = sessId

    resChanRef.current?.unsubscribe()

    sb.from('results_v2')
      .select('*')
      .eq('session_id', sessId)
      .then(({ data }) => {
        if (data) setResults(data.map(mapRow))
      })

    resChanRef.current = sb
      .channel(`tv-res-${sessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'results_v2',
          filter: `session_id=eq.${sessId}`,
        },
        p => setResults(prev => mergeRow(prev, p.new)),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'results_v2',
          filter: `session_id=eq.${sessId}`,
        },
        p => setResults(prev => mergeRow(prev, p.new)),
      )
      .subscribe()

    return () => {
      resChanRef.current?.unsubscribe()
    }
  }, [slide, sessId])

  // Load + subscribe class_executions for current session
  useEffect(() => {
    if (!sessId || !dateKey) return

    ceChanRef.current?.unsubscribe()

    sb.from('class_executions')
      .select('*')
      .eq('session_id', sessId)
      .eq('date_key', dateKey)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setClassExecs(data)
      })

    ceChanRef.current = sb
      .channel(`tv-ce-${sessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_executions',
          filter: `session_id=eq.${sessId}`,
        },
        () => {
          sb.from('class_executions')
            .select('*')
            .eq('session_id', sessId)
            .eq('date_key', dateKey)
            .order('created_at', { ascending: true })
            .then(({ data }) => {
              if (data) setClassExecs(data)
            })
        },
      )
      .subscribe()

    return () => {
      ceChanRef.current?.unsubscribe()
    }
  }, [sessId, dateKey])

  return (
    <div className={s.root}>
      <div
        className={s.canvas}
        style={{
          width: DV_W,
          height: DV_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {slide === 'blank' && <div className={s.blank} />}
        {slide === 'wod' && (
          <WodSlide
            sessions={sessions}
            tv={tv}
            gymName={gymName}
            classExecs={classExecs}
            athletes={athletes}
          />
        )}
        {slide === 'timer' && (
          <TimerSlide tv={tv} sessions={sessions} classExecs={classExecs} athletes={athletes} />
        )}
        {slide === 'results' && (
          <ResultsSlide
            tv={tv}
            sessions={sessions}
            athletes={athletes}
            results={results}
            classExecs={classExecs}
          />
        )}
        {slide === 'qr' && <QrSlide tv={tv} />}
        {!tv && (
          <div className={s.loading}>
            <i className={`ti ti-loader-2 ${s.spin}`} /> Conectando...
          </div>
        )}
      </div>
    </div>
  )
}

function mapRow(r) {
  return {
    id: r.id,
    date: r.date,
    athleteId: r.athlete_id,
    sessionId: r.session_id,
    blocks: r.blocks,
  }
}
function mergeRow(prev, row) {
  const mapped = mapRow(row)
  return [...prev.filter(x => x.id !== mapped.id), mapped]
}
