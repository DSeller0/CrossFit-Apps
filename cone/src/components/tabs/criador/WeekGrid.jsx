import { useState } from 'react';
import { uid, toISO } from '../../../utils/storage';
import { DAY_PT } from '../../../public/lib/week.js';
import { sessName } from '../../../public/lib/sessions.js';
import { sessionBoxIds } from '../../../public/lib/boxScope.js';
import { serializeSession } from './textFormat.js';
import { BoxWarnings } from './BoxWarnings';
import { WeekSessionCard } from './WeekSessionCard';
// The index's own week strip, reused verbatim (#58 follow-up) — it shows each day's
// SESSION NAME, which the Criador's old chip strip didn't, so the coach can see
// what Thursday holds without leaving Wednesday. Aliased: this file exports a
// `WeekGrid` of its own (the 7-column card grid), which is a different thing.
import { WeekGrid as DayStrip } from '../../../public/index/rail.jsx';
import { useIsMobile } from '../../../hooks/useIsMobile';
import Button from '../../ui/Button.jsx';
import s from './textMode.module.css';
import cr from './criador.module.css';

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

// Box dots (#90) — one per box the session is tagged with, in that box's own colour.
// Only under the "Todos" filter: under a single-box filter every card would carry
// the same dot, which is decoration rather than information.
function BoxDots({ session, boxLocs, show }) {
  if (!show) return null;
  const ids = sessionBoxIds(session);
  if (!ids.length) return null;
  const boxes = ids.map(id => boxLocs.find(b => b.id === id)).filter(Boolean);
  if (!boxes.length) return null;
  return (
    <span className={cr.boxDots} title={boxes.map(b => b.name).join(' · ')}>
      {boxes.map(b => (
        <span key={b.id} className={cr.boxDot} style={{ background: b.color || 'var(--muted)' }}
          aria-label={b.name} role="img" />
      ))}
    </span>
  );
}

