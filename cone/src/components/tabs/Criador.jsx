import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  uid, toISO, todayISO,
  loadAthletes, loadRegistry,
  loadTemplates, saveTemplates,
  getTargets,
} from '../../utils/storage';
import { APP_CONFIG, ZONES, BTC, PLC } from '../../utils/config';


// ── Factories ─────────────────────────────────────────────────────────────────
const emptyEx = () => ({ id: uid(), name: '', sets: '', reps: '', intensity: null, note: '' });
const emptyMovement = () => ({ id: uid(), name: '', reps: '' });
const emptyStation = (name = 'Grupo', isRest = false) => ({
  id: uid(), name, duration: '', isRest, exercises: isRest ? [] : [emptyEx()],
});
const emptyBlock = (type = 'For Time') => {
  if (type === 'Estações') return {
    id: uid(), label: type, type,
    zone: 'Zona 01', notes: '', stationRepeat: 1, restBetweenCycles: '',
    stations: [emptyStation('Grupo A'), emptyStation('Grupo B')],
  };
  return {
    id: uid(), label: type, type,
    zone: 'Zona 01', duration: '', rounds: '', notes: '', ladderMode: false,
    exercises: [emptyEx()],
  };
};
const emptyS = () => ({ id: uid(), date: todayISO(), mainTraining: [], sessionName: '', blocks: [] });

