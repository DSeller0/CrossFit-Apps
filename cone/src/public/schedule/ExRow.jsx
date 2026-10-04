import { useRef, useEffect } from 'react'
import styles from './Schedule.module.css'
import { exVolStr, fmtIntensity, progressionGroupUnit } from '../lib/wod.js'
import { resolveExercise } from '../lib/registry.js'
import { onKey, progGroups, usesRm, calcFromRm } from './scheduleHelpers.js'
import RdCounter from './RdCounter.jsx'

// The RM chip and the inline RM entry that every RM-aware row shape shares (complex,
// progression, plain %RM) — one copy, so a new shape can't drift them a third way (#231). The chip
// has a line to itself, so its label says what it is: `RM` until one is known, then `RM · 100 kg`.
function RmChip({ exRm, onToggle }) {
  return (
    <button
      className={`${styles.rmChip}${exRm ? ' ' + styles.rmChipHasRm : ''}`}
      onClick={e => {
        e.stopPropagation()
        onToggle()
      }}
    >
      {exRm ? `RM · ${exRm.rm} ${exRm.unit || 'kg'}` : 'RM'}
    </button>
  )
}

function RmInput({ inputRef, unitRef, exRm, onConfirm }) {
  return (
    <div className={styles.rmInputWrap} onClick={e => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="number"
        className={styles.rmInput}
        placeholder="100"
        min="1"
        step="1"
        inputMode="numeric"
        defaultValue={exRm?.rm || ''}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
            onConfirm()
          }
        }}
      />
      <select
        ref={unitRef}
        className={styles.rmUnitSel}
        defaultValue={exRm?.unit || 'kg'}
        onClick={e => e.stopPropagation()}
      >
        <option value="kg">kg</option>
        <option value="lbs">lbs</option>
      </select>
      <button className={styles.rmConfirmBtn} onClick={onConfirm} aria-label="Confirmar RM">
        ✓
      </button>
    </div>
  )
}

// The name line, shared by every row shape: volume pill + name on the left, `Demo` on the right.
// It WRAPS (see .detailExHead): the left group is never squeezed below its longest word, so if
// `Demo` ever doesn't fit beside it, it drops to its own right-aligned line instead of crushing or
// overlapping the name. The slot is only rendered when there is something in it.
function ExHead({ vol, name, struck, children }) {
  return (
    <div className={styles.detailExHead}>
      <div className={styles.detailExMain}>
        {vol && <span className={styles.pillVol}>{vol}</span>}
        <div className={`${styles.detailExName}${struck ? ' ' + styles.detailExNameDone : ''}`}>
          {name}
        </div>
      </div>
      {children && <div className={styles.detailExActs}>{children}</div>}
    </div>
  )
}

// What sits under the name, one line each and always in this order (#231): `RM` — only where the
// load is a % of the athlete's RM — and, while it is being typed, its entry; the load as prescribed;
// then the load worked out from the athlete's RM once there is one. On a complex row it follows the
// movements. Each line is its own row at any width, so nothing can sit beside another and collide.
function LoadLines({
  showRm,
  exRm,
  editing,
  inputRef,
  unitRef,
  onRmToggle,
  onRmConfirm,
  load,
  loadIsPct,
  calc,
}) {
  if (!showRm && !load && !calc) return null
  return (
    <div className={styles.rmVolRow}>
      {showRm && <RmChip exRm={exRm} onToggle={onRmToggle} />}
      {showRm && editing && (
        <RmInput inputRef={inputRef} unitRef={unitRef} exRm={exRm} onConfirm={onRmConfirm} />
      )}
      {load && <span className={loadIsPct ? styles.pillVol : styles.pillWt}>{load}</span>}
      {calc && (
        <span className={exRm?.source === 'auto' ? styles.pillVol : styles.pillWt}>{calc}</span>
      )}
    </div>
  )
}

