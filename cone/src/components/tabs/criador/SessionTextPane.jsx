import { useState, useMemo } from 'react'
import { ExerciseList } from '../../../public/shared/ExerciseList.jsx'
import { blkColor, blkMeta } from '../../../public/lib/wod.js'
import {
  parseSession,
  serializeGoal,
  blockLineStarts,
  splitLockedBlocks,
  mergeLockedBlocks,
} from './textFormat.js'
import { getTypeCfg, normalizeLegacyCardio } from './blockModel.js'
import s from './textMode.module.css'
import Button from '../../ui/Button.jsx'

const FORMAT_HELP = `Warm Up                     ← tipo do bloco (aceita Warm Up, Skill, WOD, Emom…)
3 rounds                    ← estrutura: 3 rounds · AMRAP 15' · TC 14' · 21-15-9
100m Run                    ← exercício: [A] [qtd] nome [carga]
8 Power Clean 60/45kg – 50/35kg   ← RX e depois Inter, agrupado por escala
Meta: 11-12'                ← objetivo do bloco
(linha em branco = novo bloco)`

// One parsed block, rendered as it will look once applied. Uses the real
// ExerciseList (size `tiny`) rather than a private row markup, so the preview
// can't drift from what the rest of the app draws.
function PreviewBlock({ block, onPickType, locked }) {
  const cfg = getTypeCfg(block.type)
  const color = blkColor(block)
  const label = block.label && block.label !== block.type ? block.label : ''
  const meta = blkMeta(block)
  const goal = serializeGoal(block.goal)

  return (
    <div
      className={`${s.prevBlk} ${block.typeUnresolved ? s.prevBlkPending : ''} ${locked ? s.prevBlkLocked : ''}`}
      style={{ borderLeftColor: block.typeUnresolved || locked ? 'var(--muted)' : color }}
    >
      <div className={s.prevHd}>
        {block.typeUnresolved ? (
          <button
            type="button"
            className={`${s.chip} ${s.chipPick}`}
            onClick={onPickType}
            disabled={!onPickType}
            title="Escolher o tipo deste bloco"
          >
            ? escolher tipo
          </button>
        ) : (
          <span
            className={s.chip}
            style={{ background: color + '22', color, border: `1px solid ${color}44` }}
          >
            <i className={`ti ${cfg.icon}`} /> {block.type}
          </span>
        )}
        {label && <span className={s.prevLbl}>{label}</span>}
        {meta && <span className={s.prevMeta}>{meta}</span>}
        {locked && (
          <span className={s.chipLock}>
            <i className="ti ti-lock" /> não editável em texto — preservado
          </span>
        )}
      </div>
      <ExerciseList exercises={block.exercises || []} color={color} size="tiny" />
      {goal && <div className={s.prevGoal}>Meta {goal}</div>}
      {block.notes && <div className={s.prevNote}>{block.notes}</div>}
    </div>
  )
}

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
  const count = kind => warnings.filter(w => w.kind === kind).length
  const noType = count('type-unresolved')
  const unknown = count('unknown-exercise')
  const noted = count('unparsed-line') + count('orphan-load')
  const complex = count('complex-detected')
  const locked = count('block-locked')

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
      {showHelp && <div className={s.fmtBox}>{FORMAT_HELP}</div>}

      <div className={s.pane}>
        <textarea
          className={`${s.ta} ${s.taSession}`}
          value={text}
          spellCheck={false}
          aria-label="Sessão em texto"
          placeholder={'Cole ou escreva o treino do dia.\n\nWarm Up\n3 rounds\n100m Run\n…'}
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
              <br />
              {locked > 0 && (
                <>
                  <span className={s.infoRow}>
                    <i className="ti ti-lock" /> {locked} bloco
                    {locked === 1 ? '' : 's'} preservado{locked === 1 ? '' : 's'}
                  </span>
                  <br />
                </>
              )}
              {noType > 0 && (
                <>
                  <span className={s.warnRow}>
                    ⚠ {noType} tipo{noType === 1 ? '' : 's'} por definir
                  </span>
                  <br />
                </>
              )}
              {complex > 0 && (
                <>
                  <span className={s.warnRow}>
                    ⚠ {complex} complexo{complex === 1 ? '' : 's'} detectado
                    {complex === 1 ? '' : 's'}
                  </span>
                  <br />
                </>
              )}
              {unknown > 0 && (
                <>
                  <span className={s.infoRow}>
                    ⓘ {unknown} nome{unknown === 1 ? '' : 's'} fora do registro
                  </span>
                  <br />
                </>
              )}
              {noted > 0 && (
                <span className={s.infoRow}>
                  ⓘ {noted} linha{noted === 1 ? '' : 's'} mantida{noted === 1 ? '' : 's'} como nota
                </span>
              )}
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
