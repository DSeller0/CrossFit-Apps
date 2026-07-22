import Button from '../../ui/Button.jsx';
import s from './criador.module.css';

// Box warnings — feed index.html's "Avisos do box" strip (#53). A dated list scoped
// to the box selector: a box id → that box, 'all' → gym-wide, 'none' → hidden. The
// index shows the 3 most recent active in-scope ones.
export function BoxWarnings({ selBox, boxLocs, boxWarnings, addWarning, patchWarning, removeWarning }) {
  if (selBox === 'none') return null;
  const key = selBox;   // 'all' or a locationId
  const scopeName = selBox === 'all' ? 'todos os boxes' : (boxLocs.find(b => b.id === selBox)?.name || 'este box');
  const list = boxWarnings.filter(w => w.box === key).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return (
    <div className={s.warnBox}>
      <div className={s.warnHd}>
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <span className={s.warnTitle}>Avisos — {scopeName}</span>
        <span className={s.toolbarSpacer} />
        <Button size="xs" variant="ghost" onClick={() => addWarning(key)}>+ Adicionar</Button>
      </div>
      {list.map(w => (
        <div key={w.id} className={s.warnRow}>
          <input type="date" className={s.warnDate} value={w.date || ''}
            aria-label="Data do aviso"
            onChange={e => patchWarning(w.id, { date: e.target.value })} />
          <input type="text" className={s.warnMsg} value={w.message}
            aria-label="Mensagem do aviso"
            placeholder="Mensagem — use ' — ' entre título e detalhe"
            onChange={e => patchWarning(w.id, { message: e.target.value })} />
          <button type="button"
            className={`${s.warnToggle}${w.active ? ' ' + s.warnToggleOn : ''}`}
            aria-pressed={w.active}
            title={w.active ? 'Visível — clique para ocultar' : 'Oculto — clique para exibir'}
            onClick={() => patchWarning(w.id, { active: !w.active })}>
            {w.active ? '● On' : 'Off'}
          </button>
          <Button size="xs" iconOnly variant="ghost" aria-label="Remover aviso"
            onClick={() => removeWarning(w.id)}>
            <i className="ti ti-x" />
          </Button>
        </div>
      ))}
    </div>
  );
}
