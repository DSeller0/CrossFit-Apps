import { useId } from 'react'
import { SCALES, scaleLabel, isTimeBlock, expandMMSS } from '../lib/wod.js'
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
// ScoreInputs is the export that grows in steps 2–4 (DNF checkpoint, per-exercise notes,
// goal badge). Keep its prop surface deliberate.

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
        {blRounds > 0 && (
          <label className={s.field}>
            <span className={s.label}>Rounds completos de {blRounds} (DNF)</span>
            <input
              className={`${s.input} ${s.inputSm}`}
              type="number"
              min="0"
              max={blRounds}
              inputMode="numeric"
              placeholder={`0/${blRounds}`}
              value={value.perfRounds || ''}
              disabled={dis}
              onChange={e => onChange({ perfRounds: e.target.value })}
            />
          </label>
        )}
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
