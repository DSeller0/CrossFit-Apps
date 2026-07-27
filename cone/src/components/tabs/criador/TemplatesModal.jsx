import { PLC } from '../../../utils/config'
import Button from '../../ui/Button.jsx'
import s from './criador.module.css'

// ── Templates modal ────────────────────────────────────────────────────────────
export function TemplatesModal({ templates, onClose, onApply, onDelete, onRecurring }) {
  return (
    <div className={s.scrim} onClick={onClose}>
      <div
        className={`${s.modal} ${s.modalSm}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-tpl-title"
        onClick={e => e.stopPropagation()}
      >
        <div className={s.modalHd}>
          <span id="cr-tpl-title" className={s.modalTitle}>
            Templates
          </span>
          <Button size="xs" iconOnly variant="ghost" aria-label="Fechar" onClick={onClose}>
            <i className="ti ti-x" />
          </Button>
        </div>
        <div className={s.modalBody}>
          {templates.length === 0 ? (
            <div className={s.emptyBox}>
              <i className="ti ti-bookmark-off" aria-hidden="true" />
              Nenhum template salvo.
              <br />
              <span className={s.emptyBoxHint}>Monte uma sessão e clique em 🔖 para salvar.</span>
            </div>
          ) : (
            <div className={s.tplList}>
              {templates.map(tpl => (
                <div
                  key={tpl.id}
                  className={s.tplCard}
                  role="button"
                  tabIndex={0}
                  aria-label={`Aplicar template ${tpl.name}`}
                  onClick={() => onApply(tpl)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onApply(tpl)
                    }
                  }}
                >
                  <div className={s.tplBody}>
                    <div className={s.tplName}>{tpl.name}</div>
                    <div className={s.tplSub}>
                      {tpl.blocks.length} bloco{tpl.blocks.length !== 1 ? 's' : ''}
                    </div>
                    {tpl.blocks.length > 0 &&
                      (() => {
                        const types = tpl.blocks.map(b => b.type || b.label || '?')
                        const shown = types.slice(0, 10)
                        const rest = types.length - 10
                        return (
                          <div className={s.tplPills}>
                            {shown.map((t, i) => (
                              <span key={i} className={`wg-pill ${PLC[t] || 'p-st'}`}>
                                {t}
                              </span>
                            ))}
                            {rest > 0 && <span className={s.tplMore}>+{rest}</span>}
                          </div>
                        )
                      })()}
                  </div>
                  <Button
                    size="xs"
                    iconOnly
                    aria-label={`Sessões recorrentes de ${tpl.name}`}
                    title="Sessões recorrentes"
                    onClick={e => {
                      e.stopPropagation()
                      onRecurring(tpl)
                    }}
                  >
                    <i className="ti ti-repeat" />
                  </Button>
                  <Button
                    size="xs"
                    iconOnly
                    variant="destructive"
                    aria-label={`Excluir template ${tpl.name}`}
                    title="Excluir template"
                    onClick={e => {
                      e.stopPropagation()
                      onDelete(tpl.id)
                    }}
                  >
                    <i className="ti ti-trash" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
