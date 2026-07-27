import s from './TallyBar.module.css'

// The app's one bar primitive — a segmented sub-tank gauge (Design mockup 24).
//
// Reads in tens: each of the 10 blocks is 10%, and the single block the value lands
// inside subdivides into 10 units. So it stays countable at a glance and still
// resolves to 1% where the value actually is. Always 10 blocks, whatever the
// denominator — the caller converts its own "5 / 6" into a percentage and keeps
// printing the literal numbers beside the bar.
//
// Replaces SegBar, whose continuous track + full-width 1% grid this supersedes.
// #52's rule holds: ONE bar primitive, never two. Before #52 there were three
// hand-rolled copies, each faking its segments with a repeating-linear-gradient that
// had the dark theme's background baked in as a literal rgba(13,11,9,.65) — so both
// light themes painted dark bands across the bar. Here every divider is a real
// element in var(--bg), which is what they always meant.
//
// `color` is a DATA color (block family / attribute identity) passed in by the caller
// — never a theme token. `ticks` are milestone markers positioned by percentage: the
// goal bars use them, and the Desenvolvimento stats card (plans/22) may.
//
// Presentational only: the caller owns the label, the value and the accessible name.
const BLOCKS = 10
const UNITS = 10

export default function TallyBar({
  pct = 0,
  color = 'var(--teal)',
  size = 'md', // 'sm' (5px) | 'md' (7px) | 'lg' (14px)
  ticks = null, // [{ pct, state: 'hit' | 'next' | 'future' }]
  grow = false,
  className = '',
}) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0))
  const full = Math.floor(clamped / BLOCKS)
  // No partial once every block is full — 100% is ten solid blocks, not nine and a
  // full-looking tenth.
  const partial = full < BLOCKS ? Math.round(clamped - full * BLOCKS) : 0

  return (
    <div
      className={`${s.bar} ${s[size]}${grow ? ' ' + s.grow : ''} ${className}`}
      role="presentation"
    >
      {Array.from({ length: BLOCKS }, (_, i) => {
        if (i < full) {
          return (
            <span key={i} className={`${s.block} ${s.blockFull}`} style={{ background: color }} />
          )
        }
        if (i === full && partial > 0) {
          return (
            <span key={i} className={`${s.block} ${s.blockPartial}`}>
              {Array.from({ length: UNITS }, (_, u) => (
                <span
                  key={u}
                  className={`${s.unit}${u < partial ? ' ' + s.unitOn : ''}`}
                  style={u < partial ? { background: color } : undefined}
                />
              ))}
            </span>
          )
        }
        return <span key={i} className={`${s.block} ${s.blockEmpty}`} />
      })}

      {ticks?.map((t, i) => (
        <span
          key={'t' + i}
          className={`${s.tick} ${t.state === 'hit' ? s.tickHit : t.state === 'next' ? s.tickNext : s.tickFuture}`}
          style={{ left: Math.max(0, Math.min(100, Number(t.pct) || 0)) + '%' }}
        />
      ))}
    </div>
  )
}
