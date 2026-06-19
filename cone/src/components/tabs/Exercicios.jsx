import { useState, useMemo } from 'react';
import { loadRegistry, saveRegistry, loadSettings } from '../../utils/storage';
import { APP_CONFIG, ECOL } from '../../utils/config';
import { useIsMobile } from '../../hooks/useIsMobile';

const BG    = '#0d0b09';
const STONE = '#161210';
const DIV   = '#2a231c';
const CREAM = '#f0e8d0';
const SUB   = '#c8b090';
const MUTED = '#806850';
const DIM   = '#554a3a';

const BLOCK_ORDER = [
  'HIIT',       'MetCon',    'EMOM',      'For Time',  'AMRAP',
  'Estações',   'Força',     'LPO',       'Core',      'Acessórios',
  'Aquecimento','Skill',     'Cardio',    'Mobilidade','Descanso',
];

const getExName = ex => typeof ex === 'string' ? ex : (ex?.name || '');

function DemoFields({ editingEx, setEditingEx }) {
  return (
    <div style={{ paddingLeft: 21, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 1 }}>Demo</div>
      <input
        className="ex-input"
        placeholder="URL do vídeo (YouTube)"
        value={editingEx?.videoUrl || ''}
        style={{ fontSize: 11 }}
        onChange={e => setEditingEx(p => ({ ...p, videoUrl: e.target.value }))}
      />
      <textarea
        className="ex-input"
        placeholder="Descrição do movimento..."
        value={editingEx?.description || ''}
        rows={2}
        style={{ fontSize: 11, resize: 'vertical', fontFamily: 'inherit' }}
        onChange={e => setEditingEx(p => ({ ...p, description: e.target.value }))}
      />
    </div>
  );
}

function initRegistry() {
  const migrateEx = ex => typeof ex === 'string' ? { name: ex } : ex;
  const existing = loadRegistry();
  if (existing && typeof existing === 'object') {
    const reg = {};
    let needsSave = false;
    BLOCK_ORDER.forEach(n => {
      if (!existing[n]) { reg[n] = []; needsSave = true; return; }
      const raw = Array.isArray(existing[n]) ? existing[n] : [];
      if (raw.some(e => typeof e === 'string')) needsSave = true;
      reg[n] = raw.map(migrateEx);
    });
    if (needsSave) saveRegistry(reg);
    return reg;
  }
  const reg = {};
  BLOCK_ORDER.forEach(n => { reg[n] = []; });
  saveRegistry(reg);
  return reg;
}

