import { useId, useState } from 'react'
import {
  SCALES,
  scaleLabel,
  isTimeBlock,
  expandMMSS,
  blockExercises,
  repsBefore,
} from '../lib/wod.js'
import MaskedTimeInput from './MaskedTimeInput.jsx'
import s from './ScoreFields.module.css'

// ── ScoreFields (#115 · plans/52) ─────────────────────────────────────────────
// The one score-entry surface. Five surfaces hand-copied these fields —
// results/LogForm, schedule/LogPane, schedule/DeskRegPane, resultados/RegistroView and
// tv/ClassPanel — and had already drifted three ways: DeskRegPane lost the DNF field
// entirely, ClassPanel wrote 'Rx'/'Sc'/'Adp' instead of canonical SCALES, and every one of
// them used a raw text box for the time. That last one was not cosmetic: 9 of 16 logged
// times in prod had no colon, and toSecs reads a colonless value as raw SECONDS, so `1400`
// ranked as 23:20 (docs/reviews/115-results-audit.md).
//
// Client-free by rule — the gallery renders this, so no Supabase import, direct or
// transitive (same constraint as RankList / ExerciseList). No `ti` webfont either:
// leaderboard.html doesn't load it. This file needs no icons at all.
//
// `value` is the DEF_INP() shape ({ rpe, scale, perfTime, perfRounds, perfReps }) and
// `onChange` takes a PARTIAL patch, matching how Results.jsx's setInp(sid, bid, {...})
// already works — one callback instead of the five onPerfX props DeskRegPane had.
//
// ScoreInputs is the export that grows across the result-fidelity chain — DNF checkpoint
// (#112) and per-exercise notes (#116) both live inside it, so every consumer that renders
// ScoreInputs directly (RegistroView) gets each new piece for free, same as one that renders
// the composed default (LogForm/LogPane/DeskRegPane). The goal badge (#117) turned out to
// belong on the READ side instead (RankList/the success modal/TV) — nothing here. Keep its
// prop surface deliberate.

const RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// `short` renders SCALE_SHORT ("Adaptado" → "Adap") for tight rows like TvController's roster —
// the display-only shortening scaleLabel() exists for. The STORED value is always canonical.
export function ScaleRow({ value, onChange, disabled, size = 'md', label = 'Escala', short }) {
  const id = useId()
  return (
    <div className={`${s.group}${size === 'sm' ? ' ' + s.sm : ''}`}>
      {label && (
        <span className={s.label} id={id}>
          {label}
        </span>
      )}
      <div
        className={s.scaleRow}
        role="group"
        aria-label={label ? undefined : 'Escala'}
        aria-labelledby={label ? id : undefined}
      >
        {SCALES.map(sc => (
          <button
            key={sc}
            type="button"
            disabled={disabled || undefined}
            aria-pressed={value === sc}
            aria-label={short ? sc : undefined}
            className={`${s.scaleBtn}${value === sc ? ' ' + s.on : ''}`}
            onClick={() => onChange(sc)}
          >
            {short ? scaleLabel(sc) : sc}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RpeRow({ value, onChange, disabled, size = 'md', label = 'RPE (1–10)' }) {
  const id = useId()
  return (
    <div className={`${s.group}${size === 'sm' ? ' ' + s.sm : ''}`}>
      {label && (
        <span className={s.label} id={id}>
          {label}
        </span>
      )}
      <div className={s.rpeRow} role="group" aria-labelledby={label ? id : undefined}>
        {RPE.map(n => (
          <button
            key={n}
            type="button"
            disabled={disabled || undefined}
            aria-pressed={value === n}
            className={`${s.rpeBtn}${value === n ? ' ' + s.on : ''}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// The mm:ss field, with the blur contract in ONE place so every surface gets it.
//
// maskMMSS fills from the right, so one or two digits come back untouched ('14' stays '14',
// which toSecs reads as 14 SECONDS — prod held exactly that). expandMMSS completes it on BLUR,
// never on change, where it would fight the right-fill and make '1','2','3' → '1:23'
// unreachable. Any surface typing a WOD time uses this, not MaskedTimeInput directly.
export function TimeField({ value, onChange, label, disabled, className, ...rest }) {
  return (
    <MaskedTimeInput
      className={className}
      label={label}
      placeholder="12:34"
      value={value || ''}
      disabled={disabled}
      onChange={v => onChange(v)}
      onBlur={() => {
        const done = expandMMSS(value)
        if (done !== value) onChange(done)
      }}
      {...rest}
    />
  )
}

// The DNF/checkpoint entry (#112 · plans/54) — where the athlete actually landed. One
// component, two labellings, not two shapes: a For Time result has a checkpoint because it
// DIDN'T finish ("Não terminei"); an AMRAP never DNFs — every result is "finished" at the
// cap, so its checkpoint is merely "Onde parou". Revealed by a toggle, never inferred from an
// empty Tempo — most results finish, and this feature exists precisely because an empty time
// field means "hasn't typed it yet" just as often as "capped".
//
// `timeBlock` decides three things: the toggle wording, whether "Rounds completos de N" shows
// at all (an AMRAP's own Rounds field above already IS that number — no prescribed total to
// compare it to, so no N), and whether `finished` gets written (only a time block has a
// meaningful "did they finish" at all).
function CheckpointFields({ block, rounds, timeBlock, value, onChange, disabled, size }) {
  const exs = blockExercises(block)
  const cp = value.checkpoint
  const dis = disabled || undefined
  const wrap = `${s.group}${size === 'sm' ? ' ' + s.sm : ''}`

  function openCheckpoint() {
    const exIdx = 0
    const exName = exs[0]?.name || ''
    if (timeBlock) {
      // N falls back to 1 where the coach set no rounds at all — a chipper (one long list of
      // exercises, done once through) is one round, not a hidden field.
      const roundsTotal = Number(rounds) || 1
      onChange({
        checkpoint: { roundsDone: 0, roundsTotal, exIdx, exName, exReps: 0 },
        finished: 0 === roundsTotal,
        perfRounds: '0',
      })
    } else {
      onChange({ checkpoint: { exIdx, exName, exReps: 0 } })
    }
  }

  function closeCheckpoint() {
    const patch = { checkpoint: undefined }
    if (timeBlock) {
      patch.finished = undefined
      patch.perfRounds = ''
    }
    onChange(patch)
  }

  function update(fields) {
    const next = { ...cp, ...fields }
    const patch = { checkpoint: next }
    if (timeBlock) {
      patch.finished = Number(next.roundsDone) === Number(next.roundsTotal)
      patch.perfRounds = String(next.roundsDone)
    }
    // perfReps is DERIVED, never guessed (#112) — repsBefore sums the preceding
    // exercises' prescribed reps. It returns null the moment one of them isn't a plain
    // integer (a rep scheme, a dist/cal movement) — recomputed on EVERY field change
    // (not just when exIdx itself changes) and cleared to '' rather than left showing a
    // stale total from a since-changed exercise: typing exReps before picking the
    // exercise, then picking one repsBefore can't resolve, must not leave the earlier
    // guess sitting there looking authoritative.
    const rb = repsBefore(block, Number(next.exIdx) || 0)
    patch.perfReps = rb !== null ? String(rb + (Number(next.exReps) || 0)) : ''
    onChange(patch)
  }

  const rb = cp ? repsBefore(block, Number(cp.exIdx) || 0) : null

  return (
    <div className={wrap}>
      <button
        type="button"
        className={s.checkpointToggle}
        aria-pressed={!!cp}
        disabled={dis}
        onClick={() => (cp ? closeCheckpoint() : openCheckpoint())}
      >
        {timeBlock ? 'Não terminei' : 'Onde parou'}
      </button>
      {cp && (
        <div className={s.checkpointBody}>
          {timeBlock && (
            <label className={s.field}>
              <span className={s.label}>Rounds completos de {cp.roundsTotal}</span>
              <input
                className={`${s.input} ${s.inputSm}`}
                type="number"
                min="0"
                max={cp.roundsTotal}
                inputMode="numeric"
                value={cp.roundsDone}
                disabled={dis}
                onChange={e => update({ roundsDone: e.target.value })}
              />
            </label>
          )}
          {exs.length > 0 && (
            <label className={s.field}>
              <span className={s.label}>Parou em</span>
              <select
                className={s.input}
                value={cp.exIdx}
                disabled={dis}
                onChange={e => {
                  const exIdx = Number(e.target.value)
                  update({ exIdx, exName: exs[exIdx]?.name || '' })
                }}
              >
                {exs.map((ex, i) => (
                  <option key={i} value={i}>
                    {ex.name || `Exercício ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={s.field}>
            <span className={s.label}>Reps desse exercício</span>
            <input
              className={`${s.input} ${s.inputSm}`}
              type="number"
              min="0"
              inputMode="numeric"
              value={cp.exReps}
              disabled={dis}
              onChange={e => update({ exReps: e.target.value })}
            />
          </label>
          {rb !== null && (
            <div className={s.checkpointCalc}>≈ {rb + (Number(cp.exReps) || 0)} reps no total</div>
          )}
        </div>
      )}
    </div>
  )
}

// Per-exercise adaptation notes (#116) — revealed only when the logged scale isn't RX
// (deriveScale already reports the block-level scale; this never writes a `scale` key of
// its own, so that signal stays exactly as dormant as it is today). One row per exercise,
// each a toggle plus a text field revealed only when toggled — not N always-open boxes,
// because eight free-text fields on a phone after a workout is how a field goes
// permanently empty (the energy_level/#66 failure mode, arrived at from the other
// direction). `blockExercises(block)` is what already flattens Estações' stations.
//
// A row with a real note is always shown open — derived straight from `value.exerciseRows`,
// so switching which athlete/block a mounted form is editing can never leave a stale note
// visible. A row toggled open with nothing typed yet is local-only UI state (`openIds`):
// closing it, or leaving it empty at submit time, writes nothing — an all-empty
// `exerciseRows` collapses to `undefined`, never an array of hollow `{note:''}` objects.
function ExerciseNotesRows({ block, value, onChange, disabled, size }) {
  const exs = blockExercises(block)
  const rows = value.exerciseRows || []
  const [openIds, setOpenIds] = useState(() => new Set())
  const dis = disabled || undefined

  if (!exs.length || !value.scale || value.scale === 'RX') return null

  function commit(next) {
    onChange({ exerciseRows: next.length ? next : undefined })
  }

  function toggle(exId) {
    if (rows.some(r => r.exId === exId)) {
      // Closing a row that already has a note discards it — same "abandon = clear"
      // contract as CheckpointFields' close button.
      commit(rows.filter(r => r.exId !== exId))
      return
    }
    setOpenIds(prev => {
      const next = new Set(prev)
      next.has(exId) ? next.delete(exId) : next.add(exId)
      return next
    })
  }

  function setNote(exId, name, note) {
    const filtered = rows.filter(r => r.exId !== exId)
    commit(note.trim() ? [...filtered, { exId, name, note }] : filtered)
  }

  return (
    <div className={`${s.group}${size === 'sm' ? ' ' + s.sm : ''}`}>
      <span className={s.label}>O que foi adaptado?</span>
      <div className={s.notesList}>
        {exs.map((ex, i) => {
          const exId = ex.id || `i${i}`
          const row = rows.find(r => r.exId === exId)
          const open = !!row || openIds.has(exId)
          return (
            <div key={exId} className={s.notesRow}>
              <button
                type="button"
                className={s.notesToggle}
                aria-pressed={open}
                disabled={dis}
                onClick={() => toggle(exId)}
              >
                {ex.name || `Exercício ${i + 1}`}
              </button>
              {open && (
                <input
                  className={s.input}
                  type="text"
                  placeholder="O que foi adaptado…"
                  value={row?.note || ''}
                  disabled={dis}
                  onChange={e => setNote(exId, ex.name || '', e.target.value)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// The time-vs-rounds fork, and the only place a WOD time is typed anywhere in the app.
//
// `block` is the full block when the caller has it; `blockType`/`rounds` are the escape hatch
// for callers that don't (RegistroView holds blockType on the logged entry, ClassPanel has
// only the running timer's type).
export function ScoreInputs({
  block,
  blockType = block?.type,
  rounds = block?.rounds,
  value,
  onChange,
  disabled,
  size = 'md',
  timeLabel = 'Tempo (MM:SS)',
}) {
  const blRounds = Number(rounds) || 0
  const dis = disabled || undefined
  const wrap = `${s.scoreWrap}${size === 'sm' ? ' ' + s.sm : ''}`

  if (isTimeBlock(blockType)) {
    return (
      <div className={wrap}>
        <TimeField
          className={s.timeField}
          label={timeLabel}
          value={value.perfTime}
          disabled={dis}
          onChange={v => onChange({ perfTime: v })}
        />
        <CheckpointFields
          block={block}
          rounds={blRounds}
          timeBlock
          value={value}
          onChange={onChange}
          disabled={dis}
          size={size}
        />
        <ExerciseNotesRows
          block={block}
          value={value}
          onChange={onChange}
          disabled={dis}
          size={size}
        />
      </div>
    )
  }

  return (
    <div className={wrap}>
      <div className={s.numRow}>
        <label className={s.field}>
          <span className={s.label}>Rounds</span>
          <input
            className={`${s.input} ${s.inputSm}`}
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="0"
            value={value.perfRounds || ''}
            disabled={dis}
            onChange={e => onChange({ perfRounds: e.target.value })}
          />
        </label>
        <label className={s.field}>
          <span className={s.label}>Reps</span>
          <input
            className={`${s.input} ${s.inputSm}`}
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="0"
            value={value.perfReps || ''}
            disabled={dis}
            onChange={e => onChange({ perfReps: e.target.value })}
          />
        </label>
      </div>
      <CheckpointFields
        block={block}
        rounds={blRounds}
        timeBlock={false}
        value={value}
        onChange={onChange}
        disabled={dis}
        size={size}
      />
      <ExerciseNotesRows
        block={block}
        value={value}
        onChange={onChange}
        disabled={dis}
        size={size}
      />
    </div>
  )
}

// The composed default: RPE · Escala · score. The order the three form surfaces already used.
export default function ScoreFields({ block, blockType, rounds, value, onChange, disabled, size }) {
  return (
    <>
      <RpeRow
        value={value.rpe}
        onChange={n => onChange({ rpe: n })}
        disabled={disabled}
        size={size}
      />
      <ScaleRow
        value={value.scale}
        onChange={sc => onChange({ scale: sc })}
        disabled={disabled}
        size={size}
      />
      <ScoreInputs
        block={block}
        blockType={blockType}
        rounds={rounds}
        value={value}
        onChange={onChange}
        disabled={disabled}
        size={size}
      />
    </>
  )
}
