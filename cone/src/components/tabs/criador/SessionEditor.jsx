import { APP_CONFIG } from '../../../utils/config'
import { BlockEditor } from './BlockEditor'
import { CriadorTypePicker } from './TypePicker'
import { SessionTextPane } from './SessionTextPane'
import Button from '../../ui/Button.jsx'
import Card from '../../ui/Card.jsx'
import tm from './textMode.module.css'
import cr from './criador.module.css'

// ── SessionEditor ─────────────────────────────────────────────────────────────
// The open session: its header (two layouts, see below), the blocks bar with the
// Detalhado/Texto switch, the block list, and the footer save.
//
// It takes the two hooks' APIs whole (`editor`, `blockList`) rather than thirty
// individual props: this is the container's own editor surface, not a reusable
// component — nothing else renders it, and it renders nothing the container's
// state doesn't already own. Its `<div ref={editorRef}>` wrapper stays in the
// container, because scrollToEditor measures it against the pinned week chrome.
export function SessionEditor({
  editor,
  blockList,
  templates,
  isMobile,
  registry,
  blockNames,
  editorDateStr,
  editorBoxes,
  tvPreviewOpen,
  onToggleTvPreview,
}) {
  const { form, blocks, editing, isDirty, activeTemplateId, sessionMode, setSessionMode } = editor
  const names = blockNames || APP_CONFIG.blockNames
  const saveLabel = editing ? 'Salvar alterações' : 'Salvar sessão'
  const onTemplateBtn = activeTemplateId
    ? () => templates.setShowUpdateTemplateModal(true)
    : templates.saveAsTemplate
  const templateBtnLabel = activeTemplateId
    ? 'Template ativo — clique para atualizar'
    : 'Salvar como template'

  return (
    <Card>
      {isMobile ? (
        /* Four explicit rows — the coach reads this on a 390px screen, not
               1280px, so grouping by row beats one long flex-wrap line: close,
               then who/when, then where/visibility, then what you can do. No TV
               preview (desktop-only pane) and no red ✕ — "Voltar à semana" IS the
               close here, so a second one would be a redundant destructive action. */
        <div className={cr.editorHdMobile}>
          <button type="button" className={cr.editorBack} onClick={editor.requestClose}>
            <i className="ti ti-chevron-left" aria-hidden="true" /> Voltar à semana
          </button>
          <div className={cr.editorHdRow}>
            <span className={cr.editorDate}>{editorDateStr}</span>
            <span className={cr.editorName}>{form.sessionName?.trim() || 'Sessão sem nome'}</span>
          </div>
          <div className={cr.editorHdRow}>
            {editorBoxes.map(b => (
              <span
                key={b.id}
                className={cr.editorTag}
                style={{ borderColor: b.color, color: b.color }}
              >
                <span className={cr.dot} style={{ background: b.color || 'var(--muted)' }} />
                {b.name}
              </span>
            ))}
            <span
              className={`${cr.editorTag}${form.public === false ? ' ' + cr.editorTagHidden : ''}`}
            >
              {form.public === false ? 'Oculto' : 'Público'}
            </span>
            {templates.templateFlash && (
              <span className={cr.editorTag}>
                <i className="ti ti-bookmark-filled" aria-hidden="true" /> &ldquo;
                {templates.templateFlash}&rdquo; salvo
              </span>
            )}
          </div>
          <div className={cr.editorHdRow}>
            <Button
              size="sm"
              iconOnly
              aria-label="Editar dados"
              title="Editar dados"
              onClick={editor.openMetaEdit}
            >
              <i className="ti ti-settings" />
            </Button>
            {blocks.length > 0 && (
              <Button
                size="sm"
                iconOnly
                aria-label={templateBtnLabel}
                title={templateBtnLabel}
                onClick={onTemplateBtn}
              >
                <i className={`ti ${activeTemplateId ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
              </Button>
            )}
            <span className={cr.editorHdSpacer} />
            <Button size="sm" variant="primary" onClick={editor.saveS}>
              <i className="ti ti-check" /> {saveLabel}
              {isDirty && <span aria-hidden="true"> ●</span>}
            </Button>
          </div>
        </div>
      ) : (
        <div className={cr.editorHd}>
          <span className={cr.editorDate}>{editorDateStr}</span>
          <span className={cr.editorName}>{form.sessionName?.trim() || 'Sessão sem nome'}</span>
          {editorBoxes.map(b => (
            <span
              key={b.id}
              className={cr.editorTag}
              style={{ borderColor: b.color, color: b.color }}
            >
              <span className={cr.dot} style={{ background: b.color || 'var(--muted)' }} />
              {b.name}
            </span>
          ))}
          <span
            className={`${cr.editorTag}${form.public === false ? ' ' + cr.editorTagHidden : ''}`}
          >
            {form.public === false ? 'Oculto' : 'Público'}
          </span>
          {/* The gear belongs to the title, not to the action cluster: everything
                it edits — date, name, box, visibility — is what the title shows. */}
          <Button
            size="sm"
            iconOnly
            aria-label="Editar dados"
            title="Editar dados"
            onClick={editor.openMetaEdit}
          >
            <i className="ti ti-settings" />
          </Button>
          {templates.templateFlash && (
            <span className={cr.editorTag}>
              <i className="ti ti-bookmark-filled" aria-hidden="true" /> &ldquo;
              {templates.templateFlash}&rdquo; salvo
            </span>
          )}
          <span className={cr.editorHdSpacer} />
          {blocks.length > 0 && (
            <Button
              size="sm"
              iconOnly
              aria-label={templateBtnLabel}
              title={templateBtnLabel}
              onClick={onTemplateBtn}
            >
              <i className={`ti ${activeTemplateId ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
            </Button>
          )}
          <Button
            size="sm"
            iconOnly
            aria-label="Preview TV"
            title="Preview TV"
            aria-pressed={tvPreviewOpen}
            onClick={onToggleTvPreview}
          >
            <i className="ti ti-device-tv" />
          </Button>
          <Button size="sm" variant="primary" onClick={editor.saveS}>
            <i className="ti ti-check" /> {saveLabel}
            {isDirty && <span aria-hidden="true"> ●</span>}
          </Button>
          {/* Same red ✕ as the exercise/movement delete — it is the discard, and
                it now looks like one. Which is exactly why it asks first when
                there is something to lose. */}
          <Button
            size="sm"
            iconOnly
            variant="destructive"
            aria-label="Fechar"
            title="Fechar"
            onClick={editor.requestClose}
          >
            <i className="ti ti-x" />
          </Button>
        </div>
      )}

      {/* Blocks */}
      <div>
        <div className={cr.blocksBar}>
          <span className={cr.blocksCount}>
            {blocks.length ? `${blocks.length} Bloco${blocks.length !== 1 ? 's' : ''}` : 'Blocos'}
          </span>
          <div className={cr.blocksBarActions}>
            {blocks.length > 1 && sessionMode === 'detalhado' && (
              <>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() =>
                    blockList.setCollapsedBlocks(Object.fromEntries(blocks.map(b => [b.id, true])))
                  }
                >
                  <i className="ti ti-arrows-minimize" /> Recolher
                </Button>
                <Button size="xs" variant="ghost" onClick={() => blockList.setCollapsedBlocks({})}>
                  <i className="ti ti-arrows-maximize" /> Expandir
                </Button>
              </>
            )}
            {/* Detalhado / Texto — the whole session as the coach's own notation */}
            <span className={tm.modeSeg} role="group" aria-label="Modo de edição da sessão">
              <button
                type="button"
                className={sessionMode === 'detalhado' ? tm.on : ''}
                aria-pressed={sessionMode === 'detalhado'}
                onClick={() => setSessionMode('detalhado')}
              >
                ▤ Detalhado
              </button>
              <button
                type="button"
                className={sessionMode === 'texto' ? tm.on : ''}
                aria-pressed={sessionMode === 'texto'}
                onClick={() => setSessionMode('texto')}
              >
                ¶ Texto
              </button>
            </span>
          </div>
        </div>

        {sessionMode === 'texto' && (
          <SessionTextPane
            blocks={blocks}
            registry={registry}
            blockNames={names}
            typePicker={CriadorTypePicker}
            onCancel={() => setSessionMode('detalhado')}
            onApply={next => {
              // Already merged and normalized by the pane: the locked blocks in
              // `next` are the ORIGINAL objects and must be passed through
              // untouched (plans/61·B), so nothing may be re-mapped here.
              editor.setBlocks(next)
              editor.markDirty()
              blockList.setCollapsedBlocks({})
              setSessionMode('detalhado')
            }}
          />
        )}

        {sessionMode === 'detalhado' &&
          blocks.flatMap((bl, i) => {
            const editorRow = (
              <BlockEditor
                key={bl.id}
                block={bl}
                idx={i}
                total={blocks.length}
                blockNames={names}
                onUpdate={upd => blockList.updBlock(bl.id, upd)}
                onDelete={() => blockList.delBlock(bl.id)}
                onCopy={() => blockList.copyBlock(bl.id)}
                collapsed={!!blockList.collapsedBlocks[bl.id]}
                onToggleCollapse={() =>
                  blockList.setCollapsedBlocks(p => ({ ...p, [bl.id]: !p[bl.id] }))
                }
                dragBlkIdxRef={blockList.dragBlkIdxRef}
                dragOverBlkIdx={blockList.dragOverBlkIdx}
                setDragOverBlkIdx={blockList.setDragOverBlkIdx}
                reorderBlocks={blockList.reorderBlocks}
                blockIdx={i}
                changedFields={editor.changedBlockFields[bl.id] || null}
                registry={registry}
              />
            )
            if (i < blocks.length - 1) {
              return [
                editorRow,
                <button
                  key={`ins-${i}`}
                  type="button"
                  className="insert-blk-btn"
                  aria-label={`Inserir bloco depois do bloco ${i + 1}`}
                  title="Inserir bloco aqui"
                  onClick={() => {
                    blockList.setInsertAtIdx(i)
                    blockList.setShowBlockPicker(true)
                  }}
                >
                  <i className="ti ti-plus" />
                </button>,
              ]
            }
            return [editorRow]
          })}

        {/* Add block */}
        {sessionMode === 'detalhado' && (
          <button
            type="button"
            className="add-blk-btn"
            style={{ width: '100%', marginBottom: 0 }}
            onClick={() => {
              blockList.setInsertAtIdx(null)
              blockList.setShowBlockPicker(true)
            }}
          >
            <i className="ti ti-layout-grid-add" style={{ fontSize: 16 }} /> Adicionar bloco
          </button>
        )}
      </div>

      {/* Save row — the header's save is out of reach once the block list is long. */}
      <div className={cr.mt3}>
        <Button variant="primary" full onClick={editor.saveS}>
          <i className="ti ti-check" /> {saveLabel}
          {isDirty && <span aria-hidden="true"> ●</span>}
        </Button>
      </div>
    </Card>
  )
}
