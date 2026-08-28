import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react'
import TallyBar from '../../../public/shared/TallyBar.jsx'
import Button from '../../ui/Button.jsx'
import { prBest, prDelta, prPct } from '../../../public/lib/goals.js'
import { prValueLabel, prTargetLabel, shortDate, DEFAULT_ATHLETE_COLOR } from './atletasHelpers.js'
import s from './Atletas.module.css'

// One PR, dense (#56/C2). Deliberately NOT me.html's one-card-per-row PR tile
// (plans/73): this is the coach's management view — he scans twenty of these and
// acts on them — so the row keeps its columns and gains the actions.
//
// The bar is the shared TallyBar. It used to be a hand-rolled 10-block gauge built
// out of the frozen palette (`STONE`/`DIV`) with `'var(--theme-accent)88'` as its
// partial fill — an alpha suffix appended to a var() reference, which is not valid
// CSS and rendered as *no colour at all*. #52's rule is one bar primitive, never two.
//
// CLIENT-FREE.
export default function PrRow({
  pr,
  color = DEFAULT_ATHLETE_COLOR,
  compact = false,
  showActions = false,
  onAddResult,
  onEdit,
  onDelete,
}) {
  const best = prBest(pr)
  const delta = prDelta(pr)
  const pct = prPct(pr)
  const target = prTargetLabel(pr)
  const bestDate = best ? shortDate(best.date) : null

  const bar =
    pct === null ? null : (
      <div className={s.prBarCol}>
        <TallyBar pct={pct} color={color} />
        {target && <div className={s.prTarget}>Meta: {target}</div>}
      </div>
    )

  return (
    <div className={s.pr}>
      <div className={s.prMain}>
        <div className={s.prId}>
          <div className={s.prName} title={pr.name}>
            {pr.name}
          </div>
          {pr.category && <div className={s.prCat}>{pr.category}</div>}
        </div>

        {!compact && bar}

        <div className={s.prBest}>
          <div className={s.prBestVal}>{prValueLabel(pr, best?.value ?? null)}</div>
          {bestDate && <div className={s.prBestDate}>{bestDate}</div>}
        </div>

        {delta && (
          <div
            className={`${s.prDelta}${
              delta.good === true
                ? ' ' + s.prDeltaUp
                : delta.good === false
                  ? ' ' + s.prDeltaDown
                  : ''
            }`}
          >
            {delta.good === true ? '↑' : delta.good === false ? '↓' : ''} {delta.label}
          </div>
        )}

        {showActions && (
          <div className={s.prActions}>
            <Button
              variant="secondary"
              size="xs"
              iconOnly
              aria-label={`Registrar resultado em ${pr.name}`}
              onClick={onAddResult}
            >
              <IconPlus />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              aria-label={`Editar ${pr.name}`}
              onClick={onEdit}
            >
              <IconPencil />
            </Button>
            <Button
              variant="destructive"
              size="xs"
              iconOnly
              aria-label={`Remover ${pr.name}`}
              onClick={onDelete}
            >
              <IconTrash />
            </Button>
          </div>
        )}
      </div>

      {/* On a phone the bar takes its own row rather than fighting the value and the
          delta for the same line — the squeeze plans/73 fixed on me.html's tiles. */}
      {compact && bar && <div className={s.prBarMobile}>{bar}</div>}
    </div>
  )
}
