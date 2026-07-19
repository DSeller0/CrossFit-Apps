import { useState, useEffect, useRef } from 'react'
import Nav, { isNavHidden } from '../Nav.jsx'
import { sb } from '../supabaseClient.js'
import { registerSW } from '../registerSW.js'
import styles from './Schedule.module.css'
import { MONTH_PT, DAY_PT, toISO, getWeek, dateToWeekOffset } from '../lib/week.js'
import { uid, blkLabel, isWodBlock, blkColor } from '../lib/wod.js'
import { buildRegistryIndex } from '../lib/registry.js'
import { getTargets, sessName } from '../lib/sessions.js'
import { prBest } from '../lib/goals.js'
import { getBoxScope, inBoxScope } from '../lib/boxScope.js'
import { isRoundBlock, progGroups, parseDurMins, onKey } from './scheduleHelpers.js'
import DemoPanel from './DemoPanel.jsx'
import LogPane from './LogPane.jsx'
import DeskRegPane from './DeskRegPane.jsx'
import SessionDetail from './SessionDetail.jsx'
import BlockDetail from './BlockDetail.jsx'
import CheckinSheet from './CheckinSheet.jsx'

// ── Pure helpers ──────────────────────────────────────────────────────────────
function autofillRm(sD,aths,athId,gdD) {
  if(!athId)return {}
  const ath=aths.find(a=>a.id===athId);if(!ath)return {}
  const prs=(gdD?.prs||{})[ath.id]||[],rm={}
  Object.values(sD||{}).forEach(daySess=>{
    (daySess||[]).forEach(sess=>{
      (sess.blocks||[]).forEach(bl=>{
        (bl.exercises||[]).filter(e=>e.name&&e.intensity?.mode==='progression').forEach(ex=>{
          const pr=prs.find(p=>p.type==='load'&&(p.name||'').toLowerCase()===(ex.name||'').toLowerCase())
          if(!pr)return
          const best=prBest(pr);if(!best?.value)return
          rm[ex.id]={rm:Math.round(Number(best.value)*10)/10,unit:pr.unit||'kg',source:'auto'}
        })
      })
    })
  });return rm
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Schedule() {
  const [status,setStatus]=useState('loading')
  const [errMsg,setErrMsg]=useState('')
  const [sessions,setSessions]=useState({})
  const [athletes,setAthletes]=useState([])
  const [results,setResults]=useState([])
  const [gymName,setGymName]=useState('Cone')
  const [restLabel,setRestLabel]=useState('Descanso')
  const [weekOffset,setWeekOffset]=useState(0)
  const [selAth,setSelAth]=useState(()=>localStorage.getItem('cone_athlete_filter')||'')
  const [expanded,setExpanded]=useState(new Set())
  const [checked,setChecked]=useState(new Set())
  const [roundState,setRoundState]=useState({})
  const [rmValues,setRmValues]=useState({})
  const [rmEditKey,setRmEditKey]=useState(null)
  const [demoTarget,setDemoTarget]=useState(null)
  const [logPane,setLogPane]=useState(null)
  const [logAthId,setLogAthId]=useState('')
  const [logBlocks,setLogBlocks]=useState([])
  const [logSubmitting,setLogSubmitting]=useState(false)
  const [logSuccess,setLogSuccess]=useState(false)
  const [logConfirming,setLogConfirming]=useState(false)
  const [logError,setLogError]=useState('')

  // Desktop state
  const [selSess,setSelSess]=useState(null) // {dateKey, sessId}
  const [deskAthSearch,setDeskAthSearch]=useState('')
  const [deskRegBl,setDeskRegBl]=useState(null) // {bl, sess, dateKey}
  const [deskRegStep,setDeskRegStep]=useState('form') // 'form'|'confirm'|'success'
  const [deskRegScale,setDeskRegScale]=useState(null)
  const [deskRegRpe,setDeskRegRpe]=useState(null)
  const [deskRegPerfTime,setDeskRegPerfTime]=useState('')
  const [deskRegPerfRounds,setDeskRegPerfRounds]=useState('')
  const [deskRegPerfReps,setDeskRegPerfReps]=useState('')
  const [deskRegSubmitting,setDeskRegSubmitting]=useState(false)
  const [deskRegError,setDeskRegError]=useState('')

  // Check-in flow (from QR code: ?checkin=CLASS_EXEC_ID)
  const [checkinId,setCheckinId]=useState(()=>new URLSearchParams(location.search).get('checkin')||'')
  const [checkinExec,setCheckinExec]=useState(null)
  const [checkinAthId,setCheckinAthId]=useState('')
  const [checkinAnonName,setCheckinAnonName]=useState('')
  const [checkinMode,setCheckinMode]=useState('athlete') // 'athlete'|'anon'
  const [checkinSearch,setCheckinSearch]=useState('')
  const [checkinDone,setCheckinDone]=useState(false)
  const [checkinSubmitting,setCheckinSubmitting]=useState(false)

  const [lockedId]=useState(()=>new URLSearchParams(location.search).get('id')||'')
  const [box]=useState(()=>getBoxScope())

  const demoMapRef=useRef(new Map())
  const goalsRef=useRef({})

  useEffect(()=>{
    registerSW()
    try{const s=localStorage.getItem('sched_rounds');if(s)setRoundState(JSON.parse(s))}catch(e){}
    load()
    const onShow=e=>{if(e.persisted)load()}
    window.addEventListener('pageshow',onShow)
    return()=>window.removeEventListener('pageshow',onShow)
  },[])

  // Auto-select today's session on first load
  useEffect(()=>{
    if(status==='ok'&&!selSess&&weekOffset===0){
      const t=toISO(new Date())
      const todaySess=(sessions[t]||[]).filter(s=>s.public!==false&&inBoxScope(s,box)&&s.blocks&&s.blocks.length)
      if(todaySess.length>0)setSelSess({dateKey:t,sessId:todaySess[0].id})
    }
  },[status])

  // Load class_execution for check-in flow
  useEffect(()=>{
    if(!checkinId)return
    sb.from('class_executions').select('*').eq('id',checkinId).maybeSingle().then(({data})=>{
      if(data)setCheckinExec(data)
    })
  },[checkinId])

  async function submitCheckin(){
    if(checkinMode==='athlete'&&!checkinAthId)return
    if(checkinMode==='anon'&&!checkinAnonName.trim())return
    setCheckinSubmitting(true)
    if(checkinMode==='athlete'){
      await sb.rpc('class_checkin',{p_class_id:checkinId,p_athlete_id:checkinAthId})
    }else{
      await sb.rpc('class_checkin',{p_class_id:checkinId,p_guest_name:checkinAnonName.trim()})
    }
    setCheckinSubmitting(false)
    setCheckinDone(true)
  }

  async function load(attempt=0){
    if(attempt===0)setStatus('loading')
    try{
      const[cfgRes,sR,aR,rRaw,stR,gdR,erR]=await Promise.all([
        fetch('./config.json?v='+Date.now()).catch(()=>null),
        sb.from('sessions').select('value').eq('id',1).maybeSingle(),
        sb.from('athletes').select('value').eq('id',1).maybeSingle(),
        sb.from('results_v2').select('*'),
        sb.from('settings').select('value').eq('id',1).maybeSingle(),
        sb.from('goals_data').select('value').eq('id',1).maybeSingle(),
        sb.from('exercise_registry').select('value').eq('id',1).maybeSingle(),
      ])
      const sD=sR.data?.value||{},aD=aR.data?.value||[]
      const rD=(rRaw.data||[]).map(r=>({id:r.id,date:r.date,athleteId:r.athlete_id,sessionId:r.session_id,presence:r.presence,energyLevel:r.energy_level,blocks:r.blocks,coachNote:r.coach_note,flagForReview:r.flag_for_review,loggedByAthlete:r.logged_by_athlete}))
      const stD=stR.data?.value||{},gdD=gdR.data?.value||{athleteGoals:{},prs:{}}
      const erD=erR.data?.value||{}

      // config.json: functional keys only. Its wk*/theme* color overrides used to be
      // written onto documentElement here — removed (#50): they fought themes.css and
      // broke theme switching on this page. Colors come exclusively from theme tokens.
      let restLbl='Descanso',gName=stD.gymName||'Cone'
      if(cfgRes?.ok){
        try{
          const cfg=await cfgRes.json()
          if(cfg.scheduleTitle||cfg.appTitle)document.title=cfg.scheduleTitle||cfg.appTitle
          if(cfg.restDayLabel)restLbl=cfg.restDayLabel
        }catch(e){}
      }

      demoMapRef.current=buildRegistryIndex(erD)
      goalsRef.current=gdD

      const sp=new URLSearchParams(location.search)
      const pDate=sp.get('date'),pOpenLog=sp.get('openLog'),pBlockId=sp.get('blockId')
      const pAthlete=sp.get('athlete'),pPrefill=sp.get('prefill'),pPrefillRounds=sp.get('prefillRounds')

      const curAth=lockedId||localStorage.getItem('cone_athlete_filter')||''
      let athId=curAth
      if(pDate)setWeekOffset(dateToWeekOffset(pDate))
      if(lockedId){setSelAth(lockedId);localStorage.setItem('cone_athlete_filter',lockedId)}
      else if(pAthlete){const a=aD.find(x=>String(x.id)===String(pAthlete));if(a){athId=a.id;setSelAth(a.id);localStorage.setItem('cone_athlete_filter',a.id)}}

      const newAuto=autofillRm(sD,aD,athId,gdD)

      setSessions(sD);setAthletes(aD);setResults(rD)
      setGymName(gName);setRestLabel(restLbl)
      setRmValues(prev=>{
        const manual=Object.fromEntries(Object.entries(prev).filter(([,v])=>v.source==='manual'))
        return{...newAuto,...manual}
      })

      setStatus('ok')

      if(pOpenLog&&pDate){
        const sess=(sD[pDate]||[]).find(s=>s.id===pOpenLog)
        if(sess){
          const prefill=pBlockId?{blockId:pBlockId,athId:pAthlete||'',perfTime:pPrefill||'',perfRounds:pPrefillRounds||''}:null
          doOpenLog(sess,pDate,aD,athId,prefill)
        }
        history.replaceState({},'','schedule.html')
      }
    }catch(e){
      if(attempt<2){setTimeout(()=>load(attempt+1),2000*(attempt+1));return}
      setErrMsg(e.message);setStatus('error')
    }
  }

  function sessionsForDay(dateKey){
    const all=(sessions[dateKey]||[]).filter(s=>s.public!==false&&inBoxScope(s,box))
    if(!selAth)return all.filter(s=>s.blocks&&s.blocks.length)
    const athName=athletes.find(a=>a.id===selAth)?.name
    return all.filter(s=>{const t=getTargets(s);return t.length===0||t.includes(athName)}).filter(s=>s.blocks&&s.blocks.length)
  }

  function isWodLogged(sess,bl){
    if(!selAth)return false
    return results.some(r=>r.sessionId===sess.id&&r.athleteId===selAth&&(r.blocks||[]).some(b=>b.blockId===bl.id))
  }

  function athHasLoggedInSess(athId,sess){
    if(!sess)return false
    return results.some(r=>r.sessionId===sess.id&&r.athleteId===athId)
  }

  function getRd(blId,exId){return roundState[`${blId}|${exId}`]||0}

  function advanceRound(blId,exId,total){
    setRoundState(prev=>{
      const cur=prev[`${blId}|${exId}`]||0,next={...prev,[`${blId}|${exId}`]:cur>=total?0:cur+1}
      if(next[`${blId}|${exId}`]===0)delete next[`${blId}|${exId}`]
      try{localStorage.setItem('sched_rounds',JSON.stringify(next))}catch(e){}
      return next
    })
  }

  function resetRound(blId,exId){
    setRoundState(prev=>{
      const next={...prev};delete next[`${blId}|${exId}`]
      try{localStorage.setItem('sched_rounds',JSON.stringify(next))}catch(e){}
      return next
    })
  }

  function blockProgress(bl,sess){
    if(isWodBlock(bl)){
      if(!sess)return{done:0,total:0}
      return{done:isWodLogged(sess,bl)?1:0,total:1}
    }
    const exs=(bl.exercises||[]).filter(e=>e.name||e.isComplex)
    if(!exs.length)return{done:0,total:0}
    let done=0
    if(isRoundBlock(bl)){
      exs.forEach(ex=>{
        if(!ex.isComplex&&ex.intensity?.mode==='progression'){
          const groups=progGroups(ex)
          if(groups.every((_,gi)=>getRd(bl.id,`${ex.id}-${gi}`)>=Number(bl.rounds)))done++
        }else{if(getRd(bl.id,ex.id)>=Number(bl.rounds))done++}
      })
      return{done,total:exs.length}
    }
    exs.forEach(ex=>{
      if(!ex.isComplex&&ex.intensity?.mode==='progression'){
        const groups=progGroups(ex)
        if(groups.every((_,gi)=>checked.has(`${bl.id}|${ex.id}-${gi}`)))done++
      }else{if(checked.has(`${bl.id}|${ex.id}`))done++}
    })
    return{done,total:exs.length}
  }

  function sessionProgress(sess){
    const relevant=(sess.blocks||[]).filter(bl=>isWodBlock(bl)||(bl.exercises||[]).some(e=>e.name||e.isComplex))
    const done=relevant.filter(bl=>{const p=blockProgress(bl,sess);return p.total>0&&p.done===p.total}).length
    return{done,total:relevant.length}
  }

  function changeAth(val){
    setSelAth(val)
    try{localStorage.setItem('cone_athlete_filter',val)}catch(e){}
    setExpanded(new Set());setRmEditKey(null);setDeskRegBl(null)
    const newAuto=autofillRm(sessions,athletes,val,goalsRef.current)
    setRmValues(prev=>{
      const manual=Object.fromEntries(Object.entries(prev).filter(([,v])=>v.source==='manual'))
      return{...newAuto,...manual}
    })
  }

  function changeWeek(dir){
    setWeekOffset(w=>w+dir);setExpanded(new Set());setChecked(new Set())
    setRoundState({});setRmEditKey(null);setSelSess(null);setDeskRegBl(null)
    try{localStorage.removeItem('sched_rounds')}catch(e){}
  }

  function openTimer(bl,sess,dateKey){
    const ath=selAth?athletes.find(a=>a.id===selAth):null
    let exercises,stationTime=45,transitionTime=15
    if(bl.type==='Estações'){
      const nonRest=(bl.stations||[]).filter(st=>!st.isRest),rest=(bl.stations||[]).filter(st=>st.isRest)
      exercises=nonRest.map(st=>({name:st.name||'Grupo',exercises:(st.exercises||[]).filter(e=>e.name||e.isComplex).map(e=>({name:e.isComplex?(e.name||(e.complexMovements||[]).map(m=>m.name).filter(Boolean).join(' + ')):e.name,sets:e.sets,reps:e.reps}))}))
      if(nonRest[0]?.duration)stationTime=Math.round(parseDurMins(nonRest[0].duration)*60)
      if(rest[0]?.duration)transitionTime=Math.round(parseDurMins(rest[0].duration)*60)
    }else{
      exercises=(bl.exercises||[]).filter(e=>e.name||e.isComplex).map(e=>({name:e.isComplex?(e.name||(e.complexMovements||[]).map(m=>m.name).filter(Boolean).join(' + ')):e.name,sets:e.sets,reps:e.reps}))
    }
    const config={blockType:bl.type||bl.label,blockLabel:(bl.label&&bl.label!==bl.type&&bl.label!=='-')?bl.label:(bl.label||bl.type||'WOD'),timeCap:bl.duration?parseInt(bl.duration):null,rounds:bl.rounds||bl.stationRepeat||null,exercises,sessionId:sess.id,sessionDate:dateKey,athleteId:ath?.id||null,blockId:bl.id,stationTime,transitionTime,countdown:true}
    try{localStorage.setItem('timer_config',JSON.stringify(config));localStorage.removeItem('timer_state')}catch(e){}
    location.href='timer.html?src=sched'
  }

  function doOpenLog(sess,dateKey,aths,athId,prefill=null,onlyBlockId=null){
    const targets=Array.isArray(sess.mainTraining)?sess.mainTraining:(sess.mainTraining?[sess.mainTraining]:[])
    const assignedAth=(aths||athletes).filter(a=>targets.includes(a.name))
    const candidates=assignedAth.length?assignedAth:(aths||athletes)
    let wodBls=(sess.blocks||[]).filter(isWodBlock)
    if(onlyBlockId)wodBls=wodBls.filter(b=>b.id===onlyBlockId)
    let resolvedAthId=prefill?.athId||athId||''
    if(resolvedAthId&&!candidates.some(a=>String(a.id)===String(resolvedAthId)))resolvedAthId=''
    // Pre-fill each block from any already-logged result (mirrors deskOpenReg) so
    // reopening the sheet — e.g. via the per-block button after a prior partial
    // submission — shows real values instead of blanking them on next submit.
    const existing=resolvedAthId?results.find(r=>r.sessionId===sess.id&&r.athleteId===resolvedAthId):null
    const blocks=wodBls.map(b=>{
      const eb=existing?.blocks?.find(x=>x.blockId===b.id)
      return{blockId:b.id,blockType:b.type,blockLabel:b.label&&b.type&&b.label!==b.type?`${b.label} · ${b.type}`:b.label||b.type,
        rpe:eb?.rpe??null,scale:eb?.scale||null,perfTime:eb?.perfTime||'',perfRounds:eb?.perfRounds||'',perfReps:eb?.perfReps||''}
    })
    if(prefill?.blockId){const bi=blocks.findIndex(b=>b.blockId===prefill.blockId);if(bi>=0){if(prefill.perfTime)blocks[bi].perfTime=prefill.perfTime;if(prefill.perfRounds)blocks[bi].perfRounds=prefill.perfRounds}}
    setLogPane({sess,dateKey,assignedAth:candidates})
    setLogAthId(resolvedAthId);setLogBlocks(blocks)
    setLogSubmitting(false);setLogSuccess(false);setLogConfirming(false);setLogError('')
  }

  // Switching athlete inside an already-open LogPane must re-derive the
  // prefilled fields for the newly picked athlete — otherwise the previous
  // athlete's real rpe/scale/perfTime values silently ride along into the
  // new athlete's submission (doOpenLog only prefills once, at open time).
  function changeLogAthId(newAthId){
    setLogAthId(newAthId)
    if(!logPane)return
    const existing=newAthId?results.find(r=>r.sessionId===logPane.sess.id&&r.athleteId===newAthId):null
    setLogBlocks(prev=>prev.map(b=>{
      const eb=existing?.blocks?.find(x=>x.blockId===b.blockId)
      return{...b,rpe:eb?.rpe??null,scale:eb?.scale||null,perfTime:eb?.perfTime||'',perfRounds:eb?.perfRounds||'',perfReps:eb?.perfReps||''}
    }))
  }

  // Confirm step (policy: review before submit, same as results.html)
  function setLogConfirmStep(on){
    if(on&&!logAthId){setLogError('Selecione seu nome antes de enviar.');return}
    setLogError('');setLogConfirming(on)
  }

  async function submitLog(){
    if(logSubmitting)return
    if(!logAthId){setLogError('Selecione seu nome antes de enviar.');return}
    setLogSubmitting(true);setLogError('')
    const{dateKey,sess}=logPane
    const existingArr=Array.isArray(results)?results:[]
    const existing=existingArr.find(r=>r.sessionId===sess.id&&r.athleteId===logAthId)
    // Merge rather than replace: doOpenLog's onlyBlockId scoping means logBlocks
    // can hold just one block, and log_result's upsert overwrites the whole
    // blocks column — replacing wholesale would silently drop any other
    // already-logged block for this athlete+session (same fix as submitDeskReg).
    const mergedBlocks=existing?[...(existing.blocks||[]).filter(b=>!logBlocks.some(lb=>lb.blockId===b.blockId)),...logBlocks]:logBlocks
    const result={id:existing?.id||uid(),date:dateKey,athleteId:logAthId,sessionId:sess.id,presence:existing?.presence||'Presente',energyLevel:existing?.energyLevel??3,blocks:mergedBlocks,coachNote:existing?.coachNote||'',flagForReview:existing?.flagForReview||false,loggedByAthlete:true}
    const next=[...existingArr.filter(r=>!(r.athleteId===logAthId&&r.sessionId===sess.id)),result]
    const{error}=await sb.rpc('log_result',{p_id:String(result.id),p_date:result.date,p_athlete_id:result.athleteId,p_session_id:result.sessionId?String(result.sessionId):null,p_presence:result.presence,p_energy_level:result.energyLevel??null,p_blocks:result.blocks})
    if(error){setLogSubmitting(false);setLogError('Erro ao enviar. Tente novamente.');return}
    setResults(next);setLogSubmitting(false);setLogSuccess(true)
  }

  function deskOpenReg(bl,sess,dateKey){
    const existing=results.find(r=>r.sessionId===sess.id&&r.athleteId===selAth)
    const existingBlock=existing?.blocks?.find(b=>b.blockId===bl.id)
    setDeskRegBl({bl,sess,dateKey})
    setDeskRegStep('form')
    setDeskRegScale(existingBlock?.scale||null)
    setDeskRegRpe(existingBlock?.rpe||null)
    setDeskRegPerfTime(existingBlock?.perfTime||'')
    setDeskRegPerfRounds(existingBlock?.perfRounds||'')
    setDeskRegPerfReps(existingBlock?.perfReps||'')
    setDeskRegError('')
  }

  function deskCloseReg(){
    setDeskRegBl(null);setDeskRegStep('form');setDeskRegError('')
  }

  async function submitDeskReg(){
    if(deskRegSubmitting)return
    if(!selAth||!deskRegBl){setDeskRegError('Selecione um atleta primeiro.');return}
    setDeskRegSubmitting(true);setDeskRegError('')
    const{bl,sess,dateKey}=deskRegBl
    const existing=results.find(r=>r.sessionId===sess.id&&r.athleteId===selAth)
    const blockResult={blockId:bl.id,blockType:bl.type,blockLabel:blkLabel(bl),rpe:deskRegRpe,scale:deskRegScale,perfTime:deskRegPerfTime,perfRounds:deskRegPerfRounds,perfReps:deskRegPerfReps}
    const mergedBlocks=existing?[...(existing.blocks||[]).filter(b=>b.blockId!==bl.id),blockResult]:[blockResult]
    const result={id:existing?.id||uid(),date:dateKey,athleteId:selAth,sessionId:sess.id,presence:'Presente',energyLevel:existing?.energyLevel??3,blocks:mergedBlocks,coachNote:existing?.coachNote||'',flagForReview:false,loggedByAthlete:true}
    const{error}=await sb.rpc('log_result',{p_id:String(result.id),p_date:result.date,p_athlete_id:result.athleteId,p_session_id:result.sessionId?String(result.sessionId):null,p_presence:result.presence,p_energy_level:result.energyLevel??null,p_blocks:result.blocks})
    if(error){setDeskRegSubmitting(false);setDeskRegError('Erro ao enviar. Tente novamente.');return}
    setResults(prev=>[...prev.filter(r=>!(r.athleteId===selAth&&r.sessionId===sess.id)),result])
    setDeskRegSubmitting(false);setDeskRegStep('success')
  }

  const week=getWeek(weekOffset),today=toISO(new Date())
  const wkStart=week[0],wkEnd=week[6]
  const weekLabel=`${wkStart.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} – ${wkEnd.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} · ${MONTH_PT[wkStart.getMonth()]} ${wkStart.getFullYear()}`

  // Derive selected session object
  const selSessObj=selSess
    ?sessionsForDay(selSess.dateKey).find(s=>s.id===selSess.sessId)||null
    :null
  const selSessDateStr=selSess
    ?new Date(selSess.dateKey+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})
    :''
  const selAthObj=athletes.find(a=>String(a.id)===String(selAth||lockedId))||null

  return(<>
    <DemoPanel target={demoTarget} demoMap={demoMapRef.current} onClose={()=>setDemoTarget(null)}/>
    <LogPane pane={logPane} athId={logAthId} onAthId={changeLogAthId}
      blocks={logBlocks} onBlocks={setLogBlocks}
      submitting={logSubmitting} success={logSuccess} error={logError}
      confirming={logConfirming} onConfirming={setLogConfirmStep}
      onSubmit={submitLog} onClose={()=>{setLogPane(null);setLogSuccess(false);setLogConfirming(false);setLogError('')}}
      lockedAthName={lockedId?athletes.find(a=>String(a.id)===String(lockedId))?.name||'':''}/>

    <div className={styles.pageRoot} style={isNavHidden() ? { paddingBottom: 0 } : undefined}><div className={styles.inner}>
    <header className={styles.hdr}>
      <div className={styles.hdrRule}><div className={styles.hdrLine}/><div className={styles.hdrDiamond}/><div className={`${styles.hdrLine} ${styles.hdrLineR}`}/></div>
      <div className={styles.brand}>{gymName.toUpperCase()}</div>
      <h1 className={styles.gym}>AGENDA</h1>
    </header>
    <main className={styles.main}>

    {/* Mobile bars */}
    {status!=='loading'&&<>
      {!lockedId&&<div className={`${styles.selBar} ${styles.mobileOnly}`}>
        <select className={styles.athleteSel} value={selAth} onChange={e=>changeAth(e.target.value)}>
          <option value="">— Todos —</option>
          {athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>}
      <div className={`${styles.weekNav} ${styles.mobileOnly}`}>
        <button className={styles.navBtn} onClick={()=>changeWeek(-1)} aria-label="Semana anterior"><i className="ti ti-chevron-left"/></button>
        <span className={styles.weekLabel}>{weekLabel}</span>
        <button className={styles.navBtn} onClick={()=>changeWeek(1)} aria-label="Próxima semana"><i className="ti ti-chevron-right"/></button>
      </div>
    </>}

    {status==='loading'&&<div className={styles.loading}><i className={`ti ti-loader ${styles.spin}`}/> Carregando...</div>}
    {status==='error'&&<div className={styles.error}><i className="ti ti-alert-circle" style={{fontSize:32}}/><br/><br/>Não foi possível carregar os treinos.<br/><small>{errMsg}</small><br/><button className={styles.retryBtn} onClick={()=>load()}>Tentar novamente</button></div>}

    {/* ── MOBILE VIEW ── */}
    {status==='ok'&&<div className={styles.mobileView}>
      <div className={styles.weekGrid}>
        {week.map(date=>{
          const dk=toISO(date),isPast=dk<today,isToday=dk===today
          const daySess=sessionsForDay(dk),hasSess=daySess.length>0
          return(
            <div key={dk} className={`${styles.dayCard}${isPast?' '+styles.past:''}${isToday?' '+styles.today:''}${hasSess?' '+styles.hasSess:''}`}>
              <div className={styles.dayHdr}>
                <span className={styles.dayDow}>{DAY_PT[date.getDay()]}</span>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  {isPast&&hasSess&&<span className={styles.concluidoBadge}>Concluído</span>}
                  <span className={styles.dayNum}>{date.getDate()}</span>
                  {isToday&&<div className={styles.dayTodayDot}/>}
                </div>
              </div>
              <div className={styles.dayBody}>
                {hasSess?daySess.map((sess,si)=>{
                  const prog=sessionProgress(sess),isExp=expanded.has(`${dk}|${si}`)
                  const blocks=sess.blocks||[]
                  const exNames=[...new Set(blocks.flatMap(bl=>(bl.exercises||[]).filter(e=>e.name).map(e=>e.name)))].slice(0,3)
                  const moreEx=blocks.flatMap(b=>(b.exercises||[])).filter(e=>e.name).length>3
                  const sessResult=isExp&&selAth?results.find(r=>r.sessionId===sess.id&&r.athleteId===selAth):null
                  return(
                    <div key={sess.id}>
                      <div className={styles.sessSummary} role="button" tabIndex={0} aria-expanded={isExp}
                        onClick={()=>setExpanded(prev=>{const n=new Set(prev);const k=`${dk}|${si}`;n.has(k)?n.delete(k):n.add(k);return n})}
                        onKeyDown={onKey(()=>setExpanded(prev=>{const n=new Set(prev);const k=`${dk}|${si}`;n.has(k)?n.delete(k):n.add(k);return n}))}>
                        {sess.sessionName&&<div className={styles.sessName}>{sess.sessionName}</div>}
                        {sess.mainTraining&&!lockedId&&<div className={styles.sessAlvo}>{Array.isArray(sess.mainTraining)?sess.mainTraining.join(', '):sess.mainTraining}</div>}
                        <div className={styles.blockBadges}>
                          {blocks.map(bl=>{
                            const lbl=blkLabel(bl),p=blockProgress(bl,sess),blDone=p.total>0&&p.done===p.total
                            const bc=blkColor(bl);return(<span key={bl.id} className={styles.blockBadge} style={{background:`${bc}22`,color:bc,border:`1px solid ${bc}44`}}>{blDone?'✓ ':''}{lbl}</span>)
                          })}
                        </div>
                        {exNames.length>0&&<div className={styles.exPreview}>{exNames.join(' · ')}{moreEx?'…':''}</div>}
                        {prog.total>0&&<div className={styles.progressBarWrap}>
                          <div className={styles.progressBarTrack}><div className={styles.progressBarFill} style={{width:`${prog.total?Math.round(prog.done/prog.total*100):0}%`}}/></div>
                          <div className={styles.progressLabel}>{prog.done}/{prog.total} blocos</div>
                        </div>}
                        <div className={styles.expandToggle}>{isExp?'▲ fechar':'▼ detalhes'}</div>
                      </div>
                      {isExp&&<SessionDetail
                        sess={sess} dateKey={dk}
                        checked={checked} roundState={roundState}
                        rmValues={rmValues} rmEditKey={rmEditKey}
                        demoMap={demoMapRef.current}
                        isWodLogged={bl=>isWodLogged(sess,bl)}
                        onCheck={(blId,exId)=>setChecked(prev=>{const n=new Set(prev);const k=`${blId}|${exId}`;n.has(k)?n.delete(k):n.add(k);return n})}
                        onAdvance={advanceRound} onReset={resetRound}
                        onRmToggle={key=>setRmEditKey(k=>k===key?null:key)}
                        onRmConfirm={(exId,rm,unit)=>{setRmValues(prev=>({...prev,[exId]:{rm,unit,source:'manual'}}));setRmEditKey(null)}}
                        onDemo={mvs=>setDemoTarget(mvs)}
                        onTimer={bl=>openTimer(bl,sess,dk)}
                        onLog={()=>doOpenLog(sess,dk,athletes,selAth)}
                        onLogBlock={selAth?bl=>doOpenLog(sess,dk,athletes,selAth,null,bl.id):null}
                        getAthResult={bl=>sessResult?.blocks?.find(b=>b.blockId===bl.id)||null}
                        athName={selAthObj?.name||''}
                      />}
                    </div>
                  )
                }):<div className={styles.restLabel}><i className="ti ti-moon"/> {restLabel}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>}

    {/* ── DESKTOP VIEW ── */}
    {status==='ok'&&<div className={styles.desktopView}>

      {/* Desktop page header */}
      <div className={styles.deskPageHdr}>
        <div className={styles.deskWeekNav}>
          <button className={styles.navBtn} onClick={()=>changeWeek(-1)} aria-label="Semana anterior"><i className="ti ti-chevron-left"/></button>
          <span className={styles.weekLabel}>{weekLabel}</span>
          <button className={styles.navBtn} onClick={()=>changeWeek(1)} aria-label="Próxima semana"><i className="ti ti-chevron-right"/></button>
        </div>
      </div>

      {/* Week strip */}
      <div className={styles.deskStrip}>
        {week.map(date=>{
          const dk=toISO(date),isPast=dk<today,isToday=dk===today
          const daySess=(sessions[dk]||[]).filter(s=>s.public!==false&&inBoxScope(s,box)&&s.blocks&&s.blocks.length)
          return(
            <div key={dk} className={styles.deskDayCol}>
              <div className={`${styles.deskDayHdr}${isToday?' '+styles.deskDayHdrToday:''}`}>
                <span className={styles.deskDow}>{DAY_PT[date.getDay()]}</span>
                <span className={`${styles.deskDnum}${isPast?' '+styles.deskDnumPast:''}`}>{date.getDate()}</span>
              </div>
              {daySess.length===0
                ?<div className={styles.deskRestCell}>—</div>
                :daySess.map(sess=>{
                  const isSel=selSess?.sessId===sess.id
                  const logCount=results.filter(r=>r.sessionId===sess.id).length
                  return(
                    <div key={sess.id}
                      className={`${styles.deskSCard}${isSel?' '+styles.deskSCardSel:''}`}
                      role="button" tabIndex={0} aria-pressed={isSel}
                      onClick={()=>{setSelSess(isSel?null:{dateKey:dk,sessId:sess.id});setDeskRegBl(null)}}
                      onKeyDown={onKey(()=>{setSelSess(isSel?null:{dateKey:dk,sessId:sess.id});setDeskRegBl(null)})}>
                      <div className={styles.deskSCardName}>{sessName(sess,dk)}</div>
                      <div className={styles.deskSCardFoot}>
                        <span className={styles.deskSCardLogLbl}>{logCount} logs</span>
                        <span className={`${styles.deskSCardDot}${logCount>0?' '+styles.deskSCardDotFilled:''}`}/>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )
        })}
      </div>

      {/* Three panes */}
      <div className={styles.deskBody}>

        {/* Athlete pane */}
        <div className={styles.deskAthPane}>
          <div className={styles.deskPaneHdr}>Atletas</div>
          {lockedId?(
            <div className={styles.deskAthList}>
              <div className={`${styles.deskAthRow} ${styles.deskAthRowSel}`}>
                <span className={`${styles.deskAthDot} ${styles.deskAthDotFilled}`}/>
                {athletes.find(a=>String(a.id)===String(lockedId))?.name||'—'}
              </div>
            </div>
          ):<>
            <div className={styles.deskAthSearchWrap}>
              <span className={styles.deskAthSearchIc}>⌕</span>
              <input className={styles.deskAthSearchInput} type="text" placeholder="Buscar…"
                value={deskAthSearch} onChange={e=>setDeskAthSearch(e.target.value)}/>
            </div>
            <div className={styles.deskAthList}>
              {athletes
                .filter(a=>!deskAthSearch||a.name.toLowerCase().includes(deskAthSearch.toLowerCase()))
                .sort((a,b)=>a.name.localeCompare(b.name,'pt'))
                .map(ath=>{
                  const isSel=String(selAth)===String(ath.id)
                  const hasLogged=athHasLoggedInSess(ath.id,selSessObj)
                  return(
                    <div key={ath.id}
                      className={`${styles.deskAthRow}${isSel?' '+styles.deskAthRowSel:''}`}
                      role="button" tabIndex={0} aria-pressed={isSel}
                      onClick={()=>changeAth(isSel?'':String(ath.id))}
                      onKeyDown={onKey(()=>changeAth(isSel?'':String(ath.id)))}>
                      <span className={`${styles.deskAthDot}${hasLogged?' '+styles.deskAthDotFilled:''}`}/>
                      {ath.name}
                    </div>
                  )
                })
              }
            </div>
          </>}
        </div>

        {/* Session pane */}
        <div className={styles.deskSessPane}>
          {selSessObj?<>
            <div className={styles.deskSessPaneHdr}>
              <div className={styles.deskSessDot}/>
              <span className={styles.deskSessNameHdr}>{sessName(selSessObj,selSess.dateKey)}</span>
              <span className={styles.deskSessDateHdr}>{selSessDateStr}</span>
            </div>
            <div className={styles.deskSessScroll}>
              {(selSessObj.blocks||[]).map(bl=>{
                const isWod=isWodBlock(bl)
                const existingResult=selAth
                  ?results.find(r=>r.sessionId===selSessObj.id&&r.athleteId===selAth)?.blocks?.find(b=>b.blockId===bl.id)||null
                  :null
                return(
                  <BlockDetail key={bl.id} bl={bl} sess={selSessObj} dateKey={selSess.dateKey}
                    deskIdleHint={!selAth}
                    checked={checked} roundState={roundState}
                    rmValues={rmValues} rmEditKey={rmEditKey}
                    demoMap={demoMapRef.current}
                    isWodLogged={b=>isWodLogged(selSessObj,b)}
                    onCheck={(blId,exId)=>setChecked(prev=>{const n=new Set(prev);const k=`${blId}|${exId}`;n.has(k)?n.delete(k):n.add(k);return n})}
                    onAdvance={advanceRound} onReset={resetRound}
                    onRmToggle={key=>setRmEditKey(k=>k===key?null:key)}
                    onRmConfirm={(exId,rm,unit)=>{setRmValues(prev=>({...prev,[exId]:{rm,unit,source:'manual'}}));setRmEditKey(null)}}
                    onDemo={mvs=>setDemoTarget(mvs)}
                    onTimer={b=>openTimer(b,selSessObj,selSess.dateKey)}
                    onLogBlock={isWod&&selAth?()=>deskOpenReg(bl,selSessObj,selSess.dateKey):null}
                    athResult={existingResult}
                    athName={selAthObj?.name||''}
                  />
                )
              })}
            </div>
          </>:<div className={styles.deskPaneEmpty}>
            <div className={styles.deskPaneEmptyIcon}>⊡</div>
            selecione uma sessão<br/>na linha da semana
          </div>}
        </div>

        {/* Registration pane */}
        {deskRegBl&&<DeskRegPane
          regBl={deskRegBl}
          step={deskRegStep}
          scale={deskRegScale} rpe={deskRegRpe}
          perfTime={deskRegPerfTime} perfRounds={deskRegPerfRounds} perfReps={deskRegPerfReps}
          athName={selAthObj?.name||''}
          onScale={setDeskRegScale} onRpe={setDeskRegRpe}
          onPerfTime={setDeskRegPerfTime} onPerfRounds={setDeskRegPerfRounds} onPerfReps={setDeskRegPerfReps}
          onConfirm={()=>setDeskRegStep('confirm')}
          onSubmit={submitDeskReg}
          onBack={()=>setDeskRegStep('form')}
          onClose={deskCloseReg}
          submitting={deskRegSubmitting}
          error={deskRegError}
        />}

      </div>
    </div>}

    </main>
    </div></div>
    <Nav active="schedule" lockedId={lockedId} gymName={gymName} box={box}/>

    {checkinId&&<CheckinSheet
      checkinExec={checkinExec} checkinDone={checkinDone}
      checkinMode={checkinMode} onCheckinMode={setCheckinMode}
      checkinSearch={checkinSearch} onCheckinSearch={setCheckinSearch}
      athletes={athletes}
      checkinAthId={checkinAthId} onCheckinAthId={setCheckinAthId}
      checkinAnonName={checkinAnonName} onCheckinAnonName={setCheckinAnonName}
      checkinSubmitting={checkinSubmitting}
      onSubmit={submitCheckin}
      onClose={()=>setCheckinId('')}
    />}
  </>)
}
