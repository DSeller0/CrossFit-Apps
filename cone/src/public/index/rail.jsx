import { useState } from 'react'
import { IconCalendar, IconChartBar, IconTrophy, IconAlertTriangle } from '@tabler/icons-react'
import { getWeek, toISO, todayISO, DAY_PT_TITLE, DAY_PT_FULL, MONTH_PT_SHORT } from '../lib/week.js'
import { inBoxScope } from '../lib/boxScope.js'
import { blkColor, isWodBlock } from '../lib/wod.js'
import { ExerciseList } from '../shared/ExerciseList.jsx'
import s from './rail.module.css'

// Index landing-page pieces (#53 Part B — evolved to the full-width-week + selected-day
// two-column layout). Tabler icons are inline SVG (never the `ti` webfont — not loaded here).

// ── WeekGrid ────────────────────────────────────────────────────────────────
// Full-width 7-day Sunday-start grid. Each day shows its first session's name (or
// "Descanso"); clicking selects it — the panel below swaps to that day. Selected +
// today highlighted.
export function WeekGrid({ sessions, box, selectedDate, onSelect }) {
  const today = todayISO()
  const days = getWeek(0).map(d => {
    const key = toISO(d)
    const list = (sessions?.[key] || []).filter(x => x.public !== false && inBoxScope(x, box))
    return {
      key, dow: d.getDay(), num: d.getDate(), count: list.length,
      name: list[0]?.sessionName || list[0]?.name || '',
      isToday: key === today,
    }
  })
  return (
    <div className={s.week}>
      {days.map(d => (
        <button key={d.key} type="button" onClick={() => onSelect(d.key)}
          className={`${s.wd}${d.key === selectedDate ? ' ' + s.wdSel : ''}${d.isToday ? ' ' + s.wdToday : ''}`}>
          <span className={s.wdL}>{DAY_PT_TITLE[d.dow]}</span>
          <span className={s.wdN}>{d.num}</span>
          <span className={s.wdName}>{d.count ? (d.name || `${d.count} treino${d.count > 1 ? 's' : ''}`) : 'Descanso'}</span>
          {d.count > 0 && <span className={s.wdDot} />}
        </button>
      ))}
    </div>
  )
}

// Title for the selected day, e.g. "SEXTA, 18 — HOJE".
export function dayTitle(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const name = DAY_PT_FULL[dt.getDay()].replace('-feira', '')
  return `${name}, ${d}${dateKey === todayISO() ? ' — Hoje' : ''}`
}

// ── DaySessionCard ──────────────────────────────────────────────────────────
// The selected day's session, with expandable blocks (tap a block → its exercises via
// the shared ExerciseList) and an Agenda + Registrar footer.
export function DaySessionCard({ sess, tag, count, isFuture, box }) {
  const [expanded, setExpanded] = useState(() => new Set())
  const toggle = id => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const blocks = sess.blocks || []
  const qs = box ? `&box=${encodeURIComponent(box)}` : ''
  const agendaUrl = `schedule.html?date=${sess._dk || ''}&session=${encodeURIComponent(sess.id)}${qs}`
  const regUrl = `results.html?session=${encodeURIComponent(sess.id)}`
  const countLbl = count === 0 ? 'Seja o primeiro' : count === 1 ? '1 resultado' : `${count} resultados`

  return (
    <div className={s.sessCard}>
      <div className={s.sessTag}>{tag}</div>
      <div className={s.sessTitle}>{sess.sessionName || sess.name || 'Sessão'}</div>
      <div className={s.blocks}>
        {blocks.map((b, i) => <SessionBlock key={b.id || i} block={b} expanded={expanded.has(b.id || i)} onToggle={() => toggle(b.id || i)} />)}
      </div>
      <div className={s.sessFoot}>
        <span className={s.reg}>{countLbl}</span>
        <a className={s.footBtn} href={agendaUrl} title="Ver na agenda" aria-label="Ver na agenda"><IconCalendar className={s.footIc} /><span className={s.footArr}>→</span></a>
        {!isFuture && <a className={`${s.footBtn} ${s.footBtnReg}`} href={regUrl} title="Registrar resultado" aria-label="Registrar resultado"><IconChartBar className={s.footIc} /><span className={s.footArr}>→</span></a>}
      </div>
    </div>
  )
}

