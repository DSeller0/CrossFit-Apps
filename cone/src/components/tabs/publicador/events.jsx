import React, { useState } from 'react';
import {
  loadAthletes, loadSettings, loadLocations, loadCoach, toISO,
} from '../../../utils/storage';
import { buildPixPayload } from '../../../utils/pix';
import { MONTH_PT } from '../../../public/lib/week.js';
import { sessName } from '../../../public/lib/sessions.js';
import { pixClean } from './exportHelpers';

// ── EventFormInner — standalone so inputs don't lose focus ───────────────────
export function EventFormInner({ showForm, sessions, athletes, initialData, onSave, onCancel }) {
  const [fd, setFd] = useState(() => ({ ...initialData }));
  const isPers = showForm.type === 'personal';
  const daySessions = sessions[showForm.date] || [];
  const locs = loadLocations();
  const boxSvcs = locs.filter(l => l.type === 'box');
  const set = (k, v) => setFd(p => ({ ...p, [k]: v }));
  const toggleAthlete = id => setFd(p => ({ ...p, athleteIds: p.athleteIds?.includes(id) ? p.athleteIds.filter(x => x !== id) : [...(p.athleteIds || []), id] }));
  const selSvc = !isPers && fd.locationId ? locs.find(l => l.id === fd.locationId) : null;
  const [rec, setRec] = useState({ enabled: false, freq: 'weekly', days: [new Date(showForm.date + 'T12:00:00').getDay()], until: '' });
  const _uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const toggleRecDay = i => setRec(r => ({ ...r, days: r.days.includes(i) ? r.days.filter(x => x !== i) : [...r.days, i] }));
  const handleSave = () => {
    const base = { ...fd };
    if (!rec.enabled || !rec.until || (rec.freq === 'weekly' && rec.days.length === 0)) { onSave([base]); return; }
    const results = [];
    const until = new Date(rec.until + 'T12:00:00');
    let cur = new Date(showForm.date + 'T12:00:00');
    while (cur <= until) {
      if (rec.freq === 'daily' || rec.days.includes(cur.getDay()))
        results.push({ ...base, id: _uid(), date: cur.toISOString().slice(0, 10), recurrenceGroup: base.id });
      cur.setDate(cur.getDate() + 1);
    }
    onSave(results.length > 0 ? results : [base]);
  };
  const S = (label, children) => React.createElement('div', { style: { marginBottom: '10px' } },
    React.createElement('label', { style: { fontSize: '11px', color: '#554a3a', display: 'block', marginBottom: '3px' } }, label),
    children
  );
  const inp = (val, onChange, opts = {}) => React.createElement('input', { type: 'text', value: val, onChange, style: { width: '100%', background: '#111', border: '1px solid #2a2318', color: '#c8b090', padding: '6px 8px', borderRadius: '5px', fontSize: '12px' }, ...(opts.style || {}), ...opts });
  const sel = (val, onChange, opts) => React.createElement('select', { value: val, onChange, style: { width: '100%', background: '#111', border: '1px solid #2a2318', color: '#c8b090', padding: '6px 8px', borderRadius: '5px', fontSize: '12px' } }, opts);
  return React.createElement('div', { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
    React.createElement('div', { style: { background: '#0d0b08', border: '1px solid #2a2318', borderRadius: '10px', padding: '18px', width: '340px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: '13px', fontWeight: 700, color: '#c8b090' } }, (showForm.eventId ? 'Editar' : 'Novo') + ' ' + (isPers ? 'Personal' : 'Aula')),
          React.createElement('div', { style: { fontSize: '10px', color: '#554a3a', marginTop: '1px' } }, new Date(showForm.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }))
        ),
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
      isPers && S('Local (opcional)',
        sel(fd.local || '', e => set('local', e.target.value),
          [React.createElement('option', { key: '', value: '' }, '—'),
           ...boxSvcs.map(l => React.createElement('option', { key: l.id, value: l.name }, l.name)),
           React.createElement('option', { key: 'outro', value: '__outro__' }, 'Outro...')]
        )
      ),
      isPers && fd.local === '__outro__' && S('Especificar local',
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
           ...daySessions.map(s => React.createElement('option', { key: s.id, value: s.id }, sessName(s, showForm.date)))]
        )
      ),
      S('Notas (opcional)',
        React.createElement('textarea', { value: fd.notes || '', onChange: e => set('notes', e.target.value), rows: 2, placeholder: 'Observações...', style: { width: '100%', background: '#111', border: '1px solid #2a2318', color: '#c8b090', padding: '6px 8px', borderRadius: '5px', fontSize: '12px', resize: 'vertical' } })
      ),
      !showForm.eventId && React.createElement('div', { style: { borderTop: '1px solid #2a2318', paddingTop: '10px', marginBottom: '10px' } },
        React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12px', color: '#887060', userSelect: 'none' } },
          React.createElement('input', { type: 'checkbox', checked: rec.enabled, onChange: e => setRec(r => ({ ...r, enabled: e.target.checked })), style: { accentColor: 'var(--theme-accent)' } }),
          React.createElement('i', { className: 'ti ti-refresh', style: { fontSize: '13px' } }),
          'Repetir evento'
        ),
        rec.enabled && React.createElement('div', { style: { marginTop: '8px', paddingLeft: '2px' } },
          React.createElement('div', { style: { display: 'flex', gap: '6px', marginBottom: '8px' } },
            ['weekly', 'daily'].map(f => React.createElement('button', { key: f, type: 'button',
              onClick: () => setRec(r => ({ ...r, freq: f })),
              style: { flex: 1, padding: '5px 0', fontSize: '11px', fontWeight: 700, borderRadius: '5px', cursor: 'pointer', border: '1px solid', background: rec.freq === f ? 'var(--theme-accent)' : 'transparent', color: rec.freq === f ? 'var(--theme-accent-text)' : '#887060', borderColor: rec.freq === f ? 'var(--theme-accent)' : '#2a2318' } },
              f === 'weekly' ? 'Semanal' : 'Diário'
            ))
          ),
          rec.freq === 'weekly' && React.createElement('div', { style: { display: 'flex', gap: '3px', marginBottom: '8px' } },
            ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, i) => {
              const on = rec.days.includes(i);
              return React.createElement('button', { key: i, type: 'button', onClick: () => toggleRecDay(i),
                style: { flex: 1, padding: '5px 2px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer', border: '1px solid', background: on ? 'var(--theme-accent)' : 'transparent', color: on ? 'var(--theme-accent-text)' : '#887060', borderColor: on ? 'var(--theme-accent)' : '#2a2318', minWidth: 0 } },
              d);
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { style: { fontSize: '11px', color: '#554a3a', display: 'block', marginBottom: '3px' } }, 'Repetir até'),
            React.createElement('input', { type: 'date', value: rec.until, onChange: e => setRec(r => ({ ...r, until: e.target.value })), min: showForm.date, style: { width: '100%', background: '#111', border: '1px solid #2a2318', color: '#c8b090', padding: '6px 8px', borderRadius: '5px', fontSize: '12px', boxSizing: 'border-box' } })
          )
        )
      ),
      React.createElement('div', { style: { display: 'flex', gap: '6px' } },
        React.createElement('button', { onClick: handleSave, style: { flex: 1, background: 'var(--theme-accent)', color: 'var(--theme-accent-text)', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 } }, rec.enabled && rec.until ? 'Criar eventos' : 'Salvar'),
        React.createElement('button', { onClick: onCancel, style: { background: 'transparent', border: '1px solid #2a2318', color: '#554a3a', padding: '8px 14px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' } }, 'Cancelar')
      )
    )
  );
}

