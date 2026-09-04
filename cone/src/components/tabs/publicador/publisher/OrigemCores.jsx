import ColorField from '../../../ui/ColorField'
import { EXPORT_ROLES } from '../exportPalette'
import s from '../Publicador.module.css'

// Origem/Cores — the first Aparência panel (#59 C5·b1 step d). Origem picks WHICH
// palette drives the export: the coach's own gym theme, a specific box's preset
// (settings.boxThemes — the same key Afiliados' Aparência card writes, #59 step e),
// or "Personalizado" (device-local overrides). Only Personalizado shows the 8-role
// editor — everywhere else Cores is a read-only swatch strip, because the palette is
// resolved from the theme, not hand-picked (plans/82's whole point: 29/37 of the old
// 40 colours were an exact totk-dark token, hand-copied).
export default function OrigemCores({
  boxes,
  origin,
  onSelectOrigin,
  palette,
  custom,
  onCustomChange,
}) {
  const isCustom = origin === '__custom__'
  return (
    <div>
      <p className={s.grp}>Origem</p>
      <div className={s.originList} role="radiogroup" aria-label="Origem da cor">
        <button
          type="button"
          role="radio"
          aria-checked={origin === null}
          className={`${s.originBtn} ${origin === null ? s.on : ''}`}
          onClick={() => onSelectOrigin(null)}
        >
          Meu tema
        </button>
        {boxes.map(b => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={origin === b.id}
            className={`${s.originBtn} ${origin === b.id ? s.on : ''}`}
            onClick={() => onSelectOrigin(b.id)}
          >
            {b.name}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={isCustom}
          className={`${s.originBtn} ${isCustom ? s.on : ''}`}
          onClick={() => onSelectOrigin('__custom__')}
        >
          Personalizado
        </button>
      </div>

      <p className={s.grp}>Cores</p>
      {isCustom ? (
        EXPORT_ROLES.map(({ role, label }) => (
          <ColorField
            key={role}
            label={label}
            value={custom[role] || palette[role]}
            onChange={hex => onCustomChange(role, hex)}
            fallback={palette[role]}
          />
        ))
      ) : (
        <div className={s.originList}>
          {EXPORT_ROLES.map(({ role, label }) => (
            <div
              key={role}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px' }}
            >
              <span
                className={s.swatchDot}
                style={{ background: palette[role] }}
                aria-hidden="true"
              />
              <span style={{ fontSize: 10.5, color: 'var(--sub)', flex: 1 }}>{label}</span>
              <span style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>
                {palette[role]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
