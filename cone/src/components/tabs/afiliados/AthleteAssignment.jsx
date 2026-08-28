import { IconInfoCircle, IconUsers } from '@tabler/icons-react'
import EmptyState from '../../ui/EmptyState.jsx'
import s from './Afiliados.module.css'

// Which athletes belong to this affiliate. Membership is stored INVERTED, on
// `locations[].athleteIds` (plans/42) — this is the only editor for it.
//
// Gained a real zero-athletes state: with no athletes registered the old version
// rendered an empty <div>, so the pane looked broken rather than empty.
//
// CLIENT-FREE — `athletes` arrives as a prop (it was `loadAthletes()` inside the tab).
export default function AthleteAssignment({ loc, athletes = [], onToggle }) {
  const ids = loc.athleteIds || []

  return (
    <div>
      <h3 className={s.assignTitle}>Atletas vinculados</h3>

      {loc.type === 'box' && (
        <p className={s.assignNote}>
          <IconInfoCircle size={14} aria-hidden="true" />
          Atletas de aulas em grupo também entram automaticamente pelos resultados de cada aula.
        </p>
      )}

      {athletes.length === 0 ? (
        <EmptyState
          icon={<IconUsers />}
          title="Nenhum atleta cadastrado"
          text="Cadastre atletas na aba Atletas para vinculá-los a este afiliado."
        />
      ) : (
        <div className={s.assignList}>
          {athletes.map(a => {
            const checked = ids.includes(a.id)
            return (
              <label key={a.id} className={`${s.assignRow}${checked ? ' ' + s.assignRowOn : ''}`}>
                <input
                  type="checkbox"
                  className={s.assignCheck}
                  checked={checked}
                  style={{ accentColor: a.color || 'var(--accent)' }}
                  onChange={() => onToggle?.(loc.id, a.id)}
                />
                <span
                  className={s.dot}
                  style={{ background: a.color || 'var(--muted)' }}
                  aria-hidden="true"
                />
                <span className={s.assignName}>{a.name}</span>
                {a.level && <span className={s.assignLevel}>{a.level}</span>}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
