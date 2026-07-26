import { useState, useEffect, useRef, useMemo } from 'react';
import {
  loadResults, saveResults,
  loadAthletes,
  loadSettings, saveSettings,
  uid,
} from '../../utils/storage';
import { APP_CONFIG, GF } from '../../utils/config';
import { exVolStr, rankResults, scaleColor, isTimeBlock, isWodBlock, deriveScale, SCALES, blkMeta } from '../../public/lib/wod.js';
import { toISO, MONTH_PT, DAY_PT_TITLE, monthGridCells } from '../../public/lib/week.js';
import { sessName } from '../../public/lib/sessions.js';
import { useIsMobile } from '../../hooks/useIsMobile';

// ── Constants ─────────────────────────────────────────────────────────────────
const PRESENCE        = ['Presente', 'Ausente', 'Justificado'];
const LEVEL_CLS       = { Iniciante:'lv-ini', Intermediário:'lv-int', Avançado:'lv-adv', Competidor:'lv-comp' };
const SCALE_CLS       = { RX:'sc-rx', Inter:'sc-inter', SC:'sc-sc', Adaptado:'sc-adap' };

// ── Module-level helpers ──────────────────────────────────────────────────────
function getWeeksInMonth(year, month) {
  return monthGridCells(year, month).map(week => ({ start: week[0].date, end: week[6].date }));
}

function weekLabel(week, year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const s = week.start.getMonth() === month ? week.start.getDate() : 1;
  const e = week.end.getMonth() === month ? week.end.getDate() : lastDay;
  return `${s}–${e}`;
}

// ── KPI helpers ───────────────────────────────────────────────────────────────
function calcKPIs(athleteId, results) {
  const ar = results.filter(r => r.athleteId === athleteId);
  const present = ar.filter(r => r.presence === 'Presente').length;
  const freq = ar.length > 0 ? Math.round(present / ar.length * 100) : 0;
  const rpes = ar.flatMap(r => r.blocks?.map(b => b.rpe).filter(Boolean) || []);
  const avgRpe = rpes.length > 0 ? (rpes.reduce((a,b) => a+b,0) / rpes.length).toFixed(1) : null;
  // Only scales an athlete actually chose count (plans/22 rules 1, 3, 5): a null
  // (never-picked, or nulled pre-#61 fabricated) scale is dropped from both sides,
  // so the rate is — until a real one exists, never a flattering 0% or a fake RX.
  const scales = ar.flatMap(r => r.blocks?.map(b => b.scale).filter(Boolean) || []);
  const rxCount = scales.filter(s => s==='RX').length;
  const rxRate = scales.length > 0 ? Math.round(rxCount / scales.length * 100) : null;
  const loadMap = {};
  ar.forEach(r => { r.blocks?.forEach(b => { if (b.exerciseName && b.load) { if (!loadMap[b.exerciseName]) loadMap[b.exerciseName]=[]; loadMap[b.exerciseName].push({date:r.date,load:parseFloat(b.load)}); } }); });
  let loadTrend = null;
  Object.entries(loadMap).forEach(([name,entries]) => {
    if (entries.length >= 3) {
      const sorted = entries.sort((a,b) => a.date.localeCompare(b.date));
      const diff = ((sorted[sorted.length-1].load - sorted[0].load) / sorted[0].load * 100).toFixed(1);
      if (!loadTrend || Math.abs(diff) > Math.abs(loadTrend.diff)) loadTrend = {name,first:sorted[0].load,last:sorted[sorted.length-1].load,diff:parseFloat(diff)};
    }
  });
  const lastRpes = ar.slice(-8).map(r => { const rs=r.blocks?.map(b=>b.rpe).filter(Boolean)||[]; return rs.length>0?rs.reduce((a,b)=>a+b,0)/rs.length:null; }).filter(Boolean);
  return { freq, avgRpe, rxRate, rxCount, scaleCount: scales.length, loadTrend, lastRpes, totalSessions: present };
}

function calcSessionKPIs(dateKey, results) {
  const sr = results.filter(r => r.date===dateKey && r.presence==='Presente');
  if (!sr.length) return null;
  const allRpe = sr.flatMap(r => r.blocks?.map(b=>b.rpe).filter(Boolean)||[]);
  const avgRpe = allRpe.length>0 ? (allRpe.reduce((a,b)=>a+b,0)/allRpe.length).toFixed(1) : null;
  const allScales = sr.flatMap(r => r.blocks?.map(b=>b.scale).filter(Boolean)||[]);
  const scaleDist = {RX:0,Inter:0,SC:0,Adaptado:0};
  allScales.forEach(s => { if (scaleDist[s]!==undefined) scaleDist[s]++; });
  // null (not 0%) with no real scales — 0% reads as "logged, all scaled" and its
  // colour threshold would score no-data as "bad" (plans/22 rules 1, 5).
  const rxPct = allScales.length>0 ? Math.round(scaleDist.RX/allScales.length*100) : null;
  const flags = sr.filter(r=>r.flagForReview).length;
  return {avgRpe,rxPct,scaleDist,scaleTotal:allScales.length,flags,count:sr.length};
}


function getPerformanceStr(r, blockType) {
  if (isTimeBlock(blockType)) return r.perfTime||'—';
  const parts=[];
  if (r.perfRounds) parts.push(`${r.perfRounds} rds`);
  if (r.perfReps)   parts.push(`${r.perfReps} reps`);
  return parts.join(' + ') || '—';
}

