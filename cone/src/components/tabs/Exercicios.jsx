import { useState, useMemo } from 'react';
import { loadRegistry, saveRegistry, loadSettings } from '../../utils/storage';
import { APP_CONFIG, ECOL } from '../../utils/config';
import { useIsMobile } from '../../hooks/useIsMobile';

function initRegistry() {
  const existing = loadRegistry();
  if (existing) return existing;
  const reg = {};
  (APP_CONFIG.blockNames || []).filter(n => n && n !== '-').forEach(n => { reg[n] = []; });
  saveRegistry(reg);
  return reg;
}

export default function ExerciciosTab() {
  const [registry, setRegistryState]         = useState(() => initRegistry());
  const [selBlock, setSelBlock]               = useState(null);
  const [newBlockName, setNewBlockName]       = useState('');
  const [newBlockColor, setNewBlockColor]     = useState('#888888');
  const [newExName, setNewExName]             = useState('');
  const [editingBlock, setEditingBlock]       = useState(null);
  const [editingEx, setEditingEx]             = useState(null);
  const [dragBlockIdx, setDragBlockIdx]       = useState(null);
  const [dragOverBlockIdx, setDragOverBlockIdx] = useState(null);
  const [dragExIdx, setDragExIdx]             = useState(null);
  const [dragOverExIdx, setDragOverExIdx]     = useState(null);
  const [blockColors_, setBlockColors_]       = useState(() => ({ ...APP_CONFIG.blockColors }));
  const [expandedBlock, setExpandedBlock]     = useState(null);
  const [showTodos, setShowTodos]             = useState(false);
  const isMobile = useIsMobile();

  const tagColor = tag => blockColors_[tag] || ECOL[tag]?.text || '#555';

  const persist = (reg, cols) => {
    saveRegistry(reg);
    APP_CONFIG.blockNames = ['-', ...Object.keys(reg)];
    if (cols) APP_CONFIG.blockColors = { ...APP_CONFIG.blockColors, ...cols };
  };

  // ── Block type operations ─────────────────────────────────────────────────
  const addBlock = () => {
    const name = newBlockName.trim();
    if (!name || registry[name]) return;
    const reg = { ...registry, [name]: [] };
    const cols = { ...blockColors_, [name]: newBlockColor };
    setRegistryState(reg); setBlockColors_(cols); persist(reg, cols);
    setNewBlockName(''); setSelBlock(name);
  };

  const renameBlock = (oldName, newName, newColor) => {
    newName = newName.trim();
    if (!newName) return;
    const finalColor = newColor || (blockColors_[oldName] || '#888888');
    const reg = {};
    Object.entries(registry).forEach(([k, v]) => { reg[k === oldName ? newName : k] = v; });
    const cols = { ...blockColors_, [newName]: finalColor };
    if (oldName !== newName) delete cols[oldName];
    setRegistryState(reg); setBlockColors_(cols); persist(reg, cols);
    if (selBlock === oldName) setSelBlock(newName);
    setEditingBlock(null);
  };

  const deleteBlock = name => {
    if (!window.confirm(`Remover tipo "${name}"? Blocos existentes nas sessões não são afetados.`)) return;
    const reg = { ...registry }; delete reg[name];
    const cols = { ...blockColors_ }; delete cols[name];
    setRegistryState(reg); setBlockColors_(cols); persist(reg, cols);
    if (selBlock === name) setSelBlock(null);
  };

  const sortBlocksAZ = () => {
    const sorted = {};
    Object.keys(registry).sort((a, b) => a.localeCompare(b, 'pt')).forEach(k => { sorted[k] = registry[k]; });
    setRegistryState(sorted); persist(sorted, null);
  };

  // ── Exercise operations ───────────────────────────────────────────────────
  const addEx = () => {
    const name = newExName.trim();
    if (!name || !selBlock) return;
    const exs = registry[selBlock] || [];
    if (exs.includes(name)) return;
    const reg = { ...registry, [selBlock]: [...exs, name] };
    setRegistryState(reg); persist(reg, null); setNewExName('');
  };

  const renameEx = (blockName, idx, newName) => {
    newName = newName.trim();
    if (!newName) return;
    const exs = [...registry[blockName]]; exs[idx] = newName;
    const reg = { ...registry, [blockName]: exs };
    setRegistryState(reg); persist(reg, null); setEditingEx(null);
  };

  const deleteEx = (blockName, idx) => {
    const exs = registry[blockName].filter((_, i) => i !== idx);
    const reg = { ...registry, [blockName]: exs };
    setRegistryState(reg); persist(reg, null);
  };

  const sortExsAZ = () => {
    if (!selBlock) return;
    const exs = [...registry[selBlock]].sort((a, b) => a.localeCompare(b, 'pt'));
    const reg = { ...registry, [selBlock]: exs };
    setRegistryState(reg); persist(reg, null);
  };

  // ── Drag-and-drop reorder ─────────────────────────────────────────────────
  const reorderBlocks = (from, to) => {
    if (from == null || from === to) return;
    const keys = Object.keys(registry);
    const moved = keys.splice(from, 1)[0]; keys.splice(to, 0, moved);
    const reg = {}; keys.forEach(k => { reg[k] = registry[k]; });
    setRegistryState(reg); persist(reg, null);
  };

  const reorderExs = (from, to) => {
    if (!selBlock || from == null || from === to) return;
    const exs = [...registry[selBlock]];
    const moved = exs.splice(from, 1)[0]; exs.splice(to, 0, moved);
    const reg = { ...registry, [selBlock]: exs };
    setRegistryState(reg); persist(reg, null);
  };

  // ── Todos view — aggregated exercise list with block tags ─────────────────
  const allTaggedExs = useMemo(() => {
    const exToBlocks = {};
    Object.entries(registry).forEach(([blockName, exs]) => {
      exs.forEach(ex => {
        if (!exToBlocks[ex]) exToBlocks[ex] = [];
        exToBlocks[ex].push(blockName);
      });
    });
    return Object.entries(exToBlocks)
      .map(([name, tags]) => ({ name, tags }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }, [registry]);

  const deleteFromAll = name => {
    const blocks = Object.keys(registry).filter(k => registry[k].includes(name));
    if (!window.confirm(`Remover "${name}" de ${blocks.length} tipo${blocks.length > 1 ? 's' : ''} de bloco?`)) return;
    const reg = {};
    Object.entries(registry).forEach(([k, v]) => { reg[k] = v.filter(e => e !== name); });
    setRegistryState(reg); persist(reg, null);
  };

  // ── Export config.json ────────────────────────────────────────────────────
  const saveConfig = () => {
    const savedSettings = loadSettings();
    const exportCfg = {
      appTitle: APP_CONFIG.appTitle,
      appDescription: APP_CONFIG.appDescription || '',
      scheduleTitle: APP_CONFIG.scheduleTitle || APP_CONFIG.appTitle,
      leaderboardTitle: APP_CONFIG.leaderboardTitle || APP_CONFIG.appTitle,
      logo: APP_CONFIG.logo || 'icon-192.png',
      fontFamily: APP_CONFIG.fontFamily || "'Arial Black',Arial,sans-serif",
      googleFontsUrl: APP_CONFIG.googleFontsUrl || '',
      themeAccent: APP_CONFIG.themeAccent,
      themeAccentText: APP_CONFIG.themeAccentText,
      gymName: APP_CONFIG.gymName,
      fontScale: savedSettings.fontScale || 1.5,
      logoScale: APP_CONFIG.logoScale || 1,
      zoneScales: APP_CONFIG.zoneScales || [1, 1, 1],
      blockTitleScales: APP_CONFIG.blockTitleScales || [1, 1, 1],
      mobileEaglesBg: APP_CONFIG.mobileEaglesBg,
      mobileMegaManBg: APP_CONFIG.mobileMegaManBg,
      mobileExerciseNoteColor: APP_CONFIG.mobileExerciseNoteColor,
      restDayLabel: APP_CONFIG.restDayLabel,
      mobileWeeklyLabels: APP_CONFIG.mobileWeeklyLabels,
      exportScale: savedSettings.exportScale || 2,
      blockColors: blockColors_,
      blockNames: ['-', ...Object.keys(registry)],
      athleteLevels: APP_CONFIG.athleteLevels,
      athleteGoals: APP_CONFIG.athleteGoals,
      exerciseRegistry: registry,
      ...savedSettings,
    };
    const raw = window.prompt('Nome do arquivo (sem extensão):', 'config');
    if (raw === null) return;
    const fname = (raw.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'config');
    const blob = new Blob([JSON.stringify(exportCfg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.download = fname + '.json';
    a.href = URL.createObjectURL(blob); a.click(); URL.revokeObjectURL(a.href);
  };

  const blockKeys = Object.keys(registry);
  const exs = selBlock ? (registry[selBlock] || []) : [];
  const blockCol = selBlock ? (blockColors_[selBlock] || APP_CONFIG.themeAccent || '#00b8d4') : '#888';
  const totalExs = Object.values(registry).reduce((a, v) => a + v.length, 0);

  // ── Exercise row (shared mobile + desktop) ────────────────────────────────
  const renderExRow = (blockName, ex, ei) => (
    <div key={ei}
      draggable
      onDragStart={() => setDragExIdx(ei)}
      onDragEnd={() => { setDragExIdx(null); setDragOverExIdx(null); }}
      onDragOver={e => { e.preventDefault(); setDragOverExIdx(ei); }}
      onDrop={e => { e.preventDefault(); reorderExs(dragExIdx, ei); setDragOverExIdx(null); }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#0d0d0d', border: `1px solid ${dragOverExIdx === ei ? 'var(--theme-accent)' : '#1e1e1e'}`, borderRadius: 5, transition: 'all .1s' }}
    >
      <i className="ti ti-grip-vertical" style={{ color: '#2a2a2a', fontSize: 13, flexShrink: 0, cursor: 'grab' }} />
      {editingEx?.blockName === blockName && editingEx?.idx === ei
        ? <input autoFocus className="ex-input" value={editingEx.newName} style={{ flex: 1 }}
            onChange={e => setEditingEx(p => ({ ...p, newName: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') renameEx(blockName, ei, editingEx.newName); if (e.key === 'Escape') setEditingEx(null); }} />
        : <span style={{ flex: 1, fontSize: 13, color: '#ddd' }}>{ex}</span>
      }
      {editingEx?.blockName === blockName && editingEx?.idx === ei
        ? <button type="button" className="b bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11 }} onClick={() => renameEx(blockName, ei, editingEx.newName)}>
            <i className="ti ti-check" />
          </button>
        : <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11, opacity: .6 }} onClick={() => setEditingEx({ blockName, idx: ei, newName: ex })} title="Renomear">
            <i className="ti ti-pencil" />
          </button>
      }
      {(editingEx?.blockName !== blockName || editingEx?.idx !== ei) &&
        <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11, opacity: .5 }} onClick={() => deleteEx(blockName, ei)} title="Remover">
          <i className="ti ti-trash" />
        </button>
      }
    </div>
  );

  // ── Mobile block accordion row ────────────────────────────────────────────
  const renderMobileBlockRow = (name, bi) => {
    const isExp = expandedBlock === name;
    const col = blockColors_[name] || '#555';
    const blockExs = registry[name] || [];
    const canDrag = expandedBlock === null;
    return (
      <div key={name}
        draggable={canDrag}
        onDragStart={canDrag ? () => setDragBlockIdx(bi) : undefined}
        onDragEnd={canDrag ? () => { setDragBlockIdx(null); setDragOverBlockIdx(null); } : undefined}
        onDragOver={canDrag ? e => { e.preventDefault(); setDragOverBlockIdx(bi); } : undefined}
        onDrop={canDrag ? e => { e.preventDefault(); reorderBlocks(dragBlockIdx, bi); setDragOverBlockIdx(null); } : undefined}
        style={{ marginBottom: 4, borderRadius: 7, overflow: 'hidden', border: `1px solid ${dragOverBlockIdx === bi ? 'var(--theme-accent)' : isExp ? col + '55' : '#1e1e1e'}`, borderLeft: `3px solid ${col}` }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: isExp ? '#161616' : '#111', cursor: 'pointer' }}
          onClick={() => { setExpandedBlock(isExp ? null : name); setSelBlock(name); setEditingBlock(null); }}
        >
          <i className="ti ti-grip-vertical" style={{ color: canDrag ? '#333' : '#1e1e1e', fontSize: 14, flexShrink: 0, cursor: canDrag ? 'grab' : 'default' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: col, flexShrink: 0 }} />
          {editingBlock?.name === name ? (
            <>
              <div
                style={{ width: 20, height: 20, borderRadius: 3, background: editingBlock.newColor || '#888', border: '1px solid #444', cursor: 'pointer', flexShrink: 0 }}
                onClick={e => { e.stopPropagation(); document.getElementById('mob-edit-block-color-' + name)?.click(); }}
              />
              <input type="color" id={'mob-edit-block-color-' + name}
                value={/^#[0-9a-fA-F]{6}$/.test(editingBlock.newColor || '') ? editingBlock.newColor : '#888888'}
                style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                onChange={e => setEditingBlock(p => ({ ...p, newColor: e.target.value }))} />
              <input autoFocus className="ex-input" value={editingBlock.newName} style={{ flex: 1 }}
                onChange={e => setEditingBlock(p => ({ ...p, newName: e.target.value }))}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); renameBlock(name, editingBlock.newName, editingBlock.newColor); } if (e.key === 'Escape') setEditingBlock(null); }} />
            </>
          ) : (
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: isExp ? '#fff' : '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          )}
          <span style={{ fontSize: 10, color: '#444', marginRight: 4 }}>{blockExs.length}</span>
          {editingBlock?.name === name
            ? <button type="button" className="b bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11 }}
                onClick={e => { e.stopPropagation(); renameBlock(name, editingBlock.newName, editingBlock.newColor); }}>
                <i className="ti ti-check" />
              </button>
            : <button type="button" className="b bd bsm" style={{ padding: '2px 5px', minHeight: 20, fontSize: 11, opacity: .6 }}
                onClick={e => { e.stopPropagation(); setEditingBlock({ name, newName: name, newColor: blockColors_[name] || '#888888' }); }} title="Renomear">
                <i className="ti ti-pencil" />
              </button>
          }
          {editingBlock?.name !== name &&
            <button type="button" className="b bd bsm" style={{ padding: '2px 5px', minHeight: 20, fontSize: 11, opacity: .5 }}
              onClick={e => { e.stopPropagation(); deleteBlock(name); }} title="Remover">
              <i className="ti ti-trash" />
            </button>
          }
          <i className={`ti ti-chevron-${isExp ? 'down' : 'right'}`} style={{ color: '#444', fontSize: 13, flexShrink: 0 }} />
        </div>
        {isExp && (
          <div style={{ padding: 8, background: '#0d0d0d', borderTop: '1px solid #1e1e1e' }}>
            {blockExs.length === 0
              ? <div style={{ padding: 12, textAlign: 'center', color: '#333', fontSize: 12 }}>Nenhum exercício. Adicione abaixo.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
                  {blockExs.map((ex, ei) => renderExRow(name, ex, ei))}
                </div>
            }
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderTop: '1px solid #1e1e1e', paddingTop: 8 }}>
              <input className="ex-input" placeholder="Adicionar exercício..." value={selBlock === name ? newExName : ''} style={{ flex: 1 }}
                onChange={e => setNewExName(e.target.value)}
                onFocus={() => setSelBlock(name)}
                onKeyDown={e => { if (e.key === 'Enter') { setSelBlock(name); addEx(); } }} />
              <button type="button" className="b bsec" style={{ padding: '5px 8px', flexShrink: 0 }}
                onClick={() => { setSelBlock(name); setTimeout(addEx, 0); }} disabled={!newExName.trim()}>
                <i className="ti ti-plus" />
              </button>
              <button type="button" className="b bsm" style={{ padding: '5px 7px', flexShrink: 0 }}
                onClick={() => { setSelBlock(name); setTimeout(sortExsAZ, 0); }} title="A→Z">
                <i className="ti ti-sort-ascending-letters" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Footer (shared) ───────────────────────────────────────────────────────
  const Footer = () => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0a0a0a', borderTop: '1px solid #1e1e1e', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 50 }}>
      <span style={{ fontSize: 11, color: '#555', flex: 1 }}>{blockKeys.length} tipos · {totalExs} exercícios registrados</span>
      <button type="button" className="b bsec" onClick={saveConfig}>
        <i className="ti ti-download" /> Salvar config.json
      </button>
    </div>
  );

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) return (
    <div style={{ padding: 10, paddingBottom: 70 }}>
      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button type="button" onClick={() => setShowTodos(false)}
          style={{ flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700, borderRadius: 6, border: '1px solid #2a2a2a', background: !showTodos ? '#1e1e1e' : '#0d0d0d', color: !showTodos ? '#fff' : '#555', cursor: 'pointer' }}>
          Tipos
        </button>
        <button type="button" onClick={() => setShowTodos(true)}
          style={{ flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700, borderRadius: 6, border: '1px solid #2a2a2a', background: showTodos ? '#1e1e1e' : '#0d0d0d', color: showTodos ? '#fff' : '#555', cursor: 'pointer' }}>
          Todos · {allTaggedExs.length}
        </button>
      </div>

      {showTodos ? (
        /* Todos view — all exercises with block tags */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {allTaggedExs.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', color: '#333', fontSize: 13 }}>Nenhum exercício cadastrado.</div>
            : allTaggedExs.map(({ name, tags }) => (
              <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 10px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, color: '#ddd' }}>{name}</span>
                  <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11, opacity: .5 }}
                    onClick={() => deleteFromAll(name)} title="Remover de todos">
                    <i className="ti ti-trash" />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {tags.map(tag => {
                    const c = tagColor(tag);
                    return (
                      <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, letterSpacing: '.04em', textTransform: 'uppercase', background: c + '22', color: c, border: `1px solid ${c}44`, cursor: 'pointer' }}
                        onClick={() => { setShowTodos(false); setExpandedBlock(tag); setSelBlock(tag); }} title={`Ir para ${tag}`}>
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))
          }
        </div>
      ) : (
        /* Block accordion */
        <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.07em' }}>Tipos de Bloco</span>
          {expandedBlock === null && <span style={{ fontSize: 10, color: '#333', marginLeft: 8 }}>⠿ arrastar para reordenar</span>}
        </div>
        <button type="button" className="b bsm" onClick={sortBlocksAZ} title="Ordenar A→Z">
          <i className="ti ti-sort-ascending-letters" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {blockKeys.map((name, bi) => renderMobileBlockRow(name, bi))}
      </div>

      <div style={{ marginTop: 12, padding: 10, background: '#111', border: '1px solid #1e1e1e', borderRadius: 7, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.07em' }}>Novo Tipo de Bloco</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: 5, background: newBlockColor, border: '1px solid #333', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => document.getElementById('mob-new-block-color')?.click()} />
          <input type="color" id="mob-new-block-color" value={newBlockColor}
            onChange={e => setNewBlockColor(e.target.value)} style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }} />
          <input className="ex-input" placeholder="Nome do tipo..." value={newBlockName} style={{ flex: 1 }}
            onChange={e => setNewBlockName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addBlock(); }} />
          <button type="button" className="b bsec" onClick={addBlock} disabled={!newBlockName.trim()} style={{ flexShrink: 0 }}>
            <i className="ti ti-plus" />
          </button>
        </div>
      </div>
        </>
      )}

      <Footer />
    </div>
  );

  // ── Desktop layout ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 12, padding: 12, height: 'calc(100vh - 120px)', minHeight: 400 }}>

      {/* Left panel — block types */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.07em' }}>Tipos de Bloco</span>
          <button type="button" className="b bsm" onClick={sortBlocksAZ} title="Ordenar A→Z">
            <i className="ti ti-sort-ascending-letters" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Todos row */}
          <div
            onClick={() => { setSelBlock(null); setEditingBlock(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: selBlock === null ? '#1a1a1a' : '#111', border: `1px solid ${selBlock === null ? '#333' : '#1e1e1e'}`, borderLeft: '3px solid #444', borderRadius: 6, cursor: 'pointer', transition: 'all .1s', marginBottom: 2 }}
          >
            <i className="ti ti-list" style={{ color: '#444', fontSize: 14, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: selBlock === null ? '#fff' : '#888' }}>Todos</span>
            <span style={{ fontSize: 10, color: '#444' }}>{totalExs}</span>
          </div>

          {blockKeys.map((name, bi) => (
            <div key={name}
              draggable
              onDragStart={() => setDragBlockIdx(bi)}
              onDragEnd={() => { setDragBlockIdx(null); setDragOverBlockIdx(null); }}
              onDragOver={e => { e.preventDefault(); setDragOverBlockIdx(bi); }}
              onDrop={e => { e.preventDefault(); reorderBlocks(dragBlockIdx, bi); setDragOverBlockIdx(null); }}
              onClick={() => { setSelBlock(name); setEditingBlock(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: selBlock === name ? '#1a1a1a' : '#111', border: `1px solid ${dragOverBlockIdx === bi ? 'var(--theme-accent)' : selBlock === name ? '#333' : '#1e1e1e'}`, borderRadius: 6, cursor: 'pointer', transition: 'all .1s', borderLeft: `3px solid ${blockColors_[name] || '#555'}` }}
            >
              <i className="ti ti-grip-vertical" style={{ color: '#333', fontSize: 14, flexShrink: 0, cursor: 'grab' }} />
              {editingBlock?.name === name ? (
                <>
                  <div
                    style={{ width: 22, height: 22, borderRadius: 4, background: editingBlock.newColor || '#888', border: '1px solid #444', cursor: 'pointer', flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); document.getElementById('edit-block-color-' + name)?.click(); }}
                  />
                  <input type="color" id={'edit-block-color-' + name}
                    value={/^#[0-9a-fA-F]{6}$/.test(editingBlock.newColor || '') ? editingBlock.newColor : '#888888'}
                    style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                    onChange={e => setEditingBlock(p => ({ ...p, newColor: e.target.value }))} />
                  <input autoFocus className="ex-input" value={editingBlock.newName} style={{ flex: 1 }}
                    onChange={e => setEditingBlock(p => ({ ...p, newName: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); renameBlock(name, editingBlock.newName, editingBlock.newColor); } if (e.key === 'Escape') setEditingBlock(null); }} />
                </>
              ) : (
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: selBlock === name ? '#fff' : '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
              )}
              {editingBlock?.name === name
                ? <button type="button" className="b bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11 }}
                    onClick={e => { e.stopPropagation(); renameBlock(name, editingBlock.newName, editingBlock.newColor); }}>
                    <i className="ti ti-check" />
                  </button>
                : <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11, opacity: .6 }}
                    onClick={e => { e.stopPropagation(); setEditingBlock({ name, newName: name, newColor: blockColors_[name] || '#888888' }); }} title="Renomear">
                    <i className="ti ti-pencil" />
                  </button>
              }
              {editingBlock?.name !== name &&
                <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11, opacity: .5 }}
                  onClick={e => { e.stopPropagation(); deleteBlock(name); }} title="Remover">
                  <i className="ti ti-trash" />
                </button>
              }
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em' }}>Novo tipo de bloco</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: newBlockColor, border: '1px solid #333', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => document.getElementById('new-block-color-picker')?.click()} />
            <input type="color" id="new-block-color-picker" value={newBlockColor}
              style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
              onChange={e => setNewBlockColor(e.target.value)} />
            <input className="ex-input" placeholder="Nome do tipo..." value={newBlockName} style={{ flex: 1 }}
              onChange={e => setNewBlockName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addBlock(); }} />
            <button type="button" className="b bsec" style={{ padding: '4px 10px', minHeight: 28 }}
              onClick={addBlock} disabled={!newBlockName.trim()}>
              <i className="ti ti-plus" />
            </button>
          </div>
        </div>
      </div>

      {/* Right panel — exercises */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, paddingBottom: 60 }}>
        {selBlock === null ? (
          /* Todos view */
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-list" style={{ color: '#555', fontSize: 14 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.07em' }}>Todos os exercícios</span>
                <span style={{ fontSize: 11, color: '#555' }}>· {allTaggedExs.length}</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {allTaggedExs.length === 0
                ? <div style={{ padding: 20, textAlign: 'center', color: '#333', fontSize: 13 }}>Nenhum exercício cadastrado.</div>
                : allTaggedExs.map(({ name, tags }) => (
                  <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 10px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 13, color: '#ddd' }}>{name}</span>
                      <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11, opacity: .5 }}
                        onClick={() => deleteFromAll(name)} title="Remover de todos">
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {tags.map(tag => {
                        const c = tagColor(tag);
                        return (
                          <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, letterSpacing: '.04em', textTransform: 'uppercase', background: c + '22', color: c, border: `1px solid ${c}44`, cursor: 'pointer' }}
                            onClick={() => setSelBlock(tag)} title={`Ir para ${tag}`}>
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: blockCol }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: blockCol, textTransform: 'uppercase', letterSpacing: '.07em' }}>{selBlock}</span>
                <span style={{ fontSize: 11, color: '#555' }}>· {exs.length} exercício{exs.length !== 1 ? 's' : ''}</span>
              </div>
              <button type="button" className="b bsm" onClick={sortExsAZ} title="Ordenar A→Z">
                <i className="ti ti-sort-ascending-letters" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {exs.length === 0
                ? <div style={{ padding: 20, textAlign: 'center', color: '#333', fontSize: 13 }}>Nenhum exercício. Adicione abaixo.</div>
                : exs.map((ex, ei) => renderExRow(selBlock, ex, ei))
              }
            </div>

            <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 8, display: 'flex', gap: 6 }}>
              <input className="ex-input" placeholder={`Adicionar exercício em ${selBlock}...`} value={newExName} style={{ flex: 1 }}
                onChange={e => setNewExName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addEx(); }} />
              <button type="button" className="b bsec" onClick={addEx} disabled={!newExName.trim()}>
                <i className="ti ti-plus" /> Adicionar
              </button>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
