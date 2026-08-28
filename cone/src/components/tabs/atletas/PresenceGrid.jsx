import { DOW_LETTERS } from './atletasHelpers.js'
import s from './Atletas.module.css'

const CELL_CLASS = { presente: 'pgPresente', unlogged: 'pgUnlogged', none: 'pgNone' }

// The 4-week presence grid (#160/plans/76). Sunday-start — mockup 51 drew it
// Monday-first, corrected here per the project's own calendar convention.
//
// ⚠️ "Sem registro" is an INFERENCE, not a fact: a missing results_v2 row means
// unknown, not absent — no row is ever created for a no-show. The legend must say
// so, never "faltou"; #102 (attendance join) is what turns this into a fact.
// CLIENT-FREE.
export default function PresenceGrid({ weeks = [] }) {
  return (
    <div className={s.presence}>
      <div className={s.pgRow}>
        {DOW_LETTERS.map((d, i) => (
          <span key={i} className={s.pgDow}>
            {d}
          </span>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className={s.pgRow}>
          {week.map(cell => (
            <span
              key={cell.date}
              className={`${s.pgCell} ${s[CELL_CLASS[cell.state]]}`}
              title={cell.date}
            />
          ))}
        </div>
      ))}
      <div className={s.pgLegend}>
        <span className={s.pgLegendItem}>
          <span className={`${s.pgSwatch} ${s.pgPresente}`} /> Presente
        </span>
        <span className={s.pgLegendItem}>
          <span className={`${s.pgSwatch} ${s.pgUnlogged}`} /> Sem registro
        </span>
      </div>
    </div>
  )
}
