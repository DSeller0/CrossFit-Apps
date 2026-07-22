import { useState, useEffect, useMemo } from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { loadRegistry } from '../../../utils/storage';
import IntensityInput from '../../shared/IntensityInput';
import { ExerciseCombobox } from './ExerciseCombobox';
import { emptyMovement, isCardioRegistered, getRegistryDefaults, loadBadgeStr } from './blockModel.js';
import Button from '../../ui/Button.jsx';
import cr from './criador.module.css';

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

  // Keyboard equivalent of the drag handle (#14). `onUpdate(null, from, to)` is the
  // reorder channel the drop handler already uses.
  const moveByKey = e => {
    const to = e.key === 'ArrowUp' ? myIdx - 1 : e.key === 'ArrowDown' ? myIdx + 1 : null;
    if (to === null || to < 0) return;
    e.preventDefault();
    onUpdate(null, myIdx, to);
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
            /* Reps THEN name — the order every render surface already uses
               (ExerciseList emits mvReps before mvName), and the order the coach
               reads a complex in: "3 clean + 2 jerk", not "clean × 3". */
            <div key={mv.id} className="ex-movement-row">
              <input
                type="text" inputMode="numeric" className="ex-qty-input"
                value={mv.reps} placeholder="?" title="Reps deste movimento"
                aria-label={`Reps do movimento ${mi + 1}`}
                onChange={e => updMovement(mi, 'reps', e.target.value)}
              />
              <span className="ex-qty-sep" style={{ flexShrink: 0 }}>×</span>
              <ExerciseCombobox
                value={mv.name}
                onChange={v => updMovement(mi, 'name', v)}
                blockLabel={blockType}
                placeholder={`Movimento ${mi + 1}`}
              />
              {movements.length > 1 && (
                <Button size="xs" iconOnly variant="destructive"
                  aria-label={`Remover movimento ${mi + 1}`} onClick={() => delMovement(mi)}>
                  <i className="ti ti-x" />
                </Button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <Button size="sm" onClick={addMovement}>
              <i className="ti ti-plus" /> Movimento
            </Button>
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
          role="button" tabIndex={0}
          aria-label={`Mover exercício ${myIdx + 1} — setas ↑ ↓`}
          title="Arrastar exercício (ou ↑ ↓ pelo teclado)"
          onKeyDown={moveByKey}
          draggable
          onDragStart={e => { e.stopPropagation(); dragIdx.current = myIdx; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(myIdx)); }}
          onDragEnd={() => { dragIdx.current = null; setDragOverIdx(null); }}
        />

        {/* Qty — desktop only; on mobile it moves to the bottom sheet */}
        {!isMobile && (isComplex ? (
          <span className="ex-complex-badge" title="Séries × notação do complexo">
            <input
              type="text" inputMode="numeric" className="ex-qty-input"
              value={ex.sets} placeholder="?" title="Séries" aria-label="Séries"
              onChange={e => upd('sets', e.target.value)}
              style={{ marginRight: 3 }}
            />
            <span className="ex-qty-sep">×</span>
            <span className="ex-complex-notation">{notation || '…'}</span>
          </span>
        ) : (
          <div className="ex-qty">
            <input
              type="text" inputMode="numeric" className="ex-qty-input"
              value={ex.sets} placeholder={regDefaults?.sets || '—'} title="Séries" aria-label="Séries"
              onChange={e => upd('sets', e.target.value)}
            />
            <span className="ex-qty-sep">×</span>
            {isDistMode ? (
              <>
                <input
                  type="text" inputMode="numeric" className="ex-qty-input"
                  value={ex.dist} placeholder={regDefaults?.dist || '100'} title="Distância/Calorias"
                  aria-label="Distância ou calorias"
                  onChange={e => upd('dist', e.target.value)}
                />
                <select className="ex-unit-sel" value={ex.distUnit || 'm'} title="Unidade" aria-label="Unidade"
                  onChange={e => upd('distUnit', e.target.value)}>
                  <option value="m">m</option><option value="cal">cal</option>
                </select>
              </>
            ) : (
              /* Reps takes free text ("15,12,9" in escada mode), so inputMode is
                 numeric but the type stays text — a number input would eat the commas. */
              <input
                type="text" inputMode="numeric" className="ex-qty-input"
                value={ex.reps} placeholder={ladderMode ? '15,12,9' : (regDefaults?.reps || '—')} title="Reps"
                aria-label="Reps"
                onChange={e => upd('reps', e.target.value)}
              />
            )}
            <button type="button" className={`ex-dist-toggle${isDistMode ? ' on' : ''}`} onClick={toggleDistMode}
              aria-label={isDistMode ? 'Usar Séries×Reps' : 'Usar Distância/Calorias'}
              title={isDistMode ? 'Usar Séries×Reps' : 'Usar Distância/Calorias'}>
              <i className={`ti ${isDistMode ? 'ti-repeat' : 'ti-ruler-2'}`} />
            </button>
          </div>
        ))}

        {/* On mobile the name is a TAP TARGET, not a field: the real combobox lives
            in the sheet below Séries/Reps where its dropdown has room. Tapping the
            name and tapping the gear are the same gesture, which is what the coach
            reached for first. */}
        {isMobile ? (
          <button type="button" className={cr.nameTap} onClick={() => setShowDetail(true)}>
            {ex.name?.trim()
              ? ex.name
              : <span className={cr.nameTapPh}>{isComplex ? 'Nome do complexo' : 'Nome do exercício'}</span>}
          </button>
        ) : isComplex ? (
          <input
            className="ex-complex-name"
            placeholder="Nome do complexo (opcional)"
            aria-label="Nome do complexo"
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
          aria-expanded={showDetail}
          aria-label={isComplex ? 'Movimentos e carga' : 'Intensidade e observação'}
          title={isComplex ? 'Movimentos e carga' : 'Intensidade e observação'}
        >
          <i className={`ti ${isComplex ? 'ti-circles-relation' : 'ti-settings'}`} />
        </button>
        {canDelete && (
          <Button size="xs" iconOnly variant="destructive" className="ex-del"
            aria-label={`Remover ${ex.name?.trim() || 'exercício'}`} onClick={onDelete}>
            <i className="ti ti-x" />
          </Button>
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
                        type="text" inputMode="numeric" className="sheet-qty-input"
                        value={ex.sets} placeholder="?" title="Séries" aria-label="Séries"
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
                        type="text" inputMode="numeric" className="sheet-qty-input"
                        value={ex.sets} placeholder={regDefaults?.sets || '—'} title="Séries" aria-label="Séries"
                        onChange={e => upd('sets', e.target.value)}
                      />
                      <span className="sheet-qty-lbl">Séries</span>
                    </div>
                    <span className="ex-qty-sep sheet-qty-sep-lg">×</span>
                    {isDistMode ? (
                      <div className="sheet-qty-field">
                        <input
                          type="text" inputMode="numeric" className="sheet-qty-input" style={{ width: 90 }}
                          value={ex.dist} placeholder={regDefaults?.dist || '100'} title="Distância/Calorias" aria-label="Distância ou calorias"
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
                          type="text" inputMode="numeric" className="sheet-qty-input"
                          value={ex.reps} placeholder={ladderMode ? '15,12,9' : (regDefaults?.reps || '—')} title="Reps" aria-label="Reps"
                          onChange={e => upd('reps', e.target.value)}
                        />
                        <span className="sheet-qty-lbl">Reps</span>
                      </div>
                    )}
                    <button type="button" className={`ex-dist-toggle${isDistMode ? ' on' : ''}`} onClick={toggleDistMode}
                      aria-label={isDistMode ? 'Usar Séries×Reps' : 'Usar Distância/Calorias'}
                      title={isDistMode ? 'Usar Séries×Reps' : 'Usar Distância/Calorias'}>
                      <i className={`ti ${isDistMode ? 'ti-repeat' : 'ti-ruler-2'}`} />
                    </button>
                  </>
                )}
              </div>
              {/* The real name field lives HERE, below Séries/Reps — the row above
                  only has room for a tap target, and the combobox needs somewhere
                  its dropdown can open. */}
              <div className="fg" style={{ marginBottom: 12 }}>
                <span className="lbl">Exercício</span>
                {isComplex ? (
                  <input
                    className="ex-complex-name"
                    placeholder="Nome do complexo (opcional)"
                    aria-label="Nome do complexo"
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
