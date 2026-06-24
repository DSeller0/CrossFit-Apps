import { useState, useEffect, useRef, useMemo } from 'react';
import {
  loadResults, saveResults,
  loadAthletes,
  loadSettings, saveSettings,
  uid,
} from '../../utils/storage';
import { APP_CONFIG, GF } from '../../utils/config';

// ── Constants ─────────────────────────────────────────────────────────────────
const SCALES          = ['RX', 'Inter', 'SC', 'Adaptado'];
const PRESENCE        = ['Presente', 'Ausente', 'Justificado'];
const LEVEL_CLS       = { Iniciante:'lv-ini', Intermediário:'lv-int', Avançado:'lv-adv', Competidor:'lv-comp' };
const SCALE_CLS       = { RX:'sc-rx', Inter:'sc-inter', SC:'sc-sc', Adaptado:'sc-adap' };
const WOD_BLOCK_TYPES = ['WOD','For Time','AMRAP','EMOM','MetCon','HIIT'];
const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ── Module-level helpers ──────────────────────────────────────────────────────
const dateToDK = d => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
const sessTitle = s => s.sessionName || s.name || (typeof s.mainTraining === 'string' ? s.mainTraining : '') || 'Treino';

function exVolStr(ex) {
  if (ex.intensity?.mode === 'cardio') {
    const val = ex.intensity?.cardioVal;
    if (!val) return '';
    return (ex.name||'').toLowerCase().includes(String(val).toLowerCase()) ? '' : `${val}${ex.intensity?.cardioUnit||'m'}`;
  }
  const rr = ex.reps || '';
  const rd = rr.includes(',') ? rr.split(',').map(r=>r.trim()).join('-') : rr;
  return ex.sets && rd ? `${ex.sets}×${rd}` : rd;
}

