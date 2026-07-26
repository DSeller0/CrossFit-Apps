import { useState, useEffect, useMemo } from 'react';
import { saveResults, uid } from '../../../utils/storage';
import { exVolStr, isTimeBlock, isWodBlock, SCALES, blkMeta } from '../../../public/lib/wod.js';
import { toISO, MONTH_PT, DAY_PT_TITLE } from '../../../public/lib/week.js';
import { sessName } from '../../../public/lib/sessions.js';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { PRESENCE, LEVEL_CLS, getWeeksInMonth, weekLabel } from './resultadosHelpers.js';

// ── RegistroView ──────────────────────────────────────────────────────────────
export function RegistroView({ athletes, sessions, results, setResults, preload, onPreloadConsumed }) {
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
