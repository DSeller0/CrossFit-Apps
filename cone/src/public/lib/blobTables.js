// Canonical column order for the 8 single-row JSONB blob tables (id=1, value=JSONB)
// shared by Athletes.jsx and Leaderboard.jsx's fetchState(). Callers destructure
// blobRows.map(...) by this exact position order.
export const BLOB_TABLES = ['sessions', 'athletes', 'events', 'locations', 'coach_profile', 'settings', 'goals_data', 'lb_colors']
