import React, { useState, useEffect, useRef } from 'react'
import {
  loadAthletes,
  loadSettings,
  saveSettings,
  matchesAthlete,
  toISO,
} from '../../utils/storage'
import { APP_CONFIG } from '../../utils/config'
import PresenterView from '../PresenterView'
import { MONTH_PT } from '../../public/lib/week.js'
import { getWeeksOfMonth } from './publicador/exportHelpers'
import {
  DailyExportView,
  WeeklyExportView,
  WeeklyCalendarExportView,
  CalendarExportView,
} from './publicador/exportViews'
import {
  MobileEaglesExportView,
  MobileMegaManExportView,
  MobileWeeklyExportView,
} from './publicador/mobileExportViews'

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
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)
        .toLowerCase()
      const gymSlugW =
        (gymName || APP_CONFIG.gymName || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036F]/g, '')
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
    return React.createElement(
      'div',
      { className: 'empty2' },
      React.createElement('i', {
        className: 'ti ti-calendar',
        style: { fontSize: '32px', display: 'block', marginBottom: '10px', color: '#444' },
        'aria-hidden': 'true',
      }),
      'Nenhuma sessão ainda.',
      React.createElement('br'),
      React.createElement(
        'span',
        { style: { color: '#444', fontSize: '12px' } },
        'Adicione no Criador de Treinos.',
      ),
    )

  const currentWeekDates = selectedWeek || defaultWeek

  const dvColorsObj = {
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
  const _presenterDateKey = selectedDate || toISO(currentWeekDates[1])
  const _presenterSess = (filteredSessions[_presenterDateKey] || [])[0]
  const _presenterLogUrl = _presenterSess
    ? `https://dseller0.github.io/CrossFit-Apps/log.html?date=${_presenterDateKey}&session=${_presenterSess.id}`
    : ''
  return React.createElement(
    React.Fragment,
    null,
    presenterOpen &&
      React.createElement(
        PresenterView,
        {
          logUrl: _presenterLogUrl,
          onClose: () => setPresenterOpen(false),
        },
        React.createElement(DailyExportView, {
          sessions: filteredSessions,
          label,
          gymName,
          fontScale,
          zoneScales,
          blockTitleScales,
          selectedDate: _presenterDateKey,
          logoDataUrl,
          logoScale,
          weekDates: currentWeekDates,
          dvColors: dvColorsObj,
        }),
      ),
    React.createElement(
      'div',
      null,
      React.createElement(
        'div',
        { className: 'pub-controls' },
        React.createElement('input', {
          type: 'file',
          ref: logoInputRef,
          accept: 'image/*',
          style: { display: 'none' },
          onChange: handleLogoUpload,
        }),
        React.createElement(
          'div',
          { className: 'fg', style: { minWidth: '80px', alignItems: 'center' } },
          React.createElement('span', { className: 'lbl' }, 'Logo'),
          React.createElement(
            'div',
            {
              onClick: () => logoInputRef.current?.click(),
              title: 'Clique para enviar o logo',
              style: {
                width: '64px',
                height: '64px',
                borderRadius: '6px',
                border: logoDataUrl ? '2px solid #e87820' : '1.5px dashed #444',
                background: '#111',
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color .15s',
                flexShrink: 0,
              },
            },
            logoDataUrl
              ? React.createElement('img', {
                  src: logoDataUrl,
                  style: { width: '100%', height: '100%', objectFit: 'contain' },
                })
              : React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                    },
                  },
                  React.createElement('i', {
                    className: 'ti ti-upload',
                    style: { fontSize: '18px', color: '#555' },
                    'aria-hidden': 'true',
                  }),
                  React.createElement('span', {
                    style: {
                      fontSize: '9px',
                      color: '#555',
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                    },
                  }),
                ),
          ),
          logoDataUrl &&
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'b bd bsm',
                style: {
                  marginTop: '4px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  minHeight: '22px',
                },
                onClick: () => setLogoDataUrl(null),
              },
              React.createElement('i', { className: 'ti ti-x', 'aria-hidden': 'true' }),
              ' Remover',
            ),
        ),
        logoDataUrl &&
          React.createElement(
            'div',
            { className: 'fg', style: { minWidth: '160px' } },
            React.createElement(
              'span',
              { className: 'lbl' },
              `Escala do logo — ${logoScale.toFixed(2)}×`,
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'b bsm',
                  style: { padding: '4px 8px', minHeight: '28px' },
                  onClick: () =>
                    setLogoScale(s => Math.max(0.25, Math.round((s - 0.01) * 1000) / 1000)),
                },
                '−',
              ),
              React.createElement('input', {
                type: 'range',
                min: '0.25',
                max: '4',
                step: '0.01',
                value: logoScale,
                onChange: e => setLogoScale(parseFloat(e.target.value)),
                style: { flex: 1, accentColor: '#e87820' },
              }),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'b bsm',
                  style: { padding: '4px 8px', minHeight: '28px' },
                  onClick: () =>
                    setLogoScale(s => Math.min(4, Math.round((s + 0.01) * 1000) / 1000)),
                },
                '+',
              ),
            ),
          ),
        React.createElement(
          'div',
          { className: 'fg', style: { flex: '1', minWidth: '140px' } },
          React.createElement('span', { className: 'lbl' }, 'Nome da academia'),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '6px' } },
            React.createElement('input', {
              placeholder: 'Cone',
              value: gymName,
              onChange: e => setGymName(e.target.value),
              style: { flex: 1 },
            }),
            React.createElement(
              'select',
              {
                value: filterAthlete?.id || '',
                onChange: e => {
                  const aths = loadAthletes()
                  const a = aths.find(x => x.id === e.target.value) || null
                  setFilterAthlete(a)
                  if (a) setGymName(a.name)
                  else setGymName('')
                },
                style: {
                  width: '36px',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  background: '#111',
                  border: '1px solid #2e2e2e',
                  borderRadius: '5px',
                  color: '#888',
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: '0 4px',
                },
                title: 'Filtrar por atleta',
              },
              React.createElement('option', { value: '' }, '👤'),
              loadAthletes().map(a =>
                React.createElement('option', { key: a.id, value: a.id }, a.name),
              ),
            ),
          ),
        ),
        React.createElement(
          'div',
          { className: 'fg', style: { flex: '1', minWidth: '140px' } },
          React.createElement('span', { className: 'lbl' }, 'Rótulo do período'),
          React.createElement('input', {
            placeholder: 'ex: Semana 4',
            value: label,
            onChange: e => setLabel(e.target.value),
          }),
        ),
        React.createElement(
          'div',
          { className: 'fg', style: { minWidth: '180px' } },
          React.createElement(
            'span',
            { className: 'lbl' },
            `Escala da fonte — ${fontScale.toFixed(2)}×`,
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'b bsm',
                style: { padding: '4px 8px', minHeight: '28px' },
                onClick: () =>
                  setFontScale(f => Math.max(0.5, Math.round((f - 0.01) * 1000) / 1000)),
              },
              '−',
            ),
            React.createElement('input', {
              type: 'range',
              min: '0.5',
              max: '3',
              step: '0.01',
              value: fontScale,
              onChange: e => setFontScale(parseFloat(e.target.value)),
              style: { flex: 1, accentColor: '#e87820' },
            }),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'b bsm',
                style: { padding: '4px 8px', minHeight: '28px' },
                onClick: () => setFontScale(f => Math.min(3, Math.round((f + 0.01) * 1000) / 1000)),
              },
              '+',
            ),
          ),
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b bsm',
              onClick: () => {
                const d = new Date(year, month - 1, 1)
                setMonth(d.getMonth())
                setYear(d.getFullYear())
              },
            },
            React.createElement('i', { className: 'ti ti-chevron-left', 'aria-hidden': 'true' }),
          ),
          React.createElement(
            'span',
            {
              style: {
                fontSize: '13px',
                color: '#ccc',
                padding: '0 6px',
                whiteSpace: 'nowrap',
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center',
              },
            },
            `${MONTH_PT[month]} ${year}`,
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b bsm',
              onClick: () => {
                const d = new Date(year, month + 1, 1)
                setMonth(d.getMonth())
                setYear(d.getFullYear())
              },
            },
            React.createElement('i', { className: 'ti ti-chevron-right', 'aria-hidden': 'true' }),
          ),
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b',
              style: {
                borderColor: 'var(--theme-accent)',
                color: previewOpen ? 'var(--theme-accent-text)' : 'var(--theme-accent)',
                background: previewOpen ? 'var(--theme-accent)' : 'transparent',
              },
              onClick: () => setPreviewOpen(p => !p),
            },
            React.createElement('i', { className: 'ti ti-eye', 'aria-hidden': 'true' }),
            previewOpen ? ' Fechar' : ' Pré-visualizar',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b',
              style: { borderColor: '#9b59b6', color: '#9b59b6', background: 'transparent' },
              onClick: () => setPresenterOpen(true),
              title: 'Modo TV — tela cheia com QR code para atletas',
            },
            React.createElement('i', { className: 'ti ti-presentation', 'aria-hidden': 'true' }),
            ' Apresentar',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b bsm',
              title: 'Configurações',
              onClick: () => setSettingsOpen(true),
            },
            React.createElement('i', { className: 'ti ti-settings', 'aria-hidden': 'true' }),
            ' Cores',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b bsec',
              style: { fontSize: '12px' },
              onClick: () => {
                setExportTarget('daily')
                doExport('daily')
              },
              disabled: exporting,
            },
            React.createElement('i', { className: 'ti ti-download', 'aria-hidden': 'true' }),
            ' Diário',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b bsec',
              style: { fontSize: '12px' },
              onClick: () => {
                setExportTarget('semanal')
                doExport('semanal')
              },
              disabled: exporting,
            },
            React.createElement('i', { className: 'ti ti-table-column', 'aria-hidden': 'true' }),
            ' Semanal',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b bsec',
              style: { fontSize: '12px' },
              onClick: () => {
                setExportTarget('calendar')
                doExport('calendar')
              },
              disabled: exporting,
            },
            React.createElement('i', { className: 'ti ti-calendar-down', 'aria-hidden': 'true' }),
            ' Calendário',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b bsm',
              style: {
                fontSize: '12px',
                background: 'var(--theme-accent)',
                color: 'var(--theme-accent-text)',
                borderColor: 'var(--theme-accent)',
                fontWeight: 700,
              },
              onClick: () => doMobileExport('A'),
              disabled: exporting,
            },
            React.createElement('i', { className: 'ti ti-device-mobile', 'aria-hidden': 'true' }),
            ' Mobile 01',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b bsm',
              style: {
                fontSize: '12px',
                background: '#00b8d4',
                color: '#000',
                borderColor: '#00b8d4',
                fontWeight: 700,
              },
              onClick: () => doMobileExport('B'),
              disabled: exporting,
            },
            React.createElement('i', { className: 'ti ti-device-mobile', 'aria-hidden': 'true' }),
            ' Mobile 02',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b bsm',
              style: {
                fontSize: '11px',
                background: 'var(--theme-accent)',
                color: 'var(--theme-accent-text)',
                borderColor: 'var(--theme-accent)',
                fontWeight: 700,
              },
              onClick: () => doMobileWeeklyExport('A'),
              disabled: exporting,
            },
            React.createElement('i', { className: 'ti ti-layout-list', 'aria-hidden': 'true' }),
            ' ',
            APP_CONFIG.mobileWeeklyLabels?.[0] || 'Mobile Semanal 01',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'b bsm',
              style: {
                fontSize: '11px',
                background: '#00b8d4',
                color: '#000',
                borderColor: '#00b8d4',
                fontWeight: 700,
              },
              onClick: () => doMobileWeeklyExport('B'),
              disabled: exporting,
            },
            React.createElement('i', { className: 'ti ti-layout-list', 'aria-hidden': 'true' }),
            ' ',
            APP_CONFIG.mobileWeeklyLabels?.[1] || 'Mobile Semanal 02',
          ),
          exporting &&
            React.createElement(
              'span',
              { style: { fontSize: '11px', color: '#e87820' } },
              'Exportando...',
            ),
        ),
      ),
      previewOpen &&
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                gap: '6px',
                marginBottom: '6px',
                flexWrap: 'wrap',
                alignItems: 'center',
              },
            },
            React.createElement(
              'button',
              {
                type: 'button',
                className: `pvt ${previewTarget === 'semanal' ? 'on' : ''}`,
                onClick: () => {
                  setPreviewTarget('semanal')
                  setSelectedDate(null)
                },
              },
              'Semanal',
            ),
            getWeeksOfMonth(year, month).map((week, wi) => {
              const mon = week[1]
              const fri = week[5]
              const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              const active = selectedWeekIdx === wi
              return React.createElement(
                'button',
                {
                  key: wi,
                  type: 'button',
                  className: 'b bsm',
                  style: {
                    background: active ? 'var(--theme-accent)' : 'transparent',
                    color: active ? 'var(--theme-accent-text)' : 'var(--theme-accent)',
                    borderColor: 'var(--theme-accent)',
                    fontSize: '11px',
                    padding: '5px 10px',
                  },
                  onClick: () => {
                    setSelectedWeekIdx(wi)
                    setSelectedWeek(week)
                    setSelectedDate(null)
                    setPreviewTarget('semanal')
                  },
                },
                `${fmt(mon)}–${fmt(fri)}`,
              )
            }),
          ),
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                gap: '6px',
                marginBottom: '8px',
                flexWrap: 'wrap',
                alignItems: 'center',
              },
            },
            React.createElement(
              'button',
              {
                type: 'button',
                className: `pvt ${previewTarget === 'daily' ? 'on' : ''}`,
                onClick: () => setPreviewTarget('daily'),
              },
              'Diário',
            ),
            (() => {
              const selWk = getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates
              return selWk.slice(1).map(d => {
                const iso = toISO(d)
                const hasSession = !!filteredSessions[iso]?.length
                const active = selectedDate === iso
                return React.createElement(
                  'button',
                  {
                    key: iso,
                    type: 'button',
                    className: 'b bsm',
                    style: {
                      background: active ? 'var(--theme-accent)' : 'transparent',
                      color: active
                        ? 'var(--theme-accent-text)'
                        : hasSession
                          ? 'var(--theme-accent)'
                          : '#444',
                      borderColor: hasSession ? 'var(--theme-accent)' : '#333',
                      fontSize: '11px',
                      padding: '5px 10px',
                    },
                    onClick: () => {
                      setSelectedDate(iso)
                      setSelectedWeek(selWk)
                      setPreviewTarget('daily')
                    },
                  },
                  d.toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  }),
                )
              })
            })(),
          ),
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                gap: '6px',
                marginBottom: '8px',
                flexWrap: 'wrap',
                alignItems: 'center',
              },
            },
            React.createElement(
              'button',
              {
                type: 'button',
                className: `pvt ${previewTarget === 'calendar' ? 'on' : ''}`,
                onClick: () => setPreviewTarget('calendar'),
              },
              'Exportar Mensal',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: `pvt ${previewTarget === 'mobileA' ? 'on' : ''}`,
                style:
                  previewTarget === 'mobileA'
                    ? {
                        background: 'var(--theme-accent)',
                        borderColor: 'var(--theme-accent)',
                        color: 'var(--theme-accent-text)',
                      }
                    : { color: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' },
                onClick: () => setPreviewTarget('mobileA'),
              },
              'Mobile 01',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: `pvt ${previewTarget === 'mobileB' ? 'on' : ''}`,
                style:
                  previewTarget === 'mobileB'
                    ? { background: '#00b8d4', borderColor: '#00b8d4', color: '#000' }
                    : { color: '#00b8d4', borderColor: '#00b8d4' },
                onClick: () => setPreviewTarget('mobileB'),
              },
              'Mobile 02',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: `pvt ${previewTarget === 'mobileWeeklyA' ? 'on' : ''}`,
                style:
                  previewTarget === 'mobileWeeklyA'
                    ? {
                        background: 'var(--theme-accent)',
                        borderColor: 'var(--theme-accent)',
                        color: 'var(--theme-accent-text)',
                      }
                    : { color: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' },
                onClick: () => setPreviewTarget('mobileWeeklyA'),
              },
              APP_CONFIG.mobileWeeklyLabels?.[0] || 'Mobile Semanal 01',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: `pvt ${previewTarget === 'mobileWeeklyB' ? 'on' : ''}`,
                style:
                  previewTarget === 'mobileWeeklyB'
                    ? { background: '#00b8d4', borderColor: '#00b8d4', color: '#000' }
                    : { color: '#00b8d4', borderColor: '#00b8d4' },
                onClick: () => setPreviewTarget('mobileWeeklyB'),
              },
              APP_CONFIG.mobileWeeklyLabels?.[1] || 'Mobile Semanal 02',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'b bsec bsm',
                style: { marginLeft: 'auto', fontSize: '12px' },
                onClick: () =>
                  previewTarget === 'mobileA'
                    ? doMobileExport('A')
                    : previewTarget === 'mobileB'
                      ? doMobileExport('B')
                      : previewTarget === 'mobileWeeklyA'
                        ? doMobileWeeklyExport('A')
                        : previewTarget === 'mobileWeeklyB'
                          ? doMobileWeeklyExport('B')
                          : doExport(previewTarget),
                disabled: exporting,
              },
              React.createElement('i', { className: 'ti ti-download', 'aria-hidden': 'true' }),
              ` Baixar ${previewTarget === 'daily' ? 'Diário' : previewTarget === 'semanal' ? 'Semanal' : previewTarget === 'calendar' ? 'Calendário' : previewTarget === 'mobileA' ? 'Mobile 01' : previewTarget === 'mobileB' ? 'Mobile 02' : previewTarget === 'mobileWeeklyA' ? (APP_CONFIG.mobileWeeklyLabels?.[0] || 'Semanal 01').slice(0, 15) : (APP_CONFIG.mobileWeeklyLabels?.[1] || 'Semanal 02').slice(0, 15)}`,
            ),
          ),
          previewTarget === 'daily' &&
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  gap: '10px',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                  background: '#161616',
                  border: '1px solid #252525',
                  borderRadius: '6px',
                  padding: '10px 12px',
                },
              },
              React.createElement(
                'span',
                {
                  style: {
                    fontSize: '10px',
                    color: '#555',
                    textTransform: 'uppercase',
                    letterSpacing: '.07em',
                    width: '100%',
                    marginBottom: '2px',
                  },
                },
                'Tamanho da fonte — por zona',
              ),
              [0, 1, 2].map(zi =>
                React.createElement(
                  'div',
                  { key: zi, className: 'fg', style: { flex: 1, minWidth: '140px' } },
                  React.createElement(
                    'span',
                    { className: 'lbl', style: { color: '#e87820' } },
                    `Zona 0${zi + 1} — ${zoneScales[zi].toFixed(2)}×`,
                  ),
                  React.createElement(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        className: 'b bsm',
                        style: { padding: '3px 7px', minHeight: '26px' },
                        onClick: () =>
                          setZoneScales(s => {
                            const n = [...s]
                            n[zi] = Math.max(0.3, Math.round((n[zi] - 0.01) * 1000) / 1000)
                            return n
                          }),
                      },
                      '−',
                    ),
                    React.createElement('input', {
                      type: 'range',
                      min: '0.3',
                      max: '3',
                      step: '0.01',
                      value: zoneScales[zi],
                      onChange: e =>
                        setZoneScales(s => {
                          const n = [...s]
                          n[zi] = parseFloat(e.target.value)
                          return n
                        }),
                      style: { flex: 1, accentColor: '#e87820' },
                    }),
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        className: 'b bsm',
                        style: { padding: '3px 7px', minHeight: '26px' },
                        onClick: () =>
                          setZoneScales(s => {
                            const n = [...s]
                            n[zi] = Math.min(3, Math.round((n[zi] + 0.01) * 1000) / 1000)
                            return n
                          }),
                      },
                      '+',
                    ),
                  ),
                ),
              ),
            ),
          previewTarget === 'daily' &&
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  gap: '10px',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                  background: '#161616',
                  border: '1px solid #252525',
                  borderRadius: '6px',
                  padding: '10px 12px',
                },
              },
              React.createElement(
                'span',
                {
                  style: {
                    fontSize: '10px',
                    color: '#555',
                    textTransform: 'uppercase',
                    letterSpacing: '.07em',
                    width: '100%',
                    marginBottom: '2px',
                  },
                },
                'Tamanho do título do bloco — por zona',
              ),
              [0, 1, 2].map(zi =>
                React.createElement(
                  'div',
                  { key: zi, className: 'fg', style: { flex: 1, minWidth: '140px' } },
                  React.createElement(
                    'span',
                    { className: 'lbl', style: { color: '#f5c842' } },
                    `Título Zona 0${zi + 1} — ${blockTitleScales[zi].toFixed(2)}×`,
                  ),
                  React.createElement(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        className: 'b bsm',
                        style: { padding: '3px 7px', minHeight: '26px' },
                        onClick: () =>
                          setBlockTitleScales(s => {
                            const n = [...s]
                            n[zi] = Math.max(0.3, Math.round((n[zi] - 0.01) * 1000) / 1000)
                            return n
                          }),
                      },
                      '−',
                    ),
                    React.createElement('input', {
                      type: 'range',
                      min: '0.3',
                      max: '3',
                      step: '0.01',
                      value: blockTitleScales[zi],
                      onChange: e =>
                        setBlockTitleScales(s => {
                          const n = [...s]
                          n[zi] = parseFloat(e.target.value)
                          return n
                        }),
                      style: { flex: 1, accentColor: '#f5c842' },
                    }),
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        className: 'b bsm',
                        style: { padding: '3px 7px', minHeight: '26px' },
                        onClick: () =>
                          setBlockTitleScales(s => {
                            const n = [...s]
                            n[zi] = Math.min(3, Math.round((n[zi] + 0.01) * 1000) / 1000)
                            return n
                          }),
                      },
                      '+',
                    ),
                  ),
                ),
              ),
            ),
          React.createElement(
            'div',
            {
              ref: previewWrapRef,
              style: {
                width: '100%',
                marginBottom: '12px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#000',
                position: 'relative',
              },
            },
            React.createElement(
              'div',
              {
                style: {
                  transform: `scale(${previewTarget === 'mobileA' || previewTarget === 'mobileB' ? previewMobileScale : previewScale})`,
                  transformOrigin: 'top left',
                  width:
                    previewTarget === 'mobileA' || previewTarget === 'mobileB'
                      ? '1080px'
                      : '1920px',
                  pointerEvents: 'none',
                },
              },
              previewTarget === 'daily'
                ? React.createElement(DailyExportView, {
                    sessions: filteredSessions,
                    label,
                    gymName,
                    fontScale,
                    zoneScales,
                    blockTitleScales,
                    selectedDate,
                    logoDataUrl,
                    logoScale,
                    weekDates: currentWeekDates,
                    dvColors: {
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
                    },
                  })
                : previewTarget === 'semanal'
                  ? React.createElement(WeeklyCalendarExportView, {
                      sessions: filteredSessions,
                      label,
                      year,
                      month,
                      gymName,
                      logoDataUrl,
                      logoScale,
                      fontScale,
                      weekDates: getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates,
                      wkColors: {
                        bg: wkBg,
                        header: wkHeader,
                        dateNum: wkDateNum,
                        mainTraining: wkMainTraining,
                        blockType: wkBlockType,
                        exName: wkExName,
                        divider: wkDivider,
                      },
                    })
                  : previewTarget === 'mobileWeeklyA'
                    ? React.createElement(MobileWeeklyExportView, {
                        sessions: filteredSessions,
                        gymName,
                        logoDataUrl,
                        logoScale,
                        fontScale,
                        weekDates:
                          getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates,
                        variant: 'A',
                      })
                    : previewTarget === 'mobileWeeklyB'
                      ? React.createElement(MobileWeeklyExportView, {
                          sessions: filteredSessions,
                          gymName,
                          logoDataUrl,
                          logoScale,
                          fontScale,
                          weekDates:
                            getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates,
                          variant: 'B',
                        })
                      : previewTarget === 'mobileA'
                        ? React.createElement(MobileEaglesExportView, {
                            sessions: filteredSessions,
                            selectedDate,
                            currentWeekDates,
                            gymName,
                            logoDataUrl,
                            logoScale,
                            fontScale,
                            bgOverride: eaglesBg,
                            colors: {
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
                            },
                          })
                        : previewTarget === 'mobileB'
                          ? React.createElement(MobileMegaManExportView, {
                              sessions: filteredSessions,
                              selectedDate,
                              currentWeekDates,
                              gymName,
                              logoDataUrl,
                              logoScale,
                              fontScale,
                              bgOverride: megaManBg,
                              colors: {
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
                              },
                            })
                          : React.createElement(CalendarExportView, {
                              sessions: filteredSessions,
                              label,
                              year,
                              month,
                              gymName,
                              logoDataUrl,
                              logoScale,
                              fontScale,
                              wkColors: {
                                bg: wkBg,
                                header: wkHeader,
                                dateNum: wkDateNum,
                                mainTraining: wkMainTraining,
                                blockType: wkBlockType,
                                exName: wkExName,
                                divider: wkDivider,
                              },
                            }),
            ),
            React.createElement('div', {
              style: {
                height: `${previewTarget === 'mobileA' || previewTarget === 'mobileB' ? 'auto' : 1080}px`,
                ...(previewTarget === 'mobileA' || previewTarget === 'mobileB'
                  ? {}
                  : { marginTop: `-${1080 * previewScale}px` }),
                pointerEvents: 'none',
              },
            }),
          ),
        ),
      settingsOpen &&
        React.createElement(
          React.Fragment,
          null,
          React.createElement('div', {
            className: 'settings-overlay',
            onClick: () => setSettingsOpen(false),
          }),
          React.createElement(
            'div',
            {
              className: 'settings-modal',
              ref: el => {
                if (!el) return
                let dragging = false,
                  ox = 0,
                  oy = 0
                const hdr = el.querySelector('.settings-drag-hdr')
                if (!hdr || hdr._drag) return
                hdr._drag = true
                const down = e => {
                  dragging = true
                  const r = el.getBoundingClientRect()
                  ox = e.clientX - r.left
                  oy = e.clientY - r.top
                  el.style.transform = 'none'
                  document.addEventListener('mousemove', move)
                  document.addEventListener('mouseup', up)
                }
                const move = e => {
                  if (!dragging) return
                  el.style.left = e.clientX - ox + 'px'
                  el.style.top = e.clientY - oy + 'px'
                }
                const up = () => {
                  dragging = false
                  document.removeEventListener('mousemove', move)
                  document.removeEventListener('mouseup', up)
                }
                hdr.addEventListener('mousedown', down)
                if (!el._touch) {
                  el._touch = true
                  let ty = 0,
                    swipeFromTop = false
                  const pill = el.querySelector('.settings-sheet-pill')
                  el.addEventListener(
                    'touchstart',
                    e => {
                      ty = e.touches[0].clientY
                      swipeFromTop = hdr.contains(e.target) || !!(pill && pill.contains(e.target))
                    },
                    { passive: true },
                  )
                  el.addEventListener(
                    'touchend',
                    e => {
                      if (swipeFromTop && e.changedTouches[0].clientY - ty > 60)
                        setSettingsOpen(false)
                    },
                    { passive: true },
                  )
                }
              },
            },
            React.createElement(
              'div',
              { className: 'settings-sheet-pill' },
              React.createElement('div', { className: 'settings-sheet-pill-bar' }),
            ),
            React.createElement(
              'div',
              { className: 'settings-drag-hdr' },
              React.createElement('i', {
                className: 'ti ti-grip-horizontal',
                style: { color: '#555', fontSize: '16px' },
              }),
              React.createElement(
                'span',
                { style: { fontSize: '13px', color: '#888', marginRight: '8px', flexShrink: 0 } },
                'Configurações:',
              ),
              React.createElement(
                'select',
                {
                  value: settingsView,
                  onChange: e => setSettingsView(e.target.value),
                  style: {
                    flex: 1,
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#fff',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '5px',
                    padding: '4px 8px',
                    outline: 'none',
                    cursor: 'pointer',
                  },
                },
                React.createElement('option', { value: 'daily' }, 'Diário'),
                React.createElement('option', { value: 'semanal' }, 'Semanal'),
                React.createElement('option', { value: 'calendar' }, 'Calendário'),
                React.createElement('option', { value: 'mobileEagles' }, 'Mobile 01'),
                React.createElement('option', { value: 'megaMan' }, 'Mobile 02'),
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'b bd bsm',
                  style: {
                    marginLeft: '8px',
                    padding: '3px 8px',
                    minHeight: '24px',
                    flexShrink: 0,
                  },
                  onClick: () => setSettingsOpen(false),
                },
                React.createElement('i', { className: 'ti ti-x' }),
              ),
            ),
            React.createElement(
              'div',
              { style: { padding: '14px 16px' } },
              (() => {
                const row = ([lbl, val, setter, id]) =>
                  React.createElement(
                    'div',
                    { key: id, className: 'settings-row' },
                    React.createElement('span', { className: 'settings-lbl' }, lbl),
                    React.createElement(
                      'div',
                      { className: 'color-row' },
                      React.createElement('div', {
                        className: 'color-swatch',
                        style: { background: val },
                        onClick: () => document.getElementById('picker-' + id)?.click(),
                      }),
                      React.createElement('input', {
                        type: 'color',
                        id: 'picker-' + id,
                        value: val.startsWith('#') && val.length === 7 ? val : '#888888',
                        onChange: e => setter(e.target.value),
                      }),
                      React.createElement('input', {
                        type: 'text',
                        className: 'color-input',
                        value: val,
                        onChange: e => {
                          if (/^(#[0-9a-fA-F]{0,8}|rgba?.*)$/.test(e.target.value))
                            setter(e.target.value)
                        },
                      }),
                    ),
                  )
                const sections = {
                  daily: [
                    ['Fundo', dvBg, setDvBg, 'dv-bg'],
                    ['Nome da academia', dvGymName, setDvGymName, 'dv-gn'],
                    ['Data / dia', dvDate, setDvDate, 'dv-dt'],
                    ['Treino principal', dvMainTraining, setDvMainTraining, 'dv-mt'],
                    ['Tipo do bloco (zona)', dvZoneType, setDvZoneType, 'dv-zt'],
                    ['Tipo do bloco (sub-bloco)', dvBlockLabel, setDvBlockLabel, 'dv-bl'],
                    ['CAP / Rounds label', dvCap, setDvCap, 'dv-cp'],
                    ['Rounds valor', dvRounds, setDvRounds, 'dv-rd'],
                    ['Nome do exercício', dvExName, setDvExName, 'dv-en'],
                    ['Intensidade / Carga', dvIntensity, setDvIntensity, 'dv-in'],
                    ['Observação exercício', dvNote, setDvNote, 'dv-nt'],
                    ['Notas do bloco', dvBlockNotes, setDvBlockNotes, 'dv-bn'],
                    ['Divisor', dvDivider, setDvDivider, 'dv-dv'],
                  ],
                  semanal: [
                    ['Fundo', wkBg, setWkBg, 'wk-bg'],
                    ['Cabeçalho dias', wkHeader, setWkHeader, 'wk-hd'],
                    ['Número da data', wkDateNum, setWkDateNum, 'wk-dn'],
                    ['Treino principal', wkMainTraining, setWkMainTraining, 'wk-mt'],
                    ['Tipo do bloco', wkBlockType, setWkBlockType, 'wk-bt'],
                    ['Nome do exercício', wkExName, setWkExName, 'wk-en'],
                    ['Divisor', wkDivider, setWkDivider, 'wk-dv'],
                  ],
                  calendar: [
                    ['Fundo', wkBg, setWkBg, 'cal-bg'],
                    ['Cabeçalho dias', wkHeader, setWkHeader, 'cal-hd'],
                    ['Número da data', wkDateNum, setWkDateNum, 'cal-dn'],
                    ['Treino principal', wkMainTraining, setWkMainTraining, 'cal-mt'],
                    ['Tipo do bloco', wkBlockType, setWkBlockType, 'cal-bt'],
                    ['Nome do exercício', wkExName, setWkExName, 'cal-en'],
                    ['Divisor', wkDivider, setWkDivider, 'cal-dv'],
                  ],
                  mobileEagles: [
                    ['Fundo', eaglesBg, setEaglesBg, 'ea-bg'],
                    ['Nome da academia', eaGymName, setEaGymName, 'ea-gn'],
                    ['Data / dia', eaDate, setEaDate, 'ea-dt'],
                    ['Sub-título', eaSubtitle, setEaSubtitle, 'ea-st'],
                    ['Tipo do bloco', eaBlockType, setEaBlockType, 'ea-bt'],
                    ['Meta do bloco', eaBlockMeta, setEaBlockMeta, 'ea-bm'],
                    ['Fundo do header', eaBlockHdr, setEaBlockHdr, 'ea-bh'],
                    ['Nome do exercício', eaExName, setEaExName, 'ea-en'],
                    ['Intensidade', eaIntensity, setEaIntensity, 'ea-in'],
                    ['Divisor', eaDivider, setEaDivider, 'ea-dv'],
                    ['Observação (ambos)', noteColor, setNoteColor, 'ea-nc'],
                  ],
                  megaMan: [
                    ['Fundo', megaManBg, setMegaManBg, 'mm-bg'],
                    ['Nome da academia', mmGymName, setMmGymName, 'mm-gn'],
                    ['Data / dia', mmDate, setMmDate, 'mm-dt'],
                    ['Sub-título', mmSubtitle, setMmSubtitle, 'mm-st'],
                    ['Tipo do bloco', mmBlockType, setMmBlockType, 'mm-bt'],
                    ['Meta bg', mmBlockMetaBg, setMmBlockMetaBg, 'mm-bmbg'],
                    ['Meta texto', mmBlockMetaText, setMmBlockMetaText, 'mm-bmt'],
                    ['Fundo do header', mmBlockHdr, setMmBlockHdr, 'mm-bh'],
                    ['Nome do exercício', mmExName, setMmExName, 'mm-en'],
                    ['Intensidade', mmIntensity, setMmIntensity, 'mm-in'],
                    ['Divisor', mmDivider, setMmDivider, 'mm-dv'],
                  ],
                }
                return (sections[settingsView] || []).map(row)
              })(),
            ),
            React.createElement(
              'div',
              { style: { padding: '10px 16px', borderTop: '1px solid #252525' } },
              React.createElement(
                'div',
                {
                  style: {
                    fontSize: '11px',
                    color: '#555',
                    textTransform: 'uppercase',
                    letterSpacing: '.07em',
                    marginBottom: '8px',
                  },
                },
                'Resolução do export',
              ),
              React.createElement(
                'div',
                { style: { display: 'flex', gap: '6px' } },
                [2, 3].map(s =>
                  React.createElement(
                    'button',
                    {
                      key: s,
                      type: 'button',
                      className: 'b bsm',
                      style: {
                        background: exportScale === s ? 'var(--theme-accent)' : 'transparent',
                        color: exportScale === s ? 'var(--theme-accent-text)' : '#888',
                        borderColor: exportScale === s ? 'var(--theme-accent)' : '#2e2e2e',
                      },
                      onClick: () => setExportScale(s),
                    },
                    `${s}× ${s === 2 ? '(2160px)' : '(3240px)'}`,
                  ),
                ),
              ),
            ),
            React.createElement(
              'div',
              {
                style: {
                  padding: '8px 16px',
                  borderTop: '1px solid #252525',
                  display: 'flex',
                  gap: '8px',
                },
              },
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'b bsm',
                  style: { flex: 1 },
                  onClick: () => {
                    const inp = document.createElement('input')
                    inp.type = 'file'
                    inp.accept = '.json'
                    inp.onchange = e => {
                      const file = e.target.files[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => {
                        try {
                          const cfg = JSON.parse(ev.target.result)
                          const set = (key, setter, val) => {
                            if (val !== undefined) setter(val)
                          }
                          set('wkBg', setWkBg, cfg.wkBg)
                          set('wkHeader', setWkHeader, cfg.wkHeader)
                          set('wkDateNum', setWkDateNum, cfg.wkDateNum)
                          set('wkMainTraining', setWkMainTraining, cfg.wkMainTraining)
                          set('wkBlockType', setWkBlockType, cfg.wkBlockType)
                          set('wkExName', setWkExName, cfg.wkExName)
                          set('wkDivider', setWkDivider, cfg.wkDivider)
                          set('dvBg', setDvBg, cfg.dvBg)
                          set('dvGymName', setDvGymName, cfg.dvGymName)
                          set('dvDate', setDvDate, cfg.dvDate)
                          set('dvMainTraining', setDvMainTraining, cfg.dvMainTraining)
                          set('dvZoneType', setDvZoneType, cfg.dvZoneType)
                          set('dvBlockLabel', setDvBlockLabel, cfg.dvBlockLabel)
                          set('dvCap', setDvCap, cfg.dvCap)
                          set('dvRounds', setDvRounds, cfg.dvRounds)
                          set('dvExName', setDvExName, cfg.dvExName)
                          set('dvIntensity', setDvIntensity, cfg.dvIntensity)
                          set('dvNote', setDvNote, cfg.dvNote)
                          set('dvBlockNotes', setDvBlockNotes, cfg.dvBlockNotes)
                          set('dvDivider', setDvDivider, cfg.dvDivider)
                          set('eaGymName', setEaGymName, cfg.eaGymName)
                          set('eaDate', setEaDate, cfg.eaDate)
                          set('eaSubtitle', setEaSubtitle, cfg.eaSubtitle)
                          set('eaBlockType', setEaBlockType, cfg.eaBlockType)
                          set('eaBlockMeta', setEaBlockMeta, cfg.eaBlockMeta)
                          set('eaExName', setEaExName, cfg.eaExName)
                          set('eaIntensity', setEaIntensity, cfg.eaIntensity)
                          set('eaBlockHdr', setEaBlockHdr, cfg.eaBlockHdr)
                          set('eaDivider', setEaDivider, cfg.eaDivider)
                          if (cfg.mobileEaglesBg) setEaglesBg(cfg.mobileEaglesBg)
                          set('mmGymName', setMmGymName, cfg.mmGymName)
                          set('mmDate', setMmDate, cfg.mmDate)
                          set('mmSubtitle', setMmSubtitle, cfg.mmSubtitle)
                          set('mmBlockType', setMmBlockType, cfg.mmBlockType)
                          set('mmBlockMetaBg', setMmBlockMetaBg, cfg.mmBlockMetaBg)
                          set('mmBlockMetaText', setMmBlockMetaText, cfg.mmBlockMetaText)
                          set('mmExName', setMmExName, cfg.mmExName)
                          set('mmIntensity', setMmIntensity, cfg.mmIntensity)
                          set('mmBlockHdr', setMmBlockHdr, cfg.mmBlockHdr)
                          set('mmDivider', setMmDivider, cfg.mmDivider)
                          if (cfg.mobileMegaManBg) setMegaManBg(cfg.mobileMegaManBg)
                          if (cfg.themeAccent) {
                            APP_CONFIG.themeAccent = cfg.themeAccent
                            document.documentElement.style.setProperty(
                              '--theme-accent',
                              cfg.themeAccent,
                            )
                          }
                          if (cfg.themeAccentText) {
                            APP_CONFIG.themeAccentText = cfg.themeAccentText
                            document.documentElement.style.setProperty(
                              '--theme-accent-text',
                              cfg.themeAccentText,
                            )
                          }
                          if (cfg.fontFamily) {
                            APP_CONFIG.fontFamily = cfg.fontFamily
                            document.documentElement.style.setProperty(
                              '--export-font',
                              cfg.fontFamily,
                            )
                            if (cfg.googleFontsUrl) {
                              const gf = document.getElementById('gfonts')
                              if (gf) gf.href = cfg.googleFontsUrl
                            }
                          }
                          if (cfg.fontScale) setFontScale(cfg.fontScale)
                          if (cfg.exportScale) setExportScale(cfg.exportScale)
                          if (cfg.gymName) setGymName(cfg.gymName)
                          alert('Config carregada! Verifique o preview e salve se estiver correto.')
                        } catch (err) {
                          alert('Erro ao ler o arquivo: ' + err.message)
                        }
                      }
                      reader.readAsText(file)
                    }
                    inp.click()
                  },
                },
                React.createElement('i', { className: 'ti ti-upload' }),
                ' Carregar config',
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'b bsm',
                  style: { flex: 1 },
                  onClick: () => {
                    const exportCfg = {
                      appTitle: APP_CONFIG.appTitle,
                      appDescription: APP_CONFIG.appDescription || '',
                      scheduleTitle: APP_CONFIG.scheduleTitle || APP_CONFIG.appTitle,
                      leaderboardTitle: APP_CONFIG.leaderboardTitle || APP_CONFIG.appTitle,
                      logo: APP_CONFIG.logo || 'icon-192.png',
                      fontFamily: APP_CONFIG.fontFamily || "'Arial Black',Arial,sans-serif",
                      googleFontsUrl: APP_CONFIG.googleFontsUrl || '',
                      themeAccent: APP_CONFIG.themeAccent,
                      themeAccentText: APP_CONFIG.themeAccentText,
                      gymName: gymName || APP_CONFIG.gymName,
                      fontScale,
                      logoScale: APP_CONFIG.logoScale || 1,
                      zoneScales,
                      blockTitleScales,
                      mobileEaglesBg: eaglesBg,
                      mobileMegaManBg: megaManBg,
                      mobileExerciseNoteColor: noteColor,
                      restDayLabel: APP_CONFIG.restDayLabel,
                      mobileWeeklyLabels: APP_CONFIG.mobileWeeklyLabels,
                      exportScale,
                      blockColors: APP_CONFIG.blockColors || {},
                      blockNames: APP_CONFIG.blockNames,
                      athleteLevels: APP_CONFIG.athleteLevels,
                      athleteGoals: APP_CONFIG.athleteGoals,
                      wkBg,
                      wkHeader,
                      wkDateNum,
                      wkMainTraining,
                      wkBlockType,
                      wkExName,
                      wkDivider,
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
                      eaGymName,
                      eaDate,
                      eaSubtitle,
                      eaBlockType,
                      eaBlockMeta,
                      eaExName,
                      eaIntensity,
                      eaBlockHdr,
                      eaDivider,
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
                    }
                    const raw = window.prompt('Nome do arquivo (sem extensão):', 'config')
                    if (raw === null) return
                    const fname = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'config'
                    const blob = new Blob([JSON.stringify(exportCfg, null, 2)], {
                      type: 'application/json',
                    })
                    const a = document.createElement('a')
                    a.download = fname + '.json'
                    a.href = URL.createObjectURL(blob)
                    a.click()
                    URL.revokeObjectURL(a.href)
                  },
                },
                React.createElement('i', { className: 'ti ti-download' }),
                ' Salvar config.json',
              ),
            ),
            React.createElement(
              'div',
              { style: { padding: '4px 16px 10px', fontSize: '11px', color: '#444' } },
              'Cores também configuráveis em config.json no GitHub.',
            ),
          ),
        ),
      React.createElement(
        'div',
        {
          style: {
            position: 'fixed',
            left: '-9999px',
            top: '-9999px',
            pointerEvents: 'none',
            zIndex: -1,
            overflow: 'hidden',
          },
        },
        React.createElement(
          'div',
          { ref: exportDailyRef },
          React.createElement(DailyExportView, {
            sessions: filteredSessions,
            label,
            gymName,
            fontScale,
            zoneScales,
            blockTitleScales,
            selectedDate,
            logoDataUrl,
            logoScale,
            weekDates: currentWeekDates,
            dvColors: {
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
            },
          }),
        ),
        React.createElement(
          'div',
          { ref: exportWeeklyRef },
          React.createElement(WeeklyExportView, {
            sessions: filteredSessions,
            label,
            year,
            month,
            onDayClick: () => {},
          }),
        ),
        React.createElement(
          'div',
          { ref: exportWeeklyCalRef },
          React.createElement(WeeklyCalendarExportView, {
            sessions: filteredSessions,
            label,
            year,
            month,
            gymName,
            logoDataUrl,
            logoScale,
            fontScale,
            weekDates: getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates,
            wkColors: {
              bg: wkBg,
              header: wkHeader,
              dateNum: wkDateNum,
              mainTraining: wkMainTraining,
              blockType: wkBlockType,
              exName: wkExName,
              divider: wkDivider,
            },
          }),
        ),
        React.createElement(
          'div',
          { ref: exportCalendarRef },
          React.createElement(CalendarExportView, {
            sessions: filteredSessions,
            label,
            year,
            month,
            gymName,
            logoDataUrl,
            logoScale,
            fontScale,
            wkColors: {
              bg: wkBg,
              header: wkHeader,
              dateNum: wkDateNum,
              mainTraining: wkMainTraining,
              blockType: wkBlockType,
              exName: wkExName,
              divider: wkDivider,
            },
          }),
        ),
        React.createElement(
          'div',
          { ref: exportMobileARef, style: { width: '1080px' } },
          React.createElement(MobileEaglesExportView, {
            sessions: filteredSessions,
            selectedDate,
            currentWeekDates,
            gymName,
            logoDataUrl,
            logoScale,
            fontScale,
            bgOverride: eaglesBg,
            colors: {
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
            },
          }),
        ),
        React.createElement(
          'div',
          { ref: exportMobileBRef, style: { width: '1080px' } },
          React.createElement(MobileMegaManExportView, {
            sessions: filteredSessions,
            selectedDate,
            currentWeekDates,
            gymName,
            logoDataUrl,
            logoScale,
            fontScale,
            bgOverride: megaManBg,
            colors: {
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
            },
          }),
        ),
      ),
      !previewOpen &&
        React.createElement(
          'div',
          { style: { overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '8px' } },
          React.createElement(
            'div',
            { ref: weeklyRef },
            React.createElement(WeeklyExportView, {
              sessions: filteredSessions,
              label,
              year,
              month,
              onDayClick: handleDayClick,
            }),
          ),
        ),
    ),
  ) // closes inner div + Fragment
}

export default SchedulePublisher
