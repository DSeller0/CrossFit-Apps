import { useState, useEffect, useRef } from 'react'
import Nav from '../Nav.jsx'
import { sb } from '../supabaseClient.js'
import { registerSW } from '../registerSW.js'
import styles from './Results.module.css'

const WOD_TYPES = ['WOD','For Time','AMRAP','EMOM','MetCon','HIIT']
const DAY_PT    = ['DOM','SEG','TER','QUA','QUI','SEX','SAB']
const MONTH_PT  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const SCALES    = ['RX','Inter','SC','Adaptado']
const SCALE_COL = {RX:'#4ac8c0',Inter:'#e87820',SC:'#9070d8',Adaptado:'#c05050'}
const DEF_INP   = () => ({rpe:7,scale:'RX',perfTime:'',perfRounds:'',perfReps:''})

function todayISO() { return new Date().toISOString().slice(0,10) }
function toISO(d) { return d.toISOString().slice(0,10) }
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2) }
function getWeek(off) {
  const now=new Date(),sun=new Date(now)
  sun.setDate(now.getDate()-now.getDay()+off*7)
  return Array.from({length:7},(_,i)=>{const d=new Date(sun);d.setDate(sun.getDate()+i);return d})
}
function toSecs(t) {
  if(!t) return Infinity
  const p=String(t).split(':')
  return p.length===2?parseInt(p[0])*60+(parseInt(p[1])||0):parseInt(t)||Infinity
}
function fmtSecs(s) { const m=Math.floor(s/60),r=s%60; return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}` }
function inputKey(sid,bid) { return `${sid}:${bid}` }
function blkLabel(bl) {
  const l=bl.label&&bl.label!=='-'?bl.label:null
  const t=bl.type&&bl.type!=='-'?bl.type:null
  return l&&t&&l!==t?`${l} · ${t}`:l||t||''
}
function blkMeta(bl) {
  const p=[]
  if(bl.rounds) p.push(`${bl.rounds} rounds`)
  if(bl.duration) p.push(`CAP ${bl.duration}'`)
  return p.join(' · ')
}
function wodBlocks(sess) { return (sess.blocks||[]).filter(b=>WOD_TYPES.includes(b.type)) }
function sessionsForDay(sessions,dk) { return ((sessions||{})[dk]||[]).filter(s=>s.blocks&&s.blocks.length) }
function exVolStr(ex) {
  const isCardio=ex.intensity?.mode==='cardio'
  if(isCardio){
    const val=ex.intensity?.cardioVal,unit=ex.intensity?.cardioUnit||'m'
    if(!val) return ''
    return (ex.name||'').toLowerCase().includes(String(val).toLowerCase())?'':`${val}${unit}`
  }
  const repsRaw=ex.reps||''
  const repsDisplay=repsRaw.includes(',')?repsRaw.split(',').map(r=>r.trim()).join('-'):repsRaw
  return ex.sets&&repsDisplay?`${ex.sets}×${repsDisplay}`:repsDisplay
}

