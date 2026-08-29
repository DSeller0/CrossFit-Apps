import { useState, useMemo } from 'react'
import { IconChevronLeft, IconChevronRight, IconCalendarWeek } from '@tabler/icons-react'
import EmptyState from '../../ui/EmptyState.jsx'
import Button from '../../ui/Button.jsx'
import { getWeek, toISO, DAY_PT_TITLE, MONTH_PT_SHORT } from '../../../public/lib/week.js'
import { calcTotal, fmtDur } from '../publicador/billing.js'
import { resolveEventLoc } from './affiliateHelpers.js'
import { periodKey } from './billingState.js'
import WeekEventGrid from './WeekEventGrid.jsx'
import s from './Afiliados.module.css'

// This week's stats — every number labelled for exactly what it counts
// (plans/78 Approach 4). `ev.status` is a manual two-value toggle and
// `athleteIds` is a checkbox list the coach ticks — neither is real attendance
// (`class_executions` is, and has no join key to either, #102) — so "atletas" is
// explicitly "marcados", never "presentes", and "a lançar" counts events not yet
// toggled rather than claiming to know who showed up. No vagas/ocupação stat
// exists here either — there is no capacity field on an event or a location to
// give it a numerator.
function weekStats(weekDates, events) {
  let count = 0
  let totalMin = 0
  let open = 0
  const athIds = new Set()
  weekDates.forEach(d => {
    ;(events[toISO(d)] || []).forEach(ev => {
      count++
      totalMin += ev.durationMin || 60
      if (ev.status !== 'completed') open++
      ;(ev.athleteIds || []).forEach(id => athIds.add(id))
    })
  })
  return { count, totalMin, open, athCount: athIds.size }
}

function weekLabel(weekDates) {
  const first = weekDates[0]
  const last = weekDates[6]
  const m1 = MONTH_PT_SHORT[first.getMonth()].toLowerCase()
  const m2 = MONTH_PT_SHORT[last.getMonth()].toLowerCase()
  return first.getMonth() === last.getMonth()
    ? `${first.getDate()} – ${last.getDate()} ${m1}`
    : `${first.getDate()} ${m1} – ${last.getDate()} ${m2}`
}

