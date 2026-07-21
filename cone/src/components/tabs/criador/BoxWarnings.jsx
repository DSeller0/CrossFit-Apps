// Box warnings — feed index.html's "Avisos do box" strip (#53). A dated list scoped
// to the box selector: a box id → that box, 'all' → gym-wide, 'none' → hidden. The
// index shows the 3 most recent active in-scope ones.
export function BoxWarnings({ selBox, boxLocs, boxWarnings, addWarning, patchWarning, removeWarning }) {
  if (selBox === 'none') return null;
  const key = selBox;   // 'all' or a locationId
  const scopeName = selBox === 'all' ? 'todos os boxes' : (boxLocs.find(b => b.id === selBox)?.name || 'este box');
  const list = boxWarnings.filter(w => w.box === key).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return (
    <div style={{ marginBottom: 8, padding: '8px 10px', background: '#141210', border: '1px solid #2a231c', borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-alert-triangle" style={{ color: '#d8a840', fontSize: 14 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#c8b090', letterSpacing: '.04em' }}>Avisos — {scopeName}</span>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => addWarning(key)}
          style={{ fontSize: 11, fontWeight: 700, fontFamily: 'inherit', color: '#4ac8c0', background: 'transparent', border: '1px solid #2a4a48', borderRadius: 4, padding: '3px 10px', cursor: 'pointer' }}>
          + Adicionar
        </button>
      </div>
      {list.map(w => (
        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <input type="date" value={w.date || ''} onChange={e => patchWarning(w.id, { date: e.target.value })}
            style={{ flexShrink: 0, background: '#1e1a16', border: '1px solid #2a231c', color: '#c8b090', fontSize: 11, fontFamily: 'inherit', padding: '3px 6px', borderRadius: 4 }} />
          <input type="text" value={w.message} onChange={e => patchWarning(w.id, { message: e.target.value })}
            placeholder="Mensagem — use ' — ' entre título e detalhe"
            style={{ flex: 1, minWidth: 0, background: '#1e1a16', border: '1px solid #2a231c', color: '#e8e2d4', fontSize: 12, fontFamily: 'inherit', padding: '4px 8px', borderRadius: 4, outline: 'none' }} />
          <button type="button" onClick={() => patchWarning(w.id, { active: !w.active })}
            title={w.active ? 'Visível — clique para ocultar' : 'Oculto — clique para exibir'}
            style={{ flexShrink: 0, padding: '3px 9px', borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '.05em', cursor: 'pointer',
              border: `1px solid ${w.active ? '#4ac8c0' : '#2a231c'}`, background: w.active ? 'rgba(74,200,192,.12)' : 'transparent', color: w.active ? '#4ac8c0' : '#806850' }}>
            {w.active ? '● On' : 'Off'}
          </button>
          <button type="button" onClick={() => removeWarning(w.id)} title="Remover"
            style={{ flexShrink: 0, background: 'transparent', border: 'none', color: '#806850', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '2px 4px' }}>
            <i className="ti ti-x" />
          </button>
        </div>
      ))}
    </div>
  );
}
