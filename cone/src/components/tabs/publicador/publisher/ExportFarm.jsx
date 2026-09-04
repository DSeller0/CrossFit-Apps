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
// step b): no behaviour change. ⚠️ Every view here must stay mounted and measurable —
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
  dvColors,
  wkColors,
  eaColors,
  mmColors,
  eaglesBg,
  megaManBg,
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
        <div ref={exportDailyRef}>
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
            dvColors={dvColors}
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
        <div ref={exportWeeklyCalRef}>
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
            wkColors={wkColors}
          />
        </div>
        <div ref={exportCalendarRef}>
          <CalendarExportView
            sessions={filteredSessions}
            label={label}
            year={year}
            month={month}
            gymName={gymName}
            logoDataUrl={logoDataUrl}
            logoScale={logoScale}
            fontScale={fontScale}
            wkColors={wkColors}
          />
        </div>
        <div ref={exportMobileARef} style={{ width: '1080px' }}>
          <MobileEaglesExportView
            sessions={filteredSessions}
            selectedDate={selectedDate}
            currentWeekDates={currentWeekDates}
            gymName={gymName}
            logoDataUrl={logoDataUrl}
            logoScale={logoScale}
            fontScale={fontScale}
            bgOverride={eaglesBg}
            colors={eaColors}
          />
        </div>
        <div ref={exportMobileBRef} style={{ width: '1080px' }}>
          <MobileMegaManExportView
            sessions={filteredSessions}
            selectedDate={selectedDate}
            currentWeekDates={currentWeekDates}
            gymName={gymName}
            logoDataUrl={logoDataUrl}
            logoScale={logoScale}
            fontScale={fontScale}
            bgOverride={megaManBg}
            colors={mmColors}
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
