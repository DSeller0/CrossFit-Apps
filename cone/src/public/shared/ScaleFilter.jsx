import s from './ScaleFilter.module.css'
import { SCALES } from '../lib/wod.js'

export const FILTER_SCALES = ['Todos', ...SCALES]

// Scale filter pills. Shared (#51) because three copies existed: leaderboard
// rendered it twice (sticky mobile bar + desktop column) and results had its own
// `.lbScalePill` row — which is exactly why they had drifted. The active pill was
// a cyan fill from the retired lb_colors; it is --teal from the theme now.
export default function ScaleFilter({ value = 'Todos', onChange, className = '' }) {
  return (
    <div className={`${s.row} ${className}`} role="group" aria-label="Filtrar por escala">
      {FILTER_SCALES.map(sc => (
        <button key={sc} type="button" aria-pressed={value === sc}
          className={`${s.pill}${value === sc ? ' ' + s.pillOn : ''}`}
          onClick={() => onChange(sc)}>
          {sc}
        </button>
      ))}
    </div>
  )
}
