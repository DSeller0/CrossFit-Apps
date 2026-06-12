import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

const BASE_URL = 'https://dseller0.github.io/CrossFit-Apps';

export default function PresenterView({ sessions, selectedDate, weekDates, gymName, dvColors, fontScale, zoneScales, blockTitleScales, logoDataUrl, logoScale, onClose }) {
  const qrRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Find the session for the selected date
  const dateKey = selectedDate;
  const daySessions = dateKey ? (sessions[dateKey] || []) : [];
  const session = daySessions[0] || null;

  const logUrl = session
    ? `${BASE_URL}/log.html?date=${dateKey}&session=${session.id}`
    : '';

  useEffect(() => {
    if (!logUrl) return;
    QRCode.toDataURL(logUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
    }).then(url => setQrDataUrl(url)).catch(() => {});
  }, [logUrl]);

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!session) {
    return React.createElement('div', { style: presenterWrap },
      React.createElement('button', { onClick: onClose, style: closeBtn, title: 'Fechar (Esc)' },
        React.createElement('i', { className: 'ti ti-x', 'aria-hidden': 'true' })
      ),
      React.createElement('div', { style: { color: '#888', fontSize: '18px', margin: 'auto' } }, 'Nenhuma sessão nesta data.')
    );
  }

  const dv = dvColors || {};
  const fs = fontScale || 1;

  const dateObj = new Date(dateKey + 'T12:00:00');
  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();
  const dateNum = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const targets = Array.isArray(session.mainTraining) ? session.mainTraining : (session.mainTraining ? [session.mainTraining] : []);

  const bg = dv.bg || '#000000';

  return React.createElement('div', { style: { ...presenterWrap, background: bg } },
    // Close button
    React.createElement('button', { onClick: onClose, style: closeBtn, title: 'Fechar (Esc)' },
      React.createElement('i', { className: 'ti ti-x', 'aria-hidden': 'true' })
    ),

    // Session content — scrollable main area
    React.createElement('div', { style: contentArea },
      // Header
      React.createElement('div', { style: { textAlign: 'center', marginBottom: `${18 * fs}px` } },
        gymName && React.createElement('div', {
          style: { fontSize: `${22 * fs}px`, fontWeight: 900, color: dv.gymName || '#fff', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: `${6 * fs}px` }
        }, gymName),
        React.createElement('div', {
          style: { fontSize: `${15 * fs}px`, fontWeight: 700, color: dv.date || '#e87820', letterSpacing: '.08em' }
        }, `${weekday} — ${dateNum}`),
        targets.length > 0 && React.createElement('div', {
          style: { fontSize: `${12 * fs}px`, color: dv.mainTraining || '#888', marginTop: `${6 * fs}px`, letterSpacing: '.06em' }
        }, targets.join(' · '))
      ),

      // Blocks
      (session.blocks || []).map((bl, bi) =>
        React.createElement(BlockCard, { key: bl.id || bi, bl, dv, fs, zoneScales, blockTitleScales, bi })
      )
    ),

    // QR code bottom-right
    logUrl && qrDataUrl && React.createElement('div', { style: qrCorner },
      React.createElement('img', { src: qrDataUrl, alt: 'QR Code', style: { width: '120px', height: '120px', display: 'block', borderRadius: '6px' } }),
      React.createElement('div', { style: { fontSize: '10px', color: '#aaa', textAlign: 'center', marginTop: '4px', letterSpacing: '.04em' } }, 'Registrar resultado')
    )
  );
}

