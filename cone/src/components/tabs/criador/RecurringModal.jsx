import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import s from './criador.module.css';

// ── Recurring sessions modal ──────────────────────────────────────────────────
export function RecurringModal({ recurringTpl, onClose, recurDays, setRecurDays, recurStart, setRecurStart, recurEnd, setRecurEnd, recurPreviewDates, recurDone, onApply }) {
  return (
    <div className={s.scrim} onClick={onClose}>
      <div className={`${s.modal} ${s.modalMd}`} role="dialog" aria-modal="true" aria-labelledby="cr-recur-title"
        onClick={e => e.stopPropagation()}>
        <div className={s.modalHd}>
          <div>
            <span id="cr-recur-title" className={s.modalTitle}>
              <i className="ti ti-repeat" aria-hidden="true" /> Sessões recorrentes
            </span>
            <div className={s.recurSub}>{recurringTpl.name}</div>
          </div>
          <Button size="xs" iconOnly variant="ghost" aria-label="Fechar" onClick={onClose}>
            <i className="ti ti-x" />
          </Button>
        </div>

        <div className={s.modalBody}>
          <div>
            <span className={s.lbl}>Dias da semana</span>
            <div className={s.recurDays} role="group" aria-label="Dias da semana">
              {[['Dom',0],['Seg',1],['Ter',2],['Qua',3],['Qui',4],['Sex',5],['Sáb',6]].map(([label, day]) => (
                <button key={day} type="button" aria-pressed={recurDays.has(day)}
                  className={`${s.dayBtn}${recurDays.has(day) ? ' ' + s.dayBtnOn : ''}`}
                  onClick={() => setRecurDays(prev => { const set = new Set(prev); set.has(day) ? set.delete(day) : set.add(day); return set; })}
                >{label}</button>
              ))}
            </div>
          </div>

          <div className={s.row2}>
            <Input label="Início" type="date" value={recurStart} onChange={e => setRecurStart(e.target.value)} />
            <Input label="Fim" type="date" value={recurEnd} onChange={e => setRecurEnd(e.target.value)} />
          </div>

          {recurPreviewDates.length > 0 && (
            <div className={s.recurPreview}>
              <div className={s.recurPreviewHd}>{recurPreviewDates.length} sessão{recurPreviewDates.length !== 1 ? 'ões' : ''} a criar:</div>
              <div className={s.recurChips}>
                {recurPreviewDates.map(d => <span key={d} className={s.recurChip}>{d}</span>)}
              </div>
            </div>
          )}
          {recurDays.size === 0 && <div className={s.hintCenter}>Selecione ao menos um dia.</div>}
          {recurPreviewDates.length === 0 && recurDays.size > 0 && <div className={s.hintCenter}>Nenhuma data no período.</div>}
        </div>

        <div className={s.modalFoot}>
          {recurDone != null
            ? <div className={s.doneMsg} role="status">
                <i className="ti ti-check" aria-hidden="true" /> {recurDone} sessão{recurDone !== 1 ? 'ões' : ''} criada{recurDone !== 1 ? 's' : ''}!
              </div>
            : <Button variant="primary" full disabled={!recurPreviewDates.length} onClick={onApply}>
                <i className="ti ti-calendar-plus" aria-hidden="true" /> Criar {recurPreviewDates.length} sessão{recurPreviewDates.length !== 1 ? 'ões' : ''}
              </Button>
          }
        </div>
      </div>
    </div>
  );
}
