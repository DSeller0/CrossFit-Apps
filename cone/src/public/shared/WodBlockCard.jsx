import { ExerciseList } from './ExerciseList.jsx'
import { blkColor, blkLabel, blkMetaParts, goalStr } from '../lib/wod.js'
import s from './WodBlockCard.module.css'

// The WOD itself, above a ranking — same shape as TV's BlockCard (slides.jsx:121):
// family-colored left rule + type badge, then the shared ExerciseList. So the
// leaderboard now shows what the workout *was*, not just its label.
//
// It also absorbs what LbHeader used to do: the badge is the block label, the
// chips are rounds/CAP, and the footer line carries date · session · active scale.
//
// Estações flattens into one list, matching TV — the recorded decision (Schedule
// keeps the full station structure as the detailed view).
export default function WodBlockCard({
  bl,
  dt,
  sessName,
  scaleFilter = 'Todos',
  size = 'compact',
}) {
  const color = blkColor(bl)
  const label = blkLabel(bl)

  const exes =
    bl.type === 'Estações'
      ? (bl.stations || []).flatMap(st =>
          (st.exercises || []).map(e => ({ ...e, _station: st.name })),
        )
      : bl.exercises || []

  const chips = blkMetaParts(bl)
  const goal = goalStr(bl)

  const foot = [dt, sessName, scaleFilter !== 'Todos' ? scaleFilter : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <section
      className={`${s.card} ${size === 'large' ? s.large : ''}`}
      style={{ borderLeftColor: color }}
    >
      <header className={s.hdr}>
        <h2
          className={s.badge}
          style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
        >
          {label}
        </h2>
        {chips.map(c => (
          <span key={c} className={s.chip}>
            {c}
          </span>
        ))}
        {goal && <span className={s.goal}>Meta {goal}</span>}
      </header>

      {/* Always `tiny`: ExerciseList's `compact` is TV-wall scale (26px names) and
          `large` is bigger still. This card lives on a phone/web page, so it wants
          the 12–15px scale — the same one LogPane already uses. `size` here only
          scales this card's own chrome. */}
      {exes.length > 0 && <ExerciseList exercises={exes} color={color} size="tiny" />}

      {foot && <div className={s.foot}>{foot}</div>}
    </section>
  )
}
