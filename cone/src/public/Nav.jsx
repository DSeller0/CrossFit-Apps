import { useState, Fragment } from 'react'
import {
  IconHome,
  IconTrophy,
  IconChartBar,
  IconUser,
  IconCalendar,
  IconClock,
  IconSettings,
  IconPalette,
} from '@tabler/icons-react'
import s from './Nav.module.css'

// A QR-scanned page (?from=tv, the gym-wall code) is a scan-and-log flow mid-class —
// full nav chrome, including Coach, would just get in the way, and the coach is
// physically present at the gym anyway. Deliberate exception to "Coach is reachable
// from every page" (#124/plans/59): decided, not an oversight.
export function isNavHidden() {
  return new URLSearchParams(window.location.search).get('from') === 'tv'
}

// Icons are @tabler/icons-react (inline SVG, stroke:currentColor → tint with the theme).
// NOT the `ti` webfont: leaderboard.html doesn't load it and Nav is shared by every page (#53).
const TABS = [
  {
    key: 'index',
    href: 'index.html',
    Icon: IconHome,
    label: 'Início',
    lockable: false,
    desktopOnly: false,
  },
  {
    key: 'leaderboard',
    href: 'leaderboard.html',
    Icon: IconTrophy,
    label: 'Ranking',
    lockable: false,
    desktopOnly: false,
  },
  {
    key: 'results',
    href: 'results.html',
    Icon: IconChartBar,
    label: 'Resultados',
    lockable: true,
    desktopOnly: false,
  },
  {
    key: 'me',
    href: 'me.html',
    Icon: IconUser,
    label: 'Perfil',
    lockable: true,
    desktopOnly: false,
  },
  {
    key: 'schedule',
    href: 'schedule.html',
    Icon: IconCalendar,
    label: 'Agenda',
    lockable: true,
    desktopOnly: false,
  },
  {
    key: 'timer',
    href: 'timer.html',
    Icon: IconClock,
    label: 'Timer',
    lockable: false,
    desktopOnly: true,
  },
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

  const timerTab = TABS.find(t => t.key === 'timer')
  const coachTab = { href: 'cone/', lockable: false }
  // Tema is a real public page, not a link into the SPA like Coach — but it is not a TABS
  // entry either: the main tab row is the five content pages, and this belongs with the
  // overflow set (#143).
  const temaTab = { href: 'tema.html', lockable: false }

  return (
    <>
      {/* Mobile overflow overlay */}
      {ovOpen && <div className={s.ovOverlay} onClick={() => setOvOpen(false)} />}

      {/* Mobile overflow sheet */}
      <div className={`${s.ovSheet}${ovOpen ? ' ' + s.ovSheetOpen : ''}`}>
        <div className={s.ovHandle} />
        <div className={s.ovGrid}>
          <a className={s.ovTile} href={hrefFor(timerTab)}>
            <IconClock className={s.ovIc} />
            <span className={s.ovLbl}>Timer</span>
          </a>
          <a className={s.ovTile} href={hrefFor(temaTab)}>
            <IconPalette className={s.ovIc} />
            <span className={s.ovLbl}>Tema</span>
          </a>
          <a className={s.ovTile} href={hrefFor(coachTab)}>
            <IconSettings className={s.ovIc} />
            <span className={s.ovLbl}>Coach</span>
          </a>
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
                <a
                  className={`${s.btn}${tab.key === active ? ' ' + s.active : ''}${tab.desktopOnly ? ' ' + s.desktopTab : ''}`}
                  href={href}
                >
                  <tab.Icon className={s.ic} />
                  <span>{tab.label}</span>
                </a>
              </Fragment>
            )
          })}
        </div>

        {/* Desktop-only extra links. Coach is always shown here — the SPA is already
            gated by AuthContext's OTP + is_allowed_user(), so hiding the link is not
            a security boundary, only tidiness that used to misfire whenever lockedId
            was set by ordinary in-page athlete selection (not just a shared-link lock). */}
        <div className={s.sideExtra}>
          <div className={s.sep} />
          {/* Tema needs a home here too — the overflow sheet that carries it on mobile is
              display:none at ≥768px, so without this desktop has no way to reach the page. */}
          <a className={s.btn} href={hrefFor(temaTab)}>
            <IconPalette className={s.ic} />
            <span>Tema</span>
          </a>
          <div className={s.sep} />
          <a className={s.btn} href={hrefFor(coachTab)}>
            <IconSettings className={s.ic} />
            <span>Coach</span>
          </a>
        </div>
      </nav>
    </>
  )
}