function getWeeksInMonth(year, month) {
  const weeks = [];
  const cur = new Date(year, month, 1);
  cur.setDate(cur.getDate() - cur.getDay());
  const lastDay = new Date(year, month + 1, 0);
  while (cur <= lastDay) {
    const end = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 6);
    if (cur.getMonth() === month || end.getMonth() === month)
      weeks.push({ start: new Date(cur), end: new Date(end) });
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

function weekLabel(week, year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const s = week.start.getMonth() === month ? week.start.getDate() : 1;
  const e = week.end.getMonth() === month ? week.end.getDate() : lastDay;
  return `${s}–${e}`;
}

function useIsMobile(bp = 800) {
  const [v, setV] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const fn = () => setV(window.innerWidth < bp);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return v;
}

// ── KPI helpers ───────────────────────────────────────────────────────────────
function calcKPIs(athleteId, results) {
  const ar = results.filter(r => r.athleteId === athleteId);
  const present = ar.filter(r => r.presence === 'Presente').length;
  const freq = ar.length > 0 ? Math.round(present / ar.length * 100) : 0;
  const rpes = ar.flatMap(r => r.blocks?.map(b => b.rpe).filter(Boolean) || []);
  const avgRpe = rpes.length > 0 ? (rpes.reduce((a,b) => a+b,0) / rpes.length).toFixed(1) : null;
  const scales = ar.flatMap(r => r.blocks?.map(b => b.scale).filter(Boolean) || []);
  const rxRate = scales.length > 0 ? Math.round(scales.filter(s => s==='RX').length / scales.length * 100) : null;
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
  return { freq, avgRpe, rxRate, loadTrend, lastRpes, totalSessions: present };
}

function calcSessionKPIs(dateKey, results) {
  const sr = results.filter(r => r.date===dateKey && r.presence==='Presente');
  if (!sr.length) return null;
  const allRpe = sr.flatMap(r => r.blocks?.map(b=>b.rpe).filter(Boolean)||[]);
  const avgRpe = allRpe.length>0 ? (allRpe.reduce((a,b)=>a+b,0)/allRpe.length).toFixed(1) : null;
  const allScales = sr.flatMap(r => r.blocks?.map(b=>b.scale).filter(Boolean)||[]);
  const scaleDist = {RX:0,Inter:0,SC:0,Adaptado:0};
  allScales.forEach(s => { if (scaleDist[s]!==undefined) scaleDist[s]++; });
  const rxPct = allScales.length>0 ? Math.round(scaleDist.RX/allScales.length*100) : 0;
  const flags = sr.filter(r=>r.flagForReview).length;
  return {avgRpe,rxPct,scaleDist,flags,count:sr.length};
}

function rankResults(results, blockType) {
  const isForTime = blockType==='For Time';
  return [...results].sort((a,b) => {
    if (isForTime) { const toS=s=>{if(!s)return Infinity;const p=s.split(':');return p.length===2?parseInt(p[0])*60+parseInt(p[1]):parseInt(s)||Infinity}; return toS(a.perfTime)-toS(b.perfTime); }
    const ra=parseInt(a.perfRounds)||0,rb=parseInt(b.perfRounds)||0;
    if (ra!==rb) return rb-ra;
    return (parseInt(b.perfReps)||0)-(parseInt(a.perfReps)||0);
  });
}

function getPerformanceStr(r, blockType) {
  if (blockType==='For Time') return r.perfTime||'—';
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

  const isMobile = useIsMobile();
  const WOD_SET  = new Set(WOD_BLOCK_TYPES);

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
      return { date:d, dk:dateToDK(d), daySessions:sessions[dateToDK(d)]||[] };
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
    const wodBlocks = (selSession.blocks||[]).filter(b=>WOD_SET.has(b.type));
    if (existing) {
      setPresence(existing.presence||'Presente');
      setEnergyLevel(existing.energyLevel||3);
      setCoachNote(existing.coachNote||'');
      setFlag(existing.flagForReview||false);
      setBlockLogs(wodBlocks.map(b => {
        const eb=(existing.blocks||[]).find(eb=>eb.blockId===b.id)||{};
        return { blockId:b.id,blockType:b.type,blockLabel:b.label||b.type,scale:eb.scale||'RX',perfTime:eb.perfTime||'',perfRounds:eb.perfRounds||'',perfReps:eb.perfReps||'',rpe:eb.rpe||7 };
      }));
    } else {
      setPresence('Presente'); setEnergyLevel(3); setCoachNote(''); setFlag(false);
      setBlockLogs(wodBlocks.map(b => ({ blockId:b.id,blockType:b.type,blockLabel:b.label||b.type,scale:'RX',perfTime:'',perfRounds:'',perfReps:'',rpe:7 })));
    }
    setDelConfirm(false); setShowNote(false);
  }, [selAthlete?.id, selDateKey, selSession?.id]);

  const updBlock = (i,f,v) => setBlockLogs(prev => { const n=[...prev]; n[i]={...n[i],[f]:v}; return n; });

  const saveLog = () => {
    if (!selAthlete||!selDateKey||!selSession) return;
    const entry = { id:uid(), date:selDateKey, athleteId:selAthlete.id, sessionId:selSession.id, presence, energyLevel, blocks:presence==='Presente'?blockLogs:[], coachNote, flagForReview:flag, loggedByAthlete:false };
    const updated = [...results.filter(r=>!(r.date===selDateKey&&r.athleteId===selAthlete.id&&(r.sessionId===selSession.id||(!r.sessionId&&!selSession.id)))), entry];
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
          <span className="rp-month-label">{PT_MONTHS[viewMonth]} {viewYear}</span>
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
        const dayName = DAY_NAMES[date.getDay()];
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
                  <div className="rp-sess-name">{sessTitle(sess)}</div>
                  <div className="rp-sess-sub">
                    <span style={{color:logged>0?'#4ac8c0':'#554a3a'}}>{logged}/{athletes.length} reg.</span>
                    {(sess.blocks||[]).filter(b=>WOD_SET.has(b.type)).slice(0,2).map((b,i)=>(
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
            <div className="rp-p2-title">{sessTitle(selSession)}</div>
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
    const wodBlocks = (selSession.blocks||[]).filter(b=>WOD_SET.has(b.type));
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
                  {sessbl?.duration?` ${sessbl.duration}'`:''}
                  {sessbl?.rounds?` ${sessbl.rounds}rds`:''}
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
                  {bl.blockType==='For Time' ? (
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
                    <span style={{fontSize:11,fontWeight:700,color:rpeCol,width:56,flexShrink:0}}>RPE {bl.rpe}</span>
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
            <button type="button" className="b bp" style={{flex:1}} onClick={saveLog}>
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
                <KpiCard label="Taxa RX" value={athleteKPIs.rxRate!==null?`${athleteKPIs.rxRate}%`:'—'} sub="Sessões completadas como RX" colorClass={athleteKPIs.rxRate!==null?athleteKPIs.rxRate>=60?'kpi-good':athleteKPIs.rxRate>=30?'kpi-warn':'kpi-bad':''} />
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
                <KpiCard label="Taxa RX" value={`${sessionKPIs.rxPct}%`} sub="Das escalas registradas" colorClass={sessionKPIs.rxPct>=60?'kpi-good':sessionKPIs.rxPct>=30?'kpi-warn':'kpi-bad'} />
                <KpiCard label="Flags" value={sessionKPIs.flags} sub="Atletas marcados para revisão" colorClass={sessionKPIs.flags===0?'kpi-good':sessionKPIs.flags<=2?'kpi-warn':'kpi-bad'} />
                <KpiCard label="Distribuição de escala" value={`${sessionKPIs.scaleDist.RX} RX`} sub={`${sessionKPIs.scaleDist.Inter} Inter · ${sessionKPIs.scaleDist.SC} SC · ${sessionKPIs.scaleDist.Adaptado} Adap`} />
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

// ── LeaderboardView ───────────────────────────────────────────────────────────
function LeaderboardView({ athletes, sessions, results }) {
  const [selWod,          setSelWod]          = useState('');
  const [scaleFilter,     setScaleFilter]     = useState('Todos');
  const [lbSettingsOpen,  setLbSettingsOpen]  = useState(false);
  const imgRef = useRef();

  const _lbc = (() => { try { const d=localStorage.getItem('eagles_lb_colors_v1'); return d?JSON.parse(d):{} } catch { return {} } })();
  const saveLBC = d => { try { localStorage.setItem('eagles_lb_colors_v1', JSON.stringify(d)); } catch {} };

  const [lbBg,setLbBg]=useState(_lbc.lbBg||'#000000');
  const [lbRowAlt,setLbRowAlt]=useState(_lbc.lbRowAlt||'#020809');
  const [lbP1Bg,setLbP1Bg]=useState(_lbc.lbP1Bg||'rgba(255,215,0,0.06)');
  const [lbP2Bg,setLbP2Bg]=useState(_lbc.lbP2Bg||'rgba(192,192,192,0.05)');
  const [lbP3Bg,setLbP3Bg]=useState(_lbc.lbP3Bg||'rgba(205,127,50,0.05)');
  const [lbDivider,setLbDivider]=useState(_lbc.lbDivider||'#0d1e1e');
  const [lbHdrBg,setLbHdrBg]=useState(_lbc.lbHdrBg||'#000000');
  const [lbHdrBorder,setLbHdrBorder]=useState(_lbc.lbHdrBorder||'#00b8d4');
  const [lbHdrTitle,setLbHdrTitle]=useState(_lbc.lbHdrTitle||'#ffffff');
  const [lbHdrSub,setLbHdrSub]=useState(_lbc.lbHdrSub||'#00b8d4');
  const [lbRank,setLbRank]=useState(_lbc.lbRank||'#333333');
  const [lbP1,setLbP1]=useState(_lbc.lbP1||'#ffd700');
  const [lbP2,setLbP2]=useState(_lbc.lbP2||'#c0c0c0');
  const [lbP3,setLbP3]=useState(_lbc.lbP3||'#cd7f32');
  const [lbName,setLbName]=useState(_lbc.lbName||'#ffffff');
  const [lbScaleText,setLbScaleText]=useState(_lbc.lbScaleText||'#00b8d4');
  const [lbScaleBg,setLbScaleBg]=useState(_lbc.lbScaleBg||'rgba(0,184,212,0.1)');
  const [lbScaleBorder,setLbScaleBorder]=useState(_lbc.lbScaleBorder||'#00b8d4');
  const [lbPerf,setLbPerf]=useState(_lbc.lbPerf||'#ffffff');
  const [lbFilterBg,setLbFilterBg]=useState(_lbc.lbFilterBg||APP_CONFIG.themeAccent||'#00b8d4');
  const [lbFilterText,setLbFilterText]=useState(_lbc.lbFilterText||APP_CONFIG.themeAccentText||'#000000');

  const lbc={lbBg,lbRowAlt,lbP1Bg,lbP2Bg,lbP3Bg,lbDivider,lbHdrBg,lbHdrBorder,lbHdrTitle,lbHdrSub,lbRank,lbP1,lbP2,lbP3,lbName,lbScaleText,lbScaleBg,lbScaleBorder,lbPerf,lbFilterBg,lbFilterText};
  useEffect(()=>{ saveLBC(lbc); },[lbBg,lbRowAlt,lbP1Bg,lbP2Bg,lbP3Bg,lbDivider,lbHdrBg,lbHdrBorder,lbHdrTitle,lbHdrSub,lbRank,lbP1,lbP2,lbP3,lbName,lbScaleText,lbScaleBg,lbScaleBorder,lbPerf,lbFilterBg,lbFilterText]);

  const colorRow=([lbl,val,setter,id])=>(
    <div key={id} className="settings-row">
      <span className="settings-lbl">{lbl}</span>
      <div className="color-row">
        <div className="color-swatch" style={{background:val}} onClick={()=>document.getElementById('lbp-'+id)?.click()}/>
        <input type="color" id={'lbp-'+id} value={/^#[0-9a-fA-F]{6}$/.test(val)?val:'#888888'} onChange={e=>setter(e.target.value)} style={{opacity:0,position:'absolute',pointerEvents:'none'}}/>
        <input type="text" className="color-input" value={val} onChange={e=>{ if(/^(#[0-9a-fA-F]{0,8}|rgba?.*)$/.test(e.target.value)) setter(e.target.value); }}/>
      </div>
    </div>
  );

  const wodList = useMemo(()=>{
    const list=[];
    Object.entries(sessions).sort(([a],[b])=>b.localeCompare(a)).forEach(([dateKey,daySessions])=>{
      (daySessions||[]).forEach(sess=>{
        (sess.blocks||[]).filter(bl=>WOD_BLOCK_TYPES.includes(bl.label)||WOD_BLOCK_TYPES.includes(bl.type)).forEach(bl=>{
          const hasRes=results.some(r=>r.date===dateKey&&r.sessionId===sess.id&&r.presence==='Presente'&&(r.blocks||[]).some(rb=>rb.blockId===bl.id&&(rb.perfTime||rb.perfRounds||rb.perfReps)));
          if (hasRes) {
            const dt=new Date(dateKey+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'});
            const label=bl.label&&bl.label!=='-'?bl.label:bl.type;
            const meta=[bl.rounds&&`${bl.rounds}rds`,bl.duration&&`CAP ${bl.duration}'`].filter(Boolean).join(' · ');
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
    const SCALE_RANK={RX:4,Inter:3,SC:2,Adaptado:1,'-':0},SCALE_NAMES={4:'RX',3:'Inter',2:'SC',1:'Adaptado',0:'-'};
    return results.filter(r=>r.date===selObj.dateKey&&r.sessionId===selObj.sessId&&r.presence==='Presente')
      .map(r=>{
        const blk=(r.blocks||[]).find(b=>b.blockId===selObj.blId)||null;
        if (!blk) return null;
        const exRows=blk.exerciseRows||[];
        let minRank=4;
        exRows.forEach(row=>{ const rank=SCALE_RANK[row.scale]??0; if(rank<minRank) minRank=rank; });
        const scale=exRows.length>0?SCALE_NAMES[minRank]:blk.scale||'-';
        return {...r,perfTime:blk.perfTime,perfRounds:blk.perfRounds,perfReps:blk.perfReps,scale};
      }).filter(r=>r&&(r.perfTime||r.perfRounds||r.perfReps));
  },[selObj,results]);

  const scales=['Todos','RX','Inter','SC','Adaptado'];
  const filtered=scaleFilter==='Todos'?wodResults:wodResults.filter(r=>r.scale===scaleFilter);
  const ranked=selObj?rankResults(filtered,selObj.blType):[];
  const podColors=[lbP1,lbP2,lbP3],podBgs=[lbP1Bg,lbP2Bg,lbP3Bg],podLabels=['1º','2º','3º'];

  const doExport=async()=>{
    const el=imgRef.current; if(!el) return;
    const html2canvas=(await import('html2canvas')).default;
    const cv=await html2canvas(el,{scale:APP_CONFIG.exportScale||2,backgroundColor:lbBg,useCORS:true,logging:false,width:1080,height:el.scrollHeight,windowWidth:1080});
    const a=document.createElement('a');
    const lbl=selObj?`${selObj.dt}-${selObj.blLabel}-${scaleFilter}`.replace(/[^a-zA-Z0-9\-]/g,'-').toLowerCase():'leaderboard';
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
          const lb=cfg.lbColors||cfg;
          const set=(key,setter)=>{ if(lb[key]!==undefined) setter(lb[key]); };
          set('lbBg',setLbBg);set('lbRowAlt',setLbRowAlt);set('lbP1Bg',setLbP1Bg);set('lbP2Bg',setLbP2Bg);set('lbP3Bg',setLbP3Bg);
          set('lbDivider',setLbDivider);set('lbHdrBg',setLbHdrBg);set('lbHdrBorder',setLbHdrBorder);set('lbHdrTitle',setLbHdrTitle);
          set('lbHdrSub',setLbHdrSub);set('lbRank',setLbRank);set('lbP1',setLbP1);set('lbP2',setLbP2);set('lbP3',setLbP3);
          set('lbName',setLbName);set('lbScaleText',setLbScaleText);set('lbScaleBg',setLbScaleBg);set('lbScaleBorder',setLbScaleBorder);
          set('lbPerf',setLbPerf);set('lbFilterBg',setLbFilterBg);set('lbFilterText',setLbFilterText);
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
          try { localStorage.setItem('eagles_lb_colors_v1',JSON.stringify(lbc)); } catch {}
          alert('Config carregada! A página irá recarregar.'); setTimeout(()=>window.location.reload(),300);
        } catch(err) { alert('Erro ao ler o arquivo: '+err.message); }
      };
      reader.readAsText(file);
    };
    inp.click();
  };

  const handleSaveConfig=()=>{
    const savedSettings=loadSettings();
    const exportCfg={...savedSettings,appTitle:APP_CONFIG.appTitle,logo:APP_CONFIG.logo||'icon-192.png',themeAccent:APP_CONFIG.themeAccent,themeAccentText:APP_CONFIG.themeAccentText,gymName:APP_CONFIG.gymName,blockColors:APP_CONFIG.blockColors||{},blockNames:APP_CONFIG.blockNames,athleteLevels:APP_CONFIG.athleteLevels,athleteGoals:APP_CONFIG.athleteGoals,restDayLabel:APP_CONFIG.restDayLabel,mobileWeeklyLabels:APP_CONFIG.mobileWeeklyLabels,lbColors:lbc};
    const raw=window.prompt('Nome do arquivo (sem extensão):','config'); if(raw===null) return;
    const fname=(raw.trim().replace(/[^a-zA-Z0-9_-]/g,'-')||'config');
    const blob=new Blob([JSON.stringify(exportCfg,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.download=fname+'.json'; a.href=URL.createObjectURL(blob); a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      {lbSettingsOpen&&(
        <div className="settings-overlay" onClick={()=>setLbSettingsOpen(false)}>
          <div className="settings-modal" onClick={e=>e.stopPropagation()}
            ref={el=>{
              if(!el) return;
              const hdr=el.querySelector('.settings-drag-hdr');
              if(!hdr||hdr._drag) return; hdr._drag=true;
              let ox=0,oy=0,drag=false;
              const dn=e=>{drag=true;const r=el.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;el.style.transform='none';document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)};
              const mv=e=>{if(!drag)return;el.style.left=(e.clientX-ox)+'px';el.style.top=(e.clientY-oy)+'px'};
              const up=()=>{drag=false;document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up)};
              hdr.addEventListener('mousedown',dn);
            }}>
            <div className="settings-drag-hdr">
              <i className="ti ti-grip-horizontal" style={{color:'#555',fontSize:16}}/>
              <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>Cores do Leaderboard</span>
              <button type="button" className="b bd bsm" style={{marginLeft:'auto',padding:'3px 8px',minHeight:24}} onClick={()=>setLbSettingsOpen(false)}><i className="ti ti-x"/></button>
            </div>
            <div style={{padding:'14px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,maxHeight:'60vh',overflowY:'auto'}}>
              {[['Fundo geral',lbBg,setLbBg,'bg'],['Linhas alternas',lbRowAlt,setLbRowAlt,'row'],['Fundo 1º lugar',lbP1Bg,setLbP1Bg,'p1bg'],['Fundo 2º lugar',lbP2Bg,setLbP2Bg,'p2bg'],['Fundo 3º lugar',lbP3Bg,setLbP3Bg,'p3bg'],['Divisor de linhas',lbDivider,setLbDivider,'div'],['Header — fundo',lbHdrBg,setLbHdrBg,'hbg'],['Header — borda',lbHdrBorder,setLbHdrBorder,'hbrd'],['Header — título',lbHdrTitle,setLbHdrTitle,'htit'],['Header — subtítulo',lbHdrSub,setLbHdrSub,'hsub'],['Rank (4º+)',lbRank,setLbRank,'rank'],['1º lugar — cor',lbP1,setLbP1,'p1'],['2º lugar — cor',lbP2,setLbP2,'p2'],['3º lugar — cor',lbP3,setLbP3,'p3'],['Nome do atleta',lbName,setLbName,'name'],['Escala — texto',lbScaleText,setLbScaleText,'sctxt'],['Escala — fundo',lbScaleBg,setLbScaleBg,'scbg'],['Escala — borda',lbScaleBorder,setLbScaleBorder,'scbrd'],['Performance',lbPerf,setLbPerf,'perf'],['Filtro ativo — fundo',lbFilterBg,setLbFilterBg,'fbg'],['Filtro ativo — texto',lbFilterText,setLbFilterText,'ftxt']].map(colorRow)}
            </div>
            <div style={{padding:'8px 16px',borderTop:'1px solid #252525',display:'flex',gap:8}}>
              <button type="button" className="b bsm" style={{flex:1}} onClick={handleLoadConfig}><i className="ti ti-upload"/> Carregar config</button>
              <button type="button" className="b bsm" style={{flex:1}} onClick={handleSaveConfig}><i className="ti ti-download"/> Salvar config.json</button>
            </div>
            <div style={{padding:'4px 16px 10px',fontSize:11,color:'#444'}}>Cores salvas automaticamente e incluídas no estado exportado.</div>
          </div>
        </div>
      )}
      <div className="sc-card" style={{padding:12,marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <span className="lbl" style={{margin:0}}>Leaderboard</span>
          <button type="button" className="b bsm" onClick={()=>setLbSettingsOpen(true)}><i className="ti ti-settings"/></button>
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
              {scales.map(s=>(
                <button key={s} type="button" className="b bsm"
                  style={{background:scaleFilter===s?lbFilterBg:'transparent',color:scaleFilter===s?lbFilterText:'#888',borderColor:scaleFilter===s?lbFilterBg:'#2e2e2e',fontSize:11}}
                  onClick={()=>setScaleFilter(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {selObj ? (
        <div>
          <div ref={imgRef} style={{background:lbBg,width:1080,transform:`scale(${Math.min(1,(window.innerWidth-28)/1080)})`,transformOrigin:'top left',marginBottom:`${-1080*(1-Math.min(1,(window.innerWidth-28)/1080))}px`}}>
            <div style={{background:lbHdrBg,padding:'20px 28px 16px',borderBottom:`3px solid ${lbHdrBorder}`}}>
              <div style={{fontFamily:GF(),fontSize:22,fontWeight:900,color:lbHdrTitle,textTransform:'uppercase',letterSpacing:'.1em'}}>Leaderboard</div>
              <div style={{fontFamily:GF(),fontSize:14,color:lbHdrSub,marginTop:4,textTransform:'uppercase',letterSpacing:'.06em'}}>
                {selObj.dt} · {selObj.blLabel}{selObj.meta?' · '+selObj.meta:''}{scaleFilter!=='Todos'?' · '+scaleFilter:''}
              </div>
            </div>
            <div style={{padding:'8px 0'}}>
              {ranked.length===0
                ? <div style={{padding:'20px 28px',color:'#333',fontFamily:GF(),fontSize:13}}>Nenhum resultado.</div>
                : ranked.map((r,ri)=>{
                    const ath=athletes.find(a=>String(a.id)===String(r.athleteId));
                    const perf=getPerformanceStr(r,selObj.blType);
                    const isPodium=ri<3,pColor=isPodium?podColors[ri]:null;
                    return (
                      <div key={r.id||ri} style={{display:'flex',alignItems:'center',gap:16,padding:'12px 28px',borderBottom:`1px solid ${lbDivider}`,background:isPodium?podBgs[ri]:ri%2===0?lbRowAlt:lbBg}}>
                        <div style={{fontFamily:GF(),fontSize:18,fontWeight:900,color:pColor||lbRank,width:32,flexShrink:0,textAlign:'center'}}>{isPodium?podLabels[ri]:`${ri+1}º`}</div>
                        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                          <div style={{width:10,height:10,borderRadius:'50%',background:ath?.color||'#555',flexShrink:0}}/>
                          <span style={{fontFamily:GF(),fontSize:16,fontWeight:700,color:lbName,textTransform:'uppercase',letterSpacing:'.04em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ath?.name||'—'}</span>
                        </div>
                        {r.scale&&r.scale!=='-'&&<span style={{fontFamily:GF(),fontSize:11,fontWeight:700,color:lbScaleText,background:lbScaleBg,border:`1px solid ${lbScaleBorder}`,borderRadius:3,padding:'2px 8px',flexShrink:0}}>{r.scale}</span>}
                        <div style={{fontFamily:GF(),fontSize:16,fontWeight:900,color:pColor||lbPerf,flexShrink:0,textAlign:'right'}}>{perf}</div>
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
