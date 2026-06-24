export function rowToResult(r) {
  return {
    id:              r.id,
    date:            r.date,
    athleteId:       r.athlete_id,
    sessionId:       r.session_id,
    presence:        r.presence,
    energyLevel:     r.energy_level,
    blocks:          r.blocks,
    coachNote:       r.coach_note,
    flagForReview:   r.flag_for_review,
    loggedByAthlete: r.logged_by_athlete,
  };
}

export function resultToRow(r) {
  return {
    id:              String(r.id),
    date:            r.date || '',
    athlete_id:      r.athleteId || null,
    session_id:      r.sessionId ? String(r.sessionId) : null,
    presence:        r.presence || 'Presente',
    energy_level:    r.energyLevel ?? null,
    blocks:          r.blocks || [],
    coach_note:      r.coachNote || '',
    flag_for_review: !!r.flagForReview,
    logged_by_athlete: !!r.loggedByAthlete,
    updated_at:      new Date().toISOString(),
  };
}
