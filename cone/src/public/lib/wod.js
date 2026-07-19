export function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2) }

export const WOD_TYPES=['For Time','AMRAP','EMOM','MetCon','HIIT','WOD','Benchmark','Estações']
export function isWodBlock(bl){ return WOD_TYPES.includes(bl.type)||WOD_TYPES.includes(bl.label) }

// The WOD types a timer can drive — a semantic subset of WOD_TYPES, not derived
// from it (EMOM/AMRAP/For Time/Benchmark have a duration or cap; MetCon/HIIT/WOD/
// Estações don't map to a single timer shape). TvController.jsx and useTimer.js
// both hand-rolled this identically before consolidation.
export const TIMER_TYPES=['For Time','AMRAP','EMOM','Benchmark']

const BLOCK_FAMILY={
  'WOD':'red','HIIT':'red','MetCon':'red',
  'For Time':'amber','AMRAP':'amber','EMOM':'amber','Benchmark':'amber','Estações':'amber',
  'Força':'blue','LPO':'blue','Core':'blue','Acessórios':'blue',
  'Aquecimento':'green','Skill':'green','Cardio':'green','Mobilidade':'green',
}
const FAMILY_COLOR={red:'#c84038',amber:'#d8a840',blue:'#4878d8',green:'#48b860'}
export function blkColor(bl){return FAMILY_COLOR[BLOCK_FAMILY[bl.type]||BLOCK_FAMILY[bl.label]]||'#d8a840'}

// ── Scales ────────────────────────────────────────────────────────────────────
// SCALE_COL is a DATA-COLOR family, deliberately exempt from tokenization —
// same precedent as the block families above: the color identifies the scale, so
// it must stay stable across all 4 themes rather than re-tint with the palette.
// Canonical since #51; it reconciles two diverged copies (Results.jsx assigned
// Inter orange, Athletes.jsx assigned it gold; Results' Adaptado red collided
// with the red block family and misread as an error state). One fallback grey
// replaces the three that existed (#666/#666/#888).
export const SCALES         = ['RX','Inter','SC','Adaptado']
export const SCALE_COL      = {RX:'#4ac8c0',Inter:'#e87820',SC:'#9070d8',Adaptado:'#a89880'}
export const SCALE_FALLBACK = '#808080'
export function scaleColor(sc){ return SCALE_COL[sc]||SCALE_FALLBACK }

// Short form for tight, aligned columns (RankList's scale pill). "Adaptado" is
// twice the width of the other three, which forced its column wider and knocked
// that row's left edge out of line with the rest. The stored value is unchanged —
// this is display only; anywhere with room (the scale filter, the log form)
// still spells it out.
export const SCALE_SHORT = {RX:'RX',Inter:'Inter',SC:'SC',Adaptado:'Adap'}
export function scaleLabel(sc){ return SCALE_SHORT[sc]||sc }

// A block's effective scale is its WEAKEST per-exercise scale: an athlete who
// scaled one movement did not do the WOD RX. Blocks logged before per-exercise
// scaling existed carry a flat blk.scale instead — fall back to it.
const SCALE_RANK  = {RX:4,Inter:3,SC:2,Adaptado:1,'-':0}
const SCALE_NAMES = {4:'RX',3:'Inter',2:'SC',1:'Adaptado',0:'-'}
export function deriveScale(blk) {
  const rows=blk?.exerciseRows||[]
  if(!rows.length) return blk?.scale||'-'
  let min=4
  rows.forEach(r=>{const n=SCALE_RANK[r.scale]??0;if(n<min)min=n})
  return SCALE_NAMES[min]
}

// A block's result shape is time-based (mm:ss) vs rounds/reps-based. Benchmark
// WODs (Fran, Grace, Murph...) are almost always for-time — schedule.html's
// DeskRegPane/LogPane already treated them that way; #61(d) makes every other
// perf-shape branch (results.html, the SPA coach view, rankResults/perfStr)
// agree, so a Benchmark result stores/ranks/renders the same regardless of
// which page logged it.
export function isTimeBlock(blType) { return blType === 'For Time' || blType === 'Benchmark' }

export function blkLabel(bl) {
  const l=bl.label&&bl.label!=='-'?bl.label:null,t=bl.type&&bl.type!=='-'?bl.type:null
  return l&&t&&l!==t?`${l} · ${t}`:l||t||''
}

// Block-meta "rounds · CAP" fragment — rounds-first, full word "rounds", "CAP"
// prefix. Canonical since #84 (was folder-scoped to results/resultsHelpers.js;
// ~10 other sites hand-rolled it with casing/order drift — "RDS"/"rds" instead
// of "rounds", duration-first on the TV wall, lowercase "Cap" on the index).
// blkMetaParts is the array form for callers that render each piece as its own
// chip (WodBlockCard) rather than one joined string.
export function blkMetaParts(bl) {
  const p = []
  if (bl.rounds)   p.push(`${bl.rounds} rounds`)
  if (bl.duration) p.push(`CAP ${bl.duration}'`)
  return p
}
export function blkMeta(bl) { return blkMetaParts(bl).join(' · ') }