export default function Results() {
  const [status, setStatus] = useState('loading')
  const [sessions, setSessions] = useState({})
  const [athletes, setAthletes] = useState([])
  const [results, setResults] = useState([])
  const [gymName, setGymName] = useState('Cone')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selAth, setSelAth] = useState(() => localStorage.getItem('results_athlete')||'')
  const [expanded, setExpanded] = useState(new Set())
  const [logInputs, setLogInputs] = useState({})
  const [lbTarget, setLbTarget] = useState(null)
  const [confirmPending, setConfirmPending] = useState(null)
  const [successData, setSuccessData] = useState(null)
  const [submittingKey, setSubmittingKey] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const didUrlScroll = useRef(false)

  useEffect(() => {
    registerSW()
    load()
    const onShow = e => { if(e.persisted) load() }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  async function load(attempt=0) {
    if(attempt===0) setStatus('loading')
    try {
      const [sR,aR,rR,stR] = await Promise.all([
        sb.from('sessions').select('value').eq('id',1).maybeSingle(),
        sb.from('athletes').select('value').eq('id',1).maybeSingle(),
        sb.from('results').select('value').eq('id',1).maybeSingle(),
        sb.from('settings').select('value').eq('id',1).maybeSingle(),
      ])
      const sD=sR.data?.value||{}, aD=aR.data?.value||[]
      const rD=Array.isArray(rR.data?.value)?rR.data.value:[]
      const stD=stR.data?.value||{}
      setSessions(sD); setAthletes(aD); setResults(rD)
      setGymName(stD.gymName||'Cone')
      setStatus('ok')
      const urlSid=new URLSearchParams(location.search).get('session')
      if(urlSid) {
        for(const [dk,list] of Object.entries(sD)){
          if(!(list||[]).some(s=>s.id===urlSid)) continue
          const d=new Date(dk+'T12:00:00'),now=new Date()
          const dSun=new Date(d);dSun.setDate(d.getDate()-d.getDay())
          const nSun=new Date(now);nSun.setDate(now.getDate()-now.getDay())
          setWeekOffset(Math.round((dSun-nSun)/(7*24*60*60*1000)))
          setExpanded(new Set([urlSid]))
          break
        }
      }
    } catch(e) {
      if(attempt<2){setTimeout(()=>load(attempt+1),2000*(attempt+1));return}
      setErrMsg(e.message); setStatus('error')
    }
  }

  useEffect(() => {
    if(didUrlScroll.current||status!=='ok') return
    const urlSid=new URLSearchParams(location.search).get('session')
    if(urlSid&&expanded.has(urlSid)){
      didUrlScroll.current=true
      requestAnimationFrame(()=>{
        document.querySelector(`[data-sess-id="${urlSid}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'})
      })
    }
  },[expanded,status])

  function getInp(sid,bid) { return logInputs[inputKey(sid,bid)]||DEF_INP() }
  function setInp(sid,bid,upd) {
    const k=inputKey(sid,bid)
    setLogInputs(prev=>({...prev,[k]:{...(prev[k]||DEF_INP()),...upd}}))
  }
  function changeWeek(dir) { setWeekOffset(w=>w+dir); setExpanded(new Set()); setLbTarget(null) }
  function changeAth(val) {
    setSelAth(val); try{localStorage.setItem('results_athlete',val)}catch(e){}
    setExpanded(new Set()); setLbTarget(null)
  }
  function toggleSess(sid) {
    setExpanded(prev=>{const n=new Set(prev);n.has(sid)?n.delete(sid):n.add(sid);return n})
  }

  function getAthBlock(sid,bid) {
    if(!selAth) return null
    const r=results.find(r=>r.sessionId===sid&&r.athleteId===selAth)
    if(!r||r.presence!=='Presente') return null
    return (r.blocks||[]).find(b=>b.blockId===bid)||null
  }
  function hasDot(sid) {
    if(!selAth) return results.some(r=>r.sessionId===sid&&r.presence==='Presente')
    return results.some(r=>r.sessionId===sid&&r.athleteId===selAth&&r.presence==='Presente')
  }
  function loggedCount(sid) { return results.filter(r=>r.sessionId===sid&&r.presence==='Presente').length }
  function calcKPIs(sid,bid,btype) {
    const brs=results.filter(r=>r.sessionId===sid&&r.presence==='Presente')
      .map(r=>({...(r.blocks||[]).find(b=>b.blockId===bid)||{},aid:r.athleteId}))
      .filter(b=>b.blockId)
    const count=brs.length
    if(!count) return {count:0,avgRpe:null,rxPct:null,perfKpi:null}
    const avgRpe=(brs.reduce((s,b)=>s+(Number(b.rpe)||0),0)/count).toFixed(1)
    const scales=brs.map(b=>b.scale).filter(Boolean)
    const rxPct=scales.length?Math.round(scales.filter(s=>s==='RX').length/scales.length*100):null
    let perfKpi=null
    if(btype==='For Time'){
      const times=brs.map(b=>b.perfTime).filter(Boolean).map(toSecs).filter(t=>t<Infinity)
      if(times.length) perfKpi=fmtSecs(Math.round(times.reduce((a,b)=>a+b,0)/times.length))
    } else {
      const rounds=brs.map(b=>parseInt(b.perfRounds)||0).filter(r=>r>0)
      if(rounds.length) perfKpi=(rounds.reduce((a,b)=>a+b,0)/rounds.length).toFixed(1)+' rds'
    }
    return {count,avgRpe,rxPct,perfKpi}
  }

  function showConfirm(sid,bid,dk) {
    if(!selAth){alert('Selecione um atleta no filtro para registrar resultado.');return}
    setConfirmPending({sid,bid,dk})
  }
  function proceedSubmit() {
    if(!confirmPending) return
    const {sid,bid,dk}=confirmPending
    setConfirmPending(null)
    setTimeout(()=>doSubmit(sid,bid,dk),200)
  }

  async function doSubmit(sid,bid,dk) {
    const k=inputKey(sid,bid)
    if(submittingKey) return
    setSubmittingKey(k)
    const inp=getInp(sid,bid)
    const sess=(sessions[dk]||[]).find(s=>s.id===sid)
    const bl=(sess?.blocks||[]).find(b=>b.id===bid)
    const lbl=bl?blkLabel(bl):bid, btype=bl?.type||''
    const blockEntry={blockId:bid,blockType:btype,blockLabel:lbl,rpe:inp.rpe,scale:inp.scale,
      perfTime:inp.perfTime||'',perfRounds:inp.perfRounds||'',perfReps:inp.perfReps||''}
    const existing=Array.isArray(results)?results:[]
    const prev=existing.find(r=>r.sessionId===sid&&r.athleteId===selAth)
    const newResult=prev
      ?{...prev,blocks:[...(prev.blocks||[]).filter(b=>b.blockId!==bid),blockEntry]}
      :{id:uid(),date:dk,athleteId:selAth,sessionId:sid,presence:'Presente',
        energyLevel:3,blocks:[blockEntry],coachNote:'',flagForReview:false,loggedByAthlete:true}
    const next=[...existing.filter(r=>!(r.sessionId===sid&&r.athleteId===selAth)),newResult]
    const {error:e}=await sb.from('results').upsert({id:1,value:next,updated_at:new Date().toISOString()})
    setSubmittingKey(null)
    if(e){alert('Erro ao salvar. Verifique sua conexão e tente novamente.');return}
    setResults(next)
    setLogInputs(prev=>{const n={...prev};delete n[k];return n})
    let perf=''
    if(btype==='For Time') perf=inp.perfTime||(inp.perfRounds?`${inp.perfRounds} rds (DNF)`:'')
    else if(inp.perfRounds) perf=`${inp.perfRounds} rds${inp.perfReps?' + '+inp.perfReps+' reps':''}`
    setSuccessData({blockLabel:lbl,scale:inp.scale,rpe:inp.rpe,perf,btype})
  }

  const week=getWeek(weekOffset)
  const today=todayISO()
  const mon=week[1],sun=week[6]
  const weekLabel=`${mon.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} – ${sun.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} · ${MONTH_PT[mon.getMonth()]} ${mon.getFullYear()}`

  // LB pane content
  let lbTitle='', lbRows=null
  if(lbTarget){
    const {sid,bid,dk}=lbTarget
    const sess=(sessions[dk]||[]).find(s=>s.id===sid)
    const bl=(sess?.blocks||[]).find(b=>b.id===bid)
    lbTitle=bl?blkLabel(bl):'WOD'
    const btype=bl?.type||'', isForTime=btype==='For Time'
    const entries=results.filter(r=>r.sessionId===sid&&r.presence==='Presente').map(r=>{
      const br=(r.blocks||[]).find(b=>b.blockId===bid); if(!br) return null
      const ath=(athletes||[]).find(a=>a.id===r.athleteId)
      return {name:ath?.name||'?',...br}
    }).filter(Boolean)
    const sorted=[...entries].sort((a,b)=>{
      if(isForTime) return toSecs(a.perfTime)-toSecs(b.perfTime)
      const ra=parseInt(a.perfRounds)||0,rb=parseInt(b.perfRounds)||0
      if(ra!==rb) return rb-ra
      return (parseInt(b.perfReps)||0)-(parseInt(a.perfReps)||0)
    })
    const medals=['🥇','🥈','🥉']
    lbRows=sorted.length
      ?sorted.map((e,i)=>{
          const scol=SCALE_COL[e.scale]||'#666'
          const perf=isForTime?(e.perfTime||'—'):`${e.perfRounds||'—'}${e.perfReps?' + '+e.perfReps:''}`
          return(<div key={i} className={styles.lbEntry}>
            <span className={styles.lbRank}>{medals[i]||i+1}</span>
            <span className={styles.lbName}>{e.name}</span>
            <span className={styles.lbScale} style={{color:scol}}>{e.scale||''}</span>
            <span className={styles.lbPerf}>{perf}</span>
          </div>)
        })
      :[<div key="empty" className={styles.lbEmpty}>Nenhum resultado registrado.</div>]
  }

  // Confirm modal content
  let confirmContent=null
  if(confirmPending){
    const {sid,bid,dk}=confirmPending
    const inp=getInp(sid,bid)
    const sess=(sessions[dk]||[]).find(s=>s.id===sid)
    const bl=(sess?.blocks||[]).find(b=>b.id===bid)
    const lbl=bl?blkLabel(bl):bid, btype=bl?.type||''
    let perf=''
    if(btype==='For Time') perf=inp.perfTime||(inp.perfRounds?`${inp.perfRounds} rds (DNF)`:'')
    else if(inp.perfRounds) perf=`${inp.perfRounds} rds${inp.perfReps?' + '+inp.perfReps+' reps':''}`
    const plbl=btype==='For Time'?(inp.perfTime?'Tempo':'Resultado'):'Resultado'
    confirmContent=(<>
      <div className={styles.confirmTitle}>Confirmar registro</div>
      <div className={styles.confirmDetail}>
        <div className={styles.confirmWod}>{lbl}</div>
        <div className={styles.confirmRow}><span className={styles.confirmRowLbl}>Escala</span><span className={styles.confirmRowVal}>{inp.scale}</span></div>
        <div className={styles.confirmRow}><span className={styles.confirmRowLbl}>RPE</span><span className={styles.confirmRowVal}>{inp.rpe}</span></div>
        {perf&&<div className={styles.confirmRow}><span className={styles.confirmRowLbl}>{plbl}</span><span className={styles.confirmRowVal}>{perf}</span></div>}
      </div>
      <div className={styles.confirmBtns}>
        <button className={styles.btnCancel} onClick={()=>setConfirmPending(null)}>Cancelar</button>
        <button className={styles.btnConfirm} onClick={proceedSubmit}>Confirmar</button>
      </div>
    </>)
  }

  return (
    <>
      {/* ── LB pane ── */}
      <div className={`${styles.lbOverlay}${lbTarget?' '+styles.lbOverlayOpen:''}`} onClick={()=>setLbTarget(null)} />
      <div className={`${styles.lbPane}${lbTarget?' '+styles.lbPaneOpen:''}`}>
        <div className={styles.lbPaneHdr}>
          <div className={styles.lbPaneTitle}><i className="ti ti-trophy" /> {lbTitle}</div>
          <button className={styles.lbPaneClose} onClick={()=>setLbTarget(null)}><i className="ti ti-x" /></button>
        </div>
        <div className={styles.lbList}>{lbRows}</div>
      </div>

      {/* ── Confirm modal ── */}
      <div className={`${styles.modalOverlay}${confirmPending?' '+styles.modalOverlayOpen:''}`} onClick={()=>setConfirmPending(null)} />
      <div className={`${styles.confirmModal}${confirmPending?' '+styles.confirmModalOpen:''}`}>{confirmContent}</div>

      {/* ── Success modal ── */}
      <div className={`${styles.modalOverlay}${successData?' '+styles.modalOverlayOpen:''}`} style={{zIndex:500}} onClick={()=>setSuccessData(null)} />
      <div className={`${styles.successModal}${successData?' '+styles.successModalOpen:''}`}>
        {successData&&(()=>{
          const {blockLabel:lbl,scale,rpe,perf,btype}=successData
          const plbl=btype==='For Time'?'Tempo':'Resultado'
          return(<>
            <i className={`ti ti-circle-check ${styles.successIcon}`} />
            <div className={styles.successTitle}>Resultado registrado!</div>
            <div className={styles.successWodLbl}>{lbl}</div>
            <div className={styles.successDetail}>
              <div className={styles.successRow}><span className={styles.successRowLbl}>Escala</span><span className={styles.successRowVal}>{scale}</span></div>
              <div className={styles.successRow}><span className={styles.successRowLbl}>RPE</span><span className={styles.successRowVal}>{rpe}</span></div>
              {perf&&<div className={styles.successRow}><span className={styles.successRowLbl}>{plbl}</span><span className={styles.successRowVal}>{perf}</span></div>}
            </div>
            <button className={styles.btnDismiss} onClick={()=>setSuccessData(null)}>Fechar</button>
          </>)
        })()}
      </div>

      {/* ── Header ── */}
      <div className={styles.hdr}>
        <div className={styles.hdrRule}><div className={styles.hdrLine}/><div className={styles.hdrDiamond}/><div className={`${styles.hdrLine} ${styles.hdrLineR}`}/></div>
        <div className={styles.brand}>CONE</div>
        <div className={styles.gym}>{gymName} · Resultados</div>
      </div>

      {status!=='loading'&&<>
        {/* ── Athlete filter ── */}
        <div className={styles.selBar}>
          <select className={styles.athleteSel} value={selAth} onChange={e=>changeAth(e.target.value)}>
            <option value="">— Todos —</option>
            {athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        {/* ── Week nav ── */}
        <div className={styles.weekNav}>
          <button className={styles.navBtn} onClick={()=>changeWeek(-1)}><i className="ti ti-chevron-left"/></button>
          <span className={styles.weekLabel}>{weekLabel}</span>
          <button className={styles.navBtn} onClick={()=>changeWeek(1)}><i className="ti ti-chevron-right"/></button>
        </div>
      </>}

      {status==='loading'&&<div className={styles.loading}><i className={`ti ti-loader ${styles.spin}`} style={{fontSize:'32px'}}/>Carregando...</div>}
      {status==='error'&&<div className={styles.errorMsg}><i className="ti ti-alert-circle" style={{fontSize:'32px'}}/><br/><br/>Não foi possível carregar os dados.<br/><small>{errMsg}</small><br/><button className={styles.retryBtn} onClick={()=>load()}>↺ Tentar novamente</button></div>}

      {status==='ok'&&(
        <div className={styles.weekGrid}>
          {week.map(date=>{
            const dk=toISO(date),isPast=dk<today,isToday=dk===today
            const daySess=sessionsForDay(sessions,dk),hasSess=daySess.length>0
            return(
              <div key={dk} className={`${styles.dayCard}${isToday?' '+styles.dayCardToday:''}${hasSess?'':' '+styles.dayCardNoSess}`}>
                <div className={styles.dayHdr}>
                  <span className={styles.dayDow}>{DAY_PT[date.getDay()]}</span>
                  <div style={{display:'flex',alignItems:'center',gap:'3px'}}>
                    <span className={`${styles.dayNum}${isPast?' '+styles.dayNumPast:''}`}>{date.getDate()}</span>
                    {isToday&&<div className={styles.dayTodayDot}/>}
                  </div>
                </div>
                <div className={styles.dayBody}>
                  {hasSess
                    ?daySess.map(sess=>(
                        <SessionCard key={sess.id} sess={sess} dk={dk}
                          isExpanded={expanded.has(sess.id)}
                          hasDot={hasDot(sess.id)}
                          loggedCount={loggedCount(sess.id)}
                          onToggle={()=>toggleSess(sess.id)}
                          selAth={selAth}
                          logInputs={logInputs}
                          submittingKey={submittingKey}
                          kpisFn={(bid,btype)=>calcKPIs(sess.id,bid,btype)}
                          athBlockFn={(bid)=>getAthBlock(sess.id,bid)}
                          onRpe={(bid,n)=>setInp(sess.id,bid,{rpe:n})}
                          onScale={(bid,s)=>setInp(sess.id,bid,{scale:s})}
                          onField={(bid,f,v)=>setInp(sess.id,bid,{[f]:v})}
                          onSubmitReq={(bid)=>showConfirm(sess.id,bid,dk)}
                          onLbOpen={(bid)=>setLbTarget({sid:sess.id,bid,dk})}
                        />
                      ))
                    :<div className={styles.restLabel}><i className="ti ti-moon"/></div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Nav active="results" />
    </>
  )
}

function SessionCard({ sess, dk, isExpanded, hasDot, loggedCount, onToggle, selAth, logInputs, submittingKey, kpisFn, athBlockFn, onRpe, onScale, onField, onSubmitReq, onLbOpen }) {
  const name = sess.sessionName||sess.name||(()=>{
    const [y,m,d]=dk.split('-').map(Number)
    const DAYS=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
    return DAYS[new Date(y,m-1,d).getDay()]
  })()
  const wods=wodBlocks(sess)
  const cnt=loggedCount, cntLbl=`${cnt} ${cnt===1?'resultado':'resultados'} registrado${cnt===1?'':'s'}`
  return(
    <div data-sess-id={sess.id} className={`${styles.resCard}${isExpanded?' '+styles.resCardExpanded:''}`}>
      <div className={styles.resCardHdr} onClick={onToggle}>
        <div className={`${styles.resDot}${hasDot?' '+styles.resDotFilled:''}`}/>
        <div className={styles.resCardName}>{name}</div>
        <i className={`ti ${isExpanded?'ti-chevron-up':'ti-chevron-down'} ${styles.resChevron}`}/>
      </div>
      {isExpanded&&(
        <div className={styles.resCardBody}>
          <div className={styles.resBodyMeta}>{cntLbl}</div>
          {wods.length
            ?wods.map(bl=>(
                <WodSection key={bl.id} sess={sess} bl={bl} dk={dk}
                  selAth={selAth}
                  inp={logInputs[inputKey(sess.id,bl.id)]||DEF_INP()}
                  submittingKey={submittingKey}
                  kpis={!selAth?kpisFn(bl.id,bl.type):null}
                  brLogged={selAth?athBlockFn(bl.id):null}
                  onRpe={n=>onRpe(bl.id,n)}
                  onScale={s=>onScale(bl.id,s)}
                  onField={(f,v)=>onField(bl.id,f,v)}
                  onSubmitReq={()=>onSubmitReq(bl.id)}
                  onLbOpen={()=>onLbOpen(bl.id)}
                />
              ))
            :<div className={styles.resNoWod}>Nenhum WOD nesta sessão.</div>}
        </div>
      )}
    </div>
  )
}

function WodSection({ sess, bl, selAth, inp, submittingKey, kpis, brLogged, onRpe, onScale, onField, onSubmitReq, onLbOpen }) {
  const lbl=blkLabel(bl), k=inputKey(sess.id,bl.id)
  return(
    <div className={styles.resWod}>
      <div className={styles.resWodHdr}><span className={styles.resWodTitle}>{lbl}</span></div>
      <WodSummary bl={bl}/>
      {!selAth&&kpis&&<KpiGrid kpis={kpis} btype={bl.type}/>}
      {selAth&&brLogged&&<LoggedResult br={brLogged} btype={bl.type}/>}
      {selAth&&!brLogged&&<LogForm bl={bl} inp={inp} isSubmitting={submittingKey===k} onRpe={onRpe} onScale={onScale} onField={onField} onSubmit={onSubmitReq}/>}
      <button className={styles.btnLb} onClick={onLbOpen}><i className="ti ti-trophy"/> Leaderboard</button>
    </div>
  )
}

function WodSummary({ bl }) {
  const meta=blkMeta(bl), exs=(bl.exercises||[]).filter(e=>e.name)
  if(!meta&&!exs.length) return null
  return(
    <div className={styles.wodSummary}>
      {meta&&<div className={styles.wodSumMeta}>{meta}</div>}
      {exs.map((e,i)=>{const vol=exVolStr(e);return<div key={i} className={styles.wodSumEx}>{[vol,e.name].filter(Boolean).join(' ')}</div>})}
    </div>
  )
}

function KpiGrid({ kpis, btype }) {
  const {count,avgRpe,rxPct,perfKpi}=kpis
  return(
    <div className={styles.resKpiRow}>
      <div className={styles.resKpi}><div className={styles.resKpiVal}>{count}</div><div className={styles.resKpiLbl}>Atletas</div></div>
      <div className={styles.resKpi}><div className={styles.resKpiVal}>{avgRpe||'—'}</div><div className={styles.resKpiLbl}>RPE médio</div></div>
      <div className={styles.resKpi}><div className={styles.resKpiVal}>{rxPct!==null?rxPct+'%':'—'}</div><div className={styles.resKpiLbl}>% RX</div></div>
      <div className={styles.resKpi}><div className={styles.resKpiVal}>{perfKpi||'—'}</div><div className={styles.resKpiLbl}>{btype==='For Time'?'Tempo médio':'Rds médio'}</div></div>
    </div>
  )
}

function LoggedResult({ br, btype }) {
  const scol=SCALE_COL[br.scale]||'#888'
  const perf=btype==='For Time'
    ?(br.perfTime||(br.perfRounds?`${br.perfRounds} rds (DNF)`:'—'))
    :`${br.perfRounds||'—'} rds${br.perfReps?' + '+br.perfReps+' reps':''}`
  const plbl=btype==='For Time'?(br.perfTime?'Tempo':'Resultado'):'Resultado'
  return(
    <div className={styles.resLogged}>
      <div className={styles.resLoggedItem}><div className={styles.resLoggedLbl}>Escala</div><div className={styles.resLoggedVal} style={{color:scol}}>{br.scale||'—'}</div></div>
      <div className={styles.resLoggedItem}><div className={styles.resLoggedLbl}>RPE</div><div className={styles.resLoggedVal}>{br.rpe||'—'}</div></div>
      <div className={styles.resLoggedItem}><div className={styles.resLoggedLbl}>{plbl}</div><div className={styles.resLoggedVal}>{perf}</div></div>
    </div>
  )
}

function LogForm({ bl, inp, isSubmitting, onRpe, onScale, onField, onSubmit }) {
  const btype=bl.type, blRounds=Number(bl.rounds)||0, dis=isSubmitting||undefined
  if(isSubmitting) return(
    <div className={styles.resSpinner}>
      <i className={`ti ti-loader-2 ${styles.spin}`} style={{fontSize:'26px',color:'var(--teal)'}}/>
      <div style={{marginTop:'6px'}}>Salvando...</div>
    </div>
  )
  return(
    <div className={styles.resForm}>
      <div>
        <div className={styles.resFormLbl}>RPE (1–10)</div>
        <div className={styles.resRpeRow}>
          {[1,2,3,4,5,6,7,8,9,10].map(n=>(
            <button key={n} type="button" className={`${styles.resRpeBtn}${inp.rpe===n?' '+styles.resRpeBtnOn:''}`} disabled={dis} onClick={()=>onRpe(n)}>{n}</button>
          ))}
        </div>
      </div>
      <div>
        <div className={styles.resFormLbl}>Escala</div>
        <div className={styles.resScaleRow}>
          {SCALES.map(s=>(
            <button key={s} type="button" className={`${styles.resScaleBtn}${inp.scale===s?' '+styles.resScaleBtnOn:''}`} disabled={dis} onClick={()=>onScale(s)}>{s}</button>
          ))}
        </div>
      </div>
      {btype==='For Time'?(<>
        <div>
          <div className={styles.resFormLbl}>Tempo (MM:SS)</div>
          <input className={styles.resPerfInput} type="text" inputMode="numeric" placeholder="12:34" value={inp.perfTime} disabled={dis} onChange={e=>onField('perfTime',e.target.value)}/>
        </div>
        {blRounds>0&&<div>
          <div className={styles.resFormLbl}>Rounds completos de {blRounds} (DNF)</div>
          <input className={styles.resPerfInput} type="number" min="0" max={blRounds} inputMode="numeric" placeholder={`0/${blRounds}`} value={inp.perfRounds} disabled={dis} style={{width:'100px'}} onChange={e=>onField('perfRounds',e.target.value)}/>
        </div>}
      </>):(
        <div className={styles.resNumRow}>
          <div><div className={styles.resFormLbl}>Rounds</div><input className={styles.resPerfInput} type="number" min="0" inputMode="numeric" placeholder="0" value={inp.perfRounds} disabled={dis} style={{width:'80px'}} onChange={e=>onField('perfRounds',e.target.value)}/></div>
          <div><div className={styles.resFormLbl}>Reps</div><input className={styles.resPerfInput} type="number" min="0" inputMode="numeric" placeholder="0" value={inp.perfReps} disabled={dis} style={{width:'80px'}} onChange={e=>onField('perfReps',e.target.value)}/></div>
        </div>
      )}
      <button type="button" className={styles.btnRegistrar} disabled={dis} onClick={onSubmit}>
        <i className="ti ti-check"/> Registrar Resultado
      </button>
    </div>
  )
}
