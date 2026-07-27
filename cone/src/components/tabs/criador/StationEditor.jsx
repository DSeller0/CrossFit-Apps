import { useState } from 'react'
import { maskMMSS } from '../../../public/lib/wod.js'
import { ExerciseRow } from './ExerciseRow'
import { emptyEx, emptyStation } from './blockModel.js'
import MaskedTimeInput from '../../../public/shared/MaskedTimeInput.jsx'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import cr from './criador.module.css'

// ── StationEditor ─────────────────────────────────────────────────────────────
export function StationEditor({ block, onUpdate }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const stations = block.stations || []
  const noopDragRef = { current: null }

  const updBlock = patch => onUpdate({ ...block, ...patch })
  const updStation = (si, patch) =>
    updBlock({ stations: stations.map((s, i) => (i === si ? { ...s, ...patch } : s)) })

  const addStation = (isRest = false) => {
    const groupCount = stations.filter(s => !s.isRest).length
    const name = isRest ? 'Descanso' : `Grupo ${String.fromCharCode(65 + groupCount)}`
    updBlock({ stations: [...stations, emptyStation(name, isRest)] })
  }
  const delStation = si => updBlock({ stations: stations.filter((_, i) => i !== si) })

  const updStationEx = (si, exOrNull, fromIdx, toIdx) => {
    const ss = stations.map((s, i) => {
      if (i !== si) return s
      if (exOrNull === null) {
        const exs = [...s.exercises]
        const [mv] = exs.splice(fromIdx, 1)
        exs.splice(toIdx, 0, mv)
        return { ...s, exercises: exs }
      }
      return { ...s, exercises: s.exercises.map(e => (e.id === exOrNull.id ? exOrNull : e)) }
    })
    updBlock({ stations: ss })
  }
  const addStationEx = si =>
    updBlock({
      stations: stations.map((s, i) =>
        i === si ? { ...s, exercises: [...s.exercises, emptyEx()] } : s,
      ),
    })
  const delStationEx = (si, exId) =>
    updBlock({
      stations: stations.map((s, i) =>
        i === si ? { ...s, exercises: s.exercises.filter(e => e.id !== exId) } : s,
      ),
    })

  return (
    <div>
      {/* Cycle controls */}
      <div className="st-repeat-row">
        <Input
          className={cr.metaField}
          label="Repetições do ciclo"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="1"
          value={block.stationRepeat || 1}
          onChange={e => updBlock({ stationRepeat: parseInt(e.target.value) || 1 })}
        />
        {/* Already stored as mm:ss and read that way by stationsCapStr — so unlike
            block.duration this one is a straight swap to the masked field (#35). */}
        <MaskedTimeInput
          className={cr.metaFieldWide}
          label="Descanso entre ciclos"
          placeholder="02:00"
          value={block.restBetweenCycles || ''}
          onChange={v => updBlock({ restBetweenCycles: v })}
        />
      </div>

      {/* Station list */}
      {stations.map((st, si) => (
        <div
          key={st.id}
          className={`st-block${st.isRest ? ' st-rest' : ''}`}
          onDragOver={e => {
            e.preventDefault()
            setDragOverIdx(si)
          }}
          onDragLeave={() => setDragOverIdx(null)}
          onDrop={e => {
            e.preventDefault()
            setDragOverIdx(null)
            if (dragIdx !== null && dragIdx !== si) {
              const ss = [...stations]
              const [mv] = ss.splice(dragIdx, 1)
              ss.splice(si, 0, mv)
              updBlock({ stations: ss })
              setDragIdx(null)
            }
          }}
          style={{
            outline: dragOverIdx === si ? '2px solid var(--gold)' : 'none',
            outlineOffset: 2,
          }}
        >
          <div className="st-header">
            <i
              className="ti ti-grip-vertical"
              style={{ color: 'var(--dim)', fontSize: 13, cursor: 'grab', flexShrink: 0 }}
              role="button"
              tabIndex={0}
              aria-label={`Mover grupo ${si + 1} — setas ↑ ↓`}
              title="Arrastar grupo (ou ↑ ↓ pelo teclado)"
              onKeyDown={e => {
                const to = e.key === 'ArrowUp' ? si - 1 : e.key === 'ArrowDown' ? si + 1 : null
                if (to === null || to < 0 || to >= stations.length) return
                e.preventDefault()
                const ss = [...stations]
                const [mv] = ss.splice(si, 1)
                ss.splice(to, 0, mv)
                updBlock({ stations: ss })
              }}
              draggable
              onDragStart={() => setDragIdx(si)}
              onDragEnd={() => {
                setDragIdx(null)
                setDragOverIdx(null)
              }}
            />
            {st.isRest ? <span className="st-rest-badge">Descanso</span> : null}
            <input
              className="st-name-input"
              placeholder={st.isRest ? 'Descanso' : 'Nome do grupo'}
              value={st.name}
              onChange={e => updStation(si, { name: e.target.value })}
            />
            <input
              className="st-dur-input"
              placeholder="00:00"
              title="Duração (MM:SS)"
              inputMode="numeric"
              aria-label={`Duração do ${st.name || 'grupo'} (MM:SS)`}
              value={st.duration}
              onChange={e => updStation(si, { duration: maskMMSS(e.target.value) })}
            />
            <button
              type="button"
              className={`ex-mode-btn${st.isRest ? ' on' : ''}`}
              style={{ padding: '3px 8px', fontSize: 11 }}
              onClick={() =>
                updStation(si, { isRest: !st.isRest, exercises: st.isRest ? [emptyEx()] : [] })
              }
              title="Marcar como intervalo de descanso"
            >
              Descanso
            </button>
            {stations.length > 1 && (
              <Button
                size="xs"
                iconOnly
                variant="destructive"
                aria-label={`Remover ${st.name || 'grupo'}`}
                onClick={() => delStation(si)}
              >
                <i className="ti ti-x" />
              </Button>
            )}
          </div>

          {!st.isRest && (
            <div className="st-exercises">
              {(st.exercises || []).map((ex, ei) => (
                <ExerciseRow
                  key={ex.id}
                  ex={ex}
                  myIdx={ei}
                  blockLabel={block.label !== block.type ? block.label : null}
                  blockType={block.type}
                  ladderMode={false}
                  onUpdate={(exOrNull, fromIdx, toIdx) =>
                    updStationEx(si, exOrNull, fromIdx, toIdx)
                  }
                  onDelete={() => delStationEx(si, ex.id)}
                  canDelete={(st.exercises || []).length > 1}
                  dragIdx={noopDragRef}
                  setDragIdx={() => {}}
                  dragOverIdx={null}
                  setDragOverIdx={() => {}}
                />
              ))}
              <div className="blk-ex-actions" style={{ paddingTop: 4 }}>
                <Button size="sm" className={cr.grow} onClick={() => addStationEx(si)}>
                  <i className="ti ti-plus" /> Exercício
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add station buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Button size="sm" className={cr.grow} onClick={() => addStation(false)}>
          <i className="ti ti-plus" /> Grupo
        </Button>
        <Button size="sm" className={cr.grow} onClick={() => addStation(true)}>
          <i className="ti ti-clock-pause" /> Descanso
        </Button>
      </div>
    </div>
  )
}
