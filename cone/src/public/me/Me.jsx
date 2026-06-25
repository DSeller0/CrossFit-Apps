import { useState, useEffect, useRef } from 'react'
import Nav from '../Nav.jsx'
import { sb } from '../supabaseClient.js'
import { registerSW } from '../registerSW.js'
import { toISO, todayISO } from '../lib/week.js'
import styles from './Me.module.css'

const DAY_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MON_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const ECOL = {
  'Força':'#5090e0','LPO':'#4070c0','Core':'#6090d8','Acessórios':'#4878b8',
  'Skill':'#4ac8c0','Cardio':'#40b878','Mobilidade':'#30a868',
  'MetCon':'#c84040','HIIT':'#e05848','EMOM':'#d07828',
  'For Time':'#c86828','AMRAP':'#e09830','Estações':'#c8a030',
  'Benchmark':'#d8a840',
}
const WOD_TYPES  = ['MetCon','AMRAP','EMOM','For Time','HIIT','Estações']
const DIST_TYPES = ['Força','LPO','Acessórios','Skill','Core','Cardio','Mobilidade']
const PR_SKIP    = new Set(['-','Aquecimento','Descanso','HIIT','MetCon','EMOM','For Time','AMRAP','Estações'])
const SCLS = { RX:'bRx', SC:'bSc', Inter:'bInter', Adaptado:'bAdp' }

function initials(n) { return n.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase() }
function getTargets(s) { if(!s?.mainTraining)return[]; return Array.isArray(s.mainTraining)?s.mainTraining:[s.mainTraining] }
function matchesAthlete(s,name) { return getTargets(s).includes(name) }
function fmtDate(iso) { const d=new Date(iso+'T12:00:00'); return`${DAY_PT[d.getDay()]} ${d.getDate()} ${MON_PT[d.getMonth()]}` }
function fmtEvDate(iso) { const d=new Date(iso+'T12:00:00'); return`${MON_PT[d.getMonth()]} ${d.getDate()}` }

function toSecs(t) { if(!t)return Infinity; const p=String(t).split(':'); return p.length===2?parseInt(p[0])*60+parseInt(p[1]):parseInt(t)||Infinity }
function fmtTime(s) { const m=Math.floor(s/60),r=s%60; return`${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}` }
function prBest(pr) {
  if(!pr?.results?.length) return null
  if(pr.type==='time') return pr.results.reduce((b,r)=>toSecs(r.value)<toSecs(b.value)?r:b)
  return pr.results.reduce((b,r)=>Number(r.value)>Number(b.value)?r:b)
}
function prPct(pr) {
  const best=prBest(pr)
  if(!best||!pr.target) return null
  if(pr.type==='time'){
    const tgt=toSecs(pr.target)
    const first=pr.results.length>0?toSecs([...pr.results].sort((a,b)=>new Date(a.date)-new Date(b.date))[0].value):tgt*2
    if(first<=tgt) return 100
    return Math.min(100,Math.round((first-toSecs(best.value))/(first-tgt)*100))
  }
  const t=Number(pr.target)
  return t?Math.min(100,Math.round(Number(best.value)/t*100)):null
}
function prDelta(pr) {
  if(!pr?.results||pr.results.length<2) return null
  const sorted=[...pr.results].sort((a,b)=>new Date(a.date)-new Date(b.date))
  const last=sorted[sorted.length-1],prev=sorted[sorted.length-2]
  if(pr.type==='time'){const d=toSecs(prev.value)-toSecs(last.value);if(!d)return{label:'=',good:null};return{label:(d>0?'-':'+')+fmtTime(Math.abs(d)),good:d>0}}
  const d=Number(last.value)-Number(prev.value);if(!d)return{label:'=',good:null}
  return{label:(d>0?'+':'')+d+' '+(pr.type==='load'?(pr.unit||'kg'):'reps'),good:d>0}
}
function prValLabel(val,pr) {
  if(pr.type==='load') return val+' '+(pr.unit||'kg')
  if(pr.type==='reps') return val+' reps'
  return val
}

function calcStreak(present) {
  const dates=[...new Set(present.map(r=>r.date))].sort().reverse()
  if(!dates.length) return 0
  const td=todayISO(),yd=toISO(new Date(Date.now()-86400000))
  if(dates[0]!==td&&dates[0]!==yd) return 0
  let s=0,cur=dates[0]
  for(const d of dates){if(d===cur){s++;const p=new Date(cur+'T12:00:00');p.setDate(p.getDate()-1);cur=toISO(p);}else break}
  return s
}
function calcMaxStreak(present) {
  const dates=[...new Set(present.map(r=>r.date))].sort()
  if(!dates.length) return 0
  let mx=1,cur=1
  for(let i=1;i<dates.length;i++){
    const d=(new Date(dates[i]+'T12:00:00')-new Date(dates[i-1]+'T12:00:00'))/86400000
    if(d===1){cur++;if(cur>mx)mx=cur}else cur=1
  }
  return mx
}
function calcBlockStats(sessions,present,name,types,start,end) {
  const ts=new Set(types),pl={},ex={}
  types.forEach(t=>{pl[t]=0;ex[t]=0})
  Object.keys(sessions).forEach(date=>{
    if(date<start||date>end)return
    ;(sessions[date]||[]).forEach(s=>{
      if(!matchesAthlete(s,name))return
      ;(s.blocks||[]).forEach(b=>{if(ts.has(b.type))pl[b.type]++})
    })
  })
  present.forEach(r=>{
    if(r.date<start||r.date>end)return
    ;(r.blocks||[]).forEach(b=>{if(ts.has(b.blockType))ex[b.blockType]++})
  })
  return{planned:pl,executed:ex}
}
function buildEvents(prs,goals) {
  const evs=[]
  ;(prs||[]).forEach(pr=>{
    if(!pr.results||pr.results.length<2)return
    const sorted=[...pr.results].sort((a,b)=>new Date(a.date)-new Date(b.date))
    const last=sorted[sorted.length-1],prev=sorted[sorted.length-2]
    let good=false,delta=''
    if(pr.type==='time'){const d=toSecs(prev.value)-toSecs(last.value);good=d>0;if(good)delta='-'+fmtTime(d)}
    else{const d=Number(last.value)-Number(prev.value);good=d>0;if(good)delta='+'+(d)+' '+(pr.type==='load'?(pr.unit||'kg'):'reps')}
    if(!good)return
    evs.push({date:last.date,title:'PR — '+pr.name,sub:'Anterior: '+prValLabel(prev.value,pr)+' · melhora de '+delta,val:prValLabel(last.value,pr),valColor:'var(--teal)'})
  })
  ;(goals||[]).forEach(goal=>{
    const hitCount=(goal.milestones||[]).filter(m=>m.hit).length
    const total=(goal.milestones||[]).length
    ;(goal.milestones||[]).forEach(m=>{
      if(m.hit&&m.hitDate)evs.push({date:m.hitDate,title:'Marco — '+goal.name,sub:m.label||'',val:hitCount+'/'+total+' marcos',valColor:'var(--teal)'})
    })
  })
  return evs.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)
}
function catToInputType(cats) {
  if(!cats?.length)return'load'
  if(cats.some(c=>c==='Benchmark'))return'time'
  if(cats.some(c=>['Força','LPO','Core','Acessórios'].includes(c)))return'load'
  if(cats.some(c=>c==='Cardio'))return'dist'
  if(cats.some(c=>['Skill','Mobilidade'].includes(c)))return'reps'
  return'load'
}

