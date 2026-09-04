import EmptyState from '../../../ui/EmptyState'
import Button from '../../../ui/Button'
import { DAY_PT } from '../../../../public/lib/week.js'

// The preview pane's non-happy-path states (#59 C5·b1 step d), all through the one
// ui/EmptyState primitive rather than the bespoke `.state`/`.state.err` markup the
// mockup hand-rolled.

export function EmptyWeekState({ monthLabel, weekLabel, onJump }) {
  return (
    <EmptyState
      pane
      icon="ti-calendar-off"
      title={`Nenhuma sessão em ${monthLabel} · ${weekLabel}`}
      text="O Publicador transforma o que você montou no Criador em imagem."
      action={
        onJump && (
          <Button variant="secondary" size="sm" onClick={onJump}>
            Ir para o Criador
          </Button>
        )
      }
    />
  )
}

export function NoSessionThatDayState({ dateLabel, altDates, onPickDate, onSwitchToWeek }) {
  return (
    <EmptyState
      pane
      icon="ti-calendar-event"
      title={`${dateLabel} não tem sessão`}
      text={
        altDates.length
          ? `Nada para exportar neste dia. ${altDates.map(d => DAY_PT[d.getDay()]).join(', ')} têm sessão nesta semana.`
          : 'Nada para exportar neste dia.'
      }
      action={
        <>
          {altDates.slice(0, 2).map(d => (
            <Button
              key={d.toISOString()}
              variant="secondary"
              size="sm"
              onClick={() => onPickDate(d)}
            >
              Ver {DAY_PT[d.getDay()]}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={onSwitchToWeek}>
            Exportar a semana
          </Button>
        </>
      }
    />
  )
}

export function ExportErrorState({ onRetry, onRetryNoLogo, hasLogo }) {
  return (
    <EmptyState
      icon="ti-alert-triangle"
      title="Não foi possível gerar a imagem"
      text="A rasterização falhou — isso costuma ser um logo carregado de outro domínio."
      action={
        <>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Tentar de novo
          </Button>
          {hasLogo && (
            <Button variant="ghost" size="sm" onClick={onRetryNoLogo}>
              Exportar sem logo
            </Button>
          )}
        </>
      }
    />
  )
}
