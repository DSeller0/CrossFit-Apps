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
import { DAY_PT } from '../../public/lib/week.js';
import { sessionBoxIds } from '../../public/lib/boxScope.js';
import { emptyS, normalizeLegacyCardio, materializeBlocks, cloneBlocks, emptyBlock } from './criador/blockModel.js';
import { BlockEditor } from './criador/BlockEditor';
import { CriadorTypePicker } from './criador/TypePicker';
import { WeekGrid } from './criador/WeekGrid';
import { TemplatesModal } from './criador/TemplatesModal';
import { RecurringModal } from './criador/RecurringModal';
import { SessionTextPane } from './criador/SessionTextPane';
import { WeekImportModal } from './criador/WeekImportModal';
import { SessionMetaModal } from './criador/SessionMetaModal';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import ConfirmReview, { ReadRow } from '../../public/shared/ConfirmReview.jsx';
import tm from './criador/textMode.module.css';
import cr from './criador/criador.module.css';

// ── TrainingCreator ───────────────────────────────────────────────────────────
// The page opens on THE WEEK (#58). It used to open on an empty session form with
// the week below it — but the coach thinks in weeks, and creating a session is a
// deliberate act, not the default state of the screen. So: the grid is the landing
// surface and renders even when empty, `+ sessão` / `+ Nova sessão` open the
// session-meta dialog, and confirming it opens the block editor.
function TrainingCreator({ sessions, setSessions, blockNames, preload, onPreloadConsumed, onGoToPublish }) {
  const [form, setForm]                     = useState(emptyS());
  const [blocks, setBlocks]                 = useState([]);
  const [editing, setEditing]               = useState(null);
  // The editor exists only while a session is open. `editing` alone can't carry this:
  // a NEW session is being edited but has no id/dateKey yet.
  const [editorOpen, setEditorOpen]         = useState(false);
  const [metaModal, setMetaModal]           = useState(null);  // { isEdit, draft }
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
  // Text mode (#92) is EDITOR UI STATE, never persisted: detalhado→texto
  // serializes, texto→detalhado parses. The blocks stay canonical either way.
  const [sessionMode, setSessionMode]       = useState('detalhado'); // 'detalhado' | 'texto'
  const [gridMode, setGridMode]             = useState('grade');     // 'grade' | 'texto'
  const [showImport, setShowImport]         = useState(false);
  const registry = useMemo(() => loadRegistry(), []);
  const boxLocs = useMemo(() => loadLocations().filter(l => l.type === 'box'), []);
  const [selBox, setSelBox]                 = useState('all');   // 'all' | 'none' | <locationId> — grid filter + new-session default
  // "Avisos do box" for index.html — a dated list. Each: { id, date, message, box, active }
  // where box is a locationId or 'all' (gym-wide). Lives in settings.value (anon-readable;
  // locations is anon-locked #81 and the index is public). The index shows the 3 most recent
  // active in-scope ones. #53.
  const [boxWarnings, setBoxWarnings]       = useState(() => { const w = loadSettings().boxWarnings; return Array.isArray(w) ? w : []; });
  const [isDirty, setIsDirty]               = useState(false);
  const [undoToast, setUndoToast]           = useState(null);
  const undoTimerRef = useRef(null);
  const editorRef = useRef();
  const weekGridRef = useRef();
  const [changedBlockFields, setChangedBlockFields] = useState({});
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

  // ── Opening / closing the editor ───────────────────────────────────────────
  const startEdit = (s, dateKey) => {
    const targets = getTargets(s);
    const sName = typeof s.mainTraining === 'string' ? s.mainTraining : (s.sessionName || '');
    setForm({ ...s, date: dateKey, mainTraining: targets, sessionName: sName, locationIds: sessionBoxIds(s) });
    setBlocks(s.blocks?.length ? normalizeLegacyCardio(s.blocks) : []);
    setEditing({ dateKey, id: s.id });
    setEditorOpen(true);
    setWeekGridCollapsed(true);
    setIsDirty(false); setChangedBlockFields({}); setActiveTemplateId(null);
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  // A new session inherits the browsing filter's box — the coach is almost always
  // building for the box he is looking at.
  const openNewSession = dateKey => setMetaModal({
    isEdit: false,
    draft: {
      ...emptyS(),
      date: dateKey || todayISO(),
      locationIds: (selBox === 'all' || selBox === 'none') ? [] : [selBox],
    },
  });

  // Clicking a day: open that day's session if there is one, otherwise start a new
  // one there. Same gesture on the full grid and on the collapsed strip.
  const pickDay = dateKey => {
    const first = (sessions[dateKey] || []).filter(boxFilter)[0];
    if (first) startEdit(first, dateKey);
    else openNewSession(dateKey);
  };

  const closeEditor = () => {
    setForm(emptyS()); setBlocks([]); setEditing(null); setEditorOpen(false);
    setWeekGridCollapsed(false); setSessionMode('detalhado');
    setIsDirty(false);
    setChangedBlockFields({}); setActiveTemplateId(null);
  };

  // ── Session meta (date/name/audience/visibility/box/briefing) ──────────────
  const commitMeta = draft => {
    const wasDate = form.date || todayISO();
    setMetaModal(null);

    if (metaModal?.isEdit) {
      // Moving an already-saved session to another day is the one meta change that
      // needs confirming — it rewrites which day the athletes see it on.
      if (editing && draft.date !== wasDate) {
        setPendingDate({ draft, oldDate: wasDate, newDate: draft.date });
        return;
      }
      setForm(f => ({ ...f, ...draft }));
      setIsDirty(true);
      return;
    }

    // New session — the meta dialog IS the create step.
    setForm(draft);
    setBlocks([]);
    setEditing(null);
    setEditorOpen(true);
    setWeekGridCollapsed(true);
    setIsDirty(true); setChangedBlockFields({}); setActiveTemplateId(null);
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  // Preload from another tab
  useEffect(() => {
    if (!preload) return;
    if (preload._newForDate) openNewSession(preload._newForDate);
    else startEdit(preload, preload.date || preload._dateKey || '');
    onPreloadConsumed?.();
  }, [preload]);

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
    setChangedBlockFields({});
    // A template applied from the week view has to land somewhere — open the editor.
    if (!editorOpen) { setEditorOpen(true); setWeekGridCollapsed(true); }
    setIsDirty(true);
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
    setHighlightedSessionId(savedId);
    setTimeout(() => weekGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    setTimeout(() => setHighlightedSessionId(null), 2000);
    closeEditor();
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
    if (editing?.id === id) closeEditor();
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
    ['label', 'type', 'duration', 'rounds', 'notes', 'zone', 'ladderMode', 'goal'].forEach(f => {
      if (JSON.stringify(upd[f]) !== JSON.stringify(old[f])) newFields.add(f);
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
    setIsDirty(true);
  };

  // Week grid
  const getSundayWeek = offset => {
    const d = new Date();
    const dow = d.getDay();
    d.setDate(d.getDate() - dow + offset * 7);
    return Array.from({ length: 7 }, (_, i) => { const w = new Date(d); w.setDate(d.getDate() + i); return w; });
  };
  const weekDates = getSundayWeek(weekOffset);
  // Box grid filter: 'all' shows everything, 'none' shows only box-less sessions, an id shows that box.
  const boxFilter = s => selBox === 'all' ? true : selBox === 'none' ? sessionBoxIds(s).length === 0 : sessionBoxIds(s).includes(selBox);
  const weekLabel = `${weekDates[0].getDate()}/${weekDates[0].getMonth()+1} – ${weekDates[6].getDate()}/${weekDates[6].getMonth()+1}/${weekDates[6].getFullYear()}`;

  const athletes = loadAthletes();
  const editorDate = new Date((form.date || todayISO()) + 'T12:00:00');
  const editorDateStr = `${DAY_PT[editorDate.getDay()]} ${String(editorDate.getDate()).padStart(2, '0')}/${String(editorDate.getMonth() + 1).padStart(2, '0')}`;
  const editorBoxes = (form.locationIds || []).map(id => boxLocs.find(b => b.id === id)).filter(Boolean);

  return (
    <div>
      {/* ── Move-session-to-another-date confirm ── */}
      <ConfirmReview
        open={!!pendingDate}
        title="Mover sessão de dia"
        editLabel="Manter o dia" confirmLabel="Mover"
        onEdit={() => {
          // Keep every other meta edit; only the date reverts.
          if (pendingDate) setForm(f => ({ ...f, ...pendingDate.draft, date: pendingDate.oldDate }));
          setPendingDate(null);
        }}
        onConfirm={() => {
          if (pendingDate) { setForm(f => ({ ...f, ...pendingDate.draft })); setIsDirty(true); }
          setPendingDate(null);
        }}
      >
        <ReadRow label="De" value={pendingDate ? new Date(pendingDate.oldDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) : ''} />
        <ReadRow label="Para" value={pendingDate ? new Date(pendingDate.newDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) : ''} />
      </ConfirmReview>

      {/* ── Delete confirm ── */}
      <ConfirmReview
        open={!!pendingDelete}
        title="Remover sessão"
        editLabel="Cancelar" confirmLabel="Remover"
        onEdit={() => setPendingDelete(null)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      >
        <ReadRow label="Sessão" value={pendingDelete?.sessionName || '—'} />
        <ReadRow label="Dia" value={pendingDelete ? new Date(pendingDelete.dateKey + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) : ''} />
      </ConfirmReview>

      {/* ── Update template confirm ── */}
      <ConfirmReview
        open={showUpdateTemplateModal}
        title="Atualizar template"
        editLabel="Cancelar" confirmLabel="Atualizar"
        onEdit={() => setShowUpdateTemplateModal(false)}
        onClose={() => setShowUpdateTemplateModal(false)}
        onConfirm={updateTemplate}
      >
        <ReadRow label="Template" value={templates.find(t => t.id === activeTemplateId)?.name || ''} />
        <ReadRow label="Blocos" value={`${blocks.length}`} />
      </ConfirmReview>

      {/* ── Undo toast ── */}
      {undoToast && (
        <div className={cr.toast} role="status">
          {undoToast.msg}
          <Button size="sm" onClick={() => { undoToast.undoFn(); setUndoToast(null); clearTimeout(undoTimerRef.current); }}>
            Desfazer
          </Button>
        </div>
      )}

      {/* ── Session meta modal — create, and "Editar dados" from the editor header ── */}
      {metaModal && (
        <SessionMetaModal
          initial={metaModal.draft}
          isEdit={metaModal.isEdit}
          athletes={athletes}
          boxLocs={boxLocs}
          onCancel={() => setMetaModal(null)}
          onConfirm={commitMeta}
        />
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

      {/* ── Block type picker ── */}
      {showBlockPicker && (
        <CriadorTypePicker blockNames={blockNames} onSelect={addBlock} onClose={() => setShowBlockPicker(false)} />
      )}

      {/* ── Week import (#92) — one paste, one session per weekday ── */}
      {showImport && (
        <WeekImportModal
          weekDates={weekDates} weekLabel={weekLabel}
          sessions={sessions} boxFilter={boxFilter}
          boxLocs={boxLocs} selBox={selBox}
          onPrevWeek={() => setWeekOffset(o => o - 1)}
          onNextWeek={() => setWeekOffset(o => o + 1)}
          onClose={() => setShowImport(false)}
          onCreate={created => {
            setSessions(prev => {
              const next = { ...prev };
              created.forEach(({ dateKey, session }) => {
                next[dateKey] = [...(next[dateKey] || []), { ...session, blocks: materializeBlocks(session.blocks, registry) }];
              });
              return next;
            });
            setShowImport(false);
            setWeekGridCollapsed(false);
            setTimeout(() => weekGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          }}
        />
      )}

      {/* ── Content area: flex when TV preview is open (desktop only) ── */}
      <div className={tvPreviewOpen && !isMobile ? cr.split : undefined}>
      <div className={tvPreviewOpen && !isMobile ? cr.splitMain : undefined}>

      {/* ── Toolbar — the page's actions, above the week ── */}
      {!editorOpen && (
        <div className={cr.toolbar}>
          <span className={cr.toolbarTitle}>Criador</span>
          <span className={cr.toolbarSpacer} />
          <Button size="sm" onClick={() => setShowImport(true)} title="Colar a semana inteira de uma vez">
            <i className="ti ti-clipboard-text" /> Importar semana
          </Button>
          <Button size="sm" onClick={() => setShowTemplateModal(true)}>
            <i className="ti ti-template" /> Templates
          </Button>
          {onGoToPublish && (
            <Button size="sm" onClick={onGoToPublish} title="Ir para Publicador">
              <i className="ti ti-calendar-event" /> Publicar
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={() => openNewSession(todayISO())}>
            <i className="ti ti-plus" /> Nova sessão
          </Button>
        </div>
      )}

      {/* ── The week. Always rendered — an empty week IS this page's empty state, with
             its day columns and their "+ sessão" affordances. While editing it stays
             on screen as the collapsed day strip on desktop; on mobile the editor
             takes the whole screen and the week steps aside. ── */}
      {(!editorOpen || !isMobile) && (
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
          onPickDay={pickDay}
          gridMode={gridMode} setGridMode={setGridMode}
          onImport={() => setShowImport(true)}
        />
      )}

      {/* ── Session editor ── */}
      {editorOpen && (
        <div ref={editorRef}>
        <Card>
          <div className={cr.editorHd}>
            {isMobile && (
              <button type="button" className={cr.editorBack} onClick={closeEditor}>
                <i className="ti ti-chevron-left" aria-hidden="true" /> Voltar à semana
              </button>
            )}
            <span className={cr.editorDate}>{editorDateStr}</span>
            <span className={cr.editorName}>{form.sessionName?.trim() || 'Sessão sem nome'}</span>
            {editorBoxes.map(b => (
              <span key={b.id} className={cr.editorTag} style={{ borderColor: b.color, color: b.color }}>
                <span className={cr.dot} style={{ background: b.color || 'var(--muted)' }} />{b.name}
              </span>
            ))}
            <span className={`${cr.editorTag}${form.public === false ? ' ' + cr.editorTagHidden : ''}`}>
              {form.public === false ? 'Oculto' : 'Público'}
            </span>
            {templateFlash && (
              <span className={cr.editorTag}>
                <i className="ti ti-bookmark-filled" aria-hidden="true" /> &ldquo;{templateFlash}&rdquo; salvo
              </span>
            )}
            <span className={cr.editorHdSpacer} />
            <Button size="sm" onClick={() => setMetaModal({ isEdit: true, draft: { ...form } })}>
              <i className="ti ti-settings" /> Editar dados
            </Button>
            {blocks.length > 0 && (
              <Button size="sm" iconOnly
                aria-label={activeTemplateId ? 'Template ativo — clique para atualizar' : 'Salvar como template'}
                title={activeTemplateId ? 'Template ativo — clique para atualizar' : 'Salvar como template'}
                onClick={activeTemplateId ? () => setShowUpdateTemplateModal(true) : saveAsTemplate}>
                <i className={`ti ${activeTemplateId ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
              </Button>
            )}
            {!isMobile && (
              <Button size="sm" iconOnly aria-label="Preview TV" title="Preview TV"
                aria-pressed={tvPreviewOpen}
                onClick={() => setTvPreviewOpen(v => !v)}>
                <i className="ti ti-device-tv" />
              </Button>
            )}
            {!isMobile && <Button size="sm" onClick={closeEditor}>Fechar</Button>}
            <Button size="sm" variant="primary" onClick={saveS}>
              <i className="ti ti-check" /> {editing ? 'Salvar alterações' : 'Salvar sessão'}
              {isDirty && <span aria-hidden="true"> ●</span>}
            </Button>
          </div>

          {/* Blocks */}
          <div>
            <div className={cr.blocksBar}>
              <span className={cr.blocksCount}>
                {blocks.length ? `${blocks.length} Bloco${blocks.length !== 1 ? 's' : ''}` : 'Blocos'}
              </span>
              <div className={cr.blocksBarActions}>
                {blocks.length > 1 && sessionMode === 'detalhado' && (
                  <>
                    <Button size="xs" variant="ghost" onClick={() => setCollapsedBlocks(Object.fromEntries(blocks.map(b => [b.id, true])))}>
                      <i className="ti ti-arrows-minimize" /> Recolher
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setCollapsedBlocks({})}>
                      <i className="ti ti-arrows-maximize" /> Expandir
                    </Button>
                  </>
                )}
                {/* Detalhado / Texto — the whole session as the coach's own notation */}
                <span className={tm.modeSeg} role="group" aria-label="Modo de edição da sessão">
                  <button type="button" className={sessionMode === 'detalhado' ? tm.on : ''}
                    aria-pressed={sessionMode === 'detalhado'} onClick={() => setSessionMode('detalhado')}>▤ Detalhado</button>
                  <button type="button" className={sessionMode === 'texto' ? tm.on : ''}
                    aria-pressed={sessionMode === 'texto'} onClick={() => setSessionMode('texto')}>¶ Texto</button>
                </span>
              </div>
            </div>

            {sessionMode === 'texto' && (
              <SessionTextPane
                blocks={blocks}
                registry={registry}
                blockNames={blockNames || APP_CONFIG.blockNames}
                typePicker={CriadorTypePicker}
                onCancel={() => setSessionMode('detalhado')}
                onApply={parsed => {
                  setBlocks(normalizeLegacyCardio(parsed));
                  setIsDirty(true);
                  setCollapsedBlocks({});
                  setSessionMode('detalhado');
                }}
              />
            )}

            {sessionMode === 'detalhado' && blocks.flatMap((bl, i) => {
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
                  registry={registry}
                />
              );
              if (i < blocks.length - 1) {
                return [editor, (
                  <button key={`ins-${i}`} type="button" className="insert-blk-btn"
                    aria-label={`Inserir bloco depois do bloco ${i + 1}`}
                    title="Inserir bloco aqui"
                    onClick={() => { setInsertAtIdx(i); setShowBlockPicker(true); }}>
                    <i className="ti ti-plus" />
                  </button>
                )];
              }
              return [editor];
            })}

            {/* Add block */}
            {sessionMode === 'detalhado' && (
              <button type="button" className="add-blk-btn" style={{ width: '100%', marginBottom: 0 }} onClick={() => { setInsertAtIdx(null); setShowBlockPicker(true); }}>
                <i className="ti ti-layout-grid-add" style={{ fontSize: 16 }} /> Adicionar bloco
              </button>
            )}
          </div>

          {/* Save row — the header's save is out of reach once the block list is long. */}
          <div className={cr.mt3}>
            <Button variant="primary" full onClick={saveS}>
              <i className="ti ti-check" /> {editing ? 'Salvar alterações' : 'Salvar sessão'}
              {isDirty && <span aria-hidden="true"> ●</span>}
            </Button>
          </div>
        </Card>
        </div>
      )}
      </div> {/* end left pane */}

      {/* ── TV Preview pane (desktop only, when toggled) ── */}
      {tvPreviewOpen && !isMobile && editorOpen && (
        <div className={cr.splitAside}>
          <div className={cr.previewTitle}>
            <i className="ti ti-device-tv" aria-hidden="true" /> Preview TV
            <span className={cr.previewSub}>· atualiza em tempo real</span>
          </div>
          <div ref={previewPaneRef} className={cr.previewFrame}>
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
