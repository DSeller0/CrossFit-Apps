import { useState, useEffect, useMemo } from 'react'
import { sb } from '../supabaseClient.js'
import { registerSW } from '../registerSW.js'
import s from './Athletes.module.css'
import { toISO } from '../lib/week.js'
import { toSecs } from '../lib/wod.js'

// ── Constants ─────────────────────────────────────────────────────────────
const SCALE_RANK   = { RX: 4, Inter: 3, SC: 2, Adaptado: 1 }
const SCALE_NAMES  = { 4: 'RX', 3: 'Inter', 2: 'SC', 1: 'Adaptado' }
const SCALE_COLORS = { RX: '#4ac8c0', Inter: '#d8a840', SC: '#e87820', Adaptado: '#a89880' }
const WOD_TYPES    = ['WOD', 'For Time', 'AMRAP', 'EMOM', 'MetCon', 'HIIT']
const DAY_PT       = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

// ── Pure helpers ──────────────────────────────────────────────────────────
function snapPct(p) { return Math.round(p/10)*10 }
function getTargets(sess) { if (!sess?.mainTraining) return []; return Array.isArray(sess.mainTraining) ? sess.mainTraining : [sess.mainTraining] }

// ── Supabase fetch ────────────────────────────────────────────────────────
async function fetchState() {
  const blobTables = ['sessions','athletes','events','locations','coach_profile','settings','goals_data','lb_colors']
  const [blobRows, resRaw] = await Promise.all([
    Promise.all(blobTables.map(t => sb.from(t).select('value').eq('id',1).maybeSingle())),
    sb.from('results_v2').select('*'),
  ])
  const [sessions, athletes, , , , settings, goalsData] = blobRows.map(x => x.data?.value ?? null)
  const results = (resRaw.data||[]).map(r=>({id:r.id,date:r.date,athleteId:r.athlete_id,sessionId:r.session_id,presence:r.presence,energyLevel:r.energy_level,blocks:r.blocks,coachNote:r.coach_note,flagForReview:r.flag_for_review,loggedByAthlete:r.logged_by_athlete}))
  return {
    sessions:        sessions  ?? {},
    athletes:        athletes  ?? [],
    results:         results,
    settings:        settings  ?? {},
    athleteGoalsData: goalsData ?? { athleteGoals: {}, prs: {} },
  }
}

