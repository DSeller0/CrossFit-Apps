import { Fragment } from 'react'
import s from './Nav.module.css'

const TABS = [
  { key: 'index',       href: 'index.html',      icon: '🏠', label: 'Início',     lockable: false },
  { key: 'leaderboard', href: 'leaderboard.html', icon: '🏆', label: 'Ranking',    lockable: false },
  { key: 'results',     href: 'results.html',     icon: '📊', label: 'Resultados', lockable: true  },
  { key: 'me',          href: 'me.html',          icon: '👤', label: 'Perfil',     lockable: true  },
  { key: 'schedule',    href: 'schedule.html',    icon: '📅', label: 'Agenda',     lockable: true  },
]

export default function Nav({ active, lockedId }) {
  return (
    <nav className={s.nav}>
      {TABS.map((tab, i) => {
        const href = lockedId && tab.lockable ? `${tab.href}?id=${lockedId}` : tab.href
        return (
          <Fragment key={tab.key}>
            {i > 0 && <div className={s.sep} />}
            <a className={`${s.btn}${tab.key === active ? ` ${s.active}` : ''}`} href={href}>
              <span className={s.ic}>{tab.icon}</span>
              <span>{tab.label}</span>
            </a>
          </Fragment>
        )
      })}
    </nav>
  )
}
