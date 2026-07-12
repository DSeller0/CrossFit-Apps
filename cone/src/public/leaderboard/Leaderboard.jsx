import { useState, useEffect, useMemo } from 'react'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'
import { sb } from '../supabaseClient.js'
import Header from '../Header.jsx'
import Nav from '../Nav.jsx'
import s from './Leaderboard.module.css'
import RankList from '../shared/RankList.jsx'
import WodBlockCard from '../shared/WodBlockCard.jsx'
import ScaleFilter from '../shared/ScaleFilter.jsx'
import WodSelectCard from './WodSelectCard.jsx'
import WodCard from './WodCard.jsx'
import { isWodBlock, deriveScale, rankResults, perfStr } from '../lib/wod.js'
import { MONTH_PT_SHORT, toISO, getWeek, dateToWeekOffset } from '../lib/week.js'
import { BLOB_TABLES, mapResultRow } from '../lib/blobTables.js'

// The lb_colors custom-color system is retired (#51). It predated the 4-theme
// system and force-wrote --accent onto <html>, which is why this page rendered
// cyan no matter which theme you picked — the same bug class #50 deleted from
// Schedule.jsx. Everything here now comes from theme tokens.

function weekLabelFor(offset) {
  const wk = getWeek(offset)
  const fmt = d => `${d.getDate()} ${MONTH_PT_SHORT[d.getMonth()]}`
  return `${fmt(wk[0])} – ${fmt(wk[6])}, ${wk[0].getFullYear()}`
}

// Newest first, and WODs with zero results are dropped — so wodList[0] IS
// "latest WOD with results", which is what we auto-select.
function buildWodList(sessions, results) {
  const list = []
  const sessObj = typeof sessions === 'object' && !Array.isArray(sessions) ? sessions : {}
  Object.entries(sessObj).sort(([a], [b]) => b.localeCompare(a)).forEach(([dateKey, daySessions]) => {
    ;(daySessions || []).filter(sess => sess.public !== false).forEach(sess => {
      ;(sess.blocks || []).filter(isWodBlock).forEach(bl => {
        const count = (results || []).filter(r =>
          r.date === dateKey && r.sessionId === sess.id && r.presence === 'Presente' &&
          (r.blocks || []).some(rb => rb.blockId === bl.id && (rb.perfTime || rb.perfRounds || rb.perfReps))
        ).length
        if (count > 0) {
          const dt = new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
          const label = bl.label && bl.label !== '-' ? bl.label : bl.type
          const sessName = Array.isArray(sess.mainTraining) ? sess.mainTraining.join(', ') : (sess.mainTraining || '')
          list.push({ key: `${dateKey}|${sess.id}|${bl.id}`, dateKey, sessId: sess.id, blId: bl.id, blType: bl.type, bl, label, sessName, dt, count })
        }
      })
    })
  })
  return list
}

// One WOD's results, shaped for RankList.
function entriesFor(wod, appState) {
  if (!wod || !appState) return []
  const athletes = appState.athletes || []
  return (appState.results || [])
    .filter(r => r.date === wod.dateKey && r.sessionId === wod.sessId && r.presence === 'Presente')
    .map(r => {
      const blk = (r.blocks || []).find(b => b.blockId === wod.blId)
      if (!blk) return null
      const ath = athletes.find(a => String(a.id) === String(r.athleteId))
      return {
        id: r.id, athleteId: String(r.athleteId),
        name: ath?.name || '—', color: ath?.color,
        scale: deriveScale(blk),
        perfTime: blk.perfTime, perfRounds: blk.perfRounds, perfReps: blk.perfReps,
      }
    })
    .filter(e => e && (e.perfTime || e.perfRounds || e.perfReps))
}

function leaderOf(entries, blType) {
  const top = rankResults(entries, blType)[0]
  return top ? { leaderName: top.name, leaderPerf: perfStr(top, blType) } : {}
}

async function fetchState() {
  const [blobRows, resRaw] = await Promise.all([
    Promise.all(BLOB_TABLES.map(t => sb.from(t).select('value').eq('id', 1).maybeSingle())),
    sb.from('results_v2').select('*'),
  ])
  const [sessions, athletes, , , , settings] = blobRows.map(x => x.data?.value ?? null)
  return {
    sessions: sessions ?? {},
    athletes: athletes ?? [],
    results: (resRaw.data || []).map(mapResultRow),
    settings: settings ?? {},
  }
}

