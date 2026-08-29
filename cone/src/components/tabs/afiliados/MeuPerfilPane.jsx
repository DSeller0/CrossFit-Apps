import { IconToggleLeft, IconToggleRight, IconInfoCircle } from '@tabler/icons-react'
import Card from '../../ui/Card.jsx'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import CurrencyInput from './CurrencyInput.jsx'
import { rateLabel } from './affiliateHelpers.js'
import { allStamps, periodLabel } from './billingState.js'
import s from './Afiliados.module.css'

const STATUS_LABEL = { draft: 'Rascunho', sent: 'Enviada', paid: 'Paga' }

function fmtMoney(total, currency) {
  return `${currency} ${total.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// "Cobranças emitidas" (#162/plans/78) — the stamp history as a table: period ·
// quem paga · direção · estado · valor. Only `sent`/`paid` rows: a `draft` has
// no frozen total yet and hasn't actually been "emitida" (issued) — it's still
// live in Fechamento's Rascunho column. `direção` reads `loc.type` the same way
// `DirectionPair` does (plans/42 decision 2) — a box stamp means the box paid
// the coach, a personal stamp means the coach charged the athlete directly. A
// stamp pointing at a since-deleted affiliate renders "Afiliado removido"
// instead of throwing (same defensive posture as `AthleteAssignment`'s orphan
// rows) — no DB enforces integrity inside a JSONB array.
function InvoiceHistory({ billing, locs, onSelectInvoice }) {
  const rows = allStamps(billing)
    .filter(({ stamp }) => stamp.status === 'sent' || stamp.status === 'paid')
    .sort((a, b) => b.period.localeCompare(a.period))
  if (rows.length === 0) {
    return <EmptyState inline title="Nenhuma cobrança emitida ainda" />
  }
  return (
    <div className={s.tariffList}>
      {rows.map(({ affiliateId, period, stamp }) => {
        const loc = locs.find(l => l.id === affiliateId)
        const direction = loc ? (loc.type === 'box' ? 'box → você' : 'você → atleta') : '—'
        return (
          <button
            key={`${affiliateId}-${period}`}
            type="button"
            className={s.tariffRow}
            onClick={() => onSelectInvoice?.(affiliateId, period)}
          >
            <span className={s.dot} style={{ background: loc?.color || 'var(--dim)' }} />
            <span className={s.tariffName}>
              {loc?.name || 'Afiliado removido'} · {periodLabel(period).toLowerCase()}
            </span>
            <span className={s.histDirection}>{direction}</span>
            <span className={s.histStatus}>{STATUS_LABEL[stamp.status] || stamp.status}</span>
            <span className={s.tariffValue}>
              {stamp.total != null ? fmtMoney(stamp.total, stamp.currency) : '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// "Meu perfil" — the coach's own identity, Pix and rate summary (#56/C2, renamed +
// extended #161/plans/77, mockup 60).
//
// This is `CoachProfileForm`, promoted from a slab wedged above the affiliate list
// into its own pane. That promotion IS the left-pane-overflow fix on #56's row: the
// two shared one 260px scrolling column, so on a short window the list started
// below the fold. It also retires the `compact` prop — two hand-written style
// objects differing only in padding and one background.
//
// Why Pix is a pane and not a field on the affiliate record: `locations[].rate` is
// what the coach charges a box, and `coach_profile.pixKey` is stamped on the
// invoice HE issues. A box charging its own athletes is the opposite arrow — one
// field name and one Pix identity for two directions is how a wrong invoice gets
// generated silently (plans/42 decision 2).
//
// "Taxas por afiliado" is READ-ONLY — the rate is edited where it belongs, on the
// affiliate record (`onSelectAffiliate` jumps there). "Quem vê o quê" (mockup 60)
// is NOT built: it would describe per-affiliate visibility no layer of the app
// implements (plans/42's tenancy sequencing puts real isolation dead last) —
// shipping it would assert a guarantee that does not exist, to the person best
// placed to rely on it (plans/77 Approach 4).
//
// CLIENT-FREE — `coach`/`setCoach` are props; the debounced save stays in the
// container (#109: merely opening the tab must perform zero writes).
export default function MeuPerfilPane({
  coach,
  setCoach,
  locs = [],
  onSelectAffiliate,
  onSelectInvoice,
}) {
  const set = (k, v) => setCoach(p => ({ ...p, [k]: v }))
  const pixOn = !!coach.pixEnabled

  return (
    <div className={s.bizPane}>
      <div className={s.bizGrid}>
        <Card pad="sm" title="Perfil do coach">
          <div className={s.form}>
            <Input
              label="Nome"
              placeholder="Nome do coach"
              value={coach.name || ''}
              onChange={e => set('name', e.target.value)}
            />
            <div className={s.formGrid2}>
              <Input
                label="E-mail"
                type="email"
                placeholder="voce@exemplo.com"
                value={coach.contact || ''}
                onChange={e => set('contact', e.target.value)}
              />
              <Input
                label="Telefone"
                type="tel"
                inputMode="tel"
                placeholder="(00) 00000-0000"
                value={coach.phone || ''}
                onChange={e => set('phone', e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card pad="sm" title="Recebimento (Pix)">
          <div className={s.form}>
            <Button
              variant={pixOn ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={pixOn}
              onClick={() => set('pixEnabled', !pixOn)}
            >
              {pixOn ? <IconToggleRight /> : <IconToggleLeft />}
              {pixOn ? 'Pix ativado' : 'Pix desativado'}
            </Button>

            {pixOn && (
              <>
                <Input
                  label="Chave Pix"
                  className={s.pixKey}
                  placeholder="e-mail, CPF, telefone…"
                  value={coach.pixKey || ''}
                  onChange={e => set('pixKey', e.target.value)}
                />
                <Input
                  label="Cidade"
                  placeholder="Cidade (para o QR Pix)"
                  value={coach.cidade || ''}
                  hint="Exigida pelo padrão EMV do QR."
                  onChange={e => set('cidade', e.target.value)}
                />
                <div className={s.capRow}>
                  <CurrencyInput
                    label="Cap de teste"
                    value={coach.pixTestCap || 0}
                    placeholder="Sem limite"
                    hint="Valor máximo gerado no QR durante testes. Vazio = sem limite."
                    onChange={v => set('pixTestCap', v || null)}
                  />
                  <span
                    className={s.capHelp}
                    title="Valor máximo gerado no QR Pix durante testes. 0 = sem limite."
                  >
                    <IconInfoCircle size={16} aria-hidden="true" />
                  </span>
                </div>
              </>
            )}

            <p className={s.bizNote}>
              A chave é usada nas cobranças que <strong>você</strong> emite pelo Relatório da Agenda
              — não é cobrança do box para os atletas.
            </p>
          </div>
        </Card>

        <Card pad="sm" title="Taxas por afiliado">
          {locs.length === 0 ? (
            <EmptyState inline title="Nenhum afiliado ainda" />
          ) : (
            <div className={s.tariffList}>
              {locs.map(l => (
                <button
                  key={l.id}
                  type="button"
                  className={s.tariffRow}
                  onClick={() => onSelectAffiliate?.(l.id)}
                >
                  <span className={s.dot} style={{ background: l.color || 'var(--muted)' }} />
                  <span className={s.tariffName}>{l.name}</span>
                  <span className={s.tariffValue}>{rateLabel(l)}</span>
                </button>
              ))}
            </div>
          )}
          <p className={s.bizNote}>
            Somente leitura — a taxa é editada no próprio afiliado, em Meus afiliados.
          </p>
        </Card>

        <Card pad="sm" title="Cobranças emitidas">
          <InvoiceHistory billing={coach.billing} locs={locs} onSelectInvoice={onSelectInvoice} />
          <p className={s.bizNote}>
            Faturas enviadas ou pagas — clique numa linha para abrir em Fechamento.
          </p>
        </Card>
      </div>
    </div>
  )
}
