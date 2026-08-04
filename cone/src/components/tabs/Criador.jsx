import { useState, useEffect, useRef, useMemo } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { todayISO, loadAthletes, loadRegistry, loadLocations } from '../../utils/storage'
import { DAY_PT } from '../../public/lib/week.js'
import { sessionBoxIds } from '../../public/lib/boxScope.js'
import { materializeBlocks } from './criador/blockModel.js'
import { CriadorTypePicker } from './criador/TypePicker'
import { WeekGrid } from './criador/WeekGrid'
import { TemplatesModal } from './criador/TemplatesModal'
import { RecurringModal } from './criador/RecurringModal'
import { WeekImportModal } from './criador/WeekImportModal'
import { SessionMetaModal } from './criador/SessionMetaModal'
import { CriadorToolbar } from './criador/CriadorToolbar.jsx'
import { CriadorConfirms } from './criador/CriadorConfirms.jsx'
import { SessionEditor } from './criador/SessionEditor.jsx'
import { TvPreviewPane } from './criador/TvPreviewPane.jsx'
import { useSessionEditor } from './criador/useSessionEditor.js'
import { useBlockList } from './criador/useBlockList.js'
import { useTemplates } from './criador/useTemplates.js'
import { useBoxWarnings } from './criador/useBoxWarnings.js'
import Button from '../ui/Button.jsx'
import cr from './criador/criador.module.css'

