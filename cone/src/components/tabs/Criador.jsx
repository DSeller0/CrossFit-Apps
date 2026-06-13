import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  uid, toISO, todayISO,
  loadAthletes, loadRegistry,
  loadTemplates, saveTemplates,
  getTargets,
} from '../../utils/storage';
import { APP_CONFIG, ZONES, BTC, PLC } from '../../utils/config';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;

// ── useSpeech ─────────────────────────────────────────────────────────────────
function useSpeech(onResult) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const start = useCallback(() => {
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = e => { const t = e.results[0][0].transcript; if (t) onResult(t); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [onResult]);
  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);
  return { listening, start, stop };
}

function MicButton({ onTranscript, style }) {
  const { listening, start, stop } = useSpeech(onTranscript);
  if (!SpeechRecognition) return null;
  return (
    <button
      type="button"
      className={`mic-btn${listening ? ' mic-on' : ''}`}
      style={style}
      onMouseDown={e => { e.preventDefault(); listening ? stop() : start(); }}
      title={listening ? 'Parar' : 'Ditado por voz'}
      aria-label={listening ? 'Parar gravação' : 'Gravar voz'}
    >
      <i className={`ti ${listening ? 'ti-microphone-off' : 'ti-microphone'}`} aria-hidden="true" />
    </button>
  );
}

// ── Factories ─────────────────────────────────────────────────────────────────
const emptyEx = () => ({ id: uid(), name: '', sets: '', reps: '', intensity: null, note: '' });
const emptyBlock = () => ({
  id: uid(),
  label: APP_CONFIG.blockNames[0] || '-',
  type: APP_CONFIG.blockNames.find(n => n !== '-') || 'Força',
  zone: 'Zona 01',
  duration: '',
  rounds: '',
  notes: '',
  ladderMode: false,
  exercises: [emptyEx()],
});
const emptyS = () => ({ id: uid(), date: todayISO(), mainTraining: [], blocks: [emptyBlock()] });

