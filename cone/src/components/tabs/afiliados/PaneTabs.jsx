import s from './Afiliados.module.css'

// The tab's pane switcher (#56/C2 · plans/42's information architecture; the
// vertical rail variant is #161/plans/77).
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
// `orientation: 'vertical'` is the mockup-60 rail (AffiliateRail.jsx, desktop): a
// grouped column instead of a scroll-strip of pills — each pane may carry a
// `group` label (rendered once, when it changes from the previous row) and a
// `count` badge. It is a SEPARATE render branch, not a CSS reflow of the same
// markup — a `role="tablist"`/`role="tab"` pair needs the tab as a DIRECT child of
// the list, so wrapping horizontal's buttons in a group-header <div> to reuse one
// tree would have broken that a11y contract for no benefit (the horizontal strip
// never had groups to render).
//
// `withGroupFlags` is a plain (non-component) helper, not inline in the render
// map — react-hooks/immutability flags reassigning a `let` from inside a .map()
// callback that runs during render, since that closure needs to stay stable for
// the compiler. Precomputing the flags in an ordinary function call, before JSX
// is produced, sidesteps that entirely (the mutation is private to this call).
function withGroupFlags(panes) {
  let lastGroup
  return panes.map(p => {
    const showGroup = Boolean(p.group && p.group !== lastGroup)
    lastGroup = p.group
    return { ...p, showGroup }
  })
}

// CLIENT-FREE.
export default function PaneTabs({ panes = [], active, onChange, orientation = 'horizontal' }) {
  if (orientation === 'vertical') {
    return (
      <nav className={s.rail} aria-label="Painéis de Afiliados">
        {withGroupFlags(panes).map(p => (
          <div key={p.id}>
            {p.showGroup && <div className={s.railGroup}>{p.group}</div>}
            <button
              type="button"
              aria-current={active === p.id ? 'page' : undefined}
              className={`${s.railItem}${active === p.id ? ' ' + s.railItemOn : ''}`}
              onClick={() => onChange?.(p.id)}
            >
              <span className={s.railLabel}>{p.label}</span>
              {typeof p.count === 'number' && <span className={s.railCount}>{p.count}</span>}
            </button>
          </div>
        ))}
      </nav>
    )
  }

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
