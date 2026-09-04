import { DAY_PT } from '../../../../public/lib/week.js'
import s from '../Publicador.module.css'

const ZONE_COUNTS = [1, 2, 3]
const SPLITS = [
  { id: 'iguais', label: 'Iguais (50/50)' },
  { id: '30-70', label: '30/70' },
]
const MODELS = [
  { id: 'classico', label: 'Clássico' },
  { id: 'impacto', label: 'Impacto' },
]

// Layout — the 4th Aparência panel (#59 · C5·b2 · plans/83 T6). Forks entirely on
// the selected format: Dia gets Zonas (count + split, plus the hidden-zone collapse
// fact — plans/83's "never drop it silently" rule), Semana/Semana mobile get the
// 7-day picker, Dia mobile gets the Eagles/MegaMan "modelo" choice (kept as a named
// pair rather than deleted — the b1-inherited decision), Mês has nothing to set.
export default function LayoutPanel({
  format,
  zoneCount,
  onZoneCount,
  zoneSplit,
  onZoneSplit,
  zoneCollapseMessage,
  visibleDays,
  onToggleDay,
  mobileModel,
  onMobileModel,
}) {
  if (format === 'dia') {
    return (
      <div>
        <p className={s.grp}>Zonas</p>
        <div className={s.originList} role="radiogroup" aria-label="Número de zonas">
          {ZONE_COUNTS.map(n => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={zoneCount === n}
              className={`${s.originBtn} ${zoneCount === n ? s.on : ''}`}
              onClick={() => onZoneCount(n)}
            >
              {n === 1 ? '1 zona' : `${n} zonas`}
            </button>
          ))}
        </div>
        {zoneCount === 2 && (
          <>
            <p className={s.grp}>Divisão</p>
            <div className={s.originList} role="radiogroup" aria-label="Divisão das zonas">
              {SPLITS.map(o => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={zoneSplit === o.id}
                  className={`${s.originBtn} ${zoneSplit === o.id ? s.on : ''}`}
                  onClick={() => onZoneSplit(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
        {zoneCollapseMessage && (
          <p className={s.hint} style={{ marginLeft: 0, marginTop: 6 }}>
            {zoneCollapseMessage}
          </p>
        )}
      </div>
    )
  }

  if (format === 'semana' || format === 'semanaMobile') {
    return (
      <div>
        <p className={s.grp}>Dias no export</p>
        <div className={s.dyRow}>
          {DAY_PT.map((d, i) => {
            const on = visibleDays.includes(i)
            return (
              <button
                key={d}
                type="button"
                role="checkbox"
                aria-checked={on}
                className={`${s.dyBtn} ${on ? s.on : ''}`}
                onClick={() => onToggleDay(i)}
              >
                {d}
              </button>
            )
          })}
        </div>
        <p className={s.hint} style={{ marginLeft: 0, marginTop: 6 }}>
          desmarcar um dia remove a coluna · um dia sem sessão mostra &quot;Descanso&quot;
        </p>
      </div>
    )
  }

  if (format === 'diaMobile') {
    return (
      <div>
        <p className={s.grp}>Modelo</p>
        <div className={s.originList} role="radiogroup" aria-label="Modelo do Dia mobile">
          {MODELS.map(o => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={(mobileModel || 'classico') === o.id}
              className={`${s.originBtn} ${(mobileModel || 'classico') === o.id ? s.on : ''}`}
              onClick={() => onMobileModel(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <p className={s.hint} style={{ marginLeft: 0 }}>
      este formato mostra todos os dias do mês — sem opções de layout.
    </p>
  )
}