// ── Exercise Row ──────────────────────────────────────────────────────────────
// Every shape reads BY LINE (#231): the name line carries the volume, the name and `Demo`; under
// it come `RM` (only where it applies), the load, and the load worked out from that RM — see
// LoadLines. A gender load (`M: 32/24 kg | F: 24/16 kg`) used to share the name's line and, at
// phone width, crushed the name onto the pills beside it.
export default function ExRow({
  ex,
  bl,
  isWod,
  isRd,
  checked,
  roundState,
  rmValues,
  rmEditKey,
  demoMap,
  onCheck,
  onAdvance,
  onReset,
  onRmToggle,
  onRmConfirm,
  onDemo,
}) {
  const key = `${bl.id}|${ex.id}`,
    done = checked.has(key)
  const isProg = !ex.isComplex && ex.intensity?.mode === 'progression'
  const vol = exVolStr(ex),
    ins = fmtIntensity(ex.intensity)
  const exData = resolveExercise(ex.name, demoMap) || {}
  const hasDemo = !!(exData.videoUrl || exData.description || exData.muscles)
  // `RM` only where the load is a % of the athlete's RM — a kg progression or a gender load has
  // nothing to compute from one.
  const hasRm = usesRm(ex)

  const rmInputRef = useRef(null)
  const unitSelRef = useRef(null)
  useEffect(() => {
    if (rmEditKey === ex.id && rmInputRef.current) {
      rmInputRef.current.focus()
      if (rmInputRef.current.value) rmInputRef.current.select()
    }
  }, [rmEditKey, ex.id])

  function confirmRm(e) {
    e?.preventDefault()
    e?.stopPropagation()
    const num = parseFloat(rmInputRef.current?.value)
    if (num > 0) onRmConfirm(ex.id, num, unitSelRef.current?.value || 'kg')
    else onRmToggle(ex.id)
  }

  if (ex.isComplex) {
    const mvs = (ex.complexMovements || []).filter(m => m.name)
    const notation = (ex.complexMovements || []).map(m => m.reps || '?').join('+')
    const displayName = ex.name || mvs.map(m => m.name).join(' + ') || 'Complexo'
    const sets = ex.sets || ''
    const volStr = [sets, notation ? `(${notation})` : ''].filter(Boolean).join('×')
    const cxIsProg = ex.intensity?.mode === 'progression'
    const cxIsPct = ex.intensity?.mode === 'pct'
    const exRm = rmValues[ex.id]
    let loadStr = '',
      calcStr = ''
    if (cxIsProg) {
      const steps = ex.intensity?.steps || [],
        unit = progressionGroupUnit(ex)
      const loads = steps.map(s => s.load).filter(Boolean)
      if (loads.length) loadStr = loads.join(' / ') + ' ' + unit
      const pctNums = loads.map(l => parseFloat(l)).filter(n => !isNaN(n))
      if (unit === '% RM') calcStr = calcFromRm(exRm, pctNums)
    } else if (cxIsPct) {
      const pctNum = parseFloat(ex.intensity?.pct)
      if (ex.intensity?.pct) loadStr = ex.intensity.pct + '% RM'
      calcStr = calcFromRm(exRm, isNaN(pctNum) ? [] : [pctNum])
    } else if (ins) {
      loadStr = ins
    }
    const hasDemoCx = mvs.some(m => {
      const d = resolveExercise(m.name, demoMap) || {}
      return !!(d.videoUrl || d.description || d.muscles)
    })
    const mvNames = mvs.map(m => m.name)
    return (
      <div className={styles.detailEx} onClick={e => e.stopPropagation()}>
        {!isWod &&
          (isRd ? (
            <RdCounter
              blId={bl.id}
              exId={ex.id}
              total={Number(bl.rounds)}
              cur={roundState[`${bl.id}|${ex.id}`] || 0}
              onAdvance={() => onAdvance(bl.id, ex.id, Number(bl.rounds))}
              onReset={() => onReset(bl.id, ex.id)}
            />
          ) : (
            <div
              className={`${styles.detailExCheck}${done ? ' ' + styles.detailExCheckDone : ''}`}
              role="checkbox"
              aria-checked={done}
              tabIndex={0}
              aria-label={`Concluir ${displayName}`}
              onClick={() => onCheck(bl.id, ex.id)}
              onKeyDown={onKey(() => onCheck(bl.id, ex.id))}
            />
          ))}
        <div className={styles.detailExBody}>
          <ExHead vol={volStr} name={displayName} struck={!isWod && done}>
            <button
              className={`${styles.demoBtn}${hasDemoCx ? '' : ' ' + styles.demoBtnNoDemo}`}
              onClick={e => {
                e.stopPropagation()
                onDemo(mvNames.map(n => ({ name: n })))
              }}
              disabled={!hasDemoCx}
            >
              Demo
            </button>
          </ExHead>
          {mvs.map((m, mi) => (
            <div key={mi} className={styles.detailExMovement}>
              · {[m.reps ? m.reps + '×' : '', m.name].filter(Boolean).join(' ')}
            </div>
          ))}
          <LoadLines
            showRm={hasRm}
            exRm={exRm}
            editing={rmEditKey === ex.id}
            inputRef={rmInputRef}
            unitRef={unitSelRef}
            onRmToggle={() => onRmToggle(ex.id)}
            onRmConfirm={confirmRm}
            load={loadStr}
            loadIsPct={loadStr.includes('%')}
            calc={calcStr}
          />
          {ex.note && <div className={styles.detailExNote}>{ex.note}</div>}
        </div>
      </div>
    )
  }

  if (isProg) {
    const groups = progGroups(ex)
    const exRm = rmValues[ex.id]
    return (
      <>
        {groups.map((g, gi) => {
          const repsPrefix = ex.dist
            ? exVolStr(ex)
            : ex.sets && g.reps
              ? `${g.sets || ex.sets}×${g.reps}`
              : g.reps
          // #209 — a group in kg is a plain load: no `% RM` label, no computed load.
          const unit = progressionGroupUnit(ex, g.reps)
          const isPctUnit = unit === '% RM'
          const nums = g.loads.map(l => parseFloat(l)).filter(n => !isNaN(n))
          const loadStr = nums.length ? nums.join('/') + (isPctUnit ? '% RM' : ' ' + unit) : ''
          const calcStr = isPctUnit ? calcFromRm(exRm, nums) : ''
          const lineKey = `${bl.id}|${ex.id}-${gi}`,
            lineDone = checked.has(lineKey)
          const hasDemoPg = gi === 0 && !!(exData.videoUrl || exData.description || exData.muscles)
          return (
            <div key={gi} className={styles.detailEx} onClick={e => e.stopPropagation()}>
              {!isWod &&
                (isRd ? (
                  <RdCounter
                    blId={bl.id}
                    exId={`${ex.id}-${gi}`}
                    total={Number(bl.rounds)}
                    cur={roundState[`${bl.id}|${ex.id}-${gi}`] || 0}
                    onAdvance={() => onAdvance(bl.id, `${ex.id}-${gi}`, Number(bl.rounds))}
                    onReset={() => onReset(bl.id, `${ex.id}-${gi}`)}
                  />
                ) : (
                  <div
                    className={`${styles.detailExCheck}${lineDone ? ' ' + styles.detailExCheckDone : ''}`}
                    role="checkbox"
                    aria-checked={lineDone}
                    tabIndex={0}
                    aria-label={`Concluir ${ex.name}`}
                    onClick={() => onCheck(bl.id, `${ex.id}-${gi}`)}
                    onKeyDown={onKey(() => onCheck(bl.id, `${ex.id}-${gi}`))}
                  />
                ))}
              <div className={styles.detailExBody}>
                <ExHead vol={repsPrefix} name={ex.name} struck={!isWod && lineDone}>
                  {gi === 0 && (
                    <button
                      className={`${styles.demoBtn}${hasDemoPg ? '' : ' ' + styles.demoBtnNoDemo}`}
                      onClick={e => {
                        e.stopPropagation()
                        onDemo([{ name: ex.name }])
                      }}
                      disabled={!hasDemoPg}
                    >
                      Demo
                    </button>
                  )}
                </ExHead>
                {/* One RM per exercise, so one chip: under the first group's name. */}
                <LoadLines
                  showRm={gi === 0 && hasRm}
                  exRm={exRm}
                  editing={rmEditKey === ex.id}
                  inputRef={rmInputRef}
                  unitRef={unitSelRef}
                  onRmToggle={() => onRmToggle(ex.id)}
                  onRmConfirm={confirmRm}
                  load={loadStr}
                  loadIsPct={isPctUnit}
                  calc={calcStr}
                />
                {gi === 0 && ex.note && <div className={styles.detailExNote}>{ex.note}</div>}
              </div>
            </div>
          )
        })}
      </>
    )
  }

  // Plain row: `hasRm` here means a %RM load (75% → an RM line, and the computed kg once an RM is
  // known); a gender load or an absolute one has no RM line and just sits under the name.
  const exRm = rmValues[ex.id]
  const calcStr = hasRm ? calcFromRm(exRm, [parseFloat(ex.intensity.pct)]) : ''
  return (
    <div className={styles.detailEx} onClick={e => e.stopPropagation()}>
      {!isWod &&
        (isRd ? (
          <RdCounter
            blId={bl.id}
            exId={ex.id}
            total={Number(bl.rounds)}
            cur={roundState[`${bl.id}|${ex.id}`] || 0}
            onAdvance={() => onAdvance(bl.id, ex.id, Number(bl.rounds))}
            onReset={() => onReset(bl.id, ex.id)}
          />
        ) : (
          <div
            className={`${styles.detailExCheck}${done ? ' ' + styles.detailExCheckDone : ''}`}
            role="checkbox"
            aria-checked={done}
            tabIndex={0}
            aria-label={`Concluir ${ex.name}`}
            onClick={() => onCheck(bl.id, ex.id)}
            onKeyDown={onKey(() => onCheck(bl.id, ex.id))}
          />
        ))}
      <div className={styles.detailExBody}>
        <ExHead vol={vol} name={ex.name} struck={!isWod && done}>
          <button
            className={`${styles.demoBtn}${hasDemo ? '' : ' ' + styles.demoBtnNoDemo}`}
            onClick={e => {
              e.stopPropagation()
              onDemo([{ name: ex.name }])
            }}
            disabled={!hasDemo}
          >
            Demo
          </button>
        </ExHead>
        <LoadLines
          showRm={hasRm}
          exRm={exRm}
          editing={rmEditKey === ex.id}
          inputRef={rmInputRef}
          unitRef={unitSelRef}
          onRmToggle={() => onRmToggle(ex.id)}
          onRmConfirm={confirmRm}
          load={ins}
          loadIsPct={!!ins?.includes('%')}
          calc={calcStr}
        />
        {ex.note && <div className={styles.detailExNote}>{ex.note}</div>}
      </div>
    </div>
  )
}