// ── IntensityInput ────────────────────────────────────────────────────────────
function IntensityInput({ value, onChange, defaultReps, defaultSets }) {
  const [mode, setMode] = useState(value?.mode || 'none');
  useEffect(() => { setMode(value?.mode || 'none'); }, [value?.mode]);
  const v = value || {};
  const upd = p => onChange({ ...v, mode, ...p });
  const setM = m => {
    setMode(m);
    if (m === 'none') onChange(null);
    else if (m === 'progression') {
      let steps;
      if (v.steps?.length) { steps = v.steps; }
      else {
        const numSets = parseInt(defaultSets) || 1;
        steps = Array.from({ length: numSets }, () => ({ reps: defaultReps || '', load: '', unit: '% do RM' }));
      }
      onChange({ mode: 'progression', steps });
    } else onChange({ mode: m });
  };
  const inlineSelStyle = { fontFamily: 'inherit', fontSize: '14px', border: '1px solid #2e2e2e', borderRadius: '5px', padding: '8px 28px 8px 9px', background: '#111', color: '#e0e0e0', outline: 'none', WebkitAppearance: 'none', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', cursor: 'pointer', width: '100%' };
  const steps = (value?.steps) || [];
  const updStep = (i, field, val) => { const ns = [...steps]; ns[i] = { ...ns[i], [field]: val }; onChange({ mode: 'progression', steps: ns }); };
  const addStep = () => onChange({ mode: 'progression', steps: [...steps, { reps: defaultReps || steps[steps.length - 1]?.reps || '', load: '', unit: steps[steps.length - 1]?.unit || '% do RM' }] });
  const delStep = i => onChange({ mode: 'progression', steps: steps.filter((_, j) => j !== i) });

  return React.createElement('div', { className: 'int-block' },
    React.createElement('span', { className: 'lbl', style: { marginBottom: '6px' } }, 'Intensidade / Carga'),
    React.createElement('div', { className: 'int-tabs' },
      [['none', '—'], ['pct', '% do RM'], ['progression', 'Progressão'], ['gender', 'M / F'], ['cardio', 'Cardio']].map(([m, l]) =>
        React.createElement('button', { key: m, type: 'button', className: `itb ${mode === m ? 'iact' : ''}`, onClick: () => setM(m) }, l)
      )
    ),
    mode === 'none' && React.createElement('div', { style: { fontSize: '12px', color: '#444', padding: '2px 0' } }, 'Sem intensidade definida.'),
    mode === 'pct' && React.createElement('div', { className: 'fg' },
      React.createElement('span', { className: 'lbl' }, 'Porcentagem do RM'),
      React.createElement('input', { type: 'number', min: 1, max: 110, placeholder: 'ex: 80', value: v.pct || '', onChange: e => upd({ pct: e.target.value }) })
    ),
    mode === 'progression' && React.createElement('div', null,
      React.createElement('table', { className: 'prog-table' },
        React.createElement('thead', null,
          React.createElement('tr', null,
            React.createElement('th', null, '#'),
            React.createElement('th', null, 'Reps'),
            React.createElement('th', null, 'Carga'),
            React.createElement('th', null, 'Un.')
          )
        ),
        React.createElement('tbody', null,
          steps.map((s, i) =>
            React.createElement('tr', { key: i },
              React.createElement('td', { style: { color: '#555', fontSize: '11px', textAlign: 'center' } }, i + 1),
              React.createElement('td', null, React.createElement('input', { type: 'text', placeholder: defaultReps || '—', value: s.reps !== undefined ? s.reps : '', onChange: e => updStep(i, 'reps', e.target.value) })),
              React.createElement('td', null, React.createElement('input', { type: 'number', placeholder: '—', value: s.load || '', onChange: e => updStep(i, 'load', e.target.value) })),
              React.createElement('td', null,
                React.createElement('select', {
                  value: s.unit || '% do RM', onChange: e => updStep(i, 'unit', e.target.value),
                  style: { fontFamily: 'inherit', fontSize: '11px', background: '#111', border: '1px solid #2a2a2a', color: '#ccc', borderRadius: '3px', padding: '2px 4px', width: '66px' }
                },
                  React.createElement('option', { value: '% do RM' }, '% do RM'),
                  React.createElement('option', { value: 'kg' }, 'kg'),
                  React.createElement('option', { value: 'lb' }, 'lb')
                )
              )
            )
          )
        )
      ),
      React.createElement('div', { style: { display: 'flex', gap: '6px', marginTop: '6px' } },
        React.createElement('button', { type: 'button', className: 'b bsm', onClick: addStep },
          React.createElement('i', { className: 'ti ti-plus' }), ' Série'
        ),
        steps.length > 1 && React.createElement('button', { type: 'button', className: 'b bd bsm', onClick: () => delStep(steps.length - 1) },
          React.createElement('i', { className: 'ti ti-minus' })
        )
      )
    ),
    mode === 'gender' && React.createElement('div', { className: 'gblock' },
      ['Masculino', 'Feminino'].map(g =>
        React.createElement('div', { key: g },
          React.createElement('div', { className: 'gst' }, g),
          React.createElement('div', { className: 'fg', style: { marginBottom: '6px' } },
            React.createElement('span', { className: 'lbl' }, 'Unidade'),
            React.createElement('select', { style: inlineSelStyle, value: v[`${g}_unit`] || 'kg', onChange: e => upd({ [`${g}_unit`]: e.target.value }) },
              React.createElement('option', { value: 'kg' }, 'kg'),
              React.createElement('option', { value: 'lb' }, 'lb')
            )
          ),
          ['RX', 'Inter', 'SC'].map(cat =>
            React.createElement('div', { key: cat, className: 'fg', style: { marginBottom: '6px' } },
              React.createElement('span', { className: 'lbl' }, cat),
              React.createElement('input', { type: 'number', placeholder: '0', value: v[`${g}_${cat}`] || '', onChange: e => upd({ [`${g}_${cat}`]: e.target.value }) })
            )
          )
        )
      )
    ),
    mode === 'cardio' && React.createElement('div', { className: 'unit-row' },
      React.createElement('div', { className: 'fg' },
        React.createElement('span', { className: 'lbl' }, 'Quantidade'),
        React.createElement('input', { type: 'number', placeholder: 'e.g. 400', value: v.cardioVal || '', onChange: e => upd({ cardioVal: e.target.value }) })
      ),
      React.createElement('div', { className: 'fg', style: { width: '110px' } },
        React.createElement('span', { className: 'lbl' }, 'Unidade'),
        React.createElement('select', { style: { ...inlineSelStyle, width: '110px' }, value: v.cardioUnit || 'm', onChange: e => upd({ cardioUnit: e.target.value }) },
          React.createElement('option', { value: 'm' }, 'metros'),
          React.createElement('option', { value: 'cal' }, 'calorias')
        )
      )
    )
  );
}

// ── ExerciseCombobox ──────────────────────────────────────────────────────────
function ExerciseCombobox({ value, onChange, blockLabel, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef();

  const suggestions = React.useMemo(() => {
    const reg = loadRegistry() || {};
    const exs = reg[blockLabel] || [];
    if (!query.trim()) return exs;
    const q = query.toLowerCase();
    return exs.filter(e => e.toLowerCase().includes(q));
  }, [blockLabel, query]);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = name => { setQuery(name); onChange(name); setOpen(false); };

  return React.createElement('div', { ref, style: { position: 'relative', flex: 1 } },
    React.createElement('input', {
      value: query, placeholder,
      style: { width: '100%', fontFamily: 'inherit', fontSize: '16px', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '9px 11px', background: '#111', color: '#e0e0e0', outline: 'none', WebkitAppearance: 'none', appearance: 'none', transition: 'border-color .15s' },
      onChange: e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); },
      onFocus: () => setOpen(true),
      onKeyDown: e => {
        if (e.key === 'Escape') setOpen(false);
        if (e.key === 'ArrowDown' && open && suggestions.length) {
          const first = ref.current?.querySelector('.ex-suggestion');
          first?.focus();
        }
      }
    }),
    open && suggestions.length > 0 && React.createElement('div', {
      style: { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#1a1a1a', border: '1px solid #333', borderRadius: '5px', maxHeight: '180px', overflowY: 'auto', marginTop: '2px', boxShadow: '0 4px 12px rgba(0,0,0,.5)' }
    },
      suggestions.map((s, i) => React.createElement('div', {
        key: i, className: 'ex-suggestion', tabIndex: 0,
        style: { padding: '7px 12px', fontSize: '13px', color: '#ddd', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid #222' : 'none' },
        onMouseDown: e => { e.preventDefault(); select(s); },
        onKeyDown: e => {
          if (e.key === 'Enter') select(s);
          if (e.key === 'ArrowDown') { const next = e.currentTarget.nextSibling; if (next) next.focus(); }
          if (e.key === 'ArrowUp') { const prev = e.currentTarget.previousSibling; if (prev) prev.focus(); else ref.current?.querySelector('input')?.focus(); }
          if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('input')?.focus(); }
        },
        onMouseEnter: e => e.currentTarget.style.background = '#252525',
        onMouseLeave: e => e.currentTarget.style.background = 'transparent'
      }, s))
    )
  );
}

// ── BlockEditor ───────────────────────────────────────────────────────────────
function BlockEditor({ block, idx, total, blockNames, onUpdate, onDelete, collapsed, onToggleCollapse, dragBlkIdx, dragOverBlkIdx, setDragOverBlkIdx, reorderBlocks, blockIdx }) {
  const updEx = (id, f, val) => onUpdate({
    ...block, exercises: block.exercises.map(x => {
      if (x.id !== id) return x;
      const updated = { ...x, [f]: val };
      if (f === 'sets' && updated.intensity?.mode === 'progression' && val !== '') {
        const n = Math.max(1, Math.min(20, parseInt(val) || 1));
        const cur = [...(updated.intensity.steps || [])];
        const last = cur[cur.length - 1] || { reps: updated.reps || '', load: '', unit: '% do RM' };
        while (cur.length < n) cur.push({ reps: last.reps || updated.reps || '', load: '', unit: last.unit || '% do RM' });
        cur.splice(n);
        updated.intensity = { ...updated.intensity, steps: cur };
      }
      return updated;
    })
  });
  const addEx = () => onUpdate({ ...block, exercises: [...block.exercises, emptyEx()] });
  const delEx = id => onUpdate({ ...block, exercises: block.exercises.filter(x => x.id !== id) });
  const updIns = (id, ins) => onUpdate({ ...block, exercises: block.exercises.map(x => x.id === id ? { ...x, intensity: ins } : x) });
  const cls = BTC[block.type] || 'bt-st';
  const miniStyle = { fontFamily: 'inherit', fontSize: '11px', border: '1px solid rgba(255,255,255,.1)', borderRadius: '4px', padding: '4px 6px', background: 'rgba(0,0,0,.3)', color: 'inherit', outline: 'none', width: '50px', WebkitAppearance: 'none', textAlign: 'center' };

  const dragExIdx = useRef(null);
  const [dragOverExIdx, setDragOverExIdx] = useState(null);

  const reorderEx = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx === null || toIdx === null) return;
    const exs = [...block.exercises];
    const [moved] = exs.splice(fromIdx, 1);
    exs.splice(toIdx, 0, moved);
    onUpdate({ ...block, exercises: exs });
  };

  return React.createElement('div', {
    className: `blk-wrap ${cls}`,
    onDragOver: e => { e.preventDefault(); if (dragBlkIdx?.current !== null && dragBlkIdx?.current !== blockIdx) setDragOverBlkIdx && setDragOverBlkIdx(blockIdx); },
    onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverBlkIdx && setDragOverBlkIdx(null); },
    onDrop: e => {
      e.preventDefault();
      const from = dragBlkIdx?.current;
      setDragOverBlkIdx && setDragOverBlkIdx(null);
      if (from !== null && from !== undefined && from !== blockIdx) reorderBlocks && reorderBlocks(from, blockIdx);
      if (dragBlkIdx) dragBlkIdx.current = null;
    },
    style: { outline: dragOverBlkIdx === blockIdx ? '2px solid var(--theme-accent)' : 'none', outlineOffset: '2px', borderRadius: '8px', transition: 'outline .1s' }
  },
    React.createElement('div', { className: 'blk-bar' },
      React.createElement('span', {
        className: `drag-handle${collapsed ? '' : ' dnd-disabled'}`,
        title: collapsed ? 'Arrastar para reordenar' : 'Recolher bloco para arrastar',
        draggable: collapsed,
        onDragStart: collapsed ? e => { if (dragBlkIdx) dragBlkIdx.current = blockIdx; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(blockIdx)); } : undefined,
        onDragEnd: collapsed ? () => { if (dragBlkIdx) dragBlkIdx.current = null; setDragOverBlkIdx && setDragOverBlkIdx(null); } : undefined
      }, React.createElement('i', { className: 'ti ti-grip-vertical' })),
      React.createElement('button', { type: 'button', className: 'collapse-btn', onClick: onToggleCollapse, title: collapsed ? 'Expandir' : 'Recolher' },
        React.createElement('i', { className: `ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-down'}` })
      ),
      React.createElement('span', { className: 'blk-idx' }, `Bloco ${idx + 1}`),
      React.createElement('select', {
        className: 'blk-sel', value: block.label || '-',
        onChange: e => onUpdate({ ...block, label: e.target.value })
      }, (() => { const names = blockNames || APP_CONFIG.blockNames; const sorted = ['-', ...names.filter(n => n !== '-').sort((a, b) => a.localeCompare(b, 'pt'))]; return sorted.map(l => React.createElement('option', { key: l, style: { background: '#1c1c1c', color: '#e0e0e0' } }, l)); })()),
      React.createElement('select', {
        className: 'blk-sel', value: block.type,
        onChange: e => onUpdate({ ...block, type: e.target.value })
      }, (() => { const names = blockNames || APP_CONFIG.blockNames; const sorted = ['-', ...names.filter(n => n !== '-').sort((a, b) => a.localeCompare(b, 'pt'))]; return sorted.map(t => React.createElement('option', { key: t, style: { background: '#1c1c1c', color: '#e0e0e0' } }, t)); })()),
      React.createElement('select', {
        className: 'blk-zone-sel', value: block.zone || 'Zona 01',
        onChange: e => onUpdate({ ...block, zone: e.target.value })
      }, ZONES.map(z => React.createElement('option', { key: z, style: { background: '#1c1c1c', color: '#e0e0e0' } }, z))),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
        React.createElement('span', { className: 'blk-mini-lbl' }, 'Rounds'),
        React.createElement('input', { type: 'number', min: 1, placeholder: '—', value: block.rounds || '', onChange: e => onUpdate({ ...block, rounds: e.target.value }), style: miniStyle })
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
        React.createElement('span', { className: 'blk-mini-lbl' }, "Cap'"),
        React.createElement('input', { type: 'number', min: 1, placeholder: '—', value: block.duration || '', onChange: e => onUpdate({ ...block, duration: e.target.value }), style: miniStyle })
      ),
      React.createElement('button', {
        type: 'button', className: 'b bsm',
        style: { fontSize: '11px', padding: '3px 8px', minHeight: '26px', background: block.ladderMode ? '#1a3a10' : 'transparent', color: block.ladderMode ? '#60a840' : '#555', borderColor: block.ladderMode ? '#2a5020' : '#2e2e2e' },
        onClick: () => onUpdate({ ...block, ladderMode: !block.ladderMode })
      },
        React.createElement('i', { className: 'ti ti-stairs', 'aria-hidden': 'true' }),
        block.ladderMode ? ' Escada ON' : ' Escada'
      ),
      React.createElement('div', { className: 'blk-spacer' }),
      total > 1 && React.createElement('button', {
        type: 'button', className: 'b bd bsm',
        style: { padding: '3px 8px', minHeight: '26px', fontSize: '11px' },
        onClick: onDelete
      }, React.createElement('i', { className: 'ti ti-trash', 'aria-hidden': 'true' }))
    ),
    !collapsed && React.createElement('div', { className: 'blk-body' },
      block.exercises.map((ex, ei) =>
        React.createElement('div', {
          key: ex.id, className: 'ex-card',
          style: { borderColor: dragOverExIdx === ei ? '#e87820' : '', boxShadow: dragOverExIdx === ei ? '0 0 0 2px rgba(232,120,32,.35)' : '', opacity: dragExIdx.current === ei ? 0.45 : 1, transition: 'opacity .1s,border-color .1s' },
          onDragOver: e => { e.preventDefault(); setDragOverExIdx(ei); },
          onDragLeave: () => setDragOverExIdx(null),
          onDrop: e => { e.preventDefault(); setDragOverExIdx(null); reorderEx(dragExIdx.current, ei); dragExIdx.current = null; }
        },
          React.createElement('div', { className: 'ex-card-hdr' },
            React.createElement('i', {
              className: 'ti ti-grip-vertical drag-handle', 'aria-hidden': 'true',
              title: 'Arrastar para reordenar', draggable: true,
              style: { cursor: 'grab', fontSize: '16px', color: '#555', padding: '0 4px', flexShrink: 0 },
              onDragStart: e => { e.stopPropagation(); dragExIdx.current = ei; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(ei)); },
              onDragEnd: () => { dragExIdx.current = null; setDragOverExIdx(null); }
            }),
            React.createElement('span', { className: 'ex-num' }, `Exercício ${ei + 1}`),
            block.exercises.length > 1 && React.createElement('button', {
              type: 'button', className: 'b bd bsm', style: { padding: '2px 7px', minHeight: '22px', fontSize: '11px' },
              onClick: () => delEx(ex.id)
            }, React.createElement('i', { className: 'ti ti-x', 'aria-hidden': 'true' }))
          ),
          React.createElement('div', { className: 'g2', style: { marginBottom: '8px' } },
            React.createElement('div', { className: 'fg' },
              React.createElement('span', { className: 'lbl' }, 'Nome do exercício'),
              React.createElement('div', { className: 'input-mic-row' },
                React.createElement(ExerciseCombobox, {
                  value: ex.name,
                  onChange: v => updEx(ex.id, 'name', v),
                  blockLabel: block.label && block.label !== '-' ? block.label : block.type,
                  placeholder: 'ex: Levantamento Terra'
                }),
                React.createElement(MicButton, { onTranscript: txt => updEx(ex.id, 'name', (ex.name ? ex.name + ' ' : '') + txt) })
              )
            ),
            React.createElement('div', { className: 'g2', style: { marginBottom: 0 } },
              React.createElement('div', { className: 'fg' },
                React.createElement('span', { className: 'lbl' }, 'Séries'),
                React.createElement('input', {
                  type: 'number', placeholder: '3', value: ex.sets || '',
                  onChange: e => updEx(ex.id, 'sets', e.target.value),
                  onBlur: e => updEx(ex.id, 'sets', e.target.value)
                })
              ),
              React.createElement('div', { className: 'fg' },
                React.createElement('span', { className: 'lbl' }, block.ladderMode ? 'Reps (ex: 15,12,9,6)' : 'Reps'),
                React.createElement('input', {
                  placeholder: block.ladderMode ? '15,12,9,6' : '10',
                  value: ex.reps || '',
                  onChange: e => updEx(ex.id, 'reps', e.target.value)
                })
              )
            )
          ),
          React.createElement(IntensityInput, { value: ex.intensity, onChange: ins => updIns(ex.id, ins), defaultReps: ex.reps || '', defaultSets: ex.sets || '1' }),
          React.createElement('div', { className: 'fg', style: { marginTop: '8px' } },
            React.createElement('span', { className: 'lbl' }, 'Observação'),
            React.createElement('div', { className: 'input-mic-row' },
              React.createElement('textarea', {
                placeholder: 'Dica, variação...', style: { minHeight: '38px', flex: 1 },
                value: ex.note || '', onChange: e => updEx(ex.id, 'note', e.target.value)
              }),
              React.createElement(MicButton, { onTranscript: txt => updEx(ex.id, 'note', (ex.note ? ex.note + ' ' : '') + txt), style: { alignSelf: 'flex-start', marginTop: '2px' } })
            )
          )
        )
      ),
      React.createElement('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px' } },
        React.createElement('button', { type: 'button', className: 'b bsm', style: { flex: 1 }, onClick: addEx },
          React.createElement('i', { className: 'ti ti-plus', 'aria-hidden': 'true' }), ' Adicionar exercício'
        ),
        block.exercises.length > 0 && React.createElement('button', {
          type: 'button', className: 'b bsm', style: { flex: 1 },
          onClick: () => {
            const last = block.exercises[block.exercises.length - 1];
            onUpdate({ ...block, exercises: [...block.exercises, { ...last, id: uid() }] });
          }
        },
          React.createElement('i', { className: 'ti ti-copy', 'aria-hidden': 'true' }), ' Copiar último'
        )
      ),
      React.createElement('div', { className: 'fg' },
        React.createElement('span', { className: 'lbl' }, 'Notas do bloco / time cap / detalhes'),
        React.createElement('div', { className: 'input-mic-row' },
          React.createElement('textarea', {
            placeholder: "ex: 4 Rounds · Buy-in: 5 BMU / 10 Pull-up · CAP 15'",
            style: { flex: 1 },
            value: block.notes, onChange: e => onUpdate({ ...block, notes: e.target.value })
          }),
          React.createElement(MicButton, { onTranscript: txt => onUpdate({ ...block, notes: (block.notes ? block.notes + ' ' : '') + txt }), style: { alignSelf: 'flex-start', marginTop: '2px' } })
        )
      )
    )
  );
}

