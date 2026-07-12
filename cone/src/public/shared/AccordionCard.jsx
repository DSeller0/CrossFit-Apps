import { onKey } from '../schedule/scheduleHelpers.js'
import s from './AccordionCard.module.css'

// The disclosure shell behind both mobile card lists (#51): results' SessionCard
// and leaderboard's WodCard. They carry different data in the header — results
// shows your own status, leaderboard shows the block type and date — so they stay
// separate components, but the interaction is identical and lives here once:
// one keyboard contract, one aria-expanded, one chevron, one focus ring.
//
// title/tag/meta are slots; the body is children and only mounts when expanded.
export default function AccordionCard({
  title,
  tag = null,
  meta = null,
  filled = false,
  expanded = false,
  onToggle,
  dataId,
  children,
}) {
  return (
    <div data-card-id={dataId} className={`${s.card}${expanded ? ' ' + s.expanded : ''}`}>
      <div className={s.hdr} role="button" tabIndex={0} aria-expanded={expanded}
        onClick={onToggle} onKeyDown={onKey(onToggle)}>
        <div className={s.top}>
          <span className={`${s.dot}${filled ? ' ' + s.dotFilled : ''}`} />
          <span className={s.title}>{title}</span>
          {tag && <span className={s.tag}>{tag}</span>}
          <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'} ${s.chev}`} aria-hidden="true" />
        </div>
        {meta && <div className={s.meta}>{meta}</div>}
      </div>
      {expanded && <div className={s.body}>{children}</div>}
    </div>
  )
}
