import { IconChevronUp, IconFlag, IconTrash } from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import { scaleColor } from '../../../public/lib/wod.js'
import { DEFAULT_ATHLETE_COLOR } from '../atletas/atletasHelpers.js'
import s from './Resultados.module.css'

// One athlete in the class roster — FOUR states, one shell (#57/plans/80 · mockup 61).
//
// Before this, logged and unlogged athletes were two different components with two
// different visual languages (`rp-ath-row` vs `rp-add-item`), and an athlete jumped
// between them the moment you hit Salvar — while every unlogged athlete was hidden behind
// a dashed "Registrar atleta" disclosure, so the normal case (nobody logged yet) opened
// with the whole class out of sight.
//
// The row is a real <button> (#169) — it was a click-`<div>`, unreachable by keyboard.
// The identity dot and the level tag both carry the ATHLETE's own colour through
// color-mix, which is C2's treatment and why LEVEL_CLS/.lv-* are deleted rather than
// re-tokenized.
// CLIENT-FREE.
export default function AthleteRow({
  athlete,
  summary,
  scale,
  flagged,
  absent,
  open,
  onOpen,
  onClose,
  onMarkAbsent,
  onDelete,
  children,
}) {
  const color = athlete.color || DEFAULT_ATHLETE_COLOR
  const logged = !!summary

  return (
    <div className={`${s.row}${open ? ' ' + s.rowOpen : ''}${absent ? ' ' + s.rowAbsent : ''}`}>
      <div className={s.rowHead}>
        <button
          type="button"
          className={s.rowMain}
          aria-expanded={open}
          onClick={open ? onClose : onOpen}
        >
          <span
            className={`${s.dot}${absent ? ' ' + s.dotHollow : ''}`}
            style={absent ? undefined : { background: color }}
          />
          <span className={s.rowName}>{athlete.name}</span>
          {absent ? (
            <span className={s.absTag}>{summary}</span>
          ) : logged ? (
            <span className={s.rowSum}>
              {scale && (
                <span className={s.scPill} style={{ color: scaleColor(scale) }}>
                  {scale}
                </span>
              )}
              <span className={s.rowSumText}>{summary}</span>
              {flagged && (
                <span className={s.rowFlag}>
                  <IconFlag size={13} aria-label="Marcado para revisão" />
                </span>
              )}
            </span>
          ) : (
            <>
              {athlete.level && (
                <span
                  className={s.levelTag}
                  style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
                >
                  {athlete.level}
                </span>
              )}
              <span className={s.spacer} />
            </>
          )}
        </button>

        <span className={s.rowActs}>
          {open ? (
            <Button size="xs" onClick={onClose}>
              Fechar <IconChevronUp size={13} aria-hidden="true" />
            </Button>
          ) : logged || absent ? (
            <Button
              size="xs"
              variant="destructive"
              iconOnly
              aria-label={`Excluir registro de ${athlete.name}`}
              onClick={onDelete}
            >
              <IconTrash size={14} />
            </Button>
          ) : (
            <>
              {/* One click, one write. A single reversible field, so no confirm — the
                  same call C2 made when it removed the confirm from the goal +1. */}
              <Button size="xs" variant="ghost" onClick={onMarkAbsent}>
                Ausente
              </Button>
              <Button size="xs" onClick={onOpen}>
                Registrar
              </Button>
            </>
          )}
        </span>
      </div>

      {open && children}
    </div>
  )
}
