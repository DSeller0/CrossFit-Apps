import { useState } from 'react'
import { IconChevronDown, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { MONTH_PT } from '../../../../public/lib/week.js'
import { activeCount, clearFilter, toggleInSet } from '../eventFilter.js'
import s from './Agenda.module.css'

// ── EventFilter — the ONE event filter surface (#105 · plans/81 C5·a step b) ──
//
// A superset of the two sets it replaces: Agenda's tri-state (AgendaView's local
// `filter`) and ReportModal's period + type + status + affiliates + athletes. Each
// call site declares which `axes` it renders, so Agenda can leave `period` out (its
// month nav IS the period) without a second component existing.
//
// Two layouts, one component:
//   layout="row"    — Agenda's header. Bounded axes (type, status) stay visible as
//                     segmented pills; unbounded ones (affiliate, athlete) collapse
//                     into a popover whose BUTTON SAYS WHAT IS CHOSEN.
//   layout="column" — the Relatório sidebar, which has vertical room, so nothing
//                     collapses.
//
// 🔴 CLIENT-FREE — `locs` and `athletes` arrive as props, never `loadLocations()`.
// That is what lets it render in the gallery and in the design cards.
//
// All predicate logic lives in the pure `../eventFilter.js`; this file is state + UI
// and knows nothing about grouping. See that module's header for the coupling
// boundary with `groupByLocation`.

const STATUS_LABELS = { all: 'Todos', scheduled: 'A lançar', completed: 'Feitas' }

function Popover({ label, on, children, title }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={s.fPopWrap}>
      <button
        type="button"
        className={`${s.fPop}${on ? ' ' + s.on : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        title={title}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false)
        }}
      >
        <span className={s.fPopLabel}>{label}</span>
        <IconChevronDown size={11} className={s.fCaret} aria-hidden="true" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className={s.fBackdrop}
            aria-label="Fechar filtro"
            onClick={() => setOpen(false)}
          />
          <div
            className={s.fPanel}
            onKeyDown={e => {
              if (e.key === 'Escape') setOpen(false)
            }}
          >
            {children}
          </div>
        </>
      )}
    </div>
  )
}

/** "Todos" plus one pill per option; an emptied selection returns to "Todos". */
function SetPills({ items, selected, onToggle, onAll, allLabel = 'Todos' }) {
  return (
    <>
      <button
        type="button"
        className={`${s.pill}${!selected ? ' ' + s.on : ''}`}
        onClick={onAll}
        aria-pressed={!selected}
      >
        {allLabel}
      </button>
      {items.map(it => {
        const on = !!selected && selected.has(it.id)
        return (
          <button
            key={it.id}
            type="button"
            className={`${s.pill}${on ? ' ' + s.on : ''}`}
            onClick={() => onToggle(it.id)}
            aria-pressed={on}
          >
            {it.name}
          </button>
        )
      })}
    </>
  )
}

/** What a popover button reads when its axis is narrowing something. */
function setLabel(prefix, selected, items) {
  if (!selected) return prefix
  if (selected.size === 1) {
    const id = [...selected][0]
    const hit = items.find(i => i.id === id)
    return `${prefix}: ${hit ? hit.name : 'removido'}`
  }
  return `${selected.size} ${prefix.toLowerCase()}s`
}

export default function EventFilter({
  value,
  onChange,
  axes = ['type', 'status', 'affiliate', 'athlete'],
  layout = 'row',
  locs = [],
  athletes = [],
}) {
  const f = value
  const has = ax => axes.includes(ax)
  const set = patch => onChange({ ...f, ...patch })
  const n = activeCount(f)

  const affItems = locs.map(l => ({ id: l.id, name: l.name }))
  const athItems = athletes.map(a => ({ id: a.id, name: a.name }))

  const typeButtons = (
    <div className={s.fGrp} role="group" aria-label="Filtrar por tipo">
      <button
        type="button"
        className={f.types.aula && f.types.personal ? s.on : ''}
        aria-pressed={f.types.aula && f.types.personal}
        onClick={() => set({ types: { aula: true, personal: true } })}
      >
        Todos
      </button>
      <button
        type="button"
        className={f.types.aula && !f.types.personal ? s.on : ''}
        aria-pressed={f.types.aula && !f.types.personal}
        onClick={() => set({ types: { aula: true, personal: false } })}
      >
        Aula
      </button>
      <button
        type="button"
        className={!f.types.aula && f.types.personal ? `${s.on} ${s.onGold}` : ''}
        aria-pressed={!f.types.aula && f.types.personal}
        onClick={() => set({ types: { aula: false, personal: true } })}
      >
        Personal
      </button>
    </div>
  )

  const statusButtons = (
    <div className={s.fGrp} role="group" aria-label="Filtrar por status">
      {['all', 'scheduled', 'completed'].map(st => (
        <button
          key={st}
          type="button"
          className={f.status === st ? s.on : ''}
          aria-pressed={f.status === st}
          onClick={() => set({ status: st })}
        >
          {STATUS_LABELS[st]}
        </button>
      ))}
    </div>
  )

  if (layout === 'row') {
    return (
      <div className={s.fRow}>
        {has('type') && typeButtons}
        {has('status') && statusButtons}
        {has('affiliate') && affItems.length > 0 && (
          <Popover label={setLabel('Afiliado', f.affiliates, affItems)} on={!!f.affiliates}>
            <SetPills
              items={affItems}
              selected={f.affiliates}
              onAll={() => set({ affiliates: null })}
              onToggle={id => set({ affiliates: toggleInSet(f.affiliates, id) })}
            />
          </Popover>
        )}
        {has('athlete') && athItems.length > 0 && (
          <Popover
            label={setLabel('Atleta', f.athletes, athItems)}
            on={!!f.athletes}
            title="O filtro de atletas se aplica somente a eventos personal"
          >
            <SetPills
              items={athItems}
              selected={f.athletes}
              onAll={() => set({ athletes: null })}
              onToggle={id => set({ athletes: toggleInSet(f.athletes, id) })}
            />
          </Popover>
        )}
        {n > 0 && (
          <div className={s.fClear}>
            <span className={s.fCount}>
              <b>{n}</b> {n === 1 ? 'filtro ativo' : 'filtros ativos'}
            </span>
            <button type="button" className={s.fClearBtn} onClick={() => onChange(clearFilter(f))}>
              Limpar
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── column ────────────────────────────────────────────────────────────────
  const period = f.period || { mode: 'month', yr: new Date().getFullYear(), mo: 0 }
  const isRange = period.mode === 'range'
  const stepMonth = d =>
    set({
      period: {
        mode: 'month',
        yr: period.mo + d < 0 ? period.yr - 1 : period.mo + d > 11 ? period.yr + 1 : period.yr,
        mo: (period.mo + d + 12) % 12,
      },
    })

  return (
    <div className={s.fCol}>
      {has('period') && (
        <div className={s.fColSec}>
          <div className={s.fColLbl}>Período</div>
          {!isRange && (
            <div className={s.monthPick}>
              <button
                type="button"
                className={s.pill}
                aria-label="Mês anterior"
                onClick={() => stepMonth(-1)}
              >
                <IconChevronLeft size={13} aria-hidden="true" />
              </button>
              <span className={s.monthLbl}>
                {MONTH_PT[period.mo]} {period.yr}
              </span>
              <button
                type="button"
                className={s.pill}
                aria-label="Próximo mês"
                onClick={() => stepMonth(1)}
              >
                <IconChevronRight size={13} aria-hidden="true" />
              </button>
            </div>
          )}
          <label className={s.fColRow}>
            <input
              type="checkbox"
              checked={isRange}
              onChange={e =>
                set({
                  // yr/mo ride along in range mode too: ReportModal's Pix `txid`
                  // reads them unconditionally, and dropping them here would put
                  // `undefined` in a payment identifier (#104's family).
                  period: e.target.checked
                    ? {
                        mode: 'range',
                        yr: period.yr,
                        mo: period.mo,
                        from: `${period.yr}-${String(period.mo + 1).padStart(2, '0')}-01`,
                        to: `${period.yr}-${String(period.mo + 1).padStart(2, '0')}-01`,
                      }
                    : { mode: 'month', yr: period.yr, mo: period.mo },
                })
              }
            />
            Intervalo personalizado
          </label>
          {isRange && (
            <div className={s.rangeRow}>
              <input
                type="date"
                value={period.from}
                aria-label="Data inicial"
                onChange={e => set({ period: { ...period, from: e.target.value } })}
              />
              <input
                type="date"
                value={period.to}
                aria-label="Data final"
                onChange={e => set({ period: { ...period, to: e.target.value } })}
              />
            </div>
          )}
        </div>
      )}

      {has('type') && (
        <div className={s.fColSec}>
          <div className={s.fColLbl}>Tipo</div>
          {[
            ['aula', 'Aulas'],
            ['personal', 'Personal'],
          ].map(([k, lbl]) => (
            <label key={k} className={s.fColRow}>
              <input
                type="checkbox"
                checked={f.types[k]}
                onChange={() => set({ types: { ...f.types, [k]: !f.types[k] } })}
              />
              {lbl}
            </label>
          ))}
        </div>
      )}

      {has('status') && (
        <div className={s.fColSec}>
          <div className={s.fColLbl}>Status</div>
          {['all', 'scheduled', 'completed'].map(st => (
            <label key={st} className={s.fColRow}>
              <input
                type="radio"
                name="evFilterStatus"
                checked={f.status === st}
                onChange={() => set({ status: st })}
              />
              {st === 'all' ? 'Todas' : STATUS_LABELS[st]}
            </label>
          ))}
        </div>
      )}

      {has('affiliate') && affItems.length > 0 && (
        <div className={s.fColSec}>
          <div className={s.fColLbl}>Afiliados</div>
          <div className={s.pillWrap}>
            <SetPills
              items={affItems}
              selected={f.affiliates}
              onAll={() => set({ affiliates: null })}
              onToggle={id => set({ affiliates: toggleInSet(f.affiliates, id) })}
            />
          </div>
        </div>
      )}

      {has('athlete') && f.types.personal && athItems.length > 0 && (
        <div className={s.fColSec}>
          <div className={`${s.fColLbl} ${s.gold}`}>
            Atletas <span className={s.fColHint}>· só personal</span>
          </div>
          <div className={s.pillWrap}>
            <SetPills
              items={athItems}
              selected={f.athletes}
              onAll={() => set({ athletes: null })}
              onToggle={id => set({ athletes: toggleInSet(f.athletes, id) })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
