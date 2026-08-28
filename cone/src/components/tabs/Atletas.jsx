import { useState, useMemo } from 'react'
import { IconChevronLeft } from '@tabler/icons-react'
import {
  loadAthletes,
  saveAthletes,
  loadGoalsData,
  saveGoalsData,
  loadRegistry,
  uid,
  todayISO,
} from '../../utils/storage'
import { APP_CONFIG } from '../../utils/config'
import { useIsMobile } from '../../hooks/useIsMobile'
import { isWodBlock } from '../../public/lib/wod.js'
import { buildRegistryIndex, resolveExercise } from '../../public/lib/registry.js'
import ConfirmReview from '../../public/shared/ConfirmReview'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import ExerciseCombobox from '../shared/ExerciseCombobox.jsx'
import AthleteGrid from './atletas/AthleteGrid.jsx'
import Ficha from './atletas/Ficha.jsx'
import AthleteProfileModal from './atletas/AthleteProfileModal.jsx'
import GoalConfigPanel from './atletas/GoalConfigPanel.jsx'
import PrModal from './atletas/PrModal.jsx'
import AddResultModal from './atletas/AddResultModal.jsx'
import {
  groupPrsByCategory,
  sessionStrip,
  nextSessionGroups,
  lastSessionSignal,
  adherence,
  daysSinceNote,
  goalSignal,
  presenceGrid,
  sinceLastNote,
  DEFAULT_ATHLETE_COLOR,
} from './atletas/atletasHelpers.js'
import s from './atletas/Atletas.module.css'

const getLevels = () =>
  APP_CONFIG.athleteLevels || ['Iniciante', 'Intermediário', 'Avançado', 'Competidor']
const getGoals = () =>
  APP_CONFIG.athleteGoals || ['Saúde geral', 'Força', 'Condicionamento', 'Competição']

