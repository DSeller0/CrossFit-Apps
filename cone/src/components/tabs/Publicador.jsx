import { useEffect, useRef, useState } from 'react'
import {
  loadAthletes,
  loadSettings,
  saveSettings,
  matchesAthlete,
  toISO,
} from '../../utils/storage'
import { APP_CONFIG } from '../../utils/config'
import { getWeeksOfMonth } from './publicador/exportHelpers'
import {
  resolveExportThemeId,
  resolveExportPalette,
  legacyColorsToCustom,
  hasNonDefaultLegacyColors,
} from './publicador/exportPalette'
import {
  getExportSource,
  setExportSource,
  getExportCustom,
  setExportCustom,
} from './publicador/exportSource'
import Button from '../ui/Button'
import Input from '../ui/Input'
import EmptyState from '../ui/EmptyState'
import ConfirmReview, { ReadRow } from '../../public/shared/ConfirmReview'
import PresenterLauncher from './publicador/publisher/PresenterLauncher'
import WhenPicker from './publicador/publisher/WhenPicker'
import FormatRail, { FORMATS, isDayFormat } from './publicador/publisher/FormatRail'
import PreviewPane from './publicador/publisher/PreviewPane'
import AparenciaPanel from './publicador/publisher/AparenciaPanel'
import ExportFarm from './publicador/publisher/ExportFarm'
import { ExportErrorState } from './publicador/publisher/ExportStates'
import { MONTH_PT } from '../../public/lib/week.js'
import s from './publicador/Publicador.module.css'

