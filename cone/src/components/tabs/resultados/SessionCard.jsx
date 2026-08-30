import TallyBar from '../../../public/shared/TallyBar.jsx'
import s from './Resultados.module.css'

// One session in the week rail (#57/plans/80 · mockup 61).
//
// Was a click-`<div>` (`rp-sess-card`) — now a real <button>, which is #169's half of
// this file: keyboard reach and activation come for free instead of needing role +
// tabIndex + an Enter/Space handler bolted on.
//
// The progress bar is new. Before it, the ONLY progress signal anywhere in the tab was a
// `3/12 reg.` string on this card, so "which of this week's classes still needs logging"
// was a question you answered by clicking through them.
// CLIENT-FREE.
export default function SessionCard({ name, logged, total, pct, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`${s.sessCard}${selected ? ' ' + s.on : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className={s.sessName}>{name}</div>
      <div className={s.sessProg}>
        <TallyBar pct={pct} color="var(--accent)" size="sm" grow />
        <span
          className={`${s.sessProgN}${logged > 0 && logged >= total ? ' ' + s.sessProgNDone : ''}`}
        >
          {logged}/{total}
        </span>
      </div>
    </button>
  )
}
