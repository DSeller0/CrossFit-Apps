import { useState, useEffect, useRef } from 'react'
import Nav from '../Nav.jsx'
import { sb } from '../supabaseClient.js'
import { registerSW } from '../registerSW.js'
import styles from './Schedule.module.css'
import { MONTH_PT, DAY_PT, toISO, getWeek, dateToWeekOffset } from '../lib/week.js'
import { uid, blkLabel, exVolStr, isWodBlock, blkColor } from '../lib/wod.js'

const WOD_LOG_TYPES = ['WOD','For Time','AMRAP','EMOM','MetCon','HIIT','Benchmark']
const LOG_SCALES    = ['RX','Inter','SC','Adaptado']

// ── Pure helpers ──────────────────────────────────────────────────────────────
function isRoundBlock(bl) { return !isWodBlock(bl)&&Number(bl.rounds)>0 }
function fmtIntensity(ins) {
  if(!ins?.mode)return null
  if(ins.mode==='progression'){
    const steps=ins.steps||[],loads=steps.map(s=>s.load).filter(Boolean)
    const unit=(steps[0]?.unit||'% RM').replace('% do RM','% RM')
    return loads.length?loads.join('/')+' '+unit:null
  }
  if(ins.mode==='pct')return ins.pct?ins.pct+'% RM':null
  if(ins.mode==='gender'){
    const p=[];['Masculino','Feminino'].forEach(g=>{
      const unit=ins[`${g}_unit`]||'kg'
      const vals=['RX','Inter','SC'].map(k=>ins[`${g}_${k}`]).filter(Boolean)
      if(vals.length)p.push(`${g==='Masculino'?'M':'F'}: ${vals.join('/')} ${unit}`)
    });return p.join(' | ')||null
  }
  return null
}
function parseDurMins(d) {
  if(!d)return 0;const p=String(d).trim()
  if(p.includes(':')){const[m,s]=p.split(':').map(n=>parseInt(n)||0);return m+s/60}
  return parseInt(p)||0
}
function stationsCapMins(bl) {
  const sts=bl.stations||[],cycM=sts.reduce((t,s)=>t+parseDurMins(s.duration),0)
  const last=sts[sts.length-1],lastRest=last?.isRest?parseDurMins(last.duration):0
  const rep=bl.stationRepeat||1,betM=parseDurMins(bl.restBetweenCycles)
  const tot=cycM*rep+Math.max(0,rep-1)*betM-lastRest
  return tot>0?Math.round(tot):0
}
function extractYtId(url) {
  if(!url)return null
  const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return m?m[1]:null
}
function prBest(pr) {
  if(!pr?.results?.length)return null
  return pr.results.reduce((b,r)=>Number(r.value)>Number(b.value)?r:b)
}
function buildDemoMap(registry) {
  const map={}
  if(!registry||typeof registry!=='object')return map
  Object.values(registry).forEach(arr=>{
    (Array.isArray(arr)?arr:[]).forEach(ex=>{
      if(typeof ex==='object'&&ex.name){const k=ex.name.toLowerCase();if(!map[k])map[k]=ex}
    })
  });return map
}
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
function toTitleCase(s) {
  return (s||'').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())
}
function fmtDeskPerf(blk) {
  if(!blk)return null
  if(blk.perfTime)return blk.perfTime
  const p=[]
  if(blk.perfRounds)p.push(`${blk.perfRounds} Rds`)
  if(blk.perfReps)p.push(`${blk.perfReps} Reps`)
  return p.join(' + ')||null
}

// ── Round Counter ─────────────────────────────────────────────────────────────
function RdCounter({blId,exId,total,cur,onAdvance,onReset}) {
  const pressRef=useRef(null),didLongRef=useRef(false),touchHandledRef=useRef(false)
  const isDone=cur>=total,isActive=cur>0&&!isDone
  function onTouchStart(){
    didLongRef.current=false;touchHandledRef.current=false
    pressRef.current=setTimeout(()=>{didLongRef.current=true;touchHandledRef.current=true;onReset()},600)
  }
  function onTouchEnd(e){
    e.preventDefault();clearTimeout(pressRef.current)
    if(!didLongRef.current){touchHandledRef.current=true;onAdvance()}
  }
  function onClick(e){
    e.stopPropagation()
    if(touchHandledRef.current){touchHandledRef.current=false;return}
    onAdvance()
  }
  function onContextMenu(e){e.preventDefault();e.stopPropagation();onReset()}
  const cls=isDone?styles.bCounterDone:isActive?styles.bCounterActive:styles.bCounterIdle
  return(
    <div className={`${styles.bCounter} ${cls}`}
      onClick={onClick} onContextMenu={onContextMenu}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      onTouchMove={()=>clearTimeout(pressRef.current)}>
      {isDone?<i className="ti ti-check" style={{fontSize:9}}/>
        :isActive?String(cur)
        :<i className="ti ti-minus" style={{fontSize:8,opacity:.4}}/>}
    </div>
  )
}

// ── Demo Panel ────────────────────────────────────────────────────────────────
function DemoPanel({target,demoMap,onClose}) {
  const iframeRef=useRef(null)
  const isOpen=!!target
  function handleClose(){if(iframeRef.current)iframeRef.current.src='';onClose()}
  if(!target)return(
    <div className={`${styles.demoOverlay}`} onClick={handleClose}/>
  )
  const multi=target.length>1,title=multi?'Demo':target[0].name
  return(<>
    <div className={`${styles.demoOverlay}${isOpen?' '+styles.demoOverlayOpen:''}`} onClick={handleClose}/>
    <div className={`${styles.demoPanel}${isOpen?' '+styles.demoPanelOpen:''}`}>
      <div className={styles.demoHdr}>
        <span className={styles.demoTitle}>{title}</span>
        <button className={styles.demoClose} onClick={handleClose}><i className="ti ti-x"/></button>
      </div>
      <div className={styles.demoBody}>
        {target.map((mv,i)=>{
          const data=demoMap[(mv.name||'').toLowerCase()]||{}
          const videoId=extractYtId(data.videoUrl||'')
          const hasVideo=!!videoId&&data.videoPublished===true
          const desc=data.description||'',muscles=data.muscles||'',notes=data.notes||''
          const hasAny=hasVideo||desc||muscles||notes
          return(<div key={i}>
            {multi&&<div className={styles.demoSectionName}>{mv.name}</div>}
            {hasVideo&&<div className={styles.demoVideoWrap}>
              <iframe ref={i===0?iframeRef:null}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
                allowFullScreen loading="lazy"/>
            </div>}
            {desc&&<div className={styles.demoDesc}>{desc}</div>}
            {muscles&&<div className={styles.demoDesc}>
              <span style={{fontSize:9,fontWeight:900,color:'#4ac8c0',textTransform:'uppercase',letterSpacing:'.07em',display:'block',marginBottom:3}}>Músculos</span>
              {muscles}
            </div>}
            {notes&&<div className={styles.demoDesc} style={{color:'#806850',fontSize:12,marginTop:4}}>{notes}</div>}
            {!hasAny&&<div className={styles.demoNoContent}>Sem conteúdo de demo disponível.</div>}
          </div>)
        })}
      </div>
    </div>
  </>)
}

