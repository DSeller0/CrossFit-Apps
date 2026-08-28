import {
  IconQrcode,
  IconPencil,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import { rateLabel } from './affiliateHelpers.js'
import s from './Afiliados.module.css'

const FALLBACK_COLOR = 'var(--muted)'

// One affiliate — `locations[]` IS the affiliate table (plans/42 decision 1: `type`
// is already the discriminator, so no new entity was invented).
//
// Two layouts, one component: the desktop list row and the mobile accordion card.
//
// ⚠️ The select/expand control and the action buttons are SIBLINGS, not nested.
// The old markup put three <button>s inside the clickable row, which only worked
// because the row was a <div> — turning that row into a real <button> would have
// produced nested interactive elements (invalid HTML, and a screen reader reads the
// whole thing as one control). Splitting them also retires the three
// `e.stopPropagation()` guards the old version needed.
//
// Every icon control names its affiliate: three identical trash icons can be on
// screen at once, so "Remover" alone doesn't say which.
//
// CLIENT-FREE.
function Actions({ loc, onQr, onEdit, onDelete }) {
  return (
    <div className={s.rowActions}>
      {loc.type === 'box' && (
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={`QR e link público de ${loc.name}`}
          onClick={() => onQr?.(loc)}
        >
          <IconQrcode />
        </Button>
      )}
      <Button
        variant="ghost"
        size="xs"
        iconOnly
        aria-label={`Editar ${loc.name}`}
        onClick={() => onEdit?.(loc)}
      >
        <IconPencil />
      </Button>
      <Button
        variant="destructive"
        size="xs"
        iconOnly
        aria-label={`Remover ${loc.name}`}
        onClick={() => onDelete?.(loc)}
      >
        <IconTrash />
      </Button>
    </div>
  )
}

function TypeTag({ type }) {
  return (
    <span className={`${s.typeTag} ${type === 'box' ? s.typeBox : s.typePersonal}`}>
      {type === 'box' ? 'Box' : 'Personal'}
    </span>
  )
}

export default function AffiliateRow({
  loc,
  variant = 'list', // 'list' (desktop) | 'card' (mobile accordion)
  selected = false,
  expanded = false,
  onSelect,
  onToggle,
  onQr,
  onEdit,
  onDelete,
  children, // the expanded body (roster) — card variant only
}) {
  const color = loc.color || FALLBACK_COLOR

  if (variant === 'card') {
    return (
      <div
        className={`${s.card}${expanded ? ' ' + s.cardOn : ''}`}
        style={{ borderLeftColor: color }}
      >
        <div className={`${s.cardHdrWrap}${expanded ? ' ' + s.cardHdrOn : ''}`}>
          <button
            type="button"
            className={s.cardHdr}
            aria-expanded={expanded}
            onClick={() => onToggle?.(loc)}
          >
            <span className={s.dot} style={{ background: color }} />
            <span className={s.rowName}>{loc.name}</span>
            <TypeTag type={loc.type} />
            {expanded ? (
              <IconChevronDown className={s.chev} size={16} />
            ) : (
              <IconChevronRight className={s.chev} size={16} />
            )}
          </button>
          <Actions loc={loc} onQr={onQr} onEdit={onEdit} onDelete={onDelete} />
        </div>
        {expanded && (
          <div className={s.cardBody}>
            <div className={s.cardRate}>{rateLabel(loc)}</div>
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`${s.rowWrap}${selected ? ' ' + s.rowOn : ''}`}
      style={{ borderLeftColor: color }}
    >
      <button
        type="button"
        className={s.row}
        aria-current={selected ? 'true' : undefined}
        onClick={() => onSelect?.(loc)}
      >
        <span className={s.rowTop}>
          <span className={s.rowName}>{loc.name}</span>
          <TypeTag type={loc.type} />
        </span>
        <span className={s.rowRate}>{rateLabel(loc)}</span>
      </button>
      <Actions loc={loc} onQr={onQr} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}
