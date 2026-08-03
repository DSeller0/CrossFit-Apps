import { blkColor, maskMMSS, expandMMSS } from '../lib/wod.js'
import { prBest } from '../lib/goals.js'
import { fmtDate } from '../lib/week.js'
import Sheet from './Sheet.jsx'
import { prValLabel, unitLabel, catToInputType } from './meHelpers.js'
import styles from './Me.module.css'

// The athlete's own PR log sheet (submit_pr / clear_pr). Extracted from Me.jsx (#52).
//
// It carries three flows: log a value, confirm a non-PR attempt ("didn't beat your
// best — save anyway?"), and confirm a destructive clear. The clear used to be a bare
// window.confirm() and its failure a window.alert() — both now render in-page, in the
// app's own language. Deliberately NOT the shared ConfirmReview component: that one
// doesn't exist yet and #54 (C0) owns minting it, so this stays local and small
// rather than becoming a fourth hand-rolled copy of it.
export default function PrLogSheet({
  open,
  onClose,
  valRef,
  name,
  cats,
  pr,
  unit,
  date,
  val,
  reps,
  goal,
  note,
  delta,
  pending,
  saving,
  saveResult,
  warn,
  onVal,
  onUnit,
  onDate,
  onReps,
  onGoal,
  onNote,
  onSave,
  onCancelPending,
}) {
  // Which unit toggle (if any) this exercise offers. Keyed off the PR's own type when
  // it has one, else inferred from its registry categories — NOT off the currently
  // selected unit, or picking "Tempo" would hide the toggle that switches back.
  const isDistCat = cats.some(c => c === 'Cardio')
  const inputType =
    pr?.type === 'time'
      ? 'time'
      : pr?.type === 'reps'
        ? 'reps'
        : pr?.type === 'load'
          ? 'load'
          : catToInputType(cats)
  const needsToggle = inputType === 'reps' && cats.some(c => ['Skill', 'Mobilidade'].includes(c))
  const showToggle = (isDistCat || needsToggle) && inputType !== 'time'

  const best = pr ? prBest(pr) : null
  const cat = cats[0]
  const catColor = cat ? blkColor({ type: cat }) : null

  const btnLabel =
    saveResult === 'pr'
      ? '✓ Novo PR!'
      : saveResult === 'saved'
        ? '✓ Salvo'
        : saving
          ? '...'
          : 'SALVAR'
  const btnCls =
    saveResult === 'pr' ? styles.lsBtnSavePr : saveResult === 'saved' ? styles.lsBtnSaveOk : ''

  const deltaTone =
    delta.tone === 'good'
      ? styles.toneGood
      : delta.tone === 'bad'
        ? styles.toneBad
        : delta.tone === 'first'
          ? styles.toneGood
          : styles.toneEven

  return (
    <Sheet open={open} onClose={onClose} titleId="prSheetTitle" initialFocus={valRef}>
      <div className={styles.lsHdr}>
        <div className={styles.lsHdrMain}>
          <h2 className={styles.lsExName} id="prSheetTitle">
            {name}
          </h2>
          {cat && (
            <span
              className={styles.lsCatPill}
              style={{
                background: `color-mix(in srgb, ${catColor} 13%, transparent)`,
                color: catColor,
                borderColor: `color-mix(in srgb, ${catColor} 27%, transparent)`,
              }}
            >
              {cat}
            </span>
          )}
        </div>
      </div>

      <div className={styles.lsBody}>
        <div className={styles.lsPrev}>
          {best
            ? 'Melhor: ' +
              prValLabel(best.value, pr) +
              (best.date ? ' · ' + fmtDate(best.date) : '')
            : 'Primeiro registro'}
        </div>

        {showToggle && (
          <div className={styles.lsToggle}>
            {isDistCat ? (
              <>
                <button
                  className={`${styles.lsTb}${unit !== 'time' ? ' ' + styles.lsTbAct : ''}`}
                  onClick={() => onUnit('m')}
                >
                  Distância
                </button>
                <button
                  className={`${styles.lsTb}${unit === 'time' ? ' ' + styles.lsTbAct : ''}`}
                  onClick={() => onUnit('time')}
                >
                  Tempo
                </button>
              </>
            ) : (
              <>
                <button
                  className={`${styles.lsTb}${unit === 'reps' ? ' ' + styles.lsTbAct : ''}`}
                  onClick={() => onUnit('reps')}
                >
                  Reps
                </button>
                <button
                  className={`${styles.lsTb}${unit === 'time' ? ' ' + styles.lsTbAct : ''}`}
                  onClick={() => onUnit('time')}
                >
                  Tempo
                </button>
              </>
            )}
          </div>
        )}

        <div className={styles.lsInpRow}>
          {unit === 'time' && (
            <label className={styles.lsInpWrap}>
              <input
                ref={valRef}
                type="text"
                inputMode="numeric"
                className={styles.lsInp}
                value={val}
                placeholder="00:00"
                onChange={e => onVal(maskMMSS(e.target.value))}
                onBlur={() => {
                  const done = expandMMSS(val)
                  if (done !== val) onVal(done)
                }}
              />
              <span className={styles.lsInpLbl}>Tempo (mm:ss)</span>
            </label>
          )}
          {unit === 'reps' && (
            <label className={styles.lsInpWrap}>
              <input
                ref={valRef}
                type="number"
                className={styles.lsInp}
                value={val}
                placeholder="0"
                step="1"
                min="0"
                onChange={e => onVal(e.target.value)}
              />
              <span className={styles.lsInpLbl}>Reps</span>
            </label>
          )}
          {unit === 'm' && (
            <label className={styles.lsInpWrap}>
              <input
                ref={valRef}
                type="number"
                className={styles.lsInp}
                value={val}
                placeholder="0"
                step="1"
                min="0"
                onChange={e => onVal(e.target.value)}
              />
              <span className={styles.lsInpLbl}>Distância (m)</span>
            </label>
          )}
          {unit === 'kg' && (
            <>
              <label className={styles.lsInpWrap}>
                <input
                  ref={valRef}
                  type="number"
                  className={styles.lsInp}
                  value={val}
                  placeholder="0"
                  step="0.5"
                  min="0"
                  onChange={e => onVal(e.target.value)}
                />
                <span className={styles.lsInpLbl}>Peso (kg)</span>
              </label>
              <label className={`${styles.lsInpWrap} ${styles.lsInpWrapNarrow}`}>
                <input
                  type="number"
                  className={styles.lsInp}
                  value={reps}
                  placeholder="—"
                  step="1"
                  min="1"
                  onChange={e => onReps(e.target.value)}
                />
                <span className={styles.lsInpLbl}>Reps</span>
              </label>
            </>
          )}
        </div>

        <div className={`${styles.lsDelta} ${deltaTone}`} aria-live="polite">
          {delta.txt}
        </div>

        <div className={styles.lsRow}>
          <label className={styles.lsLbl} htmlFor="prDate">
            Data
          </label>
          <input
            id="prDate"
            type="date"
            className={styles.lsDate}
            value={date}
            onChange={e => onDate(e.target.value)}
          />
        </div>

        <div className={styles.lsRow}>
          <label className={styles.lsLbl} htmlFor="prGoal">
            Objetivo
          </label>
          <input
            id="prGoal"
            className={styles.lsGoalInp}
            value={goal}
            placeholder={unit === 'time' ? '00:00' : '—'}
            onChange={e => onGoal(e.target.value)}
          />
          <span className={styles.lsUnit}>{unitLabel(unit)}</span>
        </div>

        <label className={styles.srOnly} htmlFor="prNote">
          Nota
        </label>
        <textarea
          id="prNote"
          className={styles.lsNote}
          rows="2"
          placeholder="Nota opcional..."
          value={note}
          onChange={e => onNote(e.target.value)}
        />

        {pending && (
          <div className={styles.lsConfirm} role="alert">
            Não bateu o recorde atual ({pending.bestStr}). Salvar como última tentativa?
            <div className={styles.lsConfirmBtns}>
              <button className={styles.lsBtnSec} onClick={onSave}>
                Salvar tentativa
              </button>
              <button className={styles.lsBtnCancel} onClick={onCancelPending}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {warn && (
          <div className={styles.lsWarn} role="alert">
            ⚠ {warn}
          </div>
        )}

        <div className={styles.lsActions}>
          <button className={styles.lsBtnCancel} onClick={onClose}>
            CANCELAR
          </button>
          <button
            className={`${styles.lsBtnSave} ${btnCls}`}
            disabled={!val.trim() || saving}
            onClick={onSave}
          >
            {btnLabel}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
