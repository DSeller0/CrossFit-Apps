import { useState } from 'react'
import { IconCheck, IconTrash } from '@tabler/icons-react'
import Modal from '../../ui/Modal.jsx'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import ColorField from '../../ui/ColorField.jsx'
import { DEFAULT_ATHLETE_COLOR } from './atletasHelpers.js'
import s from './Atletas.module.css'

// The athlete profile form (#56/C2). Was the `.settings-overlay`/`.settings-modal`/
// `.settings-drag-hdr` shell with `.fg`/`.lbl`/`.ex-input` fields and a mouse-only
// colour proxy (`<div onClick={() => document.getElementById('ath-clr').click()}>`).
// Now: the C0 `Modal` (focus trap, Escape, restore) + `Input` + `ColorField`.
// CLIENT-FREE — levels/goals arrive as props rather than from APP_CONFIG.
export default function AthleteProfileModal({
  open,
  form,
  onChange,
  levels = [],
  goals = [],
  onSave,
  onDelete,
  onClose,
  saved = false,
}) {
  const set = (field, value) => onChange?.(field, value)
  // The modal opens straight after "Novo atleta" with the name pre-filled, but it
  // can be cleared — the message waits until the field has been visited rather than
  // painting the form red on open. The disabled primary carries the state meanwhile.
  const [touched, setTouched] = useState(false)

  return (
    <Modal
      open={open}
      title="Perfil do atleta"
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" disabled={!form?.name?.trim()} onClick={onSave}>
            <IconCheck /> {saved ? 'Salvo' : 'Salvar'}
          </Button>
          <Button
            variant="destructive"
            iconOnly
            aria-label={`Remover ${form?.name || 'atleta'}`}
            onClick={onDelete}
          >
            <IconTrash />
          </Button>
        </>
      }
    >
      <Input
        label="Nome"
        value={form?.name || ''}
        onBlur={() => setTouched(true)}
        onChange={e => set('name', e.target.value)}
        error={touched && !form?.name?.trim() ? 'Informe um nome.' : ''}
      />

      <div className={s.formGrid2}>
        <Input
          as="select"
          label="Nível"
          value={form?.level || ''}
          onChange={e => set('level', e.target.value)}
        >
          {levels.map(l => (
            <option key={l}>{l}</option>
          ))}
        </Input>
        <Input
          as="select"
          label="Objetivo"
          value={form?.goal || ''}
          onChange={e => set('goal', e.target.value)}
        >
          {goals.map(g => (
            <option key={g}>{g}</option>
          ))}
        </Input>
      </div>

      <Input
        label="Observações"
        placeholder="ex: Joelho direito"
        value={form?.notes || ''}
        onChange={e => set('notes', e.target.value)}
      />

      <div className={s.formGrid2}>
        <ColorField
          label="Cor"
          value={form?.color || ''}
          fallback={DEFAULT_ATHLETE_COLOR}
          onChange={v => set('color', v)}
        />
        <Input
          label="Membro desde"
          type="date"
          value={form?.since || ''}
          onChange={e => set('since', e.target.value)}
        />
      </div>
    </Modal>
  )
}
