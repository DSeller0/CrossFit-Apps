import { normaliseType, normaliseZone } from './config';
import {
  dbSaveSessions, dbSaveAthletes, dbSaveResults, dbSaveEvents,
  dbSaveLocations, dbSaveCoach, dbSaveSettings, dbSaveRegistry,
  dbSaveGoalsData, dbSaveLBColors, dbSaveTemplates,
  dbLoadSessions, dbLoadAthletes, dbLoadResults, dbLoadEvents,
  dbLoadLocations, dbLoadCoach, dbLoadSettings, dbLoadRegistry,
  dbLoadGoalsData, dbLoadLBColors, dbLoadTemplates,
  dbGetUpdatedAt,
} from './supabase';

// Tracks the updated_at timestamp of the sessions row at last sync/save.
// Used to detect when another device has written to Supabase since we loaded.
let _sessionsTs = null;
export const getSessionsTs  = () => _sessionsTs;
export const markSessionsSaved = () => {
  // Set slightly into the future so the async Supabase write has time to land
  // before the next 30s poll compares against it.
  _sessionsTs = new Date(Date.now() + 6000).toISOString();
};

// ── Storage keys (cone_* naming, Phase 4) ────────────────────────────────────
export const LS_KEY       = 'cone_sessions_v1';
export const LS_ATHLETES  = 'cone_athletes_v1';
export const LS_RESULTS   = 'cone_results_v1';
export const LS_SETTINGS  = 'cone_settings_v1';
export const LS_REGISTRY  = 'cone_registry_v1';
export const LS_GOALS     = 'cone_goals_v1';
export const LS_EVENTS    = 'cone_events_v1';
export const LS_LOCATIONS = 'cone_locations_v1';
export const LS_COACH     = 'cone_coach_v1';
export const LS_LB_COLORS = 'cone_lb_colors_v1';
export const LS_TEMPLATES = 'cone_templates_v1';

// One-time shim: copy old eagles_*/gym_v9 keys to cone_* equivalents.
// Runs on module load; safe to call multiple times (noop after first run).
;(function migrateLocalStorageKeys() {
  const renames = [
    ['gym_v9',                   'cone_sessions_v1'],
    ['eagles_athletes_v1',       'cone_athletes_v1'],
    ['eagles_results_v1',        'cone_results_v1'],
    ['eagles_settings_v1',       'cone_settings_v1'],
    ['eagles_block_registry_v1', 'cone_registry_v1'],
    ['eagles_athlete_goals_v1',  'cone_goals_v1'],
    ['eagles_events_v1',         'cone_events_v1'],
    ['eagles_locations_v1',      'cone_locations_v1'],
    ['eagles_coach_v1',          'cone_coach_v1'],
    ['eagles_lb_colors_v1',      'cone_lb_colors_v1'],
  ];
  try {
    renames.forEach(([oldKey, newKey]) => {
      const old = localStorage.getItem(oldKey);
      if (old !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, old);
        localStorage.removeItem(oldKey);
      }
    });
  } catch { /* localStorage unavailable (SSR/test env) */ }
}());

// ── Utility helpers ───────────────────────────────────────────────────────────
export const uid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2));

export const toISO = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const todayISO = () => toISO(new Date());

export const getTargets = s => {
  if (!s || !s.mainTraining) return [];
  return Array.isArray(s.mainTraining) ? s.mainTraining : [s.mainTraining];
};
export const matchesAthlete = (s, athName) => getTargets(s).includes(athName);

// ── Sessions ──────────────────────────────────────────────────────────────────
const migrateTypes = sessions => {
  const out = {};
  Object.keys(sessions).forEach(k => {
    out[k] = (sessions[k] || []).map(s => ({
      ...s,
      blocks: (s.blocks || []).map(b => ({
        ...b,
        type: normaliseType(b.type),
        zone: normaliseZone(b.zone)
      }))
    }));
  });
  return out;
};

export const loadLS = () => {
  try {
    const d = localStorage.getItem(LS_KEY);
    if (!d) return {};
    const parsed = migrateTypes(JSON.parse(d));
    // ensure every session has an id
    Object.keys(parsed).forEach(dateKey => {
      parsed[dateKey] = (parsed[dateKey] || []).map(s => s.id ? s : { ...s, id: uid() });
    });
    return parsed;
  } catch { return {}; }
};
export const saveLS = d => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} markSessionsSaved(); dbSaveSessions(d); };

// ── Athletes ──────────────────────────────────────────────────────────────────
export const loadAthletes  = () => { try { const d = localStorage.getItem(LS_ATHLETES);  return d ? JSON.parse(d) : []; } catch { return []; } };
export const saveAthletes  = d => { try { localStorage.setItem(LS_ATHLETES, JSON.stringify(d)); } catch {} dbSaveAthletes(d); };

// ── Results ───────────────────────────────────────────────────────────────────
export const loadResults   = () => { try { const d = localStorage.getItem(LS_RESULTS); const p = d ? JSON.parse(d) : []; return Array.isArray(p) ? p : []; } catch { return []; } };
export const saveResults   = d => { try { localStorage.setItem(LS_RESULTS, JSON.stringify(d)); } catch {} dbSaveResults(d); };

