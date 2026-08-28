import { useState } from 'react'
import { IconCheck, IconTrophy } from '@tabler/icons-react'
import Modal from '../../ui/Modal.jsx'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import MaskedTimeInput from '../../../public/shared/MaskedTimeInput.jsx'
import { toSecs } from '../../../public/lib/wod.js'
import { prBest } from '../../../public/lib/goals.js'
import { prValueLabel } from './atletasHelpers.js'
import s from './Atletas.module.css'

// Log one result against an existing PR (#56/C2).
//
// A time PR now uses the shared `MaskedTimeInput` (#35/C0) instead of a raw text
// field with an "03:45" placeholder — this was one of the rollout sites #35's row
// named. `today` is injected rather than read from the clock (purity).
// CLIENT-FREE.
export default function AddResultModal({ open, pr, today, onSave, onClose }) {
  const [value, setValue] = useState('')
  const [date, setDate] = useState(today)
  const best = prBest(pr)
  const isTime = pr?.type === 'time'

  // A lower time wins; a higher load/rep count wins. No best yet ⇒ anything is a PR.
  const isPR =
    !!value &&
    (!best
      ? true
      : isTime
        ? toSecs(value) < toSecs(best.value)
        : Number(value) > Number(best.value))

  return (
    <Modal
      open={open}
      size="sm"
      title={`Registrar — ${pr?.name || ''}`}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="primary"
            disabled={!value}
            onClick={() => onSave?.({ value: isTime ? value : Number(value), date })}
          >
            <IconCheck /> Registrar
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      {best && <div className={s.readback}>Melhor atual: {prValueLabel(pr, best.value)}</div>}

      <div className={s.formGrid2}>
        {isTime ? (
          <MaskedTimeInput label="Tempo" value={value} onChange={setValue} autoFocus />
        ) : (
          <Input
            label={pr?.type === 'reps' ? 'Reps' : 'Carga'}
            type="number"
            inputMode="decimal"
            placeholder={pr?.type === 'reps' ? '25' : '120'}
            value={value}
            autoFocus
            onChange={e => setValue(e.target.value)}
          />
        )}
        <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {isPR && (
        <div className={s.prFlag}>
          <IconTrophy size={14} /> Novo PR!
        </div>
      )}
    </Modal>
  )
}
