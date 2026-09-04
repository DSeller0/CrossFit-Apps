import { toISO } from '../../../../utils/storage'
import { APP_CONFIG } from '../../../../utils/config'
import { getWeeksOfMonth } from '../exportHelpers'
import { DailyExportView, WeeklyCalendarExportView, CalendarExportView } from '../exportViews'
import {
  MobileEaglesExportView,
  MobileMegaManExportView,
  MobileWeeklyExportView,
} from '../mobileExportViews'

// ── PreviewModal — the "Pré-visualizar" panel: its own week/day tabs, the size sliders,
// and the scaled true-ratio render. Pure move (#59 C5·b1 step b); step c wired the render
// to `palette` (exportPalette.js's resolved 8-role hex, #59 C5·b1 step c) instead of the
// per-view colour props, which the views no longer accept.
// Dies in step d — the preview becomes the surface instead of a toggled panel.
export default function PreviewModal({
  open,
  year,
  month,
  previewTarget,
  setPreviewTarget,
  selectedWeekIdx,
  setSelectedWeekIdx,
  setSelectedWeek,
  selectedDate,
  setSelectedDate,
  currentWeekDates,
  filteredSessions,
  zoneScales,
  setZoneScales,
  blockTitleScales,
  setBlockTitleScales,
  previewWrapRef,
  previewScale,
  previewMobileScale,
  label,
  gymName,
  fontScale,
  logoDataUrl,
  logoScale,
  exporting,
  doExport,
  doMobileExport,
  doMobileWeeklyExport,
  palette,
}) {
  if (!open) return null
  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '6px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          className={`pvt ${previewTarget === 'semanal' ? 'on' : ''}`}
          onClick={() => {
            setPreviewTarget('semanal')
            setSelectedDate(null)
          }}
        >
          Semanal
        </button>
        {getWeeksOfMonth(year, month).map((week, wi) => {
          const mon = week[1]
          const fri = week[5]
          const fmt = d =>
            d.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
            })
          const active = selectedWeekIdx === wi
          return (
            <button
              key={wi}
              type="button"
              className="b bsm"
              style={{
                background: active ? 'var(--theme-accent)' : 'transparent',
                color: active ? 'var(--theme-accent-text)' : 'var(--theme-accent)',
                borderColor: 'var(--theme-accent)',
                fontSize: '11px',
                padding: '5px 10px',
              }}
              onClick={() => {
                setSelectedWeekIdx(wi)
                setSelectedWeek(week)
                setSelectedDate(null)
                setPreviewTarget('semanal')
              }}
            >
              {`${fmt(mon)}–${fmt(fri)}`}
            </button>
          )
        })}
      </div>
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          className={`pvt ${previewTarget === 'daily' ? 'on' : ''}`}
          onClick={() => setPreviewTarget('daily')}
        >
          Diário
        </button>
        {(() => {
          const selWk = getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates
          return selWk.slice(1).map(d => {
            const iso = toISO(d)
            const hasSession = !!filteredSessions[iso]?.length
            const active = selectedDate === iso
            return (
              <button
                key={iso}
                type="button"
                className="b bsm"
                style={{
                  background: active ? 'var(--theme-accent)' : 'transparent',
                  color: active
                    ? 'var(--theme-accent-text)'
                    : hasSession
                      ? 'var(--theme-accent)'
                      : '#444',
                  borderColor: hasSession ? 'var(--theme-accent)' : '#333',
                  fontSize: '11px',
                  padding: '5px 10px',
                }}
                onClick={() => {
                  setSelectedDate(iso)
                  setSelectedWeek(selWk)
                  setPreviewTarget('daily')
                }}
              >
                {d.toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                })}
              </button>
            )
          })
        })()}
      </div>
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          className={`pvt ${previewTarget === 'calendar' ? 'on' : ''}`}
          onClick={() => setPreviewTarget('calendar')}
        >
          Exportar Mensal
        </button>
        <button
          type="button"
          className={`pvt ${previewTarget === 'mobileA' ? 'on' : ''}`}
          style={
            previewTarget === 'mobileA'
              ? {
                  background: 'var(--theme-accent)',
                  borderColor: 'var(--theme-accent)',
                  color: 'var(--theme-accent-text)',
                }
              : {
                  color: 'var(--theme-accent)',
                  borderColor: 'var(--theme-accent)',
                }
          }
          onClick={() => setPreviewTarget('mobileA')}
        >
          Mobile 01
        </button>
        <button
          type="button"
          className={`pvt ${previewTarget === 'mobileB' ? 'on' : ''}`}
          style={
            previewTarget === 'mobileB'
              ? {
                  background: '#00b8d4',
                  borderColor: '#00b8d4',
                  color: '#000',
                }
              : { color: '#00b8d4', borderColor: '#00b8d4' }
          }
          onClick={() => setPreviewTarget('mobileB')}
        >
          Mobile 02
        </button>
        <button
          type="button"
          className={`pvt ${previewTarget === 'mobileWeeklyA' ? 'on' : ''}`}
          style={
            previewTarget === 'mobileWeeklyA'
              ? {
                  background: 'var(--theme-accent)',
                  borderColor: 'var(--theme-accent)',
                  color: 'var(--theme-accent-text)',
                }
              : {
                  color: 'var(--theme-accent)',
                  borderColor: 'var(--theme-accent)',
                }
          }
          onClick={() => setPreviewTarget('mobileWeeklyA')}
        >
          {APP_CONFIG.mobileWeeklyLabels?.[0] || 'Mobile Semanal 01'}
        </button>
        <button
          type="button"
          className={`pvt ${previewTarget === 'mobileWeeklyB' ? 'on' : ''}`}
          style={
            previewTarget === 'mobileWeeklyB'
              ? {
                  background: '#00b8d4',
                  borderColor: '#00b8d4',
                  color: '#000',
                }
              : { color: '#00b8d4', borderColor: '#00b8d4' }
          }
          onClick={() => setPreviewTarget('mobileWeeklyB')}
        >
          {APP_CONFIG.mobileWeeklyLabels?.[1] || 'Mobile Semanal 02'}
        </button>
        <button
          type="button"
          className="b bsec bsm"
          style={{ marginLeft: 'auto', fontSize: '12px' }}
          onClick={() =>
            previewTarget === 'mobileA'
              ? doMobileExport('A')
              : previewTarget === 'mobileB'
                ? doMobileExport('B')
                : previewTarget === 'mobileWeeklyA'
                  ? doMobileWeeklyExport('A')
                  : previewTarget === 'mobileWeeklyB'
                    ? doMobileWeeklyExport('B')
                    : doExport(previewTarget)
          }
          disabled={exporting}
        >
          <i className="ti ti-download" aria-hidden="true" />
          {` Baixar ${previewTarget === 'daily' ? 'Diário' : previewTarget === 'semanal' ? 'Semanal' : previewTarget === 'calendar' ? 'Calendário' : previewTarget === 'mobileA' ? 'Mobile 01' : previewTarget === 'mobileB' ? 'Mobile 02' : previewTarget === 'mobileWeeklyA' ? (APP_CONFIG.mobileWeeklyLabels?.[0] || 'Semanal 01').slice(0, 15) : (APP_CONFIG.mobileWeeklyLabels?.[1] || 'Semanal 02').slice(0, 15)}`}
        </button>
      </div>
      {previewTarget === 'daily' && (
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '8px',
            flexWrap: 'wrap',
            background: '#161616',
            border: '1px solid #252525',
            borderRadius: '6px',
            padding: '10px 12px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              color: '#555',
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              width: '100%',
              marginBottom: '2px',
            }}
          >
            Tamanho da fonte — por zona
          </span>
          {[0, 1, 2].map(zi => (
            <div key={zi} className="fg" style={{ flex: 1, minWidth: '140px' }}>
              <span className="lbl" style={{ color: '#e87820' }}>
                {`Zona 0${zi + 1} — ${zoneScales[zi].toFixed(2)}×`}
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <button
                  type="button"
                  className="b bsm"
                  style={{ padding: '3px 7px', minHeight: '26px' }}
                  onClick={() =>
                    setZoneScales(s => {
                      const n = [...s]
                      n[zi] = Math.max(0.3, Math.round((n[zi] - 0.01) * 1000) / 1000)
                      return n
                    })
                  }
                >
                  −
                </button>
                <input
                  type="range"
                  min="0.3"
                  max="3"
                  step="0.01"
                  value={zoneScales[zi]}
                  onChange={e =>
                    setZoneScales(s => {
                      const n = [...s]
                      n[zi] = parseFloat(e.target.value)
                      return n
                    })
                  }
                  style={{ flex: 1, accentColor: '#e87820' }}
                />
                <button
                  type="button"
                  className="b bsm"
                  style={{ padding: '3px 7px', minHeight: '26px' }}
                  onClick={() =>
                    setZoneScales(s => {
                      const n = [...s]
                      n[zi] = Math.min(3, Math.round((n[zi] + 0.01) * 1000) / 1000)
                      return n
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {previewTarget === 'daily' && (
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '8px',
            flexWrap: 'wrap',
            background: '#161616',
            border: '1px solid #252525',
            borderRadius: '6px',
            padding: '10px 12px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              color: '#555',
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              width: '100%',
              marginBottom: '2px',
            }}
          >
            Tamanho do título do bloco — por zona
          </span>
          {[0, 1, 2].map(zi => (
            <div key={zi} className="fg" style={{ flex: 1, minWidth: '140px' }}>
              <span className="lbl" style={{ color: '#f5c842' }}>
                {`Título Zona 0${zi + 1} — ${blockTitleScales[zi].toFixed(2)}×`}
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <button
                  type="button"
                  className="b bsm"
                  style={{ padding: '3px 7px', minHeight: '26px' }}
                  onClick={() =>
                    setBlockTitleScales(s => {
                      const n = [...s]
                      n[zi] = Math.max(0.3, Math.round((n[zi] - 0.01) * 1000) / 1000)
                      return n
                    })
                  }
                >
                  −
                </button>
                <input
                  type="range"
                  min="0.3"
                  max="3"
                  step="0.01"
                  value={blockTitleScales[zi]}
                  onChange={e =>
                    setBlockTitleScales(s => {
                      const n = [...s]
                      n[zi] = parseFloat(e.target.value)
                      return n
                    })
                  }
                  style={{ flex: 1, accentColor: '#f5c842' }}
                />
                <button
                  type="button"
                  className="b bsm"
                  style={{ padding: '3px 7px', minHeight: '26px' }}
                  onClick={() =>
                    setBlockTitleScales(s => {
                      const n = [...s]
                      n[zi] = Math.min(3, Math.round((n[zi] + 0.01) * 1000) / 1000)
                      return n
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div
        ref={previewWrapRef}
        style={{
          width: '100%',
          marginBottom: '12px',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#000',
          position: 'relative',
        }}
      >
        <div
          style={{
            ...palette,
            transform: `scale(${previewTarget === 'mobileA' || previewTarget === 'mobileB' ? previewMobileScale : previewScale})`,
            transformOrigin: 'top left',
            width: previewTarget === 'mobileA' || previewTarget === 'mobileB' ? '1080px' : '1920px',
            pointerEvents: 'none',
          }}
        >
          {previewTarget === 'daily' ? (
            <DailyExportView
              sessions={filteredSessions}
              label={label}
              gymName={gymName}
              fontScale={fontScale}
              zoneScales={zoneScales}
              blockTitleScales={blockTitleScales}
              selectedDate={selectedDate}
              logoDataUrl={logoDataUrl}
              logoScale={logoScale}
              weekDates={currentWeekDates}
            />
          ) : previewTarget === 'semanal' ? (
            <WeeklyCalendarExportView
              sessions={filteredSessions}
              label={label}
              year={year}
              month={month}
              gymName={gymName}
              logoDataUrl={logoDataUrl}
              logoScale={logoScale}
              fontScale={fontScale}
              weekDates={getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates}
            />
          ) : previewTarget === 'mobileWeeklyA' || previewTarget === 'mobileWeeklyB' ? (
            <MobileWeeklyExportView
              sessions={filteredSessions}
              gymName={gymName}
              logoDataUrl={logoDataUrl}
              logoScale={logoScale}
              fontScale={fontScale}
              weekDates={getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates}
            />
          ) : previewTarget === 'mobileA' ? (
            <MobileEaglesExportView
              sessions={filteredSessions}
              selectedDate={selectedDate}
              currentWeekDates={currentWeekDates}
              gymName={gymName}
              logoDataUrl={logoDataUrl}
              logoScale={logoScale}
              fontScale={fontScale}
            />
          ) : previewTarget === 'mobileB' ? (
            <MobileMegaManExportView
              sessions={filteredSessions}
              selectedDate={selectedDate}
              currentWeekDates={currentWeekDates}
              gymName={gymName}
              logoDataUrl={logoDataUrl}
              logoScale={logoScale}
              fontScale={fontScale}
            />
          ) : (
            <CalendarExportView
              sessions={filteredSessions}
              label={label}
              year={year}
              month={month}
              gymName={gymName}
              logoDataUrl={logoDataUrl}
              logoScale={logoScale}
              fontScale={fontScale}
            />
          )}
        </div>
        <div
          style={{
            height: `${previewTarget === 'mobileA' || previewTarget === 'mobileB' ? 'auto' : 1080}px`,
            ...(previewTarget === 'mobileA' || previewTarget === 'mobileB'
              ? {}
              : { marginTop: `-${1080 * previewScale}px` }),
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}
