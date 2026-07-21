import { useState, useEffect, useRef, useMemo } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { WodSlide } from '../../public/tv/slides.jsx';
import {
  uid, toISO, todayISO,
  loadAthletes, loadRegistry,
  loadTemplates, saveTemplates,
  loadSettings, saveSettings,
  loadLocations,
  getTargets,
} from '../../utils/storage';
import { APP_CONFIG } from '../../utils/config';
import { sessionBoxIds } from '../../public/lib/boxScope.js';
import { emptyS, emptyBlock, normalizeLegacyCardio, materializeBlocks, cloneBlocks } from './criador/blockModel.js';
import { BlockEditor } from './criador/BlockEditor';
import { CriadorTypePicker } from './criador/TypePicker';
import { WeekGrid } from './criador/WeekGrid';
import { TemplatesModal } from './criador/TemplatesModal';
import { RecurringModal } from './criador/RecurringModal';

// ── TrainingCreator ───────────────────────────────────────────────────────────
function TrainingCreator({ sessions, setSessions, blockNames, preload, onPreloadConsumed, onGoToPublish }) {
  const [form, setForm]                     = useState(emptyS());
  const [blocks, setBlocks]                 = useState([]);
  const [editing, setEditing]               = useState(null);
  const [showAlvoModal, setShowAlvoModal]   = useState(false);
  const [pendingDate, setPendingDate]       = useState(null);
  const [collapsedBlocks, setCollapsedBlocks] = useState({});
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [templates, setTemplates]           = useState(loadTemplates);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateFlash, setTemplateFlash]   = useState(null);
  const [recurringTpl, setRecurringTpl]     = useState(null);
  const [recurDays, setRecurDays]           = useState(new Set([1, 3, 5]));
  const [recurStart, setRecurStart]         = useState(todayISO);
  const [recurEnd, setRecurEnd]             = useState(() => { const d = new Date(); d.setDate(d.getDate() + 28); return toISO(d); });
  const [recurDone, setRecurDone]           = useState(null);
  const [weekOffset, setWeekOffset]         = useState(0);
  const [weekGridCollapsed, setWeekGridCollapsed] = useState(false);
  const boxLocs = useMemo(() => loadLocations().filter(l => l.type === 'box'), []);
  const [selBox, setSelBox]                 = useState('all');   // 'all' | 'none' | <locationId> — grid filter + new-session default
  // "Avisos do box" for index.html — a dated list. Each: { id, date, message, box, active }
  // where box is a locationId or 'all' (gym-wide). Lives in settings.value (anon-readable;
  // locations is anon-locked #81 and the index is public). The index shows the 3 most recent
  // active in-scope ones. #53.
  const [boxWarnings, setBoxWarnings]       = useState(() => { const w = loadSettings().boxWarnings; return Array.isArray(w) ? w : []; });
  const [isDirty, setIsDirty]               = useState(false);
  const [showSessNotes, setShowSessNotes]   = useState(false);
  const [undoToast, setUndoToast]           = useState(null);
  const undoTimerRef = useRef(null);
  const formRef = useRef();
  const weekGridRef = useRef();
  const [changedBlockFields, setChangedBlockFields] = useState({});
  const [changedSessionFields, setChangedSessionFields] = useState(() => new Set());
  const [activeTemplateId, setActiveTemplateId]     = useState(null);
  const [showUpdateTemplateModal, setShowUpdateTemplateModal] = useState(false);
  const [highlightedSessionId, setHighlightedSessionId] = useState(null);
  const [pendingDelete, setPendingDelete]           = useState(null);
  const [tvPreviewOpen, setTvPreviewOpen]           = useState(false);
  const isMobile        = useIsMobile();
  const previewPaneRef  = useRef(null);
  const [prevScale, setPrevScale] = useState(1);

  // Scale preview pane to fit container width
  useEffect(() => {
    const el = previewPaneRef.current;
    if (!el || !tvPreviewOpen) return;
    const obs = new ResizeObserver(() => setPrevScale(el.clientWidth / 1920));
    obs.observe(el);
    setPrevScale(el.clientWidth / 1920);
    return () => obs.disconnect();
  }, [tvPreviewOpen]);

  const trackSessionField = field =>
    setChangedSessionFields(prev => { const n = new Set(prev); n.add(field); return n; });

  const fireUndo = (msg, undoFn) => {
    clearTimeout(undoTimerRef.current);
    setUndoToast({ msg, undoFn });
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
  };

  // Read-merge-write the whole settings blob (mirrors Config.jsx) so theme/gymName survive.
  const persistWarnings = list => { setBoxWarnings(list); saveSettings({ ...loadSettings(), boxWarnings: list }); };
  const addWarning    = key => persistWarnings([{ id: uid(), date: todayISO(), box: key, message: '', active: true }, ...boxWarnings]);
  const patchWarning  = (id, patch) => persistWarnings(boxWarnings.map(w => w.id === id ? { ...w, ...patch } : w));
  const removeWarning = id => persistWarnings(boxWarnings.filter(w => w.id !== id));

  // Preload
  useEffect(() => {
    if (!preload) return;
    if (preload._newForDate) {
      setForm({ ...emptyS(), date: preload._newForDate });
      setBlocks([]);
      setEditing(null);
    } else {
      startEdit(preload, preload.date || preload._dateKey || '');
    }
    onPreloadConsumed?.();
  }, [preload]);

  // A NEW session inherits the selected box context; editing an existing one never
  // gets its box clobbered by switching the grid filter.
  useEffect(() => {
    if (!editing) setForm(f => ({ ...f, locationIds: (selBox === 'all' || selBox === 'none') ? [] : [selBox] }));
  }, [selBox, editing]);

  const startEdit = (s, dateKey) => {
    const targets = getTargets(s);
    const sName = typeof s.mainTraining === 'string' ? s.mainTraining : (s.sessionName || '');
    setForm({ ...s, date: dateKey, mainTraining: targets, sessionName: sName, locationIds: sessionBoxIds(s) });
    setBlocks(s.blocks?.length ? normalizeLegacyCardio(s.blocks) : []);
    setEditing({ dateKey, id: s.id });
    setIsDirty(false); setChangedBlockFields({}); setChangedSessionFields(new Set()); setActiveTemplateId(null);
    setShowSessNotes(!!(s.notes));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const cancel = () => {
    setForm(emptyS()); setBlocks([]); setEditing(null); setShowAlvoModal(false);
    setIsDirty(false); setShowSessNotes(false);
    setChangedBlockFields({}); setChangedSessionFields(new Set()); setActiveTemplateId(null);
  };

  // Templates
  const saveAsTemplate = () => {
    const name = (form.sessionName || '').trim() || `Template ${templates.length + 1}`;
    const tpl = { id: uid(), name, blocks: cloneBlocks(blocks) };
    const updated = [...templates, tpl];
    setTemplates(updated); saveTemplates(updated);
    setActiveTemplateId(tpl.id);
    setTemplateFlash(name); setTimeout(() => setTemplateFlash(null), 2000);
  };
  const applyTemplate = tpl => {
    setBlocks(normalizeLegacyCardio(cloneBlocks(tpl.blocks)));
    setForm(f => ({ ...f, sessionName: f.sessionName || tpl.name }));
    setShowTemplateModal(false);
    setActiveTemplateId(tpl.id);
    setChangedBlockFields({}); setChangedSessionFields(new Set());
  };
  const deleteTemplate = id => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated); saveTemplates(updated);
  };

  // TV Preview (Phase 4) — built from local form+blocks state, no Supabase round-trip
  const gymName        = loadSettings()?.gymName || '';
  const tvPreviewSess  = useMemo(() => ({ ...form, blocks }), [form, blocks]);
  const tvPreviewSessions = useMemo(() => ({ [form.date || todayISO()]: [tvPreviewSess] }), [form.date, tvPreviewSess]);
  const tvPreviewTv    = useMemo(() => ({ session_id: form.id, date_key: form.date || todayISO() }), [form.id, form.date]);

  // Recurring
  const recurPreviewDates = useMemo(() => {
    if (!recurStart || !recurEnd) return [];
    const out = [];
    const cur = new Date(recurStart + 'T12:00:00');
    const end = new Date(recurEnd + 'T12:00:00');
    while (cur <= end) {
      if (recurDays.has(cur.getDay())) out.push(toISO(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [recurStart, recurEnd, recurDays]);

  const applyRecurring = () => {
    if (!recurringTpl || !recurPreviewDates.length) return;
    setSessions(prev => {
      const next = { ...prev };
      recurPreviewDates.forEach(dateKey => {
        const session = { id: uid(), date: dateKey, sessionName: recurringTpl.name, mainTraining: [], locationIds: (selBox === 'all' || selBox === 'none') ? [] : [selBox], blocks: cloneBlocks(recurringTpl.blocks) };
        next[dateKey] = [...(next[dateKey] || []), session];
      });
      return next;
    });
    setRecurDone(recurPreviewDates.length);
    setTimeout(() => { setRecurDone(null); setRecurringTpl(null); }, 2500);
  };

  // Save / delete
  const saveS = () => {
    const emptyBlocks = blocks.filter(bl =>
      bl.type !== 'Estações' &&
      !(bl.exercises || []).some(e => (e.name || '').trim() || e.isComplex)
    );
    if (emptyBlocks.length > 0) {
      alert('Há blocos sem exercícios preenchidos. Adicione ao menos um exercício antes de salvar.');
      return;
    }
    const dateKey = form.date || todayISO();
    const savedId = editing?.id || form.id || uid();
    const session = { ...form, date: dateKey, blocks: materializeBlocks(normalizeLegacyCardio(blocks), loadRegistry()), id: savedId };

    const targetDate = new Date(dateKey + 'T12:00:00');
    const today = new Date();
    const targetSunday = new Date(targetDate); targetSunday.setDate(targetDate.getDate() - targetDate.getDay());
    const thisSunday = new Date(today); thisSunday.setDate(today.getDate() - today.getDay());
    const targetWeekOffset = Math.round((targetSunday - thisSunday) / (7 * 24 * 60 * 60 * 1000));

    setSessions(prev => {
      const next = { ...prev };
      if (editing) {
        const oldKey = editing.dateKey;
        if (oldKey !== dateKey) next[oldKey] = (next[oldKey] || []).filter(s => s.id !== editing.id);
        if ((next[dateKey] || []).some(s => s.id === editing.id))
          next[dateKey] = next[dateKey].map(s => s.id === editing.id ? session : s);
        else
          next[dateKey] = [...(next[dateKey] || []), session];
      } else {
        next[dateKey] = [...(next[dateKey] || []), session];
      }
      return next;
    });

    setWeekOffset(targetWeekOffset);
    setWeekGridCollapsed(false);
    setHighlightedSessionId(savedId);
    setTimeout(() => weekGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    setTimeout(() => setHighlightedSessionId(null), 2000);
    cancel();
  };

  const del = (dateKey, id) => {
    const sess = (sessions[dateKey] || []).find(s => s.id === id);
    setPendingDelete({ dateKey, id, sessionName: sess?.sessionName || '—' });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { dateKey, id, sessionName } = pendingDelete;
    const snap = (sessions[dateKey] || []).find(s => s.id === id);
    setSessions(prev => { const n = { ...prev }; n[dateKey] = (n[dateKey] || []).filter(s => s.id !== id); return n; });
    setPendingDelete(null);
    if (snap) {
      fireUndo(`Sessão "${sessionName}" removida`, () => {
        setSessions(prev => { const n = { ...prev }; n[dateKey] = [...(n[dateKey] || []), snap]; return n; });
      });
    }
  };

  const updateTemplate = () => {
    if (!activeTemplateId) return;
    setTemplates(prev => {
      const updated = prev.map(t => t.id === activeTemplateId ? { ...t, blocks: cloneBlocks(blocks) } : t);
      saveTemplates(updated);
      return updated;
    });
    setActiveTemplateId(null);
    setShowUpdateTemplateModal(false);
  };

  // Block management
  const [insertAtIdx, setInsertAtIdx] = useState(null);
  const addBlock = typeOrBlock => {
    const rawBlk = typeof typeOrBlock === 'string' ? emptyBlock(typeOrBlock) : { ...typeOrBlock, id: uid() };
    // Benchmark blocks (buildBenchmarkBlock) can still carry legacy cardio-mode Run legs (Helen, Murph...) — normalize on insert.
    const newBlk = normalizeLegacyCardio([rawBlk])[0];
    setBlocks(b => {
      if (insertAtIdx === null) return [...b, newBlk];
      const next = [...b]; next.splice(insertAtIdx + 1, 0, newBlk); return next;
    });
    setInsertAtIdx(null);
    setShowBlockPicker(false);
    setIsDirty(true);
  };
  const copyBlock = id => {
    setBlocks(b => {
      const idx = b.findIndex(x => x.id === id);
      if (idx < 0) return b;
      const orig = b[idx];
      const copy = { ...orig, id: uid(), exercises: (orig.exercises || []).map(ex => ({ ...ex, id: uid() })) };
      const next = [...b]; next.splice(idx + 1, 0, copy); return next;
    });
    setIsDirty(true);
  };
  const updBlock = (id, upd) => {
    const old = blocks.find(x => x.id === id);
    setBlocks(b => b.map(x => x.id === id ? upd : x));
    setIsDirty(true);
    if (!old) return;
    const newFields = new Set();
    ['label', 'type', 'duration', 'rounds', 'notes', 'zone', 'ladderMode'].forEach(f => {
      if (upd[f] !== old[f]) newFields.add(f);
    });
    const oldExs = old.exercises || [];
    (upd.exercises || []).forEach(ex => {
      const oldEx = oldExs.find(x => x.id === ex.id);
      if (!oldEx || JSON.stringify(ex) !== JSON.stringify(oldEx)) newFields.add(`ex:${ex.id}`);
    });
    if (!newFields.size) return;
    setChangedBlockFields(prev => {
      const cur = new Set(prev[id] || []);
      newFields.forEach(f => cur.add(f));
      return { ...prev, [id]: cur };
    });
  };
  const delBlock = id => {
    const idx = blocks.findIndex(x => x.id === id);
    if (blocks.length <= 1 || idx < 0) return;
    const deleted = blocks[idx];
    setBlocks(b => b.filter(x => x.id !== id));
    setIsDirty(true);
    fireUndo('Bloco removido', () => {
      setBlocks(b => { const n = [...b]; n.splice(idx, 0, deleted); return n; });
    });
  };

  const dragBlkIdx = useRef(null);
  const [dragOverBlkIdx, setDragOverBlkIdx] = useState(null);
  const reorderBlocks = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx === null || toIdx === null) return;
    setBlocks(prev => {
      const arr = [...prev];
      const [mv] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, mv);
      return arr;
    });
  };

  // Week grid
  const getSundayWeek = offset => {
    const d = new Date();
    const dow = d.getDay();
    d.setDate(d.getDate() - dow + offset * 7);
    return Array.from({ length: 7 }, (_, i) => { const w = new Date(d); w.setDate(d.getDate() + i); return w; });
  };
  const weekDates = getSundayWeek(weekOffset);
  const totalSessions = Object.values(sessions).flat().length;
  // Box grid filter: 'all' shows everything, 'none' shows only box-less sessions, an id shows that box.
  const boxFilter = s => selBox === 'all' ? true : selBox === 'none' ? sessionBoxIds(s).length === 0 : sessionBoxIds(s).includes(selBox);
  const weekLabel = `${weekDates[0].getDate()}/${weekDates[0].getMonth()+1} – ${weekDates[6].getDate()}/${weekDates[6].getMonth()+1}/${weekDates[6].getFullYear()}`;

  const athletes = loadAthletes();
  const targets = Array.isArray(form.mainTraining) ? form.mainTraining : [];

  return (
    <div>
      {/* ── Pending date confirm ── */}
      {pendingDate && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <div className="confirm-msg">
              Mover sessão de {new Date(pendingDate.oldDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} para {new Date(pendingDate.newDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}?
            </div>
            <div className="confirm-btns">
              <button type="button" className="b bsm" onClick={() => setPendingDate(null)}>Cancelar</button>
              <button type="button" className="b bp bsm" onClick={() => { setForm(f => ({ ...f, date: pendingDate.newDate })); setPendingDate(null); }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {pendingDelete && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <div className="confirm-msg">
              Remover sessão <strong>{pendingDelete.sessionName}</strong>?
            </div>
            <div className="confirm-btns">
              <button type="button" className="b bsm" onClick={() => setPendingDelete(null)}>Cancelar</button>
              <button type="button" className="b bd bsm" onClick={confirmDelete}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Update template confirm ── */}
      {showUpdateTemplateModal && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <div className="confirm-msg">
              Atualizar o template <strong>{templates.find(t => t.id === activeTemplateId)?.name || ''}</strong> com os blocos atuais?
            </div>
            <div className="confirm-btns">
              <button type="button" className="b bsm" onClick={() => setShowUpdateTemplateModal(false)}>Cancelar</button>
              <button type="button" className="b bp bsm" onClick={updateTemplate}>Atualizar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Undo toast ── */}
      {undoToast && (
        <div style={{ position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center', zIndex: 3500, boxShadow: '0 4px 20px rgba(0,0,0,.7)', fontSize: 13, color: '#ccc', whiteSpace: 'nowrap' }}>
          {undoToast.msg}
          <button type="button" className="b bsm" style={{ padding: '4px 12px', color: '#4ac8c0', borderColor: '#4ac8c0' }}
            onClick={() => { undoToast.undoFn(); setUndoToast(null); clearTimeout(undoTimerRef.current); }}>
            Desfazer
          </button>
        </div>
      )}

      {/* ── Template modal ── */}
      {showTemplateModal && !recurringTpl && (
        <TemplatesModal
          templates={templates}
          onClose={() => setShowTemplateModal(false)}
          onApply={applyTemplate}
          onDelete={deleteTemplate}
          onRecurring={tpl => { setShowTemplateModal(false); setRecurringTpl(tpl); }}
        />
      )}

      {/* ── Recurring modal ── */}
      {recurringTpl && (
        <RecurringModal
          recurringTpl={recurringTpl}
          onClose={() => setRecurringTpl(null)}
          recurDays={recurDays} setRecurDays={setRecurDays}
          recurStart={recurStart} setRecurStart={setRecurStart}
          recurEnd={recurEnd} setRecurEnd={setRecurEnd}
          recurPreviewDates={recurPreviewDates}
          recurDone={recurDone}
          onApply={applyRecurring}
        />
      )}

      {/* ── Athlete picker modal ── */}
      {showAlvoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowAlvoModal(false)}>
          <div style={{ background: '#0d0d0d', border: '1px solid #2e2e2e', borderRadius: 10, padding: 18, width: 320, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ccc' }}>Para quem é essa sessão?</span>
              <button type="button" className="b bsm" onClick={() => setShowAlvoModal(false)}><i className="ti ti-x" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto', marginBottom: 14 }}>
              {athletes.map(a => {
                const checked = targets.includes(a.name);
                return (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', background: checked ? 'rgba(74,200,192,.06)' : 'transparent', border: '1px solid ' + (checked ? 'rgba(74,200,192,.25)' : '#1e1e1e') }}>
                    <input type="checkbox" checked={checked}
                      onChange={() => { setForm(f => ({ ...f, mainTraining: checked ? targets.filter(n => n !== a.name) : [...targets, a.name] })); setIsDirty(true); trackSessionField('mainTraining'); }}
                      style={{ accentColor: a.color || 'var(--theme-accent)', width: 14, height: 14 }} />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: a.color || '#555', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#ccc', flex: 1 }}>{a.name}</span>
                    <span style={{ fontSize: 11, color: '#555' }}>{a.level || ''}</span>
                  </label>
                );
              })}
            </div>
            <button type="button" style={{ width: '100%', background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', border: 'none', padding: 9, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
              onClick={() => setShowAlvoModal(false)}>Confirmar</button>
          </div>
        </div>
      )}

      {/* ── Block type picker ── */}
      {showBlockPicker && (
        <CriadorTypePicker blockNames={blockNames} onSelect={addBlock} onClose={() => setShowBlockPicker(false)} />
      )}

      {/* ── Content area: flex when TV preview is open (desktop only) ── */}
      <div style={tvPreviewOpen && !isMobile ? { display: 'flex', gap: 24, alignItems: 'flex-start' } : {}}>
      <div style={tvPreviewOpen && !isMobile ? { flex: 1, minWidth: 0 } : {}}>

      {/* ── Session form ── */}
      <div className="sc-card" ref={formRef}>
        {/* Header */}
        <div className="sc-hdr">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="sc-title">{editing ? 'Editar sessão' : 'Nova sessão'}</span>
            {templateFlash && (
              <span style={{ fontSize: 11, color: '#9070d8' }}>
                <i className="ti ti-bookmark-filled" /> &ldquo;{templateFlash}&rdquo; salvo
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {onGoToPublish && (
              <button type="button" className="b bsm" style={{ borderColor: '#1a4a2a', color: '#40b878' }} onClick={onGoToPublish} title="Ir para Publicador">
                <i className="ti ti-calendar-event" /> Publicar
              </button>
            )}
            <button type="button" className="b bsm" style={{ borderColor: '#4a2880', color: '#9070d8' }} onClick={() => setShowTemplateModal(true)}>
              <i className="ti ti-template" /> Templates
            </button>
            {editing && <button type="button" className="b bsm" onClick={cancel}>Cancelar</button>}
            {!isMobile && (
              <button type="button" className="b bsm"
                title="Preview TV"
                style={{ borderColor: tvPreviewOpen ? '#4ac8c0' : undefined, color: tvPreviewOpen ? '#4ac8c0' : undefined }}
                onClick={() => setTvPreviewOpen(v => !v)}>
                <i className="ti ti-device-tv" /> TV
              </button>
            )}
          </div>
        </div>

        {/* Date + Name */}
        <div className="g2">
          <div className="fg">
            <span className="lbl">Data</span>
            <input type="date" value={form.date || todayISO()}
              style={changedSessionFields.has('date') ? { borderColor: 'rgba(74,200,192,0.65)' } : undefined}
              onChange={e => {
                const newDate = e.target.value;
                const oldDate = form.date || todayISO();
                if (editing && newDate !== oldDate) { setPendingDate({ newDate, oldDate }); e.target.value = oldDate; }
                else { setForm(f => ({ ...f, date: newDate })); setIsDirty(true); trackSessionField('date'); }
              }} />
          </div>
          <div className="fg">
            <span className="lbl">Nome da sessão</span>
            <input
              placeholder="ex: Semana 3 · D1 · Força Lower"
              value={form.sessionName || ''}
              style={changedSessionFields.has('sessionName') ? { borderColor: 'rgba(74,200,192,0.65)' } : undefined}
              onChange={e => { setForm(f => ({ ...f, sessionName: e.target.value })); setIsDirty(true); trackSessionField('sessionName'); }}
            />
          </div>
        </div>

        {/* Athletes */}
        <div className="fg" style={{ marginTop: 4 }}>
          <span className="lbl">Para quem</span>
          <button type="button" className="cr-athletes-btn"
            style={changedSessionFields.has('mainTraining') ? { borderColor: 'rgba(74,200,192,0.65)' } : undefined}
            onClick={() => setShowAlvoModal(true)}>
            <i className="ti ti-users" style={{ color: 'var(--theme-accent)', fontSize: 15 }} />
            {targets.length === 0
              ? <span style={{ color: '#444' }}>Nenhum atleta — clique para selecionar</span>
              : <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {targets.map((name, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'var(--theme-accent)22', color: 'var(--theme-accent)', border: '1px solid var(--theme-accent)44' }}>{name}</span>
                  ))}
                </div>
            }
          </button>
        </div>

        {/* Visibility */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="lbl" style={{ margin: 0 }}>Visibilidade</span>
          {[{ label: 'Público', val: true }, { label: 'Oculto', val: false }].map(({ label, val }) => {
            const active = val ? form.public !== false : form.public === false
            return (
              <button key={label} type="button"
                onClick={() => { setForm(f => ({ ...f, public: val })); setIsDirty(true); trackSessionField('public') }}
                style={{
                  padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 4, fontFamily: 'inherit',
                  border: `1px solid ${active ? (val ? '#4ac8c0' : '#806850') : 'var(--div,#2a231c)'}`,
                  background: active ? (val ? 'rgba(74,200,192,.1)' : 'rgba(128,104,80,.12)') : 'transparent',
                  color: active ? (val ? '#4ac8c0' : '#806850') : '#554a3a',
                  cursor: 'pointer',
                }}>
                {label}
              </button>
            )
          })}
        </div>

        {/* Box — which location(s) this session belongs to (drives per-box scoping). Multi-select,
            same "toggle to add/remove" pattern as exercise categories: a session with any box tag
            is visible only under those boxes' scoped links, never on the untagged general view
            (see boxScope.js inBoxScope) — "Sem box" is the 0-tags state, not a tag itself. */}
        {boxLocs.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="lbl" style={{ margin: 0 }}>Box</span>
            {[{ id: null, name: 'Sem box' }, ...boxLocs].map(b => {
              const ids = form.locationIds || [];
              const active = b.id === null ? ids.length === 0 : ids.includes(b.id);
              const accent = b.color || '#806850';
              return (
                <button key={b.id || 'none'} type="button"
                  onClick={() => {
                    setForm(f => {
                      const cur = f.locationIds || [];
                      const next = b.id === null ? [] : (cur.includes(b.id) ? cur.filter(x => x !== b.id) : [...cur, b.id]);
                      return { ...f, locationIds: next };
                    });
                    setIsDirty(true); trackSessionField('locationIds');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 4, fontFamily: 'inherit', cursor: 'pointer',
                    border: `1px solid ${active ? accent : 'var(--div,#2a231c)'}`,
                    background: active ? `${b.color || '#806850'}1a` : 'transparent',
                    color: active ? accent : '#554a3a' }}>
                  {b.id && <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color || '#555', flexShrink: 0 }} />}
                  {b.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Session notes */}
        <div style={{ marginTop: 6 }}>
          <button type="button" className="blk-adv-toggle" onClick={() => setShowSessNotes(v => !v)}>
            <i className={`ti ti-chevron-${showSessNotes ? 'up' : 'down'}`} />
            Briefing da sessão{form.notes ? <span style={{ color: '#4ac8c0', fontSize: 10, marginLeft: 4 }}>●</span> : null}
          </button>
          {showSessNotes && (
            <textarea
              className="blk-notes-quick"
              style={{ marginTop: 6, ...(changedSessionFields.has('notes') ? { borderColor: 'rgba(74,200,192,0.65)' } : {}) }}
              placeholder="Contexto, objetivos, link de vídeo, regras..."
              value={form.notes || ''}
              onChange={e => { setForm(f => ({ ...f, notes: e.target.value })); setIsDirty(true); trackSessionField('notes'); }}
            />
          )}
        </div>

        {/* Blocks */}
        <div style={{ borderTop: '1px solid #242424', paddingTop: 14, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: blocks.length ? 10 : 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {blocks.length ? `${blocks.length} Bloco${blocks.length !== 1 ? 's' : ''}` : 'Blocos'}
            </span>
            {blocks.length > 1 && (
              <div className="collapse-all-row" style={{ margin: 0 }}>
                <button type="button" className="collapse-all-btn" onClick={() => setCollapsedBlocks(Object.fromEntries(blocks.map(b => [b.id, true])))}>
                  <i className="ti ti-arrows-minimize" /> Recolher
                </button>
                <button type="button" className="collapse-all-btn" onClick={() => setCollapsedBlocks({})}>
                  <i className="ti ti-arrows-maximize" /> Expandir
                </button>
              </div>
            )}
          </div>

          {blocks.flatMap((bl, i) => {
            const editor = (
              <BlockEditor
                key={bl.id}
                block={bl} idx={i} total={blocks.length}
                blockNames={blockNames || APP_CONFIG.blockNames}
                onUpdate={upd => updBlock(bl.id, upd)}
                onDelete={() => delBlock(bl.id)}
                onCopy={() => copyBlock(bl.id)}
                collapsed={!!collapsedBlocks[bl.id]}
                onToggleCollapse={() => setCollapsedBlocks(p => ({ ...p, [bl.id]: !p[bl.id] }))}
                dragBlkIdx={dragBlkIdx} dragOverBlkIdx={dragOverBlkIdx}
                setDragOverBlkIdx={setDragOverBlkIdx} reorderBlocks={reorderBlocks} blockIdx={i}
                changedFields={changedBlockFields[bl.id] || null}
              />
            );
            if (i < blocks.length - 1) {
              return [editor, (
                <button key={`ins-${i}`} type="button" className="insert-blk-btn"
                  title="Inserir bloco aqui"
                  onClick={() => { setInsertAtIdx(i); setShowBlockPicker(true); }}>
                  <i className="ti ti-plus" />
                </button>
              )];
            }
            return [editor];
          })}

          {/* Add block */}
          <button type="button" className="add-blk-btn" style={{ width: '100%', marginBottom: 0 }} onClick={() => { setInsertAtIdx(null); setShowBlockPicker(true); }}>
            <i className="ti ti-layout-grid-add" style={{ fontSize: 16 }} /> Adicionar bloco
          </button>
        </div>

        {/* Save row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" className="b bp bfull" onClick={saveS}
            style={isDirty ? { boxShadow: '0 0 0 2px #4ac8c040' } : undefined}>
            <i className="ti ti-check" />
            {isDirty && <span style={{ color: '#4ac8c0', fontSize: 11, marginLeft: 4 }}>●</span>}
            {' '}{editing ? 'Salvar alterações' : 'Salvar sessão'}
          </button>
          {blocks.length > 0 && (
            <button type="button" className="b bsm"
              style={{ borderColor: '#4a2880', color: '#9070d8', flexShrink: 0, minWidth: 38, background: activeTemplateId ? 'rgba(144,112,216,0.12)' : undefined }}
              title={activeTemplateId ? 'Template ativo — clique para atualizar' : 'Salvar como template'}
              onClick={activeTemplateId ? () => setShowUpdateTemplateModal(true) : saveAsTemplate}>
              <i className={`ti ${activeTemplateId ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
            </button>
          )}
        </div>
      </div>

      {/* ── Week grid ── */}
      {totalSessions > 0 && (
        <WeekGrid
          gridRef={weekGridRef}
          weekOffset={weekOffset} setWeekOffset={setWeekOffset}
          weekLabel={weekLabel}
          weekGridCollapsed={weekGridCollapsed} setWeekGridCollapsed={setWeekGridCollapsed}
          boxLocs={boxLocs} selBox={selBox} setSelBox={setSelBox}
          boxWarnings={boxWarnings} addWarning={addWarning} patchWarning={patchWarning} removeWarning={removeWarning}
          weekDates={weekDates}
          sessions={sessions} setSessions={setSessions}
          boxFilter={boxFilter}
          editing={editing}
          highlightedSessionId={highlightedSessionId}
          startEdit={startEdit}
          onDelete={del}
          formRef={formRef}
          setForm={setForm}
        />
      )}
      </div> {/* end left pane */}

      {/* ── TV Preview pane (desktop only, when toggled) ── */}
      {tvPreviewOpen && !isMobile && (
        <div style={{ flex: '0 0 38%', position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#806850', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-device-tv" style={{ color: '#4ac8c0' }} /> Preview TV
            <span style={{ fontSize: 9, color: '#554a3a', fontWeight: 400 }}>· atualiza em tempo real</span>
          </div>
          <div ref={previewPaneRef} style={{ width: '100%', aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#0d0b09', border: '1px solid #2a231c', borderRadius: 6 }}>
            <div style={{ width: 1920, height: 1080, transform: `scale(${prevScale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
              <WodSlide sessions={tvPreviewSessions} tv={tvPreviewTv} gymName={gymName} />
            </div>
          </div>
        </div>
      )}

      </div> {/* end content flex container */}
    </div>
  );
}

export default function CriadorTab({ sessions, setSessions, blockNames, preload, onPreloadConsumed, onGoToPublish }) {
  return <TrainingCreator sessions={sessions} setSessions={setSessions} blockNames={blockNames} preload={preload} onPreloadConsumed={onPreloadConsumed} onGoToPublish={onGoToPublish} />;
}
