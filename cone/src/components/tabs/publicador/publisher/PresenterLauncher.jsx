import PresenterView from '../../../PresenterView'
import { DailyExportView } from '../exportViews'

// ── PresenterLauncher — the TV-mode overlay, pulled out of Publicador.jsx's render body.
// Pure move (#59 C5·b1 step b): same props, same DailyExportView instance, no behaviour change.
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
  dvColors,
}) {
  if (!open) return null
  return (
    <PresenterView logUrl={logUrl} onClose={onClose}>
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
        dvColors={dvColors}
      />
    </PresenterView>
  )
}