// ── Settings ──────────────────────────────────────────────────────────────────
export const loadSettings  = () => { try { const d = localStorage.getItem(LS_SETTINGS);  return d ? JSON.parse(d) : {}; } catch { return {}; } };
export const saveSettings  = d => { try { localStorage.setItem(LS_SETTINGS, JSON.stringify(d)); } catch {} dbSaveSettings(d); };

// ── Exercise registry ─────────────────────────────────────────────────────────
export const loadRegistry  = () => { try { const d = localStorage.getItem(LS_REGISTRY);  return d ? JSON.parse(d) : null; } catch { return null; } };
export const saveRegistry  = d => { try { localStorage.setItem(LS_REGISTRY, JSON.stringify(d)); } catch {} dbSaveRegistry(d); };

// ── Goals & PRs ───────────────────────────────────────────────────────────────
export const loadGoalsData = () => { try { const d = localStorage.getItem(LS_GOALS); return d ? JSON.parse(d) : { athleteGoals: {}, prs: {} }; } catch { return { athleteGoals: {}, prs: {} }; } };
export const saveGoalsData = d => { try { localStorage.setItem(LS_GOALS, JSON.stringify(d)); } catch {} dbSaveGoalsData(d); };

// ── Events (agenda) ───────────────────────────────────────────────────────────
export const loadEvents    = () => { try { const d = localStorage.getItem(LS_EVENTS);    return d ? JSON.parse(d) : {}; } catch { return {}; } };
export const saveEvents    = d => { try { localStorage.setItem(LS_EVENTS, JSON.stringify(d)); } catch {} dbSaveEvents(d); };

// ── Locations / services ──────────────────────────────────────────────────────
export const loadLocations = () => { try { const d = localStorage.getItem(LS_LOCATIONS); return d ? JSON.parse(d) : []; } catch { return []; } };
export const saveLocations = d => { try { localStorage.setItem(LS_LOCATIONS, JSON.stringify(d)); } catch {} dbSaveLocations(d); };

// ── Coach profile ─────────────────────────────────────────────────────────────
export const loadCoach     = () => { try { const d = localStorage.getItem(LS_COACH); return d ? JSON.parse(d) : { name: '', contact: '', phone: '' }; } catch { return { name: '', contact: '', phone: '' }; } };
export const saveCoach     = d => { try { localStorage.setItem(LS_COACH, JSON.stringify(d)); } catch {} dbSaveCoach(d); };

// ── Leaderboard colours ───────────────────────────────────────────────────────
export const loadLBColors  = () => { try { const d = localStorage.getItem(LS_LB_COLORS); return d ? JSON.parse(d) : {}; } catch { return {}; } };
export const saveLBColors  = d => { try { localStorage.setItem(LS_LB_COLORS, JSON.stringify(d)); } catch {} dbSaveLBColors(d); };

// ── Session templates ─────────────────────────────────────────────────────────
export const loadTemplates = () => { try { const d = localStorage.getItem(LS_TEMPLATES); return d ? JSON.parse(d) : []; } catch { return []; } };
export const saveTemplates = d => { try { localStorage.setItem(LS_TEMPLATES, JSON.stringify(d)); } catch {} dbSaveTemplates(d); };

// ── Pull all data from Supabase into localStorage ─────────────────────────────
// Called once on app startup. Returns an object with the fresh data so App.jsx
// can update React state without a reload.
export async function syncFromSupabase() {
  const [sessions, athletes, results, events, locations, coach, settings, registry, goalsData, lbColors, templates, sessionsTs] =
    await Promise.all([
      dbLoadSessions(), dbLoadAthletes(), dbLoadResults(), dbLoadEvents(),
      dbLoadLocations(), dbLoadCoach(), dbLoadSettings(), dbLoadRegistry(),
      dbLoadGoalsData(), dbLoadLBColors(), dbLoadTemplates(),
      dbGetUpdatedAt('sessions'),
    ]);

  const out = {};

  if (sessions && typeof sessions === 'object' && !Array.isArray(sessions)) {
    const migrated = migrateTypes(sessions);
    saveLS(migrated);
    out.sessions = migrated;
  }
  if (Array.isArray(athletes))   { saveAthletes(athletes);   out.athletes = athletes; }
  if (Array.isArray(results))    { saveResults(results);     out.results  = results;  }
  if (events && typeof events === 'object' && !Array.isArray(events)) {
    saveEvents(events); out.events = events;
  }
  if (Array.isArray(locations))  { saveLocations(locations); out.locations = locations; }
  if (coach && typeof coach === 'object')      { saveCoach(coach);       out.coach    = coach;    }
  if (settings && typeof settings === 'object'){ saveSettings(settings); out.settings = settings; }
  if (registry && typeof registry === 'object'){ saveRegistry(registry); out.registry = registry; }
  if (goalsData && typeof goalsData === 'object') { saveGoalsData(goalsData); out.goalsData = goalsData; }
  if (lbColors && typeof lbColors === 'object')   { saveLBColors(lbColors);   out.lbColors  = lbColors;  }
  if (Array.isArray(templates))                   { saveTemplates(templates); out.templates = templates; }

  // Record the Supabase timestamp AFTER saveLS (which sets a provisional value).
  // This becomes the baseline for conflict detection going forward.
  if (sessionsTs) _sessionsTs = sessionsTs;

  return out;
}
