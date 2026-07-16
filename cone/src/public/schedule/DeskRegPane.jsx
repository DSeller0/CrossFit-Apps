import styles from './Schedule.module.css'
import { blkLabel, isTimeBlock } from '../lib/wod.js'
import { LOG_SCALES, fmtDeskPerf } from './scheduleHelpers.js'

// ── Desktop Reg Pane ──────────────────────────────────────────────────────────
export default function DeskRegPane({regBl,step,scale,rpe,perfTime,perfRounds,perfReps,athName,
  onScale,onRpe,onPerfTime,onPerfRounds,onPerfReps,
  onConfirm,onSubmit,onBack,onClose,submitting,error}) {
  if(!regBl)return null
  const{bl}=regBl
  const isForTime=isTimeBlock(bl.type)
  const label=blkLabel(bl)
  const perfVal=fmtDeskPerf({perfTime,perfRounds,perfReps})
  return(
    <div className={styles.deskRegPane}>
      <div className={styles.deskRegPaneHdr}>
        <span className={styles.deskRegPaneLbl}>{step==='success'?'Registrado':athName||'Registro'}</span>
        <span className={styles.deskRegPaneWod}>{label}</span>
        <button className={styles.deskRegClose} onClick={onClose} aria-label="Fechar">×</button>
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
          <button className={styles.deskRegSubmitBtn} disabled={!scale||!rpe} onClick={onConfirm}>Confirmar →</button>
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
