import s from './Gallery.module.css'

// Reusable shells for the gallery's GROUPS entries (src/public/gallery/groups/*.jsx).
// Per-component demo wrappers (stateful interactive fixtures) live in ./demos.jsx —
// split out once this file grew past the gallery's own ~350-line guideline.

export function Case({ label, children }) {
  return (
    <div className={s.case}>
      <div className={s.caseLbl}>{label}</div>
      <div className={s.caseStage}>{children}</div>
    </div>
  )
}

// Wraps position:fixed components in the transform-containment trick, so
// each Case's fixed panel is isolated to its own box instead of all of them
// stacking at the real viewport edge when several Cases render on one page
// at once. Needed in both Full and MobileFrame's real-iframe mode — the
// iframe fixes @media viewport correctness, not per-Case isolation. `.frameSide`
// is sized wide enough (see Gallery.module.css) that LogPane's hardcoded
// `width:400px` never clips against this box's own width.
export function FixedFrame({ variant, children }) {
  return <div className={`${s.frame} ${s[variant]}`}>{children}</div>
}

export function Section({ title, sub, children }) {
  return (
    <section className={s.section}>
      <div className={s.sectionHdr}>
        <h2 className={s.sectionTitle}>{title}</h2>
        {sub && <span className={s.sectionSub}>{sub}</span>}
      </div>
      {children}
    </section>
  )
}

// Contained fixed-overlay: a transformed wrapper makes ConfirmReview's position:fixed
// overlay resolve to this box instead of the page viewport (same trick as FixedFrame).
export function ModalBox({ children }) {
  return (
    <div
      style={{
        position: 'relative',
        transform: 'translateZ(0)',
        height: 340,
        overflow: 'hidden',
        border: '1px solid var(--divider)',
      }}
    >
      {children}
    </div>
  )
}

export function TallModalBox({ children }) {
  return (
    <div
      style={{
        position: 'relative',
        transform: 'translateZ(0)',
        height: 560,
        overflow: 'hidden',
        border: '1px solid var(--divider)',
      }}
    >
      {children}
    </div>
  )
}

// Same transform:translateZ(0) containment as ModalBox/FixedFrame (needed for
// AppChrome's position:fixed sidebar), but scrollable with tall filler content
// below the children — the one case (AppChrome's "Fixa na rolagem") that needs a
// real scrollport to demonstrate a position:sticky element actually sticking,
// rather than just render once and sit still.
export function ScrollFrame({ children }) {
  return (
    <div
      style={{
        position: 'relative',
        transform: 'translateZ(0)',
        height: 420,
        overflow: 'auto',
        border: '1px solid var(--divider)',
      }}
    >
      {children}
      <div style={{ height: 900, padding: 16, fontSize: 12, color: 'var(--dim)' }}>
        Role para ver a barra fixa…
      </div>
    </div>
  )
}
