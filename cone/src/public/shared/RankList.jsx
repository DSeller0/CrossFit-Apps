import { rankResults, perfStr, scaleColor, scaleLabel } from '../lib/wod.js'
import s from './RankList.module.css'

// Shared ranking list — the one truth for "athletes, ordered by result" (#51).
// Collapses three hand-rolled copies that had drifted apart (Leaderboard rows,
// Results' mobile flyout, Results' desktop pane): each carried its own sort
// comparator and its own perf-string formatter, and only some of them honored
// the scale filter or highlighted the viewing athlete. Ordering and formatting
// now come from canonical rankResults()/perfStr().
//
// TV's podium rows deliberately stay separate — same recorded reasoning as
// ExerciseList vs Schedule: its wall-display CSS diverges enough that unifying
// the markup would mean a new CSS variant for no visible change.
//
// entries: [{ id?, athleteId, name, scale?, color?, perfTime?, perfRounds?, perfReps? }]
export default function RankList({
  entries = [],
  blType,
  scaleFilter = 'Todos',
  highlightAthleteId = '',
  podium = true,
  showDots = false,
  size = 'compact',
  emptyLabel = 'Nenhum resultado registrado.',
}) {
  const filtered = scaleFilter === 'Todos' ? entries : entries.filter(e => e.scale === scaleFilter)
  const ranked = rankResults(filtered, blType)

  const cls = `${s.list} ${size === 'large' ? s.large : ''}`

  if (!ranked.length) {
    return (
      <div className={cls} aria-live="polite">
        <div className={s.empty}>{emptyLabel}</div>
      </div>
    )
  }

  return (
    <ol className={cls} aria-live="polite">
      {ranked.map((e, i) => {
        const pod = podium && i < 3 ? s[`pod${i + 1}`] : ''
        const self = highlightAthleteId && String(e.athleteId) === String(highlightAthleteId)
        return (
          <li
            key={e.id ?? e.athleteId ?? i}
            className={`${s.row} ${pod}${self ? ' ' + s.self : ''}`}
          >
            <span className={s.rank}>{i + 1}º</span>
            {showDots && <span className={s.dot} style={{ background: e.color || 'var(--dim)' }} />}
            <span className={s.name}>{e.name || '—'}</span>
            {/* Scale and perf get their own fixed columns, left-aligned, so their
                left edges line up down the list. Previously `name: flex 1` shoved
                both to the right edge and the ragged left edges made the column
                unreadable at a glance. */}
            <span className={s.scaleCol}>
              {e.scale && e.scale !== '-' && (
                <span className={s.scale} style={{ color: scaleColor(e.scale) }} title={e.scale}>
                  {scaleLabel(e.scale)}
                </span>
              )}
            </span>
            <span className={s.perf}>{perfStr(e, blType)}</span>
          </li>
        )
      })}
    </ol>
  )
}
