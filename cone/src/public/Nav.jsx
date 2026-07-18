import { useState, Fragment } from 'react'
import { IconHome, IconTrophy, IconChartBar, IconUser, IconCalendar, IconClock, IconSettings } from '@tabler/icons-react'
import s from './Nav.module.css'

export function isNavHidden() {
  return new URLSearchParams(window.location.search).get('from') === 'tv'
}

// Icons are @tabler/icons-react (inline SVG, stroke:currentColor → tint with the theme).
// NOT the `ti` webfont: leaderboard.html doesn't load it and Nav is shared by every page (#53).
const TABS = [
  { key: 'index',       href: 'index.html',       Icon: IconHome,     label: 'Início',     lockable: false, desktopOnly: false },
  { key: 'leaderboard', href: 'leaderboard.html', Icon: IconTrophy,   label: 'Ranking',    lockable: false, desktopOnly: false },
  { key: 'results',     href: 'results.html',     Icon: IconChartBar, label: 'Resultados', lockable: true,  desktopOnly: false },
  { key: 'me',          href: 'me.html',          Icon: IconUser,     label: 'Perfil',     lockable: true,  desktopOnly: false },
  { key: 'schedule',    href: 'schedule.html',    Icon: IconCalendar, label: 'Agenda',     lockable: true,  desktopOnly: false },
  { key: 'timer',       href: 'timer.html',       Icon: IconClock,    label: 'Timer',      lockable: false, desktopOnly: true  },
]

export default function Nav({ active, lockedId, gymName = '', box = null }) {
  const [ovOpen, setOvOpen] = useState(false)

  if (isNavHidden()) return null

  // Carry the athlete lock (?id=) and the box scope (?box=) across public pages so a
  // scoped/shared link keeps its filter as the user navigates.
  const hrefFor = tab => {
    const p = new URLSearchParams()
    if (lockedId && tab.lockable) p.set('id', lockedId)
    if (box) p.set('box', box)
    const qs = p.toString()
    return qs ? `${tab.href}?${qs}` : tab.href
  }

  return (
    <>
      {/* Mobile overflow overlay */}
      {ovOpen && <div className={s.ovOverlay} onClick={() => setOvOpen(false)} />}

      {/* Mobile overflow sheet */}
      <div className={`${s.ovSheet}${ovOpen ? ' ' + s.ovSheetOpen : ''}`}>
        <div className={s.ovHandle} />
        <div className={s.ovGrid}>
          <a className={s.ovTile} href="timer.html">
            <IconClock className={s.ovIc} />
            <span className={s.ovLbl}>Timer</span>
          </a>
          {!lockedId && (
            <a className={s.ovTile} href="cone/">
              <IconSettings className={s.ovIc} />
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
          {gymName && <span className={s.sideGym}>{gymName}</span>}
        </div>

        {/* Tab row */}
        <div className={s.tabRow}>
          {TABS.map((tab, i) => {
            const href = hrefFor(tab)
            return (
              <Fragment key={tab.key}>
                {i > 0 && <div className={s.sep} />}
                <a className={`${s.btn}${tab.key === active ? ' ' + s.active : ''}${tab.desktopOnly ? ' ' + s.desktopTab : ''}`} href={href}>
                  <tab.Icon className={s.ic} />
                  <span>{tab.label}</span>
                </a>
              </Fragment>
            )
          })}
        </div>

        {/* Desktop-only extra links */}
        {!lockedId && (
          <div className={s.sideExtra}>
            <div className={s.sep} />
            <a className={s.btn} href="cone/">
              <IconSettings className={s.ic} />
              <span>Coach</span>
            </a>
          </div>
        )}
      </nav>
    </>
  )
}
