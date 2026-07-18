// (The BLOB_TABLES fetch-order array retired with its last consumer: #52 removed
// Athletes.jsx and #81 trimmed Leaderboard.jsx to fetch only the 3 tables it uses.
// scripts/seed-dev.mjs keeps its own local copy for the dev snapshot.)

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
    createdAt: r.created_at,   // provenance (#76); undefined pre-migration
  }
}