// ── SparkLine ─────────────────────────────────────────────────────────────────
function SparkLine({ values }) {
  if (!values||!values.length) return null;
  const max = Math.max(...values, 10);
  return (
    <div className="sparkline">
      {values.map((v,i) => (
        <div key={i} className="sparkline-bar"
          style={{height:`${Math.round(v/max*100)}%`,background:v>=8?'#e05050':v>=6?'#e0a030':'#60a840',flex:1}} />
      ))}
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, colorClass, children }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${colorClass||''}`}>{value??'—'}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {children}
    </div>
  );
}

// ── RegistroView ──────────────────────────────────────────────────────────────
function RegistroView({ athletes, sessions, results, setResults, preload, onPreloadConsumed }) {
  const today = new Date();
  const [viewYear,    setViewYear]    = useState(today.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(today.getMonth());
  const [viewWeekIdx, setViewWeekIdx] = useState(0);
  const [selKey,      setSelKey]      = useState(null);
  const [selAthlete,  setSelAthlete]  = useState(null);
  const [mobilePanel, setMobilePanel] = useState(1);
  const [addOpen,     setAddOpen]     = useState(false);
  const [p2Del,       setP2Del]       = useState(null);

  const [presence,    setPresence]    = useState('Presente');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [blockLogs,   setBlockLogs]   = useState([]);
  const [coachNote,   setCoachNote]   = useState('');
  const [showNote,    setShowNote]    = useState(false);
  const [flag,        setFlag]        = useState(false);
  const [delConfirm,  setDelConfirm]  = useState(false);
  const [saveFlash,   setSaveFlash]   = useState(false);

  const isMobile = useIsMobile(800);

  const weeks = useMemo(() => getWeeksInMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  useEffect(() => {
    const d = new Date();
    if (d.getFullYear()===viewYear && d.getMonth()===viewMonth) {
      const idx = weeks.findIndex(w => d>=w.start && d<=w.end);
      setViewWeekIdx(idx>=0 ? idx : 0);
    } else {
      setViewWeekIdx(0);
    }
  }, [viewYear, viewMonth, weeks.length]);

  const selWeek = weeks[viewWeekIdx] ?? weeks[0];

  const weekDays = useMemo(() => {
    if (!selWeek) return [];
    return Array.from({length:7}, (_,i) => {
      const d = new Date(selWeek.start.getFullYear(), selWeek.start.getMonth(), selWeek.start.getDate()+i);
      return { date:d, dk:toISO(d), daySessions:sessions[toISO(d)]||[] };
    });
  }, [selWeek, sessions]);

  const { selDateKey, selSession } = useMemo(() => {
    if (!selKey) return { selDateKey:null, selSession:null };
    const [dk, sid] = selKey.split('|');
    const sArr = sessions[dk]||[];
    return { selDateKey:dk, selSession:sArr.find(s=>s.id===sid)||null };
  }, [selKey, sessions]);

  const loggedAthMap = useMemo(() => {
    if (!selDateKey||!selSession) return {};
    const m = {};
    results.filter(r => r.date===selDateKey && (r.sessionId===selSession.id || (!r.sessionId&&!selSession.id)))
           .forEach(r => { m[r.athleteId]=r; });
    return m;
  }, [results, selDateKey, selSession]);

  useEffect(() => {
    if (!preload) return;
    if (preload.date) {
      const d = new Date(preload.date+'T12:00:00');
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
      const sArr = sessions[preload.date]||[];
      if (sArr.length) setSelKey(preload.date+'|'+sArr[0].id);
    }
    if (preload.athleteId) {
      const ath = athletes.find(a=>a.id===preload.athleteId);
      if (ath) { setSelAthlete(ath); if(isMobile) setMobilePanel(3); }
    }
    onPreloadConsumed?.();
  }, [preload]);

  useEffect(() => {
    if (!selAthlete||!selDateKey||!selSession) {
      setBlockLogs([]); setPresence('Presente'); setEnergyLevel(3);
      setCoachNote(''); setFlag(false); setDelConfirm(false); setShowNote(false);
      return;
    }
    const existing = results.find(r =>
      r.date===selDateKey && r.athleteId===selAthlete.id &&
      (r.sessionId===selSession.id || (!r.sessionId&&!selSession.id))
    );
    const wodBlocks = (selSession.blocks||[]).filter(isWodBlock);
    if (existing) {
      setPresence(existing.presence||'Presente');
      setEnergyLevel(existing.energyLevel||3);
      setCoachNote(existing.coachNote||'');
      setFlag(existing.flagForReview||false);
      setBlockLogs(wodBlocks.map(b => {
        const eb=(existing.blocks||[]).find(eb=>eb.blockId===b.id)||{};
        return { blockId:b.id,blockType:b.type,blockLabel:b.label||b.type,scale:eb.scale||null,perfTime:eb.perfTime||'',perfRounds:eb.perfRounds||'',perfReps:eb.perfReps||'',rpe:eb.rpe||null };
      }));
    } else {
      setPresence('Presente'); setEnergyLevel(3); setCoachNote(''); setFlag(false);
      setBlockLogs(wodBlocks.map(b => ({ blockId:b.id,blockType:b.type,blockLabel:b.label||b.type,scale:null,perfTime:'',perfRounds:'',perfReps:'',rpe:null })));
    }
    setDelConfirm(false); setShowNote(false);
  }, [selAthlete?.id, selDateKey, selSession?.id]);

  const updBlock = (i,f,v) => setBlockLogs(prev => { const n=[...prev]; n[i]={...n[i],[f]:v}; return n; });

  const saveLog = () => {
    if (!selAthlete||!selDateKey||!selSession) return;
    // Reuse the existing row's id on every re-save. Minting a fresh uid() here
    // (the old behavior) meant every edit inserted a brand-new results_v2 row
    // instead of updating one — the 2nd save for the same athlete+session then
    // violated the table's unique(athlete_id, session_id) constraint, and since
    // saveResults() upserts the WHOLE local results array in one batch, that one
    // conflicting row failed the entire upsert silently (console.warn only) while
    // the UI still flashed "Salvo" (#61c).
    const existing = results.find(r=>r.date===selDateKey&&r.athleteId===selAthlete.id&&(r.sessionId===selSession.id||(!r.sessionId&&!selSession.id)));
    const entry = { id:existing?.id||uid(), date:selDateKey, athleteId:selAthlete.id, sessionId:selSession.id, presence, energyLevel, blocks:presence==='Presente'?blockLogs:[], coachNote, flagForReview:flag, loggedByAthlete:false };
    const updated = [...results.filter(r=>r!==existing), entry];
    setResults(updated); saveResults(updated);
    setSaveFlash(true); setTimeout(()=>setSaveFlash(false),1800);
  };

  const deleteResult = (athleteId) => {
    if (!selDateKey||!selSession) return;
    const updated = results.filter(r=>!(r.date===selDateKey&&r.athleteId===athleteId&&(r.sessionId===selSession.id||(!r.sessionId&&!selSession.id))));
    setResults(updated); saveResults(updated); setP2Del(null);
    if (selAthlete?.id===athleteId) { setSelAthlete(null); if(isMobile) setMobilePanel(2); }
  };

  const prevMonth = () => { if (viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1); };

  const rpeColor = rpe => {
    if (!rpe) return '#554a3a';
    const t=(rpe-1)/9;
    return `rgb(${Math.round(t<.5?2*t*(224-96)+96:224)},${Math.round(t<.5?168:168-2*(t-.5)*88)},64)`;
  };

  const resultSummary = r => {
    if (r.presence!=='Presente') return r.presence;
    const perfs=(r.blocks||[]).flatMap(b=>b.perfTime?[b.perfTime]:b.perfRounds?[`${b.perfRounds}rds`]:[]);
    const rpes=(r.blocks||[]).map(b=>b.rpe).filter(Boolean);
    const avgRpe=rpes.length?(rpes.reduce((a,b)=>a+b,0)/rpes.length).toFixed(0):null;
    return [...perfs,avgRpe?`RPE ${avgRpe}`:null].filter(Boolean).join(' · ')||'Presente';
  };

  // ── Panel 1 ───────────────────────────────────────────────────────────────
  const renderP1 = () => (
    <div className="rp-p1">
      <div className="rp-sticktop">
        <div className="rp-month-nav">
          <button type="button" className="rp-nav-btn" onClick={prevMonth}>‹</button>
          <span className="rp-month-label">{MONTH_PT[viewMonth]} {viewYear}</span>
          <button type="button" className="rp-nav-btn" onClick={nextMonth}>›</button>
        </div>
        <div className="rp-weeks">
          {weeks.map((w,i) => (
            <button key={i} type="button" className={`rp-week-btn${viewWeekIdx===i?' on':''}`}
              onClick={()=>setViewWeekIdx(i)}>
              {weekLabel(w,viewYear,viewMonth)}
            </button>
          ))}
        </div>
      </div>
      {weekDays.map(({date,dk,daySessions:ds}) => {
        const inMonth = date.getMonth()===viewMonth;
        const dayName = DAY_PT_TITLE[date.getDay()];
        const dayNum  = date.getDate();
        if (!inMonth) return <div key={dk} className="rp-rest-day" style={{opacity:.3}}>{dayName} {dayNum}</div>;
        return (
          <div key={dk}>
            <div className="rp-day-hdr">{dayName} {String(dayNum).padStart(2,'0')}</div>
            {ds.length===0 ? (
              <div className="rp-rest-day">— descanso</div>
            ) : ds.map(sess => {
              const k=`${dk}|${sess.id}`;
              const logged=results.filter(r=>r.date===dk&&(r.sessionId===sess.id||(!r.sessionId&&!sess.id))).length;
              const on=selKey===k;
              return (
                <div key={k} className={`rp-sess-card${on?' on':''}`}
                  onClick={()=>{setSelKey(k);setSelAthlete(null);setAddOpen(false);if(isMobile)setMobilePanel(2);}}>
                  <div className="rp-sess-name">{sessName(sess, dk)}</div>
                  <div className="rp-sess-sub">
                    <span style={{color:logged>0?'#4ac8c0':'#554a3a'}}>{logged}/{athletes.length} reg.</span>
                    {(sess.blocks||[]).filter(isWodBlock).slice(0,2).map((b,i)=>(
                      <span key={i} style={{fontSize:9,background:'#161210',padding:'1px 5px',color:'#554a3a',border:'1px solid #2a231c'}}>
                        {b.label||b.type}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  // ── Panel 2 ───────────────────────────────────────────────────────────────
  const renderP2 = () => {
    if (!selSession) return (
      <div className="rp-p2">
        <div className="rp-p2-empty">
          <i className="ti ti-calendar-event" style={{fontSize:28,marginBottom:6}} />
          Selecione uma sessão
        </div>
      </div>
    );
    const loggedIds    = new Set(Object.keys(loggedAthMap));
    const loggedList   = athletes.filter(a=>loggedIds.has(a.id));
    const unloggedList = athletes.filter(a=>!loggedIds.has(a.id));
    const dateLabel    = new Date(selDateKey+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
    return (
      <div className="rp-p2">
        {isMobile && (
          <button type="button" className="rp-mobile-back" onClick={()=>setMobilePanel(1)}>
            <i className="ti ti-chevron-left" /> Semana
          </button>
        )}
        <div className="rp-sticktop">
          <div className="rp-p2-hdr">
            <div className="rp-p2-title">{sessName(selSession, selDateKey)}</div>
            <div className="rp-p2-meta">{dateLabel}</div>
          </div>
        </div>
        {loggedList.map(a => {
          const r=loggedAthMap[a.id], on=selAthlete?.id===a.id, del=p2Del===a.id;
          return (
            <div key={a.id} className={`rp-ath-row${on?' on':''}`}
              onClick={()=>{if(del)return;setSelAthlete(a);setAddOpen(false);if(isMobile)setMobilePanel(3);}}>
              <div className="rp-ath-dot" style={{background:a.color||'#e87820'}} />
              <div className="rp-ath-info">
                <div className="rp-ath-name">{a.name}</div>
                <div className="rp-ath-logged">{resultSummary(r)}</div>
              </div>
              {del ? (
                <div className="rp-del-inline" onClick={e=>e.stopPropagation()}>
                  <span style={{fontSize:10,color:'#e05050',whiteSpace:'nowrap'}}>Excluir?</span>
                  <button type="button" className="b bd bsm" style={{minWidth:34,padding:'2px 6px',fontSize:10}} onClick={()=>deleteResult(a.id)}>Sim</button>
                  <button type="button" className="b bsm"    style={{minWidth:34,padding:'2px 6px',fontSize:10}} onClick={()=>setP2Del(null)}>Não</button>
                </div>
              ) : (
                <button type="button" className="b bd bsm" style={{minWidth:28,padding:'3px 7px',flexShrink:0}}
                  onClick={e=>{e.stopPropagation();setP2Del(a.id);}}>
                  <i className="ti ti-trash" />
                </button>
              )}
            </div>
          );
        })}
        {loggedList.length===0 && (
          <div style={{padding:'14px 12px',fontSize:11,color:'#806850',textAlign:'center'}}>
            Nenhum resultado registrado ainda.
          </div>
        )}
        {unloggedList.length>0 && (
          <>
            <button type="button" className="rp-add-btn" onClick={()=>setAddOpen(o=>!o)}>
              <i className={`ti ti-${addOpen?'minus':'plus'}`} />
              {addOpen?'Fechar':'Registrar atleta'}
            </button>
            {addOpen && (
              <div className="rp-add-dropdown">
                {unloggedList.map(a=>(
                  <div key={a.id} className="rp-add-item"
                    onClick={()=>{setSelAthlete(a);setAddOpen(false);if(isMobile)setMobilePanel(3);}}>
                    <div className="rp-ath-dot" style={{background:a.color||'#e87820',width:7,height:7}} />
                    {a.name}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ── Panel 3 ───────────────────────────────────────────────────────────────
  const renderP3 = () => {
    if (!selAthlete||!selSession) return (
      <div className="rp-p3">
        <div className="rp-p3-empty">
          <i className="ti ti-user-circle" style={{fontSize:32,marginBottom:6}} />
          Selecione um atleta
        </div>
      </div>
    );
    const hasResult = !!loggedAthMap[selAthlete.id];
    const wodBlocks = (selSession.blocks||[]).filter(isWodBlock);
    return (
      <div className="rp-p3">
        {isMobile && (
          <button type="button" className="rp-mobile-back" onClick={()=>{setMobilePanel(2);setSelAthlete(null);}}>
            <i className="ti ti-chevron-left" /> Atletas
          </button>
        )}
        <div className="rp-sticktop">
          <div className="rp-p3-hdr">
            <div className="rp-ath-dot" style={{background:selAthlete.color||'#e87820',width:10,height:10}} />
            <div className="rp-p3-name">{selAthlete.name}</div>
            {selAthlete.level && <span className={`level-badge ${LEVEL_CLS[selAthlete.level]||'lv-ini'}`}>{selAthlete.level}</span>}
            {saveFlash && <span style={{marginLeft:'auto',fontSize:11,color:'#4ac8c0',display:'flex',alignItems:'center',gap:4}}><i className="ti ti-check"/> Salvo</span>}
          </div>
        </div>
        <div className="rp-p3-body">
          {/* Presence */}
          <div style={{marginBottom:10}}>
            <div className="lbl" style={{marginBottom:5}}>Presença</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {PRESENCE.map(p=>(
                <button key={p} type="button" className="b bsm"
                  style={{background:presence===p?'var(--theme-accent)':'transparent',color:presence===p?'var(--theme-accent-text)':'#806850',borderColor:presence===p?'var(--theme-accent)':'#2a231c'}}
                  onClick={()=>setPresence(p)}>{p}</button>
              ))}
            </div>
          </div>
          {/* Energy */}
          {presence==='Presente' && (
            <div style={{marginBottom:10}}>
              <div className="lbl" style={{marginBottom:5}}>Energia pré-treino</div>
              <div style={{display:'flex',gap:4}}>
                {[1,2,3,4,5].map(n=>(
                  <button key={n} type="button" className="b bsm"
                    style={{flex:1,fontWeight:700,fontSize:13,background:energyLevel===n?'var(--theme-accent)':'transparent',color:energyLevel===n?'var(--theme-accent-text)':'#806850',borderColor:energyLevel===n?'var(--theme-accent)':'#2a231c'}}
                    onClick={()=>setEnergyLevel(n)}>{n}</button>
                ))}
              </div>
            </div>
          )}
          {/* WOD blocks */}
          {presence==='Presente' && blockLogs.map((bl,i)=>{
            const sessbl=(selSession.blocks||[]).find(b=>b.id===bl.blockId);
            const rpeCol=rpeColor(bl.rpe);
            const exercises=(sessbl?.exercises||[]).filter(e=>e.name);
            return (
              <div key={bl.blockId} className="rp-block-card">
                <div className="rp-block-label">
                  {bl.blockLabel!==bl.blockType?`${bl.blockLabel} · `:''}
                  {bl.blockType}
                  {sessbl && blkMeta(sessbl) ? ` ${blkMeta(sessbl)}` : ''}
                </div>
                <div className="rp-block-body">
                  {exercises.length>0 && (
                    <div className="rp-wod-summary">
                      {exercises.map((ex,ei)=>{
                        const vol=exVolStr(ex);
                        return (
                          <div key={ei} className="rp-wod-ex">
                            {vol&&<span style={{color:'#d8a840',fontWeight:700,flexShrink:0}}>{vol}</span>}
                            <span>{ex.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="rp-scale-row">
                    {SCALES.map(s=>(
                      <button key={s} type="button" className={`rp-scale-btn${bl.scale===s?' on':''}`}
                        onClick={()=>updBlock(i,'scale',s)}>{s}</button>
                    ))}
                  </div>
                  {isTimeBlock(bl.blockType) ? (
                    <div className="rp-perf-row">
                      <span className="rp-perf-lbl">Tempo</span>
                      <input className="rp-perf-input" type="text" inputMode="numeric" placeholder="MM:SS"
                        value={bl.perfTime} onChange={e=>updBlock(i,'perfTime',e.target.value)} />
                    </div>
                  ):(
                    <div className="rp-perf-row">
                      <span className="rp-perf-lbl">Rounds</span>
                      <input className="rp-perf-input" type="number" inputMode="numeric" min="0" placeholder="0"
                        style={{width:52}} value={bl.perfRounds} onChange={e=>updBlock(i,'perfRounds',e.target.value)} />
                      <span className="rp-perf-lbl">Reps</span>
                      <input className="rp-perf-input" type="number" inputMode="numeric" min="0" placeholder="0"
                        style={{width:52}} value={bl.perfReps} onChange={e=>updBlock(i,'perfReps',e.target.value)} />
                    </div>
                  )}
                  <div className="rp-rpe-row">
                    <span style={{fontSize:11,fontWeight:700,color:rpeCol,width:56,flexShrink:0}}>RPE {bl.rpe??'—'}</span>
                    <div className="rp-rpe-bar">
                      {Array.from({length:10},(_,bi)=>{
                        const t=bi/9,r=Math.round(t<.5?2*t*(224-96)+96:224),g=Math.round(t<.5?168:168-2*(t-.5)*88);
                        return <div key={bi} className="rp-rpe-seg"
                          style={{background:bi<bl.rpe?`rgb(${r},${g},64)`:'#1a1a1a'}}
                          onClick={()=>updBlock(i,'rpe',bi+1)} />;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {presence==='Presente'&&wodBlocks.length===0&&(
            <div style={{fontSize:12,color:'#806850',marginBottom:10,padding:'10px 0'}}>Nenhum bloco WOD nesta sessão.</div>
          )}
          {/* Coach note */}
          <div style={{marginBottom:10}}>
            <button type="button" className="b bsm"
              style={{width:'100%',justifyContent:'space-between',color:showNote?'var(--theme-accent)':'#806850',borderColor:showNote?'var(--theme-accent)':'#2a231c'}}
              onClick={()=>setShowNote(n=>!n)}>
              <span><i className="ti ti-notes" style={{marginRight:5}}/>Nota do coach</span>
              <i className={`ti ti-chevron-${showNote?'up':'down'}`}/>
            </button>
            {showNote&&(
              <textarea placeholder="Observações gerais..." value={coachNote} onChange={e=>setCoachNote(e.target.value)}
                style={{width:'100%',marginTop:6,minHeight:56,background:'#161210',border:'1px solid #2a231c',color:'#c8b090',fontFamily:'inherit',fontSize:12,padding:'7px 8px',outline:'none',resize:'vertical',boxSizing:'border-box'}} />
            )}
          </div>
          {/* Flag */}
          <div style={{marginBottom:12}}>
            <button type="button" className="b bsm"
              style={{background:flag?'#3a1010':'transparent',color:flag?'#e05050':'#806850',borderColor:flag?'#601818':'#2a231c'}}
              onClick={()=>setFlag(f=>!f)}>
              <i className="ti ti-flag"/> {flag?'Marcado para revisão':'Marcar para revisão'}
            </button>
          </div>
          {/* Save + delete */}
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button type="button" className="b bp" style={{flex:1}}
              disabled={presence==='Presente'&&blockLogs.some(b=>!b.scale||!b.rpe)}
              onClick={saveLog}>
              <i className="ti ti-check"/> Salvar
            </button>
            {hasResult&&!delConfirm&&(
              <button type="button" className="b bd bsm" style={{minWidth:36,padding:'8px 10px'}}
                onClick={()=>setDelConfirm(true)}>
                <i className="ti ti-trash"/>
              </button>
            )}
            {hasResult&&delConfirm&&(
              <>
                <span style={{fontSize:11,color:'#e05050',flexShrink:0}}>Excluir?</span>
                <button type="button" className="b bd bsm" style={{minWidth:40,padding:'6px 8px',fontSize:11}}
                  onClick={()=>{deleteResult(selAthlete.id);setDelConfirm(false);}}>Sim</button>
                <button type="button" className="b bsm" style={{minWidth:40,padding:'6px 8px',fontSize:11}}
                  onClick={()=>setDelConfirm(false)}>Não</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isMobile) return (
    <div>
      {mobilePanel===1&&renderP1()}
      {mobilePanel===2&&renderP2()}
      {mobilePanel===3&&renderP3()}
    </div>
  );

  return (
    <div className="rp-layout">
      {renderP1()}
      {renderP2()}
      {renderP3()}
    </div>
  );
}

// ── HistoryView ───────────────────────────────────────────────────────────────
function HistoryView({ athletes, sessions, results }) {
  const [subTab,      setSubTab]      = useState('athlete');
  const [selAthlete,  setSelAthlete]  = useState('');
  const [selDate,     setSelDate]     = useState('');

  const sessionDates   = Object.keys(sessions).filter(k=>sessions[k]?.length>0).sort().reverse();
  const athleteKPIs    = selAthlete ? calcKPIs(selAthlete, results) : null;
  const athleteResults = selAthlete ? results.filter(r=>r.athleteId===selAthlete).sort((a,b)=>b.date.localeCompare(a.date)) : [];
  const sessionKPIs    = selDate ? calcSessionKPIs(selDate, results) : null;
  const sessionResults = selDate ? results.filter(r=>r.date===selDate&&r.presence==='Presente') : [];

  return (
    <div>
      <div className="res-tabs">
        <button type="button" className={`res-tab ${subTab==='athlete'?'on':''}`} onClick={()=>setSubTab('athlete')}>Por atleta</button>
        <button type="button" className={`res-tab ${subTab==='session'?'on':''}`} onClick={()=>setSubTab('session')}>Por sessão</button>
      </div>

      {subTab==='athlete' && (
        <div>
          <div className="sc-card" style={{padding:12}}>
            <div className="fg">
              <span className="lbl">Selecionar atleta</span>
              <select value={selAthlete} onChange={e=>setSelAthlete(e.target.value)}>
                <option value="">— Selecionar —</option>
                {athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          {selAthlete&&athleteKPIs&&(
            <div>
              <div className="kpi-grid">
                <KpiCard label="Frequência" value={`${athleteKPIs.freq}%`} sub={`${athleteKPIs.totalSessions} sessões presentes`} colorClass={athleteKPIs.freq>=80?'kpi-good':athleteKPIs.freq>=60?'kpi-warn':'kpi-bad'} />
                <KpiCard label="RPE médio" value={athleteKPIs.avgRpe||'—'} sub="Média de esforço percebido" colorClass={athleteKPIs.avgRpe?athleteKPIs.avgRpe<=7?'kpi-good':athleteKPIs.avgRpe<=8.5?'kpi-warn':'kpi-bad':''}>
                  {athleteKPIs.lastRpes.length>0&&<div style={{marginTop:8}}><SparkLine values={athleteKPIs.lastRpes}/></div>}
                </KpiCard>
                <KpiCard label="Taxa RX" value={athleteKPIs.rxRate!==null?`${athleteKPIs.rxRate}%`:'—'} sub={athleteKPIs.rxRate!==null?`RX em ${athleteKPIs.rxCount} de ${athleteKPIs.scaleCount} escalas`:'Registre uma escala real'} colorClass={athleteKPIs.rxRate!==null?athleteKPIs.rxRate>=60?'kpi-good':athleteKPIs.rxRate>=30?'kpi-warn':'kpi-bad':''} />
                {athleteKPIs.loadTrend&&<KpiCard label="Evolução de carga" value={`${athleteKPIs.loadTrend.diff>0?'+':''}${athleteKPIs.loadTrend.diff}%`} sub={`${athleteKPIs.loadTrend.name} · ${athleteKPIs.loadTrend.first}→${athleteKPIs.loadTrend.last}kg`} colorClass={athleteKPIs.loadTrend.diff>0?'kpi-good':athleteKPIs.loadTrend.diff<0?'kpi-bad':'kpi-warn'} />}
              </div>
              <div className="sc-card">
                <div className="sc-hdr"><span className="sc-title">Histórico</span></div>
                {athleteResults.length===0
                  ? <div className="empty-state">Nenhum resultado registrado ainda.</div>
                  : athleteResults.map(r=>{
                      const dt=new Date(r.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'});
                      const sn=sessions[r.date]?.[0]?.mainTraining||'';
                      const rpes=r.blocks?.map(b=>b.rpe).filter(Boolean)||[];
                      const avgRpe=rpes.length>0?(rpes.reduce((a,b)=>a+b,0)/rpes.length).toFixed(1):null;
                      const topScale=(r.blocks?.map(b=>b.scale).filter(Boolean)||[])[0]||null;
                      return (
                        <div key={r.id} className="history-row">
                          <div className={`presence-dot pd-${r.presence?.toLowerCase()}`}/>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                              <span style={{fontSize:13,fontWeight:600,color:'#ddd'}}>{dt}</span>
                              {sn&&<span style={{fontSize:11,color:'#555'}}>{sn}</span>}
                              {topScale&&<span className={`scale-badge ${SCALE_CLS[topScale]||'sc-sc'}`}>{topScale}</span>}
                              {r.flagForReview&&<i className="ti ti-flag flag-icon"/>}
                            </div>
                            {r.presence!=='Presente'
                              ? <div style={{fontSize:11,color:'#555'}}>{r.presence}</div>
                              : <div style={{display:'flex',gap:12,marginTop:3,flexWrap:'wrap'}}>
                                  {avgRpe&&<span style={{fontSize:11,color:'#f5c842'}}>RPE {avgRpe}</span>}
                                  {r.coachNote&&<span style={{fontSize:11,color:'#555',fontStyle:'italic'}}>{r.coachNote}</span>}
                                </div>
                            }
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          )}
        </div>
      )}

      {subTab==='session' && (
        <div>
          <div className="sc-card" style={{padding:12}}>
            <div className="fg">
              <span className="lbl">Selecionar sessão</span>
              <select value={selDate} onChange={e=>setSelDate(e.target.value)}>
                <option value="">— Selecionar —</option>
                {sessionDates.map(d=>{
                  const dt=new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'});
                  return <option key={d} value={d}>{dt} — {sessions[d]?.[0]?.mainTraining||''}</option>;
                })}
              </select>
            </div>
          </div>
          {selDate&&sessionKPIs&&(
            <div>
              <div className="kpi-grid">
                <KpiCard label="RPE médio da turma" value={sessionKPIs.avgRpe||'—'} sub={`${sessionKPIs.count} atletas presentes`} colorClass={sessionKPIs.avgRpe?sessionKPIs.avgRpe<=7?'kpi-good':sessionKPIs.avgRpe<=8.5?'kpi-warn':'kpi-bad':''} />
                <KpiCard label="Taxa RX" value={sessionKPIs.rxPct!==null?`${sessionKPIs.rxPct}%`:'—'} sub={sessionKPIs.rxPct!==null?`RX em ${sessionKPIs.scaleDist.RX} de ${sessionKPIs.scaleTotal} escalas`:'Sem escalas registradas'} colorClass={sessionKPIs.rxPct!==null?(sessionKPIs.rxPct>=60?'kpi-good':sessionKPIs.rxPct>=30?'kpi-warn':'kpi-bad'):''} />
                <KpiCard label="Flags" value={sessionKPIs.flags} sub="Atletas marcados para revisão" colorClass={sessionKPIs.flags===0?'kpi-good':sessionKPIs.flags<=2?'kpi-warn':'kpi-bad'} />
                <KpiCard label="Distribuição de escala" value={sessionKPIs.scaleTotal>0?`${sessionKPIs.scaleDist.RX} RX`:'—'} sub={sessionKPIs.scaleTotal>0?`${sessionKPIs.scaleDist.Inter} Inter · ${sessionKPIs.scaleDist.SC} SC · ${sessionKPIs.scaleDist.Adaptado} Adap`:'Sem escalas registradas'} />
              </div>
              {sessionResults.length>0&&(
                <div className="sc-card">
                  <div className="sc-hdr"><span className="sc-title">Resultados da turma</span></div>
                  {sessionResults.map(r=>{
                    const ath=athletes.find(a=>String(a.id)===String(r.athleteId));
                    const rpes=r.blocks?.map(b=>b.rpe).filter(Boolean)||[];
                    const avgRpe=rpes.length>0?(rpes.reduce((a,b)=>a+b,0)/rpes.length).toFixed(1):null;
                    const topScale=r.blocks?.[0]?.scale||null;
                    return (
                      <div key={r.id} className="history-row">
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                            <span style={{fontSize:13,fontWeight:600,color:'#ddd'}}>{ath?.name||'—'}</span>
                            {ath&&<span className={`level-badge ${LEVEL_CLS[ath.level]||'lv-ini'}`}>{ath.level}</span>}
                            {topScale&&<span className={`scale-badge ${SCALE_CLS[topScale]||'sc-sc'}`}>{topScale}</span>}
                            {r.flagForReview&&<i className="ti ti-flag flag-icon"/>}
                          </div>
                          <div style={{display:'flex',gap:12,marginTop:3,flexWrap:'wrap'}}>
                            {avgRpe&&<span style={{fontSize:11,color:'#f5c842'}}>RPE {avgRpe}</span>}
                            {r.coachNote&&<span style={{fontSize:11,color:'#555',fontStyle:'italic'}}>{r.coachNote}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {selDate&&!sessionKPIs&&<div className="empty-state">Nenhum resultado registrado para esta sessão.</div>}
        </div>
      )}
    </div>
  );
}

// Palette for the EXPORTED leaderboard image (#51). It replaces the 20-slot
// lb_colors picker, which predated the 4-theme system and let the coach paint
// this surface — and leaderboard.html — any colors at all, including the cyan
// that made that page ignore the theme entirely.
//
// Concrete hex, not tokens: html2canvas rasterises the DOM and cannot be trusted
// with color-mix(). The values mirror themes.css's totk-dark + --podium-1/2/3,
// so the shared image looks like the app. Scale badges use the canonical
// SCALE_COL data colors, same as RankList.
const LB_IMG = {
  bg: '#0d0b09', rowAlt: '#161210', divider: '#2a231c',
  hdrBg: '#161210', hdrBorder: '#b88820', hdrTitle: '#d8a840', hdrSub: '#806850',
  rank: '#806850', name: '#f0e8d0', perf: '#f0e8d0', emptyText: '#554a3a',
  podium:   ['#d8a840', '#b8b8c4', '#c07840'],
  podiumBg: ['rgba(216,168,64,.08)', 'rgba(184,184,196,.08)', 'rgba(192,120,64,.08)'],
};

// ── LeaderboardView ───────────────────────────────────────────────────────────
function LeaderboardView({ athletes, sessions, results }) {
  const [selWod,      setSelWod]      = useState('');
  const [scaleFilter, setScaleFilter] = useState('Todos');
  const imgRef = useRef();

  const wodList = useMemo(()=>{
    const list=[];
    Object.entries(sessions).sort(([a],[b])=>b.localeCompare(a)).forEach(([dateKey,daySessions])=>{
      (daySessions||[]).forEach(sess=>{
        (sess.blocks||[]).filter(isWodBlock).forEach(bl=>{
          const hasRes=results.some(r=>r.date===dateKey&&r.sessionId===sess.id&&r.presence==='Presente'&&(r.blocks||[]).some(rb=>rb.blockId===bl.id&&(rb.perfTime||rb.perfRounds||rb.perfReps)));
          if (hasRes) {
            const dt=new Date(dateKey+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'});
            const label=bl.label&&bl.label!=='-'?bl.label:bl.type;
            const meta=blkMeta(bl);
            list.push({key:`${dateKey}|${sess.id}|${bl.id}`,dateKey,sessId:sess.id,blId:bl.id,blType:bl.type,blLabel:label,meta,sessName:sess.mainTraining||'',dt});
          }
        });
      });
    });
    return list;
  },[sessions,results]);

  const selObj=wodList.find(w=>w.key===selWod)||null;

  const wodResults=useMemo(()=>{
    if (!selObj) return [];
    return results.filter(r=>r.date===selObj.dateKey&&r.sessionId===selObj.sessId&&r.presence==='Presente')
      .map(r=>{
        const blk=(r.blocks||[]).find(b=>b.blockId===selObj.blId)||null;
        if (!blk) return null;
        return {...r,perfTime:blk.perfTime,perfRounds:blk.perfRounds,perfReps:blk.perfReps,scale:deriveScale(blk)};
      }).filter(r=>r&&(r.perfTime||r.perfRounds||r.perfReps));
  },[selObj,results]);

  const scales=['Todos',...SCALES];
  const filtered=scaleFilter==='Todos'?wodResults:wodResults.filter(r=>r.scale===scaleFilter);
  const ranked=selObj?rankResults(filtered,selObj.blType):[];
  const podLabels=['1º','2º','3º'];

  const doExport=async()=>{
    const el=imgRef.current; if(!el) return;
    const html2canvas=(await import('html2canvas')).default;
    const cv=await html2canvas(el,{scale:APP_CONFIG.exportScale||2,backgroundColor:LB_IMG.bg,useCORS:true,logging:false,width:1080,height:el.scrollHeight,windowWidth:1080});
    const a=document.createElement('a');
    const lbl=selObj?`${selObj.dt}-${selObj.blLabel}-${scaleFilter}`.replace(/[^a-zA-Z0-9-]/g,'-').toLowerCase():'leaderboard';
    a.download=`eagles-leaderboard-${lbl}.png`; a.href=cv.toDataURL('image/png'); a.click();
  };

  const handleLoadConfig=()=>{
    const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
    inp.onchange=e=>{
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=ev=>{
        try {
          const cfg=JSON.parse(ev.target.result);
          // cfg.lbColors is ignored now (#51) — the leaderboard renders from theme
          // tokens. An older config file carrying the key still loads fine; that
          // leg is simply dropped.
          const existing=loadSettings();
          const src=cfg.colors?{...cfg,...cfg.colors}:cfg;
          const merged={...existing};
          ['fontScale','exportScale','gymName','wkBg','wkHeader','wkDateNum','wkMainTraining','wkBlockType','wkExName','wkDivider','dvBg','dvGymName','dvDate','dvMainTraining','dvZoneType','dvBlockLabel','dvCap','dvRounds','dvExName','dvIntensity','dvNote','dvBlockNotes','dvDivider','eaGymName','eaDate','eaSubtitle','eaBlockType','eaBlockMeta','eaExName','eaIntensity','eaBlockHdr','eaDivider','mmGymName','mmDate','mmSubtitle','mmBlockType','mmBlockMetaBg','mmBlockMetaText','mmExName','mmIntensity','mmBlockHdr','mmDivider'].forEach(k=>{ if(src[k]!==undefined) merged[k]=src[k]; });
          if(src.mobileEaglesBg||src.eaglesBg)   merged.eaglesBg=src.mobileEaglesBg||src.eaglesBg;
          if(src.mobileMegaManBg||src.megaManBg)  merged.megaManBg=src.mobileMegaManBg||src.megaManBg;
          saveSettings(merged);
          if(cfg.themeAccent)     APP_CONFIG.themeAccent=cfg.themeAccent;
          if(cfg.themeAccentText) APP_CONFIG.themeAccentText=cfg.themeAccentText;
          if(cfg.fontFamily)      APP_CONFIG.fontFamily=cfg.fontFamily;
          if(cfg.googleFontsUrl)  APP_CONFIG.googleFontsUrl=cfg.googleFontsUrl;
          alert('Config carregada! A página irá recarregar.'); setTimeout(()=>window.location.reload(),300);
        } catch(err) { alert('Erro ao ler o arquivo: '+err.message); }
      };
      reader.readAsText(file);
    };
    inp.click();
  };

  const handleSaveConfig=()=>{
    const savedSettings=loadSettings();
    const exportCfg={...savedSettings,appTitle:APP_CONFIG.appTitle,logo:APP_CONFIG.logo||'icon-192.png',themeAccent:APP_CONFIG.themeAccent,themeAccentText:APP_CONFIG.themeAccentText,gymName:APP_CONFIG.gymName,blockColors:APP_CONFIG.blockColors||{},blockNames:APP_CONFIG.blockNames,athleteLevels:APP_CONFIG.athleteLevels,athleteGoals:APP_CONFIG.athleteGoals,restDayLabel:APP_CONFIG.restDayLabel,mobileWeeklyLabels:APP_CONFIG.mobileWeeklyLabels};
    const raw=window.prompt('Nome do arquivo (sem extensão):','config'); if(raw===null) return;
    const fname=(raw.trim().replace(/[^a-zA-Z0-9_-]/g,'-')||'config');
    const blob=new Blob([JSON.stringify(exportCfg,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.download=fname+'.json'; a.href=URL.createObjectURL(blob); a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      {/* The 20-slot "Cores do Leaderboard" picker used to live here (#51). It is
          gone: the leaderboard renders from theme tokens, so the picker was
          editing colors nothing reads any more. The config load/save buttons it
          hosted are kept — they carry the rest of the config. */}
      <div className="sc-card" style={{padding:12,marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:10}}>
          <span className="lbl" style={{margin:0}}>Leaderboard</span>
          <div style={{display:'flex',gap:6}}>
            <button type="button" className="b bsm" onClick={handleLoadConfig}><i className="ti ti-upload"/> Carregar config</button>
            <button type="button" className="b bsm" onClick={handleSaveConfig}><i className="ti ti-download"/> Salvar config.json</button>
          </div>
        </div>
        <div className="g2">
          <div className="fg">
            <span className="lbl">WOD</span>
            <select value={selWod} onChange={e=>setSelWod(e.target.value)}>
              <option value="">— Selecionar —</option>
              {wodList.map(w=><option key={w.key} value={w.key}>{w.dt}{w.sessName?' ('+w.sessName+')':''} — {w.blLabel}{w.meta?' · '+w.meta:''}</option>)}
            </select>
          </div>
          <div className="fg">
            <span className="lbl">Escala</span>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {scales.map(s=>{
                const on=scaleFilter===s, accent=APP_CONFIG.themeAccent||'#4ac8c0';
                return (
                  <button key={s} type="button" className="b bsm" aria-pressed={on}
                    style={{background:on?accent:'transparent',color:on?(APP_CONFIG.themeAccentText||'#000'):'#888',borderColor:on?accent:'#2e2e2e',fontSize:11}}
                    onClick={()=>setScaleFilter(s)}>{s}</button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {selObj ? (
        <div>
          <div ref={imgRef} style={{background:LB_IMG.bg,width:1080,transform:`scale(${Math.min(1,(window.innerWidth-28)/1080)})`,transformOrigin:'top left',marginBottom:`${-1080*(1-Math.min(1,(window.innerWidth-28)/1080))}px`}}>
            <div style={{background:LB_IMG.hdrBg,padding:'20px 28px 16px',borderBottom:`3px solid ${LB_IMG.hdrBorder}`}}>
              <div style={{fontFamily:GF(),fontSize:22,fontWeight:900,color:LB_IMG.hdrTitle,textTransform:'uppercase',letterSpacing:'.1em'}}>Leaderboard</div>
              <div style={{fontFamily:GF(),fontSize:14,color:LB_IMG.hdrSub,marginTop:4,textTransform:'uppercase',letterSpacing:'.06em'}}>
                {selObj.dt} · {selObj.blLabel}{selObj.meta?' · '+selObj.meta:''}{scaleFilter!=='Todos'?' · '+scaleFilter:''}
              </div>
            </div>
            <div style={{padding:'8px 0'}}>
              {ranked.length===0
                ? <div style={{padding:'20px 28px',color:LB_IMG.emptyText,fontFamily:GF(),fontSize:13}}>Nenhum resultado.</div>
                : ranked.map((r,ri)=>{
                    const ath=athletes.find(a=>String(a.id)===String(r.athleteId));
                    const perf=getPerformanceStr(r,selObj.blType);
                    const isPodium=ri<3,pColor=isPodium?LB_IMG.podium[ri]:null;
                    return (
                      <div key={r.id||ri} style={{display:'flex',alignItems:'center',gap:16,padding:'12px 28px',borderBottom:`1px solid ${LB_IMG.divider}`,background:isPodium?LB_IMG.podiumBg[ri]:ri%2===0?LB_IMG.rowAlt:LB_IMG.bg}}>
                        <div style={{fontFamily:GF(),fontSize:18,fontWeight:900,color:pColor||LB_IMG.rank,width:32,flexShrink:0,textAlign:'center'}}>{isPodium?podLabels[ri]:`${ri+1}º`}</div>
                        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                          <div style={{width:10,height:10,borderRadius:'50%',background:ath?.color||LB_IMG.rank,flexShrink:0}}/>
                          <span style={{fontFamily:GF(),fontSize:16,fontWeight:700,color:LB_IMG.name,textTransform:'uppercase',letterSpacing:'.04em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ath?.name||'—'}</span>
                        </div>
                        {r.scale&&r.scale!=='-'&&(
                          <span style={{fontFamily:GF(),fontSize:11,fontWeight:700,color:scaleColor(r.scale),border:`1px solid ${scaleColor(r.scale)}`,padding:'2px 8px',flexShrink:0}}>{r.scale}</span>
                        )}
                        <div style={{fontFamily:GF(),fontSize:16,fontWeight:900,color:pColor||LB_IMG.perf,flexShrink:0,textAlign:'right'}}>{perf}</div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
          <button type="button" className="b bsec" style={{marginTop:10,width:'100%'}} onClick={doExport} disabled={ranked.length===0}>
            <i className="ti ti-download"/> Gerar imagem do leaderboard
          </button>
        </div>
      ):(
        <div className="empty-state">Selecione um WOD para ver o ranking.</div>
      )}
    </div>
  );
}

// ── ResultadosTab (root) ──────────────────────────────────────────────────────
export default function ResultadosTab({ sessions, preload, onPreloadConsumed }) {
  const [subView,  setSubView]  = useState('registro');
  const [athletes] = useState(loadAthletes);
  const [results,  setResults]  = useState(loadResults);

  return (
    <div>
      <div className="res-tabs">
        {[['registro','ti-pencil','Registro'],['history','ti-chart-bar','Histórico / KPIs'],['leaderboard','ti-trophy','Leaderboard']].map(([id,icon,lbl])=>(
          <button key={id} type="button" className={`res-tab ${subView===id?'on':''}`} onClick={()=>setSubView(id)}>
            <i className={`ti ${icon}`}/> {lbl}
          </button>
        ))}
      </div>
      {subView==='registro'     && <RegistroView    athletes={athletes} sessions={sessions} results={results} setResults={setResults} preload={preload} onPreloadConsumed={onPreloadConsumed} />}
      {subView==='history'      && <HistoryView     athletes={athletes} sessions={sessions} results={results} />}
      {subView==='leaderboard'  && <LeaderboardView athletes={athletes} sessions={sessions} results={results} />}
    </div>
  );
}