// ── Log Pane (mobile) ─────────────────────────────────────────────────────────
function LogPane({pane,athId,onAthId,blocks,onBlocks,submitting,success,error,onSubmit,onClose,lockedAthName}) {
  const isOpen=!!pane
  function setRpe(i,n){onBlocks(prev=>prev.map((b,j)=>j===i?{...b,rpe:n}:b))}
  function setScale(i,s){onBlocks(prev=>prev.map((b,j)=>j===i?{...b,scale:s}:b))}
  function setField(i,f,v){onBlocks(prev=>prev.map((b,j)=>j===i?{...b,[f]:v}:b))}
  const dateStr=pane?new Date(pane.dateKey+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}):''
  return(<>
    <div className={`${styles.lpOverlay}${isOpen?' '+styles.lpOverlayOpen:''}`} onClick={onClose}/>
    <div className={`${styles.logPane}${isOpen?' '+styles.logPaneOpen:''}`}>
      {!pane?null:success?(
        <div>
          <div className={styles.lpHeader}>
            <div className={styles.lpTitle}>Resultado registrado</div>
            <button className={styles.lpClose} onClick={onClose}><i className="ti ti-x"/></button>
          </div>
          <div className={styles.lpSuccess}>
            <i className={`ti ti-circle-check ${styles.lpSuccessIcon}`}/>
            <div style={{fontSize:18,fontWeight:900,color:'#f0e8d0'}}>Resultado registrado!</div>
            <div style={{fontSize:13,color:'#888'}}>Salvo com sucesso.</div>
            <a href="./leaderboard.html" className={styles.lbLink} style={{marginTop:8}}><i className="ti ti-trophy"/> Ver leaderboard</a>
          </div>
        </div>
      ):(
        <div>
          <div className={styles.lpHeader}>
            <div className={styles.lpTitle}><i className="ti ti-pencil"/> Registrar Resultado</div>
            <button className={styles.lpClose} onClick={onClose}><i className="ti ti-x"/></button>
          </div>
          <div className={styles.lpBody}>
            <div style={{fontSize:12,color:'#888'}}>{dateStr}{pane.sess.sessionName?` · ${pane.sess.sessionName}`:''}</div>
            <div className={styles.lpSection}>
              <div className={styles.lpSectionTitle}>Atleta</div>
              {lockedAthName
                ?<div style={{padding:'4px 0',color:'var(--cream)',fontWeight:700,fontSize:14}}>{lockedAthName}</div>
                :<select className={styles.lpSelect} value={athId} onChange={e=>onAthId(e.target.value)}>
                  <option value="">— Selecione —</option>
                  {pane.assignedAth.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>}
            </div>
            {blocks.length>0&&<div className={styles.lpSection}>
              <div className={styles.lpSectionTitle}>Resultados</div>
              {blocks.map((bl,i)=>(
                <div key={bl.blockId} className={styles.lpBlock}>
                  <div className={styles.lpBlockTitle}>{bl.blockLabel}</div>
                  <span className={styles.lpLbl}>RPE (1–10)</span>
                  <div className={styles.lpRpeRow}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                      <button key={n} type="button" className={`${styles.lpRpeBtn}${bl.rpe===n?' '+styles.lpRpeBtnOn:''}`} onClick={()=>setRpe(i,n)}>{n}</button>
                    ))}
                  </div>
                  <span className={styles.lpLbl}>Escala</span>
                  <div className={styles.lpScaleRow}>
                    {LOG_SCALES.map(s=>(
                      <button key={s} type="button" className={`${styles.lpScaleBtn}${bl.scale===s?' '+styles.lpScaleBtnOn:''}`} onClick={()=>setScale(i,s)}>{s}</button>
                    ))}
                  </div>
                  {(bl.blockType==='For Time'||bl.blockType==='Benchmark')
                    ?<><span className={styles.lpLbl}>Tempo (MM:SS)</span>
                       <input className={styles.lpInput} type="text" placeholder="ex: 12:34" inputMode="numeric" value={bl.perfTime||''} onChange={e=>setField(i,'perfTime',e.target.value)}/></>
                    :<div className={styles.lpRow2}>
                       <div><span className={styles.lpLbl}>Rounds</span><input className={styles.lpInput} type="number" placeholder="0" min="0" inputMode="numeric" value={bl.perfRounds||''} onChange={e=>setField(i,'perfRounds',e.target.value)}/></div>
                       <div><span className={styles.lpLbl}>Reps</span><input className={styles.lpInput} type="number" placeholder="0" min="0" inputMode="numeric" value={bl.perfReps||''} onChange={e=>setField(i,'perfReps',e.target.value)}/></div>
                     </div>}
                </div>
              ))}
            </div>}
            <button className={styles.lpSubmit} disabled={submitting||undefined} onClick={onSubmit}>
              {submitting?<><i className="ti ti-loader-2"/> Enviando...</>:<><i className="ti ti-check"/> Registrar</>}
            </button>
            {error&&<div className={styles.lpErr}>{error}</div>}
          </div>
        </div>
      )}
    </div>
  </>)
}

