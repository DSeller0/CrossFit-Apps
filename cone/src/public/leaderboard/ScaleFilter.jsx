import s from './Leaderboard.module.css'
import { SCALES } from '../lib/wod.js'

export const FILTER_SCALES = ['Todos', ...SCALES]

// Scale filter pills. Rendered twice on the page (sticky mobile bar + desktop
// ranking column), which is exactly why the two copies had drifted — they now
// share this one. Active pill was a cyan fill from lb_colors; it is teal from
// the theme now, and squared like every other pill in the app.
export default function ScaleFilter({ value = 'Todos', onChange, className = '' }) {
  return (
    <div className={`${s.filterRow} ${className}`} role="group" aria-label="Filtrar por escala">
      {FILTER_SCALES.map(sc => (
        <button key={sc} type="button" aria-pressed={value === sc}
          className={`${s.fb}${value === sc ? ' ' + s.fbOn : ''}`}
          onClick={() => onChange(sc)}>
          {sc}
        </button>
      ))}
    </div>
  )
}
