import { getWeeksOfMonth, resolveDaySession, buildMobileSession } from '../exportHelpers'
import { visibleWeekDates } from '../layoutHelpers'
import { resolveTitle } from '../titleHelpers'
import { DailyExportView, WeeklyCalendarExportView, CalendarExportView } from '../exportViews'
import {
  MobileEaglesExportView,
  MobileMegaManExportView,
  MobileWeeklyExportView,
} from '../mobileExportViews'

// Shared by ExportFarm (the off-screen, full-size html2canvas target) and PreviewPane
// (the on-screen, transform:scaled human-visible copy) so the format→view mapping lives
// in exactly one place (#59 C5·b1 step d). Neither caller wraps the result in anything
// sizing-related — that's each caller's own concern.
//
// #59 · C5·b2 (plans/83) added the parametric axes: `fontScaleByFormat` (T9 — per-format,
// not one shared number), `zoneCount`/`zoneSplit` (T6 Dia), `visibleDays` (T6 Semana),
// `blockTreatment`/`blockContent` (T5), `titles`/`footer` (T7), `mobileModel` (the Dia
// mobile "modelo" pair) and `locations` (Mês's per-box cell colours).
export function renderArtefact(format, ctx) {
  const {
    filteredSessions,
    titles,
    gymName,
    footer,
    fontScaleByFormat,
    zoneScales,
    blockTitleScales,
    zoneCount,
    zoneSplit,
    blockTreatment,
    blockContent,
    mobileModel,
    visibleDays,
    selectedDate,
    logoDataUrl,
    logoScale,
    currentWeekDates,
    year,
    month,
    selectedWeekIdx,
    locations,
  } = ctx
  const weekDates = getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates
  const fontScale = (fontScaleByFormat && fontScaleByFormat[format]) || 1

  switch (format) {
    case 'dia': {
      const resolved = resolveDaySession(filteredSessions, currentWeekDates, selectedDate)
      return (
        <DailyExportView
          sessions={filteredSessions}
          title={resolveTitle('dia', titles, { date: resolved?.date })}
          gymName={gymName}
          fontScale={fontScale}
          zoneScales={zoneScales}
          blockTitleScales={blockTitleScales}
          zoneCount={zoneCount}
          zoneSplit={zoneSplit}
          blockTreatment={blockTreatment}
          blockContent={blockContent}
          selectedDate={selectedDate}
          logoDataUrl={logoDataUrl}
          logoScale={logoScale}
          weekDates={currentWeekDates}
        />
      )
    }
    case 'semana': {
      const visibleDates = visibleWeekDates(weekDates, visibleDays)
      return (
        <WeeklyCalendarExportView
          sessions={filteredSessions}
          title={resolveTitle('semana', titles, { weekDates: visibleDates })}
          year={year}
          month={month}
          gymName={gymName}
          logoDataUrl={logoDataUrl}
          logoScale={logoScale}
          fontScale={fontScale}
          weekDates={weekDates}
          visibleDays={visibleDays}
          blockTreatment={blockTreatment}
          blockContent={blockContent}
        />
      )
    }
    case 'diaMobile': {
      const found = buildMobileSession(filteredSessions, selectedDate, currentWeekDates)
      const View = mobileModel === 'impacto' ? MobileMegaManExportView : MobileEaglesExportView
      return (
        <View
          sessions={filteredSessions}
          title={resolveTitle('diaMobile', titles, { date: found?.date })}
          footer={footer}
          selectedDate={selectedDate}
          currentWeekDates={currentWeekDates}
          gymName={gymName}
          logoDataUrl={logoDataUrl}
          logoScale={logoScale}
          fontScale={fontScale}
          blockContent={blockContent}
        />
      )
    }
    case 'semanaMobile': {
      const visibleDates = visibleWeekDates(weekDates, visibleDays)
      return (
        <MobileWeeklyExportView
          sessions={filteredSessions}
          title={resolveTitle('semanaMobile', titles, { weekDates: visibleDates })}
          footer={footer}
          gymName={gymName}
          logoDataUrl={logoDataUrl}
          logoScale={logoScale}
          fontScale={fontScale}
          weekDates={weekDates}
          visibleDays={visibleDays}
          blockContent={blockContent}
        />
      )
    }
    default: // 'mes'
      return (
        <CalendarExportView
          sessions={filteredSessions}
          title={resolveTitle('mes', titles, { year, month })}
          year={year}
          month={month}
          gymName={gymName}
          logoDataUrl={logoDataUrl}
          logoScale={logoScale}
          fontScale={fontScale}
          locations={locations}
        />
      )
  }
}
