// ── Recurring sessions modal ──────────────────────────────────────────────────
export function RecurringModal({ recurringTpl, onClose, recurDays, setRecurDays, recurStart, setRecurStart, recurEnd, setRecurEnd, recurPreviewDates, recurDone, onApply }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#0d0d0d', border: '1px solid #1a4a3a', borderRadius: 12, padding: 20, width: 360, maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 14 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#4ac8a0' }}><i className="ti ti-repeat" style={{ marginRight: 6 }} />Sessões Recorrentes</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{recurringTpl.name}</div>
          </div>
          <button type="button" className="b bsm" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Dias da semana</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['Dom',0],['Seg',1],['Ter',2],['Qua',3],['Qui',4],['Sex',5],['Sáb',6]].map(([label, day]) => (
              <button key={day} type="button"
                style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid', cursor: 'pointer', transition: 'all .12s',
                  borderColor: recurDays.has(day) ? '#4ac8a0' : '#2a2a2a',
                  background: recurDays.has(day) ? 'rgba(74,200,160,.15)' : 'transparent',
                  color: recurDays.has(day) ? '#4ac8a0' : '#555' }}
                onClick={() => setRecurDays(prev => { const s = new Set(prev); s.has(day) ? s.delete(day) : s.add(day); return s; })}
              >{label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[['Início', recurStart, setRecurStart], ['Fim', recurEnd, setRecurEnd]].map(([lbl, val, setter]) => (
            <label key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '.05em' }}>{lbl}</span>
              <input type="date" value={val} onChange={e => setter(e.target.value)}
                style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, color: '#ddd', padding: '6px 8px', fontSize: 13 }} />
            </label>
          ))}
        </div>
        {recurPreviewDates.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 10, maxHeight: 140, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>{recurPreviewDates.length} sessão{recurPreviewDates.length !== 1 ? 'ões' : ''} a criar:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {recurPreviewDates.map(d => (
                <span key={d} style={{ fontSize: 11, background: 'rgba(74,200,160,.1)', border: '1px solid rgba(74,200,160,.2)', borderRadius: 4, padding: '2px 6px', color: '#4ac8a0' }}>{d}</span>
              ))}
            </div>
          </div>
        )}
        {recurDays.size === 0 && <div style={{ fontSize: 12, color: '#664', textAlign: 'center' }}>Selecione ao menos um dia.</div>}
        {recurPreviewDates.length === 0 && recurDays.size > 0 && <div style={{ fontSize: 12, color: '#664', textAlign: 'center' }}>Nenhuma data no período.</div>}
        {recurDone != null
          ? <div style={{ textAlign: 'center', fontSize: 14, color: '#4ac8a0', fontWeight: 700 }}>
              <i className="ti ti-check" style={{ marginRight: 6 }} />{recurDone} sessão{recurDone !== 1 ? 'ões' : ''} criada{recurDone !== 1 ? 's' : ''}!
            </div>
          : <button type="button" className="b bp" disabled={!recurPreviewDates.length} style={{ width: '100%', opacity: recurPreviewDates.length ? 1 : .4 }} onClick={onApply}>
              <i className="ti ti-calendar-plus" style={{ marginRight: 6 }} />Criar {recurPreviewDates.length} sessão{recurPreviewDates.length !== 1 ? 'ões' : ''}
            </button>
        }
      </div>
    </div>
  );
}
