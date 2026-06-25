import { useState, Fragment } from 'react'
import s from './Nav.module.css'

const TABS = [
  { key: 'index',       href: 'index.html',      icon: '🏠', label: 'Início',     lockable: false },
  { key: 'leaderboard', href: 'leaderboard.html', icon: '🏆', label: 'Ranking',    lockable: false },
  { key: 'results',     href: 'results.html',     icon: '📊', label: 'Resultados', lockable: true  },
  { key: 'me',          href: 'me.html',          icon: '👤', label: 'Perfil',     lockable: true  },
  { key: 'schedule',    href: 'schedule.html',    icon: '📅', label: 'Agenda',     lockable: true  },
]

export default function Nav({ active, lockedId }) {
  const [ovOpen, setOvOpen] = useState(false)

  return (
    <>
      {/* Mobile overflow overlay */}
      {ovOpen && <div className={s.ovOverlay} onClick={() => setOvOpen(false)} />}

      {/* Mobile overflow sheet */}
      <div className={`${s.ovSheet}${ovOpen ? ' ' + s.ovSheetOpen : ''}`}>
        <div className={s.ovHandle} />
        <div className={s.ovGrid}>
          <a className={s.ovTile} href="timer.html">
            <span className={s.ovIc}>⏱️</span>
            <span className={s.ovLbl}>Timer</span>
          </a>
          {!lockedId && (
            <a className={s.ovTile} href="cone/">
              <span className={s.ovIc}>⚙️</span>
              <span className={s.ovLbl}>Coach</span>
            </a>
          )}
        </div>
      </div>

      <nav className={s.nav}>
        {/* Mobile pill handle — tap to open overflow */}
        <button className={s.pill} onClick={() => setOvOpen(p => !p)} aria-label="Mais">
          <div className={s.pillBar} />
        </button>

        {/* Desktop sidebar brand */}
        <div className={s.sideBrand}>
          <span className={s.sideName}>CONE</span>
        </div>

        {/* Tab row */}
        <div className={s.tabRow}>
          {TABS.map((tab, i) => {
            const href = lockedId && tab.lockable ? `${tab.href}?id=${lockedId}` : tab.href
            return (
              <Fragment key={tab.key}>
                {i > 0 && <div className={s.sep} />}
                <a className={`${s.btn}${tab.key === active ? ' ' + s.active : ''}`} href={href}>
                  <span className={s.ic}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </a>
              </Fragment>
            )
          })}
        </div>

        {/* Desktop-only extra links */}
        <div className={s.sideExtra}>
          <div className={s.sep} />
          <a className={s.btn} href="timer.html">
            <span className={s.ic}>⏱️</span>
            <span>Timer</span>
          </a>
          {!lockedId && (
            <>
              <div className={s.sep} />
              <a className={s.btn} href="cone/">
                <span className={s.ic}>⚙️</span>
                <span>Coach</span>
              </a>
            </>
          )}
        </div>
      </nav>
    </>
  )
}
