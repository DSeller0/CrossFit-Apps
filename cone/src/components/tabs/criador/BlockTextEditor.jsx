import { useState, useMemo } from 'react'
import { parseBlock, serializeBlock, serializeGoal } from './textFormat.js'
import s from './textMode.module.css'

// ── BlockTextEditor (#92) ─────────────────────────────────────────────────────
// One block as text, with no header line — the type is already chosen in the
// block bar, so the first line is only ever structure (`5 Rounds For Time`) or an
// exercise. Text is a projection: the block object stays canonical, and this only
// hands one back on commit.
//
// Commit is on BLUR, not on every keystroke: parsing mints new exercise ids, so a
// per-keystroke commit would churn Criador's changed-field tracking and re-render
// every row mid-typing. Live parsing still drives the status line.
// The caller passes key={block.id} so React re-mounts (and this re-seeds from the
// serializer) when the block identity changes — rather than an effect that would
// re-seed on every block update and fight the coach mid-sentence.
export function BlockTextEditor({ block, onApply, registry }) {
  const [text, setText] = useState(() => serializeBlock(block, { header: false }))

  const { parsed, warnings } = useMemo(() => {
    const r = parseBlock(text, { knownType: block.type, registry })
    return { parsed: r.block, warnings: r.warnings }
  }, [text, block.type, registry])

  // The text carries volume/exercises/goal/notes; identity and the fields the
  // block bar owns (label, zone, benchmark link) are preserved from the block.
  const merge = p => ({
    ...block,
    duration: p.duration,
    rounds: p.rounds,
    ladderMode: p.ladderMode,
    notes: p.notes,
    exercises: p.exercises,
    ...(p.lettered ? { lettered: true } : {}),
    ...(p.goal ? { goal: p.goal } : {}),
  })

  const commit = () => onApply(merge(parsed))

  const named = (parsed.exercises || []).filter(e => (e.name || '').trim() || e.isComplex).length
  const goalStr = serializeGoal(parsed.goal)
  const summary = [
    `${named} exercício${named === 1 ? '' : 's'}`,
    parsed.duration && `CAP ${parsed.duration}'`,
    parsed.rounds && `${parsed.rounds} rounds`,
    goalStr && `Meta ${goalStr}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const real = warnings.filter(w => w.kind !== 'unknown-exercise')
  const unknown = warnings.filter(w => w.kind === 'unknown-exercise')

  return (
    <div>
      <textarea
        className={`${s.ta} ${s.taBlock}`}
        value={text}
        spellCheck={false}
        aria-label="Bloco em texto"
        placeholder={
          "5 Rounds For Time\n8 Power Clean 60/45kg – 50/35kg\n10 Toes to Bar\nMeta: 11-12'"
        }
        onChange={e => setText(e.target.value)}
        onBlur={commit}
      />
      <div className={s.status}>
        <span className={real.length ? s.statusWarn : s.statusOk}>{real.length ? '⚠' : '✓'}</span>
        <span>{summary}</span>
        {real.map((w, i) => (
          <span key={i} className={s.statusWarn}>
            · {w.message}
          </span>
        ))}
        {unknown.length > 0 && <span>· {unknown.length} fora do registro</span>}
      </div>
    </div>
  )
}
