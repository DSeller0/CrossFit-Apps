import { toISO, todayISO } from '../lib/week.js'
import { WOD_TYPES, toSecs, fmtSecs } from '../lib/wod.js'
import { prBest } from '../lib/goals.js'
import { getTargets, matchesAthlete, calcBlockStats } from '../lib/sessions.js'

export { getTargets, matchesAthlete, calcBlockStats }

// me.html's pure helpers, pulled out of the 907-line Me.jsx (#52) so that the
// component split can't fork them — same move as schedule/scheduleHelpers.js (#50)
// and results/resultsHelpers.js (#51). Everything here is a pure function of its
// arguments and is unit-tested in meHelpers.test.js.

// Block types that get a per-type bar in "Distribuição". Deliberately not the WOD
// types — those get their own card.
export const DIST_TYPES = ['Força', 'LPO', 'Acessórios', 'Skill', 'Core', 'Cardio', 'Mobilidade']

// Registry categories that never carry a PR (they're formats or filler, not movements).
// Benchmark is one of the WOD_TYPES it holds, so the movement grid skips it too — but
// a benchmark's PR *is* a real record (its completion time / rounds), so PrSection reads
// BENCHMARK_CAT directly for a dedicated time-PR card below the movement families (#87).
export const PR_SKIP = new Set(['-', 'Aquecimento', 'Descanso', ...WOD_TYPES])
export const BENCHMARK_CAT = 'Benchmark'

export function initials(n) {
  return n
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function prValLabel(val, pr) {
  if (pr.type === 'load') return val + ' ' + (pr.unit || 'kg')
  if (pr.type === 'reps') return val + ' reps'
  return val
}

export function unitLabel(unit) {
  if (unit === 'time') return 'mm:ss'
  if (unit === 'reps') return 'reps'
  if (unit === 'm') return 'm'
  return 'kg'
}

// Consecutive-day training streak, anchored to today or yesterday (miss two days
// and it's over). Distinct from a weeks-trained measure — see plans/22.
export function calcStreak(present) {
  const dates = [...new Set(present.map(r => r.date))].sort().reverse()
  if (!dates.length) return 0
  const td = todayISO(),
    yd = toISO(new Date(Date.now() - 86400000))
  if (dates[0] !== td && dates[0] !== yd) return 0
  let s = 0,
    cur = dates[0]
  for (const d of dates) {
    if (d !== cur) break
    s++
    const p = new Date(cur + 'T12:00:00')
    p.setDate(p.getDate() - 1)
    cur = toISO(p)
  }
  return s
}

export function calcMaxStreak(present) {
  const dates = [...new Set(present.map(r => r.date))].sort()
  if (!dates.length) return 0
  let mx = 1,
    cur = 1
  for (let i = 1; i < dates.length; i++) {
    const gap = (new Date(dates[i] + 'T12:00:00') - new Date(dates[i - 1] + 'T12:00:00')) / 86400000
    if (gap === 1) {
      cur++
      if (cur > mx) mx = cur
    } else cur = 1
  }
  return mx
}

// The 5 most recent "something good happened" moments: PR improvements and
// milestones hit. `tone` is a semantic name, not a color — the component maps it.
export function buildEvents(prs, goals) {
  const evs = []
  ;(prs || []).forEach(pr => {
    if (!pr.results || pr.results.length < 2) return
    const sorted = [...pr.results].sort((a, b) => new Date(a.date) - new Date(b.date))
    const last = sorted[sorted.length - 1],
      prev = sorted[sorted.length - 2]
    let good,
      delta = ''
    if (pr.type === 'time') {
      const d = toSecs(prev.value) - toSecs(last.value)
      good = d > 0
      if (good) delta = '-' + fmtSecs(d)
    } else {
      const d = Number(last.value) - Number(prev.value)
      good = d > 0
      if (good) delta = '+' + d + ' ' + (pr.type === 'load' ? pr.unit || 'kg' : 'reps')
    }
    if (!good) return
    evs.push({
      date: last.date,
      title: 'PR — ' + pr.name,
      sub: 'Anterior: ' + prValLabel(prev.value, pr) + ' · melhora de ' + delta,
      val: prValLabel(last.value, pr),
      tone: 'good',
    })
  })
  ;(goals || []).forEach(goal => {
    const ms = goal.milestones || []
    const hitCount = ms.filter(m => m.hit).length
    ms.forEach(m => {
      if (m.hit && m.hitDate)
        evs.push({
          date: m.hitDate,
          title: 'Marco — ' + goal.name,
          sub: m.label || '',
          val: hitCount + '/' + ms.length + ' marcos',
          tone: 'good',
        })
    })
  })
  return evs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
}

// Which input the PR log sheet should show for an exercise, inferred from its
// registry categories when the athlete has no PR on it yet.
export function catToInputType(cats) {
  if (!cats?.length) return 'load'
  if (cats.some(c => c === 'Benchmark')) return 'time'
  if (cats.some(c => ['Força', 'LPO', 'Core', 'Acessórios'].includes(c))) return 'load'
  if (cats.some(c => c === 'Cardio')) return 'dist'
  if (cats.some(c => ['Skill', 'Mobilidade'].includes(c))) return 'reps'
  return 'load'
}

// "How does this attempt compare to your best?" Returns a semantic tone rather
// than a color so the caller can theme it — the three hardcoded #68d8a0/#e05848
// pairs this replaces were the page's last non-data hex.
export function computeDelta(val, pr, unit) {
  if (!val.trim()) return { txt: '', tone: 'none' }
  const best = pr ? prBest(pr) : null
  if (!best) return { txt: 'Primeiro registro!', tone: 'first' }
  if (unit === 'time') {
    const ns = toSecs(val.trim()),
      bs = toSecs(best.value)
    if (ns === Infinity || bs === Infinity) return { txt: '', tone: 'none' }
    const d = bs - ns
    if (d > 0) return { txt: '↑ −' + fmtSecs(d) + ' vs melhor', tone: 'good' }
    if (d < 0) return { txt: '↓ +' + fmtSecs(-d) + ' vs melhor', tone: 'bad' }
    return { txt: 'Igual ao melhor', tone: 'even' }
  }
  const nv = parseFloat(val) || 0,
    bv = parseFloat(best.value) || 0,
    d = nv - bv
  const u = unit === 'reps' ? 'reps' : unit === 'm' ? 'm' : 'kg'
  if (d > 0) return { txt: '↑ +' + d + ' ' + u + ' vs melhor', tone: 'good' }
  if (d < 0) return { txt: '↓ ' + d + ' ' + u + ' vs melhor', tone: 'bad' }
  return { txt: 'Igual ao melhor', tone: 'even' }
}