// Container for the Atletas tab (#56/C2 · plans/75) — was a 1795-line file with 7
// frozen totk-dark palette consts. Every rendered component now lives in atletas/
// and is client-free; this file owns all storage reads/writes.
//
// App.jsx also passes `onEditSession`/`onLogResult` — unused here, same as in the
// file this replaces: nothing in either the old or new tab wires a session-strip
// row to navigate away yet, so they aren't destructured.
export default function AtletasTab({ sessions, results, events = {} }) {
  const [athletes, setAthletes] = useState(loadAthletes)
  const [goalsData, setGoalsData] = useState(loadGoalsData)
  const [selAthlete, setSelAthlete] = useState(null)
  const [pane, setPane] = useState(0) // mobile: 0 = list, 1 = detail
  const [profileForm, setProfileForm] = useState(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [configuringGoal, setConfiguringGoal] = useState(null)
  const [showPrModal, setShowPrModal] = useState(false)
  const [editingPr, setEditingPr] = useState(null)
  const [prName, setPrName] = useState('')
  const [addResultFor, setAddResultFor] = useState(null)
  const [confirmDeleteAthlete, setConfirmDeleteAthlete] = useState(false)
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState(null)
  const [confirmDeletePr, setConfirmDeletePr] = useState(null)
  const isMobile = useIsMobile()
  const todayKey = todayISO()

  // Registry data is read once per mount (not per PR-modal open) — `loadRegistry()`
  // hands back a fresh object identity on every call, so a dependency on it would
  // rebuild the whole index on every keystroke in the name field (the bug the old
  // per-modal-instance comment warned about; mounting once here is simpler and
  // still correct — the registry doesn't change mid-session in a way that matters).
  const registryIndex = useMemo(() => buildRegistryIndex(loadRegistry() || {}), [])
  const blockOrder = useMemo(() => Object.keys(loadRegistry() || {}), [])

  const persist = d => {
    setGoalsData(d)
    saveGoalsData(d)
  }
  const persistAthletes = a => {
    setAthletes(a)
    saveAthletes(a)
  }

  const ath = athletes.find(a => a.id === selAthlete) || null
  // Memoized: `(goalsData.x || {})[id] || []` mints a NEW empty array every render
  // when the athlete has no entry yet, which would make every downstream useMemo
  // keyed on these re-run every render regardless of its own real dependencies.
  const athGoals = useMemo(
    () => (goalsData.athleteGoals || {})[selAthlete] || [],
    [goalsData.athleteGoals, selAthlete],
  )
  const athPrs = useMemo(() => (goalsData.prs || {})[selAthlete] || [], [goalsData.prs, selAthlete])
  const athNotes = useMemo(
    () => (goalsData.coachNotes || {})[selAthlete] || [],
    [goalsData.coachNotes, selAthlete],
  )
  const athResults = useMemo(
    () => (results || []).filter(r => String(r.athleteId) === String(selAthlete)),
    [results, selAthlete],
  )

  // The session strip enriched with each date's logged perf — a canonical WOD-type
  // test (#77's isWodBlock, reading the result block's blockType/blockLabel) so a
  // logged Fran or a stations WOD shows a perf here, not just plain strength blocks.
  const sessionItems = useMemo(() => {
    if (!ath) return []
    return sessionStrip(sessions, ath.name, todayKey).map(({ date, session }) => {
      const myResult = athResults.find(r => r.date === date && r.sessionId === session.id)
      const wb = myResult
        ? (myResult.blocks || []).find(b => isWodBlock({ type: b.blockType, label: b.blockLabel }))
        : null
      const perf = wb ? wb.perfTime || (wb.perfRounds ? wb.perfRounds + 'rds' : null) : null
      return { date, session, perf, logged: !!myResult }
    })
  }, [ath, sessions, athResults, todayKey])

  const prGroups = useMemo(() => groupPrsByCategory(athPrs, blockOrder), [athPrs, blockOrder])
  const prCategories = useMemo(
    () => (prName.trim() ? resolveExercise(prName, registryIndex)?.categories || [] : []),
    [prName, registryIndex],
  )

  // The grade's grouping (#160/plans/76) — every athlete under the earliest
  // session (today or later) they're assigned to, or under "Sem sessão marcada".
  const groups = useMemo(
    () => nextSessionGroups(sessions, athletes, events, todayKey),
    [sessions, athletes, events, todayKey],
  )

  // One signals object per athlete — the grade's 4-signal card reads this map,
  // never the raw sessions/results/goalsData itself.
  const signalsByAthlete = useMemo(() => {
    const map = {}
    athletes.forEach(a => {
      const aGoals = (goalsData.athleteGoals || {})[a.id] || []
      const aNotes = (goalsData.coachNotes || {})[a.id] || []
      map[a.id] = {
        lastSession: lastSessionSignal(results, a.id, todayKey),
        adherence: adherence(sessions, results, a, todayKey),
        daysSinceFeedback: daysSinceNote(aNotes, todayKey),
        goal: goalSignal(aGoals, todayKey),
      }
    })
    return map
  }, [athletes, goalsData, results, sessions, todayKey])

  // Mobile collapses the date-based grade into a 3-bucket signal list — same
  // AthleteGrid, a differently-shaped `groups` (no date/time, so the header just
  // shows the bucket name). "Precisa de atenção" wins over "Próxima": a stalled
  // athlete whose next session happens to be today still needs the flag.
  const mobileGroups = useMemo(() => {
    if (!isMobile) return null
    const groupByAthleteId = {}
    groups.forEach(g => g.athletes.forEach(a => (groupByAthleteId[a.id] = g)))
    const atencao = [],
      proxima = [],
      emDia = []
    athletes.forEach(a => {
      const sig = signalsByAthlete[a.id]
      const needsAttention =
        sig.adherence?.trend === 'down' || (sig.daysSinceFeedback?.days ?? Infinity) > 14
      const g = groupByAthleteId[a.id]
      if (needsAttention) atencao.push(a)
      else if (g && (g.label === 'Hoje' || g.label === 'Amanhã')) proxima.push(a)
      else emDia.push(a)
    })
    return [
      { date: null, time: null, label: 'Precisa de atenção', athletes: atencao },
      { date: null, time: null, label: 'Próxima', athletes: proxima },
      { date: null, time: null, label: 'Em dia', athletes: emDia },
    ].filter(g => g.athletes.length)
  }, [isMobile, athletes, signalsByAthlete, groups])

  const presenceWeeks = useMemo(
    () => (ath ? presenceGrid(sessions, results, ath, todayKey) : []),
    [ath, sessions, results, todayKey],
  )
  const sinceLast = useMemo(
    () =>
      ath ? sinceLastNote(ath, athNotes, athPrs, athGoals, sessions, results, todayKey) : null,
    [ath, athNotes, athPrs, athGoals, sessions, results, todayKey],
  )

  const goToAthlete = athId => {
    const a = athletes.find(x => x.id === athId)
    if (!a) return
    setSelAthlete(athId)
    setProfileForm({
      name: a.name,
      level: a.level || getLevels()[0],
      goal: a.goal || getGoals()[0],
      notes: a.notes || '',
      color: a.color || DEFAULT_ATHLETE_COLOR,
      since: a.since || todayKey,
    })
    setConfiguringGoal(null)
    if (isMobile) setPane(1)
  }

  const addAthlete = name => {
    const a = {
      id: uid(),
      name,
      level: getLevels()[0],
      goal: getGoals()[0],
      notes: '',
      color: DEFAULT_ATHLETE_COLOR,
      since: todayKey,
    }
    persistAthletes([...athletes, a])
    setSelAthlete(a.id)
    setProfileForm({
      name: a.name,
      level: a.level,
      goal: a.goal,
      notes: '',
      color: a.color,
      since: a.since,
    })
    setShowProfileModal(true)
    if (isMobile) setPane(1)
  }

  const saveProfile = () => {
    if (!profileForm?.name.trim() || !selAthlete) return
    persistAthletes(athletes.map(a => (a.id === selAthlete ? { ...a, ...profileForm } : a)))
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 1500)
  }

  const deleteAthleteConfirmed = () => {
    persistAthletes(athletes.filter(a => a.id !== selAthlete))
    setSelAthlete(null)
    setShowProfileModal(false)
    setConfirmDeleteAthlete(false)
    if (isMobile) setPane(0)
  }

  // ── Goal operations ─────────────────────────────────────────────────────────
  const addGoal = () => {
    if (athGoals.length >= 3) return
    const g = {
      id: uid(),
      name: 'Novo objetivo',
      totalSessions: 10,
      completedSessions: 0,
      milestones: [],
      // A real pace calculation needs a start date, which goals never carried
      // before (#160/plans/76) — one field, no migration/backfill. Goals created
      // before this fall back to the milestone-hitDate "parado" signal, which was
      // already stamped.
      createdAt: todayISO(),
    }
    persist({
      ...goalsData,
      athleteGoals: { ...(goalsData.athleteGoals || {}), [selAthlete]: [...athGoals, g] },
    })
    setConfiguringGoal(g.id)
  }
  const updateGoal = (goalId, upd) => {
    persist({
      ...goalsData,
      athleteGoals: {
        ...(goalsData.athleteGoals || {}),
        [selAthlete]: athGoals.map(g => (g.id === goalId ? { ...g, ...upd } : g)),
      },
    })
    setConfiguringGoal(null)
  }
  const deleteGoalConfirmed = () => {
    persist({
      ...goalsData,
      athleteGoals: {
        ...(goalsData.athleteGoals || {}),
        [selAthlete]: athGoals.filter(g => g.id !== confirmDeleteGoal),
      },
    })
    setConfirmDeleteGoal(null)
  }
  const addGoalSession = goalId => {
    const g = athGoals.find(x => x.id === goalId)
    if (!g || g.completedSessions >= g.totalSessions) return
    const next = g.completedSessions + 1
    const completedAt = next >= g.totalSessions ? g.completedAt || todayKey : g.completedAt
    updateGoal(goalId, { completedSessions: next, completedAt })
  }
  const hitMilestone = (goalId, mi, hit) => {
    const g = athGoals.find(x => x.id === goalId)
    if (!g) return
    updateGoal(goalId, {
      milestones: g.milestones.map((m, i) =>
        i === mi ? { ...m, hit, hitDate: hit ? m.hitDate || todayKey : undefined } : m,
      ),
    })
  }

  // ── PR operations ───────────────────────────────────────────────────────────
  const openNewPr = () => {
    setPrName('')
    setEditingPr(null)
    setShowPrModal(true)
  }
  const openEditPr = pr => {
    setPrName(pr.name)
    setEditingPr(pr)
    setShowPrModal(false)
  }
  const closePrModal = () => {
    setShowPrModal(false)
    setEditingPr(null)
    setPrName('')
  }
  const savePrModal = ({ type, unit, target, value, date }) => {
    const pr = {
      id: editingPr?.id || uid(),
      name: prName.trim(),
      category: prCategories[0] || editingPr?.category || '',
      categories: prCategories,
      type,
      unit,
      target,
      results: editingPr
        ? editingPr.results
        : value !== null && value !== undefined
          ? [{ value, date }]
          : [],
    }
    const updated = athPrs.find(p => p.id === pr.id)
      ? athPrs.map(p => (p.id === pr.id ? pr : p))
      : [...athPrs, pr]
    persist({ ...goalsData, prs: { ...(goalsData.prs || {}), [selAthlete]: updated } })
    closePrModal()
  }
  const addResult = ({ value, date }) => {
    const updated = athPrs.map(p =>
      p.id !== addResultFor.id ? p : { ...p, results: [...p.results, { value, date }].slice(-5) },
    )
    persist({ ...goalsData, prs: { ...(goalsData.prs || {}), [selAthlete]: updated } })
    setAddResultFor(null)
  }
  const deletePrConfirmed = () => {
    persist({
      ...goalsData,
      prs: { ...(goalsData.prs || {}), [selAthlete]: athPrs.filter(p => p.id !== confirmDeletePr) },
    })
    setConfirmDeletePr(null)
  }

  // ── Coach note (#160/plans/76) ──────────────────────────────────────────────
  // Writes straight from the mutator, not a mount effect — the #76/#109/#111 bug
  // class (a load path that writes back on mount/every render).
  const saveNote = text => {
    const note = { id: uid(), date: todayKey, text }
    persist({
      ...goalsData,
      coachNotes: { ...(goalsData.coachNotes || {}), [selAthlete]: [...athNotes, note] },
    })
  }

  const excludeNames = editingPr
    ? athPrs.map(p => p.name).filter(n => n.toLowerCase() !== editingPr.name.toLowerCase())
    : athPrs.map(p => p.name)

  const confirmDeleteGoalName = athGoals.find(g => g.id === confirmDeleteGoal)?.name || ''
  const confirmDeletePrName = athPrs.find(p => p.id === confirmDeletePr)?.name || ''
  const goalBeingConfigured = athGoals.find(g => g.id === configuringGoal) || null

  const grade = (
    <AthleteGrid
      groups={isMobile ? mobileGroups : groups}
      signalsByAthlete={signalsByAthlete}
      selectedId={selAthlete}
      onSelect={goToAthlete}
      onAdd={addAthlete}
    />
  )

  const ficha = (
    <Ficha
      athlete={ath}
      compact={isMobile}
      sessionItems={sessionItems}
      todayKey={todayKey}
      prGroups={prGroups}
      prCount={athPrs.length}
      goals={athGoals}
      sinceLastNote={sinceLast}
      presenceWeeks={presenceWeeks}
      notes={athNotes}
      onEditProfile={() => setShowProfileModal(true)}
      onAddPr={openNewPr}
      onAddGoal={addGoal}
      onAddPrResult={pr => setAddResultFor(pr)}
      onEditPr={openEditPr}
      onDeletePr={pr => setConfirmDeletePr(pr.id)}
      onAddGoalSession={addGoalSession}
      onMilestoneHit={hitMilestone}
      onConfigureGoal={goalId => setConfiguringGoal(goalId)}
      onDeleteGoal={goalId => setConfirmDeleteGoal(goalId)}
      onSaveNote={saveNote}
    />
  )

  const modals = (
    <>
      {showProfileModal && profileForm && (
        <AthleteProfileModal
          open
          form={profileForm}
          onChange={(field, value) => setProfileForm(p => ({ ...p, [field]: value }))}
          levels={getLevels()}
          goals={getGoals()}
          onSave={saveProfile}
          onDelete={() => setConfirmDeleteAthlete(true)}
          onClose={() => setShowProfileModal(false)}
          saved={profileSaved}
        />
      )}

      {configuringGoal && goalBeingConfigured && (
        <Modal open title="Configurar objetivo" onClose={() => setConfiguringGoal(null)}>
          <GoalConfigPanel
            goal={goalBeingConfigured}
            onSave={u => updateGoal(configuringGoal, u)}
            onCancel={() => setConfiguringGoal(null)}
          />
        </Modal>
      )}

      {(showPrModal || editingPr) && (
        <PrModal
          open
          editPr={editingPr}
          combobox={
            <ExerciseCombobox
              value={prName}
              onChange={setPrName}
              blockLabel=""
              placeholder="Ex: Fran, Back Squat..."
              excludeNames={excludeNames}
            />
          }
          categories={prCategories}
          today={todayKey}
          nameFilled={!!prName.trim()}
          onSave={savePrModal}
          onClose={closePrModal}
        />
      )}

      {addResultFor && (
        <AddResultModal
          open
          pr={addResultFor}
          today={todayKey}
          onSave={addResult}
          onClose={() => setAddResultFor(null)}
        />
      )}

      <ConfirmReview
        open={confirmDeleteAthlete}
        title="Remover atleta"
        editLabel="Cancelar"
        confirmLabel="Remover"
        onEdit={() => setConfirmDeleteAthlete(false)}
        onClose={() => setConfirmDeleteAthlete(false)}
        onConfirm={deleteAthleteConfirmed}
      >
        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.5 }}>
          Remover <strong style={{ color: 'var(--cream)' }}>{ath?.name}</strong>? Esta ação não pode
          ser desfeita.
        </div>
      </ConfirmReview>

      <ConfirmReview
        open={!!confirmDeleteGoal}
        title="Remover objetivo"
        editLabel="Cancelar"
        confirmLabel="Remover"
        onEdit={() => setConfirmDeleteGoal(null)}
        onClose={() => setConfirmDeleteGoal(null)}
        onConfirm={deleteGoalConfirmed}
      >
        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.5 }}>
          Remover <strong style={{ color: 'var(--cream)' }}>{confirmDeleteGoalName}</strong>?
        </div>
      </ConfirmReview>

      <ConfirmReview
        open={!!confirmDeletePr}
        title="Remover PR"
        editLabel="Cancelar"
        confirmLabel="Remover"
        onEdit={() => setConfirmDeletePr(null)}
        onClose={() => setConfirmDeletePr(null)}
        onConfirm={deletePrConfirmed}
      >
        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.5 }}>
          Remover <strong style={{ color: 'var(--cream)' }}>{confirmDeletePrName}</strong>?
        </div>
      </ConfirmReview>
    </>
  )

  if (isMobile)
    return (
      <div className={s.tabMobile}>
        {pane === 0 && <div className={s.paneMobile}>{grade}</div>}
        {pane === 1 && (
          <div className={s.paneMobile}>
            <div className={s.mobileBack}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPane(0)
                  setSelAthlete(null)
                }}
              >
                <IconChevronLeft size={16} /> Atletas
              </Button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>{ficha}</div>
          </div>
        )}
        {modals}
      </div>
    )

  return (
    <div className={s.tab}>
      <div className={s.gradePane}>{grade}</div>
      <div className={s.fichaPane}>{ficha}</div>
      {modals}
    </div>
  )
}
