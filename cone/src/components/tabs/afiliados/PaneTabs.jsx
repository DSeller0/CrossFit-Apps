import s from './Afiliados.module.css'

// The tab's pane switcher (#56/C2 · plans/42's information architecture).
//
// plans/42 names four panes — Afiliados · Coaches · Turmas · Meu negócio. TWO ship:
// Coaches is #103 (`settings.coaches[]`) and Turmas is #40 (`settings.classSchedule`),
// and neither has any data behind it yet. So the shell takes its panes as an ARRAY
// and #103/#40 each append one row — rather than shipping two "em breve" tabs now.
//
// That is not caution for its own sake: `locations[].coachName` was added as
// groundwork, is written by the affiliate form, and is read by nothing. A visible
// empty tab is the same mistake with more surface area.
//
// CLIENT-FREE.
export default function PaneTabs({ panes = [], active, onChange }) {
  return (
    <div className={s.paneTabs} role="tablist" aria-label="Seções de Afiliados">
      {panes.map(p => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={active === p.id}
          className={`${s.paneTab}${active === p.id ? ' ' + s.paneTabOn : ''}`}
          onClick={() => onChange?.(p.id)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