const gymSlugOf = name =>
  (name || APP_CONFIG.gymName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'grade'
const padD = n => String(n).padStart(2, '0')
const DAY_EN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const MONTH_EN3 = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

function fmtBytes(n) {
  if (!n) return ''
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

// ── SchedulePublisher (default export) ───────────────────────────────────────
function SchedulePublisher({ sessions, locations }) {
  const logoInputRef = useRef()
  const previewRef = useRef()

  const [format, setFormat] = useState('semana')
  const [gymName, setGymName] = useState(loadSettings().gymName || '')
  const [label, setLabel] = useState(loadSettings().label || '')
  const [filterAthlete, setFilterAthlete] = useState(null)
  const [logoDataUrl, setLogoDataUrl] = useState(null)
  const [logoScale, setLogoScale] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const _savedSettings = loadSettings()
  const [exportScale, setExportScale] = useState(_savedSettings.exportScale || 2)
  const [fontScale, setFontScale] = useState(_savedSettings.fontScale ?? 1.5)
  const [zoneScales, setZoneScales] = useState(_savedSettings.zoneScales || [1, 1, 1])
  const [blockTitleScales, setBlockTitleScales] = useState(
    _savedSettings.blockTitleScales || [1, 1, 1],
  )
  const [presenterOpen, setPresenterOpen] = useState(false)

  // ── The colour model (#59 C5·b1 step c/d, plans/82) — device-local, never in
  // `settings`. `origin` is 'tema' (the coach's own resolveTheme) | a locationId
  // (settings.boxThemes[id]) | '__custom__' (Personalizado, the `custom` overrides).
  const [origin, setOrigin] = useState(() => getExportSource() ?? 'tema')
  const [custom, setCustom] = useState(() => getExportCustom())
  const [pendingOrigin, setPendingOrigin] = useState(null)
  // The one-time legacy-colour import offer: only when the device has never touched
  // Origem (a fresh `cone_export_source`) AND the settings blob's old dv*/wk*/ea*/mm*
  // keys diverge from totk-dark somewhere. Read once, not on every render — the legacy
  // keys never change from inside this pass (they are no longer written).
  const [migrationOffer] = useState(
    () => getExportSource() === null && hasNonDefaultLegacyColors(_savedSettings),
  )
  const [migrationDismissed, setMigrationDismissed] = useState(false)
  const [downloadPrompt, setDownloadPrompt] = useState(null) // { url, filename, bytes } | null

  const boxes = (locations || []).filter(l => l.type === 'box')

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0)
  const hasAny = Object.values(sessions).some(arr => arr.length > 0)

  // #142's fix, unchanged shape: spread the current blob so a field this component
  // doesn't know about (boxWarnings, gymSub, theme…) survives the write, and skip the
  // mount-firing first run so merely opening the tab doesn't re-upsert the blob.
  // ⚠️ Colour fields are NOT listed here any more — they live in localStorage
  // (exportSource.js), not `settings` (plans/82's colour model).
  const settingsMounted = useRef(false)
  useEffect(() => {
    if (!settingsMounted.current) {
      settingsMounted.current = true
      return
    }
    saveSettings({
      ...loadSettings(),
      fontScale,
      zoneScales,
      blockTitleScales,
      gymName,
      label,
      exportScale,
    })
  }, [fontScale, zoneScales, blockTitleScales, gymName, label, exportScale])

  const handleLogoUpload = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoDataUrl(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const defaultWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    const dow = d.getDay()
    d.setDate(d.getDate() - dow + i)
    return d
  })
  const currentWeekDates = selectedWeek || defaultWeek

  const filteredSessions = filterAthlete
    ? Object.fromEntries(
        Object.entries(sessions).map(([k, v]) => [
          k,
          v.filter(s => matchesAthlete(s, filterAthlete.name)),
        ]),
      )
    : sessions

  const exportThemeId = resolveExportThemeId({
    settings: _savedSettings,
    box: origin === 'tema' || origin === '__custom__' ? null : origin,
  })
  const exportPalette = resolveExportPalette({
    themeId: exportThemeId,
    custom: origin === '__custom__' ? custom : null,
  })

  function selectOrigin(next) {
    if (origin === '__custom__' && next !== '__custom__' && Object.keys(custom).length > 0) {
      setPendingOrigin(next)
      return
    }
    setOrigin(next)
    setExportSource(next)
  }
  function confirmSwitchAway() {
    setCustom({})
    setExportCustom({})
    setOrigin(pendingOrigin)
    setExportSource(pendingOrigin)
    setPendingOrigin(null)
  }
  function customChange(role, hex) {
    const next = { ...custom, [role]: hex }
    setCustom(next)
    setExportCustom(next)
  }
  function importLegacy() {
    const next = legacyColorsToCustom(_savedSettings)
    setCustom(next)
    setExportCustom(next)
    setOrigin('__custom__')
    setExportSource('__custom__')
    setMigrationDismissed(true)
  }
  function resetAparencia() {
    setCustom({})
    setExportCustom({})
    setOrigin('tema')
    setExportSource('tema')
    setFontScale(1.5)
    setExportScale(2)
    setZoneScales([1, 1, 1])
    setBlockTitleScales([1, 1, 1])
  }

  function handleDayClick(week, date) {
    setSelectedWeek(week)
    setSelectedDate(toISO(date))
  }
  function selectWeek(wi, week) {
    setSelectedWeekIdx(wi)
    setSelectedWeek(week)
  }

  function filename() {
    const gymSlug = gymSlugOf(gymName)
    if (format === 'dia' || format === 'diaMobile') {
      const dateStr = selectedDate || toISO(currentWeekDates[1])
      const d = new Date(dateStr + 'T12:00:00')
      const prefix = format === 'diaMobile' ? 'mobile-treino' : 'treino'
      return `${gymSlug}-${prefix}-${DAY_EN[d.getDay()]}-${padD(d.getDate())}${padD(d.getMonth() + 1)}${d.getFullYear()}.png`
    }
    if (format === 'semana' || format === 'semanaMobile') {
      const wk = getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates
      const prefix = format === 'semanaMobile' ? 'mobile-semanal' : 'semanal'
      return `${gymSlug}-${prefix}-${padD(wk[1].getDate())}${padD(wk[1].getMonth() + 1)}to${padD(wk[5].getDate())}${padD(wk[5].getMonth() + 1)}.png`
    }
    return `${gymSlug}-calendario-${MONTH_EN3[month]}-${year}.png`
  }

  async function generateAndPrompt() {
    if (exporting) return
    setExportError(false)
    setExporting(true)
    const el = previewRef.current
    if (!el) {
      setExporting(false)
      return
    }
    await new Promise(r => setTimeout(r, 250))
    try {
      const html2canvas = (await import('html2canvas')).default
      const dims = FORMATS.find(f => f.id === format)
      const W = dims.w
      const H = dims.h || el.scrollHeight || 1920
      const raster = await html2canvas(el, {
        scale: exportScale,
        backgroundColor: exportPalette['--a-bg'],
        useCORS: true,
        logging: false,
        width: W,
        height: H,
        windowWidth: W,
      })
      const out = document.createElement('canvas')
      out.width = W * exportScale
      out.height = H * exportScale
      const ctx = out.getContext('2d')
      ctx.fillStyle = exportPalette['--a-bg']
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.drawImage(raster, 0, 0)
      const blob = await new Promise(resolve => out.toBlob(resolve, 'image/png'))
      const url = URL.createObjectURL(blob)
      setDownloadPrompt({ url, filename: filename(), bytes: blob.size })
    } catch (e) {
      console.error(e)
      setExportError(true)
    }
    setExporting(false)
  }
  function confirmDownload() {
    if (!downloadPrompt) return
    const a = document.createElement('a')
    a.download = downloadPrompt.filename
    a.href = downloadPrompt.url
    a.click()
    URL.revokeObjectURL(downloadPrompt.url)
    setDownloadPrompt(null)
  }
  function cancelDownload() {
    if (downloadPrompt) URL.revokeObjectURL(downloadPrompt.url)
    setDownloadPrompt(null)
  }
  function retryNoLogo() {
    setLogoDataUrl(null)
    setExportError(false)
    setTimeout(generateAndPrompt, 0)
  }

  if (!hasAny)
    return (
      <EmptyState
        pane
        icon="ti-calendar"
        title="Nenhuma sessão ainda."
        text="Adicione no Criador de Treinos."
      />
    )

  const dayFmt = isDayFormat(format)
  const _presenterDateKey = selectedDate || toISO(currentWeekDates[1])
  const _presenterSess = (filteredSessions[_presenterDateKey] || [])[0]
  // #113: the share target is schedule.html?id=<sessionId>, a page that's actually
  // built and deployed — log.html (the old target) isn't in vite.public.config.js's
  // input and 404s in production. `?id=` locks the public schedule to this one session.
  const _presenterLogUrl = _presenterSess
    ? `https://dseller0.github.io/CrossFit-Apps/schedule.html?id=${_presenterSess.id}`
    : ''

  const canExport = filteredSessions[_presenterDateKey]?.length || !dayFmt

  return (
    <div className={s.wrap}>
      <PresenterLauncher
        open={presenterOpen}
        logUrl={_presenterLogUrl}
        onClose={() => setPresenterOpen(false)}
        sessions={filteredSessions}
        label={label}
        gymName={gymName}
        fontScale={fontScale}
        zoneScales={zoneScales}
        blockTitleScales={blockTitleScales}
        selectedDate={_presenterDateKey}
        logoDataUrl={logoDataUrl}
        logoScale={logoScale}
        weekDates={currentWeekDates}
        palette={exportPalette}
      />

      <div className={s.hdr}>
        <div>
          <h1 className={s.hdrTitle}>Publicador</h1>
          <div className={s.hdrSub}>a semana que você montou vira imagem — ou vira tela</div>
        </div>
        <div className={s.hdrActs}>
          <Button
            variant="secondary"
            onClick={() => setPresenterOpen(true)}
            disabled={!_presenterSess}
            title="Modo TV — tela cheia com QR code para atletas"
          >
            <i className="ti ti-presentation" aria-hidden="true" /> Apresentar
          </Button>
          <Button variant="primary" onClick={generateAndPrompt} disabled={exporting || !canExport}>
            <i className="ti ti-download" aria-hidden="true" />{' '}
            {exporting ? 'Gerando…' : 'Baixar PNG'}
          </Button>
        </div>
      </div>

      <WhenPicker
        year={year}
        month={month}
        monthLabel={`${MONTH_PT[month]} ${year}`}
        onPrevMonth={() => {
          const d = new Date(year, month - 1, 1)
          setMonth(d.getMonth())
          setYear(d.getFullYear())
        }}
        onNextMonth={() => {
          const d = new Date(year, month + 1, 1)
          setMonth(d.getMonth())
          setYear(d.getFullYear())
        }}
        selectedWeekIdx={selectedWeekIdx}
        onSelectWeek={selectWeek}
        selectedDate={selectedDate}
        onSelectDate={handleDayClick}
        sessions={filteredSessions}
        dayFormat={dayFmt}
      />

      <div className={s.body}>
        <div className={s.col}>
          <p className={s.colh}>Formato</p>
          <FormatRail format={format} onSelect={setFormat} />
          <div className={s.detGrp}>
            <Input
              label="Nome da academia"
              placeholder="Cone"
              value={gymName}
              onChange={e => setGymName(e.target.value)}
            />
            <Input
              label="Filtrar por atleta"
              as="select"
              value={filterAthlete?.id || ''}
              onChange={e => {
                const a = loadAthletes().find(x => x.id === e.target.value) || null
                setFilterAthlete(a)
                setGymName(a ? a.name : '')
              }}
            >
              <option value="">Todos os atletas</option>
              {loadAthletes().map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Input>
            <Input
              label="Rótulo do período"
              placeholder="ex: Semana 4"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          </div>
        </div>

        <div className={s.col}>
          <p className={s.colh}>Preview</p>
          {exportError ? (
            <ExportErrorState
              onRetry={generateAndPrompt}
              onRetryNoLogo={retryNoLogo}
              hasLogo={!!logoDataUrl}
            />
          ) : (
            <PreviewPane
              format={format}
              year={year}
              month={month}
              selectedWeekIdx={selectedWeekIdx}
              currentWeekDates={currentWeekDates}
              selectedDate={selectedDate}
              filteredSessions={filteredSessions}
              label={label}
              gymName={gymName}
              fontScale={fontScale}
              zoneScales={zoneScales}
              blockTitleScales={blockTitleScales}
              logoDataUrl={logoDataUrl}
              logoScale={logoScale}
              palette={exportPalette}
              busy={exporting}
              fname={filename()}
              onPickAltDate={d => handleDayClick(currentWeekDates, d)}
              onSwitchToWeekFormat={() =>
                setFormat(dayFmt && format === 'diaMobile' ? 'semanaMobile' : 'semana')
              }
            />
          )}
        </div>

        <div className={s.col}>
          <p className={s.colh}>Aparência</p>
          {migrationOffer && !migrationDismissed && (
            <div className={s.banner}>
              <span>
                <b>Cores antigas detectadas</b> — este perfil tinha cores de export personalizadas
                antes desta atualização. Importar para Personalizado?
              </span>
              <div className={s.bannerActs}>
                <Button variant="secondary" size="sm" onClick={importLegacy}>
                  Importar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExportSource('tema')
                    setMigrationDismissed(true)
                  }}
                >
                  Não, obrigado
                </Button>
              </div>
            </div>
          )}
          <AparenciaPanel
            boxes={boxes}
            origin={origin === '__custom__' ? '__custom__' : origin === 'tema' ? null : origin}
            onSelectOrigin={next => selectOrigin(next === null ? 'tema' : next)}
            palette={exportPalette}
            custom={custom}
            onCustomChange={customChange}
            logoInputRef={logoInputRef}
            onLogoUpload={handleLogoUpload}
            logoDataUrl={logoDataUrl}
            onRemoveLogo={() => setLogoDataUrl(null)}
            logoScale={logoScale}
            onLogoScaleStep={d =>
              setLogoScale(v => Math.max(0.25, Math.min(4, +(v + d * 0.05).toFixed(2))))
            }
            fontScale={fontScale}
            onFontScaleStep={d =>
              setFontScale(v => Math.max(0.5, Math.min(3, +(v + d * 0.1).toFixed(2))))
            }
            exportScale={exportScale}
            onExportScaleStep={d => setExportScale(v => Math.max(1, Math.min(4, v + d)))}
            zoneScales={zoneScales}
            onZoneScaleStep={(zi, d) =>
              setZoneScales(arr => {
                const n = [...arr]
                n[zi] = Math.max(0.3, Math.min(3, +(n[zi] + d * 0.1).toFixed(2)))
                return n
              })
            }
            blockTitleScales={blockTitleScales}
            onBlockTitleScaleStep={(zi, d) =>
              setBlockTitleScales(arr => {
                const n = [...arr]
                n[zi] = Math.max(0.3, Math.min(3, +(n[zi] + d * 0.1).toFixed(2)))
                return n
              })
            }
            showZoneControls={format === 'dia'}
            canvasLabel={
              (FORMATS.find(f => f.id === format) || {}).h
                ? `${FORMATS.find(f => f.id === format).w}×${FORMATS.find(f => f.id === format).h}`
                : `${(FORMATS.find(f => f.id === format) || {}).w}×auto`
            }
            onResetDefaults={resetAparencia}
          />
        </div>
      </div>

      <ExportFarm
        format={format}
        previewRef={previewRef}
        palette={exportPalette}
        filteredSessions={filteredSessions}
        label={label}
        gymName={gymName}
        fontScale={fontScale}
        zoneScales={zoneScales}
        blockTitleScales={blockTitleScales}
        selectedDate={selectedDate}
        logoDataUrl={logoDataUrl}
        logoScale={logoScale}
        currentWeekDates={currentWeekDates}
        year={year}
        month={month}
        selectedWeekIdx={selectedWeekIdx}
      />

      <ConfirmReview
        open={!!downloadPrompt}
        title="Baixar imagem"
        onEdit={cancelDownload}
        onClose={cancelDownload}
        onConfirm={confirmDownload}
        editLabel="Cancelar"
        confirmLabel="Baixar"
      >
        <ReadRow label="Arquivo" value={downloadPrompt?.filename || ''} mono />
        <ReadRow label="Tamanho" value={downloadPrompt ? fmtBytes(downloadPrompt.bytes) : ''} />
      </ConfirmReview>

      <ConfirmReview
        open={pendingOrigin !== null}
        title="Trocar de origem"
        onEdit={() => setPendingOrigin(null)}
        onClose={() => setPendingOrigin(null)}
        onConfirm={confirmSwitchAway}
        editLabel="Cancelar"
        confirmLabel="Trocar"
      >
        <ReadRow
          label="Personalizado"
          value={`${Object.keys(custom).length} cor(es) definida(s) serão descartadas`}
        />
      </ConfirmReview>
    </div>
  )
}

export default SchedulePublisher
