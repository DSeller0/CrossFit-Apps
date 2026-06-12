import { useState, useEffect, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import {
  loadResults, saveResults,
  loadAthletes, saveAthletes,
  loadSettings, saveSettings,
  uid, todayISO,
} from '../../utils/storage';
import { APP_CONFIG, GF } from '../../utils/config';

// ── Constants ─────────────────────────────────────────────────────────────────
const getLevels = () => APP_CONFIG.athleteLevels || ['Iniciante', 'Intermediário', 'Avançado', 'Competidor'];
const getGoals  = () => APP_CONFIG.athleteGoals  || ['Saúde geral', 'Força', 'Condicionamento', 'Competição'];
const SCALES    = ['-', 'RX', 'Inter', 'SC', 'Adaptado'];
const PRESENCE  = ['Presente', 'Ausente', 'Atrasado'];
const LEVEL_CLS = { Iniciante: 'lv-ini', Intermediário: 'lv-int', Avançado: 'lv-adv', Competidor: 'lv-comp' };
const SCALE_CLS = { RX: 'sc-rx', Inter: 'sc-inter', SC: 'sc-sc', Adaptado: 'sc-adap' };
const WOD_BLOCK_TYPES = ['WOD', 'For Time', 'AMRAP', 'EMOM', 'MetCon', 'HIIT'];

// ── KPI helpers ───────────────────────────────────────────────────────────────
function calcKPIs(athleteId, results, sessions) {
  const ar = results.filter(r => r.athleteId === athleteId);
  const present = ar.filter(r => r.presence === 'Presente').length;
  const freq = ar.length > 0 ? Math.round(present / ar.length * 100) : 0;
  const rpes = ar.flatMap(r => r.blocks?.map(b => b.rpe).filter(Boolean) || []);
  const avgRpe = rpes.length > 0 ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : null;
  const scales = ar.flatMap(r => r.blocks?.map(b => b.scale).filter(Boolean) || []);
  const rxRate = scales.length > 0 ? Math.round(scales.filter(s => s === 'RX').length / scales.length * 100) : null;

  const loadMap = {};
  ar.forEach(r => {
    r.blocks?.forEach(b => {
      if (b.exerciseName && b.load) {
        if (!loadMap[b.exerciseName]) loadMap[b.exerciseName] = [];
        loadMap[b.exerciseName].push({ date: r.date, load: parseFloat(b.load) });
      }
    });
  });
  let loadTrend = null;
  Object.entries(loadMap).forEach(([name, entries]) => {
    if (entries.length >= 3) {
      const sorted = entries.sort((a, b) => a.date.localeCompare(b.date));
      const diff = ((sorted[sorted.length - 1].load - sorted[0].load) / sorted[0].load * 100).toFixed(1);
      if (!loadTrend || Math.abs(diff) > Math.abs(loadTrend.diff)) {
        loadTrend = { name, first: sorted[0].load, last: sorted[sorted.length - 1].load, diff: parseFloat(diff) };
      }
    }
  });
  const lastRpes = ar.slice(-8).map(r => {
    const rs = r.blocks?.map(b => b.rpe).filter(Boolean) || [];
    return rs.length > 0 ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
  }).filter(Boolean);

  return { freq, avgRpe, rxRate, loadTrend, lastRpes, totalSessions: present };
}

function calcSessionKPIs(dateKey, results) {
  const sr = results.filter(r => r.date === dateKey && r.presence === 'Presente');
  if (!sr.length) return null;
  const allRpe = sr.flatMap(r => r.blocks?.map(b => b.rpe).filter(Boolean) || []);
  const avgRpe = allRpe.length > 0 ? (allRpe.reduce((a, b) => a + b, 0) / allRpe.length).toFixed(1) : null;
  const allScales = sr.flatMap(r => r.blocks?.map(b => b.scale).filter(Boolean) || []);
  const scaleDist = { RX: 0, Inter: 0, SC: 0, Adaptado: 0 };
  allScales.forEach(s => { if (scaleDist[s] !== undefined) scaleDist[s]++; });
  const rxPct = allScales.length > 0 ? Math.round(scaleDist.RX / allScales.length * 100) : 0;
  const flags = sr.filter(r => r.flagForReview).length;
  return { avgRpe, rxPct, scaleDist, flags, count: sr.length };
}

function rankResults(results, blockType) {
  const isForTime = blockType === 'For Time';
  return [...results].sort((a, b) => {
    if (isForTime) {
      const toS = s => { if (!s) return Infinity; const p = s.split(':'); return p.length === 2 ? parseInt(p[0]) * 60 + parseInt(p[1]) : parseInt(s) || Infinity; };
      return toS(a.perfTime) - toS(b.perfTime);
    }
    const ra = parseInt(a.perfRounds) || 0, rb = parseInt(b.perfRounds) || 0;
    if (ra !== rb) return rb - ra;
    return (parseInt(b.perfReps) || 0) - (parseInt(a.perfReps) || 0);
  });
}

function getPerformanceStr(r, blockType) {
  if (blockType === 'For Time') return r.perfTime || '—';
  const parts = [];
  if (r.perfRounds) parts.push(`${r.perfRounds} rds`);
  if (r.perfReps)   parts.push(`${r.perfReps} reps`);
  return parts.join(' + ') || '—';
}

// ── SparkLine ─────────────────────────────────────────────────────────────────
function SparkLine({ values }) {
  if (!values || !values.length) return null;
  const max = Math.max(...values, 10);
  return (
    <div className="sparkline">
      {values.map((v, i) => (
        <div key={i} className="sparkline-bar"
          style={{ height: `${Math.round(v / max * 100)}%`, background: v >= 8 ? '#e05050' : v >= 6 ? '#e0a030' : '#60a840', flex: 1 }} />
      ))}
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, colorClass, children }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${colorClass || ''}`}>{value ?? '—'}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {children}
    </div>
  );
}

// ── RosterView ────────────────────────────────────────────────────────────────
function RosterView({ athletes, setAthletes }) {
  const [form, setForm]       = useState({ name: '', level: 'Iniciante', goal: 'Saúde geral', notes: '', color: '#e87820' });
  const [editing, setEditing] = useState(null);

  const save = () => {
    if (!form.name.trim()) return;
    if (editing) {
      const updated = athletes.map(a => a.id === editing ? { ...a, ...form } : a);
      setAthletes(updated); saveAthletes(updated); setEditing(null);
    } else {
      const updated = [...athletes, { ...form, id: uid(), since: todayISO() }];
      setAthletes(updated); saveAthletes(updated);
    }
    setForm({ name: '', level: 'Iniciante', goal: 'Saúde geral', notes: '' });
  };
  const del       = id => { const u = athletes.filter(a => a.id !== id); setAthletes(u); saveAthletes(u); };
  const startEdit = a  => { setForm({ name: a.name, level: a.level, goal: a.goal, notes: a.notes || '' }); setEditing(a.id); };
  const cancel    = () => { setForm({ name: '', level: 'Iniciante', goal: 'Saúde geral', notes: '' }); setEditing(null); };

  return (
    <div>
      <div className="sc-card">
        <div className="sc-hdr">
          <span className="sc-title">{editing ? 'Editar atleta' : 'Novo atleta'}</span>
          {editing && <button type="button" className="b bsm" onClick={cancel}>Cancelar</button>}
        </div>
        <div className="g2">
          <div className="fg">
            <span className="lbl">Nome</span>
            <input placeholder="Nome do atleta" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="fg">
            <span className="lbl">Nível</span>
            <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
              {getLevels().map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="g2 mb10">
          <div className="fg">
            <span className="lbl">Objetivo</span>
            <select value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}>
              {getGoals().map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="fg">
            <span className="lbl">Limitações / Observações</span>
            <input placeholder="ex: Joelho direito" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="fg mb10">
          <span className="lbl">Cor do atleta</span>
          <div className="color-row">
            <div className="color-swatch" style={{ background: form.color || '#e87820' }} onClick={() => document.getElementById('picker-athlete-form')?.click()} />
            <input type="color" id="picker-athlete-form" value={form.color || '#e87820'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }} />
            <input type="text" className="color-input" value={form.color || '#e87820'} onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setForm(f => ({ ...f, color: e.target.value })); }} />
          </div>
        </div>
        <button type="button" className="b bp bfull" onClick={save}>
          <i className="ti ti-check" />{editing ? ' Salvar' : ' Adicionar atleta'}
        </button>
      </div>
      {athletes.length === 0
        ? <div className="empty-state">Nenhum atleta cadastrado ainda.</div>
        : athletes.map(a => (
            <div key={a.id} className="athlete-card">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.color || '#e87820', flexShrink: 0 }} />
                  <span className="athlete-name">{a.name}</span>
                  <span className={`level-badge ${LEVEL_CLS[a.level] || 'lv-ini'}`}>{a.level}</span>
                </div>
                <div className="athlete-meta">{a.goal}{a.notes ? ' · ' + a.notes : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="b bsm" onClick={() => startEdit(a)}><i className="ti ti-edit" /></button>
                <button type="button" className="b bd bsm" onClick={() => del(a.id)}><i className="ti ti-trash" /></button>
              </div>
            </div>
          ))
      }
    </div>
  );
}

// ── LogView ───────────────────────────────────────────────────────────────────
function LogView({ athletes, sessions, preload, onPreloadConsumed }) {
  const [results, setResults]               = useState(loadResults);
  const [date, setDate]                     = useState(() => preload?.date || todayISO());
  const [athleteId, setAthleteId]           = useState(() => preload?.athleteId || '');
  const [presence, setPresence]             = useState('Presente');
  const [blockLogs, setBlockLogs]           = useState([]);
  const [coachNote, setCoachNote]           = useState('');
  const [flag, setFlag]                     = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [energyLevel, setEnergyLevel]       = useState(3);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);

  useEffect(() => {
    if (!preload) return;
    if (preload.date)      setDate(preload.date);
    if (preload.athleteId) setAthleteId(preload.athleteId);
    onPreloadConsumed?.();
  }, [preload]);

  useEffect(() => { setSelectedSessionIdx(0); }, [date]);

  const daySessions = sessions[date] || [];
  const session     = daySessions[selectedSessionIdx] || daySessions[0] || null;

  useEffect(() => {
    if (!session) return;
    const WOD_TYPES = ['WOD', 'For Time', 'AMRAP', 'EMOM', 'MetCon', 'HIIT'];
    const existing = results.find(r => r.date === date && r.athleteId === athleteId && (r.sessionId === session.id || !r.sessionId));
    if (existing) {
      const existBlocks = (existing.blocks || []).map((bl, bi) => {
        const sessionBl = (session.blocks || [])[bi];
        const isWod = WOD_TYPES.includes(bl.blockLabel || '') || WOD_TYPES.includes(bl.blockType || '');
        if (isWod && (!bl.exerciseRows || !bl.exerciseRows.length) && sessionBl) {
          return { ...bl, exerciseRows: (sessionBl.exercises || []).filter(e => e.name).map(ex => ({ name: ex.name, scale: bl.scale || '-', load: bl.load || '' })) };
        }
        return bl;
      });
      setBlockLogs(existBlocks);
      setPresence(existing.presence || 'Presente');
      setCoachNote(existing.coachNote || '');
      setFlag(existing.flagForReview || false);
    } else {
      setBlockLogs((session.blocks || []).map(bl => {
        const isWod = WOD_TYPES.includes(bl.label || '') || WOD_TYPES.includes(bl.type || '');
        const exerciseRows = (bl.exercises || []).filter(e => e.name).map(ex => ({ name: ex.name, scale: '-', load: '' }));
        return { blockId: bl.id, blockType: bl.type, blockLabel: bl.label || '-', load: '', rpe: 7, note: '', goal: '', perfTime: '', perfRounds: '', perfReps: '', exerciseRows: isWod ? exerciseRows : [] };
      }));
      setPresence('Presente'); setCoachNote(''); setFlag(false); setEnergyLevel(3);
    }
  }, [date, athleteId, session?.id]);

  const updBlock = (idx, field, val) => setBlockLogs(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n; });
  const updBlockExRow = (blkIdx, rowIdx, field, val) => setBlockLogs(prev => {
    const n = [...prev];
    const rows = [...(n[blkIdx].exerciseRows || [])];
    rows[rowIdx] = { ...rows[rowIdx], [field]: val };
    n[blkIdx] = { ...n[blkIdx], exerciseRows: rows };
    return n;
  });

  const saveLog = () => {
    if (!athleteId) { alert('Selecione um atleta.'); return; }
    const entry = { id: uid(), date, athleteId, presence, energyLevel, blocks: presence === 'Presente' ? blockLogs : [], coachNote, flagForReview: flag, sessionId: session?.id || null };
    const updated = [...results.filter(r => !(r.date === date && r.athleteId === athleteId && (r.sessionId === session?.id || (!r.sessionId && !session?.id)))), entry];
    setResults(updated); saveResults(updated);
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  };

  const sessionDates = Object.keys(sessions).filter(k => sessions[k]?.length > 0).sort();

  const rpeColor = rpe => {
    const t = (rpe - 1) / 9;
    const r = Math.round(t < 0.5 ? 2 * t * (224 - 96) + 96 : 96 + 2 * (t - 0.5) * (224 - 96));
    const g = Math.round(t < 0.5 ? 168 + 2 * t * (160 - 168) : 160 + 2 * (t - 0.5) * (80 - 160));
    const b = Math.round(t < 0.5 ? 64 + 2 * t * (48 - 64) : 48 + 2 * (t - 0.5) * (80 - 48));
    return `rgb(${r},${g},${b})`;
  };

  const RpeBar = ({ value, onChange }) => (
    <div className="rpe-hp-row">
      <button type="button" className="rpe-hp-btn" onClick={() => onChange(Math.max(1, value - 1))}>−</button>
      <span className="rpe-hp-val">{value}</span>
      <div className="rpe-hp-blocks">
        {Array.from({ length: 10 }, (_, bi) => {
          const t = bi / 9;
          const r = Math.round(t < 0.5 ? 2 * t * (224 - 96) + 96 : 224);
          const g = Math.round(t < 0.5 ? 168 : 168 - 2 * (t - 0.5) * (168 - 80));
          const col = `rgb(${r},${g},64)`;
          return <div key={bi} className={`rpe-hp-block ${bi < value ? 'active' : ''}`} style={{ background: bi < value ? col : '#1a1a1a' }} onClick={() => onChange(bi + 1)} />;
        })}
      </div>
      <button type="button" className="rpe-hp-btn" onClick={() => onChange(Math.min(10, value + 1))}>+</button>
    </div>
  );

  return (
    <div>
      <div className="sc-card">
        <div className="sc-hdr">
          <span className="sc-title">Registrar resultado</span>
          {saved && <span style={{ fontSize: 12, color: '#60a840', display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-check" /> Salvo</span>}
        </div>
        <div className="g2 mb10">
          <div className="fg">
            <span className="lbl">Data</span>
            <select value={date} onChange={e => setDate(e.target.value)}>
              {sessionDates.length === 0
                ? <option value={todayISO()}>Sem sessões</option>
                : sessionDates.map(d => {
                    const lbl = new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
                    return <option key={d} value={d}>{lbl} — {sessions[d]?.[0]?.mainTraining || ''}</option>;
                  })
              }
            </select>
          </div>
          <div className="fg">
            <span className="lbl">Atleta</span>
            <select value={athleteId} onChange={e => setAthleteId(e.target.value)}>
              <option value="">— Selecionar —</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        {daySessions.length > 1 && (
          <div className="fg mb10">
            <span className="lbl">Sessão</span>
            <select value={selectedSessionIdx} onChange={e => setSelectedSessionIdx(parseInt(e.target.value))}>
              {daySessions.map((s, i) => <option key={s.id} value={i}>Sessão {i + 1}{s.mainTraining ? ' — ' + s.mainTraining : ''}</option>)}
            </select>
          </div>
        )}
        <div className="fg mb10">
          <span className="lbl">Presença</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRESENCE.map(p => (
              <button key={p} type="button" className="b bsm"
                style={{ background: presence === p ? 'var(--theme-accent)' : 'transparent', color: presence === p ? 'var(--theme-accent-text)' : '#bbb', borderColor: presence === p ? 'var(--theme-accent)' : '#2e2e2e' }}
                onClick={() => setPresence(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div className="fg mb10">
          <span className="lbl">Energia pré-treino</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" className="b bsm"
                style={{ flex: 1, fontWeight: 700, fontSize: 14, background: energyLevel === n ? 'var(--theme-accent)' : 'transparent', color: energyLevel === n ? 'var(--theme-accent-text)' : '#888', borderColor: energyLevel === n ? 'var(--theme-accent)' : '#2e2e2e' }}
                onClick={() => setEnergyLevel(n)}>{n}</button>
            ))}
          </div>
        </div>

        {presence === 'Presente' && session && (
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Blocos da sessão</div>
            {blockLogs.map((bl, i) => {
              const title = bl.blockLabel && bl.blockLabel !== '-' ? bl.blockLabel : bl.blockType;
              const WOD_TYPES = ['WOD', 'For Time', 'AMRAP', 'EMOM', 'MetCon', 'HIIT'];
              const isWod = WOD_TYPES.includes(bl.blockLabel) || WOD_TYPES.includes(bl.blockType);
              const goalLabel = (bl.blockType === 'For Time' || bl.blockLabel === 'For Time') ? 'Meta de tempo (ex: 14:00)' :
                                (bl.blockType === 'AMRAP' || bl.blockLabel === 'AMRAP') ? 'Meta de rounds' : '';
              const rpeCol = rpeColor(bl.rpe);

              const savedForBlock = results.filter(r =>
                r.date === date && r.presence === 'Presente' &&
                (r.sessionId === session?.id || !r.sessionId) &&
                (r.blocks || []).some(rb => rb.blockId === bl.blockId && (rb.perfTime || rb.perfRounds || rb.perfReps))
              );
              const SCALE_RANK_L = { RX: 4, Inter: 3, SC: 2, Adaptado: 1, '-': 0 };
              const SCALE_NAMES_L = { 4: 'RX', 3: 'Inter', 2: 'SC', 1: 'Adaptado', 0: '-' };

              return (
                <div key={bl.blockId} className="log-block-section">
                  <div className="log-block-title">Bloco {i + 1} — {title}</div>
                  {isWod ? (
                    <div>
                      {goalLabel && (
                        <div className="fg mb8">
                          <span className="lbl">{goalLabel}</span>
                          <input placeholder={(bl.blockType === 'For Time' || bl.blockLabel === 'For Time') ? 'ex: 14:00' : 'ex: 10'} value={bl.goal || ''} onChange={e => updBlock(i, 'goal', e.target.value)} />
                        </div>
                      )}
                      <div style={{ overflowX: 'auto', marginBottom: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '4px 6px', color: '#555', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #1e1e1e' }}>Exercício</th>
                              <th style={{ textAlign: 'center', padding: '4px 6px', color: '#555', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #1e1e1e', width: 90 }}>Escala</th>
                              <th style={{ textAlign: 'center', padding: '4px 6px', color: '#555', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #1e1e1e', width: 80 }}>Carga</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(bl.exerciseRows || []).map((row, ri) => (
                              <tr key={ri} style={{ borderBottom: '1px solid #141414' }}>
                                <td style={{ padding: '6px 6px', color: '#ccc', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>{row.name || '—'}</td>
                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                  <select value={row.scale || '-'} onChange={e => updBlockExRow(i, ri, 'scale', e.target.value)}
                                    style={{ fontFamily: 'inherit', fontSize: 11, background: '#111', border: '1px solid #2a2a2a', color: '#ccc', borderRadius: 3, padding: '3px 4px', width: 80 }}>
                                    {SCALES.map(s => <option key={s}>{s}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '4px 6px' }}>
                                  <input type="text" placeholder="—" value={row.load || ''} onChange={e => updBlockExRow(i, ri, 'load', e.target.value)}
                                    style={{ width: '100%', fontFamily: 'inherit', fontSize: 12, background: 'transparent', border: 'none', borderBottom: '1px solid #2a2a2a', color: '#e0e0e0', outline: 'none', textAlign: 'center', padding: '2px 0' }} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="g2 mb8" style={{ gap: 8 }}>
                        <div className="fg"><span className="lbl">Tempo</span><input placeholder="ex: 12:45" value={bl.perfTime || ''} onChange={e => updBlock(i, 'perfTime', e.target.value)} /></div>
                        <div className="fg"><span className="lbl">Rounds</span><input type="number" placeholder="—" value={bl.perfRounds || ''} onChange={e => updBlock(i, 'perfRounds', e.target.value)} /></div>
                        <div className="fg"><span className="lbl">Reps</span><input type="number" placeholder="—" value={bl.perfReps || ''} onChange={e => updBlock(i, 'perfReps', e.target.value)} /></div>
                      </div>
                      <div className="fg mb8">
                        <div className="rpe-hp-label">
                          <span>RPE — {bl.rpe}</span>
                          <span style={{ color: rpeCol, fontWeight: 700 }}>{bl.rpe >= 9 ? 'Máximo' : bl.rpe >= 7 ? 'Pesado' : bl.rpe >= 5 ? 'Moderado' : 'Leve'}</span>
                        </div>
                        <RpeBar value={bl.rpe} onChange={v => updBlock(i, 'rpe', v)} />
                      </div>
                      <div className="fg"><span className="lbl">Nota do bloco</span><input placeholder="Observação..." value={bl.note || ''} onChange={e => updBlock(i, 'note', e.target.value)} /></div>
                      {savedForBlock.length > 0 && (
                        <div style={{ marginTop: 10, borderTop: '1px solid #1a1a1a', paddingTop: 2 }}>
                          <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.07em', padding: '6px 0 4px' }}>Resultados registrados</div>
                          {savedForBlock.map(r => {
                            const ath = athletes.find(a => String(a.id) === String(r.athleteId));
                            const blk = (r.blocks || []).find(b => b.blockId === bl.blockId);
                            const exRows = blk?.exerciseRows || [];
                            let minRank = 4;
                            exRows.forEach(row => { const rank = SCALE_RANK_L[row.scale] ?? 0; if (rank < minRank) minRank = rank; });
                            const scale = exRows.length > 0 ? SCALE_NAMES_L[minRank] : (blk?.scale || '');
                            const perf = blk?.perfTime || (blk?.perfRounds ? `${blk.perfRounds} rds${blk.perfReps ? ' + ' + blk.perfReps + ' reps' : ''}` : '') || '✓';
                            return (
                              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 3, background: '#0d0d0d', border: '1px solid #1e1e1e', borderLeft: `3px solid ${ath?.color || '#555'}`, borderRadius: 5 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ath?.color || '#555', flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ath?.name || '—'}</span>
                                {scale && scale !== '-' && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--theme-accent)', background: 'rgba(0,184,212,0.08)', border: '1px solid var(--theme-accent)', borderRadius: 3, padding: '1px 6px', flexShrink: 0 }}>{scale}</span>}
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{perf}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="fg mb8"><span className="lbl">Carga usada — opcional (kg ou %)</span><input type="text" placeholder="ex: 80kg / 75%" value={bl.load || ''} onChange={e => updBlock(i, 'load', e.target.value)} /></div>
                      <div className="fg mb8">
                        <div className="rpe-hp-label">
                          <span>RPE — {bl.rpe}</span>
                          <span style={{ color: rpeCol, fontWeight: 700 }}>{bl.rpe >= 9 ? 'Máximo' : bl.rpe >= 7 ? 'Pesado' : bl.rpe >= 5 ? 'Moderado' : 'Leve'}</span>
                        </div>
                        <RpeBar value={bl.rpe} onChange={v => updBlock(i, 'rpe', v)} />
                      </div>
                      <div className="fg"><span className="lbl">Nota do bloco</span><input placeholder="Observação..." value={bl.note || ''} onChange={e => updBlock(i, 'note', e.target.value)} /></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {presence === 'Presente' && !session && <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>Nenhuma sessão programada para esta data.</div>}

        <div className="fg mb10" style={{ marginTop: 8 }}>
          <span className="lbl">Nota geral do coach</span>
          <textarea placeholder="Observações gerais..." value={coachNote} onChange={e => setCoachNote(e.target.value)} style={{ minHeight: 52 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button type="button" className="b bsm"
            style={{ background: flag ? '#3a1010' : 'transparent', color: flag ? '#e05050' : '#666', borderColor: flag ? '#601818' : '#2e2e2e' }}
            onClick={() => setFlag(f => !f)}>
            <i className="ti ti-flag" />{flag ? ' Marcado para revisão' : ' Marcar para revisão'}
          </button>
        </div>
        <button type="button" className="b bp bfull" onClick={saveLog}>
          <i className="ti ti-check" /> Salvar resultado
        </button>
      </div>
    </div>
  );
}

// ── HistoryView ───────────────────────────────────────────────────────────────
function HistoryView({ athletes, sessions }) {
  const [results, setResults] = useState(loadResults);
  const [subTab, setSubTab]   = useState('athlete');
  const [selAthlete, setSelAthlete] = useState('');
  const [selDate, setSelDate]       = useState('');

  const sessionDates    = Object.keys(sessions).filter(k => sessions[k]?.length > 0).sort().reverse();
  const athleteKPIs     = selAthlete ? calcKPIs(selAthlete, results, sessions) : null;
  const athleteResults  = selAthlete ? results.filter(r => r.athleteId === selAthlete).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const sessionKPIs     = selDate ? calcSessionKPIs(selDate, results) : null;
  const sessionResults  = selDate ? results.filter(r => r.date === selDate && r.presence === 'Presente') : [];

  return (
    <div>
      <div className="res-tabs">
        <button type="button" className={`res-tab ${subTab === 'athlete' ? 'on' : ''}`} onClick={() => setSubTab('athlete')}>Por atleta</button>
        <button type="button" className={`res-tab ${subTab === 'session' ? 'on' : ''}`} onClick={() => setSubTab('session')}>Por sessão</button>
      </div>

      {subTab === 'athlete' && (
        <div>
          <div className="sc-card" style={{ padding: 12 }}>
            <div className="fg">
              <span className="lbl">Selecionar atleta</span>
              <select value={selAthlete} onChange={e => setSelAthlete(e.target.value)}>
                <option value="">— Selecionar —</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          {selAthlete && athleteKPIs && (
            <div>
              <div className="kpi-grid">
                <KpiCard label="Frequência" value={`${athleteKPIs.freq}%`} sub={`${athleteKPIs.totalSessions} sessões presentes`} colorClass={athleteKPIs.freq >= 80 ? 'kpi-good' : athleteKPIs.freq >= 60 ? 'kpi-warn' : 'kpi-bad'} />
                <KpiCard label="RPE médio" value={athleteKPIs.avgRpe || '—'} sub="Média de esforço percebido" colorClass={athleteKPIs.avgRpe ? athleteKPIs.avgRpe <= 7 ? 'kpi-good' : athleteKPIs.avgRpe <= 8.5 ? 'kpi-warn' : 'kpi-bad' : ''}>
                  {athleteKPIs.lastRpes.length > 0 && <div style={{ marginTop: 8 }}><SparkLine values={athleteKPIs.lastRpes} /></div>}
                </KpiCard>
                <KpiCard label="Taxa RX" value={athleteKPIs.rxRate !== null ? `${athleteKPIs.rxRate}%` : '—'} sub="Sessões completadas como RX" colorClass={athleteKPIs.rxRate !== null ? athleteKPIs.rxRate >= 60 ? 'kpi-good' : athleteKPIs.rxRate >= 30 ? 'kpi-warn' : 'kpi-bad' : ''} />
                {athleteKPIs.loadTrend && <KpiCard label="Evolução de carga" value={`${athleteKPIs.loadTrend.diff > 0 ? '+' : ''}${athleteKPIs.loadTrend.diff}%`} sub={`${athleteKPIs.loadTrend.name} · ${athleteKPIs.loadTrend.first}→${athleteKPIs.loadTrend.last}kg`} colorClass={athleteKPIs.loadTrend.diff > 0 ? 'kpi-good' : athleteKPIs.loadTrend.diff < 0 ? 'kpi-bad' : 'kpi-warn'} />}
              </div>
              <div className="sc-card">
                <div className="sc-hdr"><span className="sc-title">Histórico</span></div>
                {athleteResults.length === 0
                  ? <div className="empty-state">Nenhum resultado registrado ainda.</div>
                  : athleteResults.map(r => {
                      const dt = new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
                      const sn = sessions[r.date]?.[0]?.mainTraining || '';
                      const rpes = r.blocks?.map(b => b.rpe).filter(Boolean) || [];
                      const avgRpe = rpes.length > 0 ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : null;
                      const topScale = (r.blocks?.map(b => b.scale).filter(Boolean) || [])[0] || null;
                      return (
                        <div key={r.id} className="history-row">
                          <div className={`presence-dot pd-${r.presence?.toLowerCase()}`} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{dt}</span>
                              {sn && <span style={{ fontSize: 11, color: '#555' }}>{sn}</span>}
                              {topScale && <span className={`scale-badge ${SCALE_CLS[topScale] || 'sc-sc'}`}>{topScale}</span>}
                              {r.flagForReview && <i className="ti ti-flag flag-icon" />}
                            </div>
                            {r.presence !== 'Presente'
                              ? <div style={{ fontSize: 11, color: '#555' }}>{r.presence}</div>
                              : <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                                  {avgRpe && <span style={{ fontSize: 11, color: '#f5c842' }}>RPE {avgRpe}</span>}
                                  {r.blocks?.filter(b => b.performance).map((b, bi) => <span key={bi} style={{ fontSize: 11, color: '#666' }}>{b.performance}</span>)}
                                  {r.coachNote && <span style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>{r.coachNote}</span>}
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

      {subTab === 'session' && (
        <div>
          <div className="sc-card" style={{ padding: 12 }}>
            <div className="fg">
              <span className="lbl">Selecionar sessão</span>
              <select value={selDate} onChange={e => setSelDate(e.target.value)}>
                <option value="">— Selecionar —</option>
                {sessionDates.map(d => {
                  const dt = new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
                  return <option key={d} value={d}>{dt} — {sessions[d]?.[0]?.mainTraining || ''}</option>;
                })}
              </select>
            </div>
          </div>
          {selDate && sessionKPIs && (
            <div>
              <div className="kpi-grid">
                <KpiCard label="RPE médio da turma" value={sessionKPIs.avgRpe || '—'} sub={`${sessionKPIs.count} atletas presentes`} colorClass={sessionKPIs.avgRpe ? sessionKPIs.avgRpe <= 7 ? 'kpi-good' : sessionKPIs.avgRpe <= 8.5 ? 'kpi-warn' : 'kpi-bad' : ''} />
                <KpiCard label="Taxa RX" value={`${sessionKPIs.rxPct}%`} sub="Das escalas registradas" colorClass={sessionKPIs.rxPct >= 60 ? 'kpi-good' : sessionKPIs.rxPct >= 30 ? 'kpi-warn' : 'kpi-bad'} />
                <KpiCard label="Flags" value={sessionKPIs.flags} sub="Atletas marcados para revisão" colorClass={sessionKPIs.flags === 0 ? 'kpi-good' : sessionKPIs.flags <= 2 ? 'kpi-warn' : 'kpi-bad'} />
                <KpiCard label="Distribuição de escala" value={`${sessionKPIs.scaleDist.RX} RX`} sub={`${sessionKPIs.scaleDist.Inter} Inter · ${sessionKPIs.scaleDist.SC} SC · ${sessionKPIs.scaleDist.Adaptado} Adap`} />
              </div>
              {sessionResults.length > 0 && (
                <div className="sc-card">
                  <div className="sc-hdr"><span className="sc-title">Resultados da turma</span></div>
                  {sessionResults.map(r => {
                    const ath = athletes.find(a => String(a.id) === String(r.athleteId));
                    const rpes = r.blocks?.map(b => b.rpe).filter(Boolean) || [];
                    const avgRpe = rpes.length > 0 ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : null;
                    const topScale = r.blocks?.[0]?.scale || null;
                    return (
                      <div key={r.id} className="history-row">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{ath?.name || '—'}</span>
                            {ath && <span className={`level-badge ${LEVEL_CLS[ath.level] || 'lv-ini'}`}>{ath.level}</span>}
                            {topScale && <span className={`scale-badge ${SCALE_CLS[topScale] || 'sc-sc'}`}>{topScale}</span>}
                            {r.flagForReview && <i className="ti ti-flag flag-icon" />}
                          </div>
                          <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                            {avgRpe && <span style={{ fontSize: 11, color: '#f5c842' }}>RPE {avgRpe}</span>}
                            {r.blocks?.filter(b => b.performance).map((b, bi) => <span key={bi} style={{ fontSize: 11, color: '#666' }}>{b.performance}</span>)}
                            {r.coachNote && <span style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>{r.coachNote}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {selDate && !sessionKPIs && <div className="empty-state">Nenhum resultado registrado para esta sessão.</div>}
        </div>
      )}
    </div>
  );
}

// ── LeaderboardView ───────────────────────────────────────────────────────────
function LeaderboardView({ athletes, sessions }) {
  const [results, setResults]         = useState(loadResults);
  const [selWod, setSelWod]           = useState('');
  const [scaleFilter, setScaleFilter] = useState('Todos');
  const [lbSettingsOpen, setLbSettingsOpen] = useState(false);
  const imgRef = useRef();

  const _lbc = (() => { try { const d = localStorage.getItem('eagles_lb_colors_v1'); return d ? JSON.parse(d) : {}; } catch { return {}; } })();
  const saveLBC = d => { try { localStorage.setItem('eagles_lb_colors_v1', JSON.stringify(d)); } catch {} };

  const [lbBg, setLbBg]               = useState(_lbc.lbBg || '#000000');
  const [lbRowAlt, setLbRowAlt]       = useState(_lbc.lbRowAlt || '#020809');
  const [lbP1Bg, setLbP1Bg]           = useState(_lbc.lbP1Bg || 'rgba(255,215,0,0.06)');
  const [lbP2Bg, setLbP2Bg]           = useState(_lbc.lbP2Bg || 'rgba(192,192,192,0.05)');
  const [lbP3Bg, setLbP3Bg]           = useState(_lbc.lbP3Bg || 'rgba(205,127,50,0.05)');
  const [lbDivider, setLbDivider]     = useState(_lbc.lbDivider || '#0d1e1e');
  const [lbHdrBg, setLbHdrBg]         = useState(_lbc.lbHdrBg || '#000000');
  const [lbHdrBorder, setLbHdrBorder] = useState(_lbc.lbHdrBorder || '#00b8d4');
  const [lbHdrTitle, setLbHdrTitle]   = useState(_lbc.lbHdrTitle || '#ffffff');
  const [lbHdrSub, setLbHdrSub]       = useState(_lbc.lbHdrSub || '#00b8d4');
  const [lbRank, setLbRank]           = useState(_lbc.lbRank || '#333333');
  const [lbP1, setLbP1]               = useState(_lbc.lbP1 || '#ffd700');
  const [lbP2, setLbP2]               = useState(_lbc.lbP2 || '#c0c0c0');
  const [lbP3, setLbP3]               = useState(_lbc.lbP3 || '#cd7f32');
  const [lbName, setLbName]           = useState(_lbc.lbName || '#ffffff');
  const [lbScaleText, setLbScaleText] = useState(_lbc.lbScaleText || '#00b8d4');
  const [lbScaleBg, setLbScaleBg]     = useState(_lbc.lbScaleBg || 'rgba(0,184,212,0.1)');
  const [lbScaleBorder, setLbScaleBorder] = useState(_lbc.lbScaleBorder || '#00b8d4');
  const [lbPerf, setLbPerf]           = useState(_lbc.lbPerf || '#ffffff');
  const [lbFilterBg, setLbFilterBg]   = useState(_lbc.lbFilterBg || APP_CONFIG.themeAccent || '#00b8d4');
  const [lbFilterText, setLbFilterText] = useState(_lbc.lbFilterText || APP_CONFIG.themeAccentText || '#000000');

  const lbc = { lbBg, lbRowAlt, lbP1Bg, lbP2Bg, lbP3Bg, lbDivider, lbHdrBg, lbHdrBorder, lbHdrTitle, lbHdrSub, lbRank, lbP1, lbP2, lbP3, lbName, lbScaleText, lbScaleBg, lbScaleBorder, lbPerf, lbFilterBg, lbFilterText };

  useEffect(() => { saveLBC(lbc); }, [lbBg, lbRowAlt, lbP1Bg, lbP2Bg, lbP3Bg, lbDivider, lbHdrBg, lbHdrBorder, lbHdrTitle, lbHdrSub, lbRank, lbP1, lbP2, lbP3, lbName, lbScaleText, lbScaleBg, lbScaleBorder, lbPerf, lbFilterBg, lbFilterText]);

  const colorRow = ([lbl, val, setter, id]) => (
    <div key={id} className="settings-row">
      <span className="settings-lbl">{lbl}</span>
      <div className="color-row">
        <div className="color-swatch" style={{ background: val }} onClick={() => document.getElementById('lbp-' + id)?.click()} />
        <input type="color" id={'lbp-' + id} value={/^#[0-9a-fA-F]{6}$/.test(val) ? val : '#888888'} onChange={e => setter(e.target.value)} style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }} />
        <input type="text" className="color-input" value={val} onChange={e => { if (/^(#[0-9a-fA-F]{0,8}|rgba?.*)$/.test(e.target.value)) setter(e.target.value); }} />
      </div>
    </div>
  );

  const wodList = useMemo(() => {
    const list = [];
    Object.entries(sessions).sort(([a], [b]) => b.localeCompare(a)).forEach(([dateKey, daySessions]) => {
      (daySessions || []).forEach(sess => {
        (sess.blocks || []).filter(bl => WOD_BLOCK_TYPES.includes(bl.label) || WOD_BLOCK_TYPES.includes(bl.type)).forEach(bl => {
          const hasRes = results.some(r => r.date === dateKey && r.sessionId === sess.id && r.presence === 'Presente' && (r.blocks || []).some(rb => rb.blockId === bl.id && (rb.perfTime || rb.perfRounds || rb.perfReps)));
          if (hasRes) {
            const dt = new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
            const label = bl.label && bl.label !== '-' ? bl.label : bl.type;
            const meta = [bl.rounds && `${bl.rounds}rds`, bl.duration && `CAP ${bl.duration}'`].filter(Boolean).join(' · ');
            list.push({ key: `${dateKey}|${sess.id}|${bl.id}`, dateKey, sessId: sess.id, blId: bl.id, blType: bl.type, blLabel: label, meta, sessName: sess.mainTraining || '', dt });
          }
        });
      });
    });
    return list;
  }, [sessions, results]);

  const selObj = wodList.find(w => w.key === selWod) || null;

  const wodResults = useMemo(() => {
    if (!selObj) return [];
    const SCALE_RANK = { RX: 4, Inter: 3, SC: 2, Adaptado: 1, '-': 0 };
    const SCALE_NAMES = { 4: 'RX', 3: 'Inter', 2: 'SC', 1: 'Adaptado', 0: '-' };
    return results.filter(r => r.date === selObj.dateKey && r.sessionId === selObj.sessId && r.presence === 'Presente')
      .map(r => {
        const blk = (r.blocks || []).find(b => b.blockId === selObj.blId) || null;
        if (!blk) return null;
        const exRows = blk.exerciseRows || [];
        let minRank = 4;
        exRows.forEach(row => { const rank = SCALE_RANK[row.scale] ?? 0; if (rank < minRank) minRank = rank; });
        const scale = exRows.length > 0 ? SCALE_NAMES[minRank] : blk.scale || '-';
        return { ...r, perfTime: blk.perfTime, perfRounds: blk.perfRounds, perfReps: blk.perfReps, scale };
      }).filter(r => r && (r.perfTime || r.perfRounds || r.perfReps));
  }, [selObj, results]);

  const scales   = ['Todos', 'RX', 'Inter', 'SC', 'Adaptado'];
  const filtered = scaleFilter === 'Todos' ? wodResults : wodResults.filter(r => r.scale === scaleFilter);
  const ranked   = selObj ? rankResults(filtered, selObj.blType) : [];
  const podColors = [lbP1, lbP2, lbP3];
  const podBgs    = [lbP1Bg, lbP2Bg, lbP3Bg];
  const podLabels = ['1º', '2º', '3º'];

  const doExport = async () => {
    const el = imgRef.current; if (!el) return;
    const cv = await html2canvas(el, { scale: APP_CONFIG.exportScale || 2, backgroundColor: lbBg, useCORS: true, logging: false, width: 1080, height: el.scrollHeight, windowWidth: 1080 });
    const a = document.createElement('a');
    const lbl = selObj ? `${selObj.dt}-${selObj.blLabel}-${scaleFilter}`.replace(/[^a-zA-Z0-9\-]/g, '-').toLowerCase() : 'leaderboard';
    a.download = `eagles-leaderboard-${lbl}.png`; a.href = cv.toDataURL('image/png'); a.click();
  };

  const handleLoadConfig = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
    inp.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const cfg = JSON.parse(ev.target.result);
          const lb = cfg.lbColors || cfg;
          const set = (key, setter) => { if (lb[key] !== undefined) setter(lb[key]); };
          set('lbBg', setLbBg); set('lbRowAlt', setLbRowAlt); set('lbP1Bg', setLbP1Bg); set('lbP2Bg', setLbP2Bg); set('lbP3Bg', setLbP3Bg);
          set('lbDivider', setLbDivider); set('lbHdrBg', setLbHdrBg); set('lbHdrBorder', setLbHdrBorder); set('lbHdrTitle', setLbHdrTitle);
          set('lbHdrSub', setLbHdrSub); set('lbRank', setLbRank); set('lbP1', setLbP1); set('lbP2', setLbP2); set('lbP3', setLbP3);
          set('lbName', setLbName); set('lbScaleText', setLbScaleText); set('lbScaleBg', setLbScaleBg); set('lbScaleBorder', setLbScaleBorder);
          set('lbPerf', setLbPerf); set('lbFilterBg', setLbFilterBg); set('lbFilterText', setLbFilterText);

          const existing = loadSettings();
          const src = cfg.colors ? { ...cfg, ...cfg.colors } : cfg;
          const merged = { ...existing };
          ['fontScale','exportScale','gymName','wkBg','wkHeader','wkDateNum','wkMainTraining','wkBlockType','wkExName','wkDivider',
           'dvBg','dvGymName','dvDate','dvMainTraining','dvZoneType','dvBlockLabel','dvCap','dvRounds','dvExName','dvIntensity','dvNote','dvBlockNotes','dvDivider',
           'eaGymName','eaDate','eaSubtitle','eaBlockType','eaBlockMeta','eaExName','eaIntensity','eaBlockHdr','eaDivider',
           'mmGymName','mmDate','mmSubtitle','mmBlockType','mmBlockMetaBg','mmBlockMetaText','mmExName','mmIntensity','mmBlockHdr','mmDivider'].forEach(k => {
            if (src[k] !== undefined) merged[k] = src[k];
          });
          if (src.mobileEaglesBg || src.eaglesBg)   merged.eaglesBg  = src.mobileEaglesBg || src.eaglesBg;
          if (src.mobileMegaManBg || src.megaManBg)  merged.megaManBg = src.mobileMegaManBg || src.megaManBg;
          saveSettings(merged);
          if (cfg.themeAccent)    APP_CONFIG.themeAccent = cfg.themeAccent;
          if (cfg.themeAccentText) APP_CONFIG.themeAccentText = cfg.themeAccentText;
          if (cfg.fontFamily)     APP_CONFIG.fontFamily = cfg.fontFamily;
          if (cfg.googleFontsUrl) APP_CONFIG.googleFontsUrl = cfg.googleFontsUrl;
          try { localStorage.setItem('eagles_lb_colors_v1', JSON.stringify(lbc)); } catch {}
          alert('Config completa carregada! A página irá recarregar para aplicar todas as cores.');
          setTimeout(() => window.location.reload(), 300);
        } catch (err) { alert('Erro ao ler o arquivo: ' + err.message); }
      };
      reader.readAsText(file);
    };
    inp.click();
  };

  const handleSaveConfig = () => {
    const savedSettings = loadSettings();
    const exportCfg = { ...savedSettings, appTitle: APP_CONFIG.appTitle, logo: APP_CONFIG.logo || 'icon-192.png', themeAccent: APP_CONFIG.themeAccent, themeAccentText: APP_CONFIG.themeAccentText, gymName: APP_CONFIG.gymName, blockColors: APP_CONFIG.blockColors || {}, blockNames: APP_CONFIG.blockNames, athleteLevels: APP_CONFIG.athleteLevels, athleteGoals: APP_CONFIG.athleteGoals, restDayLabel: APP_CONFIG.restDayLabel, mobileWeeklyLabels: APP_CONFIG.mobileWeeklyLabels, lbColors: lbc };
    const raw = window.prompt('Nome do arquivo (sem extensão):', 'config'); if (raw === null) return;
    const fname = (raw.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'config');
    const blob = new Blob([JSON.stringify(exportCfg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.download = fname + '.json'; a.href = URL.createObjectURL(blob); a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      {lbSettingsOpen && (
        <div className="settings-overlay" onClick={() => setLbSettingsOpen(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}
            ref={el => {
              if (!el) return;
              const hdr = el.querySelector('.settings-drag-hdr');
              if (!hdr || hdr._drag) return; hdr._drag = true;
              let ox = 0, oy = 0, drag = false;
              const dn = e => { drag = true; const r = el.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top; el.style.transform = 'none'; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); };
              const mv = e => { if (!drag) return; el.style.left = (e.clientX - ox) + 'px'; el.style.top = (e.clientY - oy) + 'px'; };
              const up = () => { drag = false; document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
              hdr.addEventListener('mousedown', dn);
            }}>
            <div className="settings-drag-hdr">
              <i className="ti ti-grip-horizontal" style={{ color: '#555', fontSize: 16 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Cores do Leaderboard</span>
              <button type="button" className="b bd bsm" style={{ marginLeft: 'auto', padding: '3px 8px', minHeight: 24 }} onClick={() => setLbSettingsOpen(false)}><i className="ti ti-x" /></button>
            </div>
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
              {[
                ['Fundo geral', lbBg, setLbBg, 'bg'],
                ['Linhas alternas', lbRowAlt, setLbRowAlt, 'row'],
                ['Fundo 1º lugar', lbP1Bg, setLbP1Bg, 'p1bg'],
                ['Fundo 2º lugar', lbP2Bg, setLbP2Bg, 'p2bg'],
                ['Fundo 3º lugar', lbP3Bg, setLbP3Bg, 'p3bg'],
                ['Divisor de linhas', lbDivider, setLbDivider, 'div'],
                ['Header — fundo', lbHdrBg, setLbHdrBg, 'hbg'],
                ['Header — borda', lbHdrBorder, setLbHdrBorder, 'hbrd'],
                ['Header — título', lbHdrTitle, setLbHdrTitle, 'htit'],
                ['Header — subtítulo', lbHdrSub, setLbHdrSub, 'hsub'],
                ['Rank (4º+)', lbRank, setLbRank, 'rank'],
                ['1º lugar — cor', lbP1, setLbP1, 'p1'],
                ['2º lugar — cor', lbP2, setLbP2, 'p2'],
                ['3º lugar — cor', lbP3, setLbP3, 'p3'],
                ['Nome do atleta', lbName, setLbName, 'name'],
                ['Escala — texto', lbScaleText, setLbScaleText, 'sctxt'],
                ['Escala — fundo', lbScaleBg, setLbScaleBg, 'scbg'],
                ['Escala — borda', lbScaleBorder, setLbScaleBorder, 'scbrd'],
                ['Performance', lbPerf, setLbPerf, 'perf'],
                ['Filtro ativo — fundo', lbFilterBg, setLbFilterBg, 'fbg'],
                ['Filtro ativo — texto', lbFilterText, setLbFilterText, 'ftxt'],
              ].map(colorRow)}
            </div>
            <div style={{ padding: '8px 16px', borderTop: '1px solid #252525', display: 'flex', gap: 8 }}>
              <button type="button" className="b bsm" style={{ flex: 1 }} onClick={handleLoadConfig}><i className="ti ti-upload" /> Carregar config</button>
              <button type="button" className="b bsm" style={{ flex: 1 }} onClick={handleSaveConfig}><i className="ti ti-download" /> Salvar config.json</button>
            </div>
            <div style={{ padding: '4px 16px 10px', fontSize: 11, color: '#444' }}>Cores salvas automaticamente e incluídas no estado exportado.</div>
          </div>
        </div>
      )}

      <div className="sc-card" style={{ padding: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="lbl" style={{ margin: 0 }}>Leaderboard</span>
          <button type="button" className="b bsm" onClick={() => setLbSettingsOpen(true)}><i className="ti ti-settings" /> Cores</button>
        </div>
        <div className="g2">
          <div className="fg">
            <span className="lbl">WOD</span>
            <select value={selWod} onChange={e => setSelWod(e.target.value)}>
              <option value="">— Selecionar —</option>
              {wodList.map(w => <option key={w.key} value={w.key}>{w.dt}{w.sessName ? ' (' + w.sessName + ')' : ''} — {w.blLabel}{w.meta ? ' · ' + w.meta : ''}</option>)}
            </select>
          </div>
          <div className="fg">
            <span className="lbl">Escala</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {scales.map(s => (
                <button key={s} type="button" className="b bsm"
                  style={{ background: scaleFilter === s ? lbFilterBg : 'transparent', color: scaleFilter === s ? lbFilterText : '#888', borderColor: scaleFilter === s ? lbFilterBg : '#2e2e2e', fontSize: 11 }}
                  onClick={() => setScaleFilter(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selObj ? (
        <div>
          <div ref={imgRef} style={{ background: lbBg, width: 1080, transform: `scale(${Math.min(1, (window.innerWidth - 28) / 1080)})`, transformOrigin: 'top left', marginBottom: `${-1080 * (1 - Math.min(1, (window.innerWidth - 28) / 1080))}px` }}>
            <div style={{ background: lbHdrBg, padding: '20px 28px 16px', borderBottom: `3px solid ${lbHdrBorder}` }}>
              <div style={{ fontFamily: GF(), fontSize: 22, fontWeight: 900, color: lbHdrTitle, textTransform: 'uppercase', letterSpacing: '.1em' }}>Leaderboard</div>
              <div style={{ fontFamily: GF(), fontSize: 14, color: lbHdrSub, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {selObj.dt} · {selObj.blLabel}{selObj.meta ? ' · ' + selObj.meta : ''}{scaleFilter !== 'Todos' ? ' · ' + scaleFilter : ''}
              </div>
            </div>
            <div style={{ padding: '8px 0' }}>
              {ranked.length === 0
                ? <div style={{ padding: '20px 28px', color: '#333', fontFamily: GF(), fontSize: 13 }}>Nenhum resultado.</div>
                : ranked.map((r, ri) => {
                    const ath = athletes.find(a => String(a.id) === String(r.athleteId));
                    const perf = getPerformanceStr(r, selObj.blType);
                    const isPodium = ri < 3;
                    const pColor = isPodium ? podColors[ri] : null;
                    return (
                      <div key={r.id || ri} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 28px', borderBottom: `1px solid ${lbDivider}`, background: isPodium ? podBgs[ri] : ri % 2 === 0 ? lbRowAlt : lbBg }}>
                        <div style={{ fontFamily: GF(), fontSize: 18, fontWeight: 900, color: pColor || lbRank, width: 32, flexShrink: 0, textAlign: 'center' }}>{isPodium ? podLabels[ri] : `${ri + 1}º`}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: ath?.color || '#555', flexShrink: 0 }} />
                          <span style={{ fontFamily: GF(), fontSize: 16, fontWeight: 700, color: lbName, textTransform: 'uppercase', letterSpacing: '.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ath?.name || '—'}</span>
                        </div>
                        {r.scale && r.scale !== '-' && <span style={{ fontFamily: GF(), fontSize: 11, fontWeight: 700, color: lbScaleText, background: lbScaleBg, border: `1px solid ${lbScaleBorder}`, borderRadius: 3, padding: '2px 8px', flexShrink: 0 }}>{r.scale}</span>}
                        <div style={{ fontFamily: GF(), fontSize: 16, fontWeight: 900, color: pColor || lbPerf, flexShrink: 0, textAlign: 'right' }}>{perf}</div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
          <button type="button" className="b bsec" style={{ marginTop: 10, width: '100%' }} onClick={doExport} disabled={ranked.length === 0}>
            <i className="ti ti-download" /> Gerar imagem do leaderboard
          </button>
        </div>
      ) : (
        <div className="empty-state">Selecione um WOD para ver o ranking.</div>
      )}
    </div>
  );
}

// ── ResultsTab (root) ─────────────────────────────────────────────────────────
export default function ResultadosTab({ sessions, preload, onPreloadConsumed }) {
  const [subView, setSubView] = useState('log');
  const [athletes, setAthletes] = useState(loadAthletes);

  return (
    <div>
      <div className="res-tabs">
        {[['log', 'ti-pencil', 'Registrar'], ['history', 'ti-chart-bar', 'Histórico / KPIs'], ['leaderboard', 'ti-trophy', 'Leaderboard'], ['roster', 'ti-users', 'Atletas']].map(([id, icon, lbl]) => (
          <button key={id} type="button" className={`res-tab ${subView === id ? 'on' : ''}`} onClick={() => setSubView(id)}>
            <i className={`ti ${icon}`} /> {lbl}
          </button>
        ))}
      </div>
      {subView === 'log'         && <LogView athletes={athletes} sessions={sessions} preload={preload} onPreloadConsumed={onPreloadConsumed} />}
      {subView === 'roster'      && <RosterView athletes={athletes} setAthletes={setAthletes} />}
      {subView === 'history'     && <HistoryView athletes={athletes} sessions={sessions} />}
      {subView === 'leaderboard' && <LeaderboardView athletes={athletes} sessions={sessions} />}
    </div>
  );
}