export default function Leaderboard() {
  const [status,      setStatus]      = useState('loading')
  const [appState,    setAppState]    = useState(null)
  const [selWod,      setSelWod]      = useState('')
  const [scaleFilter, setScaleFilter] = useState('Todos')
  const [error,       setError]       = useState(null)
  const [weekOffset,  setWeekOffset]  = useState(0)

  async function load(attempt = 0) {
    try {
      const stateData = await fetchState()
      setAppState(stateData)
      setStatus('ok')
    } catch (err) {
      if (attempt < 2) { setTimeout(() => load(attempt + 1), 2000 * (attempt + 1)); return }
      setError(err.message)
      setStatus('error')
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = e => { if (e.persisted) load() }
    window.addEventListener('pageshow', handler)
    return () => window.removeEventListener('pageshow', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const wodList = useMemo(() => appState ? buildWodList(appState.sessions, appState.results) : [], [appState])

  // Auto-select (#51): the page used to open EMPTY — both panes showed "pick a
  // WOD" until you did. wodList is newest-first and already excludes WODs with no
  // results, so [0] is the latest WOD worth looking at. A ?wod= deep-link wins.
  useEffect(() => {
    if (!appState || !wodList.length || selWod) return
    const p = new URLSearchParams(window.location.search)
    const wod = p.get('wod'), sessId = p.get('session'), date = p.get('date')
    const deepKey = wod && sessId && date ? `${date}|${sessId}|${wod}` : null
    const target = (deepKey && wodList.find(w => w.key === deepKey)) || wodList[0]
    setSelWod(target.key)
    setWeekOffset(dateToWeekOffset(target.dateKey))
  }, [appState, wodList]) // eslint-disable-line react-hooks/exhaustive-deps

  const selObj  = useMemo(() => wodList.find(w => w.key === selWod) ?? null, [wodList, selWod])
  const entries = useMemo(() => entriesFor(selObj, appState), [selObj, appState])

  const weekWods = useMemo(() => {
    const wk = getWeek(weekOffset)
    const sunKey = toISO(wk[0]), satKey = toISO(wk[6])
    return wodList.filter(w => w.dateKey >= sunKey && w.dateKey <= satKey)
  }, [wodList, weekOffset])

  const gymName = (appState?.settings?.gymName || 'Cone').toUpperCase()

  function changeWeek(dir) { setWeekOffset(o => o + dir) }
  function pickWod(key) { setSelWod(key); setScaleFilter('Todos') }
  function toggleWod(key) { setSelWod(k => (k === key ? '' : key)); setScaleFilter('Todos') }

  const weekNav = (
    <div className={s.weekNav}>
      <button type="button" className={s.weekBtn} onClick={() => changeWeek(-1)} aria-label="Semana anterior">‹</button>
      <span className={s.weekLabel}>{weekLabelFor(weekOffset)}</span>
      <button type="button" className={s.weekBtn} onClick={() => changeWeek(1)} disabled={weekOffset >= 0} aria-label="Próxima semana">›</button>
    </div>
  )

  if (status === 'loading') return (
    <>
      <div className={s.pageRoot}>
        <Header brand={gymName} sub="RANKING" />
        <main className={s.main}>
          <h1 className={s.srOnly}>Ranking</h1>
          <div className={s.loading} aria-live="polite">Carregando resultados...</div>
        </main>
      </div>
      <Nav active="leaderboard" gymName={gymName} />
    </>
  )

  if (status === 'error') return (
    <>
      <div className={s.pageRoot}>
        <Header brand={gymName} sub="RANKING" />
        <main className={s.main}>
          <h1 className={s.srOnly}>Ranking</h1>
          <div className={s.errState} aria-live="polite">
            <IconAlertCircle size={32} />
            <br /><br />
            Não foi possível carregar os resultados.<br />
            <small>{error}</small><br />
            <button className={s.retryBtn} onClick={() => { setStatus('loading'); setError(null); load() }}>
              <IconRefresh size={14} /> Tentar novamente
            </button>
          </div>
        </main>
      </div>
      <Nav active="leaderboard" gymName={gymName} />
    </>
  )

  return (
    <>
      <div className={s.pageRoot}>
        <Header brand={gymName} sub="RANKING" />
        <main className={s.main}>
          <h1 className={s.srOnly}>Ranking</h1>

          {/* ── MOBILE: week picker + accordion cards. The ranking lives INSIDE the
              WOD you open — the <select> picker is gone (#51). ── */}
          <div className={s.mobileView}>
            {weekNav}
            {weekWods.length === 0
              ? <div className={s.noWods}>Nenhum WOD registrado nesta semana.</div>
              : weekWods.map(w => {
                  const open = selWod === w.key
                  const wEntries = open ? entries : entriesFor(w, appState)
                  return (
                    <WodCard key={w.key} w={w} summary={leaderOf(wEntries, w.blType)}
                      expanded={open} onToggle={() => toggleWod(w.key)}>
                      <div className={s.cardOpen}>
                        <ScaleFilter value={scaleFilter} onChange={setScaleFilter} />
                        <WodBlockCard bl={w.bl} dt={w.dt} sessName={w.sessName} scaleFilter={scaleFilter} />
                        <RankList entries={wEntries} blType={w.blType} scaleFilter={scaleFilter} />
                      </div>
                    </WodCard>
                  )
                })
            }
          </div>

          {/* ── DESKTOP: WOD selector column + ranking column ── */}
          <div className={s.contentArea}>
            <div className={s.wodCol}>
              {weekNav}
              {weekWods.length === 0
                ? <div className={s.noWods}>Nenhum WOD registrado nesta semana.</div>
                : weekWods.map(w => (
                    <WodSelectCard key={w.key} w={w} selected={selWod === w.key} onSelect={pickWod} />
                  ))
              }
            </div>

            <div className={s.rankCol}>
              {selObj ? (
                <>
                  <ScaleFilter value={scaleFilter} onChange={setScaleFilter} className={s.desktopScale} />
                  <WodBlockCard bl={selObj.bl} dt={selObj.dt} sessName={selObj.sessName}
                    scaleFilter={scaleFilter} size="large" />
                  <RankList entries={entries} blType={selObj.blType} scaleFilter={scaleFilter}
                    size="large" showDots />
                </>
              ) : (
                <div className={s.empty}>Nenhum WOD com resultados nesta semana.</div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Nav active="leaderboard" gymName={gymName} />
    </>
  )
}
