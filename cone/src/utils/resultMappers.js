import { mapResultRow } from '../public/lib/blobTables.js'

export { mapResultRow as rowToResult }

export function resultToRow(r) {
  return {
    id: String(r.id),
    date: r.date || '',
    athlete_id: r.athleteId || null,
    session_id: r.sessionId ? String(r.sessionId) : null,
    presence: r.presence || 'Presente',
    energy_level: r.energyLevel ?? null,
    blocks: r.blocks || [],
    coach_note: r.coachNote || '',
    flag_for_review: !!r.flagForReview,
    logged_by_athlete: !!r.loggedByAthlete,
    updated_at: new Date().toISOString(),
  }
}