// ── CriadorTab ────────────────────────────────────────────────────────────────
// The page opens on THE WEEK (#58). It used to open on an empty session form with
// the week below it — but the coach thinks in weeks, and creating a session is a
// deliberate act, not the default state of the screen. So: the grid is the landing
// surface and renders even when empty, `+ sessão` / `+ Nova sessão` open the
// session-meta dialog, and confirming it opens the block editor.
//
// This file is the CONTAINER (#74-C/plans/62). It owns the week around the editor,
// the composition order of the two, and the measurement that keeps them both on
// screen; everything else lives in criador/: useSessionEditor · useBlockList ·
// useTemplates · useBoxWarnings, and SessionEditor · CriadorToolbar ·
// CriadorConfirms · TvPreviewPane.
export default function CriadorTab({
  sessions,
  setSessions,
  blockNames,
  preload,
  onPreloadConsumed,
  onGoToPublish,
}) {
  const isMobile = useIsMobile()
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekGridCollapsed, setWeekGridCollapsed] = useState(false)
  const [gridMode, setGridMode] = useState('grade') // 'grade' | 'texto'
  const [showImport, setShowImport] = useState(false)
  const [highlightedSessionId, setHighlightedSessionId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [tvPreviewOpen, setTvPreviewOpen] = useState(false)
  const [undoToast, setUndoToast] = useState(null)
  const undoTimerRef = useRef(null)
  const editorRef = useRef()
  const weekGridRef = useRef()
  const registry = useMemo(() => loadRegistry(), [])
  const boxLocs = useMemo(() => loadLocations().filter(l => l.type === 'box'), [])
  const [selBox, setSelBox] = useState('all') // 'all' | 'none' | <locationId> — grid filter + new-session default

  const fireUndo = (msg, undoFn) => {
    clearTimeout(undoTimerRef.current)
    setUndoToast({ msg, undoFn })
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000)
  }

  // ── The week ───────────────────────────────────────────────────────────────
  const getSundayWeek = offset => {
    const d = new Date()
    const dow = d.getDay()
    d.setDate(d.getDate() - dow + offset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const w = new Date(d)
      w.setDate(d.getDate() + i)
      return w
    })
  }
  const weekDates = getSundayWeek(weekOffset)
  // Box grid filter: 'all' shows everything, 'none' shows only box-less sessions, an id shows that box.
  const boxFilter = s =>
    selBox === 'all'
      ? true
      : selBox === 'none'
        ? sessionBoxIds(s).length === 0
        : sessionBoxIds(s).includes(selBox)
  const weekLabel = `${weekDates[0].getDate()}/${weekDates[0].getMonth() + 1} – ${weekDates[6].getDate()}/${weekDates[6].getMonth() + 1}/${weekDates[6].getFullYear()}`
  // A new session inherits the browsing filter's box.
  const defaultBoxIds = selBox === 'all' || selBox === 'none' ? [] : [selBox]

  // Bring the session into view — and no further. Scrolling it to the top of the
  // page would push the week grid off the screen, and the whole point of keeping
  // the grid while editing is seeing the week and the session together: at a normal
  // window size the editor is already below the grid and in view, so opening a
  // session scrolls nothing at all. It only moves when the editor genuinely isn't
  // visible — from a scrolled-down position, or with the grid collapsed.
  //
  // Not `scrollIntoView` with a CSS scroll-margin: the pinned block's height is not
  // a constant (week bar + box tabs, plus the day strip when the grid is collapsed),
  // so a fixed margin would be wrong in one of the two states. Measured, both work.
  //
  // 🔴 Stays in the container (#74-C): it needs BOTH refs and the pinned chrome's
  // live height. Injected into useSessionEditor as `onOpened`, never moved into it.
  const scrollToEditor = () => {
    const el = editorRef.current
    if (!el) return
    const chrome =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--spa-sticky-top'),
        10,
      ) || 88
    const stuck = weekGridRef.current?.getBoundingClientRect().height || 0
    const safeTop = chrome + stuck + 8 // first row of pixels the pinned chrome doesn't cover
    const { top } = el.getBoundingClientRect()
    if (top >= safeTop && top < window.innerHeight) return
    window.scrollTo({ top: Math.max(0, window.scrollY + top - safeTop), behavior: 'smooth' })
  }

  // ── State clusters ─────────────────────────────────────────────────────────
  const warnings = useBoxWarnings()
  const editor = useSessionEditor({
    setSessions,
    defaultBoxIds,
    onOpened: () => setTimeout(scrollToEditor, 60),
    // Saving jumps the week to the session and flashes it — week-view state, so the
    // hook writes the session and hands the reveal back here.
    onSaved: ({ savedId, weekOffset: target }) => {
      setWeekOffset(target)
      setHighlightedSessionId(savedId)
      setTimeout(
        () => weekGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        100,
      )
      setTimeout(() => setHighlightedSessionId(null), 2000)
    },
  })
  const blockList = useBlockList({
    blocks: editor.blocks,
    setBlocks: editor.setBlocks,
    markDirty: editor.markDirty,
    trackBlockChange: editor.trackBlockChange,
    fireUndo,
  })
  const templates = useTemplates({ editor, setSessions, defaultBoxIds })

  // Clicking a day: open that day's session if there is one, otherwise start a new
  // one there. Same gesture on the full grid and on the collapsed strip — a DAY
  // PICKER, not an add button. "+ sessão" wires straight to openNewSession
  // (onNewSession below) instead, so it always opens blank even on a day that
  // already has a session (#119/plans/58). Don't unify these back together.
  const pickDay = dateKey => {
    const first = (sessions[dateKey] || []).filter(boxFilter)[0]
    if (first) editor.startEdit(first, dateKey)
    else editor.openNewSession(dateKey)
  }

  // Preload from another tab. Reacting to a prop arriving, not to a render. The deps array
  // is deliberately just [preload]: the effect consumes the one-shot preload and calls
  // onPreloadConsumed, so adding startEdit/openNewSession/onPreloadConsumed (all
  // redefined every render) would re-fire it and reopen the session the coach just closed.
  useEffect(() => {
    if (!preload) return
    if (preload._newForDate) editor.openNewSession(preload._newForDate)
    else editor.startEdit(preload, preload.date || preload._dateKey || '')
    onPreloadConsumed?.()
  }, [preload]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Deleting a session ─────────────────────────────────────────────────────
  const del = (dateKey, id) => {
    const sess = (sessions[dateKey] || []).find(s => s.id === id)
    setPendingDelete({ dateKey, id, sessionName: sess?.sessionName || '—' })
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    const { dateKey, id, sessionName } = pendingDelete
    const snap = (sessions[dateKey] || []).find(s => s.id === id)
    setSessions(prev => {
      const n = { ...prev }
      n[dateKey] = (n[dateKey] || []).filter(s => s.id !== id)
      return n
    })
    setPendingDelete(null)
    if (editor.editing?.id === id) editor.closeEditor()
    if (snap) {
      fireUndo(`Sessão "${sessionName}" removida`, () => {
        setSessions(prev => {
          const n = { ...prev }
          n[dateKey] = [...(n[dateKey] || []), snap]
          return n
        })
      })
    }
  }

  const athletes = loadAthletes()
  const editorDate = new Date((editor.form.date || todayISO()) + 'T12:00:00')
  const editorDateStr = `${DAY_PT[editorDate.getDay()]} ${String(editorDate.getDate()).padStart(2, '0')}/${String(editorDate.getMonth() + 1).padStart(2, '0')}`
  const editorBoxes = (editor.form.locationIds || [])
    .map(id => boxLocs.find(b => b.id === id))
    .filter(Boolean)

  return (
    <div>
      <CriadorConfirms
        editor={editor}
        templates={templates}
        editorDateStr={editorDateStr}
        pendingDelete={pendingDelete}
        onCancelDelete={() => setPendingDelete(null)}
        onConfirmDelete={confirmDelete}
      />
      {/* ── Undo toast ── */}
      {undoToast && (
        <div className={cr.toast} role="status">
          {undoToast.msg}
          <Button
            size="sm"
            onClick={() => {
              undoToast.undoFn()
              setUndoToast(null)
              clearTimeout(undoTimerRef.current)
            }}
          >
            Desfazer
          </Button>
        </div>
      )}
      {/* ── Session meta modal — create, and "Editar dados" from the editor header ── */}
      {editor.metaModal && (
        <SessionMetaModal
          initial={editor.metaModal.draft}
          isEdit={editor.metaModal.isEdit}
          athletes={athletes}
          boxLocs={boxLocs}
          onCancel={() => editor.setMetaModal(null)}
          onConfirm={editor.commitMeta}
        />
      )}
      {/* ── Template modal ── */}
      {templates.showTemplateModal && !templates.recurringTpl && (
        <TemplatesModal
          templates={templates.templates}
          onClose={() => templates.setShowTemplateModal(false)}
          onApply={templates.applyTemplate}
          onDelete={templates.deleteTemplate}
          onRecurring={tpl => {
            templates.setShowTemplateModal(false)
            templates.setRecurringTpl(tpl)
          }}
        />
      )}
      {/* ── Recurring modal ── */}
      {templates.recurringTpl && (
        <RecurringModal
          recurringTpl={templates.recurringTpl}
          onClose={() => templates.setRecurringTpl(null)}
          recurDays={templates.recurDays}
          setRecurDays={templates.setRecurDays}
          recurStart={templates.recurStart}
          setRecurStart={templates.setRecurStart}
          recurEnd={templates.recurEnd}
          setRecurEnd={templates.setRecurEnd}
          recurPreviewDates={templates.recurPreviewDates}
          recurDone={templates.recurDone}
          onApply={templates.applyRecurring}
        />
      )}
      {/* ── Block type picker ── */}
      {blockList.showBlockPicker && (
        <CriadorTypePicker
          blockNames={blockNames}
          onSelect={blockList.addBlock}
          onClose={() => blockList.setShowBlockPicker(false)}
        />
      )}
      {/* ── Week import (#92) — one paste, one session per weekday ── */}
      {showImport && (
        <WeekImportModal
          weekDates={weekDates}
          weekLabel={weekLabel}
          sessions={sessions}
          boxFilter={boxFilter}
          boxLocs={boxLocs}
          selBox={selBox}
          registry={registry}
          onPrevWeek={() => setWeekOffset(o => o - 1)}
          onNextWeek={() => setWeekOffset(o => o + 1)}
          onClose={() => setShowImport(false)}
          onCreate={created => {
            setSessions(prev => {
              const next = { ...prev }
              created.forEach(({ dateKey, session }) => {
                next[dateKey] = [
                  ...(next[dateKey] || []),
                  { ...session, blocks: materializeBlocks(session.blocks, registry) },
                ]
              })
              return next
            })
            setShowImport(false)
            setWeekGridCollapsed(false)
            setTimeout(
              () => weekGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
              100,
            )
          }}
        />
      )}
      {/* ── Content area: flex when TV preview is open (desktop only) ── */}
      <div className={tvPreviewOpen && !isMobile ? cr.split : undefined}>
        <div className={tvPreviewOpen && !isMobile ? cr.splitMain : undefined}>
          {/* ── Toolbar — the page's actions, above the week ── */}
          {!editor.editorOpen && (
            <CriadorToolbar
              onImport={() => setShowImport(true)}
              onTemplates={() => templates.setShowTemplateModal(true)}
              onGoToPublish={onGoToPublish}
              onNewSession={() => editor.openNewSession(todayISO())}
            />
          )}

          {/* ── The week. Always rendered — an empty week IS this page's empty state, with
             its day columns and their "+ sessão" affordances. While editing it stays
             on screen as the collapsed day strip on desktop; on mobile the editor
             takes the whole screen and the week steps aside.
             🔴 Rendered directly here, never wrapped: WeekGrid returns a FRAGMENT so
             its sticky header isn't clipped by a parent box, and the grid/editor order
             below is the one two rejected redesigns tried to change. ── */}
          {(!editor.editorOpen || !isMobile) && (
            <WeekGrid
              gridRef={weekGridRef}
              weekOffset={weekOffset}
              setWeekOffset={setWeekOffset}
              weekLabel={weekLabel}
              weekGridCollapsed={weekGridCollapsed}
              setWeekGridCollapsed={setWeekGridCollapsed}
              boxLocs={boxLocs}
              selBox={selBox}
              setSelBox={setSelBox}
              boxWarnings={warnings.boxWarnings}
              addWarning={warnings.addWarning}
              patchWarning={warnings.patchWarning}
              removeWarning={warnings.removeWarning}
              weekDates={weekDates}
              sessions={sessions}
              setSessions={setSessions}
              boxFilter={boxFilter}
              editing={editor.editing}
              /* The day being worked on — form.date, not editing.dateKey: a new session
             has no dateKey, and a moved one is on its new day the moment you confirm. */
              activeDate={editor.editorOpen ? editor.form.date || todayISO() : null}
              highlightedSessionId={highlightedSessionId}
              startEdit={editor.startEdit}
              onDelete={del}
              onPickDay={pickDay}
              onNewSession={editor.openNewSession}
              gridMode={gridMode}
              setGridMode={setGridMode}
              onImport={() => setShowImport(true)}
            />
          )}

          {/* ── Session editor ── */}
          {editor.editorOpen && (
            <div ref={editorRef}>
              <SessionEditor
                editor={editor}
                blockList={blockList}
                templates={templates}
                isMobile={isMobile}
                registry={registry}
                blockNames={blockNames}
                editorDateStr={editorDateStr}
                editorBoxes={editorBoxes}
                tvPreviewOpen={tvPreviewOpen}
                onToggleTvPreview={() => setTvPreviewOpen(v => !v)}
              />
            </div>
          )}
        </div>{' '}
        {/* end left pane */}
        {/* ── TV Preview pane (desktop only, when toggled) ── */}
        {tvPreviewOpen && !isMobile && editor.editorOpen && (
          <TvPreviewPane form={editor.form} blocks={editor.blocks} />
        )}
      </div>{' '}
      {/* end content flex container */}
    </div>
  )
}
