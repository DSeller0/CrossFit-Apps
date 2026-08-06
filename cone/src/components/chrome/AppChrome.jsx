import { useEffect, useRef } from 'react'
import Button from '../ui/Button'
import { TABS } from './tabs'
import s from './AppChrome.module.css'

const SYNC_ICON = {
  syncing: 'ti-loader-2',
  synced: 'ti-check',
  conflict: 'ti-alert-triangle',
}
const SYNC_ANNOUNCE = {
  syncing: 'Sincronizando…',
  synced: 'Sincronizado',
  conflict: 'Conflito de sincronização',
}

// The SPA's one chrome row (#95/plans/69) — replaces the old two-row topbar +
// tab-bar (up to 226px tall on mobile, wrapped into ~6 rows, and the cause of
// a sideways scroll from the account email). Fully props-in and CLIENT-FREE:
// every handler arrives as a prop so this renders in the gallery unmodified —
// that is what makes a Lane-A review of every state possible at all.
//
// Returns a FRAGMENT, not a wrapper div — position:sticky on .bar is clipped by
// its parent's box, so a wrapper holding only the 49px bar would stop the bar
// from sticking past its own height (the same trap CLAUDE.md records for
// Criador's WeekGrid).
export default function AppChrome({
  tab,
  onTabChange,
  tabs = TABS,
  gymName = '',
  userEmail = '',
  syncState = 'idle',
  onSync,
  onSignOut,
  autoSaved = false,
  homeHref = '../index.html',
}) {
  const activeTabRef = useRef(null)

  // Landing on a deep-linked tab (e.g. ?tab=config, the 9th of 9) leaves the
  // underline off-screen without this — block:'nearest' is load-bearing,
  // 'start' scrolls the whole page instead of just the strip.
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [tab])

  const activeLabel = tabs.find(t => t.id === tab)?.label || 'Cone'
  const syncing = syncState === 'syncing'
  const syncIcon = SYNC_ICON[syncState] || 'ti-refresh'

  return (
    <>
      <aside className={s.sidebar}>
        <div className={s.brand}>
          <div className={s.logo}>C O N E</div>
          {gymName && <div className={s.gym}>{gymName}</div>}
        </div>
        <nav className={s.sideNav} aria-label="Seções">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              className={`${s.sideItem}${t.id === tab ? ' ' + s.on : ''}`}
              aria-current={t.id === tab ? 'page' : undefined}
              onClick={() => onTabChange(t.id)}
            >
              <i className={`ti ${t.icon}`} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      <header className={s.bar}>
        <a href={homeHref} className={s.home} aria-label="Início" title="Início">
          <i className="ti ti-home" aria-hidden="true" />
        </a>

        <h1 className={s.title}>{activeLabel}</h1>

        <nav className={s.nav} aria-label="Seções">
          {tabs.map(t => (
            <button
              key={t.id}
              ref={t.id === tab ? activeTabRef : null}
              type="button"
              className={`${s.navBtn}${t.id === tab ? ' ' + s.on : ''}`}
              aria-current={t.id === tab ? 'page' : undefined}
              onClick={() => onTabChange(t.id)}
            >
              <i className={`ti ${t.icon}`} aria-hidden="true" />
              {t.short ?? t.label}
            </button>
          ))}
        </nav>

        {userEmail && (
          <span className={s.account} title={userEmail}>
            <i className="ti ti-user" aria-hidden="true" />
            {userEmail}
          </span>
        )}

        {autoSaved && (
          <span className={s.saved}>
            <i className="ti ti-device-floppy" aria-hidden="true" />
            Salvo automaticamente
          </span>
        )}

        <span role="status" className={s.srStatus}>
          {SYNC_ANNOUNCE[syncState] || ''}
        </span>

        <Button
          variant={syncState === 'conflict' ? 'destructive' : 'secondary'}
          size="md"
          iconOnly
          className={syncState === 'conflict' ? `${s.iconCtrl} ${s.syncConflict}` : s.iconCtrl}
          aria-label="Sincronizar"
          title="Sincronizar"
          disabled={syncing}
          onClick={onSync}
        >
          <i className={`ti ${syncIcon}${syncing ? ' ' + s.spin : ''}`} aria-hidden="true" />
        </Button>

        <Button
          variant="secondary"
          size="md"
          iconOnly
          className={s.iconCtrl}
          aria-label="Sair da conta"
          title="Sair da conta"
          onClick={onSignOut}
        >
          <i className="ti ti-logout" aria-hidden="true" />
        </Button>
      </header>

      {syncState === 'conflict' && (
        <div className={s.banner}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          Sessões foram alteradas em outro dispositivo desde que você abriu o app. Sincronize antes
          de salvar para não perder dados.
          <Button variant="destructive" size="sm" className={s.bannerAction} onClick={onSync}>
            Sincronizar agora
          </Button>
        </div>
      )}
    </>
  )
}
