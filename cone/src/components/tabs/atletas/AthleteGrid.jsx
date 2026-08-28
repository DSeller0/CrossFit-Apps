import { useState } from 'react'
import { IconPlus, IconCheck, IconX, IconUsers } from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import AthleteCard from './AthleteCard.jsx'
import DayGroupHeader from './DayGroupHeader.jsx'
import s from './Atletas.module.css'

// The grade — the tab's landing view (#160/plans/76). Replaces the flat 220px
// AthleteList: athletes are grouped by their NEXT session (Hoje/Amanhã/a dated
// group/Sem sessão marcada) rather than alphabetically, because the coach's
// question opening this tab is "who do I need to talk to before the next class",
// not "who's on my roster" — that list is 12 names he already knows.
//
// `groups` is precomputed by the container (nextSessionGroups in
// atletasHelpers.js normally; the mobile signal-list view — Precisa de
// atenção/Próxima/Em dia — feeds this the same shape with `date`/`time` unset,
// so this component doesn't need to know which grouping it's showing).
//
// The add-athlete affordance moved here from the retired AthleteList (same
// draft-in-local-state shape — it's UI state, not tab state, so the container
// only ever hears a finished name).
// CLIENT-FREE.
export default function AthleteGrid({
  groups = [],
  signalsByAthlete = {},
  selectedId = null,
  onSelect,
  onAdd,
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

  const isEmpty = groups.every(g => g.athletes.length === 0)

  return (
    <div className={s.grid}>
      <div className={s.gridToolbar}>
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
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <IconPlus /> Novo atleta
          </Button>
        )}
      </div>

      <div className={s.gridScroll}>
        {isEmpty ? (
          <EmptyState
            icon={<IconUsers />}
            title="Nenhum atleta ainda"
            text="Cadastre o primeiro para acompanhar PRs, objetivos e sessões."
          />
        ) : (
          groups.map(g => (
            <div key={g.date ?? g.label} className={s.dayGroup}>
              <DayGroupHeader label={g.label} time={g.time} />
              <div className={s.cardsGrid}>
                {g.athletes.map(a => (
                  <AthleteCard
                    key={a.id}
                    athlete={a}
                    signals={signalsByAthlete[a.id]}
                    selected={selectedId === a.id}
                    onClick={() => onSelect?.(a.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
