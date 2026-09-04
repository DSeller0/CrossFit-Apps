import PresenterView from '../../../PresenterView'
import { DailyExportView } from '../exportViews'
import { resolveDaySession } from '../exportHelpers'
import { resolveTitle } from '../titleHelpers'

// ── PresenterLauncher — the TV-mode overlay, pulled out of Publicador.jsx's render body.
// `palette` is exportPalette.js's resolved 8-role hex object (#59 C5·b1 step c) — set as
// inline custom properties on the wrapper so DailyExportView's `--a-*` reads resolve.
// Shares the coach's current Layout/Blocos/Títulos settings (#59 C5·b2) rather than a
// second hardcoded set — Apresentar is a view of the same Dia artefact, not a fork of it.
export default function PresenterLauncher({
  open,
  logUrl,
  onClose,
  sessions,
  titles,
  gymName,
  fontScale,
  zoneScales,
  blockTitleScales,
  zoneCount,
  zoneSplit,
  blockTreatment,
  blockContent,
  selectedDate,
  logoDataUrl,
  logoScale,
  weekDates,
  palette,
}) {
  if (!open) return null
  const resolved = resolveDaySession(sessions, weekDates, selectedDate)
  return (
    <PresenterView logUrl={logUrl} onClose={onClose}>
      <div style={palette}>
        <DailyExportView
          sessions={sessions}
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
          weekDates={weekDates}
        />
      </div>
    </PresenterView>
  )
}
