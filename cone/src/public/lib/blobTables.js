// Canonical column order for the 8 single-row JSONB blob tables (id=1, value=JSONB)
// shared by Athletes.jsx and Leaderboard.jsx's fetchState(). Callers destructure
// blobRows.map(...) by this exact position order.
export const BLOB_TABLES = ['sessions', 'athletes', 'events', 'locations', 'coach_profile', 'settings', 'goals_data', 'lb_colors']

// results_v2 row → camelCase. Was hand-written identically in Athletes.jsx and
// Leaderboard.jsx (11 fields each); canonical since #51 so a new column can't be
// added to one and forgotten in the other.
export function mapResultRow(r) {
  return {
    id: r.id,
    date: r.date,
    athleteId: r.athlete_id,
    sessionId: r.session_id,
    presence: r.presence,
    energyLevel: r.energy_level,
    blocks: r.blocks,
    coachNote: r.coach_note,
    flagForReview: r.flag_for_review,
    loggedByAthlete: r.logged_by_athlete,
  }
}
