import PaneTabs from './PaneTabs.jsx'

// The Afiliados tab's top-level nav (#161/plans/77, mockup 60). A vertical 214px
// rail at ≥768px — grouped "Painéis" / "Conta" — falling back to the existing
// horizontal strip below that: a 214px rail on a 390px screen leaves nothing for
// the stage. `compact` arrives as a prop (computed by the container via
// `useIsMobile(768)`), the same convention as `AffiliatesPane`'s own `compact`.
//
// plans/42's information architecture names four panels under "Painéis" — this
// plan ships one (Meus afiliados), plans/78 appends Fechamento + Minha semana as
// two more rows in the SAME array, and the mockup's role switch ("Sou dono do
// box" + 4 more panels) is dropped outright: the app has no role model to switch
// on (plans/42, see CLAUDE.md's Afiliados section) — not rendered here at all.
//
// CLIENT-FREE.
export default function AffiliateRail({ panes = [], active, onChange, compact = false }) {
  return (
    <PaneTabs
      panes={panes}
      active={active}
      onChange={onChange}
      orientation={compact ? 'horizontal' : 'vertical'}
    />
  )
}
