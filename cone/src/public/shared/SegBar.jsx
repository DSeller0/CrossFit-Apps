import s from './SegBar.module.css'

// The segmented progress bar — the app's one HP-bar primitive.
//
// The same idea existed in three diverging copies before #52: me.html's goal bar
// (.msBar) and PR mini-bars (.bar/.barSmall), and the retired athletes.html's
// StatRow/BlockBar. All three faked the segments with a repeating-linear-gradient
// that had the dark-theme background baked into it as a literal rgba(13,11,9,.65),
// so on either light theme the notches painted dark bands across the bar. Here the
// dividers are real elements drawn in var(--bg), which is what they always meant.
//
// `color` is a DATA color (block family / scale / an attribute's identity), passed
// in by the caller — not a theme token. `ticks` are milestone markers positioned by
// percentage — full-height lines through the track since mockup 22 — used by the goal
// bars and reserved for the Desenvolvimento stats card (plans/22).
//
// `segments` stays at 10 because that's what the barless callers (BarList, PrSection's
// mini-bars) want; GoalList opts into the 1% grid with segments={100}. The cells are
// real elements rather than the mockup's background-image trick on purpose: a tiled
// gradient lands a divider on the bar's own left edge, which the flex cells'
// border-right never does, and every caller would have inherited that notch.
//
// Presentational only: the caller owns the label, the value, and the accessible name.
export default function SegBar({
  pct = 0,
  color = 'var(--teal)',
  size = 'md',          // 'sm' | 'md' | 'lg'
  segments = 10,
  ticks = null,         // [{ pct, state: 'hit' | 'next' | 'future' }]
  grow = false,
  className = '',
}) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0))
  return (
    // Two elements, deliberately: the track clips the fill, and the ticks sit OUTSIDE
    // that clipping context. With the ticks inside it, a milestone at 0% or 100% got
    // sliced in half by the track's own overflow:hidden.
    <div className={`${s.wrap} ${s[size]}${grow ? ' ' + s.grow : ''} ${className}`} role="presentation">
      <div className={s.track}>
        <div className={s.fill} style={{ width: clamped + '%', background: color }} />
        <div className={s.grid} aria-hidden="true">
          {Array.from({ length: segments }, (_, i) => <span key={i} className={s.cell} />)}
        </div>
      </div>
      {ticks?.map((t, i) => (
        <span
          key={i}
          className={`${s.tick} ${t.state === 'hit' ? s.tickHit : t.state === 'next' ? s.tickNext : s.tickFuture}`}
          style={{ left: Math.max(0, Math.min(100, Number(t.pct) || 0)) + '%' }}
        />
      ))}
    </div>
  )
}
