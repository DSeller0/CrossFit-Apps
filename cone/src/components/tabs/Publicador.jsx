import React, { useState, useEffect, useRef } from 'react'
import { loadSettings, saveSettings, matchesAthlete, toISO } from '../../utils/storage'
import { APP_CONFIG } from '../../utils/config'
import { getWeeksOfMonth } from './publicador/exportHelpers'
import PresenterLauncher from './publicador/publisher/PresenterLauncher'
import PublisherToolbar from './publicador/publisher/PublisherToolbar'
import PreviewModal from './publicador/publisher/PreviewModal'
import SettingsDrawer from './publicador/publisher/SettingsDrawer'
import ExportFarm from './publicador/publisher/ExportFarm'

// ── SchedulePublisher (default export) ───────────────────────────────────────
function SchedulePublisher({ sessions }) {
  const exportDailyRef = useRef()
  const exportWeeklyRef = useRef()
  const exportCalendarRef = useRef()
  const exportWeeklyCalRef = useRef()
  const exportMobileARef = useRef()
  const exportMobileBRef = useRef()
  const exportMobileWeeklyARef = useRef()
  const exportMobileWeeklyBRef = useRef()
  const previewWrapRef = useRef()
  const weeklyRef = useRef()
  const logoInputRef = useRef()
  const [exportTarget, setExportTarget] = useState('daily')
  const [previewTarget, setPreviewTarget] = useState('semanal')
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0)
  const [gymName, setGymName] = useState(loadSettings().gymName || '')
  const [label, setLabel] = useState(loadSettings().label || '')
  const [filterAthlete, setFilterAthlete] = useState(null)
  const [logoDataUrl, setLogoDataUrl] = useState(null)
  const [logoScale, setLogoScale] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const _savedSettings = loadSettings()
  const [exportScale, setExportScale] = useState(_savedSettings.exportScale || 2)
  const [fontScale, setFontScale] = useState(_savedSettings.fontScale ?? 1.5)
  const [zoneScales, setZoneScales] = useState(_savedSettings.zoneScales || [1, 1, 1])
  const [blockTitleScales, setBlockTitleScales] = useState(
    _savedSettings.blockTitleScales || [1, 1, 1],
  )
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [presenterOpen, setPresenterOpen] = useState(false)
  const migEa = (v, old, nw) => (!v || v === old ? nw : v)
  const [eaglesBg, setEaglesBg] = useState(migEa(APP_CONFIG.mobileEaglesBg, '#000000', '#0d0b09'))
  const [megaManBg, setMegaManBg] = useState(APP_CONFIG.mobileMegaManBg || '#0a1a5c')
  const [noteColor, setNoteColor] = useState(APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa')
  const _sc = { ...(_savedSettings.colors || {}), ..._savedSettings }
  const [settingsView, setSettingsView] = useState('daily')
  const [dvBg, setDvBg] = useState(migEa(_sc.dvBg, '#000000', '#0d0b09'))
  const [dvGymName, setDvGymName] = useState(migEa(_sc.dvGymName, '#ffffff', '#c8b090'))
  const [dvDate, setDvDate] = useState(migEa(_sc.dvDate, '#e87820', '#4ac8c0'))
  const [dvMainTraining, setDvMainTraining] = useState(
    migEa(_sc.dvMainTraining, '#888888', '#887060'),
  )
  const [dvZoneType, setDvZoneType] = useState(migEa(_sc.dvZoneType, '#e87820', '#4ac8c0'))
  const [dvBlockLabel, setDvBlockLabel] = useState(migEa(_sc.dvBlockLabel, '#e87820', '#4ac8c0'))
  const [dvCap, setDvCap] = useState(migEa(_sc.dvCap, '#e87820', '#d8a840'))
  const [dvRounds, setDvRounds] = useState(migEa(_sc.dvRounds, '#f5c842', '#d8a840'))
  const [dvExName, setDvExName] = useState(migEa(_sc.dvExName, '#ffffff', '#c8b090'))
  const [dvIntensity, setDvIntensity] = useState(migEa(_sc.dvIntensity, '#f5c842', '#d8a840'))
  const [dvNote, setDvNote] = useState(migEa(_sc.dvNote, '#888888', '#554a3a'))
  const [dvBlockNotes, setDvBlockNotes] = useState(migEa(_sc.dvBlockNotes, '#888888', '#554a3a'))
  const [dvDivider, setDvDivider] = useState(migEa(_sc.dvDivider, '#1a1a1a', '#2a2318'))
  const [wkBg, setWkBg] = useState(migEa(_sc.wkBg, '#000000', '#0d0b09'))
  const [wkHeader, setWkHeader] = useState(migEa(_sc.wkHeader, '#e87820', '#4ac8c0'))
  const [wkDateNum, setWkDateNum] = useState(migEa(_sc.wkDateNum, '#666666', '#887060'))
  const [wkMainTraining, setWkMainTraining] = useState(
    migEa(_sc.wkMainTraining, '#ffffff', '#c8b090'),
  )
  const [wkBlockType, setWkBlockType] = useState(migEa(_sc.wkBlockType, '#e87820', '#4ac8c0'))
  const [wkExName, setWkExName] = useState(migEa(_sc.wkExName, '#666666', '#887060'))
  const [wkDivider, setWkDivider] = useState(migEa(_sc.wkDivider, '#1a1a1a', '#2a2318'))
  const [eaGymName, setEaGymName] = useState(migEa(_sc.eaGymName, '#ffffff', '#c8b090'))
  const [eaDate, setEaDate] = useState(migEa(_sc.eaDate, '#e87820', '#4ac8c0'))
  const [eaSubtitle, setEaSubtitle] = useState(migEa(_sc.eaSubtitle, '#666666', '#3a8a80'))
  const [eaBlockType, setEaBlockType] = useState(migEa(_sc.eaBlockType, '#00b8d4', '#4ac8c0'))
  const [eaBlockMeta, setEaBlockMeta] = useState(migEa(_sc.eaBlockMeta, '#00b8d4', '#4ac8c0'))
  const [eaExName, setEaExName] = useState(migEa(_sc.eaExName, '#ffffff', '#c8b090'))
  const [eaIntensity, setEaIntensity] = useState(migEa(_sc.eaIntensity, '#ffd700', '#d8a840'))
  const [eaBlockHdr, setEaBlockHdr] = useState(
    migEa(_sc.eaBlockHdr, 'rgba(0,184,212,0.12)', 'rgba(74,200,192,0.12)'),
  )
  const [eaDivider, setEaDivider] = useState(
    migEa(_sc.eaDivider, 'rgba(0,184,212,0.1)', 'rgba(74,200,192,0.1)'),
  )
  const [mmGymName, setMmGymName] = useState(migEa(_sc.mmGymName, '#ffffff', '#c8b090'))
  const [mmDate, setMmDate] = useState(migEa(_sc.mmDate, '#00b8d4', '#4ac8c0'))
  const [mmSubtitle, setMmSubtitle] = useState(_sc.mmSubtitle || '#3a6a80')
  const [mmBlockType, setMmBlockType] = useState(migEa(_sc.mmBlockType, '#00b8d4', '#4ac8c0'))
  const [mmBlockMetaBg, setMmBlockMetaBg] = useState(migEa(_sc.mmBlockMetaBg, '#00b8d4', '#4ac8c0'))
  const [mmBlockMetaText, setMmBlockMetaText] = useState(
    migEa(_sc.mmBlockMetaText, '#000000', '#0d0b09'),
  )
  const [mmExName, setMmExName] = useState(migEa(_sc.mmExName, '#ffffff', '#c8b090'))
  const [mmIntensity, setMmIntensity] = useState(migEa(_sc.mmIntensity, '#ffd700', '#d8a840'))
  const [mmBlockHdr, setMmBlockHdr] = useState(
    migEa(_sc.mmBlockHdr, 'rgba(0,184,212,0.12)', 'rgba(74,200,192,0.12)'),
  )
  const [mmDivider, setMmDivider] = useState(
    migEa(_sc.mmDivider, 'rgba(0,184,212,0.1)', 'rgba(74,200,192,0.1)'),
  )
  // Measured width of the preview wrapper. Both preview scales derive from it: the
  // desktop views divide by 1920, the two mobile ones by 1080. Held in state rather than
  // read off previewWrapRef during render (react-hooks/refs) — see the ResizeObserver
  // below, ported from Criador's TV-preview pane.
  const [previewWrapW, setPreviewWrapW] = useState(800)
  const previewScale = previewWrapW / 1920
  const previewMobileScale = previewWrapW / 1080

  useEffect(() => {
    APP_CONFIG.exportScale = exportScale
  }, [exportScale])
  useEffect(() => {
    APP_CONFIG.mobileEaglesBg = eaglesBg
  }, [eaglesBg])
  useEffect(() => {
    APP_CONFIG.mobileMegaManBg = megaManBg
  }, [megaManBg])
  useEffect(() => {
    APP_CONFIG.mobileExerciseNoteColor = noteColor
  }, [noteColor])
  // #142 — this effect had TWO defects, and both had to go.
  //
  // (1) It listed only its own 45 export-styling keys and `saveSettings` (storage.js) is a
  // BLIND OVERWRITE, not a merge — so every key Publicador doesn't know about was deleted
  // from the blob: `gymSub`, `logo`, `boxWarnings` (#53, a shipped feature), `customBenchmarks`
  // and `theme`. Every other caller compensates by read-merging at the call site (Config.jsx,
  // useBoxWarnings.js, BlockEditor.jsx, App.jsx) — this one didn't.
  // Fixed with the same `...loadSettings()` spread they use. ⚠️ Do NOT "fix" this by making
  // saveSettings merge: that would make deleting a key impossible for every caller.
  //
  // (2) It is seeded from loadSettings() and therefore FIRED ON MOUNT, so merely opening the
  // tab re-upserted the whole blob and stamped a fresh updated_at for nothing — the #109/#111
  // read-path-never-writes class. The ref guard skips that first run, same shape as
  // SyncContext's and CoachProfileForm's.
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
      dvBg,
      dvGymName,
      dvDate,
      dvMainTraining,
      dvZoneType,
      dvBlockLabel,
      dvCap,
      dvRounds,
      dvExName,
      dvIntensity,
      dvNote,
      dvBlockNotes,
      dvDivider,
      wkBg,
      wkHeader,
      wkDateNum,
      wkMainTraining,
      wkBlockType,
      wkExName,
      wkDivider,
      eaGymName,
      eaDate,
      eaSubtitle,
      eaBlockType,
      eaBlockMeta,
      eaExName,
      eaIntensity,
      eaBlockHdr,
      eaDivider,
      eaglesBg,
      megaManBg,
      noteColor,
      mmGymName,
      mmDate,
      mmSubtitle,
      mmBlockType,
      mmBlockMetaBg,
      mmBlockMetaText,
      mmExName,
      mmIntensity,
      mmBlockHdr,
      mmDivider,
    })
  }, [
    fontScale,
    zoneScales,
    blockTitleScales,
    gymName,
    label,
    exportScale,
    dvBg,
    dvGymName,
    dvDate,
    dvMainTraining,
    dvZoneType,
    dvBlockLabel,
    dvCap,
    dvRounds,
    dvExName,
    dvIntensity,
    dvNote,
    dvBlockNotes,
    dvDivider,
    wkBg,
    wkHeader,
    wkDateNum,
    wkMainTraining,
    wkBlockType,
    wkExName,
    wkDivider,
    eaGymName,
    eaDate,
    eaSubtitle,
    eaBlockType,
    eaBlockMeta,
    eaExName,
    eaIntensity,
    eaBlockHdr,
    eaDivider,
    eaglesBg,
    megaManBg,
    noteColor,
    mmGymName,
    mmDate,
    mmSubtitle,
    mmBlockType,
    mmBlockMetaBg,
    mmBlockMetaText,
    mmExName,
    mmIntensity,
    mmBlockHdr,
    mmDivider,
  ])

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const hasAny = Object.values(sessions).some(arr => arr.length > 0)

  const handleLogoUpload = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoDataUrl(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // A ResizeObserver, not a one-shot measure: the old effect read the width once when the
  // preview opened and never again, so the desktop scale went stale on a window resize —
  // and the mobile targets side-stepped it entirely by reading previewWrapRef.current
  // during render, which is null on the first render after opening and silently fell back
  // to 800px (wrong scale until an unrelated re-render). Same shape as Criador's TV
  // preview and TvController's preview pane.
  useEffect(() => {
    const el = previewWrapRef.current
    if (!previewOpen || !el) return
    const measure = () => setPreviewWrapW(el.offsetWidth || 800)
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    measure()
    return () => obs.disconnect()
  }, [previewOpen])

  const doExport = async target => {
    const tgt = target || exportTarget
    const el =
      tgt === 'calendar'
        ? exportCalendarRef.current
        : tgt === 'semanal'
          ? exportWeeklyCalRef.current
          : exportDailyRef.current
    if (!el) {
      alert('Nada para exportar ainda.')
      return
    }
    setExporting(true)
    await new Promise(r => setTimeout(r, 250))
    try {
      const html2canvas = (await import('html2canvas')).default
      const W = 1920,
        H = 1080
      const c = await html2canvas(el, {
        scale: 1,
        backgroundColor: '#000',
        useCORS: true,
        logging: false,
        width: W,
        height: H,
        windowWidth: W,
      })
      const out = document.createElement('canvas')
      out.width = W
      out.height = H
      const ctx = out.getContext('2d')
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)
      ctx.drawImage(c, 0, 0, W, H)
      const a = document.createElement('a')
      const DAY_EN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const padD = n => String(n).padStart(2, '0')
      const fmtDate = d => `${padD(d.getDate())}${padD(d.getMonth() + 1)}${d.getFullYear()}`
      const gymSlug =
        (gymName || APP_CONFIG.gymName || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'grade'
      let filename
      if (tgt === 'daily') {
        const dateStr = selectedDate || toISO(currentWeekDates[1])
        const d = new Date(dateStr + 'T12:00:00')
        filename = `${gymSlug}-treino-${DAY_EN[d.getDay()]}-${fmtDate(d)}`
      } else if (tgt === 'semanal') {
        const wks = getWeeksOfMonth(year, month)
        const wk = wks[selectedWeekIdx] || currentWeekDates
        const mon = wk[1]
        const fri = wk[5]
        filename = `${gymSlug}-semanal-${padD(mon.getDate())}${padD(mon.getMonth() + 1)}to${padD(fri.getDate())}${padD(fri.getMonth() + 1)}`
      } else {
        const mnames = [
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
        filename = `${gymSlug}-calendario-${mnames[month]}-${year}`
      }
      a.download = `${filename}.png`
      a.href = out.toDataURL('image/png')
      a.click()
    } catch (e) {
      console.error(e)
      alert('Falha na exportação — tente novamente.')
    }
    setExporting(false)
  }

  const doMobileExport = async variant => {
    const el = variant === 'A' ? exportMobileARef.current : exportMobileBRef.current
    if (!el) {
      alert('Nada para exportar ainda.')
      return
    }
    setExporting(true)
    await new Promise(r => setTimeout(r, 250))
    try {
      const html2canvas = (await import('html2canvas')).default
      const W = 1080
      const H = el.scrollHeight || 1920
      const c = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#000',
        useCORS: true,
        logging: false,
        width: W,
        height: H,
        windowWidth: W,
      })
      const out = document.createElement('canvas')
      out.width = W * 2
      out.height = H * 2
      const ctx = out.getContext('2d')
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.drawImage(c, 0, 0)
      const DAY_EN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const padD = n => String(n).padStart(2, '0')
      const dateStr = selectedDate || toISO(currentWeekDates[1])
      const d = new Date(dateStr + 'T12:00:00')
      const gymSlug =
        (gymName || APP_CONFIG.gymName || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'grade'
      const fname = `${gymSlug}-mobile-${variant === 'A' ? '01' : '02'}-${DAY_EN[d.getDay()]}-${padD(d.getDate())}${padD(d.getMonth() + 1)}${d.getFullYear()}`
      const a = document.createElement('a')
      a.download = `${fname}.png`
      a.href = out.toDataURL('image/png')
      a.click()
    } catch (e) {
      console.error(e)
      alert('Falha na exportação — tente novamente.')
    }
    setExporting(false)
  }

  const doMobileWeeklyExport = async variant => {
    const el = variant === 'A' ? exportMobileWeeklyARef.current : exportMobileWeeklyBRef.current
    if (!el) {
      alert('Nada para exportar ainda.')
      return
    }
    setExporting(true)
    await new Promise(r => setTimeout(r, 250))
    try {
      const html2canvas = (await import('html2canvas')).default
      const W = 1080
      const H = el.scrollHeight || 3000
      const cv = await html2canvas(el, {
        scale: APP_CONFIG.exportScale || 2,
        backgroundColor:
          variant === 'A'
            ? APP_CONFIG.mobileEaglesBg || '#0d0b09'
            : APP_CONFIG.mobileMegaManBg || '#000',
        useCORS: true,
        logging: false,
        width: W,
        height: H,
        windowWidth: W,
      })
      const out = document.createElement('canvas')
      out.width = W * 2
      out.height = H * 2
      const ctx = out.getContext('2d')
      ctx.fillStyle =
        variant === 'A'
          ? APP_CONFIG.mobileEaglesBg || '#0d0b09'
          : APP_CONFIG.mobileMegaManBg || '#000'
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.drawImage(cv, 0, 0)
      const wk = getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates
      const mon = wk[1]
      const fri = wk[5]
      const padD = n => String(n).padStart(2, '0')
      const labels = APP_CONFIG.mobileWeeklyLabels || ['Mobile Semanal 01', 'Mobile Semanal 02']
      const lbl = (labels[variant === 'A' ? 0 : 1] || '')
        .replace(/[^a-zA-Z0-9À-ɏ\-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)
        .toLowerCase()
      const gymSlugW =
        (gymName || APP_CONFIG.gymName || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'grade'
      const fname = `${gymSlugW}-${lbl}-${padD(mon.getDate())}${padD(mon.getMonth() + 1)}to${padD(fri.getDate())}${padD(fri.getMonth() + 1)}`
      const a = document.createElement('a')
      a.download = `${fname}.png`
      a.href = out.toDataURL('image/png')
      a.click()
    } catch (e) {
      console.error(e)
      alert('Falha na exportação — tente novamente.')
    }
    setExporting(false)
  }

  const handleDayClick = (week, date) => {
    setSelectedWeek(week)
    setSelectedDate(toISO(date))
  }

  const defaultWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    const dow = d.getDay()
    d.setDate(d.getDate() - dow + i)
    return d
  })

  const filteredSessions = filterAthlete
    ? Object.fromEntries(
        Object.entries(sessions).map(([k, v]) => [
          k,
          v.filter(s => matchesAthlete(s, filterAthlete.name)),
        ]),
      )
    : sessions

  if (!hasAny)
    return (
      <div className="empty2">
        <i
          className="ti ti-calendar"
          style={{
            fontSize: '32px',
            display: 'block',
            marginBottom: '10px',
            color: '#444',
          }}
          aria-hidden="true"
        />
        Nenhuma sessão ainda.
        <br />
        <span style={{ color: '#444', fontSize: '12px' }}>Adicione no Criador de Treinos.</span>
      </div>
    )

  const currentWeekDates = selectedWeek || defaultWeek

  const dvColors = {
    bg: dvBg,
    gymName: dvGymName,
    date: dvDate,
    mainTraining: dvMainTraining,
    zoneType: dvZoneType,
    blockLabel: dvBlockLabel,
    cap: dvCap,
    rounds: dvRounds,
    exName: dvExName,
    intensity: dvIntensity,
    note: dvNote,
    blockNotes: dvBlockNotes,
    divider: dvDivider,
  }
  const wkColors = {
    bg: wkBg,
    header: wkHeader,
    dateNum: wkDateNum,
    mainTraining: wkMainTraining,
    blockType: wkBlockType,
    exName: wkExName,
    divider: wkDivider,
  }
  const eaColors = {
    gymName: eaGymName,
    date: eaDate,
    subtitle: eaSubtitle,
    blockType: eaBlockType,
    blockMeta: eaBlockMeta,
    exName: eaExName,
    intensity: eaIntensity,
    blockHdr: eaBlockHdr,
    divider: eaDivider,
    note: noteColor,
  }
  const mmColors = {
    gymName: mmGymName,
    date: mmDate,
    subtitle: mmSubtitle,
    blockType: mmBlockType,
    blockMetaBg: mmBlockMetaBg,
    blockMetaText: mmBlockMetaText,
    exName: mmExName,
    intensity: mmIntensity,
    blockHdr: mmBlockHdr,
    divider: mmDivider,
    note: noteColor,
  }
  const _presenterDateKey = selectedDate || toISO(currentWeekDates[1])
  const _presenterSess = (filteredSessions[_presenterDateKey] || [])[0]
  const _presenterLogUrl = _presenterSess
    ? `https://dseller0.github.io/CrossFit-Apps/log.html?date=${_presenterDateKey}&session=${_presenterSess.id}`
    : ''

  return (
    <React.Fragment>
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
        dvColors={dvColors}
      />
      <div>
        <PublisherToolbar
          logoInputRef={logoInputRef}
          onLogoUpload={handleLogoUpload}
          logoDataUrl={logoDataUrl}
          setLogoDataUrl={setLogoDataUrl}
          logoScale={logoScale}
          setLogoScale={setLogoScale}
          gymName={gymName}
          setGymName={setGymName}
          filterAthlete={filterAthlete}
          setFilterAthlete={setFilterAthlete}
          label={label}
          setLabel={setLabel}
          fontScale={fontScale}
          setFontScale={setFontScale}
          month={month}
          setMonth={setMonth}
          year={year}
          setYear={setYear}
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          setPresenterOpen={setPresenterOpen}
          setSettingsOpen={setSettingsOpen}
          exporting={exporting}
          setExportTarget={setExportTarget}
          doExport={doExport}
          doMobileExport={doMobileExport}
          doMobileWeeklyExport={doMobileWeeklyExport}
        />
        <PreviewModal
          open={previewOpen}
          year={year}
          month={month}
          previewTarget={previewTarget}
          setPreviewTarget={setPreviewTarget}
          selectedWeekIdx={selectedWeekIdx}
          setSelectedWeekIdx={setSelectedWeekIdx}
          setSelectedWeek={setSelectedWeek}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          currentWeekDates={currentWeekDates}
          filteredSessions={filteredSessions}
          zoneScales={zoneScales}
          setZoneScales={setZoneScales}
          blockTitleScales={blockTitleScales}
          setBlockTitleScales={setBlockTitleScales}
          previewWrapRef={previewWrapRef}
          previewScale={previewScale}
          previewMobileScale={previewMobileScale}
          label={label}
          gymName={gymName}
          fontScale={fontScale}
          logoDataUrl={logoDataUrl}
          logoScale={logoScale}
          exporting={exporting}
          doExport={doExport}
          doMobileExport={doMobileExport}
          doMobileWeeklyExport={doMobileWeeklyExport}
          dvColors={dvColors}
          wkColors={wkColors}
          eaColors={eaColors}
          mmColors={mmColors}
          eaglesBg={eaglesBg}
          megaManBg={megaManBg}
        />
        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settingsView={settingsView}
          setSettingsView={setSettingsView}
          fields={{
            dvBg,
            setDvBg,
            dvGymName,
            setDvGymName,
            dvDate,
            setDvDate,
            dvMainTraining,
            setDvMainTraining,
            dvZoneType,
            setDvZoneType,
            dvBlockLabel,
            setDvBlockLabel,
            dvCap,
            setDvCap,
            dvRounds,
            setDvRounds,
            dvExName,
            setDvExName,
            dvIntensity,
            setDvIntensity,
            dvNote,
            setDvNote,
            dvBlockNotes,
            setDvBlockNotes,
            dvDivider,
            setDvDivider,
            wkBg,
            setWkBg,
            wkHeader,
            setWkHeader,
            wkDateNum,
            setWkDateNum,
            wkMainTraining,
            setWkMainTraining,
            wkBlockType,
            setWkBlockType,
            wkExName,
            setWkExName,
            wkDivider,
            setWkDivider,
            eaGymName,
            setEaGymName,
            eaDate,
            setEaDate,
            eaSubtitle,
            setEaSubtitle,
            eaBlockType,
            setEaBlockType,
            eaBlockMeta,
            setEaBlockMeta,
            eaExName,
            setEaExName,
            eaIntensity,
            setEaIntensity,
            eaBlockHdr,
            setEaBlockHdr,
            eaDivider,
            setEaDivider,
            eaglesBg,
            setEaglesBg,
            noteColor,
            setNoteColor,
            mmGymName,
            setMmGymName,
            mmDate,
            setMmDate,
            mmSubtitle,
            setMmSubtitle,
            mmBlockType,
            setMmBlockType,
            mmBlockMetaBg,
            setMmBlockMetaBg,
            mmBlockMetaText,
            setMmBlockMetaText,
            mmExName,
            setMmExName,
            mmIntensity,
            setMmIntensity,
            mmBlockHdr,
            setMmBlockHdr,
            mmDivider,
            setMmDivider,
            megaManBg,
            setMegaManBg,
          }}
          exportScale={exportScale}
          setExportScale={setExportScale}
          gymName={gymName}
          setGymName={setGymName}
          fontScale={fontScale}
          setFontScale={setFontScale}
          zoneScales={zoneScales}
          blockTitleScales={blockTitleScales}
        />
        <ExportFarm
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
          dvColors={dvColors}
          wkColors={wkColors}
          eaColors={eaColors}
          mmColors={mmColors}
          eaglesBg={eaglesBg}
          megaManBg={megaManBg}
          exportDailyRef={exportDailyRef}
          exportWeeklyRef={exportWeeklyRef}
          exportWeeklyCalRef={exportWeeklyCalRef}
          exportCalendarRef={exportCalendarRef}
          exportMobileARef={exportMobileARef}
          exportMobileBRef={exportMobileBRef}
          weeklyRef={weeklyRef}
          previewOpen={previewOpen}
          handleDayClick={handleDayClick}
        />
      </div>
    </React.Fragment>
  )
}

export default SchedulePublisher
