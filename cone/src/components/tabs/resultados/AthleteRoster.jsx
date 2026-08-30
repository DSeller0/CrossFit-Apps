import { IconUsers } from '@tabler/icons-react'
import EmptyState from '../../ui/EmptyState.jsx'
import AthleteRow from './AthleteRow.jsx'
import { resultSummary, topScale } from './resultadosHelpers.js'
import s from './Resultados.module.css'

// The class roster (#57/plans/80). Every athlete is always listed, in one order — the
// "Resultados da turma" list the retired Por-sessão pane rendered separately WAS this
// list, so it merges in rather than being duplicated.
//
// Order is deliberate and stable: unlogged first (that is the work), then logged, then
// absent. It does NOT reorder as you save — `orderedAthletes` is computed once per
// session by the container, so a row never jumps out from under the cursor mid-class.
// CLIENT-FREE.
export default function AthleteRoster({
  athletes,
  resultFor,
  openId,
  onOpen,
  onClose,
  onMarkAbsent,
  onDelete,
  renderForm,
}) {
  if (athletes.length === 0) {
    return (
      <EmptyState
        icon={<IconUsers />}
        title="Nenhum atleta cadastrado"
        text="Cadastre atletas na aba Atletas para poder registrar resultados desta turma."
      />
    )
  }

  return (
    <div className={s.roster}>
      {athletes.map(a => {
        const r = resultFor(a.id)
        const absent = !!r && r.presence !== 'Presente'
        return (
          <AthleteRow
            key={a.id}
            athlete={a}
            summary={r ? resultSummary(r) : ''}
            scale={r ? topScale(r) : null}
            flagged={!!r?.flagForReview}
            absent={absent}
            open={openId === a.id}
            onOpen={() => onOpen(a)}
            onClose={onClose}
            onMarkAbsent={() => onMarkAbsent(a)}
            onDelete={() => onDelete(a)}
          >
            {openId === a.id && renderForm(a)}
          </AthleteRow>
        )
      })}
    </div>
  )
}
