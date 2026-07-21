import { uid, toISO, todayISO } from '../../../utils/storage';
import { PLC } from '../../../utils/config';
import { DAY_PT } from '../../../public/lib/week.js';
import { sessName } from '../../../public/lib/sessions.js';
import { BoxWarnings } from './BoxWarnings';

// ── Week grid + collapsed day strip + box selector ────────────────────────────
export function WeekGrid({
  gridRef, weekOffset, setWeekOffset, weekLabel, weekGridCollapsed, setWeekGridCollapsed,
  boxLocs, selBox, setSelBox, boxWarnings, addWarning, patchWarning, removeWarning,
  weekDates, sessions, setSessions, boxFilter, editing, highlightedSessionId,
  startEdit, onDelete, formRef, setForm,
}) {
  const pickDate = dateKey => {
    setForm(f => ({ ...f, date: dateKey }));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  return (
    <div ref={gridRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <button type="button" className="b bsm" onClick={() => setWeekOffset(o => o-1)}><i className="ti ti-chevron-left" /></button>
        <span style={{ fontSize: 12, color: '#aaa', fontWeight: 600 }}>{weekLabel}</span>
        <button type="button" className="b bsm" onClick={() => setWeekOffset(o => o+1)}><i className="ti ti-chevron-right" /></button>
        {weekOffset !== 0 && (
          <button type="button" className="b bsm" style={{ fontSize: 11, color: '#e87820', borderColor: '#e87820' }} onClick={() => setWeekOffset(0)}>Hoje</button>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" className="b bsm" title={weekGridCollapsed ? 'Expandir grade' : 'Minimizar grade'}
          onClick={() => setWeekGridCollapsed(v => !v)}>
          <i className={`ti ti-layout-${weekGridCollapsed ? 'rows' : 'navbar'}`} />
        </button>
      </div>
      {/* Box context selector — filters the grid + sets the box new sessions inherit. Scrollable so any N boxes fit. */}
      {boxLocs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 4 }}>
          {[{ id: 'all', name: 'Todos', color: '#806850' }, { id: 'none', name: 'Sem box', color: '#554a3a' }, ...boxLocs].map(b => {
            const on = selBox === b.id;
            const accent = b.color || 'var(--theme-accent)';
            return (
              <button key={b.id} type="button" onClick={() => setSelBox(b.id)}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
                  border: `1px solid ${on ? accent : '#2a231c'}`,
                  background: on ? `${b.color || '#4ac8c0'}1a` : 'transparent',
                  color: on ? accent : '#806850' }}>
                {b.id !== 'all' && b.id !== 'none' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color || '#555', flexShrink: 0 }} />}
                {b.name}
              </button>
            );
          })}
        </div>
      )}
      <BoxWarnings
        selBox={selBox} boxLocs={boxLocs} boxWarnings={boxWarnings}
        addWarning={addWarning} patchWarning={patchWarning} removeWarning={removeWarning}
      />
      {weekGridCollapsed ? (
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
          {weekDates.map((date, di) => {
            const dateKey = toISO(date);
            const list = (sessions[dateKey] || []).filter(boxFilter);
            const isToday = dateKey === todayISO();
            const isEditing = (sessions[dateKey] || []).some(s => s.id === editing?.id);
            return (
              <button key={dateKey} type="button"
                style={{ flexShrink: 0, minWidth: 52, padding: '6px 8px', background: isEditing ? 'rgba(74,200,192,.08)' : isToday ? '#1a1a12' : '#161616', border: '1px solid ' + (isEditing ? '#4ac8c060' : isToday ? '#3a3a20' : '#252525'), borderRadius: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                onClick={() => pickDate(dateKey)}>
                <span style={{ fontSize: 10, fontWeight: 700, color: isToday ? '#d8a840' : '#666', textTransform: 'uppercase', letterSpacing: '.04em' }}>{DAY_PT[di]}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: isEditing ? '#4ac8c0' : isToday ? '#d8a840' : '#bbb' }}>{date.getDate()}</span>
                {list.length > 0 && <span style={{ fontSize: 10, color: '#4ac8c0', fontWeight: 700 }}>{list.length}</span>}
              </button>
            );
          })}
        </div>
      ) : (
      <div className="week-scroll">
        <div className="week-grid">
          {weekDates.map((date, di) => {
            const dateKey = toISO(date);
            const list = (sessions[dateKey] || []).filter(boxFilter);
            return (
              <div key={dateKey} className="wg-col">
                <div className="wg-head">
                  <span className="wg-day">{DAY_PT[di]} {date.getDate()}</span>
                  {list.length > 0 && <span className="wg-sub">{list.length}s</span>}
                </div>
                {list.map(s => (
                  <div key={s.id} className={`wg-sc${s.id === highlightedSessionId ? ' wg-saved' : ''}`} draggable
                    style={{ outline: editing?.id === s.id ? '2px solid #4ac8c0' : 'none', outlineOffset: 1 }}
                    onClick={() => startEdit(s, dateKey)}
                    onDragStart={e => { e.dataTransfer.setData('sess-id', s.id); e.dataTransfer.setData('sess-date', dateKey); e.dataTransfer.effectAllowed = 'move'; e.stopPropagation(); }}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); e.stopPropagation(); }}
                    onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                    onDrop={e => {
                      e.preventDefault(); e.stopPropagation();
                      e.currentTarget.classList.remove('drag-over');
                      const dragId = e.dataTransfer.getData('sess-id');
                      const dragDate = e.dataTransfer.getData('sess-date');
                      if (!dragId) return;
                      if (dragDate === dateKey && dragId !== s.id) {
                        setSessions(prev => {
                          const n = { ...prev };
                          const arr = [...(n[dateKey] || [])];
                          const from = arr.findIndex(x => x.id === dragId);
                          const to = arr.findIndex(x => x.id === s.id);
                          if (from < 0 || to < 0) return prev;
                          const [mv] = arr.splice(from, 1); arr.splice(to, 0, mv);
                          n[dateKey] = arr; return n;
                        });
                      } else if (dragDate !== dateKey) {
                        setSessions(prev => {
                          const n = { ...prev };
                          const dragSess = (n[dragDate] || []).find(x => x.id === dragId);
                          if (!dragSess) return prev;
                          n[dragDate] = (n[dragDate] || []).filter(x => x.id !== dragId);
                          n[dateKey] = [...(n[dateKey] || []), { ...dragSess, date: dateKey }];
                          return n;
                        });
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, marginBottom: 5 }}>
                      <span className="wg-sc-name">{sessName(s, dateKey)}</span>
                      <button type="button" className="b bd"
                        style={{ padding: '2px 6px', fontSize: 10, minHeight: 20, flexShrink: 0 }}
                        onClick={e => { e.stopPropagation(); onDelete(dateKey, s.id); }}>
                        <i className="ti ti-x" />
                      </button>
                    </div>
                    {(s.blocks || []).map(bl => (
                      <div key={bl.id} style={{ marginBottom: 3 }}>
                        <span className={`wg-pill ${PLC[bl.type] || 'p-st'}`}>{bl.type}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div className="wg-add-row">
                  <div className="wg-add" onClick={() => pickDate(dateKey)}>
                    <i className="ti ti-plus" /> add
                  </div>
                  <div className="wg-copy" onClick={() => {
                    const daySess = sessions[dateKey] || [];
                    if (!daySess.length) return;
                    const last = daySess[daySess.length-1];
                    const copied = { ...last, id: uid(), date: dateKey, mainTraining: '', blocks: (last.blocks||[]).map(bl => ({ ...bl, id: uid(), exercises: (bl.exercises||[]).map(ex => ({ ...ex, id: uid() })) })) };
                    setSessions(prev => { const n = { ...prev }; n[dateKey] = [...(n[dateKey]||[]), copied]; return n; });
                  }}>
                    <i className="ti ti-copy" /> copy
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
