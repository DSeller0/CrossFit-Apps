import { useState } from 'react';
import { calcKPIs, calcSessionKPIs, LEVEL_CLS, SCALE_CLS } from './resultadosHelpers.js';
import { SparkLine, KpiCard } from './cards.jsx';

// ── HistoryView ───────────────────────────────────────────────────────────────
export function HistoryView({ athletes, sessions, results }) {
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
