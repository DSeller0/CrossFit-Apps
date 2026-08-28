import s from './EmptyState.module.css'

// The one SPA empty state (#56/C2). Both C2 tabs opened on a centred italic line
// in an otherwise blank pane — "Selecione um atleta", "Selecione um local para
// configurar atletas", "Nenhum local cadastrado." — which is the dead-space
// complaint on #56's row, and the same family as #96/#18.
//
// The fix is not a nicer sentence, it is carrying the affordance: an empty state
// that has an action shows it, so the pane is a starting point instead of a wall.
// CLIENT-FREE (renders in the gallery).
//
//   icon    optional Tabler class ('ti-users') or a node
//   title   short statement of what is empty
//   text    optional one line of why / what to do
//   action  optional node — the button that resolves the emptiness
//   inline  compact variant for inside a Card section (no vertical centring),
//           so a section with no rows doesn't claim a screenful
//   pane    fill the height of its container (the full-pane variant)
export default function EmptyState({
  icon = null,
  title,
  text = '',
  action = null,
  inline = false,
  pane = false,
  className = '',
}) {
  if (inline) {
    return (
      <div className={`${s.inline} ${className}`.trim()}>
        <span className={s.inlineText}>{title}</span>
        {action}
      </div>
    )
  }
  return (
    <div className={`${s.empty}${pane ? ' ' + s.pane : ''} ${className}`.trim()}>
      {icon &&
        (typeof icon === 'string' ? (
          <i className={`ti ${icon} ${s.icon}`} aria-hidden="true" />
        ) : (
          <span className={s.icon}>{icon}</span>
        ))}
      <div className={s.title}>{title}</div>
      {text && <div className={s.text}>{text}</div>}
      {action}
    </div>
  )
}
