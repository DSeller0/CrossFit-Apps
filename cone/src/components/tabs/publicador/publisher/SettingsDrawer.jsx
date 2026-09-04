import { APP_CONFIG } from '../../../../utils/config'

// ── SettingsDrawer — the ~40-input colour drawer + resolution + config import/export.
// Pure move (#59 C5·b1 step b): no behaviour change. Dies in step d, replaced by the
// 8-role Aparência panel under "Personalizado" (plans/82's colour model).
export default function SettingsDrawer({
  open,
  onClose,
  settingsView,
  setSettingsView,
  fields,
  exportScale,
  setExportScale,
  gymName,
  setGymName,
  fontScale,
  setFontScale,
  zoneScales,
  blockTitleScales,
}) {
  if (!open) return null
  const f = fields
  const row = ([lbl, val, setter, id]) => (
    <div key={id} className="settings-row">
      <span className="settings-lbl">{lbl}</span>
      <div className="color-row">
        <div
          className="color-swatch"
          style={{ background: val }}
          onClick={() => document.getElementById('picker-' + id)?.click()}
        />
        <input
          type="color"
          id={'picker-' + id}
          value={val.startsWith('#') && val.length === 7 ? val : '#888888'}
          onChange={e => setter(e.target.value)}
        />
        <input
          type="text"
          className="color-input"
          value={val}
          onChange={e => {
            if (/^(#[0-9a-fA-F]{0,8}|rgba?.*)$/.test(e.target.value)) setter(e.target.value)
          }}
        />
      </div>
    </div>
  )
  const sections = {
    daily: [
      ['Fundo', f.dvBg, f.setDvBg, 'dv-bg'],
      ['Nome da academia', f.dvGymName, f.setDvGymName, 'dv-gn'],
      ['Data / dia', f.dvDate, f.setDvDate, 'dv-dt'],
      ['Treino principal', f.dvMainTraining, f.setDvMainTraining, 'dv-mt'],
      ['Tipo do bloco (zona)', f.dvZoneType, f.setDvZoneType, 'dv-zt'],
      ['Tipo do bloco (sub-bloco)', f.dvBlockLabel, f.setDvBlockLabel, 'dv-bl'],
      ['CAP / Rounds label', f.dvCap, f.setDvCap, 'dv-cp'],
      ['Rounds valor', f.dvRounds, f.setDvRounds, 'dv-rd'],
      ['Nome do exercício', f.dvExName, f.setDvExName, 'dv-en'],
      ['Intensidade / Carga', f.dvIntensity, f.setDvIntensity, 'dv-in'],
      ['Observação exercício', f.dvNote, f.setDvNote, 'dv-nt'],
      ['Notas do bloco', f.dvBlockNotes, f.setDvBlockNotes, 'dv-bn'],
      ['Divisor', f.dvDivider, f.setDvDivider, 'dv-dv'],
    ],
    semanal: [
      ['Fundo', f.wkBg, f.setWkBg, 'wk-bg'],
      ['Cabeçalho dias', f.wkHeader, f.setWkHeader, 'wk-hd'],
      ['Número da data', f.wkDateNum, f.setWkDateNum, 'wk-dn'],
      ['Treino principal', f.wkMainTraining, f.setWkMainTraining, 'wk-mt'],
      ['Tipo do bloco', f.wkBlockType, f.setWkBlockType, 'wk-bt'],
      ['Nome do exercício', f.wkExName, f.setWkExName, 'wk-en'],
      ['Divisor', f.wkDivider, f.setWkDivider, 'wk-dv'],
    ],
    calendar: [
      ['Fundo', f.wkBg, f.setWkBg, 'cal-bg'],
      ['Cabeçalho dias', f.wkHeader, f.setWkHeader, 'cal-hd'],
      ['Número da data', f.wkDateNum, f.setWkDateNum, 'cal-dn'],
      ['Treino principal', f.wkMainTraining, f.setWkMainTraining, 'cal-mt'],
      ['Tipo do bloco', f.wkBlockType, f.setWkBlockType, 'cal-bt'],
      ['Nome do exercício', f.wkExName, f.setWkExName, 'cal-en'],
      ['Divisor', f.wkDivider, f.setWkDivider, 'cal-dv'],
    ],
    mobileEagles: [
      ['Fundo', f.eaglesBg, f.setEaglesBg, 'ea-bg'],
      ['Nome da academia', f.eaGymName, f.setEaGymName, 'ea-gn'],
      ['Data / dia', f.eaDate, f.setEaDate, 'ea-dt'],
      ['Sub-título', f.eaSubtitle, f.setEaSubtitle, 'ea-st'],
      ['Tipo do bloco', f.eaBlockType, f.setEaBlockType, 'ea-bt'],
      ['Meta do bloco', f.eaBlockMeta, f.setEaBlockMeta, 'ea-bm'],
      ['Fundo do header', f.eaBlockHdr, f.setEaBlockHdr, 'ea-bh'],
      ['Nome do exercício', f.eaExName, f.setEaExName, 'ea-en'],
      ['Intensidade', f.eaIntensity, f.setEaIntensity, 'ea-in'],
      ['Divisor', f.eaDivider, f.setEaDivider, 'ea-dv'],
      ['Observação (ambos)', f.noteColor, f.setNoteColor, 'ea-nc'],
    ],
    megaMan: [
      ['Fundo', f.megaManBg, f.setMegaManBg, 'mm-bg'],
      ['Nome da academia', f.mmGymName, f.setMmGymName, 'mm-gn'],
      ['Data / dia', f.mmDate, f.setMmDate, 'mm-dt'],
      ['Sub-título', f.mmSubtitle, f.setMmSubtitle, 'mm-st'],
      ['Tipo do bloco', f.mmBlockType, f.setMmBlockType, 'mm-bt'],
      ['Meta bg', f.mmBlockMetaBg, f.setMmBlockMetaBg, 'mm-bmbg'],
      ['Meta texto', f.mmBlockMetaText, f.setMmBlockMetaText, 'mm-bmt'],
      ['Fundo do header', f.mmBlockHdr, f.setMmBlockHdr, 'mm-bh'],
      ['Nome do exercício', f.mmExName, f.setMmExName, 'mm-en'],
      ['Intensidade', f.mmIntensity, f.setMmIntensity, 'mm-in'],
      ['Divisor', f.mmDivider, f.setMmDivider, 'mm-dv'],
    ],
  }
  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div
        className="settings-modal"
        ref={el => {
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
                if (swipeFromTop && e.changedTouches[0].clientY - ty > 60) onClose()
              },
              { passive: true },
            )
          }
        }}
      >
        <div className="settings-sheet-pill">
          <div className="settings-sheet-pill-bar" />
        </div>
        <div className="settings-drag-hdr">
          <i className="ti ti-grip-horizontal" style={{ color: '#555', fontSize: '16px' }} />
          <span style={{ fontSize: '13px', color: '#888', marginRight: '8px', flexShrink: 0 }}>
            Configurações:
          </span>
          <select
            value={settingsView}
            onChange={e => setSettingsView(e.target.value)}
            style={{
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
            }}
          >
            <option value="daily">Diário</option>
            <option value="semanal">Semanal</option>
            <option value="calendar">Calendário</option>
            <option value="mobileEagles">Mobile 01</option>
            <option value="megaMan">Mobile 02</option>
          </select>
          <button
            type="button"
            className="b bd bsm"
            style={{
              marginLeft: '8px',
              padding: '3px 8px',
              minHeight: '24px',
              flexShrink: 0,
            }}
            onClick={onClose}
          >
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ padding: '14px 16px' }}>{(sections[settingsView] || []).map(row)}</div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #252525' }}>
          <div
            style={{
              fontSize: '11px',
              color: '#555',
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              marginBottom: '8px',
            }}
          >
            Resolução do export
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[2, 3].map(s => (
              <button
                key={s}
                type="button"
                className="b bsm"
                style={{
                  background: exportScale === s ? 'var(--theme-accent)' : 'transparent',
                  color: exportScale === s ? 'var(--theme-accent-text)' : '#888',
                  borderColor: exportScale === s ? 'var(--theme-accent)' : '#2e2e2e',
                }}
                onClick={() => setExportScale(s)}
              >
                {`${s}× ${s === 2 ? '(2160px)' : '(3240px)'}`}
              </button>
            ))}
          </div>
        </div>
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid #252525',
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            type="button"
            className="b bsm"
            style={{ flex: 1 }}
            onClick={() => {
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
                    set('wkBg', f.setWkBg, cfg.wkBg)
                    set('wkHeader', f.setWkHeader, cfg.wkHeader)
                    set('wkDateNum', f.setWkDateNum, cfg.wkDateNum)
                    set('wkMainTraining', f.setWkMainTraining, cfg.wkMainTraining)
                    set('wkBlockType', f.setWkBlockType, cfg.wkBlockType)
                    set('wkExName', f.setWkExName, cfg.wkExName)
                    set('wkDivider', f.setWkDivider, cfg.wkDivider)
                    set('dvBg', f.setDvBg, cfg.dvBg)
                    set('dvGymName', f.setDvGymName, cfg.dvGymName)
                    set('dvDate', f.setDvDate, cfg.dvDate)
                    set('dvMainTraining', f.setDvMainTraining, cfg.dvMainTraining)
                    set('dvZoneType', f.setDvZoneType, cfg.dvZoneType)
                    set('dvBlockLabel', f.setDvBlockLabel, cfg.dvBlockLabel)
                    set('dvCap', f.setDvCap, cfg.dvCap)
                    set('dvRounds', f.setDvRounds, cfg.dvRounds)
                    set('dvExName', f.setDvExName, cfg.dvExName)
                    set('dvIntensity', f.setDvIntensity, cfg.dvIntensity)
                    set('dvNote', f.setDvNote, cfg.dvNote)
                    set('dvBlockNotes', f.setDvBlockNotes, cfg.dvBlockNotes)
                    set('dvDivider', f.setDvDivider, cfg.dvDivider)
                    set('eaGymName', f.setEaGymName, cfg.eaGymName)
                    set('eaDate', f.setEaDate, cfg.eaDate)
                    set('eaSubtitle', f.setEaSubtitle, cfg.eaSubtitle)
                    set('eaBlockType', f.setEaBlockType, cfg.eaBlockType)
                    set('eaBlockMeta', f.setEaBlockMeta, cfg.eaBlockMeta)
                    set('eaExName', f.setEaExName, cfg.eaExName)
                    set('eaIntensity', f.setEaIntensity, cfg.eaIntensity)
                    set('eaBlockHdr', f.setEaBlockHdr, cfg.eaBlockHdr)
                    set('eaDivider', f.setEaDivider, cfg.eaDivider)
                    if (cfg.mobileEaglesBg) f.setEaglesBg(cfg.mobileEaglesBg)
                    set('mmGymName', f.setMmGymName, cfg.mmGymName)
                    set('mmDate', f.setMmDate, cfg.mmDate)
                    set('mmSubtitle', f.setMmSubtitle, cfg.mmSubtitle)
                    set('mmBlockType', f.setMmBlockType, cfg.mmBlockType)
                    set('mmBlockMetaBg', f.setMmBlockMetaBg, cfg.mmBlockMetaBg)
                    set('mmBlockMetaText', f.setMmBlockMetaText, cfg.mmBlockMetaText)
                    set('mmExName', f.setMmExName, cfg.mmExName)
                    set('mmIntensity', f.setMmIntensity, cfg.mmIntensity)
                    set('mmBlockHdr', f.setMmBlockHdr, cfg.mmBlockHdr)
                    set('mmDivider', f.setMmDivider, cfg.mmDivider)
                    if (cfg.mobileMegaManBg) f.setMegaManBg(cfg.mobileMegaManBg)
                    if (cfg.themeAccent) {
                      APP_CONFIG.themeAccent = cfg.themeAccent
                      document.documentElement.style.setProperty('--theme-accent', cfg.themeAccent)
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
                      document.documentElement.style.setProperty('--export-font', cfg.fontFamily)
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
            }}
          >
            <i className="ti ti-upload" />
            {' Carregar config'}
          </button>
          <button
            type="button"
            className="b bsm"
            style={{ flex: 1 }}
            onClick={() => {
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
                mobileEaglesBg: f.eaglesBg,
                mobileMegaManBg: f.megaManBg,
                mobileExerciseNoteColor: f.noteColor,
                restDayLabel: APP_CONFIG.restDayLabel,
                mobileWeeklyLabels: APP_CONFIG.mobileWeeklyLabels,
                exportScale,
                blockColors: APP_CONFIG.blockColors || {},
                blockNames: APP_CONFIG.blockNames,
                athleteLevels: APP_CONFIG.athleteLevels,
                athleteGoals: APP_CONFIG.athleteGoals,
                wkBg: f.wkBg,
                wkHeader: f.wkHeader,
                wkDateNum: f.wkDateNum,
                wkMainTraining: f.wkMainTraining,
                wkBlockType: f.wkBlockType,
                wkExName: f.wkExName,
                wkDivider: f.wkDivider,
                dvBg: f.dvBg,
                dvGymName: f.dvGymName,
                dvDate: f.dvDate,
                dvMainTraining: f.dvMainTraining,
                dvZoneType: f.dvZoneType,
                dvBlockLabel: f.dvBlockLabel,
                dvCap: f.dvCap,
                dvRounds: f.dvRounds,
                dvExName: f.dvExName,
                dvIntensity: f.dvIntensity,
                dvNote: f.dvNote,
                dvBlockNotes: f.dvBlockNotes,
                dvDivider: f.dvDivider,
                eaGymName: f.eaGymName,
                eaDate: f.eaDate,
                eaSubtitle: f.eaSubtitle,
                eaBlockType: f.eaBlockType,
                eaBlockMeta: f.eaBlockMeta,
                eaExName: f.eaExName,
                eaIntensity: f.eaIntensity,
                eaBlockHdr: f.eaBlockHdr,
                eaDivider: f.eaDivider,
                mmGymName: f.mmGymName,
                mmDate: f.mmDate,
                mmSubtitle: f.mmSubtitle,
                mmBlockType: f.mmBlockType,
                mmBlockMetaBg: f.mmBlockMetaBg,
                mmBlockMetaText: f.mmBlockMetaText,
                mmExName: f.mmExName,
                mmIntensity: f.mmIntensity,
                mmBlockHdr: f.mmBlockHdr,
                mmDivider: f.mmDivider,
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
            }}
          >
            <i className="ti ti-download" />
            {' Salvar config.json'}
          </button>
        </div>
        <div
          style={{
            padding: '4px 16px 10px',
            fontSize: '11px',
            color: '#444',
          }}
        >
          Cores também configuráveis em config.json no GitHub.
        </div>
      </div>
    </>
  )
}