// Timer/TV mode display label — Timer.jsx and tv/slides.jsx both hand-rolled
// this identically before consolidation.
export const MODE_LBL = { 'For Time':'FOR TIME', AMRAP:'AMRAP', EMOM:'EMOM', Benchmark:'BENCHMARK', 'Estações':'ESTAÇÕES' }

// Progression rep scheme as one glanceable string, for surfaces (TV) that show
// a single line rather than ExRow's per-step grouped rows: "5×5" when the
// grouped steps share one rep count, "5-3-1" when the ladder varies per step.
function progRepsStr(ex) {
  const groups=groupProgressionSteps(ex)
  if(!groups.length) return ''
  if(groups.length===1){
    const reps=groups[0].reps
    if(!reps) return ''
    const sets=ex.intensity.steps.length
    return sets>1?`${sets}×${reps}`:reps
  }
  return groups.map(g=>g.reps||'?').join('-')
}

export function exVolStr(ex) {
  if(ex.dist){
    const unit=ex.distUnit||'m'
    if((ex.name||'').toLowerCase().includes(String(ex.dist).toLowerCase()))return ''
    return ex.sets?`${ex.sets}×${ex.dist}${unit}`:`${ex.dist}${unit}`
  }
  if(ex.intensity?.mode==='cardio'){
    const val=ex.intensity?.cardioVal,unit=ex.intensity?.cardioUnit||'m'
    if(!val)return ''
    return (ex.name||'').toLowerCase().includes(String(val).toLowerCase())?'':`${val}${unit}`
  }
  if(!ex.reps&&ex.intensity?.mode==='progression') return progRepsStr(ex)
  const r=ex.reps||'',rd=r.includes(',')?r.split(',').map(x=>x.trim()).join('-'):r
  return ex.sets&&rd?`${ex.sets}×${rd}`:rd
}

// Returns [] when ex has no steps. Callers that need a countable placeholder
// (round/checkbox key generation) pad it themselves — schedule/scheduleHelpers.js's
// progGroups() does this consistently for all of Schedule.jsx's interactive render
// paths (ExRow, the round-badge calc, and blockProgress) so a stepless progression
// exercise still gets one checkable row instead of silently vanishing (#44).
export function groupProgressionSteps(ex) {
  const steps=ex.intensity?.steps||[],groups=[]
  steps.forEach(s=>{
    const reps=s.reps||ex.reps||''
    const g=groups.find(g=>g.reps===reps)
    if(g){if(s.load)g.loads.push(s.load)}
    else groups.push({reps,loads:s.load?[s.load]:[]})
  })
  return groups
}

export function toSecs(t) {
  if(!t) return Infinity
  const p=String(t).split(':')
  return p.length===2?(parseInt(p[0])||0)*60+(parseInt(p[1])||0):parseInt(t)||Infinity
}

export function fmtSecs(s) {
  const m=Math.floor(s/60),r=s%60
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
}

export function rankResults(results, blType) {
  const isForTime=isTimeBlock(blType)
  return [...results].sort((a,b)=>{
    if(isForTime) return toSecs(a.perfTime)-toSecs(b.perfTime)
    const ra=parseInt(a.perfRounds)||0,rb=parseInt(b.perfRounds)||0
    if(ra!==rb) return rb-ra
    return (parseInt(b.perfReps)||0)-(parseInt(a.perfReps)||0)
  })
}

export function perfStr(r, blType) {
  // For Time with no time but with rounds = capped before finishing. The three
  // Results copies rendered that as "N rds (DNF)" while this canonical one
  // returned '—', silently hiding the work a capped athlete actually did
  // (rankResults already sorts them last — toSecs('') is Infinity). Absorbed
  // here in #51 so every ranking surface agrees.
  if(isTimeBlock(blType)){
    if(r.perfTime) return r.perfTime
    return r.perfRounds?`${r.perfRounds} rds (DNF)`:'—'
  }
  const p=[]
  if(r.perfRounds) p.push(`${r.perfRounds} rds`)
  if(r.perfReps)   p.push(`${r.perfReps} reps`)
  return p.join(' + ')||'—'
}

export function fmtIntensity(ins) {
  if(!ins?.mode) return null
  if(ins.mode==='progression'){
    const steps=ins.steps||[],loads=steps.map(st=>st.load).filter(Boolean)
    const unit=(steps[0]?.unit||'% RM').replace('% do RM','% RM')
    return loads.length?loads.join('/')+' '+unit:null
  }
  if(ins.mode==='pct') return ins.pct?ins.pct+'% RM':null
  if(ins.mode==='gender'){
    const p=[]
    ;['Masculino','Feminino'].forEach(g=>{
      const unit=ins[`${g}_unit`]||'kg'
      const vals=['RX','Inter','SC'].map(k=>ins[`${g}_${k}`]).filter(Boolean)
      if(vals.length) p.push(`${g==='Masculino'?'M':'F'}: ${vals.join('/')} ${unit}`)
    })
    return p.join(' | ')||null
  }
  return null
}
