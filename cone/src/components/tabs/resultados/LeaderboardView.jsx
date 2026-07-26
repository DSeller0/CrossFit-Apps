import { useState, useMemo, useRef } from 'react';
import { loadSettings, saveSettings } from '../../../utils/storage';
import { APP_CONFIG, GF } from '../../../utils/config';
import { rankResults, scaleColor, isWodBlock, deriveScale, SCALES, blkMeta } from '../../../public/lib/wod.js';
import { getPerformanceStr } from './resultadosHelpers.js';

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
export function LeaderboardView({ athletes, sessions, results }) {
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
