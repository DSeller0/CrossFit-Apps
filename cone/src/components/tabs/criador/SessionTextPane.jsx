import { useState, useMemo } from 'react'
import {
  parseSession,
  blockLineStarts,
  splitLockedBlocks,
  mergeLockedBlocks,
  FORMAT_REFERENCE,
  FORMAT_EXAMPLE,
} from './textFormat.js'
import { normalizeLegacyCardio } from './blockModel.js'
import { PreviewBlock } from './PreviewBlock.jsx'
import { ParseWarnings } from './ParseWarnings.jsx'
import s from './textMode.module.css'
import Button from '../../ui/Button.jsx'

// ── SessionTextPane (#92) ─────────────────────────────────────────────────────
// The whole session as the coach's own text, with a live preview of what the
// parser made of it. Nothing is committed until "Aplicar" — the preview is where
// he checks the parse, and the footer counts what needs his attention.
// `typePicker` is INJECTED, not imported: TypePicker reaches utils/storage for its
// custom benchmarks, which pulls the SPA Supabase client — and this pane renders in
// the client-free gallery. Same reasoning as blockModel taking `reg` as a param.
export function SessionTextPane({
  blocks,
  onApply,
  onCancel,
  registry,
  blockNames,
  typePicker: TypePicker,
}) {
  // Split ONCE, at mount: a block the grammar can't express stays out of the textarea
  // entirely and is put back by index on Aplicar, so it survives byte-identical instead
  // of being rewritten from a paraphrase of itself (plans/61·B).
  const [{ text: seedText, layout, warnings: lockedWarnings }] = useState(() =>
    splitLockedBlocks(blocks),
  )
  const [text, setText] = useState(seedText)
  const [showHelp, setShowHelp] = useState(false)
  const [pickForIdx, setPickForIdx] = useState(null)

  const { parsed, warnings } = useMemo(() => {
    const r = parseSession(text, { registry })
    return { parsed: r.blocks, warnings: r.warnings.concat(lockedWarnings) }
  }, [text, registry, lockedWarnings])

  // What Aplicar would commit — the parsed blocks with the locked ones back in place.
  const merged = useMemo(
    () => mergeLockedBlocks(normalizeLegacyCardio(parsed), layout),
    [parsed, layout],
  )
  const lockedSet = useMemo(
    () => new Set(layout.filter(l => l.kind === 'locked').map(l => l.block)),
    [layout],
  )
  // The preview is the merged list, so a locked block sits at its REAL index; the type
  // picker still needs the index into `parsed`, since that is what indexes the text.
  let pi = 0
  const rows = merged.map(b =>
    lockedSet.has(b) ? { block: b, locked: true } : { block: b, parsedIdx: pi++ },
  )

  const exCount = merged.reduce(
    (n, b) =>
      n +
      (b.type === 'Estações'
        ? (b.stations || []).flatMap(st => st.exercises || [])
        : b.exercises || []
      ).filter(e => (e.name || '').trim() || e.isComplex).length,
    0,
  )

  // One tap to fix an unresolved type: prefix that block's own header line with
  // the chosen type. Editing the line in place rather than re-serializing keeps
  // the rest of the coach's text exactly as he typed it.
  const applyType = picked => {
    const idx = pickForIdx
    setPickForIdx(null)
    if (idx == null) return
    // The picker hands back a type string, or a whole block for a Benchmark. A
    // benchmark's own exercises can't come through here (text is the source of
    // truth in this pane), so take its name as the block label instead.
    const prefix =
      typeof picked === 'string' ? picked : `Benchmark – ${picked?.label || picked?.type || ''}`
    const start = blockLineStarts(text)[idx]
    if (start == null) return
    const lines = text.split(/\r?\n/)
    lines[start] = `${prefix} – ${lines[start].trim()}`
    setText(lines.join('\n'))
  }

  return (
    <div>
      <div className={s.paneBar}>
        <button
          type="button"
          className={s.fmtHelp}
          onClick={() => setShowHelp(v => !v)}
          aria-expanded={showHelp}
        >
          ⓘ Formato
        </button>
      </div>
      {showHelp && <div className={s.fmtBox}>{FORMAT_REFERENCE}</div>}

      <div className={s.pane}>
        <textarea
          className={`${s.ta} ${s.taSession}`}
          value={text}
          spellCheck={false}
          aria-label="Sessão em texto"
          placeholder={FORMAT_EXAMPLE}
          onChange={e => setText(e.target.value)}
        />
        <div>
          <div className={s.prevTitle}>Pré-visualização</div>
          {rows.length === 0 ? (
            <div className={s.prevEmpty}>
              Cole ou escreva o treino à esquerda.
              <br />
              Nada ainda.
            </div>
          ) : (
            rows.map(({ block: b, locked: isLocked, parsedIdx }) => (
              <PreviewBlock
                key={b.id}
                block={b}
                locked={isLocked}
                onPickType={TypePicker && !isLocked ? () => setPickForIdx(parsedIdx) : undefined}
              />
            ))
          )}
          {rows.length > 0 && (
            <div className={s.prevFoot}>
              <b>
                {rows.length} bloco{rows.length === 1 ? '' : 's'} · {exCount} exercício
                {exCount === 1 ? '' : 's'}
              </b>
              <ParseWarnings warnings={warnings} />
            </div>
          )}
        </div>
      </div>

      {/* Commit row at the FOOT of the pane — you decide after reading the preview,
          not before. Right-aligned, so it lands where the eye leaves the page. */}
      <div className={s.paneFoot}>
        {onCancel && (
          <Button size="sm" onClick={onCancel}>
            Descartar
          </Button>
        )}
        <Button
          size="sm"
          variant="primary"
          onClick={() => onApply(merged)}
          disabled={!merged.length}
        >
          <i className="ti ti-check" /> Aplicar
        </Button>
      </div>

      {pickForIdx != null && TypePicker && (
        <TypePicker
          blockNames={blockNames}
          onSelect={applyType}
          onClose={() => setPickForIdx(null)}
        />
      )}
    </div>
  )
}
