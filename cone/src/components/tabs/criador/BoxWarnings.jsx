import { useState } from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import s from './criador.module.css';

// Box warnings — feed index.html's "Avisos do box" strip (#53). A dated list scoped
// to the box selector: a box id → that box, 'all' → gym-wide, 'none' → hidden. The
// index shows the 3 most recent active in-scope ones.
//
// Desktop keeps the original inline row (date · message · on/off · remove — all
// live-editable in place). Mobile can't fit that row, so it renders compact
// read-only rows and edits through the same bottom-sheet pattern the exercise
// row uses (ex-sheet* — reused verbatim, both global classes in index.css):
// tap a row to edit it, "+ Adicionar" creates one and opens the sheet on it.
export function BoxWarnings({ selBox, boxLocs, boxWarnings, addWarning, patchWarning, removeWarning }) {
  const isMobile = useIsMobile();
  const [editingId, setEditingId] = useState(null);

  if (selBox === 'none') return null;
  const key = selBox;   // 'all' or a locationId
  const scopeName = selBox === 'all' ? 'todos os boxes' : (boxLocs.find(b => b.id === selBox)?.name || 'este box');
  const list = boxWarnings.filter(w => w.box === key).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const editing = list.find(w => w.id === editingId) || null;

  return (
    <div className={s.warnBox}>
      <div className={s.warnHd}>
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <span className={s.warnTitle}>Avisos — {scopeName}</span>
        <span className={s.toolbarSpacer} />
        {/* The sheet is a mobile affordance — on desktop the new row is edited
            inline, so only open the sheet (setEditingId) on mobile. Without this
            guard, adding a warning on desktop popped the mobile bottom sheet over
            the inline list. */}
        <Button size="xs" variant="ghost"
          onClick={() => { const id = addWarning(key); if (isMobile) setEditingId(id); }}>+ Adicionar</Button>
      </div>

      {isMobile ? (
        list.map(w => (
          <button key={w.id} type="button" className={s.warnRowMobile} onClick={() => setEditingId(w.id)}>
            <span className={s.warnDateChip}>{fmtWarnDateShort(w.date)}</span>
            <span className={s.warnMsgPreview}>{w.message?.trim() || 'Sem mensagem'}</span>
            <span className={`${s.warnDot}${w.active ? ' ' + s.warnDotOn : ''}`} aria-hidden="true" />
          </button>
        ))
      ) : (
        list.map(w => (
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
        ))
      )}

      {isMobile && editing && (
        <div className="ex-sheet-backdrop" onClick={() => setEditingId(null)}>
          <div className="ex-sheet" onClick={e => e.stopPropagation()}>
            <div className="ex-sheet-handle" />
            <div className="ex-sheet-header">
              <div className="ex-sheet-title">Aviso — {scopeName}</div>
            </div>
            <div className="ex-sheet-body">
              <Input label="Data" type="date" value={editing.date || ''}
                onChange={e => patchWarning(editing.id, { date: e.target.value })} />
              <Input as="textarea" label="Mensagem" className={s.mt2}
                placeholder="Mensagem — use ' — ' entre título e detalhe"
                value={editing.message || ''}
                onChange={e => patchWarning(editing.id, { message: e.target.value })} />
              <div className={s.mt2}>
                <span className={s.lbl}>Visibilidade</span>
                <div className={s.pillRow}>
                  {[{ label: 'Visível', val: true }, { label: 'Oculto', val: false }].map(({ label, val }) => {
                    const on = val ? !!editing.active : !editing.active;
                    return (
                      <button key={label} type="button" aria-pressed={on}
                        className={`${s.pill}${on ? ' ' + (val ? s.pillOn : s.pillOff) : ''}`}
                        onClick={() => patchWarning(editing.id, { active: val })}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button variant="ghost" size="sm" full className={s.mt3}
                onClick={() => { removeWarning(editing.id); setEditingId(null); }}>
                <i className="ti ti-trash" /> Remover aviso
              </Button>
            </div>
            <div className="ex-sheet-footer">
              <button className="ex-sheet-close" type="button" onClick={() => setEditingId(null)}>
                <i className="ti ti-check" /> Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// "22 jul" — short enough for the compact mobile row; the sheet's date input
// carries the full value.
function fmtWarnDateShort(date) {
  if (!date) return '';
  const [, m, d] = date.split('-').map(Number);
  const MONTH = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${d} ${MONTH[m - 1]}`;
}
