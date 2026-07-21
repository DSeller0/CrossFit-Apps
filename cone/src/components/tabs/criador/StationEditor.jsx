import { useState } from 'react';
import { maskMMSS } from '../../../public/lib/wod.js';
import { ExerciseRow } from './ExerciseRow';
import { emptyEx, emptyStation } from './blockModel.js';

// ── StationEditor ─────────────────────────────────────────────────────────────
export function StationEditor({ block, onUpdate }) {
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
