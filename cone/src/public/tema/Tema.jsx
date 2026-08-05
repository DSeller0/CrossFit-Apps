import { useState, useEffect } from 'react'
import { sb } from '../supabaseClient.js'
import { registerSW } from '../registerSW.js'
import Header from '../Header.jsx'
import Nav from '../Nav.jsx'
import { getBoxScope } from '../lib/boxScope.js'
import {
  THEMES,
  applyTheme,
  getAppliedTheme,
  getUserTheme,
  setUserTheme,
  clearUserTheme,
  resolveTheme,
} from '../lib/theme.js'
import ThemeCards from './ThemeCards.jsx'
import s from './Tema.module.css'

// The public theme picker (#143). Before this, the only shipped switcher lived in the SPA's
// Configurações tab — an athlete on a public page had no way to change the theme at all.
//
// Two things share this screen and they are NOT the same thing:
//   · picking a theme    → writes cone_theme_user, and from then on the visitor's pick beats
//                          whatever the coach set for the box
//   · "Usar o tema do box" → clears that key, handing control back to the box/gym default
// The reset only renders when a pick is actually in effect, so it is never a button that
// does nothing.
export default function Tema() {
  const [box] = useState(() => getBoxScope())
  const [settings, setSettings] = useState({})
  const [theme, setTheme] = useState(getAppliedTheme)
  const [userPick, setUserPick] = useState(getUserTheme)
  const [gymName, setGymName] = useState('CONE')

  useEffect(() => {
    registerSW()
    sb.from('settings')
      .select('value')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        const st = data?.value || {}
        setSettings(st)
        if (st.gymName) setGymName(st.gymName.toUpperCase())
        // Don't call syncTheme here: the picker is the one screen where the visitor is
        // actively choosing, and re-resolving mid-interaction would fight them. It only
        // matters for the very first paint, and the boot script already handled that.
      })
      .catch(() => {})
  }, [])

  const pick = id => {
    setUserTheme(id)
    setUserPick(id)
    setTheme(applyTheme(id))
  }

  const useBoxDefault = () => {
    clearUserTheme()
    setUserPick(null)
    setTheme(applyTheme(resolveTheme({ settings, box, userTheme: null })))
  }

  // What they'd fall back to — named so the reset button says what it will actually do
  // rather than "reset".
  const fallback = resolveTheme({ settings, box, userTheme: null })
  const fallbackLabel = THEMES.find(t => t.id === fallback)?.label

  return (
    <>
      <div className={s.pageRoot}>
        <Header brand={gymName} sub="TEMA" />
        <main className={s.main}>
          <p className={s.lead}>Escolha como o Cone aparece neste aparelho.</p>

          <ThemeCards value={theme} onPick={pick} />

          {userPick && fallback !== userPick && (
            <div className={s.resetRow}>
              <button type="button" className={s.resetBtn} onClick={useBoxDefault}>
                Usar o tema do box
              </button>
              {fallbackLabel && <span className={s.resetHint}>Voltar para {fallbackLabel}</span>}
            </div>
          )}

          <p className={s.note}>
            A escolha vale só para este aparelho e continua valendo nas outras páginas.
          </p>
        </main>
      </div>
      <Nav gymName={gymName} box={box} />
    </>
  )
}
