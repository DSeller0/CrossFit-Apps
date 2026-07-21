import { useState, useEffect, useRef, useMemo } from 'react';
import { loadRegistry } from '../../../utils/storage';
import { ECOL } from '../../../utils/config';

// ── ExerciseCombobox ──────────────────────────────────────────────────────────
export function ExerciseCombobox({ value, onChange, blockLabel, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [dropRect, setDropRect] = useState(null);
  const ref = useRef();
  const dropdownRef = useRef();

  const suggestions = useMemo(() => {
    const reg = loadRegistry() || {};
    const getName = e => typeof e === 'string' ? e : (e?.name || '');
    const typeMap = {};
    Object.entries(reg).forEach(([bt, exs]) => {
      (exs || []).forEach(e => { const n = getName(e); if (n && !typeMap[n]) typeMap[n] = bt; });
    });
    const primary = (reg[blockLabel] || []).map(getName).filter(Boolean);
    const primarySet = new Set(primary);
    const allNames = [...new Set(Object.values(reg).flat().map(getName).filter(Boolean))];
    const others = allNames.filter(n => !primarySet.has(n));
    let names;
    if (!query.trim()) {
      names = [...primary, ...others.sort((a, b) => a.localeCompare(b, 'pt'))];
    } else {
      const q = query.toLowerCase();
      names = [
        ...primary.filter(n => n.toLowerCase().includes(q)),
        ...others.filter(n => n.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b, 'pt')),
      ];
    }
    return names.map(name => ({ name, blockType: typeMap[name] || blockLabel || '' }));
  }, [blockLabel, query]);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (!dropdownRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('scroll', handler, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handler, { capture: true });
  }, [open]);

  const openDrop = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setDropRect(r);
    setOpen(true);
  };

  const select = name => { setQuery(name); onChange(name); setOpen(false); };

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <input
        value={query}
        placeholder={placeholder}
        style={{ width: '100%', fontFamily: 'inherit', fontSize: 15, border: '1px solid #2e2e2e', borderRadius: 6, padding: '9px 11px', background: '#111', color: '#e0e0e0', outline: 'none', transition: 'border-color .15s' }}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); openDrop(); }}
        onFocus={openDrop}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'ArrowDown' && open && suggestions.length) ref.current?.querySelector('.ex-suggestion')?.focus();
        }}
      />
      {open && suggestions.length > 0 && dropRect && (
        <div ref={dropdownRef} style={{ position: 'fixed', top: dropRect.bottom + 2, left: dropRect.left, width: dropRect.width, zIndex: 9999, background: '#1a1a1a', border: '1px solid #333', borderRadius: 5, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,.5)' }}>
          {suggestions.map((s, i) => (
            <div
              key={i} className="ex-suggestion" tabIndex={0}
              style={{ padding: '6px 10px', fontSize: 13, color: '#ddd', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid #222' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseDown={e => { e.preventDefault(); select(s.name); }}
              onKeyDown={e => {
                if (e.key === 'Enter') select(s.name);
                if (e.key === 'ArrowDown') e.currentTarget.nextSibling?.focus();
                if (e.key === 'ArrowUp') { const prev = e.currentTarget.previousSibling; prev ? prev.focus() : ref.current?.querySelector('input')?.focus(); }
                if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('input')?.focus(); }
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#252525'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: ECOL[s.blockType]?.text || '#555', flexShrink: 0, display: 'inline-block' }} />
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
