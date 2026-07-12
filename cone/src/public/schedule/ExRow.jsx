import { useRef, useEffect } from 'react'
import styles from './Schedule.module.css'
import { exVolStr, fmtIntensity } from '../lib/wod.js'
import { onKey, progGroups } from './scheduleHelpers.js'
import RdCounter from './RdCounter.jsx'

// ── Exercise Row ──────────────────────────────────────────────────────────────
export default function ExRow({ex,bl,isWod,isRd,checked,roundState,rmValues,rmEditKey,demoMap,onCheck,onAdvance,onReset,onRmToggle,onRmConfirm,onDemo}) {
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
    const cxIsPct=ex.intensity?.mode==='pct'
    const cxHasRm=cxIsProg||cxIsPct
    const exRm=rmValues[ex.id]
    let loadStr='',calcStr=''
    if(cxIsProg){
      const steps=ex.intensity?.steps||[],unit=(steps[0]?.unit||'% RM').replace('% do RM','% RM')
      const loads=steps.map(s=>s.load).filter(Boolean)
      if(loads.length)loadStr=loads.join(' / ')+' '+unit
      const pctNums=loads.map(l=>parseFloat(l)).filter(n=>!isNaN(n))
      if(exRm?.rm&&pctNums.length)calcStr=pctNums.map(p=>Math.ceil(exRm.rm*p/100)).join('/')+' '+(exRm.unit||'kg')
    }else if(cxIsPct){
      const pctNum=parseFloat(ex.intensity?.pct)
      if(ex.intensity?.pct)loadStr=ex.intensity.pct+'% RM'
      if(exRm?.rm&&!isNaN(pctNum))calcStr=Math.ceil(exRm.rm*pctNum/100)+' '+(exRm.unit||'kg')
    }else if(ins){loadStr=ins}
    const hasDemoCx=mvs.some(m=>{const d=demoMap[(m.name||'').toLowerCase()]||{};return!!(d.videoUrl||d.description||d.muscles)})
    const mvNames=mvs.map(m=>m.name)
    return(
      <div className={styles.detailEx} onClick={e=>e.stopPropagation()}>
        {!isWod&&(isRd
          ?<RdCounter blId={bl.id} exId={ex.id} total={Number(bl.rounds)} cur={roundState[`${bl.id}|${ex.id}`]||0} onAdvance={()=>onAdvance(bl.id,ex.id,Number(bl.rounds))} onReset={()=>onReset(bl.id,ex.id)}/>
          :<div className={`${styles.detailExCheck}${done?' '+styles.detailExCheckDone:''}`} role="checkbox" aria-checked={done} tabIndex={0} aria-label={`Concluir ${displayName}`} onClick={()=>onCheck(bl.id,ex.id)} onKeyDown={onKey(()=>onCheck(bl.id,ex.id))}/>)}
        <div className={styles.detailExBody}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6}}>
            <div style={{display:'flex',alignItems:'baseline',gap:6,flex:1,minWidth:0}}>
              {volStr&&<span className={styles.pillVol}>{volStr}</span>}
              <div className={`${styles.detailExName}${!isWod&&done?' '+styles.detailExNameDone:''}`}>{displayName}</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
              {cxHasRm&&<button className={`${styles.rmChip}${exRm?' '+styles.rmChipHasRm:''}`} onClick={e=>{e.stopPropagation();onRmToggle(ex.id)}}>{exRm?exRm.rm+' '+(exRm.unit||'kg'):'RM'}</button>}
              <button className={`${styles.demoBtn}${hasDemoCx?'':' '+styles.demoBtnNoDemo}`} onClick={e=>{e.stopPropagation();onDemo(mvNames.map(n=>({name:n})))}} disabled={!hasDemoCx}>Demo</button>
            </div>
          </div>
          {mvs.map((m,mi)=><div key={mi} className={styles.detailExMovement}>· {[m.reps?m.reps+'×':'',m.name].filter(Boolean).join(' ')}</div>)}
          {cxHasRm&&rmEditKey===ex.id&&<div className={styles.rmInputWrap} onClick={e=>e.stopPropagation()}>
            <input ref={rmInputRef} type="number" className={styles.rmInput} placeholder="100" min="1" step="1" inputMode="numeric" defaultValue={exRm?.rm||''} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();confirmRm()}}}/>
            <select ref={unitSelRef} className={styles.rmUnitSel} defaultValue={exRm?.unit||'kg'} onClick={e=>e.stopPropagation()}>
              <option value="kg">kg</option><option value="lbs">lbs</option>
            </select>
            <button className={styles.rmConfirmBtn} onClick={confirmRm} aria-label="Confirmar RM">✓</button>
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
    const groups=progGroups(ex)
    const exRm=rmValues[ex.id]
    return(<>{groups.map((g,gi)=>{
      const repsPrefix=ex.dist?exVolStr(ex):(ex.sets&&g.reps?`${g.sets||ex.sets}×${g.reps}`:g.reps)
      const pctNums=g.loads.map(l=>parseFloat(l)).filter(n=>!isNaN(n))
      const pctStr=pctNums.length?pctNums.join('/')+'% RM':''
      const calcStr=exRm?.rm&&pctNums.length?pctNums.map(p=>Math.ceil(exRm.rm*p/100)).join('/')+' '+(exRm.unit||'kg'):''
      const lineKey=`${bl.id}|${ex.id}-${gi}`,lineDone=checked.has(lineKey)
      const hasDemoPg=gi===0&&!!(exData.videoUrl||exData.description||exData.muscles)
      return(
        <div key={gi} className={styles.detailEx} onClick={e=>e.stopPropagation()}>
          {!isWod&&(isRd
            ?<RdCounter blId={bl.id} exId={`${ex.id}-${gi}`} total={Number(bl.rounds)} cur={roundState[`${bl.id}|${ex.id}-${gi}`]||0} onAdvance={()=>onAdvance(bl.id,`${ex.id}-${gi}`,Number(bl.rounds))} onReset={()=>onReset(bl.id,`${ex.id}-${gi}`)}/>
            :<div className={`${styles.detailExCheck}${lineDone?' '+styles.detailExCheckDone:''}`} role="checkbox" aria-checked={lineDone} tabIndex={0} aria-label={`Concluir ${ex.name}`} onClick={()=>onCheck(bl.id,`${ex.id}-${gi}`)} onKeyDown={onKey(()=>onCheck(bl.id,`${ex.id}-${gi}`))}/>)}
          <div className={styles.detailExBody}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6}}>
              <div style={{display:'flex',alignItems:'baseline',gap:6,flex:1,minWidth:0}}>
                {repsPrefix&&<span className={styles.pillVol}>{repsPrefix}</span>}
                <div className={`${styles.detailExName}${!isWod&&lineDone?' '+styles.detailExNameDone:''}`}>{ex.name}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
                {gi===0&&<button className={`${styles.rmChip}${exRm?' '+styles.rmChipHasRm:''}`} onClick={e=>{e.stopPropagation();onRmToggle(ex.id)}}>{exRm?exRm.rm+' '+(exRm.unit||'kg'):'RM'}</button>}
                {gi===0&&<button className={`${styles.demoBtn}${hasDemoPg?'':' '+styles.demoBtnNoDemo}`} onClick={e=>{e.stopPropagation();onDemo([{name:ex.name}])}} disabled={!hasDemoPg}>Demo</button>}
              </div>
            </div>
            {gi===0&&rmEditKey===ex.id&&<div className={styles.rmInputWrap} onClick={e=>e.stopPropagation()}>
              <input ref={rmInputRef} type="number" className={styles.rmInput} placeholder="100" min="1" step="1" inputMode="numeric" defaultValue={exRm?.rm||''} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();confirmRm()}}}/>
              <select ref={unitSelRef} className={styles.rmUnitSel} defaultValue={exRm?.unit||'kg'} onClick={e=>e.stopPropagation()}>
                <option value="kg">kg</option><option value="lbs">lbs</option>
              </select>
              <button className={styles.rmConfirmBtn} onClick={confirmRm} aria-label="Confirmar RM">✓</button>
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
        :<div className={`${styles.detailExCheck}${done?' '+styles.detailExCheckDone:''}`} role="checkbox" aria-checked={done} tabIndex={0} aria-label={`Concluir ${ex.name}`} onClick={()=>onCheck(bl.id,ex.id)} onKeyDown={onKey(()=>onCheck(bl.id,ex.id))}/>)}
      <div className={styles.detailExBody}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6}}>
          <div style={{display:'flex',alignItems:'baseline',gap:6,flex:1,minWidth:0}}>
            {vol&&<span className={styles.pillVol}>{vol}</span>}
            <div className={`${styles.detailExName}${!isWod&&done?' '+styles.detailExNameDone:''}`}>{ex.name}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
            {ins&&<span className={ins.includes('%')?styles.pillVol:styles.pillWt}>{ins}</span>}
            <button className={`${styles.demoBtn}${hasDemo?'':' '+styles.demoBtnNoDemo}`} onClick={e=>{e.stopPropagation();onDemo([{name:ex.name}])}} disabled={!hasDemo}>Demo</button>
          </div>
        </div>
        {ex.note&&<div className={styles.detailExNote}>{ex.note}</div>}
      </div>
    </div>
  )
}
