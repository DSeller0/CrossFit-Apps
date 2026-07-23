import { useState, useRef } from 'react';
import { uid, loadSettings, saveSettings } from '../../../utils/storage';
import { BTC, ZONES } from '../../../utils/config';
import { StationEditor } from './StationEditor';
import { ExerciseRow } from './ExerciseRow';
import { CriadorTypePicker } from './TypePicker';
import { BlockTextEditor } from './BlockTextEditor';
import { GoalInput } from './GoalInput';
import { isTextEditable } from './textFormat.js';
import { emptyEx, getTypeCfg, blockSummary, stationsCapStr, loadBadgeStr } from './blockModel.js';
import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import ConfirmReview, { ReadRow } from '../../../public/shared/ConfirmReview.jsx';
import tm from './textMode.module.css';
import cr from './criador.module.css';

// ── BlockEditor ───────────────────────────────────────────────────────────────
export function BlockEditor({ block, idx, total, blockNames, onUpdate, onDelete, onCopy, collapsed, onToggleCollapse, dragBlkIdx, dragOverBlkIdx, setDragOverBlkIdx, reorderBlocks, blockIdx, changedFields, registry }) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [bmSaveFlash, setBmSaveFlash] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [pendingDelEx, setPendingDelEx] = useState(null);
  const dragExIdx = useRef(null);
  const [dragOverExIdx, setDragOverExIdx] = useState(null);

  const cfg = getTypeCfg(block.type);
  const summary = blockSummary(block);
  const capStr = stationsCapStr(block);
  const customName = block.label && block.label !== block.type ? block.label : '';

  // Keyboard equivalent of the drag handle (#14) — dragging is mouse-only, and a
  // block list you can't reorder without a pointer is a list half the coaches can't
  // reorder at all on a tablet.
  const moveByKey = e => {
    const to = e.key === 'ArrowUp' ? blockIdx - 1 : e.key === 'ArrowDown' ? blockIdx + 1 : null;
    if (to === null || to < 0 || to >= total) return;
    e.preventDefault();
    reorderBlocks?.(blockIdx, to);
  };

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

  // The 4th confirm fork (#54/C0) — this one was a raw window.confirm, the only
  // dialog in the app that couldn't be themed, translated or keyboard-trapped.
  const delEx = id => setPendingDelEx(block.exercises.find(x => x.id === id) || null);
  const confirmDelEx = () => {
    onUpdate({ ...block, exercises: block.exercises.filter(x => x.id !== pendingDelEx.id) });
    setPendingDelEx(null);
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
      style={{ outline: dragOverBlkIdx === blockIdx ? '2px solid var(--theme-accent)' : 'none', outlineOffset: 2, borderRadius: 'var(--radius-md)', transition: 'outline .1s, border-color .15s', borderColor: (collapsed && changedFields?.size) ? 'color-mix(in srgb, var(--accent) 65%, transparent)' : undefined }}
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
          title="Arrastar bloco (ou ↑ ↓ pelo teclado)"
          role="button" tabIndex={0}
          aria-label={`Mover bloco ${idx + 1} de ${total} — setas ↑ ↓`}
          onKeyDown={moveByKey}
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

        {/* Custom name — COLLAPSED only. Expanded, the body's own name input
            (blk-name-input, below) already shows it; showing it twice was the
            print-03 duplicate ("AQUECIMENTO · Mobilidade" in the bar, "Mobilidade"
            again in the field one line down). */}
        {collapsed && customName && <span className="blk-custom-name">{customName}</span>}

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

        <Button size="xs" iconOnly aria-label="Duplicar bloco" title="Duplicar bloco" onClick={onCopy}>
          <i className="ti ti-copy" />
        </Button>
        {total > 1 && (
          <Button size="xs" iconOnly variant="destructive" aria-label="Remover bloco" title="Remover bloco" onClick={onDelete}>
            <i className="ti ti-trash" />
          </Button>
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
                  <Input as="textarea" label="Nota do coach" className={cr.mt2}
                    placeholder="Escala, adaptações, contexto para hoje..."
                    value={block.coachNote||''}
                    onChange={e => onUpdate({...block, coachNote:e.target.value})}
                  />
                  <div className="blk-meta-row" style={{ marginTop:6 }}>
                    <Input className={cr.metaFieldWide} label="Zona" as="select"
                      value={block.zone||'Zona 01'} onChange={e => onUpdate({...block, zone:e.target.value})}>
                      {ZONES.map(z=><option key={z}>{z}</option>)}
                    </Input>
                    {/* A benchmark's movements are locked, but the target for today is
                        the coach's — so the Meta field is live here too. */}
                    <GoalInput block={block} onUpdate={onUpdate} />
                  </div>
                </>
              );
            }

            const fch = (...fields) => fields.some(f => changedFields?.has(f)) ? { borderColor: 'color-mix(in srgb, var(--accent) 65%, transparent)' } : {};
            return (<>
          {/* Drag strip — second grab point when block is expanded */}
          <div className="blk-body-drag"
            role="button" tabIndex={0}
            aria-label={`Mover bloco ${idx + 1} de ${total} — setas ↑ ↓`}
            title="Arrastar bloco (ou ↑ ↓ pelo teclado)"
            onKeyDown={moveByKey}
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

          {/* Adaptive meta fields. The Meta (#10) sits here beside Duração/Rounds and
              renders for EVERY type — a block with no time cap can still have a target. */}
          <div className="blk-meta-row">
            {cfg.showDuration && (
              /* Stays a minutes NUMBER field on purpose: `duration` is stored as bare
                 minutes everywhere (TV, timer, blkMeta, Schedule, Publicador) and
                 toSecs('14') reads 14 as seconds — the mm:ss conversion is a data
                 migration with its own backlog row, not an input swap. */
              <Input className={cr.metaField} label={cfg.durationLabel || 'Duração (min)'}
                type="number" min={1} inputMode="numeric" placeholder="—"
                value={block.duration}
                onChange={e => onUpdate({ ...block, duration: e.target.value })}
                style={fch('duration')} />
            )}
            {cfg.showRounds && (
              <Input className={cr.metaField} label="Rounds"
                type="number" min={1} inputMode="numeric" placeholder="—"
                value={block.rounds}
                onChange={e => onUpdate({ ...block, rounds: e.target.value })}
                style={fch('rounds')} />
            )}
            <GoalInput block={block} onUpdate={onUpdate} />
          </div>

          {/* Exercise list or StationEditor */}
          {cfg.isStations ? (
            <StationEditor block={block} onUpdate={onUpdate} />
          ) : (
            <>
              <div className="blk-ex-list">
                {(block.exercises || []).map((ex, ei) => (
                  <div key={ex.id} style={changedFields?.has(`ex:${ex.id}`) ? { borderRadius: 'var(--radius-md)', outline: '1.5px solid color-mix(in srgb, var(--accent) 50%, transparent)', outlineOffset: 2, marginBottom: 4 } : undefined}>
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
                <Button size="sm" className={cr.grow} onClick={addEx}>
                  <i className="ti ti-plus" /> Exercício
                </Button>
                {block.exercises.length > 0 && (
                  <Button size="sm" className={cr.grow} onClick={copyLastEx}>
                    <i className="ti ti-copy" /> Copiar último
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Notes — always visible */}
          <Input as="textarea" label="Notas do bloco" className={cr.mt2} style={fch('notes')}
            placeholder="Descrição, regras, buy-in..."
            value={block.notes}
            onChange={e => onUpdate({ ...block, notes: e.target.value })}
          />

          <div className="blk-meta-row" style={{ marginTop: 6 }}>
            <Input className={cr.metaFieldWide} label="Zona" as="select"
              value={block.zone || 'Zona 01'} onChange={e => onUpdate({ ...block, zone: e.target.value })}
              style={fch('zone')}>
              {ZONES.map(z => <option key={z}>{z}</option>)}
            </Input>
          </div>

          {block.type !== 'Estações' && (block.exercises||[]).some(e => e.name?.trim()) && (
            <Button variant="ghost" size="sm" full className={cr.mt2} onClick={saveCustomBenchmark}>
              <i className={`ti ${bmSaveFlash?'ti-check':'ti-bookmark-plus'}`} />
              {bmSaveFlash ? 'Salvo!' : 'Salvar como Benchmark'}
            </Button>
          )}
            </>);
          })()}
        </div>
      )}

      {showTypePicker && (
        <CriadorTypePicker blockNames={blockNames} onSelect={changeType} onClose={() => setShowTypePicker(false)} />
      )}

      <ConfirmReview
        open={!!pendingDelEx}
        title="Remover exercício"
        editLabel="Cancelar" confirmLabel="Remover"
        onEdit={() => setPendingDelEx(null)}
        onClose={() => setPendingDelEx(null)}
        onConfirm={confirmDelEx}
      >
        <ReadRow label="Exercício" value={pendingDelEx?.name?.trim() || 'sem nome'} />
        <ReadRow label="Bloco" value={customName || block.type || 'sem tipo'} />
      </ConfirmReview>
    </div>
  );
}
