import Button from '../../ui/Button.jsx'
import ScoreFields from '../../../public/shared/ScoreFields.jsx'
import { exVolStr, blkMeta, blkColor, blockExercises } from '../../../public/lib/wod.js'
import s from './Resultados.module.css'

// One WOD block's score entry (#57/plans/80).
//
// The score fields are the SHARED composed `ScoreFields` (#115) — Escala → RPE → score,
// already the order this view rendered. That retires the hand-rolled 10-segment RPE bar
// and its inline `rgb()` ramp (`rpeColor`), which was the last copy of a control the
// shared component has exported and gallery-covered all along.
//
// ── #157, the "não fez" toggle ──
// It lives in the HEADER, right-aligned: what it does is change what this block IS, not
// what its score is. When on, the fields are REMOVED, not disabled — a greyed "RPE —"
// still asserts the field was considered — and the card goes dashed + muted so it reads
// as deliberately empty rather than not-yet-filled. Nothing fabricates a scale or RPE
// (#61a); `skipped: true` is the whole entry.
// CLIENT-FREE.
export default function BlockLogCard({ entry, block, index, total, onChange, disabled }) {
  const skipped = !!entry.skipped
  const exercises = blockExercises(block).filter(e => e.name)
  const label = entry.blockLabel !== entry.blockType ? entry.blockLabel : ''
  const meta = block ? blkMeta(block) : ''
  const name = [label, entry.blockType, meta].filter(Boolean).join(' · ')

  return (
    <div className={`${s.blk}${skipped ? ' ' + s.blkSkipped : ''}`}>
      <div className={s.blkHead}>
        <span
          className={s.blkFam}
          style={{ background: skipped ? 'var(--dim)' : blkColor(entry.blockType) }}
        />
        <span className={s.blkIdx}>
          {index + 1}/{total}
        </span>
        <span className={s.blkName}>{name}</span>
        <Button
          size="xs"
          variant="secondary"
          className={`${s.skipToggle}${skipped ? ' ' + s.skipToggleOn : ''}`}
          aria-pressed={skipped}
          disabled={disabled}
          onClick={() =>
            // Turning the toggle ON clears the athlete keys this block might already
            // carry: a block the coach scored and then marked "não fez" must not keep a
            // stale scale/RPE alongside `skipped`, or every reader has to decide which
            // one wins. Turning it OFF just drops the flag — the fields come back empty.
            onChange(
              skipped
                ? { skipped: null }
                : {
                    skipped: true,
                    scale: null,
                    rpe: null,
                    perfTime: '',
                    perfRounds: '',
                    perfReps: '',
                    finished: null,
                    checkpoint: null,
                    exerciseRows: null,
                  },
            )
          }
        >
          {skipped ? '✓ não fez' : 'não fez'}
        </Button>
      </div>

      {skipped ? (
        <div className={s.skipBody}>Não fez este bloco — nada é registrado.</div>
      ) : (
        <div className={s.blkBody}>
          {exercises.length > 0 && (
            <div className={s.wodSum}>
              {exercises.map((ex, ei) => {
                const vol = exVolStr(ex)
                return (
                  <div key={ei}>
                    {vol && <span className={s.wodVol}>{vol} </span>}
                    {ex.name}
                  </div>
                )
              })}
            </div>
          )}
          <ScoreFields
            block={block}
            blockType={entry.blockType}
            rounds={block?.rounds}
            value={entry}
            onChange={onChange}
            disabled={disabled}
            size="sm"
          />
        </div>
      )}
    </div>
  )
}
