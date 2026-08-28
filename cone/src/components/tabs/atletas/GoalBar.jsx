import { useState } from 'react'
import { IconSettings, IconTrash } from '@tabler/icons-react'
import TallyBar from '../../../public/shared/TallyBar.jsx'
import Button from '../../ui/Button.jsx'
import { goalPct, milestoneTicks, snapPct, DEFAULT_ATHLETE_COLOR } from './atletasHelpers.js'
import s from './Atletas.module.css'

// One athlete goal: the bar, its milestone ticks, and the expandable milestone list
// (#56/C2). Was `HpBar` — a second hand-rolled 10-block gauge, with its milestone
// ticks drawn as absolutely-positioned 2px divs in a literal `#d8a840`.
//
// It is `TallyBar` now, with `ticks` in the same hit/next/future shape
// me/GoalList.jsx:25-31 builds — so the coach's bar and the athlete's own bar
// cannot drift apart. The expand control is a real <button> (it was a click-`<div>`).
//
// ⚠️ No confirm on "+1". The old one asked `window.confirm('Confirmar sessão…')`
// for a single reversible increment — the config panel edits completedSessions
// directly — which is confirm fatigue, not safety. Deleting the goal still confirms.
//
// CLIENT-FREE.
export default function GoalBar({
  goal,
  color = DEFAULT_ATHLETE_COLOR,
  onAddSession,
  onMilestoneHit,
  onConfigure,
  onDelete,
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const pct = goalPct(goal)
  // Sorted for display, but each row carries its ORIGINAL index — `onMilestoneHit`
  // writes back by position into `goal.milestones`, so handing it the sorted index
  // would tick the wrong milestone on any goal whose milestones aren't already in
  // ascending order.
  const ms = (goal.milestones || []).map((m, idx) => ({ m, idx })).sort((a, b) => a.m.pct - b.m.pct)
  const ticks = milestoneTicks(goal.milestones)
  const atCap = goal.completedSessions >= goal.totalSessions

  return (
    <div className={s.goal}>
      <div className={s.goalHdr}>
        <span className={s.goalName} title={goal.name}>
          {goal.name}
        </span>
        <div className={s.goalActions}>
          <Button
            variant="secondary"
            size="xs"
            disabled={atCap}
            aria-label={`Registrar mais uma sessão em ${goal.name}`}
            onClick={onAddSession}
          >
            +1
          </Button>
          <Button
            variant="ghost"
            size="xs"
            iconOnly
            aria-label={`Configurar ${goal.name}`}
            onClick={onConfigure}
          >
            <IconSettings />
          </Button>
          <Button
            variant="destructive"
            size="xs"
            iconOnly
            aria-label={`Remover ${goal.name}`}
            onClick={onDelete}
          >
            <IconTrash />
          </Button>
        </div>
      </div>

      {/* Bar first, count below it — the same convention as PrRow's .prBarCol
          (TallyBar, then a small caption underneath). The count used to sit
          beside the name in the header; a fraction is the bar's own caption,
          not part of the athlete's name, so it reads better attached to what
          it describes. */}
      <button
        type="button"
        className={s.goalToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Ocultar' : 'Ver'} marcos de ${goal.name}`}
        onClick={() => setExpanded(e => !e)}
      >
        <TallyBar pct={pct} color={color} ticks={ticks} size="lg" />
        <span className={s.goalCount}>
          {goal.completedSessions}/{goal.totalSessions}
        </span>
      </button>

      {ms.length > 0 && (
        <div className={s.msTicks} aria-hidden="true">
          {ms.map(({ m, idx }) => (
            <span key={idx} className={s.msTick} style={{ left: `${snapPct(m.pct)}%` }}>
              {snapPct(m.pct)}%
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className={s.msPanel}>
          <div className={s.msPanelTitle}>Marcos</div>
          {ms.length === 0 ? (
            <div className={s.msEmpty}>Nenhum marco configurado.</div>
          ) : (
            ms.map(({ m, idx }) => (
              <label key={idx} className={s.msRow}>
                <input
                  type="checkbox"
                  className={s.msCheck}
                  checked={!!m.hit}
                  style={{ accentColor: color }}
                  onChange={() => onMilestoneHit?.(idx, !m.hit)}
                />
                <span className={`${s.msLabel}${m.hit ? ' ' + s.msLabelHit : ''}`}>
                  {m.label || 'Sem descrição'}
                </span>
                <span className={s.msPct}>{snapPct(m.pct)}%</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}
