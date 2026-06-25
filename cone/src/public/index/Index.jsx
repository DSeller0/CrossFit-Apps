import { useState, useEffect, useRef, useMemo } from 'react'
import { sb } from '../supabaseClient.js'
import { registerSW } from '../registerSW.js'
import Nav from '../Nav.jsx'
import s from './Index.module.css'

// ── Constants ─────────────────────────────────────────────────────────────
const WOD_TYPES  = new Set(['WOD','For Time','AMRAP','EMOM','MetCon','HIIT'])
const STRENGTH_T = new Set(['Força','Weightlifting','Gymnastics'])
const WARM_T     = new Set(['Aquecimento','Warm-up'])
const CORE_T     = new Set(['Core','Abdômen'])
const MOB_T      = new Set(['Mobilidade','Flexibilidade','Cool-down'])

const BLOCK_COLORS = { wod: 'var(--teal)', warm: 'var(--gold)', str: '#c87850', skill: '#9070d8', core: '#70a870', mob: '#5090d8' }
const DAYS_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']

function blockCls(type) {
  if (WOD_TYPES.has(type))  return 'wod'
  if (STRENGTH_T.has(type)) return 'str'
  if (WARM_T.has(type))     return 'warm'
  if (CORE_T.has(type))     return 'core'
  if (MOB_T.has(type))      return 'mob'
  return 'skill'
}

function dateKey(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset)
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
}

const TODAY_DK  = dateKey(0)
const YESTER_DK = dateKey(-1)
const TOMOR_DK  = dateKey(1)

// ── Sub-components ────────────────────────────────────────────────────────
function BlockPill({ block }) {
  const cls   = blockCls(block.type)
  const color = BLOCK_COLORS[cls]
  const hasLabel = block.label && block.label !== block.type
  const isWod = WOD_TYPES.has(block.type)
  let meta = ''
  if (block.duration)      meta = isWod ? `Cap ${block.duration}'` : `${block.duration}'`
  else if (block.stationRepeat) meta = `${block.stationRepeat}×`
  return (
    <div className={s.blkPill}>
      <div className={s.blkDot} style={{ background: color }} />
      <span className={s.blkType} style={{ color }}>{block.type}</span>
      {hasLabel && <><span className={s.blkSep}>·</span><span className={s.blkLabel}>{block.label}</span></>}
      {meta && <span className={s.blkMeta}>{meta}</span>}
    </div>
  )
}

function SessionCard({ sess, dk, count, isToday, isFuture, expanded, onToggle }) {
  const [_y, _m, _d] = dk.split('-').map(Number)
  const name     = sess.sessionName || sess.name || DAYS_PT[new Date(_y, _m-1, _d).getDay()]
  const logUrl   = `results.html?session=${encodeURIComponent(sess.id)}`
  const tag      = isToday ? '◈ Sessão do dia' : (isFuture ? 'Próxima' : 'Anterior')
  const countLbl = count === 0 ? 'Seja o primeiro' : count === 1 ? '1 resultado' : `${count} resultados`
  const blocks   = sess.blocks || []

  let cardCls = s.sessCard
  if (isToday)       cardCls += ' ' + s.sessToday
  else if (!isFuture) cardCls += ' ' + s.sessPast
  if (!expanded)     cardCls += ' ' + s.collapsed

  return (
    <div className={cardCls}>
      <div className={s.cardHdr} onClick={onToggle}>
        <span className={`${s.cardTag}${isToday ? ' '+s.cardTagToday : ''}`}>{tag}</span>
        <div className={s.cardChevron} />
      </div>
      <div className={s.sessCompact}>
        <span className={s.compactName}>{name}</span>
        <span className={s.compactBadge}>{blocks.length} bloco{blocks.length !== 1 ? 's' : ''}</span>
      </div>
      <div className={s.cardBody}>
        <div className={s.cardName}>{name}</div>
        {blocks.length > 0 && (
          <div className={s.blocks}>
            {blocks.map((b, i) => <BlockPill key={i} block={b} />)}
          </div>
        )}
        <div className={s.cardFooter}>
          <span className={s.regCount}>{countLbl}</span>
          {!isFuture && <a className={s.btnReg} href={logUrl}>Registrar →</a>}
        </div>
      </div>
    </div>
  )
}

