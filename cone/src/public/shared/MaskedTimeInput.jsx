import { useId } from 'react'
import { maskMMSS } from '../lib/wod.js'
import s from './MaskedTimeInput.module.css'

// The one mm:ss field (#54/C0 · absorbs #35). Cross-surface: the confirm forks and
// the public timer/schedule time inputs all adopt it, so it lives in public/shared
// (client-free). Controlled — `onChange` receives the already-masked string, so the
// parent stores exactly what's shown and toSecs() reads it directly.
//
//   value/onChange  the masked 'MM:SS' string
//   label           optional real <label htmlFor>
//   error/hint      message under the field
export default function MaskedTimeInput({
  value = '',
  onChange,
  label,
  error = '',
  hint = '',
  id,
  placeholder = '12:34',
  className = '',
  ...rest
}) {
  const auto = useId()
  const fieldId = id || auto
  const msgId = `${fieldId}-msg`
  const describedBy = error || hint ? msgId : undefined
  return (
    <div className={`${s.field} ${className}`.trim()}>
      {label && (
        <label htmlFor={fieldId} className={s.label}>
          {label}
        </label>
      )}
      <input
        id={fieldId}
        className={`${s.control}${error ? ' ' + s.errored : ''}`}
        type="text"
        inputMode="numeric"
        // type="text" on iOS otherwise floats the autocorrect/predictive bar over what is a
        // digits-only field, and can substitute characters the mask then strips (#115).
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(maskMMSS(e.target.value))}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
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
