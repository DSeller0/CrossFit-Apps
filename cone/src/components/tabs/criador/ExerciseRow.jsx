import { useState, useEffect, useMemo } from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { loadRegistry } from '../../../utils/storage';
import IntensityInput from '../../shared/IntensityInput';
import { ExerciseCombobox } from './ExerciseCombobox';
import { emptyMovement, isCardioRegistered, getRegistryDefaults, loadBadgeStr } from './blockModel.js';

// ── ExerciseRow ───────────────────────────────────────────────────────────────
export function ExerciseRow({ ex, blockLabel, blockType, ladderMode, onToggleLadder, onUpdate, onDelete, canDelete, dragIdx, setDragIdx, dragOverIdx, setDragOverIdx, myIdx }) {
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

  const registryCardio = useMemo(() => isCardioRegistered(ex.name, loadRegistry()), [ex.name]);
  const regDefaults = useMemo(() => getRegistryDefaults(ex.name, loadRegistry()), [ex.name]);
  const [distOverride, setDistOverride] = useState(() => ex.dist ? true : (ex.reps ? false : undefined));
  const isDistMode = distOverride ?? registryCardio;
  const toggleDistMode = () => {
    if (isDistMode) { setDistOverride(false); onUpdate({ ...ex, dist: '', distUnit: 'm' }); }
    else setDistOverride(true);
  };

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
                blockLabel={blockType}
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
          ghostDefault={!isComplex ? regDefaults?.intensity : null}
          ghostDismissed={!!ex.intensityDefaultDismissed}
          onDismissGhost={() => upd('intensityDefaultDismissed', true)}
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
              value={ex.sets} placeholder={regDefaults?.sets || '—'} title="Séries"
              onChange={e => upd('sets', e.target.value)}
            />
            <span className="ex-qty-sep">×</span>
            {isDistMode ? (
              <>
                <input
                  type="text" className="ex-qty-input"
                  value={ex.dist} placeholder={regDefaults?.dist || '100'} title="Distância/Calorias"
                  onChange={e => upd('dist', e.target.value)}
                />
                <select className="ex-unit-sel" value={ex.distUnit || 'm'} title="Unidade"
                  onChange={e => upd('distUnit', e.target.value)}>
                  <option value="m">m</option><option value="cal">cal</option>
                </select>
              </>
            ) : (
              <input
                type="text" className="ex-qty-input"
                value={ex.reps} placeholder={ladderMode ? '15,12,9' : (regDefaults?.reps || '—')} title="Reps"
                onChange={e => upd('reps', e.target.value)}
              />
            )}
            <button type="button" className={`ex-dist-toggle${isDistMode ? ' on' : ''}`} onClick={toggleDistMode}
              title={isDistMode ? 'Usar Séries×Reps' : 'Usar Distância/Calorias'}>
              <i className={`ti ${isDistMode ? 'ti-repeat' : 'ti-ruler-2'}`} />
            </button>
          </div>
        ))}

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
            blockLabel={blockType}
            placeholder="Nome do exercício"
          />
        )}

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
                        value={ex.sets} placeholder={regDefaults?.sets || '—'} title="Séries"
                        onChange={e => upd('sets', e.target.value)}
                      />
                      <span className="sheet-qty-lbl">Séries</span>
                    </div>
                    <span className="ex-qty-sep sheet-qty-sep-lg">×</span>
                    {isDistMode ? (
                      <div className="sheet-qty-field">
                        <input
                          type="text" className="sheet-qty-input" style={{ width: 90 }}
                          value={ex.dist} placeholder={regDefaults?.dist || '100'} title="Distância/Calorias"
                          onChange={e => upd('dist', e.target.value)}
                        />
                        <select className="ex-unit-sel" value={ex.distUnit || 'm'} title="Unidade"
                          onChange={e => upd('distUnit', e.target.value)}>
                          <option value="m">m</option><option value="cal">cal</option>
                        </select>
                        <span className="sheet-qty-lbl">Distância</span>
                      </div>
                    ) : (
                      <div className="sheet-qty-field">
                        <input
                          type="text" className="sheet-qty-input"
                          value={ex.reps} placeholder={ladderMode ? '15,12,9' : (regDefaults?.reps || '—')} title="Reps"
                          onChange={e => upd('reps', e.target.value)}
                        />
                        <span className="sheet-qty-lbl">Reps</span>
                      </div>
                    )}
                    <button type="button" className={`ex-dist-toggle${isDistMode ? ' on' : ''}`} onClick={toggleDistMode}
                      title={isDistMode ? 'Usar Séries×Reps' : 'Usar Distância/Calorias'}>
                      <i className={`ti ${isDistMode ? 'ti-repeat' : 'ti-ruler-2'}`} />
                    </button>
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