function DaySection({ dk, daySessions, countBySess, offset, expandedSet, onToggle }) {
  const isToday  = offset === 0
  const isFuture = offset > 0
  const LABELS   = { '-1': 'Ontem', '0': '◈ Hoje', '1': 'Amanhã' }
  const label    = LABELS[String(offset)] || dk
  const labelCls = isToday ? s.dlrToday : (isFuture ? s.dlrFuture : s.dlrPast)

  return (
    <>
      <div className={s.dayLblRow}>
        <div className={s.dlrLine} /><span className={`${s.dlrText} ${labelCls}`}>{label}</span><div className={s.dlrLine} />
      </div>
      {daySessions.length === 0
        ? <div className={s.dayEmpty}>Nenhum treino programado.</div>
        : daySessions.map((sess, i) => (
          <SessionCard key={sess.id} sess={sess} dk={dk}
            count={countBySess[sess.id] || 0}
            isToday={isToday} isFuture={isFuture}
            expanded={expandedSet.has(sess.id)}
            onToggle={() => onToggle(sess.id)} />
        ))
      }
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function Index() {
  const [status,      setStatus]      = useState('loading')
  const [sessions,    setSessions]    = useState({})
  const [countBySess, setCountBySess] = useState({})
  const [gymName,     setGymName]     = useState('CONE')
  const [gymSub,      setGymSub]      = useState('CrossFit')
  const [error,       setError]       = useState(null)
  const [expandedSet, setExpandedSet] = useState(new Set())
  const [pwaShow,     setPwaShow]     = useState(false)

  const deferredPromptRef = useRef(null)

  // ── Data loading ─────────────────────────────────────────────────────────
  async function load(attempt = 0) {
    try {
      const [sessRes, resRaw, settRes] = await Promise.all([
        sb.from('sessions').select('value').eq('id',1).maybeSingle(),
        sb.from('results_v2').select('session_id'),
        sb.from('settings').select('value').eq('id',1).maybeSingle(),
      ])
      const allSessions = sessRes.data?.value || {}
      const allResults  = (resRaw.data||[]).map(r=>({sessionId:r.session_id}))
      const settings    = settRes.data?.value || {}

      // Theme sync from Supabase
      if (settings.theme) {
        const cur = localStorage.getItem('cone_theme')
        if (cur !== settings.theme) {
          localStorage.setItem('cone_theme', settings.theme)
          document.documentElement.className =
            document.documentElement.className.replace(/\btheme-\S+/g,'').trim() + ' theme-' + settings.theme
        }
      }

      const counts = {}
      allResults.forEach(r => { if (r.sessionId) counts[r.sessionId] = (counts[r.sessionId] || 0) + 1 })

      // Expand today's first session by default
      const todaySess = allSessions[TODAY_DK] || []
      if (todaySess.length) setExpandedSet(new Set([todaySess[0].id]))

      if (settings.gymName) setGymName(settings.gymName.toUpperCase())
      setSessions(allSessions)
      setCountBySess(counts)
      setStatus('ok')
    } catch (err) {
      if (attempt < 2) { setTimeout(() => load(attempt + 1), 2000*(attempt+1)); return }
      setError(err.message); setStatus('error')
    }
  }

  async function refreshCounts() {
    const { data } = await sb.from('results_v2').select('session_id')
    const counts = {}
    ;(data||[]).forEach(r => { if (r.session_id) counts[r.session_id] = (counts[r.session_id] || 0) + 1 })
    setCountBySess(counts)
  }

  // Mount: load data + SW + PWA banner
  useEffect(() => {
    registerSW()
    load()

    // PWA install prompt
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

  // 30s count refresh
  useEffect(() => {
    if (status !== 'ok') return
    const id = setInterval(refreshCounts, 30000)
    return () => clearInterval(id)
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // pageshow (bfcache back-nav)
  useEffect(() => {
    const handler = e => { if (e.persisted) load().catch(() => {}) }
    window.addEventListener('pageshow', handler)
    return () => window.removeEventListener('pageshow', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────
  function toggleCard(sessId) {
    setExpandedSet(prev => { const next = new Set(prev); next.has(sessId) ? next.delete(sessId) : next.add(sessId); return next })
  }

  function handlePwaInstall() {
    if (!deferredPromptRef.current) return
    deferredPromptRef.current.prompt()
    deferredPromptRef.current.userChoice.then(() => {
      deferredPromptRef.current = null; setPwaShow(false)
      localStorage.setItem('cone_pwa_dismissed', '1')
    })
  }

  function dismissPwa() {
    setPwaShow(false); localStorage.setItem('cone_pwa_dismissed', '1')
  }

  // ── Sessions pane content ─────────────────────────────────────────────────
  let sessionsPaneJsx
  if (status === 'loading') {
    sessionsPaneJsx = <div className={s.loading}>carregando treinos...</div>
  } else if (status === 'error') {
    sessionsPaneJsx = (
      <div className={s.errorMsg}>
        ⚠️ Erro ao carregar.<br/>
        <span style={{ fontSize:12, color:'var(--muted)' }}>{error}</span><br/>
        <button className={s.retryBtn} onClick={() => { setStatus('loading'); setError(null); load() }}>↺ Tentar novamente</button>
      </div>
    )
  } else {
    sessionsPaneJsx = (
      <>
        <DaySection dk={YESTER_DK} daySessions={sessions[YESTER_DK]||[]} countBySess={countBySess} offset={-1} expandedSet={expandedSet} onToggle={toggleCard} />
        <DaySection dk={TODAY_DK}  daySessions={sessions[TODAY_DK] ||[]} countBySess={countBySess} offset={0}  expandedSet={expandedSet} onToggle={toggleCard} />
        <DaySection dk={TOMOR_DK}  daySessions={sessions[TOMOR_DK] ||[]} countBySess={countBySess} offset={1}  expandedSet={expandedSet} onToggle={toggleCard} />
      </>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className={s.layout}>
        <div className={s.paneLeft}>
          <header className={s.hdr}>
            <div className={s.hdrRule}>
              <div className={s.hdrLine} /><div className={s.hdrDiamond} /><div className={`${s.hdrLine} ${s.hdrLineR}`} />
            </div>
            <div className={s.brand}>{gymName}</div>
            <div className={s.hdrFoot}><div className={s.gym}>{gymSub}</div></div>
          </header>
          {sessionsPaneJsx}
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

      <Nav active="index" />
    </>
  )
}
