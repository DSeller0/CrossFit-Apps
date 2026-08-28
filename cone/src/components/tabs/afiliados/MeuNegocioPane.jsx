import { IconToggleLeft, IconToggleRight, IconInfoCircle } from '@tabler/icons-react'
import Card from '../../ui/Card.jsx'
import Button from '../../ui/Button.jsx'
import Input from '../../ui/Input.jsx'
import CurrencyInput from './CurrencyInput.jsx'
import s from './Afiliados.module.css'

// "Meu negócio" — the coach's own identity, Pix and test cap (#56/C2).
//
// This is `CoachProfileForm`, promoted from a slab wedged above the affiliate list
// into its own pane. That promotion IS the left-pane-overflow fix on #56's row: the
// two shared one 260px scrolling column, so on a short window the list started
// below the fold. It also retires the `compact` prop — two hand-written style
// objects differing only in padding and one background.
//
// Why it is a pane and not a field on the affiliate record: `locations[].rate` is
// what the coach charges a box, and `coach_profile.pixKey` is stamped on the
// invoice HE issues. A box charging its own athletes is the opposite arrow — one
// field name and one Pix identity for two directions is how a wrong invoice gets
// generated silently (plans/42 decision 2).
//
// CLIENT-FREE — `coach`/`setCoach` are props; the debounced save stays in the
// container (#109: merely opening the tab must perform zero writes).
export default function MeuNegocioPane({ coach, setCoach }) {
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
      </div>
    </div>
  )
}
