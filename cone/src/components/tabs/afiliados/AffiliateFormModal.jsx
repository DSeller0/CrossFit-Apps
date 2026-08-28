import { useState } from 'react'
import { IconCheck } from '@tabler/icons-react'
import Modal from '../../ui/Modal.jsx'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import ColorField from '../../ui/ColorField.jsx'
import CurrencyInput from './CurrencyInput.jsx'
import s from './Afiliados.module.css'

// Create / edit an affiliate (#56/C2). Was ~240 lines of inline style objects with
// its own overlay, its own radii and its own greys.
//
// The rate half stays HERE and not on some future athlete-facing price field:
// `locations[].rate` is what the coach charges this box (money flows box → coach)
// and `publicador/billing.js` is its only consumer — plans/42 decision 2.
//
// ⚠️ `coachName` is kept, and labelled as a note rather than a link. It is written
// here and READ BY NOTHING (plans/42 decision 3) — #103 turns it into a real
// `settings.coaches[]` reference. Do not build more on it in the meantime.
//
// CLIENT-FREE.
export default function AffiliateFormModal({ open, editId, form, setF, onSave, onClose }) {
  // "Novo afiliado" opens on an empty name, so an unconditional error paints the
  // form red before the coach has typed anything. The disabled primary already says
  // the form isn't ready; the message waits until the field has been visited.
  const [touched, setTouched] = useState(false)

  return (
    <Modal
      open={open}
      title={editId ? 'Editar afiliado' : 'Novo afiliado'}
      onClose={onClose}
      footer={
        <Button variant="primary" full disabled={!form?.name?.trim()} onClick={onSave}>
          <IconCheck /> {editId ? 'Salvar alterações' : 'Adicionar afiliado'}
        </Button>
      }
    >
      <Input
        label="Nome"
        placeholder="ex: Box 01"
        value={form.name}
        onBlur={() => setTouched(true)}
        onChange={e => setF('name', e.target.value)}
        error={touched && !form.name?.trim() ? 'Informe um nome.' : ''}
      />

      <div>
        <span className={s.fieldLabel}>Tipo</span>
        <div className={s.seg} role="group" aria-label="Tipo de afiliado">
          {[
            ['box', 'Aula / Box'],
            ['personal', 'Personal'],
          ].map(([t, label]) => (
            <button
              key={t}
              type="button"
              className={`${s.segBtn}${form.type === t ? ' ' + s.segBtnOn : ''}`}
              aria-pressed={form.type === t}
              onClick={() => setF('type', t)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Coach responsável (opcional)"
        placeholder="ex: quem toca este box"
        value={form.coachName || ''}
        hint="Apenas uma anotação — ainda não vira acesso nem aparece no app."
        onChange={e => setF('coachName', e.target.value)}
      />

      <div className={s.rateRow}>
        <Input
          label="Moeda"
          value={form.currency}
          onChange={e => setF('currency', e.target.value)}
        />
        <CurrencyInput
          label="Taxa"
          currency={form.currency || 'R$'}
          value={form.rate || 0}
          onChange={v => setF('rate', v)}
        />
        <Input
          as="select"
          label="Por"
          value={form.rateUnit}
          onChange={e => setF('rateUnit', e.target.value)}
        >
          <option value="per_session">Sessão</option>
          <option value="per_hour">Hora</option>
        </Input>
      </div>

      <ColorField label="Cor" value={form.color} onChange={v => setF('color', v)} />
    </Modal>
  )
}
