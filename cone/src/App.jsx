import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useAuth } from './context/AuthContext'
import { useSync } from './context/SyncContext'
import {
  loadLS,
  loadResults,
  loadAthletes,
  loadLocations,
  loadSettings,
  saveSettings,
} from './utils/storage'
import { supabase } from './utils/supabase'
import { APP_CONFIG, GF } from './utils/config'
import LoginScreen from './components/LoginScreen'
import AppChrome from './components/chrome/AppChrome'

const CriadorTab = lazy(() => import('./components/tabs/Criador'))
const AtletasTab = lazy(() => import('./components/tabs/Atletas'))
const ExerciciosTab = lazy(() => import('./components/tabs/Exercicios'))
const AfiliadosTab = lazy(() => import('./components/tabs/afiliados/Afiliados'))
const ResultadosTab = lazy(() => import('./components/tabs/Resultados'))
const ConfigTab = lazy(() => import('./components/tabs/Config'))
const PublicadorTab = lazy(() => import('./components/tabs/Publicador'))
const AgendaView = lazy(() =>
  import('./components/tabs/publicador/AgendaView').then(m => ({ default: m.AgendaView })),
)
const TvControllerTab = lazy(() => import('./components/tabs/TvController'))

// Reads the ?tab= / ?editSession= + ?editDate= deep-link. Called once from a lazy
// useState initializer so the URL seeds the first render rather than being applied
// afterwards by an effect.
function readDeepLink() {
  const p = new URLSearchParams(window.location.search)
  const editSessId = p.get('editSession')
  const editDate = p.get('editDate')
  if (editSessId && editDate) {
    const sess = (loadLS()[editDate] || []).find(s => s.id === editSessId)
    if (sess) {
      return { tab: 'creator', preload: { ...sess, date: editDate, _dateKey: editDate } }
    }
  }
  return { tab: p.get('tab'), preload: null }
}

