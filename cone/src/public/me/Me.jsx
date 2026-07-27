import { useState, useEffect, useRef, useCallback } from 'react'
import Nav from '../Nav.jsx'
import Header from '../Header.jsx'
import { sb } from '../supabaseClient.js'
import { registerSW } from '../registerSW.js'
import { mapResultRow } from '../lib/blobTables.js'
import { toISO, todayISO, fmtDateYear, MONTH_PT_SHORT } from '../lib/week.js'
import { getBoxScope, inBoxScope } from '../lib/boxScope.js'
import { WOD_TYPES, blkColor, deriveScale } from '../lib/wod.js'
import { sessName, normalizeSessionIds } from '../lib/sessions.js'
import HeroCard from './HeroCard.jsx'
import KpiStrip from './KpiStrip.jsx'
import AthletePicker from './AthletePicker.jsx'
import SessionList from './SessionList.jsx'
import EventList from './EventList.jsx'
import GoalList from './GoalList.jsx'
import BarList from './BarList.jsx'
import PrSection from './PrSection.jsx'
import PrLogSheet from './PrLogSheet.jsx'
import BodySheet from './BodySheet.jsx'
import ConfirmSheet from './ConfirmSheet.jsx'
import {
  DIST_TYPES,
  matchesAthlete,
  prValLabel,
  calcStreak,
  calcMaxStreak,
  calcBlockStats,
  buildEvents,
  catToInputType,
  computeDelta,
} from './meHelpers.js'
import { prBest } from '../lib/goals.js'
import { toSecs } from '../lib/wod.js'
import styles from './Me.module.css'

// The athlete's profile page. #52 split the 907-line original into the components
// above; what's left here is the data load, the selection, and the sheet state.
//
// ATHLETE_KEY is shared with results.html and schedule.html on purpose: me.html was
// the only page that forgot who you were, so it re-asked "Quem é você?" on every
// visit while the other two remembered. Now the answer carries across all three, and
// Nav's lockedId keeps it in every tab link.
const ATHLETE_KEY = 'cone_athlete_filter'

