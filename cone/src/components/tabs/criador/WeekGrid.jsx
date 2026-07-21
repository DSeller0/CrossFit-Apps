import { useState } from 'react';
import { uid, toISO, todayISO } from '../../../utils/storage';
import { DAY_PT } from '../../../public/lib/week.js';
import { sessName } from '../../../public/lib/sessions.js';
import { serializeSession } from './textFormat.js';
import { BoxWarnings } from './BoxWarnings';
import { WeekSessionCard } from './WeekSessionCard';
import { useIsMobile } from '../../../hooks/useIsMobile';
import s from './textMode.module.css';

// Copy helper — clipboard writes can reject (permissions, insecure origin), and a
// silent failure on a "Copiar" button is worse than no button.
function useCopy() {
  const [copied, setCopied] = useState(null);
  const copy = (key, text) => {
    navigator.clipboard?.writeText(text).then(
      () => { setCopied(key); setTimeout(() => setCopied(null), 1600); },
      () => { setCopied(`${key}:err`); setTimeout(() => setCopied(null), 1600); },
    );
  };
  return [copied, copy];
}

// ── Week grid + collapsed day strip + box selector ────────────────────────────
// The grid has two render modes (#92) — Grade (ExerciseList) and Texto (the
// coach's own notation). It is deliberately the SAME grid in both: same columns,
// same box filter, same week arrows. Comparing Monday against Tuesday costs
// nothing because the grid is already the always-on-screen surface.
export function WeekGrid({
  gridRef, weekOffset, setWeekOffset, weekLabel, weekGridCollapsed, setWeekGridCollapsed,
  boxLocs, selBox, setSelBox, boxWarnings, addWarning, patchWarning, removeWarning,
  weekDates, sessions, setSessions, boxFilter, editing, highlightedSessionId,
  startEdit, onDelete, formRef, setForm, gridMode, setGridMode, onImport,
}) {
  const isMobile = useIsMobile();
  const [openId, setOpenId] = useState(null);      // mobile: which card is expanded
  const [copied, copy] = useCopy();
  const isText = gridMode === 'texto';

  const pickDate = dateKey => {
    setForm(f => ({ ...f, date: dateKey }));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const weekSessions = weekDates.flatMap(d => (sessions[toISO(d)] || []).filter(boxFilter).map(sess => ({ date: d, dateKey: toISO(d), sess })));

  const copyWeek = () => copy('week', weekSessions
    .map(({ date, sess }) => `${DAY_PT[date.getDay()]} ${date.getDate()} — ${sessName(sess, toISO(date))}\n\n${serializeSession(sess)}`)
    .join('\n\n────────────\n\n'));

  const copySession = (key, sess) => copy(key, serializeSession(sess));

  const dupSession = dateKey => {
    const daySess = sessions[dateKey] || [];
    if (!daySess.length) return;
    const last = daySess[daySess.length - 1];
    const copied2 = { ...last, id: uid(), date: dateKey, mainTraining: '', blocks: (last.blocks || []).map(bl => ({ ...bl, id: uid(), exercises: (bl.exercises || []).map(ex => ({ ...ex, id: uid() })) })) };
    setSessions(prev => { const n = { ...prev }; n[dateKey] = [...(n[dateKey] || []), copied2]; return n; });
  };

  const moveSession = (dragId, dragDate, dateKey, overId) => {
    if (!dragId) return;
    if (dragDate === dateKey && dragId !== overId) {
      setSessions(prev => {
        const n = { ...prev };
        const arr = [...(n[dateKey] || [])];
        const from = arr.findIndex(x => x.id === dragId);
        const to = arr.findIndex(x => x.id === overId);
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
        {/* Grade / Texto — a render mode of this grid, never persisted */}
        <span className={s.modeSeg} role="group" aria-label="Modo da grade">
          <button type="button" className={!isText ? s.on : ''} aria-pressed={!isText}
            onClick={() => setGridMode('grade')} title="Ver como lista de exercícios">▤ Grade</button>
          <button type="button" className={isText ? s.on : ''} aria-pressed={isText}
            onClick={() => setGridMode('texto')} title="Ver como texto">¶ Texto</button>
        </span>
        {isText && weekSessions.length > 0 && (
          <button type="button" className="b bsm" onClick={copyWeek} title="Copiar a semana inteira como texto">
            <i className={`ti ${copied === 'week' ? 'ti-check' : 'ti-copy'}`} /> {copied === 'week' ? 'Copiado' : 'Copiar semana'}
          </button>
        )}
        {onImport && (
          <button type="button" className="b bsm" onClick={onImport} title="Colar a semana inteira de uma vez">
            <i className="ti ti-clipboard-text" /> Importar
          </button>
        )}
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
            const isEditing = (sessions[dateKey] || []).some(x => x.id === editing?.id);
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
      ) : isMobile ? (
        /* ── Mobile: the columns stack. A card is collapsed until tapped, then
              opens READ-ONLY in whichever mode is active; "Editar" opens the
              editor. Editing inline in this list is plans/37's slice. ── */
        <div style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
          {weekDates.map((date, di) => {
            const dateKey = toISO(date);
            const list = (sessions[dateKey] || []).filter(boxFilter);
            if (!list.length) {
              return (
                <button key={dateKey} type="button" className={s.mRow} onClick={() => pickDate(dateKey)}>
                  <span className={s.mChev} />
                  <span className={s.mDay}>{DAY_PT[di]} {date.getDate()}</span>
                  <span className={`${s.mName} ${s.mNameEmpty}`}>sem sessão</span>
                  <span className={s.mCount}>+ add</span>
                </button>
              );
            }
            return list.map(sess => {
              const open = openId === sess.id;
              return (
                <div key={sess.id}>
                  <button type="button" className={`${s.mRow} ${open ? s.mRowOpen : ''}`}
                    aria-expanded={open} onClick={() => setOpenId(open ? null : sess.id)}>
                    <span className={s.mChev}><i className={`ti ti-chevron-${open ? 'down' : 'right'}`} /></span>
                    <span className={s.mDay}>{DAY_PT[di]} {date.getDate()}</span>
                    <span className={s.mName}>{sessName(sess, dateKey)}</span>
                    <span className={s.mCount}>{(sess.blocks || []).length} blocos</span>
                  </button>
                  {open && (
                    <div className={s.mBody}>
                      <WeekSessionCard session={sess} mode={gridMode} />
                      <div className={s.mActions}>
                        {isText && (
                          <button type="button" className="b bsm" onClick={() => copySession(sess.id, sess)}>
                            <i className={`ti ${copied === sess.id ? 'ti-check' : 'ti-copy'}`} /> {copied === sess.id ? 'Copiado' : 'Copiar'}
                          </button>
                        )}
                        <button type="button" className="b bd bsm" onClick={() => onDelete(dateKey, sess.id)}>
                          <i className="ti ti-trash" />
                        </button>
                        <button type="button" className="b bp bsm" onClick={() => startEdit(sess, dateKey)}>
                          <i className="ti ti-pencil" /> Editar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            });
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
                {list.map(sess => (
                  <div key={sess.id} className={`wg-sc${sess.id === highlightedSessionId ? ' wg-saved' : ''}`} draggable
                    style={{ outline: editing?.id === sess.id ? '2px solid #4ac8c0' : 'none', outlineOffset: 1 }}
                    onClick={() => startEdit(sess, dateKey)}
                    onDragStart={e => { e.dataTransfer.setData('sess-id', sess.id); e.dataTransfer.setData('sess-date', dateKey); e.dataTransfer.effectAllowed = 'move'; e.stopPropagation(); }}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); e.stopPropagation(); }}
                    onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                    onDrop={e => {
                      e.preventDefault(); e.stopPropagation();
                      e.currentTarget.classList.remove('drag-over');
                      moveSession(e.dataTransfer.getData('sess-id'), e.dataTransfer.getData('sess-date'), dateKey, sess.id);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, marginBottom: 5 }}>
                      <span className="wg-sc-name">{sessName(sess, dateKey)}</span>
                      <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        {isText && (
                          <button type="button" className="b"
                            style={{ padding: '2px 6px', fontSize: 10, minHeight: 20 }}
                            title="Copiar este dia como texto"
                            onClick={e => { e.stopPropagation(); copySession(sess.id, sess); }}>
                            <i className={`ti ${copied === sess.id ? 'ti-check' : 'ti-copy'}`} />
                          </button>
                        )}
                        <button type="button" className="b bd"
                          style={{ padding: '2px 6px', fontSize: 10, minHeight: 20 }}
                          onClick={e => { e.stopPropagation(); onDelete(dateKey, sess.id); }}>
                          <i className="ti ti-x" />
                        </button>
                      </span>
                    </div>
                    <WeekSessionCard session={sess} mode={gridMode} />
                  </div>
                ))}
                <div className="wg-add-row">
                  <div className="wg-add" onClick={() => pickDate(dateKey)}>
                    <i className="ti ti-plus" /> add
                  </div>
                  <div className="wg-copy" onClick={() => dupSession(dateKey)}>
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
