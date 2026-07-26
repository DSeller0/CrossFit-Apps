import React, { useState, useEffect } from 'react';
import { loadLocations, getTargets, toISO } from '../../../utils/storage';
import { MONTH_PT, DAY_PT_TITLE } from '../../../public/lib/week.js';
import { sessName } from '../../../public/lib/sessions.js';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { getWeeksOfMonth } from './exportHelpers';
import { EventFormInner, ReportModal } from './events';

// ── AgendaView ────────────────────────────────────────────────────────────────
export function AgendaView({ sessions, events, setEvents, athletes, onEditSession, onLogResult }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [filter, setFilter] = useState('all');
  const [selDay, setSelDay] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [showForm, setShowForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [viewWeekIdx, setViewWeekIdx] = useState(0);
  const isMobile = useIsMobile(800);

  const todayISO = toISO(new Date());
  // Deliberate per-type rainbow for the mini-calendar dots below — distinct color per
  // block *type*, not the 4-family blkColor taxonomy. Verified #84 — do not collapse
  // into blkColor; its hardcoded hex is #59's (Publicador design pass), not this one.
  const BLOCK_C = { 'Força': '#d8a840', 'LPO': '#4ac8c0', 'For Time': '#e87820', 'Core': '#68d8a0', 'Acessórios': '#c884f0', 'AMRAP': '#e87820', 'Cardio': '#64b5f6', 'EMOM': '#ff8a65', 'WOD': '#e87820', 'HIIT': '#ff6d00' };
  const mobileWeeks = getWeeksOfMonth(year, month);

  const locs = loadLocations();
  function svcName(ev) {
    if (ev.type === 'personal') return 'Personal';
    const svc = ev.locationId ? locs.find(l => l.id === ev.locationId) : null;
    return svc?.name || 'Aula';
  }
  function evStatus(ev) { return ev.status === 'completed' ? 'completed' : 'scheduled'; }
  function dayEvents(iso) {
    const evs = (events[iso] || []).filter(ev => { if (filter === 'all') return true; return filter === evStatus(ev); });
    return evs.sort((a, b) => a.time.localeCompare(b.time));
  }
  function dayGymSessions(iso) { return (sessions[iso] || []).filter(s => getTargets(s).length === 0); }

  const weeks = mobileWeeks.map(week => week.map(d => d.getMonth() === month ? d.getDate() : null));
  const cells = weeks.flat();

  let totalAulas = 0, totalPersonal = 0, completedAulas = 0, completedPersonal = 0;
  cells.filter(Boolean).forEach(d => {
    const iso = toISO2(year, month, d);
    const evs = events[iso] || [];
    evs.forEach(ev => {
      const done = evStatus(ev) === 'completed';
      if (ev.type === 'aula') { totalAulas++; if (done) completedAulas++; }
      if (ev.type === 'personal') { totalPersonal++; if (done) completedPersonal++; }
    });
  });
  const totalEvs = totalAulas + totalPersonal;
  const totalCompleted = completedAulas + completedPersonal;

  useEffect(() => {
    const now = new Date();
    if (now.getFullYear() === year && now.getMonth() === month) {
      const idx = mobileWeeks.findIndex(w => now >= w[0] && now <= w[6]);
      setViewWeekIdx(idx >= 0 ? idx : 0);
    } else {
      setViewWeekIdx(0);
    }
  }, [year, month]);

  function uid2() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function toISO2(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }

  function saveEvent(ev) {
    setEvents(prev => {
      const d = { ...prev };
      const list = [...(d[ev.date] || [])];
      const idx = list.findIndex(e => e.id === ev.id);
      if (idx >= 0) list[idx] = ev; else list.push(ev);
      list.sort((a, b) => a.time.localeCompare(b.time));
      return { ...d, [ev.date]: list };
    });
  }
  function deleteEvent(date, id) {
    setEvents(prev => {
      const d = { ...prev };
      d[date] = (d[date] || []).filter(e => e.id !== id);
      if (!d[date].length) delete d[date];
      return { ...d };
    });
  }
  function toggleStatus(date, id) {
    setEvents(prev => {
      const list = prev[date] || [];
      const ev = list.find(e => e.id === id);
      if (!ev) return prev;
      const updated = { ...ev, status: ev.status === 'completed' ? 'scheduled' : 'completed' };
      return { ...prev, [date]: list.map(e => e.id === id ? updated : e) };
    });
  }
  function openForm(type, date, existingEv) {
    const defaults = existingEv
      ? { ...existingEv, id: existingEv.id || uid2() }
      : { id: uid2(), date, time: '07:00', durationMin: 60, type, label: type === 'aula' ? 'Turma Manhã' : '', sessionId: null, athleteIds: [], status: 'scheduled', notes: '' };
    setFormData(defaults);
    setShowForm({ type, eventId: existingEv?.id || null, date });
  }

  function CellDay({ day }) {
    const iso = toISO2(year, month, day);
    const isToday = iso === todayISO;
    const isPast = iso < todayISO;
    const isSelected = selDay === iso;
    const gymSessions = dayGymSessions(iso);
    const evs = dayEvents(iso);
    const allCards = [...gymSessions.map(s => ({ kind: 'session', data: s })), ...evs.map(ev => ({ kind: 'event', data: ev }))];
    return React.createElement('div', { onClick: () => setSelDay(isSelected ? null : iso), className: 'agenda-cell', style: { borderRight: '1px solid #2a2318', padding: '5px', cursor: 'pointer', background: isSelected ? 'rgba(74,200,192,.07)' : isToday ? 'rgba(74,200,192,.04)' : 'transparent', borderBottom: 'none', transition: 'background .1s' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' } },
        isToday
          ? React.createElement('span', { style: { width: '20px', height: '20px', borderRadius: '50%', background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 } }, day)
          : React.createElement('span', { style: { fontSize: '11px', color: isPast ? '#554a3a' : '#c8b090', fontWeight: isToday ? 700 : 400 } }, day),
        allCards.length > 0 && React.createElement('span', { style: { fontSize: '9px', color: '#554a3a' } }, allCards.length)
      ),
      allCards.slice(0, 3).map((card, ci) => {
        if (card.kind === 'session') {
          const s = card.data;
          return React.createElement('div', { key: 's' + ci, className: 'cell-card', style: { marginBottom: '2px', padding: '2px 4px', borderRadius: '3px', borderLeft: '2px solid var(--theme-accent)', background: 'rgba(74,200,192,.06)' } },
            React.createElement('div', { className: 'cell-card-full', style: { fontSize: '9px', fontWeight: 700, color: 'var(--theme-accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', alignItems: 'center' } },
              React.createElement('i', { className: 'ti ti-calendar-event', style: { fontSize: '8px', marginRight: '2px' }, 'aria-hidden': 'true' }),
              sessName(s, iso)
            ),
            React.createElement('div', { className: 'cell-card-mini' },
              React.createElement('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: 'var(--theme-accent)', display: 'inline-block' } })
            )
          );
        }
        const ev = card.data;
        const isPers = ev.type === 'personal';
        const done = evStatus(ev) === 'completed';
        const borderCol = isPers ? '#d8a840' : 'var(--theme-accent)';
        const ath = isPers && ev.athleteIds?.[0] ? athletes.find(a => a.id === ev.athleteIds[0]) : null;
        return React.createElement('div', { key: 'e' + ci, className: 'cell-card', style: { marginBottom: '2px', padding: '2px 4px', borderRadius: '3px', borderLeft: `2px solid ${borderCol}`, background: isPers ? 'rgba(216,168,64,.07)' : 'rgba(74,200,192,.06)', opacity: done ? .75 : 1 } },
          React.createElement('div', { className: 'cell-card-full', style: { alignItems: 'center', gap: '3px' } },
            done && React.createElement('span', { style: { fontSize: '8px', color: '#68d8a0' } }, '✓'),
            React.createElement('span', { style: { fontSize: '9px', color: '#888' } }, ev.time),
            React.createElement('span', { style: { fontSize: '9px', fontWeight: 700, color: isPers ? '#d8a840' : '#c8b090', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70px' } },
              ath ? React.createElement('span', null, React.createElement('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: ath.color, display: 'inline-block', marginRight: '2px' } }), ev.label) : ev.label
            )
          ),
          React.createElement('div', { className: 'cell-card-mini', style: { alignItems: 'center', gap: '2px' } },
            done && React.createElement('span', { style: { fontSize: '8px', color: '#68d8a0' } }, '✓'),
            React.createElement('span', { style: { fontSize: '9px', color: '#666' } }, ev.time),
            React.createElement('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: ath ? ath.color : borderCol, display: 'inline-block', flexShrink: 0 } })
          )
        );
      }),
      allCards.length > 3 && React.createElement('div', { style: { fontSize: '8px', color: '#554a3a', paddingLeft: '4px' } }, `+${allCards.length - 3} mais`)
    );
  }

  function DayPane() {
    if (!selDay) return React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#3a3028', fontSize: '12px', fontStyle: 'italic', padding: '40px 0' } }, 'Clique num dia para ver detalhes');
    const iso = selDay;
    const d = new Date(iso + 'T12:00:00');
    const dateLabel = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    const gymSessions = dayGymSessions(iso);
    const evs = (events[iso] || []).sort((a, b) => a.time.localeCompare(b.time));
    return React.createElement('div', { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
      React.createElement('div', { style: { padding: '10px 14px', borderBottom: '1px solid #2a2318', flexShrink: 0 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } },
          React.createElement('span', { style: { fontSize: '13px', fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'capitalize' } }, dateLabel),
          React.createElement('button', { onClick: () => setSelDay(null), style: { background: 'transparent', border: '1px solid #2a2318', color: '#887060', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', lineHeight: 1 } }, '✕')
        ),
        React.createElement('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          React.createElement('button', { onClick: () => openForm('aula', iso), style: { background: 'rgba(74,200,192,.08)', border: '1px solid rgba(74,200,192,.25)', color: 'var(--theme-accent)', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' } }, React.createElement('i', { className: 'ti ti-plus', 'aria-hidden': 'true' }), 'Aula'),
          React.createElement('button', { onClick: () => openForm('personal', iso), style: { background: 'rgba(216,168,64,.08)', border: '1px solid rgba(216,168,64,.25)', color: '#d8a840', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' } }, React.createElement('i', { className: 'ti ti-plus', 'aria-hidden': 'true' }), 'Personal'),
          onEditSession && React.createElement('button', { onClick: () => onEditSession({ _newForDate: iso }), style: { background: 'rgba(104,216,160,.08)', border: '1px solid rgba(104,216,160,.25)', color: '#68d8a0', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' } }, React.createElement('i', { className: 'ti ti-calendar-plus', 'aria-hidden': 'true' }), 'Sessão')
        )
      ),
      React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '10px 14px' } },
        gymSessions.length > 0 && React.createElement('div', { style: { marginBottom: '12px' } },
          React.createElement('div', { style: { fontSize: '10px', color: '#554a3a', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '6px' } }, 'Sessão do dia'),
          gymSessions.map((s, si) => React.createElement('div', { key: si, style: { background: '#0d0b08', border: '1px solid #2a2318', borderTop: '2px solid var(--theme-accent)', borderRadius: '6px', padding: '8px 10px', marginBottom: '6px' } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' } },
              React.createElement('span', { style: { fontSize: '12px', fontWeight: 700, color: '#c8b090' } }, sessName(s, iso)),
              React.createElement('div', { style: { display: 'flex', gap: '4px' } },
                onEditSession && React.createElement('button', { onClick: e => { e.stopPropagation(); onEditSession(s); }, style: { background: 'transparent', border: '1px solid #2a2318', color: '#554a3a', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', fontWeight: 700 } }, 'Editar')
              )
            ),
            React.createElement('div', { style: { display: 'flex', gap: '3px', flexWrap: 'wrap' } },
              (s.blocks || []).map((bl, bi) => {
                const lbl = bl.label && bl.label !== '-' ? bl.label : bl.type;
                return React.createElement('span', { key: bi, style: { fontSize: '9px', fontWeight: 700, padding: '1px 4px', borderRadius: '2px', background: (BLOCK_C[lbl] || BLOCK_C[bl.type] || '#555') + '22', color: BLOCK_C[lbl] || BLOCK_C[bl.type] || '#aaa', border: `1px solid ${(BLOCK_C[lbl] || BLOCK_C[bl.type] || '#555')}44` } }, lbl);
              })
            )
          ))
        ),
        evs.length === 0 && gymSessions.length === 0 && React.createElement('div', { style: { color: '#3a3028', fontSize: '12px', fontStyle: 'italic', padding: '20px 0 0' } }, 'Sem eventos. Use os botões acima para adicionar.'),
        evs.length > 0 && React.createElement('div', { style: { marginBottom: '6px' } },
          React.createElement('div', { style: { fontSize: '10px', color: '#554a3a', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' } }, 'Agenda'),
          evs.map((ev, ei) => {
            const isPers = ev.type === 'personal';
            const done = evStatus(ev) === 'completed';
            const borderCol = isPers ? '#d8a840' : 'var(--theme-accent)';
            const athList = (ev.athleteIds || []).map(id => athletes.find(a => a.id === id)).filter(Boolean);
            const linkedSession = ev.sessionId ? (sessions[iso] || []).find(s => s.id === ev.sessionId) : null;
            const locDisplay = ev.local && ev.local !== '__outro__' ? ev.local : (ev.localText || '');
            const svcLoc = ev.locationId ? loadLocations().find(l => l.id === ev.locationId) : null;
            return React.createElement('div', { key: ev.id, style: { display: 'flex', gap: '8px', marginBottom: '12px' } },
              React.createElement('div', { style: { minWidth: '38px', flexShrink: 0, paddingTop: '10px', textAlign: 'center' } },
                React.createElement('div', { style: { fontSize: '11px', fontWeight: 700, color: '#887060' } }, ev.time),
                React.createElement('div', { style: { width: '1px', background: '#2a2318', margin: '4px auto 0', height: 'calc(100% - 20px)', minHeight: '20px' } })
              ),
              React.createElement('div', { style: { flex: 1, background: '#0d0b08', border: '1px solid #2a2318', borderTop: `2px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', opacity: done ? .85 : 1 } },
                /* Tappable info area → opens edit form */
                React.createElement('div', { onClick: () => openForm(ev.type, iso, ev), style: { padding: '10px 12px', cursor: 'pointer' } },
                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' } },
                    done && React.createElement('i', { className: 'ti ti-circle-check', style: { fontSize: '12px', color: '#68d8a0' }, 'aria-hidden': 'true' }),
                    React.createElement('span', { style: { fontSize: '13px', fontWeight: 700, color: isPers ? '#d8a840' : '#c8b090' } }, ev.label),
                    React.createElement('span', { style: { fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase', background: isPers ? 'rgba(216,168,64,.12)' : 'rgba(74,200,192,.1)', color: isPers ? '#d8a840' : 'var(--theme-accent)' } }, isPers ? 'Personal' : 'Aula'),
                    ev.recurrenceGroup && React.createElement('i', { className: 'ti ti-refresh', style: { fontSize: '10px', color: '#554a3a' }, title: 'Evento recorrente' }),
                    svcLoc && React.createElement('span', { style: { fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: (svcLoc.color || '#555') + '22', color: svcLoc.color || '#aaa', border: `1px solid ${(svcLoc.color || '#555')}44` } }, svcLoc.name)
                  ),
                  React.createElement('div', { style: { fontSize: '11px', color: '#554a3a' } }, `${ev.time} · ${ev.durationMin}min`),
                  athList.length > 0 && React.createElement('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' } },
                    athList.map((a, ai) => React.createElement('span', { key: ai, style: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#a89880' } },
                      React.createElement('span', { style: { width: '7px', height: '7px', borderRadius: '50%', background: a.color, display: 'inline-block' } }),
                      a.name
                    ))
                  ),
                  locDisplay && React.createElement('div', { style: { fontSize: '10px', color: '#554a3a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' } },
                    React.createElement('i', { className: 'ti ti-map-pin', style: { fontSize: '10px' } }),
                    locDisplay
                  ),
                  linkedSession && React.createElement('div', { style: { display: 'flex', gap: '2px', flexWrap: 'wrap', marginTop: '5px' } },
                    (linkedSession.blocks || []).map((bl, bi) => {
                      const lbl = bl.label && bl.label !== '-' ? bl.label : bl.type;
                      return React.createElement('span', { key: bi, style: { fontSize: '9px', fontWeight: 700, padding: '1px 4px', borderRadius: '2px', background: (BLOCK_C[lbl] || '#555') + '22', color: BLOCK_C[lbl] || '#aaa', border: `1px solid ${(BLOCK_C[lbl] || '#555')}44` } }, lbl);
                    })
                  ),
                  ev.notes && React.createElement('div', { style: { fontSize: '11px', color: '#554a3a', marginTop: '5px', fontStyle: 'italic' } }, ev.notes)
                ),
                /* Action bar — larger tap targets */
                React.createElement('div', { style: { display: 'flex', gap: 0, borderTop: '1px solid #1a1a12' }, onClick: e => e.stopPropagation() },
                  React.createElement('button', { onClick: () => toggleStatus(iso, ev.id), title: done ? 'Marcar como agendado' : 'Marcar como concluído', style: { flex: 1, background: done ? 'rgba(104,216,160,.07)' : 'transparent', border: 'none', borderRight: '1px solid #1a1a12', color: done ? '#68d8a0' : '#554a3a', padding: '9px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' } },
                    React.createElement('i', { className: done ? 'ti ti-circle-check' : 'ti ti-circle', style: { fontSize: '14px' } }),
                    done ? 'Feito' : 'Ag.'
                  ),
                  onLogResult && isPers && React.createElement('button', { onClick: () => onLogResult({ athleteId: ev.athleteIds[0] || null, date: iso }), title: 'Lançar resultado', style: { background: 'transparent', border: 'none', borderRight: '1px solid #1a1a12', color: 'var(--theme-accent)', padding: '9px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                    React.createElement('i', { className: 'ti ti-clipboard-list' })
                  ),
                  onEditSession && React.createElement('button', { onClick: () => onEditSession(linkedSession || { _newForDate: iso }), title: linkedSession ? 'Editar sessão vinculada' : 'Criar sessão para este dia', style: { background: 'transparent', border: 'none', borderRight: '1px solid #1a1a12', color: linkedSession ? '#887060' : '#68d8a0', padding: '9px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                    React.createElement('i', { className: linkedSession ? 'ti ti-calendar-event' : 'ti ti-calendar-plus' })
                  ),
                  React.createElement('button', { onClick: () => { if (window.confirm('Remover este evento?')) deleteEvent(iso, ev.id); }, title: 'Remover', style: { background: 'transparent', border: 'none', color: '#5a3030', padding: '9px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                    React.createElement('i', { className: 'ti ti-trash' })
                  )
                )
              )
            );
          }),
          React.createElement('div', { style: { borderTop: '1px solid #1e1e1e', marginTop: '10px', paddingTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            React.createElement('button', { type: 'button', onClick: () => openForm('aula', iso), style: { display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: 'rgba(74,200,192,.06)', border: '1px solid rgba(74,200,192,.2)', color: 'var(--theme-accent)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 } }, React.createElement('i', { className: 'ti ti-plus' }), 'Aula'),
            React.createElement('button', { type: 'button', onClick: () => openForm('personal', iso), style: { display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: 'rgba(216,168,64,.06)', border: '1px solid rgba(216,168,64,.2)', color: '#d8a840', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 } }, React.createElement('i', { className: 'ti ti-plus' }), 'Personal'),
            React.createElement('button', { type: 'button', title: 'Copiar último evento', onClick: () => {
              const allEvs = Object.entries(events).sort((a, b) => b[0].localeCompare(a[0]));
              let last = null;
              for (const [, evs2] of allEvs) { const sorted = [...evs2].sort((a, b) => b.time.localeCompare(a.time)); if (sorted.length) { last = sorted[0]; break; } }
              if (!last) return;
              openForm(last.type, iso, { ...last, id: undefined, date: iso, status: 'scheduled', time: last.time, durationMin: last.durationMin, label: last.label, locationId: last.locationId, athleteIds: last.athleteIds || [], notes: last.notes || '', local: last.local || '', localText: last.localText || '' });
            }, style: { display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: 'rgba(255,255,255,.03)', border: '1px solid #2a2318', color: '#887060', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 } }, React.createElement('i', { className: 'ti ti-copy' }), 'Copiar último')
          )
        )
      )
    );
  }

  // ── Mobile render helpers ────────────────────────────────────────────────────
  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelDay(null); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelDay(null); }

  function renderMobileHeader() {
    return React.createElement('div', { className: 'rp-sticktop pub-mobile-hdr' },
      React.createElement('div', { className: 'rp-month-nav' },
        React.createElement('button', { type: 'button', className: 'rp-nav-btn', onClick: prevMonth }, '‹'),
        React.createElement('span', { className: 'rp-month-label' }, `${MONTH_PT[month]} ${year}`),
        React.createElement('button', { type: 'button', className: 'rp-nav-btn', onClick: nextMonth }, '›')
      ),
      React.createElement('div', { className: 'rp-weeks' },
        mobileWeeks.map((w, i) => {
          const lastDay = new Date(year, month + 1, 0).getDate();
          const s = w[0].getMonth() === month ? w[0].getDate() : 1;
          const e = w[6].getMonth() === month ? w[6].getDate() : lastDay;
          return React.createElement('button', { key: i, type: 'button', className: `rp-week-btn${viewWeekIdx === i ? ' on' : ''}`, onClick: () => setViewWeekIdx(i) }, `${s}–${e}`);
        })
      ),
      React.createElement('div', { className: 'pub-mobile-meta' },
        React.createElement('div', { style: { display: 'flex', gap: '8px', fontSize: '10px', flexWrap: 'wrap', flex: 1 } },
          React.createElement('span', { style: { color: 'var(--theme-accent)' } }, `${completedAulas}/${totalAulas} aulas`),
          React.createElement('span', { style: { color: '#d8a840' } }, `${completedPersonal}/${totalPersonal} personal`),
          React.createElement('span', { style: { color: '#68d8a0' } }, `${totalCompleted}/${totalEvs} concluídas`)
        ),
        React.createElement('div', { style: { display: 'flex', gap: '4px', flexShrink: 0 } },
          ['all', 'scheduled', 'completed'].map(f => React.createElement('button', { key: f, type: 'button', onClick: () => setFilter(f), style: { background: filter === f ? 'var(--theme-accent)' : 'transparent', color: filter === f ? 'var(--theme-accent-text)' : '#806850', border: `1px solid ${filter === f ? 'var(--theme-accent)' : '#2a231c'}`, padding: '2px 6px', cursor: 'pointer', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'inherit' } }, f === 'all' ? 'Todos' : f === 'scheduled' ? 'Agendado' : 'Completo'))
        ),
        React.createElement('button', { type: 'button', onClick: () => setShowReport(true), style: { background: 'rgba(216,168,64,.1)', border: '1px solid rgba(216,168,64,.3)', color: '#d8a840', padding: '3px 8px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit', flexShrink: 0 } }, React.createElement('i', { className: 'ti ti-file-analytics' }), 'Relatório')
      )
    );
  }

  function renderMobileDayList() {
    const week = mobileWeeks[viewWeekIdx] || mobileWeeks[0];
    if (!week) return null;
    return React.createElement('div', { style: { overflowY: 'auto', flex: 1 } },
      week.map(date => {
        const iso = toISO(date);
        const inMonth = date.getMonth() === month;
        const isToday = iso === todayISO;
        const gymSessions = dayGymSessions(iso);
        const evs = dayEvents(iso);
        const allCards = [...gymSessions.map(s => ({ kind: 'session', data: s })), ...evs.map(ev => ({ kind: 'event', data: ev }))];
        return React.createElement('div', { key: iso, className: 'pub-day-row', style: { opacity: inMonth ? 1 : .28 }, onClick: () => { if (inMonth) setSelDay(iso); } },
          React.createElement('div', { className: 'pub-day-left' },
            React.createElement('div', { className: 'pub-day-name', style: { color: isToday ? 'var(--theme-accent)' : '#806850' } }, DAY_PT_TITLE[date.getDay()]),
            isToday
              ? React.createElement('div', { className: 'pub-day-num today' }, date.getDate())
              : React.createElement('div', { className: 'pub-day-num' }, date.getDate())
          ),
          React.createElement('div', { className: 'pub-day-chips' },
            allCards.length === 0
              ? React.createElement('span', { className: 'pub-day-rest' }, '— descanso')
              : React.createElement(React.Fragment, null,
                  allCards.slice(0, 9).map((card, ci) => {
                    if (card.kind === 'session') {
                      return React.createElement('span', { key: ci, className: 'pub-chip pub-chip-sess' },
                        React.createElement('i', { className: 'ti ti-calendar-event', style: { fontSize: '8px' } }), ' ', sessName(card.data, iso)
                      );
                    }
                    const ev = card.data;
                    const isPers = ev.type === 'personal';
                    const done = evStatus(ev) === 'completed';
                    return React.createElement('span', { key: ci, className: `pub-chip ${isPers ? 'pub-chip-pers' : 'pub-chip-aula'}`, style: { opacity: done ? .65 : 1 } },
                      done ? '✓ ' : '', ev.time, ' ', svcName(ev)
                    );
                  }),
                  allCards.length > 9 && React.createElement('span', { className: 'pub-chip-more' }, `+${allCards.length - 9} mais`)
                )
          )
        );
      })
    );
  }

  function renderMobileDayDetail() {
    return React.createElement(React.Fragment, null,
      React.createElement('button', { type: 'button', className: 'rp-mobile-back', onClick: () => setSelDay(null) },
        React.createElement('i', { className: 'ti ti-chevron-left' }), ' Semana'
      ),
      React.createElement('div', { style: { flex: 1, overflowY: 'auto' } },
        React.createElement(DayPane)
      )
    );
  }

  // ── Desktop render helpers ───────────────────────────────────────────────────
  function renderDesktopHeader() {
    return React.createElement('div', { className: 'agenda-header', style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderBottom: '1px solid #2a2318', flexWrap: 'wrap', flexShrink: 0 } },
      React.createElement('button', { onClick: prevMonth, style: { background: 'transparent', border: '1px solid #2a2318', color: '#887060', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 } }, '‹'),
      React.createElement('button', { onClick: () => setShowReport(true), style: { background: 'rgba(216,168,64,.1)', border: '1px solid rgba(216,168,64,.3)', color: '#d8a840', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' } }, React.createElement('i', { className: 'ti ti-file-analytics' }), ' Relatório'),
      React.createElement('span', { style: { fontSize: '14px', fontWeight: 700, color: '#c8b090', flex: '1 1 100px', minWidth: '80px', textTransform: 'uppercase', letterSpacing: '.03em' } }, `${MONTH_PT[month]} ${year}`),
      React.createElement('button', { onClick: nextMonth, style: { background: 'transparent', border: '1px solid #2a2318', color: '#887060', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 } }, '›'),
      React.createElement('button', { onClick: () => { const now = new Date(); setMonth(now.getMonth()); setYear(now.getFullYear()); setSelDay(now.toISOString().slice(0, 10)); }, style: { background: 'transparent', border: '1px solid #2a2318', color: '#887060', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } }, 'Hoje'),
      React.createElement('div', { className: 'agenda-stats', style: { display: 'flex', gap: '8px', fontSize: '11px', flexWrap: 'wrap' } },
        React.createElement('span', { style: { color: 'var(--theme-accent)' } }, [completedAulas, '/', totalAulas, ' aulas'].join('')),
        React.createElement('span', { style: { color: '#d8a840' } }, [completedPersonal, '/', totalPersonal, ' personal'].join('')),
        React.createElement('span', { style: { color: '#68d8a0' } }, [totalCompleted, '/', totalEvs, ' concluídas'].join(''))
      ),
      React.createElement('div', { style: { display: 'flex', gap: '4px' } },
        ['all', 'scheduled', 'completed'].map(f => React.createElement('button', { key: f, onClick: () => setFilter(f), className: 'agenda-filter-btn', style: { background: filter === f ? 'var(--theme-accent)' : 'transparent', color: filter === f ? 'var(--theme-accent-text)' : '#887060', border: `1px solid ${filter === f ? 'var(--theme-accent)' : '#2a2318'}`, padding: '3px 7px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' } }, f === 'all' ? 'Todos' : f === 'scheduled' ? 'Agendado' : 'Completo'))
      )
    );
  }

  function renderDesktopBody() {
    return React.createElement('div', { style: { display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' } },
      React.createElement('div', { style: { flex: selDay ? '0 0 60%' : '1', minWidth: 0, overflowY: 'auto', borderRight: selDay ? '1px solid #2a2318' : 'none' } },
        React.createElement('div', { className: 'agenda-day-hdrs', style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #2a2318', position: 'sticky', top: 0, background: '#0d0b08', zIndex: 2 } },
          DAY_PT_TITLE.map(d => React.createElement('div', { key: d, className: 'agenda-day-hdr' }, d))
        ),
        weeks.map((week, wi) => React.createElement('div', { key: wi, className: 'agenda-week-row', style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #2a2318' } },
          week.map((day, di) => day
            ? React.createElement(CellDay, { key: di, day })
            : React.createElement('div', { key: di, style: { borderRight: '1px solid #2a2318', background: 'transparent', minHeight: '46px' } })
          )
        ))
      ),
      React.createElement('div', { className: 'agenda-pane-backdrop', style: { display: selDay ? 'block' : 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 499 }, onClick: () => setSelDay(null) }),
      selDay && React.createElement('div', { className: 'agenda-pane', style: { minWidth: 0, overflowY: 'auto', background: '#0d0b08' } },
        React.createElement(DayPane)
      )
    );
  }

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    isMobile ? (selDay ? null : renderMobileHeader()) : renderDesktopHeader(),
    isMobile
      ? (selDay ? renderMobileDayDetail() : renderMobileDayList())
      : renderDesktopBody(),
    showReport && React.createElement(ReportModal, { events, sessions, onClose: () => setShowReport(false) }),
    showForm && React.createElement(EventFormInner, { showForm, sessions, athletes, initialData: formData, onSave: evs => { const arr = Array.isArray(evs) ? evs : [evs]; arr.forEach(saveEvent); setShowForm(null); }, onCancel: () => setShowForm(null) })
  );
}
