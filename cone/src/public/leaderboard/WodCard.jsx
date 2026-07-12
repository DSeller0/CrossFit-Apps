import s from './Leaderboard.module.css'
import AccordionCard from '../shared/AccordionCard.jsx'

// Leaderboard's mobile card. Replaces the <select> WOD picker: the week's WODs
// are a list of cards and the ranking lives *inside* the one you open — the same
// gesture as results' SessionCard, which is why both run on AccordionCard.
//
// Collapsed, it carries date · athlete count · the leader's result, so the week
// is readable without opening anything.
//
// w: { key, label, sessName, dt, count }
// summary: { leaderName, leaderPerf } — from cardSummary()
export default function WodCard({ w, summary, expanded, onToggle, children }) {
  const { leaderName = '', leaderPerf = '' } = summary || {}

  const meta = (
    <>
      <span className={s.cardDate}>{w.dt}</span>
      <span className={s.cardCount}>{w.count} atleta{w.count !== 1 ? 's' : ''}</span>
      {leaderName && (
        <span className={s.cardLeader}>
          <i className="ti ti-trophy" aria-hidden="true" />
          <span className={s.cardLeaderName}>{leaderName}</span>
          <span className={s.cardLeaderPerf}>{leaderPerf}</span>
        </span>
      )}
    </>
  )

  return (
    <AccordionCard
      dataId={w.key}
      title={w.sessName || w.label}
      tag={w.label}
      meta={meta}
      filled={w.count > 0}
      expanded={expanded}
      onToggle={onToggle}
    >
      {children}
    </AccordionCard>
  )
}
