import s from '../Publicador.module.css'

// The 5 export targets (#59 C5·b1 step d, plans/82 decision 9 — "story" is not used,
// and the two gym-named skins ("Eagles"/"MegaMan") disappear from the UI entirely).
// `diaMobile` reaches BOTH MobileEaglesExportView and MobileMegaManExportView now — the
// Layout panel's "modelo" choice (Clássico/Impacto, #59 C5·b2/plans/83) picks between them
// in renderArtefact.jsx, keeping the pair alive as a named axis rather than a dead 2nd path.
export const FORMATS = [
  {
    id: 'dia',
    label: 'Dia',
    w: 1920,
    h: 1080,
    ratio: 'r169',
    dest: 'tela da recepção, grupo do WhatsApp',
  },
  { id: 'semana', label: 'Semana', w: 1920, h: 1080, ratio: 'r169', dest: 'o quadro da semana' },
  { id: 'mes', label: 'Mês', w: 1920, h: 1080, ratio: 'r169', dest: 'planejamento, mural' },
  {
    id: 'diaMobile',
    label: 'Dia mobile',
    w: 1080,
    h: null,
    ratio: 'r19',
    dest: 'Stories · Reels · TikTok',
  },
  {
    id: 'semanaMobile',
    label: 'Semana mobile',
    w: 1080,
    h: null,
    ratio: 'r19',
    dest: 'post de feed / carrossel',
  },
]

export const isDayFormat = format => format === 'dia' || format === 'diaMobile'

export default function FormatRail({ format, onSelect }) {
  return (
    <div role="radiogroup" aria-label="Formato do export">
      {FORMATS.map(f => {
        const on = f.id === format
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={`${s.fmt} ${on ? s.on : ''}`}
            onClick={() => onSelect(f.id)}
          >
            <div className={s.fmtName}>
              <span className={`${s.ratio} ${s[f.ratio]}`} aria-hidden="true" />
              {f.label}
            </div>
            <div className={s.fmtDim}>{f.h ? `${f.w}×${f.h}` : `${f.w}×auto`}</div>
            {on && <div className={s.fmtDest}>{f.dest}</div>}
          </button>
        )
      })}
    </div>
  )
}
