import { useState } from 'react'
import MobileFrame from './MobileFrame.jsx'
import { THEMES } from './fixtures.js'
import spa from './groups/spa.jsx'
import criador from './groups/criador.jsx'
import atletas from './groups/atletas.jsx'
import afiliados from './groups/afiliados.jsx'
import resultados from './groups/resultados.jsx'
import agenda from './groups/agenda.jsx'
import publicador from './groups/publicador.jsx'
import shared from './groups/shared.jsx'
import results from './groups/results.jsx'
import leaderboard from './groups/leaderboard.jsx'
import me from './groups/me.jsx'
import schedule from './groups/schedule.jsx'
import index from './groups/index.jsx'
import tema from './groups/tema.jsx'
import s from './Gallery.module.css'

// ── Component gallery (dev-only) ───────────────────────────────────────────────
// The all-states source of truth: renders the REAL components in every state so
// it cannot drift from what ships. Grows page-by-page as reusable pieces are
// extracted (see #17 / the design program). Coverage standard + process:
// cone/docs/WORKFLOW.md → "Design / component gallery".
//
// This file is the shell only — theme select, stage-width toggle, sidebar. Each
// group (one component family) lives in its own file under groups/, composed here
// into GROUPS. Shared mock data lives in fixtures.js; reusable render shells
// (Case/Section/FixedFrame/…) live in harness.jsx. #74 (plans/41) split this out
// of a single 1790-line file — see that plan for the extraction map.

// Exported for scripts/design-cards-entry.jsx: `npm run design:cards` SSRs these same
// items into the Claude Design cards, so the cards cannot drift from the gallery.
// ⚠️ A group's name becomes its generated card's FILENAME (`components/${group
// .toLowerCase()}.html` in scripts/build-design-cards.mjs), so it must stay a single
// clean ASCII token — which is why C2's group is "Afiliados" and never "Serviços".
export const GROUPS = [
  spa,
  criador,
  atletas,
  afiliados,
  resultados,
  agenda,
  publicador,
  shared,
  results,
  leaderboard,
  me,
  schedule,
  index,
  tema,
]

const ALL_ITEMS = GROUPS.flatMap(g => g.items)

export default function Gallery() {
  const [theme, setTheme] = useState(() => localStorage.getItem('cone_theme') || 'totk-dark')
  const [w, setW] = useState('full')
  const [selectedId, setSelectedId] = useState(ALL_ITEMS[0]?.id)

  function changeTheme(v) {
    setTheme(v)
    document.documentElement.className = 'theme-' + v
    try {
      localStorage.setItem('cone_theme', v)
    } catch {
      /* ignore */
    }
  }

  const selected = ALL_ITEMS.find(i => i.id === selectedId) || ALL_ITEMS[0]

  return (
    <div className={s.root}>
      <header className={s.bar}>
        <div className={s.barTitle}>
          Galeria de componentes <span className={s.barDev}>dev</span>
        </div>
        <div className={s.barCtrls}>
          <label className={s.ctrl}>
            <span className={s.ctrlLbl}>Tema</span>
            <select className={s.select} value={theme} onChange={e => changeTheme(e.target.value)}>
              {THEMES.map(t => (
                <option key={t.v} value={t.v}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className={s.wToggle} role="group" aria-label="Largura do palco">
            <button
              className={`${s.wBtn}${w === 'mobile' ? ' ' + s.wBtnOn : ''}`}
              onClick={() => setW('mobile')}
            >
              390
            </button>
            <button
              className={`${s.wBtn}${w === 'full' ? ' ' + s.wBtnOn : ''}`}
              onClick={() => setW('full')}
            >
              Full
            </button>
          </div>
        </div>
      </header>

      <div className={s.layout}>
        <nav className={s.sidebar} aria-label="Componentes">
          {GROUPS.map(g => (
            <div key={g.group} className={s.sidebarGroup}>
              <div className={s.sidebarGroupTitle}>{g.group}</div>
              {g.items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`${s.sidebarItem}${selectedId === item.id ? ' ' + s.sidebarItemOn : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  {item.label}
                </button>
              ))}
              {g.items.length === 0 && <div className={s.sidebarEmpty}>em breve</div>}
            </div>
          ))}
        </nav>

        <main className={s.main}>
          {w === 'mobile' ? (
            <MobileFrame theme={theme} width={390}>
              <div className={s.stage}>{selected ? selected.render() : null}</div>
            </MobileFrame>
          ) : (
            <div className={s.stage}>{selected ? selected.render() : null}</div>
          )}
        </main>
      </div>
    </div>
  )
}