// ── TrainingCreator (default export) ──────────────────────────────────────────
function TrainingCreator({ sessions, setSessions, blockNames, preload, onPreloadConsumed }) {
  const [form, setForm] = useState(emptyS());
  const [blocks, setBlocks] = useState([emptyBlock()]);
  const [editing, setEditing] = useState(null);
  const [showAlvoModal, setShowAlvoModal] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);
  const [collapsedBlocks, setCollapsedBlocks] = useState({});
  const [templates, setTemplates] = useState(loadTemplates);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateFlash, setTemplateFlash] = useState(null);
  const formRef = useRef();

  useEffect(() => {
    if (!preload) return;
    if (preload._newForDate) {
      setForm(f => ({ ...emptyS(), date: preload._newForDate }));
      setBlocks([emptyBlock()]);
      setEditing(null);
    } else {
      startEdit(preload, preload.date || preload._dateKey || '');
    }
    onPreloadConsumed && onPreloadConsumed();
  }, [preload]);

  const startEdit = (s, dateKey) => {
    const targets = getTargets(s);
    const sName = typeof s.mainTraining === 'string' ? s.mainTraining : (s.sessionName || '');
    setForm({ ...s, date: dateKey, mainTraining: targets, sessionName: sName });
    setBlocks(s.blocks?.length ? s.blocks : [emptyBlock()]);
    setEditing({ dateKey, id: s.id });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const cancel = () => { setForm(emptyS()); setBlocks([emptyBlock()]); setEditing(null); setShowAlvoModal(false); };

  const cloneBlocks = bls => bls.map(bl => ({
    ...bl, id: uid(),
    exercises: (bl.exercises || []).map(ex => ({ ...ex, id: uid() })),
  }));

  const saveAsTemplate = () => {
    const name = (form.sessionName || '').trim() || `Template ${templates.length + 1}`;
    const tpl = { id: uid(), name, blocks: cloneBlocks(blocks) };
    const updated = [...templates, tpl];
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateFlash(name);
    setTimeout(() => setTemplateFlash(null), 2000);
  };

  const applyTemplate = tpl => {
    setBlocks(cloneBlocks(tpl.blocks));
    setForm(f => ({ ...f, sessionName: f.sessionName || tpl.name }));
    setShowTemplateModal(false);
  };

  const deleteTemplate = id => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  };

  const saveS = () => {
    const dateKey = form.date || todayISO();
    const session = { ...form, date: dateKey, blocks, id: editing?.id || form.id };
    setSessions(prev => {
      const next = { ...prev };
      if (editing) {
        const oldKey = editing.dateKey;
        if (oldKey !== dateKey) {
          next[oldKey] = (next[oldKey] || []).filter(s => s.id !== editing.id);
        }
        if ((next[dateKey] || []).some(s => s.id === editing.id)) {
          next[dateKey] = next[dateKey].map(s => s.id === editing.id ? session : s);
        } else {
          next[dateKey] = [...(next[dateKey] || []), session];
        }
      } else {
        next[dateKey] = [...(next[dateKey] || []), session];
      }
      return next;
    });
    cancel();
  };

  const del = (dateKey, id) => setSessions(prev => {
    const n = { ...prev };
    n[dateKey] = (n[dateKey] || []).filter(s => s.id !== id);
    return n;
  });

  const addBlock = () => setBlocks(b => [...b, emptyBlock()]);
  const updBlock = (id, upd) => setBlocks(b => b.map(x => x.id === id ? upd : x));
  const delBlock = id => setBlocks(b => b.length > 1 ? b.filter(x => x.id !== id) : b);

  const dragBlkIdx = useRef(null);
  const [dragOverBlkIdx, setDragOverBlkIdx] = useState(null);
  const reorderBlocks = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx === null || toIdx === null) return;
    setBlocks(prev => {
      const arr = [...prev];
      const [mv] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, mv);
      return arr;
    });
  };

  const [weekOffset, setWeekOffset] = useState(0);

  const getSundayWeek = offset => {
    const d = new Date();
    const dow = d.getDay();
    d.setDate(d.getDate() - dow + (offset * 7));
    return Array.from({ length: 7 }, (_, i) => { const w = new Date(d); w.setDate(d.getDate() + i); return w; });
  };
  const weekDates = getSundayWeek(weekOffset);
  const WEEK_DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  const totalSessions = Object.values(sessions).flat().length;
  const weekLabel = `${weekDates[0].getDate()}/${weekDates[0].getMonth() + 1} – ${weekDates[6].getDate()}/${weekDates[6].getMonth() + 1}/${weekDates[6].getFullYear()}`;

  return React.createElement('div', null,
    pendingDate && React.createElement('div', { className: 'confirm-overlay' },
      React.createElement('div', { className: 'confirm-box' },
        React.createElement('div', { className: 'confirm-msg' },
          `Mover sessão de ${new Date(pendingDate.oldDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} para ${new Date(pendingDate.newDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}?`
        ),
        React.createElement('div', { className: 'confirm-btns' },
          React.createElement('button', { type: 'button', className: 'b bsm', onClick: () => setPendingDate(null) }, 'Cancelar'),
          React.createElement('button', {
            type: 'button', className: 'b bp bsm',
            onClick: () => { setForm(f => ({ ...f, date: pendingDate.newDate })); setPendingDate(null); }
          }, 'Confirmar')
        )
      )
    ),
    showTemplateModal && React.createElement('div', {
      style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
      onClick: () => setShowTemplateModal(false)
    },
      React.createElement('div', {
        style: { background: '#0d0d0d', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '18px', width: '380px', maxWidth: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
        onClick: e => e.stopPropagation()
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' } },
          React.createElement('span', { style: { fontSize: '14px', fontWeight: 700, color: '#fff' } }, 'Templates'),
          React.createElement('button', { type: 'button', className: 'b bsm', onClick: () => setShowTemplateModal(false) },
            React.createElement('i', { className: 'ti ti-x' })
          )
        ),
        templates.length === 0
          ? React.createElement('div', { style: { textAlign: 'center', padding: '30px 0', color: '#444', fontSize: '13px' } },
              React.createElement('i', { className: 'ti ti-bookmark-off', style: { fontSize: '28px', display: 'block', marginBottom: '8px' } }),
              'Nenhum template salvo.',
              React.createElement('br'),
              React.createElement('span', { style: { fontSize: '11px' } }, 'Monte uma sessão e clique em  para salvar.')
            )
          : React.createElement('div', { style: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' } },
              templates.map(tpl =>
                React.createElement('div', {
                  key: tpl.id,
                  style: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'border-color .12s' },
                  onClick: () => applyTemplate(tpl),
                  onMouseEnter: e => e.currentTarget.style.borderColor = '#9070d8',
                  onMouseLeave: e => e.currentTarget.style.borderColor = '#2a2a2a',
                },
                  React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('div', { style: { fontSize: '13px', fontWeight: 700, color: '#e0e0e0', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, tpl.name),
                    React.createElement('div', { style: { fontSize: '11px', color: '#555' } },
                      `${tpl.blocks.length} bloco${tpl.blocks.length !== 1 ? 's' : ''}`
                    )
                  ),
                  React.createElement('button', {
                    type: 'button', className: 'b bd bsm',
                    style: { flexShrink: 0 },
                    onClick: e => { e.stopPropagation(); deleteTemplate(tpl.id); },
                    title: 'Excluir template'
                  },
                    React.createElement('i', { className: 'ti ti-trash' })
                  )
                )
              )
            )
      )
    ),
    showAlvoModal && React.createElement('div', {
      style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
      onClick: () => setShowAlvoModal(false)
    },
      React.createElement('div', { style: { background: '#0d0d0d', border: '1px solid #2e2e2e', borderRadius: '10px', padding: '18px', width: '320px', maxWidth: '90vw' }, onClick: e => e.stopPropagation() },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' } },
          React.createElement('span', { style: { fontSize: '13px', fontWeight: 700, color: '#ccc' } }, 'Selecionar Atletas'),
          React.createElement('button', { onClick: () => setShowAlvoModal(false), style: { background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px' } }, '✕')
        ),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto', marginBottom: '14px' } },
          loadAthletes().map(a => {
            const targets = Array.isArray(form.mainTraining) ? form.mainTraining : [];
            const checked = targets.includes(a.name);
            return React.createElement('label', {
              key: a.id,
              style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', background: checked ? 'rgba(74,200,192,.06)' : 'transparent', border: '1px solid ' + (checked ? 'rgba(74,200,192,.25)' : '#1e1e1e') }
            },
              React.createElement('input', {
                type: 'checkbox', checked,
                onChange: () => {
                  const cur = Array.isArray(form.mainTraining) ? form.mainTraining : [];
                  setForm(f => ({ ...f, mainTraining: checked ? cur.filter(n => n !== a.name) : [...cur, a.name] }));
                },
                style: { accentColor: a.color || 'var(--theme-accent)', width: '14px', height: '14px' }
              }),
              React.createElement('span', { style: { width: '10px', height: '10px', borderRadius: '50%', background: a.color || '#555', flexShrink: 0 } }),
              React.createElement('span', { style: { fontSize: '13px', color: '#ccc', flex: 1 } }, a.name),
              React.createElement('span', { style: { fontSize: '11px', color: '#555' } }, a.level || '')
            );
          })
        ),
        React.createElement('button', {
          type: 'button',
          style: { width: '100%', background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
          onClick: () => setShowAlvoModal(false)
        }, 'Confirmar')
      )
    ),
    React.createElement('div', { className: 'sc-card', ref: formRef },
      React.createElement('div', { className: 'sc-hdr' },
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
          React.createElement('span', { className: 'sc-title' }, editing ? 'Editar sessão' : 'Nova sessão'),
          templateFlash && React.createElement('span', { style: { fontSize: '11px', color: '#9070d8' } },
            React.createElement('i', { className: 'ti ti-bookmark-filled' }), ' "', templateFlash, '" salvo'
          )
        ),
        React.createElement('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
          React.createElement('button', {
            type: 'button', className: 'b bsm',
            style: { borderColor: '#4a2880', color: '#9070d8' },
            onClick: () => setShowTemplateModal(true)
          },
            React.createElement('i', { className: 'ti ti-template', 'aria-hidden': 'true' }),
            ' Templates'
          ),
          editing && React.createElement('button', { type: 'button', className: 'b bsm', onClick: cancel }, 'Cancelar')
        )
      ),
      React.createElement('div', { className: 'g2' },
        React.createElement('div', { className: 'fg' },
          React.createElement('span', { className: 'lbl' }, 'Data'),
          React.createElement('input', {
            type: 'date',
            value: form.date || todayISO(),
            onChange: e => {
              const newDate = e.target.value;
              const oldDate = form.date || todayISO();
              if (editing && newDate !== oldDate) {
                setPendingDate({ newDate, oldDate });
                e.target.value = oldDate;
              } else {
                setForm(f => ({ ...f, date: newDate }));
              }
            }
          })
        ),
        React.createElement('div', { className: 'fg' },
          React.createElement('span', { className: 'lbl' }, 'Nome da Sessão'),
          React.createElement('div', { className: 'input-mic-row' },
            React.createElement('input', {
              placeholder: 'ex: Segunda · Semana 3 D1',
              value: typeof form.mainTraining === 'string' ? form.mainTraining : (form.sessionName || ''),
              onChange: e => setForm(f => ({ ...f, sessionName: e.target.value })),
              style: { flex: 1 }
            }),
            React.createElement(MicButton, { onTranscript: txt => setForm(f => ({ ...f, sessionName: (f.sessionName || '') + (f.sessionName ? ' ' : '') + txt })) })
          )
        ),
        React.createElement('div', { className: 'fg' },
          React.createElement('span', { className: 'lbl' }, 'Alvo'),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            React.createElement('button', {
              type: 'button',
              onClick: () => setShowAlvoModal(true),
              style: { display: 'flex', alignItems: 'center', gap: '6px', flex: 1, background: '#111', border: '1px solid #2e2e2e', borderRadius: '5px', padding: '7px 10px', cursor: 'pointer', color: '#888', fontSize: '13px', textAlign: 'left' }
            },
              React.createElement('i', { className: 'ti ti-users', style: { fontSize: '14px', color: 'var(--theme-accent)' } }),
              getTargets(form).length === 0
                ? React.createElement('span', { style: { color: '#444' } }, 'Nenhum atleta selecionado')
                : React.createElement('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                  getTargets(form).map((name, i) => React.createElement('span', { key: i, style: { fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', background: 'var(--theme-accent)22', color: 'var(--theme-accent)', border: '1px solid var(--theme-accent)44' } }, name))
                )
            )
          )
        )
      ),
      React.createElement('div', { style: { borderTop: '1px solid #242424', paddingTop: '14px', marginTop: '4px' } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } },
          React.createElement('span', { style: { fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '.06em' } },
            `${blocks.length} Bloco${blocks.length !== 1 ? 's' : ''}`
          ),
          React.createElement('div', { className: 'collapse-all-row', style: { margin: 0 } },
            React.createElement('button', { type: 'button', className: 'collapse-all-btn', onClick: () => setCollapsedBlocks(Object.fromEntries(blocks.map(b => [b.id, true]))) },
              React.createElement('i', { className: 'ti ti-arrows-minimize' }), ' Recolher'
            ),
            React.createElement('button', { type: 'button', className: 'collapse-all-btn', onClick: () => setCollapsedBlocks({}) },
              React.createElement('i', { className: 'ti ti-arrows-maximize' }), ' Expandir'
            )
          )
        ),
        blocks.map((bl, i) =>
          React.createElement('div', { key: bl.id },
            React.createElement(BlockEditor, {
              block: bl, idx: i, total: blocks.length,
              blockNames: blockNames || APP_CONFIG.blockNames,
              onUpdate: upd => updBlock(bl.id, upd),
              onDelete: () => delBlock(bl.id),
              collapsed: !!collapsedBlocks[bl.id],
              onToggleCollapse: () => setCollapsedBlocks(p => ({ ...p, [bl.id]: !p[bl.id] })),
              dragBlkIdx, dragOverBlkIdx, setDragOverBlkIdx, reorderBlocks, blockIdx: i
            })
          )
        ),
        React.createElement('div', { style: { display: 'flex', gap: '6px' } },
          React.createElement('button', { type: 'button', className: 'add-blk-btn', style: { flex: 1, marginBottom: 0 }, onClick: addBlock },
            React.createElement('i', { className: 'ti ti-layout-grid-add', style: { fontSize: '16px' }, 'aria-hidden': 'true' }),
            ' Adicionar bloco'
          ),
          React.createElement('button', {
            type: 'button', className: 'add-blk-btn', style: { flex: 1, marginBottom: 0 },
            onClick: () => {
              const last = blocks[blocks.length - 1];
              if (!last) return;
              const copy = { ...last, id: uid(), exercises: (last.exercises || []).map(ex => ({ ...ex, id: uid() })) };
              setBlocks(b => [...b, copy]);
            }
          },
            React.createElement('i', { className: 'ti ti-copy', style: { fontSize: '16px' }, 'aria-hidden': 'true' }),
            ' Copiar último bloco'
          )
        )
      ),
      React.createElement('div', { style: { display: 'flex', gap: '8px' } },
        React.createElement('button', { type: 'button', className: 'b bp bfull', onClick: saveS },
          React.createElement('i', { className: 'ti ti-check', 'aria-hidden': 'true' }),
          editing ? ' Salvar alterações' : ' Salvar sessão'
        ),
        blocks.length > 0 && React.createElement('button', {
          type: 'button', className: 'b bsm',
          style: { borderColor: '#4a2880', color: '#9070d8', flexShrink: 0, minWidth: '38px' },
          title: 'Salvar como template',
          onClick: saveAsTemplate
        },
          React.createElement('i', { className: 'ti ti-bookmark', 'aria-hidden': 'true' })
        )
      )
    ),
    totalSessions > 0 && React.createElement('div', null,
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' } },
        React.createElement('button', { type: 'button', className: 'b bsm', onClick: () => setWeekOffset(o => o - 1) },
          React.createElement('i', { className: 'ti ti-chevron-left', 'aria-hidden': 'true' })
        ),
        React.createElement('span', { style: { fontSize: '12px', color: '#aaa', fontWeight: '600' } }, weekLabel),
        React.createElement('button', { type: 'button', className: 'b bsm', onClick: () => setWeekOffset(o => o + 1) },
          React.createElement('i', { className: 'ti ti-chevron-right', 'aria-hidden': 'true' })
        ),
        weekOffset !== 0 && React.createElement('button', {
          type: 'button', className: 'b bsm',
          style: { fontSize: '11px', color: '#e87820', borderColor: '#e87820' },
          onClick: () => setWeekOffset(0)
        }, 'Hoje'),
        React.createElement('span', { style: { fontSize: '11px', color: '#444', marginLeft: '4px' } }, 'Toque para editar · deslize para rolar')
      ),
      React.createElement('div', { className: 'week-scroll' },
        React.createElement('div', { className: 'week-grid' },
          weekDates.map((date, di) => {
            const dateKey = toISO(date);
            const list = sessions[dateKey] || [];
            return React.createElement('div', { key: dateKey, className: 'wg-col' },
              React.createElement('div', { className: 'wg-head' },
                React.createElement('span', { className: 'wg-day' }, WEEK_DAYS[di] + ' ' + date.getDate()),
                list.length > 0 && React.createElement('span', { className: 'wg-sub' }, `${list.length}s`)
              ),
              list.map((s, si) =>
                React.createElement('div', {
                  key: s.id, className: 'wg-sc',
                  draggable: true,
                  onClick: () => startEdit(s, dateKey),
                  onDragStart: e => { e.dataTransfer.setData('sess-id', s.id); e.dataTransfer.setData('sess-date', dateKey); e.dataTransfer.effectAllowed = 'move'; e.stopPropagation(); },
                  onDragOver: e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); e.stopPropagation(); },
                  onDragLeave: e => { e.currentTarget.classList.remove('drag-over'); },
                  onDrop: e => {
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
                        const updated = { ...dragSess, date: dateKey };
                        n[dateKey] = [...(n[dateKey] || []), updated];
                        return n;
                      });
                    }
                  }
                },
                  React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px', marginBottom: '5px' } },
                    React.createElement('span', { className: 'wg-sc-name' }, s.mainTraining || '—'),
                    React.createElement('button', {
                      type: 'button', className: 'b bd',
                      style: { padding: '2px 6px', fontSize: '10px', minHeight: '20px', flexShrink: 0 },
                      onClick: e => { e.stopPropagation(); del(dateKey, s.id); }
                    }, React.createElement('i', { className: 'ti ti-x', 'aria-hidden': 'true' }))
                  ),
                  (s.blocks || []).map(bl =>
                    React.createElement('div', { key: bl.id, style: { marginBottom: '3px' } },
                      React.createElement('span', { className: `wg-pill ${PLC[bl.type] || 'p-st'}` }, bl.type),
                      React.createElement('span', { style: { fontSize: '9px', color: '#3a3a3a', marginLeft: '4px' } }, bl.zone || 'Z1')
                    )
                  )
                )
              ),
              React.createElement('div', { className: 'wg-add-row' },
                React.createElement('div', {
                  className: 'wg-add',
                  onClick: () => {
                    setForm(f => ({ ...f, date: dateKey }));
                    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
                  }
                },
                  React.createElement('i', { className: 'ti ti-plus', 'aria-hidden': 'true' }), ' add'
                ),
                React.createElement('div', {
                  className: 'wg-copy',
                  onClick: () => {
                    const daySess = (sessions[dateKey] || []);
                    if (!daySess.length) return;
                    const last = daySess[daySess.length - 1];
                    const copied = {
                      ...last, id: uid(), date: dateKey, mainTraining: '',
                      blocks: (last.blocks || []).map(bl => ({
                        ...bl, id: uid(),
                        exercises: (bl.exercises || []).map(ex => ({ ...ex, id: uid() }))
                      }))
                    };
                    setSessions(prev => { const n = { ...prev }; n[dateKey] = [...(n[dateKey] || []), copied]; return n; });
                  }
                },
                  React.createElement('i', { className: 'ti ti-copy', 'aria-hidden': 'true' }), ' copy'
                )
              )
            );
          })
        )
      )
    )
  );
}

export default TrainingCreator;