// ── Type metadata ─────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  // RED family — intensity blocks
  'HIIT':       { icon: 'ti-bolt',        color: '#e05848', desc: 'Alta intensidade intervalado', showDuration: true,  showRounds: true,  durationLabel: 'Intervalo (s)'  },
  'MetCon':     { icon: 'ti-flame',       color: '#c84040', desc: 'Condicionamento misto',        showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  // AMBER family — time-structured blocks
  'EMOM':       { icon: 'ti-alarm',       color: '#d07828', desc: 'Every Minute on the Minute',  showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'For Time':   { icon: 'ti-clock',       color: '#c86828', desc: 'Contra o relógio',             showDuration: true,  showRounds: true,  durationLabel: 'Time cap (min)' },
  'AMRAP':      { icon: 'ti-refresh',     color: '#e09830', desc: 'Máx rounds em tempo fixo',    showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'Estações':   { icon: 'ti-map-pin',     color: '#c8a030', desc: 'Treino por grupos / estações', showDuration: false, showRounds: false, durationLabel: '', isStations: true },
  // BLUE family — barbell / lifting blocks
  'Força':      { icon: 'ti-trending-up', color: '#5090e0', desc: 'Força e hipertrofia',          showDuration: false, showRounds: true,  durationLabel: '' },
  'LPO':        { icon: 'ti-weight',      color: '#4070c0', desc: 'Levantamento Olímpico',        showDuration: false, showRounds: true,  durationLabel: '' },
  'Core':       { icon: 'ti-hexagon',     color: '#6090d8', desc: 'Core e estabilização',         showDuration: false, showRounds: true,  durationLabel: '' },
  'Acessórios': { icon: 'ti-dumbbell',    color: '#4878b8', desc: 'Trabalho acessório',            showDuration: false, showRounds: true,  durationLabel: '' },
  // GREEN family — movement quality blocks
  'Aquecimento':{ icon: 'ti-sun',         color: '#80c040', desc: 'Aquecimento e preparação',     showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'Skill':      { icon: 'ti-target',      color: '#4ac8c0', desc: 'Técnica e habilidade',         showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'Cardio':     { icon: 'ti-run',         color: '#40b878', desc: 'Cardio / Aeróbico',             showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  'Mobilidade': { icon: 'ti-leaf',        color: '#30a868', desc: 'Mobilidade e flexibilidade',   showDuration: true,  showRounds: true,  durationLabel: 'Duração (min)' },
  // NEUTRAL
  'Descanso':   { icon: 'ti-moon',        color: '#555',    desc: 'Descanso / Recovery',           showDuration: false, showRounds: true,  durationLabel: '' },
};
const DEFAULT_TYPE_CFG = { icon: 'ti-edit', color: '#888', desc: 'Bloco livre', showDuration: true, showRounds: true, durationLabel: 'Duração (min)' };
const getTypeCfg = t => TYPE_CONFIG[t] || DEFAULT_TYPE_CFG;

function blockSummary(block) {
  if (block.type === 'Estações') {
    const groups = (block.stations || []).filter(s => !s.isRest).length;
    const rests  = (block.stations || []).filter(s => s.isRest).length;
    const rep    = (block.stationRepeat || 1) > 1 ? ` ×${block.stationRepeat}` : '';
    return [groups && `${groups} grupos`, rests && `${rests} descanso`, rep].filter(Boolean).join(' · ');
  }
  const cfg = getTypeCfg(block.type);
  const parts = [];
  if (cfg.showDuration && block.duration) parts.push(`${block.duration}'`);
  if (cfg.showRounds && block.rounds) parts.push(`${block.rounds}×`);
  const named = (block.exercises || []).filter(e => e.name.trim()).length;
  if (named) parts.push(`${named} mov.`);
  return parts.join(' · ');
}

const maskMMSS = raw => {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : d.slice(0, 2) + ':' + d.slice(2);
};

// ── IntensityInput ────────────────────────────────────────────────────────────
function IntensityInput({ value, onChange, defaultReps, defaultSets }) {
  const [mode, setMode] = useState(value?.mode || 'none');
  useEffect(() => { setMode(value?.mode || 'none'); }, [value?.mode]);
  const v = value || {};
  const upd = p => onChange({ ...v, mode, ...p });
  const setM = m => {
    setMode(m);
    if (m === 'none') onChange(null);
    else if (m === 'progression') {
      let steps;
      if (v.steps?.length) { steps = v.steps; }
      else {
        const numSets = parseInt(defaultSets) || 1;
        steps = Array.from({ length: numSets }, () => ({ reps: defaultReps || '', load: '', unit: '% do RM' }));
      }
      onChange({ mode: 'progression', steps });
    } else onChange({ mode: m });
  };
  const inlineSelStyle = { fontFamily: 'inherit', fontSize: '11px', border: '1px solid #2e2e2e', borderRadius: '4px', padding: '4px 6px', background: '#111', color: '#ccc', outline: 'none', WebkitAppearance: 'none', appearance: 'none', width: '66px' };
  const steps = value?.steps || [];
  const updStep = (i, field, val) => { const ns = [...steps]; ns[i] = { ...ns[i], [field]: val }; onChange({ mode: 'progression', steps: ns }); };
  const addStep = () => onChange({ mode: 'progression', steps: [...steps, { reps: defaultReps || steps[steps.length-1]?.reps || '', load: '', unit: steps[steps.length-1]?.unit || '% do RM' }] });
  const delStep = i => onChange({ mode: 'progression', steps: steps.filter((_, j) => j !== i) });

  return (
    <div className="int-block">
      <span className="lbl" style={{ marginBottom: 6 }}>Intensidade / Carga</span>
      <div className="int-tabs">
        {[['none','—'],['pct','% RM'],['progression','Progressão'],['gender','M/F'],['cardio','Cardio']].map(([m,l]) =>
          <button key={m} type="button" className={`itb${mode===m?' iact':''}`} onClick={() => setM(m)}>{l}</button>
        )}
      </div>
      {mode === 'none' && <div style={{ fontSize: 12, color: '#444', padding: '2px 0' }}>Sem intensidade definida.</div>}
      {mode === 'pct' && (
        <div className="fg">
          <span className="lbl">% do RM</span>
          <input type="number" min={1} max={110} placeholder="ex: 80" value={v.pct || ''} onChange={e => upd({ pct: e.target.value })} />
        </div>
      )}
      {mode === 'progression' && (
        <div>
          <table className="prog-table">
            <thead><tr><th>#</th><th>Reps</th><th>Carga</th><th>Un.</th></tr></thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={i}>
                  <td style={{ color: '#555', fontSize: 11, textAlign: 'center' }}>{i+1}</td>
                  <td><input type="text" placeholder={defaultReps||'—'} value={s.reps??''} onChange={e => updStep(i,'reps',e.target.value)} /></td>
                  <td><input type="number" placeholder="—" value={s.load||''} onChange={e => updStep(i,'load',e.target.value)} /></td>
                  <td>
                    <select value={s.unit||'% do RM'} onChange={e => updStep(i,'unit',e.target.value)} style={inlineSelStyle}>
                      <option>% do RM</option><option value="kg">kg</option><option value="lb">lb</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button type="button" className="b bsm" onClick={addStep}><i className="ti ti-plus" /> Série</button>
            {steps.length > 1 && <button type="button" className="b bd bsm" onClick={() => delStep(steps.length-1)}><i className="ti ti-minus" /></button>}
          </div>
        </div>
      )}
      {mode === 'gender' && (
        <div className="gblock">
          {['Masculino','Feminino'].map(g => (
            <div key={g}>
              <div className="gst">{g}</div>
              <div className="fg" style={{ marginBottom: 6 }}>
                <span className="lbl">Unidade</span>
                <select style={{ ...inlineSelStyle, width: '100%' }} value={v[`${g}_unit`]||'kg'} onChange={e => upd({ [`${g}_unit`]: e.target.value })}>
                  <option>kg</option><option value="lb">lb</option>
                </select>
              </div>
              {['RX','Inter','SC'].map(cat => (
                <div key={cat} className="fg" style={{ marginBottom: 6 }}>
                  <span className="lbl">{cat}</span>
                  <input type="number" placeholder="0" value={v[`${g}_${cat}`]||''} onChange={e => upd({ [`${g}_${cat}`]: e.target.value })} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {mode === 'cardio' && (
        <div className="unit-row">
          <div className="fg">
            <span className="lbl">Quantidade</span>
            <input type="number" placeholder="400" value={v.cardioVal||''} onChange={e => upd({ cardioVal: e.target.value })} />
          </div>
          <div className="fg" style={{ width: 110 }}>
            <span className="lbl">Unidade</span>
            <select style={{ ...inlineSelStyle, width: 110 }} value={v.cardioUnit||'m'} onChange={e => upd({ cardioUnit: e.target.value })}>
              <option value="m">metros</option><option value="cal">calorias</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ExerciseCombobox ──────────────────────────────────────────────────────────
function ExerciseCombobox({ value, onChange, blockLabel, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef();

  const suggestions = useMemo(() => {
    const reg = loadRegistry() || {};
    const primary = reg[blockLabel] || [];
    if (!query.trim()) return primary;
    const q = query.toLowerCase();
    const primaryMatches = primary.filter(e => e.toLowerCase().includes(q));
    const allOthers = [...new Set(Object.values(reg).flat())]
      .filter(e => !primary.includes(e) && e.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b, 'pt'));
    return [...primaryMatches, ...allOthers];
  }, [blockLabel, query]);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = name => { setQuery(name); onChange(name); setOpen(false); };

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <input
        value={query}
        placeholder={placeholder}
        style={{ width: '100%', fontFamily: 'inherit', fontSize: 15, border: '1px solid #2e2e2e', borderRadius: 6, padding: '9px 11px', background: '#111', color: '#e0e0e0', outline: 'none', transition: 'border-color .15s' }}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'ArrowDown' && open && suggestions.length) ref.current?.querySelector('.ex-suggestion')?.focus();
        }}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#1a1a1a', border: '1px solid #333', borderRadius: 5, maxHeight: 180, overflowY: 'auto', marginTop: 2, boxShadow: '0 4px 12px rgba(0,0,0,.5)' }}>
          {suggestions.map((s, i) => (
            <div
              key={i} className="ex-suggestion" tabIndex={0}
              style={{ padding: '7px 12px', fontSize: 13, color: '#ddd', cursor: 'pointer', borderBottom: i < suggestions.length-1 ? '1px solid #222' : 'none' }}
              onMouseDown={e => { e.preventDefault(); select(s); }}
              onKeyDown={e => {
                if (e.key === 'Enter') select(s);
                if (e.key === 'ArrowDown') e.currentTarget.nextSibling?.focus();
                if (e.key === 'ArrowUp') { const prev = e.currentTarget.previousSibling; prev ? prev.focus() : ref.current?.querySelector('input')?.focus(); }
                if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('input')?.focus(); }
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#252525'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── BlockTypePicker ───────────────────────────────────────────────────────────
function BlockTypePicker({ blockNames, onSelect, onClose }) {
  const known = Object.keys(TYPE_CONFIG);
  const extra = (blockNames || APP_CONFIG.blockNames || []).filter(n => n !== '-' && !known.includes(n));
  const types = [...known, ...extra];

  return (
    <div className="btp-backdrop" onClick={onClose}>
      <div className="btp-modal" onClick={e => e.stopPropagation()}>
        <div className="btp-header">
          <span>Que tipo de bloco?</span>
          <button type="button" className="b bsm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="btp-grid">
          {types.map(type => {
            const cfg = getTypeCfg(type);
            return (
              <button key={type} type="button" className="btp-card" onClick={() => onSelect(type)}
                style={{ '--btp-color': cfg.color }}>
                <i className={`ti ${cfg.icon} btp-icon`} />
                <span className="btp-name">{type}</span>
                <span className="btp-desc">{cfg.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── ExerciseRow ───────────────────────────────────────────────────────────────
function loadBadgeStr(ex) {
  const ins = ex.intensity;
  if (!ins || !ins.mode || ins.mode === 'none') return null;
  if (ins.mode === 'pct') return ins.pct ? `${ins.pct}%` : null;
  if (ins.mode === 'cardio') return ins.cardioVal ? `${ins.cardioVal}${ins.cardioUnit || 'm'}` : null;
  if (ins.mode === 'gender') {
    const scales = ['RX','Inter','SC'];
    const hasAny = scales.some(k => ins[`Masculino_${k}`] || ins[`Feminino_${k}`]);
    return hasAny ? 'M/F' : null;
  }
  if (ins.mode === 'progression') {
    const steps = ins.steps || [];
    const loads = steps.map(s => s.load).filter(Boolean);
    if (!loads.length) return '↗';
    const unit = (steps[0]?.unit || '%').replace('% do RM', '%');
    return `${loads[0]}${unit}`;
  }
  return null;
}

function ExerciseRow({ ex, blockLabel, blockType, ladderMode, onToggleLadder, onUpdate, onDelete, canDelete, dragIdx, setDragIdx, dragOverIdx, setDragOverIdx, myIdx }) {
  const [showDetail, setShowDetail] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile && showDetail) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isMobile, showDetail]);

  const upd = (field, val) => onUpdate({ ...ex, [field]: val });

  const isComplex  = !!ex.isComplex;
  const movements  = ex.complexMovements || [];
  const notation   = movements.map(m => m.reps || '?').join('+');

  const toggleComplex = () => {
    if (!isComplex) {
      const numSets = parseInt(ex.sets) || 3;
      onUpdate({
        ...ex,
        isComplex: true,
        complexMovements: [emptyMovement(), emptyMovement()],
        // Default to progression so load steps are ready to fill in
        intensity: (!ex.intensity || ex.intensity.mode === 'none')
          ? { mode: 'progression', steps: Array.from({ length: numSets }, () => ({ reps: '', load: '', unit: '% do RM' })) }
          : ex.intensity,
      });
    } else {
      onUpdate({ ...ex, isComplex: false, complexMovements: [] });
    }
  };

  const updMovement = (mi, field, val) =>
    upd('complexMovements', movements.map((m, i) => i === mi ? { ...m, [field]: val } : m));
  const addMovement = () => upd('complexMovements', [...movements, emptyMovement()]);
  const delMovement = mi => upd('complexMovements', movements.filter((_, i) => i !== mi));

  const renderDetailBody = () => (
    <>
      <div className="ex-mode-row">
        <button type="button" className={`ex-mode-btn${isComplex ? ' on' : ''}`} onClick={toggleComplex}>
          Complexo
        </button>
        <button type="button" className={`ex-mode-btn${ladderMode ? ' on' : ''}`} onClick={() => onToggleLadder?.()}>
          Escada
        </button>
      </div>

      {isComplex && (
        <div className="ex-complex-body">
          <span className="lbl" style={{ marginBottom: 8 }}>Movimentos</span>
          {movements.map((mv, mi) => (
            <div key={mv.id} className="ex-movement-row">
              <ExerciseCombobox
                value={mv.name}
                onChange={v => updMovement(mi, 'name', v)}
                blockLabel={blockLabel || blockType}
                placeholder={`Movimento ${mi + 1}`}
              />
              <span className="ex-qty-sep" style={{ flexShrink: 0 }}>×</span>
              <input
                type="text" className="ex-qty-input"
                value={mv.reps} placeholder="?" title="Reps deste movimento"
                onChange={e => updMovement(mi, 'reps', e.target.value)}
              />
              {movements.length > 1 && (
                <button type="button" className="b bd bsm" style={{ padding: '3px 7px', minHeight: 26 }} onClick={() => delMovement(mi)}>
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <button type="button" className="b bsm" onClick={addMovement}>
              <i className="ti ti-plus" /> Movimento
            </button>
            {notation && (
              <span className="ex-notation">
                {ex.sets || '?'}×({notation})
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <IntensityInput
          value={ex.intensity}
          onChange={ins => upd('intensity', ins)}
          defaultReps={isComplex ? notation : ex.reps}
          defaultSets={ex.sets}
        />
      </div>

      <div className="fg" style={{ marginTop: 10 }}>
        <span className="lbl">Observação</span>
        <textarea
          placeholder="Dica, variação, referência..."
          style={{ minHeight: 38 }}
          value={ex.note}
          onChange={e => upd('note', e.target.value)}
        />
      </div>
    </>
  );

  return (
    <div
      className={`ex-row${dragOverIdx === myIdx ? ' ex-row-drag-over' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOverIdx(myIdx); }}
      onDragLeave={() => setDragOverIdx(null)}
      onDrop={e => { e.preventDefault(); setDragOverIdx(null); if (dragIdx.current !== null && dragIdx.current !== myIdx) { onUpdate(null, dragIdx.current, myIdx); dragIdx.current = null; } }}
    >
      {/* ── Main row ── */}
      <div className="ex-row-main">
        <i
          className="ti ti-grip-vertical ex-drag"
          draggable
          onDragStart={e => { e.stopPropagation(); dragIdx.current = myIdx; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(myIdx)); }}
          onDragEnd={() => { dragIdx.current = null; setDragOverIdx(null); }}
        />

        {isComplex ? (
          <input
            className="ex-complex-name"
            placeholder="Nome do complexo (opcional)"
            value={ex.name}
            onChange={e => upd('name', e.target.value)}
          />
        ) : (
          <ExerciseCombobox
            value={ex.name}
            onChange={v => upd('name', v)}
            blockLabel={blockLabel || blockType}
            placeholder="Nome do exercício"
          />
        )}

        {/* Qty — desktop only; on mobile it moves to the bottom sheet */}
        {!isMobile && (isComplex ? (
          <span className="ex-complex-badge" title="Séries × notação do complexo">
            <input
              type="text" className="ex-qty-input"
              value={ex.sets} placeholder="?" title="Séries"
              onChange={e => upd('sets', e.target.value)}
              style={{ marginRight: 3 }}
            />
            <span className="ex-qty-sep">×</span>
            <span className="ex-complex-notation">{notation || '…'}</span>
          </span>
        ) : (
          <div className="ex-qty">
            <input
              type="text" className="ex-qty-input"
              value={ex.sets} placeholder="—" title="Séries"
              onChange={e => upd('sets', e.target.value)}
            />
            <span className="ex-qty-sep">×</span>
            <input
              type="text" className="ex-qty-input"
              value={ex.reps} placeholder={ladderMode ? '15,12,9' : '—'} title="Reps"
              onChange={e => upd('reps', e.target.value)}
            />
          </div>
        ))}

        {(() => { const b = loadBadgeStr(ex); return b && !showDetail ? <span className="ex-load-badge">{b}</span> : null; })()}

        <button
          type="button"
          className={`ex-detail-btn${showDetail ? ' active' : ''}`}
          onClick={() => setShowDetail(v => !v)}
          title={isComplex ? 'Movimentos e carga' : 'Intensidade e observação'}
        >
          <i className={`ti ${isComplex ? 'ti-circles-relation' : 'ti-settings'}`} />
        </button>
        {canDelete && (
          <button type="button" className="b bd bsm ex-del" onClick={onDelete} title="Remover">
            <i className="ti ti-x" />
          </button>
        )}
      </div>

      {/* ── Detail: inline expand (desktop) ── */}
      {!isMobile && showDetail && (
        <div className="ex-detail">
          {renderDetailBody()}
        </div>
      )}

      {/* ── Detail: bottom sheet (mobile) ── */}
      {isMobile && showDetail && (
        <div className="ex-sheet-backdrop" onClick={() => setShowDetail(false)}>
          <div className="ex-sheet" onClick={e => e.stopPropagation()}>
            <div className="ex-sheet-handle" />
            <div className="ex-sheet-header">
              <div className="ex-sheet-title">
                {ex.name || (isComplex ? 'Complexo' : 'Exercício')}
              </div>
            </div>
            <div className="ex-sheet-body">
              <div className="sheet-qty-row">
                {isComplex ? (
                  <>
                    <div className="sheet-qty-field">
                      <input
                        type="text" className="sheet-qty-input"
                        value={ex.sets} placeholder="?" title="Séries"
                        onChange={e => upd('sets', e.target.value)}
                      />
                      <span className="sheet-qty-lbl">Séries</span>
                    </div>
                    <span className="ex-qty-sep sheet-qty-sep-lg">×</span>
                    <div className="sheet-qty-field">
                      <span className="ex-complex-notation sheet-notation-lg">{notation || '…'}</span>
                      <span className="sheet-qty-lbl">Notação</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sheet-qty-field">
                      <input
                        type="text" className="sheet-qty-input"
                        value={ex.sets} placeholder="—" title="Séries"
                        onChange={e => upd('sets', e.target.value)}
                      />
                      <span className="sheet-qty-lbl">Séries</span>
                    </div>
                    <span className="ex-qty-sep sheet-qty-sep-lg">×</span>
                    <div className="sheet-qty-field">
                      <input
                        type="text" className="sheet-qty-input"
                        value={ex.reps} placeholder={ladderMode ? '15,12,9' : '—'} title="Reps"
                        onChange={e => upd('reps', e.target.value)}
                      />
                      <span className="sheet-qty-lbl">Reps</span>
                    </div>
                  </>
                )}
              </div>
              {renderDetailBody()}
            </div>
            <div className="ex-sheet-footer">
              <button className="ex-sheet-close" type="button" onClick={() => setShowDetail(false)}>
                <i className="ti ti-check" /> Feito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── StationEditor ─────────────────────────────────────────────────────────────
function StationEditor({ block, onUpdate }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const stations = block.stations || [];
  const noopDragRef = { current: null };

  const updBlock = patch => onUpdate({ ...block, ...patch });
  const updStation = (si, patch) =>
    updBlock({ stations: stations.map((s, i) => i === si ? { ...s, ...patch } : s) });

  const addStation = (isRest = false) => {
    const groupCount = stations.filter(s => !s.isRest).length;
    const name = isRest ? 'Descanso' : `Grupo ${String.fromCharCode(65 + groupCount)}`;
    updBlock({ stations: [...stations, emptyStation(name, isRest)] });
  };
  const delStation = si => updBlock({ stations: stations.filter((_, i) => i !== si) });

  const updStationEx = (si, exOrNull, fromIdx, toIdx) => {
    const ss = stations.map((s, i) => {
      if (i !== si) return s;
      if (exOrNull === null) {
        const exs = [...s.exercises];
        const [mv] = exs.splice(fromIdx, 1);
        exs.splice(toIdx, 0, mv);
        return { ...s, exercises: exs };
      }
      return { ...s, exercises: s.exercises.map(e => e.id === exOrNull.id ? exOrNull : e) };
    });
    updBlock({ stations: ss });
  };
  const addStationEx = si =>
    updBlock({ stations: stations.map((s, i) => i === si ? { ...s, exercises: [...s.exercises, emptyEx()] } : s) });
  const delStationEx = (si, exId) =>
    updBlock({ stations: stations.map((s, i) => i === si ? { ...s, exercises: s.exercises.filter(e => e.id !== exId) } : s) });

  return (
    <div>
      {/* Cycle controls */}
      <div className="st-repeat-row">
        <label className="blk-meta-field">
          <span>Repetições do ciclo</span>
          <input type="number" min={1} placeholder="1" value={block.stationRepeat || 1}
            onChange={e => updBlock({ stationRepeat: parseInt(e.target.value) || 1 })} />
        </label>
        <label className="blk-meta-field">
          <span>Descanso entre ciclos</span>
          <input type="text" placeholder="ex: 2:00" value={block.restBetweenCycles || ''}
            onChange={e => updBlock({ restBetweenCycles: e.target.value })} />
        </label>
      </div>

      {/* Station list */}
      {stations.map((st, si) => (
        <div
          key={st.id}
          className={`st-block${st.isRest ? ' st-rest' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOverIdx(si); }}
          onDragLeave={() => setDragOverIdx(null)}
          onDrop={e => {
            e.preventDefault(); setDragOverIdx(null);
            if (dragIdx !== null && dragIdx !== si) {
              const ss = [...stations];
              const [mv] = ss.splice(dragIdx, 1);
              ss.splice(si, 0, mv);
              updBlock({ stations: ss });
              setDragIdx(null);
            }
          }}
          style={{ outline: dragOverIdx === si ? '2px solid #c8a030' : 'none', outlineOffset: 2 }}
        >
          <div className="st-header">
            <i className="ti ti-grip-vertical" style={{ color: '#2a2a2a', fontSize: 13, cursor: 'grab', flexShrink: 0 }}
              draggable onDragStart={() => setDragIdx(si)} onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }} />
            {st.isRest
              ? <span className="st-rest-badge">Descanso</span>
              : null}
            <input className="st-name-input" placeholder={st.isRest ? 'Descanso' : 'Nome do grupo'}
              value={st.name} onChange={e => updStation(si, { name: e.target.value })} />
            <input className="st-dur-input" placeholder="00:00" title="Duração (MM:SS)"
              value={st.duration} onChange={e => updStation(si, { duration: maskMMSS(e.target.value) })} />
            <button type="button" className={`ex-mode-btn${st.isRest ? ' on' : ''}`}
              style={{ padding: '3px 8px', fontSize: 11 }}
              onClick={() => updStation(si, { isRest: !st.isRest, exercises: st.isRest ? [emptyEx()] : [] })}
              title="Marcar como intervalo de descanso">
              Descanso
            </button>
            {stations.length > 1 && (
              <button type="button" className="b bd bsm" style={{ padding: '3px 7px', minHeight: 26 }}
                onClick={() => delStation(si)}>
                <i className="ti ti-x" />
              </button>
            )}
          </div>

          {!st.isRest && (
            <div className="st-exercises">
              {(st.exercises || []).map((ex, ei) => (
                <ExerciseRow
                  key={ex.id} ex={ex} myIdx={ei}
                  blockLabel={block.label !== block.type ? block.label : null}
                  blockType={block.type}
                  ladderMode={false}
                  onUpdate={(exOrNull, fromIdx, toIdx) => updStationEx(si, exOrNull, fromIdx, toIdx)}
                  onDelete={() => delStationEx(si, ex.id)}
                  canDelete={(st.exercises || []).length > 1}
                  dragIdx={noopDragRef} setDragIdx={() => {}}
                  dragOverIdx={null} setDragOverIdx={() => {}}
                />
              ))}
              <div className="blk-ex-actions" style={{ paddingTop: 4 }}>
                <button type="button" className="b bsm" style={{ flex: 1 }} onClick={() => addStationEx(si)}>
                  <i className="ti ti-plus" /> Exercício
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add station buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="button" className="b bsm" style={{ flex: 1 }} onClick={() => addStation(false)}>
          <i className="ti ti-plus" /> Grupo
        </button>
        <button type="button" className="b bsm" style={{ flex: 1 }} onClick={() => addStation(true)}>
          <i className="ti ti-clock-pause" /> Descanso
        </button>
      </div>
    </div>
  );
}

// ── BlockEditor ───────────────────────────────────────────────────────────────
function BlockEditor({ block, idx, total, blockNames, onUpdate, onDelete, onCopy, collapsed, onToggleCollapse, dragBlkIdx, dragOverBlkIdx, setDragOverBlkIdx, reorderBlocks, blockIdx }) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showAdv, setShowAdv] = useState(false);
  const dragExIdx = useRef(null);
  const [dragOverExIdx, setDragOverExIdx] = useState(null);

  const cfg = getTypeCfg(block.type);
  const summary = blockSummary(block);
  const customName = block.label && block.label !== block.type ? block.label : '';

  const addEx = () => onUpdate({ ...block, exercises: [...block.exercises, emptyEx()] });
  const copyLastEx = () => {
    const last = block.exercises[block.exercises.length - 1];
    if (last) onUpdate({ ...block, exercises: [...block.exercises, { ...last, id: uid() }] });
  };

  const handleExUpdate = (exOrNull, fromIdx, toIdx) => {
    if (exOrNull === null) {
      // reorder
      const exs = [...block.exercises];
      const [mv] = exs.splice(fromIdx, 1);
      exs.splice(toIdx, 0, mv);
      onUpdate({ ...block, exercises: exs });
    } else {
      onUpdate({ ...block, exercises: block.exercises.map(x => x.id === exOrNull.id ? exOrNull : x) });
    }
  };

  const delEx = id => onUpdate({ ...block, exercises: block.exercises.filter(x => x.id !== id) });

  const changeType = newType => {
    onUpdate({ ...block, type: newType, label: customName || newType });
    setShowTypePicker(false);
  };

  return (
    <div
      className={`blk-wrap ${BTC[block.type] || 'bt-st'}`}
      style={{ outline: dragOverBlkIdx === blockIdx ? '2px solid var(--theme-accent)' : 'none', outlineOffset: 2, borderRadius: 8, transition: 'outline .1s' }}
      onDragOver={e => { e.preventDefault(); if (dragBlkIdx?.current !== null && dragBlkIdx?.current !== blockIdx) setDragOverBlkIdx?.(blockIdx); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverBlkIdx?.(null); }}
      onDrop={e => {
        e.preventDefault();
        const from = dragBlkIdx?.current;
        setDragOverBlkIdx?.(null);
        if (from !== null && from !== undefined && from !== blockIdx) reorderBlocks?.(from, blockIdx);
        if (dragBlkIdx) dragBlkIdx.current = null;
      }}
    >
      {/* ── Collapsed bar ── */}
      <div className="blk-bar">
        <span
          className="drag-handle"
          title="Arrastar bloco"
          draggable
          onDragStart={e => { if (dragBlkIdx) dragBlkIdx.current = blockIdx; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(blockIdx)); }}
          onDragEnd={() => { if (dragBlkIdx) dragBlkIdx.current = null; setDragOverBlkIdx?.(null); }}
        >
          <i className="ti ti-grip-vertical" />
        </span>
        <button type="button" className="collapse-btn" onClick={onToggleCollapse} title={collapsed ? 'Expandir' : 'Recolher'}>
          <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} />
        </button>

        {/* Type badge */}
        <span className="blk-type-chip" style={{ background: cfg.color + '22', color: cfg.color, borderColor: cfg.color + '44' }}>
          <i className={`ti ${cfg.icon}`} /> {block.type}
        </span>

        {/* Custom name if set */}
        {customName && <span className="blk-custom-name">{customName}</span>}

        {/* Summary when collapsed */}
        {collapsed && summary && <span className="blk-summary">{summary}</span>}

        <div className="blk-spacer" />

        <button type="button" className="b bsm" style={{ padding: '3px 8px', minHeight: 26, fontSize: 11 }} onClick={onCopy} title="Duplicar bloco">
          <i className="ti ti-copy" />
        </button>
        {total > 1 && (
          <button type="button" className="b bd bsm" style={{ padding: '3px 8px', minHeight: 26, fontSize: 11 }} onClick={onDelete}>
            <i className="ti ti-trash" />
          </button>
        )}
      </div>

      {/* ── Expanded body ── */}
      {!collapsed && (
        <div className="blk-body">
          {/* Type + name row */}
          <div className="blk-type-row">
            <button type="button" className="blk-type-btn" onClick={() => setShowTypePicker(true)}
              style={{ borderColor: cfg.color + '66', color: cfg.color }}>
              <i className={`ti ${cfg.icon}`} /> {block.type}
              <i className="ti ti-chevron-down" style={{ fontSize: 10, opacity: .6, marginLeft: 4 }} />
            </button>
            <input
              className="blk-name-input"
              placeholder={`Nome personalizado (padrão: ${block.type})`}
              value={customName}
              onChange={e => onUpdate({ ...block, label: e.target.value.trim() || block.type })}
            />
          </div>

          {/* Adaptive meta fields */}
          {(cfg.showDuration || cfg.showRounds) && (
            <div className="blk-meta-row">
              {cfg.showDuration && (
                <label className="blk-meta-field">
                  <span>{cfg.durationLabel || 'Duração (min)'}</span>
                  <input type="number" min={1} placeholder="—" value={block.duration}
                    onChange={e => onUpdate({ ...block, duration: e.target.value })} />
                </label>
              )}
              {cfg.showRounds && (
                <label className="blk-meta-field">
                  <span>Rounds</span>
                  <input type="number" min={1} placeholder="—" value={block.rounds}
                    onChange={e => onUpdate({ ...block, rounds: e.target.value })} />
                </label>
              )}
            </div>
          )}

          {/* Exercise list or StationEditor */}
          {cfg.isStations ? (
            <StationEditor block={block} onUpdate={onUpdate} />
          ) : (
            <>
              <div className="blk-ex-list">
                {(block.exercises || []).map((ex, ei) => (
                  <ExerciseRow
                    key={ex.id}
                    ex={ex}
                    myIdx={ei}
                    blockLabel={block.label !== block.type ? block.label : null}
                    blockType={block.type}
                    ladderMode={block.ladderMode}
                    onToggleLadder={() => onUpdate({ ...block, ladderMode: !block.ladderMode })}
                    onUpdate={handleExUpdate}
                    onDelete={() => delEx(ex.id)}
                    canDelete={block.exercises.length > 1}
                    dragIdx={dragExIdx}
                    setDragIdx={() => {}}
                    dragOverIdx={dragOverExIdx}
                    setDragOverIdx={setDragOverExIdx}
                  />
                ))}
              </div>
              <div className="blk-ex-actions">
                <button type="button" className="b bsm" style={{ flex: 1 }} onClick={addEx}>
                  <i className="ti ti-plus" /> Exercício
                </button>
                {block.exercises.length > 0 && (
                  <button type="button" className="b bsm" style={{ flex: 1 }} onClick={copyLastEx}>
                    <i className="ti ti-copy" /> Copiar último
                  </button>
                )}
              </div>
            </>
          )}

          {/* Notes — always visible */}
          <div className="fg" style={{ marginTop: 8 }}>
            <textarea
              className="blk-notes-quick"
              placeholder="Notas do bloco — descrição, time cap, regras, buy-in..."
              value={block.notes}
              onChange={e => onUpdate({ ...block, notes: e.target.value })}
            />
          </div>

          {/* Advanced toggle — zona only */}
          <button type="button" className="blk-adv-toggle" onClick={() => setShowAdv(v => !v)}>
            <i className={`ti ti-chevron-${showAdv ? 'up' : 'down'}`} />
            Avançado {showAdv ? '' : '(zona)'}
          </button>

          {showAdv && (
            <div className="blk-adv-body">
              <div className="blk-adv-row">
                <label className="blk-meta-field">
                  <span>Zona</span>
                  <select value={block.zone || 'Zona 01'} onChange={e => onUpdate({ ...block, zone: e.target.value })}
                    style={{ background: '#111', border: '1px solid #2e2e2e', borderRadius: 5, color: '#ccc', padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}>
                    {ZONES.map(z => <option key={z}>{z}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {showTypePicker && (
        <BlockTypePicker blockNames={blockNames} onSelect={changeType} onClose={() => setShowTypePicker(false)} />
      )}
    </div>
  );
}

// ── TrainingCreator ───────────────────────────────────────────────────────────
function TrainingCreator({ sessions, setSessions, blockNames, preload, onPreloadConsumed, onGoToPublish }) {
  const [form, setForm]                     = useState(emptyS());
  const [blocks, setBlocks]                 = useState([]);
  const [editing, setEditing]               = useState(null);
  const [showAlvoModal, setShowAlvoModal]   = useState(false);
  const [pendingDate, setPendingDate]       = useState(null);
  const [collapsedBlocks, setCollapsedBlocks] = useState({});
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [templates, setTemplates]           = useState(loadTemplates);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateFlash, setTemplateFlash]   = useState(null);
  const [recurringTpl, setRecurringTpl]     = useState(null);
  const [recurDays, setRecurDays]           = useState(new Set([1, 3, 5]));
  const [recurStart, setRecurStart]         = useState(todayISO);
  const [recurEnd, setRecurEnd]             = useState(() => { const d = new Date(); d.setDate(d.getDate() + 28); return toISO(d); });
  const [recurDone, setRecurDone]           = useState(null);
  const [weekOffset, setWeekOffset]         = useState(0);
  const [weekGridCollapsed, setWeekGridCollapsed] = useState(false);
  const [isDirty, setIsDirty]               = useState(false);
  const [showSessNotes, setShowSessNotes]   = useState(false);
  const [undoToast, setUndoToast]           = useState(null);
  const undoTimerRef = useRef(null);
  const formRef = useRef();

  const fireUndo = (msg, undoFn) => {
    clearTimeout(undoTimerRef.current);
    setUndoToast({ msg, undoFn });
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
  };

  // Preload
  useEffect(() => {
    if (!preload) return;
    if (preload._newForDate) {
      setForm({ ...emptyS(), date: preload._newForDate });
      setBlocks([]);
      setEditing(null);
    } else {
      startEdit(preload, preload.date || preload._dateKey || '');
    }
    onPreloadConsumed?.();
  }, [preload]);

  const startEdit = (s, dateKey) => {
    const targets = getTargets(s);
    const sName = typeof s.mainTraining === 'string' ? s.mainTraining : (s.sessionName || '');
    setForm({ ...s, date: dateKey, mainTraining: targets, sessionName: sName });
    setBlocks(s.blocks?.length ? s.blocks : []);
    setEditing({ dateKey, id: s.id });
    setIsDirty(false);
    setShowSessNotes(!!(s.notes));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const cancel = () => {
    setForm(emptyS()); setBlocks([]); setEditing(null); setShowAlvoModal(false);
    setIsDirty(false); setShowSessNotes(false);
  };

  const cloneBlocks = bls => bls.map(bl => ({
    ...bl, id: uid(),
    exercises: (bl.exercises || []).map(ex => ({
      ...ex, id: uid(),
      complexMovements: (ex.complexMovements || []).map(mv => ({ ...mv, id: uid() })),
    })),
  }));

  // Templates
  const saveAsTemplate = () => {
    const name = (form.sessionName || '').trim() || `Template ${templates.length + 1}`;
    const tpl = { id: uid(), name, blocks: cloneBlocks(blocks) };
    const updated = [...templates, tpl];
    setTemplates(updated); saveTemplates(updated);
    setTemplateFlash(name); setTimeout(() => setTemplateFlash(null), 2000);
  };
  const applyTemplate = tpl => {
    setBlocks(cloneBlocks(tpl.blocks));
    setForm(f => ({ ...f, sessionName: f.sessionName || tpl.name }));
    setShowTemplateModal(false);
  };
  const deleteTemplate = id => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated); saveTemplates(updated);
  };

  // Recurring
  const recurPreviewDates = useMemo(() => {
    if (!recurStart || !recurEnd) return [];
    const out = [];
    const cur = new Date(recurStart + 'T12:00:00');
    const end = new Date(recurEnd + 'T12:00:00');
    while (cur <= end) {
      if (recurDays.has(cur.getDay())) out.push(toISO(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [recurStart, recurEnd, recurDays]);

  const applyRecurring = () => {
    if (!recurringTpl || !recurPreviewDates.length) return;
    setSessions(prev => {
      const next = { ...prev };
      recurPreviewDates.forEach(dateKey => {
        const session = { id: uid(), date: dateKey, sessionName: recurringTpl.name, mainTraining: [], blocks: cloneBlocks(recurringTpl.blocks) };
        next[dateKey] = [...(next[dateKey] || []), session];
      });
      return next;
    });
    setRecurDone(recurPreviewDates.length);
    setTimeout(() => { setRecurDone(null); setRecurringTpl(null); }, 2500);
  };

  // Save / delete
  const saveS = () => {
    const dateKey = form.date || todayISO();
    const session = { ...form, date: dateKey, blocks, id: editing?.id || form.id };
    setSessions(prev => {
      const next = { ...prev };
      if (editing) {
        const oldKey = editing.dateKey;
        if (oldKey !== dateKey) next[oldKey] = (next[oldKey] || []).filter(s => s.id !== editing.id);
        if ((next[dateKey] || []).some(s => s.id === editing.id))
          next[dateKey] = next[dateKey].map(s => s.id === editing.id ? session : s);
        else
          next[dateKey] = [...(next[dateKey] || []), session];
      } else {
        next[dateKey] = [...(next[dateKey] || []), session];
      }
      return next;
    });
    cancel();
  };

  const del = (dateKey, id) => setSessions(prev => {
    const n = { ...prev };
    n[dateKey] = (n[dateKey] || []).filter(s => s.id !== id);
    return n;
  });

  // Block management
  const [insertAtIdx, setInsertAtIdx] = useState(null);
  const addBlock = type => {
    const newBlk = emptyBlock(type);
    setBlocks(b => {
      if (insertAtIdx === null) return [...b, newBlk];
      const next = [...b]; next.splice(insertAtIdx + 1, 0, newBlk); return next;
    });
    setInsertAtIdx(null);
    setShowBlockPicker(false);
    setIsDirty(true);
  };
  const copyBlock = id => {
    setBlocks(b => {
      const idx = b.findIndex(x => x.id === id);
      if (idx < 0) return b;
      const orig = b[idx];
      const copy = { ...orig, id: uid(), exercises: (orig.exercises || []).map(ex => ({ ...ex, id: uid() })) };
      const next = [...b]; next.splice(idx + 1, 0, copy); return next;
    });
    setIsDirty(true);
  };
  const updBlock = (id, upd) => { setBlocks(b => b.map(x => x.id === id ? upd : x)); setIsDirty(true); };
  const delBlock = id => {
    const idx = blocks.findIndex(x => x.id === id);
    if (blocks.length <= 1 || idx < 0) return;
    const deleted = blocks[idx];
    setBlocks(b => b.filter(x => x.id !== id));
    setIsDirty(true);
    fireUndo('Bloco removido', () => {
      setBlocks(b => { const n = [...b]; n.splice(idx, 0, deleted); return n; });
    });
  };

  const dragBlkIdx = useRef(null);
  const [dragOverBlkIdx, setDragOverBlkIdx] = useState(null);
  const reorderBlocks = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx === null || toIdx === null) return;
    setBlocks(prev => {
      const arr = [...prev];
      const [mv] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, mv);
      return arr;
    });
  };

  // Week grid
  const getSundayWeek = offset => {
    const d = new Date();
    const dow = d.getDay();
    d.setDate(d.getDate() - dow + offset * 7);
    return Array.from({ length: 7 }, (_, i) => { const w = new Date(d); w.setDate(d.getDate() + i); return w; });
  };
  const weekDates = getSundayWeek(weekOffset);
  const WEEK_DAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
  const totalSessions = Object.values(sessions).flat().length;
  const weekLabel = `${weekDates[0].getDate()}/${weekDates[0].getMonth()+1} – ${weekDates[6].getDate()}/${weekDates[6].getMonth()+1}/${weekDates[6].getFullYear()}`;

  const athletes = loadAthletes();
  const targets = Array.isArray(form.mainTraining) ? form.mainTraining : [];

  return (
    <div>
      {/* ── Pending date confirm ── */}
      {pendingDate && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <div className="confirm-msg">
              Mover sessão de {new Date(pendingDate.oldDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} para {new Date(pendingDate.newDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}?
            </div>
            <div className="confirm-btns">
              <button type="button" className="b bsm" onClick={() => setPendingDate(null)}>Cancelar</button>
              <button type="button" className="b bp bsm" onClick={() => { setForm(f => ({ ...f, date: pendingDate.newDate })); setPendingDate(null); }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Undo toast ── */}
      {undoToast && (
        <div style={{ position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center', zIndex: 3500, boxShadow: '0 4px 20px rgba(0,0,0,.7)', fontSize: 13, color: '#ccc', whiteSpace: 'nowrap' }}>
          {undoToast.msg}
          <button type="button" className="b bsm" style={{ padding: '4px 12px', color: '#4ac8c0', borderColor: '#4ac8c0' }}
            onClick={() => { undoToast.undoFn(); setUndoToast(null); clearTimeout(undoTimerRef.current); }}>
            Desfazer
          </button>
        </div>
      )}

      {/* ── Template modal ── */}
      {showTemplateModal && !recurringTpl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowTemplateModal(false)}>
          <div style={{ background: '#0d0d0d', border: '1px solid #2e2e2e', borderRadius: 12, padding: 18, width: 380, maxWidth: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Templates</span>
              <button type="button" className="b bsm" onClick={() => setShowTemplateModal(false)}><i className="ti ti-x" /></button>
            </div>
            {templates.length === 0
              ? <div style={{ textAlign: 'center', padding: '30px 0', color: '#444', fontSize: 13 }}>
                  <i className="ti ti-bookmark-off" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                  Nenhum template salvo.<br/>
                  <span style={{ fontSize: 11 }}>Monte uma sessão e clique em 🔖 para salvar.</span>
                </div>
              : <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {templates.map(tpl => (
                    <div key={tpl.id}
                      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'border-color .12s' }}
                      onClick={() => applyTemplate(tpl)}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#9070d8'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e0', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</div>
                        <div style={{ fontSize: 11, color: '#555', marginBottom: 5 }}>{tpl.blocks.length} bloco{tpl.blocks.length !== 1 ? 's' : ''}</div>
                        {tpl.blocks.length > 0 && (() => {
                          const types = tpl.blocks.map(b => b.type || b.label || '?');
                          const shown = types.slice(0, 10);
                          const rest = types.length - 10;
                          return (
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                              {shown.map((t, i) => <span key={i} className={`wg-pill ${PLC[t] || 'p-st'}`}>{t}</span>)}
                              {rest > 0 && <span style={{ fontSize: 10, color: '#555', alignSelf: 'center' }}>+{rest}</span>}
                            </div>
                          );
                        })()}
                      </div>
                      <button type="button" className="b bsm" style={{ flexShrink: 0, borderColor: '#1a4a3a', color: '#4ac8a0' }}
                        onClick={e => { e.stopPropagation(); setShowTemplateModal(false); setRecurringTpl(tpl); }} title="Sessões recorrentes">
                        <i className="ti ti-repeat" />
                      </button>
                      <button type="button" className="b bd bsm" style={{ flexShrink: 0 }}
                        onClick={e => { e.stopPropagation(); deleteTemplate(tpl.id); }} title="Excluir template">
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* ── Recurring modal ── */}
      {recurringTpl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setRecurringTpl(null)}>
          <div style={{ background: '#0d0d0d', border: '1px solid #1a4a3a', borderRadius: 12, padding: 20, width: 360, maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 14 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4ac8a0' }}><i className="ti ti-repeat" style={{ marginRight: 6 }} />Sessões Recorrentes</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{recurringTpl.name}</div>
              </div>
              <button type="button" className="b bsm" onClick={() => setRecurringTpl(null)}><i className="ti ti-x" /></button>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Dias da semana</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['Dom',0],['Seg',1],['Ter',2],['Qua',3],['Qui',4],['Sex',5],['Sáb',6]].map(([label, day]) => (
                  <button key={day} type="button"
                    style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid', cursor: 'pointer', transition: 'all .12s',
                      borderColor: recurDays.has(day) ? '#4ac8a0' : '#2a2a2a',
                      background: recurDays.has(day) ? 'rgba(74,200,160,.15)' : 'transparent',
                      color: recurDays.has(day) ? '#4ac8a0' : '#555' }}
                    onClick={() => setRecurDays(prev => { const s = new Set(prev); s.has(day) ? s.delete(day) : s.add(day); return s; })}
                  >{label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Início', recurStart, setRecurStart], ['Fim', recurEnd, setRecurEnd]].map(([lbl, val, setter]) => (
                <label key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '.05em' }}>{lbl}</span>
                  <input type="date" value={val} onChange={e => setter(e.target.value)}
                    style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, color: '#ddd', padding: '6px 8px', fontSize: 13 }} />
                </label>
              ))}
            </div>
            {recurPreviewDates.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 10, maxHeight: 140, overflowY: 'auto' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>{recurPreviewDates.length} sessão{recurPreviewDates.length !== 1 ? 'ões' : ''} a criar:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {recurPreviewDates.map(d => (
                    <span key={d} style={{ fontSize: 11, background: 'rgba(74,200,160,.1)', border: '1px solid rgba(74,200,160,.2)', borderRadius: 4, padding: '2px 6px', color: '#4ac8a0' }}>{d}</span>
                  ))}
                </div>
              </div>
            )}
            {recurDays.size === 0 && <div style={{ fontSize: 12, color: '#664', textAlign: 'center' }}>Selecione ao menos um dia.</div>}
            {recurPreviewDates.length === 0 && recurDays.size > 0 && <div style={{ fontSize: 12, color: '#664', textAlign: 'center' }}>Nenhuma data no período.</div>}
            {recurDone != null
              ? <div style={{ textAlign: 'center', fontSize: 14, color: '#4ac8a0', fontWeight: 700 }}>
                  <i className="ti ti-check" style={{ marginRight: 6 }} />{recurDone} sessão{recurDone !== 1 ? 'ões' : ''} criada{recurDone !== 1 ? 's' : ''}!
                </div>
              : <button type="button" className="b bp" disabled={!recurPreviewDates.length} style={{ width: '100%', opacity: recurPreviewDates.length ? 1 : .4 }} onClick={applyRecurring}>
                  <i className="ti ti-calendar-plus" style={{ marginRight: 6 }} />Criar {recurPreviewDates.length} sessão{recurPreviewDates.length !== 1 ? 'ões' : ''}
                </button>
            }
          </div>
        </div>
      )}

      {/* ── Athlete picker modal ── */}
      {showAlvoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowAlvoModal(false)}>
          <div style={{ background: '#0d0d0d', border: '1px solid #2e2e2e', borderRadius: 10, padding: 18, width: 320, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ccc' }}>Para quem é essa sessão?</span>
              <button type="button" className="b bsm" onClick={() => setShowAlvoModal(false)}><i className="ti ti-x" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto', marginBottom: 14 }}>
              {athletes.map(a => {
                const checked = targets.includes(a.name);
                return (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', background: checked ? 'rgba(74,200,192,.06)' : 'transparent', border: '1px solid ' + (checked ? 'rgba(74,200,192,.25)' : '#1e1e1e') }}>
                    <input type="checkbox" checked={checked}
                      onChange={() => { setForm(f => ({ ...f, mainTraining: checked ? targets.filter(n => n !== a.name) : [...targets, a.name] })); setIsDirty(true); }}
                      style={{ accentColor: a.color || 'var(--theme-accent)', width: 14, height: 14 }} />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: a.color || '#555', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#ccc', flex: 1 }}>{a.name}</span>
                    <span style={{ fontSize: 11, color: '#555' }}>{a.level || ''}</span>
                  </label>
                );
              })}
            </div>
            <button type="button" style={{ width: '100%', background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', border: 'none', padding: 9, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
              onClick={() => setShowAlvoModal(false)}>Confirmar</button>
          </div>
        </div>
      )}

      {/* ── Block type picker ── */}
      {showBlockPicker && (
        <BlockTypePicker blockNames={blockNames} onSelect={addBlock} onClose={() => setShowBlockPicker(false)} />
      )}

      {/* ── Session form ── */}
      <div className="sc-card" ref={formRef}>
        {/* Header */}
        <div className="sc-hdr">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="sc-title">{editing ? 'Editar sessão' : 'Nova sessão'}</span>
            {templateFlash && (
              <span style={{ fontSize: 11, color: '#9070d8' }}>
                <i className="ti ti-bookmark-filled" /> &ldquo;{templateFlash}&rdquo; salvo
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {onGoToPublish && (
              <button type="button" className="b bsm" style={{ borderColor: '#1a4a2a', color: '#40b878' }} onClick={onGoToPublish} title="Ir para Publicador">
                <i className="ti ti-calendar-event" /> Publicar
              </button>
            )}
            <button type="button" className="b bsm" style={{ borderColor: '#4a2880', color: '#9070d8' }} onClick={() => setShowTemplateModal(true)}>
              <i className="ti ti-template" /> Templates
            </button>
            {editing && <button type="button" className="b bsm" onClick={cancel}>Cancelar</button>}
          </div>
        </div>

        {/* Date + Name */}
        <div className="g2">
          <div className="fg">
            <span className="lbl">Data</span>
            <input type="date" value={form.date || todayISO()}
              onChange={e => {
                const newDate = e.target.value;
                const oldDate = form.date || todayISO();
                if (editing && newDate !== oldDate) { setPendingDate({ newDate, oldDate }); e.target.value = oldDate; }
                else { setForm(f => ({ ...f, date: newDate })); setIsDirty(true); }
              }} />
          </div>
          <div className="fg">
            <span className="lbl">Nome da sessão</span>
            <input
              placeholder="ex: Semana 3 · D1 · Força Lower"
              value={form.sessionName || ''}
              onChange={e => { setForm(f => ({ ...f, sessionName: e.target.value })); setIsDirty(true); }}
            />
          </div>
        </div>

        {/* Athletes */}
        <div className="fg" style={{ marginTop: 4 }}>
          <span className="lbl">Para quem</span>
          <button type="button" className="cr-athletes-btn" onClick={() => setShowAlvoModal(true)}>
            <i className="ti ti-users" style={{ color: 'var(--theme-accent)', fontSize: 15 }} />
            {targets.length === 0
              ? <span style={{ color: '#444' }}>Nenhum atleta — clique para selecionar</span>
              : <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {targets.map((name, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'var(--theme-accent)22', color: 'var(--theme-accent)', border: '1px solid var(--theme-accent)44' }}>{name}</span>
                  ))}
                </div>
            }
          </button>
        </div>

        {/* Session notes */}
        <div style={{ marginTop: 6 }}>
          <button type="button" className="blk-adv-toggle" onClick={() => setShowSessNotes(v => !v)}>
            <i className={`ti ti-chevron-${showSessNotes ? 'up' : 'down'}`} />
            Briefing da sessão{form.notes ? <span style={{ color: '#4ac8c0', fontSize: 10, marginLeft: 4 }}>●</span> : null}
          </button>
          {showSessNotes && (
            <textarea
              className="blk-notes-quick"
              style={{ marginTop: 6 }}
              placeholder="Contexto, objetivos, link de vídeo, regras..."
              value={form.notes || ''}
              onChange={e => { setForm(f => ({ ...f, notes: e.target.value })); setIsDirty(true); }}
            />
          )}
        </div>

        {/* Blocks */}
        <div style={{ borderTop: '1px solid #242424', paddingTop: 14, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: blocks.length ? 10 : 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {blocks.length ? `${blocks.length} Bloco${blocks.length !== 1 ? 's' : ''}` : 'Blocos'}
            </span>
            {blocks.length > 1 && (
              <div className="collapse-all-row" style={{ margin: 0 }}>
                <button type="button" className="collapse-all-btn" onClick={() => setCollapsedBlocks(Object.fromEntries(blocks.map(b => [b.id, true])))}>
                  <i className="ti ti-arrows-minimize" /> Recolher
                </button>
                <button type="button" className="collapse-all-btn" onClick={() => setCollapsedBlocks({})}>
                  <i className="ti ti-arrows-maximize" /> Expandir
                </button>
              </div>
            )}
          </div>

          {blocks.flatMap((bl, i) => {
            const editor = (
              <BlockEditor
                key={bl.id}
                block={bl} idx={i} total={blocks.length}
                blockNames={blockNames || APP_CONFIG.blockNames}
                onUpdate={upd => updBlock(bl.id, upd)}
                onDelete={() => delBlock(bl.id)}
                onCopy={() => copyBlock(bl.id)}
                collapsed={!!collapsedBlocks[bl.id]}
                onToggleCollapse={() => setCollapsedBlocks(p => ({ ...p, [bl.id]: !p[bl.id] }))}
                dragBlkIdx={dragBlkIdx} dragOverBlkIdx={dragOverBlkIdx}
                setDragOverBlkIdx={setDragOverBlkIdx} reorderBlocks={reorderBlocks} blockIdx={i}
              />
            );
            if (i < blocks.length - 1) {
              return [editor, (
                <button key={`ins-${i}`} type="button" className="insert-blk-btn"
                  title="Inserir bloco aqui"
                  onClick={() => { setInsertAtIdx(i); setShowBlockPicker(true); }}>
                  <i className="ti ti-plus" />
                </button>
              )];
            }
            return [editor];
          })}

          {/* Add block */}
          <button type="button" className="add-blk-btn" style={{ width: '100%', marginBottom: 0 }} onClick={() => { setInsertAtIdx(null); setShowBlockPicker(true); }}>
            <i className="ti ti-layout-grid-add" style={{ fontSize: 16 }} /> Adicionar bloco
          </button>
        </div>

        {/* Save row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" className="b bp bfull" onClick={saveS}
            style={isDirty ? { boxShadow: '0 0 0 2px #4ac8c040' } : undefined}>
            <i className="ti ti-check" />
            {isDirty && <span style={{ color: '#4ac8c0', fontSize: 11, marginLeft: 4 }}>●</span>}
            {' '}{editing ? 'Salvar alterações' : 'Salvar sessão'}
          </button>
          {blocks.length > 0 && (
            <button type="button" className="b bsm" style={{ borderColor: '#4a2880', color: '#9070d8', flexShrink: 0, minWidth: 38 }}
              title="Salvar como template" onClick={saveAsTemplate}>
              <i className="ti ti-bookmark" />
            </button>
          )}
        </div>
      </div>

      {/* ── Week grid ── */}
      {totalSessions > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <button type="button" className="b bsm" onClick={() => setWeekOffset(o => o-1)}><i className="ti ti-chevron-left" /></button>
            <span style={{ fontSize: 12, color: '#aaa', fontWeight: 600 }}>{weekLabel}</span>
            <button type="button" className="b bsm" onClick={() => setWeekOffset(o => o+1)}><i className="ti ti-chevron-right" /></button>
            {weekOffset !== 0 && (
              <button type="button" className="b bsm" style={{ fontSize: 11, color: '#e87820', borderColor: '#e87820' }} onClick={() => setWeekOffset(0)}>Hoje</button>
            )}
            <span style={{ flex: 1 }} />
            <button type="button" className="b bsm" title={weekGridCollapsed ? 'Expandir grade' : 'Minimizar grade'}
              onClick={() => setWeekGridCollapsed(v => !v)}>
              <i className={`ti ti-layout-${weekGridCollapsed ? 'rows' : 'navbar'}`} />
            </button>
          </div>
          {weekGridCollapsed ? (
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
              {weekDates.map((date, di) => {
                const dateKey = toISO(date);
                const list = sessions[dateKey] || [];
                const isToday = dateKey === todayISO();
                const isEditing = (sessions[dateKey] || []).some(s => s.id === editing?.id);
                return (
                  <button key={dateKey} type="button"
                    style={{ flexShrink: 0, minWidth: 52, padding: '6px 8px', background: isEditing ? 'rgba(74,200,192,.08)' : isToday ? '#1a1a12' : '#161616', border: '1px solid ' + (isEditing ? '#4ac8c060' : isToday ? '#3a3a20' : '#252525'), borderRadius: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                    onClick={() => { setForm(f => ({ ...f, date: dateKey })); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isToday ? '#d8a840' : '#666', textTransform: 'uppercase', letterSpacing: '.04em' }}>{WEEK_DAYS[di]}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: isEditing ? '#4ac8c0' : isToday ? '#d8a840' : '#bbb' }}>{date.getDate()}</span>
                    {list.length > 0 && <span style={{ fontSize: 10, color: '#4ac8c0', fontWeight: 700 }}>{list.length}</span>}
                  </button>
                );
              })}
            </div>
          ) : (
          <div className="week-scroll">
            <div className="week-grid">
              {weekDates.map((date, di) => {
                const dateKey = toISO(date);
                const list = sessions[dateKey] || [];
                return (
                  <div key={dateKey} className="wg-col">
                    <div className="wg-head">
                      <span className="wg-day">{WEEK_DAYS[di]} {date.getDate()}</span>
                      {list.length > 0 && <span className="wg-sub">{list.length}s</span>}
                    </div>
                    {list.map(s => (
                      <div key={s.id} className="wg-sc" draggable
                        style={{ outline: editing?.id === s.id ? '2px solid #4ac8c0' : 'none', outlineOffset: 1 }}
                        onClick={() => startEdit(s, dateKey)}
                        onDragStart={e => { e.dataTransfer.setData('sess-id', s.id); e.dataTransfer.setData('sess-date', dateKey); e.dataTransfer.effectAllowed = 'move'; e.stopPropagation(); }}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); e.stopPropagation(); }}
                        onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                        onDrop={e => {
                          e.preventDefault(); e.stopPropagation();
                          e.currentTarget.classList.remove('drag-over');
                          const dragId = e.dataTransfer.getData('sess-id');
                          const dragDate = e.dataTransfer.getData('sess-date');
                          if (!dragId) return;
                          if (dragDate === dateKey && dragId !== s.id) {
                            setSessions(prev => {
                              const n = { ...prev };
                              const arr = [...(n[dateKey] || [])];
                              const from = arr.findIndex(x => x.id === dragId);
                              const to = arr.findIndex(x => x.id === s.id);
                              if (from < 0 || to < 0) return prev;
                              const [mv] = arr.splice(from, 1); arr.splice(to, 0, mv);
                              n[dateKey] = arr; return n;
                            });
                          } else if (dragDate !== dateKey) {
                            setSessions(prev => {
                              const n = { ...prev };
                              const dragSess = (n[dragDate] || []).find(x => x.id === dragId);
                              if (!dragSess) return prev;
                              n[dragDate] = (n[dragDate] || []).filter(x => x.id !== dragId);
                              n[dateKey] = [...(n[dateKey] || []), { ...dragSess, date: dateKey }];
                              return n;
                            });
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, marginBottom: 5 }}>
                          <span className="wg-sc-name">{s.sessionName || (typeof s.mainTraining === 'string' ? s.mainTraining : null) || '—'}</span>
                          <button type="button" className="b bd"
                            style={{ padding: '2px 6px', fontSize: 10, minHeight: 20, flexShrink: 0 }}
                            onClick={e => { e.stopPropagation(); del(dateKey, s.id); }}>
                            <i className="ti ti-x" />
                          </button>
                        </div>
                        {(s.blocks || []).map(bl => {
                          const bcfg = getTypeCfg(bl.type);
                          return (
                            <div key={bl.id} style={{ marginBottom: 3 }}>
                              <span className={`wg-pill ${PLC[bl.type] || 'p-st'}`}>{bl.type}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div className="wg-add-row">
                      <div className="wg-add" onClick={() => { setForm(f => ({ ...f, date: dateKey })); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }}>
                        <i className="ti ti-plus" /> add
                      </div>
                      <div className="wg-copy" onClick={() => {
                        const daySess = sessions[dateKey] || [];
                        if (!daySess.length) return;
                        const last = daySess[daySess.length-1];
                        const copied = { ...last, id: uid(), date: dateKey, mainTraining: '', blocks: (last.blocks||[]).map(bl => ({ ...bl, id: uid(), exercises: (bl.exercises||[]).map(ex => ({ ...ex, id: uid() })) })) };
                        setSessions(prev => { const n = { ...prev }; n[dateKey] = [...(n[dateKey]||[]), copied]; return n; });
                      }}>
                        <i className="ti ti-copy" /> copy
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CriadorTab({ sessions, setSessions, blockNames, preload, onPreloadConsumed, onGoToPublish }) {
  return <TrainingCreator sessions={sessions} setSessions={setSessions} blockNames={blockNames} preload={preload} onPreloadConsumed={onPreloadConsumed} onGoToPublish={onGoToPublish} />;
}
