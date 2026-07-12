import styles from './Schedule.module.css'
import { LOG_SCALES, fmtDeskPerf } from './scheduleHelpers.js'
import { blkColor } from '../lib/wod.js'
import { ExerciseList } from '../shared/ExerciseList.jsx'

// Estações nests its exercises under stations rather than bl.exercises directly
// (see BlockDetail.jsx's Estações branch) — flatten them here so the review/edit
// exercise list isn't silently empty for that block type.
function blockExercises(bl) {
  if(!bl)return[]
  if(bl.type==='Estações')return(bl.stations||[]).filter(st=>!st.isRest).flatMap(st=>st.exercises||[])
  return bl.exercises||[]
}

// ── Log Pane (mobile) ─────────────────────────────────────────────────────────
export default function LogPane({pane,athId,onAthId,blocks,onBlocks,submitting,success,error,confirming,onConfirming,onSubmit,onClose,lockedAthName}) {
  const isOpen=!!pane
  function setRpe(i,n){onBlocks(prev=>prev.map((b,j)=>j===i?{...b,rpe:n}:b))}
  function setScale(i,s){onBlocks(prev=>prev.map((b,j)=>j===i?{...b,scale:s}:b))}
  function setField(i,f,v){onBlocks(prev=>prev.map((b,j)=>j===i?{...b,[f]:v}:b))}
  const dateStr=pane?new Date(pane.dateKey+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}):''
  return(<>
    <div className={`${styles.lpOverlay}${isOpen?' '+styles.lpOverlayOpen:''}`} onClick={onClose} aria-hidden="true"/>
    <div className={`${styles.logPane}${isOpen?' '+styles.logPaneOpen:''}`}>
      {!pane?null:success?(
        <div>
          <div className={styles.lpHeader}>
            <div className={styles.lpTitle}>Resultado registrado</div>
            <button className={styles.lpClose} onClick={onClose} aria-label="Fechar"><i className="ti ti-x"/></button>
          </div>
          <div className={styles.lpSuccess}>
            <i className={`ti ti-circle-check ${styles.lpSuccessIcon}`}/>
            <div className={styles.lpSuccessTitle}>Resultado registrado!</div>
            <div className={styles.lpSuccessSub}>Salvo com sucesso.</div>
            <a href="./leaderboard.html" className={styles.lbLink} style={{marginTop:8}}><i className="ti ti-trophy"/> Ver leaderboard</a>
          </div>
        </div>
      ):confirming?(
        <div>
          <div className={styles.lpHeader}>
            <div className={styles.lpTitle}><i className="ti ti-clipboard-check"/> Revisar registro</div>
            <button className={styles.lpClose} onClick={onClose} aria-label="Fechar"><i className="ti ti-x"/></button>
          </div>
          <div className={styles.lpBody}>
            <div className={styles.lpDate}>{lockedAthName||pane.assignedAth.find(a=>String(a.id)===String(athId))?.name||''}{pane.sess.sessionName?` · ${pane.sess.sessionName}`:''}</div>
            {blocks.map(bl=>{
              const perf=fmtDeskPerf(bl)
              const fullBl=pane.sess.blocks?.find(b=>b.id===bl.blockId)
              const exs=blockExercises(fullBl)
              return(
                <div key={bl.blockId} className={styles.deskConfirmBox}>
                  <div className={styles.deskConfirmTitle}>{bl.blockLabel}</div>
                  {exs.length>0&&<ExerciseList exercises={exs} color={blkColor(fullBl)} size="compact"/>}
                  <div className={styles.deskConfirmRow}><span className={styles.deskConfirmRowLbl}>Escala</span><span className={styles.deskConfirmRowVal}>{bl.scale}</span></div>
                  {bl.rpe&&<div className={styles.deskConfirmRow}><span className={styles.deskConfirmRowLbl}>RPE</span><span className={styles.deskConfirmRowVal}>{bl.rpe} / 10</span></div>}
                  {perf&&<div className={styles.deskConfirmRow}><span className={styles.deskConfirmRowLbl}>Resultado</span><span className={styles.deskConfirmRowVal}>{perf}</span></div>}
                </div>
              )
            })}
            <div className={styles.deskConfirmBtns}>
              <button className={styles.deskCancelBtn} onClick={()=>onConfirming(false)}>← Editar</button>
              <button className={styles.deskConfirmBtn} disabled={submitting||undefined} onClick={onSubmit}>
                {submitting?'Enviando...':'Confirmar ✓'}
              </button>
            </div>
            {error&&<div className={styles.lpErr}>{error}</div>}
          </div>
        </div>
      ):(
        <div>
          <div className={styles.lpHeader}>
            <div className={styles.lpTitle}><i className="ti ti-pencil"/> Registrar Resultado</div>
            <button className={styles.lpClose} onClick={onClose} aria-label="Fechar"><i className="ti ti-x"/></button>
          </div>
          <div className={styles.lpBody}>
            <div className={styles.lpDate}>{dateStr}{pane.sess.sessionName?` · ${pane.sess.sessionName}`:''}</div>
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
              {blocks.map((bl,i)=>{
                const fullBl=pane.sess.blocks?.find(b=>b.id===bl.blockId)
                const exs=blockExercises(fullBl)
                return(
                <div key={bl.blockId} className={styles.lpBlock}>
                  <div className={styles.lpBlockTitle}>{bl.blockLabel}</div>
                  {exs.length>0&&<ExerciseList exercises={exs} color={blkColor(fullBl)} size="compact"/>}
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
              )})}
            </div>}
            <button className={styles.lpSubmit} disabled={submitting||undefined} onClick={()=>onConfirming(true)}>
              <i className="ti ti-check"/> Registrar
            </button>
            {error&&<div className={styles.lpErr}>{error}</div>}
          </div>
        </div>
      )}
    </div>
  </>)
}
