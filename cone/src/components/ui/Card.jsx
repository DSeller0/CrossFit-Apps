import s from './Card.module.css'

// The one SPA surface (#54/C0). --stone/--stone2 + --border/--divider + minimal
// radius, padded on the --sp scale. Replaces the .sc-card/.ex-card/modal shells that
// each pick their own radius (6–16px) and padding. CLIENT-FREE (renders in the gallery).
//
//   variant  'stone' (default) | 'stone2' (nested/inset surface)
//   title    optional section title (rendered in the label style)
//   pad      'md' (--sp-4, default) | 'sm' (--sp-3) | 'none'
//   as       element/component to render as (default 'div')
export default function Card({
  variant = 'stone',
  title = null,
  pad = 'md',
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const cls = [s.card, s[variant], s[`pad-${pad}`], className].filter(Boolean).join(' ')
  return (
    <Tag className={cls} {...rest}>
      {title && <div className={s.title}>{title}</div>}
      {children}
    </Tag>
  )
}
