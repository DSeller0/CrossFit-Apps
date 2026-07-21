import { PLC } from '../../../utils/config';

// ── Templates modal ────────────────────────────────────────────────────────────
export function TemplatesModal({ templates, onClose, onApply, onDelete, onRecurring }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#0d0d0d', border: '1px solid #2e2e2e', borderRadius: 12, padding: 18, width: 380, maxWidth: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Templates</span>
          <button type="button" className="b bsm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        {templates.length === 0
          ? <div style={{ textAlign: 'center', padding: '30px 0', color: '#444', fontSize: 13 }}>
              <i className="ti ti-bookmark-off" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
              Nenhum template salvo.<br/>
              <span style={{ fontSize: 11 }}>Monte uma sessão e clique em 🔖 para salvar.</span>
            </div>
          : <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {templates.map(tpl => (
                <div key={tpl.id}
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'border-color .12s' }}
                  onClick={() => onApply(tpl)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#9070d8'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e0', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</div>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 5 }}>{tpl.blocks.length} bloco{tpl.blocks.length !== 1 ? 's' : ''}</div>
                    {tpl.blocks.length > 0 && (() => {
                      const types = tpl.blocks.map(b => b.type || b.label || '?');
                      const shown = types.slice(0, 10);
                      const rest = types.length - 10;
                      return (
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {shown.map((t, i) => <span key={i} className={`wg-pill ${PLC[t] || 'p-st'}`}>{t}</span>)}
                          {rest > 0 && <span style={{ fontSize: 10, color: '#555', alignSelf: 'center' }}>+{rest}</span>}
                        </div>
                      );
                    })()}
                  </div>
                  <button type="button" className="b bsm" style={{ flexShrink: 0, borderColor: '#1a4a3a', color: '#4ac8a0' }}
                    onClick={e => { e.stopPropagation(); onRecurring(tpl); }} title="Sessões recorrentes">
                    <i className="ti ti-repeat" />
                  </button>
                  <button type="button" className="b bd bsm" style={{ flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); onDelete(tpl.id); }} title="Excluir template">
                    <i className="ti ti-trash" />
                  </button>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}