// One block row: family-colored header (clickable) → expands to the exercise list.
function SessionBlock({ block, expanded, onToggle }) {
  const color = blkColor(block)
  const label = block.label && block.label !== block.type ? block.label : null
  const meta = [
    block.duration && (isWodBlock(block) ? `Cap ${block.duration}'` : `${block.duration}'`),
    block.rounds && `${block.rounds} rds`,
    block.stationRepeat && `${block.stationRepeat}×`,
  ].filter(Boolean).join(' · ')
  const exes = block.type === 'Estações'
    ? (block.stations || []).flatMap(st => st.exercises || [])
    : (block.exercises || [])
  const canExpand = exes.length > 0

  return (
    <div className={`${s.blk}${expanded ? ' ' + s.blkOpen : ''}`}>
      <button type="button" className={s.blkHdr} onClick={canExpand ? onToggle : undefined} disabled={!canExpand}>
        <span className={s.blkDot} style={{ background: color }} />
        <span className={s.blkType} style={{ color }}>{block.type}</span>
        {label && <><span className={s.blkSep}>·</span><span className={s.blkLabel}>{label}</span></>}
        {meta && <span className={s.blkMeta}>{meta}</span>}
        {canExpand && <span className={s.blkChev} />}
      </button>
      {expanded && canExpand && <div className={s.blkBody}><ExerciseList exercises={exes} color={color} size="tiny" /></div>}
    </div>
  )
}

// ── DayRanking ──────────────────────────────────────────────────────────────
// Top-3 of the selected day's WOD. Presentational — Index computes `rows`.
export function DayRanking({ wodLabel, wodMeta, rows, href, empty }) {
  return (
    <div className={s.rBox}>
      <div className={s.rTtl}><IconTrophy className={s.rTtlIc} /> Ranking de hoje</div>
      {rows?.length ? (
        <>
          {wodLabel && <div className={s.rWod}>{wodLabel}</div>}
          {wodMeta && <div className={s.rWodMeta}>{wodMeta}</div>}
          {rows.map((r, i) => (
            <div key={i} className={s.rk}>
              <span className={s.rkPos} style={{ '--pcol': `var(--podium-${i + 1})` }}>{i + 1}</span>
              <span className={s.rkName}>{r.name}</span>
              {r.scale && <span className={s.rkScale}>{r.scale}</span>}
              <span className={s.rkPerf}>{r.perf}</span>
            </div>
          ))}
          {href && <a className={s.rMore} href={href}>Ver leaderboard →</a>}
        </>
      ) : (
        <div className={s.rEmpty}>{empty || 'Sem resultados ainda.'}</div>
      )}
    </div>
  )
}

// ── Box warnings ────────────────────────────────────────────────────────────
function fmtWarnDate(date) {
  if (!date) return ''
  const [y, m, d] = date.split('-').map(Number)
  return `${d} ${MONTH_PT_SHORT[m - 1].toLowerCase()}`
}
function warnParts(message) {
  const idx = message.indexOf(' — ')
  return idx > 0 ? [message.slice(0, idx), message.slice(idx + 3)] : [null, message]
}

// Desktop: a strip of up to 3 recent warnings, each with a date.
export function BoxWarnings({ warnings }) {
  if (!warnings?.length) return null
  return (
    <div className={s.warnStrip}>
      {warnings.map(w => {
        const [lead, rest] = warnParts(w.message)
        return (
          <div key={w.id} className={s.warnCard}>
            <div className={s.warnTop}><IconAlertTriangle className={s.warnIc} /><span className={s.warnDate}>{fmtWarnDate(w.date)}</span></div>
            <div className={s.warnMsg}>{lead ? <><b>{lead}</b> — {rest}</> : rest}</div>
          </div>
        )
      })}
    </div>
  )
}

// Mobile: just the single most-recent warning, inline near the top.
export function MobileWarning({ warning }) {
  if (!warning?.message?.trim()) return null
  const [lead, rest] = warnParts(warning.message)
  return (
    <div className={s.warnMobile}>
      <IconAlertTriangle className={s.warnIc} />
      <span className={s.warnMsg}>{lead ? <><b>{lead}</b> — {rest}</> : rest}</span>
    </div>
  )
}
