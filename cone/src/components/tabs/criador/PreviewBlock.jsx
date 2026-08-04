import { ExerciseList } from '../../../public/shared/ExerciseList.jsx'
import { blkColor, blkMeta, blockExercises } from '../../../public/lib/wod.js'
import { getTypeCfg } from './blockModel.js'
import { serializeGoal } from './textFormat.js'
import s from './textMode.module.css'

// ── PreviewBlock (#92, extracted #128 · plans/61·C) ──────────────────────────
// One parsed block, rendered as it will look once applied. Uses the real
// ExerciseList (size `tiny`) rather than a private row markup, so the preview
// can't drift from what the rest of the app draws. Shared by SessionTextPane's
// live preview and WeekImportModal's per-day expanded preview (#128) — same
// component, same rendering, whichever surface parsed the block.
//
// `blockExercises` (not `block.exercises`) — an Estações block's movements hang
// off `stations`, not the block itself; this is the same fork every other
// consumer already makes (wod.js, normalizeLegacyCardio, materializeBlocks…).
export function PreviewBlock({ block, onPickType, locked }) {
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
      <ExerciseList exercises={blockExercises(block)} color={color} size="tiny" />
      {goal && <div className={s.prevGoal}>Meta {goal}</div>}
      {block.notes && <div className={s.prevNote}>{block.notes}</div>}
    </div>
  )
}
