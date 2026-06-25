import { useState, useEffect, useMemo } from 'react'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'
import { sb } from '../supabaseClient.js'
import Header from '../Header.jsx'
import Nav from '../Nav.jsx'
import s from './Leaderboard.module.css'
import { rankResults, perfStr } from '../lib/wod.js'

const WOD_TYPES    = ['WOD', 'For Time', 'AMRAP', 'EMOM', 'MetCon', 'HIIT']
const SCALES       = ['Todos', 'RX', 'Inter', 'SC', 'Adaptado']
const SCALE_RANK   = { RX: 4, Inter: 3, SC: 2, Adaptado: 1, '-': 0 }
const SCALE_NAMES  = { 4: 'RX', 3: 'Inter', 2: 'SC', 1: 'Adaptado', 0: '-' }
const PODIUM_LABELS = ['1º', '2º', '3º']
const MONTHS_PT    = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function buildLbc(lbColors = {}) {
  return {
    lbBg:          lbColors.lbBg          || '#000000',
    lbRowAlt:      lbColors.lbRowAlt      || '#020809',
    lbP1Bg:        lbColors.lbP1Bg        || 'rgba(255,215,0,0.06)',
    lbP2Bg:        lbColors.lbP2Bg        || 'rgba(192,192,192,0.05)',
    lbP3Bg:        lbColors.lbP3Bg        || 'rgba(205,127,50,0.05)',
    lbDivider:     lbColors.lbDivider     || '#0d1e1e',
    lbHdrBg:       lbColors.lbHdrBg       || '#000000',
    lbHdrBorder:   lbColors.lbHdrBorder   || '#00b8d4',
    lbHdrTitle:    lbColors.lbHdrTitle    || '#ffffff',
    lbHdrSub:      lbColors.lbHdrSub      || '#00b8d4',
    lbRank:        lbColors.lbRank        || '#333333',
    lbP1:          lbColors.lbP1          || '#ffd700',
    lbP2:          lbColors.lbP2          || '#c0c0c0',
    lbP3:          lbColors.lbP3          || '#cd7f32',
    lbName:        lbColors.lbName        || '#ffffff',
    lbScaleText:   lbColors.lbScaleText   || '#00b8d4',
    lbScaleBg:     lbColors.lbScaleBg     || 'rgba(0,184,212,0.1)',
    lbScaleBorder: lbColors.lbScaleBorder || '#00b8d4',
    lbPerf:        lbColors.lbPerf        || '#ffffff',
    lbFilterBg:    lbColors.lbFilterBg    || '#00b8d4',
    lbFilterText:  lbColors.lbFilterText  || '#000000',
  }
}

function weekBounds(offset) {
  const today = new Date()
  const sun = new Date(today)
  sun.setDate(today.getDate() - today.getDay() + offset * 7)
  sun.setHours(0, 0, 0, 0)
  const sat = new Date(sun)
  sat.setDate(sun.getDate() + 6)
  sat.setHours(23, 59, 59, 999)
  return [sun, sat]
}

function toDateKey(d) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

function weekLabelFor(offset) {
  const [sun, sat] = weekBounds(offset)
  const fmt = d => `${d.getDate()} ${MONTHS_PT[d.getMonth()]}`
  return `${fmt(sun)} – ${fmt(sat)}, ${sun.getFullYear()}`
}

function buildWodList(sessions, results) {
  const list = []
  const sessObj = typeof sessions === 'object' && !Array.isArray(sessions) ? sessions : {}
  Object.entries(sessObj).sort(([a], [b]) => b.localeCompare(a)).forEach(([dateKey, daySessions]) => {
    ;(daySessions || []).forEach(sess => {
      ;(sess.blocks || []).filter(bl => WOD_TYPES.includes(bl.label) || WOD_TYPES.includes(bl.type)).forEach(bl => {
        const count = (results || []).filter(r =>
          r.date === dateKey && r.sessionId === sess.id && r.presence === 'Presente' &&
          (r.blocks || []).some(rb => rb.blockId === bl.id && (rb.perfTime || rb.perfRounds || rb.perfReps))
        ).length
        if (count > 0) {
          const dt = new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
          const label = bl.label && bl.label !== '-' ? bl.label : bl.type
          const meta = [bl.rounds && `${bl.rounds}rds`, bl.duration && `CAP ${bl.duration}'`].filter(Boolean).join(' · ')
          const sessName = Array.isArray(sess.mainTraining) ? sess.mainTraining.join(', ') : (sess.mainTraining || '')
          list.push({ key: `${dateKey}|${sess.id}|${bl.id}`, dateKey, sessId: sess.id, blId: bl.id, blType: bl.type, label, meta, sessName, dt, count })
        }
      })
    })
  })
  return list
}