// ── Desktop Reg Pane ──────────────────────────────────────────────────────────
function DeskRegPane({regBl,step,scale,rpe,perfTime,perfRounds,perfReps,athName,
  onScale,onRpe,onPerfTime,onPerfRounds,onPerfReps,
  onConfirm,onSubmit,onBack,onClose,submitting,error}) {
  if(!regBl)return null
  const{bl}=regBl
  const isForTime=bl.type==='For Time'||bl.type==='Benchmark'
  const label=blkLabel(bl)
  const perfVal=fmtDeskPerf({perfTime,perfRounds,perfReps})
  return(
    <div className={styles.deskRegPane}>
      <div className={styles.deskRegPaneHdr}>
        <span className={styles.deskRegPaneLbl}>{step==='success'?'Registrado':athName||'Registro'}</span>
        <span className={styles.deskRegPaneWod}>{label}</span>
        <button className={styles.deskRegClose} onClick={onClose}>×</button>
      </div>
      <div className={styles.deskRegScroll}>
        {step==='form'&&<>
          <div className={styles.deskRegSec}>
            <span className={styles.deskRegLbl}>Escala</span>
            <div className={styles.deskRegScaleRow}>
              {LOG_SCALES.map(s=>(
                <button key={s} className={`${styles.deskRegScaleBtn}${scale===s?' '+styles.deskRegScaleBtnOn:''}`}
                  onClick={()=>onScale(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className={styles.deskRegSec}>
            <span className={styles.deskRegLbl}>RPE (1–10)</span>
            <div className={styles.deskRegRpeRow}>
              {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                <button key={n} className={`${styles.deskRegRpeBtn}${rpe===n?' '+styles.deskRegRpeBtnOn:''}`}
                  onClick={()=>onRpe(n)}>{n}</button>
              ))}
            </div>
          </div>
          {isForTime?(
            <div className={styles.deskRegSec}>
              <span className={styles.deskRegLbl}>Tempo (MM:SS)</span>
              <input className={styles.deskRegInput} type="text" placeholder="ex: 12:34"
                value={perfTime} onChange={e=>onPerfTime(e.target.value)} inputMode="numeric"/>
            </div>
          ):(
            <div className={styles.deskRegSec}>
              <span className={styles.deskRegLbl}>Resultado</span>
              <div style={{display:'flex',gap:6}}>
                <div style={{flex:1}}>
                  <span className={styles.deskRegLbl}>Rounds</span>
                  <input className={styles.deskRegInput} type="number" placeholder="0" min="0" inputMode="numeric"
                    value={perfRounds} onChange={e=>onPerfRounds(e.target.value)}/>
                </div>
                <div style={{flex:1}}>
                  <span className={styles.deskRegLbl}>Reps</span>
                  <input className={styles.deskRegInput} type="number" placeholder="0" min="0" inputMode="numeric"
                    value={perfReps} onChange={e=>onPerfReps(e.target.value)}/>
                </div>
              </div>
              {bl.type==='AMRAP'&&<div className={styles.deskRegHint}>Rounds completos + reps extras</div>}
            </div>
          )}
          <button className={styles.deskRegSubmitBtn} onClick={onConfirm}>Confirmar →</button>
          {error&&<div className={styles.deskRegErr}>{error}</div>}
        </>}

        {step==='confirm'&&<>
          <div className={styles.deskConfirmBox}>
            <div className={styles.deskConfirmTitle}>Revisar registro</div>
            <div className={styles.deskConfirmRow}><span className={styles.deskConfirmRowLbl}>Bloco</span><span className={styles.deskConfirmRowVal}>{label}</span></div>
            <div className={styles.deskConfirmRow}><span className={styles.deskConfirmRowLbl}>Escala</span><span className={styles.deskConfirmRowVal}>{scale}</span></div>
            {perfVal&&<div className={styles.deskConfirmRow}><span className={styles.deskConfirmRowLbl}>Resultado</span><span className={styles.deskConfirmRowVal}>{perfVal}</span></div>}
            {rpe&&<div className={styles.deskConfirmRow}><span className={styles.deskConfirmRowLbl}>RPE</span><span className={styles.deskConfirmRowVal}>{rpe} / 10</span></div>}
          </div>
          <div className={styles.deskConfirmBtns}>
            <button className={styles.deskCancelBtn} onClick={onBack}>← Editar</button>
            <button className={styles.deskConfirmBtn} disabled={submitting||undefined} onClick={onSubmit}>
              {submitting?'Enviando...':'Registrar ✓'}
            </button>
          </div>
          {error&&<div className={styles.deskRegErr}>{error}</div>}
        </>}

        {step==='success'&&(
          <div className={styles.deskSuccessBox}>
            <div className={styles.deskSuccessIcon}>✓</div>
            <div className={styles.deskSuccessTitle}>Resultado registrado</div>
            <div className={styles.deskSuccessSub}>{athName&&`${athName} · `}{label}</div>
            <div className={styles.deskSuccessDetail}>
              <div className={styles.deskSuccessRow}><span className={styles.deskSuccessRowLbl}>Escala</span><span className={styles.deskSuccessRowVal}>{scale}</span></div>
              {perfVal&&<div className={styles.deskSuccessRow}><span className={styles.deskSuccessRowLbl}>Resultado</span><span className={styles.deskSuccessRowVal}>{perfVal}</span></div>}
              {rpe&&<div className={styles.deskSuccessRow}><span className={styles.deskSuccessRowLbl}>RPE</span><span className={styles.deskSuccessRowVal}>{rpe} / 10</span></div>}
            </div>
            <button className={styles.deskDismissBtn} onClick={onClose}>Fechar ×</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Session Detail ────────────────────────────────────────────────────────────
function ExRow({ex,bl,isWod,isRd,checked,roundState,rmValues,rmEditKey,demoMap,onCheck,onAdvance,onReset,onRmToggle,onRmConfirm,onDemo,accent}) {
  const key=`${bl.id}|${ex.id}`,done=checked.has(key)
  const isProg=!ex.isComplex&&ex.intensity?.mode==='progression'
  const vol=exVolStr(ex),ins=fmtIntensity(ex.intensity)
  const exData=demoMap[(ex.name||'').toLowerCase()]||{}
  const hasDemo=!!(exData.videoUrl||exData.description||exData.muscles)

  const rmInputRef=useRef(null)
  const unitSelRef=useRef(null)
  useEffect(()=>{if(rmEditKey===ex.id&&rmInputRef.current){rmInputRef.current.focus();if(rmInputRef.current.value)rmInputRef.current.select()}},[rmEditKey])

  function confirmRm(e){
    e?.preventDefault();e?.stopPropagation()
    const num=parseFloat(rmInputRef.current?.value)
    if(num>0)onRmConfirm(ex.id,num,unitSelRef.current?.value||'kg')
    else onRmToggle(ex.id)
  }

  if(ex.isComplex){
    const mvs=(ex.complexMovements||[]).filter(m=>m.name)
    const notation=(ex.complexMovements||[]).map(m=>m.reps||'?').join('+')
    const displayName=ex.name||mvs.map(m=>m.name).join(' + ')||'Complexo'
    const sets=ex.sets||''
    const volStr=[sets,notation?`(${notation})`:''].filter(Boolean).join('×')
    const cxIsProg=ex.intensity?.mode==='progression'
    const exRm=rmValues[ex.id]
    let loadStr='',calcStr=''
    if(cxIsProg){
      const steps=ex.intensity?.steps||[],unit=(steps[0]?.unit||'% RM').replace('% do RM','% RM')
      const loads=steps.map(s=>s.load).filter(Boolean)
      if(loads.length)loadStr=loads.join(' / ')+' '+unit
      const pctNums=loads.map(l=>parseFloat(l)).filter(n=>!isNaN(n))
      if(exRm?.rm&&pctNums.length)calcStr=pctNums.map(p=>Math.ceil(exRm.rm*p/100)).join('/')+' '+(exRm.unit||'kg')
    }else if(ins){loadStr=ins}
    const hasDemoCx=mvs.some(m=>{const d=demoMap[(m.name||'').toLowerCase()]||{};return!!(d.videoUrl||d.description||d.muscles)})
    const mvNames=mvs.map(m=>m.name)
    return(
      <div className={styles.detailEx} onClick={e=>e.stopPropagation()}>
        {!isWod&&(isRd
          ?<RdCounter blId={bl.id} exId={ex.id} total={Number(bl.rounds)} cur={roundState[`${bl.id}|${ex.id}`]||0} onAdvance={()=>onAdvance(bl.id,ex.id,Number(bl.rounds))} onReset={()=>onReset(bl.id,ex.id)}/>
          :<div className={`${styles.detailExCheck}${done?' '+styles.detailExCheckDone:''}`} onClick={()=>onCheck(bl.id,ex.id)}/>)}
        <div className={styles.detailExBody}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6}}>
            <div className={`${styles.detailExName}${!isWod&&done?' '+styles.detailExNameDone:''}`}>{toTitleCase(displayName)}</div>
            <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
              {volStr&&<span className={styles.pillVol}>{volStr}</span>}
              {cxIsProg&&<button className={`${styles.rmChip}${exRm?' '+styles.rmChipHasRm:''}`} onClick={e=>{e.stopPropagation();onRmToggle(ex.id)}}>{exRm?exRm.rm+' '+(exRm.unit||'kg'):'RM'}</button>}
              <button className={`${styles.demoBtn}${hasDemoCx?'':' '+styles.demoBtnNoDemo}`} onClick={e=>{e.stopPropagation();onDemo(mvNames.map(n=>({name:n})))}} disabled={!hasDemoCx}>Demo</button>
            </div>
          </div>
          {mvs.map((m,mi)=><div key={mi} className={styles.detailExMovement}>· {[m.reps?m.reps+'×':'',toTitleCase(m.name)].filter(Boolean).join(' ')}</div>)}
          {cxIsProg&&rmEditKey===ex.id&&<div className={styles.rmInputWrap} onClick={e=>e.stopPropagation()}>
            <input ref={rmInputRef} type="number" className={styles.rmInput} placeholder="100" min="1" step="1" inputMode="numeric" defaultValue={exRm?.rm||''} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();confirmRm()}}}/>
            <select ref={unitSelRef} className={styles.rmUnitSel} defaultValue={exRm?.unit||'kg'} onClick={e=>e.stopPropagation()}>
              <option value="kg">kg</option><option value="lbs">lbs</option>
            </select>
            <button className={styles.rmConfirmBtn} onClick={confirmRm}>✓</button>
          </div>}
          {(loadStr||calcStr)&&<div className={styles.rmVolRow}>
            {loadStr&&<span className={loadStr.includes('%')?styles.pillVol:styles.pillWt}>{loadStr}</span>}
            {calcStr&&<span className={exRm?.source==='auto'?styles.pillVol:styles.pillWt}>{calcStr}</span>}
          </div>}
          {ex.note&&<div className={styles.detailExNote}>{ex.note}</div>}
        </div>
      </div>
    )
  }

  if(isProg){
    const steps=ex.intensity?.steps||[],groups=[]
    steps.forEach(s=>{const reps=s.reps||ex.reps||'';const g=groups.find(g=>g.reps===reps);if(g){if(s.load)g.loads.push(s.load)}else groups.push({reps,loads:s.load?[s.load]:[]})})
    const exRm=rmValues[ex.id]
    return(<>{groups.map((g,gi)=>{
      const repsPrefix=ex.sets&&g.reps?`${g.sets||ex.sets}×${g.reps}`:g.reps
      const pctNums=g.loads.map(l=>parseFloat(l)).filter(n=>!isNaN(n))
      const pctStr=pctNums.length?pctNums.join('/')+'% RM':''
      const calcStr=exRm?.rm&&pctNums.length?pctNums.map(p=>Math.ceil(exRm.rm*p/100)).join('/')+' '+(exRm.unit||'kg'):''
      const lineKey=`${bl.id}|${ex.id}-${gi}`,lineDone=checked.has(lineKey)
      const hasDemoPg=gi===0&&!!(exData.videoUrl||exData.description||exData.muscles)
      return(
        <div key={gi} className={styles.detailEx} onClick={e=>e.stopPropagation()}>
          {!isWod&&(isRd
            ?<RdCounter blId={bl.id} exId={`${ex.id}-${gi}`} total={Number(bl.rounds)} cur={roundState[`${bl.id}|${ex.id}-${gi}`]||0} onAdvance={()=>onAdvance(bl.id,`${ex.id}-${gi}`,Number(bl.rounds))} onReset={()=>onReset(bl.id,`${ex.id}-${gi}`)}/>
            :<div className={`${styles.detailExCheck}${lineDone?' '+styles.detailExCheckDone:''}`} onClick={()=>onCheck(bl.id,`${ex.id}-${gi}`)}/>)}
          <div className={styles.detailExBody}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6}}>
              <div className={`${styles.detailExName}${!isWod&&lineDone?' '+styles.detailExNameDone:''}`}>{toTitleCase(ex.name)}</div>
              <div style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
                {repsPrefix&&<span className={styles.pillVol}>{repsPrefix}</span>}
                {gi===0&&<button className={`${styles.rmChip}${exRm?' '+styles.rmChipHasRm:''}`} onClick={e=>{e.stopPropagation();onRmToggle(ex.id)}}>{exRm?exRm.rm+' '+(exRm.unit||'kg'):'RM'}</button>}
                {gi===0&&<button className={`${styles.demoBtn}${hasDemoPg?'':' '+styles.demoBtnNoDemo}`} onClick={e=>{e.stopPropagation();onDemo([{name:ex.name}])}} disabled={!hasDemoPg}>Demo</button>}
              </div>
            </div>
            {gi===0&&rmEditKey===ex.id&&<div className={styles.rmInputWrap} onClick={e=>e.stopPropagation()}>
              <input ref={rmInputRef} type="number" className={styles.rmInput} placeholder="100" min="1" step="1" inputMode="numeric" defaultValue={exRm?.rm||''} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();confirmRm()}}}/>
              <select ref={unitSelRef} className={styles.rmUnitSel} defaultValue={exRm?.unit||'kg'} onClick={e=>e.stopPropagation()}>
                <option value="kg">kg</option><option value="lbs">lbs</option>
              </select>
              <button className={styles.rmConfirmBtn} onClick={confirmRm}>✓</button>
            </div>}
            {(pctStr||calcStr)&&<div className={styles.rmVolRow}>
              {pctStr&&<span className={styles.pillVol}>{pctStr}</span>}
              {calcStr&&<span className={exRm?.source==='auto'?styles.pillVol:styles.pillWt}>{calcStr}</span>}
            </div>}
            {gi===0&&ex.note&&<div className={styles.detailExNote}>{ex.note}</div>}
          </div>
        </div>
      )
    })}</>)
  }

  return(
    <div className={styles.detailEx} onClick={e=>e.stopPropagation()}>
      {!isWod&&(isRd
        ?<RdCounter blId={bl.id} exId={ex.id} total={Number(bl.rounds)} cur={roundState[`${bl.id}|${ex.id}`]||0} onAdvance={()=>onAdvance(bl.id,ex.id,Number(bl.rounds))} onReset={()=>onReset(bl.id,ex.id)}/>
        :<div className={`${styles.detailExCheck}${done?' '+styles.detailExCheckDone:''}`} onClick={()=>onCheck(bl.id,ex.id)}/>)}
      <div className={styles.detailExBody}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6}}>
          <div className={`${styles.detailExName}${!isWod&&done?' '+styles.detailExNameDone:''}`}>{toTitleCase(ex.name)}</div>
          <div style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
            {vol&&<span className={styles.pillVol}>{vol}</span>}
            {ins&&<span className={ins.includes('%')?styles.pillVol:styles.pillWt}>{ins}</span>}
            <button className={`${styles.demoBtn}${hasDemo?'':' '+styles.demoBtnNoDemo}`} onClick={e=>{e.stopPropagation();onDemo([{name:ex.name}])}} disabled={!hasDemo}>Demo</button>
          </div>
        </div>
        {ex.note&&<div className={styles.detailExNote}>{ex.note}</div>}
      </div>
    </div>
  )
}

