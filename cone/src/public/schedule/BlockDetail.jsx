import styles from './Schedule.module.css'
import { blkLabel, blkColor, isWodBlock, blkMeta } from '../lib/wod.js'
import { isRoundBlock, progGroups, stationsCapMins, fmtDeskPerf } from './scheduleHelpers.js'
import ExRow from './ExRow.jsx'

// ── Block Detail ──────────────────────────────────────────────────────────────
export default function BlockDetail({bl,sess,dateKey,checked,roundState,rmValues,rmEditKey,demoMap,isWodLogged,onCheck,onAdvance,onReset,onRmToggle,onRmConfirm,onDemo,onTimer,onLogBlock=null,athResult=null,athName='',deskIdleHint=false}) {
  const label=blkLabel(bl),col=blkColor(bl)
  const isWod=isWodBlock(bl),isRd=isRoundBlock(bl)
  const wodDone=isWodLogged(bl)

  const sharedExProps={bl,checked,roundState,rmValues,rmEditKey,demoMap,isWod,isRd,onCheck,onAdvance,onReset,onRmToggle,onRmConfirm,onDemo}

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
        <i className="ti ti-pencil"/>
        <span className={styles.btnLabel}>{athResult?' Editar resultado':' Registrar resultado →'}</span>
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
            {(repeat||capMins>0)&&<span className={styles.detailBlockMeta}>{[repeat,capMins>0?`Cap ${capMins}'`:''].filter(Boolean).join(' · ')}</span>}
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
  const meta=blkMeta(bl)

  let rdBadgeEl=null
  if(isRd){
    const keys=[]
    exs.forEach(ex=>{
      if(!ex.isComplex&&ex.intensity?.mode==='progression'){
        const groups=progGroups(ex)
        groups.forEach((_,gi)=>keys.push(`${ex.id}-${gi}`))
      }else{keys.push(ex.id)}
    })
    const dones=keys.map(k=>roundState[`${bl.id}|${k}`]||0)
    const allDone=dones.length>0&&dones.every(d=>d>=Number(bl.rounds))
    const minDone=dones.length?Math.min(...dones):0
    if(allDone)rdBadgeEl=<span className={`${styles.rdProg} ${styles.rdProgComplete}`}>✓</span>
    else if(minDone>0)rdBadgeEl=<span className={`${styles.rdProg} ${styles.rdProgPartial}`}>RD {minDone} / {bl.rounds}</span>
    else rdBadgeEl=<span className={`${styles.rdProg} ${styles.rdProgIdle}`}>{bl.rounds} RDS</span>
  }

  const infoCol=(
    <>
      <div className={styles.detailBlockHdr}>
        <span className={styles.detailBlockTitle} style={{color:col}}>{label}</span>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {isRd?rdBadgeEl:(meta?<span className={styles.detailBlockMeta}>{meta}</span>:null)}
          {!isRd&&wodDone&&<span className={styles.detailBlockDone}>✓ Completo</span>}
        </div>
      </div>
      {bl.notes&&<div className={styles.detailBlockNotesTop}>{bl.notes}</div>}
      {exs.map((ex,ei)=><ExRow key={ei} ex={ex} {...sharedExProps}/>)}
    </>
  )

  const showIdleHint=deskIdleHint&&isWod&&!athSection
  const actionsEmpty=!isWod

  return(
    <div className={styles.detailBlock} style={{borderLeftColor:col}}>
      <div className={styles.cardBody}>
        <div className={`${styles.cardInfo}${actionsEmpty?' '+styles.cardInfoFull:''}`}>{infoCol}</div>
        {!actionsEmpty&&<div className={styles.cardActions}>
          {isWod&&<button className={styles.timerBtn} onClick={e=>{e.stopPropagation();onTimer(bl)}}>
            <i className="ti ti-player-play"/>
            <span className={styles.btnLabel}> Timer</span>
          </button>}
          {isWod&&<a className={styles.lbLink} href={`leaderboard.html?wod=${bl.id}&session=${sess.id}&date=${dateKey}`} target="_blank" onClick={e=>e.stopPropagation()}>
            <i className="ti ti-trophy"/>
            <span className={styles.btnLabel}> Ver Leaderboard</span>
          </a>}
          {athSection}
          {showIdleHint&&<div className={styles.deskIdleHint}>Selecione um atleta no painel ao lado para registrar resultados</div>}
        </div>}
      </div>
    </div>
  )
}
