import { useState, useEffect, useRef, useMemo } from 'react'
import { sb } from '../supabaseClient.js'
import { registerSW } from '../registerSW.js'
import Nav from '../Nav.jsx'
import s from './Index.module.css'
import { blkLabel, isWodBlock, rankResults, perfStr, blkMeta } from '../lib/wod.js'
import { getWeek, toISO, todayISO } from '../lib/week.js'
import { getBoxScope, inBoxScope } from '../lib/boxScope.js'
import { mapResultRow } from '../lib/blobTables.js'
import { WeekGrid, DaySessionCard, DayRanking, BoxWarnings, MobileWarning, dayTitle } from './rail.jsx'

const inScope = (list, box) => (list || []).filter(x => x.public !== false && inBoxScope(x, box))

// ── Main component ────────────────────────────────────────────────────────
export default function Index() {
  const [status,       setStatus]       = useState('loading')
  const [sessions,     setSessions]     = useState({})
  const [gymName,      setGymName]      = useState('CONE')
  const [gymSub,       setGymSub]       = useState('Cross Training')
  const [error,        setError]        = useState(null)
  const [pwaShow,      setPwaShow]      = useState(false)
  const [athletes,     setAthletes]     = useState([])       // ranking names
  const [weekResults,  setWeekResults]  = useState([])       // results_v2 for this week's sessions
  const [boxWarnings,  setBoxWarnings]  = useState([])       // settings.boxWarnings (dated list, #53)
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const box = useMemo(() => getBoxScope(), [])   // per-box view scope (?box=)

  const deferredPromptRef = useRef(null)
  const weekIdsRef = useRef([])

  // ── Data loading ─────────────────────────────────────────────────────────
  async function load(attempt = 0) {
    try {
      const [sessRes, settRes, athRes] = await Promise.all([
        sb.from('sessions').select('value').eq('id',1).maybeSingle(),
        sb.from('settings').select('value').eq('id',1).maybeSingle(),
        sb.from('athletes').select('value').eq('id',1).maybeSingle(),
      ])
      const allSessions = sessRes.data?.value || {}
      const settings    = settRes.data?.value || {}
      const allAthletes = athRes.data?.value || []

      // Theme sync from Supabase
      if (settings.theme) {
        const cur = localStorage.getItem('cone_theme')
        if (cur !== settings.theme) {
          localStorage.setItem('cone_theme', settings.theme)
          document.documentElement.className =
            document.documentElement.className.replace(/\btheme-\S+/g,'').trim() + ' theme-' + settings.theme
        }
      }

      // Results for every in-scope session in the visible week (one query) — feeds both
      // the ranking and the per-session counts.
      const weekIds = getWeek(0).flatMap(d => inScope(allSessions[toISO(d)], box).map(x => x.id))
      weekIdsRef.current = weekIds
      let weekRes = []
      if (weekIds.length) {
        const { data } = await sb.from('results_v2').select('*').in('session_id', weekIds)
        weekRes = (data || []).map(mapResultRow)
      }

      if (settings.gymName) setGymName(settings.gymName.toUpperCase())
      setGymSub(settings.gymSub || 'Cross Training')
      setSessions(allSessions)
      setAthletes(allAthletes)
      setWeekResults(weekRes)
      setBoxWarnings(Array.isArray(settings.boxWarnings) ? settings.boxWarnings : [])
      setStatus('ok')
    } catch (err) {
      if (attempt < 2) { setTimeout(() => load(attempt + 1), 2000*(attempt+1)); return }
      setError(err.message); setStatus('error')
    }
  }

  async function refreshResults() {
    if (!weekIdsRef.current.length) return
    const { data } = await sb.from('results_v2').select('*').in('session_id', weekIdsRef.current)
    setWeekResults((data || []).map(mapResultRow))
  }

  // Mount: load data + SW + PWA banner
  useEffect(() => {
    registerSW()
    load()

    const KEY = 'cone_pwa_dismissed'
    if (!localStorage.getItem(KEY)) {
      const onPrompt = e => {
        e.preventDefault()
        deferredPromptRef.current = e
        setTimeout(() => setPwaShow(true), 2500)
      }
      const onInstalled = () => { setPwaShow(false); deferredPromptRef.current = null }
      window.addEventListener('beforeinstallprompt', onPrompt)
      window.addEventListener('appinstalled', onInstalled)
      return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 30s results refresh (live ranking/counts)
  useEffect(() => {
    if (status !== 'ok') return
    const id = setInterval(refreshResults, 30000)
    return () => clearInterval(id)
  }, [status])

  // pageshow (bfcache back-nav)
  useEffect(() => {
    const handler = e => { if (e.persisted) load().catch(() => {}) }
    window.addEventListener('pageshow', handler)
    return () => window.removeEventListener('pageshow', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePwaInstall() {
    if (!deferredPromptRef.current) return
    deferredPromptRef.current.prompt()
    deferredPromptRef.current.userChoice.then(() => {
      deferredPromptRef.current = null; setPwaShow(false)
      localStorage.setItem('cone_pwa_dismissed', '1')
    })
  }
  function dismissPwa() { setPwaShow(false); localStorage.setItem('cone_pwa_dismissed', '1') }

  // ── Derived (selected day drives the panel) ────────────────────────────────
  const today       = todayISO()
  const isSelToday  = selectedDate === today
  const isSelFuture = selectedDate > today
  const selDaySessions = useMemo(() => inScope(sessions[selectedDate], box), [sessions, selectedDate, box])
  const selSess = selDaySessions[0]

  const countFor = id => weekResults.filter(r => r.sessionId === id).length

  const rankData = useMemo(() => {
    const href = `leaderboard.html${box ? '?box=' + encodeURIComponent(box) : ''}`
    const wod = selSess && (selSess.blocks || []).find(isWodBlock)
    if (!wod) return { rows: [], href }
    const nameById = Object.fromEntries((athletes || []).map(a => [a.id, a.name]))
    const blockRes = weekResults.filter(r => r.sessionId === selSess.id)
      .flatMap(r => (r.blocks || []).filter(b => b.blockId === wod.id).map(b => ({ ...b, name: nameById[r.athleteId] || '—' })))
    const ranked = rankResults(blockRes, wod.type).slice(0, 3)
    const n = blockRes.length
    return {
      wodLabel: blkLabel(wod),
      wodMeta: [blkMeta(wod), `${n} resultado${n !== 1 ? 's' : ''}`].filter(Boolean).join(' · '),
      rows: ranked.map(r => ({ name: r.name, scale: r.scale, perf: perfStr(r, wod.type) })),
      href,
    }
  }, [selSess, weekResults, athletes, box])

  // Active warnings for the scope, most recent first.
  const warnings = useMemo(() => (
    (Array.isArray(boxWarnings) ? boxWarnings : [])
      .filter(w => w.active && w.message?.trim() && (box ? (w.box === box || w.box === 'all') : w.box === 'all'))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  ), [boxWarnings, box])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className={s.layout}>
        <header className={s.hdr}>
          <div className={s.hdrRule}>
            <div className={s.hdrLine} /><div className={s.hdrDiamond} /><div className={`${s.hdrLine} ${s.hdrLineR}`} />
          </div>
          <div className={s.brand}>{gymName}</div>
          <div className={s.hdrFoot}><div className={s.gym}>{gymSub}</div></div>
        </header>

        <div className={s.main}>
          {status === 'loading' && <div className={s.loading}>carregando treinos...</div>}
          {status === 'error' && (
            <div className={s.errorMsg}>
              ⚠️ Erro ao carregar.<br/>
              <span style={{ fontSize:12, color:'var(--muted)' }}>{error}</span><br/>
              <button className={s.retryBtn} onClick={() => { setStatus('loading'); setError(null); load() }}>↺ Tentar novamente</button>
            </div>
          )}
          {status === 'ok' && (
            <>
              <div className={s.secLbl}>◆ Esta semana</div>
              <WeekGrid sessions={sessions} box={box} selectedDate={selectedDate} onSelect={setSelectedDate} />

              {/* Mobile: single most-recent warning, up top */}
              {warnings[0] && <div className={s.mobileOnly}><MobileWarning warning={warnings[0]} /></div>}

              <div className={`${s.dayTitle} ${s.desktopOnly}`}><span className={s.dtDiamond} />{dayTitle(selectedDate)}</div>

              {selDaySessions.length === 0 ? (
                <div className={s.dayEmpty}>Nenhum treino neste dia.</div>
              ) : (
                <div className={s.split}>
                  <div className={s.trainCol}>
                    {selDaySessions.map(sess => (
                      <DaySessionCard key={sess.id} sess={{ ...sess, _dk: selectedDate }}
                        tag={isSelToday ? '◈ Sessão do dia' : '◈ Sessão'}
                        count={countFor(sess.id)} isFuture={isSelFuture} box={box} />
                    ))}
                  </div>
                  <div className={s.rankCol}>
                    <DayRanking {...rankData} />
                  </div>
                </div>
              )}

              {/* Desktop: 3-column strip of the most recent warnings (the cards carry their own
                  icon + date, so no section title). */}
              {warnings.length > 0 && (
                <div className={s.desktopOnly}>
                  <BoxWarnings warnings={warnings.slice(0, 3)} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* PWA banner */}
      <div className={`${s.pwaBanner}${pwaShow ? ' '+s.pwaBannerShow : ''}`} role="banner">
        <img className={s.pwaIcon} src="icon-192.png" alt="Cone" />
        <div className={s.pwaTextWrap}>
          <div className={s.pwaTitle}>Adicionar à tela inicial</div>
          <div className={s.pwaSub}>Acesso rápido sem abrir o navegador</div>
        </div>
        <button className={s.pwaInstall} onClick={handlePwaInstall}>Instalar</button>
        <button className={s.pwaDismiss} onClick={dismissPwa} aria-label="Fechar">✕</button>
      </div>

      <Nav active="index" gymName={gymName} box={box} />
    </>
  )
}
