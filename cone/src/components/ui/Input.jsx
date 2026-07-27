import { useId } from 'react'
import s from './Input.module.css'

// The one SPA labelled field (#54/C0). Always renders a real <label htmlFor> — the
// fix for the placeholder-as-label habit across the tabs — plus ONE focus-visible
// ring in place of the ~14 hand-rolled :focus{border-color} variants. 16px value =
// no iOS zoom. CLIENT-FREE (renders in the gallery).
//
//   label   required accessible label (string)
//   error   red border + message under the field
//   hint    muted helper text (suppressed while error is shown)
//   as      'input' (default) | 'select' | 'textarea'
// Any other prop (value, onChange, type, placeholder, inputMode, disabled…) passes
// straight through to the control.
export default function Input({
  label,
  error = '',
  hint = '',
  as = 'input',
  id,
  className = '',
  children,
  ...rest
}) {
  const auto = useId()
  const fieldId = id || auto
  const msgId = `${fieldId}-msg`
  const Control = as
  const describedBy = error || hint ? msgId : undefined
  return (
    <div className={`${s.field} ${className}`.trim()}>
      {label && (
        <label htmlFor={fieldId} className={s.label}>
          {label}
        </label>
      )}
      <Control
        id={fieldId}
        className={`${s.control}${error ? ' ' + s.errored : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </Control>
      {error ? (
        <span id={msgId} className={s.error}>
          {error}
        </span>
      ) : (
        hint && (
          <span id={msgId} className={s.hint}>
            {hint}
          </span>
        )
      )}
    </div>
  )
}
