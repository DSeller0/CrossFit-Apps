import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const DV_W = 1920;
const DV_H = 1080;

export default function PresenterView({ logUrl, onClose, children }) {
  const [scale, setScale] = useState(1);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    function updateScale() {
      const sx = window.innerWidth / DV_W;
      const sy = window.innerHeight / DV_H;
      setScale(Math.min(sx, sy));
    }
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (!logUrl) return;
    QRCode.toDataURL(logUrl, {
      width: 240, margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
    }).then(url => setQrDataUrl(url)).catch(() => {});
  }, [logUrl]);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return React.createElement('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }
  },
    // Close button (always on top)
    React.createElement('button', {
      onClick: onClose,
      title: 'Fechar (Esc)',
      style: {
        position: 'absolute', top: '12px', right: '12px', zIndex: 10001,
        background: 'rgba(0,0,0,.6)', border: '1px solid rgba(255,255,255,.2)',
        color: '#fff', borderRadius: '6px', cursor: 'pointer',
        width: '36px', height: '36px', fontSize: '18px', lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }
    },
      React.createElement('i', { className: 'ti ti-x', 'aria-hidden': 'true' })
    ),

    // Scaled DV export view
    React.createElement('div', {
      style: {
        width: DV_W + 'px',
        height: DV_H + 'px',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
        position: 'relative',
      }
    }, children),

    // QR code bottom-right (in screen coords, not scaled)
    logUrl && qrDataUrl && React.createElement('div', {
      style: {
        position: 'absolute', bottom: '20px', right: '20px', zIndex: 10000,
        background: 'rgba(0,0,0,.7)', borderRadius: '10px', padding: '10px',
        border: '1px solid rgba(255,255,255,.15)',
      }
    },
      React.createElement('img', { src: qrDataUrl, alt: 'QR Code', style: { width: '130px', height: '130px', display: 'block', borderRadius: '4px' } }),
      React.createElement('div', { style: { fontSize: '11px', color: '#aaa', textAlign: 'center', marginTop: '5px', letterSpacing: '.04em' } }, 'Registrar resultado')
    )
  );
}
