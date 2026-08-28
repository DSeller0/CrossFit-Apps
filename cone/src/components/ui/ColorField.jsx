import { useId } from 'react'
import s from './ColorField.module.css'

// The one SPA color picker (#56/C2). Replaces the pattern that was duplicated
// byte-for-byte in Atletas' athlete-profile modal and Serviços' location form: a
// hidden `input[type=color]` + a proxy `<div onClick={() => document
// .getElementById('…').click()}>` + a free-text hex field. The proxy was mouse-only
// (no role, no tabIndex, no key handler) and needed a hardcoded global id, so two
// on one screen would have collided.
//
// Here the swatch IS the real `<input type="color">` — browsers render it as a
// swatch and give it keyboard operation for free — and `useId` keeps the label
// association unique. CLIENT-FREE (renders in the gallery).
//
// ⚠️ `src/index.css` still carries a GLOBAL `input[type=color]{width:0;height:0;
// opacity:0;position:absolute;pointer-events:none}` rule left over from that
// retired proxy. `.swatch[type='color']` is (0,2,0) and outranks it (0,1,1) on
// purpose — do NOT weaken this selector to a bare `.swatch`, which would tie and
// leave the winner up to stylesheet order. `gallery.html` doesn't load index.css,
// so the collision is invisible there; it only shows up inside the SPA.
//
//   label     required accessible label (string)
//   value     '#rrggbb' — may be a partial hex while the user types
//   onChange  (hex) => void; fires for both the swatch and the text field
const FULL_HEX = /^#[0-9a-fA-F]{6}$/
const PARTIAL_HEX = /^#?[0-9a-fA-F]{0,6}$/

export default function ColorField({
  label,
  value = '',
  onChange,
  // A LITERAL by necessity, not an untokenised colour: `input[type=color]` only
  // accepts a complete `#rrggbb` and rejects `var(--accent)` outright, reverting to
  // black. It is also the value the field is picking — data, not chrome. Callers
  // pass their own domain default (Atletas passes DEFAULT_ATHLETE_COLOR).
  fallback = '#4ac8c0',
  disabled = false,
  className = '',
  id,
}) {
  const auto = useId()
  const fieldId = id || auto
  const textId = `${fieldId}-hex`
  // The swatch needs a complete 7-char value or the native control rejects it and
  // silently reverts — so it shows `fallback` while the text field holds a partial.
  const swatchValue = FULL_HEX.test(value) ? value : fallback

  return (
    <div className={`${s.field} ${className}`.trim()}>
      <label htmlFor={fieldId} className={s.label}>
        {label}
      </label>
      <div className={s.row}>
        <input
          id={fieldId}
          type="color"
          className={s.swatch}
          value={swatchValue}
          disabled={disabled}
          onChange={e => onChange?.(e.target.value)}
        />
        <input
          id={textId}
          type="text"
          className={s.hex}
          value={value}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          aria-label={`${label} — código hexadecimal`}
          placeholder={fallback}
          onChange={e => {
            const next = e.target.value
            // Accept partial input so the field is typeable ("#4a" on the way to
            // "#4ac8c0"); reject anything that can never become a hex color.
            if (PARTIAL_HEX.test(next)) onChange?.(next.startsWith('#') ? next : '#' + next)
          }}
        />
      </div>
    </div>
  )
}
