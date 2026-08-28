import { useState } from 'react'
import { IconPlus, IconCheck, IconX, IconChevronRight, IconUsers } from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import { combinedPct, DEFAULT_ATHLETE_COLOR } from './atletasHelpers.js'
import s from './Atletas.module.css'

// The athlete list — pane 1 on desktop, the whole first screen on mobile (#56/C2).
//
// Each row was a click-`<div>` with no keyboard path; it is a real <button> now, so
// Enter/Space work and the focus ring lands where the selection does. The add form
// keeps its own state (it is UI state, not tab state) so this renders standalone in
// the gallery — the container only ever hears about a finished name.
//
// CLIENT-FREE: everything arrives as props, no utils/storage import.
export default function AthleteList({
  athletes = [],
  goalsByAthlete = {},
  selectedId = null,
  onSelect,
  onAdd,
  showChevron = false,
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const cancel = () => {
    setAdding(false)
    setName('')
  }
  const commit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd?.(trimmed)
    cancel()
  }

  const addButton = (
    <Button variant="secondary" full onClick={() => setAdding(true)}>
      <IconPlus /> Novo atleta
    </Button>
  )

  return (
    <div className={s.list}>
      <div className={s.listScroll}>
        {athletes.length === 0 ? (
          // The affordance is in the empty state, not only in the footer below it —
          // an empty list's one job is to say how to stop being empty.
          <EmptyState
            icon={<IconUsers />}
            title="Nenhum atleta ainda"
            text="Cadastre o primeiro para acompanhar PRs, objetivos e sessões."
            action={
              !adding && (
                <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
                  <IconPlus /> Novo atleta
                </Button>
              )
            }
          />
        ) : (
          athletes.map(a => {
            const pct = combinedPct(goalsByAthlete[a.id])
            const isSel = selectedId === a.id
            const col = a.color || DEFAULT_ATHLETE_COLOR
            return (
              <button
                key={a.id}
                type="button"
                className={`${s.row}${isSel ? ' ' + s.rowOn : ''}`}
                style={{ borderLeftColor: isSel ? col : 'transparent' }}
                aria-current={isSel ? 'true' : undefined}
                onClick={() => onSelect?.(a.id)}
              >
                <span className={s.dot} style={{ background: col }} />
                <span className={s.rowName}>{a.name}</span>
                {pct !== null && <span className={s.rowPct}>{pct}%</span>}
                {showChevron && <IconChevronRight className={s.rowChev} size={14} />}
              </button>
            )
          })
        )}
      </div>

      <div className={s.listFoot}>
        {adding ? (
          <div className={s.addRow}>
            <Input
              autoFocus
              label="Nome"
              placeholder="Nome do atleta…"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') cancel()
              }}
            />
            <Button
              variant="primary"
              iconOnly
              aria-label="Adicionar atleta"
              disabled={!name.trim()}
              onClick={commit}
            >
              <IconCheck />
            </Button>
            <Button variant="secondary" iconOnly aria-label="Cancelar" onClick={cancel}>
              <IconX />
            </Button>
          </div>
        ) : (
          athletes.length > 0 && addButton
        )}
      </div>
    </div>
  )
}
