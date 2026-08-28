import { IconPencil } from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import { monthYear, DEFAULT_ATHLETE_COLOR } from './atletasHelpers.js'
import s from './Atletas.module.css'

// The sticky athlete identity header (#56/C2). The 3px stripe and the level tag
// carry the athlete's own colour — a DATA colour, so it stays inline; everything
// else is a token (it was BG/CREAM/MUTED/DIM off the frozen palette).
// CLIENT-FREE.
export default function AthleteHeader({ athlete, onEdit }) {
  const color = athlete.color || DEFAULT_ATHLETE_COLOR
  const since = monthYear(athlete.since)

  return (
    <div className={s.hdr} style={{ borderLeftColor: color }}>
      <div>
        <div className={s.hdrName}>{athlete.name}</div>
        <div className={s.hdrMeta}>
          {athlete.level && (
            <span
              className={s.levelTag}
              style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
            >
              {athlete.level}
            </span>
          )}
          {athlete.goal && <span className={s.hdrGoal}>{athlete.goal}</span>}
          {since && <span className={s.hdrSince}>desde {since}</span>}
        </div>
        {athlete.notes && <div className={s.hdrNotes}>{athlete.notes}</div>}
      </div>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={`Editar perfil de ${athlete.name}`}
        onClick={onEdit}
      >
        <IconPencil />
      </Button>
    </div>
  )
}