function BlockDetail({bl,sess,dateKey,accent,checked,roundState,rmValues,rmEditKey,demoMap,isWodLogged,onCheck,onAdvance,onReset,onRmToggle,onRmConfirm,onDemo,onTimer,onLogBlock=null,athResult=null,athName=''}) {
  const label=blkLabel(bl),col=blkColor(bl)
  const isWod=isWodBlock(bl),isRd=isRoundBlock(bl)
  const wodDone=isWodLogged(bl)

  const sharedExProps={bl,checked,roundState,rmValues,rmEditKey,demoMap,isWod,isRd,onCheck,onAdvance,onReset,onRmToggle,onRmConfirm,onDemo,accent}

  const perfStr=fmtDeskPerf(athResult)

  const athSection=onLogBlock&&isWod&&(
    <>
      <div className={`${styles.deskAthResultRow} ${athResult?styles.deskAthResultRowLogged:styles.deskAthResultRowEmpty}`}>
        <span className={`${styles.deskAthResultName} ${athResult?styles.deskAthResultNameLogged:styles.deskAthResultNameEmpty}`}>
          {athName||'Atleta'}
        </span>
        {athResult?<>
          {perfStr&&<span className={styles.deskAthResultVal}>{perfStr}</span>}
          <span className={styles.deskAthResultScale}>{athResult.scale}{athResult.rpe?` · RPE ${athResult.rpe}`:''}</span>
        </>:<span className={styles.deskAthResultEmpty}>sem resultado</span>}
      </div>
      <button className={`${styles.deskRegBtn}${athResult?' '+styles.deskRegBtnEdit:''}`}
        onClick={e=>{e.stopPropagation();onLogBlock()}}>
        {athResult?'Editar resultado':'Registrar resultado →'}
      </button>
    </>
  )

  if(bl.type==='Estações'){
    const stations=bl.stations||[],cycleCount=bl.stationRepeat||bl.rounds||1
    const repeat=cycleCount>1?`×${cycleCount}`:''
    const capMins=stationsCapMins(bl)
    const stationHasEx=stations.some(st=>!st.isRest&&(st.exercises||[]).some(e=>e.name||e.isComplex))
    return(
      <div className={styles.detailBlock} style={{borderLeftColor:col}}>
        <div className={styles.detailBlockHdr}>
          <span className={styles.detailBlockTitle} style={{color:col}}>{label}</span>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <button className={styles.timerBtn} onClick={e=>{e.stopPropagation();onTimer(bl)}}><i className="ti ti-player-play"/> Timer</button>
            {repeat&&<span className={styles.detailBlockMeta} style={{background:col,color:'#fff'}}>{repeat}</span>}
            {capMins>0&&<span className={styles.detailBlockMeta} style={{background:'#1e1e1e',color:'#aaa',border:'1px solid #333'}}>Cap {capMins}'</span>}
            {wodDone&&<span className={styles.detailBlockDone}>✓ Completo</span>}
          </div>
        </div>
        {stations.map((st,si)=>st.isRest
          ?<div key={si} className={styles.detailStationRest}>{st.name||'Descanso'}{st.duration?` — ${st.duration}`:''}</div>
          :<div key={si} className={styles.detailStation}>
             <div className={styles.detailStationHdr}>
               <span className={styles.detailStationName}>{st.name||'Grupo'}</span>
               {st.duration&&<span className={styles.detailStationDur}>{st.duration}</span>}
             </div>
             {(st.exercises||[]).filter(e=>e.name||e.isComplex).map((ex,ei)=><ExRow key={ei} ex={ex} {...sharedExProps}/>)}
           </div>
        )}
        {!stationHasEx&&(bl.exercises||[]).filter(e=>e.name||e.isComplex).map((ex,ei)=><ExRow key={ei} ex={ex} {...sharedExProps}/>)}
        {bl.restBetweenCycles&&<div className={styles.detailBlockNotes}>Descanso entre ciclos: {bl.restBetweenCycles}</div>}
        {bl.notes&&<div className={styles.detailBlockNotes}>{bl.notes}</div>}
        {athSection}
      </div>
    )
  }

  const exs=(bl.exercises||[]).filter(e=>e.name||e.isComplex)
  const meta=[bl.rounds&&`${bl.rounds} RDS`,bl.duration&&`CAP ${bl.duration}'`].filter(Boolean).join(' · ')

  let rdBadgeEl=null
  if(isRd){
    const keys=[]
    exs.forEach(ex=>{
      if(!ex.isComplex&&ex.intensity?.mode==='progression'){
        const steps=ex.intensity?.steps||[],groups=[]
        steps.forEach(s=>{const r=s.reps||ex.reps||'';if(!groups.find(g=>g===r))groups.push(r)})
        if(!groups.length)groups.push('');groups.forEach((_,gi)=>keys.push(`${ex.id}-${gi}`))
      }else{keys.push(ex.id)}
    })
    const dones=keys.map(k=>roundState[`${bl.id}|${k}`]||0)
    const allDone=dones.length>0&&dones.every(d=>d>=Number(bl.rounds))
    const minDone=dones.length?Math.min(...dones):0
    if(allDone)rdBadgeEl=<span className={`${styles.rdProg} ${styles.rdProgComplete}`}>✓</span>
    else if(minDone>0)rdBadgeEl=<span className={`${styles.rdProg} ${styles.rdProgPartial}`}>RD {minDone} / {bl.rounds}</span>
    else rdBadgeEl=<span className={`${styles.rdProg} ${styles.rdProgIdle}`}>{bl.rounds} RDS</span>
  }

  return(
    <div className={styles.detailBlock} style={{borderLeftColor:col}}>
      <div className={styles.detailBlockHdr}>
        <span className={styles.detailBlockTitle} style={{color:col}}>{label}</span>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {isWod&&<button className={styles.timerBtn} onClick={e=>{e.stopPropagation();onTimer(bl)}}><i className="ti ti-player-play"/> Timer</button>}
          {isRd?rdBadgeEl:(meta?<span className={styles.detailBlockMeta} style={{background:col,color:'#fff'}}>{meta}</span>:null)}
          {!isRd&&wodDone&&<span className={styles.detailBlockDone}>✓ Completo</span>}
        </div>
      </div>
      {exs.map((ex,ei)=><ExRow key={ei} ex={ex} {...sharedExProps}/>)}
      {bl.notes&&<div className={styles.detailBlockNotes}>{bl.notes}</div>}
      {isWod&&<a className={styles.lbLink} href={`leaderboard.html?wod=${bl.id}&session=${sess.id}&date=${dateKey}`} target="_blank" onClick={e=>e.stopPropagation()}>
        <i className="ti ti-trophy"/> Ver Leaderboard
      </a>}
      {athSection}
    </div>
  )
}

function SessionDetail({sess,dateKey,accent,checked,roundState,rmValues,rmEditKey,demoMap,isWodLogged,onCheck,onAdvance,onReset,onRmToggle,onRmConfirm,onDemo,onTimer,onLog}) {
  return(
    <div className={styles.dayDetail} onClick={e=>e.stopPropagation()}>
      {sess.sessionName&&<div className={styles.detailSessTitle}>{sess.sessionName}</div>}
      {(sess.blocks||[]).map(bl=>(
        <BlockDetail key={bl.id} bl={bl} sess={sess} dateKey={dateKey} accent={accent}
          checked={checked} roundState={roundState} rmValues={rmValues} rmEditKey={rmEditKey}
          demoMap={demoMap} isWodLogged={isWodLogged}
          onCheck={onCheck} onAdvance={onAdvance} onReset={onReset}
          onRmToggle={onRmToggle} onRmConfirm={onRmConfirm} onDemo={onDemo} onTimer={onTimer}/>
      ))}
      <button className={styles.logBtn} onClick={e=>{e.stopPropagation();onLog()}}>
        <i className="ti ti-pencil"/> Registrar resultado
      </button>
    </div>
  )
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
  const [blockAccent,setBlockAccent]=useState('#68d8a0')
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
  const [logError,setLogError]=useState('')

  // Desktop state
  const [selSess,setSelSess]=useState(null) // {dateKey, sessId}
  const [deskAthSearch,setDeskAthSearch]=useState('')
  const [deskRegBl,setDeskRegBl]=useState(null) // {bl, sess, dateKey}
  const [deskRegStep,setDeskRegStep]=useState('form') // 'form'|'confirm'|'success'
  const [deskRegScale,setDeskRegScale]=useState('RX')
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

  const demoMapRef=useRef({})
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
      const todaySess=(sessions[t]||[]).filter(s=>s.public!==false&&s.blocks&&s.blocks.length)
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
      const cur=checkinExec?.athlete_ids||[]
      if(!cur.includes(checkinAthId)){
        await sb.from('class_executions').update({athlete_ids:[...cur,checkinAthId]}).eq('id',checkinId)
      }
    }else{
      const cur=checkinExec?.anon_names||[]
      await sb.from('class_executions').update({anon_names:[...cur,checkinAnonName.trim()]}).eq('id',checkinId)
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

      let accColor='#68d8a0',restLbl='Descanso',gName=stD.gymName||'Cone'
      if(cfgRes?.ok){
        try{
          let cfg=await cfgRes.json()
          if(cfg.colors&&typeof cfg.colors==='object')cfg={...cfg,...cfg.colors}
          if(cfg.scheduleTitle||cfg.appTitle)document.title=cfg.scheduleTitle||cfg.appTitle
          if(cfg.restDayLabel)restLbl=cfg.restDayLabel
          if(cfg.wkBlockType)accColor=cfg.wkBlockType
          if(cfg.gymName)gName=cfg.gymName
          const r=document.documentElement.style
          if(cfg.themeAccent)r.setProperty('--accent',cfg.themeAccent)
          if(cfg.themeAccentText)r.setProperty('--accent-text',cfg.themeAccentText)
          if(cfg.wkBg){r.setProperty('--bg',cfg.wkBg);r.setProperty('--bg2',cfg.wkBg)}
          if(cfg.wkDivider)r.setProperty('--border',cfg.wkDivider)
          if(cfg.wkHeader)r.setProperty('--accent',cfg.wkHeader)
          if(cfg.wkDateNum)r.setProperty('--sub',cfg.wkDateNum)
          if(cfg.wkExName)r.setProperty('--text',cfg.wkExName)
        }catch(e){}
      }

      demoMapRef.current=buildDemoMap(erD)
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
      setGymName(gName);setRestLabel(restLbl);setBlockAccent(accColor)
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

  function getTargets(s){
    if(!s?.mainTraining)return[]
    return Array.isArray(s.mainTraining)?s.mainTraining:[s.mainTraining]
  }

  function sessionsForDay(dateKey){
    const all=(sessions[dateKey]||[]).filter(s=>s.public!==false)
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
          const steps=ex.intensity?.steps||[],groups=[]
          steps.forEach(s=>{const r=s.reps||ex.reps||'';if(!groups.find(g=>g===r))groups.push(r)})
          if(!groups.length)groups.push('')
          if(groups.every((_,gi)=>getRd(bl.id,`${ex.id}-${gi}`)>=Number(bl.rounds)))done++
        }else{if(getRd(bl.id,ex.id)>=Number(bl.rounds))done++}
      })
      return{done,total:exs.length}
    }
    exs.forEach(ex=>{
      if(!ex.isComplex&&ex.intensity?.mode==='progression'){
        const steps=ex.intensity?.steps||[],groups=[]
        steps.forEach(s=>{const reps=s.reps||ex.reps||'';if(!groups.find(g=>g.reps===reps))groups.push({reps})})
        if(groups.length===0||groups.every((_,gi)=>checked.has(`${bl.id}|${ex.id}-${gi}`)))done++
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
    const config={blockType:bl.type||bl.label,blockLabel:(bl.label&&bl.label!==bl.type&&bl.label!=='-')?bl.label:(bl.label||bl.type||'WOD'),timeCap:bl.duration?parseInt(bl.duration):null,rounds:bl.rounds||bl.stationRepeat||null,exercises,sessionId:sess.id,sessionDate:dateKey,athleteId:ath?.id||null,blockId:bl.id,stationTime,transitionTime}
    try{localStorage.setItem('timer_config',JSON.stringify(config));localStorage.removeItem('timer_state')}catch(e){}
    location.href='timer.html?src=sched'
  }

  function doOpenLog(sess,dateKey,aths,athId,prefill=null){
    const targets=Array.isArray(sess.mainTraining)?sess.mainTraining:(sess.mainTraining?[sess.mainTraining]:[])
    const assignedAth=(aths||athletes).filter(a=>targets.includes(a.name))
    const wodBls=(sess.blocks||[]).filter(b=>WOD_LOG_TYPES.includes(b.type)||WOD_LOG_TYPES.includes(b.label))
    const blocks=wodBls.map(b=>({blockId:b.id,blockType:b.type,blockLabel:b.label&&b.type&&b.label!==b.type?`${b.label} · ${b.type}`:b.label||b.type,rpe:7,scale:'RX',perfTime:'',perfRounds:'',perfReps:''}))
    if(prefill?.blockId){const bi=blocks.findIndex(b=>b.blockId===prefill.blockId);if(bi>=0){if(prefill.perfTime)blocks[bi].perfTime=prefill.perfTime;if(prefill.perfRounds)blocks[bi].perfRounds=prefill.perfRounds}}
    const resolvedAthId=prefill?.athId||athId||''
    setLogPane({sess,dateKey,assignedAth})
    setLogAthId(resolvedAthId);setLogBlocks(blocks)
    setLogSubmitting(false);setLogSuccess(false);setLogError('')
  }

  async function submitLog(){
    if(!logAthId){setLogError('Selecione seu nome antes de enviar.');return}
    setLogSubmitting(true);setLogError('')
    const{dateKey,sess}=logPane
    const result={id:uid(),date:dateKey,athleteId:logAthId,sessionId:sess.id,presence:'Presente',energyLevel:3,blocks:logBlocks,coachNote:'',flagForReview:false,loggedByAthlete:true}
    const existing=Array.isArray(results)?results:[]
    const next=[...existing.filter(r=>!(r.athleteId===logAthId&&r.sessionId===sess.id)),result]
    const{error}=await sb.from('results_v2').upsert({id:String(result.id),date:result.date,athlete_id:result.athleteId,session_id:result.sessionId?String(result.sessionId):null,presence:result.presence,energy_level:result.energyLevel??null,blocks:result.blocks,coach_note:result.coachNote||'',flag_for_review:!!result.flagForReview,logged_by_athlete:!!result.loggedByAthlete,updated_at:new Date().toISOString()},{onConflict:'id'})
    if(error){setLogSubmitting(false);setLogError('Erro ao enviar. Tente novamente.');return}
    setResults(next);setLogSubmitting(false);setLogSuccess(true)
  }

  function deskOpenReg(bl,sess,dateKey){
    const existing=results.find(r=>r.sessionId===sess.id&&r.athleteId===selAth)
    const existingBlock=existing?.blocks?.find(b=>b.blockId===bl.id)
    setDeskRegBl({bl,sess,dateKey})
    setDeskRegStep('form')
    setDeskRegScale(existingBlock?.scale||'RX')
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
    if(!selAth||!deskRegBl){setDeskRegError('Selecione um atleta primeiro.');return}
    setDeskRegSubmitting(true);setDeskRegError('')
    const{bl,sess,dateKey}=deskRegBl
    const existing=results.find(r=>r.sessionId===sess.id&&r.athleteId===selAth)
    const blockResult={blockId:bl.id,blockType:bl.type,blockLabel:blkLabel(bl),rpe:deskRegRpe,scale:deskRegScale,perfTime:deskRegPerfTime,perfRounds:deskRegPerfRounds,perfReps:deskRegPerfReps}
    const mergedBlocks=existing?[...(existing.blocks||[]).filter(b=>b.blockId!==bl.id),blockResult]:[blockResult]
    const result={id:existing?.id||uid(),date:dateKey,athleteId:selAth,sessionId:sess.id,presence:'Presente',energyLevel:existing?.energyLevel??3,blocks:mergedBlocks,coachNote:existing?.coachNote||'',flagForReview:false,loggedByAthlete:true}
    const{error}=await sb.from('results_v2').upsert({id:String(result.id),date:result.date,athlete_id:result.athleteId,session_id:result.sessionId?String(result.sessionId):null,presence:result.presence,energy_level:result.energyLevel??null,blocks:result.blocks,coach_note:result.coachNote||'',flag_for_review:!!result.flagForReview,logged_by_athlete:!!result.loggedByAthlete,updated_at:new Date().toISOString()},{onConflict:'id'})
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
    <LogPane pane={logPane} athId={logAthId} onAthId={setLogAthId}
      blocks={logBlocks} onBlocks={setLogBlocks}
      submitting={logSubmitting} success={logSuccess} error={logError}
      onSubmit={submitLog} onClose={()=>{setLogPane(null);setLogSuccess(false);setLogError('')}}
      lockedAthName={lockedId?athletes.find(a=>String(a.id)===String(lockedId))?.name||'':''}/>

    <div className={styles.pageRoot}><div className={styles.inner}>
    <div className={styles.hdr}>
      <div className={styles.hdrRule}><div className={styles.hdrLine}/><div className={styles.hdrDiamond}/><div className={`${styles.hdrLine} ${styles.hdrLineR}`}/></div>
      <div className={styles.brand}>{gymName.toUpperCase()}</div>
      <div className={styles.gym}>AGENDA</div>
    </div>

    {/* Mobile bars */}
    {status!=='loading'&&<>
      {!lockedId&&<div className={`${styles.selBar} ${styles.mobileOnly}`}>
        <select className={styles.athleteSel} value={selAth} onChange={e=>changeAth(e.target.value)}>
          <option value="">— Todos —</option>
          {athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>}
      <div className={`${styles.weekNav} ${styles.mobileOnly}`}>
        <button className={styles.navBtn} onClick={()=>changeWeek(-1)}><i className="ti ti-chevron-left"/></button>
        <span className={styles.weekLabel}>{weekLabel}</span>
        <button className={styles.navBtn} onClick={()=>changeWeek(1)}><i className="ti ti-chevron-right"/></button>
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
                  const exNames=[...new Set(blocks.flatMap(bl=>(bl.exercises||[]).filter(e=>e.name).map(e=>toTitleCase(e.name))))].slice(0,3)
                  const moreEx=blocks.flatMap(b=>(b.exercises||[])).filter(e=>e.name).length>3
                  return(
                    <div key={sess.id}>
                      <div className={styles.sessSummary} onClick={()=>setExpanded(prev=>{const n=new Set(prev);const k=`${dk}|${si}`;n.has(k)?n.delete(k):n.add(k);return n})}>
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
                        sess={sess} dateKey={dk} accent={blockAccent}
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
          <button className={styles.navBtn} onClick={()=>changeWeek(-1)}><i className="ti ti-chevron-left"/></button>
          <span className={styles.weekLabel}>{weekLabel}</span>
          <button className={styles.navBtn} onClick={()=>changeWeek(1)}><i className="ti ti-chevron-right"/></button>
        </div>
      </div>

      {/* Week strip */}
      <div className={styles.deskStrip}>
        {week.map(date=>{
          const dk=toISO(date),isPast=dk<today,isToday=dk===today
          const daySess=(sessions[dk]||[]).filter(s=>s.public!==false&&s.blocks&&s.blocks.length)
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
                      onClick={()=>{setSelSess(isSel?null:{dateKey:dk,sessId:sess.id});setDeskRegBl(null)}}>
                      <div className={styles.deskSCardName}>{sess.sessionName||'–'}</div>
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
                      onClick={()=>changeAth(isSel?'':String(ath.id))}>
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
              <span className={styles.deskSessNameHdr}>{selSessObj.sessionName||'–'}</span>
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
                    accent={blockAccent}
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

    </div></div>
    <Nav active="schedule" lockedId={lockedId}/>

    {/* ── Check-in bottom sheet ── */}
    {checkinId&&(
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:999,
        background:'#161210',borderTop:'2px solid #d8a840',
        padding:'20px 18px 28px',boxShadow:'0 -4px 32px rgba(0,0,0,.7)',
        fontFamily:'var(--font,inherit)',
      }}>
        {checkinDone?(
          <div style={{textAlign:'center',padding:'12px 0'}}>
            <div style={{fontSize:36,marginBottom:8}}>✅</div>
            <div style={{fontSize:18,fontWeight:900,color:'#48b860',letterSpacing:'.06em',textTransform:'uppercase'}}>Check-in feito!</div>
            <div style={{fontSize:13,color:'#806850',marginTop:6}}>{checkinExec?.class_label||'Aula'}</div>
          </div>
        ):(
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div>
                <div style={{fontSize:12,fontWeight:900,color:'#d8a840',letterSpacing:'.15em',textTransform:'uppercase'}}>Check-in</div>
                {checkinExec?.class_label&&<div style={{fontSize:16,fontWeight:700,color:'#f0e8d0',marginTop:2}}>{checkinExec.class_label}</div>}
              </div>
              <button onClick={()=>setCheckinId('')} style={{background:'transparent',border:'none',color:'#554a3a',fontSize:22,cursor:'pointer',padding:4}}>✕</button>
            </div>

            <div style={{display:'flex',gap:8,marginBottom:14}}>
              <button onClick={()=>setCheckinMode('athlete')}
                style={{flex:1,padding:'8px 4px',fontSize:13,fontWeight:700,border:`1px solid ${checkinMode==='athlete'?'#4ac8c0':'#2a231c'}`,borderRadius:4,background:checkinMode==='athlete'?'#0d1a1a':'#111',color:checkinMode==='athlete'?'#4ac8c0':'#806850',cursor:'pointer',fontFamily:'inherit'}}>
                Estou na lista
              </button>
              <button onClick={()=>setCheckinMode('anon')}
                style={{flex:1,padding:'8px 4px',fontSize:13,fontWeight:700,border:`1px solid ${checkinMode==='anon'?'#d8a840':'#2a231c'}`,borderRadius:4,background:checkinMode==='anon'?'#1a120a':'#111',color:checkinMode==='anon'?'#d8a840':'#806850',cursor:'pointer',fontFamily:'inherit'}}>
                Não estou na lista
              </button>
            </div>

            {checkinMode==='athlete'?(
              <>
                <input
                  placeholder="Buscar nome..."
                  value={checkinSearch}
                  onChange={e=>setCheckinSearch(e.target.value)}
                  style={{width:'100%',padding:'8px 10px',fontSize:14,background:'#111',border:'1px solid #2a231c',color:'#c8b090',borderRadius:4,outline:'none',fontFamily:'inherit',marginBottom:10,boxSizing:'border-box'}}
                />
                <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:160,overflowY:'auto'}}>
                  {athletes
                    .filter(a=>!checkinSearch||a.name.toLowerCase().includes(checkinSearch.toLowerCase()))
                    .map(a=>(
                      <div key={a.id} onClick={()=>setCheckinAthId(String(a.id))}
                        style={{padding:'8px 12px',borderRadius:4,cursor:'pointer',fontSize:14,fontWeight:700,
                          background:checkinAthId===String(a.id)?'#0d1a1a':'#111',
                          border:`1px solid ${checkinAthId===String(a.id)?'#4ac8c0':'#2a231c'}`,
                          color:checkinAthId===String(a.id)?'#4ac8c0':'#c8b090'}}>
                        {a.name}
                      </div>
                    ))}
                </div>
              </>
            ):(
              <input
                placeholder="Seu nome (placeholder)..."
                value={checkinAnonName}
                onChange={e=>setCheckinAnonName(e.target.value)}
                style={{width:'100%',padding:'8px 10px',fontSize:14,background:'#111',border:'1px solid #2a231c',color:'#c8b090',borderRadius:4,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
              />
            )}

            <button onClick={submitCheckin} disabled={checkinSubmitting||(checkinMode==='athlete'&&!checkinAthId)||(checkinMode==='anon'&&!checkinAnonName.trim())}
              style={{width:'100%',marginTop:14,padding:'11px',fontSize:15,fontWeight:900,letterSpacing:'.08em',textTransform:'uppercase',
                border:'none',borderRadius:5,cursor:'pointer',fontFamily:'inherit',
                background:checkinSubmitting?'#1a3a1a':'#48b860',color:'#0d0b09',
                opacity:(checkinSubmitting||(checkinMode==='athlete'&&!checkinAthId)||(checkinMode==='anon'&&!checkinAnonName.trim()))?0.5:1}}>
              {checkinSubmitting?'Registrando...':'Fazer Check-in'}
            </button>
          </>
        )}
      </div>
    )}
  </>)
}
