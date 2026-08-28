import TallyBar from '../../../public/shared/TallyBar.jsx'
import { initials } from '../../../public/me/meHelpers.js'
import { DEFAULT_ATHLETE_COLOR } from './atletasHelpers.js'
import s from './Atletas.module.css'

// One card in the grade (#160/plans/76) — 1:1 prep, not a roster entry. Four
// signals answer "does the coach need to talk to this athlete before the next
// class": últ. sessão, aderência (+ trend), sem feedback, objetivo (or "parado há
// N sem" when its newest hit milestone has gone stale). Any signal can be
// null — a brand-new athlete has never logged, never been noted, may have no
// open goal — and renders as "—" rather than a misleading 0/hoje/0%.
//
// 🔴 The goal TallyBar spans the full card width with its caption on the line
// below, not sharing a row with the label — see the plan's rationale: a bar
// squeezed beside text of varying length isn't scannable across a 2-up grid of
// many cards. `signals` is precomputed by the container (goalSignal/adherence/
// lastSessionSignal/daysSinceNote in atletasHelpers.js) — no client, no clock.
// CLIENT-FREE.
export default function AthleteCard({ athlete, signals = {}, selected = false, onClick }) {
  const color = athlete.color || DEFAULT_ATHLETE_COLOR
  const { lastSession, adherence, daysSinceFeedback, goal } = signals

  return (
    <button
      type="button"
      className={`${s.card}${selected ? ' ' + s.cardOn : ''}`}
      style={{ borderLeftColor: color }}
      aria-current={selected ? 'true' : undefined}
      onClick={onClick}
    >
      <div className={s.cardHdr}>
        <span
          className={s.cardAvatar}
          style={{ background: `color-mix(in srgb, ${color} 22%, transparent)`, color }}
          aria-hidden="true"
        >
          {initials(athlete.name)}
        </span>
        <span className={s.cardName}>{athlete.name}</span>
        {athlete.level && <span className={s.cardLevel}>{athlete.level}</span>}
      </div>

      <div className={s.cardSignals}>
        <div className={s.cardSignal}>
          <div className={s.cardSignalLbl}>Últ. sessão</div>
          <div className={s.cardSignalVal}>{lastSession?.label || '—'}</div>
        </div>
        <div className={s.cardSignal}>
          <div className={s.cardSignalLbl}>Aderência</div>
          <div className={s.cardSignalVal}>
            {adherence ? `${adherence.pct}%` : '—'}
            {adherence?.trend === 'up' && <span className={s.trendUp}> ↑</span>}
            {adherence?.trend === 'down' && <span className={s.trendDown}> ↓</span>}
          </div>
        </div>
        <div className={s.cardSignal}>
          <div className={s.cardSignalLbl}>Sem feedback</div>
          <div className={s.cardSignalVal}>{daysSinceFeedback?.label || '—'}</div>
        </div>
        <div className={s.cardSignal}>
          <div className={s.cardSignalLbl}>Objetivo</div>
          <div className={s.cardSignalVal}>
            {goal
              ? goal.stalledWeeks
                ? `parado há ${goal.stalledWeeks} sem`
                : `${goal.pct}%`
              : '—'}
          </div>
        </div>
      </div>

      {goal && (
        <div className={s.cardGoalCol}>
          <TallyBar pct={goal.pct} color={color} />
          <div className={s.cardGoalCaption}>
            {goal.goal.name} {goal.goal.completedSessions}/{goal.goal.totalSessions}
          </div>
        </div>
      )}
    </button>
  )
}
