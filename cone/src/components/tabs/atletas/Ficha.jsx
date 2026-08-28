import { IconPlus, IconUser } from '@tabler/icons-react'
import Card from '../../ui/Card.jsx'
import Button from '../../ui/Button.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import AthleteHeader from './AthleteHeader.jsx'
import SessionStrip from './SessionStrip.jsx'
import PrRow from './PrRow.jsx'
import GoalBar from './GoalBar.jsx'
import SinceLastOneOnOne from './SinceLastOneOnOne.jsx'
import PresenceGrid from './PresenceGrid.jsx'
import CoachNotePanel from './CoachNotePanel.jsx'
import { DEFAULT_ATHLETE_COLOR, goalPct } from './atletasHelpers.js'
import s from './Atletas.module.css'

const MAX_GOALS = 3

// The ficha — 1:1 preparation, not a roster entry (#160/plans/76 · mockup 51).
// Supersedes AthleteDetail's composition: the same three sections it always had
// (sessions, PRs, goals) plus what real data unlocks around them — Desde o
// último 1:1, Presença and Nota do coach — bracketing the two slots still gated
// on data that doesn't exist yet.
//
// 🔴 Both ▢ slots below render NOTHING, on purpose — no "em breve" placeholder.
// The precedent is the old AthleteDetail.jsx's #39 slot; the opposite (and
// rejected) precedent is `locations[].coachName`, shipped as groundwork a form
// wrote and nothing ever read.
// CLIENT-FREE.
export default function Ficha({
  athlete,
  compact = false,
  sessionItems = [],
  todayKey,
  prGroups = [],
  prCount = 0,
  goals = [],
  sinceLastNote,
  presenceWeeks = [],
  notes = [],
  onEditProfile,
  onAddPr,
  onAddGoal,
  onAddPrResult,
  onEditPr,
  onDeletePr,
  onAddGoalSession,
  onMilestoneHit,
  onConfigureGoal,
  onDeleteGoal,
  onSaveNote,
}) {
  if (!athlete) {
    return (
      <EmptyState
        pane
        icon={<IconUser />}
        title="Selecione um atleta"
        text="Escolha alguém na grade para preparar o próximo 1:1."
      />
    )
  }

  const color = athlete.color || DEFAULT_ATHLETE_COLOR
  const doneGoals = goals.filter(g => goalPct(g) >= 100).length

  return (
    <div className={s.detailScroll}>
      <AthleteHeader athlete={athlete} onEdit={onEditProfile} />

      <div className={s.sections}>
        <Card pad="sm">
          <div className={s.secHdr}>
            <h2 className={s.secTitle}>Desde o último 1:1</h2>
          </div>
          <SinceLastOneOnOne since={sinceLastNote} />
        </Card>

        <Card pad="sm">
          <div className={s.secHdr}>
            <h2 className={s.secTitle}>Últimas sessões</h2>
          </div>
          {sessionItems.length === 0 ? (
            <EmptyState inline title="Nenhuma sessão atribuída." />
          ) : (
            <SessionStrip items={sessionItems} todayKey={todayKey} />
          )}
        </Card>

        <Card pad="sm">
          <div className={s.secHdr}>
            <h2 className={s.secTitle}>Presença · 4 semanas</h2>
          </div>
          <PresenceGrid weeks={presenceWeeks} />
        </Card>

        <Card pad="sm">
          <div className={s.secHdr}>
            <h2 className={s.secTitle}>Objetivos abertos</h2>
            {goals.length < MAX_GOALS && (
              <Button variant="secondary" size="xs" onClick={onAddGoal}>
                <IconPlus /> Objetivo
              </Button>
            )}
          </div>
          {goals.length === 0 ? (
            <EmptyState
              inline
              title="Nenhum objetivo definido."
              action={
                <Button variant="ghost" size="xs" onClick={onAddGoal}>
                  Criar objetivo
                </Button>
              }
            />
          ) : (
            goals.map(g => (
              <GoalBar
                key={g.id}
                goal={g}
                color={color}
                onAddSession={() => onAddGoalSession?.(g.id)}
                onMilestoneHit={(mi, hit) => onMilestoneHit?.(g.id, mi, hit)}
                onConfigure={() => onConfigureGoal?.(g.id)}
                onDelete={() => onDeleteGoal?.(g.id)}
              />
            ))
          )}
        </Card>

        <Card pad="sm">
          <div className={s.secHdr}>
            <h2 className={s.secTitle}>1RM</h2>
            <Button variant="secondary" size="xs" onClick={onAddPr}>
              <IconPlus /> PR
            </Button>
          </div>
          {prCount === 0 ? (
            <EmptyState
              inline
              title="Nenhum PR registrado."
              action={
                <Button variant="ghost" size="xs" onClick={onAddPr}>
                  Registrar o primeiro
                </Button>
              }
            />
          ) : (
            prGroups.map(([cat, catPrs]) => (
              <div key={cat} className={s.catGroup}>
                <h3 className={s.catHdr}>{cat}</h3>
                {catPrs.map(pr => (
                  <PrRow
                    key={pr.id}
                    pr={pr}
                    color={color}
                    compact={compact}
                    showActions
                    onAddResult={() => onAddPrResult?.(pr)}
                    onEdit={() => onEditPr?.(pr)}
                    onDelete={() => onDeletePr?.(pr)}
                  />
                ))}
              </div>
            ))
          )}
        </Card>

        {/* ── #39 Adaptações/Limitações slot ───────────────────────────────────
            Reserved, intentionally rendering nothing. #39 (per-athlete
            substitutions and loads, goals_data.adaptations[athleteId][exName])
            drops a Card in here. */}

        <Card pad="sm">
          <div className={s.secHdr}>
            <h2 className={s.secTitle}>Nota do coach</h2>
          </div>
          <CoachNotePanel key={athlete.id} notes={notes} onSave={onSaveNote} />
        </Card>

        {/* ── plans/22 Atributos slot ──────────────────────────────────────────
            Reserved, intentionally rendering nothing. plans/22 step 4 (character
            stats + Distribuição do time) drops a Card in here. */}

        <details className={s.missionsFold}>
          <summary className={s.missionsSummary}>Missões</summary>
          <div className={s.missionsBody}>
            {goals.length === 0
              ? 'Nenhum objetivo criado ainda.'
              : `${doneGoals} concluído${doneGoals === 1 ? '' : 's'} · ${goals.length - doneGoals} em andamento`}
          </div>
        </details>
      </div>
    </div>
  )
}
