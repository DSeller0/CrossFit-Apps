import { useState, useRef } from 'react';
import { uid, loadSettings, saveSettings } from '../../../utils/storage';
import { BTC, ZONES } from '../../../utils/config';
import { StationEditor } from './StationEditor';
import { ExerciseRow } from './ExerciseRow';
import { CriadorTypePicker } from './TypePicker';
import { BlockTextEditor } from './BlockTextEditor';
import { isTextEditable } from './textFormat.js';
import { emptyEx, getTypeCfg, blockSummary, stationsCapStr, loadBadgeStr } from './blockModel.js';
import tm from './textMode.module.css';

// ── BlockEditor ───────────────────────────────────────────────────────────────
export function BlockEditor({ block, idx, total, blockNames, onUpdate, onDelete, onCopy, collapsed, onToggleCollapse, dragBlkIdx, dragOverBlkIdx, setDragOverBlkIdx, reorderBlocks, blockIdx, changedFields, registry }) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [bmSaveFlash, setBmSaveFlash] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const dragExIdx = useRef(null);
  const [dragOverExIdx, setDragOverExIdx] = useState(null);

  const cfg = getTypeCfg(block.type);
  const summary = blockSummary(block);
  const capStr = stationsCapStr(block);
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

  const delEx = id => {
    if (!window.confirm('Remover este exercício?')) return;
    onUpdate({ ...block, exercises: block.exercises.filter(x => x.id !== id) });
  };

  const changeType = newTypeOrBlock => {
    if (typeof newTypeOrBlock === 'string') {
      onUpdate({ ...block, type: newTypeOrBlock, label: customName || newTypeOrBlock });
    } else {
      onUpdate({ ...newTypeOrBlock, id: block.id });
    }
    setShowTypePicker(false);
  };

  const saveCustomBenchmark = () => {
    const name = (block.label && block.label !== block.type) ? block.label : null;
    if (!name) { window.alert('Dê um nome personalizado ao bloco antes de salvar como benchmark.'); return; }
    const bm = {
      name,
      type: block.type,
      desc: block.notes || (block.exercises||[]).filter(e=>e.name).map(e=>e.name).join(' + '),
      duration: block.duration || '',
      rounds: block.rounds || '',
      exercises: (block.exercises||[]).map(e => ({ name:e.name, sets:e.sets, reps:e.reps, dist:e.dist, distUnit:e.distUnit, intensity:e.intensity })),
      benchmarkCategory: 'custom',
    };
    const settings = loadSettings();
    const customs = settings.customBenchmarks || [];
    saveSettings({ ...settings, customBenchmarks: [...customs.filter(c=>c.name!==bm.name), bm] });
    setBmSaveFlash(true);
    setTimeout(() => setBmSaveFlash(false), 2500);
  };

  return (
    <div
      className={`blk-wrap ${BTC[block.type] || 'bt-st'}`}
      style={{ outline: dragOverBlkIdx === blockIdx ? '2px solid var(--theme-accent)' : 'none', outlineOffset: 2, borderRadius: 8, transition: 'outline .1s, border-color .15s', borderColor: (collapsed && changedFields?.size) ? 'rgba(74,200,192,0.65)' : undefined }}
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

        {/* Summary (collapsed all types; expanded Estações: cap time only) */}
        {collapsed && summary && <span className="blk-summary">{summary}</span>}
        {!collapsed && capStr && <span className="blk-summary">{capStr}</span>}

        {/* Exercise name+load chips — collapsed non-Estações blocks only */}
        {collapsed && block.type !== 'Estações' && (block.exercises || []).filter(e => e.name?.trim()).slice(0, 3).map((ex, i) => {
          const badge = loadBadgeStr(ex);
          return (
            <span key={i} className="blk-ex-chip">
              <span className="blk-ex-chip-name">{ex.name}</span>
              {badge && <span className="ex-load-badge">{badge}</span>}
            </span>
          );
        })}

        <div className="blk-spacer" />

        {/* Detalhado / Texto for this block alone (#92). Estações carries groups
            and a Benchmark is read-only, so neither has a text form — the toggle
            is DISABLED rather than hidden, so its absence is explainable. */}
        {!collapsed && (
          <span className={tm.modeSeg} role="group" aria-label="Modo de edição do bloco">
            <button type="button" className={!textMode ? tm.on : ''} aria-pressed={!textMode}
              onClick={() => setTextMode(false)} title="Editar em campos">▤</button>
            <button type="button" className={textMode ? tm.on : ''} aria-pressed={textMode}
              disabled={!isTextEditable(block)} onClick={() => setTextMode(true)}
              title={isTextEditable(block) ? 'Editar como texto' : 'Este tipo de bloco não tem forma textual'}>¶</button>
          </span>
        )}

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
          {(() => {
            // ── Text mode ──────────────────────────────────────────────────
            if (textMode && isTextEditable(block)) {
              return <BlockTextEditor key={block.id} block={block} onApply={onUpdate} registry={registry} />;
            }

            // ── Locked benchmark view ──────────────────────────────────────
            if (block.benchmarkRef) {
              return (
                <>
                  <div className="bm-locked-badge">
                    <i className="ti ti-lock" /> Benchmark oficial · somente leitura
                  </div>
                  {block.notes && <div className="bm-locked-desc">{block.notes}</div>}
                  <div className="blk-ex-list" style={{ margin:'8px 0' }}>
                    {(block.exercises||[]).map((ex,i) => {
                      const badge = loadBadgeStr(ex);
                      const vol = ex.sets&&ex.reps ? `${ex.sets}×${ex.reps}` : (ex.reps||ex.sets||'');
                      return (
                        <div key={ex.id} className="bm-locked-row">
                          <span className="bm-locked-row-num">{i+1}</span>
                          <span className="bm-locked-row-name">{vol ? `${vol} ${ex.name}` : ex.name}</span>
                          {badge && <span className="ex-load-badge">{badge}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="fg" style={{ marginTop:4 }}>
                    <span className="lbl">Nota do coach</span>
                    <textarea
                      className="blk-notes-quick"
                      placeholder="Escala, adaptações, contexto para hoje..."
                      value={block.coachNote||''}
                      onChange={e => onUpdate({...block, coachNote:e.target.value})}
                    />
                  </div>
                  <div className="blk-meta-row" style={{ marginTop:6 }}>
                    <label className="blk-meta-field">
                      <span>Zona</span>
                      <select value={block.zone||'Zona 01'} onChange={e => onUpdate({...block, zone:e.target.value})}
                        style={{background:'#111',border:'1px solid #2e2e2e',borderRadius:5,color:'#ccc',padding:'8px 10px',fontFamily:'inherit',fontSize:13,outline:'none'}}>
                        {ZONES.map(z=><option key={z}>{z}</option>)}
                      </select>
                    </label>
                  </div>
                </>
              );
            }

            const fch = (...fields) => fields.some(f => changedFields?.has(f)) ? { borderColor: 'rgba(74,200,192,0.65)' } : {};
            return (<>
          {/* Drag strip — second grab point when block is expanded */}
          <div className="blk-body-drag"
            draggable
            onDragStart={e => { if (dragBlkIdx) dragBlkIdx.current = blockIdx; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(blockIdx)); }}
            onDragEnd={() => { if (dragBlkIdx) dragBlkIdx.current = null; setDragOverBlkIdx?.(null); }}
          >
            <i className="ti ti-grip-horizontal" />
          </div>

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
              style={fch('label')}
            />
          </div>

          {/* Adaptive meta fields */}
          {(cfg.showDuration || cfg.showRounds) && (
            <div className="blk-meta-row">
              {cfg.showDuration && (
                <label className="blk-meta-field">
                  <span>{cfg.durationLabel || 'Duração (min)'}</span>
                  <input type="number" min={1} placeholder="—" value={block.duration}
                    onChange={e => onUpdate({ ...block, duration: e.target.value })}
                    style={fch('duration')} />
                </label>
              )}
              {cfg.showRounds && (
                <label className="blk-meta-field">
                  <span>Rounds</span>
                  <input type="number" min={1} placeholder="—" value={block.rounds}
                    onChange={e => onUpdate({ ...block, rounds: e.target.value })}
                    style={fch('rounds')} />
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
                  <div key={ex.id} style={changedFields?.has(`ex:${ex.id}`) ? { borderRadius: 6, outline: '1.5px solid rgba(74,200,192,0.5)', outlineOffset: 2, marginBottom: 4 } : undefined}>
                  <ExerciseRow
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
                  </div>
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
              style={fch('notes')}
            />
          </div>

          <div className="blk-meta-row" style={{ marginTop: 6 }}>
            <label className="blk-meta-field">
              <span>Zona</span>
              <select value={block.zone || 'Zona 01'} onChange={e => onUpdate({ ...block, zone: e.target.value })}
                style={{ background: '#111', border: '1px solid #2e2e2e', borderRadius: 5, color: '#ccc', padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, outline: 'none', ...fch('zone') }}>
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </label>
          </div>

          {block.type !== 'Estações' && (block.exercises||[]).some(e => e.name?.trim()) && (
            <button type="button" className={`b bsm bm-save-btn${bmSaveFlash?' bm-save-flash':''}`}
              onClick={saveCustomBenchmark}>
              <i className={`ti ${bmSaveFlash?'ti-check':'ti-bookmark-plus'}`} />
              {bmSaveFlash ? 'Salvo!' : 'Salvar como Benchmark'}
            </button>
          )}
            </>);
          })()}
        </div>
      )}

      {showTypePicker && (
        <CriadorTypePicker blockNames={blockNames} onSelect={changeType} onClose={() => setShowTypePicker(false)} />
      )}
    </div>
  );
}
