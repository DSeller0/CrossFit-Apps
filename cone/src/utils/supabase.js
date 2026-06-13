import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);

// ── Generic key-value helpers (single-row tables) ─────────────────────────────
// Used for: settings, exercise_registry, goals_data, lb_colors, coach_profile

export async function dbLoad(table) {
  const { data, error } = await supabase
    .from(table)
    .select('value')
    .eq('id', 1)
    .maybeSingle();
  if (error) { console.warn('[supabase] load', table, error.message); return null; }
  return data?.value ?? null;
}

export async function dbSave(table, value) {
  const { error } = await supabase
    .from(table)
    .upsert({ id: 1, value, updated_at: new Date().toISOString() });
  if (error) console.warn('[supabase] save', table, error.message);
}

// ── Sessions ──────────────────────────────────────────────────────────────────
// Stored as { [dateKey]: session[] } in a single-row table for simplicity

export async function dbLoadSessions() {
  return dbLoad('sessions');
}

export async function dbSaveSessions(sessions) {
  return dbSave('sessions', sessions);
}

// ── Athletes ──────────────────────────────────────────────────────────────────

export async function dbLoadAthletes() {
  return dbLoad('athletes');
}

export async function dbSaveAthletes(athletes) {
  return dbSave('athletes', athletes);
}

// ── Results ───────────────────────────────────────────────────────────────────

export async function dbLoadResults() {
  return dbLoad('results');
}

export async function dbSaveResults(results) {
  return dbSave('results', results);
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function dbLoadEvents() {
  return dbLoad('events');
}

export async function dbSaveEvents(events) {
  return dbSave('events', events);
}

// ── Locations ─────────────────────────────────────────────────────────────────

export async function dbLoadLocations() {
  return dbLoad('locations');
}

export async function dbSaveLocations(locations) {
  return dbSave('locations', locations);
}

// ── Coach profile ─────────────────────────────────────────────────────────────

export async function dbLoadCoach() {
  return dbLoad('coach_profile');
}

export async function dbSaveCoach(coach) {
  return dbSave('coach_profile', coach);
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function dbLoadSettings() {
  return dbLoad('settings');
}

export async function dbSaveSettings(settings) {
  return dbSave('settings', settings);
}

// ── Exercise registry ─────────────────────────────────────────────────────────

export async function dbLoadRegistry() {
  return dbLoad('exercise_registry');
}

export async function dbSaveRegistry(registry) {
  return dbSave('exercise_registry', registry);
}

// ── Goals & PRs ───────────────────────────────────────────────────────────────

export async function dbLoadGoalsData() {
  return dbLoad('goals_data');
}

export async function dbSaveGoalsData(goalsData) {
  return dbSave('goals_data', goalsData);
}

// ── Leaderboard colours ───────────────────────────────────────────────────────

export async function dbLoadLBColors() {
  return dbLoad('lb_colors');
}

export async function dbSaveLBColors(colors) {
  return dbSave('lb_colors', colors);
}

// ── Session templates ─────────────────────────────────────────────────────────

export async function dbLoadTemplates() {
  return dbLoad('templates');
}

export async function dbSaveTemplates(templates) {
  return dbSave('templates', templates);
}
