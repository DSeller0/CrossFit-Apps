import PresenterView from '../../../PresenterView'
import { DailyExportView } from '../exportViews'

// ── PresenterLauncher — the TV-mode overlay, pulled out of Publicador.jsx's render body.
// `palette` is exportPalette.js's resolved 8-role hex object (#59 C5·b1 step c) — set as
// inline custom properties on the wrapper so DailyExportView's `--a-*` reads resolve.
export default function PresenterLauncher({
  open,
  logUrl,
  onClose,
  sessions,
  label,
  gymName,
  fontScale,
  zoneScales,
  blockTitleScales,
  selectedDate,
  logoDataUrl,
  logoScale,
  weekDates,
  palette,
}) {
  if (!open) return null
  return (
    <PresenterView logUrl={logUrl} onClose={onClose}>
      <div style={palette}>
        <DailyExportView
          sessions={sessions}
          label={label}
          gymName={gymName}
          fontScale={fontScale}
          zoneScales={zoneScales}
          blockTitleScales={blockTitleScales}
          selectedDate={selectedDate}
          logoDataUrl={logoDataUrl}
          logoScale={logoScale}
          weekDates={weekDates}
        />
      </div>
    </PresenterView>
  )
}
