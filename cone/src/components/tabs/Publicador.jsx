import { useEffect, useRef, useState } from 'react'
import {
  loadAthletes,
  loadSettings,
  saveSettings,
  matchesAthlete,
  toISO,
} from '../../utils/storage'
import { APP_CONFIG } from '../../utils/config'
import { getWeeksOfMonth, resolveDaySession, buildMobileSession } from './publicador/exportHelpers'
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
import {
  ALL_WEEK_DAYS,
  distributeZones,
  zoneCollapseMessage,
  visibleWeekDates,
} from './publicador/layoutHelpers'
import { DEFAULT_BLOCK_TREATMENT, DEFAULT_BLOCK_CONTENT } from './publicador/blockTreatments'
import { computedTitle } from './publicador/titleHelpers'
import {
  measureFit,
  describeOverflow,
  FONT_SCALE_FLOOR,
  FONT_SCALE_CEIL,
  AUTO_SHRINK_STEP,
  AUTO_SHRINK_MAX_STEPS,
} from './publicador/fitCheck'
import Button from '../ui/Button'
import Input from '../ui/Input'
import EmptyState from '../ui/EmptyState'
import Toast from '../ui/Toast'
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

const DEFAULT_FONT_SCALE = 1.5

// `fontScale` used to be one shared number; #59 C5·b2 (T9) makes it per-format so
// fitting a 9:16 mobile export never shrinks next week's 1920×1080 Semana. A legacy
// number (saved before this pass) becomes that same number for every format.
function migrateFontScales(saved) {
  const defaults = Object.fromEntries(FORMATS.map(f => [f.id, DEFAULT_FONT_SCALE]))
  if (typeof saved === 'number') return Object.fromEntries(FORMATS.map(f => [f.id, saved]))
  if (saved && typeof saved === 'object') return { ...defaults, ...saved }
  return defaults
}

