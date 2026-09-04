import s from '../Publicador.module.css'

// The 5 export targets (#59 C5·b1 step d, plans/82 decision 9 — "story" is not used,
// and the two gym-named skins ("Eagles"/"MegaMan") disappear from the UI entirely).
// ⚠️ `diaMobile` currently always renders MobileEaglesExportView. `MobileMegaManExportView`
// is unchanged and still exported from mobileExportViews.jsx, but nothing in b1 reaches
// it — plans/83's "Dia mobile pair" section is where a modelo picker (or a deletion)
// puts it back within reach. Not a data loss: no capability that WRITES anything is
// gone, only a second READ path, and only until b2.
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
