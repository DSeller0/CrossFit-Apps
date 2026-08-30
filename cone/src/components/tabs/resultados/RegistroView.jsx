import { useState, useEffect, useMemo } from 'react'
import { IconCalendarEvent, IconX } from '@tabler/icons-react'
import { saveResults, uid } from '../../../utils/storage'
import { isWodBlock } from '../../../public/lib/wod.js'
import { toISO, todayISO, MONTH_PT } from '../../../public/lib/week.js'
import { sessName } from '../../../public/lib/sessions.js'
import { mergeBlockEntry, clearAthleteKeys } from '../../../public/lib/resultEntry.js'
import ConfirmReview from '../../../public/shared/ConfirmReview.jsx'
import Button from '../../ui/Button.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import WeekRail from './WeekRail.jsx'
import ClassHeader from './ClassHeader.jsx'
import AthleteRoster from './AthleteRoster.jsx'
import LogForm from './LogForm.jsx'
import { useIsMobile } from '../../../hooks/useIsMobile'
import {
  getWeeksInMonth,
  weekLabel,
  calcSessionKPIs,
  sessionProgress,
} from './resultadosHelpers.js'
import s from './Resultados.module.css'

// The Resultados surface (#57/plans/80 · C3, mockup 61).
//
// There is no sub-tab bar any more: Histórico's "Por atleta" half moved to the Atletas
// ficha and its "Por sessão" half moved into ClassHeader here, which left nothing behind
// it — and Leaderboard was a second copy of leaderboard.html (Phase 0). So the tab is one
// surface: a week rail and THE CLASS.
//
// The load-bearing change is that the ROSTER IS THE FORM CONTAINER — the athlete row opens
// in place instead of pushing a form into a distant third pane. That is what retires the
// 220px roster column, the 10–13px form column, the dashed "Registrar atleta" disclosure
// (which hid the entire class in the normal case), the two divergent row languages, and
// mobile's 3-step drilldown with two differently-worded back links.
export function RegistroView({
  athletes,
  sessions,
  results,
  setResults,
  preload,
  onPreloadConsumed,
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewWeekIdx, setViewWeekIdx] = useState(0)
  const [selKey, setSelKey] = useState(null)
  const [selAthlete, setSelAthlete] = useState(null)
  const [mobilePanel, setMobilePanel] = useState(1)
  const [kpisOpen, setKpisOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const [presence, setPresence] = useState('Presente')
  const [energyLevel, setEnergyLevel] = useState(3)
  const [blockLogs, setBlockLogs] = useState([])
  const [coachNote, setCoachNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [flag, setFlag] = useState(false)

  const isMobile = useIsMobile(800)
  const todayKey = todayISO()

  const weeks = useMemo(() => getWeeksInMonth(viewYear, viewMonth), [viewYear, viewMonth])

  // Resets the visible week when the month changes — same call as AgendaView's, and kept
  // as an effect for the same reason: it needs `new Date()`, which is impure in a render
  // body. `weeks` is a useMemo on [viewYear, viewMonth], so depending on it rather than
  // on weeks.length fires on exactly the same occasions and is honest.
  useEffect(() => {
    const d = new Date()
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const idx = weeks.findIndex(w => d >= w.start && d <= w.end)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewWeekIdx(idx >= 0 ? idx : 0)
    } else {
      setViewWeekIdx(0)
    }
  }, [viewYear, viewMonth, weeks])

  const selWeek = weeks[viewWeekIdx] ?? weeks[0]

  const weekDays = useMemo(() => {
    if (!selWeek) return []
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(
        selWeek.start.getFullYear(),
        selWeek.start.getMonth(),
        selWeek.start.getDate() + i,
      )
      const dk = toISO(d)
      return {
        date: d,
        dk,
        daySessions: (sessions[dk] || []).map(sess => ({
          key: `${dk}|${sess.id}`,
          name: sessName(sess, dk),
          session: sess,
        })),
      }
    })
  }, [selWeek, sessions])

  const { selDateKey, selSession } = useMemo(() => {
    if (!selKey) return { selDateKey: null, selSession: null }
    const [dk, sid] = selKey.split('|')
    const sArr = sessions[dk] || []
    return { selDateKey: dk, selSession: sArr.find(s => s.id === sid) || null }
  }, [selKey, sessions])

  const loggedAthMap = useMemo(() => {
    if (!selDateKey || !selSession) return {}
    const m = {}
    results
      .filter(
        r =>
          r.date === selDateKey &&
          (r.sessionId === selSession.id || (!r.sessionId && !selSession.id)),
      )
      .forEach(r => {
        m[r.athleteId] = r
      })
    return m
  }, [results, selDateKey, selSession])

  // Consumes a one-shot preload handed down from another tab, then calls
  // onPreloadConsumed. Reacting to a prop arriving, not to a render — and the deps array
  // is deliberately narrow: adding sessions/athletes/isMobile/onPreloadConsumed (all of
  // which change identity freely) would re-run the consumption and yank the coach back to
  // the preloaded athlete mid-edit. Same shape as Criador's preload effect.
  useEffect(() => {
    if (!preload) return
    if (preload.date) {
      const d = new Date(preload.date + 'T12:00:00')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
      const sArr = sessions[preload.date] || []
      if (sArr.length) setSelKey(preload.date + '|' + sArr[0].id)
    }
    if (preload.athleteId) {
      const ath = athletes.find(a => a.id === preload.athleteId)
      if (ath) {
        setSelAthlete(ath)
        if (isMobile) setMobilePanel(2)
      }
    }
    onPreloadConsumed?.()
  }, [preload]) // eslint-disable-line react-hooks/exhaustive-deps

  // Loads the log form for the selected athlete/session. Keyed on the three IDS, not the
  // objects, and deliberately NOT on `results`: re-running this on every results refresh
  // would overwrite whatever the coach has typed but not yet saved. That narrowness is the
  // point of the effect, so both rules are suppressed rather than satisfied.
  useEffect(() => {
    if (!selAthlete || !selDateKey || !selSession) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBlockLogs([])
      setPresence('Presente')
      setEnergyLevel(3)
      setCoachNote('')
      setFlag(false)
      setShowNote(false)
      return
    }
    const existing = results.find(
      r =>
        r.date === selDateKey &&
        r.athleteId === selAthlete.id &&
        (r.sessionId === selSession.id || (!r.sessionId && !selSession.id)),
    )
    const wodBlocks = (selSession.blocks || []).filter(isWodBlock)
    // Identity comes from the CURRENT session block (b) — a block renamed/retyped in
    // Criador since the last save must re-label here. The persisted entry (eb), when
    // present, is the fallback for everything else, so an unknown key survives (#118).
    const buildBlockLog = b => {
      const identity = { blockId: b.id, blockType: b.type, blockLabel: b.label || b.type }
      const eb = (existing?.blocks || []).find(eb => eb.blockId === b.id)
      return eb ? mergeBlockEntry(eb, identity) : clearAthleteKeys(identity)
    }
    setPresence(existing?.presence || 'Presente')
    setEnergyLevel(existing?.energyLevel || 3)
    setCoachNote(existing?.coachNote || '')
    setFlag(existing?.flagForReview || false)
    setBlockLogs(wodBlocks.map(buildBlockLog))
    setShowNote(false)
  }, [selAthlete?.id, selDateKey, selSession?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updBlock = (i, patch) =>
    setBlockLogs(prev => {
      const n = [...prev]
      n[i] = { ...n[i], ...patch }
      return n
    })

  // The one write path. Extracted out of saveLog so the one-click "Ausente" on an
  // unlogged row goes through exactly the same merge rules instead of a second
  // hand-rolled upsert — #118's merge is subtle enough that a second copy would drift.
  const persist = (athlete, data) => {
    // Reuse the existing row's id on every re-save. Minting a fresh uid() here
    // (the old behavior) meant every edit inserted a brand-new results_v2 row
    // instead of updating one — the 2nd save for the same athlete+session then
    // violated the table's unique(athlete_id, session_id) constraint, and since
    // saveResults() upserts the WHOLE local results array in one batch, that one
    // conflicting row failed the entire upsert silently (console.warn only) while
    // the UI still flashed "Salvo" (#61c).
    const existing = results.find(
      r =>
        r.date === selDateKey &&
        r.athleteId === athlete.id &&
        (r.sessionId === selSession.id || (!r.sessionId && !selSession.id)),
    )
    // Merge into the existing blocks array, never replace it (#118): a wholesale
    // `blocks: blockLogs` dropped any entry for a non-WOD block or a block since
    // deleted in Criador (neither is in `wodBlocks`/`blockLogs`), and `presence
    // !== 'Presente' ? [] :` wiped every logged block on a presence flip. Both the
    // untouched siblings AND the matched blocks (re-merged against the freshest
    // persisted entry, so an unknown key survives) are kept; presence alone records
    // the absence.
    const existingBlocks = existing?.blocks || []
    const mergedBlocks =
      data.presence === 'Presente'
        ? [
            ...existingBlocks.filter(b => !data.blockLogs.some(bl => bl.blockId === b.blockId)),
            ...data.blockLogs.map(bl =>
              mergeBlockEntry(
                existingBlocks.find(b => b.blockId === bl.blockId),
                bl,
              ),
            ),
          ]
        : existingBlocks
    const entry = {
      id: existing?.id || uid(),
      date: selDateKey,
      athleteId: athlete.id,
      sessionId: selSession.id,
      presence: data.presence,
      energyLevel: data.energyLevel,
      blocks: mergedBlocks,
      coachNote: data.coachNote,
      flagForReview: data.flag,
      loggedByAthlete: false,
    }
    const updated = [...results.filter(r => r !== existing), entry]
    setResults(updated)
    saveResults(updated)
    return updated
  }

  const saveLog = () => {
    if (!selAthlete || !selDateKey || !selSession) return
    persist(selAthlete, { presence, energyLevel, blockLogs, coachNote, flag })
  }

  // Save, then open the next athlete with no result — the logging loop the tab never had.
  // It is also what replaced the `saveFlash` toast: the row collapsing into its logged
  // state, with the next one already open, IS the feedback.
  const saveAndNext = () => {
    if (!selAthlete || !selDateKey || !selSession) return
    const updated = persist(selAthlete, { presence, energyLevel, blockLogs, coachNote, flag })
    const idx = athletes.findIndex(a => a.id === selAthlete.id)
    const isLogged = a =>
      updated.some(
        r =>
          r.date === selDateKey &&
          r.athleteId === a.id &&
          (r.sessionId === selSession.id || (!r.sessionId && !selSession.id)),
      )
    const next = athletes.slice(idx + 1).find(a => !isLogged(a)) || athletes.find(a => !isLogged(a))
    setSelAthlete(next || null)
  }

  const markAbsent = athlete => {
    if (!selDateKey || !selSession) return
    persist(athlete, {
      presence: 'Ausente',
      energyLevel: 3,
      blockLogs: [],
      coachNote: '',
      flag: false,
    })
  }

  const deleteResult = athleteId => {
    if (!selDateKey || !selSession) return
    const updated = results.filter(
      r =>
        !(
          r.date === selDateKey &&
          r.athleteId === athleteId &&
          (r.sessionId === selSession.id || (!r.sessionId && !selSession.id))
        ),
    )
    setResults(updated)
    saveResults(updated)
    setConfirmDel(null)
    if (selAthlete?.id === athleteId) setSelAthlete(null)
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1)
      setViewMonth(11)
    } else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1)
      setViewMonth(0)
    } else setViewMonth(m => m + 1)
  }
  const goToday = () => {
    const d = new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const sessionKpis = useMemo(
    () => (selDateKey && selSession ? calcSessionKPIs(selDateKey, results, selSession.id) : null),
    [selDateKey, selSession, results],
  )

  const progress = selSession
    ? sessionProgress(results, selDateKey, selSession, athletes.length)
    : { logged: 0, total: athletes.length, pct: 0 }

  const openAthlete = a => {
    setSelAthlete(a)
    setConfirmDel(null)
  }

  const hasNextUnlogged = useMemo(() => {
    if (!selAthlete) return false
    const idx = athletes.findIndex(a => a.id === selAthlete.id)
    return (
      athletes.slice(idx + 1).some(a => !loggedAthMap[a.id]) ||
      athletes.some(a => a.id !== selAthlete.id && !loggedAthMap[a.id])
    )
  }, [athletes, selAthlete, loggedAthMap])

  const logForm = (
    <LogForm
      presence={presence}
      energyLevel={energyLevel}
      blockLogs={blockLogs}
      coachNote={coachNote}
      showNote={showNote}
      flag={flag}
      session={selSession}
      hasResult={!!(selAthlete && loggedAthMap[selAthlete.id])}
      hasNext={hasNextUnlogged}
      onPresence={setPresence}
      onEnergy={setEnergyLevel}
      onBlockChange={updBlock}
      onNote={setCoachNote}
      onToggleNote={() => setShowNote(n => !n)}
      onToggleFlag={() => setFlag(f => !f)}
      onSave={saveLog}
      onSaveNext={saveAndNext}
      onDelete={() => setConfirmDel(selAthlete)}
    />
  )

  const rail = (
    <WeekRail
      monthLabel={`${MONTH_PT[viewMonth]} ${viewYear}`}
      weeks={weeks}
      weekLabels={weeks.map(w => weekLabel(w, viewYear, viewMonth))}
      selWeekIdx={viewWeekIdx}
      weekDays={weekDays}
      viewMonth={viewMonth}
      selKey={selKey}
      todayKey={todayKey}
      progressFor={(dk, sess) => sessionProgress(results, dk, sess, athletes.length)}
      onPrevMonth={prevMonth}
      onNextMonth={nextMonth}
      onToday={goToday}
      onSelectWeek={setViewWeekIdx}
      onSelectSession={k => {
        setSelKey(k)
        setSelAthlete(null)
        setKpisOpen(false)
        if (isMobile) setMobilePanel(2)
      }}
    />
  )

  const classPane = !selSession ? (
    <div className={s.classPane}>
      <EmptyState
        pane
        icon={<IconCalendarEvent />}
        title="Selecione uma sessão"
        text="Escolha uma turma na semana ao lado para registrar os resultados."
      />
    </div>
  ) : (
    <div className={s.classPane}>
      <ClassHeader
        sessionName={sessName(selSession, selDateKey)}
        dateLabel={new Date(selDateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
        })}
        logged={progress.logged}
        total={progress.total}
        pct={progress.pct}
        kpis={sessionKpis}
        expanded={kpisOpen}
        onToggle={() => setKpisOpen(o => !o)}
      />
      <AthleteRoster
        athletes={athletes}
        resultFor={id => loggedAthMap[id]}
        openId={isMobile ? null : selAthlete?.id}
        onOpen={openAthlete}
        onClose={() => setSelAthlete(null)}
        onMarkAbsent={markAbsent}
        onDelete={a => setConfirmDel(a)}
        renderForm={() => logForm}
      />
    </div>
  )

  const confirmBody = confirmDel && (
    <div className={s.gate} style={{ fontSize: 13, lineHeight: 1.5 }}>
      Excluir o registro de <strong style={{ color: 'var(--cream)' }}>{confirmDel.name}</strong>{' '}
      nesta sessão? A linha sai do <code>results_v2</code> e de todos os rankings — o atleta volta a
      aparecer como não registrado.
    </div>
  )

  const confirm = (
    <ConfirmReview
      open={!!confirmDel}
      title="Excluir registro"
      editLabel="Cancelar"
      confirmLabel="Excluir"
      onEdit={() => setConfirmDel(null)}
      onClose={() => setConfirmDel(null)}
      onConfirm={() => deleteResult(confirmDel.id)}
    >
      {confirmBody}
    </ConfirmReview>
  )

  if (isMobile) {
    return (
      <div>
        {mobilePanel === 1 && rail}
        {mobilePanel === 2 && (
          <>
            <div className={s.backRow}>
              <Button size="sm" variant="ghost" onClick={() => setMobilePanel(1)}>
                ‹ Semana
              </Button>
            </div>
            {classPane}
          </>
        )}
        {/* The log form is a sheet over the roster on mobile — the same shell Criador's
            mobile exercise editor uses. Two steps plus a sheet, and ONE back wording:
            the third panel and its second "‹ Atletas" link are gone. */}
        {selAthlete && selSession && (
          <div className={s.sheet} role="dialog" aria-modal="true" aria-label={selAthlete.name}>
            <div className={s.sheetHead}>
              <h2 className={s.sheetTitle}>{selAthlete.name}</h2>
              <Button
                size="sm"
                variant="ghost"
                iconOnly
                aria-label="Fechar registro"
                onClick={() => setSelAthlete(null)}
              >
                <IconX size={17} />
              </Button>
            </div>
            <div className={s.sheetBody}>{logForm}</div>
          </div>
        )}
        {confirm}
      </div>
    )
  }

  return (
    <>
      <div className={s.layout}>
        {rail}
        {classPane}
      </div>
      {confirm}
    </>
  )
}
