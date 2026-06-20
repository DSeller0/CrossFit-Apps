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
  'HIIT','MetCon','EMOM','For Time','AMRAP',
  'Estações','Força','LPO','Core','Acessórios',
  'Aquecimento','Skill','Cardio','Mobilidade','Descanso',
];

const getExName = ex => typeof ex === 'string' ? ex : (ex?.name || '');

function initRegistry() {
  const migrateEx = ex => typeof ex === 'string' ? { name: ex } : ex;
  const existing  = loadRegistry();
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
  const [registry, setRegistryState] = useState(() => initRegistry());
  const [selBlock, setSelBlock]       = useState(null);   // null = Todos
  const [pane,     setPane]           = useState(0);      // mobile: 0|1|2
  const [adding,   setAdding]         = useState(false);
  const [newName,  setNewName]        = useState('');
  const [addError, setAddError]       = useState('');
  const [detail,   setDetail]         = useState(null);   // exercise being viewed/edited
  const [dragFrom, setDragFrom]       = useState(null);
  const [dragOver, setDragOver]       = useState(null);
  const isMobile = useIsMobile();

  const blockColor = name => ECOL[name]?.text || MUTED;
  const persist    = reg  => { saveRegistry(reg); APP_CONFIG.blockNames = ['-', ...BLOCK_ORDER]; };
  const blocksOf   = name => BLOCK_ORDER.filter(b => (registry[b] || []).some(e => getExName(e) === name));

  const allEx = useMemo(() => {
    const map = {};
    BLOCK_ORDER.forEach(b => {
      (registry[b] || []).forEach(ex => { const n = getExName(ex); if (!map[n]) map[n] = ex; });
    });
    return Object.values(map).sort((a, b) => getExName(a).localeCompare(getExName(b), 'pt'));
  }, [registry]);

  const exsForPane = useMemo(() => (
    selBlock === null ? allEx : (registry[selBlock] || [])
  ), [registry, selBlock, allEx]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goToType = block => {
    setSelBlock(block);
    setDetail(null);
    setAdding(false); setNewName(''); setAddError('');
    if (isMobile) setPane(1);
  };

  const goToEx = exObj => {
    const name   = getExName(exObj);
    const blocks = blocksOf(name);
    const vid    = (typeof exObj === 'object' ? exObj.videoUrl    : '') || '';
    const desc   = (typeof exObj === 'object' ? exObj.description : '') || '';
    setDetail({ origName: name, name, selectedBlocks: [...blocks], videoUrl: vid, description: desc });
    if (isMobile) setPane(2);
  };

  const goBack = () => {
    if (pane === 2) { setPane(1); setDetail(null); }
    else if (pane === 1) { setPane(0); setSelBlock(null); setDetail(null); }
  };

  // ── Operations ──────────────────────────────────────────────────────────────
  const confirmAdd = () => {
    const name = newName.trim();
    if (!name || !selBlock) return;
    if ((registry[selBlock] || []).some(e => getExName(e) === name)) {
      setAddError(`"${name}" já existe em ${selBlock}`); return;
    }
    const reg = { ...registry, [selBlock]: [...(registry[selBlock] || []), { name }] };
    setRegistryState(reg); persist(reg);
    setNewName(''); setAdding(false); setAddError('');
    goToEx({ name });
  };

  const saveDetail = () => {
    if (!detail) return;
    const { origName, name: raw, videoUrl, description, selectedBlocks } = detail;
    const name = raw.trim();
    if (!name) return;
    if (selectedBlocks.length === 0) {
      setDetail(p => ({ ...p, error: 'Selecione pelo menos um tipo' })); return;
    }
    const newEx = { name };
    if (videoUrl?.trim())    newEx.videoUrl    = videoUrl.trim();
    if (description?.trim()) newEx.description = description.trim();
    const reg = { ...registry };
    blocksOf(origName).forEach(b => { reg[b] = (reg[b] || []).filter(e => getExName(e) !== origName); });
    selectedBlocks.forEach(b => {
      if (!(reg[b] || []).some(e => getExName(e) === name)) reg[b] = [...(reg[b] || []), newEx];
      else reg[b] = (reg[b] || []).map(e => getExName(e) === name ? newEx : e);
    });
    setRegistryState(reg); persist(reg);
    setDetail(p => ({ ...p, origName: name, saved: true }));
    setTimeout(() => setDetail(p => p ? { ...p, saved: false } : p), 1500);
  };

  const deleteEx = name => {
    const inBlocks = blocksOf(name);
    if (!window.confirm(`Remover "${name}" de ${inBlocks.length} tipo${inBlocks.length > 1 ? 's' : ''}?`)) return;
    const reg = { ...registry };
    inBlocks.forEach(b => { reg[b] = (reg[b] || []).filter(e => getExName(e) !== name); });
    setRegistryState(reg); persist(reg);
    setDetail(null);
    if (isMobile) setPane(1);
  };

  const reorderExs = (from, to) => {
    if (from == null || from === to || !selBlock) return;
    const exs   = [...registry[selBlock]];
    const moved = exs.splice(from, 1)[0]; exs.splice(to, 0, moved);
    const reg   = { ...registry, [selBlock]: exs };
    setRegistryState(reg); persist(reg);
  };

  const sortAZ = () => {
    if (!selBlock) return;
    const exs = [...(registry[selBlock] || [])].sort((a, b) => getExName(a).localeCompare(getExName(b), 'pt'));
    const reg = { ...registry, [selBlock]: exs };
    setRegistryState(reg); persist(reg);
  };

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
      exerciseRegistry: registry, ...savedSettings,
    };
    const raw = window.prompt('Nome do arquivo (sem extensão):', 'config');
    if (raw === null) return;
    const fname = (raw.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'config');
    const blob  = new Blob([JSON.stringify(exportCfg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.download = fname + '.json';
    a.href = URL.createObjectURL(blob); a.click(); URL.revokeObjectURL(a.href);
  };

  // ── Pane 1: Type list ───────────────────────────────────────────────────────
  const renderPane1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: isMobile ? undefined : 1 }}>
      {/* Todos */}
      {(() => {
        const isSel = selBlock === null;
        return (
          <div onClick={() => goToType(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', background: isSel ? STONE : 'transparent', borderLeft: `3px solid ${isSel ? 'var(--theme-accent)' : 'transparent'}`, borderBottom: `1px solid ${DIV}`, cursor: 'pointer' }}>
            <i className="ti ti-list" style={{ color: isSel ? 'var(--theme-accent)' : MUTED, fontSize: 13 }} />
            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: isSel ? CREAM : SUB, textTransform: 'uppercase', letterSpacing: '.05em' }}>Todos</span>
            <span style={{ fontSize: 11, color: DIM }}>{allEx.length}</span>
          </div>
        );
      })()}

      {BLOCK_ORDER.map(name => {
        const col   = blockColor(name);
        const cnt   = (registry[name] || []).length;
        const isSel = selBlock === name;
        return (
          <div key={name} onClick={() => goToType(name)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', background: isSel ? STONE : 'transparent', borderLeft: `3px solid ${isSel ? col : 'transparent'}`, borderBottom: `1px solid ${DIV}`, cursor: 'pointer', transition: 'background .1s' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: isSel ? CREAM : SUB, textTransform: 'uppercase', letterSpacing: '.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            <span style={{ fontSize: 11, color: isSel ? MUTED : DIM }}>{cnt}</span>
            {isMobile && <i className="ti ti-chevron-right" style={{ color: DIM, fontSize: 12, flexShrink: 0 }} />}
          </div>
        );
      })}
    </div>
  );

  // ── Pane 2: Exercise list ───────────────────────────────────────────────────
  const renderPane2 = () => {
    const blockCol = selBlock ? blockColor(selBlock) : MUTED;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: `1px solid ${DIV}`, flexShrink: 0 }}>
          {selBlock === null
            ? <><i className="ti ti-list" style={{ color: MUTED, fontSize: 13 }} /><span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '.06em' }}>Todos · {allEx.length}</span></>
            : <><span style={{ width: 8, height: 8, borderRadius: '50%', background: blockCol, flexShrink: 0 }} /><span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: blockCol, textTransform: 'uppercase', letterSpacing: '.06em' }}>{selBlock}</span><span style={{ fontSize: 11, color: DIM }}>{exsForPane.length}</span></>
          }
          {selBlock && (
            <button type="button" className="b bsm" style={{ padding: '3px 6px' }} onClick={sortAZ} title="A→Z">
              <i className="ti ti-sort-ascending-letters" />
            </button>
          )}
        </div>

        {/* List + inline add form */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {exsForPane.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', color: DIM, fontSize: 12, fontStyle: 'italic' }}>
                {selBlock ? 'Nenhum exercício. Adicione abaixo.' : 'Nenhum exercício cadastrado.'}
              </div>
            : exsForPane.map((ex, ei) => {
                const name      = getExName(ex);
                const hasVideo  = typeof ex === 'object' && !!ex.videoUrl;
                const isActive  = detail?.origName === name;
                const isDragOver = dragOver === ei;
                const exTags    = selBlock === null ? blocksOf(name) : [];
                return (
                  <div key={ei}
                    draggable={selBlock !== null}
                    onDragStart={selBlock !== null ? () => setDragFrom(ei) : undefined}
                    onDragEnd={selBlock !== null ? () => { setDragFrom(null); setDragOver(null); } : undefined}
                    onDragOver={selBlock !== null ? e => { e.preventDefault(); setDragOver(ei); } : undefined}
                    onDrop={selBlock !== null ? e => { e.preventDefault(); reorderExs(dragFrom, ei); setDragOver(null); } : undefined}
                    onClick={() => goToEx(ex)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: `1px solid ${DIV}`, background: isActive ? STONE : (isDragOver ? '#1a1410' : 'transparent'), borderLeft: `2px solid ${isActive ? 'var(--theme-accent)' : 'transparent'}`, cursor: 'pointer', transition: 'background .1s' }}>
                    {selBlock !== null && (
                      <i className="ti ti-grip-vertical" style={{ color: DIM, fontSize: 13, flexShrink: 0, cursor: 'grab' }} />
                    )}
                    <span style={{ flex: 1, fontSize: 13, color: isActive ? CREAM : SUB, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    {selBlock === null && exTags.length > 0 && (
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        {exTags.slice(0, 2).map(t => {
                          const c = blockColor(t);
                          return <span key={t} style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', background: c + '22', color: c, textTransform: 'uppercase', letterSpacing: '.03em' }}>{t}</span>;
                        })}
                        {exTags.length > 2 && <span style={{ fontSize: 9, color: DIM }}>+{exTags.length - 2}</span>}
                      </div>
                    )}
                    {hasVideo && <i className="ti ti-video" style={{ color: '#4ac8c0', fontSize: 11, flexShrink: 0 }} />}
                    <i className="ti ti-chevron-right" style={{ color: DIM, fontSize: 12, flexShrink: 0 }} />
                  </div>
                );
              })
          }
          {selBlock !== null && (
            <div style={{ borderTop: `1px solid ${DIV}`, padding: '10px 12px' }}>
              {addError && <div style={{ fontSize: 11, color: '#e05848', marginBottom: 6 }}>{addError}</div>}
              {adding ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input autoFocus className="ex-input" placeholder="Nome do exercício..." value={newName}
                    style={{ flex: 1 }}
                    onChange={e => { setNewName(e.target.value); setAddError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); setAddError(''); } }} />
                  <button type="button" className="b bsec" style={{ padding: '6px 9px', flexShrink: 0 }} onClick={confirmAdd} disabled={!newName.trim()}>
                    <i className="ti ti-check" />
                  </button>
                  <button type="button" className="b bd" style={{ padding: '6px 9px', flexShrink: 0 }} onClick={() => { setAdding(false); setNewName(''); setAddError(''); }}>
                    <i className="ti ti-x" />
                  </button>
                </div>
              ) : (
                <button type="button" className="b bsec" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setAdding(true)}>
                  <i className="ti ti-plus" /> Adicionar exercício
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Pane 3: Exercise detail ─────────────────────────────────────────────────
  const renderPane3 = () => {
    if (!detail) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: DIM, fontSize: 12, fontStyle: 'italic', padding: 20, textAlign: 'center' }}>
        Selecione um exercício para editar
      </div>
    );

    const toggleTag = block => {
      setDetail(p => {
        const has = p.selectedBlocks.includes(block);
        return { ...p, selectedBlocks: has ? p.selectedBlocks.filter(b => b !== block) : [...p.selectedBlocks, block], error: undefined, saved: false };
      });
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header bar */}
        <div style={{ padding: '9px 14px', borderBottom: `1px solid ${DIV}`, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '.07em' }}>Exercício</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Name */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Nome</div>
            <input className="ex-input" value={detail.name}
              onChange={e => setDetail(p => ({ ...p, name: e.target.value, saved: false, error: undefined }))}
              onKeyDown={e => { if (e.key === 'Enter') saveDetail(); }}
            />
          </div>

          {/* Type tags */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Tipos</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {BLOCK_ORDER.map(block => {
                const col   = blockColor(block);
                const isSel = detail.selectedBlocks.includes(block);
                return (
                  <span key={block} onClick={() => toggleTag(block)}
                    style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', letterSpacing: '.04em', textTransform: 'uppercase', background: isSel ? col : 'transparent', color: isSel ? BG : col, border: `1px solid ${isSel ? col : col + '55'}`, transition: 'all .1s', userSelect: 'none' }}>
                    {block}
                  </span>
                );
              })}
            </div>
            {detail.error && <div style={{ fontSize: 11, color: '#e05848', marginTop: 6 }}>{detail.error}</div>}
          </div>

          {/* YouTube URL */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Vídeo (YouTube)</div>
            <input className="ex-input" placeholder="https://youtu.be/..." value={detail.videoUrl}
              onChange={e => setDetail(p => ({ ...p, videoUrl: e.target.value, saved: false }))}
            />
          </div>

          {/* Description */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Descrição</div>
            <textarea className="ex-input" placeholder="Notas sobre o movimento..." value={detail.description} rows={4}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              onChange={e => setDetail(p => ({ ...p, description: e.target.value, saved: false }))}
            />
          </div>
        </div>

        {/* Action bar */}
        <div style={{ borderTop: `1px solid ${DIV}`, padding: '10px 14px', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" className="b bsec" style={{ flex: 1 }} onClick={saveDetail}>
            {detail.saved ? <><i className="ti ti-check" /> Salvo</> : 'Salvar'}
          </button>
          <button type="button" className="b bd" style={{ padding: '0 12px' }} onClick={() => deleteEx(detail.origName)}>
            <i className="ti ti-trash" />
          </button>
        </div>
      </div>
    );
  };

  // ── Footer ──────────────────────────────────────────────────────────────────
  const Footer = () => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: BG, borderTop: `1px solid ${DIV}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 50 }}>
      <span style={{ fontSize: 11, color: DIM, flex: 1 }}>{BLOCK_ORDER.length} tipos · {allEx.length} exercícios</span>
      <button type="button" className="b bsec" onClick={saveConfig}>
        <i className="ti ti-download" /> Salvar config.json
      </button>
    </div>
  );

  // ── Mobile layout ───────────────────────────────────────────────────────────
  if (isMobile) {
    const BackBtn = ({ label }) => (
      <button type="button" className="rp-mobile-back" onClick={goBack}>
        <i className="ti ti-chevron-left" /> {label}
      </button>
    );

    return (
      <div style={{ background: BG, minHeight: '100%', paddingBottom: 70 }}>
        {pane === 0 && renderPane1()}

        {pane === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <BackBtn label="Tipos" />
            {renderPane2()}
          </div>
        )}

        {pane === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <BackBtn label={selBlock || 'Todos'} />
            {renderPane3()}
          </div>
        )}

        <Footer />
      </div>
    );
  }

  // ── Desktop layout ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', minHeight: 400, background: BG }}>
      {/* Pane 1 */}
      <div style={{ width: 190, flexShrink: 0, borderRight: `1px solid ${DIV}`, overflowY: 'auto', paddingBottom: 60 }}>
        {renderPane1()}
      </div>

      {/* Pane 2 */}
      <div style={{ width: 250, flexShrink: 0, borderRight: `1px solid ${DIV}`, display: 'flex', flexDirection: 'column', paddingBottom: selBlock ? 0 : 0 }}>
        {selBlock !== undefined ? renderPane2() : (
          <div style={{ padding: 20, color: DIM, fontSize: 12, fontStyle: 'italic' }}>Selecione um tipo</div>
        )}
      </div>

      {/* Pane 3 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', paddingBottom: 60 }}>
        {renderPane3()}
      </div>

      <Footer />
    </div>
  );
}
