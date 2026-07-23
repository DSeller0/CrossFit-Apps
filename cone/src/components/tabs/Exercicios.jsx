import { useState, useMemo } from 'react';
import { loadRegistry, saveRegistry } from '../../utils/storage';
import { normExName } from '../../public/lib/registry.js';
import { APP_CONFIG, ECOL } from '../../utils/config';
import { useIsMobile } from '../../hooks/useIsMobile';
import IntensityInput from '../shared/IntensityInput';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ConfirmReview from '../../public/shared/ConfirmReview';
import s from './Exercicios.module.css';

const BLOCK_ORDER = [
  'HIIT','MetCon','EMOM','For Time','AMRAP',
  'Estações','Força','LPO','Core','Acessórios',
  'Aquecimento','Skill','Cardio','Mobilidade','Benchmark',
];

const getExName = ex => typeof ex === 'string' ? ex : (ex?.name || '');
// Alphabetical-within-category is the canonical stored order (#87) — the registry is a
// lookup catalog, not an ordered playlist, so insertion order + a manual A→Z button /
// drag-reorder are retired. Every mutation re-sorts the touched category here.
const sortCat = arr => [...arr].sort((a, b) => getExName(a).localeCompare(getExName(b), 'pt'));

const extractYouTubeId = url => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
};

