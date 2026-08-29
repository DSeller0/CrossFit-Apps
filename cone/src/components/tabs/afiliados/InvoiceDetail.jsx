import { useState, useEffect } from 'react'
import Button from '../../ui/Button.jsx'
import ConfirmReview from '../../../public/shared/ConfirmReview.jsx'
import { calcTotal, fmtDur, fmtDate } from '../publicador/billing.js'
import { buildPixPayload } from '../../../utils/pix.js'
import { qrToBase64 } from '../publicador/pixQr.js'
import { periodLabel, singleTotal } from './billingState.js'
import s from './Afiliados.module.css'

function fmtMoney(total, currency) {
  return `${currency} ${total.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const STATUS_LABEL = { open: 'Sem fatura', draft: 'Rascunho', sent: 'Enviada', paid: 'Paga' }

// The Pix half — identical payload shape to `publicador/events.jsx`'s ReportModal
// (same `buildPixPayload` + the extracted `qrToBase64`), including the
// `pixTestCap` guard. Its own small stateful QR fetch, same pattern as
// `Afiliados.jsx`'s existing `qrLoc` effect.
function PixBlock({ coach, loc, period, amount, currency }) {
  const [qr, setQr] = useState('')
  const cap = coach.pixTestCap && Number(coach.pixTestCap) > 0 ? Number(coach.pixTestCap) : null
  const capped = !!(cap && amount > cap)
  const payAmount = capped ? cap : amount
  const payload =
    coach.pixEnabled && coach.pixKey && amount > 0
      ? buildPixPayload({
          pixKey: coach.pixKey,
          merchantName: coach.name || 'COACH',
          merchantCity: coach.cidade || 'BRASIL',
          amount: payAmount,
          description: `${loc.name} ${periodLabel(period)}`.slice(0, 72),
          txid: (loc.name.replace(/\s/g, '').slice(0, 10) + period.replace('-', '')).slice(0, 25),
        })
      : null

  // No `setQr('')` reset on the falsy branch — that's a setState-in-effect-body
  // (react-hooks/set-state-in-effect); the `if (!payload) return null` below
  // means a null payload never renders the stale image anyway, and a genuine
  // payload change just lets the old QR sit one frame until the new fetch
  // resolves, same tradeoff `Afiliados.jsx`'s own `qrLoc` effect makes.
  useEffect(() => {
    if (!payload) return
    let cancelled = false
    qrToBase64(payload, 200).then(url => {
      if (!cancelled) setQr(url || '')
    })
    return () => {
      cancelled = true
    }
  }, [payload])

  if (!payload) return null
  return (
    <div className={s.invPix}>
      {qr ? (
        <img src={qr} alt="QR code Pix" className={s.invPixImg} />
      ) : (
        <div className={s.invPixPending}>Gerando QR…</div>
      )}
      <div className={s.invPixAmount}>{fmtMoney(payAmount, currency)}</div>
      <div className={s.invPixKey}>{coach.pixKey}</div>
      {capped && (
        <div className={s.invPixCap}>⚠ Limitado a {fmtMoney(payAmount, currency)} (modo teste)</div>
      )}
    </div>
  )
}

function Trail({ stamp }) {
  const steps = [
    { key: 'reg', label: 'Registradas', done: true, at: null },
    { key: 'draft', label: 'Conferido', done: !!stamp, at: null },
    {
      key: 'sent',
      label: 'Enviada',
      done: stamp?.status === 'sent' || stamp?.status === 'paid',
      at: stamp?.sentAt,
    },
    { key: 'paid', label: 'Baixa', done: stamp?.status === 'paid', at: stamp?.paidAt },
  ]
  return (
    <div className={s.invTrail}>
      {steps.map(st => (
        <div key={st.key} className={`${s.invTrailStep}${st.done ? ' ' + s.invTrailStepOn : ''}`}>
          <span className={s.invTrailDot} aria-hidden="true" />
          <span className={s.invTrailLabel}>{st.label}</span>
          {st.at && <span className={s.invTrailDate}>{fmtDate(st.at.slice(0, 10))}</span>}
        </div>
      ))}
    </div>
  )
}

// The Fechamento right pane — one invoice's full picture: the computation (live
// for 'open'/'draft', frozen for 'sent'/'paid' — the SAME data source
// InvoiceCard reads, so the two can never disagree), the Pix QR, the status
// trail, and the one action that moves it forward. Every advance goes through
// ConfirmReview (plans/78: "it is not reversible in the coach's head even if it
// is in the data") — `Enviar fatura`'s copy states the freeze explicitly, since
// that's the one advance whose consequence isn't obvious from the button label
// alone.
//
// `events` arrives pre-filtered to this (affiliate, period) — the container
// resolves it via `eventsForAffiliate`. `onAdvance(to, computed)` — `computed`
// is only non-null when `to === 'sent'` (see `billingState.js`'s `advance`).
//
// CLIENT-FREE.
export default function InvoiceDetail({ loc, period, stamp, events = [], coach, onAdvance }) {
  const [confirmTo, setConfirmTo] = useState(null)
  const status = stamp?.status || 'open'
  const live = calcTotal(events, loc)
  const frozen = status === 'sent' || status === 'paid'
  const liveSingle = singleTotal(live)
  const amount = frozen ? stamp.total : liveSingle?.total || 0
  const currency = frozen ? stamp.currency : liveSingle?.currency || loc.currency || 'R$'
  const mixedCurrency = !frozen && live.currencies.length > 1
  const totalMin = events.reduce((sum, ev) => sum + (ev.durationMin || 60), 0)

  // Lazy (functions, not plain objects): `paid`'s copy reads `stamp.total`,
  // which only exists once a stamp does — that's only guaranteed true when
  // `confirmTo === 'paid'` (reachable solely from the "Marcar como paga"
  // button, itself only rendered when `status === 'sent'`). Building all three
  // eagerly on every render evaluated `paid`'s body even in the 'open' state
  // (`stamp` still null), crashing `fmtMoney(undefined, undefined)`.
  const CONFIRM_COPY = {
    draft: () => ({
      title: 'Iniciar rascunho',
      body: `Criar um rascunho de fatura para ${loc.name} em ${periodLabel(period).toLowerCase()}? O valor continua ao vivo até você enviar.`,
      confirmLabel: 'Iniciar rascunho',
    }),
    sent: () => ({
      title: 'Enviar fatura',
      body: `O valor de ${fmtMoney(amount, currency)} fica congelado a partir de agora — editar uma sessão desse período não muda mais esse número.`,
      confirmLabel: 'Enviar fatura',
    }),
    paid: () => ({
      title: 'Marcar como paga',
      body: `Confirmar o recebimento de ${fmtMoney(stamp.total, stamp.currency)} de ${loc.name}?`,
      confirmLabel: 'Marcar como paga',
    }),
  }
  const confirmCopy = confirmTo ? CONFIRM_COPY[confirmTo]() : null

  const doAdvance = () => {
    const computed = confirmTo === 'sent' ? liveSingle : null
    onAdvance?.(confirmTo, computed)
    setConfirmTo(null)
  }

  return (
    <div className={s.invDetail}>
      <div className={s.invHdr}>
        <div className={s.invHdrName}>{loc.name}</div>
        <div className={s.invHdrSub}>
          {periodLabel(period)} · {STATUS_LABEL[status]}
        </div>
      </div>

      <div className={s.invCalc}>
        {frozen ? (
          <div className={s.invCalcTotal}>{fmtMoney(amount, currency)}</div>
        ) : mixedCurrency ? (
          <div className={s.invCalcTotal}>{live.label}</div>
        ) : (
          <>
            <div className={s.invCalcLine}>
              {fmtDur(totalMin)} · {events.length} {events.length === 1 ? 'sessão' : 'sessões'}
            </div>
            <div className={s.invCalcTotal}>{amount > 0 ? fmtMoney(amount, currency) : '—'}</div>
          </>
        )}
      </div>

      {!mixedCurrency && amount > 0 && (
        <PixBlock coach={coach} loc={loc} period={period} amount={amount} currency={currency} />
      )}

      <Trail stamp={stamp} />

      {status === 'open' && (
        <Button variant="primary" size="sm" full onClick={() => setConfirmTo('draft')}>
          Iniciar rascunho
        </Button>
      )}
      {status === 'draft' && (
        <Button
          variant="primary"
          size="sm"
          full
          disabled={mixedCurrency || amount <= 0}
          onClick={() => setConfirmTo('sent')}
        >
          Enviar fatura
        </Button>
      )}
      {status === 'sent' && (
        <Button variant="primary" size="sm" full onClick={() => setConfirmTo('paid')}>
          Marcar como paga
        </Button>
      )}

      <ConfirmReview
        open={!!confirmTo}
        title={confirmCopy?.title || ''}
        confirmLabel={confirmCopy?.confirmLabel || ''}
        onEdit={() => setConfirmTo(null)}
        onClose={() => setConfirmTo(null)}
        onConfirm={doAdvance}
      >
        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.5 }}>
          {confirmCopy?.body}
        </div>
      </ConfirmReview>
    </div>
  )
}
