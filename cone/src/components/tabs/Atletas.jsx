import { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  loadAthletes, saveAthletes, loadGoalsData, saveGoalsData,
  loadRegistry, uid, todayISO, matchesAthlete,
} from '../../utils/storage';
import { APP_CONFIG, ECOL } from '../../utils/config';
import { useIsMobile } from '../../hooks/useIsMobile';

const BG    = '#0d0b09';
const STONE = '#161210';
const DIV   = '#2a231c';
const CREAM = '#f0e8d0';
const SUB   = '#c8b090';
const MUTED = '#806850';
const DIM   = '#554a3a';

const getLevels = () => APP_CONFIG.athleteLevels || ['Iniciante','Intermediário','Avançado','Competidor'];
const getGoals  = () => APP_CONFIG.athleteGoals  || ['Saúde geral','Força','Condicionamento','Competição'];

// ── PR helpers ────────────────────────────────────────────────────────────────
function toSecs(t) {
  if (!t) return Infinity;
  const p = String(t).split(':');
  return p.length === 2 ? parseInt(p[0])*60+parseInt(p[1]) : parseInt(t)||Infinity;
}
function fmtTime(secs) {
  const m = Math.floor(secs/60), s = secs%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function prBest(pr) {
  if (!pr.results?.length) return null;
  if (pr.type === 'time') return pr.results.reduce((b,r) => toSecs(r.value)<toSecs(b.value)?r:b);
  return pr.results.reduce((b,r) => Number(r.value)>Number(b.value)?r:b);
}
function prDelta(pr) {
  if (!pr.results || pr.results.length < 2) return null;
  const sorted = [...pr.results].sort((a,b) => new Date(a.date)-new Date(b.date));
  const last = sorted[sorted.length-1], prev = sorted[sorted.length-2];
  if (pr.type === 'time') {
    const diff = toSecs(prev.value)-toSecs(last.value);
    if (diff === 0) return { label:'=', good:null };
    return { label:(diff>0?'-':'+')+fmtTime(Math.abs(diff)), good:diff>0 };
  }
  const diff = Number(last.value)-Number(prev.value);
  if (diff === 0) return { label:'=', good:null };
  return { label:(diff>0?'+':'')+diff+' '+(pr.type==='load'?(pr.unit||'kg'):'reps'), good:diff>0 };
}
function prPct(pr) {
  const best = prBest(pr);
  if (!best || !pr.target) return null;
  if (pr.type === 'time') {
    const targetSecs = toSecs(pr.target);
    const firstSecs = pr.results.length > 0
      ? toSecs([...pr.results].sort((a,b)=>new Date(a.date)-new Date(b.date))[0].value)
      : targetSecs*2;
    if (firstSecs <= targetSecs) return 100;
    return Math.min(100, Math.round((firstSecs-toSecs(best.value))/(firstSecs-targetSecs)*100));
  }
  const t = Number(pr.target);
  return t ? Math.min(100, Math.round(Number(best.value)/t*100)) : null;
}

// ── ExerciseCombobox ──────────────────────────────────────────────────────────
function ExerciseCombobox({ value, onChange, blockLabel, placeholder, excludeNames }) {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState(value || '');
  const [dropRect, setDropRect] = useState(null);
  const ref         = useRef();
  const dropdownRef = useRef();

  const suggestions = useMemo(() => {
    const reg = loadRegistry() || {};
    const getName = e => typeof e === 'string' ? e : (e?.name || '');
    const typeMap = {};
    Object.entries(reg).forEach(([bt,exs]) => {
      (exs||[]).forEach(e => { const n=getName(e); if (n&&!typeMap[n]) typeMap[n]=bt; });
    });
    const primary = (reg[blockLabel]||[]).map(getName).filter(Boolean);
    const primarySet = new Set(primary);
    const allNames = [...new Set(Object.values(reg).flat().map(getName).filter(Boolean))];
    const others = allNames.filter(n => !primarySet.has(n));
    let names;
    if (!query.trim()) {
      names = [...primary, ...others.sort((a,b) => a.localeCompare(b,'pt'))];
    } else {
      const q = query.toLowerCase();
      names = [
        ...primary.filter(n => n.toLowerCase().includes(q)),
        ...others.filter(n => n.toLowerCase().includes(q)).sort((a,b) => a.localeCompare(b,'pt')),
      ];
    }
    const excluded = new Set((excludeNames || []).map(n => n.toLowerCase()));
    return names
      .filter(name => !excluded.has(name.toLowerCase()))
      .map(name => ({ name, blockType: typeMap[name] || blockLabel || '' }));
  }, [blockLabel, query, excludeNames]);

  useState(() => { setQuery(value || ''); }, [value]);

  const openDrop = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setDropRect(r);
    setOpen(true);
  };
  const select = name => { setQuery(name); onChange(name); setOpen(false); };

  return (
    <div ref={ref} style={{ position:'relative', flex:1 }}>
      <input value={query} placeholder={placeholder}
        className="ex-input" style={{ fontSize:13 }}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); openDrop(); }}
        onFocus={openDrop}
        onKeyDown={e => {
          if (e.key==='Escape') setOpen(false);
          if (e.key==='ArrowDown'&&open&&suggestions.length) ref.current?.querySelector('.ex-suggestion')?.focus();
        }}
      />
      {open && suggestions.length > 0 && dropRect && createPortal(
        <div ref={dropdownRef} style={{ position:'fixed', top:dropRect.bottom+2, left:dropRect.left, width:dropRect.width, zIndex:9999, background:STONE, border:`1px solid ${DIV}`, maxHeight:180, overflowY:'auto', boxShadow:'0 4px 16px rgba(0,0,0,.6)' }}>
          {suggestions.map((s,i) => (
            <div key={i} className="ex-suggestion" tabIndex={0}
              style={{ padding:'7px 10px', fontSize:13, color:SUB, cursor:'pointer', borderBottom:i<suggestions.length-1?`1px solid ${DIV}`:'none', display:'flex', alignItems:'center', gap:8 }}
              onMouseDown={e => { e.preventDefault(); select(s.name); }}
              onKeyDown={e => {
                if (e.key==='Enter') select(s.name);
                if (e.key==='ArrowDown') e.currentTarget.nextSibling?.focus();
                if (e.key==='ArrowUp') { const p=e.currentTarget.previousSibling; p?p.focus():ref.current?.querySelector('input')?.focus(); }
                if (e.key==='Escape') { setOpen(false); ref.current?.querySelector('input')?.focus(); }
              }}
              onMouseEnter={e => e.currentTarget.style.background=STONE}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:ECOL[s.blockType]?.text||MUTED, flexShrink:0, display:'inline-block' }} />
              {s.name}
            </div>
          ))}
        </div>
      , document.body)}
    </div>
  );
}

