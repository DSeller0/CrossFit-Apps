import { toSecs, fmtSecs } from './wod.js'

export function prBest(pr) {
  if (!pr?.results?.length) return null
  if (pr.type === 'time') return pr.results.reduce((b,r) => toSecs(r.value)<toSecs(b.value)?r:b)
  return pr.results.reduce((b,r) => Number(r.value)>Number(b.value)?r:b)
}

export function prDelta(pr) {
  if (!pr?.results || pr.results.length < 2) return null
  const sorted = [...pr.results].sort((a,b) => new Date(a.date)-new Date(b.date))
  const last = sorted[sorted.length-1], prev = sorted[sorted.length-2]
  if (pr.type === 'time') {
    const diff = toSecs(prev.value)-toSecs(last.value)
    if (diff === 0) return { label:'=', good:null }
    return { label:(diff>0?'-':'+')+fmtSecs(Math.abs(diff)), good:diff>0 }
  }
  const diff = Number(last.value)-Number(prev.value)
  if (diff === 0) return { label:'=', good:null }
  return { label:(diff>0?'+':'')+diff+' '+(pr.type==='load'?(pr.unit||'kg'):'reps'), good:diff>0 }
}

export function prPct(pr) {
  const best = prBest(pr)
  if (!best || !pr.target) return null
  if (pr.type === 'time') {
    const targetSecs = toSecs(pr.target)
    const firstSecs = pr.results.length > 0
      ? toSecs([...pr.results].sort((a,b)=>new Date(a.date)-new Date(b.date))[0].value)
      : targetSecs*2
    if (firstSecs <= targetSecs) return 100
    return Math.min(100, Math.round((firstSecs-toSecs(best.value))/(firstSecs-targetSecs)*100))
  }
  const t = Number(pr.target)
  return t ? Math.min(100, Math.round(Number(best.value)/t*100)) : null
}
