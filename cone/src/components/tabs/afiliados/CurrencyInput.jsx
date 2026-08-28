import { useState } from 'react'
import Input from '../../ui/Input.jsx'
import { toCentavos, centavosDisplay, digitsToCentavos } from './affiliateHelpers.js'

// A money field that formats as you type (#56/C2). Same centavos model as before —
// only the rendering moved onto the C0 `Input`, and the two pure halves moved into
// affiliateHelpers where they are tested.
//
// ⚠️ The prop→state re-sync below is adjusted DURING RENDER on purpose. That is
// React's documented replacement for a sync effect (react-hooks/set-state-in-effect)
// and the shape IntensityInput/ExerciseCombobox/TvController's weekStart all use.
// Do not "fix" it into a useEffect. Typing calls onChange, so `value` comes back
// changed and `incoming` then equals `centavos`: it re-syncs without fighting.
export default function CurrencyInput({ value, onChange, currency = 'R$', ...rest }) {
  const [centavos, setCentavos] = useState(() => toCentavos(value))
  const [prevValue, setPrevValue] = useState(value)
  if (prevValue !== value) {
    setPrevValue(value)
    const incoming = toCentavos(value)
    if (incoming !== centavos) setCentavos(incoming)
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={centavosDisplay(centavos, currency)}
      placeholder={`${currency} 0,00`}
      onChange={e => {
        const next = digitsToCentavos(e.target.value)
        setCentavos(next)
        onChange?.(next / 100)
      }}
      {...rest}
    />
  )
}