// ── Character stats ───────────────────────────────────────────────────────
function calcStats(athId, goalsData, results) {
  const athResults = results.filter(r => String(r.athleteId) === String(athId))
  const now = new Date()
  const days30 = new Date(now); days30.setDate(now.getDate()-30)
  const days60 = new Date(now); days60.setDate(now.getDate()-60)
  const days28 = new Date(now); days28.setDate(now.getDate()-28)

  // Força — avg % toward load PR targets
  const prs = (goalsData.prs||{})[athId] || []
  const loadPrs = prs.filter(p => p.type === 'load' && p.target && p.results?.length)
  let forca = null, forcaSub = 'Sem PRs de carga registrados'
  if (loadPrs.length) {
    const vals = loadPrs.map(p => { const best = p.results.reduce((b,r) => Number(r.value)>Number(b.value)?r:b); return Math.min(100, Math.round(Number(best.value)/Number(p.target)*100)) })
    forca = Math.round(vals.reduce((a,v) => a+v, 0)/vals.length)
    forcaSub = `${loadPrs.length} lift${loadPrs.length>1?'s':''} — média ${forca}% da meta`
  }

  // Condicionamento — attendance + WOD completion last 4 weeks
  const r4w = athResults.filter(r => new Date(r.date) >= days28)
  const present4w = r4w.filter(r => r.presence === 'Presente').length
  const attPct = r4w.length > 0 ? Math.round(present4w/r4w.length*100) : null
  const wodResults = athResults.filter(r => r.presence === 'Presente' && (r.blocks||[]).some(b => WOD_TYPES.includes(b.blockType)||WOD_TYPES.includes(b.blockLabel)))
  const completed = wodResults.filter(r => { const wb = (r.blocks||[]).find(b => WOD_TYPES.includes(b.blockType)||WOD_TYPES.includes(b.blockLabel)); return wb?.perfTime }).length
  const compPct = wodResults.length > 0 ? Math.round(completed/wodResults.length*100) : null
  let cond = null, condSub = 'Sem dados suficientes'
  if (attPct !== null && compPct !== null) { cond = Math.round((attPct+compPct)/2); condSub = `Presença 4 sem: ${attPct}% · WODs completos: ${compPct}%` }
  else if (attPct !== null) { cond = attPct; condSub = `Presença últimas 4 semanas: ${attPct}%` }

  // Habilidade — RX rate last 30 days + milestone hit rate
  const r30 = athResults.filter(r => new Date(r.date) >= days30 && r.presence === 'Presente')
  let rxPct = null
  if (r30.length) {
    const rxCount = r30.filter(r => { const wb = (r.blocks||[]).find(b => WOD_TYPES.includes(b.blockType)||WOD_TYPES.includes(b.blockLabel)); if (!wb) return false; const rows = wb.exerciseRows||[]; let min=4; rows.forEach(row => { const rank = SCALE_RANK[row.scale]??0; if (rank<min) min=rank }); return min===4 }).length
    rxPct = Math.round(rxCount/r30.length*100)
  }
  const athGoals = (goalsData.athleteGoals||{})[athId] || []
  const allMs = athGoals.flatMap(g => g.milestones||[])
  const hitMs = allMs.filter(m => m.hit).length
  const msPct = allMs.length > 0 ? Math.round(hitMs/allMs.length*100) : null
  let hab = null, habSub = 'Sem dados suficientes'
  if (rxPct !== null && msPct !== null) { hab = Math.round((rxPct+msPct)/2); habSub = `RX rate 30 dias: ${rxPct}% · Milestones: ${hitMs}/${allMs.length}` }
  else if (rxPct !== null) { hab = rxPct; habSub = `RX rate últimos 30 dias: ${rxPct}%` }
  else if (msPct !== null) { hab = msPct; habSub = `Milestones atingidos: ${hitMs}/${allMs.length}` }

  // Progressão — PRs set last 60 days + RPE trend
  const recentPRs = prs.filter(p => { if (!p.results?.length) return false; const best = p.type==='time' ? p.results.reduce((b,r) => toSecs(r.value)<toSecs(b.value)?r:b) : p.results.reduce((b,r) => Number(r.value)>Number(b.value)?r:b); return new Date(best.date) >= days60 }).length
  const rpeAll = athResults.filter(r => r.blocks?.some(b => b.rpe)).map(r => r.blocks.find(b => b.rpe)?.rpe||7)
  const rpeHalf = rpeAll.length >= 6 ? [rpeAll.slice(0, Math.floor(rpeAll.length/2)), rpeAll.slice(Math.floor(rpeAll.length/2))] : null
  let rpeTrend = null
  if (rpeHalf) { const a1=rpeHalf[0].reduce((a,v)=>a+v,0)/rpeHalf[0].length, a2=rpeHalf[1].reduce((a,v)=>a+v,0)/rpeHalf[1].length; rpeTrend = a1>a2?'↓':'↑' }
  let prog = null, progSub = 'Sem dados suficientes'
  if (recentPRs > 0 || rpeAll.length > 0) { prog = Math.min(100, recentPRs*20); progSub = `${recentPRs} PR${recentPRs!==1?'s':''} nos últimos 60 dias${rpeTrend?` · RPE tendência ${rpeTrend}`:''}` }

  // Consistência — streak + energy average
  const sortedDates = [...new Set(athResults.map(r => r.date))].sort().reverse()
  let streak = 0; const today = toISO(new Date())
  for (const d of sortedDates) { if (athResults.filter(r => r.date===d).some(r => r.presence==='Presente')) streak++; else if (d <= today) break }
  const streakPct = Math.min(100, Math.round(streak/12*100))
  const energyResults = athResults.filter(r => r.energyLevel && r.presence==='Presente')
  const avgEnergy = energyResults.length>0 ? Math.round(energyResults.reduce((a,r)=>a+r.energyLevel,0)/energyResults.length*10)/10 : null
  let consistSub = `Streak: ${streak} semana${streak!==1?'s':''} consecutiva${streak!==1?'s':''}`
  if (avgEnergy !== null) consistSub += ` · Energia média: ${avgEnergy}/5`

  return [
    { key: 'forca',  name: 'Força',           pct: forca,     sub: forcaSub,  color: 'var(--gold)'  },
    { key: 'cond',   name: 'Condicionamento',  pct: cond,      sub: condSub,   color: 'var(--accent)'},
    { key: 'hab',    name: 'Habilidade',       pct: hab,       sub: habSub,    color: 'var(--green)' },
    { key: 'prog',   name: 'Progressão',       pct: prog,      sub: progSub,   color: '#c884f0'      },
    { key: 'consist',name: 'Consistência',     pct: streakPct, sub: consistSub,color: 'var(--gold)'  },
  ]
}

