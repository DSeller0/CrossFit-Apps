import { useState, useEffect, useRef } from 'react'
import Header from '../Header.jsx'
import Nav from '../Nav.jsx'
import { sb } from '../supabaseClient.js'
import { registerSW } from '../registerSW.js'
import styles from './Results.module.css'
import { MONTH_PT, DAY_PT, toISO, todayISO, getWeek, dateToWeekOffset } from '../lib/week.js'
import {
  uid,
  blkLabel,
  isWodBlock,
  rankResults,
  toSecs,
  fmtSecs,
  isTimeBlock,
  perfStr,
  goalOutcome,
} from '../lib/wod.js'
import { onKey } from '../schedule/scheduleHelpers.js'
import { getBoxScope, inBoxScope } from '../lib/boxScope.js'
import { syncTheme } from '../lib/theme.js'
import { normalizeSessionIds } from '../lib/sessions.js'
import { mergeBlockEntry } from '../lib/resultEntry.js'
import RankList from '../shared/RankList.jsx'
import ScaleFilter from '../shared/ScaleFilter.jsx'
import ConfirmReview, { ReadBox, ReadRow } from '../shared/ConfirmReview.jsx'
import SessionCard from './SessionCard.jsx'
import WodSummary from './WodSummary.jsx'
import KpiGrid from './KpiGrid.jsx'
import LoggedResult from './LoggedResult.jsx'
import LogForm from './LogForm.jsx'
import {
  DEF_INP,
  inputKey,
  sessName,
  blockEntries,
  calcKpis,
  cardSummary,
} from './resultsHelpers.js'

const MEDALS = ['🥇', '🥈', '🥉']

function wodBlocks(sess) {
  return (sess.blocks || []).filter(isWodBlock)
}

function sessionsForDay(sessions, dk, lockedAthName, box) {
  const all = ((sessions || {})[dk] || []).filter(
    s => s.public !== false && inBoxScope(s, box) && s.blocks && s.blocks.length,
  )
  if (!lockedAthName) return all
  return all.filter(s => {
    const t = Array.isArray(s.mainTraining)
      ? s.mainTraining
      : s.mainTraining
        ? [s.mainTraining]
        : []
    return t.length === 0 || t.includes(lockedAthName)
  })
}

// Auto-select (#51): the desktop opened with two empty panes until you picked a
// WOD by hand. Prefer today's, else the most recent past day in the visible week,
// else the first — so the page always lands on the WOD you most likely want.
function pickDefaultWod(week, sessions, lockedAthName, today, box) {
  const firstWodOn = dk => {
    for (const sess of sessionsForDay(sessions, dk, lockedAthName, box)) {
      const wods = wodBlocks(sess)
      if (wods.length) return { sid: sess.id, bid: wods[0].id, dk }
    }
    return null
  }
  const days = week.map(toISO)
  if (days.includes(today)) {
    const w = firstWodOn(today)
    if (w) return w
  }
  for (const dk of days.filter(d => d < today).reverse()) {
    const w = firstWodOn(dk)
    if (w) return w
  }
  for (const dk of days) {
    const w = firstWodOn(dk)
    if (w) return w
  }
  return null
}