async function fetchState() {
  const blobTables = ['sessions', 'athletes', 'events', 'locations', 'coach_profile', 'settings', 'goals_data', 'lb_colors']
  const [blobRows, resRaw] = await Promise.all([
    Promise.all(blobTables.map(t => sb.from(t).select('value').eq('id', 1).maybeSingle())),
    sb.from('results_v2').select('*'),
  ])
  const [sessions, athletes, , , , settings, , lbColors] = blobRows.map(x => x.data?.value ?? null)
  const results = (resRaw.data || []).map(r => ({
    id: r.id, date: r.date, athleteId: r.athlete_id, sessionId: r.session_id,
    presence: r.presence, energyLevel: r.energy_level, blocks: r.blocks,
    coachNote: r.coach_note, flagForReview: r.flag_for_review, loggedByAthlete: r.logged_by_athlete,
  }))
  return { sessions: sessions ?? {}, athletes: athletes ?? [], results, settings: settings ?? {}, lbColors: lbColors ?? {} }
}

export default function Leaderboard() {
  const [status,      setStatus]      = useState('loading')
  const [cfg,         setCfg]         = useState({})
  const [appState,    setAppState]    = useState(null)
  const [selWod,      setSelWod]      = useState('')
  const [scaleFilter, setScaleFilter] = useState('Todos')
  const [error,       setError]       = useState(null)
  const [weekOffset,  setWeekOffset]  = useState(0)

  useEffect(() => {
    if (!appState) return
    const lbColors = appState.lbColors || {}
    const accent   = (lbColors.lbColors && lbColors.lbColors.lbHdrBorder) || lbColors.lbHdrBorder || '#00b8d4'
    document.documentElement.style.setProperty('--accent', accent)
    document.body.style.background = lbColors.lbBg || '#000000'
    if (cfg.fontFamily)       document.documentElement.style.setProperty('--lb-font', cfg.fontFamily)
    if (cfg.themeAccentText)  document.documentElement.style.setProperty('--accent-text', cfg.themeAccentText)
  }, [cfg, appState])

  async function load(attempt = 0) {
    try {
      const [cfgData, stateData] = await Promise.all([
        fetch('./config.json?v=' + Date.now()).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetchState(),
      ])
      setCfg(cfgData)
      setAppState(stateData)
      setStatus('ok')
      if (cfgData.leaderboardTitle || cfgData.appTitle)
        document.title = cfgData.leaderboardTitle || cfgData.appTitle
    } catch (err) {
      if (attempt < 2) { setTimeout(() => load(attempt + 1), 2000 * (attempt + 1)); return }
      setError(err.message)
      setStatus('error')
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!appState) return
    const p = new URLSearchParams(window.location.search)
    const wod = p.get('wod'), sessId = p.get('session'), date = p.get('date')
    if (wod && sessId && date) {
      const key  = `${date}|${sessId}|${wod}`
      const list = buildWodList(appState.sessions, appState.results)
      if (list.find(w => w.key === key)) {
        setSelWod(key)
        // Adjust week offset so desktop selector shows the right week
        const wodSun = new Date(date + 'T12:00:00')
        wodSun.setDate(wodSun.getDate() - wodSun.getDay())
        const todaySun = new Date()
        todaySun.setDate(todaySun.getDate() - todaySun.getDay())
        const diffWeeks = Math.round((todaySun - wodSun) / (7 * 24 * 60 * 60 * 1000))
        if (diffWeeks > 0) setWeekOffset(-diffWeeks)
      }
    }
  }, [appState]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = e => { if (e.persisted) load() }
    window.addEventListener('pageshow', handler)
    return () => window.removeEventListener('pageshow', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const lbc = useMemo(() => buildLbc((appState?.lbColors?.lbColors) || appState?.lbColors || {}), [appState])

  const wodList = useMemo(() =>
    appState ? buildWodList(appState.sessions, appState.results) : [],
  [appState])

  const selObj = useMemo(() => wodList.find(w => w.key === selWod) ?? null, [wodList, selWod])

  const ranked = useMemo(() => {
    if (!selObj || !appState) return []
    const athletes = appState.athletes || []
    const wodResults = (appState.results || [])
      .filter(r => r.date === selObj.dateKey && r.sessionId === selObj.sessId && r.presence === 'Presente')
      .map(r => {
        const blk = (r.blocks || []).find(b => b.blockId === selObj.blId) || null
        if (!blk) return null
        const exRows = blk.exerciseRows || []
        let minRank = 4
        exRows.forEach(row => { const rank = SCALE_RANK[row.scale] ?? 0; if (rank < minRank) minRank = rank })
        const computedScale = exRows.length > 0 ? SCALE_NAMES[minRank] : blk.scale || '-'
        return { ...r, perfTime: blk.perfTime, perfRounds: blk.perfRounds, perfReps: blk.perfReps, scale: computedScale }
      })
      .filter(r => r && (r.perfTime || r.perfRounds || r.perfReps))
    const filtered = scaleFilter === 'Todos' ? wodResults : wodResults.filter(r => r.scale === scaleFilter)
    return rankResults(filtered, selObj.blType).map(r => ({ ...r, athlete: athletes.find(a => a.id === r.athleteId) }))
  }, [selObj, appState, scaleFilter])

  const gymName = cfg.gymName || appState?.settings?.gymName || 'Cone'

  const weekWods = useMemo(() => {
    const [sun, sat] = weekBounds(weekOffset)
    const sunKey = toDateKey(sun), satKey = toDateKey(sat)
    return wodList.filter(w => w.dateKey >= sunKey && w.dateKey <= satKey)
  }, [wodList, weekOffset])

  const weekLabelStr = weekLabelFor(weekOffset)

  if (status === 'loading') return (
    <>
      <div className={s.pageRoot}>
        <Header brand="CONE" sub="Leaderboard" />
        <div className={s.loading}>Carregando resultados...</div>
      </div>
      <Nav active="leaderboard" gymName={gymName} />
    </>
  )

  if (status === 'error') return (
    <>
      <div className={s.pageRoot}>
        <Header brand="CONE" sub="Leaderboard" />
        <div className={s.errState}>
          <IconAlertCircle size={32} />
          <br /><br />
          Não foi possível carregar os resultados.<br />
          <small>{error}</small><br />
          <button className={s.retryBtn} onClick={() => { setStatus('loading'); setError(null); load() }}>
            <IconRefresh size={14} /> Tentar novamente
          </button>
        </div>
      </div>
      <Nav active="leaderboard" gymName={gymName} />
    </>
  )

  return (
    <>
      <div className={s.pageRoot}>
        <Header brand="CONE" sub={gymName} />

        {/* Mobile: sticky WOD select + scale filters */}
        <div className={s.controls}>
          <select className={s.sel} value={selWod} onChange={e => setSelWod(e.target.value)}>
            <option value="">— Selecionar WOD —</option>
            {wodList.map(w => (
              <option key={w.key} value={w.key}>
                {w.dt}{w.sessName ? ` (${w.sessName})` : ''} — {w.label}{w.meta ? ` · ${w.meta}` : ''}
              </option>
            ))}
          </select>
          <div className={s.filterRow}>
            {SCALES.map(sc => (
              <button key={sc} className={s.fb}
                style={scaleFilter === sc ? { background: lbc.lbFilterBg, color: lbc.lbFilterText, borderColor: lbc.lbFilterBg, fontWeight: 700 } : {}}
                onClick={() => setScaleFilter(sc)}>{sc}</button>
            ))}
          </div>
        </div>

        <div className={s.contentArea}>

          {/* LEFT: WOD selector — desktop only */}
          <div className={s.wodCol}>
            <div className={s.weekNav}>
              <button className={s.weekBtn} onClick={() => setWeekOffset(o => o - 1)}>‹</button>
              <span className={s.weekLabel}>{weekLabelStr}</span>
              <button className={s.weekBtn} onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0}>›</button>
            </div>
            {weekWods.length === 0
              ? <div className={s.noWods}>Nenhum WOD registrado nesta semana.</div>
              : weekWods.map(w => (
                <div key={w.key}
                  className={`${s.wodCard}${selWod === w.key ? ' ' + s.wodCardSel : ''}`}
                  onClick={() => setSelWod(w.key)}>
                  <div className={s.wodCardHdr}>
                    <div className={s.wodDot} />
                    <span className={s.wodName}>{w.sessName || w.label}</span>
                    <span className={s.wodTypeTag}>{w.label}</span>
                  </div>
                  <div className={s.wodMeta}>
                    <span>{w.dt}</span>
                    {w.count > 0 && <span>{w.count} atleta{w.count !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
              ))
            }
          </div>

          {/* RIGHT: Rankings */}
          <div className={s.rankCol}>

            {/* Desktop: scale filter pills */}
            <div className={s.desktopScale}>
              {SCALES.map(sc => (
                <button key={sc} className={s.fb}
                  style={scaleFilter === sc ? { background: lbc.lbFilterBg, color: lbc.lbFilterText, borderColor: lbc.lbFilterBg, fontWeight: 700 } : {}}
                  onClick={() => setScaleFilter(sc)}>{sc}</button>
              ))}
            </div>

            {selObj ? (
              <>
                <div className={s.lbHdr} style={{ background: lbc.lbHdrBg, borderBottom: `3px solid ${lbc.lbHdrBorder}` }}>
                  <div className={s.lbTitle} style={{ color: lbc.lbHdrTitle }}>
                    {selObj.label}{selObj.meta ? ` · ${selObj.meta}` : ''}
                  </div>
                  <div className={s.lbMeta} style={{ color: lbc.lbHdrSub }}>
                    {selObj.dt}{selObj.sessName ? ` · ${selObj.sessName}` : ''}{scaleFilter !== 'Todos' ? ` · ${scaleFilter}` : ''}
                  </div>
                </div>
                <div style={{ background: lbc.lbBg }}>
                  {ranked.length === 0 ? (
                    <div className={s.empty} style={{ color: lbc.lbRank }}>Nenhum resultado para esta seleção.</div>
                  ) : ranked.map((r, ri) => {
                    const isPodium = ri < 3
                    const podColors = [lbc.lbP1, lbc.lbP2, lbc.lbP3]
                    const podBgs    = [lbc.lbP1Bg, lbc.lbP2Bg, lbc.lbP3Bg]
                    const pColor    = isPodium ? podColors[ri] : null
                    const rowBg     = isPodium ? podBgs[ri] : ri % 2 === 0 ? lbc.lbRowAlt : lbc.lbBg
                    return (
                      <div key={r.id ?? ri} className={s.row} style={{ background: rowBg, borderBottomColor: lbc.lbDivider }}>
                        <div className={s.rank} style={{ color: pColor || lbc.lbRank }}>
                          {isPodium ? PODIUM_LABELS[ri] : `${ri + 1}º`}
                        </div>
                        <div className={s.dot} style={{ background: r.athlete?.color || '#555' }} />
                        <div className={s.name} style={{ color: lbc.lbName }}>{r.athlete?.name || '—'}</div>
                        {r.scale && r.scale !== '-' && (
                          <span className={s.scaleBadge} style={{ color: lbc.lbScaleText, background: lbc.lbScaleBg, border: `1px solid ${lbc.lbScaleBorder}` }}>
                            {r.scale}
                          </span>
                        )}
                        <div className={s.perf} style={{ color: pColor || lbc.lbPerf }}>{perfStr(r, selObj.blType)}</div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className={s.empty} style={{ color: lbc.lbRank }}>← Selecione um WOD para ver o ranking.</div>
            )}

          </div>

        </div>
      </div>

      <Nav active="leaderboard" gymName={gymName} />
    </>
  )
}
