import { useRef, useState } from 'react'
import { loadSettings, saveSettings } from '../../utils/storage'
import { useSync } from '../../context/SyncContext'
import { APP_CONFIG } from '../../utils/config'
import { THEMES, applyTheme, getAppliedTheme } from '../../public/lib/theme.js'
import {
  buildSnapshot,
  stateFileName,
  parseStateFile,
  downloadSnapshot,
  applyState,
} from './config/stateBackup.js'
import Button from '../ui/Button'
import Input from '../ui/Input'
import ConfirmReview from '../../public/shared/ConfirmReview'
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
  // #143 — the gym-wide default. Lives on `settings`, NOT on the location row:
  // `locations` is anon-locked (0006), so a public page could not read a theme
  // stored there at all. Same reasoning useBoxWarnings.js records for #53.
  // ⚠️ The PER-BOX overrides moved to Afiliados' Aparência card (#59 C5·b1 step e) —
  // same `settings.value.boxThemes` key, written from that tab's own mutator. Do
  // NOT reintroduce them here: this component doesn't hold `boxThemes` at all any
  // more, so `save()` below can't accidentally write a stale copy over what
  // Afiliados just saved.
  const [gymTheme, setGymTheme] = useState(init.theme || '')

  // ── Dados (#95/plans/69) — Salvar/Carregar/Limpar estado, relocated here from
  // the App.jsx chrome. sessions/setSessions/setEvents come straight from
  // useSync() rather than storage's loadLS() — Config renders inside SyncProvider,
  // and the live in-memory value is what a coach mid-edit actually expects backed up.
  const { sessions, setSessions, setEvents } = useSync()
  const [saveFileName, setSaveFileName] = useState('')
  const [showSaveName, setShowSaveName] = useState(false)
  const fileInputRef = useRef(null)
  const [dataMsg, setDataMsg] = useState(null) // { text, err } | null
  const [pendingClear, setPendingClear] = useState(false)

  const flashData = (text, err = false) => {
    setDataMsg({ text, err })
    setTimeout(() => setDataMsg(null), 2800)
  }

  const doSaveState = () => {
    downloadSnapshot(buildSnapshot(sessions), stateFileName(saveFileName, APP_CONFIG.gymName))
    setSaveFileName('')
    setShowSaveName(false)
    flashData('Estado salvo — compartilhe o arquivo .json com o professor.')
  }

  const doLoadState = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const { needsReload } = applyState(parseStateFile(ev.target.result), {
          setSessions,
          setEvents,
        })
        flashData('Estado carregado com sucesso.')
        if (needsReload) setTimeout(() => window.location.reload(), 300)
      } catch {
        flashData('Não foi possível carregar o arquivo — verifique se é um .json válido.', true)
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  const doClearState = () => {
    setSessions({})
    setPendingClear(false)
    flashData('Estado limpo.')
  }

  const save = () => {
    saveSettings({
      ...loadSettings(),
      gymName: gymName.trim(),
      gymSub: gymSub.trim(),
      label: label.trim(),
      logo: logo.trim(),
      theme: gymTheme || undefined,
    })
    setFlash(true)
    setTimeout(() => setFlash(false), 2000)
  }

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
          <i className="ti ti-building-store" /> Tema da academia
        </div>
        <p className={s.hint}>
          O tema que os atletas veem nas páginas públicas por padrão. Quem já escolheu um tema no
          próprio aparelho continua com o dele.
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

        {/* The per-box overrides moved to each affiliate's own Aparência card
            (#59 C5·b1 step e) — same settings.value.boxThemes key, one mutator,
            written straight from Afiliados rather than bundled into Salvar here. */}
        <p className={s.hint}>
          O tema de um box específico agora se configura na ficha desse box, em Afiliados → Meus
          afiliados.
        </p>
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

      {/* Dados stays AFTER .saveRow, not among the three form sections above — `save()`
          only persists gym+tema, so a backup section placed above the footer would read
          as part of that form. This one is a separate concern: export/import the whole
          app state as a .json file, independent of Salvar. */}
      <div className={s.section}>
        <div className={s.sectionTitle}>
          <i className="ti ti-database" /> Dados
        </div>
        <p className={s.hint}>Backup em arquivo .json. Não depende do Salvar acima.</p>

        <div className={s.dataRow}>
          {showSaveName ? (
            <>
              <Input
                label="Nome do arquivo (opcional)"
                value={saveFileName}
                onChange={e => setSaveFileName(e.target.value)}
                placeholder={stateFileName('', APP_CONFIG.gymName)}
                onKeyDown={e => {
                  if (e.key === 'Enter') doSaveState()
                  if (e.key === 'Escape') {
                    setShowSaveName(false)
                    setSaveFileName('')
                  }
                }}
                autoFocus
              />
              <Button variant="secondary" onClick={doSaveState}>
                <i className="ti ti-check" /> Confirmar
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowSaveName(false)
                  setSaveFileName('')
                }}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setShowSaveName(true)}>
              <i className="ti ti-download" /> Salvar estado
            </Button>
          )}
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <i className="ti ti-folder-open" /> Carregar estado
          </Button>
          <Button variant="destructive" onClick={() => setPendingClear(true)}>
            <i className="ti ti-trash" /> Limpar estado
          </Button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept=".json,application/json"
          onChange={doLoadState}
          style={{ display: 'none' }}
        />

        {dataMsg && <p className={dataMsg.err ? s.dataErr : s.hint}>{dataMsg.text}</p>}
      </div>

      <ConfirmReview
        open={pendingClear}
        title="Limpar estado"
        editLabel="Cancelar"
        confirmLabel="Limpar"
        onEdit={() => setPendingClear(false)}
        onClose={() => setPendingClear(false)}
        onConfirm={doClearState}
      >
        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.5 }}>
          Apaga <strong style={{ color: 'var(--cream)' }}>todos os treinos</strong> salvos. A
          mudança <strong style={{ color: 'var(--cream)' }}>sincroniza para o servidor</strong> e
          vale para todos os aparelhos. Atletas, resultados e o catálogo de exercícios não são
          afetados.
        </div>
      </ConfirmReview>
    </div>
  )
}
