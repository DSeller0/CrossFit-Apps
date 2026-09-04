import { getWeeksOfMonth } from '../exportHelpers'
import { DailyExportView, WeeklyCalendarExportView, CalendarExportView } from '../exportViews'
import { MobileEaglesExportView, MobileWeeklyExportView } from '../mobileExportViews'

// Shared by ExportFarm (the off-screen, full-size html2canvas target) and PreviewPane
// (the on-screen, transform:scaled human-visible copy) so the format→view mapping lives
// in exactly one place (#59 C5·b1 step d). Neither caller wraps the result in anything
// sizing-related — that's each caller's own concern.
export function renderArtefact(format, ctx) {
  const {
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
  } = ctx
  const weekDates = getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates
  switch (format) {
    case 'dia':
      return (
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
      )
    case 'semana':
      return (
        <WeeklyCalendarExportView
          sessions={filteredSessions}
          label={label}
          year={year}
          month={month}
          gymName={gymName}
          logoDataUrl={logoDataUrl}
          logoScale={logoScale}
          fontScale={fontScale}
          weekDates={weekDates}
        />
      )
    case 'diaMobile':
      return (
        <MobileEaglesExportView
          sessions={filteredSessions}
          selectedDate={selectedDate}
          currentWeekDates={currentWeekDates}
          gymName={gymName}
          logoDataUrl={logoDataUrl}
          logoScale={logoScale}
          fontScale={fontScale}
        />
      )
    case 'semanaMobile':
      return (
        <MobileWeeklyExportView
          sessions={filteredSessions}
          gymName={gymName}
          logoDataUrl={logoDataUrl}
          logoScale={logoScale}
          fontScale={fontScale}
          weekDates={weekDates}
        />
      )
    default: // 'mes'
      return (
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
      )
  }
}