export default function Me() {
  const [status, setStatus] = useState('loading')
  const [gymName, setGymName] = useState('Cone')
  const [athletes, setAthletes] = useState([])
  const [sessions, setSessions] = useState({})
  const [allResults, setAllResults] = useState([])
  const [goalsData, setGoalsData] = useState({ athleteGoals: {}, prs: {} })
  const [registry, setRegistry] = useState({})
  const [selAthlete, setSelAthlete] = useState(null)
  const [box] = useState(() => getBoxScope()) // per-box view scope (?box=)
  const [query, setQuery] = useState('')
  // PR board (#87): several family cards can be open at once — a Set, not one id
  // (same pattern as Criador WeekGrid's openIds). The tile grid is glanceable, so
  // there is no longer a per-exercise second disclosure level.
  const [openBlocks, setOpenBlocks] = useState(() => new Set())
  const [prQuery, setPrQuery] = useState('')
  const toggleBlock = bt =>
    setOpenBlocks(prev => {
      const next = new Set(prev)
      next.has(bt) ? next.delete(bt) : next.add(bt)
      return next
    })

  // Exactly one sheet may be open: 'pr' | 'body' | 'clear' | null. Before #52 both
  // sheets rendered unconditionally at the same z-index and could stack.
  const [sheet, setSheet] = useState(null)

  // PR log sheet
  const [lsName, setLsName] = useState('')
  const [lsCats, setLsCats] = useState([])
  const [lsPr, setLsPr] = useState(null)
  const [lsUnit, setLsUnit] = useState('kg')
  const [lsDate, setLsDate] = useState('')
  const [lsVal, setLsVal] = useState('')
  const [lsReps, setLsReps] = useState('')
  const [lsGoal, setLsGoal] = useState('')
  const [lsNote, setLsNote] = useState('')
  const [lsDelta, setLsDelta] = useState({ txt: '', tone: 'none' })
  const [lsPending, setLsPending] = useState(null)
  const [lsSaving, setLsSaving] = useState(false)
  const [lsSaveResult, setLsSaveResult] = useState(null)
  const [lsWarn, setLsWarn] = useState('')
  const lsValRef = useRef(null)

  // Clear-PR confirm
  const [clearName, setClearName] = useState('')
  const [clearBusy, setClearBusy] = useState(false)
  const [clearErr, setClearErr] = useState('')

  // Body sheet
  const [bmWeight, setBmWeight] = useState('')
  const [bmHeight, setBmHeight] = useState('')
  const [bmBf, setBmBf] = useState('')
  const [bmNote, setBmNote] = useState('')
  const [bmWarn, setBmWarn] = useState(false)

  useEffect(() => {
    registerSW()
    load()
    const onShow = e => {
      if (e.persisted) load()
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  useEffect(() => {
    const onPop = () => {
      const id = new URLSearchParams(location.search).get('id')
      const ath = id ? athletes.find(a => String(a.id) === String(id)) : null
      if (ath) {
        setSelAthlete(ath)
        setStatus('profile')
        document.title = ath.name + ' · Cone'
      } else {
        setSelAthlete(null)
        setStatus('picker')
        document.title = 'Meu Perfil · Cone'
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [athletes])

  async function load(attempt = 0) {
    setStatus('loading')
    // ?id= wins over the remembered athlete — a shared link must always show the
    // athlete it names, not whoever this browser last looked at.
    const urlId = new URLSearchParams(location.search).get('id')
    const id = urlId || localStorage.getItem(ATHLETE_KEY)
    try {
      const [athRow, sessRow, resRaw, goalsRow, regRow, settRow] = await Promise.all([
        sb.from('athletes').select('value').eq('id', 1).maybeSingle(),
        sb.from('sessions').select('value').eq('id', 1).maybeSingle(),
        sb.from('results_v2').select('*'),
        sb.from('goals_data').select('value').eq('id', 1).maybeSingle(),
        sb.from('exercise_registry').select('value').eq('id', 1).maybeSingle(),
        sb.from('settings').select('value').eq('id', 1).maybeSingle(),
      ])
      const athList = athRow.data?.value || []
      const settD = settRow.data?.value || {}
      setAthletes(athList)
      setSessions(normalizeSessionIds(sessRow.data?.value || {}))
      setAllResults((resRaw.data || []).map(mapResultRow))
      setGoalsData(goalsRow.data?.value || { athleteGoals: {}, prs: {} })
      setRegistry(regRow.data?.value || {})
      if (settD.gymName) setGymName(settD.gymName)

      const ath = id ? athList.find(a => String(a.id) === String(id)) : null
      if (ath) {
        setSelAthlete(ath)
        document.title = ath.name + ' · Cone'
        setStatus('profile')
        // A remembered athlete should still be linkable — put them in the URL.
        if (!urlId) history.replaceState(null, '', 'me.html?id=' + ath.id)
      } else {
        setStatus('picker')
      }
    } catch (e) {
      if (attempt < 2) {
        setTimeout(() => load(attempt + 1), 2000 * (attempt + 1))
        return
      }
      console.error(e)
      setStatus('error')
    }
  }

  function selectAthlete(ath) {
    setSelAthlete(ath)
    setStatus('profile')
    document.title = ath.name + ' · Cone'
    localStorage.setItem(ATHLETE_KEY, String(ath.id))
    history.pushState(null, '', 'me.html?id=' + ath.id)
  }

  function selectAll() {
    setSelAthlete(null)
    setStatus('picker')
    setQuery('')
    document.title = 'Meu Perfil · Cone'
    localStorage.removeItem(ATHLETE_KEY)
    history.pushState(null, '', 'me.html')
  }

  const closeSheet = useCallback(() => setSheet(null), [])

  // ── PR log sheet ───────────────────────────────────────────────────────────
  function openLogSheet(name, cats, pr) {
    let unit = 'kg'
    if (pr) {
      if (pr.type === 'time') unit = 'time'
      else if (pr.type === 'reps') unit = 'reps'
      else if (pr.unit && ['kg', 'reps', 'm', 'time'].includes(pr.unit)) unit = pr.unit
    } else {
      const t = catToInputType(cats)
      if (t === 'time') unit = 'time'
      else if (t === 'reps') unit = 'reps'
      else if (t === 'dist') unit = 'm'
    }
    setLsName(name)
    setLsCats(cats || [])
    setLsPr(pr || null)
    setLsUnit(unit)
    setLsDate(todayISO())
    setLsVal('')
    setLsReps('')
    setLsGoal(pr?.target || '')
    setLsNote('')
    setLsDelta({ txt: '', tone: 'none' })
    setLsPending(null)
    setLsSaving(false)
    setLsSaveResult(null)
    setLsWarn('')
    setSheet('pr')
  }

  function onValChange(val) {
    setLsVal(val)
    setLsDelta(computeDelta(val, lsPr, lsUnit))
  }

  function switchUnit(unit) {
    setLsUnit(unit)
    setLsVal('')
    setLsDelta({ txt: '', tone: 'none' })
  }

  async function savePr() {
    if (!lsVal.trim()) return
    const raw = lsVal.trim()
    const reps = lsReps ? parseInt(lsReps) || null : null
    const date = lsDate || todayISO()
    const note = lsNote.trim()
    const best = lsPr ? prBest(lsPr) : null

    let numVal, isNewPr
    if (lsUnit === 'time') {
      numVal = raw
      isNewPr = !best || toSecs(raw) < toSecs(best.value)
    } else {
      numVal = parseFloat(raw) || 0
      isNewPr = !best || numVal > parseFloat(best.value || 0)
    }

    if (!isNewPr && !lsPending) {
      setLsPending({ numVal, reps, date, note, bestStr: prValLabel(best.value, lsPr) })
      return
    }

    const p = lsPending
    const finalIsNew = !p
    setLsSaving(true)
    const { error } = await sb.rpc('submit_pr', {
      p_athlete_id: String(selAthlete.id),
      p_exercise: lsName,
      p_value: String(p ? p.numVal : numVal),
      p_unit: lsUnit,
      p_reps: (p ? p.reps : reps) || null,
      p_categories: lsCats,
      p_is_pr_best: finalIsNew,
      p_note: (p ? p.note : note) || null,
      p_date: p ? p.date : date,
      p_target: lsGoal.trim() || null,
    })
    if (error) {
      setLsSaving(false)
      setLsWarn('Erro ao salvar. Verifique conexão.')
      return
    }

    setLsSaveResult(finalIsNew ? 'pr' : 'saved')
    setTimeout(async () => {
      await refreshGoals()
      setLsSaving(false)
      setSheet(null)
    }, 900)
  }

  // ── Clear PR ───────────────────────────────────────────────────────────────
  function askClear(name) {
    setClearName(name)
    setClearErr('')
    setClearBusy(false)
    setSheet('clear')
  }

  async function confirmClear() {
    setClearBusy(true)
    const { error } = await sb.rpc('clear_pr', {
      p_athlete_id: String(selAthlete.id),
      p_exercise: clearName,
    })
    if (error) {
      setClearBusy(false)
      setClearErr('Erro ao apagar. Verifique conexão.')
      return
    }
    await refreshGoals()
    setClearBusy(false)
    setSheet(null)
  }

  async function refreshGoals() {
    const { data } = await sb.from('goals_data').select('value').eq('id', 1).maybeSingle()
    setGoalsData(data?.value || { athleteGoals: {}, prs: {} })
  }

  function openBody() {
    setBmWeight('')
    setBmHeight('')
    setBmBf('')
    setBmNote('')
    setBmWarn(false)
    setSheet('body')
  }

  // ── Profile data ───────────────────────────────────────────────────────────
  function getProfileData() {
    const id = String(selAthlete.id)
    const prs = (goalsData?.prs || {})[id] || []
    const goals = (goalsData?.athleteGoals || {})[id] || []
    const color = selAthlete.color || 'var(--teal)'

    const now = new Date(),
      td = todayISO()
    const nowY = now.getFullYear(),
      nowM = now.getMonth() + 1
    const mPrefix = `${nowY}-${String(nowM).padStart(2, '0')}`

    const myResults = allResults.filter(r => String(r.athleteId) === id)
    const sorted = [...myResults].sort((a, b) => b.date.localeCompare(a.date))
    const present = sorted.filter(r => r.presence === 'Presente')

    // Hearts — one per planned session this month, filled as they're completed.
    const mResults = present.filter(r => r.date.startsWith(mPrefix))
    const beforeToday = mResults.filter(r => r.date < td).length
    const todayDone = mResults.some(r => r.date === td)
    const plannedDates = new Set()
    Object.keys(sessions).forEach(date => {
      if (!date.startsWith(mPrefix)) return
      ;(sessions[date] || [])
        .filter(s => s.public !== false && inBoxScope(s, box))
        .forEach(s => {
          if (matchesAthlete(s, selAthlete.name)) plannedDates.add(date)
        })
    })
    const heartTotal = Math.min(Math.max(plannedDates.size, mResults.length, 12), 20)
    const hearts = []
    for (let i = 0; i < heartTotal; i++) {
      if (i < beforeToday) hearts.push('full')
      else if (i === beforeToday && todayDone) hearts.push('today')
      else hearts.push('empty')
    }

    // KPIs. Scales go through canonical deriveScale() (lib/wod.js) rather than reading
    // the flat blk.scale directly — same reader as results/leaderboard, and it's the
    // one that gets legacy rows (which carry per-exercise scales) right.
    // Count only scales an athlete actually chose. A null (never-picked) scale is
    // excluded from both numerator and denominator — deriveScale maps it to '-',
    // which scalesOf filters out — so the rate is — (not a flattering 0% or a fake
    // RX) until a real scale exists (plans/22 rules 1, 3, 5). The caption states the
    // denominator so a thin one is visible rather than hidden behind a bare %.
    const scalesOf = rs =>
      rs.flatMap(r => (r.blocks || []).map(b => deriveScale(b)).filter(s => s && s !== '-'))
    const allScales = scalesOf(present)
    const rxCount = allScales.filter(s => s === 'RX').length
    const rxRate = allScales.length ? Math.round((rxCount / allScales.length) * 100) : null

    // Recent sessions
    const prDateSet = new Set(prs.flatMap(p => (p.results || []).map(r => r.date)))
    const recSess = present.slice(0, 5).map(r => {
      const s = (sessions[r.date] || []).find(x => x.id === r.sessionId)
      const rs = (r.blocks || []).map(b => b.rpe).filter(Boolean)
      const sc = (r.blocks || []).map(b => deriveScale(b)).filter(s2 => s2 && s2 !== '-')
      let scale = null
      if (sc.length) {
        const c = {}
        sc.forEach(x => {
          c[x] = (c[x] || 0) + 1
        })
        scale = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]
      }
      return {
        date: r.date,
        name: sessName(s, r.date),
        rpe: rs.length ? Math.round(rs.reduce((a, b) => a + b, 0) / rs.length) : null,
        scale,
        hasPr: prDateSet.has(r.date),
      }
    })

    // Executed vs planned, by block type.
    const monthStart = `${mPrefix}-01`
    const wStats = calcBlockStats(
      sessions,
      present,
      selAthlete.name,
      WOD_TYPES,
      monthStart,
      td,
      box,
    )
    const wodRows = WOD_TYPES.filter(t => (wStats.planned[t] || 0) > 0).map(t => {
      const pl = wStats.planned[t],
        ex = Math.min(wStats.executed[t] || 0, pl)
      return { type: t, pl, ex, pct: Math.round((ex / pl) * 100), color: blkColor({ type: t }) }
    })

    const d90 = new Date(now)
    d90.setDate(d90.getDate() - 90)
    const dStats = calcBlockStats(
      sessions,
      present,
      selAthlete.name,
      DIST_TYPES,
      toISO(d90),
      td,
      box,
    )
    const distRows = DIST_TYPES.filter(t => (dStats.planned[t] || 0) > 0).map(t => {
      const pl = dStats.planned[t],
        ex = Math.min(dStats.executed[t] || 0, pl)
      return { type: t, pl, ex, pct: Math.round((ex / pl) * 100), color: blkColor({ type: t }) }
    })

    return {
      color,
      nowY,
      nowM,
      hearts,
      heartTotal,
      thisMon: mResults.length,
      totalSess: present.length,
      streak: calcStreak(present),
      maxStreak: calcMaxStreak(present),
      totalPrs: prs.length,
      prsThisMon: prs.filter(p => p.results?.some(r => r.date?.startsWith(mPrefix))).length,
      rxRate,
      rxCount,
      rxTotal: allScales.length,
      recSess,
      events: buildEvents(prs, goals),
      goals,
      totalMarcosHit: goals.reduce(
        (sum, g) => sum + (g.milestones || []).filter(m => m.hit).length,
        0,
      ),
      wodRows,
      distRows,
      prs,
      sinceStr: selAthlete.since ? fmtDateYear(selAthlete.since) : '',
      days: selAthlete.since
        ? Math.floor((now - new Date(selAthlete.since + 'T12:00:00')) / 86400000)
        : 0,
    }
  }

  const pd = status === 'profile' && selAthlete ? getProfileData() : null

  return (
    <>
      <PrLogSheet
        open={sheet === 'pr'}
        onClose={closeSheet}
        valRef={lsValRef}
        name={lsName}
        cats={lsCats}
        pr={lsPr}
        unit={lsUnit}
        date={lsDate}
        val={lsVal}
        reps={lsReps}
        goal={lsGoal}
        note={lsNote}
        delta={lsDelta}
        pending={lsPending}
        saving={lsSaving}
        saveResult={lsSaveResult}
        warn={lsWarn}
        onVal={onValChange}
        onUnit={switchUnit}
        onDate={setLsDate}
        onReps={setLsReps}
        onGoal={setLsGoal}
        onNote={setLsNote}
        onSave={savePr}
        onCancelPending={() => setLsPending(null)}
      />

      <BodySheet
        open={sheet === 'body'}
        onClose={closeSheet}
        athlete={selAthlete}
        weight={bmWeight}
        height={bmHeight}
        bodyFat={bmBf}
        note={bmNote}
        warn={bmWarn}
        onWeight={setBmWeight}
        onHeight={setBmHeight}
        onBodyFat={setBmBf}
        onNote={setBmNote}
        onSave={() => setBmWarn(true)}
      />

      <ConfirmSheet
        open={sheet === 'clear'}
        onClose={closeSheet}
        title="Apagar registros"
        body={`Todos os registros de "${clearName}" serão apagados. Isso não pode ser desfeito.`}
        confirmLabel="APAGAR"
        onConfirm={confirmClear}
        busy={clearBusy}
        error={clearErr}
      />

      <div className={styles.pageRoot}>
        <div className={styles.inner}>
          <Header brand={gymName.toUpperCase()} sub="MEU PERFIL" />

          <div className={styles.twoPaneBody}>
            <AthletePicker
              variant="rail"
              athletes={athletes}
              selected={selAthlete}
              query={query}
              onQuery={setQuery}
              onSelect={selectAthlete}
              onClear={selectAll}
            />

            <main className={styles.profPane}>
              {status === 'loading' && (
                <div className={styles.centerMsg} aria-live="polite">
                  ⏳ carregando...
                </div>
              )}

              {status === 'error' && (
                <div className={styles.centerMsg} aria-live="polite">
                  Erro ao carregar.
                  <br />
                  <button className={styles.retryBtn} onClick={() => load()}>
                    ↺ Tentar novamente
                  </button>
                </div>
              )}

              {status === 'picker' && (
                <>
                  <AthletePicker
                    variant="picker"
                    athletes={athletes}
                    selected={null}
                    query={query}
                    onQuery={setQuery}
                    onSelect={selectAthlete}
                    onClear={selectAll}
                  />
                  <div className={styles.noSel}>Selecione um atleta ao lado.</div>
                </>
              )}

              {status === 'profile' && pd && (
                <div className={styles.page}>
                  <HeroCard
                    athlete={selAthlete}
                    pd={pd}
                    onOpenBody={openBody}
                    onSwitch={selectAll}
                  />
                  <KpiStrip pd={pd} />

                  {/* One column at every width (Design mockup 24). The two-column
                    contentGrid put the identity lane in the NARROW 40% — 314px on a
                    1280 screen, narrower than a phone — where the Sessões header and
                    the Distribuição title already painted outside their cards, while
                    the PR reference list took the wide 60%. Stacking also means
                    plans/22's Desenvolvimento card is just another card in here: no
                    reserved slot, no re-layout. It still renders nothing until it has
                    real data (plans/21 §5). */}
                  <div className={styles.stack}>
                    {pd.goals.length > 0 && (
                      <GoalList goals={pd.goals} totalMarcosHit={pd.totalMarcosHit} />
                    )}
                    <EventList events={pd.events} />
                    <SessionList rows={pd.recSess} />
                    {pd.wodRows.length > 0 && (
                      <BarList
                        title="WODs"
                        rows={pd.wodRows}
                        sub={`${MONTH_PT_SHORT[pd.nowM - 1]} ${pd.nowY} · executados/planejados`}
                      />
                    )}
                    {pd.distRows.length > 0 && (
                      <BarList
                        title="Distribuição"
                        rows={pd.distRows}
                        sub="Últimos 90 dias · executados/planejados"
                      />
                    )}
                    <PrSection
                      prs={pd.prs}
                      registry={registry}
                      openBlocks={openBlocks}
                      setOpenBlock={toggleBlock}
                      query={prQuery}
                      onQuery={setPrQuery}
                      onOpen={openLogSheet}
                      onClear={askClear}
                    />
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      <Nav active="me" gymName={gymName} lockedId={selAthlete?.id} box={box} />
    </>
  )
}
