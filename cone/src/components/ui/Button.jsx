import s from './Button.module.css'

// The one SPA button (#54/C0). Replaces the zoo: global .b/.bp/.bsec/.bd/.bsm/.bfull
// + the .tb-btn family + the dozens of inline-styled/hardcoded-hex buttons across the
// tabs. Every value is a themes.css token — no baked hex — so all four themes respond.
// CLIENT-FREE by rule: this renders in the public-server gallery, so it must never
// import a Supabase client (directly or transitively).
//
//   variant  primary   — the one main action (accent fill)
//            secondary — neutral outline (default)
//            destructive — delete/remove/clear (--red)
//            ghost     — tertiary / dense-row text button
//   size     md (40) · sm (32) · xs (24)
//   iconOnly — square; REQUIRES an accessible label (aria-label or title), enforced
//              below so #14's a11y is inherited, not re-litigated per page.
export default function Button({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  full = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  if (iconOnly && !rest['aria-label'] && !rest.title && import.meta.env?.DEV) {
    console.warn('Button: iconOnly requires an `aria-label` (or `title`) — the icon has no text for assistive tech.')
  }
  const cls = [
    s.btn, s[variant], s[size],
    iconOnly ? s.iconOnly : '',
    full ? s.full : '',
    className,
  ].filter(Boolean).join(' ')
  return <button type={type} className={cls} {...rest}>{children}</button>
}