export default function Me() {
  const [status, setStatus] = useState('loading')
  const [athletes, setAthletes] = useState([])
  const [sessions, setSessions] = useState({})
  const [allResults, setAllResults] = useState([])
  const [goalsData, setGoalsData] = useState({ athleteGoals:{}, prs:{} })
  const [registry, setRegistry] = useState({})
  const [selAthlete, setSelAthlete] = useState(null)
  const [query, setQuery] = useState('')
  const [openBlock, setOpenBlock] = useState(null)
  const [openEx, setOpenEx] = useState(null)

  // Log sheet state
  const [lsOpen, setLsOpen] = useState(false)
  const [lsName, setLsName] = useState('')
  const [lsCats, setLsCats] = useState([])
  const [lsPr, setLsPr] = useState(null)
  const [lsUnit, setLsUnit] = useState('kg')
  const [lsDate, setLsDate] = useState('')
  const [lsVal, setLsVal] = useState('')
  const [lsReps, setLsReps] = useState('')
  const [lsGoal, setLsGoal] = useState('')
  const [lsNote, setLsNote] = useState('')
  const [lsDeltaTxt, setLsDeltaTxt] = useState('')
  const [lsDeltaClr, setLsDeltaClr] = useState('')
  const [lsPending, setLsPending] = useState(null)
  const [lsSaving, setLsSaving] = useState(false)
  const [lsSaveResult, setLsSaveResult] = useState(null)
  const [lsWarn, setLsWarn] = useState('')

  // Body sheet state
  const [bmOpen, setBmOpen] = useState(false)
  const [bmWeight, setBmWeight] = useState('')
  const [bmHeight, setBmHeight] = useState('')
  const [bmBf, setBmBf] = useState('')
  const [bmNote, setBmNote] = useState('')
  const [bmWarn, setBmWarn] = useState(false)

  const lsValRef = useRef(null)

  useEffect(() => {
    registerSW()
    load()
    const onShow = e => { if(e.persisted) load() }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  async function load(attempt = 0) {
    setStatus('loading')
    const id = new URLSearchParams(location.search).get('id')
    try {
      const [athRow,sessRow,resRaw,goalsRow,regRow] = await Promise.all([
        sb.from('athletes').select('value').eq('id',1).maybeSingle(),
        sb.from('sessions').select('value').eq('id',1).maybeSingle(),
        sb.from('results_v2').select('*'),
        sb.from('goals_data').select('value').eq('id',1).maybeSingle(),
        sb.from('exercise_registry').select('value').eq('id',1).maybeSingle(),
      ])
      const athList = athRow.data?.value || []
      const sessData = sessRow.data?.value || {}
      const resData = (resRaw.data||[]).map(r=>({id:r.id,date:r.date,athleteId:r.athlete_id,sessionId:r.session_id,presence:r.presence,energyLevel:r.energy_level,blocks:r.blocks,coachNote:r.coach_note,flagForReview:r.flag_for_review,loggedByAthlete:r.logged_by_athlete}))
      const goalsD = goalsRow.data?.value || { athleteGoals:{}, prs:{} }
      const regData = regRow.data?.value || {}
      setAthletes(athList)
      setSessions(sessData)
      setAllResults(resData)
      setGoalsData(goalsD)
      setRegistry(regData)
      if(id) {
        const ath = athList.find(a=>String(a.id)===String(id))
        if(!ath){ setStatus('picker'); return }
        setSelAthlete(ath)
        document.title = ath.name + ' · Cone'
        setStatus('profile')
      } else {
        setStatus('picker')
      }
    } catch(e) {
      if(attempt<2){ setTimeout(()=>load(attempt+1),2000*(attempt+1)); return }
      console.error(e)
      setStatus('error')
    }
  }

  // ── Log sheet ─────────────────────────────────────────────
  function unitLabel(unit) {
    if(unit==='time') return 'mm:ss'
    if(unit==='reps') return 'reps'
    if(unit==='m') return 'm'
    return 'kg'
  }

  function computeDelta(val, pr, unit) {
    if(!val.trim()) return { txt:'', clr:'' }
    const best = pr ? prBest(pr) : null
    if(!best) return { txt:'Primeiro registro!', clr:'var(--teal)' }
    if(unit==='time'){
      const ns=toSecs(val.trim()),bs=toSecs(best.value)
      if(ns===Infinity||bs===Infinity) return{txt:'',clr:''}
      const d=bs-ns
      if(d>0) return{txt:'↑ −'+fmtTime(d)+' vs melhor',clr:'#68d8a0'}
      if(d<0) return{txt:'↓ +'+fmtTime(-d)+' vs melhor',clr:'#e05848'}
      return{txt:'Igual ao melhor',clr:'var(--muted)'}
    }
    const nv=parseFloat(val)||0,bv=parseFloat(best.value)||0,d=nv-bv
    const u=unit==='reps'?'reps':unit==='m'?'m':'kg'
    if(d>0) return{txt:'↑ +'+d+' '+u+' vs melhor',clr:'#68d8a0'}
    if(d<0) return{txt:'↓ '+d+' '+u+' vs melhor',clr:'#e05848'}
    return{txt:'Igual ao melhor',clr:'var(--muted)'}
  }

  function onValChange(val) {
    setLsVal(val)
    const {txt,clr} = computeDelta(val, lsPr, lsUnit)
    setLsDeltaTxt(txt); setLsDeltaClr(clr)
  }

  function switchUnit(unit) {
    setLsUnit(unit)
    setLsVal('')
    setLsDeltaTxt(''); setLsDeltaClr('')
  }

  function openLogSheet(name, cats, pr) {
    const prUnit = pr?.type==='time'?'time': (pr?.unit&&['kg','reps','m','time'].includes(pr.unit)?pr.unit:'kg')
    let unit = pr ? prUnit : 'kg'
    if(!pr) {
      const t = catToInputType(cats)
      if(t==='time') unit='time'
      else if(t==='reps') unit='reps'
      else if(t==='dist') unit='m'
    } else if(unit==='kg') {
      // respect pr.type for reps
      if(pr.type==='reps') unit='reps'
    }
    setLsName(name); setLsCats(cats||[]); setLsPr(pr||null)
    setLsUnit(unit); setLsDate(todayISO())
    setLsVal(''); setLsReps(''); setLsGoal(pr?.target||''); setLsNote('')
    setLsDeltaTxt(''); setLsDeltaClr('')
    setLsPending(null); setLsSaving(false); setLsSaveResult(null); setLsWarn('')
    setLsOpen(true)
    setTimeout(() => lsValRef.current?.focus(), 320)
  }

  function closeLogSheet() {
    setLsOpen(false)
    setLsPending(null)
  }

  async function savePr() {
    if(!lsVal.trim()) return
    const raw = lsVal.trim()
    const reps = lsReps ? parseInt(lsReps)||null : null
    const date = lsDate || todayISO()
    const note = lsNote.trim()
    const best = lsPr ? prBest(lsPr) : null

    let numVal, isNewPr
    if(lsUnit==='time'){
      numVal=raw; isNewPr=!best||toSecs(raw)<toSecs(best.value)
    } else {
      numVal=parseFloat(raw)||0; isNewPr=!best||numVal>parseFloat(best.value||0)
    }

    if(!isNewPr && !lsPending) {
      setLsPending({ numVal, reps, date, note, bestStr: prValLabel(best.value, lsPr) })
      return
    }

    const finalVal  = lsPending ? lsPending.numVal : numVal
    const finalReps = lsPending ? lsPending.reps   : reps
    const finalDate = lsPending ? lsPending.date   : date
    const finalNote = lsPending ? lsPending.note   : note
    const finalIsNew = !lsPending

    setLsSaving(true)
    const { error: e } = await sb.rpc('submit_pr', {
      p_athlete_id: String(selAthlete.id),
      p_exercise:   lsName,
      p_value:      String(finalVal),
      p_unit:       lsUnit,
      p_reps:       finalReps||null,
      p_categories: lsCats,
      p_is_pr_best: finalIsNew,
      p_note:       finalNote||null,
      p_date:       finalDate,
      p_target:     lsGoal.trim()||null,
    })
    if(e){ setLsSaving(false); setLsWarn('Erro ao salvar. Verifique conexão.'); return }
    setLsSaveResult(finalIsNew ? 'pr' : 'saved')
    setTimeout(async () => {
      const { data: gd } = await sb.from('goals_data').select('value').eq('id',1).maybeSingle()
      setGoalsData(gd?.value || { athleteGoals:{}, prs:{} })
      setLsSaving(false)
      setLsOpen(false)
    }, 900)
  }

  async function clearPr(name) {
    if(!confirm(`Apagar todos os registros de "${name}"?`)) return
    const { error: e } = await sb.rpc('clear_pr', { p_athlete_id:String(selAthlete.id), p_exercise:name })
    if(e){ alert('Erro ao apagar. Verifique conexão.'); return }
    const { data: gd } = await sb.from('goals_data').select('value').eq('id',1).maybeSingle()
    setGoalsData(gd?.value || { athleteGoals:{}, prs:{} })
  }

  // ── Profile data ─────────────────────────────────────────
  function getProfileData() {
    const id = String(selAthlete.id)
    const prs   = (goalsData?.prs||{})[id] || []
    const goals = (goalsData?.athleteGoals||{})[id] || []
    const color = selAthlete.color || 'var(--teal)'

    const now=new Date(), td=todayISO()
    const nowY=now.getFullYear(), nowM=now.getMonth()+1
    const mPrefix=`${nowY}-${String(nowM).padStart(2,'0')}`

    const myResults = allResults.filter(r=>String(r.athleteId)===id)
    const sorted = [...myResults].sort((a,b)=>b.date.localeCompare(a.date))
    const present = sorted.filter(r=>r.presence==='Presente')

    // Hearts
    const mResults = present.filter(r=>r.date.startsWith(mPrefix))
    const beforeToday = mResults.filter(r=>r.date<td).length
    const todayDone = mResults.some(r=>r.date===td)
    const plannedDates = new Set()
    Object.keys(sessions).forEach(date=>{
      if(!date.startsWith(mPrefix))return
      ;(sessions[date]||[]).forEach(s=>{if(matchesAthlete(s,selAthlete.name))plannedDates.add(date)})
    })
    const heartTotal = Math.min(Math.max(plannedDates.size,mResults.length,12),20)
    const hearts=[]
    for(let i=0;i<heartTotal;i++){
      if(i<beforeToday) hearts.push('full')
      else if(i===beforeToday&&todayDone) hearts.push('today')
      else hearts.push('empty')
    }

    // KPIs
    const totalSess=present.length, thisMon=mResults.length
    const streak=calcStreak(present), maxStreak=calcMaxStreak(present)
    const totalPrs=prs.length
    const prsThisMon=prs.filter(p=>p.results?.some(r=>r.date?.startsWith(mPrefix))).length
    const allScales=present.flatMap(r=>(r.blocks||[]).map(b=>b.scale).filter(Boolean))
    const rxRate=allScales.length?Math.round(allScales.filter(s=>s==='RX').length/allScales.length*100):null
    const lastMP=new Date(nowY,nowM-2,1)
    const lastMPfx=`${lastMP.getFullYear()}-${String(lastMP.getMonth()+1).padStart(2,'0')}`
    const lastMScales=present.filter(r=>r.date.startsWith(lastMPfx)).flatMap(r=>(r.blocks||[]).map(b=>b.scale).filter(Boolean))
    const lastMRx=lastMScales.length?Math.round(lastMScales.filter(s=>s==='RX').length/lastMScales.length*100):null
    const rxDelta=rxRate!==null&&lastMRx!==null?rxRate-lastMRx:null

    // Recent sessions
    const prDateSet=new Set(prs.flatMap(p=>(p.results||[]).map(r=>r.date)))
    const recSess=present.slice(0,5).map(r=>{
      const ds=sessions[r.date]||[]
      const s=ds.find(x=>x.id===r.sessionId)
      const name=s?.sessionName||s?.name||'Treino'
      const rs=(r.blocks||[]).map(b=>b.rpe).filter(Boolean)
      const rpe=rs.length?Math.round(rs.reduce((a,b)=>a+b,0)/rs.length):null
      const sc=(r.blocks||[]).map(b=>b.scale).filter(Boolean)
      let scale=null
      if(sc.length){const c={};sc.forEach(s=>c[s]=(c[s]||0)+1);scale=Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]}
      return{date:r.date,name,rpe,scale,hasPr:prDateSet.has(r.date),scaleCls:SCLS[scale]||'bSc'}
    })

    // Events & goals stats
    const events=buildEvents(prs,goals)
    const totalMarcosHit=goals.reduce((sum,g)=>sum+(g.milestones||[]).filter(m=>m.hit).length,0)

    // WODs
    const monthStart=`${nowY}-${String(nowM).padStart(2,'0')}-01`
    const wStats=calcBlockStats(sessions,present,selAthlete.name,WOD_TYPES,monthStart,td)
    const wodRows=WOD_TYPES.filter(t=>(wStats.planned[t]||0)>0).map(t=>{
      const pl=wStats.planned[t],ex=Math.min(wStats.executed[t]||0,pl),pct=Math.round(ex/pl*100)
      return{type:t,pl,ex,pct,color:ECOL[t]||'#d07828'}
    })

    // Distribution
    const d90=new Date(now);d90.setDate(d90.getDate()-90)
    const dStats=calcBlockStats(sessions,present,selAthlete.name,DIST_TYPES,toISO(d90),td)
    const distRows=DIST_TYPES.filter(t=>(dStats.planned[t]||0)>0).map(t=>{
      const pl=dStats.planned[t],ex=Math.min(dStats.executed[t]||0,pl),pct=Math.round(ex/pl*100)
      return{type:t,pl,ex,pct,color:ECOL[t]||'#5090e0'}
    })

    // Since
    const sinceStr=selAthlete.since?new Date(selAthlete.since+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}):''
    const days=selAthlete.since?Math.floor((now-new Date(selAthlete.since+'T12:00:00'))/86400000):0

    return{id,prs,goals,color,now,td,nowY,nowM,mPrefix,present,hearts,heartTotal,
           thisMon,totalSess,streak,maxStreak,totalPrs,prsThisMon,rxRate,rxDelta,
           recSess,events,totalMarcosHit,wodRows,distRows,sinceStr,days}
  }

  const pd = status==='profile'&&selAthlete ? getProfileData() : null

  // ── Log sheet derived ────────────────────────────────────
  const isDistCat = lsCats.some(c=>c==='Cardio')
  const lsInputType = lsPr?.type==='time'?'time':lsPr?.type==='reps'?'reps':lsPr?.type==='load'?'load':catToInputType(lsCats)
  const needsToggle = lsInputType==='reps' && lsCats.some(c=>['Skill','Mobilidade'].includes(c))
  const showToggle = (isDistCat||needsToggle) && lsInputType!=='time'
  const lsBtnLabel = lsSaveResult==='pr'?'✓ Novo PR!':lsSaveResult==='saved'?'✓ Salvo':lsSaving?'...':'SALVAR'
  const lsBtnStyle = lsSaveResult==='pr'?{background:'var(--gold)',color:'#000'}:lsSaveResult==='saved'?{background:'var(--teal)'}:{}

  return (
    <>
      {/* ── Log Sheet ── */}
      <div className={`${styles.lsOverlay}${lsOpen?' '+styles.lsOverlayOpen:''}`} onClick={closeLogSheet} />
      <div className={`${styles.lsSheet}${lsOpen?' '+styles.lsSheetOpen:''}`} onClick={e=>e.stopPropagation()}>
        <div className={styles.lsHdr}>
          <div style={{flex:1}}>
            <div className={styles.lsExName}>{lsName}</div>
            {lsCats[0] && (()=>{const c=ECOL[lsCats[0]]||'#888';return(
              <span className={styles.lsCatPill} style={{background:c+'22',color:c,border:`1px solid ${c}44`}}>{lsCats[0]}</span>
            )})()}
          </div>
        </div>
        <div className={styles.lsBody}>
          <div className={styles.lsPrev}>
            {(()=>{const best=lsPr?prBest(lsPr):null;return best?'Melhor: '+prValLabel(best.value,lsPr)+(best.date?' · '+fmtDate(best.date):''):'Primeiro registro'})()}
          </div>
          {showToggle && (
            <div className={styles.lsToggle}>
              {isDistCat ? (<>
                <button className={`${styles.lsTb}${lsUnit!=='time'?' '+styles.lsTbAct:''}`} onClick={()=>switchUnit('m')}>Dist (m)</button>
                <button className={`${styles.lsTb}${lsUnit==='time'?' '+styles.lsTbAct:''}`} onClick={()=>switchUnit('time')}>Tempo</button>
              </>) : (<>
                <button className={`${styles.lsTb}${lsUnit==='reps'?' '+styles.lsTbAct:''}`} onClick={()=>switchUnit('reps')}>Reps</button>
                <button className={`${styles.lsTb}${lsUnit==='time'?' '+styles.lsTbAct:''}`} onClick={()=>switchUnit('time')}>Tempo</button>
              </>)}
            </div>
          )}
          <div className={styles.lsInpRow}>
            {lsUnit==='time' && (
              <div className={styles.lsInpWrap}>
                <input ref={lsValRef} type="text" className={styles.lsInp} value={lsVal} placeholder="00:00" onChange={e=>onValChange(e.target.value)} />
                <div className={styles.lsInpLbl}>Tempo (mm:ss)</div>
              </div>
            )}
            {lsUnit==='reps' && (
              <div className={styles.lsInpWrap}>
                <input ref={lsValRef} type="number" className={styles.lsInp} value={lsVal} placeholder="0" step="1" min="0" onChange={e=>onValChange(e.target.value)} />
                <div className={styles.lsInpLbl}>Reps</div>
              </div>
            )}
            {lsUnit==='m' && (
              <div className={styles.lsInpWrap}>
                <input ref={lsValRef} type="number" className={styles.lsInp} value={lsVal} placeholder="0" step="1" min="0" onChange={e=>onValChange(e.target.value)} />
                <div className={styles.lsInpLbl}>Distância (m)</div>
              </div>
            )}
            {lsUnit==='kg' && (<>
              <div className={styles.lsInpWrap}>
                <input ref={lsValRef} type="number" className={styles.lsInp} value={lsVal} placeholder="0" step="0.5" min="0" onChange={e=>onValChange(e.target.value)} />
                <div className={styles.lsInpLbl}>Peso (kg)</div>
              </div>
              <div className={styles.lsInpWrap} style={{maxWidth:'88px'}}>
                <input type="number" className={styles.lsInp} value={lsReps} placeholder="—" step="1" min="1" onChange={e=>setLsReps(e.target.value)} />
                <div className={styles.lsInpLbl}>Reps</div>
              </div>
            </>)}
          </div>
          {lsDeltaTxt && <div className={styles.lsDelta} style={{color:lsDeltaClr}}>{lsDeltaTxt}</div>}
          <div className={styles.lsRow}>
            <span className={styles.lsLbl}>Data</span>
            <input type="date" className={styles.lsDate} value={lsDate} onChange={e=>setLsDate(e.target.value)} />
          </div>
          <div className={styles.lsRow}>
            <span className={styles.lsLbl}>Objetivo</span>
            <input className={styles.lsGoalInp} value={lsGoal} placeholder={lsUnit==='time'?'00:00':'—'} onChange={e=>setLsGoal(e.target.value)} />
            <span className={styles.lsLbl} style={{minWidth:'28px'}}>{unitLabel(lsUnit)}</span>
          </div>
          <textarea className={styles.lsNote} rows="2" placeholder="Nota opcional..." value={lsNote} onChange={e=>setLsNote(e.target.value)} />
          {lsPending && (
            <div className={styles.lsConfirm}>
              Não bateu o recorde atual ({lsPending.bestStr}). Salvar como última tentativa?
              <div className={styles.lsConfirmBtns}>
                <button className={styles.lsBtnSec} onClick={savePr}>Salvar tentativa</button>
                <button className={styles.lsBtnCancel} style={{flex:1}} onClick={()=>setLsPending(null)}>Cancelar</button>
              </div>
            </div>
          )}
          {lsWarn && <div className={styles.lsWarn}>⚠ {lsWarn}</div>}
          <div className={styles.lsActions}>
            <button className={styles.lsBtnCancel} onClick={closeLogSheet}>CANCELAR</button>
            <button className={styles.lsBtnSave} style={lsBtnStyle} disabled={!lsVal.trim()||lsSaving} onClick={savePr}>{lsBtnLabel}</button>
          </div>
        </div>
      </div>

      {/* ── Body Sheet ── */}
      <div className={`${styles.lsOverlay}${bmOpen?' '+styles.lsOverlayOpen:''}`} onClick={()=>setBmOpen(false)} />
      <div className={`${styles.lsSheet}${bmOpen?' '+styles.lsSheetOpen:''}`} onClick={e=>e.stopPropagation()}>
        <div className={styles.lsHdr}>
          <div className={styles.lsExName}>Corpo</div>
          <span style={{fontSize:'11px',color:'var(--muted)',alignSelf:'center'}}>
            {(()=>{const d=new Date();return d.getDate()+' '+MON_PT[d.getMonth()]+' '+d.getFullYear()})()}
          </span>
        </div>
        <div className={styles.lsBody}>
          <div className={styles.lsPrev}>
            {(()=>{const bm=selAthlete?.bodyMetrics||[];const prev=bm.length?bm[bm.length-1]:null;
              return prev?'Último ('+prev.date+'): '+(prev.weight?prev.weight+'kg':'')+(prev.height?' · '+prev.height+'cm':'')+(prev.bodyFat?' · '+prev.bodyFat+'%':''):'Nenhum registro anterior.'})()}
          </div>
          <div className={styles.lsInpRow}>
            <div className={styles.lsInpWrap}><input type="number" className={styles.lsInp} value={bmWeight} placeholder="—" step="0.1" min="0" onChange={e=>setBmWeight(e.target.value)} /><div className={styles.lsInpLbl}>Peso (kg)</div></div>
            <div className={styles.lsInpWrap}><input type="number" className={styles.lsInp} value={bmHeight} placeholder="—" step="1" min="0" max="300" onChange={e=>setBmHeight(e.target.value)} /><div className={styles.lsInpLbl}>Altura (cm)</div></div>
            <div className={styles.lsInpWrap}><input type="number" className={styles.lsInp} value={bmBf} placeholder="—" step="0.1" min="0" max="100" onChange={e=>setBmBf(e.target.value)} /><div className={styles.lsInpLbl}>Gordura (%)</div></div>
          </div>
          <textarea className={styles.lsNote} rows="2" placeholder="Nota opcional..." value={bmNote} onChange={e=>setBmNote(e.target.value)} />
          {bmWarn && <div className={styles.lsWarn}>⚠ Dados ainda não estão sendo salvos remotamente.</div>}
          <div className={styles.lsActions}>
            <button className={styles.lsBtnCancel} onClick={()=>setBmOpen(false)}>CANCELAR</button>
            <button className={styles.lsBtnSave} onClick={()=>setBmWarn(true)}>SALVAR</button>
          </div>
        </div>
      </div>

      <div className={styles.pageRoot}><div className={styles.inner}>
      {/* ── Header ── */}
      <header className={styles.hdr}>
        <div className={styles.hdrRule}>
          <div className={styles.hdrLine} />
          <div className={styles.hdrDiamond} />
          <div className={`${styles.hdrLine} ${styles.hdrLineR}`} />
        </div>
        <div className={styles.brand}>CONE</div>
        <div className={styles.gym}>Meu Perfil</div>
      </header>

      {/* ── States ── */}
      {status==='loading' && <div className={styles.centerMsg}>⏳ carregando...</div>}
      {status==='error' && (
        <div className={styles.centerMsg}>
          Erro ao carregar.<br />
          <button className={styles.retryBtn} onClick={()=>load()}>↺ Tentar novamente</button>
        </div>
      )}

      {status==='picker' && (
        <div className={styles.pickerWrap}>
          <div className={styles.pickerTitle}>Quem é você?</div>
          <div className={styles.pickerSub}>Selecione seu nome para ver seu perfil.</div>
          <input className={styles.pickerInput} type="search" placeholder="Buscar..." value={query} onChange={e=>setQuery(e.target.value)} autoComplete="off" />
          <div className={styles.pickerList}>
            {(()=>{
              const q2=query.trim().toLowerCase()
              const sorted=[...athletes].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))
              const m=q2?sorted.filter(a=>a.name.toLowerCase().includes(q2)):sorted
              if(!m.length) return <div className={styles.pickerEmpty}>Nenhum atleta encontrado.</div>
              return m.map(a=>(
                <a key={a.id} className={styles.pickerItem} href={`me.html?id=${a.id}`}>
                  <span className={styles.athDot} style={{background:a.color||'#4ac8c0'}} />
                  <span className={styles.pickerName}>{a.name}</span>
                </a>
              ))
            })()}
          </div>
        </div>
      )}

      {status==='profile' && pd && (
        <div className={styles.page}>
          {/* Profile card */}
          <div className={styles.sh}><div className={styles.shInner}>
            <div className={styles.shTitle}>Atleta</div>
            <div className={styles.profRow}>
              <div className={styles.av}
                style={{background:`linear-gradient(145deg,${pd.color}22,${pd.color}08)`,borderColor:pd.color,cursor:'pointer'}}
                onClick={()=>{setBmWeight('');setBmHeight('');setBmBf('');setBmNote('');setBmWarn(false);setBmOpen(true)}}>
                <span style={{color:pd.color}}>{initials(selAthlete.name)}</span>
              </div>
              <div>
                <div className={styles.pname}>{selAthlete.name}</div>
                {selAthlete.level && <div className={styles.ptier} style={{color:pd.color}}>{selAthlete.level}</div>}
                {pd.sinceStr && <div className={styles.psub}>desde {pd.sinceStr} · {pd.days} dias</div>}
              </div>
            </div>
            <div className={styles.hearts}>
              {pd.hearts.map((h,i)=>(
                <span key={i} className={`${styles.h} ${h==='full'?styles.hf:h==='today'?styles.ht:styles.he}`}>
                  {h==='empty'?'♡':'♥'}
                </span>
              ))}
            </div>
            <div style={{fontSize:'9px',color:'var(--dim)',marginTop:'3px'}}>
              {pd.thisMon} de {pd.heartTotal} sessões · {MON_PT[pd.nowM-1]} {pd.nowY}
            </div>
          </div></div>

          {/* KPI strip */}
          <div className={styles.kpiStrip}>
            <div className={styles.kpi}><div className={styles.kpiV}>{pd.totalSess}</div><div className={styles.kpiL}>Sessões</div><div className={styles.kpiSub}>↑ {pd.thisMon} este mês</div></div>
            <div className={styles.kpi}><div className={styles.kpiV}>{pd.streak>0?pd.streak+' 🔥':pd.streak}</div><div className={styles.kpiL}>Streak</div><div className={styles.kpiSub}>{pd.maxStreak>pd.streak?'recorde: '+pd.maxStreak+' dias':pd.streak>0?'recorde atual':'sem sequência'}</div></div>
            <div className={styles.kpi}><div className={styles.kpiV} style={{color:'var(--teal)'}}>{pd.totalPrs}</div><div className={styles.kpiL}>PRs</div><div className={styles.kpiSub}>{pd.prsThisMon>0?pd.prsThisMon+' este mês':'nenhum este mês'}</div></div>
            <div className={styles.kpi}><div className={styles.kpiV} style={{color:'var(--sub)'}}>{pd.rxRate!==null?pd.rxRate+'%':'—'}</div><div className={styles.kpiL}>Taxa RX</div><div className={styles.kpiSub}>{pd.rxDelta!==null?(pd.rxDelta>=0?'↑':'↓')+' '+Math.abs(pd.rxDelta)+'% vs mês ant.':''}</div></div>
          </div>

          {/* Recent sessions */}
          <div className={styles.sh}><div className={styles.shInner}>
            <div className={styles.shTitle}>Sessões Recentes <span className={styles.shTitleR}>últimas 5</span></div>
            {pd.recSess.length ? pd.recSess.map((r,i)=>(
              <div key={i} className={styles.sessItem}>
                <span className={styles.di}>◈</span>
                <div className={styles.sessInfo}><div className={styles.sessName}>{r.name}</div><div className={styles.sessDate}>{fmtDate(r.date)}</div></div>
                <div className={styles.sessBadges}>
                  {r.rpe && <span className={`${styles.bdg} ${styles.bRpe}`}>RPE {r.rpe}</span>}
                  {r.scale && <span className={`${styles.bdg} ${styles[r.scaleCls]||styles.bSc}`}>{r.scale}</span>}
                  {r.hasPr && <span className={`${styles.bdg} ${styles.bPr}`}>PR</span>}
                </div>
              </div>
            )) : <div style={{fontSize:'12px',color:'var(--dim)',padding:'8px 0'}}>Nenhuma sessão registrada ainda.</div>}
          </div></div>

          {/* Recent events */}
          <div className={styles.sh}><div className={styles.shInner}>
            <div className={styles.shTitle}>Eventos Recentes <span className={styles.shTitleR}>últimos 5</span></div>
            {pd.events.length ? pd.events.map((ev,i)=>(
              <div key={i} className={styles.evItem}>
                <span className={styles.di}>◈</span>
                <div className={styles.evMain}><div className={styles.evTitle}>{ev.title}</div><div className={styles.evSub}>{ev.sub}</div></div>
                <div className={styles.evRight}><span className={styles.evVal} style={{color:ev.valColor}}>{ev.val}</span><span className={styles.evDate}>{fmtEvDate(ev.date)}</span></div>
              </div>
            )) : <div style={{fontSize:'12px',color:'var(--dim)',padding:'8px 0'}}>Nenhum evento recente.</div>}
          </div></div>

          {/* Goals */}
          {pd.goals.length>0 && (
            <div className={styles.sh}><div className={styles.shInner}>
              <div className={styles.shTitle}>Objetivos <span className={styles.shTitleR}>{pd.totalMarcosHit} marco{pd.totalMarcosHit!==1?'s':''} atingido{pd.totalMarcosHit!==1?'s':''}</span></div>
              {pd.goals.map((goal,gi)=>{
                const pct=goal.totalSessions>0?Math.min(100,Math.round(goal.completedSessions/goal.totalSessions*100)):0
                const ms=(goal.milestones||[]).slice().sort((a,b)=>a.pct-b.pct)
                const hitCount=ms.filter(m=>m.hit).length
                const nextMs=ms.find(m=>!m.hit)
                const pctColor=pct>=100?'var(--gold)':'var(--teal)'
                return(
                  <div key={gi} className={styles.goalItem}>
                    <div className={styles.goalHdr}>
                      <span className={styles.goalName}>{goal.name}</span>
                      <span className={styles.goalPct} style={{color:pctColor}}>{pct}%</span>
                      {ms.length>0&&<span className={styles.goalMarcos}>{hitCount}/{ms.length} marcos</span>}
                    </div>
                    <details className={styles.msDetails}>
                      <summary>
                        <div className={styles.msBar}>
                          <div className={styles.msFill} style={{width:pct+'%',background:'var(--teal)'}} />
                          {ms.map((m,mi)=>(
                            <div key={mi} className={`${styles.msDot} ${m.hit?styles.msDotHit:m===nextMs?styles.msDotNxt:styles.msDotFut}`} style={{left:m.pct+'%'}} />
                          ))}
                        </div>
                        {ms.length>0&&<div className={styles.msHint}>◈ ver marcos</div>}
                      </summary>
                      {ms.length>0&&(
                        <div className={styles.msList}>
                          {ms.map((m,mi)=>{
                            const cls=m.hit?styles.msRowHit:m===nextMs?styles.msRowNxt:styles.msRowFut
                            const status=m.hit?'atingido ✓':m===nextMs?'próximo →':''
                            return(
                              <div key={mi} className={`${styles.msRow} ${cls}`}>
                                <span className={styles.msRowIcon}>{m.hit?'◆':'◇'}</span>
                                <span className={styles.msRowName}>{m.label}</span>
                                <span className={styles.msRowPct}>{m.pct}%</span>
                                {status&&<span className={styles.msRowStatus}>{status}</span>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </details>
                    <div className={styles.goalSub}>{goal.completedSessions} de {goal.totalSessions} sessões</div>
                  </div>
                )
              })}
            </div></div>
          )}

          {/* WODs */}
          {pd.wodRows.length>0&&(
            <div className={styles.sh}><div className={styles.shInner}>
              <div className={styles.shTitle}>WODs <span className={styles.shTitleR}>{MON_PT[pd.nowM-1]} {pd.nowY} · executados/planejados</span></div>
              {pd.wodRows.map((r,i)=>(
                <div key={i} className={styles.distRow}>
                  <span className={styles.distLbl}>{r.type}</span>
                  <div className={styles.bar}><div className={styles.barFill} style={{width:r.pct+'%',background:r.color}} /></div>
                  <span className={styles.distVal} style={{color:r.color}}>{r.ex}/{r.pl}</span>
                </div>
              ))}
            </div></div>
          )}

          {/* Distribution */}
          {pd.distRows.length>0&&(
            <div className={styles.sh}><div className={styles.shInner}>
              <div className={styles.shTitle}>Distribuição <span className={styles.shTitleR}>Últimos 90 dias · executados/planejados</span></div>
              {pd.distRows.map((r,i)=>(
                <div key={i} className={styles.distRow}>
                  <span className={styles.distLbl}>{r.type}</span>
                  <div className={styles.bar}><div className={styles.barFill} style={{width:r.pct+'%',background:r.color}} /></div>
                  <span className={styles.distVal} style={{color:r.color}}>{r.ex}/{r.pl}</span>
                </div>
              ))}
            </div></div>
          )}

          {/* PR section */}
          <PrSection
            prs={pd.prs}
            registry={registry}
            openBlock={openBlock}
            setOpenBlock={b=>{setOpenBlock(b);setOpenEx(null)}}
            openEx={openEx}
            setOpenEx={setOpenEx}
            onOpen={(name,cats,pr)=>openLogSheet(name,cats,pr)}
            onClear={clearPr}
          />
        </div>
      )}

      </div></div>
      <Nav active="me" />
    </>
  )
}

function PrSection({ prs, registry, openBlock, setOpenBlock, openEx, setOpenEx, onOpen, onClear }) {
  const getName = e => typeof e==='string'?e:(e?.name||'')
  const blockOrder = Object.keys(registry).filter(bt=>!PR_SKIP.has(bt)&&(registry[bt]||[]).length>0)
  if(!blockOrder.length) return null

  return (
    <div className={styles.sh}><div className={styles.shInner}>
      <div className={styles.shTitle}>PR <span className={styles.shTitleR}>bloco → exercício → detalhe</span></div>
      {blockOrder.map(bt=>{
        const exercises=(registry[bt]||[]).map(getName).filter(Boolean)
        if(!exercises.length) return null
        const color=ECOL[bt]||'#5090e0'
        const exNamesLow=new Set(exercises.map(n=>n.toLowerCase()))
        const btPrs=prs.filter(p=>(p.categories||[]).includes(bt)||p.category===bt||exNamesLow.has((p.name||'').toLowerCase()))
        const prCount=btPrs.length,total=exercises.length
        const miniPct=total>0?Math.round(prCount/total*100):0
        const isBlockOpen=openBlock===bt
        return(
          <div key={bt}>
            <div className={`${styles.habBlock}${isBlockOpen?' '+styles.habBlockOpen:''}`}
              onClick={()=>setOpenBlock(isBlockOpen?null:bt)}>
              <span className={styles.habCaret}>{isBlockOpen?'▼':'▶'}</span>
              <span className={styles.habName}>{bt}</span>
              <div className={styles.habMini}>
                <div className={styles.barSmall}><div className={styles.barFill} style={{width:miniPct+'%',background:color}} /></div>
              </div>
              <span className={styles.habCount} style={{color:prCount>0?color:'var(--muted)'}}>{prCount} / {total} PRs</span>
            </div>
            <div className={`${styles.habExList}${isBlockOpen?' '+styles.habExListOpen:''}`}>
              {exercises.map(name=>{
                const pr=prs.find(p=>(p.name||'').toLowerCase()===name.toLowerCase())
                const hasPr=!!pr
                const exKey=bt+':'+name
                const isExOpen=openEx===exKey
                let best=null,pct=null,delta=null,dColor=''
                if(pr){
                  best=prBest(pr);pct=prPct(pr);delta=prDelta(pr)
                  dColor=delta?.good===true?'#68d8a0':delta?.good===false?'#e05848':'var(--muted)'
                }
                return(
                  <div key={name}>
                    <div className={`${styles.habEx}${isExOpen?' '+styles.habExOpen:''}`}
                      onClick={e=>{e.stopPropagation();if(hasPr)setOpenEx(isExOpen?null:exKey)}}>
                      <span className={`${styles.habCheck} ${hasPr?styles.habCheckYes:styles.habCheckNo} ti ${hasPr?'ti-check':'ti-circle'}`} />
                      <span className={styles.habExName} style={!hasPr?{color:'var(--dim)'}:{}}>{name}</span>
                      {hasPr ? (<>
                        <button className={styles.habBtnEdit} onClick={e=>{e.stopPropagation();onOpen(name,pr.categories||[pr.category].filter(Boolean),pr)}}>
                          <span className="ti ti-pencil" style={{pointerEvents:'none'}} />
                        </button>
                        <button className={styles.habBtnClear} onClick={e=>{e.stopPropagation();onClear(name)}}>✕</button>
                        <span className={styles.habExArr}>{isExOpen?'▼':'▶'}</span>
                      </>) : (
                        <button className={styles.habBtnAdd} onClick={e=>{e.stopPropagation();onOpen(name,bt?[bt]:[],null)}}>+</button>
                      )}
                    </div>
                    {hasPr && (
                      <div className={`${styles.habExDetail}${isExOpen?' '+styles.habExDetailOpen:''}`}>
                        <div className={styles.habDetailRow}>
                          {pct!==null
                            ? <div className={`${styles.barSmall} ${styles.barGrow}`}><div className={styles.barFill} style={{width:pct+'%',background:color}} /></div>
                            : <div style={{flex:1}} />
                          }
                          <span className={styles.habDetailVal}>
                            {best?prValLabel(best.value,pr):'—'}
                            {pr.target?' / '+prValLabel(pr.target,pr):''}
                          </span>
                          {delta&&delta.label!=='='&&(
                            <span style={{fontSize:'11px',fontWeight:700,color:dColor}}>
                              {delta.good===true?'↑':delta.good===false?'↓':''} {delta.label}
                            </span>
                          )}
                        </div>
                        {pct!==null&&pr.target&&<div className={styles.habDetailSub}>meta: {prValLabel(pr.target,pr)}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div></div>
  )
}
