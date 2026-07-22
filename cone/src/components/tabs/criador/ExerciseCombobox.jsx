import { useState, useEffect, useRef, useMemo } from 'react';
import { loadRegistry } from '../../../utils/storage';
import { ECOL } from '../../../utils/config';
import s from './criador.module.css';

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
    <div ref={ref} className={s.comboWrap}>
      <input
        className={s.comboInput}
        value={query}
        placeholder={placeholder}
        aria-label={placeholder || 'Nome do exercício'}
        role="combobox" aria-expanded={open} aria-autocomplete="list"
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); openDrop(); }}
        onFocus={openDrop}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'ArrowDown' && open && suggestions.length) ref.current?.querySelector('.ex-suggestion')?.focus();
        }}
      />
      {open && suggestions.length > 0 && dropRect && (
        <div ref={dropdownRef} className={s.comboDrop} role="listbox"
          style={{ top: dropRect.bottom + 2, left: dropRect.left, width: dropRect.width }}>
          {suggestions.map((sug, i) => (
            <div
              key={i} className={`ex-suggestion ${s.comboItem}`} tabIndex={0} role="option"
              onMouseDown={e => { e.preventDefault(); select(sug.name); }}
              onKeyDown={e => {
                if (e.key === 'Enter') select(sug.name);
                if (e.key === 'ArrowDown') e.currentTarget.nextSibling?.focus();
                if (e.key === 'ArrowUp') { const prev = e.currentTarget.previousSibling; prev ? prev.focus() : ref.current?.querySelector('input')?.focus(); }
                if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('input')?.focus(); }
              }}
            >
              {/* Registry-category colour — a data colour (it identifies the family
                  the exercise is registered under), so it stays a literal. */}
              <span className={s.comboDot} style={{ background: ECOL[sug.blockType]?.text || 'var(--muted)' }} />
              {sug.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
