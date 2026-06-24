import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import { useSync } from './context/SyncContext';
import {
  loadLS,
  loadAthletes, saveAthletes,
  loadResults, saveResults,
  loadSettings, saveSettings,
  loadGoalsData, saveGoalsData,
  loadRegistry, saveRegistry,
  loadEvents, saveEvents,
  loadLocations, saveLocations,
  loadCoach, saveCoach,
  loadLBColors,
  toISO,
} from './utils/storage';
import { supabase } from './utils/supabase';
import { APP_CONFIG, normaliseType, normaliseZone, GF } from './utils/config';
import LoginScreen from './components/LoginScreen';

const CriadorTab    = lazy(() => import('./components/tabs/Criador'));
const AtletasTab    = lazy(() => import('./components/tabs/Atletas'));
const ExerciciosTab = lazy(() => import('./components/tabs/Exercicios'));
const ServicosTab   = lazy(() => import('./components/tabs/Servicos'));
const ResultadosTab = lazy(() => import('./components/tabs/Resultados'));
const ConfigTab     = lazy(() => import('./components/tabs/Config'));
const PublicadorTab = lazy(() => import('./components/tabs/Publicador'));
const AgendaView    = lazy(() => import('./components/tabs/Publicador').then(m => ({ default: m.AgendaView })));


const TABS = [
  ['creator',   'ti-edit',       'Criador de Treinos'],
  ['athletes',  'ti-chart-radar','Atletas'],
  ['exercises', 'ti-tool',       'Exercícios'],
  ['locations', 'ti-map-pin',    'Serviços'],
  ['results',   'ti-chart-bar',  'Resultados'],
  ['agenda',    'ti-calendar',   'Agenda'],
  ['publisher', 'ti-layout-grid','Publicador de Grade'],
  ['config',    'ti-settings',   'Configurações'],
];

