import { IconPlus, IconUser } from '@tabler/icons-react'
import Card from '../../ui/Card.jsx'
import Button from '../../ui/Button.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import AthleteHeader from './AthleteHeader.jsx'
import SessionStrip from './SessionStrip.jsx'
import PrRow from './PrRow.jsx'
import GoalBar from './GoalBar.jsx'
import { DEFAULT_ATHLETE_COLOR } from './atletasHelpers.js'
import s from './Atletas.module.css'

const MAX_GOALS = 3

// The athlete detail pane (#56/C2). The flat stack of `SecLabel` divs is now three
// `Card` sections, each with a real <h2> and its action in the header — so the pane
// has a heading structure (AppChrome already renders the pane's <h1>) and the
// sections read as separable things rather than one long column.
//
// 🔴 The **Adaptações slot** is reserved below Objetivos and is deliberately EMPTY:
// #39 (per-athlete loads + substitutions) fills it. No "em breve" placeholder —
// `locations[].coachName` is the standing lesson about shipping decorative UI ahead
// of its data. Keep the position; #39 drops a fourth <Card> in.
//
// CLIENT-FREE.
export default function AthleteDetail({
  athlete,
  compact = false,
  sessionItems = [],
  todayKey,
  prGroups = [],
  prCount = 0,
  goals = [],
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
}) {
  if (!athlete) {
    return (
      <EmptyState
        pane
        icon={<IconUser />}
        title="Selecione um atleta"
        text="Escolha alguém na lista para ver sessões, PRs e objetivos."
      />
    )
  }

  const color = athlete.color || DEFAULT_ATHLETE_COLOR

  return (
    <div className={s.detailScroll}>
      <AthleteHeader athlete={athlete} onEdit={onEditProfile} />

      <div className={s.sections}>
        <Card pad="sm">
          <div className={s.secHdr}>
            <h2 className={s.secTitle}>Sessões</h2>
          </div>
          {sessionItems.length === 0 ? (
            <EmptyState inline title="Nenhuma sessão atribuída." />
          ) : (
            <SessionStrip items={sessionItems} todayKey={todayKey} />
          )}
        </Card>

        <Card pad="sm">
          <div className={s.secHdr}>
            <h2 className={s.secTitle}>PRs</h2>
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

        <Card pad="sm">
          <div className={s.secHdr}>
            <h2 className={s.secTitle}>Objetivos</h2>
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

        {/* ── #39 Adaptações slot ──────────────────────────────────────────────
            Reserved position, intentionally rendering nothing. #39 adds a fourth
            <Card> here: per-athlete substitutions and loads
            (goals_data.adaptations[athleteId][exerciseNameLower]). Do NOT put a
            placeholder card here in the meantime — see the header comment. */}
      </div>
    </div>
  )
}
