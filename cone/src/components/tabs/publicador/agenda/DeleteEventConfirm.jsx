import { useState } from 'react'
import ConfirmReview, { ReadBox, ReadRow } from '../../../../public/shared/ConfirmReview.jsx'
import { dayTitleShort, seriesScopes } from './agendaHelpers.js'
import s from './Agenda.module.css'

// ── DeleteEventConfirm (#59 C5·a step d + #106) ──────────────────────────────
//
// Replaces `window.confirm('Remover este evento?')` — a destructive action with no
// review, no focus trap and no theme — with the app's one dialog shell.
//
// #106 rides along, and this is why it was worth taking: `recurrenceGroup` has been
// WRITTEN by the recurrence expander since it shipped and never read back, so
// deleting a generated quarter meant ~13 separate deletes. The whole fix is a scope
// choice inside a dialog that had to exist anyway.
//
// ⚠️ The scope picker appears ONLY when there is a real series (2+ events) — a
// one-item scope list is noise, so a standalone event sees the plain confirm.
// ⚠️ Scope covers DELETE and EDIT, never the status toggle: "this and following"
// over a state that describes the past would be a false claim.

const SCOPE_LABELS = {
  one: 'Só este evento',
  following: 'Este e os seguintes',
  all: 'Toda a série',
}

export default function DeleteEventConfirm({ target, events, onCancel, onConfirm }) {
  const [scope, setScope] = useState('one')
  if (!target) return null

  const { ev, iso } = target
  const scopes = seriesScopes(events, ev)
  const n = scopes ? scopes.counts[scope] : 1

  return (
    <ConfirmReview
      open
      title="Excluir evento"
      editLabel="Cancelar"
      confirmLabel={n > 1 ? `Excluir ${n} eventos` : 'Excluir'}
      onEdit={onCancel}
      onClose={onCancel}
      onConfirm={() => onConfirm(scopes ? scopes[scope] : [{ ...ev, date: iso }])}
    >
      <ReadBox title={ev.label || (ev.type === 'personal' ? 'Personal' : 'Aula')}>
        <ReadRow label="Quando" value={`${dayTitleShort(iso)} · ${ev.time}`} />
        <ReadRow label="Tipo" value={ev.type === 'personal' ? 'Personal' : 'Aula'} />
        {scopes && (
          <ReadRow
            label="Série"
            value={`${scopes.counts.all} eventos · ${scopes.span.from.slice(8)}/${scopes.span.from.slice(5, 7)} a ${scopes.span.to.slice(8)}/${scopes.span.to.slice(5, 7)}`}
          />
        )}
      </ReadBox>

      {scopes && (
        <div className={s.scopeList} role="radiogroup" aria-label="O que excluir">
          {['one', 'following', 'all'].map(k => (
            <label key={k} className={`${s.scopeOpt}${scope === k ? ' ' + s.on : ''}`}>
              <input
                type="radio"
                name="deleteScope"
                checked={scope === k}
                onChange={() => setScope(k)}
              />
              {SCOPE_LABELS[k]}
              <span className={s.scopeN}>{scopes.counts[k]}</span>
            </label>
          ))}
        </div>
      )}
    </ConfirmReview>
  )
}