// ── PrRow ─────────────────────────────────────────────────────────────────────
function PrRow({ pr, onAddResult, onEdit, onDelete, showActions }) {
  const isMobile    = useIsMobile();
  const best        = prBest(pr);
  const delta       = prDelta(pr);
  const pct         = prPct(pr);
  const bestLabel   = best ? (pr.type==='load'?`${best.value} ${pr.unit||'kg'}`:pr.type==='reps'?`${best.value} reps`:best.value) : '—';
  const targetLabel = pr.target ? (pr.type==='load'?`${pr.target} ${pr.unit||'kg'}`:pr.type==='reps'?`${pr.target} reps`:pr.target) : null;
  const bestDate    = best ? new Date(best.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : null;

  const bar = pct !== null ? (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      <div style={{ display:'flex', gap:2 }}>
        {Array.from({length:10},(_,bi) => {
          const fill = pct>=(bi+1)*10?1:pct>bi*10?(pct-bi*10)/10:0;
          return (
            <div key={bi} style={{ flex:1, height:12, background:STONE, border:`1px solid ${DIV}`, position:'relative', overflow:'hidden' }}>
              {fill>0 && <div style={{ position:'absolute', top:0, left:0, bottom:0, width:`${fill*100}%`, background:fill===1?'var(--theme-accent)':'var(--theme-accent)88' }} />}
            </div>
          );
        })}
      </div>
      {targetLabel && <div style={{ fontSize:9, color:DIM, textAlign:'right' }}>Meta: {targetLabel}</div>}
    </div>
  ) : null;

  return (
    <div style={{ padding:'10px 0', borderBottom:`1px solid ${DIV}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:SUB, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{pr.name}</div>
          {pr.category && <div style={{ fontSize:10, color:DIM }}>{pr.category}</div>}
        </div>
        {!isMobile && bar && <div style={{ flex:1 }}>{bar}</div>}
        <div style={{ textAlign:'right', flexShrink:0, minWidth:60 }}>
          <div style={{ fontSize:13, fontWeight:900, color:CREAM }}>{bestLabel}</div>
          {bestDate && <div style={{ fontSize:10, color:DIM }}>{bestDate}</div>}
        </div>
        {delta && (
          <div style={{ fontSize:11, fontWeight:700, flexShrink:0, minWidth:46, textAlign:'right', color:delta.good===true?'#68d8a0':delta.good===false?'#e05848':MUTED }}>
            {delta.good===true?'↑':delta.good===false?'↓':''} {delta.label}
          </div>
        )}
        {showActions && (
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            <button type="button" className="b bsm" style={{ padding:'3px 6px', minHeight:22, fontSize:11 }} onClick={onAddResult}><i className="ti ti-plus" /></button>
            <button type="button" className="b bd bsm" style={{ padding:'3px 6px', minHeight:22, fontSize:11, opacity:.6 }} onClick={onEdit}><i className="ti ti-pencil" /></button>
            <button type="button" className="b bd bsm" style={{ padding:'3px 6px', minHeight:22, fontSize:11, opacity:.5 }} onClick={onDelete}><i className="ti ti-trash" /></button>
          </div>
        )}
      </div>
      {isMobile && bar && <div style={{ marginTop:8 }}>{bar}</div>}
    </div>
  );
}

// ── AddResultModal ────────────────────────────────────────────────────────────
function AddResultModal({ pr, onSave, onClose }) {
  const [value, setValue] = useState('');
  const [date, setDate]   = useState(todayISO);
  const best      = prBest(pr);
  const bestLabel = pr.type==='time' ? best?.value : (best?.value?(best.value+(pr.unit?' '+pr.unit:'')):'—');
  const isPR = value && (pr.type==='time' ? toSecs(value)<toSecs(best?.value) : Number(value)>Number(best?.value));

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" style={{ maxWidth:340 }} onClick={e=>e.stopPropagation()}>
        <div className="settings-drag-hdr">
          <span style={{ fontSize:13, fontWeight:700, color:CREAM }}>Registrar — {pr.name}</span>
          <button type="button" className="b bd bsm" style={{ marginLeft:'auto', padding:'3px 8px', minHeight:24 }} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {best && <div style={{ fontSize:12, color:MUTED, padding:'6px 10px', background:STONE, border:`1px solid ${DIV}` }}>Melhor atual: {bestLabel}</div>}
          <div className="g2">
            <div className="fg">
              <span className="lbl">{pr.type==='time'?'Tempo (mm:ss)':pr.type==='reps'?'Reps':'Carga'}</span>
              <input className="ex-input" placeholder={pr.type==='time'?'03:45':pr.type==='reps'?'25':'120'} value={value} onChange={e=>setValue(e.target.value)} autoFocus />
            </div>
            <div className="fg">
              <span className="lbl">Data</span>
              <input type="date" className="ex-input" value={date} onChange={e=>setDate(e.target.value)} />
            </div>
          </div>
          {isPR && <div style={{ fontSize:12, color:'#d8a840', fontWeight:700, textAlign:'center' }}>🏆 Novo PR!</div>}
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="b bsec" style={{ flex:1 }} disabled={!value}
              onClick={()=>onSave({ value:pr.type==='time'?value:Number(value), date })}>
              <i className="ti ti-check" /> Registrar
            </button>
            <button type="button" className="b bd bsm" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PrModal ───────────────────────────────────────────────────────────────────
function PrModal({ onSave, onClose, editPr, existingNames }) {
  const [name, setName]     = useState(editPr?.name || '');
  const [type, setType]     = useState(editPr?.type || 'load');
  const [unit, setUnit]     = useState(editPr?.unit || 'kg');
  const [target, setTarget] = useState(editPr?.target || '');
  const [date, setDate]     = useState(todayISO);
  const [value, setValue]   = useState('');
  const registry   = loadRegistry() || {};
  const blockOrder = Object.keys(registry);
  const isEdit     = !!editPr;

  const exBlocks = useMemo(() => {
    const n = name.trim().toLowerCase();
    if (!n) return [];
    return blockOrder.filter(bt =>
      (registry[bt] || []).some(e => (typeof e === 'string' ? e : e?.name || '').toLowerCase() === n)
    );
  }, [name, registry]);

  const primaryCategory = exBlocks[0] || editPr?.category || '';

  const save = () => {
    if (!name.trim() || (!isEdit && !value)) return;
    const result = isEdit ? null : { value:type==='time'?value:Number(value), date };
    onSave({ id:editPr?.id||uid(), name:name.trim(), category:primaryCategory, categories:exBlocks, type, unit:type==='load'?unit:null, target:target?(type==='time'?target:Number(target)):null, results:isEdit?editPr.results:(result?[result]:[]) });
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" style={{ maxWidth:420 }} onClick={e=>e.stopPropagation()}>
        <div className="settings-drag-hdr">
          <span style={{ fontSize:13, fontWeight:700, color:CREAM }}>{isEdit?'Editar PR':'Registrar PR'}</span>
          <button type="button" className="b bd bsm" style={{ marginLeft:'auto', padding:'3px 8px', minHeight:24 }} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          <div className="fg">
            <span className="lbl">Exercício / WOD</span>
            <ExerciseCombobox value={name} onChange={setName} blockLabel="" placeholder="Ex: Fran, Back Squat..." excludeNames={isEdit ? (existingNames||[]).filter(n=>n.toLowerCase()!==editPr.name.toLowerCase()) : existingNames} />
          </div>
          {exBlocks.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:-4 }}>
              {exBlocks.map(bt => (
                <span key={bt} style={{ fontSize:10, fontWeight:700, padding:'2px 7px', background:ECOL[bt]?.bg||STONE, color:ECOL[bt]?.text||MUTED, border:`1px solid ${ECOL[bt]?.text||DIV}44` }}>{bt}</span>
              ))}
            </div>
          )}
          <div className="fg">
            <span className="lbl">Tipo</span>
            <div style={{ display:'flex', gap:6 }}>
              {[['load','Carga'],['time','Tempo'],['reps','Reps']].map(([t,lbl]) => (
                <button key={t} type="button" className="b bsm" style={{ flex:1, background:type===t?'var(--theme-accent)':'transparent', color:type===t?'var(--theme-accent-text)':MUTED, borderColor:type===t?'var(--theme-accent)':DIV }} onClick={()=>setType(t)}>{lbl}</button>
              ))}
            </div>
          </div>
          {!isEdit && (
            <div className="g2">
              <div className="fg">
                <span className="lbl">{type==='time'?'Tempo (mm:ss)':type==='reps'?'Reps':'Carga'}</span>
                <input className="ex-input" placeholder={type==='time'?'03:45':type==='reps'?'25':'120'} value={value} onChange={e=>setValue(e.target.value)} />
              </div>
              {type==='load' && (
                <div className="fg">
                  <span className="lbl">Unidade</span>
                  <div style={{ display:'flex', gap:6 }}>
                    {['kg','lb'].map(u => (
                      <button key={u} type="button" className="b bsm" style={{ flex:1, background:unit===u?'var(--theme-accent)':'transparent', color:unit===u?'var(--theme-accent-text)':MUTED, borderColor:unit===u?'var(--theme-accent)':DIV }} onClick={()=>setUnit(u)}>{u}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="fg">
            <span className="lbl">Meta (opcional)</span>
            <input className="ex-input" placeholder={type==='time'?'03:00':type==='reps'?'30':'140'} value={target} onChange={e=>setTarget(e.target.value)} />
          </div>
          {!isEdit && (
            <div className="fg">
              <span className="lbl">Data</span>
              <input type="date" className="ex-input" value={date} onChange={e=>setDate(e.target.value)} />
            </div>
          )}
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button type="button" className="b bsec" style={{ flex:1 }} disabled={!name.trim()||(!isEdit&&!value)} onClick={save}>
              <i className="ti ti-check" /> Salvar
            </button>
            <button type="button" className="b bd bsm" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HpBar ─────────────────────────────────────────────────────────────────────
function HpBar({ goal, color, onAddSession, onMilestoneHit, onConfigure, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const pct     = goal.totalSessions > 0 ? (goal.completedSessions/goal.totalSessions)*100 : 0;
  const snapPct = p => Math.round(p/10)*10;

  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <span style={{ fontSize:12, fontWeight:700, color:SUB, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{goal.name}</span>
        <span style={{ fontSize:11, color:DIM, flexShrink:0 }}>{goal.completedSessions}/{goal.totalSessions}</span>
        <button type="button" className="b bsm" style={{ padding:'3px 7px', minHeight:22, fontSize:11 }}
          onClick={()=>{ if(window.confirm(`Confirmar sessão para "${goal.name}"?`)) onAddSession(); }}>
          +1
        </button>
        <button type="button" className="b bd bsm" style={{ padding:'3px 6px', minHeight:22, fontSize:11 }} onClick={onConfigure}>
          <i className="ti ti-settings" />
        </button>
        <button type="button" className="b bd bsm" style={{ padding:'3px 6px', minHeight:22, fontSize:11, opacity:.6 }}
          onClick={()=>{ if(window.confirm(`Remover "${goal.name}"?`)) onDelete(); }}>
          <i className="ti ti-trash" />
        </button>
      </div>
      <div style={{ display:'flex', gap:2, cursor:'pointer' }} onClick={()=>setExpanded(e=>!e)}>
        {Array.from({length:10},(_,bi) => {
          const bStart=bi*10, bEnd=(bi+1)*10;
          const fill = pct>=bEnd?1:pct>bStart?(pct-bStart)/10:0;
          const hasMilestone = (goal.milestones||[]).some(m=>snapPct(m.pct)===bEnd);
          return (
            <div key={bi} style={{ flex:1, height:16, background:STONE, border:`1px solid ${DIV}`, position:'relative', overflow:'hidden' }}>
              {fill>0 && <div style={{ position:'absolute', top:0, left:0, bottom:0, width:`${fill*100}%`, background:fill===1?color:color+'99', transition:'width .3s' }} />}
              {hasMilestone && <div style={{ position:'absolute', top:0, bottom:0, right:1, width:2, background:'#d8a840', zIndex:1 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ position:'relative', height:12, marginTop:2 }}>
        {(goal.milestones||[]).map((m,mi) => (
          <div key={mi} style={{ position:'absolute', left:`${snapPct(m.pct)}%`, transform:'translateX(-50%)', fontSize:8, color:'#d8a840', whiteSpace:'nowrap' }}>{snapPct(m.pct)}%</div>
        ))}
      </div>
      {expanded && (
        <div style={{ marginTop:6, padding:'8px 10px', background:STONE, border:`1px solid ${DIV}` }}>
          <div style={{ fontSize:9, color:DIM, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Milestones</div>
          {(goal.milestones||[]).length === 0
            ? <div style={{ fontSize:12, color:DIM }}>Nenhum milestone configurado.</div>
            : (goal.milestones||[]).map((m,mi) => (
                <div key={mi} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', borderBottom:mi<goal.milestones.length-1?`1px solid ${DIV}`:'none' }}>
                  <input type="checkbox" checked={!!m.hit} onChange={()=>onMilestoneHit(mi,!m.hit)} style={{ accentColor:color, width:14, height:14, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:m.hit?DIM:SUB, textDecoration:m.hit?'line-through':'none', flex:1 }}>{m.label}</span>
                  <span style={{ fontSize:10, color:DIM }}>{snapPct(m.pct)}%</span>
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}

// ── GoalConfigPanel ───────────────────────────────────────────────────────────
function GoalConfigPanel({ goal, onSave, onCancel }) {
  const [name, setName]   = useState(goal.name||'');
  const [total, setTotal] = useState(goal.totalSessions||10);
  const [done, setDone]   = useState(goal.completedSessions||0);
  const [milestones, setMs] = useState(goal.milestones||[]);
  const snapPct = p => Math.round(p/10)*10;
  const updM = (i,f,v) => setMs(ms=>ms.map((m,mi)=>mi===i?{...m,[f]:v}:m));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div className="g2">
        <div className="fg"><span className="lbl">Nome</span><input className="ex-input" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="fg"><span className="lbl">Total de sessões</span><input type="number" min={1} max={200} className="ex-input" value={total} onChange={e=>setTotal(parseInt(e.target.value)||1)} /></div>
      </div>
      <div className="fg">
        <span className="lbl">Sessões completadas</span>
        <input type="number" min={0} max={total} className="ex-input" value={done} onChange={e=>setDone(Math.min(total,Math.max(0,parseInt(e.target.value)||0)))} />
      </div>
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:9, color:DIM, textTransform:'uppercase', letterSpacing:'.06em' }}>Milestones (máx. 5)</span>
          {milestones.length < 5 && <button type="button" className="b bsm" style={{ padding:'2px 8px', minHeight:22, fontSize:11 }} onClick={()=>setMs(ms=>[...ms,{label:'',pct:50,hit:false}])}><i className="ti ti-plus" /></button>}
        </div>
        {milestones.map((m,i) => (
          <div key={i} style={{ display:'flex', gap:6, alignItems:'center', marginBottom:5 }}>
            <input className="ex-input" placeholder="Descrição..." value={m.label} style={{ flex:1 }} onChange={e=>updM(i,'label',e.target.value)} />
            <input type="number" min={10} max={100} step={10} className="ex-input" value={snapPct(m.pct)} style={{ width:60 }} onChange={e=>updM(i,'pct',snapPct(parseInt(e.target.value)||10))} />
            <span style={{ fontSize:10, color:DIM, flexShrink:0 }}>%</span>
            <button type="button" className="b bd bsm" style={{ padding:'2px 6px', minHeight:22, fontSize:11, opacity:.6 }} onClick={()=>setMs(ms=>ms.filter((_,mi)=>mi!==i))}><i className="ti ti-trash" /></button>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8, marginTop:4 }}>
        <button type="button" className="b bsec" style={{ flex:1 }} onClick={()=>onSave({...goal,name,totalSessions:total,completedSessions:done,milestones})}>
          <i className="ti ti-check" /> Salvar
        </button>
        <button type="button" className="b bd bsm" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ── AtletasTab ────────────────────────────────────────────────────────────────
export default function AtletasTab({ sessions, results, onEditSession, onLogResult }) {
  const [athletes, setAthletes]         = useState(loadAthletes);
  const [goalsData, setGoalsData]       = useState(loadGoalsData);
  const [selAthlete, setSelAthlete]     = useState(null);
  const [pane, setPane]                 = useState(0);      // mobile: 0=list, 1=detail
  const [profileForm, setProfileForm]   = useState(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [adding, setAdding]             = useState(false);
  const [newName, setNewName]           = useState('');
  const [configuringGoal, setConfiguringGoal]   = useState(null);
  const [showPrModal, setShowPrModal]   = useState(false);
  const [editingPr, setEditingPr]       = useState(null);
  const [addResultFor, setAddResultFor] = useState(null);
  const isMobile = useIsMobile();

  const persist         = d => { setGoalsData(d); saveGoalsData(d); };
  const persistAthletes = a => { setAthletes(a); saveAthletes(a); };

  const ath        = athletes.find(a => a.id === selAthlete) || null;
  const athColor   = ath?.color || '#e87820';
  const athGoals   = (goalsData.athleteGoals || {})[selAthlete] || [];
  const athPrs     = (goalsData.prs || {})[selAthlete] || [];
  const athResults = (results || []).filter(r => String(r.athleteId) === String(selAthlete));

  const combinedPct = a => {
    const gs = (goalsData.athleteGoals || {})[a.id] || [];
    if (!gs.length) return null;
    return Math.round(gs.reduce((s,g) => s+(g.totalSessions>0?g.completedSessions/g.totalSessions:0),0)/gs.length*100);
  };

  const goToAthlete = athId => {
    const a = athletes.find(x => x.id === athId);
    if (!a) return;
    setSelAthlete(athId);
    setProfileForm({ name:a.name, level:a.level||getLevels()[0], goal:a.goal||getGoals()[0], notes:a.notes||'', color:a.color||'#e87820', since:a.since||todayISO() });
    setConfiguringGoal(null);
    if (isMobile) setPane(1);
  };

  const addAthlete = () => {
    const name = newName.trim();
    if (!name) return;
    const a = { id:uid(), name, level:getLevels()[0], goal:getGoals()[0], notes:'', color:'#e87820', since:todayISO() };
    persistAthletes([...athletes, a]);
    setNewName(''); setAdding(false);
    setSelAthlete(a.id);
    setProfileForm({ name:a.name, level:a.level, goal:a.goal, notes:'', color:a.color, since:a.since });
    setShowProfileModal(true);
    if (isMobile) setPane(1);
  };

  const saveProfile = () => {
    if (!profileForm?.name.trim() || !selAthlete) return;
    persistAthletes(athletes.map(a => a.id===selAthlete ? {...a,...profileForm} : a));
    setProfileSaved(true); setTimeout(()=>setProfileSaved(false), 1500);
  };

  const deleteAthlete = () => {
    if (!window.confirm(`Remover ${ath?.name}? Esta ação não pode ser desfeita.`)) return;
    persistAthletes(athletes.filter(a => a.id !== selAthlete));
    setSelAthlete(null); setShowProfileModal(false);
    if (isMobile) setPane(0);
  };

  // Goal operations
  const addGoal = () => {
    if (athGoals.length >= 3) return;
    const g = { id:uid(), name:'Novo objetivo', totalSessions:10, completedSessions:0, milestones:[] };
    persist({ ...goalsData, athleteGoals:{...(goalsData.athleteGoals||{}),[selAthlete]:[...athGoals,g]} });
    setConfiguringGoal(g.id);
  };
  const updateGoal = (goalId, upd) => {
    persist({ ...goalsData, athleteGoals:{...(goalsData.athleteGoals||{}),[selAthlete]:athGoals.map(g=>g.id===goalId?{...g,...upd}:g)} });
    setConfiguringGoal(null);
  };
  const deleteGoal = goalId => {
    persist({ ...goalsData, athleteGoals:{...(goalsData.athleteGoals||{}),[selAthlete]:athGoals.filter(g=>g.id!==goalId)} });
  };
  const addGoalSession = goalId => {
    const g = athGoals.find(x=>x.id===goalId);
    if (!g||g.completedSessions>=g.totalSessions) return;
    updateGoal(goalId, { completedSessions:g.completedSessions+1 });
  };
  const hitMilestone = (goalId, mi, hit) => {
    const g = athGoals.find(x=>x.id===goalId);
    if (!g) return;
    updateGoal(goalId, { milestones:g.milestones.map((m,i)=>i===mi?{...m,hit}:m) });
  };

  // PR operations
  const savePr = pr => {
    const updated = athPrs.find(p=>p.id===pr.id) ? athPrs.map(p=>p.id===pr.id?pr:p) : [...athPrs, pr];
    persist({ ...goalsData, prs:{...(goalsData.prs||{}),[selAthlete]:updated} });
    setShowPrModal(false); setEditingPr(null);
  };
  const addResult = (prId, result) => {
    const updated = athPrs.map(p=>p.id!==prId?p:{...p,results:[...p.results,result].slice(-5)});
    persist({ ...goalsData, prs:{...(goalsData.prs||{}),[selAthlete]:updated} });
    setAddResultFor(null);
  };
  const deletePr = prId => {
    if (!window.confirm('Remover este PR?')) return;
    persist({ ...goalsData, prs:{...(goalsData.prs||{}),[selAthlete]:athPrs.filter(p=>p.id!==prId)} });
  };

  // Session strip
  const sessionStrip = useMemo(() => {
    if (!selAthlete || !ath) return [];
    const todayKey = new Date().toISOString().slice(0,10);
    const future30 = new Date(); future30.setDate(future30.getDate()+30);
    const f30      = future30.toISOString().slice(0,10);
    const all = [];
    Object.keys(sessions||{}).sort().forEach(date => {
      (sessions[date]||[]).forEach(s => { if (matchesAthlete(s,ath.name)) all.push({date,session:s}); });
    });
    return [...all.filter(x=>x.date<=todayKey).slice(-2), ...all.filter(x=>x.date>todayKey&&x.date<=f30).slice(0,1)];
  }, [selAthlete, ath, sessions]);

  const DAY_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const SecLabel = ({ children, actions }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
      <div style={{ fontSize:9, fontWeight:700, color:DIM, textTransform:'uppercase', letterSpacing:'.07em' }}>{children}</div>
      {actions}
    </div>
  );

  // ── Pane 1: Athlete list ────────────────────────────────────────────────────
  const renderPane1 = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ flex:1, overflowY:'auto' }}>
        {athletes.length === 0 && (
          <div style={{ padding:20, textAlign:'center', color:DIM, fontSize:12, fontStyle:'italic' }}>Nenhum atleta cadastrado.</div>
        )}
        {athletes.map(a => {
          const pct   = combinedPct(a);
          const isSel = selAthlete === a.id;
          const col   = a.color || '#e87820';
          return (
            <div key={a.id} onClick={()=>goToAthlete(a.id)}
              style={{ display:'flex', alignItems:'center', gap:9, padding:'11px 14px', background:isSel?STONE:'transparent', borderLeft:`3px solid ${isSel?col:'transparent'}`, borderBottom:`1px solid ${DIV}`, cursor:'pointer', transition:'background .1s' }}>
              <span style={{ width:9, height:9, borderRadius:'50%', background:col, flexShrink:0 }} />
              <span style={{ flex:1, fontSize:13, fontWeight:700, color:isSel?CREAM:SUB, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name}</span>
              {pct !== null && <span style={{ fontSize:10, color:isSel?MUTED:DIM }}>{pct}%</span>}
              {isMobile && <i className="ti ti-chevron-right" style={{ color:DIM, fontSize:12, flexShrink:0 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ borderTop:`1px solid ${DIV}`, padding:'10px 12px', flexShrink:0 }}>
        {adding ? (
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input autoFocus className="ex-input" placeholder="Nome do atleta..." value={newName} style={{ flex:1 }}
              onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') addAthlete(); if(e.key==='Escape'){setAdding(false);setNewName('');} }} />
            <button type="button" className="b bsec" style={{ padding:'6px 9px', flexShrink:0 }} onClick={addAthlete} disabled={!newName.trim()}><i className="ti ti-check" /></button>
            <button type="button" className="b bd" style={{ padding:'6px 9px', flexShrink:0 }} onClick={()=>{setAdding(false);setNewName('');}}><i className="ti ti-x" /></button>
          </div>
        ) : (
          <button type="button" className="b bsec" style={{ width:'100%', justifyContent:'center' }} onClick={()=>setAdding(true)}>
            <i className="ti ti-plus" /> Novo atleta
          </button>
        )}
      </div>
    </div>
  );

  // ── Pane 2: Full athlete detail ─────────────────────────────────────────────
  const renderDetail = () => {
    if (!ath) return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:DIM, fontSize:12, fontStyle:'italic', padding:20, textAlign:'center' }}>
        Selecione um atleta
      </div>
    );

    const blockOrder = Object.keys(loadRegistry() || {});
    const groupedPrs = {};
    athPrs.forEach(pr => {
      const cats = pr.categories?.length ? pr.categories : (pr.category ? [pr.category] : []);
      const cat  = blockOrder.find(b => cats.includes(b)) || cats[0] || 'Sem categoria';
      if (!groupedPrs[cat]) groupedPrs[cat] = [];
      groupedPrs[cat].push(pr);
    });
    const sortedGroupEntries = [
      ...blockOrder.filter(bt => groupedPrs[bt]).map(bt => [bt, groupedPrs[bt]]),
      ...Object.keys(groupedPrs).filter(k => !blockOrder.includes(k)).map(k => [k, groupedPrs[k]]),
    ];

    return (
      <div style={{ overflowY:'auto', height:'100%' }}>
        {/* Profile header — sticky */}
        <div style={{ position:'sticky', top:0, zIndex:10, background:BG, padding:'14px 16px 12px', borderBottom:`1px solid ${DIV}`, borderLeft:`3px solid ${athColor}` }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900, color:CREAM, letterSpacing:'.03em', lineHeight:1.2 }}>{ath.name}</div>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:5, flexWrap:'wrap' }}>
                {ath.level && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', background:athColor+'22', color:athColor, textTransform:'uppercase', letterSpacing:'.05em' }}>{ath.level}</span>}
                {ath.goal && <span style={{ fontSize:10, color:MUTED }}>{ath.goal}</span>}
                {ath.since && <span style={{ fontSize:10, color:DIM }}>desde {new Date(ath.since+'T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'numeric'})}</span>}
              </div>
              {ath.notes && <div style={{ fontSize:11, color:DIM, marginTop:6, fontStyle:'italic' }}>{ath.notes}</div>}
            </div>
            <button type="button" className="b bd bsm" style={{ flexShrink:0, padding:'4px 8px', fontSize:11 }} onClick={()=>setShowProfileModal(true)}>
              <i className="ti ti-pencil" />
            </button>
          </div>
        </div>

        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Sessions */}
          <div>
            <SecLabel>Sessões</SecLabel>
            {sessionStrip.length === 0
              ? <div style={{ fontSize:12, color:DIM, fontStyle:'italic' }}>Nenhuma sessão atribuída.</div>
              : sessionStrip.map(({date,session}) => {
                  const todayKey = new Date().toISOString().slice(0,10);
                  const isToday  = date === todayKey;
                  const isPast   = date <= todayKey;
                  const d        = new Date(date+'T12:00:00');
                  const myResult = athResults.find(r=>r.date===date&&r.sessionId===session.id);
                  const WOD_T    = ['WOD','For Time','AMRAP','EMOM','MetCon','HIIT'];
                  const wb       = myResult ? (myResult.blocks||[]).find(b=>WOD_T.includes(b.blockType)||WOD_T.includes(b.blockLabel)) : null;
                  const perf     = wb ? (wb.perfTime||(wb.perfRounds?wb.perfRounds+'rds':null)) : null;
                  return (
                    <div key={date+'|'+session.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${DIV}` }}>
                      <div style={{ width:3, alignSelf:'stretch', background:isToday?'var(--theme-accent)':isPast?DIM:DIV+'66', flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:isToday?CREAM:SUB, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session.sessionName||DAY_PT[d.getDay()]}</div>
                        <div style={{ fontSize:10, color:MUTED }}>{DAY_PT[d.getDay()]} · {d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</div>
                      </div>
                      {isToday && <span style={{ fontSize:9, fontWeight:700, color:'var(--theme-accent)', background:'rgba(74,200,192,.1)', padding:'2px 5px', textTransform:'uppercase', flexShrink:0 }}>Hoje</span>}
                      {isPast && !isToday && perf && <span style={{ fontSize:11, fontWeight:700, color:CREAM, flexShrink:0 }}>{perf}</span>}
                      {isPast && !isToday && !myResult && <span style={{ fontSize:10, color:DIM, flexShrink:0 }}>—</span>}
                      {!isPast && <span style={{ fontSize:10, color:MUTED, flexShrink:0 }}>Próxima</span>}
                    </div>
                  );
                })
            }
          </div>

          {/* PRs */}
          <div>
            <SecLabel actions={
              <button type="button" className="b bsm" style={{ padding:'2px 7px', fontSize:11 }} onClick={()=>setShowPrModal(true)}>
                <i className="ti ti-plus" /> PR
              </button>
            }>PRs</SecLabel>
            {athPrs.length === 0
              ? <div style={{ fontSize:12, color:DIM, fontStyle:'italic' }}>Nenhum PR registrado.</div>
              : sortedGroupEntries.map(([cat,catPrs]) => (
                  <div key={cat} style={{ marginBottom:12 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--theme-accent)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${DIV}` }}>{cat}</div>
                    {catPrs.map(pr => (
                      <PrRow key={pr.id} pr={pr} showActions
                        onAddResult={()=>setAddResultFor(pr)}
                        onEdit={()=>setEditingPr(pr)}
                        onDelete={()=>deletePr(pr.id)} />
                    ))}
                  </div>
                ))
            }
          </div>

          {/* Goals */}
          <div>
            <SecLabel actions={
              athGoals.length < 3 && (
                <button type="button" className="b bsm" style={{ padding:'2px 7px', fontSize:11 }} onClick={addGoal}>
                  <i className="ti ti-plus" /> Objetivo
                </button>
              )
            }>Objetivos</SecLabel>
            {athGoals.length === 0
              ? <div style={{ fontSize:12, color:DIM, fontStyle:'italic' }}>Nenhum objetivo definido.</div>
              : athGoals.map(g => (
                  <HpBar key={g.id} goal={g} color={athColor}
                    onAddSession={()=>addGoalSession(g.id)}
                    onMilestoneHit={(mi,hit)=>hitMilestone(g.id,mi,hit)}
                    onConfigure={()=>setConfiguringGoal(g.id)}
                    onDelete={()=>deleteGoal(g.id)} />
                ))
            }
          </div>
        </div>
      </div>
    );
  };

  // ── Modals ──────────────────────────────────────────────────────────────────
  const goalBeingConfigured = athGoals.find(g=>g.id===configuringGoal);

  const modals = (
    <>
      {/* Profile modal */}
      {showProfileModal && (
        <div className="settings-overlay" onClick={()=>setShowProfileModal(false)}>
          <div className="settings-modal" style={{ maxWidth:400 }} onClick={e=>e.stopPropagation()}>
            <div className="settings-drag-hdr">
              <span style={{ fontSize:13, fontWeight:700, color:CREAM }}>Perfil do Atleta</span>
              <button type="button" className="b bd bsm" style={{ marginLeft:'auto', padding:'3px 8px', minHeight:24 }} onClick={()=>setShowProfileModal(false)}><i className="ti ti-x" /></button>
            </div>
            <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
              <div className="fg"><span className="lbl">Nome</span><input className="ex-input" value={profileForm?.name||''} onChange={e=>setProfileForm(f=>({...f,name:e.target.value}))} /></div>
              <div className="g2">
                <div className="fg"><span className="lbl">Nível</span>
                  <select className="ex-input" value={profileForm?.level||''} onChange={e=>setProfileForm(f=>({...f,level:e.target.value}))}>
                    {getLevels().map(l=><option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="fg"><span className="lbl">Objetivo</span>
                  <select className="ex-input" value={profileForm?.goal||''} onChange={e=>setProfileForm(f=>({...f,goal:e.target.value}))}>
                    {getGoals().map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg"><span className="lbl">Observações</span><input className="ex-input" placeholder="ex: Joelho direito" value={profileForm?.notes||''} onChange={e=>setProfileForm(f=>({...f,notes:e.target.value}))} /></div>
              <div className="g2">
                <div className="fg">
                  <span className="lbl">Cor</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:28, height:28, background:profileForm?.color||'#e87820', border:`2px solid ${DIV}`, cursor:'pointer', flexShrink:0 }} onClick={()=>document.getElementById('ath-clr')?.click()} />
                    <input type="color" id="ath-clr" value={profileForm?.color||'#e87820'} onChange={e=>setProfileForm(f=>({...f,color:e.target.value}))} style={{ opacity:0, position:'absolute', pointerEvents:'none' }} />
                    <input className="ex-input" value={profileForm?.color||''} onChange={e=>{ if(/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setProfileForm(f=>({...f,color:e.target.value})); }} style={{ fontFamily:'monospace', fontSize:12 }} />
                  </div>
                </div>
                <div className="fg"><span className="lbl">Membro desde</span><input type="date" className="ex-input" value={profileForm?.since||''} onChange={e=>setProfileForm(f=>({...f,since:e.target.value}))} /></div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button type="button" className="b bsec" style={{ flex:1 }} onClick={()=>{saveProfile();setShowProfileModal(false);}}>
                  {profileSaved ? <><i className="ti ti-check" /> Salvo</> : <><i className="ti ti-check" /> Salvar</>}
                </button>
                <button type="button" className="b bd" style={{ padding:'0 12px' }} onClick={deleteAthlete}><i className="ti ti-trash" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal config modal */}
      {goalBeingConfigured && (
        <div className="settings-overlay" onClick={()=>setConfiguringGoal(null)}>
          <div className="settings-modal" style={{ maxWidth:400 }} onClick={e=>e.stopPropagation()}>
            <div className="settings-drag-hdr">
              <span style={{ fontSize:13, fontWeight:700, color:CREAM }}>Configurar objetivo</span>
              <button type="button" className="b bd bsm" style={{ marginLeft:'auto', padding:'3px 8px', minHeight:24 }} onClick={()=>setConfiguringGoal(null)}><i className="ti ti-x" /></button>
            </div>
            <div style={{ padding:'14px 16px' }}>
              <GoalConfigPanel goal={goalBeingConfigured} onSave={u=>updateGoal(configuringGoal,u)} onCancel={()=>setConfiguringGoal(null)} />
            </div>
          </div>
        </div>
      )}

      {/* PR modals */}
      {(showPrModal||editingPr) && <PrModal editPr={editingPr||null} existingNames={athPrs.map(p=>p.name)} onSave={savePr} onClose={()=>{setShowPrModal(false);setEditingPr(null);}} />}
      {addResultFor && <AddResultModal pr={addResultFor} onSave={result=>addResult(addResultFor.id,result)} onClose={()=>setAddResultFor(null)} />}
    </>
  );

  // ── Mobile layout ───────────────────────────────────────────────────────────
  if (isMobile) return (
    <div style={{ background:BG, minHeight:'100%', paddingBottom:70 }}>
      {pane === 0 && <div style={{ height:'calc(100vh - 120px)' }}>{renderPane1()}</div>}
      {pane === 1 && (
        <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)' }}>
          <button type="button" className="rp-mobile-back" onClick={()=>{ setPane(0); setSelAthlete(null); }}>
            <i className="ti ti-chevron-left" /> Atletas
          </button>
          <div style={{ flex:1, overflow:'hidden' }}>{renderDetail()}</div>
        </div>
      )}
      {modals}
    </div>
  );

  // ── Desktop layout ──────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', height:'calc(100vh - 120px)', minHeight:400, background:BG }}>
      <div style={{ width:200, flexShrink:0, borderRight:`1px solid ${DIV}`, display:'flex', flexDirection:'column' }}>
        {renderPane1()}
      </div>
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
        {renderDetail()}
      </div>
      {modals}
    </div>
  );
}
