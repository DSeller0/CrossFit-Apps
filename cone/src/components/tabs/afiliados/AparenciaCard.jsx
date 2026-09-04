import { THEMES } from '../../../public/lib/theme.js'
import s from './Afiliados.module.css'

// The per-box theme picker (#59 C5·b1 step e) — moved here from Configurações'
// "Tema por box" section, same `settings.value.boxThemes[locationId]` key
// (#143/plans/67), same reasoning for living on `settings` rather than the
// location row: `locations` is anon-locked (0006), so a public page could never
// read a theme stored there. Only rendered for a `type === 'box'` affiliate — a
// personal-service affiliate has no public schedule page for a theme to apply to.
//
// ⚠️ This is NOT only a Publicador export setting: resolveExportThemeId (plans/82)
// reads the SAME key for "Origem" in the Publicador tab, AND public pages resolve
// it via resolveTheme() for a `?box=<id>` visitor (#143). The hint line below says
// so on purpose — a coach adjusting this for a nicer PNG must know it also
// restyles that box's public schedule for everyone who opens its link.
export default function AparenciaCard({ loc, theme, onSetTheme }) {
  if (loc.type !== 'box') return null
  return (
    <div className={s.detailSection}>
      <h3 className={s.sectionTitle}>Aparência</h3>
      <label className={s.themeRow}>
        <span className={s.themeRowLbl}>Tema público</span>
        <select
          className={s.themeSel}
          value={theme || ''}
          onChange={e => onSetTheme(loc.id, e.target.value)}
        >
          <option value="">Usar o padrão da academia</option>
          {THEMES.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <p className={s.hint}>
        O tema que os atletas veem na grade pública deste box (link <code>?box=</code>) e a paleta
        que o Publicador usa quando este box é a Origem de um export.
      </p>
    </div>
  )
}