export default function Results() {
  const [status, setStatus] = useState('loading')
  const [sessions, setSessions] = useState({})
  const [athletes, setAthletes] = useState([])
  const [results, setResults] = useState([])
  const [gymName, setGymName] = useState('Cone')
  const [weekOffset, setWeekOffset] = useState(0)
  const [lockedId] = useState(() => new URLSearchParams(location.search).get('id') || '')
  const [box] = useState(() => getBoxScope())
  const [selAth, setSelAth] = useState(
    () =>
      new URLSearchParams(location.search).get('id') ||
      localStorage.getItem('cone_athlete_filter') ||
      '',
  )
  const [expanded, setExpanded] = useState(new Set())
  const [logInputs, setLogInputs] = useState({})
  const [editing, setEditing] = useState(new Set()) // keys being re-logged
  const [lbTarget, setLbTarget] = useState(null) // mobile flyout
  const [selWod, setSelWod] = useState(null) // desktop: {sid,bid,dk}
  const [athSearch, setAthSearch] = useState('')
  const [lbScale, setLbScale] = useState('Todos')
  const [confirmPending, setConfirmPending] = useState(null)
  const [successData, setSuccessData] = useState(null)
  const [submittingKey, setSubmittingKey] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const didUrlScroll = useRef(false)
  const didAutoSelect = useRef(false)

  // Mount-only: `load` is this page's whole Supabase fetch and is redefined every render,
  // so listing it would re-fetch the page on every render. Same call as Me.jsx's.
  useEffect(() => {
    registerSW()
    load()
    const onShow = e => {
      if (e.persisted) load()
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(attempt = 0) {
    if (attempt === 0) setStatus('loading')
    try {
      const [sR, aR, rRaw, stR] = await Promise.all([
        sb.from('sessions').select('value').eq('id', 1).maybeSingle(),
        sb.from('athletes').select('value').eq('id', 1).maybeSingle(),
        sb.from('results_v2').select('*'),
        sb.from('settings').select('value').eq('id', 1).maybeSingle(),
      ])
      const sD = normalizeSessionIds(sR.data?.value || {}),
        aD = aR.data?.value || []
      const rD = (rRaw.data || []).map(r => ({
        id: r.id,
        date: r.date,
        athleteId: r.athlete_id,
        sessionId: r.session_id,
        presence: r.presence,
        energyLevel: r.energy_level,
        blocks: r.blocks,
        coachNote: r.coach_note,
        flagForReview: r.flag_for_review,
        loggedByAthlete: r.logged_by_athlete,
      }))
      const stD = stR.data?.value || {}
      // Per-box theme (#143) — the box default applies unless the visitor picked their own.
      syncTheme(stD, box)
      setSessions(sD)
      setAthletes(aD)
      setResults(rD)
      setGymName(stD.gymName || 'Cone')
      if (lockedId) {
        setSelAth(lockedId)
        try {
          localStorage.setItem('cone_athlete_filter', lockedId)
        } catch {
          /* ignore */
        }
      }
      setStatus('ok')

      // ?session= deep-link. It used to set only the mobile `expanded` set, so a
      // desktop deep-link landed on two empty panes (#51).
      const urlSid = new URLSearchParams(location.search).get('session')
      if (urlSid) {
        for (const [dk, list] of Object.entries(sD)) {
          const sess = (list || []).find(s => s.id === urlSid)
          if (!sess) continue
          setWeekOffset(dateToWeekOffset(dk))
          setExpanded(new Set([urlSid]))
          const wods = wodBlocks(sess)
          if (wods.length) {
            setSelWod({ sid: sess.id, bid: wods[0].id, dk })
            didAutoSelect.current = true
          }
          break
        }
      }
    } catch (e) {
      if (attempt < 2) {
        setTimeout(() => load(attempt + 1), 2000 * (attempt + 1))
        return
      }
      setErrMsg(e.message)
      setStatus('error')
    }
  }

  const week = getWeek(weekOffset)
  const today = todayISO()
  const lockedAthName = lockedId
    ? athletes.find(a => String(a.id) === String(lockedId))?.name || ''
    : ''

  // Auto-select on load, and again whenever the week changes or the selection
  // falls outside the visible week.
  // Reacting to the fetch landing (status -> 'ok') and to week navigation, not to a
  // render; the didAutoSelect/in-week guard above stops it re-picking under the user.
  // Deriving the pick during render instead would mean calling pickDefaultWod with
  // `today` there, which is impure — one warning traded for another.
  useEffect(() => {
    if (status !== 'ok') return
    if (didAutoSelect.current && selWod && week.map(toISO).includes(selWod.dk)) return
    const pick = pickDefaultWod(week, sessions, lockedAthName, today, box)
    setSelWod(pick)
    didAutoSelect.current = true
    // Mobile: open the same session. Unlike leaderboard, do NOT require results —
    // results.html is where you go to LOG, so an empty-but-loggable WOD is right.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pick) setExpanded(prev => (prev.size ? prev : new Set([pick.sid])))
  }, [status, weekOffset, sessions]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (didUrlScroll.current || status !== 'ok') return
    const urlSid = new URLSearchParams(location.search).get('session')
    if (urlSid && expanded.has(urlSid)) {
      didUrlScroll.current = true
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-card-id="${urlSid}"]`)
        if (!el) return
        // `block: 'start'` (not 'nearest') so the card actually lands at the top of
        // the viewport instead of merely "close enough" — but the sticky Header
        // (Header.module.css, `position:sticky; top:0`) would then cover it, so the
        // scroll target needs its own scroll-margin-top matching the header's live
        // rendered height (measured, not hardcoded — it differs at the ≥768px
        // breakpoint where brand/sub font sizes step up).
        const header = document.querySelector('header')
        if (header) el.style.scrollMarginTop = `${header.getBoundingClientRect().height + 8}px`
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [expanded, status])

  function getInp(sid, bid) {
    return logInputs[inputKey(sid, bid)] || DEF_INP()
  }
  function setInp(sid, bid, upd) {
    const k = inputKey(sid, bid)
    setLogInputs(prev => ({ ...prev, [k]: { ...(prev[k] || DEF_INP()), ...upd } }))
  }
  function changeWeek(dir) {
    setWeekOffset(w => w + dir)
    setExpanded(new Set())
    setLbTarget(null)
    didAutoSelect.current = false
  }
  function changeAth(val) {
    setSelAth(val)
    try {
      localStorage.setItem('cone_athlete_filter', val)
    } catch {
      /* ignore */
    }
    setLbTarget(null)
    setEditing(new Set())
  }
  function toggleSess(sid) {
    setExpanded(prev => {
      const n = new Set(prev)
      n.has(sid) ? n.delete(sid) : n.add(sid)
      return n
    })
  }

  function getAthBlock(sid, bid) {
    if (!selAth) return null
    const r = results.find(r => r.sessionId === sid && r.athleteId === selAth)
    if (!r || r.presence !== 'Presente') return null
    return (r.blocks || []).find(b => b.blockId === bid) || null
  }

  // ── Re-log (#51, decision 2) ──
  // The submit path already merged correctly; only the presentational gate made a
  // logged result final. Editing prefills from the existing row, runs the same
  // confirm step, and keeps the row id — so coach_note / flag_for_review survive.
  function startEdit(sid, bid) {
    const br = getAthBlock(sid, bid)
    if (!br) return
    // Carry the whole persisted entry into the form, not a 5-key cherry-pick — a field
    // this version doesn't render (yet) still round-trips through edit/re-submit.
    setInp(sid, bid, br)
    setEditing(prev => new Set(prev).add(inputKey(sid, bid)))
  }
  function cancelEdit(sid, bid) {
    const k = inputKey(sid, bid)
    setEditing(prev => {
      const n = new Set(prev)
      n.delete(k)
      return n
    })
    setLogInputs(prev => {
      const n = { ...prev }
      delete n[k]
      return n
    })
  }
  function isEditing(sid, bid) {
    return editing.has(inputKey(sid, bid))
  }

  function showConfirm(sid, bid, dk) {
    if (!selAth) {
      alert('Selecione um atleta no filtro para registrar resultado.')
      return
    }
    const inp = getInp(sid, bid)
    if (!inp.scale || !inp.rpe) {
      alert('Selecione a escala e o RPE antes de registrar.')
      return
    }
    setConfirmPending({ sid, bid, dk })
  }
  function proceedSubmit() {
    if (!confirmPending) return
    const { sid, bid, dk } = confirmPending
    setConfirmPending(null)
    setTimeout(() => doSubmit(sid, bid, dk), 200)
  }

  async function doSubmit(sid, bid, dk) {
    const k = inputKey(sid, bid)
    if (submittingKey) return
    setSubmittingKey(k)
    const inp = getInp(sid, bid)
    const sess = (sessions[dk] || []).find(s => s.id === sid)
    const bl = (sess?.blocks || []).find(b => b.id === bid)
    const lbl = bl ? blkLabel(bl) : bid,
      btype = bl?.type || ''
    const blockPatch = {
      blockId: bid,
      blockType: btype,
      blockLabel: lbl,
      rpe: inp.rpe,
      scale: inp.scale,
      perfTime: inp.perfTime || '',
      perfRounds: inp.perfRounds || '',
      perfReps: inp.perfReps || '',
      finished: inp.finished ?? null,
      checkpoint: inp.checkpoint ?? null,
      exerciseRows: inp.exerciseRows ?? null,
    }
    const existing = Array.isArray(results) ? results : []
    const prev = existing.find(r => r.sessionId === sid && r.athleteId === selAth)
    // Merge, never replace: the row's other blocks — and the coach's note/flag —
    // must survive a re-log. mergeBlockEntry keeps any key this version doesn't
    // know about (#118) — the row-level merge above only protects sibling blocks.
    const prevEntry = prev?.blocks?.find(b => b.blockId === bid)
    const blockEntry = mergeBlockEntry(prevEntry, blockPatch)
    const newResult = prev
      ? { ...prev, blocks: [...(prev.blocks || []).filter(b => b.blockId !== bid), blockEntry] }
      : {
          id: uid(),
          date: dk,
          athleteId: selAth,
          sessionId: sid,
          presence: 'Presente',
          energyLevel: 3,
          blocks: [blockEntry],
          coachNote: '',
          flagForReview: false,
          loggedByAthlete: true,
        }
    const next = [
      ...existing.filter(r => !(r.sessionId === sid && r.athleteId === selAth)),
      newResult,
    ]
    const { error: e } = await sb.rpc('log_result', {
      p_id: String(newResult.id),
      p_date: newResult.date,
      p_athlete_id: newResult.athleteId,
      p_session_id: newResult.sessionId ? String(newResult.sessionId) : null,
      p_presence: newResult.presence,
      p_energy_level: newResult.energyLevel ?? null,
      p_blocks: newResult.blocks,
    })
    setSubmittingKey(null)
    if (e) {
      alert('Erro ao salvar. Verifique sua conexão e tente novamente.')
      return
    }
    setResults(next)
    setLogInputs(p => {
      const n = { ...p }
      delete n[k]
      return n
    })
    setEditing(p => {
      const n = new Set(p)
      n.delete(k)
      return n
    })
    // Canonical perfStr since #115 — this was hand-rolled here and in the confirm modal,
    // a third and fourth copy of the "(DNF)" wording the #51 comments exist to prevent.
    // perfStr renders "nothing logged" as an em dash; these two surfaces omit the row instead.
    const perfRaw = perfStr(inp, btype)
    const perf = perfRaw === '—' ? '' : perfRaw
    setSuccessData({
      blockLabel: lbl,
      scale: inp.scale,
      rpe: inp.rpe,
      perf,
      hasPerfTime: !!inp.perfTime,
      btype,
      goalOutcome: goalOutcome(inp, bl),
      exerciseRows: inp.exerciseRows,
    })
  }

  // ── Computed ──
  const wkStart = week[0],
    wkEnd = week[6]
  const weekLabel = `${wkStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} – ${wkEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · ${MONTH_PT[wkStart.getMonth()]} ${wkStart.getFullYear()}`
  const sortedAthletes = [...athletes].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const filteredAthletes = athSearch
    ? sortedAthletes.filter(a => a.name.toLowerCase().includes(athSearch.toLowerCase()))
    : sortedAthletes

  // Desktop: selected WOD
  const selSess = selWod ? (sessions[selWod.dk] || []).find(s => s.id === selWod.sid) : null
  const selBlock = selSess ? (selSess.blocks || []).find(b => b.id === selWod.bid) : null
  const selAthBlock = selWod && selBlock ? getAthBlock(selWod.sid, selWod.bid) : null
  const selEntries =
    selWod && selBlock ? blockEntries(results, athletes, selWod.sid, selWod.bid) : []
  const extKpis = selBlock ? calcKpis(selEntries, selBlock.type, 'extended') : null
  const selAthName = athletes.find(a => String(a.id) === String(selAth))?.name || ''

  // Rank / percentile for the selected athlete (desktop mid pane)
  const ranked = selBlock ? rankResults(selEntries, selBlock.type) : []
  const selAthIdx = selAth ? ranked.findIndex(e => String(e.athleteId) === String(selAth)) : -1
  const selAthRank = selAthIdx >= 0 ? selAthIdx + 1 : null

  // Mobile LB flyout
  let lbTitle = '',
    lbEntries = [],
    lbType = '',
    lbGoal = null
  if (lbTarget) {
    const { sid, bid, dk } = lbTarget
    const sess = (sessions[dk] || []).find(s => s.id === sid)
    const bl = (sess?.blocks || []).find(b => b.id === bid)
    lbTitle = bl ? blkLabel(bl) : 'WOD'
    lbType = bl?.type || ''
    lbGoal = bl?.goal || null
    lbEntries = blockEntries(results, athletes, sid, bid)
  }

  // Confirm dialog (#133 — shared ConfirmReview, replacing the hand-rolled frame)
  let confirmBody = null,
    confirmTitle
  if (confirmPending) {
    const { sid, bid, dk } = confirmPending
    const inp = getInp(sid, bid)
    const sess = (sessions[dk] || []).find(s => s.id === sid)
    const bl = (sess?.blocks || []).find(b => b.id === bid)
    const lbl = bl ? blkLabel(bl) : bid,
      btype = bl?.type || ''
    // Canonical perfStr since #115 — this was hand-rolled here and in the confirm modal,
    // a third and fourth copy of the "(DNF)" wording the #51 comments exist to prevent.
    // perfStr renders "nothing logged" as an em dash; these two surfaces omit the row instead.
    const perfRaw = perfStr(inp, btype)
    const perf = perfRaw === '—' ? '' : perfRaw
    const plbl = isTimeBlock(btype) ? (inp.perfTime ? 'Tempo' : 'Resultado') : 'Resultado'
    // ⚠️ Editing an existing log is a real distinction (Results.jsx used to be the only
    // one of the 3 forks to carry it) — kept via a title override rather than lost to
    // ConfirmReview's canonical "Revisar registro" default (#133).
    confirmTitle = isEditing(sid, bid) ? 'Confirmar alteração' : undefined
    confirmBody = (
      <>
        <ReadBox title={lbl}>
          <ReadRow label="Escala" value={inp.scale} />
          <ReadRow label="RPE" value={inp.rpe} />
          {perf && <ReadRow label={plbl} value={perf} mono={isTimeBlock(btype)} />}
        </ReadBox>
        {/* #132 — the #116 adaptation note, invisible in every confirm/success step until now. */}
        {inp.exerciseRows?.length > 0 && (
          <ReadBox title="O que foi adaptado">
            {inp.exerciseRows.map(r => (
              <ReadRow key={r.exId} label={r.name} value={r.note} />
            ))}
          </ReadBox>
        )}
      </>
    )
  }

  // One WOD's body — shared by the mobile card and the desktop pane.
  function wodBody(sess, bl, dk, variant) {
    const entries = blockEntries(results, athletes, sess.id, bl.id)
    const br = getAthBlock(sess.id, bl.id)
    const k = inputKey(sess.id, bl.id)
    const edit = isEditing(sess.id, bl.id)
    const kpis = calcKpis(entries, bl.type, variant === 'extended' ? 'extended' : 'compact')
    return (
      <>
        <WodSummary bl={bl} variant={variant} showTitle={variant !== 'extended'} />
        {!selAth && (
          <KpiGrid
            kpis={kpis}
            btype={bl.type}
            variant={variant === 'extended' ? 'extended' : 'compact'}
          />
        )}
        {selAth && br && !edit && (
          <LoggedResult br={br} btype={bl.type} onEdit={() => startEdit(sess.id, bl.id)} />
        )}
        {selAth && (!br || edit) && (
          <LogForm
            bl={bl}
            inp={getInp(sess.id, bl.id)}
            isSubmitting={submittingKey === k}
            mode={edit ? 'edit' : 'create'}
            onRpe={n => setInp(sess.id, bl.id, { rpe: n })}
            onScale={sc => setInp(sess.id, bl.id, { scale: sc })}
            onField={(f, v) => setInp(sess.id, bl.id, { [f]: v })}
            onSubmit={() => showConfirm(sess.id, bl.id, dk)}
            onCancel={edit ? () => cancelEdit(sess.id, bl.id) : null}
          />
        )}
      </>
    )
  }

  return (
    <>
      {/* Mobile LB flyout */}
      <div
        className={`${styles.lbOverlay}${lbTarget ? ' ' + styles.lbOverlayOpen : ''}`}
        onClick={() => setLbTarget(null)}
      />
      <div className={`${styles.lbPane}${lbTarget ? ' ' + styles.lbPaneOpen : ''}`}>
        <div className={styles.lbPaneHdr}>
          <div className={styles.lbPaneTitle}>
            <i className="ti ti-trophy" aria-hidden="true" /> {lbTitle}
          </div>
          <button
            className={styles.lbPaneClose}
            onClick={() => setLbTarget(null)}
            aria-label="Fechar"
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        <div className={styles.lbList}>
          <RankList entries={lbEntries} blType={lbType} goal={lbGoal} highlightAthleteId={selAth} />
        </div>
      </div>

      {/* Confirm dialog (#133) */}
      <ConfirmReview
        open={!!confirmPending}
        onEdit={() => setConfirmPending(null)}
        onConfirm={proceedSubmit}
        onClose={() => setConfirmPending(null)}
        title={confirmTitle}
      >
        {confirmBody}
      </ConfirmReview>

      {/* Success modal */}
      <div
        className={`${styles.modalOverlay}${successData ? ' ' + styles.modalOverlayOpen : ''}`}
        style={{ zIndex: 500 }}
        onClick={() => setSuccessData(null)}
      />
      <div
        className={`${styles.successModal}${successData ? ' ' + styles.successModalOpen : ''}`}
        role="dialog"
        aria-modal="true"
      >
        {successData &&
          (() => {
            const {
              blockLabel: lbl,
              scale,
              rpe,
              perf,
              hasPerfTime,
              btype,
              goalOutcome: goalOut,
              exerciseRows,
            } = successData
            // Same expression as the confirm modal above (#136a) — a capped For Time
            // athlete has no perfTime, so this must read "Resultado" there too, not "Tempo"
            // over a row containing no time.
            const plbl = isTimeBlock(btype) ? (hasPerfTime ? 'Tempo' : 'Resultado') : 'Resultado'
            return (
              <>
                <i className={`ti ti-circle-check ${styles.successIcon}`} aria-hidden="true" />
                <div className={styles.successTitle}>Resultado registrado!</div>
                <div className={styles.successDetail}>
                  <ReadBox title={lbl}>
                    <ReadRow label="Escala" value={scale} />
                    <ReadRow label="RPE" value={rpe} />
                    {perf && (
                      <ReadRow
                        label={plbl}
                        mono={isTimeBlock(btype)}
                        value={
                          <>
                            {perf}
                            {/* #117 — same beat/met badge as RankList/TV, on the one surface
                                that isn't a ranked list: the athlete's own confirmation. */}
                            {goalOut === 'beat' && (
                              <i
                                className={`ti ti-target-arrow ${styles.successGoalBeat}`}
                                title="Bateu a meta"
                                aria-hidden="true"
                              />
                            )}
                            {goalOut === 'met' && (
                              <i
                                className={`ti ti-target ${styles.successGoalMet}`}
                                title="Dentro da meta"
                                aria-hidden="true"
                              />
                            )}
                          </>
                        }
                      />
                    )}
                  </ReadBox>
                  {/* #132 */}
                  {exerciseRows?.length > 0 && (
                    <ReadBox title="O que foi adaptado">
                      {exerciseRows.map(r => (
                        <ReadRow key={r.exId} label={r.name} value={r.note} />
                      ))}
                    </ReadBox>
                  )}
                </div>
                <button className={styles.btnDismiss} onClick={() => setSuccessData(null)}>
                  Fechar
                </button>
              </>
            )
          })()}
      </div>

      <div className={styles.pageRoot}>
        <Header brand={gymName.toUpperCase()} sub="RESULTADOS" />
        <main className={styles.main}>
          <h1 className={styles.srOnly}>Resultados</h1>

          {status !== 'loading' && (
            <>
              {!lockedId && (
                <div className={`${styles.selBar} ${styles.mobileOnly}`}>
                  <label className={styles.srOnly} htmlFor="ath-sel">
                    Filtrar por atleta
                  </label>
                  <select
                    id="ath-sel"
                    className={styles.athleteSel}
                    value={selAth}
                    onChange={e => changeAth(e.target.value)}
                  >
                    <option value="">— Todos —</option>
                    {athletes.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.weekNav}>
                <button
                  className={styles.navBtn}
                  onClick={() => changeWeek(-1)}
                  aria-label="Semana anterior"
                >
                  <i className="ti ti-chevron-left" aria-hidden="true" />
                </button>
                <span className={styles.weekLabel}>{weekLabel}</span>
                <button
                  className={styles.navBtn}
                  onClick={() => changeWeek(1)}
                  aria-label="Próxima semana"
                >
                  <i className="ti ti-chevron-right" aria-hidden="true" />
                </button>
              </div>
            </>
          )}

          {status === 'loading' && (
            <div className={styles.loading} aria-live="polite">
              <i
                className={`ti ti-loader ${styles.spin}`}
                style={{ fontSize: '32px' }}
                aria-hidden="true"
              />
              Carregando...
            </div>
          )}
          {status === 'error' && (
            <div className={styles.errorMsg} aria-live="polite">
              <i className="ti ti-alert-circle" style={{ fontSize: '32px' }} aria-hidden="true" />
              <br />
              <br />
              Não foi possível carregar os dados.
              <br />
              <small>{errMsg}</small>
              <br />
              <button className={styles.retryBtn} onClick={() => load()}>
                ↺ Tentar novamente
              </button>
            </div>
          )}

          {status === 'ok' && (
            <>
              {/* ── DESKTOP ── */}
              <div className={styles.desktopView}>
                <div className={styles.calStrip}>
                  {week.map(date => {
                    const dk = toISO(date),
                      isPast = dk < today,
                      isToday = dk === today
                    const daySess = sessionsForDay(sessions, dk, lockedAthName, box)
                    const hasWods = daySess.some(s => wodBlocks(s).length > 0)
                    return (
                      <div
                        key={dk}
                        className={`${styles.calDay}${isToday ? ' ' + styles.calDayToday : ''}`}
                      >
                        <div className={styles.calDayHdr}>
                          <span className={styles.calDow}>{DAY_PT[date.getDay()]}</span>
                          <span
                            className={`${styles.calNum}${isPast ? ' ' + styles.calNumPast : ''}`}
                          >
                            {date.getDate()}
                          </span>
                        </div>
                        {hasWods ? (
                          daySess.flatMap(sess =>
                            wodBlocks(sess).map(bl => {
                              const isSel = selWod?.sid === sess.id && selWod?.bid === bl.id
                              const cnt = blockEntries(results, athletes, sess.id, bl.id).length
                              const pick = () => {
                                setSelWod({ sid: sess.id, bid: bl.id, dk })
                                setLbScale('Todos')
                              }
                              return (
                                <div
                                  key={`${sess.id}:${bl.id}`}
                                  className={`${styles.calCard}${isSel ? ' ' + styles.calCardSel : ''}`}
                                  role="button"
                                  tabIndex={0}
                                  aria-pressed={isSel}
                                  onClick={pick}
                                  onKeyDown={onKey(pick)}
                                >
                                  <div className={styles.calCardRow}>
                                    <span
                                      className={`${styles.calDot}${cnt > 0 ? ' ' + styles.calDotFill : ''}`}
                                    />
                                    <span className={styles.calCardName}>{sessName(sess, dk)}</span>
                                    <span className={styles.calCardType}>{bl.type}</span>
                                  </div>
                                  <div className={styles.calCardCount}>
                                    {cnt} resultado{cnt !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              )
                            }),
                          )
                        ) : (
                          <div className={styles.calRest}>
                            <i className="ti ti-moon" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className={styles.threePane}>
                  {/* LEFT: athletes */}
                  <div className={styles.athPane}>
                    <div className={styles.paneHdrLbl}>Atleta</div>
                    {lockedId ? (
                      <div className={styles.athLocked}>{lockedAthName || '—'}</div>
                    ) : (
                      <>
                        <div className={styles.athSearchWrap}>
                          <i className={`ti ti-search ${styles.athSearchIc}`} aria-hidden="true" />
                          <input
                            className={styles.athSearchInput}
                            type="text"
                            placeholder="Buscar..."
                            aria-label="Buscar atleta"
                            value={athSearch}
                            onChange={e => setAthSearch(e.target.value)}
                          />
                        </div>
                        <div className={styles.athList}>
                          <div
                            className={`${styles.athRow} ${styles.athRowTodos}${!selAth ? ' ' + styles.athRowSel : ''}`}
                            role="button"
                            tabIndex={0}
                            aria-pressed={!selAth}
                            onClick={() => changeAth('')}
                            onKeyDown={onKey(() => changeAth(''))}
                          >
                            ◈ Todos
                          </div>
                          {filteredAthletes.map(a => {
                            const isSel = selAth === String(a.id)
                            return (
                              <div
                                key={a.id}
                                className={`${styles.athRow}${isSel ? ' ' + styles.athRowSel : ''}`}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isSel}
                                onClick={() => changeAth(String(a.id))}
                                onKeyDown={onKey(() => changeAth(String(a.id)))}
                              >
                                {a.name}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* MIDDLE: WOD detail */}
                  <div className={styles.midPane}>
                    {selWod && selBlock && selSess ? (
                      <>
                        {/* blkLabel already merges label · type when they differ — appending
                            selBlock.type as well printed "AMRAP · AMRAP". */}
                        <div className={styles.paneHdrLbl}>{blkLabel(selBlock)}</div>
                        <div className={styles.midScroll}>
                          {selAth && (
                            <div className={styles.exListLbl}>
                              {selAthBlock && !isEditing(selWod.sid, selWod.bid)
                                ? 'Resultado'
                                : 'Registrar'}{' '}
                              · {selAthName}
                            </div>
                          )}
                          {wodBody(selSess, selBlock, selWod.dk, 'extended')}

                          {/* Where the athlete stands, once they have a result. */}
                          {selAth &&
                            selAthBlock &&
                            !isEditing(selWod.sid, selWod.bid) &&
                            selAthRank && (
                              <div className={styles.relKpiRow}>
                                <div className={styles.relKpi}>
                                  <div className={styles.relKpiVal}>
                                    {MEDALS[selAthRank - 1] || `${selAthRank}º`} /{' '}
                                    {selEntries.length}
                                  </div>
                                  <div className={styles.relKpiLbl}>Posição</div>
                                </div>
                                {extKpis?.avgSecs > 0 &&
                                  selAthBlock.perfTime &&
                                  (() => {
                                    const diff = extKpis.avgSecs - toSecs(selAthBlock.perfTime)
                                    return (
                                      <div className={styles.relKpi}>
                                        <div
                                          className={styles.relKpiVal}
                                          style={{ color: diff > 0 ? 'var(--teal)' : 'var(--err)' }}
                                        >
                                          {diff > 0 ? '−' : '+'}
                                          {fmtSecs(Math.abs(Math.round(diff)))}
                                        </div>
                                        <div className={styles.relKpiLbl}>Vs. Média</div>
                                      </div>
                                    )
                                  })()}
                                {selEntries.length > 0 && (
                                  <div className={styles.relKpi}>
                                    <div className={styles.relKpiVal}>
                                      Top {Math.round((selAthRank / selEntries.length) * 100)}%
                                    </div>
                                    <div className={styles.relKpiLbl}>Percentil</div>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      </>
                    ) : (
                      <div className={styles.paneEmpty}>
                        <i
                          className="ti ti-layout-grid"
                          style={{ fontSize: '26px', opacity: 0.3 }}
                          aria-hidden="true"
                        />
                        Nenhum WOD nesta semana
                      </div>
                    )}
                  </div>

                  {/* RIGHT: leaderboard */}
                  <div className={styles.deskLbPane}>
                    <div className={styles.paneHdrLbl}>Leaderboard</div>
                    {selWod && selBlock ? (
                      <>
                        <div className={styles.lbScaleBar}>
                          <ScaleFilter value={lbScale} onChange={setLbScale} />
                        </div>
                        <div className={styles.deskLbList}>
                          <RankList
                            entries={selEntries}
                            blType={selBlock.type}
                            goal={selBlock.goal}
                            scaleFilter={lbScale}
                            highlightAthleteId={selAth}
                          />
                        </div>
                      </>
                    ) : (
                      <div className={styles.paneEmpty}>
                        <i
                          className="ti ti-trophy"
                          style={{ fontSize: '26px', opacity: 0.3 }}
                          aria-hidden="true"
                        />
                        Nenhum WOD nesta semana
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── MOBILE ── */}
              <div className={styles.mobileView}>
                {week.map(date => {
                  const dk = toISO(date),
                    isPast = dk < today,
                    isToday = dk === today
                  const daySess = sessionsForDay(sessions, dk, lockedAthName, box)
                  if (!daySess.length) return null
                  return (
                    <div
                      key={dk}
                      className={`${styles.dayCard}${isToday ? ' ' + styles.dayCardToday : ''}`}
                    >
                      <div className={styles.dayHdr}>
                        <span className={styles.dayDow}>{DAY_PT[date.getDay()]}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span
                            className={`${styles.dayNum}${isPast ? ' ' + styles.dayNumPast : ''}`}
                          >
                            {date.getDate()}
                          </span>
                          {isToday && <div className={styles.dayTodayDot} />}
                        </div>
                      </div>
                      <div className={styles.dayBody}>
                        {daySess.map(sess => {
                          const wods = wodBlocks(sess)
                          const firstWod = wods[0]
                          const entries = firstWod
                            ? blockEntries(results, athletes, sess.id, firstWod.id)
                            : []
                          const summary = cardSummary(entries, firstWod?.type, selAth)
                          return (
                            <SessionCard
                              key={sess.id}
                              sess={sess}
                              dk={dk}
                              isExpanded={expanded.has(sess.id)}
                              onToggle={() => toggleSess(sess.id)}
                              summary={summary}
                              hasAthlete={!!selAth}
                            >
                              {wods.length ? (
                                wods.map(bl => (
                                  <div key={bl.id} className={styles.wodSection}>
                                    {wodBody(sess, bl, dk, 'compact')}
                                    <button
                                      className={styles.btnLb}
                                      onClick={() => setLbTarget({ sid: sess.id, bid: bl.id, dk })}
                                    >
                                      <i className="ti ti-trophy" aria-hidden="true" /> Leaderboard
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <div className={styles.resNoWod}>Nenhum WOD nesta sessão.</div>
                              )}
                            </SessionCard>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </main>
      </div>
      <Nav active="results" lockedId={lockedId} gymName={gymName} box={box} />
    </>
  )
}