// ── PR helpers ────────────────────────────────────────────────────────────
function prBest(pr) { if (!pr.results?.length) return null; return pr.type==='time' ? pr.results.reduce((b,r) => toSecs(r.value)<toSecs(b.value)?r:b) : pr.results.reduce((b,r) => Number(r.value)>Number(b.value)?r:b) }
function prDelta(pr) {
  if (!pr.results || pr.results.length < 2) return null
  const sorted = [...pr.results].sort((a,b) => new Date(a.date)-new Date(b.date))
  const last=sorted[sorted.length-1], prev=sorted[sorted.length-2]
  if (pr.type === 'time') { const diff=toSecs(prev.value)-toSecs(last.value); if (diff===0) return{label:'=',good:null}; const abs=Math.abs(diff),m=Math.floor(abs/60),sec=abs%60; return{label:(diff>0?'-':'+')+`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`,good:diff>0} }
  const diff = Number(last.value)-Number(prev.value); if (diff===0) return{label:'=',good:null}
  return { label: (diff>0?'+':'')+diff+' '+(pr.type==='load'?(pr.unit||'kg'):'reps'), good: diff>0 }
}
function prPct(pr) {
  const best = prBest(pr); if (!best || !pr.target) return null
  if (pr.type === 'time') { const ts=toSecs(pr.target),fs=pr.results.length>0?toSecs([...pr.results].sort((a,b)=>new Date(a.date)-new Date(b.date))[0].value):ts*2; if (fs<=ts) return 100; return Math.min(100,Math.round((fs-toSecs(best.value))/(fs-ts)*100)) }
  const tn = Number(pr.target); if (!tn) return null; return Math.min(100, Math.round(Number(best.value)/tn*100))
}

// ── Sub-components ────────────────────────────────────────────────────────
function BlockBar({ pct, color, height = 16, hasMilestone = false }) {
  return (
    <div className={s.statBlock} style={{ height }}>
      <div className={s.statFill} style={{ width: pct*100+'%', background: pct === 1 ? color : color+'99', opacity: pct === 1 ? 1 : 0.5 }} />
      {hasMilestone && <div className={s.hpTick} />}
    </div>
  )
}

function StatRow({ stat }) {
  const pct = stat.pct ?? 0
  return (
    <div className={s.statRow}>
      <div className={s.statNameCol}>{stat.name}</div>
      <div className={s.statBarWrap}>
        <div className={s.statBar}>
          {Array.from({length:10}, (_,bi) => {
            const fill = pct>=(bi+1)*10 ? 1 : pct>bi*10 ? (pct-bi*10)/10 : 0
            return <BlockBar key={bi} pct={fill} color={stat.color} />
          })}
        </div>
        <div className={s.statSub}>{stat.sub}</div>
      </div>
      <div className={s.statPct}>{stat.pct !== null ? stat.pct+'%' : '—'}</div>
    </div>
  )
}

function PrRow({ pr, color }) {
  const best = prBest(pr), delta = prDelta(pr), pct = prPct(pr)
  const bestLabel = best ? (pr.type==='load' ? `${best.value} ${pr.unit||'kg'}` : pr.type==='reps' ? `${best.value} reps` : best.value) : '—'
  const targetLabel = pr.target ? (pr.type==='load' ? `${pr.target} ${pr.unit||'kg'}` : pr.type==='reps' ? `${pr.target} reps` : pr.target) : null
  const bestDate = best ? new Date(best.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}) : null
  const dc = delta?.good===true ? '#68d8a0' : delta?.good===false ? '#e05050' : '#a89880'
  const arrow = delta?.good===true ? '↑' : delta?.good===false ? '↓' : ''
  return (
    <div className={s.prRow}>
      <div className={s.prInfo}>
        <div className={s.prName}>{pr.name}</div>
        {pr.category && <div className={s.prCat}>{pr.category}</div>}
      </div>
      {pct !== null && (
        <div className={s.prBarWrap}>
          <div className={s.prBar}>
            {Array.from({length:10}, (_,bi) => {
              const fill = pct>=(bi+1)*10 ? 1 : pct>bi*10 ? (pct-bi*10)/10 : 0
              return (
                <div key={bi} className={s.prBarBlock}>
                  {fill > 0 && <div className={s.prBarFill} style={{ width: fill*100+'%', background: fill===1?color:color+'99' }} />}
                </div>
              )
            })}
          </div>
          {targetLabel && <div className={s.prMeta}>Meta: {targetLabel}</div>}
        </div>
      )}
      <div className={s.prBest}>
        <div className={s.prValue}>{bestLabel}</div>
        {bestDate && <div className={s.prDate}>{bestDate}</div>}
      </div>
      {delta
        ? <div className={s.prDelta} style={{ color: dc }}>{arrow} {delta.label}</div>
        : <div style={{ minWidth: 56 }} />
      }
    </div>
  )
}