// ── Registry init ─────────────────────────────────────────────────────────────
function initRegistry() {
  const migrateEx = ex => typeof ex === 'string' ? { name: ex } : ex;
  const existing  = loadRegistry();
  if (existing && typeof existing === 'object') {
    const reg = {};
    let needsSave = false;
    BLOCK_ORDER.forEach(n => {
      if (!existing[n]) { reg[n] = []; needsSave = true; return; }
      const raw      = Array.isArray(existing[n]) ? existing[n] : [];
      if (raw.some(e => typeof e === 'string')) needsSave = true;
      const migrated = raw.map(migrateEx);
      const sorted   = sortCat(migrated);
      // reference-compare: sortCat reuses the same objects, so a positional diff means
      // stored order wasn't alphabetical yet (#87) — persist the normalized order once.
      if (sorted.some((e, i) => e !== migrated[i])) needsSave = true;
      reg[n] = sorted;
    });
    if (needsSave) saveRegistry(reg);
    return reg;
  }
  const reg = {};
  BLOCK_ORDER.forEach(n => { reg[n] = []; });
  saveRegistry(reg);
  return reg;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExerciciosTab() {
  const [registry, setRegistryState] = useState(() => initRegistry());
  const [selBlock, setSelBlock]       = useState(null);
  const [pane,     setPane]           = useState(0);
  const [search,   setSearch]         = useState('');
  const [adding,   setAdding]         = useState(false);
  const [newName,  setNewName]        = useState('');
  const [addError, setAddError]       = useState('');
  const [detail,   setDetail]         = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const isMobile = useIsMobile();

  const blockColor = name => ECOL[name]?.text || 'var(--muted)';
  const persist    = reg  => { saveRegistry(reg); APP_CONFIG.blockNames = ['-', ...BLOCK_ORDER]; };
  // Compared via normExName (#62) — not full alias resolution — so a name that only
  // differs by whitespace/case/accent still finds its own entry across categories
  // instead of registering as a silent duplicate.
  const blocksOf   = name => { const key = normExName(name); return BLOCK_ORDER.filter(b => (registry[b] || []).some(e => normExName(getExName(e)) === key)); };

  const allEx = useMemo(() => {
    const map = {};
    BLOCK_ORDER.forEach(b => {
      (registry[b] || []).forEach(ex => { const n = getExName(ex); const key = normExName(n); if (!map[key]) map[key] = ex; });
    });
    return Object.values(map).sort((a, b) => getExName(a).localeCompare(getExName(b), 'pt'));
  }, [registry]);

  // Category lists are already alpha-canonical (sortCat on every write); search filters
  // the visible rows by the registry's own comparison key (accent/case/whitespace-safe).
  const visibleExs = useMemo(() => {
    const base = selBlock === null ? allEx : (registry[selBlock] || []);
    const q = normExName(search);
    if (!q) return base;
    return base.filter(ex => normExName(getExName(ex)).includes(q));
  }, [registry, selBlock, allEx, search]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goToType = block => {
    setSelBlock(block);
    setDetail(null);
    setSearch('');
    setAdding(false); setNewName(''); setAddError('');
    if (isMobile) setPane(1);
  };

  const goToEx = exObj => {
    const name = getExName(exObj);
    const blocks = blocksOf(name);
    const o = typeof exObj === 'object' ? exObj : {};
    setDetail({
      origName: name, name, selectedBlocks: [...blocks],
      videoUrl:       o.videoUrl       || '',
      videoPublished: o.videoPublished === true,
      description:    o.description    || '',
      muscles:        o.muscles        || '',
      notes:          o.notes          || '',
      defaults: {
        sets:      o.defaults?.sets      || '',
        reps:      o.defaults?.reps      || '',
        dist:      o.defaults?.dist      || '',
        distUnit:  o.defaults?.distUnit  || 'm',
        intensity: o.defaults?.intensity || null,
      },
      defaultsDistMode: !!o.defaults?.dist,
    });
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
    if ((registry[selBlock] || []).some(e => normExName(getExName(e)) === normExName(name))) {
      setAddError(`"${name}" já existe em ${selBlock}`); return;
    }
    const reg = { ...registry, [selBlock]: sortCat([...(registry[selBlock] || []), { name }]) };
    setRegistryState(reg); persist(reg);
    setNewName(''); setAdding(false); setAddError(''); setSearch('');
    goToEx({ name });
  };

  const saveDetail = () => {
    if (!detail) return;
    const { origName, name: raw, videoUrl, videoPublished, description, muscles, notes, selectedBlocks, defaults } = detail;
    const name = raw.trim();
    if (!name) return;
    if (selectedBlocks.length === 0) {
      setDetail(p => ({ ...p, error: 'Selecione pelo menos um tipo' })); return;
    }
    const newEx = { name };
    if (videoUrl?.trim())    newEx.videoUrl       = videoUrl.trim();
    if (videoPublished)      newEx.videoPublished = true;
    if (description?.trim()) newEx.description    = description.trim();
    if (muscles?.trim())     newEx.muscles        = muscles.trim();
    if (notes?.trim())       newEx.notes          = notes.trim();
    const cleanDefaults = {};
    if (defaults?.sets?.toString().trim())      cleanDefaults.sets      = defaults.sets;
    if (defaults?.dist?.toString().trim())      { cleanDefaults.dist = defaults.dist; cleanDefaults.distUnit = defaults.distUnit || 'm'; }
    else if (defaults?.reps?.toString().trim()) cleanDefaults.reps      = defaults.reps;
    if (defaults?.intensity?.mode && defaults.intensity.mode !== 'none') cleanDefaults.intensity = defaults.intensity;
    if (Object.keys(cleanDefaults).length) newEx.defaults = cleanDefaults;
    const reg = { ...registry };
    const origKey = normExName(origName), nameKey = normExName(name);
    blocksOf(origName).forEach(b => { reg[b] = (reg[b] || []).filter(e => normExName(getExName(e)) !== origKey); });
    selectedBlocks.forEach(b => {
      if (!(reg[b] || []).some(e => normExName(getExName(e)) === nameKey)) reg[b] = [...(reg[b] || []), newEx];
      else reg[b] = (reg[b] || []).map(e => normExName(getExName(e)) === nameKey ? newEx : e);
      reg[b] = sortCat(reg[b]);
    });
    setRegistryState(reg); persist(reg);
    setDetail(p => ({ ...p, origName: name, saved: true }));
    setTimeout(() => setDetail(p => p ? { ...p, saved: false } : p), 1500);
  };

  const confirmDelete = () => {
    const name = pendingDelete;
    if (!name) return;
    const reg = { ...registry };
    const nameKey = normExName(name);
    blocksOf(name).forEach(b => { reg[b] = (reg[b] || []).filter(e => normExName(getExName(e)) !== nameKey); });
    setRegistryState(reg); persist(reg);
    setPendingDelete(null);
    setDetail(null);
    if (isMobile) setPane(1);
  };

  // ── Pane 1: Type list ───────────────────────────────────────────────────────
  const renderPane1 = () => (
    <div className={`${s.typeList}${isMobile ? '' : ' ' + s.typeListFlex}`}>
      {(() => {
        const isSel = selBlock === null;
        return (
          <button type="button" className={`${s.navRow}${isSel ? ' ' + s.sel : ''}`} onClick={() => goToType(null)}>
            <i className={`ti ti-list ${s.navIcon}`} />
            <span className={s.navName}>Todos</span>
            <span className={s.navCount}>{allEx.length}</span>
          </button>
        );
      })()}
      {BLOCK_ORDER.map(name => {
        const col   = blockColor(name);
        const cnt   = (registry[name] || []).length;
        const isSel = selBlock === name;
        return (
          <button key={name} type="button" className={`${s.navRow}${isSel ? ' ' + s.sel : ''}`} onClick={() => goToType(name)}
            style={isSel ? { borderLeftColor: col } : undefined}>
            <span className={s.navDot} style={{ background: col }} />
            <span className={s.navName}>{name}</span>
            <span className={s.navCount}>{cnt}</span>
            {isMobile && <i className={`ti ti-chevron-right ${s.navChevron}`} />}
          </button>
        );
      })}
    </div>
  );

  // ── Pane 2: Exercise list ───────────────────────────────────────────────────
  const renderPane2 = () => {
    const blockCol = selBlock ? blockColor(selBlock) : 'var(--muted)';
    return (
      <div className={s.pane2}>
        <div className={s.paneHead}>
          {selBlock === null
            ? <><i className={`ti ti-list ${s.paneHeadIcon}`} /><span className={s.paneHeadTitle} style={{ color: 'var(--muted)' }}>Todos</span></>
            : <><span className={s.paneHeadDot} style={{ background: blockCol }} /><span className={s.paneHeadTitle} style={{ color: blockCol }}>{selBlock}</span></>
          }
          <span className={s.paneHeadCount}>{visibleExs.length}</span>
        </div>

        <div className={s.searchRow}>
          <i className={`ti ti-search ${s.searchIcon}`} />
          <input className={s.searchInput} type="text" value={search} placeholder="Buscar exercício..."
            aria-label="Buscar exercício"
            onChange={e => setSearch(e.target.value)} />
          {search && (
            <button type="button" className={s.searchClear} onClick={() => setSearch('')} aria-label="Limpar busca">
              <i className="ti ti-x" />
            </button>
          )}
        </div>

        <div className={s.exScroll}>
          {visibleExs.length === 0
            ? <div className={s.empty}>
                {search ? 'Nenhum exercício encontrado.' : (selBlock ? 'Nenhum exercício. Adicione abaixo.' : 'Nenhum exercício cadastrado.')}
              </div>
            : visibleExs.map(ex => {
                const name     = getExName(ex);
                const hasVideo = typeof ex === 'object' && !!ex.videoUrl;
                const isPubl   = typeof ex === 'object' && ex.videoPublished === true;
                const isActive = detail?.origName === name;
                const exTags   = selBlock === null ? blocksOf(name) : [];
                return (
                  <button key={name} type="button" className={`${s.exRow}${isActive ? ' ' + s.active : ''}`} onClick={() => goToEx(ex)}>
                    <span className={s.exName}>{name}</span>
                    {selBlock === null && exTags.length > 0 && (
                      <div className={s.exTags}>
                        {exTags.slice(0, 2).map(t => {
                          const c = blockColor(t);
                          return <span key={t} className={s.exTag} style={{ background: c + '22', color: c }}>{t}</span>;
                        })}
                        {exTags.length > 2 && <span className={s.exTagMore}>+{exTags.length - 2}</span>}
                      </div>
                    )}
                    {hasVideo && <i className={`ti ti-video ${s.exVideoIcon}`} style={{ color: isPubl ? 'var(--teal)' : 'var(--dim)' }} />}
                    <i className={`ti ti-chevron-right ${s.exChevron}`} />
                  </button>
                );
              })
          }
          {selBlock !== null && (
            <div className={s.addWrap}>
              {addError && <div className={s.addError}>{addError}</div>}
              {adding ? (
                <div className={s.addRow}>
                  <input autoFocus className={s.addInput} placeholder="Nome do exercício..." value={newName}
                    aria-label="Nome do novo exercício"
                    onChange={e => { setNewName(e.target.value); setAddError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); setAddError(''); } }} />
                  <Button variant="primary" iconOnly onClick={confirmAdd} disabled={!newName.trim()} aria-label="Confirmar"><i className="ti ti-check" /></Button>
                  <Button variant="destructive" iconOnly onClick={() => { setAdding(false); setNewName(''); setAddError(''); }} aria-label="Cancelar"><i className="ti ti-x" /></Button>
                </div>
              ) : (
                <Button variant="primary" full onClick={() => setAdding(true)}>
                  <i className="ti ti-plus" /> Adicionar exercício
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Pane 3: Exercise detail ─────────────────────────────────────────────────
  const renderPane3 = () => {
    if (!detail) return <div className={s.detailEmpty}>Selecione um exercício para editar</div>;

    const toggleTag = block => {
      setDetail(p => {
        const has = p.selectedBlocks.includes(block);
        return { ...p, selectedBlocks: has ? p.selectedBlocks.filter(b => b !== block) : [...p.selectedBlocks, block], error: undefined, saved: false };
      });
    };

    const videoId = extractYouTubeId(detail.videoUrl);

    return (
      <div className={s.pane3}>
        <div className={s.detailHead}>
          <span className={s.detailKicker}>Exercício</span>
        </div>

        <div className={s.detailBody}>
          {/* Name */}
          <Input label="Nome" value={detail.name}
            onChange={e => setDetail(p => ({ ...p, name: e.target.value, saved: false, error: undefined }))}
            onKeyDown={e => { if (e.key === 'Enter') saveDetail(); }}
          />

          {/* Type tags */}
          <div>
            <div className={s.sLabel}>Tipos</div>
            <div className={s.tagWrap}>
              {BLOCK_ORDER.map(block => {
                const col   = blockColor(block);
                const isSel = detail.selectedBlocks.includes(block);
                return (
                  <button key={block} type="button" className={s.tagToggle} onClick={() => toggleTag(block)} aria-pressed={isSel}
                    style={{ background: isSel ? col : 'transparent', color: isSel ? 'var(--bg)' : col, border: `1px solid ${isSel ? col : col + '55'}` }}>
                    {block}
                  </button>
                );
              })}
            </div>
            {detail.error && <div className={s.fieldError}>{detail.error}</div>}
          </div>

          {/* Default loads — shown as ghost placeholders in the builder */}
          <div>
            <div className={s.sLabel}>Cargas padrão (Criador)</div>
            <div className={s.defRow}>
              <input className={s.defInput} style={{ width: 64 }} placeholder="Séries" value={detail.defaults.sets} aria-label="Séries padrão"
                onChange={e => setDetail(p => ({ ...p, defaults: { ...p.defaults, sets: e.target.value }, saved: false }))} />
              <span className={s.defTimes}>×</span>
              {detail.defaultsDistMode ? (
                <>
                  <input className={s.defInput} style={{ width: 90 }} placeholder="Distância" value={detail.defaults.dist} aria-label="Distância padrão"
                    onChange={e => setDetail(p => ({ ...p, defaults: { ...p.defaults, dist: e.target.value }, saved: false }))} />
                  <select className={s.defInput} style={{ width: 74 }} value={detail.defaults.distUnit} aria-label="Unidade de distância"
                    onChange={e => setDetail(p => ({ ...p, defaults: { ...p.defaults, distUnit: e.target.value }, saved: false }))}>
                    <option value="m">m</option><option value="cal">cal</option>
                  </select>
                </>
              ) : (
                <input className={s.defInput} style={{ width: 90 }} placeholder="Reps" value={detail.defaults.reps} aria-label="Reps padrão"
                  onChange={e => setDetail(p => ({ ...p, defaults: { ...p.defaults, reps: e.target.value }, saved: false }))} />
              )}
              <button type="button" className={`${s.distToggle}${detail.defaultsDistMode ? ' ' + s.on : ''}`}
                onClick={() => setDetail(p => ({ ...p, defaultsDistMode: !p.defaultsDistMode, defaults: { ...p.defaults, ...(p.defaultsDistMode ? { dist: '' } : {}) }, saved: false }))}
                aria-label={detail.defaultsDistMode ? 'Usar Séries×Reps' : 'Usar Distância/Calorias'}
                title={detail.defaultsDistMode ? 'Usar Séries×Reps' : 'Usar Distância/Calorias'}>
                <i className={`ti ${detail.defaultsDistMode ? 'ti-repeat' : 'ti-ruler-2'}`} />
              </button>
            </div>
            <IntensityInput
              value={detail.defaults.intensity}
              onChange={ins => setDetail(p => ({ ...p, defaults: { ...p.defaults, intensity: ins }, saved: false }))}
              defaultReps={detail.defaults.reps}
              defaultSets={detail.defaults.sets}
            />
          </div>

          {/* Video URL + published toggle */}
          <div>
            <div className={s.videoHead}>
              <div className={s.sLabel} style={{ marginBottom: 0 }}>Vídeo (YouTube)</div>
              <button type="button" className={`${s.pubToggle}${detail.videoPublished ? ' ' + s.on : ''}`}
                onClick={() => setDetail(p => ({ ...p, videoPublished: !p.videoPublished, saved: false }))}
                aria-pressed={detail.videoPublished}
                aria-label={detail.videoPublished ? 'Vídeo publicado — clique para ocultar' : 'Vídeo oculto — clique para publicar'}>
                {detail.videoPublished ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className={s.videoRow}>
              <input className={s.videoInput} placeholder="https://youtu.be/..." value={detail.videoUrl} aria-label="URL do vídeo"
                onChange={e => setDetail(p => ({ ...p, videoUrl: e.target.value, saved: false }))}
              />
              {videoId && (
                <Button variant="secondary" iconOnly onClick={() => setShowVideoModal(true)} aria-label="Pré-visualizar vídeo" title="Pré-visualizar vídeo">
                  <i className="ti ti-player-play" />
                </Button>
              )}
            </div>
          </div>

          {/* Description */}
          <Input as="textarea" label="Descrição" placeholder="Descrição breve do movimento..." value={detail.description} rows={2}
            onChange={e => setDetail(p => ({ ...p, description: e.target.value, saved: false }))}
          />

          {/* Muscles */}
          <Input label="Músculo(s) Alvo(s)" placeholder="Ex: Quadríceps, glúteos, isquiotibiais." value={detail.muscles}
            onChange={e => setDetail(p => ({ ...p, muscles: e.target.value, saved: false }))}
          />

          {/* Notes / Detalhe */}
          <Input as="textarea" label="Detalhe" placeholder="Observações, cuidados ou pontos de atenção..." value={detail.notes} rows={2}
            onChange={e => setDetail(p => ({ ...p, notes: e.target.value, saved: false }))}
          />
        </div>

        <div className={s.detailFoot}>
          <Button variant="primary" full onClick={saveDetail}>
            {detail.saved ? <><i className="ti ti-check" /> Salvo</> : 'Salvar'}
          </Button>
          <Button variant="destructive" iconOnly onClick={() => setPendingDelete(detail.origName)} aria-label="Remover exercício">
            <i className="ti ti-trash" />
          </Button>
        </div>
      </div>
    );
  };

  // ── Video modal ─────────────────────────────────────────────────────────────
  const videoId = detail ? extractYouTubeId(detail.videoUrl) : null;
  const VideoModal = showVideoModal && videoId ? (
    <div className={s.overlay} onClick={() => setShowVideoModal(false)}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-label={detail.name} onClick={e => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.modalTitle}>{detail.name}</span>
          <Button variant="ghost" size="sm" iconOnly onClick={() => setShowVideoModal(false)} aria-label="Fechar">
            <i className="ti ti-x" />
          </Button>
        </div>
        <div className={s.videoBox}>
          <iframe
            className={s.videoFrame}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`}
            allowFullScreen
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  ) : null;

  // ── Delete confirm ────────────────────────────────────────────────────────────
  const deleteBlocks = pendingDelete ? blocksOf(pendingDelete) : [];
  const DeleteConfirm = (
    <ConfirmReview
      open={!!pendingDelete}
      title="Remover exercício"
      editLabel="Cancelar"
      confirmLabel="Remover"
      onEdit={() => setPendingDelete(null)}
      onClose={() => setPendingDelete(null)}
      onConfirm={confirmDelete}
    >
      <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.5 }}>
        Remover <strong style={{ color: 'var(--cream)' }}>{pendingDelete}</strong> de{' '}
        {deleteBlocks.length} tipo{deleteBlocks.length !== 1 ? 's' : ''}? Vídeo, cargas
        padrão e descrição serão perdidos.
      </div>
    </ConfirmReview>
  );

  // ── Footer (count line) ───────────────────────────────────────────────────────
  const Footer = () => (
    <div className={s.footer}>
      <span className={s.footerCount}>{BLOCK_ORDER.length} tipos · {allEx.length} exercícios</span>
    </div>
  );

  // ── Mobile layout ───────────────────────────────────────────────────────────
  if (isMobile) {
    const BackBtn = ({ label }) => (
      <button type="button" className={s.backBtn} onClick={goBack}>
        <i className="ti ti-chevron-left" /> {label}
      </button>
    );
    return (
      <div className={s.mobileWrap}>
        {pane === 0 && renderPane1()}
        {pane === 1 && (
          <div className={s.mobilePane}>
            <BackBtn label="Tipos" />
            {renderPane2()}
          </div>
        )}
        {pane === 2 && (
          <div className={s.mobilePane}>
            <BackBtn label={selBlock || 'Todos'} />
            {renderPane3()}
          </div>
        )}
        <Footer />
        {VideoModal}
        {DeleteConfirm}
      </div>
    );
  }

  // ── Desktop layout ──────────────────────────────────────────────────────────
  return (
    <div className={s.wrap}>
      <div className={s.col1}>{renderPane1()}</div>
      <div className={s.col2}>{renderPane2()}</div>
      <div className={s.col3}>{renderPane3()}</div>
      <Footer />
      {VideoModal}
      {DeleteConfirm}
    </div>
  );
}
