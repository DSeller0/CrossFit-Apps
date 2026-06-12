import { useState, useEffect, useRef, useMemo } from 'react';
import {
  loadAthletes, saveAthletes,
  loadGoalsData, saveGoalsData,
  loadRegistry,
  uid, todayISO, matchesAthlete,
} from '../../utils/storage';
import { APP_CONFIG } from '../../utils/config';

const getLevels = () => APP_CONFIG.athleteLevels || ['Iniciante', 'Intermediário', 'Avançado', 'Competidor'];
const getGoals  = () => APP_CONFIG.athleteGoals  || ['Saúde geral', 'Força', 'Condicionamento', 'Competição'];

// ── PR helpers ────────────────────────────────────────────────────────────────
function toSecs(t) {
  if (!t) return Infinity;
  const p = String(t).split(':');
  return p.length === 2 ? parseInt(p[0]) * 60 + parseInt(p[1]) : parseInt(t) || Infinity;
}
function fmtTime(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function prBest(pr) {
  if (!pr.results || !pr.results.length) return null;
  if (pr.type === 'time') return pr.results.reduce((b, r) => toSecs(r.value) < toSecs(b.value) ? r : b);
  return pr.results.reduce((b, r) => Number(r.value) > Number(b.value) ? r : b);
}
function prDelta(pr) {
  if (!pr.results || pr.results.length < 2) return null;
  const sorted = [...pr.results].sort((a, b) => new Date(a.date) - new Date(b.date));
  const last = sorted[sorted.length - 1], prev = sorted[sorted.length - 2];
  if (pr.type === 'time') {
    const diff = toSecs(prev.value) - toSecs(last.value);
    if (diff === 0) return { label: '=', good: null };
    return { label: (diff > 0 ? '-' : '+') + (diff < 0 ? fmtTime(-diff) : fmtTime(diff)), good: diff > 0 };
  }
  const diff = Number(last.value) - Number(prev.value);
  if (diff === 0) return { label: '=', good: null };
  const unit = pr.type === 'load' ? (pr.unit || 'kg') : 'reps';
  return { label: (diff > 0 ? '+' : '') + diff + ' ' + unit, good: diff > 0 };
}
function prPct(pr) {
  const best = prBest(pr);
  if (!best || !pr.target) return null;
  if (pr.type === 'time') {
    const targetSecs = toSecs(pr.target);
    const firstSecs = pr.results.length > 0
      ? toSecs([...pr.results].sort((a, b) => new Date(a.date) - new Date(b.date))[0].value)
      : targetSecs * 2;
    if (firstSecs <= targetSecs) return 100;
    const bestSecs = toSecs(best.value);
    return Math.min(100, Math.round((firstSecs - bestSecs) / (firstSecs - targetSecs) * 100));
  }
  const targetNum = Number(pr.target);
  if (!targetNum) return null;
  return Math.min(100, Math.round(Number(best.value) / targetNum * 100));
}

// ── ExerciseCombobox ──────────────────────────────────────────────────────────
function ExerciseCombobox({ value, onChange, blockLabel, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef();

  const suggestions = useMemo(() => {
    const reg = loadRegistry() || {};
    const exs = reg[blockLabel] || [];
    if (!query.trim()) return exs;
    const q = query.toLowerCase();
    return exs.filter(e => e.toLowerCase().includes(q));
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
        value={query} placeholder={placeholder}
        style={{ width: '100%', fontFamily: 'inherit', fontSize: '16px', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '9px 11px', background: '#111', color: '#e0e0e0', outline: 'none', WebkitAppearance: 'none', appearance: 'none', transition: 'border-color .15s' }}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'ArrowDown' && open && suggestions.length) ref.current?.querySelector('.ex-suggestion')?.focus();
        }}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#1a1a1a', border: '1px solid #333', borderRadius: '5px', maxHeight: '180px', overflowY: 'auto', marginTop: '2px', boxShadow: '0 4px 12px rgba(0,0,0,.5)' }}>
          {suggestions.map((s, i) => (
            <div key={i} className="ex-suggestion" tabIndex={0}
              style={{ padding: '7px 12px', fontSize: '13px', color: '#ddd', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid #222' : 'none' }}
              onMouseDown={e => { e.preventDefault(); select(s); }}
              onKeyDown={e => {
                if (e.key === 'Enter') select(s);
                if (e.key === 'ArrowDown') { e.currentTarget.nextSibling?.focus(); }
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

// ── PrRow ─────────────────────────────────────────────────────────────────────
function PrRow({ pr, onAddResult, onEdit, onDelete, showActions }) {
  const best  = prBest(pr);
  const delta = prDelta(pr);
  const pct   = prPct(pr);

  const bestLabel = best ? (pr.type === 'load' ? `${best.value} ${pr.unit || 'kg'}` : pr.type === 'reps' ? `${best.value} reps` : best.value) : '—';
  const targetLabel = pr.target ? (pr.type === 'load' ? `${pr.target} ${pr.unit || 'kg'}` : pr.type === 'reps' ? `${pr.target} reps` : pr.target) : null;
  const bestDate = best ? new Date(best.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
      <div style={{ minWidth: 140, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{pr.name}</div>
        {pr.category && <div style={{ fontSize: 10, color: '#555' }}>{pr.category}</div>}
      </div>
      {pct !== null
        ? <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {Array.from({ length: 10 }, (_, bi) => {
                const fill = pct >= (bi + 1) * 10 ? 1 : pct > bi * 10 ? (pct - bi * 10) / 10 : 0;
                return (
                  <div key={bi} style={{ flex: 1, height: 14, borderRadius: 2, background: '#1a1a1a', border: '1px solid #252525', position: 'relative', overflow: 'hidden' }}>
                    {fill > 0 && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${fill * 100}%`, background: fill === 1 ? 'var(--theme-accent)' : 'var(--theme-accent)99' }} />}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#444' }}>
              <span>0</span>
              {targetLabel && <span style={{ color: '#555' }}>Meta: {targetLabel}</span>}
            </div>
          </div>
        : <div style={{ flex: 1 }} />
      }
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{bestLabel}</div>
        {bestDate && <div style={{ fontSize: 10, color: '#555' }}>{bestDate}</div>}
      </div>
      {delta && (
        <div style={{ fontSize: 11, fontWeight: 700, flexShrink: 0, minWidth: 52, textAlign: 'right', color: delta.good === true ? '#4caf50' : delta.good === false ? '#ef5350' : '#666' }}>
          {delta.good === true ? '↑' : delta.good === false ? '↓' : ''} {delta.label}
        </div>
      )}
      {showActions && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button type="button" className="b bsm" style={{ padding: '3px 6px', minHeight: 22, fontSize: 11 }} onClick={onAddResult} title="Registrar resultado">
            <i className="ti ti-plus" />
          </button>
          <button type="button" className="b bd bsm" style={{ padding: '3px 6px', minHeight: 22, fontSize: 11, opacity: .6 }} onClick={onEdit} title="Editar">
            <i className="ti ti-pencil" />
          </button>
          <button type="button" className="b bd bsm" style={{ padding: '3px 6px', minHeight: 22, fontSize: 11, opacity: .5 }} onClick={onDelete} title="Remover">
            <i className="ti ti-trash" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── AddResultModal ────────────────────────────────────────────────────────────
function AddResultModal({ pr, onSave, onClose }) {
  const [value, setValue] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const best = prBest(pr);
  const bestLabel = pr.type === 'time' ? best?.value : (best?.value ? (best.value + (pr.unit ? ' ' + pr.unit : '')) : '—');
  const isPR = value && (pr.type === 'time' ? toSecs(value) < toSecs(best?.value) : Number(value) > Number(best?.value));

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="settings-drag-hdr">
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Registrar resultado — {pr.name}</span>
          <button type="button" className="b bd bsm" style={{ marginLeft: 'auto', padding: '3px 8px', minHeight: 24 }} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {best && <div style={{ fontSize: 12, color: '#666', padding: '6px 10px', background: '#0d0d0d', borderRadius: 5 }}>Melhor atual: {bestLabel}</div>}
          <div className="g2">
            <div className="fg">
              <span className="lbl">{pr.type === 'time' ? 'Tempo (mm:ss)' : pr.type === 'reps' ? 'Reps' : 'Carga'}</span>
              <input className="ex-input" placeholder={pr.type === 'time' ? '03:45' : pr.type === 'reps' ? '25' : '120'}
                value={value} onChange={e => setValue(e.target.value)} autoFocus />
            </div>
            <div className="fg">
              <span className="lbl">Data</span>
              <input type="date" className="ex-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          {isPR && <div style={{ fontSize: 12, color: '#f5c842', fontWeight: 700, textAlign: 'center' }}>🏆 Novo PR!</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="b bsec" style={{ flex: 1 }} disabled={!value}
              onClick={() => onSave({ value: pr.type === 'time' ? value : Number(value), date })}>
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
function PrModal({ onSave, onClose, editPr }) {
  const [category, setCategory] = useState(editPr?.category || '');
  const [name, setName]         = useState(editPr?.name || '');
  const [type, setType]         = useState(editPr?.type || 'load');
  const [unit, setUnit]         = useState(editPr?.unit || 'kg');
  const [target, setTarget]     = useState(editPr?.target || '');
  const [date, setDate]         = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [value, setValue] = useState('');

  const registry   = loadRegistry() || {};
  const blockTypes = Object.keys(registry);
  const isEdit     = !!editPr;

  const save = () => {
    if (!name.trim() || (!isEdit && !value)) return;
    const result = isEdit ? null : { value: type === 'time' ? value : Number(value), date };
    onSave({
      id: editPr?.id || uid(), name: name.trim(), category, type,
      unit: type === 'load' ? unit : null,
      target: target ? (type === 'time' ? target : Number(target)) : null,
      results: isEdit ? editPr.results : (result ? [result] : []),
    });
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="settings-drag-hdr">
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{isEdit ? 'Editar PR' : 'Registrar PR'}</span>
          <button type="button" className="b bd bsm" style={{ marginLeft: 'auto', padding: '3px 8px', minHeight: 24 }} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="g2">
            <div className="fg">
              <span className="lbl">Categoria</span>
              <select value={category} onChange={e => { setCategory(e.target.value); setName(''); }}>
                <option value="">— Sem categoria —</option>
                {blockTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
            <div className="fg">
              <span className="lbl">Exercício / WOD</span>
              <ExerciseCombobox value={name} onChange={setName} blockLabel={category} placeholder="Ex: Fran, Back Squat..." />
            </div>
          </div>
          <div className="fg">
            <span className="lbl">Tipo</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['load', 'Carga'], ['time', 'Tempo'], ['reps', 'Reps']].map(([t, lbl]) => (
                <button key={t} type="button" className="b bsm" style={{ flex: 1, background: type === t ? 'var(--theme-accent)' : 'transparent', color: type === t ? 'var(--theme-accent-text)' : '#888', borderColor: type === t ? 'var(--theme-accent)' : '#2e2e2e' }} onClick={() => setType(t)}>{lbl}</button>
              ))}
            </div>
          </div>
          {!isEdit && (
            <div className="g2">
              <div className="fg">
                <span className="lbl">{type === 'time' ? 'Tempo (mm:ss)' : type === 'reps' ? 'Reps' : 'Carga'}</span>
                <input className="ex-input" placeholder={type === 'time' ? '03:45' : type === 'reps' ? '25' : '120'} value={value} onChange={e => setValue(e.target.value)} />
              </div>
              {type === 'load' && (
                <div className="fg">
                  <span className="lbl">Unidade</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['kg', 'lb'].map(u => (
                      <button key={u} type="button" className="b bsm" style={{ flex: 1, background: unit === u ? 'var(--theme-accent)' : 'transparent', color: unit === u ? 'var(--theme-accent-text)' : '#888', borderColor: unit === u ? 'var(--theme-accent)' : '#2e2e2e' }} onClick={() => setUnit(u)}>{u}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="fg">
            <span className="lbl">Meta (opcional)</span>
            <input className="ex-input" placeholder={type === 'time' ? '03:00' : type === 'reps' ? '30' : '140'} value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          {!isEdit && (
            <div className="fg">
              <span className="lbl">Data</span>
              <input type="date" className="ex-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" className="b bsec" style={{ flex: 1 }} disabled={!name.trim() || (!isEdit && !value)} onClick={save}>
              <i className="ti ti-check" /> Salvar
            </button>
            <button type="button" className="b bd bsm" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PrCard ────────────────────────────────────────────────────────────────────
function PrCard({ athId, goalsData, persist, onViewAll }) {
  const [showModal, setShowModal] = useState(false);
  const [addResultFor, setAddResultFor] = useState(null);
  const [editingPr, setEditingPr] = useState(null);

  const prs = (goalsData.prs || {})[athId] || [];
  const shown = [...prs].sort((a, b) => {
    const aDate = a.results?.length ? a.results[a.results.length - 1].date : '';
    const bDate = b.results?.length ? b.results[b.results.length - 1].date : '';
    return bDate.localeCompare(aDate);
  }).slice(0, 5);

  const savePr = pr => {
    const updated = prs.find(p => p.id === pr.id) ? prs.map(p => p.id === pr.id ? pr : p) : [...prs, pr];
    persist({ ...goalsData, prs: { ...(goalsData.prs || {}), [athId]: updated } });
    setShowModal(false); setEditingPr(null);
  };
  const addResult = (prId, result) => {
    const updated = prs.map(p => p.id !== prId ? p : { ...p, results: [...p.results, result].slice(-5) });
    persist({ ...goalsData, prs: { ...(goalsData.prs || {}), [athId]: updated } });
    setAddResultFor(null);
  };
  const deletePr = prId => {
    if (!window.confirm('Remover este PR?')) return;
    persist({ ...goalsData, prs: { ...(goalsData.prs || {}), [athId]: prs.filter(p => p.id !== prId) } });
  };

  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em' }}>PRs</span>
        <button type="button" className="b bsm" onClick={() => setShowModal(true)}><i className="ti ti-plus" /> Registrar PR</button>
      </div>
      {shown.length === 0
        ? <div style={{ fontSize: 13, color: '#333', fontStyle: 'italic', padding: '8px 0' }}>Nenhum PR registrado. Clique em "+ Registrar PR" para começar.</div>
        : shown.map(pr => (
            <PrRow key={pr.id} pr={pr} showActions
              onAddResult={() => setAddResultFor(pr)}
              onEdit={() => setEditingPr(pr)}
              onDelete={() => deletePr(pr.id)} />
          ))
      }
      {prs.length > 5 && (
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button type="button" className="b bd bsm" onClick={onViewAll}>Ver todos ({prs.length}) →</button>
        </div>
      )}
      {(showModal || editingPr) && <PrModal editPr={editingPr || null} onSave={savePr} onClose={() => { setShowModal(false); setEditingPr(null); }} />}
      {addResultFor && <AddResultModal pr={addResultFor} onSave={result => addResult(addResultFor.id, result)} onClose={() => setAddResultFor(null)} />}
    </div>
  );
}

// ── PrSubView ─────────────────────────────────────────────────────────────────
function PrSubView({ athId, goalsData, persist, onBack }) {
  const [showModal, setShowModal] = useState(false);
  const [addResultFor, setAddResultFor] = useState(null);
  const [editingPr, setEditingPr] = useState(null);

  const prs = (goalsData.prs || {})[athId] || [];

  const savePr = pr => {
    const updated = prs.find(p => p.id === pr.id) ? prs.map(p => p.id === pr.id ? pr : p) : [...prs, pr];
    persist({ ...goalsData, prs: { ...(goalsData.prs || {}), [athId]: updated } });
    setShowModal(false); setEditingPr(null);
  };
  const addResult = (prId, result) => {
    const updated = prs.map(p => p.id !== prId ? p : { ...p, results: [...p.results, result].slice(-5) });
    persist({ ...goalsData, prs: { ...(goalsData.prs || {}), [athId]: updated } });
    setAddResultFor(null);
  };
  const deletePr = prId => {
    if (!window.confirm('Remover este PR?')) return;
    persist({ ...goalsData, prs: { ...(goalsData.prs || {}), [athId]: prs.filter(p => p.id !== prId) } });
  };

  const grouped = {};
  prs.forEach(pr => { const cat = pr.category || 'Sem categoria'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(pr); });

  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button type="button" className="b bd bsm" onClick={onBack}><i className="ti ti-arrow-left" /> Voltar</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', flex: 1 }}>Todos os PRs</span>
        <button type="button" className="b bsm" onClick={() => setShowModal(true)}><i className="ti ti-plus" /> Novo PR</button>
      </div>
      {prs.length === 0
        ? <div style={{ fontSize: 13, color: '#333', fontStyle: 'italic', padding: '8px 0' }}>Nenhum PR registrado.</div>
        : Object.entries(grouped).map(([cat, catPrs]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #1a1a1a' }}>{cat}</div>
              {catPrs.map(pr => (
                <PrRow key={pr.id} pr={pr} showActions
                  onAddResult={() => setAddResultFor(pr)}
                  onEdit={() => setEditingPr(pr)}
                  onDelete={() => deletePr(pr.id)} />
              ))}
            </div>
          ))
      }
      {(showModal || editingPr) && <PrModal editPr={editingPr || null} onSave={savePr} onClose={() => { setShowModal(false); setEditingPr(null); }} />}
      {addResultFor && <AddResultModal pr={addResultFor} onSave={result => addResult(addResultFor.id, result)} onClose={() => setAddResultFor(null)} />}
    </div>
  );
}

// ── SessionsSummaryPanel ──────────────────────────────────────────────────────
function SessionsSummaryPanel({ athName, athId, sessions, results, expandedSessions, setExpandedSessions, onEditSession, onLogResult }) {
  const WOD_TYPES_S  = ['WOD', 'For Time', 'AMRAP', 'EMOM', 'MetCon', 'HIIT'];
  const SCALE_RANK_S  = { RX: 4, Inter: 3, SC: 2, Adaptado: 1 };
  const SCALE_NAMES_S = { 4: 'RX', 3: 'Inter', 2: 'SC', 1: 'Adaptado' };
  const SCALE_COLORS_S = { RX: '#4ac8c0', Inter: '#d8a840', SC: '#e87820', Adaptado: '#888' };
  const DAY_PT_S = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const today    = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const future30 = new Date(today); future30.setDate(today.getDate() + 30);
  const f30ISO   = future30.toISOString().slice(0, 10);

  const allDates   = Object.keys(sessions).sort();
  const athSessions = [];
  allDates.forEach(date => {
    (sessions[date] || []).forEach(s => { if (matchesAthlete(s, athName)) athSessions.push({ date, session: s }); });
  });

  const past   = athSessions.filter(s => s.date <= todayKey).slice(-2);
  const future = athSessions.filter(s => s.date > todayKey && s.date <= f30ISO).slice(0, 2);
  const cards  = [...past, ...future];

  if (!cards.length) return (
    <div style={{ fontSize: 13, color: '#555', fontStyle: 'italic', padding: '8px 0' }}>
      Nenhuma sessão atribuída a este atleta. Use o campo Alvo no Criador de Treinos.
    </div>
  );

  return (
    <div className="sess-summary-grid">
      {cards.map(({ date, session }) => {
        const isPast   = date <= todayKey;
        const isToday  = date === todayKey;
        const d        = new Date(date + 'T12:00:00');
        const dow      = DAY_PT_S[d.getDay()];
        const dateLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const key      = date + '|' + session.id;
        const expanded = expandedSessions.has(key);
        const myResult = results.find(r => r.date === date && r.sessionId === session.id);

        let badgeEl;
        if (isToday)       badgeEl = <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', textTransform: 'uppercase' }}>Hoje</span>;
        else if (isPast)   badgeEl = <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(104,216,160,.12)', color: '#68d8a0', border: '1px solid rgba(104,216,160,.3)', textTransform: 'uppercase' }}>Feito</span>;
        else               badgeEl = <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(74,200,192,.1)', color: '#4ac8c0', border: '1px solid rgba(74,200,192,.25)', textTransform: 'uppercase', borderStyle: 'dashed' }}>Próxima</span>;

        let summaryEl = null;
        if (isPast && myResult) {
          const wb = (myResult.blocks || []).find(b => WOD_TYPES_S.includes(b.blockType) || WOD_TYPES_S.includes(b.blockLabel));
          if (myResult.presence === 'Ausente') {
            summaryEl = <div style={{ fontSize: 11, color: '#7a2020', marginTop: 2 }}>Ausente</div>;
          } else if (myResult.presence === 'Atrasado') {
            summaryEl = <div style={{ fontSize: 11, color: '#d8a840', marginTop: 2 }}>Atrasado</div>;
          } else if (wb) {
            const exRows = wb.exerciseRows || [];
            let minRank = 4;
            exRows.forEach(row => { const rank = SCALE_RANK_S[row.scale] ?? 0; if (rank < minRank) minRank = rank; });
            const scale   = exRows.length > 0 ? SCALE_NAMES_S[minRank] : null;
            const scaleCol = scale ? SCALE_COLORS_S[scale] : '#888';
            const perf    = wb.perfTime || (wb.perfRounds ? wb.perfRounds + 'rds' : null);
            summaryEl = (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                {scale && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, color: scaleCol, background: scaleCol + '22', border: `1px solid ${scaleCol}44` }}>{scale}</span>}
                {perf && <span style={{ fontSize: 11, fontWeight: 700, color: '#e0e0e0' }}>{perf}</span>}
                {wb.rpe && <span style={{ fontSize: 11, color: '#555' }}>RPE {wb.rpe}</span>}
              </div>
            );
          }
        } else if (!isPast) {
          summaryEl = <div style={{ fontSize: 11, color: '#4ac8c0', marginTop: 2 }}>Próxima sessão →</div>;
        } else {
          summaryEl = <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Sem resultado</div>;
        }

        return (
          <div key={key}
            style={{ background: '#0d0d0d', border: `1px solid ${isToday ? 'var(--theme-accent)' : '#1e1e1e'}`, borderStyle: isPast ? 'solid' : 'dashed', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'border-color .12s', opacity: isPast ? 1 : 0.85 }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
            onMouseLeave={e => e.currentTarget.style.borderColor = isToday ? 'var(--theme-accent)' : '#1e1e1e'}
            onClick={() => {
              const s = new Set(expandedSessions);
              s.has(key) ? s.delete(key) : s.add(key);
              setExpandedSessions(s);
            }}
          >
            <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{dow}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{dateLabel}</div>
              </div>
              {badgeEl}
            </div>
            <div style={{ padding: '8px 10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                {(session.blocks || []).map((bl, bi) => {
                  const label = bl.label && bl.label !== '-' ? bl.label : bl.type;
                  return <span key={bi} style={{ fontSize: 10, fontWeight: 700, padding: '2px 5px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '.04em', background: 'rgba(74,200,192,.1)', color: '#4ac8c0', border: '1px solid rgba(74,200,192,.25)' }}>{label}</span>;
                })}
              </div>
              {summaryEl}
            </div>
            {expanded && (
              <div style={{ borderTop: '1px solid #1e1e1e', padding: '10px 10px 4px' }}>
                {(session.blocks || []).map((bl, bi) => {
                  const label  = bl.label && bl.label !== '-' ? bl.label : bl.type;
                  const exs    = (bl.exercises || []).filter(e => e.name);
                  const athBl  = myResult ? (myResult.blocks || []).find(b => b.blockId === bl.id) : null;
                  const exRows = athBl?.exerciseRows || [];
                  return (
                    <div key={bi} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>{label}</div>
                      {exs.map((ex, ei) => {
                        const rowResult = exRows.find(r => r.name === ex.name);
                        const sc   = rowResult?.scale;
                        const scCol = sc ? SCALE_COLORS_S[sc] : '#555';
                        return (
                          <div key={ei} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 12 }}>
                            <span style={{ flex: 1, color: '#ccc' }}>{ex.name}</span>
                            {sc && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, color: scCol, background: scCol + '22', border: `1px solid ${scCol}44` }}>{sc}</span>}
                          </div>
                        );
                      })}
                      {athBl?.rpe && <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>RPE {athBl.rpe}</div>}
                      {athBl?.perfTime && <div style={{ fontSize: 12, fontWeight: 700, color: '#e0e0e0', marginTop: 3 }}>{athBl.perfTime}</div>}
                      <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                        {onEditSession && (
                          <button type="button"
                            onClick={e => { e.stopPropagation(); onEditSession({ ...session, date, _dateKey: date }); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'transparent', border: '1px solid #2a2318', color: '#887060', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'inherit' }}>
                            <i className="ti ti-edit" style={{ fontSize: 10 }} />Editar Sessão
                          </button>
                        )}
                        {onLogResult && (
                          <button type="button"
                            onClick={e => { e.stopPropagation(); onLogResult({ athleteId: athId, date }); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(74,200,192,.08)', border: '1px solid rgba(74,200,192,.25)', color: 'var(--theme-accent)', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'inherit' }}>
                            <i className="ti ti-clipboard-list" style={{ fontSize: 10 }} />Lançar Resultado
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── HpBar ─────────────────────────────────────────────────────────────────────
function HpBar({ goal, color, editMode, onAddSession, onMilestoneHit, onConfigure, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const pct    = goal.totalSessions > 0 ? (goal.completedSessions / goal.totalSessions) * 100 : 0;
  const blocks = 10;
  const snapPct = p => Math.round(p / 10) * 10;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#ccc', minWidth: 120, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.name}</span>
        <span style={{ fontSize: 11, color: '#555', flexShrink: 0 }}>{goal.completedSessions}/{goal.totalSessions}</span>
        {!editMode && (
          <button type="button" className="b bsm" style={{ padding: '3px 8px', minHeight: 24, fontSize: 11 }}
            onClick={() => { if (window.confirm(`Confirmar sessão para "${goal.name}"?`)) onAddSession(); }}>
            +1 sessão
          </button>
        )}
        {editMode && (
          <button type="button" className="b bsm" style={{ padding: '3px 8px', minHeight: 24, fontSize: 11 }} onClick={onConfigure}>
            <i className="ti ti-settings" />
          </button>
        )}
        {editMode && (
          <button type="button" className="b bd bsm" style={{ padding: '3px 8px', minHeight: 24, fontSize: 11, opacity: .6 }}
            onClick={() => { if (window.confirm(`Remover objetivo "${goal.name}"?`)) onDelete(); }}>
            <i className="ti ti-trash" />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 2, cursor: 'pointer', position: 'relative' }} onClick={() => setExpanded(e => !e)}>
        {Array.from({ length: blocks }, (_, bi) => {
          const blockStart = bi * 10, blockEnd = (bi + 1) * 10;
          let fill = 0;
          if (pct >= blockEnd) fill = 1;
          else if (pct > blockStart) fill = (pct - blockStart) / 10;
          const hasMilestone = (goal.milestones || []).some(m => snapPct(m.pct) === blockEnd);
          return (
            <div key={bi} style={{ flex: 1, height: 18, borderRadius: 2, position: 'relative', background: '#1a1a1a', border: '1px solid #252525', overflow: 'hidden' }}>
              {fill > 0 && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${fill * 100}%`, background: fill === 1 ? color : color + '99', transition: 'width .3s' }} />}
              {hasMilestone && <div style={{ position: 'absolute', top: 0, bottom: 0, right: 1, width: 2, background: '#f5c842', zIndex: 1 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'relative', height: 12, marginTop: 2 }}>
        {(goal.milestones || []).map((m, mi) => (
          <div key={mi} style={{ position: 'absolute', left: `${snapPct(m.pct)}%`, transform: 'translateX(-50%)', fontSize: 8, color: '#f5c842', whiteSpace: 'nowrap' }}>{snapPct(m.pct)}%</div>
        ))}
      </div>
      {expanded && (
        <div style={{ marginTop: 6, padding: '8px 10px', background: '#111', borderRadius: 5, border: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Milestones</div>
          {(goal.milestones || []).length === 0
            ? <div style={{ fontSize: 12, color: '#333' }}>Nenhum milestone configurado.</div>
            : (goal.milestones || []).map((m, mi) => (
                <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: mi < goal.milestones.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <input type="checkbox" checked={!!m.hit} onChange={() => onMilestoneHit(mi, !m.hit)} style={{ accentColor: color, width: 14, height: 14, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: m.hit ? '#555' : '#ccc', textDecoration: m.hit ? 'line-through' : 'none', flex: 1 }}>{m.label}</span>
                  <span style={{ fontSize: 10, color: '#555' }}>{snapPct(m.pct)}%</span>
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
  const [name, setName]           = useState(goal.name || '');
  const [total, setTotal]         = useState(goal.totalSessions || 10);
  const [completed, setCompleted] = useState(goal.completedSessions || 0);
  const [milestones, setMilestones] = useState(goal.milestones || []);

  const snapPct = p => Math.round(p / 10) * 10;
  const updM  = (i, field, val) => setMilestones(ms => ms.map((m, mi) => mi === i ? { ...m, [field]: val } : m));
  const addM  = () => { if (milestones.length < 5) setMilestones(ms => [...ms, { label: '', pct: 50, hit: false }]); };
  const delM  = i => setMilestones(ms => ms.filter((_, mi) => mi !== i));

  return (
    <div style={{ background: '#111', border: '1px solid #2e2e2e', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Configurar objetivo</div>
      <div className="g2" style={{ marginBottom: 8 }}>
        <div className="fg">
          <span className="lbl">Nome</span>
          <input className="ex-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="fg">
          <span className="lbl">Total de sessões</span>
          <input type="number" min={1} max={200} className="ex-input" value={total} onChange={e => setTotal(parseInt(e.target.value) || 1)} />
        </div>
      </div>
      <div className="fg" style={{ marginBottom: 10 }}>
        <span className="lbl">Sessões completadas</span>
        <input type="number" min={0} max={total} className="ex-input" value={completed} onChange={e => setCompleted(Math.min(total, Math.max(0, parseInt(e.target.value) || 0)))} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em' }}>Milestones (máx. 5)</span>
          {milestones.length < 5 && (
            <button type="button" className="b bsm" style={{ padding: '2px 8px', minHeight: 22, fontSize: 11 }} onClick={addM}>
              <i className="ti ti-plus" /> Adicionar
            </button>
          )}
        </div>
        {milestones.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
            <input className="ex-input" placeholder="Descrição..." value={m.label} style={{ flex: 1 }} onChange={e => updM(i, 'label', e.target.value)} />
            <input type="number" min={10} max={100} step={10} className="ex-input" value={snapPct(m.pct)} style={{ width: 64 }} onChange={e => updM(i, 'pct', snapPct(parseInt(e.target.value) || 10))} />
            <span style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>%</span>
            <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 22, fontSize: 11, opacity: .6 }} onClick={() => delM(i)}>
              <i className="ti ti-trash" />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="b bsec" onClick={() => onSave({ ...goal, name, totalSessions: total, completedSessions: completed, milestones })}>
          <i className="ti ti-check" /> Salvar
        </button>
        <button type="button" className="b bd bsm" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Main AthleteTab ───────────────────────────────────────────────────────────
export default function AtletasTab({ sessions, results, onEditSession, onLogResult }) {
  const [athletes, setAthletes]           = useState(loadAthletes);
  const [showAthForm, setShowAthForm]     = useState(false);
  const [athForm, setAthForm]             = useState({ name: '', level: 'Iniciante', goal: 'Saúde geral', notes: '', color: '#e87820', since: todayISO() });
  const [editingAth, setEditingAth]       = useState(null);
  const [confirmDelAth, setConfirmDelAth] = useState(null);
  const [goalsData, setGoalsDataState]    = useState(loadGoalsData);
  const [selAthlete, setSelAthleteState]  = useState(null);
  const [editMode, setEditMode]           = useState(false);
  const [configuringGoal, setConfiguringGoal] = useState(null);
  const [showPrAll, setShowPrAll]         = useState(false);
  const [expandedSessions, setExpandedSessions] = useState(() => new Set());

  const persist         = d => { setGoalsDataState(d); saveGoalsData(d); };
  const persistAthletes = a => { setAthletes(a); saveAthletes(a); };

  const ath       = athletes.find(a => a.id === selAthlete) || null;
  const athColor  = ath?.color || '#00b8d4';
  const athGoals  = (goalsData.athleteGoals || {})[selAthlete] || [];
  const athResults = (results || []).filter(r => String(r.athleteId) === String(selAthlete));

  const addGoal = () => {
    if (athGoals.length >= 3) return;
    const newGoal = { id: uid(), name: 'Novo objetivo', totalSessions: 10, completedSessions: 0, milestones: [] };
    persist({ ...goalsData, athleteGoals: { ...(goalsData.athleteGoals || {}), [selAthlete]: [...athGoals, newGoal] } });
    setConfiguringGoal(newGoal.id);
  };
  const updateGoal = (goalId, updates) => {
    persist({ ...goalsData, athleteGoals: { ...(goalsData.athleteGoals || {}), [selAthlete]: athGoals.map(g => g.id === goalId ? { ...g, ...updates } : g) } });
    setConfiguringGoal(null);
  };
  const deleteGoal = goalId => {
    persist({ ...goalsData, athleteGoals: { ...(goalsData.athleteGoals || {}), [selAthlete]: athGoals.filter(g => g.id !== goalId) } });
  };
  const addSession = goalId => {
    const g = athGoals.find(x => x.id === goalId);
    if (!g || g.completedSessions >= g.totalSessions) return;
    updateGoal(goalId, { completedSessions: g.completedSessions + 1 });
  };
  const hitMilestone = (goalId, mi, hit) => {
    const g = athGoals.find(x => x.id === goalId);
    if (!g) return;
    updateGoal(goalId, { milestones: g.milestones.map((m, i) => i === mi ? { ...m, hit } : m) });
  };
  const saveAthlete = () => {
    if (!athForm.name.trim()) return;
    if (editingAth) {
      persistAthletes(athletes.map(a => a.id === editingAth ? { ...a, ...athForm } : a));
    } else {
      persistAthletes([...athletes, { ...athForm, id: uid(), since: athForm.since || todayISO() }]);
    }
    setAthForm({ name: '', level: 'Iniciante', goal: 'Saúde geral', notes: '', color: '#e87820', since: todayISO() });
    setEditingAth(null); setShowAthForm(false);
  };
  const deleteAthlete = id => { persistAthletes(athletes.filter(a => a.id !== id)); setConfirmDelAth(null); };
  const startEditAth  = a => {
    setAthForm({ name: a.name, level: a.level, goal: a.goal || '', notes: a.notes || '', color: a.color || '#e87820', since: a.since || '' });
    setEditingAth(a.id); setShowAthForm(true);
  };
  const combinedPct = a => {
    const goals = (goalsData.athleteGoals || {})[a.id] || [];
    if (!goals.length) return null;
    return Math.round(goals.reduce((sum, g) => sum + (g.totalSessions > 0 ? g.completedSessions / g.totalSessions : 0), 0) / goals.length * 100);
  };

  // ── Landing ───────────────────────────────────────────────────────────────
  if (!selAthlete) return (
    <div style={{ padding: 12 }}>
      {showAthForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setShowAthForm(false); setEditingAth(null); }}>
          <div style={{ background: '#0d0d0d', border: '1px solid #2e2e2e', borderRadius: 10, padding: 18, width: 340, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ccc' }}>{editingAth ? 'Editar atleta' : 'Novo atleta'}</span>
              <button onClick={() => { setShowAthForm(false); setEditingAth(null); }} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>Nome</label>
              <input value={athForm.name} onChange={e => setAthForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do atleta" style={{ width: '100%', background: '#111', border: '1px solid #2e2e2e', color: '#ccc', padding: '7px 9px', borderRadius: 5, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>Nível</label>
                <select value={athForm.level} onChange={e => setAthForm(f => ({ ...f, level: e.target.value }))} style={{ width: '100%', background: '#111', border: '1px solid #2e2e2e', color: '#ccc', padding: '7px 9px', borderRadius: 5, fontSize: 13 }}>
                  {getLevels().map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>Objetivo</label>
                <select value={athForm.goal} onChange={e => setAthForm(f => ({ ...f, goal: e.target.value }))} style={{ width: '100%', background: '#111', border: '1px solid #2e2e2e', color: '#ccc', padding: '7px 9px', borderRadius: 5, fontSize: 13 }}>
                  {getGoals().map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>Observações</label>
              <input value={athForm.notes} onChange={e => setAthForm(f => ({ ...f, notes: e.target.value }))} placeholder="ex: Joelho direito" style={{ width: '100%', background: '#111', border: '1px solid #2e2e2e', color: '#ccc', padding: '7px 9px', borderRadius: 5, fontSize: 13 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 5 }}>Cor</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: athForm.color, cursor: 'pointer', border: '2px solid #2e2e2e', flexShrink: 0 }} onClick={() => document.getElementById('ath-color-picker')?.click()} />
                <input type="color" id="ath-color-picker" value={athForm.color} onChange={e => setAthForm(f => ({ ...f, color: e.target.value }))} style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }} />
                <input type="text" value={athForm.color} onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setAthForm(f => ({ ...f, color: e.target.value })); }} style={{ flex: 1, background: '#111', border: '1px solid #2e2e2e', color: '#ccc', padding: '7px 9px', borderRadius: 5, fontSize: 13 }} />
              </div>
            </div>
            <button onClick={saveAthlete} style={{ width: '100%', background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', border: 'none', padding: 9, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              {editingAth ? 'Salvar alterações' : 'Adicionar atleta'}
            </button>
          </div>
        </div>
      )}

      {confirmDelAth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0d0d0d', border: '1px solid #3a1010', borderRadius: 10, padding: 20, width: 300, maxWidth: '90vw', textAlign: 'center' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 28, color: '#e05050', marginBottom: 10, display: 'block' }} />
            <div style={{ fontSize: 14, color: '#ccc', marginBottom: 6, fontWeight: 700 }}>Remover {athletes.find(a => a.id === confirmDelAth)?.name || 'atleta'}?</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => deleteAthlete(confirmDelAth)} style={{ flex: 1, background: '#3a1010', border: '1px solid #6a2020', color: '#e05050', padding: 8, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Remover</button>
              <button onClick={() => setConfirmDelAth(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #2e2e2e', color: '#888', padding: 8, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.07em' }}>Atletas</div>
        <button type="button"
          onClick={() => { setAthForm({ name: '', level: 'Iniciante', goal: 'Saúde geral', notes: '', color: '#e87820', since: todayISO() }); setEditingAth(null); setShowAthForm(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          <i className="ti ti-plus" /> Atleta
        </button>
      </div>

      {athletes.length === 0
        ? <div style={{ color: '#333', fontSize: 13, padding: 20, textAlign: 'center' }}>Nenhum atleta registrado.</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
            {athletes.map(a => {
              const pct   = combinedPct(a);
              const color = a.color || '#555';
              const goals = (goalsData.athleteGoals || {})[a.id] || [];
              return (
                <div key={a.id}
                  style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 12, transition: 'border-color .1s', borderLeft: '3px solid ' + color }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e1e'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', flex: 1, cursor: 'pointer' }} onClick={() => setSelAthleteState(a.id)}>{a.name}</span>
                    {pct !== null && <span style={{ fontSize: 12, color: '#888' }}>{pct}%</span>}
                    <button type="button" onClick={e => { e.stopPropagation(); startEditAth(a); }} style={{ background: 'transparent', border: '1px solid #2e2e2e', color: '#555', padding: '2px 5px', borderRadius: 4, cursor: 'pointer' }} title="Editar">
                      <i className="ti ti-edit" style={{ fontSize: 12 }} />
                    </button>
                    <button type="button" onClick={e => { e.stopPropagation(); setConfirmDelAth(a.id); }} style={{ background: 'transparent', border: '1px solid #2e2e2e', color: '#5a1a1a', padding: '2px 5px', borderRadius: 4, cursor: 'pointer' }} title="Remover">
                      <i className="ti ti-trash" style={{ fontSize: 12 }} />
                    </button>
                  </div>
                  {pct !== null
                    ? <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: 10 }, (_, bi) => {
                          const fill = pct >= (bi + 1) * 10 ? 1 : pct > bi * 10 ? (pct - bi * 10) / 10 : 0;
                          return (
                            <div key={bi} style={{ flex: 1, height: 8, borderRadius: 1, background: '#1a1a1a', position: 'relative', overflow: 'hidden', border: '1px solid #252525' }}>
                              {fill > 0 && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${fill * 100}%`, background: fill === 1 ? color : color + '99' }} />}
                            </div>
                          );
                        })}
                      </div>
                    : <div style={{ fontSize: 11, color: '#333', fontStyle: 'italic' }}>
                        {goals.length === 0 ? 'Nenhum objetivo definido' : `${goals.length} objetivo${goals.length > 1 ? 's' : ''} — sem progresso`}
                      </div>
                  }
                </div>
              );
            })}
          </div>
      }
    </div>
  );

  // ── Detail view ───────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 12, paddingBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button type="button" className="b bd bsm" onClick={() => { setSelAthleteState(null); setEditMode(false); }}>
          <i className="ti ti-arrow-left" /> Todos
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: athColor, flexShrink: 0 }} />
          <select value={selAthlete} className="ex-input" style={{ flex: 1, maxWidth: 200 }}
            onChange={e => { setSelAthleteState(e.target.value); setEditMode(false); setConfiguringGoal(null); setShowPrAll(false); setExpandedSessions(new Set()); }}>
            {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button type="button" className={`b ${editMode ? 'bsec' : 'bd'} bsm`} onClick={() => { setEditMode(e => !e); setConfiguringGoal(null); setShowPrAll(false); }}>
          <i className={`ti ${editMode ? 'ti-check' : 'ti-edit'}`} />{editMode ? ' Concluir edição' : ' Editar'}
        </button>
        {!editMode && athGoals.length < 3 && (
          <button type="button" className="b bsm" onClick={addGoal}><i className="ti ti-plus" /> Objetivo</button>
        )}
      </div>

      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Sessões</div>
        <SessionsSummaryPanel
          athName={ath?.name || ''} athId={selAthlete}
          sessions={sessions} results={athResults}
          expandedSessions={expandedSessions} setExpandedSessions={setExpandedSessions}
          onEditSession={onEditSession} onLogResult={onLogResult} />
      </div>

      {showPrAll
        ? <PrSubView athId={selAthlete} goalsData={goalsData} persist={persist} onBack={() => setShowPrAll(false)} />
        : <PrCard athId={selAthlete} goalsData={goalsData} persist={persist} onViewAll={() => setShowPrAll(true)} />
      }

      {!showPrAll && (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Objetivos</div>
          {athGoals.length === 0
            ? <div style={{ color: '#333', fontSize: 13, padding: '8px 0', fontStyle: 'italic' }}>
                {editMode ? 'Clique em "+ Objetivo" para adicionar um objetivo.' : 'Nenhum objetivo definido. Entre em modo edição para adicionar.'}
              </div>
            : athGoals.map(g => (
                <div key={g.id}>
                  {configuringGoal === g.id && editMode
                    ? <GoalConfigPanel goal={g} onSave={u => updateGoal(g.id, u)} onCancel={() => setConfiguringGoal(null)} />
                    : <HpBar goal={g} color={athColor} editMode={editMode}
                        onAddSession={() => addSession(g.id)}
                        onMilestoneHit={(mi, hit) => hitMilestone(g.id, mi, hit)}
                        onConfigure={() => setConfiguringGoal(g.id)}
                        onDelete={() => deleteGoal(g.id)} />
                  }
                </div>
              ))
          }
          {editMode && athGoals.length < 3 && (
            <button type="button" className="b bsm" style={{ marginTop: 8 }} onClick={addGoal}>
              <i className="ti ti-plus" /> Adicionar objetivo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
