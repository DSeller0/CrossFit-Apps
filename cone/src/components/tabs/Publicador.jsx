import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import {
  loadAthletes, loadSettings, saveSettings,
  loadLocations, loadCoach,
  matchesAthlete, getTargets, toISO,
} from '../../utils/storage';
import { APP_CONFIG, ZONES, ECOL, DSHORT, PLC, GF } from '../../utils/config';
import { buildPixPayload } from '../../utils/pix';
import PresenterView from '../PresenterView';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const pixClean = s => (s || '').normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/[^a-zA-Z0-9 @._\-+\/]/g, '').trim();

function fmtIntensity(ins) {
  if (!ins?.mode) return null;
  if (ins.mode === 'progression') {
    if (!ins.steps?.length) return null;
    const loads = ins.steps.map(s => s.load).filter(Boolean);
    const rawUnit = ins.steps[0]?.unit || '% RM';
    const unit = rawUnit === '%' || rawUnit === '% do RM' ? '% RM' : rawUnit;
    return loads.length ? loads.join('/') + ' ' + unit : null;
  }
  if (ins.mode === 'pct') return ins.pct ? `${ins.pct}% RM` : null;
  if (ins.mode === 'gender') {
    const p = [];
    ['Masculino', 'Feminino'].forEach(g => {
      const unit = ins[`${g}_unit`] || 'kg';
      const vals = ['RX', 'Inter', 'SC'].map(k => ins[`${g}_${k}`]).filter(Boolean);
      if (vals.length) p.push(`${g === 'Masculino' ? 'M' : 'F'}: ${vals.join('/')} ${unit}`);
    });
    return p.join(' | ') || null;
  }
  if (ins.mode === 'cardio') return ins.cardioVal ? (ins.cardioVal + (ins.cardioUnit || 'm')) : null;
  return null;
}

function buildProgressionLines(ex) {
  const steps = ex.intensity?.steps || [];
  if (!steps.length) return null;
  const name = ex.name.toUpperCase();
  const groups = [];
  steps.forEach(s => {
    const reps = s.reps || ex.reps || '';
    const rawUnit = s.unit || '% RM';
    const unit = rawUnit === '%' || rawUnit === '% do RM' ? '% RM' : rawUnit;
    const existing = groups.find(g => g.reps === reps && g.unit === unit);
    if (existing) { existing.count++; if (s.load) existing.loads.push(s.load); }
    else groups.push({ reps, unit, loads: s.load ? [s.load] : [], count: 1 });
  });
  return groups.map(g => {
    const repsPrefix = g.count && g.reps ? `${g.count}×${g.reps}` : g.reps;
    const nameLine = [repsPrefix, name].filter(Boolean).join(' ');
    const loadStr = g.loads.length ? `${g.loads.join('/')} ${g.unit}` : '';
    return { nameLine, loadStr };
  });
}

function exLine(ex) {
  const reps = ex.reps ? (ex.reps.includes(',') ? ex.reps.split(',').map(r => r.trim()).join('-') : ex.reps) : '';
  const vol = ex.sets && reps ? `${ex.sets}×${reps}` : reps;
  const cardio = ex.intensity?.mode === 'cardio' ? (fmtIntensity(ex.intensity) || '') : '';
  return [vol, cardio, ex.name.toUpperCase()].filter(Boolean).join(' ');
}

function complexLine(ex) {
  const movs = ex.complexMovements || [];
  const displayName = ex.name || movs.map(m => m.name).join(' + ') || 'Complexo';
  const notation = movs.map(m => m.reps || '?').join('+');
  const volPrefix = ex.sets && notation ? `${ex.sets}×(${notation})` : notation ? `(${notation})` : ex.sets ? `${ex.sets}×` : '';
  return [volPrefix, displayName.toUpperCase()].filter(Boolean).join(' ');
}

function getWeeksOfMonth(year, month) {
  const weeks = [];
  let cursor = new Date(year, month, 1);
  const dow = cursor.getDay();
  cursor.setDate(cursor.getDate() - dow);
  const endOfMonth = new Date(year, month + 1, 0);
  while (cursor <= endOfMonth) {
    const week = [];
    for (let i = 0; i < 7; i++) { week.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }
    weeks.push(week);
  }
  return weeks;
}

function buildMobileSession(sessions, selectedDate, currentWeekDates) {
  if (selectedDate) {
    const s = (sessions[selectedDate] || [])[0] || null;
    if (s) return { s, dateKey: selectedDate, date: new Date(selectedDate + 'T12:00:00') };
  }
  for (let i = 1; i <= 5; i++) {
    const d = currentWeekDates[i];
    const key = toISO(d);
    const s = (sessions[key] || [])[0] || null;
    if (s) return { s, dateKey: key, date: d };
  }
  return null;
}

const mfs = (px, fs) => `${Math.round(px * fs)}px`;

function useSpeech(onResult, onEnd) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const start = useCallback(() => {
    if (!SpeechRecognition) { alert('Reconhecimento de voz não suportado neste navegador. Use Chrome ou Safari.'); return; }
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = e => {
      const transcript = Array.from(e.results).slice(e.resultIndex).filter(r => r.isFinal).map(r => r[0].transcript).join(' ');
      if (transcript.trim()) onResult(transcript.trim());
    };
    rec.onend = () => { setListening(false); onEnd && onEnd(); };
    rec.onerror = e => { if (e.error !== 'aborted') console.warn('Speech error:', e.error); setListening(false); };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, onResult, onEnd]);
  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);
  useEffect(() => () => recRef.current?.stop(), []);
  return { listening, start, stop, supported: !!SpeechRecognition };
}

function MicButton({ onTranscript, style }) {
  const { listening, start, supported } = useSpeech(txt => onTranscript(txt), null);
  if (!supported) return null;
  return React.createElement('button', {
    type: 'button',
    className: `mic-btn ${listening ? 'listening' : ''}`,
    onClick: start,
    title: listening ? 'Parar gravação' : 'Ditar (toque para falar)',
    style: style || {}
  }, React.createElement('i', { className: listening ? 'ti ti-microphone-off' : 'ti ti-microphone', 'aria-hidden': 'true', style: { fontSize: '14px' } }));
}

