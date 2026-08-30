import { IconFlag } from '@tabler/icons-react'
import EmptyState from '../../ui/EmptyState.jsx'
import TallyBar from '../../../public/shared/TallyBar.jsx'
import { scaleColor, perfStr } from '../../../public/lib/wod.js'
import { shortDate } from './atletasHelpers.js'
import s from './Atletas.module.css'

// "Histórico de resultados" — the Card the retired Resultados > Histórico > Por atleta
// sub-tab became (#57/plans/80 · C3).
//
// It sits at ficha position 4, right after "Presença · 4 semanas", so the three
// attendance-shaped Cards read in sequence: what was ASSIGNED (Últimas sessões) → whether
// they SHOWED UP (Presença) → what they actually DID (this). It lands nowhere near the
// reserved #39 (Limitações) or plans/22 (Atributos) slots, which stay empty.
//
// ⚠️ There is no Frequência tile. `calcKPIs.freq`'s denominator was "result rows that
// exist", so an athlete with a single logged session scored 100% (the #164 family). It was
// dropped rather than migrated — Presença · 4 semanas already answers attendance honestly.
//
// ⚠️ Every KPI degrades to an em dash, never to 0%: "logged, all scaled" and "nothing
// logged yet" are different claims (plans/22 rules 1, 5).
// CLIENT-FREE.
export default function ResultHistoryCard({ kpis, history, onGoToResultados }) {
  const { avgRpe, rxRate, rxCount, scaleCount, loadTrend, lastRpes } = kpis || {}
  const sparkMax = Math.max(10, ...(lastRpes || []))

  return (
    <>
      <div className={s.rhKpis}>
        <div className={s.rhKpi}>
          <div className={s.rhLbl}>RPE médio</div>
          <div className={`${s.rhVal}${avgRpe ? '' : ' ' + s.rhValMuted}`}>{avgRpe || '—'}</div>
          {lastRpes?.length > 0 ? (
            <>
              <div className={s.rhSpark}>
                {lastRpes.map((v, i) => (
                  <span key={i} style={{ height: `${Math.round((v / sparkMax) * 100)}%` }} />
                ))}
              </div>
              <div className={s.rhSub}>
                últimas {lastRpes.length} sess{lastRpes.length === 1 ? 'ão' : 'ões'}
              </div>
            </>
          ) : (
            <div className={s.rhSub}>sem esforço registrado</div>
          )}
        </div>

        <div className={s.rhKpi}>
          <div className={s.rhLbl}>Taxa RX</div>
          <div
            className={`${s.rhVal}${rxRate === null || rxRate === undefined ? ' ' + s.rhValMuted : ''}`}
          >
            {rxRate === null || rxRate === undefined ? '—' : `${rxRate}%`}
          </div>
          {rxRate === null || rxRate === undefined ? (
            <div className={s.rhSub}>registre uma escala real</div>
          ) : (
            <>
              <div className={s.rhBar}>
                <TallyBar pct={rxRate} color={scaleColor('RX')} size="sm" grow />
              </div>
              <div className={s.rhSub}>
                RX em {rxCount} de {scaleCount} escalas
              </div>
            </>
          )}
        </div>

        <div className={s.rhKpi}>
          <div className={s.rhLbl}>Evolução de carga</div>
          {loadTrend ? (
            <>
              <div
                className={s.rhVal}
                style={{ color: loadTrend.diff >= 0 ? 'var(--green)' : 'var(--err)' }}
              >
                {loadTrend.diff > 0 ? '+' : ''}
                {loadTrend.diff}%
              </div>
              <div className={s.rhSub}>
                {loadTrend.name}
                <br />
                {loadTrend.first} → {loadTrend.last} kg
              </div>
            </>
          ) : (
            <>
              <div className={`${s.rhVal} ${s.rhValMuted}`}>—</div>
              <div className={s.rhSub}>precisa de 3 registros do mesmo movimento</div>
            </>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <EmptyState
          inline
          title="Nenhum resultado registrado ainda."
          action={
            onGoToResultados ? (
              <button type="button" className={s.rhLink} onClick={onGoToResultados}>
                Ir para Resultados
              </button>
            ) : null
          }
        />
      ) : (
        history.map(h => (
          <div key={h.id} className={s.rhRow}>
            <span className={s.rhDate}>{shortDate(h.date)}</span>
            <div className={s.rhBody}>
              <div className={s.rhTop}>
                <span className={s.rhSess}>{h.sessionName || 'Sessão'}</span>
                {h.scale && (
                  <span className={s.rhPill} style={{ color: scaleColor(h.scale) }}>
                    {h.scale}
                  </span>
                )}
                {h.flagged && (
                  <IconFlag size={13} className={s.rhFlag} aria-label="Marcado para revisão" />
                )}
              </div>
              {h.presence !== 'Presente' ? (
                <div className={s.rhAbsent}>{h.presence}</div>
              ) : (
                <div className={s.rhPerf}>
                  {h.blocks.slice(0, 2).map((b, i) => {
                    const p = perfStr(b, b.blockType)
                    return p && p !== '—' ? <b key={i}>{p}</b> : null
                  })}
                  {h.avgRpe && <span> RPE {h.avgRpe}</span>}
                  {h.skippedCount > 0 && (
                    <span className={s.rhSkipped}> · {h.skippedCount} não fez</span>
                  )}
                </div>
              )}
              {h.note && <div className={s.rhNote}>{h.note}</div>}
            </div>
          </div>
        ))
      )}
    </>
  )
}
