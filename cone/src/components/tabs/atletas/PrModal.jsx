import { useState } from 'react'
import { IconCheck } from '@tabler/icons-react'
import Modal from '../../ui/Modal.jsx'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import MaskedTimeInput from '../../../public/shared/MaskedTimeInput.jsx'
import { ECOL } from '../../../utils/config'
import s from './Atletas.module.css'

// Create or edit a PR (#56/C2).
//
// ⚠️ The exercise combobox arrives as a NODE prop, not an import. The one
// `ExerciseCombobox` reads the registry through `loadRegistry()` (utils/storage →
// the SPA Supabase client), so importing it here would make this modal impossible
// to render in the client-free gallery. Same treatment `SessionTextPane` gives its
// type picker, and for the same reason. The container owns the name state (it needs
// it to resolve `categories` via #62's resolver) and passes both down.
//
//   combobox    the wired <ExerciseCombobox> node (or any name field)
//   categories  resolved block families for the typed name — DATA colours via ECOL
//   onSave      ({ type, unit, target, value, date }) — the container assembles the
//               full PR, since it owns id/name/categories/results
// CLIENT-FREE.
const TYPES = [
  ['load', 'Carga'],
  ['time', 'Tempo'],
  ['reps', 'Reps'],
]

export default function PrModal({
  open,
  editPr = null,
  combobox,
  categories = [],
  today,
  onSave,
  onClose,
  nameFilled = false,
}) {
  const isEdit = !!editPr
  const [type, setType] = useState(editPr?.type || 'load')
  const [unit, setUnit] = useState(editPr?.unit || 'kg')
  const [target, setTarget] = useState(editPr?.target ?? '')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(today)

  const isTime = type === 'time'
  const canSave = nameFilled && (isEdit || !!value)

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar PR' : 'Registrar PR'}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="primary"
            disabled={!canSave}
            onClick={() =>
              onSave?.({
                type,
                unit: type === 'load' ? unit : null,
                target: target === '' ? null : isTime ? target : Number(target),
                value: isEdit ? null : isTime ? value : Number(value),
                date,
              })
            }
          >
            <IconCheck /> Salvar
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <div>
        <span className={s.secTitle}>Exercício / WOD</span>
        {combobox}
      </div>

      {categories.length > 0 && (
        <div className={s.catTags}>
          {categories.map(bt => (
            <span
              key={bt}
              className={s.catTag}
              /* Block-family colours identify the family — DATA colours, #15-exempt. */
              style={{
                background: ECOL[bt]?.bg || 'var(--stone)',
                color: ECOL[bt]?.text || 'var(--muted)',
                border: `1px solid ${ECOL[bt]?.text || 'var(--divider)'}44`,
              }}
            >
              {bt}
            </span>
          ))}
        </div>
      )}

      <div>
        <span className={s.secTitle}>Tipo</span>
        <div className={s.seg} role="group" aria-label="Tipo de PR">
          {TYPES.map(([t, label]) => (
            <button
              key={t}
              type="button"
              className={`${s.segBtn}${type === t ? ' ' + s.segBtnOn : ''}`}
              aria-pressed={type === t}
              onClick={() => setType(t)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!isEdit && (
        <div className={s.formGrid2}>
          {isTime ? (
            <MaskedTimeInput label="Tempo" value={value} onChange={setValue} />
          ) : (
            <Input
              label={type === 'reps' ? 'Reps' : 'Carga'}
              type="number"
              inputMode="decimal"
              placeholder={type === 'reps' ? '25' : '120'}
              value={value}
              onChange={e => setValue(e.target.value)}
            />
          )}
          {type === 'load' && (
            <div>
              <span className={s.secTitle}>Unidade</span>
              <div className={s.seg} role="group" aria-label="Unidade de carga">
                {['kg', 'lb'].map(u => (
                  <button
                    key={u}
                    type="button"
                    className={`${s.segBtn}${unit === u ? ' ' + s.segBtnOn : ''}`}
                    aria-pressed={unit === u}
                    onClick={() => setUnit(u)}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isTime ? (
        <MaskedTimeInput
          label="Meta (opcional)"
          value={target}
          onChange={setTarget}
          hint="tempo alvo"
        />
      ) : (
        <Input
          label="Meta (opcional)"
          type="number"
          inputMode="decimal"
          placeholder={type === 'reps' ? '30' : '140'}
          value={target}
          onChange={e => setTarget(e.target.value)}
        />
      )}

      {!isEdit && (
        <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
      )}
    </Modal>
  )
}
