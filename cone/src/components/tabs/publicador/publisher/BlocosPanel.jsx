import { BLOCK_TREATMENTS } from '../blockTreatments'
import s from '../Publicador.module.css'

// Blocos — the 5th Aparência panel (#59 · C5·b2 · plans/83 T5). One treatment +
// two content toggles, shared by Dia and Semana (the two formats whose blocks
// render as cards) — Dia mobile/Semana mobile keep their own established look
// (Eagles vs MegaMan is a structural difference, not a colour fork; see
// mobileExportViews.jsx), and Mês doesn't show blocks at all. Family
// block-colouring is DROPPED (plans/82) and never comes back here — every
// treatment keys off `--a-hdr` alone.
export default function BlocosPanel({ format, treatment, onTreatment, content, onToggleContent }) {
  const applies = format === 'dia' || format === 'semana'
  return (
    <div>
      <p className={s.grp}>Tratamento do bloco</p>
      {!applies && (
        <p className={s.hint} style={{ marginLeft: 0, marginBottom: 8 }}>
          vale para Dia e Semana — Dia mobile/Semana mobile têm visual próprio e Mês não mostra
          blocos.
        </p>
      )}
      <div className={s.originList} role="radiogroup" aria-label="Tratamento visual do bloco">
        {BLOCK_TREATMENTS.map(t => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={treatment === t.id}
            className={`${s.originBtn} ${treatment === t.id ? s.on : ''}`}
            onClick={() => onTreatment(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className={s.grp}>Conteúdo</p>
      <label
        className={s.originBtn}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          checked={content.intensity}
          onChange={() => onToggleContent('intensity')}
        />
        Intensidade / carga
      </label>
      <label
        className={s.originBtn}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}
      >
        <input type="checkbox" checked={content.notes} onChange={() => onToggleContent('notes')} />
        Observação do bloco
      </label>
    </div>
  )
}
