import s from './Leaderboard.module.css'
import { onKey } from '../schedule/scheduleHelpers.js'

// One WOD in the desktop selector column. Keyboard-reachable now (#14): it was
// a click-only <div>, and since nothing rendered until a WOD was picked, a
// keyboard user faced a permanently empty page. Selected state was a cyan
// border + glow; it is teal from the theme now.
//
// w: { key, label, sessName, dt, count }
export default function WodSelectCard({ w, selected = false, onSelect }) {
  return (
    <div className={`${s.wodCard}${selected ? ' ' + s.wodCardSel : ''}`}
      role="button" tabIndex={0} aria-pressed={selected}
      onClick={() => onSelect(w.key)} onKeyDown={onKey(() => onSelect(w.key))}>
      <div className={s.wodCardHdr}>
        <span className={s.wodDot} />
        <span className={s.wodName}>{w.sessName || w.label}</span>
        <span className={s.wodTypeTag}>{w.label}</span>
      </div>
      <div className={s.wodMeta}>
        <span>{w.dt}</span>
        {w.count > 0 && <span>{w.count} atleta{w.count !== 1 ? 's' : ''}</span>}
      </div>
    </div>
  )
}
