import { useState } from 'react'
import { IconPlus, IconTrash, IconCheck } from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import { snapPct } from './atletasHelpers.js'
import s from './Atletas.module.css'

// The goal editor (#56/C2). Holds a draft and commits on Salvar, so Cancelar
// really cancels — the same contract Criador's SessionMetaModal settled on.
// Every field is the C0 `Input` (real <label htmlFor>, one focus ring) instead of
// `.fg`/`.lbl`/`.ex-input`. CLIENT-FREE.
const MAX_MILESTONES = 5

export default function GoalConfigPanel({ goal, onSave, onCancel }) {
  const [name, setName] = useState(goal.name || '')
  const [total, setTotal] = useState(goal.totalSessions || 10)
  const [done, setDone] = useState(goal.completedSessions || 0)
  const [milestones, setMs] = useState(goal.milestones || [])

  const updM = (i, field, value) =>
    setMs(ms => ms.map((m, mi) => (mi === i ? { ...m, [field]: value } : m)))

  return (
    <div className={s.form}>
      <div className={s.formGrid2}>
        <Input label="Nome" value={name} onChange={e => setName(e.target.value)} />
        <Input
          label="Total de sessões"
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          value={total}
          onChange={e => setTotal(parseInt(e.target.value) || 1)}
        />
      </div>

      <Input
        label="Sessões completadas"
        type="number"
        inputMode="numeric"
        min={0}
        max={total}
        value={done}
        hint={`de ${total}`}
        onChange={e => setDone(Math.min(total, Math.max(0, parseInt(e.target.value) || 0)))}
      />

      <div>
        <div className={s.secHdr}>
          <h3 className={s.secTitle}>Marcos (máx. {MAX_MILESTONES})</h3>
          {milestones.length < MAX_MILESTONES && (
            <Button
              variant="secondary"
              size="xs"
              iconOnly
              aria-label="Adicionar marco"
              onClick={() => setMs(ms => [...ms, { label: '', pct: 50, hit: false }])}
            >
              <IconPlus />
            </Button>
          )}
        </div>

        {milestones.length === 0 ? (
          <div className={s.msEmpty}>Nenhum marco. O objetivo funciona sem eles.</div>
        ) : (
          milestones.map((m, i) => (
            <div key={i} className={s.msEditRow}>
              <Input
                label={`Marco ${i + 1}`}
                placeholder="Descrição…"
                value={m.label}
                onChange={e => updM(i, 'label', e.target.value)}
              />
              <Input
                label="%"
                className={s.msEditPct}
                type="number"
                inputMode="numeric"
                min={10}
                max={100}
                step={10}
                value={snapPct(m.pct)}
                onChange={e => updM(i, 'pct', snapPct(parseInt(e.target.value) || 10))}
              />
              <Button
                variant="destructive"
                size="sm"
                iconOnly
                aria-label={`Remover marco ${i + 1}`}
                onClick={() => setMs(ms => ms.filter((_, mi) => mi !== i))}
              >
                <IconTrash />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className={s.formActions}>
        <Button
          variant="primary"
          onClick={() =>
            onSave({ ...goal, name, totalSessions: total, completedSessions: done, milestones })
          }
        >
          <IconCheck /> Salvar
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
