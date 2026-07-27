import { useState, useEffect } from 'react'
import Button from '../ui/Button.jsx'

// ── IntensityInput ────────────────────────────────────────────────────────────
// Shared by Criador (ghost/suggested defaults from the registry, via `ghostDefault`)
// and Exercícios (plain editor for the registry default itself — no ghost prop passed).
export default function IntensityInput({
  value,
  onChange,
  defaultReps,
  defaultSets,
  ghostDefault,
  ghostDismissed,
  onDismissGhost,
}) {
  const hasGhost =
    !!(ghostDefault && ghostDefault.mode && ghostDefault.mode !== 'none') &&
    (!value || !value.mode || value.mode === 'none') &&
    !ghostDismissed
  const displayMode =
    value?.mode && value.mode !== 'none' ? value.mode : hasGhost ? ghostDefault.mode : 'none'
  const isGhost = hasGhost

  const [mode, setMode] = useState(displayMode)
  useEffect(() => {
    setMode(displayMode)
  }, [displayMode])

  const v = value || {}
  const gv = isGhost ? ghostDefault : {}

  const promoteGhost = (patch = {}) => {
    const base =
      ghostDefault.mode === 'progression'
        ? { mode: 'progression', steps: (ghostDefault.steps || []).map(s => ({ ...s })) }
        : { ...ghostDefault }
    onChange({ ...base, ...patch })
  }

  const upd = p => {
    isGhost ? promoteGhost(p) : onChange({ ...v, mode, ...p })
  }

  const setM = m => {
    if (isGhost && m === mode) {
      promoteGhost()
      return
    }
    if (!isGhost && m === mode) {
      setMode('none')
      onChange(null)
      return
    }
    setMode(m)
    if (m === 'progression') {
      let steps
      if (v.steps?.length) {
        steps = v.steps
      } else {
        const numSets = parseInt(defaultSets) || 1
        steps = Array.from({ length: numSets }, () => ({
          reps: defaultReps || '',
          load: '',
          unit: '% do RM',
        }))
      }
      onChange({ mode: 'progression', steps })
    } else onChange({ ...v, mode: m })
  }
  // Token-only (#15): this renders inside the Criador, so a baked #111 painted a
  // dark box across both light themes.
  const inlineSelStyle = {
    fontFamily: 'inherit',
    fontSize: '11px',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-sm)',
    padding: '4px 6px',
    background: 'var(--bg)',
    color: 'var(--text)',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '66px',
  }
  const steps = isGhost ? gv.steps || [] : value?.steps || []
  const updStep = (i, field, val) => {
    if (isGhost) {
      promoteGhost({ steps: steps.map((s, j) => (j === i ? { ...s, [field]: val } : s)) })
      return
    }
    const ns = [...steps]
    ns[i] = { ...ns[i], [field]: val }
    onChange({ mode: 'progression', steps: ns })
  }
  const addStep = () =>
    onChange({
      mode: 'progression',
      steps: [
        ...steps,
        {
          reps: defaultReps || steps[steps.length - 1]?.reps || '',
          load: '',
          unit: steps[steps.length - 1]?.unit || '% do RM',
        },
      ],
    })
  const delStep = i => {
    if (steps.length <= 1) return
    onChange({ mode: 'progression', steps: steps.filter((_, j) => j !== i) })
  }

  return (
    <div className="int-block">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span className="lbl" style={{ marginBottom: 0 }}>
          Intensidade / Carga
        </span>
        {isGhost && (
          <span
            className="ighost-badge"
            title="Sugestão do registro — clique para descartar"
            onClick={e => {
              e.stopPropagation()
              onDismissGhost?.()
            }}
          >
            sugestão <i className="ti ti-x" />
          </span>
        )}
      </div>
      <div className="int-tabs">
        {[
          ['pct', '% RM'],
          ['progression', 'Progressão'],
          ['gender', 'M/F'],
        ].map(([m, l]) => {
          const active = mode === m
          return (
            /* No `✕` on the active tab — re-clicking it already clears the mode
               (setM), so the glyph was a second affordance for the same gesture and
               the coach read it as "close this panel". aria-pressed carries the
               state instead. */
            <button
              key={m}
              type="button"
              className={`itb${active ? (isGhost ? ' ighost' : ' iact') : ''}`}
              aria-pressed={active}
              onClick={() => setM(m)}
            >
              {l}
            </button>
          )
        })}
      </div>
      {mode === 'none' && (
        <div style={{ fontSize: 12, color: 'var(--dim)', padding: '2px 0' }}>
          Sem intensidade definida.
        </div>
      )}
      {mode === 'pct' && (
        <div className="fg">
          <span className="lbl">% do RM</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={110}
            placeholder={isGhost ? gv.pct || 'ex: 80' : 'ex: 80'}
            value={isGhost ? '' : v.pct || ''}
            onChange={e => upd({ pct: e.target.value })}
          />
        </div>
      )}
      {mode === 'progression' && (
        <div>
          <table className="prog-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Reps</th>
                <th>Carga</th>
                <th>Un.</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>
                    {i + 1}
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder={isGhost ? s.reps || defaultReps || '—' : defaultReps || '—'}
                      value={isGhost ? '' : (s.reps ?? '')}
                      onChange={e => updStep(i, 'reps', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder={isGhost ? s.load || '—' : '—'}
                      value={isGhost ? '' : s.load || ''}
                      onChange={e => updStep(i, 'load', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={s.unit || '% do RM'}
                      onChange={e => updStep(i, 'unit', e.target.value)}
                      style={inlineSelStyle}
                    >
                      <option>% do RM</option>
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isGhost && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Button size="sm" onClick={addStep}>
                <i className="ti ti-plus" /> Série
              </Button>
              {steps.length > 1 && (
                <Button
                  size="sm"
                  iconOnly
                  variant="destructive"
                  aria-label="Remover última série"
                  onClick={() => delStep(steps.length - 1)}
                >
                  <i className="ti ti-minus" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      {mode === 'gender' && (
        <div className="gblock">
          {['Masculino', 'Feminino'].map(g => (
            <div key={g}>
              <div className="gst">{g}</div>
              <div className="fg" style={{ marginBottom: 6 }}>
                <span className="lbl">Unidade</span>
                <select
                  style={{ ...inlineSelStyle, width: '100%' }}
                  value={(isGhost ? gv[`${g}_unit`] : v[`${g}_unit`]) || 'kg'}
                  onChange={e => upd({ [`${g}_unit`]: e.target.value })}
                >
                  <option>kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
              {['RX', 'Inter', 'SC'].map(cat => (
                <div key={cat} className="fg" style={{ marginBottom: 6 }}>
                  <span className="lbl">{cat}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder={isGhost ? gv[`${g}_${cat}`] || '0' : '0'}
                    value={isGhost ? '' : v[`${g}_${cat}`] || ''}
                    onChange={e => upd({ [`${g}_${cat}`]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
