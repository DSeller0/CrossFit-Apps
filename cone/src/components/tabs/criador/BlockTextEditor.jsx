import { useState, useMemo } from 'react'
import {
  parseBlock,
  serializeBlock,
  serializeGoal,
  FORMAT_REFERENCE,
  FORMAT_EXAMPLE_BLOCK,
  WARNING_KINDS,
} from './textFormat.js'
import { ParseWarnings } from './ParseWarnings.jsx'
import s from './textMode.module.css'

// ── BlockTextEditor (#92) ─────────────────────────────────────────────────────
// One block at a time, with no header line — the type is already chosen in the
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
  const [showHelp, setShowHelp] = useState(false)

  const { parsed, warnings } = useMemo(() => {
    const r = parseBlock(text, { knownType: block.type, registry })
    return { parsed: r.block, warnings: r.warnings }
  }, [text, block.type, registry])

  // The text carries volume/exercises/goal/notes; identity and the fields the
  // block bar owns (label, zone, benchmark link) are preserved from the block.
  // `goal` and `lettered` apply UNCONDITIONALLY: applied only when truthy, deleting the
  // `Meta:` line left the old goal in place, so neither could ever be cleared (#121a).
  // An Estações block writes back its STATIONS instead of its exercises (plans/61·B) —
  // that is the side its type reads, and `...block` keeps the other one as it was.
  const merge = p => ({
    ...block,
    duration: p.duration,
    rounds: p.rounds,
    ladderMode: p.ladderMode,
    notes: p.notes,
    lettered: !!p.lettered,
    goal: p.goal,
    ...(p.stations
      ? {
          stations: p.stations,
          stationRepeat: p.stationRepeat,
          restBetweenCycles: p.restBetweenCycles || '',
        }
      : { exercises: p.exercises }),
  })

  const commit = () => onApply(merge(parsed))

  const parsedExs = parsed.stations
    ? parsed.stations.flatMap(st => st.exercises || [])
    : parsed.exercises || []
  const named = parsedExs.filter(e => (e.name || '').trim() || e.isComplex).length
  const goalStr = serializeGoal(parsed.goal)
  const groups = (parsed.stations || []).filter(st => !st.isRest).length
  const summary = [
    groups && `${groups} grupo${groups === 1 ? '' : 's'}`,
    `${named} exercício${named === 1 ? '' : 's'}`,
    parsed.duration && `CAP ${parsed.duration}'`,
    parsed.rounds && `${parsed.rounds} rounds`,
    goalStr && `Meta ${goalStr}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const hasWarn = warnings.some(w => WARNING_KINDS[w.kind]?.severity === 'warn')

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
      <textarea
        className={`${s.ta} ${s.taBlock}`}
        value={text}
        spellCheck={false}
        aria-label="Bloco em texto"
        placeholder={FORMAT_EXAMPLE_BLOCK}
        onChange={e => setText(e.target.value)}
        onBlur={commit}
      />
      <div className={s.status}>
        <span className={hasWarn ? s.statusWarn : s.statusOk}>{hasWarn ? '⚠' : '✓'}</span>
        <span>{summary}</span>
        <ParseWarnings warnings={warnings} inline />
      </div>
    </div>
  )
}