function GoalRow({ goal, color, expanded, onToggle }) {
  const pct = goal.totalSessions>0 ? (goal.completedSessions/goal.totalSessions)*100 : 0
  return (
    <div className={s.goalRow}>
      <div className={s.goalHeader}>
        <span className={s.goalName}>{goal.name}</span>
        <span className={s.goalCount}>{goal.completedSessions}/{goal.totalSessions} sessões</span>
      </div>
      <div className={s.hpBar} onClick={onToggle}>
        {Array.from({length:10}, (_,bi) => {
          const bs=bi*10, be=(bi+1)*10
          const fill = pct>=be ? 1 : pct>bs ? (pct-bs)/10 : 0
          const hasMile = (goal.milestones||[]).some(m => snapPct(m.pct)===be)
          return (
            <div key={bi} className={s.hpBarBlock}>
              {fill > 0 && <div className={s.hpBarFill} style={{ width: fill*100+'%', background: fill===1?color:color+'99' }} />}
              {hasMile && <div className={s.hpTick} />}
            </div>
          )
        })}
      </div>
      <div className={s.milestonePcts}>
        {(goal.milestones||[]).map((m,i) => (
          <div key={i} className={s.mpLabel} style={{ left: snapPct(m.pct)+'%' }}>{snapPct(m.pct)}%</div>
        ))}
      </div>
      {expanded && (
        <div className={s.milestonesPanel}>
          {(goal.milestones||[]).length === 0
            ? <div className={s.emptyMsg}>Nenhum milestone.</div>
            : (goal.milestones||[]).map((m,i) => (
              <div key={i} className={s.msRow}>
                <div className={`${s.msCheck}${m.hit ? ' '+s.msCheckHit : ''}`}>{m.hit ? '✓' : ''}</div>
                <span className={`${s.msLabel}${m.hit ? ' '+s.msLabelDone : ''}`}>{m.label}</span>
                <span className={s.msPct}>{snapPct(m.pct)}%</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

function SessionCard({ date, session, athResult, expanded, onToggle, selAthleteId }) {
  const today = toISO(new Date())
  const isPast = date <= today, isToday = date === today
  const d = new Date(date+'T12:00:00')
  const dow = DAY_PT[d.getDay()]
  const dateLabel = d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})

  const blockBadges = (session.blocks||[]).map((bl,i) => {
    const _l = bl.label&&bl.label!=='-' ? bl.label : null
    const _t = bl.type&&bl.type!=='-' ? bl.type : null
    const label = _l&&_t&&_l!==_t ? `${_l} · ${_t}` : _l||_t||''
    return label ? <span key={i} className={s.blockBadge}>{label}</span> : null
  }).filter(Boolean)

  let perfJsx = null
  if (isPast && athResult) {
    const wb = (athResult.blocks||[]).find(b => WOD_TYPES.includes(b.blockType)||WOD_TYPES.includes(b.blockLabel))
    if (athResult.presence === 'Ausente') {
      perfJsx = <div className={s.sessPerf} style={{ color: '#7a2020' }}>Ausente</div>
    } else if (athResult.presence === 'Atrasado') {
      perfJsx = <div className={s.sessPerf} style={{ color: 'var(--gold)' }}>Atrasado</div>
    } else if (wb) {
      const exRows = wb.exerciseRows||[]; let minRank=4; exRows.forEach(row => { const rank=SCALE_RANK[row.scale]??0; if (rank<minRank) minRank=rank })
      const scale = exRows.length>0 ? SCALE_NAMES[minRank] : ''; const scaleCol = SCALE_COLORS[scale]||''
      perfJsx = (
        <div className={s.sessPerf}>
          {scale && <span style={{ fontSize:11,fontWeight:700,padding:'1px 5px',borderRadius:3,color:scaleCol,background:scaleCol+'22',border:`1px solid ${scaleCol}44`,marginRight:4 }}>{scale}</span>}
          {wb.perfTime && <strong style={{ color:'var(--cream)',marginRight:4 }}>{wb.perfTime}</strong>}
          {wb.rpe && <span style={{ color:'var(--muted)' }}>RPE {wb.rpe}</span>}
        </div>
      )
    } else {
      perfJsx = <div className={s.sessPerf} style={{ color:'var(--muted)' }}>Sem resultado</div>
    }
  } else if (isPast) {
    perfJsx = <div className={s.sessPerf} style={{ color:'var(--muted)' }}>Sem resultado</div>
  } else {
    perfJsx = <div className={s.sessPerf} style={{ color:'var(--accent)' }}>Próxima sessão</div>
  }

  const badgeJsx = isToday
    ? <span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,textTransform:'uppercase',background:'var(--accent)',color:'#000' }}>Hoje</span>
    : isPast
    ? <span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,textTransform:'uppercase',background:'rgba(104,216,160,.15)',color:'var(--green)',border:'1px solid rgba(104,216,160,.3)' }}>Feito</span>
    : <span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,textTransform:'uppercase',background:'rgba(74,200,192,.1)',color:'var(--accent)',border:'1px solid rgba(74,200,192,.3)' }}>Próxima</span>

  let cardCls = s.sessCard
  if (isPast) cardCls += ' ' + s.sessPast
  else cardCls += ' ' + s.sessFuture
  if (isToday) cardCls += ' ' + s.sessToday

  return (
    <div className={cardCls} onClick={onToggle}>
      <div className={s.sessHdr}>
        <div><div className={s.sessDow}>{dow}</div><div className={s.sessDate}>{dateLabel}</div></div>
        {badgeJsx}
      </div>
      <div className={s.sessBody}>
        <div className={s.blockBadges}>{blockBadges}</div>
        {perfJsx}
      </div>
      {expanded && (
        <div className={s.sessExpand}>
          {(session.blocks||[]).map((bl,i) => {
            const _l = bl.label&&bl.label!=='-' ? bl.label : null
            const _t = bl.type&&bl.type!=='-' ? bl.type : null
            const label = _l&&_t&&_l!==_t ? `${_l} · ${_t}` : _l||_t||''
            const isWod = WOD_TYPES.includes(bl.label)||WOD_TYPES.includes(bl.type)
            const exs = (bl.exercises||[]).filter(e => e.name)
            const athBl = isPast&&athResult ? (athResult.blocks||[]).find(b => b.blockId===bl.id) : null
            const exRows = athBl?.exerciseRows||[]
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5 }}>{label}</div>
                {exs.map((ex,j) => {
                  const rowResult = exRows.find(r => r.name===ex.name)
                  const sc = rowResult?.scale||'', scCol = SCALE_COLORS[sc]||''
                  return (
                    <div key={j} className={s.sessExRow}>
                      <span style={{ flex:1,color:'var(--cream)' }}>{ex.name}</span>
                      {sc && <span className={s.sessExScale} style={{ color:scCol,background:scCol+'22',border:`1px solid ${scCol}44` }}>{sc}</span>}
                    </div>
                  )
                })}
                {isPast && athBl?.rpe && <div style={{ fontSize:11,color:'var(--muted)',marginTop:4 }}>RPE {athBl.rpe}</div>}
                {isPast && athBl?.perfTime && <div style={{ fontSize:12,fontWeight:700,color:'var(--cream)',marginTop:4 }}>{athBl.perfTime}</div>}
                {isWod && isPast && (
                  <a className={s.lbLink} href={`leaderboard.html?wod=${bl.id}&session=${session.id}&date=${date}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                    🏆 Ver Leaderboard
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function Athletes() {
  const [status,           setStatus]           = useState('loading')
  const [cfg,              setCfg]              = useState({})
  const [appState,         setAppState]         = useState(null)
  const [selAthlete,       setSelAthlete]       = useState(null)
  const [expandedGoals,    setExpandedGoals]    = useState(new Set())
  const [expandedSessions, setExpandedSessions] = useState(new Set())
  const [error,            setError]            = useState(null)

  // Apply cfg CSS vars
  useEffect(() => {
    if (!cfg || !Object.keys(cfg).length) return
    const r = document.documentElement.style
    if (cfg.wkBg)       r.setProperty('--bg', cfg.wkBg)
    if (cfg.wkHeader)   r.setProperty('--accent', cfg.wkHeader)
    else if (cfg.themeAccent) r.setProperty('--accent', cfg.themeAccent)
    if (cfg.wkExName)   r.setProperty('--cream', cfg.wkExName)
    if (cfg.wkDateNum)  r.setProperty('--sub', cfg.wkDateNum)
    if (cfg.wkDivider)  r.setProperty('--divider', cfg.wkDivider)
    if (cfg.fontFamily) {
      r.setProperty('--font', cfg.fontFamily)
      document.body.style.fontFamily = cfg.fontFamily
    }
  }, [cfg])

  async function load(attempt = 0) {
    try {
      const [cfgData, stateData] = await Promise.all([
        fetch('./config.json?v='+Date.now()).then(r => r.ok?r.json():{}).catch(()=>({})),
        fetchState(),
      ])
      const mergedCfg = cfgData.colors && typeof cfgData.colors==='object' ? {...cfgData,...cfgData.colors} : cfgData
      setCfg(mergedCfg)
      setAppState(stateData)
      setStatus('ok')
    } catch (err) {
      if (attempt < 2) { setTimeout(() => load(attempt+1), 2000*(attempt+1)); return }
      setError(err.message); setStatus('error')
    }
  }

  useEffect(() => {
    registerSW()
    load()
    const onShow = e => { if (e.persisted) load() }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // URL param deep-link
  useEffect(() => {
    if (!appState) return
    const p = new URLSearchParams(window.location.search)
    const athId = p.get('athlete')
    if (athId) setSelAthlete(athId)
  }, [appState])

  function toggleGoal(id) {
    setExpandedGoals(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleSession(key) {
    setExpandedSessions(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })
  }
  function selectAthlete(id) { setSelAthlete(id); setExpandedGoals(new Set()); setExpandedSessions(new Set()) }
  function goBack() { setSelAthlete(null); setExpandedGoals(new Set()); setExpandedSessions(new Set()) }

  const athletes   = appState?.athletes   ?? []
  const goalsData  = appState?.athleteGoalsData ?? { athleteGoals: {}, prs: {} }
  const results    = appState?.results    ?? []
  const sessions   = appState?.sessions   ?? {}
  const gymName    = cfg.gymName || appState?.settings?.gymName || 'Cone'
  const logoFile   = cfg.logo || 'icon-192.png'

  // Sessions for the selected athlete
  const athSessions = useMemo(() => {
    if (!selAthlete) return []
    const ath = athletes.find(a => a.id === selAthlete)
    if (!ath) return []
    const today = toISO(new Date())
    const future30 = new Date(); future30.setDate(future30.getDate()+30)
    const fut30ISO = toISO(future30)
    const all = Object.keys(sessions).sort().reduce((acc, date) => {
      ;(sessions[date]||[]).filter(sess => getTargets(sess).includes(ath.name)).forEach(sess => acc.push({ date, session: sess }))
      return acc
    }, [])
    const past   = all.filter(x => x.date <= today).slice(-2)
    const future = all.filter(x => x.date > today && x.date <= fut30ISO).slice(0, 2)
    return [...past, ...future]
  }, [selAthlete, athletes, sessions])

  // ── Topbar ───────────────────────────────────────────────────────────────
  const topbar = (
    <div className={s.topbar}>
      <div className={s.gymRow}>
        <img className={s.gymLogo} src={logoFile} alt="" onError={e => e.target.style.display='none'} />
        <span className={s.gymName}>{gymName}</span>
      </div>
      {selAthlete && (
        <button className={s.backBtn} onClick={goBack}>← Todos</button>
      )}
    </div>
  )

  // ── Status screens ───────────────────────────────────────────────────────
  if (status === 'loading') return <><div className={s.loading}>Carregando...</div></>

  if (status === 'error') return (
    <>
      {topbar}
      <div className={s.error}>
        Não foi possível carregar os dados.<br/>
        <small>{error}</small><br/>
        <button className={s.retryBtn} onClick={() => { setStatus('loading'); setError(null); load() }}>Tentar novamente</button>
      </div>
    </>
  )

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selAthlete) {
    const ath = athletes.find(a => a.id === selAthlete)
    if (!ath) { setSelAthlete(null); return null }
    const color   = ath.color || '#4ac8c0'
    const athGoals = (goalsData.athleteGoals||{})[ath.id] || []
    const stats   = calcStats(ath.id, goalsData, results)
    const prs     = [...((goalsData.prs||{})[ath.id] || [])].sort((a,b) => { const ad=a.results?.length?a.results[a.results.length-1].date:'',bd=b.results?.length?b.results[b.results.length-1].date:''; return bd.localeCompare(ad) }).slice(0, 5)

    return (
      <>
        {topbar}
        <div className={s.detailPage}>
          <div className={s.athHeader}>
            <div style={{ width:14,height:14,borderRadius:'50%',background:color,flexShrink:0 }} />
            <span className={s.athTitle}>{ath.name}</span>
            {ath.level && <span className={s.athLevel}>{ath.level}</span>}
          </div>

          <div className={s.section}>
            <div className={s.sectionTitle}>Desenvolvimento</div>
            {stats.map(stat => <StatRow key={stat.key} stat={stat} />)}
          </div>

          <div className={s.section}>
            <div className={s.sectionTitle}>Sessões</div>
            {athSessions.length === 0
              ? <div className={s.emptyMsg}>Nenhuma sessão atribuída a este atleta.</div>
              : <div className={s.sessGrid}>
                  {athSessions.map(({ date, session }) => {
                    const key = date+'|'+session.id
                    const athResult = results.find(r => String(r.athleteId)===String(selAthlete) && r.date===date && (r.sessionId===session.id||!r.sessionId))
                    return (
                      <SessionCard key={key} date={date} session={session} athResult={athResult}
                        expanded={expandedSessions.has(key)} onToggle={() => toggleSession(key)}
                        selAthleteId={selAthlete} />
                    )
                  })}
                </div>
            }
          </div>

          <div className={s.section}>
            <div className={s.sectionTitle}>PRs</div>
            {prs.length === 0
              ? <div className={s.emptyMsg}>Nenhum PR registrado.</div>
              : prs.map((pr,i) => <PrRow key={i} pr={pr} color={color} />)
            }
          </div>

          <div className={s.section}>
            <div className={s.sectionTitle}>Objetivos</div>
            {athGoals.length === 0
              ? <div className={s.emptyMsg}>Nenhum objetivo definido.</div>
              : athGoals.map(g => (
                  <GoalRow key={g.id} goal={g} color={color}
                    expanded={expandedGoals.has(g.id)} onToggle={() => toggleGoal(g.id)} />
                ))
            }
          </div>
        </div>
      </>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <>
      {topbar}
      <div className={s.page}>
        <div className={s.sectionLabel}>Todos os Atletas</div>
        {athletes.length === 0
          ? <div className={s.emptyMsg}>Nenhum atleta registrado.</div>
          : <div className={s.athleteGrid}>
              {athletes.map(a => {
                const goals = (goalsData.athleteGoals||{})[a.id] || []
                const pct = goals.length>0 ? Math.round(goals.reduce((sum,g) => sum+(g.totalSessions>0?g.completedSessions/g.totalSessions:0), 0)/goals.length*100) : null
                const color = a.color || '#555'
                return (
                  <div key={a.id} className={s.athCard} style={{ borderLeft: `3px solid ${color}` }} onClick={() => selectAthlete(a.id)}>
                    <div className={s.athCardTop}>
                      <div className={s.athDot} style={{ background: color }} />
                      <span className={s.athName}>{a.name}</span>
                      {pct !== null && <span className={s.athPct}>{pct}%</span>}
                    </div>
                    {pct !== null
                      ? <div className={s.hpMini}>
                          {Array.from({length:10}, (_,bi) => {
                            const fill = pct>=(bi+1)*10?1:pct>bi*10?(pct-bi*10)/10:0
                            return <div key={bi} className={s.hpBlock}><div className={s.hpFill} style={{ width:fill*100+'%',background:fill===1?color:color+'99' }} /></div>
                          })}
                        </div>
                      : <div className={s.noGoals}>{goals.length===0 ? 'Nenhum objetivo' : goals.length+' objetivo'+(goals.length>1?'s':'')}</div>
                    }
                  </div>
                )
              })}
            </div>
        }
      </div>
    </>
  )
}
