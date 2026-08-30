import { SCALES, scaleColor, scaleLabel } from '../../../public/lib/wod.js'
import s from './Resultados.module.css'

// The class read-back — the four KPIs the retired "Por sessão" sub-tab owned, rendered on
// the session the coach is already looking at (#57/plans/80).
//
// ⚠️ Every value degrades to an em dash, never to a flattering zero: `rxPct` is null (not
// 0) when nobody logged a real scale, because 0% reads as "logged, all scaled" — a
// different claim from "no data" (plans/22 rules 1, 5).
//
// Distribuição is a real stacked bar in canonical SCALE_COL (RX teal · Inter orange · SC
// violet · Adaptado warm-grey), which is where the SPA's FOURTH divergent scale palette
// dies: SCALE_CLS painted RX green / Inter blue / SC amber, so the same logged result
// showed a different-coloured badge here than on every public page.
// CLIENT-FREE.
export default function SessionKpis({ kpis }) {
  if (!kpis) return null
  const { avgRpe, rxPct, scaleDist, scaleTotal, flags, count } = kpis

  return (
    <div className={s.kpiPanel}>
      <div className={s.kpiCell}>
        <div className={s.kpiLbl}>RPE médio da turma</div>
        <div className={`${s.kpiVal}${avgRpe ? '' : ' ' + s.kpiValMuted}`}>{avgRpe || '—'}</div>
        <div className={s.kpiSub}>
          {count} atleta{count === 1 ? '' : 's'} presente{count === 1 ? '' : 's'}
        </div>
      </div>

      <div className={s.kpiCell}>
        <div className={s.kpiLbl}>Taxa RX</div>
        <div className={`${s.kpiVal}${rxPct === null ? ' ' + s.kpiValMuted : ''}`}>
          {rxPct === null ? '—' : `${rxPct}%`}
        </div>
        <div className={s.kpiSub}>
          {rxPct === null ? 'Sem escalas registradas' : `RX em ${scaleDist.RX} de ${scaleTotal}`}
        </div>
      </div>

      <div className={s.kpiCell}>
        <div className={s.kpiLbl}>Flags</div>
        <div className={`${s.kpiVal}${flags > 0 ? ' ' + s.kpiValFlag : ''}`}>{flags}</div>
        <div className={s.kpiSub}>
          {flags === 1 ? 'atleta marcado' : 'atletas marcados'} para revisão
        </div>
      </div>

      <div className={s.kpiCell}>
        <div className={s.kpiLbl}>Distribuição de escala</div>
        {scaleTotal === 0 ? (
          <>
            <div className={`${s.kpiVal} ${s.kpiValMuted}`}>—</div>
            <div className={s.kpiSub}>Sem escalas registradas</div>
          </>
        ) : (
          <>
            <div className={s.distBar}>
              {SCALES.filter(sc => scaleDist[sc] > 0).map(sc => (
                <span
                  key={sc}
                  className={s.distSeg}
                  style={{ flex: scaleDist[sc], background: scaleColor(sc) }}
                />
              ))}
            </div>
            <div className={s.distKey}>
              {SCALES.filter(sc => scaleDist[sc] > 0).map(sc => (
                <span key={sc} className={s.distKeyItem}>
                  <span className={s.dk} style={{ background: scaleColor(sc) }} />
                  {scaleDist[sc]} {scaleLabel(sc)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