export default function App() {
  const { session, authLoading } = useAuth()
  const { sessions, setSessions, events, setEvents, syncState, handleSync } = useSync()

  // The ?tab= / ?editSession= deep-link seeds initial state instead of being applied by a
  // mount effect (react-hooks/set-state-in-effect): the effect rendered the default tab
  // first and then swapped it, so a ?tab=results link flashed the Criador on the way in.
  // One lazy useState so readDeepLink() runs exactly once.
  const [deepLink] = useState(readDeepLink)
  const [tab, setTab] = useState(deepLink.tab || 'creator')
  const [creatorPreload, setCreatorPreload] = useState(deepLink.preload)
  const [resultsPreload, setResultsPreload] = useState(null)
  const [saved, setSaved] = useState(false)
  // Publicador's Origem picker needs the box list (#59 C5·b1); loaded once here rather
  // than inside the tab so a later consumer (plans/83's Mês grouping) can share it.
  const [locations] = useState(loadLocations)
  const [blockNames, setBlockNames] = useState(APP_CONFIG.blockNames)
  // A run-once guard for the config fetch below, never read while rendering — so a ref,
  // not state. As state its setter fired inside the effect that reads it, which is both a
  // cascading render and a self-referential deps array (react-hooks/set-state-in-effect).
  const configLoadedRef = useRef(false)
  const savedMount = useRef(true)

  // ── Apply CSS variables from APP_CONFIG on mount ──────────────────────────
  useEffect(() => {
    document.documentElement.style.setProperty('--export-font', GF())
    document.documentElement.style.setProperty('--theme-accent', APP_CONFIG.themeAccent)
    document.documentElement.style.setProperty('--theme-accent-text', APP_CONFIG.themeAccentText)
    document.title = APP_CONFIG.appTitle
  }, [])

  // ── Fetch config.json on first empty-state visit ──────────────────────────
  useEffect(() => {
    if (configLoadedRef.current) return
    configLoadedRef.current = true
    if (window.location.protocol === 'file:') return
    fetch('./config.json?v=' + Date.now())
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(cfg => {
        if (!cfg) return
        if (cfg.mobileEaglesBg) APP_CONFIG.mobileEaglesBg = cfg.mobileEaglesBg
        if (cfg.mobileExerciseNoteColor)
          APP_CONFIG.mobileExerciseNoteColor = cfg.mobileExerciseNoteColor
        if (cfg.mobileMegaManBg) APP_CONFIG.mobileMegaManBg = cfg.mobileMegaManBg
        if (cfg.athleteLevels?.length) APP_CONFIG.athleteLevels = cfg.athleteLevels
        if (cfg.athleteGoals?.length) APP_CONFIG.athleteGoals = cfg.athleteGoals
        if (cfg.blockColors)
          APP_CONFIG.blockColors = { ...APP_CONFIG.blockColors, ...cfg.blockColors }
        if (cfg.fontFamily) {
          APP_CONFIG.fontFamily = cfg.fontFamily
          document.documentElement.style.setProperty('--export-font', cfg.fontFamily)
        }
        if (cfg.scheduleTitle) APP_CONFIG.scheduleTitle = cfg.scheduleTitle
        if (cfg.leaderboardTitle) APP_CONFIG.leaderboardTitle = cfg.leaderboardTitle
        if (cfg.appDescription) APP_CONFIG.appDescription = cfg.appDescription
        if (cfg.googleFontsUrl) APP_CONFIG.googleFontsUrl = cfg.googleFontsUrl
        if (cfg.logo) APP_CONFIG.logo = cfg.logo
        if (cfg.appTitle) {
          APP_CONFIG.appTitle = cfg.appTitle
          document.title = cfg.appTitle
        }
        if (cfg.themeAccent) {
          APP_CONFIG.themeAccent = cfg.themeAccent
          document.documentElement.style.setProperty('--theme-accent', cfg.themeAccent)
        }
        if (cfg.themeAccentText) {
          APP_CONFIG.themeAccentText = cfg.themeAccentText
          document.documentElement.style.setProperty('--theme-accent-text', cfg.themeAccentText)
        }
        if (cfg.restDayLabel) APP_CONFIG.restDayLabel = cfg.restDayLabel
        if (cfg.mobileWeeklyLabels?.length) APP_CONFIG.mobileWeeklyLabels = cfg.mobileWeeklyLabels
        if (cfg.blockNames?.length) {
          APP_CONFIG.blockNames = cfg.blockNames
          setBlockNames(cfg.blockNames)
        }
        if (cfg.fontScale) APP_CONFIG.fontScale = cfg.fontScale
        if (cfg.logoScale) APP_CONFIG.logoScale = cfg.logoScale
        if (cfg.zoneScales) APP_CONFIG.zoneScales = cfg.zoneScales
        if (cfg.blockTitleScales) APP_CONFIG.blockTitleScales = cfg.blockTitleScales

        const COLOUR_KEYS = [
          'dvBg',
          'dvGymName',
          'dvDate',
          'dvMainTraining',
          'dvZoneType',
          'dvBlockLabel',
          'dvCap',
          'dvRounds',
          'dvExName',
          'dvIntensity',
          'dvNote',
          'dvBlockNotes',
          'dvDivider',
          'wkBg',
          'wkHeader',
          'wkDateNum',
          'wkMainTraining',
          'wkBlockType',
          'wkExName',
          'wkDivider',
          'eaGymName',
          'eaDate',
          'eaSubtitle',
          'eaBlockType',
          'eaBlockMeta',
          'eaExName',
          'eaIntensity',
          'eaBlockHdr',
          'eaDivider',
          'mmGymName',
          'mmDate',
          'mmSubtitle',
          'mmBlockType',
          'mmBlockMetaBg',
          'mmBlockMetaText',
          'mmExName',
          'mmIntensity',
          'mmBlockHdr',
          'mmDivider',
          'fontScale',
          'exportScale',
        ]
        const existing = loadSettings()
        const hasStoredColours = COLOUR_KEYS.some(k => existing[k] || existing.colors?.[k])
        const cfgHasColours = COLOUR_KEYS.some(k => cfg[k])
        if (cfgHasColours) {
          const merged = { ...existing }
          COLOUR_KEYS.forEach(k => {
            if (cfg[k] !== undefined) merged[k] = cfg[k]
          })
          if (cfg.mobileEaglesBg) merged.eaglesBg = cfg.mobileEaglesBg
          if (cfg.mobileMegaManBg) merged.megaManBg = cfg.mobileMegaManBg
          if (cfg.mobileExerciseNoteColor) merged.noteColor = cfg.mobileExerciseNoteColor
          if (cfg.gymName) merged.gymName = cfg.gymName
          const colourChanged = COLOUR_KEYS.some(
            k => cfg[k] !== undefined && existing[k] !== cfg[k],
          )
          saveSettings(merged)
          if (!hasStoredColours || colourChanged) {
            window.location.reload()
            return
          }
        }
      })
  }, [])

  // ── Saved badge (skip initial mount) ─────────────────────────────────────
  useEffect(() => {
    if (savedMount.current) {
      savedMount.current = false
      return
    }
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1400)
    return () => clearTimeout(t)
  }, [sessions])

  if (authLoading)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--accent)',
          fontSize: 14,
          letterSpacing: '.1em',
        }}
      >
        <i className="ti ti-loader-2 spin" aria-hidden="true" style={{ marginRight: 8 }} />{' '}
        Carregando...
      </div>
    )

  if (!session) return <LoginScreen />

  const spaGymName = loadSettings().gymName || ''

  return (
    <div>
      <AppChrome
        tab={tab}
        onTabChange={setTab}
        gymName={spaGymName}
        userEmail={session.user.email}
        syncState={syncState}
        onSync={handleSync}
        onSignOut={() => supabase.auth.signOut()}
        autoSaved={saved}
      />

      <div className="pane">
        <Suspense fallback={null}>
          {tab === 'creator' && (
            <CriadorTab
              sessions={sessions}
              setSessions={setSessions}
              blockNames={blockNames}
              preload={creatorPreload}
              onPreloadConsumed={() => setCreatorPreload(null)}
              onGoToPublish={() => setTab('publisher')}
            />
          )}
          {tab === 'athletes' && (
            <AtletasTab
              sessions={sessions}
              results={loadResults()}
              events={events}
              onEditSession={s => {
                setCreatorPreload(s)
                setTab('creator')
              }}
              onLogResult={({ athleteId, date }) => {
                setResultsPreload({ athleteId, date })
                setTab('results')
              }}
            />
          )}
          {tab === 'exercises' && <ExerciciosTab />}
          {tab === 'locations' && <AfiliadosTab events={events} />}
          {/* No .res-pane wrapper since #57/plans/80 — it existed only to accent-fill
              .b.bp/.b.bsec/.res-tab.on, all three of which are gone with the tab's C0
              adoption. (.pub-pane below it was the same story — #59 C5·b1 removed it,
              the last consumer, along with the .b/.bsec/.pvt rules it only ever scoped.) */}
          {tab === 'results' && (
            <ResultadosTab
              sessions={sessions}
              preload={resultsPreload}
              onPreloadConsumed={() => setResultsPreload(null)}
            />
          )}
          {tab === 'agenda' && (
            <AgendaView
              sessions={sessions}
              events={events}
              setEvents={setEvents}
              athletes={loadAthletes()}
              onEditSession={s => {
                setCreatorPreload(s)
                setTab('creator')
              }}
              onLogResult={({ athleteId, date }) => {
                setResultsPreload({ athleteId, date })
                setTab('results')
              }}
            />
          )}
          {tab === 'publisher' && <PublicadorTab sessions={sessions} locations={locations} />}
          {tab === 'tv' && <TvControllerTab sessions={sessions} />}
          {tab === 'config' && <ConfigTab />}
        </Suspense>
      </div>
    </div>
  )
}
