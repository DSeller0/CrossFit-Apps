import { getWeeksOfMonth } from '../exportHelpers'
import {
  DailyExportView,
  WeeklyExportView,
  WeeklyCalendarExportView,
  CalendarExportView,
} from '../exportViews'
import { MobileEaglesExportView, MobileMegaManExportView } from '../mobileExportViews'

// ── ExportFarm — the off-screen html2canvas render targets, plus the always-visible
// on-screen week grid shown when the preview panel is closed. Pure move (#59 C5·b1
// step b); step c wired the rasterised targets to `palette` (exportPalette.js's resolved
// 8-role hex, #59 C5·b1 step c) via inline custom properties on each wrapper — the views
// themselves take no colour prop any more. ⚠️ `WeeklyExportView` (both mounts below) is
// screen chrome, never rasterised (see exportViews.jsx's file header) — it does NOT get
// the palette. ⚠️ Every rasterised view here must stay mounted and measurable —
// html2canvas cannot rasterise an unmounted or display:none target.
export default function ExportFarm({
  filteredSessions,
  label,
  gymName,
  fontScale,
  zoneScales,
  blockTitleScales,
  selectedDate,
  logoDataUrl,
  logoScale,
  currentWeekDates,
  year,
  month,
  selectedWeekIdx,
  palette,
  exportDailyRef,
  exportWeeklyRef,
  exportWeeklyCalRef,
  exportCalendarRef,
  exportMobileARef,
  exportMobileBRef,
  weeklyRef,
  previewOpen,
  handleDayClick,
}) {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          pointerEvents: 'none',
          zIndex: -1,
          overflow: 'hidden',
        }}
      >
        <div ref={exportDailyRef} style={palette}>
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
        </div>
        <div ref={exportWeeklyRef}>
          <WeeklyExportView
            sessions={filteredSessions}
            label={label}
            year={year}
            month={month}
            onDayClick={() => {}}
          />
        </div>
        <div ref={exportWeeklyCalRef} style={palette}>
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
        </div>
        <div ref={exportCalendarRef} style={palette}>
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
        </div>
        <div ref={exportMobileARef} style={{ ...palette, width: '1080px' }}>
          <MobileEaglesExportView
            sessions={filteredSessions}
            selectedDate={selectedDate}
            currentWeekDates={currentWeekDates}
            gymName={gymName}
            logoDataUrl={logoDataUrl}
            logoScale={logoScale}
            fontScale={fontScale}
          />
        </div>
        <div ref={exportMobileBRef} style={{ ...palette, width: '1080px' }}>
          <MobileMegaManExportView
            sessions={filteredSessions}
            selectedDate={selectedDate}
            currentWeekDates={currentWeekDates}
            gymName={gymName}
            logoDataUrl={logoDataUrl}
            logoScale={logoScale}
            fontScale={fontScale}
          />
        </div>
      </div>
      {!previewOpen && (
        <div
          style={{
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            borderRadius: '8px',
          }}
        >
          <div ref={weeklyRef}>
            <WeeklyExportView
              sessions={filteredSessions}
              label={label}
              year={year}
              month={month}
              onDayClick={handleDayClick}
            />
          </div>
        </div>
      )}
    </>
  )
}
