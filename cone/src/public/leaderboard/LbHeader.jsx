import s from './Leaderboard.module.css'

// The selected WOD's header on the ranking column (#51, decision 1).
//
// Was the loudest thing on the page and the most off-palette: a black bar with
// a 3px #00b8d4 border and white text, all read from the retired lb_colors blob.
// Now it is what every other section header in the app is — gold, uppercase, on
// --stone, over a gold rule — so it follows the theme switcher like the rest.
export default function LbHeader({ label, meta, dt, sessName, scaleFilter = 'Todos' }) {
  const sub = [dt, sessName, scaleFilter !== 'Todos' ? scaleFilter : null].filter(Boolean).join(' · ')
  return (
    <header className={s.lbHdr}>
      <h2 className={s.lbTitle}>{label}{meta ? ` · ${meta}` : ''}</h2>
      {sub && <div className={s.lbMeta}>{sub}</div>}
    </header>
  )
}
