import { IconCheck, IconFlag, IconNotes, IconTrash } from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import BlockLogCard from './BlockLogCard.jsx'
import { PRESENCE, saveGate } from './resultadosHelpers.js'
import s from './Resultados.module.css'

// The log form for one athlete on one session (#57/plans/80).
//
// It renders INSIDE the athlete's roster row (desktop) or inside the mobile sheet — the
// roster is the form container, which is the change that gives the form the full pane
// width instead of the 10–13px third column it used to get.
//
// The Salvar gate says WHY it is disabled. A silently-disabled Salvar on a 3-WOD session
// is #157's user-facing face: the coach cannot tell whether the app is broken or whether
// he missed a field, and the old fix would have been to pre-select a scale — exactly what
// #61a forbids.
// CLIENT-FREE.
export default function LogForm({
  presence,
  energyLevel,
  blockLogs,
  coachNote,
  showNote,
  flag,
  session,
  hasResult,
  hasNext,
  onPresence,
  onEnergy,
  onBlockChange,
  onNote,
  onToggleNote,
  onToggleFlag,
  onSave,
  onSaveNext,
  onDelete,
}) {
  const gate = saveGate(presence, blockLogs)
  const present = presence === 'Presente'

  return (
    <div className={s.form}>
      <div className={s.fRow}>
        <span className={s.fLbl}>Presença</span>
        <span className={s.segs}>
          {PRESENCE.map(p => (
            <Button
              key={p}
              size="sm"
              variant={presence === p ? 'primary' : 'secondary'}
              aria-pressed={presence === p}
              onClick={() => onPresence(p)}
            >
              {p}
            </Button>
          ))}
        </span>
      </div>

      {present && (
        <div className={s.fRow}>
          <span className={s.fLbl}>Energia</span>
          <span className={s.segs}>
            {[1, 2, 3, 4, 5].map(n => (
              <Button
                key={n}
                size="sm"
                variant={energyLevel === n ? 'primary' : 'secondary'}
                aria-pressed={energyLevel === n}
                aria-label={`Energia ${n} de 5`}
                onClick={() => onEnergy(n)}
              >
                {n}
              </Button>
            ))}
          </span>
        </div>
      )}

      {present &&
        blockLogs.map((bl, i) => (
          <BlockLogCard
            key={bl.blockId}
            entry={bl}
            block={(session?.blocks || []).find(b => b.id === bl.blockId)}
            index={i}
            total={blockLogs.length}
            onChange={patch => onBlockChange(i, patch)}
          />
        ))}

      {present && blockLogs.length === 0 && (
        <EmptyState inline title="Nenhum bloco WOD nesta sessão." />
      )}

      <div className={s.fRow}>
        <Button
          size="sm"
          variant={showNote ? 'primary' : 'secondary'}
          aria-expanded={showNote}
          onClick={onToggleNote}
        >
          <IconNotes size={14} /> Nota do coach
        </Button>
        <Button
          size="sm"
          variant={flag ? 'destructive' : 'secondary'}
          aria-pressed={flag}
          onClick={onToggleFlag}
        >
          <IconFlag size={14} /> {flag ? 'Marcado para revisão' : 'Marcar para revisão'}
        </Button>
      </div>
      {showNote && (
        <Input
          as="textarea"
          rows={3}
          className={s.noteArea}
          label="Nota do coach"
          placeholder="Observações gerais…"
          value={coachNote}
          onChange={e => onNote(e.target.value)}
        />
      )}

      <div className={s.formFoot}>
        <span className={s.gate}>
          {gate.canSave ? (
            <span className={s.gateOk}>Tudo resolvido</span>
          ) : (
            <>
              Faltam: <span className={s.gateMissing}>{gate.missing.join(' · ')}</span>
            </>
          )}
        </span>
        <span className={s.spacer} />
        {hasResult && (
          <Button
            size="sm"
            variant="destructive"
            iconOnly
            aria-label="Excluir registro deste atleta"
            onClick={onDelete}
          >
            <IconTrash size={15} />
          </Button>
        )}
        <Button size="md" disabled={!gate.canSave} onClick={onSave}>
          <IconCheck size={15} /> Salvar
        </Button>
        {hasNext && (
          <Button size="md" variant="primary" disabled={!gate.canSave} onClick={onSaveNext}>
            Salvar e próximo
          </Button>
        )}
      </div>
    </div>
  )
}