// ── ReportModal ───────────────────────────────────────────────────────────────
export function ReportModal({ events, sessions, onClose }) {
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

  async function qrToBase64(text, size = 200) {
    try {
      const QRCode = (await import('qrcode')).default;
      return await QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: 'M' });
    } catch { return null; }
  }

  async function generatePDF() {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const evs = filteredEvents();
        const groups = groupByLocation(evs);
        const period = useRange ? `${fmtDate(rangeFrom)} – ${fmtDate(rangeTo)}` : MONTH_PT[mo] + ' ' + yr;
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
        autoTable(doc, { startY: y, head: [['Local', 'Tipo', 'Sessões', 'Tempo Total', 'Valor']], body: summaryRows, foot: showRate && grandTotal > 0 ? [['', '', '', 'Total', grandCurrency + ' ' + grandTotal.toLocaleString('pt-BR')]] : [], styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' }, footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 25 }, 2: { cellWidth: 22 }, 3: { cellWidth: 28 }, 4: { cellWidth: 35 } }, margin: { left: 14, right: 14 } });
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
          autoTable(doc, { startY: y, head, body: rows, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold' }, margin: { left: 14, right: 14 } });
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
            const prd = useRange ? `${fmtDate(rangeFrom)}-${fmtDate(rangeTo)}` : (MONTH_PT[mo].substring(0, 3) + yr).replace(/\s/g, '');
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
          React.createElement('span', { style: { flex: 1, textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#c8b090' } }, MONTH_PT[mo] + ' ' + yr),
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