// ── Week grid + collapsed day strip + box selector ────────────────────────────
// The Criador's landing surface (#58): the coach thinks in weeks, so the week is
// what the page opens on and it renders even when it's empty — the day columns and
// their "+ sessão" affordances ARE the empty state.
//
// The grid has two render modes (#92) — Grade (ExerciseList) and Texto (the
// coach's own notation). It is deliberately the SAME grid in both: same columns,
// same box filter, same week arrows.
export function WeekGrid({
  gridRef, weekOffset, setWeekOffset, weekLabel, weekGridCollapsed, setWeekGridCollapsed,
  boxLocs, selBox, setSelBox, boxWarnings, addWarning, patchWarning, removeWarning,
  weekDates, sessions, setSessions, boxFilter, editing, activeDate, highlightedSessionId,
  startEdit, onDelete, onPickDay, gridMode, setGridMode, onImport, editorOpen,
}) {
  const isMobile = useIsMobile();
  const [openId, setOpenId] = useState(null);      // mobile: which card is expanded
  const [copied, copy] = useCopy();
  const isText = gridMode === 'texto';
  const showDots = selBox === 'all' && boxLocs.length > 0;
  // With a session open the week is ALWAYS the strip — the card grid below an open
  // editor is a second view of a week you are already inside. So the collapse
  // toggle isn't a choice there, and everything in the bar that acts on the card
  // grid (Grade/Texto, Copiar semana, Importar) has nothing to act on: hidden, not
  // disabled. What stays is navigation — the week arrows, Hoje, and the box tabs.
  const collapsed = editorOpen || weekGridCollapsed;

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
    /* A FRAGMENT, not a wrapper div: `position: sticky` is clipped by its parent's
       box, so while this component owned a div of its own the pinned header could
       only travel the height of that div — it scrolled away as soon as you got into
       the block list. As a fragment the header's parent is the container that holds
       the editor too, which is the region it needs to stay pinned over. */
    <>
      {/* Week picker + box tabs + the day strip stay pinned under the app chrome:
          they are how you change what you are looking at. Avisos and the page
          toolbar deliberately scroll — they are content, not navigation. */}
      <div className={cr.stickyHead} ref={gridRef}>
      <div className={cr.weekBar}>
        <Button size="sm" iconOnly aria-label="Semana anterior" onClick={() => setWeekOffset(o => o-1)}>
          <i className="ti ti-chevron-left" />
        </Button>
        <span className={cr.weekLabel}>{weekLabel}</span>
        <Button size="sm" iconOnly aria-label="Próxima semana" onClick={() => setWeekOffset(o => o+1)}>
          <i className="ti ti-chevron-right" />
        </Button>
        {weekOffset !== 0 && <Button size="sm" onClick={() => setWeekOffset(0)}>Hoje</Button>}
        <span className={cr.toolbarSpacer} />
        {!editorOpen && (
          <>
            {/* Grade / Texto — a render mode of this grid, never persisted */}
            <span className={s.modeSeg} role="group" aria-label="Modo da grade">
              <button type="button" className={!isText ? s.on : ''} aria-pressed={!isText}
                onClick={() => setGridMode('grade')} title="Ver como lista de exercícios">▤ Grade</button>
              <button type="button" className={isText ? s.on : ''} aria-pressed={isText}
                onClick={() => setGridMode('texto')} title="Ver como texto">¶ Texto</button>
            </span>
            {isText && weekSessions.length > 0 && (
              <Button size="sm" onClick={copyWeek} title="Copiar a semana inteira como texto">
                <i className={`ti ${copied === 'week' ? 'ti-check' : 'ti-copy'}`} /> {copied === 'week' ? 'Copiado' : 'Copiar semana'}
              </Button>
            )}
            {onImport && (
              <Button size="sm" onClick={onImport} title="Colar a semana inteira de uma vez">
                <i className="ti ti-clipboard-text" /> Importar
              </Button>
            )}
            <Button size="sm" iconOnly onClick={() => setWeekGridCollapsed(v => !v)}
              aria-label={weekGridCollapsed ? 'Expandir grade da semana' : 'Minimizar grade da semana'}
              aria-expanded={!weekGridCollapsed}
              title={weekGridCollapsed ? 'Expandir grade' : 'Minimizar grade'}>
              <i className={`ti ti-layout-${weekGridCollapsed ? 'rows' : 'navbar'}`} />
            </Button>
          </>
        )}
      </div>
      {/* Box context selector — filters the grid + sets the box new sessions inherit. Scrollable so any N boxes fit. */}
      {boxLocs.length > 0 && (
        <div className={cr.boxTabs} role="group" aria-label="Filtrar por box">
          {[{ id: 'all', name: 'Todos' }, { id: 'none', name: 'Sem box' }, ...boxLocs].map(b => {
            const on = selBox === b.id;
            return (
              <button key={b.id} type="button" aria-pressed={on} onClick={() => setSelBox(b.id)}
                className={`${cr.pill}${on ? ' ' + cr.pillOn : ''}`}
                style={on && b.color ? { borderColor: b.color, color: b.color } : undefined}>
                {b.id !== 'all' && b.id !== 'none' && <span className={cr.dot} style={{ background: b.color || 'var(--muted)' }} />}
                {b.name}
              </button>
            );
          })}
        </div>
      )}
      {/* The strip pins WITH the week arrows and the box tabs, because in this state
          it IS the week picker — the card grid it used to sit under is gone. Left
          below the pinned bar it scrolled under it the moment a session opened, and
          then changing day cost a scroll up. Avisos stays below, and still scrolls. */}
      {collapsed && (
        <div className={cr.dayStrip}>
          <DayStrip
            sessions={sessions}
            dates={weekDates}
            filter={boxFilter}
            showCount
            selectedDate={activeDate}
            onSelect={onPickDay}
          />
        </div>
      )}
      </div>
      <BoxWarnings
        selBox={selBox} boxLocs={boxLocs} boxWarnings={boxWarnings}
        addWarning={addWarning} patchWarning={patchWarning} removeWarning={removeWarning}
      />
      {collapsed ? null : isMobile ? (
        /* ── Mobile: the columns stack. A card is collapsed until tapped, then
              opens READ-ONLY in whichever mode is active; "Editar" opens the
              editor, which takes over the screen. ── */
        <div className={cr.mobileList}>
          {weekDates.map((date, di) => {
            const dateKey = toISO(date);
            const list = (sessions[dateKey] || []).filter(boxFilter);
            if (!list.length) {
              return (
                <button key={dateKey} type="button" className={s.mRow} onClick={() => onPickDay(dateKey)}>
                  <span className={s.mChev} />
                  <span className={s.mDay}>{DAY_PT[di]} {date.getDate()}</span>
                  <span className={`${s.mName} ${s.mNameEmpty}`}>sem sessão</span>
                  <span className={s.mCount}>+ sessão</span>
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
                    <BoxDots session={sess} boxLocs={boxLocs} show={showDots} />
                    <span className={s.mCount}>{(sess.blocks || []).length} bloco{(sess.blocks || []).length !== 1 ? 's' : ''}</span>
                  </button>
                  {open && (
                    <div className={s.mBody}>
                      <WeekSessionCard session={sess} mode={gridMode} />
                      <div className={s.mActions}>
                        {isText && (
                          <Button size="sm" onClick={() => copySession(sess.id, sess)}>
                            <i className={`ti ${copied === sess.id ? 'ti-check' : 'ti-copy'}`} /> {copied === sess.id ? 'Copiado' : 'Copiar'}
                          </Button>
                        )}
                        <Button size="sm" iconOnly variant="destructive"
                          aria-label={`Remover ${sessName(sess, dateKey)}`} onClick={() => onDelete(dateKey, sess.id)}>
                          <i className="ti ti-trash" />
                        </Button>
                        <Button size="sm" variant="primary" onClick={() => startEdit(sess, dateKey)}>
                          <i className="ti ti-pencil" /> Editar
                        </Button>
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
                  /* The card is the click target for "open this session" — so it is a
                     real button role with a keyboard path, not a bare div (#14). */
                  <div key={sess.id} className={`wg-sc${sess.id === highlightedSessionId ? ' wg-saved' : ''}`} draggable
                    role="button" tabIndex={0}
                    aria-label={`Abrir ${sessName(sess, dateKey)}`}
                    style={{ outline: editing?.id === sess.id ? '2px solid var(--accent)' : 'none', outlineOffset: 1 }}
                    onClick={() => startEdit(sess, dateKey)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(sess, dateKey); } }}
                    onDragStart={e => { e.dataTransfer.setData('sess-id', sess.id); e.dataTransfer.setData('sess-date', dateKey); e.dataTransfer.effectAllowed = 'move'; e.stopPropagation(); }}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); e.stopPropagation(); }}
                    onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                    onDrop={e => {
                      e.preventDefault(); e.stopPropagation();
                      e.currentTarget.classList.remove('drag-over');
                      moveSession(e.dataTransfer.getData('sess-id'), e.dataTransfer.getData('sess-date'), dateKey, sess.id);
                    }}
                  >
                    <div className={cr.cardHd}>
                      <span className="wg-sc-name">{sessName(sess, dateKey)}</span>
                      <BoxDots session={sess} boxLocs={boxLocs} show={showDots} />
                      <span className={cr.cardHdBtns}>
                        {isText && (
                          <Button size="xs" iconOnly variant="ghost" title="Copiar este dia como texto"
                            aria-label={`Copiar ${sessName(sess, dateKey)} como texto`}
                            onClick={e => { e.stopPropagation(); copySession(sess.id, sess); }}>
                            <i className={`ti ${copied === sess.id ? 'ti-check' : 'ti-copy'}`} />
                          </Button>
                        )}
                        <Button size="xs" iconOnly variant="ghost" className={cr.dangerGhost}
                          aria-label={`Remover ${sessName(sess, dateKey)}`}
                          onClick={e => { e.stopPropagation(); onDelete(dateKey, sess.id); }}>
                          <i className="ti ti-x" />
                        </Button>
                      </span>
                    </div>
                    <WeekSessionCard session={sess} mode={gridMode} />
                  </div>
                ))}
                <div className="wg-add-row">
                  <button type="button" className="wg-add"
                    aria-label={`Nova sessão em ${DAY_PT[di]} ${date.getDate()}`}
                    onClick={() => onPickDay(dateKey)}>
                    <i className="ti ti-plus" /> sessão
                  </button>
                  {list.length > 0 && (
                    <button type="button" className="wg-copy"
                      aria-label={`Duplicar a última sessão de ${DAY_PT[di]} ${date.getDate()}`}
                      onClick={() => dupSession(dateKey)}>
                      <i className="ti ti-copy" /> copy
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </>
  );
}
