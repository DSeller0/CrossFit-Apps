import ConfirmReview, { ReadRow } from '../../../public/shared/ConfirmReview.jsx'

const fmtDay = key =>
  key
    ? new Date(key + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      })
    : ''

// ── CriadorConfirms ───────────────────────────────────────────────────────────
// The page's four confirm dialogs in one place: move a session to another day ·
// remove a session · discard an unsaved edit · overwrite a template. Presentational
// — every answer is a function the editor/templates hooks already own, so nothing
// here decides anything.
export function CriadorConfirms({
  editor,
  templates,
  editorDateStr,
  pendingDelete,
  onCancelDelete,
  onConfirmDelete,
}) {
  const { pendingDate, pendingClose } = editor
  return (
    <>
      {/* ── Move-session-to-another-date confirm ── */}
      <ConfirmReview
        open={!!pendingDate}
        title="Mover sessão de dia"
        editLabel="Manter o dia"
        confirmLabel="Mover"
        onEdit={editor.keepMetaDate}
        onConfirm={editor.confirmMetaDate}
      >
        <ReadRow label="De" value={fmtDay(pendingDate?.oldDate)} />
        <ReadRow label="Para" value={fmtDay(pendingDate?.newDate)} />
      </ConfirmReview>
      {/* ── Delete confirm ── */}
      <ConfirmReview
        open={!!pendingDelete}
        title="Remover sessão"
        editLabel="Cancelar"
        confirmLabel="Remover"
        onEdit={onCancelDelete}
        onClose={onCancelDelete}
        onConfirm={onConfirmDelete}
      >
        <ReadRow label="Sessão" value={pendingDelete?.sessionName || '—'} />
        <ReadRow label="Dia" value={fmtDay(pendingDelete?.dateKey)} />
      </ConfirmReview>
      {/* ── Discard-on-close confirm ── */}
      <ConfirmReview
        open={pendingClose}
        title="Descartar alterações"
        editLabel="Voltar"
        confirmLabel="Descartar"
        onEdit={editor.cancelClose}
        onClose={editor.cancelClose}
        onConfirm={editor.closeEditor}
      >
        <ReadRow label="Sessão" value={editor.form.sessionName?.trim() || 'Sessão sem nome'} />
        <ReadRow label="Dia" value={editorDateStr} />
        <ReadRow label="Blocos" value={`${editor.blocks.length}`} />
      </ConfirmReview>
      {/* ── Update template confirm ── */}
      <ConfirmReview
        open={templates.showUpdateTemplateModal}
        title="Atualizar template"
        editLabel="Cancelar"
        confirmLabel="Atualizar"
        onEdit={() => templates.setShowUpdateTemplateModal(false)}
        onClose={() => templates.setShowUpdateTemplateModal(false)}
        onConfirm={templates.updateTemplate}
      >
        <ReadRow label="Template" value={templates.activeTemplateName} />
        <ReadRow label="Blocos" value={`${editor.blocks.length}`} />
      </ConfirmReview>
    </>
  )
}