// `label` (one shared string) migrates into `titles.semana` on first read — no
// orphaned key, and every other format starts with its own computed default.
function migrateTitles(saved, legacyLabel) {
  const base = saved && typeof saved === 'object' ? saved : {}
  if (!base.semana && legacyLabel) return { ...base, semana: legacyLabel }
  return base
}

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
  const [filterAthlete, setFilterAthlete] = useState(null)
  const [logoDataUrl, setLogoDataUrl] = useState(null)
  const [logoScale, setLogoScale] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const _savedSettings = loadSettings()
  const [exportScale, setExportScale] = useState(_savedSettings.exportScale || 2)
  const [fontScaleByFormat, setFontScaleByFormat] = useState(() =>
    migrateFontScales(_savedSettings.fontScale),
  )
  const [zoneScales, setZoneScales] = useState(_savedSettings.zoneScales || [1, 1, 1])
  const [blockTitleScales, setBlockTitleScales] = useState(
    _savedSettings.blockTitleScales || [1, 1, 1],
  )
  const [zoneCount, setZoneCount] = useState(_savedSettings.zoneCount || 3)
  const [zoneSplit, setZoneSplit] = useState(_savedSettings.zoneSplit || 'iguais')
  const [visibleDays, setVisibleDays] = useState(_savedSettings.visibleDays || ALL_WEEK_DAYS)
  const [blockTreatment, setBlockTreatment] = useState(
    _savedSettings.blockTreatment || DEFAULT_BLOCK_TREATMENT,
  )
  const [blockContent, setBlockContent] = useState(
    _savedSettings.blockContent || DEFAULT_BLOCK_CONTENT,
  )
  const [titles, setTitles] = useState(() =>
    migrateTitles(_savedSettings.titles, _savedSettings.label),
  )
  const [footer, setFooter] = useState(_savedSettings.footer || '')
  const [mobileModel, setMobileModel] = useState(_savedSettings.mobileModel || 'classico')
  const [presenterOpen, setPresenterOpen] = useState(false)

  // Fit (T9) — measured off the ExportFarm's own off-screen node (`previewRef`),
  // never the transform:scale'd on-screen preview. `autoShrinking` drives a
  // bounded measure→setState→effect→re-measure cycle scoped to THIS format's
  // fontScale only (D1/D3) — see the two effects below.
  const [overflowInfo, setOverflowInfo] = useState(null)
  const [autoShrinking, setAutoShrinking] = useState(false)
  const [shrinkToast, setShrinkToast] = useState('')

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
      fontScale: fontScaleByFormat,
      zoneScales,
      blockTitleScales,
      zoneCount,
      zoneSplit,
      visibleDays,
      blockTreatment,
      blockContent,
      titles,
      footer,
      mobileModel,
      gymName,
      exportScale,
    })
  }, [
    fontScaleByFormat,
    zoneScales,
    blockTitleScales,
    zoneCount,
    zoneSplit,
    visibleDays,
    blockTreatment,
    blockContent,
    titles,
    footer,
    mobileModel,
    gymName,
    exportScale,
  ])

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
    setFontScaleByFormat(migrateFontScales(null))
    setExportScale(2)
    setZoneScales([1, 1, 1])
    setBlockTitleScales([1, 1, 1])
    setZoneCount(3)
    setZoneSplit('iguais')
    setVisibleDays(ALL_WEEK_DAYS)
    setBlockTreatment(DEFAULT_BLOCK_TREATMENT)
    setBlockContent(DEFAULT_BLOCK_CONTENT)
    setTitles({})
    setFooter('')
    setMobileModel('classico')
  }

  function handleDayClick(week, date) {
    setSelectedWeek(week)
    setSelectedDate(toISO(date))
  }
  function selectWeek(wi, week) {
    setSelectedWeekIdx(wi)
    setSelectedWeek(week)
  }
  function stepFontScale(d) {
    setFontScaleByFormat(m => ({
      ...m,
      [format]: Math.max(
        FONT_SCALE_FLOOR,
        Math.min(FONT_SCALE_CEIL, +((m[format] ?? DEFAULT_FONT_SCALE) + d * 0.1).toFixed(2)),
      ),
    }))
  }
  function toggleVisibleDay(i) {
    setVisibleDays(days =>
      days.includes(i) ? days.filter(d => d !== i) : [...days, i].sort((a, b) => a - b),
    )
  }
  function toggleBlockContent(key) {
    setBlockContent(c => ({ ...c, [key]: !c[key] }))
  }
  function setCurrentFormatTitle(value) {
    setTitles(t => ({ ...t, [format]: value }))
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

  // ── Fit measurement (T9) — reads the off-screen farm node after the DOM has had a
  // moment to settle from whatever just changed. A short timeout stands in for a
  // layout-settle signal; comparing against the previous result before setState
  // avoids re-render churn when nothing actually moved.
  useEffect(() => {
    const dims = FORMATS.find(f => f.id === format) || FORMATS[0]
    const t = setTimeout(() => {
      const fit = measureFit(previewRef.current, dims)
      setOverflowInfo(prev =>
        prev &&
        fit &&
        prev.overflowing === fit.overflowing &&
        prev.cutBlocks === fit.cutBlocks &&
        prev.contentH === fit.contentH
          ? prev
          : fit,
      )
    }, 30)
    return () => clearTimeout(t)
  }, [
    format,
    fontScaleByFormat,
    zoneCount,
    zoneSplit,
    blockTreatment,
    blockContent,
    titles,
    footer,
    mobileModel,
    visibleDays,
    filteredSessions,
    selectedDate,
    gymName,
    logoDataUrl,
    logoScale,
    currentWeekDates,
    year,
    month,
    selectedWeekIdx,
  ])

  // ── Auto-shrink (D3) — MANUAL trigger only (`onAutoShrink` below sets
  // `autoShrinking`), bounded, and touches ONLY the current format's fontScale
  // (D1) — never another format's. Each step waits for the fit effect above to
  // re-measure before deciding whether to take another step.
  const shrinkStepsRef = useRef(0)
  // A bounded state machine reacting to a DOM measurement taken by the OTHER effect,
  // not a mirrored prop — each step below is gated on a fresh `overflowInfo`, never a
  // synchronous while() (T9: the prototype's loop doesn't port to React as-is). It
  // deliberately does NOT depend on `fontScaleByFormat`/`format`: advancing only on a
  // fresh measurement, never on its own state write, is what stops it racing ahead of
  // the DOM it exists to react to.
  useEffect(() => {
    if (!autoShrinking || !overflowInfo) return
    if (!overflowInfo.overflowing) {
      // The fit effect above just confirmed this format now fits — end the loop and
      // announce the result (D3: auto-shrink must never be a silent mutation).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoShrinking(false)
      shrinkStepsRef.current = 0
      const fmtLabel = (FORMATS.find(f => f.id === format) || {}).label || format
      setShrinkToast(
        `Fonte ajustada — ${(fontScaleByFormat[format] ?? DEFAULT_FONT_SCALE).toFixed(2)}× em ${fmtLabel}`,
      )
      return
    }
    const current = fontScaleByFormat[format] ?? DEFAULT_FONT_SCALE
    if (current <= FONT_SCALE_FLOOR + 0.001 || shrinkStepsRef.current >= AUTO_SHRINK_MAX_STEPS) {
      setAutoShrinking(false)
      shrinkStepsRef.current = 0
      return
    }
    shrinkStepsRef.current++
    setFontScaleByFormat(m => ({
      ...m,
      [format]: Math.max(FONT_SCALE_FLOOR, +(current - AUTO_SHRINK_STEP).toFixed(2)),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overflowInfo, autoShrinking])

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

  // Shared by the Layout panel's zone-collapse fact and the Títulos panel's
  // computed-default placeholder — the same "which day does Dia show" resolution
  // DailyExportView itself uses (resolveDaySession), read once here.
  const _daySession = resolveDaySession(filteredSessions, currentWeekDates, selectedDate)
  const _zoneDist = _daySession ? distributeZones(_daySession.session.blocks, zoneCount) : null
  const zoneCollapseMsg = _zoneDist ? zoneCollapseMessage(_zoneDist) : ''

  function computedDefaultForCurrentFormat() {
    if (format === 'dia') return computedTitle('dia', { date: _daySession?.date })
    if (format === 'diaMobile') {
      const found = buildMobileSession(filteredSessions, selectedDate, currentWeekDates)
      return computedTitle('diaMobile', { date: found?.date })
    }
    if (format === 'semana' || format === 'semanaMobile') {
      const wk = getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates
      return computedTitle(format, { weekDates: visibleWeekDates(wk, visibleDays) })
    }
    return computedTitle('mes', { year, month })
  }

  return (
    <div className={s.wrap}>
      <PresenterLauncher
        open={presenterOpen}
        logUrl={_presenterLogUrl}
        onClose={() => setPresenterOpen(false)}
        sessions={filteredSessions}
        titles={titles}
        gymName={gymName}
        fontScale={fontScaleByFormat.dia ?? DEFAULT_FONT_SCALE}
        zoneScales={zoneScales}
        blockTitleScales={blockTitleScales}
        zoneCount={zoneCount}
        zoneSplit={zoneSplit}
        blockTreatment={blockTreatment}
        blockContent={blockContent}
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
              titles={titles}
              gymName={gymName}
              footer={footer}
              fontScaleByFormat={fontScaleByFormat}
              zoneScales={zoneScales}
              blockTitleScales={blockTitleScales}
              zoneCount={zoneCount}
              zoneSplit={zoneSplit}
              blockTreatment={blockTreatment}
              blockContent={blockContent}
              mobileModel={mobileModel}
              visibleDays={visibleDays}
              locations={locations}
              logoDataUrl={logoDataUrl}
              logoScale={logoScale}
              palette={exportPalette}
              busy={exporting}
              fname={filename()}
              onPickAltDate={d => handleDayClick(currentWeekDates, d)}
              onSwitchToWeekFormat={() =>
                setFormat(dayFmt && format === 'diaMobile' ? 'semanaMobile' : 'semana')
              }
              overflowInfo={overflowInfo}
              autoShrinking={autoShrinking}
              onAutoShrink={() => setAutoShrinking(true)}
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
            fontScale={fontScaleByFormat[format] ?? DEFAULT_FONT_SCALE}
            onFontScaleStep={stepFontScale}
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
            format={format}
            zoneCount={zoneCount}
            onZoneCount={setZoneCount}
            zoneSplit={zoneSplit}
            onZoneSplit={setZoneSplit}
            zoneCollapseMessage={zoneCollapseMsg}
            visibleDays={visibleDays}
            onToggleDay={toggleVisibleDay}
            mobileModel={mobileModel}
            onMobileModel={setMobileModel}
            blockTreatment={blockTreatment}
            onBlockTreatment={setBlockTreatment}
            blockContent={blockContent}
            onToggleBlockContent={toggleBlockContent}
            gymName={gymName}
            onGymName={setGymName}
            footer={footer}
            onFooter={setFooter}
            title={titles[format] || ''}
            onTitleChange={setCurrentFormatTitle}
            computedDefault={computedDefaultForCurrentFormat()}
          />
        </div>
      </div>

      <ExportFarm
        format={format}
        previewRef={previewRef}
        palette={exportPalette}
        filteredSessions={filteredSessions}
        titles={titles}
        gymName={gymName}
        footer={footer}
        fontScaleByFormat={fontScaleByFormat}
        zoneScales={zoneScales}
        blockTitleScales={blockTitleScales}
        zoneCount={zoneCount}
        zoneSplit={zoneSplit}
        blockTreatment={blockTreatment}
        blockContent={blockContent}
        mobileModel={mobileModel}
        visibleDays={visibleDays}
        locations={locations}
        selectedDate={selectedDate}
        logoDataUrl={logoDataUrl}
        logoScale={logoScale}
        currentWeekDates={currentWeekDates}
        year={year}
        month={month}
        selectedWeekIdx={selectedWeekIdx}
      />

      <Toast open={!!shrinkToast} message={shrinkToast} onDismiss={() => setShrinkToast('')} />

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
        {overflowInfo?.overflowing && (
          <ReadRow label="Aviso" value={describeOverflow(overflowInfo)} />
        )}
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
