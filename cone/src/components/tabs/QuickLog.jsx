import { useState, useEffect } from 'react';
import { loadAthletes, loadResults, saveResults, uid, todayISO } from '../../utils/storage';

const WOD_TYPES = new Set(['WOD', 'For Time', 'AMRAP', 'EMOM', 'MetCon', 'HIIT']);
const SCALES    = ['RX', 'Inter', 'SC', 'Adaptado'];

function makeBlockLog(b) {
  return {
    blockId: b.id, blockType: b.type, blockLabel: b.label || b.type,
    scale: 'RX', perfTime: '', perfRounds: '', perfReps: '', rpe: 7,
    exerciseRows: [], note: '', load: '',
  };
}

function RpeBar({ value, onChange }) {
  return (
    <div className="ql-rpe-row">
      <span className="ql-rpe-lbl">RPE {value}</span>
      <div className="ql-rpe-bar">
        {Array.from({ length: 10 }, (_, i) => {
          const t = i / 9;
          const r = Math.round(t < 0.5 ? 2 * t * 128 + 96 : 224);
          const g = Math.round(t < 0.5 ? 168 : 168 - 2 * (t - 0.5) * 88);
          return (
            <div key={i}
              className={`ql-rpe-seg${i < value ? ' on' : ''}`}
              style={{ background: i < value ? `rgb(${r},${g},64)` : '' }}
              onClick={() => onChange(i + 1)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function QuickLog({ sessions }) {
  const sessionDates = Object.keys(sessions).filter(k => sessions[k]?.length > 0).sort().reverse();
  const defaultDate  = sessionDates.includes(todayISO()) ? todayISO() : (sessionDates[0] || todayISO());

  const [date, setDate]           = useState(defaultDate);
  const [sessIdx, setSessIdx]     = useState(0);
  const [athletes]                = useState(loadAthletes);
  const [results, setResults]     = useState(loadResults);
  const [selId, setSelId]         = useState(null);
  const [blockLogs, setBlockLogs] = useState([]);
  const [flash, setFlash]         = useState(null);

  const daySessions = sessions[date] || [];
  const session     = daySessions[sessIdx] || null;

  useEffect(() => { setSessIdx(0); setSelId(null); setBlockLogs([]); }, [date]);
  useEffect(() => { setSelId(null); setBlockLogs([]); }, [sessIdx]);

  useEffect(() => {
    if (!session || !selId) { setBlockLogs([]); return; }
    const existing  = results.find(r => r.sessionId === session.id && r.athleteId === selId);
    const wodBlocks = (session.blocks || []).filter(b => WOD_TYPES.has(b.type));
    if (existing) {
      setBlockLogs(wodBlocks.map(b => {
        const eb = (existing.blocks || []).find(eb => eb.blockId === b.id) || {};
        return { ...makeBlockLog(b), ...eb };
      }));
    } else {
      setBlockLogs(wodBlocks.map(makeBlockLog));
    }
  }, [selId, session?.id]);

  const loggedIds = new Set(results.filter(r => r.sessionId === session?.id).map(r => r.athleteId));

  const updBlock = (idx, field, val) =>
    setBlockLogs(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n; });

  const submit = () => {
    if (!selId || !session) return;
    const athlete = athletes.find(a => a.id === selId);
    const entry   = {
      id: uid(), date, athleteId: selId, sessionId: session.id,
      presence: 'Presente', energyLevel: 3, blocks: blockLogs,
      coachNote: '', flagForReview: false,
    };
    const updated = [
      ...results.filter(r => !(r.sessionId === session.id && r.athleteId === selId)),
      entry,
    ];
    setResults(updated);
    saveResults(updated);
    setFlash(athlete?.name || 'Atleta');
    setSelId(null);
    setBlockLogs([]);
    setTimeout(() => setFlash(null), 2200);
  };

  return (
    <div className="ql-wrap">

      {/* ── Session bar ── */}
      <div className="ql-sess-bar">
        <div className="ql-sess-left">
          <span className="ql-sess-name">{session?.name || '—'}</span>
          <span className="ql-logged-count">{loggedIds.size} registrado{loggedIds.size !== 1 ? 's' : ''}</span>
        </div>
        <div className="ql-sess-controls">
          {sessionDates.length > 0 && (
            <select className="ql-sel" value={date} onChange={e => setDate(e.target.value)}>
              {sessionDates.map(d => (
                <option key={d} value={d}>
                  {new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                </option>
              ))}
            </select>
          )}
          {daySessions.length > 1 && (
            <select className="ql-sel" value={sessIdx} onChange={e => setSessIdx(+e.target.value)}>
              {daySessions.map((s, i) => (
                <option key={s.id} value={i}>{s.name || `Sessão ${i + 1}`}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Flash ── */}
      {flash && (
        <div className="ql-flash">
          <i className="ti ti-circle-check" aria-hidden="true" /> {flash} registrado
        </div>
      )}

      {!session ? (
        <div className="ql-empty">Nenhuma sessão nesta data.</div>
      ) : (
        <>
          {/* ── Athlete grid ── */}
          <div className="ql-section-label">Atleta</div>
          <div className="ql-athlete-grid">
            {athletes.length === 0 && (
              <div className="ql-empty">Nenhum atleta cadastrado.</div>
            )}
            {athletes.map(a => {
              const logged = loggedIds.has(a.id);
              const sel    = selId === a.id;
              return (
                <button key={a.id} type="button"
                  className={`ql-ath-btn${sel ? ' sel' : ''}${logged && !sel ? ' logged' : ''}`}
                  onClick={() => setSelId(sel ? null : a.id)}
                >
                  <span className="ql-ath-dot" style={{ background: a.color || '#e87820' }} />
                  <span className="ql-ath-name">{a.name}</span>
                  {logged && !sel && <i className="ti ti-check ql-ath-check" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {/* ── Performance form ── */}
          {selId && (
            <div className="ql-perf">
              {blockLogs.length === 0 ? (
                <>
                  <p className="ql-no-wod">Nenhum bloco WOD — registrar apenas presença.</p>
                  <button type="button" className="ql-submit" onClick={submit}>
                    <i className="ti ti-check" aria-hidden="true" /> Registrar presença
                  </button>
                </>
              ) : (
                <>
                  {blockLogs.map((bl, idx) => (
                    <div key={bl.blockId} className="ql-block-card">
                      <div className="ql-block-label">{bl.blockLabel}{bl.blockLabel !== bl.blockType ? ` · ${bl.blockType}` : ''}</div>

                      <div className="ql-scale-row">
                        {SCALES.map(s => (
                          <button key={s} type="button"
                            className={`ql-scale-btn${bl.scale === s ? ' on' : ''}`}
                            onClick={() => updBlock(idx, 'scale', s)}
                          >{s}</button>
                        ))}
                      </div>

                      {bl.blockType === 'For Time' ? (
                        <div className="ql-perf-row">
                          <span className="ql-perf-lbl">Tempo</span>
                          <input className="ql-perf-input" type="text" inputMode="numeric"
                            placeholder="MM:SS" value={bl.perfTime}
                            onChange={e => updBlock(idx, 'perfTime', e.target.value)} />
                        </div>
                      ) : (
                        <div className="ql-perf-row">
                          <span className="ql-perf-lbl">Rounds</span>
                          <input className="ql-perf-input sm" type="number" inputMode="numeric" min="0"
                            placeholder="0" value={bl.perfRounds}
                            onChange={e => updBlock(idx, 'perfRounds', e.target.value)} />
                          <span className="ql-perf-lbl" style={{ marginLeft: 8 }}>Reps</span>
                          <input className="ql-perf-input sm" type="number" inputMode="numeric" min="0"
                            placeholder="0" value={bl.perfReps}
                            onChange={e => updBlock(idx, 'perfReps', e.target.value)} />
                        </div>
                      )}

                      <RpeBar value={bl.rpe} onChange={v => updBlock(idx, 'rpe', v)} />
                    </div>
                  ))}

                  <button type="button" className="ql-submit" onClick={submit}>
                    <i className="ti ti-check" aria-hidden="true" /> Registrar
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