function BlockCard({ bl, dv, fs, zoneScales, blockTitleScales, bi }) {
  const zone = bl.zone || 'Zone 01';
  const zIdx = Math.min(bi, 2);
  const zScale = (zoneScales && zoneScales[zIdx]) || 1;
  const bScale = (blockTitleScales && blockTitleScales[zIdx]) || 1;
  const label = bl.label || bl.type;
  const capStr = bl.duration ? `CAP ${bl.duration}'` : '';
  const roundsStr = bl.rounds ? `${bl.rounds} rounds` : '';
  const meta = [roundsStr, capStr].filter(Boolean).join(' · ');

  return React.createElement('div', {
    style: { marginBottom: `${14 * fs}px`, paddingBottom: `${14 * fs}px`, borderBottom: `1px solid ${dv.divider || '#1a1a1a'}` }
  },
    // Zone label
    React.createElement('div', {
      style: { fontSize: `${10 * fs * zScale}px`, fontWeight: 700, color: dv.zoneType || '#e87820', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: `${4 * fs}px` }
    }, zone),
    // Block type + meta row
    React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: `${8 * fs}px`, flexWrap: 'wrap', marginBottom: `${8 * fs}px` } },
      React.createElement('span', {
        style: { fontSize: `${16 * fs * bScale}px`, fontWeight: 900, color: dv.blockLabel || '#e87820', letterSpacing: '.06em', textTransform: 'uppercase' }
      }, label),
      meta && React.createElement('span', {
        style: { fontSize: `${11 * fs}px`, color: dv.cap || '#e87820', fontWeight: 700, letterSpacing: '.05em' }
      }, meta)
    ),
    // Exercises
    (bl.exercises || []).filter(e => e.name).map((ex, ei) =>
      React.createElement('div', { key: ex.id || ei, style: { marginBottom: `${5 * fs}px` } },
        React.createElement('div', { style: { display: 'flex', gap: `${8 * fs}px`, alignItems: 'baseline', flexWrap: 'wrap' } },
          React.createElement('span', {
            style: { fontSize: `${13 * fs}px`, fontWeight: 700, color: dv.exName || '#fff', letterSpacing: '.03em', textTransform: 'uppercase' }
          }, [ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.reps, ex.name].filter(Boolean).join(' ')),
          ex.intensity?.mode && React.createElement('span', {
            style: { fontSize: `${11 * fs}px`, color: dv.intensity || '#f5c842', fontWeight: 600 }
          }, fmtIntensitySimple(ex.intensity))
        ),
        ex.note && React.createElement('div', {
          style: { fontSize: `${11 * fs}px`, color: dv.note || '#888', marginTop: `${2 * fs}px`, fontStyle: 'italic' }
        }, ex.note)
      )
    ),
    bl.blockNotes && React.createElement('div', {
      style: { fontSize: `${11 * fs}px`, color: dv.blockNotes || '#888', marginTop: `${6 * fs}px`, fontStyle: 'italic', lineHeight: 1.4 }
    }, bl.blockNotes)
  );
}

function fmtIntensitySimple(ins) {
  if (!ins?.mode) return '';
  if (ins.mode === 'pct') return ins.pct ? `${ins.pct}% RM` : '';
  if (ins.mode === 'progression') {
    const loads = (ins.steps || []).map(s => s.load).filter(Boolean);
    const unit = (ins.steps?.[0]?.unit || '% RM').replace('% do RM', '% RM').replace('%', '% RM');
    return loads.length ? `${loads.join('/')} ${unit}` : '';
  }
  if (ins.mode === 'cardio') return ins.cardioVal ? `${ins.cardioVal}${ins.cardioUnit || 'm'}` : '';
  return '';
}

// Styles
const presenterWrap = {
  position: 'fixed', inset: 0, zIndex: 9999,
  display: 'flex', flexDirection: 'column',
  fontFamily: "'Raleway', 'Arial', sans-serif",
  overflow: 'hidden',
};

const contentArea = {
  flex: 1, overflowY: 'auto', padding: '48px 60px 40px',
  maxWidth: '900px', width: '100%', margin: '0 auto',
};

const closeBtn = {
  position: 'absolute', top: '16px', right: '16px', zIndex: 10001,
  background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.15)',
  color: '#fff', borderRadius: '6px', cursor: 'pointer',
  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '18px',
};

const qrCorner = {
  position: 'absolute', bottom: '24px', right: '24px', zIndex: 10000,
  background: 'rgba(0,0,0,.6)', borderRadius: '10px', padding: '10px',
  border: '1px solid rgba(255,255,255,.12)',
};
