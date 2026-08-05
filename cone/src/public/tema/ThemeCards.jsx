import { THEMES } from '../lib/theme.js'
import s from './Tema.module.css'

// The picker grid, split out of Tema.jsx so it is CLIENT-FREE and can render in the
// gallery — Tema.jsx itself imports supabaseClient for the gym name and settings, which
// the gallery has no backend for. Same split rail.jsx makes for index.html.

// ⚠️ themes.css scopes every palette to `html.theme-*`, so a preview nested inside the page
// CANNOT inherit that theme's tokens — all four previews have to render at once on a page
// that is itself only one theme. So each preview is painted by its own fixed-hex class,
// mirroring the per-theme values in themes.css. Same call, and the same reasoning, as
// Config.module.css's existing `.swatchTotkDark` set: these are identity colors (they must
// look identical whatever theme is active), which is the recorded exemption from
// tokenization — not drift. Keep them in sync with themes.css by hand if a palette moves.
const PREVIEW_CLASS = {
  'totk-dark': 'pvTotkDark',
  'totk-light': 'pvTotkLight',
  'spirit-blossom': 'pvSbDark',
  'spirit-blossom-light': 'pvSbLight',
}

export default function ThemeCards({ value, onPick }) {
  return (
    <div className={s.grid}>
      {THEMES.map(t => {
        const on = value === t.id
        return (
          <button
            key={t.id}
            type="button"
            className={`${s.card}${on ? ' ' + s.active : ''}`}
            aria-pressed={on}
            onClick={() => onPick(t.id)}
          >
            {/* A miniature of the page in that palette — background, a gold rule, two text
                rows and the accent. See PREVIEW_CLASS above for why it can't just inherit
                the theme's own tokens. */}
            <span className={`${s.preview} ${s[PREVIEW_CLASS[t.id]]}`} aria-hidden="true">
              <span className={s.pvBar} />
              <span className={s.pvRow} />
              <span className={`${s.pvRow} ${s.pvRowShort}`} />
              <span className={s.pvAccent} />
            </span>
            <span className={s.cardName}>{t.label}</span>
            {on && <span className={s.cardTag}>Em uso</span>}
          </button>
        )
      })}
    </div>
  )
}
