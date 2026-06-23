import { Fragment } from 'react'
import s from './Nav.module.css'

const TABS = [
  { key: 'index',       href: 'index.html',       icon: '🏠', label: 'Início'     },
  { key: 'leaderboard', href: 'leaderboard.html',  icon: '🏆', label: 'Ranking'    },
  { key: 'results',     href: 'results.html',      icon: '📊', label: 'Resultados' },
  { key: 'me',          href: 'me.html',           icon: '👤', label: 'Perfil'     },
  { key: 'schedule',    href: 'schedule.html',     icon: '📅', label: 'Agenda'     },
]

export default function Nav({ active }) {
  return (
    <nav className={s.nav}>
      {TABS.map((tab, i) => (
        <Fragment key={tab.key}>
          {i > 0 && <div className={s.sep} />}
          <a className={`${s.btn}${tab.key === active ? ` ${s.active}` : ''}`} href={tab.href}>
            <span className={s.ic}>{tab.icon}</span>
            <span>{tab.label}</span>
          </a>
        </Fragment>
      ))}
    </nav>
  )
}