// "Minha semana" (#162/plans/78, mockup 60) — a read-only week grid over
// `events`, needing no new data at all (`time`/`durationMin`/`locationId`/
// `athleteIds` already exist). Selecting an event opens its detail: what it
// bills (the same `calcTotal` the Relatório and Fechamento use) and, once it
// resolves to a real affiliate, a jump straight into Fechamento —
// `onGoToInvoice`, the cross-panel link that makes the two panes worth more
// than either alone.
//
// No coach-assignment / "sem coach" legend (no coach entity, #103) and no
// editing here — this panel visualises `events`, it does not write to them.
//
// `weekDatesOverride` is a testability/gallery seam only — production never
// passes it, so `weekDates` is always the real `getWeek(offset)`. The gallery's
// design cards are SSR'd once against fixed August-2026 fixtures and must
// render identically on every regeneration (see `gallery/groups/afiliados.jsx`'s
// header note); `getWeek`'s own `new Date()` would otherwise show whichever
// week is real "today" instead of the fixture. It only applies while the coach
// hasn't navigated away from the initial week (`offset === 0`) — paging still
// falls back to the real calendar from there.
//
// CLIENT-FREE.
export default function MinhaSemanaPane({
  locs = [],
  athletes = [],
  events = {},
  onGoToInvoice,
  compact = false,
  weekDatesOverride = null,
}) {
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState(null) // { ev, key } | null
  const liveWeekDates = useMemo(() => getWeek(offset), [offset])
  const weekDates = weekDatesOverride && offset === 0 ? weekDatesOverride : liveWeekDates
  const stats = useMemo(() => weekStats(weekDates, events), [weekDates, events])

  const loc = selected ? resolveEventLoc(selected.ev, locs) : null
  const evTotal = selected && loc ? calcTotal([selected.ev], loc) : null

  return (
    <div className={`${s.semanaBody}${compact ? ' ' + s.semanaBodyCol : ''}`}>
      <div className={s.semanaMain}>
        <div className={s.semanaNav}>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Semana anterior"
            onClick={() => setOffset(o => o - 1)}
          >
            <IconChevronLeft />
          </Button>
          <div className={s.semanaTitle}>
            <span>Minha semana</span>
            <span className={s.semanaRange}>{weekLabel(weekDates)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Próxima semana"
            onClick={() => setOffset(o => o + 1)}
          >
            <IconChevronRight />
          </Button>
          {offset !== 0 && (
            <Button variant="secondary" size="xs" onClick={() => setOffset(0)}>
              Hoje
            </Button>
          )}
        </div>

        <WeekEventGrid
          weekDates={weekDates}
          events={events}
          locs={locs}
          compact={compact}
          selectedKey={selected?.key}
          onSelect={(ev, key) => setSelected({ ev, key })}
        />

        <div className={s.semanaStats}>
          <div className={s.statItem}>
            <span className={s.statValue}>{stats.count}</span>
            <span className={s.statLabel}>{stats.count === 1 ? 'aula' : 'aulas'}</span>
          </div>
          <div className={s.statItem}>
            <span className={s.statValue}>{fmtDur(stats.totalMin)}</span>
            <span className={s.statLabel}>na semana</span>
          </div>
          <div className={s.statItem}>
            <span className={s.statValue}>{stats.athCount}</span>
            <span className={s.statLabel}>atletas marcados</span>
          </div>
          <div className={s.statItem}>
            <span className={s.statValue}>{stats.open}</span>
            <span className={s.statLabel}>a lançar</span>
          </div>
        </div>
      </div>

      <div className={s.semanaDetail}>
        {!selected ? (
          <EmptyState
            pane
            icon={<IconCalendarWeek />}
            title="Selecione um evento"
            text="Escolha uma aula ou personal na semana para ver o que ela gera e quem está marcado."
          />
        ) : (
          <>
            <div className={s.invHdr}>
              <div className={s.invHdrName}>
                {selected.ev.label || (selected.ev.type === 'personal' ? 'Personal' : 'Aula')}
              </div>
              <div className={s.invHdrSub}>
                {loc?.name || 'Sem afiliado'} ·{' '}
                {DAY_PT_TITLE[new Date(selected.ev.date + 'T12:00:00').getDay()]} {selected.ev.time}
              </div>
            </div>

            {evTotal && evTotal.currencies.length > 0 ? (
              <div className={s.invCalc}>
                <div className={s.invCalcLine}>{fmtDur(selected.ev.durationMin || 60)}</div>
                <div className={s.invCalcTotal}>{evTotal.label}</div>
              </div>
            ) : (
              <p className={s.dirNote}>Sem taxa configurada para gerar valor.</p>
            )}

            {loc && (
              <Button
                variant="secondary"
                size="sm"
                full
                onClick={() => onGoToInvoice?.(loc.id, periodKey(selected.ev.date))}
              >
                Ver na fatura →
              </Button>
            )}

            <div className={s.presBlock}>
              <div className={s.assignTitle}>
                Presença marcada · {(selected.ev.athleteIds || []).length}
              </div>
              {(selected.ev.athleteIds || []).length === 0 ? (
                <p className={s.dirNote}>Nenhum atleta marcado.</p>
              ) : (
                <div className={s.presList}>
                  {(selected.ev.athleteIds || []).map(id => {
                    const ath = athletes.find(a => a.id === id)
                    return (
                      <div key={id} className={s.presRow}>
                        <span
                          className={s.dot}
                          style={{ background: ath?.color || 'var(--dim)' }}
                          aria-hidden="true"
                        />
                        <span className={s.presName}>{ath?.name || 'Atleta removido'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className={s.bizNote}>
                Marcação manual do coach — não é registro de check-in real.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
