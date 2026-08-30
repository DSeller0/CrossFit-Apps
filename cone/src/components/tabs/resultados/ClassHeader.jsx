import { IconChevronDown, IconChevronUp, IconFlag } from '@tabler/icons-react'
import Button from '../../ui/Button.jsx'
import TallyBar from '../../../public/shared/TallyBar.jsx'
import SessionKpis from './SessionKpis.jsx'
import s from './Resultados.module.css'

// The class header — one element that GROWS rather than a KPI grid (#57/plans/80 ·
// mockup 61).
//
// With 0 logged, four blank KPI tiles would claim a screenful at exactly the moment the
// coach wants to start typing. So this is: one line + a progress bar with no data → an
// inline `RPE · RX% · flags` run once results exist → the full four-KPI panel under a
// disclosure. That is also what makes progress through the class visible at all — before
// this, the only signal anywhere was a `3/12 reg.` string on the week card.
// CLIENT-FREE.
export default function ClassHeader({
  sessionName,
  dateLabel,
  logged,
  total,
  pct,
  kpis,
  expanded,
  onToggle,
}) {
  const hasData = !!kpis

  return (
    <div className={s.classHdr}>
      <div className={s.chTop}>
        <h2 className={s.chTitle}>{sessionName}</h2>
        <span className={s.chDate}>{dateLabel}</span>
      </div>

      <div className={s.chProg}>
        <TallyBar pct={pct} color="var(--accent)" size="lg" grow />
        <span className={s.chProgN}>
          <b>{logged}</b> de {total} registrado{total === 1 ? '' : 's'}
        </span>
      </div>

      <div className={s.chKpis}>
        {hasData ? (
          <>
            <span className={s.chKpi}>
              RPE médio <b>{kpis.avgRpe || '—'}</b>
            </span>
            <span className={s.chSep}>·</span>
            <span className={s.chKpi}>
              Taxa RX <b>{kpis.rxPct === null ? '—' : `${kpis.rxPct}%`}</b>
            </span>
            {kpis.flags > 0 && (
              <>
                <span className={s.chSep}>·</span>
                <span className={`${s.chKpi} ${s.chKpiFlag}`}>
                  <IconFlag size={12} aria-hidden="true" /> {kpis.flags} para revisão
                </span>
              </>
            )}
          </>
        ) : (
          <span className={s.chNodata}>Os números da turma aparecem conforme você registra.</span>
        )}
        <span className={s.chToggle}>
          <Button
            size="xs"
            variant="secondary"
            aria-expanded={expanded}
            disabled={!hasData}
            onClick={onToggle}
          >
            {expanded ? 'Ocultar' : 'Ver turma'}
            {expanded ? (
              <IconChevronUp size={13} aria-hidden="true" />
            ) : (
              <IconChevronDown size={13} aria-hidden="true" />
            )}
          </Button>
        </span>
      </div>

      {expanded && hasData && <SessionKpis kpis={kpis} />}
    </div>
  )
}
