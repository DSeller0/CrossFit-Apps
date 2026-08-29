import Card from '../../ui/Card.jsx'
import { calcTotal } from '../publicador/billing.js'
import { rateLabel } from './affiliateHelpers.js'
import s from './Afiliados.module.css'

// The two-direction pair (#161/plans/77, mockup 60) — the mockup's best idea, and
// it costs nothing to build. `locations[].rate` is what the BOX pays the coach;
// the coach's Pix key is what the COACH charges an athlete directly. Same field,
// same identity, opposite arrows depending on `loc.type` — plans/42 decision 2
// exists precisely because that ambiguity is how a wrong invoice gets generated
// silently. Stating both directions on screen, always, is the guard.
//
// `events` arrives pre-filtered to this affiliate and the reporting period
// (`eventsForAffiliate`, computed by the container/AffiliatesPane) — this
// component only sums and labels it, via the same `calcTotal` the Relatório uses.
//
// CLIENT-FREE.
function Row({ label, value }) {
  return (
    <div className={s.dirRow}>
      <span className={s.dirRowLabel}>{label}</span>
      <span className={s.dirRowValue}>{value}</span>
    </div>
  )
}

export default function DirectionPair({ loc, events = [], pixKey = '', monthLabel = '' }) {
  const isBox = loc.type === 'box'
  const total = calcTotal(events, loc)

  return (
    <div className={s.directionPair}>
      <Card pad="sm" title="O box paga você">
        {!isBox ? (
          <p className={s.dirNote}>
            Personal não recebe do box — o dinheiro vem de quem você cobra ao lado.
          </p>
        ) : loc.rate ? (
          <div className={s.dirRows}>
            <Row label="taxa" value={rateLabel(loc)} />
            <Row label={monthLabel} value={total.label || '—'} />
          </div>
        ) : (
          <p className={s.dirNote}>Sem taxa configurada para este box.</p>
        )}
      </Card>

      <Card pad="sm" title="Você cobra o atleta">
        {isBox ? (
          <p className={s.dirNote}>
            Atletas deste box são cobrados pelo próprio box — o Pix só entra em afiliados do tipo
            Personal.
          </p>
        ) : (
          <div className={s.dirRows}>
            <Row label="Pix" value={pixKey || 'Não configurado'} />
            <Row label={monthLabel} value={total.label || '—'} />
          </div>
        )}
      </Card>
    </div>
  )
}
