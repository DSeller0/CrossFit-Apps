export function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2) }

export const WOD_TYPES=['For Time','AMRAP','EMOM','MetCon','HIIT','WOD','Benchmark','Estações']
export function isWodBlock(bl){ return WOD_TYPES.includes(bl.type)||WOD_TYPES.includes(bl.label) }

const BLOCK_FAMILY={
  'WOD':'red','HIIT':'red','MetCon':'red',
  'For Time':'amber','AMRAP':'amber','EMOM':'amber','Benchmark':'amber','Estações':'amber',
  'Força':'blue','LPO':'blue','Core':'blue','Acessórios':'blue',
  'Aquecimento':'green','Skill':'green','Cardio':'green','Mobilidade':'green',
}
const FAMILY_COLOR={red:'#c84038',amber:'#d8a840',blue:'#4878d8',green:'#48b860'}
export function blkColor(bl){return FAMILY_COLOR[BLOCK_FAMILY[bl.type]||BLOCK_FAMILY[bl.label]]||'#d8a840'}

export function blkLabel(bl) {
  const l=bl.label&&bl.label!=='-'?bl.label:null,t=bl.type&&bl.type!=='-'?bl.type:null
  return l&&t&&l!==t?`${l} · ${t}`:l||t||''
}

export function exVolStr(ex) {
  if(ex.intensity?.mode==='cardio'){
    const val=ex.intensity?.cardioVal,unit=ex.intensity?.cardioUnit||'m'
    if(!val)return ''
    return (ex.name||'').toLowerCase().includes(String(val).toLowerCase())?'':`${val}${unit}`
  }
  const r=ex.reps||'',rd=r.includes(',')?r.split(',').map(x=>x.trim()).join('-'):r
  return ex.sets&&rd?`${ex.sets}×${rd}`:rd
}

export function toSecs(t) {
  if(!t) return Infinity
  const p=String(t).split(':')
  return p.length===2?parseInt(p[0])*60+(parseInt(p[1])||0):parseInt(t)||Infinity
}

export function fmtSecs(s) {
  const m=Math.floor(s/60),r=s%60
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
}

export function rankResults(results, blType) {
  const isForTime=blType==='For Time'
  return [...results].sort((a,b)=>{
    if(isForTime) return toSecs(a.perfTime)-toSecs(b.perfTime)
    const ra=parseInt(a.perfRounds)||0,rb=parseInt(b.perfRounds)||0
    if(ra!==rb) return rb-ra
    return (parseInt(b.perfReps)||0)-(parseInt(a.perfReps)||0)
  })
}

export function perfStr(r, blType) {
  if(blType==='For Time') return r.perfTime||'—'
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