export default function ExerciciosTab() {
  const [registry, setRegistryState]     = useState(() => initRegistry());
  const [selBlock, setSelBlock]           = useState(null);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [newExName, setNewExName]         = useState('');
  const [addExError, setAddExError]       = useState('');
  const [editingEx, setEditingEx]         = useState(null);
  const [dragExIdx, setDragExIdx]         = useState(null);
  const [dragOverExIdx, setDragOverExIdx] = useState(null);
  const [showTodos, setShowTodos]         = useState(false);
  const isMobile = useIsMobile();

  const blockColor = name => ECOL[name]?.text || MUTED;
  const totalExs   = useMemo(() => Object.values(registry).reduce((a, v) => a + v.length, 0), [registry]);

  const exDemoData = useMemo(() => {
    const map = {};
    BLOCK_ORDER.forEach(block => {
      (registry[block] || []).forEach(ex => {
        if (typeof ex === 'object' && ex.name && !map[ex.name]) map[ex.name] = ex;
      });
    });
    return map;
  }, [registry]);

  const persist = reg => {
    saveRegistry(reg);
    APP_CONFIG.blockNames = ['-', ...BLOCK_ORDER];
  };

  const blocksOf = name => BLOCK_ORDER.filter(b => (registry[b] || []).some(e => getExName(e) === name));

  // ── Exercise operations ───────────────────────────────────────────────────
  const addEx = targetBlock => {
    const block = targetBlock || selBlock;
    const name  = newExName.trim();
    if (!name || !block) return;
    if ((registry[block] || []).some(e => getExName(e) === name)) {
      setAddExError(`"${name}" já existe em ${block}`); return;
    }
    setAddExError('');
    const reg = { ...registry, [block]: [...(registry[block] || []), { name }] };
    setRegistryState(reg); persist(reg); setNewExName('');
  };

  const saveEditEx = () => {
    if (!editingEx) return;
    const { origName, newName: raw, videoUrl, description, origBlocks, selectedBlocks } = editingEx;
    const name = raw.trim();
    if (!name) return;
    if (selectedBlocks.length === 0) {
      setEditingEx(p => ({ ...p, error: 'Selecione pelo menos um tipo de bloco' })); return;
    }
    const newEx = { name };
    if (videoUrl?.trim()) newEx.videoUrl = videoUrl.trim();
    if (description?.trim()) newEx.description = description.trim();
    const reg = { ...registry };
    origBlocks.forEach(b => { reg[b] = (reg[b] || []).filter(e => getExName(e) !== origName); });
    selectedBlocks.forEach(b => {
      if (!(reg[b] || []).some(e => getExName(e) === name)) {
        reg[b] = [...(reg[b] || []), newEx];
      } else {
        reg[b] = (reg[b] || []).map(e => getExName(e) === name ? newEx : e);
      }
    });
    setRegistryState(reg); persist(reg); setEditingEx(null);
  };

  const startEdit = (ex, fromBlock, idx) => {
    const name = getExName(ex);
    const current = blocksOf(name);
    setEditingEx({
      origName: name, newName: name,
      videoUrl: (typeof ex === 'object' ? ex?.videoUrl : '') || '',
      description: (typeof ex === 'object' ? ex?.description : '') || '',
      origBlocks: current, selectedBlocks: [...current], fromBlock, idx,
    });
  };

  const startEditFromTodos = name => {
    const current = blocksOf(name);
    let exObj = null;
    for (const b of current) {
      exObj = (registry[b] || []).find(e => getExName(e) === name);
      if (exObj) break;
    }
    setEditingEx({
      origName: name, newName: name,
      videoUrl: (typeof exObj === 'object' ? exObj?.videoUrl : '') || '',
      description: (typeof exObj === 'object' ? exObj?.description : '') || '',
      origBlocks: current, selectedBlocks: [...current], fromTodos: true,
    });
  };

  const togglePill = block => {
    setEditingEx(p => {
      const has = p.selectedBlocks.includes(block);
      return { ...p, selectedBlocks: has ? p.selectedBlocks.filter(b => b !== block) : [...p.selectedBlocks, block], error: undefined };
    });
  };

  const deleteEx = (blockName, idx) => {
    const reg = { ...registry, [blockName]: registry[blockName].filter((_, i) => i !== idx) };
    setRegistryState(reg); persist(reg);
    if (editingEx) setEditingEx(null);
  };

  const deleteFromAll = name => {
    const inBlocks = blocksOf(name);
    if (!window.confirm(`Remover "${name}" de ${inBlocks.length} tipo${inBlocks.length > 1 ? 's' : ''}?`)) return;
    const reg = { ...registry };
    inBlocks.forEach(b => { reg[b] = (reg[b] || []).filter(e => getExName(e) !== name); });
    setRegistryState(reg); persist(reg);
    if (editingEx) setEditingEx(null);
  };

  const reorderExs = (blockName, from, to) => {
    if (from == null || from === to) return;
    const exs = [...registry[blockName]];
    const moved = exs.splice(from, 1)[0]; exs.splice(to, 0, moved);
    const reg = { ...registry, [blockName]: exs };
    setRegistryState(reg); persist(reg);
  };

  const sortExsAZ = blockName => {
    if (!blockName) return;
    const exs = [...registry[blockName]].sort((a, b) => getExName(a).localeCompare(getExName(b), 'pt'));
    const reg = { ...registry, [blockName]: exs };
    setRegistryState(reg); persist(reg);
  };

  // ── Todos ─────────────────────────────────────────────────────────────────
  const allTaggedExs = useMemo(() => {
    const map = {};
    BLOCK_ORDER.forEach(block => {
      (registry[block] || []).forEach(ex => {
        const name = getExName(ex);
        if (!map[name]) map[name] = [];
        map[name].push(block);
      });
    });
    return Object.entries(map)
      .map(([name, tags]) => ({ name, tags }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }, [registry]);

  // ── Block pills ───────────────────────────────────────────────────────────
  const BlockPills = ({ selectedBlocks }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6, paddingLeft: 21 }}>
      {BLOCK_ORDER.map(block => {
        const col        = blockColor(block);
        const isSelected = selectedBlocks.includes(block);
        return (
          <span key={block} onClick={() => togglePill(block)}
            style={{
              fontSize: 9, padding: '2px 6px',
              cursor: 'pointer', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
              background: isSelected ? col : 'transparent',
              color: isSelected ? BG : col,
              border: `1px solid ${isSelected ? col : col + '55'}`,
              transition: 'all .1s', userSelect: 'none',
            }}>
            {block}
          </span>
        );
      })}
    </div>
  );

  // ── Exercise row (block view) ─────────────────────────────────────────────
  const renderExRow = (blockName, ex, ei) => {
    const name = getExName(ex);
    const hasVideo = typeof ex === 'object' && !!ex.videoUrl;
    const isEditing = !editingEx?.fromTodos && editingEx?.fromBlock === blockName && editingEx?.idx === ei;
    const dragOver  = !isEditing && dragOverExIdx === ei;
    return (
      <div key={ei}
        draggable={!isEditing}
        onDragStart={!isEditing ? () => setDragExIdx(ei) : undefined}
        onDragEnd={!isEditing ? () => { setDragExIdx(null); setDragOverExIdx(null); } : undefined}
        onDragOver={!isEditing ? e => { e.preventDefault(); setDragOverExIdx(ei); } : undefined}
        onDrop={!isEditing ? e => { e.preventDefault(); reorderExs(blockName, dragExIdx, ei); setDragOverExIdx(null); } : undefined}
        style={{
          padding: '7px 10px', background: BG,
          border: `1px solid ${dragOver ? 'var(--theme-accent)' : isEditing ? DIV : DIV}`,
          borderLeft: `2px solid ${dragOver ? 'var(--theme-accent)' : DIM}`,
          transition: 'all .1s',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-grip-vertical" style={{ color: isEditing ? DIV : DIM, fontSize: 13, flexShrink: 0, cursor: isEditing ? 'default' : 'grab' }} />
          {isEditing
            ? <input autoFocus className="ex-input" value={editingEx.newName} style={{ flex: 1 }}
                onChange={e => setEditingEx(p => ({ ...p, newName: e.target.value, error: undefined }))}
                onKeyDown={e => { if (e.key === 'Enter') saveEditEx(); if (e.key === 'Escape') setEditingEx(null); }} />
            : <span style={{ flex: 1, fontSize: 13, color: SUB }}>{name}</span>
          }
          {!isEditing && hasVideo && (
            <i className="ti ti-video" style={{ color: '#4ac8c0', fontSize: 11, flexShrink: 0 }} title="Tem vídeo demo" />
          )}
          {isEditing ? (
            <>
              <button type="button" className="b bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11 }} onClick={saveEditEx}><i className="ti ti-check" /></button>
              <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11 }} onClick={() => setEditingEx(null)}><i className="ti ti-x" /></button>
            </>
          ) : (
            <>
              <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11, opacity: .6 }}
                onClick={() => startEdit(ex, blockName, ei)}><i className="ti ti-pencil" /></button>
              <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11, opacity: .5 }}
                onClick={() => deleteEx(blockName, ei)}><i className="ti ti-trash" /></button>
            </>
          )}
        </div>
        {isEditing && (
          <>
            <DemoFields editingEx={editingEx} setEditingEx={setEditingEx} />
            <BlockPills selectedBlocks={editingEx.selectedBlocks} />
            {editingEx.error && <div style={{ fontSize: 10, color: '#e05848', marginTop: 3, paddingLeft: 21 }}>{editingEx.error}</div>}
          </>
        )}
      </div>
    );
  };

  // ── Todos exercise row ────────────────────────────────────────────────────
  const renderTodosRow = ({ name, tags }) => {
    const isEditing = editingEx?.fromTodos && editingEx?.origName === name;
    const demo = exDemoData[name];
    const hasVideo = !!(demo?.videoUrl);
    return (
      <div key={name} style={{
        padding: '8px 10px', background: BG,
        border: `1px solid ${DIV}`,
        borderLeft: `2px solid ${isEditing ? 'var(--theme-accent)' : DIM}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditing
            ? <input autoFocus className="ex-input" value={editingEx.newName} style={{ flex: 1 }}
                onChange={e => setEditingEx(p => ({ ...p, newName: e.target.value, error: undefined }))}
                onKeyDown={e => { if (e.key === 'Enter') saveEditEx(); if (e.key === 'Escape') setEditingEx(null); }} />
            : <span style={{ flex: 1, fontSize: 13, color: SUB }}>{name}</span>
          }
          {!isEditing && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {hasVideo && <i className="ti ti-video" style={{ color: '#4ac8c0', fontSize: 11, flexShrink: 0 }} title="Tem vídeo demo" />}
              {tags.map(tag => {
                const c = blockColor(tag);
                return (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', letterSpacing: '.04em', textTransform: 'uppercase', background: c + '22', color: c, border: `1px solid ${c}44`, flexShrink: 0 }}>
                    {tag}
                  </span>
                );
              })}
            </div>
          )}
          {isEditing ? (
            <>
              <button type="button" className="b bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11 }} onClick={saveEditEx}><i className="ti ti-check" /></button>
              <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11 }} onClick={() => setEditingEx(null)}><i className="ti ti-x" /></button>
            </>
          ) : (
            <>
              <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11, opacity: .6 }}
                onClick={() => startEditFromTodos(name)}><i className="ti ti-pencil" /></button>
              <button type="button" className="b bd bsm" style={{ padding: '2px 6px', minHeight: 20, fontSize: 11, opacity: .5 }}
                onClick={() => deleteFromAll(name)}><i className="ti ti-trash" /></button>
            </>
          )}
        </div>
        {isEditing && (
          <>
            <DemoFields editingEx={editingEx} setEditingEx={setEditingEx} />
            <BlockPills selectedBlocks={editingEx.selectedBlocks} />
            {editingEx.error && <div style={{ fontSize: 10, color: '#e05848', marginTop: 3 }}>{editingEx.error}</div>}
          </>
        )}
      </div>
    );
  };

  // ── Config save ───────────────────────────────────────────────────────────
  const saveConfig = () => {
    const savedSettings = loadSettings();
    const exportCfg = {
      appTitle: APP_CONFIG.appTitle, appDescription: APP_CONFIG.appDescription || '',
      scheduleTitle: APP_CONFIG.scheduleTitle || APP_CONFIG.appTitle,
      leaderboardTitle: APP_CONFIG.leaderboardTitle || APP_CONFIG.appTitle,
      logo: APP_CONFIG.logo || 'icon-192.png',
      fontFamily: APP_CONFIG.fontFamily || "'Arial Black',Arial,sans-serif",
      googleFontsUrl: APP_CONFIG.googleFontsUrl || '',
      themeAccent: APP_CONFIG.themeAccent, themeAccentText: APP_CONFIG.themeAccentText,
      gymName: APP_CONFIG.gymName, fontScale: savedSettings.fontScale || 1.5,
      logoScale: APP_CONFIG.logoScale || 1,
      zoneScales: APP_CONFIG.zoneScales || [1, 1, 1],
      blockTitleScales: APP_CONFIG.blockTitleScales || [1, 1, 1],
      mobileEaglesBg: APP_CONFIG.mobileEaglesBg, mobileMegaManBg: APP_CONFIG.mobileMegaManBg,
      mobileExerciseNoteColor: APP_CONFIG.mobileExerciseNoteColor,
      restDayLabel: APP_CONFIG.restDayLabel, mobileWeeklyLabels: APP_CONFIG.mobileWeeklyLabels,
      exportScale: savedSettings.exportScale || 2,
      blockColors: APP_CONFIG.blockColors || {}, blockNames: ['-', ...BLOCK_ORDER],
      athleteLevels: APP_CONFIG.athleteLevels, athleteGoals: APP_CONFIG.athleteGoals,
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

  // ── Footer ────────────────────────────────────────────────────────────────
  const Footer = () => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: BG, borderTop: `1px solid ${DIV}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 50 }}>
      <span style={{ fontSize: 11, color: DIM, flex: 1 }}>{BLOCK_ORDER.length} tipos · {allTaggedExs.length} exercícios registrados</span>
      <button type="button" className="b bsec" onClick={saveConfig}>
        <i className="ti ti-download" /> Salvar config.json
      </button>
    </div>
  );

  // ── Mobile block accordion row ─────────────────────────────────────────
  const renderMobileBlockRow = name => {
    const isExp    = expandedBlock === name;
    const col      = blockColor(name);
    const blockExs = registry[name] || [];
    return (
      <div key={name} style={{ marginBottom: 2, borderLeft: `3px solid ${col}`, border: `1px solid ${isExp ? col + '44' : DIV}`, borderLeftWidth: 3, borderLeftColor: col }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: isExp ? STONE : BG, cursor: 'pointer' }}
          onClick={() => { const next = isExp ? null : name; setExpandedBlock(next); setSelBlock(next); setEditingEx(null); setAddExError(''); }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: isExp ? CREAM : SUB, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.04em' }}>{name}</span>
          <span style={{ fontSize: 11, color: DIM, marginRight: 2 }}>{blockExs.length}</span>
          <i className={`ti ti-chevron-${isExp ? 'down' : 'right'}`} style={{ color: MUTED, fontSize: 13, flexShrink: 0 }} />
        </div>
        {isExp && (
          <div style={{ padding: 8, background: BG, borderTop: `1px solid ${DIV}` }}>
            {blockExs.length === 0
              ? <div style={{ padding: 12, textAlign: 'center', color: DIM, fontSize: 12, fontStyle: 'italic' }}>Nenhum exercício. Adicione abaixo.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
                  {blockExs.map((ex, ei) => renderExRow(name, ex, ei))}
                </div>
            }
            {addExError && selBlock === name && (
              <div style={{ fontSize: 11, color: '#e05848', padding: '2px 0 4px' }}>{addExError}</div>
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderTop: blockExs.length > 0 ? `1px solid ${DIV}` : 'none', paddingTop: blockExs.length > 0 ? 8 : 0 }}>
              <input className="ex-input" placeholder="Adicionar exercício..." value={selBlock === name ? newExName : ''} style={{ flex: 1 }}
                onChange={e => { setNewExName(e.target.value); setAddExError(''); }}
                onFocus={() => setSelBlock(name)}
                onKeyDown={e => { if (e.key === 'Enter') addEx(name); }} />
              <button type="button" className="b bsec" style={{ padding: '5px 8px', flexShrink: 0 }}
                onClick={() => addEx(name)} disabled={!newExName.trim()}>
                <i className="ti ti-plus" />
              </button>
              <button type="button" className="b bsm" style={{ padding: '5px 7px', flexShrink: 0 }}
                onClick={() => sortExsAZ(name)} title="A→Z">
                <i className="ti ti-sort-ascending-letters" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) return (
    <div style={{ padding: 10, paddingBottom: 70, background: BG, minHeight: '100%' }}>
      <div style={{ display: 'flex', gap: 2, marginBottom: 10, borderBottom: `1px solid ${DIV}`, paddingBottom: 10 }}>
        <button type="button" onClick={() => { setShowTodos(false); setEditingEx(null); }}
          style={{ flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700, border: `1px solid ${!showTodos ? 'var(--theme-accent)' : DIV}`, background: !showTodos ? 'rgba(74,200,192,.08)' : 'transparent', color: !showTodos ? 'var(--theme-accent)' : MUTED, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: 'inherit' }}>
          Por tipo
        </button>
        <button type="button" onClick={() => { setShowTodos(true); setEditingEx(null); }}
          style={{ flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700, border: `1px solid ${showTodos ? 'var(--theme-accent)' : DIV}`, background: showTodos ? 'rgba(74,200,192,.08)' : 'transparent', color: showTodos ? 'var(--theme-accent)' : MUTED, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: 'inherit' }}>
          Todos · {allTaggedExs.length}
        </button>
      </div>

      {showTodos
        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {allTaggedExs.length === 0
              ? <div style={{ padding: 20, textAlign: 'center', color: DIM, fontSize: 13, fontStyle: 'italic' }}>Nenhum exercício cadastrado.</div>
              : allTaggedExs.map(renderTodosRow)
            }
          </div>
        : <div style={{ display: 'flex', flexDirection: 'column' }}>
            {BLOCK_ORDER.map(name => renderMobileBlockRow(name))}
          </div>
      }
      <Footer />
    </div>
  );

  // ── Desktop layout ─────────────────────────────────────────────────────────
  const exs      = selBlock ? (registry[selBlock] || []) : [];
  const blockCol = selBlock ? blockColor(selBlock) : MUTED;

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 120px)', minHeight: 400, background: BG }}>

      {/* Left — block list */}
      <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: 60, borderRight: `1px solid ${DIV}` }}>
        <div onClick={() => { setSelBlock(null); setEditingEx(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: selBlock === null ? STONE : 'transparent', borderLeft: `3px solid ${selBlock === null ? 'var(--theme-accent)' : 'transparent'}`, borderBottom: `1px solid ${DIV}`, cursor: 'pointer' }}>
          <i className="ti ti-list" style={{ color: selBlock === null ? 'var(--theme-accent)' : MUTED, fontSize: 13 }} />
          <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: selBlock === null ? CREAM : SUB, textTransform: 'uppercase', letterSpacing: '.04em' }}>Todos</span>
          <span style={{ fontSize: 11, color: DIM }}>{allTaggedExs.length}</span>
        </div>

        {BLOCK_ORDER.map(name => {
          const col     = blockColor(name);
          const cnt     = (registry[name] || []).length;
          const isSel   = selBlock === name;
          return (
            <div key={name} onClick={() => { setSelBlock(name); setEditingEx(null); setAddExError(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: isSel ? STONE : 'transparent', borderLeft: `3px solid ${isSel ? col : 'transparent'}`, borderBottom: `1px solid ${DIV}`, cursor: 'pointer', transition: 'all .1s' }}>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: isSel ? CREAM : SUB, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.04em' }}>{name}</span>
              <span style={{ fontSize: 11, color: isSel ? MUTED : DIM }}>{cnt}</span>
            </div>
          );
        })}
      </div>

      {/* Right — exercises or Todos */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingBottom: 60 }}>

        {/* Panel header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: `1px solid ${DIV}`, flexShrink: 0 }}>
          {selBlock === null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-list" style={{ color: MUTED, fontSize: 13 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '.07em' }}>Todos os exercícios</span>
              <span style={{ fontSize: 11, color: DIM }}>· {allTaggedExs.length}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: blockCol }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: blockCol, textTransform: 'uppercase', letterSpacing: '.07em' }}>{selBlock}</span>
              <span style={{ fontSize: 11, color: DIM }}>· {exs.length} exercício{exs.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          {selBlock && (
            <button type="button" className="b bsm" onClick={() => sortExsAZ(selBlock)} title="A→Z">
              <i className="ti ti-sort-ascending-letters" />
            </button>
          )}
        </div>

        {/* Exercise list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, padding: '8px 0' }}>
          {selBlock === null ? (
            allTaggedExs.length === 0
              ? <div style={{ padding: 20, textAlign: 'center', color: DIM, fontSize: 13, fontStyle: 'italic' }}>Nenhum exercício cadastrado.</div>
              : allTaggedExs.map(renderTodosRow)
          ) : (
            exs.length === 0
              ? <div style={{ padding: 20, textAlign: 'center', color: DIM, fontSize: 13, fontStyle: 'italic' }}>Nenhum exercício. Adicione abaixo.</div>
              : exs.map((ex, ei) => renderExRow(selBlock, ex, ei))
          )}
        </div>

        {/* Add input (block view only) */}
        {selBlock !== null && (
          <div style={{ borderTop: `1px solid ${DIV}`, padding: '10px 14px', flexShrink: 0 }}>
            {addExError && <div style={{ fontSize: 11, color: '#e05848', marginBottom: 6 }}>{addExError}</div>}
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="ex-input" placeholder={`Adicionar exercício em ${selBlock}...`} value={newExName} style={{ flex: 1 }}
                onChange={e => { setNewExName(e.target.value); setAddExError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') addEx(); }} />
              <button type="button" className="b bsec" onClick={() => addEx()} disabled={!newExName.trim()}>
                <i className="ti ti-plus" /> Adicionar
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
