import { matchesAthlete } from '../../../public/lib/sessions.js'

// Atletas' pure helpers (#56/C2 · plans/75). Extracted out of the 1795-line tab so
// the arithmetic and the label formatting are testable — the convention
// resultadosHelpers / exerciciosHelpers / stateBackup / billing set.
//
// No React, no client: importable from the tab, its components AND the gallery.

/**
 * The default athlete identity colour. A DATA colour (it identifies a person, so it
 * must be stable across all four themes) and therefore #15-exempt — but it was seven
 * separate `'#e87820'` literals in the old tab, which is how a data colour quietly
 * becomes six data colours. One const, one meaning.
 */
export const DEFAULT_ATHLETE_COLOR = '#e87820'

/** Milestone percentages are stored freely but only ever render on the 10% grid. */
export const snapPct = p => Math.round((Number(p) || 0) / 10) * 10

/** A goal's own completion, 0–100. A goal with no sessions planned is 0, not NaN. */
export const goalPct = goal =>
  goal?.totalSessions > 0
    ? Math.min(100, Math.round((goal.completedSessions / goal.totalSessions) * 100))
    : 0

/**
 * The athlete-list row's "%": the mean completion across the athlete's goals.
 * `null` (not 0) when there are no goals — the row then prints nothing rather than
 * a 0% that reads like a failing athlete.
 */
export function combinedPct(goals) {
  const gs = goals || []
  if (!gs.length) return null
  const sum = gs.reduce(
    (s, g) => s + (g.totalSessions > 0 ? g.completedSessions / g.totalSessions : 0),
    0,
  )
  return Math.round((sum / gs.length) * 100)
}

/**
 * TallyBar tick descriptors for a goal's milestones — the same hit/next/future
 * shape me/GoalList.jsx:25-31 builds, so the coach's bar and the athlete's bar
 * can't drift. Sorted, because "next" means the first unhit one by percentage.
 */
export function milestoneTicks(milestones) {
  const ms = (milestones || []).slice().sort((a, b) => a.pct - b.pct)
  const next = ms.find(m => !m.hit)
  return ms.map(m => ({
    pct: snapPct(m.pct),
    state: m.hit ? 'hit' : m === next ? 'next' : 'future',
  }))
}

/** Value + unit for a PR reading, by PR type. `null` best → an em dash. */
export function prValueLabel(pr, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (pr?.type === 'load') return `${value} ${pr.unit || 'kg'}`
  if (pr?.type === 'reps') return `${value} reps`
  return String(value)
}

/** The "Meta: …" label, or null when the PR carries no target. */
export const prTargetLabel = pr =>
  pr?.target || pr?.target === 0 ? prValueLabel(pr, pr.target) : null

/** dd/mm for a yyyy-mm-dd key. Noon avoids the UTC-shift off-by-one. */
export function shortDate(dateKey) {
  if (!dateKey) return null
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

/** "ago. de 2025" for the profile header's "desde". */
export function monthYear(dateKey) {
  if (!dateKey) return null
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric',
  })
}

/**
 * PRs grouped under their category, ordered by the registry's own block order with
 * anything unknown appended. A PR carries `categories[]` (#62's resolver) and a
 * legacy singular `category`; the first category that exists in the registry wins,
 * so a movement tagged under three families lands where the coach expects it.
 * Returns [[categoryName, prs[]], …].
 */
export function groupPrsByCategory(prs, blockOrder) {
  const order = blockOrder || []
  const groups = {}
  ;(prs || []).forEach(pr => {
    const cats = pr.categories?.length ? pr.categories : pr.category ? [pr.category] : []
    const cat = order.find(b => cats.includes(b)) || cats[0] || 'Sem categoria'
    ;(groups[cat] ||= []).push(pr)
  })
  return [
    ...order.filter(bt => groups[bt]).map(bt => [bt, groups[bt]]),
    ...Object.keys(groups)
      .filter(k => !order.includes(k))
      .map(k => [k, groups[k]]),
  ]
}

/**
 * The detail pane's session strip: the athlete's last 2 sessions and the next 1
 * inside a 30-day window. `sessions` is the date-keyed blob; `todayKey` is injected
 * rather than read from the clock so this stays pure and testable (calling
 * `new Date()` in a render path is also a react-hooks/purity violation).
 */
export function sessionStrip(sessions, athleteName, todayKey) {
  if (!athleteName || !sessions) return []
  const future = new Date(todayKey + 'T12:00:00')
  future.setDate(future.getDate() + 30)
  const f30 = future.toISOString().slice(0, 10)

  const all = []
  Object.keys(sessions)
    .sort()
    .forEach(date => {
      ;(sessions[date] || []).forEach(s => {
        if (matchesAthlete(s, athleteName)) all.push({ date, session: s })
      })
    })

  return [
    ...all.filter(x => x.date <= todayKey).slice(-2),
    ...all.filter(x => x.date > todayKey && x.date <= f30).slice(0, 1),
  ]
}