// ── DailyExportView ───────────────────────────────────────────────────────────
function DailyExportView({ sessions, label, weekDates, gymName, fontScale, zoneScales, blockTitleScales, selectedDate, logoDataUrl, logoScale, dvColors }) {
  const dv = dvColors || {};
  const daysList = weekDates.map((date, i) => ({
    date, dateKey: toISO(date), di: i,
    sessions: sessions[toISO(date)] || []
  })).filter(d => d.sessions.length > 0);
  const day = selectedDate
    ? daysList.find(d => d.dateKey === selectedDate) || daysList[0]
    : daysList[0];
  const fs = fontScale || 1;
  if (!day) return React.createElement('div', { className: 'dv-wrap', style: { '--fs': fs, background: dv.bg || '#000' } },
    React.createElement('div', { className: 'dv-empty-zone' }, 'Sem sessões nesta semana')
  );
  const s = day.sessions[0];
  const dateObj = day.date;
  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();
  const dateNum = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const byZone = {};
  ZONES.forEach(z => { byZone[z] = []; });
  (s.blocks || []).forEach(bl => {
    const z = bl.zone || 'Zone 01';
    if (!byZone[z]) byZone[z] = [];
    byZone[z].push(bl);
  });
  return React.createElement('div', { className: 'dv-wrap', style: { '--fs': fs } },
    React.createElement('div', { className: 'dv-topbar', style: { background: dv.bg || '#0a0a0a' } },
      React.createElement('div', { className: 'dv-top-left' },
        logoDataUrl && React.createElement('div', { style: { width: `${Math.round(64 * (logoScale || 1))}px`, height: `${Math.round(64 * (logoScale || 1))}px`, background: 'transparent', overflow: 'hidden', flexShrink: 0, borderRadius: '4px' } },
          React.createElement('img', { src: logoDataUrl, style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' } })
        ),
        React.createElement('span', { className: 'dv-gym-name', style: { color: dv.gymName || '#fff' } }, gymName || 'Cone')
      ),
      React.createElement('div', { className: 'dv-top-right' },
        React.createElement('div', { className: 'dv-date-label', style: { color: dv.date || '#e87820' } }, weekday + ' · ' + dateNum),
        s.mainTraining && React.createElement('div', { className: 'dv-main-training', style: { color: dv.mainTraining || '#888' } }, s.mainTraining),
        label && React.createElement('div', { style: { fontSize: '13px', color: '#555', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '.06em' } }, label)
      )
    ),
    React.createElement('div', { className: 'dv-zones' },
      ZONES.map((zoneName, zi) => {
        const zoneBlocks = byZone[zoneName] || [];
        const primaryBlock = zoneBlocks[0] || null;
        const ec0 = primaryBlock ? ECOL[primaryBlock.type] || ECOL.Strength : null;
        return React.createElement('div', { key: zoneName, className: 'dv-zone', style: { '--zfs': zoneScales?.[zi] || 1, '--bts': blockTitleScales?.[zi] || 1, borderRight: `2px solid ${dv.divider || '#1a1a1a'}` } },
          React.createElement('div', { className: 'dv-zone-header', style: { borderBottom: `1px solid ${dv.divider || '#1e1e1e'}` } },
            ec0
              ? React.createElement('div', null,
                  React.createElement('div', { className: 'dv-zone-type', style: { color: dv.zoneType || '#e87820' } },
                    (zoneBlocks[0].label && zoneBlocks[0].label !== '-')
                      ? React.createElement('div', null,
                          React.createElement('div', null, zoneBlocks[0].label),
                          React.createElement('div', { style: { fontSize: 'calc(16px * var(--fs,1) * var(--bts,1))', opacity: .75, marginTop: '2px', color: dv.zoneType || '#e87820' } }, zoneBlocks[0].type)
                        )
                      : zoneBlocks[0].type
                  ),
                  (primaryBlock && primaryBlock.duration) &&
                    React.createElement('div', { className: 'dv-zone-subtitle', style: { color: dv.cap || '#e87820' } }, `CAP ${primaryBlock.duration}'`),
                  (primaryBlock && primaryBlock.rounds) &&
                    React.createElement('div', { className: 'dv-rounds-label', style: { color: dv.rounds || '#f5c842' } }, `${primaryBlock.rounds} ROUNDS`)
                )
              : React.createElement('div', { className: 'dv-zone-type', style: { color: '#1a1a1a', fontSize: 'calc(22px * var(--fs,1))' } }, '—')
          ),
          zoneBlocks.length === 0
            ? React.createElement('div', { className: 'dv-empty-zone' }, '—')
            : React.createElement('div', { className: 'dv-zone-body' },
                zoneBlocks.map((bl, bli) => {
                  const ec = ECOL[bl.type] || ECOL.Strength;
                  return React.createElement('div', { key: bl.id, className: 'dv-block-in-zone' },
                    bli > 0 && React.createElement('div', { className: 'dv-block-type-label', style: { color: dv.blockLabel || ec.text || '#e87820' } },
                      bl.type,
                      (bl.rounds || bl.duration) && React.createElement('span', { className: 'dv-block-cap', style: { color: dv.blockLabel || ec.text || '#e87820' } },
                        [bl.rounds && `${bl.rounds} RDS`, bl.duration && `CAP ${bl.duration}'`].filter(Boolean).join(' · ')
                      )
                    ),
                    bl.exercises.filter(e => e.name || e.isComplex).map(ex => {
                      if (ex.isComplex) {
                        const movs = ex.complexMovements || [];
                        return React.createElement('div', { key: ex.id, className: 'dv-ex-item', style: { borderBottom: `1px solid ${dv.divider || 'transparent'}` } },
                          React.createElement('div', { className: 'dv-ex-name', style: { color: dv.exName || '#fff' } }, complexLine(ex)),
                          ...movs.map((m, mi) => React.createElement('div', { key: mi, className: 'dv-ex-note', style: { color: dv.note || '#888' } }, `· ${[m.reps, m.name].filter(Boolean).join(' ')}`)),
                          ex.note ? React.createElement('div', { key: 'n', className: 'dv-ex-note', style: { color: dv.note || '#888' } }, ex.note) : null
                        );
                      }
                      const isProg = ex.intensity?.mode === 'progression';
                      const line = exLine(ex);
                      if (isProg) {
                        const progLines = buildProgressionLines(ex);
                        if (!progLines || !progLines.length) {
                          return React.createElement('div', { key: ex.id, className: 'dv-ex-item', style: { borderBottom: `1px solid ${dv.divider || 'transparent'}` } },
                            React.createElement('div', { className: 'dv-ex-name', style: { color: dv.exName || '#fff' } }, line),
                            ex.note && React.createElement('div', { className: 'dv-ex-note', style: { color: dv.note || '#888' } }, ex.note)
                          );
                        }
                        return React.createElement('div', { key: ex.id, className: 'dv-ex-item', style: { borderBottom: `1px solid ${dv.divider || 'transparent'}` } },
                          progLines.map((pl, si) => React.createElement('div', { key: si },
                            React.createElement('div', { className: 'dv-ex-name', style: { color: dv.exName || '#fff' } }, pl.nameLine),
                            pl.loadStr && React.createElement('div', { className: 'dv-ex-vol', style: { color: dv.intensity || '#f5c842', display: 'inline-block', marginTop: '2px' } }, pl.loadStr)
                          )),
                          ex.note && React.createElement('div', { className: 'dv-ex-note', style: { color: dv.note || '#888' } }, ex.note)
                        );
                      }
                      return React.createElement('div', { key: ex.id, className: 'dv-ex-item', style: { borderBottom: `1px solid ${dv.divider || 'transparent'}` } },
                        React.createElement('div', { className: 'dv-ex-name', style: { color: dv.exName || '#fff' } }, line),
                        ex.note && React.createElement('div', { className: 'dv-ex-note', style: { color: dv.note || '#888' } }, ex.note)
                      );
                    }),
                    (() => {
                      const loads = [...new Set(bl.exercises.filter(e => e.name && fmtIntensity(e.intensity) && e.intensity?.mode !== 'cardio' && e.intensity?.mode !== 'progression').map(e => fmtIntensity(e.intensity)))];
                      return loads.length > 0 && React.createElement('div', { className: 'dv-block-notes', style: { borderTop: `1px solid ${dv.divider || '#1a1a1a'}`, marginTop: '6px', paddingTop: '6px', color: dv.intensity || '#f5c842', fontStyle: 'normal', fontWeight: 700 } },
                        loads.join(' · ')
                      );
                    })(),
                    bl.notes && React.createElement('div', { className: 'dv-block-notes', style: { color: dv.blockNotes || '#888', borderTopColor: dv.divider || '#1a1a1a' } }, bl.notes)
                  );
                })
              )
        );
      })
    )
  );
}

// ── WeeklyExportView ──────────────────────────────────────────────────────────
function WeeklyExportView({ sessions, label, year, month, onDayClick }) {
  const weeks = getWeeksOfMonth(year, month);
  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const today = new Date();
  return React.createElement('div', { className: 'weekly-wrap' },
    React.createElement('div', { className: 'wk-header' },
      React.createElement('div', { className: 'wk-title' }, 'Grade de Treinos · ', monthName),
      label && React.createElement('div', { className: 'wk-sub' }, label)
    ),
    React.createElement('div', { className: 'wk-col-head-row' },
      React.createElement('div', { className: 'wk-col-head', style: { color: '#333', textAlign: 'center' } }, 'WK'),
      DSHORT.map(d => React.createElement('div', { key: d, className: 'wk-col-head' }, d))
    ),
    weeks.map((week, wi) =>
      React.createElement('div', { key: wi, className: 'wk-week-row' },
        React.createElement('div', { className: 'wk-week-num' }, wi + 1),
        week.map((date, di) => {
          const dateKey = toISO(date);
          const inMonth = date.getMonth() === month;
          const daySessions = sessions[dateKey] || [];
          const s = daySessions[0] || null;
          const isToday = date.toDateString() === today.toDateString();
          return React.createElement('div', {
            key: di,
            className: `wk-day-cell ${!s ? 'empty' : ''}`,
            onClick: s && onDayClick ? () => onDayClick(week, date) : undefined
          },
            React.createElement('div', { className: `wk-day-num${isToday ? ' today' : ''}` }, inMonth ? date.getDate() : ''),
            s && React.createElement('div', null,
              React.createElement('div', { className: 'wk-day-training', style: { color: inMonth ? '#ddd' : '#444' } }, s.mainTraining || '—'),
              React.createElement('div', { className: 'wk-day-blocks' },
                (s.blocks || []).slice(0, 4).map(bl =>
                  React.createElement('span', { key: bl.id, className: `wg-pill ${PLC[bl.type] || 'p-st'}`, style: { fontSize: '9px', padding: '1px 5px' } }, bl.type)
                )
              )
            )
          );
        })
      )
    )
  );
}

// ── WeeklyCalendarExportView — 1920×1080 single week Mon-Fri ─────────────────
function WeeklyCalendarExportView({ sessions, label, year, month, gymName, logoDataUrl, logoScale, fontScale, weekDates, wkColors }) {
  const wk = wkColors || {};
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const ls = logoScale || 1;
  const fs = fontScale || 1;
  const today = new Date();
  const SHOW = [1, 2, 3, 4, 5];
  const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
  const midDate = weekDates[3];
  const weekStart = weekDates[1];
  const weekEnd = weekDates[5];
  const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const weekLabel = `${fmt(weekStart)} – ${fmt(weekEnd)}`;
  return React.createElement('div', { style: { background: wk.bg || '#000', color: '#fff', width: '1920px', height: '1080px', display: 'flex', flexDirection: 'column', fontFamily: "'Arial Black',Arial,sans-serif", overflow: 'hidden', '--fs': fs } },
    React.createElement('div', { style: { background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '2px solid #1a1a1a', flexShrink: 0 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '18px' } },
        logoDataUrl && React.createElement('div', { style: { width: `${Math.round(56 * ls)}px`, height: `${Math.round(56 * ls)}px`, background: 'transparent', overflow: 'hidden', borderRadius: '4px', flexShrink: 0 } },
          React.createElement('img', { src: logoDataUrl, style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' } })
        ),
        React.createElement('span', { style: { fontSize: `calc(32px * var(--fs,1))`, fontWeight: 900, color: wk.gymName || '#fff', textTransform: 'uppercase', letterSpacing: '.1em' } }, gymName || 'Cone')
      ),
      React.createElement('div', { style: { textAlign: 'right' } },
        React.createElement('div', { style: { fontSize: `calc(32px * var(--fs,1))`, fontWeight: 900, color: wk.header || '#e87820', textTransform: 'uppercase', letterSpacing: '.1em', lineHeight: 1 } }, weekLabel),
        React.createElement('div', { style: { fontSize: `calc(18px * var(--fs,1))`, color: wk.dateNum || '#666', marginTop: '4px', letterSpacing: '.06em', textTransform: 'uppercase' } }, monthNames[midDate.getMonth()] + ' ' + midDate.getFullYear()),
        label && React.createElement('div', { style: { fontSize: `calc(14px * var(--fs,1))`, color: '#444', marginTop: '2px', letterSpacing: '.06em', textTransform: 'uppercase' } }, label)
      )
    ),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', background: '#0d0d0d', borderBottom: '1px solid #1a1a1a', flexShrink: 0 } },
      SHOW.map((dayIdx, ci) => {
        const date = weekDates[dayIdx];
        const dateNum = date.getDate();
        const inMonth = date.getMonth() === month;
        const isToday = date.toDateString() === today.toDateString();
        return React.createElement('div', { key: ci, style: { padding: '10px 20px', borderRight: ci < 4 ? `1px solid ${wk.divider || '#1a1a1a'}` : 'none', display: 'flex', alignItems: 'baseline', gap: '10px' } },
          React.createElement('span', { style: { fontSize: `calc(16px * var(--fs,1))`, fontWeight: 900, color: wk.header || '#e87820', textTransform: 'uppercase', letterSpacing: '.1em' } }, DAY_LABELS[ci]),
          React.createElement('span', { style: { fontSize: `calc(20px * var(--fs,1))`, fontWeight: 900, color: isToday ? wk.header || '#e87820' : inMonth ? wk.dateNum || '#555' : '#333' } }, inMonth ? dateNum : '')
        );
      })
    ),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', flex: 1, overflow: 'hidden' } },
      SHOW.map((dayIdx, ci) => {
        const date = weekDates[dayIdx];
        const dateKey = toISO(date);
        const inMonth = date.getMonth() === month;
        const daySessions = sessions[dateKey] || [];
        const s = daySessions[0] || null;
        return React.createElement('div', { key: ci, style: { borderRight: ci < 4 ? '1px solid #1a1a1a' : 'none', padding: '14px 20px', background: s && inMonth ? '#060606' : '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
          s && inMonth
            ? React.createElement('div', { style: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' } },
                React.createElement('div', { style: { fontSize: `calc(14px * var(--fs,1))`, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '.05em', lineHeight: 1.2, marginBottom: '10px', flexShrink: 0, borderBottom: '1px solid #1a1a1a', paddingBottom: '8px' } }, s.mainTraining || '—'),
                React.createElement('div', { style: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' } },
                  (s.blocks || []).map(bl => {
                    const ec = ECOL[bl.type] || ECOL['Força'];
                    const blCol = wk.blockType || ec.text;
                    const meta = [bl.rounds && `${bl.rounds} RDS`, bl.duration && `CAP ${bl.duration}'`].filter(Boolean).join(' · ');
                    const exs = bl.exercises?.filter(e => e.name || e.isComplex) || [];
                    return React.createElement('div', { key: bl.id, style: { borderLeft: `2px solid ${blCol}`, paddingLeft: '8px', flexShrink: 0 } },
                      React.createElement('div', { style: { fontSize: `calc(12px * var(--fs,1))`, fontWeight: 900, color: blCol, textTransform: 'uppercase', letterSpacing: '.07em', lineHeight: 1.2 } }, bl.type + (meta ? ` · ${meta}` : '')),
                      exs.slice(0, 4).map(ex =>
                        React.createElement('div', { key: ex.id, style: { marginTop: '3px' } },
                          React.createElement('div', { style: { fontSize: `calc(13px * var(--fs,1))`, fontWeight: 900, color: wk.exName || '#fff', textTransform: 'uppercase', letterSpacing: '.04em', lineHeight: 1.15 } }, ex.isComplex ? complexLine(ex) : exLine(ex))
                        )
                      ),
                      bl.notes && React.createElement('div', { style: { fontSize: `calc(10px * var(--fs,1))`, color: '#555', marginTop: '3px', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.4 } }, bl.notes)
                    );
                  })
                )
              )
            : React.createElement('div', { style: { color: '#1a1a1a', fontSize: `calc(12px * var(--fs,1))`, textTransform: 'uppercase', letterSpacing: '.1em', marginTop: '8px' } }, '—')
        );
      })
    )
  );
}

// ── CalendarExportView — 1920×1080 monthly calendar ──────────────────────────
function CalendarExportView({ sessions, label, year, month, gymName, logoDataUrl, logoScale, fontScale, wkColors }) {
  const wk = wkColors || {};
  const weeks = getWeeksOfMonth(year, month);
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthName = monthNames[month];
  const today = new Date();
  const ls = logoScale || 1;
  const SHOW_DAYS = [1, 2, 3, 4, 5];
  const CAL_DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
  const fs = fontScale || 1;
  return React.createElement('div', { style: { background: wk.bg || '#000', color: '#fff', width: '1920px', height: '1080px', display: 'flex', flexDirection: 'column', fontFamily: "'Arial Black',Arial,sans-serif", overflow: 'hidden', '--fs': fs } },
    React.createElement('div', { style: { background: wk.bg || '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: `2px solid ${wk.divider || '#1a1a1a'}`, flexShrink: 0 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '18px' } },
        logoDataUrl && React.createElement('div', { style: { width: `${Math.round(56 * ls)}px`, height: `${Math.round(56 * ls)}px`, background: 'transparent', overflow: 'hidden', borderRadius: '4px', flexShrink: 0 } },
          React.createElement('img', { src: logoDataUrl, style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' } })
        ),
        React.createElement('span', { style: { fontSize: `calc(32px * var(--fs,1))`, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '.1em' } }, gymName || 'Cone')
      ),
      React.createElement('div', { style: { textAlign: 'right' } },
        React.createElement('div', { style: { fontSize: `calc(36px * var(--fs,1))`, fontWeight: 900, color: wk.header || '#e87820', textTransform: 'uppercase', letterSpacing: '.1em', lineHeight: 1 } }, monthName + ' ' + year),
        label && React.createElement('div', { style: { fontSize: `calc(16px * var(--fs,1))`, color: '#666', marginTop: '4px', letterSpacing: '.06em', textTransform: 'uppercase' } }, label)
      )
    ),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', background: '#0d0d0d', borderBottom: '1px solid #1a1a1a', flexShrink: 0 } },
      CAL_DAY_LABELS.map((d, i) => React.createElement('div', { key: d, style: { padding: '10px 16px', fontSize: `calc(16px * var(--fs,1))`, fontWeight: 900, color: wk.header || '#e87820', textTransform: 'uppercase', letterSpacing: '.1em', borderRight: i < 4 ? `1px solid ${wk.divider || '#1a1a1a'}` : 'none' } }, d))
    ),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' } },
      weeks.map((week, wi) => {
        const weekdays = SHOW_DAYS.map(di => ({ date: week[di], di }));
        return React.createElement('div', { key: wi, style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', flex: 1, borderBottom: wi < weeks.length - 1 ? '1px solid #1a1a1a' : 'none' } },
          weekdays.map(({ date, di }, ci) => {
            const dateKey = toISO(date);
            const inMonth = date.getMonth() === month;
            const s = (sessions[dateKey] || [])[0] || null;
            const isToday = date.toDateString() === today.toDateString();
            return React.createElement('div', { key: di, style: { borderRight: ci < 4 ? `1px solid ${wk.divider || '#1a1a1a'}` : 'none', padding: '10px 14px', background: inMonth ? (s ? '#080808' : '#000') : '#030303', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
              React.createElement('div', { style: { fontSize: `calc(22px * var(--fs,1))`, fontWeight: 900, color: isToday ? wk.header || '#e87820' : inMonth ? wk.dateNum || '#666' : '#222', marginBottom: '6px', lineHeight: 1, flexShrink: 0 } }, inMonth ? date.getDate() : ''),
              s && inMonth && React.createElement('div', { style: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '4px' } },
                React.createElement('div', { style: { fontSize: `calc(15px * var(--fs,1))`, fontWeight: 900, color: wk.mainTraining || '#fff', textTransform: 'uppercase', letterSpacing: '.04em', lineHeight: 1.2, marginBottom: '4px' } }, s.mainTraining || '—'),
                (s.blocks || []).map(bl => {
                  const ec = ECOL[bl.type] || ECOL['Força'];
                  const exNames = bl.exercises?.filter(e => e.name).slice(0, 4).map(e => e.name).join(', ');
                  return React.createElement('div', { key: bl.id, style: { borderLeft: `2px solid ${ec.text}`, paddingLeft: '6px', marginBottom: '3px' } },
                    React.createElement('div', { style: { fontSize: `calc(12px * var(--fs,1))`, fontWeight: 900, color: wk.blockType || ec.text, textTransform: 'uppercase', letterSpacing: '.06em', lineHeight: 1.2 } }, bl.type),
                    exNames && React.createElement('div', { style: { fontSize: `calc(11px * var(--fs,1))`, color: wk.exName || '#666', lineHeight: 1.3, marginTop: '1px' } }, exNames)
                  );
                })
              )
            );
          })
        );
      })
    )
  );
}

// ── MobileBlockA ──────────────────────────────────────────────────────────────
function MobileBlockA({ bl, fs, bg, colors }) {
  const col = colors || {};
  const f = fs || 1;
  const pad = Math.round(20 * f);
  const _lbl = bl.label && bl.label !== '-' ? bl.label : null;
  const _typ = bl.type && bl.type !== '-' ? bl.type : null;
  const title = _lbl && _typ && _lbl !== _typ ? `${_lbl} · ${_typ}` : _lbl || _typ || '';
  const meta = [bl.rounds && `${bl.rounds} RDS`, bl.duration && `CAP ${bl.duration}'`].filter(Boolean).join(' · ');
  const blockBg = bg || APP_CONFIG.mobileEaglesBg || '#000';
  return React.createElement('div', { style: { borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
    React.createElement('div', { style: { background: col.blockHdr || 'rgba(0,184,212,0.12)', padding: `${Math.round(10 * f)}px ${pad}px ${Math.round(6 * f)}px`, borderTop: '2px solid #00b8d4' } },
      React.createElement('div', { style: { fontSize: mfs(18, f), fontWeight: 900, color: col.blockType || '#00b8d4', textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: GF(), lineHeight: 1.2 } }, title),
      meta && React.createElement('div', { style: { fontSize: mfs(12, f), color: col.blockMeta || '#00b8d4', fontWeight: 700, textTransform: 'uppercase', marginTop: mfs(2, f), fontFamily: GF() } }, meta)
    ),
    React.createElement('div', { style: { background: blockBg, padding: `${Math.round(4 * f)}px ${pad}px ${Math.round(14 * f)}px` } },
      (bl.exercises || []).filter(e => e.name || e.isComplex).map((ex, ei) => {
        if (ex.isComplex) {
          const movs = ex.complexMovements || [];
          return React.createElement('div', { key: ex.id, style: { padding: `${Math.round(6 * f)}px 0`, borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
            React.createElement('div', { style: { fontSize: mfs(17, f), fontWeight: 900, color: col.exName || '#fff', textTransform: 'uppercase', letterSpacing: '.04em', fontFamily: GF(), lineHeight: 1.2 } }, complexLine(ex)),
            ...movs.map((m, mi) => React.createElement('div', { key: mi, style: { fontSize: mfs(13, f), color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa', fontFamily: GF() } }, `· ${[m.reps, m.name].filter(Boolean).join(' ')}`)),
            ex.note ? React.createElement('div', { key: 'n', style: { fontSize: mfs(12, f), color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa', fontStyle: 'italic', marginTop: mfs(2, f) } }, ex.note) : null
          );
        }
        const isProg = ex.intensity?.mode === 'progression';
        const line = exLine(ex);
        if (isProg) {
          const progLines = buildProgressionLines(ex);
          if (!progLines || !progLines.length) return React.createElement('div', { key: ex.id, style: { padding: `${Math.round(6 * f)}px 0`, borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
            React.createElement('div', { style: { fontSize: mfs(17, f), fontWeight: 900, color: col.exName || '#fff', textTransform: 'uppercase', letterSpacing: '.04em', fontFamily: GF(), lineHeight: 1.2 } }, line)
          );
          return React.createElement('div', { key: ex.id, style: { padding: `${Math.round(6 * f)}px 0`, borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
            progLines.map((pl, si) => React.createElement('div', { key: si, style: { marginTop: si > 0 ? mfs(4, f) : '0' } },
              React.createElement('div', { style: { fontSize: mfs(17, f), fontWeight: 900, color: col.exName || '#fff', textTransform: 'uppercase', letterSpacing: '.04em', fontFamily: GF(), lineHeight: 1.2 } }, pl.nameLine),
              pl.loadStr && React.createElement('div', { style: { display: 'inline-block', fontSize: mfs(13, f), fontWeight: 700, color: '#ffd700', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: '3px', padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`, marginTop: mfs(3, f), fontFamily: GF() } }, pl.loadStr)
            )),
            ex.note && React.createElement('div', { style: { fontSize: mfs(12, f), color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa', fontStyle: 'italic', marginTop: mfs(2, f) } }, ex.note)
          );
        }
        const ins = ex.intensity?.mode !== 'cardio' ? fmtIntensity(ex.intensity) : null;
        return React.createElement('div', { key: ex.id, style: { padding: `${Math.round(6 * f)}px 0`, borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
          React.createElement('div', { style: { fontSize: mfs(17, f), fontWeight: 900, color: col.exName || '#fff', textTransform: 'uppercase', letterSpacing: '.04em', fontFamily: GF(), lineHeight: 1.2 } }, line),
          ins && React.createElement('div', { style: { display: 'inline-block', fontSize: mfs(13, f), fontWeight: 700, color: '#ffd700', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: '3px', padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`, marginTop: mfs(3, f), fontFamily: GF() } }, ins),
          ex.note && React.createElement('div', { style: { fontSize: mfs(12, f), color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa', fontStyle: 'italic', marginTop: mfs(2, f) } }, ex.note)
        );
      }),
      bl.notes && React.createElement('div', { style: { fontSize: mfs(12, f), color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa', fontStyle: 'italic', marginTop: mfs(5, f), paddingTop: mfs(5, f), borderTop: '1px solid rgba(0,184,212,0.15)' } }, bl.notes)
    )
  );
}

// ── MobileEaglesExportView ────────────────────────────────────────────────────
function MobileEaglesExportView({ sessions, selectedDate, currentWeekDates, gymName, logoDataUrl, logoScale, fontScale, bgOverride, colors }) {
  const col = colors || {};
  const found = buildMobileSession(sessions, selectedDate, currentWeekDates);
  const f = fontScale || 1;
  const pad = Math.round(28 * f);
  if (!found) return React.createElement('div', { style: { background: '#000', color: '#555', padding: '40px', textAlign: 'center', fontFamily: GF() } }, '—');
  const { s, date } = found;
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();
  const dateNum = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const ls = logoScale || 1;
  const bgA = bgOverride || APP_CONFIG.mobileEaglesBg || '#0d0b09';
  return React.createElement('div', { style: { background: bgA, width: '1080px', fontFamily: GF() } },
    React.createElement('div', { style: { background: bgA, padding: `${Math.round(22 * f)}px ${pad}px ${Math.round(18 * f)}px`, borderBottom: `2px solid ${col.date || '#4ac8c0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: mfs(16, f) } },
        logoDataUrl && React.createElement('img', { src: logoDataUrl, style: { width: `${Math.round(56 * ls)}px`, height: `${Math.round(56 * ls)}px`, objectFit: 'contain', borderRadius: '4px' } }),
        React.createElement('span', { style: { fontSize: mfs(30, f), fontWeight: 900, color: col.gymName || '#fff', textTransform: 'uppercase', letterSpacing: '.08em' } }, gymName || 'Cone')
      ),
      React.createElement('div', { style: { textAlign: 'right' } },
        React.createElement('div', { style: { fontSize: mfs(18, f), color: col.date || '#4ac8c0', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em' } }, `${weekday} · ${dateNum}`),
        s.mainTraining && React.createElement('div', { style: { fontSize: mfs(13, f), color: col.subtitle || '#3a8a80', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: mfs(2, f) } }, s.mainTraining)
      )
    ),
    (s.blocks || []).map(bl => React.createElement(MobileBlockA, { key: bl.id, bl, fs: f, bg: bgA, colors: col }))
  );
}

// ── MobileBlockB ──────────────────────────────────────────────────────────────
function MobileBlockB({ bl, fs, colors }) {
  const col = colors || {};
  const f = fs || 1;
  const pad = Math.round(20 * f);
  const _lbl = bl.label && bl.label !== '-' ? bl.label : null;
  const _typ = bl.type && bl.type !== '-' ? bl.type : null;
  const title = _lbl && _typ && _lbl !== _typ ? `${_lbl} · ${_typ}` : _lbl || _typ || '';
  const meta = [bl.rounds && `${bl.rounds} RDS`, bl.duration && `CAP ${bl.duration}'`].filter(Boolean).join(' · ');
  return React.createElement('div', { style: { borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
    React.createElement('div', { style: { background: col.blockHdr || 'rgba(0,184,212,0.12)', padding: `${Math.round(10 * f)}px ${pad}px`, borderTop: `${Math.max(2, Math.round(3 * f))}px solid ${col.blockType || '#00b8d4'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      React.createElement('div', { style: { fontSize: mfs(16, f), fontWeight: 900, color: col.blockType || '#00b8d4', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: GF(), lineHeight: 1.2 } }, title),
      meta && React.createElement('span', { style: { fontSize: mfs(12, f), fontWeight: 900, color: col.blockMetaText || '#000', background: col.blockMetaBg || '#00b8d4', padding: `${Math.round(3 * f)}px ${Math.round(10 * f)}px`, borderRadius: '2px', fontFamily: GF(), whiteSpace: 'nowrap' } }, meta)
    ),
    React.createElement('div', { style: { background: APP_CONFIG.mobileMegaManBg || '#000', padding: `${Math.round(8 * f)}px ${pad}px ${Math.round(14 * f)}px` } },
      (bl.exercises || []).filter(e => e.name || e.isComplex).map((ex, ei) => {
        if (ex.isComplex) {
          const movs = ex.complexMovements || [];
          return React.createElement('div', { key: ex.id, style: { padding: `${Math.round(6 * f)}px 0`, borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
            React.createElement('div', { style: { fontSize: mfs(17, f), fontWeight: 900, color: col.exName || '#fff', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: GF(), lineHeight: 1.2 } }, complexLine(ex)),
            ...movs.map((m, mi) => React.createElement('div', { key: mi, style: { fontSize: mfs(13, f), color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa', fontFamily: GF() } }, `· ${[m.reps, m.name].filter(Boolean).join(' ')}`)),
            ex.note ? React.createElement('div', { key: 'n', style: { fontSize: mfs(11, f), color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa', fontStyle: 'italic', marginTop: mfs(2, f) } }, ex.note) : null
          );
        }
        const isProg = ex.intensity?.mode === 'progression';
        const line = exLine(ex);
        if (isProg) {
          const progLines = buildProgressionLines(ex);
          if (!progLines || !progLines.length) return React.createElement('div', { key: ex.id, style: { padding: `${Math.round(6 * f)}px 0`, borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
            React.createElement('div', { style: { fontSize: mfs(17, f), fontWeight: 900, color: col.exName || '#fff', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: GF(), lineHeight: 1.2 } }, line)
          );
          return React.createElement('div', { key: ex.id, style: { padding: `${Math.round(6 * f)}px 0`, borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
            progLines.map((pl, si) => React.createElement('div', { key: si, style: { marginTop: si > 0 ? mfs(4, f) : '0' } },
              React.createElement('div', { style: { fontSize: mfs(17, f), fontWeight: 900, color: col.exName || '#fff', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: GF(), lineHeight: 1.2 } }, pl.nameLine),
              pl.loadStr && React.createElement('div', { style: { display: 'inline-block', fontSize: mfs(13, f), fontWeight: 700, color: '#ffd700', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: '3px', padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`, marginTop: mfs(3, f), fontFamily: GF() } }, pl.loadStr)
            )),
            ex.note && React.createElement('div', { style: { fontSize: mfs(11, f), color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa', fontStyle: 'italic', marginTop: mfs(2, f) } }, ex.note)
          );
        }
        const ins = ex.intensity?.mode !== 'cardio' ? fmtIntensity(ex.intensity) : null;
        return React.createElement('div', { key: ex.id, style: { padding: `${Math.round(6 * f)}px 0`, borderBottom: `1px solid ${col.divider || 'rgba(0,184,212,0.1)'}` } },
          React.createElement('div', { style: { fontSize: mfs(17, f), fontWeight: 900, color: col.exName || '#fff', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: GF(), lineHeight: 1.2 } }, line),
          ins && React.createElement('div', { style: { display: 'inline-block', fontSize: mfs(13, f), fontWeight: 700, color: '#ffd700', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: '3px', padding: `${Math.round(2 * f)}px ${Math.round(8 * f)}px`, marginTop: mfs(3, f), fontFamily: GF() } }, ins),
          ex.note && React.createElement('div', { style: { fontSize: mfs(11, f), color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa', fontStyle: 'italic', marginTop: mfs(2, f) } }, ex.note)
        );
      }),
      bl.notes && React.createElement('div', { style: { fontSize: mfs(12, f), color: APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa', marginTop: mfs(5, f), paddingTop: mfs(5, f), borderTop: '1px solid rgba(0,184,212,0.15)', fontFamily: GF() } }, bl.notes)
    )
  );
}

// ── MobileMegaManExportView ───────────────────────────────────────────────────
function MobileMegaManExportView({ sessions, selectedDate, currentWeekDates, gymName, logoDataUrl, logoScale, fontScale, bgOverride, colors }) {
  const col = colors || {};
  const found = buildMobileSession(sessions, selectedDate, currentWeekDates);
  const f = fontScale || 1;
  const pad = Math.round(28 * f);
  if (!found) return React.createElement('div', { style: { background: '#000', color: '#1a4a50', padding: '40px', textAlign: 'center', fontFamily: GF() } }, '—');
  const { s, date } = found;
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();
  const dateNum = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const ls = logoScale || 1;
  const bg = bgOverride || APP_CONFIG.mobileMegaManBg || '#0a1a5c';
  return React.createElement('div', { style: { background: bg, width: '1080px', fontFamily: GF() } },
    React.createElement('div', { style: { background: bg, padding: `${Math.round(22 * f)}px ${pad}px ${Math.round(18 * f)}px`, borderBottom: `${Math.max(2, Math.round(3 * f))}px solid rgba(0,184,212,0.8)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: mfs(16, f) } },
        logoDataUrl && React.createElement('img', { src: logoDataUrl, style: { width: `${Math.round(56 * ls)}px`, height: `${Math.round(56 * ls)}px`, objectFit: 'contain', borderRadius: '4px' } }),
        React.createElement('span', { style: { fontSize: mfs(30, f), fontWeight: 900, color: col.gymName || '#fff', textTransform: 'uppercase', letterSpacing: '.1em' } }, gymName || 'Cone')
      ),
      React.createElement('div', { style: { textAlign: 'right' } },
        React.createElement('div', { style: { fontSize: mfs(18, f), color: col.date || '#00b8d4', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em' } }, `${weekday} · ${dateNum}`),
        s.mainTraining && React.createElement('div', { style: { fontSize: mfs(12, f), color: col.subtitle || '#3a6a80', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: mfs(2, f) } }, s.mainTraining)
      )
    ),
    (s.blocks || []).map(bl => React.createElement(MobileBlockB, { key: bl.id, bl, fs: f, colors: col }))
  );
}

// ── MobileWeeklySingleDay ─────────────────────────────────────────────────────
function MobileWeeklySingleDay({ date, sessions, f, col, variant }) {
  const dateKey = toISO(date);
  const s = (sessions[dateKey] || [])[0] || null;
  const dow = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'][date.getDay()];
  const dateNum = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const restLabel = APP_CONFIG.restDayLabel || 'Descanso';
  const pad = Math.round(18 * f);
  const isA = variant === 'A';
  const cyan = '#00b8d4';
  const hdrAccent = isA ? '#4ac8c0' : cyan;
  const fontFamily = GF();
  const bg = isA ? (APP_CONFIG.mobileEaglesBg || '#000') : (APP_CONFIG.mobileMegaManBg || '#000');
  return React.createElement('div', null,
    React.createElement('div', { style: { background: isA ? '#161412' : '#050e14', padding: `${Math.round(8 * f)}px ${pad}px`, borderTop: `${Math.max(2, Math.round(3 * f))}px solid ${hdrAccent}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
      React.createElement('span', { style: { fontSize: mfs(15, f), fontWeight: 900, color: hdrAccent, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily } }, dow),
      React.createElement('span', { style: { fontSize: mfs(12, f), fontWeight: 700, color: isA ? '#3a8a80' : '#3a6a80', fontFamily } }, dateNum)
    ),
    s
      ? React.createElement('div', { style: { background: bg } },
          (s.blocks || []).map(bl => {
            const _lbl = bl.label && bl.label !== '-' ? bl.label : null;
            const _typ = bl.type && bl.type !== '-' ? bl.type : null;
            const title = _lbl && _typ && _lbl !== _typ ? `${_lbl} · ${_typ}` : _lbl || _typ || '';
            const meta = [bl.rounds && `${bl.rounds} RDS`, bl.duration && `CAP ${bl.duration}'`].filter(Boolean).join(' · ');
            const exNames = (bl.exercises || []).filter(e => e.name || e.isComplex);
            const blkBg = isA ? 'rgba(74,200,192,0.12)' : 'rgba(0,184,212,0.12)';
            const blkDiv = isA ? 'rgba(74,200,192,0.08) 1px solid' : 'rgba(0,184,212,0.08) 1px solid';
            return React.createElement('div', { key: bl.id },
              React.createElement('div', { style: { background: blkBg, padding: `${Math.round(6 * f)}px ${pad}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
                React.createElement('span', { style: { fontSize: mfs(13, f), fontWeight: 900, color: hdrAccent, textTransform: 'uppercase', letterSpacing: '.08em', fontFamily } }, title),
                meta && React.createElement('span', { style: { fontSize: mfs(11, f), fontWeight: 900, color: '#000', background: hdrAccent, padding: `${Math.round(2 * f)}px ${Math.round(7 * f)}px`, borderRadius: '2px', fontFamily } }, meta)
              ),
              exNames.map(ex => {
                const line = ex.isComplex ? complexLine(ex) : exLine(ex);
                return React.createElement('div', { key: ex.id, style: { padding: `${Math.round(5 * f)}px ${pad}px`, borderBottom: blkDiv, fontSize: mfs(14, f), fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '.04em', fontFamily, lineHeight: 1.2 } }, line);
              })
            );
          })
        )
      : React.createElement('div', { style: { background: bg, padding: `${Math.round(10 * f)}px ${pad}px`, fontSize: mfs(12, f), color: '#333', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily } }, `— ${restLabel}`)
  );
}

// ── MobileWeeklyExportView ────────────────────────────────────────────────────
function MobileWeeklyExportView({ sessions, gymName, logoDataUrl, logoScale, fontScale, weekDates, variant }) {
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const f = fontScale || 1;
  const ls = logoScale || 1;
  const pad = Math.round(22 * f);
  const isA = variant === 'A';
  const cyan = '#00b8d4';
  const accent = isA ? '#4ac8c0' : cyan;
  const bg = isA ? (APP_CONFIG.mobileEaglesBg || '#0d0b09') : (APP_CONFIG.mobileMegaManBg || '#000');
  const fontFamily = GF();
  const orderedDays = [1, 2, 3, 4, 5, 6, 0].map(i => weekDates[i]);
  const mon = weekDates[1];
  const sun = weekDates[0];
  const weekLabel = `${mon.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} – ${sun.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  const midDate = weekDates[3];
  return React.createElement('div', { style: { background: bg, width: '1080px', fontFamily } },
    React.createElement('div', { style: { background: bg, padding: `${Math.round(22 * f)}px ${pad}px ${Math.round(16 * f)}px`, borderBottom: `${Math.max(2, Math.round(3 * f))}px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: mfs(14, f) } },
        logoDataUrl && React.createElement('img', { src: logoDataUrl, style: { width: `${Math.round(48 * ls)}px`, height: `${Math.round(48 * ls)}px`, objectFit: 'contain', borderRadius: '4px' } }),
        React.createElement('span', { style: { fontSize: mfs(28, f), fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily } }, gymName || 'Cone')
      ),
      React.createElement('div', { style: { textAlign: 'right' } },
        React.createElement('div', { style: { fontSize: mfs(16, f), fontWeight: 900, color: accent, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily } }, weekLabel),
        React.createElement('div', { style: { fontSize: mfs(12, f), color: isA ? '#3a8a80' : '#3a6a80', marginTop: mfs(2, f), textTransform: 'uppercase', letterSpacing: '.06em', fontFamily } }, monthNames[midDate.getMonth()] + ' ' + midDate.getFullYear())
      )
    ),
    orderedDays.map((date, i) =>
      React.createElement(MobileWeeklySingleDay, { key: i, date, sessions, f, col: {}, variant })
    )
  );
}

// ── EventFormInner — standalone so inputs don't lose focus ───────────────────
function EventFormInner({ showForm, sessions, athletes, initialData, onSave, onCancel }) {
  const [fd, setFd] = useState(() => ({ ...initialData }));
  const isPers = showForm.type === 'personal';
  const daySessions = sessions[showForm.date] || [];
  const locs = loadLocations();
  const boxSvcs = locs.filter(l => l.type === 'box');
  const set = (k, v) => setFd(p => ({ ...p, [k]: v }));
  const toggleAthlete = id => setFd(p => ({ ...p, athleteIds: p.athleteIds?.includes(id) ? p.athleteIds.filter(x => x !== id) : [...(p.athleteIds || []), id] }));
  const selSvc = !isPers && fd.locationId ? locs.find(l => l.id === fd.locationId) : null;
  const S = (label, children) => React.createElement('div', { style: { marginBottom: '10px' } },
    React.createElement('label', { style: { fontSize: '11px', color: '#554a3a', display: 'block', marginBottom: '3px' } }, label),
    children
  );
  const inp = (val, onChange, opts = {}) => React.createElement('input', { type: 'text', value: val, onChange, style: { width: '100%', background: '#111', border: '1px solid #2a2318', color: '#c8b090', padding: '6px 8px', borderRadius: '5px', fontSize: '12px' }, ...(opts.style || {}), ...opts });
  const sel = (val, onChange, opts) => React.createElement('select', { value: val, onChange, style: { width: '100%', background: '#111', border: '1px solid #2a2318', color: '#c8b090', padding: '6px 8px', borderRadius: '5px', fontSize: '12px' } }, opts);
  return React.createElement('div', { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
    React.createElement('div', { style: { background: '#0d0b08', border: '1px solid #2a2318', borderRadius: '10px', padding: '18px', width: '340px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' } },
        React.createElement('span', { style: { fontSize: '13px', fontWeight: 700, color: '#c8b090' } }, (showForm.eventId ? 'Editar' : 'Novo') + ' ' + (isPers ? 'Personal' : 'Aula')),
        React.createElement('button', { onClick: onCancel, style: { background: 'transparent', border: 'none', color: '#554a3a', cursor: 'pointer', fontSize: '16px' } }, '✕')
      ),
      S(isPers ? 'Nome / cliente' : 'Nome da turma',
        inp(fd.label || '', e => set('label', e.target.value), { placeholder: isPers ? 'Ex: Jinx' : 'Ex: Turma Manhã' })
      ),
      !isPers && S('Serviço (cobrança)',
        React.createElement(React.Fragment, null,
          sel(fd.locationId || '', e => set('locationId', e.target.value || null),
            [React.createElement('option', { key: '', value: '' }, 'Sem serviço'),
             ...boxSvcs.map(l => React.createElement('option', { key: l.id, value: l.id }, l.name))]
          ),
          selSvc && React.createElement('div', { style: { fontSize: '10px', color: '#887060', marginTop: '3px' } },
            `${selSvc.currency || 'R$'} ${selSvc.rate || 0}/${selSvc.rateUnit === 'per_hour' ? 'hora' : 'sessão'}`
          )
        )
      ),
      isPers && S('Atletas',
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' } },
          athletes.map(a => {
            const svc = locs.find(l => l.type === 'personal' && (l.athleteIds || []).includes(a.id));
            return React.createElement('label', { key: a.id, style: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#a89880' } },
              React.createElement('input', { type: 'checkbox', checked: (fd.athleteIds || []).includes(a.id), onChange: () => toggleAthlete(a.id), style: { accentColor: a.color } }),
              React.createElement('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: a.color, flexShrink: 0 } }),
              React.createElement('span', { style: { flex: 1 } }, a.name),
              svc && React.createElement('span', { style: { fontSize: '10px', color: '#554a3a' } }, `${svc.currency || 'R$'}${svc.rate || 0}`)
            );
          })
        )
      ),
      S('Local (opcional)',
        sel(fd.local || '', e => set('local', e.target.value),
          [React.createElement('option', { key: '', value: '' }, '—'),
           ...boxSvcs.map(l => React.createElement('option', { key: l.id, value: l.name }, l.name)),
           React.createElement('option', { key: 'outro', value: '__outro__' }, 'Outro...')]
        )
      ),
      fd.local === '__outro__' && S('Especificar local',
        inp(fd.localText || '', e => set('localText', e.target.value), { placeholder: 'Ex: Studio Norte' })
      ),
      React.createElement('div', { style: { display: 'flex', gap: '8px', marginBottom: '10px' } },
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('label', { style: { fontSize: '11px', color: '#554a3a', display: 'block', marginBottom: '3px' } }, 'Horário'),
          React.createElement('input', { type: 'time', value: fd.time || '07:00', onChange: e => set('time', e.target.value), style: { width: '100%', background: '#111', border: '1px solid #2a2318', color: '#c8b090', padding: '6px 8px', borderRadius: '5px', fontSize: '12px' } })
        ),
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('label', { style: { fontSize: '11px', color: '#554a3a', display: 'block', marginBottom: '3px' } }, 'Duração (min)'),
          React.createElement('input', { type: 'number', value: fd.durationMin || 60, onChange: e => set('durationMin', Number(e.target.value)), min: 15, max: 480, step: 15, style: { width: '100%', background: '#111', border: '1px solid #2a2318', color: '#c8b090', padding: '6px 8px', borderRadius: '5px', fontSize: '12px' } })
        )
      ),
      !isPers && S('Atletas presentes (opcional)',
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' } },
          athletes.map(a => React.createElement('label', { key: a.id, style: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#a89880' } },
            React.createElement('input', { type: 'checkbox', checked: (fd.athleteIds || []).includes(a.id), onChange: () => toggleAthlete(a.id), style: { accentColor: a.color } }),
            React.createElement('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: a.color, flexShrink: 0 } }),
            a.name
          ))
        )
      ),
      daySessions.length > 0 && S('Sessão vinculada',
        sel(fd.sessionId || '', e => set('sessionId', e.target.value || null),
          [React.createElement('option', { key: '', value: '' }, 'Nenhuma'),
           ...daySessions.map(s => React.createElement('option', { key: s.id, value: s.id }, s.mainTraining || 'Sessão'))]
        )
      ),
      S('Notas (opcional)',
        React.createElement('textarea', { value: fd.notes || '', onChange: e => set('notes', e.target.value), rows: 2, placeholder: 'Observações...', style: { width: '100%', background: '#111', border: '1px solid #2a2318', color: '#c8b090', padding: '6px 8px', borderRadius: '5px', fontSize: '12px', resize: 'vertical' } })
      ),
      React.createElement('div', { style: { display: 'flex', gap: '6px' } },
        React.createElement('button', { onClick: () => onSave({ ...fd }), style: { flex: 1, background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 } }, 'Salvar'),
        React.createElement('button', { onClick: onCancel, style: { background: 'transparent', border: '1px solid #2a2318', color: '#554a3a', padding: '8px 14px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' } }, 'Cancelar')
      )
    )
  );
}

// ── ReportModal ───────────────────────────────────────────────────────────────
function ReportModal({ events, sessions, onClose }) {
  const locations = loadLocations();
  const coach = loadCoach();
  const gymCfg = loadSettings();
  const now = new Date();
  const [yr, setYr] = useState(now.getFullYear());
  const [mo, setMo] = useState(now.getMonth());
  const [useRange, setUseRange] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(toISO(now));
  const [rangeTo, setRangeTo] = useState(toISO(now));
  const [typeFilter, setTypeFilter] = useState({ aula: true, personal: true });
  const [locAll, setLocAll] = useState(true);
  const [locSelected, setLocSelected] = useState(() => new Set());
  const [athAll, setAthAll] = useState(true);
  const [athSelected, setAthSelected] = useState(() => new Set());
  const [statusFilter, setStatusFilter] = useState('completed');
  const [showDetails, setShowDetails] = useState(false);
  const [showRate, setShowRate] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPix, setShowPix] = useState(false);
  const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  function filteredEvents() {
    const from = useRange ? rangeFrom : `${yr}-${String(mo + 1).padStart(2, '0')}-01`;
    const to = useRange ? rangeTo : `${yr}-${String(mo + 1).padStart(2, '0')}-${new Date(yr, mo + 1, 0).getDate()}`;
    const result = [];
    Object.entries(events).forEach(([date, evs]) => {
      if (date < from || date > to) return;
      evs.forEach(ev => {
        if (!typeFilter[ev.type]) return;
        if (!locAll) { if (!ev.locationId) return; if (!locSelected.has(ev.locationId)) return; }
        if (statusFilter === 'completed' && ev.status !== 'completed') return;
        if (!athAll && ev.type === 'personal') { const hasAth = (ev.athleteIds || []).some(id => athSelected.has(id)); if (!hasAth) return; }
        result.push({ ...ev, date });
      });
    });
    return result.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }

  function groupByLocation(evs) {
    const groups = {};
    evs.forEach(ev => {
      if (ev.type === 'personal') {
        const athIds = (ev.athleteIds || []).filter(id => athAll || athSelected.has(id));
        if (athIds.length === 0) { if (!groups['__unlabelled__']) groups['__unlabelled__'] = []; groups['__unlabelled__'].push(ev); return; }
        athIds.forEach(id => { const k = '__ath__' + id; if (!groups[k]) groups[k] = []; groups[k].push(ev); });
      } else {
        const key = ev.locationId || '__unlabelled__';
        if (!groups[key]) groups[key] = [];
        groups[key].push(ev);
      }
    });
    return groups;
  }

  function fmtDate(iso) { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  function fmtDur(min) { return min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? min % 60 + 'min' : ''}` : min + 'min'; }
  function calcTotal(evs, loc) {
    if (!loc || !loc.rate) return null;
    const total = evs.reduce((sum, ev) => {
      const hrs = loc.rateUnit === 'per_hour' ? Math.max(1, Math.floor((ev.durationMin || 60) / 60)) : 1;
      return sum + (loc.rateUnit === 'per_hour' ? hrs * loc.rate : loc.rate);
    }, 0);
    return { total, currency: loc.currency || 'R$' };
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement('script'); s.src = src;
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }

  function qrToBase64(text, size = 200) {
    return new Promise(res => {
      try {
        const div = document.createElement('div'); div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
        document.body.appendChild(div);
        new window.QRCode(div, { text, width: size, height: size, correctLevel: window.QRCode.CorrectLevel.M });
        setTimeout(() => {
          const img = div.querySelector('img') || div.querySelector('canvas');
          let b64 = null;
          if (img instanceof HTMLCanvasElement) b64 = img.toDataURL('image/png');
          else if (img instanceof HTMLImageElement) b64 = img.src;
          document.body.removeChild(div);
          res(b64);
        }, 120);
      } catch (e) { res(null); }
    });
  }

  async function generatePDF() {
    setGenerating(true);
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
      if (showPix && coach.pixKey) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js');
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const evs = filteredEvents();
        const groups = groupByLocation(evs);
        const period = useRange ? `${fmtDate(rangeFrom)} – ${fmtDate(rangeTo)}` : MONTHS_PT[mo] + ' ' + yr;
        const gymName = gymCfg.gymName || 'Cone';
        let y = 15;
        if (showHeader) {
          doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
          doc.text(gymName, 14, y); y += 7;
          doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
          if (coach.name) { doc.text('Coach: ' + coach.name, 14, y); y += 5; }
          if (coach.contact) { doc.text(coach.contact, 14, y); y += 5; }
          if (coach.phone) { doc.text(coach.phone, 14, y); y += 5; }
          doc.setFontSize(9); doc.setTextColor(150, 150, 150);
          doc.text('Gerado em: ' + new Date().toLocaleDateString('pt-BR'), 14, y); y += 10;
        }
        doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
        doc.text('Relatório — ' + period, 14, y); y += 8;
        const summaryRows = [];
        let grandTotal = 0; let grandCurrency = 'R$';
        Object.entries(groups).forEach(([locId, levs]) => {
          const loc = locations.find(l => l.id === locId);
          const athGroupId2 = locId.startsWith('__ath__') ? locId.slice(7) : null;
          const athGroup2 = athGroupId2 ? loadAthletes().find(a => a.id === athGroupId2) : null;
          const name = athGroup2 ? athGroup2.name : loc ? loc.name : (locId === '__unlabelled__' ? 'Sem local' : locId);
          const totalMin = levs.reduce((s, ev) => s + (ev.durationMin || 60), 0);
          const locForCalc = athGroup2 ? locations.find(l => l.type === 'personal' && (l.athleteIds || []).includes(athGroup2.id)) : loc;
          const t = calcTotal(levs, locForCalc);
          if (t) { grandTotal += t.total; grandCurrency = t.currency; }
          summaryRows.push([name, loc?.type === 'box' ? 'Box' : 'Personal', String(levs.length), fmtDur(totalMin), t ? t.currency + ' ' + t.total.toLocaleString('pt-BR') : '-']);
        });
        doc.autoTable({ startY: y, head: [['Local', 'Tipo', 'Sessões', 'Tempo Total', 'Valor']], body: summaryRows, foot: showRate && grandTotal > 0 ? [['', '', '', 'Total', grandCurrency + ' ' + grandTotal.toLocaleString('pt-BR')]] : [], styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' }, footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 25 }, 2: { cellWidth: 22 }, 3: { cellWidth: 28 }, 4: { cellWidth: 35 } }, margin: { left: 14, right: 14 } });
        y = doc.lastAutoTable.finalY + 14;
        for (const [locId, levs] of Object.entries(groups)) {
          const loc = locations.find(l => l.id === locId);
          const athGroupId2 = locId.startsWith('__ath__') ? locId.slice(7) : null;
          const athGroup2 = athGroupId2 ? loadAthletes().find(a => a.id === athGroupId2) : null;
          const name = athGroup2 ? athGroup2.name : loc ? loc.name : (locId === '__unlabelled__' ? 'Sem local' : locId);
          if (y > 250) { doc.addPage(); y = 15; }
          doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
          doc.text(name + ' — ' + period, 14, y); y += 6;
          const rows = levs.map(ev => {
            const daySess = sessions[ev.date] || [];
            const linked = ev.sessionId ? daySess.find(s => s.id === ev.sessionId) : null;
            const blockLabels = linked ? (linked.blocks || []).map(b => b.label && b.label !== '-' ? b.label : b.type).join(' · ') : '';
            const row = [fmtDate(ev.date), ev.time, fmtDur(ev.durationMin || 60), ev.label || name];
            if (showDetails) row.push(blockLabels || '-');
            if (showRate && loc?.rate) row.push((loc.currency || 'R$') + ' ' + loc.rate);
            return row;
          });
          const head = [['Data', 'Hora', 'Duração', 'Sessão']];
          if (showDetails) head[0].push('Detalhes');
          if (showRate && loc?.rate) head[0].push('Valor');
          doc.autoTable({ startY: y, head, body: rows, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold' }, margin: { left: 14, right: 14 } });
          y = doc.lastAutoTable.finalY + 4;
          const locForCalc = athGroup2 ? locations.find(l => l.type === 'personal' && (l.athleteIds || []).includes(athGroup2.id)) : loc;
          const t = calcTotal(levs, locForCalc);
          const totalMin = levs.reduce((s, ev) => s + (ev.durationMin || 60), 0);
          doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100);
          let sub = `${levs.length} ${levs.length !== 1 ? 'sessões' : 'sessão'} · ${fmtDur(totalMin)}`;
          if (t && showRate) sub += ` · ${t.currency} ${t.total.toLocaleString('pt-BR')}`;
          doc.text(sub, 14, y); y += 8;
          if (showPix && coach.pixEnabled && coach.pixKey && t && t.total > 0) {
            const cap = coach.pixTestCap && Number(coach.pixTestCap) > 0 ? Number(coach.pixTestCap) : null;
            const payAmount = cap && t.total > cap ? cap : t.total;
            const isCapped = cap && t.total > cap;
            const prd = useRange ? `${fmtDate(rangeFrom)}-${fmtDate(rangeTo)}` : (MONTHS_PT[mo].substring(0, 3) + yr).replace(/\s/g, '');
            const desc = `${name} ${prd}`.slice(0, 72);
            const txid = (name.replace(/\s/g, '').slice(0, 10) + String(mo + 1).padStart(2, '0') + yr).slice(0, 25);
            const pixPayload = buildPixPayload({ pixKey: coach.pixKey, merchantName: coach.name || gymName, merchantCity: coach.cidade || 'BRASIL', amount: payAmount, description: desc, txid });
            const qrB64 = await qrToBase64(pixPayload, 200);
            if (y > 240) { doc.addPage(); y = 15; }
            if (qrB64) {
              doc.addImage(qrB64, 'PNG', 14, y, 28, 28);
              doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
              doc.text('Pagar com Pix', 46, y + 5);
              doc.setFontSize(10); doc.setFont('helvetica', 'bold');
              doc.text(`${t.currency} ${payAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 46, y + 11);
              doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
              doc.text(coach.pixKey, 46, y + 17);
              doc.text(pixClean(coach.name || gymName).slice(0, 25).toUpperCase(), 46, y + 22);
              if (isCapped) { doc.setFontSize(8); doc.setTextColor(180, 80, 0); doc.text(`⚠ Valor limitado a ${t.currency} ${payAmount.toFixed(2)} (modo teste)`, 14, y + 31); y += 35; }
              else { y += 33; }
            }
          }
          y += 6;
        }
        const gymSlug = (gymCfg.gymName || 'relatorio').toLowerCase().normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const filename = `${gymSlug}-relatorio-${period.replace(/\s/g, '-').toLowerCase()}.pdf`;
        doc.save(filename);
      } catch (err) { console.error('PDF error:', err); alert('Erro ao gerar PDF: ' + err.message); }
    } catch (loadErr) { alert('Erro ao carregar bibliotecas PDF: ' + loadErr.message); }
    setGenerating(false);
  }

  const evs = filteredEvents();
  const groups = groupByLocation(evs);

  return React.createElement('div', { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px 0' } },
    React.createElement('div', { style: { background: '#0d0b08', border: '1px solid #2a2318', borderRadius: '10px', width: '540px', maxWidth: '95vw', padding: '20px' }, onClick: e => e.stopPropagation() },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' } },
        React.createElement('span', { style: { fontSize: '14px', fontWeight: 700, color: '#c8b090' } }, 'Gerar Relatório'),
        React.createElement('button', { onClick: onClose, style: { background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px' } }, '✕')
      ),
      React.createElement('div', { style: { marginBottom: '12px' } },
        React.createElement('div', { style: { fontSize: '10px', fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' } }, 'Período'),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
          React.createElement('button', { type: 'button', onClick: () => { if (mo === 0) { setMo(11); setYr(y => y - 1); } else setMo(m => m - 1); }, style: { background: 'transparent', border: '1px solid #2a2318', color: '#887060', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' } }, '‹'),
          React.createElement('span', { style: { flex: 1, textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#c8b090' } }, MONTHS_PT[mo] + ' ' + yr),
          React.createElement('button', { type: 'button', onClick: () => { if (mo === 11) { setMo(0); setYr(y => y + 1); } else setMo(m => m + 1); }, style: { background: 'transparent', border: '1px solid #2a2318', color: '#887060', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' } }, '›')
        ),
        React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#887060', cursor: 'pointer' } },
          React.createElement('input', { type: 'checkbox', checked: useRange, onChange: e => setUseRange(e.target.checked), style: { accentColor: 'var(--theme-accent)' } }),
          'Intervalo personalizado'
        ),
        useRange && React.createElement('div', { style: { display: 'flex', gap: '8px', marginTop: '6px' } },
          React.createElement('input', { type: 'date', value: rangeFrom, onChange: e => setRangeFrom(e.target.value), style: { flex: 1, background: '#111', border: '1px solid #2a2318', color: '#c8b090', padding: '5px 7px', borderRadius: '4px', fontSize: '12px' } }),
          React.createElement('span', { style: { color: '#555', alignSelf: 'center' } }, '—'),
          React.createElement('input', { type: 'date', value: rangeTo, onChange: e => setRangeTo(e.target.value), style: { flex: 1, background: '#111', border: '1px solid #2a2318', color: '#c8b090', padding: '5px 7px', borderRadius: '4px', fontSize: '12px' } })
        )
      ),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: '10px', fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' } }, 'Tipo'),
          ['aula', 'personal'].map(t => React.createElement('label', { key: t, style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#c8b090', cursor: 'pointer', marginBottom: '4px' } },
            React.createElement('input', { type: 'checkbox', checked: typeFilter[t], onChange: () => setTypeFilter(p => ({ ...p, [t]: !p[t] })), style: { accentColor: 'var(--theme-accent)' } }),
            t === 'aula' ? 'Aulas' : 'Personal'
          ))
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: '10px', fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' } }, 'Status'),
          ['completed', 'all'].map(s => React.createElement('label', { key: s, style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#c8b090', cursor: 'pointer', marginBottom: '4px' } },
            React.createElement('input', { type: 'radio', name: 'statusF', checked: statusFilter === s, onChange: () => setStatusFilter(s), style: { accentColor: 'var(--theme-accent)' } }),
            s === 'completed' ? 'Concluídas' : 'Todas'
          ))
        )
      ),
      locations.length > 0 && React.createElement('div', { style: { marginBottom: '12px' } },
        React.createElement('div', { style: { fontSize: '10px', fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' } }, 'Serviços'),
        React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '5px' } },
          React.createElement('button', { type: 'button', onClick: () => { setLocAll(true); setLocSelected(new Set()); }, style: { padding: '3px 10px', borderRadius: '4px', border: `1px solid ${locAll ? 'var(--theme-accent)' : '#2a2318'}`, background: locAll ? 'rgba(74,200,192,.15)' : 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: locAll ? 'var(--theme-accent)' : '#555' } }, 'Todos'),
          locations.map(l => {
            const active = !locAll && locSelected.has(l.id);
            return React.createElement('button', { key: l.id, type: 'button', onClick: () => { setLocAll(false); setLocSelected(prev => { const s = new Set(prev); if (s.has(l.id)) s.delete(l.id); else s.add(l.id); if (s.size === 0) { setLocAll(true); return new Set(); } return s; }); }, style: { padding: '3px 10px', borderRadius: '4px', border: `1px solid ${active ? (l.color || 'var(--theme-accent)') : '#2a2318'}`, background: active ? `${l.color || '#4ac8c0'}22` : 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: active ? (l.color || 'var(--theme-accent)') : '#555' } }, l.name);
          })
        )
      ),
      typeFilter.personal && React.createElement('div', { style: { marginBottom: '12px' } },
        React.createElement('div', { style: { fontSize: '10px', fontWeight: 700, color: '#d8a840', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' } }, 'Atletas'),
        React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '5px' } },
          React.createElement('button', { type: 'button', onClick: () => { setAthAll(true); setAthSelected(new Set()); }, style: { padding: '3px 10px', borderRadius: '4px', border: `1px solid ${athAll ? '#d8a840' : '#2a2318'}`, background: athAll ? 'rgba(216,168,64,.15)' : 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: athAll ? '#d8a840' : '#555' } }, 'Todos'),
          loadAthletes().map(a => {
            const active = !athAll && athSelected.has(a.id);
            return React.createElement('button', { key: a.id, type: 'button', onClick: () => { setAthAll(false); setAthSelected(prev => { const s = new Set(prev); if (s.has(a.id)) s.delete(a.id); else s.add(a.id); if (s.size === 0) { setAthAll(true); return new Set(); } return s; }); }, style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', border: `1px solid ${active ? (a.color || '#d8a840') : '#2a2318'}`, background: active ? `${a.color || '#d8a840'}22` : 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: active ? (a.color || '#d8a840') : '#555' } },
              React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: a.color || '#555', display: 'inline-block', flexShrink: 0 } }),
              a.name
            );
          })
        )
      ),
      React.createElement('div', { style: { marginBottom: '16px', padding: '10px 12px', background: 'rgba(255,255,255,.02)', border: '1px solid #2a2318', borderRadius: '6px' } },
        React.createElement('div', { style: { fontSize: '10px', fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' } }, 'Opções'),
        [
          [showDetails, setShowDetails, 'Mostrar detalhes da sessão (blocos/exercícios)'],
          [showRate, setShowRate, 'Incluir valor por sessão'],
          [showHeader, setShowHeader, 'Incluir cabeçalho (coach, academia, data)'],
          ...(coach.pixEnabled && coach.pixKey && showRate ? [[showPix, setShowPix, 'Incluir QR code Pix (por local)']] : [])
        ].map(([val, setter, lbl], i) => React.createElement('label', { key: i, style: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#c8b090', cursor: 'pointer', marginBottom: i < 2 ? '6px' : '0' } },
          React.createElement('input', { type: 'checkbox', checked: val, onChange: () => setter(v => !v), style: { accentColor: 'var(--theme-accent)', width: '13px', height: '13px' } }),
          lbl
        ))
      ),
      evs.length > 0 && React.createElement('div', { style: { marginBottom: '16px', padding: '10px 12px', background: '#0a0908', border: '1px solid #2a2318', borderRadius: '6px' } },
        React.createElement('div', { style: { fontSize: '10px', fontWeight: 700, color: '#554a3a', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '6px' } }, 'Pré-visualização'),
        Object.entries(groups).map(([locId, levs]) => {
          const loc = locations.find(l => l.id === locId);
          const athGroupId = locId.startsWith('__ath__') ? locId.slice(7) : null;
          const athGroup = athGroupId ? loadAthletes().find(a => a.id === athGroupId) : null;
          const name = athGroup ? athGroup.name : loc ? loc.name : (locId === '__unlabelled__' ? 'Sem local' : locId);
          const locForCalc = loc || (athGroup ? locations.find(l => l.type === 'personal' && (l.athleteIds || []).includes(athGroup.id)) : null);
          const t = calcTotal(levs, locForCalc);
          const totalMin = levs.reduce((s, ev) => s + (ev.durationMin || 60), 0);
          const previewCap = coach.pixTestCap && Number(coach.pixTestCap) > 0 ? Number(coach.pixTestCap) : null;
          const previewAmt = t ? (previewCap && t.total > previewCap ? previewCap : t.total) : 0;
          const previewPayload = showPix && coach.pixEnabled && coach.pixKey && t && t.total > 0 ? buildPixPayload({ pixKey: coach.pixKey, merchantName: coach.name || gymCfg.gymName || 'COACH', merchantCity: coach.cidade || 'BRASIL', amount: previewAmt, description: name.slice(0, 72), txid: name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || 'CONE' }) : null;
          return React.createElement('div', { key: locId, style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: '1px solid #1a1610', fontSize: '12px', flexWrap: 'wrap' } },
            React.createElement('span', { style: { flex: 1, color: '#c8b090', fontWeight: 600 } }, name),
            React.createElement('span', { style: { color: '#887060' } }, levs.length + (levs.length !== 1 ? ' sessões' : ' sessão')),
            React.createElement('span', { style: { color: '#887060' } }, fmtDur(totalMin)),
            t && showRate ? React.createElement('span', { style: { color: '#d8a840', fontWeight: 700 } }, t.currency + ' ' + t.total.toLocaleString('pt-BR')) : null,
            previewPayload && React.createElement('button', { type: 'button', title: 'Copiar código Pix', onClick: () => navigator.clipboard?.writeText(previewPayload).then(() => alert('Código Pix copiado!')).catch(() => prompt('Copie o código Pix:', previewPayload)), style: { background: 'rgba(74,200,192,.1)', border: '1px solid rgba(74,200,192,.25)', color: 'var(--theme-accent)', padding: '1px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' } },
              React.createElement('i', { className: 'ti ti-copy', style: { fontSize: '10px' } }), ' Pix')
          );
        }),
        showRate && React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '6px', fontSize: '13px', fontWeight: 700, color: '#68d8a0' } },
          'Total: ' + Object.entries(groups).reduce((acc, [locId, levs]) => {
            const loc = locations.find(l => l.id === locId);
            const gid = locId.startsWith('__ath__') ? locId.slice(7) : null;
            const gath = gid ? loadAthletes().find(a => a.id === gid) : null;
            const locForCalc = gath ? locations.find(l => l.type === 'personal' && (l.athleteIds || []).includes(gath.id)) : loc;
            const t = calcTotal(levs, locForCalc);
            if (t) acc += t.total;
            return acc;
          }, 0).toLocaleString('pt-BR')
        )
      ),
      evs.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '16px', fontSize: '12px', color: '#554a3a', marginBottom: '16px' } }, 'Nenhum evento encontrado para os filtros selecionados.'),
      React.createElement('button', { onClick: generatePDF, disabled: evs.length === 0 || generating, style: { width: '100%', background: evs.length === 0 || generating ? '#1a1a1a' : 'var(--theme-accent)', color: evs.length === 0 || generating ? '#333' : 'var(--theme-accent-text)', border: 'none', padding: '10px', borderRadius: '6px', cursor: evs.length === 0 || generating ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' } },
        React.createElement('i', { className: generating ? 'ti ti-loader' : 'ti ti-file-download' }),
        generating ? 'Gerando PDF...' : 'Gerar PDF'
      )
    )
  );
}

// ── AgendaView ────────────────────────────────────────────────────────────────
function AgendaView({ sessions, events, setEvents, athletes, onEditSession, onLogResult }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [filter, setFilter] = useState('all');
  const [selDay, setSelDay] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [showForm, setShowForm] = useState(null);
  const [formData, setFormData] = useState({});

  const todayISO = toISO(new Date());
  const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const DAYS_PT_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const BLOCK_C = { 'Força': '#d8a840', 'LPO': '#4ac8c0', 'For Time': '#e87820', 'Core': '#68d8a0', 'Acessórios': '#c884f0', 'AMRAP': '#e87820', 'Cardio': '#64b5f6', 'EMOM': '#ff8a65', 'WOD': '#e87820', 'HIIT': '#ff6d00' };

  function evStatus(ev) { return ev.status === 'completed' ? 'completed' : 'scheduled'; }
  function dayEvents(iso) {
    const evs = (events[iso] || []).filter(ev => { if (filter === 'all') return true; return filter === evStatus(ev); });
    return evs.sort((a, b) => a.time.localeCompare(b.time));
  }
  function dayGymSessions(iso) { return (sessions[iso] || []).filter(s => getTargets(s).length === 0); }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) { const d = i - firstDay + 1; cells.push(d >= 1 && d <= daysInMonth ? d : null); }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

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
              s.mainTraining || 'Sessão'
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
          React.createElement('span', { style: { fontSize: '12px', fontWeight: 700, color: 'var(--theme-accent)', textTransform: 'capitalize' } }, dateLabel),
          React.createElement('button', { onClick: () => setSelDay(null), style: { background: 'transparent', border: '1px solid #2a2318', color: '#554a3a', padding: '2px 7px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' } }, '✕')
        ),
        React.createElement('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } },
          React.createElement('button', { onClick: () => openForm('aula', iso), style: { background: 'rgba(74,200,192,.08)', border: '1px solid rgba(74,200,192,.25)', color: 'var(--theme-accent)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 700 } }, React.createElement('i', { className: 'ti ti-plus', 'aria-hidden': 'true' }), ' Aula'),
          React.createElement('button', { onClick: () => openForm('personal', iso), style: { background: 'rgba(216,168,64,.08)', border: '1px solid rgba(216,168,64,.25)', color: '#d8a840', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 700 } }, React.createElement('i', { className: 'ti ti-plus', 'aria-hidden': 'true' }), ' Personal'),
          onEditSession && React.createElement('button', { onClick: () => onEditSession({ _newForDate: iso }), style: { background: 'rgba(104,216,160,.08)', border: '1px solid rgba(104,216,160,.25)', color: '#68d8a0', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 700 } }, React.createElement('i', { className: 'ti ti-calendar-plus', 'aria-hidden': 'true' }), ' Sessão do dia')
        )
      ),
      React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '10px 14px' } },
        gymSessions.length > 0 && React.createElement('div', { style: { marginBottom: '12px' } },
          React.createElement('div', { style: { fontSize: '10px', color: '#554a3a', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '6px' } }, 'Sessão do dia'),
          gymSessions.map((s, si) => React.createElement('div', { key: si, style: { background: '#0d0b08', border: '1px solid #2a2318', borderTop: '2px solid var(--theme-accent)', borderRadius: '6px', padding: '8px 10px', marginBottom: '6px' } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' } },
              React.createElement('span', { style: { fontSize: '12px', fontWeight: 700, color: '#c8b090' } }, s.mainTraining || 'Sessão'),
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
            return React.createElement('div', { key: ev.id, style: { display: 'flex', gap: '8px', marginBottom: '10px' } },
              React.createElement('div', { style: { minWidth: '36px', flexShrink: 0, paddingTop: '8px' } },
                React.createElement('div', { style: { fontSize: '10px', fontWeight: 700, color: '#887060' } }, ev.time),
                React.createElement('div', { style: { width: '1px', background: '#2a2318', margin: '3px auto 0', height: 'calc(100% - 16px)', minHeight: '20px' } })
              ),
              React.createElement('div', { style: { flex: 1, background: '#0d0b08', border: '1px solid #2a2318', borderTop: `2px solid ${borderCol}`, borderRadius: '6px', padding: '8px 10px', opacity: done ? .8 : 1 } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '5px' } },
                  React.createElement('div', null,
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '5px' } },
                      done && React.createElement('i', { className: 'ti ti-circle-check', style: { fontSize: '11px', color: '#68d8a0' }, 'aria-hidden': 'true' }),
                      React.createElement('span', { style: { fontSize: '12px', fontWeight: 700, color: isPers ? '#d8a840' : '#c8b090' } }, ev.label),
                      React.createElement('span', { style: { fontSize: '9px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase', background: isPers ? 'rgba(216,168,64,.12)' : 'rgba(74,200,192,.1)', color: isPers ? '#d8a840' : 'var(--theme-accent)' } }, isPers ? 'Personal' : 'Aula'),
                      (() => {
                        const loc = ev.locationId ? loadLocations().find(l => l.id === ev.locationId) : null;
                        return loc ? React.createElement('span', { style: { fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: (loc.color || '#555') + '22', color: loc.color || '#aaa', border: `1px solid ${(loc.color || '#555')}44`, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, loc.name) : null;
                      })()
                    ),
                    React.createElement('div', { style: { fontSize: '10px', color: '#554a3a', marginTop: '1px' } }, `${ev.time} · ${ev.durationMin}min`)
                  ),
                  React.createElement('div', { style: { display: 'flex', gap: '3px', flexShrink: 0 } },
                    React.createElement('button', { onClick: () => toggleStatus(iso, ev.id), title: done ? 'Marcar como agendado' : 'Marcar como concluído', style: { background: 'transparent', border: `1px solid ${done ? 'rgba(104,216,160,.3)' : '#2a2318'}`, color: done ? '#68d8a0' : '#554a3a', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', fontSize: '9px', fontWeight: 700 } }, done ? '✓ Feito' : '○ Ag.'),
                    React.createElement('button', { onClick: () => openForm(ev.type, iso, ev), style: { background: 'transparent', border: '1px solid #2a2318', color: '#554a3a', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', fontSize: '9px' } }, React.createElement('i', { className: 'ti ti-edit', style: { fontSize: '10px' }, 'aria-hidden': 'true' })),
                    React.createElement('button', { onClick: () => { if (window.confirm('Remover este evento?')) deleteEvent(iso, ev.id); }, style: { background: 'transparent', border: '1px solid #2a2318', color: '#5a2020', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', fontSize: '9px' } }, React.createElement('i', { className: 'ti ti-trash', style: { fontSize: '10px' }, 'aria-hidden': 'true' })),
                    onEditSession && React.createElement('button', { onClick: () => onEditSession(linkedSession || { _newForDate: iso }), title: linkedSession ? 'Editar sessão vinculada' : 'Criar sessão para este dia', style: { background: 'transparent', border: '1px solid #2a2318', color: linkedSession ? '#554a3a' : '#68d8a0', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', fontSize: '9px', fontWeight: 700 } }, React.createElement('i', { className: linkedSession ? 'ti ti-edit' : 'ti ti-calendar-plus', style: { fontSize: '10px' }, 'aria-hidden': 'true' })),
                    onLogResult && isPers && React.createElement('button', { onClick: () => onLogResult({ athleteId: ev.athleteIds[0] || null, date: iso }), title: 'Lançar resultado', style: { background: 'rgba(74,200,192,.1)', border: '1px solid rgba(74,200,192,.3)', color: 'var(--theme-accent)', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer', fontSize: '9px', fontWeight: 700 } }, React.createElement('i', { className: 'ti ti-clipboard-list', style: { fontSize: '10px' }, 'aria-hidden': 'true' }))
                  )
                ),
                athList.length > 0 && React.createElement('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '5px' } },
                  athList.map((a, ai) => React.createElement('span', { key: ai, style: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#a89880' } },
                    React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: a.color, display: 'inline-block' } }),
                    a.name
                  ))
                ),
                (ev.local && ev.local !== '__outro__' ? ev.local : ev.localText || '') && React.createElement('div', { style: { fontSize: '10px', color: '#554a3a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '3px' } },
                  React.createElement('i', { className: 'ti ti-map-pin', style: { fontSize: '9px' } }),
                  ev.local === '__outro__' ? (ev.localText || '') : (ev.local || '')
                ),
                linkedSession && React.createElement('div', { style: { display: 'flex', gap: '2px', flexWrap: 'wrap', marginBottom: '5px' } },
                  (linkedSession.blocks || []).map((bl, bi) => {
                    const lbl = bl.label && bl.label !== '-' ? bl.label : bl.type;
                    return React.createElement('span', { key: bi, style: { fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '2px', background: (BLOCK_C[lbl] || '#555') + '22', color: BLOCK_C[lbl] || '#aaa', border: `1px solid ${(BLOCK_C[lbl] || '#555')}44` } }, lbl);
                  })
                ),
                ev.notes && React.createElement('div', { style: { fontSize: '10px', color: '#554a3a', marginTop: '5px', fontStyle: 'italic' } }, ev.notes)
              )
            );
          }),
          React.createElement('div', { style: { borderTop: '1px solid #1e1e1e', marginTop: '10px', paddingTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            React.createElement('button', { type: 'button', onClick: () => openForm('aula', iso), style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'rgba(74,200,192,.06)', border: '1px solid rgba(74,200,192,.2)', color: 'var(--theme-accent)', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } }, React.createElement('i', { className: 'ti ti-plus' }), ' Aula'),
            React.createElement('button', { type: 'button', onClick: () => openForm('personal', iso), style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'rgba(216,168,64,.06)', border: '1px solid rgba(216,168,64,.2)', color: '#d8a840', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } }, React.createElement('i', { className: 'ti ti-plus' }), ' Personal'),
            React.createElement('button', { type: 'button', title: 'Copiar último evento', onClick: () => {
              const allEvs = Object.entries(events).sort((a, b) => b[0].localeCompare(a[0]));
              let last = null;
              for (const [, evs2] of allEvs) { const sorted = [...evs2].sort((a, b) => b.time.localeCompare(a.time)); if (sorted.length) { last = sorted[0]; break; } }
              if (!last) return;
              openForm(last.type, iso, { ...last, id: undefined, date: iso, status: 'scheduled', time: last.time, durationMin: last.durationMin, label: last.label, locationId: last.locationId, athleteIds: last.athleteIds || [], notes: last.notes || '', local: last.local || '', localText: last.localText || '' });
            }, style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'rgba(255,255,255,.03)', border: '1px solid #2a2318', color: '#887060', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } }, React.createElement('i', { className: 'ti ti-copy' }), ' Copiar último')
          )
        )
      )
    );
  }

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    React.createElement('div', { className: 'agenda-header', style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderBottom: '1px solid #2a2318', flexWrap: 'wrap', flexShrink: 0 } },
      React.createElement('button', { onClick: () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelDay(null); }, style: { background: 'transparent', border: '1px solid #2a2318', color: '#887060', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' } }, '‹'),
      React.createElement('button', { onClick: () => setShowReport(true), style: { background: 'rgba(216,168,64,.1)', border: '1px solid rgba(216,168,64,.3)', color: '#d8a840', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' } }, React.createElement('i', { className: 'ti ti-file-analytics' }), ' Relatório'),
      React.createElement('span', { style: { fontSize: '14px', fontWeight: 700, color: '#c8b090', flex: '1 1 100px', minWidth: '80px', textTransform: 'uppercase', letterSpacing: '.03em' } }, `${MONTHS_PT[month]} ${year}`),
      React.createElement('button', { onClick: () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelDay(null); }, style: { background: 'transparent', border: '1px solid #2a2318', color: '#887060', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' } }, '›'),
      React.createElement('div', { className: 'agenda-stats', style: { display: 'flex', gap: '8px', fontSize: '11px', flexWrap: 'wrap' } },
        React.createElement('span', { style: { color: 'var(--theme-accent)' } }, [completedAulas, '/', totalAulas, ' aulas'].join('')),
        React.createElement('span', { style: { color: '#d8a840' } }, [completedPersonal, '/', totalPersonal, ' personal'].join('')),
        React.createElement('span', { style: { color: '#68d8a0' } }, [totalCompleted, '/', totalEvs, ' concluídas'].join(''))
      ),
      React.createElement('div', { style: { display: 'flex', gap: '4px' } },
        ['all', 'scheduled', 'completed'].map(f => React.createElement('button', { key: f, onClick: () => setFilter(f), className: 'agenda-filter-btn', style: { background: filter === f ? 'var(--theme-accent)' : 'transparent', color: filter === f ? 'var(--theme-accent-text)' : '#887060', border: `1px solid ${filter === f ? 'var(--theme-accent)' : '#2a2318'}`, padding: '3px 7px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' } }, f === 'all' ? 'Todos' : f === 'scheduled' ? 'Agendado' : 'Completo'))
      )
    ),
    React.createElement('div', { style: { display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' } },
      React.createElement('div', { style: { flex: selDay ? '0 0 60%' : '1', minWidth: 0, overflowY: 'auto', borderRight: selDay ? '1px solid #2a2318' : 'none' } },
        React.createElement('div', { className: 'agenda-day-hdrs', style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #2a2318', position: 'sticky', top: 0, background: '#0d0b08', zIndex: 2 } },
          DAYS_PT_SHORT.map(d => React.createElement('div', { key: d, className: 'agenda-day-hdr' }, d))
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
    ),
    showReport && React.createElement(ReportModal, { events, sessions, onClose: () => setShowReport(false) }),
    showForm && React.createElement(EventFormInner, { showForm, sessions, athletes, initialData: formData, onSave: ev => { saveEvent(ev); setShowForm(null); }, onCancel: () => setShowForm(null) })
  );
}

// ── SchedulePublisher (default export) ───────────────────────────────────────
function SchedulePublisher({ sessions, events, setEvents, athletes, onEditSession, onLogResult }) {
  const exportDailyRef = useRef();
  const exportWeeklyRef = useRef();
  const exportCalendarRef = useRef();
  const exportWeeklyCalRef = useRef();
  const exportMobileARef = useRef();
  const exportMobileBRef = useRef();
  const exportMobileWeeklyARef = useRef();
  const exportMobileWeeklyBRef = useRef();
  const previewWrapRef = useRef();
  const weeklyRef = useRef();
  const logoInputRef = useRef();
  const [exportTarget, setExportTarget] = useState('daily');
  const [previewTarget, setPreviewTarget] = useState('semanal');
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [gymName, setGymName] = useState(loadSettings().gymName || '');
  const [label, setLabel] = useState(loadSettings().label || '');
  const [filterAthlete, setFilterAthlete] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [logoScale, setLogoScale] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const _savedSettings = loadSettings();
  const [exportScale, setExportScale] = useState(_savedSettings.exportScale || 2);
  const [fontScale, setFontScale] = useState(_savedSettings.fontScale ?? 1.5);
  const [zoneScales, setZoneScales] = useState(_savedSettings.zoneScales || [1, 1, 1]);
  const [blockTitleScales, setBlockTitleScales] = useState(_savedSettings.blockTitleScales || [1, 1, 1]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const migEa = (v, old, nw) => (!v || v === old) ? nw : v;
  const [eaglesBg, setEaglesBg] = useState(migEa(APP_CONFIG.mobileEaglesBg, '#000000', '#0d0b09'));
  const [megaManBg, setMegaManBg] = useState(APP_CONFIG.mobileMegaManBg || '#0a1a5c');
  const [noteColor, setNoteColor] = useState(APP_CONFIG.mobileExerciseNoteColor || '#4a9aaa');
  const _sc = { ...(_savedSettings.colors || {}), ..._savedSettings };
  const [settingsView, setSettingsView] = useState('daily');
  const [dvBg, setDvBg] = useState(_sc.dvBg || '#000000');
  const [dvGymName, setDvGymName] = useState(_sc.dvGymName || '#ffffff');
  const [dvDate, setDvDate] = useState(_sc.dvDate || '#e87820');
  const [dvMainTraining, setDvMainTraining] = useState(_sc.dvMainTraining || '#888888');
  const [dvZoneType, setDvZoneType] = useState(_sc.dvZoneType || '#e87820');
  const [dvBlockLabel, setDvBlockLabel] = useState(_sc.dvBlockLabel || '#e87820');
  const [dvCap, setDvCap] = useState(_sc.dvCap || '#e87820');
  const [dvRounds, setDvRounds] = useState(_sc.dvRounds || '#f5c842');
  const [dvExName, setDvExName] = useState(_sc.dvExName || '#ffffff');
  const [dvIntensity, setDvIntensity] = useState(_sc.dvIntensity || '#f5c842');
  const [dvNote, setDvNote] = useState(_sc.dvNote || '#888888');
  const [dvBlockNotes, setDvBlockNotes] = useState(_sc.dvBlockNotes || '#888888');
  const [dvDivider, setDvDivider] = useState(_sc.dvDivider || '#1a1a1a');
  const [wkBg, setWkBg] = useState(_sc.wkBg || '#000000');
  const [wkHeader, setWkHeader] = useState(_sc.wkHeader || '#e87820');
  const [wkDateNum, setWkDateNum] = useState(_sc.wkDateNum || '#666666');
  const [wkMainTraining, setWkMainTraining] = useState(_sc.wkMainTraining || '#ffffff');
  const [wkBlockType, setWkBlockType] = useState(_sc.wkBlockType || '#e87820');
  const [wkExName, setWkExName] = useState(_sc.wkExName || '#666666');
  const [wkDivider, setWkDivider] = useState(_sc.wkDivider || '#1a1a1a');
  const [eaGymName, setEaGymName] = useState(_sc.eaGymName || '#ffffff');
  const [eaDate, setEaDate] = useState(migEa(_sc.eaDate, '#e87820', '#4ac8c0'));
  const [eaSubtitle, setEaSubtitle] = useState(migEa(_sc.eaSubtitle, '#666666', '#3a8a80'));
  const [eaBlockType, setEaBlockType] = useState(migEa(_sc.eaBlockType, '#00b8d4', '#4ac8c0'));
  const [eaBlockMeta, setEaBlockMeta] = useState(migEa(_sc.eaBlockMeta, '#00b8d4', '#4ac8c0'));
  const [eaExName, setEaExName] = useState(_sc.eaExName || '#ffffff');
  const [eaIntensity, setEaIntensity] = useState(_sc.eaIntensity || '#ffd700');
  const [eaBlockHdr, setEaBlockHdr] = useState(migEa(_sc.eaBlockHdr, 'rgba(0,184,212,0.12)', 'rgba(74,200,192,0.12)'));
  const [eaDivider, setEaDivider] = useState(_sc.eaDivider || 'rgba(0,184,212,0.1)');
  const [mmGymName, setMmGymName] = useState(_sc.mmGymName || '#ffffff');
  const [mmDate, setMmDate] = useState(_sc.mmDate || '#00b8d4');
  const [mmSubtitle, setMmSubtitle] = useState(_sc.mmSubtitle || '#3a6a80');
  const [mmBlockType, setMmBlockType] = useState(_sc.mmBlockType || '#00b8d4');
  const [mmBlockMetaBg, setMmBlockMetaBg] = useState(_sc.mmBlockMetaBg || '#00b8d4');
  const [mmBlockMetaText, setMmBlockMetaText] = useState(_sc.mmBlockMetaText || '#000000');
  const [mmExName, setMmExName] = useState(_sc.mmExName || '#ffffff');
  const [mmIntensity, setMmIntensity] = useState(_sc.mmIntensity || '#ffd700');
  const [mmBlockHdr, setMmBlockHdr] = useState(_sc.mmBlockHdr || 'rgba(0,184,212,0.12)');
  const [mmDivider, setMmDivider] = useState(_sc.mmDivider || 'rgba(0,184,212,0.1)');
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => { APP_CONFIG.exportScale = exportScale; }, [exportScale]);
  useEffect(() => { APP_CONFIG.mobileEaglesBg = eaglesBg; }, [eaglesBg]);
  useEffect(() => { APP_CONFIG.mobileMegaManBg = megaManBg; }, [megaManBg]);
  useEffect(() => { APP_CONFIG.mobileExerciseNoteColor = noteColor; }, [noteColor]);
  useEffect(() => {
    saveSettings({
      fontScale, zoneScales, blockTitleScales, gymName, label, exportScale,
      dvBg, dvGymName, dvDate, dvMainTraining, dvZoneType, dvBlockLabel, dvCap, dvRounds,
      dvExName, dvIntensity, dvNote, dvBlockNotes, dvDivider,
      wkBg, wkHeader, wkDateNum, wkMainTraining, wkBlockType, wkExName, wkDivider,
      eaGymName, eaDate, eaSubtitle, eaBlockType, eaBlockMeta, eaExName,
      eaIntensity, eaBlockHdr, eaDivider, eaglesBg, megaManBg, noteColor,
      mmGymName, mmDate, mmSubtitle, mmBlockType, mmBlockMetaBg, mmBlockMetaText,
      mmExName, mmIntensity, mmBlockHdr, mmDivider
    });
  }, [fontScale, zoneScales, blockTitleScales, gymName, label, exportScale,
    dvBg, dvGymName, dvDate, dvMainTraining, dvZoneType, dvBlockLabel, dvCap, dvRounds,
    dvExName, dvIntensity, dvNote, dvBlockNotes, dvDivider,
    wkBg, wkHeader, wkDateNum, wkMainTraining, wkBlockType, wkExName, wkDivider,
    eaGymName, eaDate, eaSubtitle, eaBlockType, eaBlockMeta, eaExName,
    eaIntensity, eaBlockHdr, eaDivider, eaglesBg, megaManBg, noteColor,
    mmGymName, mmDate, mmSubtitle, mmBlockType, mmBlockMetaBg, mmBlockMetaText,
    mmExName, mmIntensity, mmBlockHdr, mmDivider]);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const hasAny = Object.values(sessions).some(arr => arr.length > 0);

  const handleLogoUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogoDataUrl(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (!previewOpen || !previewWrapRef.current) return;
    const w = previewWrapRef.current.offsetWidth || 800;
    setPreviewScale(w / 1920);
  }, [previewOpen]);

  const doExport = async (target) => {
    const tgt = target || exportTarget;
    const el = tgt === 'calendar' ? exportCalendarRef.current : tgt === 'semanal' ? exportWeeklyCalRef.current : exportDailyRef.current;
    if (!el) { alert('Nada para exportar ainda.'); return; }
    setExporting(true);
    await new Promise(r => setTimeout(r, 250));
    try {
      const W = 1920, H = 1080;
      const c = await html2canvas(el, { scale: 1, backgroundColor: '#000', useCORS: true, logging: false, width: W, height: H, windowWidth: W });
      const out = document.createElement('canvas');
      out.width = W; out.height = H;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(c, 0, 0, W, H);
      const a = document.createElement('a');
      const DAY_EN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const padD = n => String(n).padStart(2, '0');
      const fmtDate = d => `${padD(d.getDate())}${padD(d.getMonth() + 1)}${d.getFullYear()}`;
      const gymSlug = (gymName || APP_CONFIG.gymName || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'grade';
      let filename;
      if (tgt === 'daily') {
        const dateStr = selectedDate || toISO(currentWeekDates[1]);
        const d = new Date(dateStr + 'T12:00:00');
        filename = `${gymSlug}-treino-${DAY_EN[d.getDay()]}-${fmtDate(d)}`;
      } else if (tgt === 'semanal') {
        const wks = getWeeksOfMonth(year, month);
        const wk = wks[selectedWeekIdx] || currentWeekDates;
        const mon = wk[1]; const fri = wk[5];
        filename = `${gymSlug}-semanal-${padD(mon.getDate())}${padD(mon.getMonth() + 1)}to${padD(fri.getDate())}${padD(fri.getMonth() + 1)}`;
      } else {
        const mnames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        filename = `${gymSlug}-calendario-${mnames[month]}-${year}`;
      }
      a.download = `${filename}.png`;
      a.href = out.toDataURL('image/png');
      a.click();
    } catch (e) { console.error(e); alert('Falha na exportação — tente novamente.'); }
    setExporting(false);
  };

  const doMobileExport = async (variant) => {
    const el = variant === 'A' ? exportMobileARef.current : exportMobileBRef.current;
    if (!el) { alert('Nada para exportar ainda.'); return; }
    setExporting(true);
    await new Promise(r => setTimeout(r, 250));
    try {
      const W = 1080;
      const H = el.scrollHeight || 1920;
      const c = await html2canvas(el, { scale: 2, backgroundColor: '#000', useCORS: true, logging: false, width: W, height: H, windowWidth: W });
      const out = document.createElement('canvas');
      out.width = W * 2; out.height = H * 2;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(c, 0, 0);
      const DAY_EN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const padD = n => String(n).padStart(2, '0');
      const dateStr = selectedDate || toISO(currentWeekDates[1]);
      const d = new Date(dateStr + 'T12:00:00');
      const gymSlug = (gymName || APP_CONFIG.gymName || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'grade';
      const fname = `${gymSlug}-mobile-${variant === 'A' ? '01' : '02'}-${DAY_EN[d.getDay()]}-${padD(d.getDate())}${padD(d.getMonth() + 1)}${d.getFullYear()}`;
      const a = document.createElement('a');
      a.download = `${fname}.png`;
      a.href = out.toDataURL('image/png');
      a.click();
    } catch (e) { console.error(e); alert('Falha na exportação — tente novamente.'); }
    setExporting(false);
  };

  const doMobileWeeklyExport = async (variant) => {
    const el = variant === 'A' ? exportMobileWeeklyARef.current : exportMobileWeeklyBRef.current;
    if (!el) { alert('Nada para exportar ainda.'); return; }
    setExporting(true);
    await new Promise(r => setTimeout(r, 250));
    try {
      const W = 1080; const H = el.scrollHeight || 3000;
      const cv = await html2canvas(el, { scale: APP_CONFIG.exportScale || 2, backgroundColor: variant === 'A' ? (APP_CONFIG.mobileEaglesBg || '#0d0b09') : (APP_CONFIG.mobileMegaManBg || '#000'), useCORS: true, logging: false, width: W, height: H, windowWidth: W });
      const out = document.createElement('canvas');
      out.width = W * 2; out.height = H * 2;
      const ctx = out.getContext('2d');
      ctx.fillStyle = variant === 'A' ? (APP_CONFIG.mobileEaglesBg || '#0d0b09') : (APP_CONFIG.mobileMegaManBg || '#000');
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(cv, 0, 0);
      const wk = getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates;
      const mon = wk[1]; const fri = wk[5];
      const padD = n => String(n).padStart(2, '0');
      const labels = APP_CONFIG.mobileWeeklyLabels || ['Mobile Semanal 01', 'Mobile Semanal 02'];
      const lbl = (labels[variant === 'A' ? 0 : 1] || '').replace(/[^a-zA-Z0-9\u00C0-\u024F\-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40).toLowerCase();
      const gymSlugW = (gymName || APP_CONFIG.gymName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'grade';
      const fname = `${gymSlugW}-${lbl}-${padD(mon.getDate())}${padD(mon.getMonth() + 1)}to${padD(fri.getDate())}${padD(fri.getMonth() + 1)}`;
      const a = document.createElement('a'); a.download = `${fname}.png`; a.href = out.toDataURL('image/png'); a.click();
    } catch (e) { console.error(e); alert('Falha na exportação — tente novamente.'); }
    setExporting(false);
  };

  const handleDayClick = (week, date) => {
    setSelectedWeek(week);
    setSelectedDate(toISO(date));
  };

  const defaultWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); const dow = d.getDay();
    d.setDate(d.getDate() - dow + i);
    return d;
  });

  const filteredSessions = filterAthlete
    ? Object.fromEntries(Object.entries(sessions).map(([k, v]) => [k, v.filter(s => matchesAthlete(s, filterAthlete.name))]))
    : sessions;
  const allSessionDates = Object.keys(filteredSessions).filter(k => filteredSessions[k]?.length > 0).sort();
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  if (!hasAny) return React.createElement('div', { className: 'empty2' },
    React.createElement('i', { className: 'ti ti-calendar', style: { fontSize: '32px', display: 'block', marginBottom: '10px', color: '#444' }, 'aria-hidden': 'true' }),
    'Nenhuma sessão ainda.', React.createElement('br'),
    React.createElement('span', { style: { color: '#444', fontSize: '12px' } }, 'Adicione no Criador de Treinos.')
  );

  const currentWeekDates = selectedWeek || defaultWeek;

  const dvColorsObj = { bg: dvBg, gymName: dvGymName, date: dvDate, mainTraining: dvMainTraining, zoneType: dvZoneType, blockLabel: dvBlockLabel, cap: dvCap, rounds: dvRounds, exName: dvExName, intensity: dvIntensity, note: dvNote, blockNotes: dvBlockNotes, divider: dvDivider };
  const _presenterDateKey = selectedDate || toISO(currentWeekDates[1]);
  const _presenterSess = (filteredSessions[_presenterDateKey] || [])[0];
  const _presenterLogUrl = _presenterSess ? `https://dseller0.github.io/CrossFit-Apps/log.html?date=${_presenterDateKey}&session=${_presenterSess.id}` : '';
  return React.createElement(React.Fragment, null,
    presenterOpen && React.createElement(PresenterView, {
      logUrl: _presenterLogUrl,
      onClose: () => setPresenterOpen(false),
    },
      React.createElement(DailyExportView, {
        sessions: filteredSessions, label, gymName, fontScale, zoneScales, blockTitleScales,
        selectedDate: _presenterDateKey, logoDataUrl, logoScale,
        weekDates: currentWeekDates, dvColors: dvColorsObj,
      })
    ),
    React.createElement('div', null,
    React.createElement('div', { className: 'agenda-wrap', style: { display: 'flex', flexDirection: 'column', marginBottom: '12px', border: '1px solid #1e1e1e', borderRadius: '8px', overflow: 'hidden' } },
      React.createElement(AgendaView, {
        sessions,
        events: events || {},
        setEvents: setEvents || (() => {}),
        athletes: athletes || [],
        onEditSession: onEditSession || (() => {}),
        onLogResult: onLogResult || (() => {})
      })
    ),
    React.createElement('div', { className: 'pub-controls' },
      React.createElement('input', { type: 'file', ref: logoInputRef, accept: 'image/*', style: { display: 'none' }, onChange: handleLogoUpload }),
      React.createElement('div', { className: 'fg', style: { minWidth: '80px', alignItems: 'center' } },
        React.createElement('span', { className: 'lbl' }, 'Logo'),
        React.createElement('div', {
          onClick: () => logoInputRef.current?.click(),
          title: 'Clique para enviar o logo',
          style: { width: '64px', height: '64px', borderRadius: '6px', border: logoDataUrl ? '2px solid #e87820' : '1.5px dashed #444', background: '#111', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .15s', flexShrink: 0 }
        },
          logoDataUrl
            ? React.createElement('img', { src: logoDataUrl, style: { width: '100%', height: '100%', objectFit: 'contain' } })
            : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' } },
              React.createElement('i', { className: 'ti ti-upload', style: { fontSize: '18px', color: '#555' }, 'aria-hidden': 'true' }),
              React.createElement('span', { style: { fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '.05em' } })
            )
        ),
        logoDataUrl && React.createElement('button', { type: 'button', className: 'b bd bsm', style: { marginTop: '4px', padding: '2px 6px', fontSize: '10px', minHeight: '22px' }, onClick: () => setLogoDataUrl(null) }, React.createElement('i', { className: 'ti ti-x', 'aria-hidden': 'true' }), ' Remover')
      ),
      logoDataUrl && React.createElement('div', { className: 'fg', style: { minWidth: '160px' } },
        React.createElement('span', { className: 'lbl' }, `Escala do logo — ${logoScale.toFixed(2)}×`),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          React.createElement('button', { type: 'button', className: 'b bsm', style: { padding: '4px 8px', minHeight: '28px' }, onClick: () => setLogoScale(s => Math.max(0.25, Math.round((s - 0.01) * 1000) / 1000)) }, '−'),
          React.createElement('input', { type: 'range', min: '0.25', max: '4', step: '0.01', value: logoScale, onChange: e => setLogoScale(parseFloat(e.target.value)), style: { flex: 1, accentColor: '#e87820' } }),
          React.createElement('button', { type: 'button', className: 'b bsm', style: { padding: '4px 8px', minHeight: '28px' }, onClick: () => setLogoScale(s => Math.min(4, Math.round((s + 0.01) * 1000) / 1000)) }, '+')
        )
      ),
      React.createElement('div', { className: 'fg', style: { flex: '1', minWidth: '140px' } },
        React.createElement('span', { className: 'lbl' }, 'Nome da academia'),
        React.createElement('div', { style: { display: 'flex', gap: '6px' } },
          React.createElement('input', { placeholder: 'Cone', value: gymName, onChange: e => setGymName(e.target.value), style: { flex: 1 } }),
          React.createElement('select', {
            value: filterAthlete?.id || '',
            onChange: e => {
              const aths = loadAthletes();
              const a = aths.find(x => x.id === e.target.value) || null;
              setFilterAthlete(a);
              if (a) setGymName(a.name); else setGymName('');
            },
            style: { width: '36px', fontFamily: 'inherit', fontSize: '13px', background: '#111', border: '1px solid #2e2e2e', borderRadius: '5px', color: '#888', cursor: 'pointer', flexShrink: 0, padding: '0 4px' },
            title: 'Filtrar por atleta'
          },
            React.createElement('option', { value: '' }, '👤'),
            loadAthletes().map(a => React.createElement('option', { key: a.id, value: a.id }, a.name))
          )
        )
      ),
      React.createElement('div', { className: 'fg', style: { flex: '1', minWidth: '140px' } },
        React.createElement('span', { className: 'lbl' }, 'Rótulo do período'),
        React.createElement('input', { placeholder: 'ex: Semana 4', value: label, onChange: e => setLabel(e.target.value) })
      ),
      React.createElement('div', { className: 'fg', style: { minWidth: '180px' } },
        React.createElement('span', { className: 'lbl' }, `Escala da fonte — ${fontScale.toFixed(2)}×`),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          React.createElement('button', { type: 'button', className: 'b bsm', style: { padding: '4px 8px', minHeight: '28px' }, onClick: () => setFontScale(f => Math.max(0.5, Math.round((f - 0.01) * 1000) / 1000)) }, '−'),
          React.createElement('input', { type: 'range', min: '0.5', max: '3', step: '0.01', value: fontScale, onChange: e => setFontScale(parseFloat(e.target.value)), style: { flex: 1, accentColor: '#e87820' } }),
          React.createElement('button', { type: 'button', className: 'b bsm', style: { padding: '4px 8px', minHeight: '28px' }, onClick: () => setFontScale(f => Math.min(3, Math.round((f + 0.01) * 1000) / 1000)) }, '+')
        )
      ),
      React.createElement('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
        React.createElement('button', { type: 'button', className: 'b bsm', onClick: () => { const d = new Date(year, month - 1, 1); setMonth(d.getMonth()); setYear(d.getFullYear()); } },
          React.createElement('i', { className: 'ti ti-chevron-left', 'aria-hidden': 'true' })
        ),
        React.createElement('span', { style: { fontSize: '13px', color: '#ccc', padding: '0 6px', whiteSpace: 'nowrap', lineHeight: '1', display: 'flex', alignItems: 'center' } }, `${monthNames[month]} ${year}`),
        React.createElement('button', { type: 'button', className: 'b bsm', onClick: () => { const d = new Date(year, month + 1, 1); setMonth(d.getMonth()); setYear(d.getFullYear()); } },
          React.createElement('i', { className: 'ti ti-chevron-right', 'aria-hidden': 'true' })
        )
      ),
      React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
        React.createElement('button', { type: 'button', className: 'b', style: { borderColor: 'var(--theme-accent)', color: previewOpen ? 'var(--theme-accent-text)' : 'var(--theme-accent)', background: previewOpen ? 'var(--theme-accent)' : 'transparent' }, onClick: () => setPreviewOpen(p => !p) },
          React.createElement('i', { className: 'ti ti-eye', 'aria-hidden': 'true' }),
          previewOpen ? ' Fechar' : ' Pré-visualizar'
        ),
        React.createElement('button', { type: 'button', className: 'b', style: { borderColor: '#9b59b6', color: '#9b59b6', background: 'transparent' }, onClick: () => setPresenterOpen(true), title: 'Modo TV — tela cheia com QR code para atletas' },
          React.createElement('i', { className: 'ti ti-presentation', 'aria-hidden': 'true' }), ' Apresentar'
        ),
        React.createElement('button', { type: 'button', className: 'b bsm', title: 'Configurações', onClick: () => setSettingsOpen(true) },
          React.createElement('i', { className: 'ti ti-settings', 'aria-hidden': 'true' }), ' Cores'
        ),
        React.createElement('button', { type: 'button', className: 'b bsec', style: { fontSize: '12px' }, onClick: () => { setExportTarget('daily'); doExport('daily'); }, disabled: exporting },
          React.createElement('i', { className: 'ti ti-download', 'aria-hidden': 'true' }), ' Diário'
        ),
        React.createElement('button', { type: 'button', className: 'b bsec', style: { fontSize: '12px' }, onClick: () => { setExportTarget('semanal'); doExport('semanal'); }, disabled: exporting },
          React.createElement('i', { className: 'ti ti-table-column', 'aria-hidden': 'true' }), ' Semanal'
        ),
        React.createElement('button', { type: 'button', className: 'b bsec', style: { fontSize: '12px' }, onClick: () => { setExportTarget('calendar'); doExport('calendar'); }, disabled: exporting },
          React.createElement('i', { className: 'ti ti-calendar-down', 'aria-hidden': 'true' }), ' Calendário'
        ),
        React.createElement('button', { type: 'button', className: 'b bsm', style: { fontSize: '12px', background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', borderColor: 'var(--theme-accent)', fontWeight: 700 }, onClick: () => doMobileExport('A'), disabled: exporting },
          React.createElement('i', { className: 'ti ti-device-mobile', 'aria-hidden': 'true' }), ' Mobile 01'
        ),
        React.createElement('button', { type: 'button', className: 'b bsm', style: { fontSize: '12px', background: '#00b8d4', color: '#000', borderColor: '#00b8d4', fontWeight: 700 }, onClick: () => doMobileExport('B'), disabled: exporting },
          React.createElement('i', { className: 'ti ti-device-mobile', 'aria-hidden': 'true' }), ' Mobile 02'
        ),
        React.createElement('button', { type: 'button', className: 'b bsm', style: { fontSize: '11px', background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', borderColor: 'var(--theme-accent)', fontWeight: 700 }, onClick: () => doMobileWeeklyExport('A'), disabled: exporting },
          React.createElement('i', { className: 'ti ti-layout-list', 'aria-hidden': 'true' }), ' ', (APP_CONFIG.mobileWeeklyLabels?.[0] || 'Mobile Semanal 01').slice(0, 15)
        ),
        React.createElement('button', { type: 'button', className: 'b bsm', style: { fontSize: '11px', background: '#00b8d4', color: '#000', borderColor: '#00b8d4', fontWeight: 700 }, onClick: () => doMobileWeeklyExport('B'), disabled: exporting },
          React.createElement('i', { className: 'ti ti-layout-list', 'aria-hidden': 'true' }), ' ', (APP_CONFIG.mobileWeeklyLabels?.[1] || 'Mobile Semanal 02').slice(0, 15)
        ),
        exporting && React.createElement('span', { style: { fontSize: '11px', color: '#e87820' } }, 'Exportando...')
      )
    ),
    previewOpen && React.createElement('div', null,
      React.createElement('div', { style: { display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' } },
        React.createElement('button', { type: 'button', className: `pvt ${previewTarget === 'daily' ? 'on' : ''}`, onClick: () => setPreviewTarget('daily') }, 'Diário'),
        React.createElement('button', { type: 'button', className: `pvt ${previewTarget === 'semanal' ? 'on' : ''}`, onClick: () => setPreviewTarget('semanal') }, 'Semanal'),
        React.createElement('button', { type: 'button', className: `pvt ${previewTarget === 'calendar' ? 'on' : ''}`, onClick: () => setPreviewTarget('calendar') }, 'Exportar Mensal'),
        React.createElement('button', { type: 'button', className: `pvt ${previewTarget === 'mobileA' ? 'on' : ''}`, style: previewTarget === 'mobileA' ? { background: 'var(--theme-accent)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent-text)' } : { color: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }, onClick: () => setPreviewTarget('mobileA') }, 'Mobile 01'),
        React.createElement('button', { type: 'button', className: `pvt ${previewTarget === 'mobileB' ? 'on' : ''}`, style: previewTarget === 'mobileB' ? { background: '#00b8d4', borderColor: '#00b8d4', color: '#000' } : { color: '#00b8d4', borderColor: '#00b8d4' }, onClick: () => setPreviewTarget('mobileB') }, 'Mobile 02'),
        React.createElement('button', { type: 'button', className: `pvt ${previewTarget === 'mobileWeeklyA' ? 'on' : ''}`, style: previewTarget === 'mobileWeeklyA' ? { background: 'var(--theme-accent)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent-text)' } : { color: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }, onClick: () => setPreviewTarget('mobileWeeklyA') }, (APP_CONFIG.mobileWeeklyLabels?.[0] || 'Mobile Semanal 01').slice(0, 15)),
        React.createElement('button', { type: 'button', className: `pvt ${previewTarget === 'mobileWeeklyB' ? 'on' : ''}`, style: previewTarget === 'mobileWeeklyB' ? { background: '#00b8d4', borderColor: '#00b8d4', color: '#000' } : { color: '#00b8d4', borderColor: '#00b8d4' }, onClick: () => setPreviewTarget('mobileWeeklyB') }, (APP_CONFIG.mobileWeeklyLabels?.[1] || 'Mobile Semanal 02').slice(0, 15)),
        React.createElement('button', { type: 'button', className: 'b bsec bsm', style: { marginLeft: 'auto', fontSize: '12px' }, onClick: () => previewTarget === 'mobileA' ? doMobileExport('A') : previewTarget === 'mobileB' ? doMobileExport('B') : previewTarget === 'mobileWeeklyA' ? doMobileWeeklyExport('A') : previewTarget === 'mobileWeeklyB' ? doMobileWeeklyExport('B') : doExport(previewTarget), disabled: exporting },
          React.createElement('i', { className: 'ti ti-download', 'aria-hidden': 'true' }),
          ` Baixar ${previewTarget === 'daily' ? 'Diário' : previewTarget === 'semanal' ? 'Semanal' : previewTarget === 'calendar' ? 'Calendário' : previewTarget === 'mobileA' ? 'Mobile 01' : previewTarget === 'mobileB' ? 'Mobile 02' : previewTarget === 'mobileWeeklyA' ? (APP_CONFIG.mobileWeeklyLabels?.[0] || 'Semanal 01').slice(0, 15) : (APP_CONFIG.mobileWeeklyLabels?.[1] || 'Semanal 02').slice(0, 15)}`
        )
      ),
      (previewTarget === 'semanal' || previewTarget === 'mobileWeeklyA' || previewTarget === 'mobileWeeklyB') && React.createElement('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: '11px', color: '#555', marginRight: '4px', textTransform: 'uppercase', letterSpacing: '.06em' } }, 'Semana:'),
        getWeeksOfMonth(year, month).map((week, wi) => {
          const mon = week[1]; const fri = week[5];
          const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const active = selectedWeekIdx === wi;
          return React.createElement('button', { key: wi, type: 'button', className: 'b bsm', style: { background: active ? 'var(--theme-accent)' : 'transparent', color: active ? 'var(--theme-accent-text)' : 'var(--theme-accent)', borderColor: 'var(--theme-accent)', fontSize: '11px', padding: '5px 10px' }, onClick: () => setSelectedWeekIdx(wi) }, `${fmt(mon)}–${fmt(fri)}`);
        })
      ),
      previewTarget === 'daily' && React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap', background: '#161616', border: '1px solid #252525', borderRadius: '6px', padding: '10px 12px' } },
        React.createElement('span', { style: { fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '.07em', width: '100%', marginBottom: '2px' } }, 'Tamanho da fonte — por zona'),
        [0, 1, 2].map(zi =>
          React.createElement('div', { key: zi, className: 'fg', style: { flex: 1, minWidth: '140px' } },
            React.createElement('span', { className: 'lbl', style: { color: '#e87820' } }, `Zona 0${zi + 1} — ${zoneScales[zi].toFixed(2)}×`),
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
              React.createElement('button', { type: 'button', className: 'b bsm', style: { padding: '3px 7px', minHeight: '26px' }, onClick: () => setZoneScales(s => { const n = [...s]; n[zi] = Math.max(0.3, Math.round((n[zi] - 0.01) * 1000) / 1000); return n; }) }, '−'),
              React.createElement('input', { type: 'range', min: '0.3', max: '3', step: '0.01', value: zoneScales[zi], onChange: e => setZoneScales(s => { const n = [...s]; n[zi] = parseFloat(e.target.value); return n; }), style: { flex: 1, accentColor: '#e87820' } }),
              React.createElement('button', { type: 'button', className: 'b bsm', style: { padding: '3px 7px', minHeight: '26px' }, onClick: () => setZoneScales(s => { const n = [...s]; n[zi] = Math.min(3, Math.round((n[zi] + 0.01) * 1000) / 1000); return n; }) }, '+')
            )
          )
        )
      ),
      previewTarget === 'daily' && React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap', background: '#161616', border: '1px solid #252525', borderRadius: '6px', padding: '10px 12px' } },
        React.createElement('span', { style: { fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '.07em', width: '100%', marginBottom: '2px' } }, 'Tamanho do título do bloco — por zona'),
        [0, 1, 2].map(zi =>
          React.createElement('div', { key: zi, className: 'fg', style: { flex: 1, minWidth: '140px' } },
            React.createElement('span', { className: 'lbl', style: { color: '#f5c842' } }, `Título Zona 0${zi + 1} — ${blockTitleScales[zi].toFixed(2)}×`),
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
              React.createElement('button', { type: 'button', className: 'b bsm', style: { padding: '3px 7px', minHeight: '26px' }, onClick: () => setBlockTitleScales(s => { const n = [...s]; n[zi] = Math.max(0.3, Math.round((n[zi] - 0.01) * 1000) / 1000); return n; }) }, '−'),
              React.createElement('input', { type: 'range', min: '0.3', max: '3', step: '0.01', value: blockTitleScales[zi], onChange: e => setBlockTitleScales(s => { const n = [...s]; n[zi] = parseFloat(e.target.value); return n; }), style: { flex: 1, accentColor: '#f5c842' } }),
              React.createElement('button', { type: 'button', className: 'b bsm', style: { padding: '3px 7px', minHeight: '26px' }, onClick: () => setBlockTitleScales(s => { const n = [...s]; n[zi] = Math.min(3, Math.round((n[zi] + 0.01) * 1000) / 1000); return n; }) }, '+')
            )
          )
        )
      ),
      (previewTarget === 'daily' || previewTarget === 'mobileA' || previewTarget === 'mobileB') && allSessionDates.length > 0 && React.createElement('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' } },
        React.createElement('span', { style: { fontSize: '11px', color: '#555', marginRight: '4px', textTransform: 'uppercase', letterSpacing: '.06em' } }, 'Dia:'),
        allSessionDates.map(dateKey => {
          const d = new Date(dateKey + 'T12:00:00');
          const lbl = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
          const active = selectedDate === dateKey;
          return React.createElement('button', {
            key: dateKey, type: 'button', className: 'b bsm',
            style: { background: active ? 'var(--theme-accent)' : 'transparent', color: active ? 'var(--theme-accent-text)' : 'var(--theme-accent)', borderColor: 'var(--theme-accent)', fontSize: '11px', padding: '5px 10px' },
            onClick: () => {
              setSelectedDate(dateKey);
              const weeks = getWeeksOfMonth(new Date(dateKey + 'T12:00:00').getFullYear(), new Date(dateKey + 'T12:00:00').getMonth());
              const wk = weeks.find(w => w.some(d2 => toISO(d2) === dateKey));
              if (wk) setSelectedWeek(wk);
            }
          }, lbl);
        })
      ),
      React.createElement('div', { ref: previewWrapRef, style: { width: '100%', marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', background: '#000', position: 'relative' } },
        React.createElement('div', { style: { transform: `scale(${(previewTarget === 'mobileA' || previewTarget === 'mobileB') ? (previewWrapRef.current?.offsetWidth || 800) / 1080 : previewScale})`, transformOrigin: 'top left', width: (previewTarget === 'mobileA' || previewTarget === 'mobileB') ? '1080px' : '1920px', pointerEvents: 'none' } },
          previewTarget === 'daily'
            ? React.createElement(DailyExportView, { sessions: filteredSessions, label, gymName, fontScale, zoneScales, blockTitleScales, selectedDate, logoDataUrl, logoScale, weekDates: currentWeekDates, dvColors: { bg: dvBg, gymName: dvGymName, date: dvDate, mainTraining: dvMainTraining, zoneType: dvZoneType, blockLabel: dvBlockLabel, cap: dvCap, rounds: dvRounds, exName: dvExName, intensity: dvIntensity, note: dvNote, blockNotes: dvBlockNotes, divider: dvDivider } })
            : previewTarget === 'semanal'
              ? React.createElement(WeeklyCalendarExportView, { sessions: filteredSessions, label, year, month, gymName, logoDataUrl, logoScale, fontScale, weekDates: getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates, wkColors: { bg: wkBg, header: wkHeader, dateNum: wkDateNum, mainTraining: wkMainTraining, blockType: wkBlockType, exName: wkExName, divider: wkDivider } })
              : previewTarget === 'mobileWeeklyA'
                ? React.createElement(MobileWeeklyExportView, { sessions: filteredSessions, gymName, logoDataUrl, logoScale, fontScale, weekDates: getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates, variant: 'A' })
                : previewTarget === 'mobileWeeklyB'
                  ? React.createElement(MobileWeeklyExportView, { sessions: filteredSessions, gymName, logoDataUrl, logoScale, fontScale, weekDates: getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates, variant: 'B' })
                  : previewTarget === 'mobileA'
                    ? React.createElement(MobileEaglesExportView, { sessions: filteredSessions, selectedDate, currentWeekDates, gymName, logoDataUrl, logoScale, fontScale, bgOverride: eaglesBg, colors: { gymName: eaGymName, date: eaDate, subtitle: eaSubtitle, blockType: eaBlockType, blockMeta: eaBlockMeta, exName: eaExName, intensity: eaIntensity, blockHdr: eaBlockHdr, divider: eaDivider, note: noteColor } })
                    : previewTarget === 'mobileB'
                      ? React.createElement(MobileMegaManExportView, { sessions: filteredSessions, selectedDate, currentWeekDates, gymName, logoDataUrl, logoScale, fontScale, bgOverride: megaManBg, colors: { gymName: mmGymName, date: mmDate, subtitle: mmSubtitle, blockType: mmBlockType, blockMetaBg: mmBlockMetaBg, blockMetaText: mmBlockMetaText, exName: mmExName, intensity: mmIntensity, blockHdr: mmBlockHdr, divider: mmDivider, note: noteColor } })
                      : React.createElement(CalendarExportView, { sessions: filteredSessions, label, year, month, gymName, logoDataUrl, logoScale, fontScale, wkColors: { bg: wkBg, header: wkHeader, dateNum: wkDateNum, mainTraining: wkMainTraining, blockType: wkBlockType, exName: wkExName, divider: wkDivider } })
        ),
        React.createElement('div', { style: { height: `${(previewTarget === 'mobileA' || previewTarget === 'mobileB') ? 'auto' : 1080}px`, ...((previewTarget === 'mobileA' || previewTarget === 'mobileB') ? {} : { marginTop: `-${1080 * previewScale}px` }), pointerEvents: 'none' } })
      )
    ),
    settingsOpen && React.createElement(React.Fragment, null,
      React.createElement('div', { className: 'settings-overlay', onClick: () => setSettingsOpen(false) }),
      React.createElement('div', {
        className: 'settings-modal',
        ref: el => {
          if (!el) return;
          let dragging = false, ox = 0, oy = 0;
          const hdr = el.querySelector('.settings-drag-hdr');
          if (!hdr || hdr._drag) return;
          hdr._drag = true;
          const down = e => { dragging = true; const r = el.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top; el.style.transform = 'none'; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); };
          const move = e => { if (!dragging) return; el.style.left = (e.clientX - ox) + 'px'; el.style.top = (e.clientY - oy) + 'px'; };
          const up = () => { dragging = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
          hdr.addEventListener('mousedown', down);
        }
      },
        React.createElement('div', { className: 'settings-drag-hdr' },
          React.createElement('i', { className: 'ti ti-grip-horizontal', style: { color: '#555', fontSize: '16px' } }),
          React.createElement('span', { style: { fontSize: '13px', color: '#888', marginRight: '8px', flexShrink: 0 } }, 'Configurações:'),
          React.createElement('select', { value: settingsView, onChange: e => setSettingsView(e.target.value), style: { flex: 1, fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, color: '#fff', background: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: '5px', padding: '4px 8px', outline: 'none', cursor: 'pointer' } },
            React.createElement('option', { value: 'daily' }, 'Diário'),
            React.createElement('option', { value: 'semanal' }, 'Semanal'),
            React.createElement('option', { value: 'calendar' }, 'Calendário'),
            React.createElement('option', { value: 'mobileEagles' }, 'Mobile 01'),
            React.createElement('option', { value: 'megaMan' }, 'Mobile 02')
          ),
          React.createElement('button', { type: 'button', className: 'b bd bsm', style: { marginLeft: '8px', padding: '3px 8px', minHeight: '24px', flexShrink: 0 }, onClick: () => setSettingsOpen(false) }, React.createElement('i', { className: 'ti ti-x' }))
        ),
        React.createElement('div', { style: { padding: '14px 16px' } },
          (() => {
            const row = ([lbl, val, setter, id]) => React.createElement('div', { key: id, className: 'settings-row' },
              React.createElement('span', { className: 'settings-lbl' }, lbl),
              React.createElement('div', { className: 'color-row' },
                React.createElement('div', { className: 'color-swatch', style: { background: val }, onClick: () => document.getElementById('picker-' + id)?.click() }),
                React.createElement('input', { type: 'color', id: 'picker-' + id, value: val.startsWith('#') && val.length === 7 ? val : '#888888', onChange: e => setter(e.target.value) }),
                React.createElement('input', { type: 'text', className: 'color-input', value: val, onChange: e => { if (/^(#[0-9a-fA-F]{0,8}|rgba?.*)$/.test(e.target.value)) setter(e.target.value); } })
              )
            );
            const sections = {
              daily: [
                ['Fundo', dvBg, setDvBg, 'dv-bg'], ['Nome da academia', dvGymName, setDvGymName, 'dv-gn'], ['Data / dia', dvDate, setDvDate, 'dv-dt'],
                ['Treino principal', dvMainTraining, setDvMainTraining, 'dv-mt'], ['Tipo do bloco (zona)', dvZoneType, setDvZoneType, 'dv-zt'],
                ['Tipo do bloco (sub-bloco)', dvBlockLabel, setDvBlockLabel, 'dv-bl'], ['CAP / Rounds label', dvCap, setDvCap, 'dv-cp'],
                ['Rounds valor', dvRounds, setDvRounds, 'dv-rd'], ['Nome do exercício', dvExName, setDvExName, 'dv-en'],
                ['Intensidade / Carga', dvIntensity, setDvIntensity, 'dv-in'], ['Observação exercício', dvNote, setDvNote, 'dv-nt'],
                ['Notas do bloco', dvBlockNotes, setDvBlockNotes, 'dv-bn'], ['Divisor', dvDivider, setDvDivider, 'dv-dv'],
              ],
              semanal: [
                ['Fundo', wkBg, setWkBg, 'wk-bg'], ['Cabeçalho dias', wkHeader, setWkHeader, 'wk-hd'], ['Número da data', wkDateNum, setWkDateNum, 'wk-dn'],
                ['Treino principal', wkMainTraining, setWkMainTraining, 'wk-mt'], ['Tipo do bloco', wkBlockType, setWkBlockType, 'wk-bt'],
                ['Nome do exercício', wkExName, setWkExName, 'wk-en'], ['Divisor', wkDivider, setWkDivider, 'wk-dv'],
              ],
              calendar: [
                ['Fundo', wkBg, setWkBg, 'cal-bg'], ['Cabeçalho dias', wkHeader, setWkHeader, 'cal-hd'], ['Número da data', wkDateNum, setWkDateNum, 'cal-dn'],
                ['Treino principal', wkMainTraining, setWkMainTraining, 'cal-mt'], ['Tipo do bloco', wkBlockType, setWkBlockType, 'cal-bt'],
                ['Nome do exercício', wkExName, setWkExName, 'cal-en'], ['Divisor', wkDivider, setWkDivider, 'cal-dv'],
              ],
              mobileEagles: [
                ['Fundo', eaglesBg, setEaglesBg, 'ea-bg'], ['Nome da academia', eaGymName, setEaGymName, 'ea-gn'], ['Data / dia', eaDate, setEaDate, 'ea-dt'],
                ['Sub-título', eaSubtitle, setEaSubtitle, 'ea-st'], ['Tipo do bloco', eaBlockType, setEaBlockType, 'ea-bt'],
                ['Meta do bloco', eaBlockMeta, setEaBlockMeta, 'ea-bm'], ['Fundo do header', eaBlockHdr, setEaBlockHdr, 'ea-bh'],
                ['Nome do exercício', eaExName, setEaExName, 'ea-en'], ['Intensidade', eaIntensity, setEaIntensity, 'ea-in'],
                ['Divisor', eaDivider, setEaDivider, 'ea-dv'], ['Observação (ambos)', noteColor, setNoteColor, 'ea-nc'],
              ],
              megaMan: [
                ['Fundo', megaManBg, setMegaManBg, 'mm-bg'], ['Nome da academia', mmGymName, setMmGymName, 'mm-gn'], ['Data / dia', mmDate, setMmDate, 'mm-dt'],
                ['Sub-título', mmSubtitle, setMmSubtitle, 'mm-st'], ['Tipo do bloco', mmBlockType, setMmBlockType, 'mm-bt'],
                ['Meta bg', mmBlockMetaBg, setMmBlockMetaBg, 'mm-bmbg'], ['Meta texto', mmBlockMetaText, setMmBlockMetaText, 'mm-bmt'],
                ['Fundo do header', mmBlockHdr, setMmBlockHdr, 'mm-bh'], ['Nome do exercício', mmExName, setMmExName, 'mm-en'],
                ['Intensidade', mmIntensity, setMmIntensity, 'mm-in'], ['Divisor', mmDivider, setMmDivider, 'mm-dv'],
              ]
            };
            return (sections[settingsView] || []).map(row);
          })()
        ),
        React.createElement('div', { style: { padding: '10px 16px', borderTop: '1px solid #252525' } },
          React.createElement('div', { style: { fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' } }, 'Resolução do export'),
          React.createElement('div', { style: { display: 'flex', gap: '6px' } },
            [2, 3].map(s => React.createElement('button', { key: s, type: 'button', className: 'b bsm', style: { background: exportScale === s ? 'var(--theme-accent)' : 'transparent', color: exportScale === s ? 'var(--theme-accent-text)' : '#888', borderColor: exportScale === s ? 'var(--theme-accent)' : '#2e2e2e' }, onClick: () => setExportScale(s) }, `${s}× ${s === 2 ? '(2160px)' : '(3240px)'}`))
          )
        ),
        React.createElement('div', { style: { padding: '8px 16px', borderTop: '1px solid #252525', display: 'flex', gap: '8px' } },
          React.createElement('button', { type: 'button', className: 'b bsm', style: { flex: 1 },
            onClick: () => {
              const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
              inp.onchange = e => {
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  try {
                    const cfg = JSON.parse(ev.target.result);
                    const set = (key, setter, val) => { if (val !== undefined) setter(val); };
                    set('wkBg', setWkBg, cfg.wkBg); set('wkHeader', setWkHeader, cfg.wkHeader); set('wkDateNum', setWkDateNum, cfg.wkDateNum);
                    set('wkMainTraining', setWkMainTraining, cfg.wkMainTraining); set('wkBlockType', setWkBlockType, cfg.wkBlockType);
                    set('wkExName', setWkExName, cfg.wkExName); set('wkDivider', setWkDivider, cfg.wkDivider);
                    set('dvBg', setDvBg, cfg.dvBg); set('dvGymName', setDvGymName, cfg.dvGymName); set('dvDate', setDvDate, cfg.dvDate);
                    set('dvMainTraining', setDvMainTraining, cfg.dvMainTraining); set('dvZoneType', setDvZoneType, cfg.dvZoneType);
                    set('dvBlockLabel', setDvBlockLabel, cfg.dvBlockLabel); set('dvCap', setDvCap, cfg.dvCap); set('dvRounds', setDvRounds, cfg.dvRounds);
                    set('dvExName', setDvExName, cfg.dvExName); set('dvIntensity', setDvIntensity, cfg.dvIntensity); set('dvNote', setDvNote, cfg.dvNote);
                    set('dvBlockNotes', setDvBlockNotes, cfg.dvBlockNotes); set('dvDivider', setDvDivider, cfg.dvDivider);
                    set('eaGymName', setEaGymName, cfg.eaGymName); set('eaDate', setEaDate, cfg.eaDate); set('eaSubtitle', setEaSubtitle, cfg.eaSubtitle);
                    set('eaBlockType', setEaBlockType, cfg.eaBlockType); set('eaBlockMeta', setEaBlockMeta, cfg.eaBlockMeta);
                    set('eaExName', setEaExName, cfg.eaExName); set('eaIntensity', setEaIntensity, cfg.eaIntensity);
                    set('eaBlockHdr', setEaBlockHdr, cfg.eaBlockHdr); set('eaDivider', setEaDivider, cfg.eaDivider);
                    if (cfg.mobileEaglesBg) setEaglesBg(cfg.mobileEaglesBg);
                    set('mmGymName', setMmGymName, cfg.mmGymName); set('mmDate', setMmDate, cfg.mmDate); set('mmSubtitle', setMmSubtitle, cfg.mmSubtitle);
                    set('mmBlockType', setMmBlockType, cfg.mmBlockType); set('mmBlockMetaBg', setMmBlockMetaBg, cfg.mmBlockMetaBg);
                    set('mmBlockMetaText', setMmBlockMetaText, cfg.mmBlockMetaText); set('mmExName', setMmExName, cfg.mmExName);
                    set('mmIntensity', setMmIntensity, cfg.mmIntensity); set('mmBlockHdr', setMmBlockHdr, cfg.mmBlockHdr); set('mmDivider', setMmDivider, cfg.mmDivider);
                    if (cfg.mobileMegaManBg) setMegaManBg(cfg.mobileMegaManBg);
                    if (cfg.themeAccent) { APP_CONFIG.themeAccent = cfg.themeAccent; document.documentElement.style.setProperty('--theme-accent', cfg.themeAccent); }
                    if (cfg.themeAccentText) { APP_CONFIG.themeAccentText = cfg.themeAccentText; document.documentElement.style.setProperty('--theme-accent-text', cfg.themeAccentText); }
                    if (cfg.fontFamily) {
                      APP_CONFIG.fontFamily = cfg.fontFamily;
                      document.documentElement.style.setProperty('--export-font', cfg.fontFamily);
                      if (cfg.googleFontsUrl) { const gf = document.getElementById('gfonts'); if (gf) gf.href = cfg.googleFontsUrl; }
                    }
                    if (cfg.fontScale) setFontScale(cfg.fontScale);
                    if (cfg.exportScale) setExportScale(cfg.exportScale);
                    if (cfg.gymName) setGymName(cfg.gymName);
                    alert('Config carregada! Verifique o preview e salve se estiver correto.');
                  } catch (err) { alert('Erro ao ler o arquivo: ' + err.message); }
                };
                reader.readAsText(file);
              };
              inp.click();
            }
          }, React.createElement('i', { className: 'ti ti-upload' }), ' Carregar config'),
          React.createElement('button', { type: 'button', className: 'b bsm', style: { flex: 1 },
            onClick: () => {
              const exportCfg = {
                appTitle: APP_CONFIG.appTitle, appDescription: APP_CONFIG.appDescription || '',
                scheduleTitle: APP_CONFIG.scheduleTitle || APP_CONFIG.appTitle,
                leaderboardTitle: APP_CONFIG.leaderboardTitle || APP_CONFIG.appTitle,
                logo: APP_CONFIG.logo || 'icon-192.png',
                fontFamily: APP_CONFIG.fontFamily || "'Arial Black',Arial,sans-serif",
                googleFontsUrl: APP_CONFIG.googleFontsUrl || '',
                themeAccent: APP_CONFIG.themeAccent, themeAccentText: APP_CONFIG.themeAccentText,
                gymName: gymName || APP_CONFIG.gymName, fontScale, logoScale: APP_CONFIG.logoScale || 1,
                zoneScales, blockTitleScales, mobileEaglesBg: eaglesBg, mobileMegaManBg: megaManBg,
                mobileExerciseNoteColor: noteColor, restDayLabel: APP_CONFIG.restDayLabel,
                mobileWeeklyLabels: APP_CONFIG.mobileWeeklyLabels, exportScale,
                blockColors: APP_CONFIG.blockColors || {}, blockNames: APP_CONFIG.blockNames,
                athleteLevels: APP_CONFIG.athleteLevels, athleteGoals: APP_CONFIG.athleteGoals,
                wkBg, wkHeader, wkDateNum, wkMainTraining, wkBlockType, wkExName, wkDivider,
                dvBg, dvGymName, dvDate, dvMainTraining, dvZoneType, dvBlockLabel, dvCap, dvRounds,
                dvExName, dvIntensity, dvNote, dvBlockNotes, dvDivider,
                eaGymName, eaDate, eaSubtitle, eaBlockType, eaBlockMeta, eaExName, eaIntensity, eaBlockHdr, eaDivider,
                mmGymName, mmDate, mmSubtitle, mmBlockType, mmBlockMetaBg, mmBlockMetaText, mmExName, mmIntensity, mmBlockHdr, mmDivider
              };
              const raw = window.prompt('Nome do arquivo (sem extensão):', 'config');
              if (raw === null) return;
              const fname = (raw.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'config');
              const blob = new Blob([JSON.stringify(exportCfg, null, 2)], { type: 'application/json' });
              const a = document.createElement('a'); a.download = fname + '.json';
              a.href = URL.createObjectURL(blob); a.click(); URL.revokeObjectURL(a.href);
            }
          }, React.createElement('i', { className: 'ti ti-download' }), ' Salvar config.json')
        ),
        React.createElement('div', { style: { padding: '4px 16px 10px', fontSize: '11px', color: '#444' } }, 'Arraste pelo topo para mover. Cores também configuráveis em config.json no GitHub.')
      )
    ),
    React.createElement('div', { style: { position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none', zIndex: -1, overflow: 'hidden' } },
      React.createElement('div', { ref: exportDailyRef },
        React.createElement(DailyExportView, { sessions: filteredSessions, label, gymName, fontScale, zoneScales, blockTitleScales, selectedDate, logoDataUrl, logoScale, weekDates: currentWeekDates, dvColors: { bg: dvBg, gymName: dvGymName, date: dvDate, mainTraining: dvMainTraining, zoneType: dvZoneType, blockLabel: dvBlockLabel, cap: dvCap, rounds: dvRounds, exName: dvExName, intensity: dvIntensity, note: dvNote, blockNotes: dvBlockNotes, divider: dvDivider } })
      ),
      React.createElement('div', { ref: exportWeeklyRef },
        React.createElement(WeeklyExportView, { sessions: filteredSessions, label, year, month, onDayClick: () => {} })
      ),
      React.createElement('div', { ref: exportWeeklyCalRef },
        React.createElement(WeeklyCalendarExportView, { sessions: filteredSessions, label, year, month, gymName, logoDataUrl, logoScale, fontScale, weekDates: getWeeksOfMonth(year, month)[selectedWeekIdx] || currentWeekDates, wkColors: { bg: wkBg, header: wkHeader, dateNum: wkDateNum, mainTraining: wkMainTraining, blockType: wkBlockType, exName: wkExName, divider: wkDivider } })
      ),
      React.createElement('div', { ref: exportCalendarRef },
        React.createElement(CalendarExportView, { sessions: filteredSessions, label, year, month, gymName, logoDataUrl, logoScale, fontScale, wkColors: { bg: wkBg, header: wkHeader, dateNum: wkDateNum, mainTraining: wkMainTraining, blockType: wkBlockType, exName: wkExName, divider: wkDivider } })
      ),
      React.createElement('div', { ref: exportMobileARef, style: { width: '1080px' } },
        React.createElement(MobileEaglesExportView, { sessions: filteredSessions, selectedDate, currentWeekDates, gymName, logoDataUrl, logoScale, fontScale, bgOverride: eaglesBg, colors: { gymName: eaGymName, date: eaDate, subtitle: eaSubtitle, blockType: eaBlockType, blockMeta: eaBlockMeta, exName: eaExName, intensity: eaIntensity, blockHdr: eaBlockHdr, divider: eaDivider, note: noteColor } })
      ),
      React.createElement('div', { ref: exportMobileBRef, style: { width: '1080px' } },
        React.createElement(MobileMegaManExportView, { sessions: filteredSessions, selectedDate, currentWeekDates, gymName, logoDataUrl, logoScale, fontScale, bgOverride: megaManBg, colors: { gymName: mmGymName, date: mmDate, subtitle: mmSubtitle, blockType: mmBlockType, blockMetaBg: mmBlockMetaBg, blockMetaText: mmBlockMetaText, exName: mmExName, intensity: mmIntensity, blockHdr: mmBlockHdr, divider: mmDivider, note: noteColor } })
      )
    ),
    !previewOpen && React.createElement('div', { style: { overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '8px' } },
      React.createElement('div', { ref: weeklyRef },
        React.createElement(WeeklyExportView, { sessions: filteredSessions, label, year, month, onDayClick: handleDayClick })
      )
    )
  )); // closes inner div + Fragment
}

export default SchedulePublisher;