export default function App() {
  const { session, authLoading } = useAuth();
  const { sessions, setSessions, events, setEvents, syncState, handleSync } = useSync();

  const [tab, setTab]                       = useState('creator');
  const [creatorPreload, setCreatorPreload] = useState(null);
  const [resultsPreload, setResultsPreload] = useState(null);
  const [saved, setSaved]                   = useState(false);
  const [toast, setToast]                   = useState(null);
  const [blockNames, setBlockNames]         = useState(APP_CONFIG.blockNames);
  const [saveFileName, setSaveFileName]     = useState('');
  const [showSaveName, setShowSaveName]     = useState(false);
  const [configLoaded, setConfigLoaded]     = useState(false);
  const fileInputRef  = useRef();
  const savedMount    = useRef(true);

  // ── Apply CSS variables from APP_CONFIG on mount ──────────────────────────
  useEffect(() => {
    document.documentElement.style.setProperty('--export-font', GF());
    document.documentElement.style.setProperty('--theme-accent', APP_CONFIG.themeAccent);
    document.documentElement.style.setProperty('--theme-accent-text', APP_CONFIG.themeAccentText);
    document.title = APP_CONFIG.appTitle;
  }, []);

  // ── Fetch config.json on first empty-state visit ──────────────────────────
  useEffect(() => {
    if (configLoaded) return;
    setConfigLoaded(true);
    if (window.location.protocol === 'file:') return;
    fetch('./config.json?v=' + Date.now())
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(cfg => {
        if (!cfg) return;
        if (cfg.mobileEaglesBg)           APP_CONFIG.mobileEaglesBg = cfg.mobileEaglesBg;
        if (cfg.mobileExerciseNoteColor)   APP_CONFIG.mobileExerciseNoteColor = cfg.mobileExerciseNoteColor;
        if (cfg.mobileMegaManBg)           APP_CONFIG.mobileMegaManBg = cfg.mobileMegaManBg;
        if (cfg.athleteLevels?.length)     APP_CONFIG.athleteLevels = cfg.athleteLevels;
        if (cfg.athleteGoals?.length)      APP_CONFIG.athleteGoals = cfg.athleteGoals;
        if (cfg.blockColors)               APP_CONFIG.blockColors = { ...APP_CONFIG.blockColors, ...cfg.blockColors };
        if (cfg.fontFamily) {
          APP_CONFIG.fontFamily = cfg.fontFamily;
          document.documentElement.style.setProperty('--export-font', cfg.fontFamily);
        }
        if (cfg.scheduleTitle)    APP_CONFIG.scheduleTitle = cfg.scheduleTitle;
        if (cfg.leaderboardTitle) APP_CONFIG.leaderboardTitle = cfg.leaderboardTitle;
        if (cfg.appDescription)   APP_CONFIG.appDescription = cfg.appDescription;
        if (cfg.googleFontsUrl)   APP_CONFIG.googleFontsUrl = cfg.googleFontsUrl;
        if (cfg.logo)             APP_CONFIG.logo = cfg.logo;
        if (cfg.appTitle) {
          APP_CONFIG.appTitle = cfg.appTitle;
          document.title = cfg.appTitle;
        }
        if (cfg.themeAccent)     { APP_CONFIG.themeAccent = cfg.themeAccent;         document.documentElement.style.setProperty('--theme-accent', cfg.themeAccent); }
        if (cfg.themeAccentText) { APP_CONFIG.themeAccentText = cfg.themeAccentText; document.documentElement.style.setProperty('--theme-accent-text', cfg.themeAccentText); }
        if (cfg.restDayLabel)    APP_CONFIG.restDayLabel = cfg.restDayLabel;
        if (cfg.mobileWeeklyLabels?.length) APP_CONFIG.mobileWeeklyLabels = cfg.mobileWeeklyLabels;
        if (cfg.blockNames?.length) { APP_CONFIG.blockNames = cfg.blockNames; setBlockNames(cfg.blockNames); }
        if (cfg.fontScale)       APP_CONFIG.fontScale = cfg.fontScale;
        if (cfg.logoScale)       APP_CONFIG.logoScale = cfg.logoScale;
        if (cfg.zoneScales)      APP_CONFIG.zoneScales = cfg.zoneScales;
        if (cfg.blockTitleScales) APP_CONFIG.blockTitleScales = cfg.blockTitleScales;

        const COLOUR_KEYS = ['dvBg','dvGymName','dvDate','dvMainTraining','dvZoneType','dvBlockLabel',
          'dvCap','dvRounds','dvExName','dvIntensity','dvNote','dvBlockNotes','dvDivider',
          'wkBg','wkHeader','wkDateNum','wkMainTraining','wkBlockType','wkExName','wkDivider',
          'eaGymName','eaDate','eaSubtitle','eaBlockType','eaBlockMeta','eaExName',
          'eaIntensity','eaBlockHdr','eaDivider',
          'mmGymName','mmDate','mmSubtitle','mmBlockType','mmBlockMetaBg','mmBlockMetaText',
          'mmExName','mmIntensity','mmBlockHdr','mmDivider','fontScale','exportScale'];
        const existing = loadSettings();
        const hasStoredColours = COLOUR_KEYS.some(k => existing[k] || existing.colors?.[k]);
        const cfgHasColours = COLOUR_KEYS.some(k => cfg[k]);
        if (cfgHasColours) {
          const merged = { ...existing };
          COLOUR_KEYS.forEach(k => { if (cfg[k] !== undefined) merged[k] = cfg[k]; });
          if (cfg.mobileEaglesBg)          merged.eaglesBg  = cfg.mobileEaglesBg;
          if (cfg.mobileMegaManBg)         merged.megaManBg = cfg.mobileMegaManBg;
          if (cfg.mobileExerciseNoteColor) merged.noteColor = cfg.mobileExerciseNoteColor;
          if (cfg.gymName)                 merged.gymName   = cfg.gymName;
          const colourChanged = COLOUR_KEYS.some(k => cfg[k] !== undefined && existing[k] !== cfg[k]);
          saveSettings(merged);
          if (!hasStoredColours || colourChanged) { window.location.reload(); return; }
        }
        if (cfg.lbColors && typeof cfg.lbColors === 'object') {
          try {
            const existingLb = JSON.parse(localStorage.getItem('eagles_lb_colors_v1') || '{}');
            if (!Object.keys(existingLb).length) {
              localStorage.setItem('eagles_lb_colors_v1', JSON.stringify(cfg.lbColors));
            }
          } catch {}
        }
      });
  }, [configLoaded]);

  // ── URL param deep-links ──────────────────────────────────────────────────
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tabParam   = p.get('tab');
    const editSessId = p.get('editSession');
    const editDate   = p.get('editDate');
    if (editSessId && editDate) {
      const sess = (loadLS()[editDate] || []).find(s => s.id === editSessId);
      if (sess) { setCreatorPreload({ ...sess, date: editDate, _dateKey: editDate }); setTab('creator'); }
    } else if (tabParam) {
      setTab(tabParam);
    }
  }, []);

  // ── Saved badge (skip initial mount) ─────────────────────────────────────
  useEffect(() => {
    if (savedMount.current) { savedMount.current = false; return; }
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1400);
    return () => clearTimeout(t);
  }, [sessions]);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // ── Export state as .json ─────────────────────────────────────────────────
  const handleSaveState = (customName) => {
    const state = {
      version: 2,
      exportedAt: new Date().toISOString(),
      sessions,
      settings:         loadSettings(),
      lbColors:         loadLBColors(),
      results:          loadResults(),
      athletes:         loadAthletes(),
      exerciseRegistry: loadRegistry() || {},
      athleteGoalsData: loadGoalsData(),
      events:           loadEvents(),
      locations:        loadLocations(),
      coachProfile:     loadCoach(),
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const name = (customName || saveFileName || '').trim()
      .replace(/[^a-zA-Z0-9À-ɏ\-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const gymSlug = (APP_CONFIG.gymName || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.download = `${name || (gymSlug ? `grade-${gymSlug}` : 'grade-treino') + '-' + toISO(new Date())}.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
    setSaveFileName('');
    setShowSaveName(false);
    showToast('Estado salvo — compartilhe o arquivo .json com o professor.');
  };

  // ── Import state from .json ───────────────────────────────────────────────
  const handleLoadState = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const incoming = parsed.version && parsed.sessions ? parsed.sessions : parsed;
        if (typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error('Invalid format');
        const migrated = {};
        Object.keys(incoming).forEach(dateKey => {
          migrated[dateKey] = (incoming[dateKey] || []).map(session => ({
            ...session,
            blocks: (session.blocks || []).map(bl => ({
              ...bl,
              type: normaliseType(bl.type),
              zone: normaliseZone(bl.zone),
            }))
          }));
        });
        setSessions(migrated);
        if (parsed.exerciseRegistry && typeof parsed.exerciseRegistry === 'object') saveRegistry(parsed.exerciseRegistry);
        if (parsed.athleteGoalsData && typeof parsed.athleteGoalsData === 'object') saveGoalsData(parsed.athleteGoalsData);
        if (parsed.athletes?.length)   saveAthletes(parsed.athletes);
        if (parsed.results)            saveResults(parsed.results);
        if (parsed.events && typeof parsed.events === 'object') setEvents(parsed.events);
        if (parsed.locations)          saveLocations(parsed.locations);
        if (parsed.coachProfile && typeof parsed.coachProfile === 'object') saveCoach(parsed.coachProfile);
        if (parsed.settings && typeof parsed.settings === 'object') {
          saveSettings(parsed.settings);
          setTimeout(() => window.location.reload(), 300);
        }
        showToast('Estado carregado com sucesso.');
      } catch {
        showToast('Não foi possível carregar o arquivo — verifique se é um .json válido.', 'err');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--accent)', fontSize: 14, letterSpacing: '.1em' }}>
      <i className="ti ti-loader-2 spin" aria-hidden="true" style={{ marginRight: 8 }} /> Carregando...
    </div>
  );

  if (!session) return <LoginScreen />;

  return (
    <div>
      <input
        type="file"
        id="state-file-input"
        ref={fileInputRef}
        accept=".json,application/json"
        onChange={handleLoadState}
        style={{ display: 'none' }}
      />

      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'err' ? '#3a1010' : '#102010',
          border: `1px solid ${toast.type === 'err' ? '#8a3030' : '#306030'}`,
          color: toast.type === 'err' ? '#e08080' : '#80c080',
          padding: '10px 18px', borderRadius: 8, fontSize: 13,
          zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,.6)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className={`ti ti-${toast.type === 'err' ? 'alert-circle' : 'circle-check'}`} aria-hidden="true" />
          {toast.msg}
        </div>
      )}

      <div className="topbar">
        <a href="../index.html" className="tb-btn" title="Ir para o início" style={{ textDecoration: 'none' }}>
          <i className="ti ti-home" aria-hidden="true" /> Início
        </a>
        <span className="topbar-title">Criador de Treinos</span>
        <div className="topbar-right">
          <span className="saved-badge" style={{ color: 'var(--muted, #888)' }}>
            <i className="ti ti-user" aria-hidden="true" style={{ fontSize: 12 }} />
            {' '}{session.user.email}
          </span>
          <button
            type="button"
            className="tb-btn"
            onClick={() => supabase.auth.signOut()}
            title="Sair da conta"
          >
            <i className="ti ti-logout" aria-hidden="true" /> Sair
          </button>
          <button
            type="button"
            className={`tb-btn${syncState === 'conflict' ? ' tb-sync-warn' : ''}`}
            onClick={handleSync}
            disabled={syncState === 'syncing'}
            title="Sincronizar dados com o servidor"
          >
            <i className={`ti ${syncState === 'syncing' ? 'ti-loader-2 spin' : syncState === 'synced' ? 'ti-check' : syncState === 'conflict' ? 'ti-alert-triangle' : 'ti-refresh'}`} aria-hidden="true" />
            {syncState === 'syncing' ? ' Sincronizando...' : syncState === 'synced' ? ' Sincronizado' : syncState === 'conflict' ? ' Conflito!' : ' Sincronizar'}
          </button>
          {saved && (
            <span className="saved-badge">
              <i className="ti ti-device-floppy" aria-hidden="true" style={{ fontSize: 12 }} />
              {' '}Salvo automaticamente
            </span>
          )}
          <button
            type="button"
            className="tb-btn"
            style={{ borderColor: '#6a1a1a', color: '#d05050' }}
            onClick={() => {
              if (!window.confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) return;
              setSessions({});
              showToast('Estado limpo.');
            }}
            title="Apagar todos os treinos do estado atual"
          >
            <i className="ti ti-trash" aria-hidden="true" /> Limpar estado
          </button>
          <button
            type="button"
            className="tb-btn tb-load"
            onClick={() => fileInputRef.current?.click()}
            title="Carregar um arquivo .json salvo anteriormente"
          >
            <i className="ti ti-folder-open" aria-hidden="true" /> Carregar estado
          </button>
          {showSaveName ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                placeholder={`grade-treino-${toISO(new Date())}`}
                value={saveFileName}
                onChange={e => setSaveFileName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveState();
                  if (e.key === 'Escape') { setShowSaveName(false); setSaveFileName(''); }
                }}
                autoFocus
                style={{ fontSize: 12, padding: '5px 8px', borderRadius: 5, border: '1px solid #2e2e2e', background: '#111', color: '#e0e0e0', width: 200, outline: 'none' }}
              />
              <button type="button" className="tb-btn tb-save" style={{ minWidth: 'unset', padding: '5px 10px' }} onClick={() => handleSaveState()}>
                <i className="ti ti-check" aria-hidden="true" />
              </button>
              <button type="button" className="tb-btn" style={{ minWidth: 'unset', padding: '5px 10px' }} onClick={() => { setShowSaveName(false); setSaveFileName(''); }}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="tb-btn tb-save"
              onClick={() => setShowSaveName(true)}
              title="Salvar estado como arquivo .json"
            >
              <i className="ti ti-download" aria-hidden="true" /> Salvar estado
            </button>
          )}
        </div>
      </div>

      {syncState === 'conflict' && (
        <div className="sync-conflict-banner">
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          Sessões foram alteradas em outro dispositivo desde que você abriu o app.
          Sincronize antes de salvar para não perder dados.
          <button type="button" className="sync-conflict-btn" onClick={handleSync}>
            Sincronizar agora
          </button>
        </div>
      )}

      <div className="tab-bar">
        {TABS.map(([id, icon, lbl]) => (
          <button
            key={id}
            type="button"
            className={`tab3 ${tab === id ? 'on' : ''}`}
            onClick={() => setTab(id)}
          >
            <i className={`ti ${icon}`} aria-hidden="true" />{lbl}
          </button>
        ))}
      </div>

      <div className="pane">
        <Suspense fallback={null}>
          {tab === 'creator'   && <CriadorTab sessions={sessions} setSessions={setSessions} blockNames={blockNames} preload={creatorPreload} onPreloadConsumed={() => setCreatorPreload(null)} onGoToPublish={() => setTab('publisher')} />}
          {tab === 'athletes'  && <AtletasTab sessions={sessions} results={loadResults()} onEditSession={s => { setCreatorPreload(s); setTab('creator'); }} onLogResult={({athleteId, date}) => { setResultsPreload({athleteId, date}); setTab('results'); }} />}
          {tab === 'exercises' && <ExerciciosTab />}
          {tab === 'locations' && <ServicosTab />}
          {tab === 'results'   && <div className="res-pane"><ResultadosTab sessions={sessions} preload={resultsPreload} onPreloadConsumed={() => setResultsPreload(null)} /></div>}
          {tab === 'agenda'    && <div className="pub-pane"><AgendaView sessions={sessions} events={events} setEvents={setEvents} athletes={loadAthletes()} onEditSession={s => { setCreatorPreload(s); setTab('creator'); }} onLogResult={({athleteId, date}) => { setResultsPreload({athleteId, date}); setTab('results'); }} /></div>}
          {tab === 'publisher' && <div className="pub-pane"><PublicadorTab sessions={sessions} /></div>}
          {tab === 'config'    && <ConfigTab />}
        </Suspense>
      </div>
    </div>
  );
}
