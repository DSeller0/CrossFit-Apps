import { normaliseType, normaliseZone } from './config';

// ── Storage keys ──────────────────────────────────────────────────────────────
export const LS_KEY       = 'gym_v9';
export const LS_ATHLETES  = 'eagles_athletes_v1';
export const LS_RESULTS   = 'eagles_results_v1';
export const LS_SETTINGS  = 'eagles_settings_v1';
export const LS_REGISTRY  = 'eagles_block_registry_v1';
export const LS_GOALS     = 'eagles_athlete_goals_v1';
export const LS_EVENTS    = 'eagles_events_v1';
export const LS_LOCATIONS = 'eagles_locations_v1';
export const LS_COACH     = 'eagles_coach_v1';
export const LS_LB_COLORS = 'eagles_lb_colors_v1';

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
export const saveLS = d => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} };

// ── Athletes ──────────────────────────────────────────────────────────────────
export const loadAthletes  = () => { try { const d = localStorage.getItem(LS_ATHLETES);  return d ? JSON.parse(d) : []; } catch { return []; } };
export const saveAthletes  = d => { try { localStorage.setItem(LS_ATHLETES, JSON.stringify(d)); } catch {} };

// ── Results ───────────────────────────────────────────────────────────────────
export const loadResults   = () => { try { const d = localStorage.getItem(LS_RESULTS); const p = d ? JSON.parse(d) : []; return Array.isArray(p) ? p : []; } catch { return []; } };
export const saveResults   = d => { try { localStorage.setItem(LS_RESULTS, JSON.stringify(d)); } catch {} };

// ── Settings ──────────────────────────────────────────────────────────────────
export const loadSettings  = () => { try { const d = localStorage.getItem(LS_SETTINGS);  return d ? JSON.parse(d) : {}; } catch { return {}; } };
export const saveSettings  = d => { try { localStorage.setItem(LS_SETTINGS, JSON.stringify(d)); } catch {} };

// ── Exercise registry ─────────────────────────────────────────────────────────
export const loadRegistry  = () => { try { const d = localStorage.getItem(LS_REGISTRY);  return d ? JSON.parse(d) : null; } catch { return null; } };
export const saveRegistry  = d => { try { localStorage.setItem(LS_REGISTRY, JSON.stringify(d)); } catch {} };

// ── Goals & PRs ───────────────────────────────────────────────────────────────
export const loadGoalsData = () => { try { const d = localStorage.getItem(LS_GOALS); return d ? JSON.parse(d) : { athleteGoals: {}, prs: {} }; } catch { return { athleteGoals: {}, prs: {} }; } };
export const saveGoalsData = d => { try { localStorage.setItem(LS_GOALS, JSON.stringify(d)); } catch {} };

// ── Events (agenda) ───────────────────────────────────────────────────────────
export const loadEvents    = () => { try { const d = localStorage.getItem(LS_EVENTS);    return d ? JSON.parse(d) : {}; } catch { return {}; } };
export const saveEvents    = d => { try { localStorage.setItem(LS_EVENTS, JSON.stringify(d)); } catch {} };

// ── Locations / services ──────────────────────────────────────────────────────
export const loadLocations = () => { try { const d = localStorage.getItem(LS_LOCATIONS); return d ? JSON.parse(d) : []; } catch { return []; } };
export const saveLocations = d => { try { localStorage.setItem(LS_LOCATIONS, JSON.stringify(d)); } catch {} };

// ── Coach profile ─────────────────────────────────────────────────────────────
export const loadCoach     = () => { try { const d = localStorage.getItem(LS_COACH); return d ? JSON.parse(d) : { name: '', contact: '', phone: '' }; } catch { return { name: '', contact: '', phone: '' }; } };
export const saveCoach     = d => { try { localStorage.setItem(LS_COACH, JSON.stringify(d)); } catch {} };

// ── Leaderboard colours ───────────────────────────────────────────────────────
export const loadLBColors  = () => { try { const d = localStorage.getItem(LS_LB_COLORS); return d ? JSON.parse(d) : {}; } catch { return {}; } };
export const saveLBColors  = d => { try { localStorage.setItem(LS_LB_COLORS, JSON.stringify(d)); } catch {} };
