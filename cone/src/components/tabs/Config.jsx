import { useState } from 'react'
import { loadSettings, saveSettings, loadLocations } from '../../utils/storage'
import { THEMES, applyTheme, getAppliedTheme } from '../../public/lib/theme.js'
import Button from '../ui/Button'
import Input from '../ui/Input'
import s from './Config.module.css'

// THEMES itself is canonical in public/lib/theme.js since #143 (it was duplicated here, in
// gallery/fixtures.js and in the mockups). Only the swatch CLASS stays here — it is this
// stylesheet's concern, not the shared module's.
const SWATCH = {
  'totk-dark': 'swatchTotkDark',
  'totk-light': 'swatchTotkLight',
  'spirit-blossom': 'swatchSbDark',
  'spirit-blossom-light': 'swatchSbLight',
}

export default function ConfigTab() {
  const init = loadSettings()
  const [gymName, setGymName] = useState(init.gymName || '')
  const [gymSub, setGymSub] = useState(init.gymSub || '')
  const [label, setLabel] = useState(init.label || '')
  const [logo, setLogo] = useState(init.logo || '')
  const [flash, setFlash] = useState(false)
  const [theme, setTheme] = useState(getAppliedTheme)
  // #143 — the gym-wide default and the per-box overrides. Both live on `settings`, NOT on
  // the location row: `locations` is anon-locked (0006), so a public page could not read a
  // theme stored there at all. Same reasoning useBoxWarnings.js records for #53.
  const [gymTheme, setGymTheme] = useState(init.theme || '')
  const [boxThemes, setBoxThemes] = useState(init.boxThemes || {})
  const [boxes] = useState(() => loadLocations().filter(l => l.type === 'box'))

  const save = () => {
    saveSettings({
      ...loadSettings(),
      gymName: gymName.trim(),
      gymSub: gymSub.trim(),
      label: label.trim(),
      logo: logo.trim(),
      theme: gymTheme || undefined,
      boxThemes,
    })
    setFlash(true)
    setTimeout(() => setFlash(false), 2000)
  }

  const setBoxTheme = (id, val) =>
    setBoxThemes(prev => {
      const next = { ...prev }
      // An empty value means "inherit the gym default" — store nothing rather than an
      // empty string, so resolveTheme's isTheme() guard never has to special-case it.
      if (val) next[id] = val
      else delete next[id]
      return next
    })

  return (
    <div className={s.wrap}>
      <div className={s.section}>
        <div className={s.sectionTitle}>
          <i className="ti ti-building-community" /> Academia
        </div>

        <Input
          label="Nome da academia"
          value={gymName}
          onChange={e => setGymName(e.target.value)}
          placeholder="Ex: Team Medrado"
          hint="Aparece no hub público e no leaderboard."
        />

        <Input
          label="Modalidade"
          value={gymSub}
          onChange={e => setGymSub(e.target.value)}
          placeholder="Ex: Cross Training"
          hint="Subtítulo exibido na página inicial (padrão: Cross Training)."
        />

        <Input
          label="Subtítulo / label"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Ex: Box Zona Sul"
          hint="Linha secundária usada nos relatórios exportados."
        />

        <Input
          label="URL do logo"
          value={logo}
          onChange={e => setLogo(e.target.value)}
          placeholder="https://..."
          hint="Imagem exibida na agenda e nos exports PDF."
        />

        {logo && (
          <div className={s.logoPreview}>
            <img
              src={logo}
              alt="Preview do logo"
              onError={e => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>
          <i className="ti ti-palette" /> Meu tema
        </div>
        {/* Unchanged behaviour: device-local, applies instantly, deliberately bypasses
            Salvar. It only needed a name once #143 made it one of three things. */}
        <p className={s.hint}>Vale só para este aparelho. Não muda o que os atletas veem.</p>
        <div className={s.themeGrid}>
          {THEMES.map(t => (
            <button
              key={t.id}
              type="button"
              className={`${s.themeBtn}${theme === t.id ? ' ' + s.active : ''}`}
              aria-pressed={theme === t.id}
              onClick={() => setTheme(applyTheme(t.id))}
            >
              <span className={`${s.swatch} ${s[SWATCH[t.id]]}`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>
          <i className="ti ti-building-store" /> Tema por box
        </div>
        <p className={s.hint}>
          O tema que os atletas veem nas páginas públicas. Quem já escolheu um tema no próprio
          aparelho continua com o dele.
        </p>

        <label className={s.themeRow}>
          <span className={s.themeRowLbl}>Padrão da academia</span>
          <select
            className={s.themeSel}
            value={gymTheme}
            onChange={e => setGymTheme(e.target.value)}
          >
            <option value="">TotK Dark (padrão)</option>
            {THEMES.map(t => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {boxes.length === 0 ? (
          <p className={s.hint}>Nenhum box cadastrado ainda — crie um em Serviços.</p>
        ) : (
          boxes.map(b => (
            <label key={b.id} className={s.themeRow}>
              <span className={s.themeRowLbl}>{b.name || 'Box sem nome'}</span>
              <select
                className={s.themeSel}
                value={boxThemes[b.id] || ''}
                onChange={e => setBoxTheme(b.id, e.target.value)}
              >
                <option value="">Usar o padrão da academia</option>
                {THEMES.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ))
        )}
      </div>

      <div className={s.saveRow}>
        <Button variant="primary" onClick={save} style={{ minWidth: 120 }}>
          {flash ? (
            <>
              <i className="ti ti-check" /> Salvo
            </>
          ) : (
            <>
              <i className="ti ti-device-floppy" /> Salvar
            </>
          )}
        </Button>
        {flash && <span className={s.flash}>Configurações salvas e sincronizadas.</span>}
      </div>
    </div>
  )
}
