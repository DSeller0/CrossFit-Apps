import { IconCalendarEvent, IconTrophy, IconAlertTriangle } from '@tabler/icons-react'
import { getWeek, toISO, todayISO, DAY_PT_TITLE } from '../lib/week.js'
import { inBoxScope } from '../lib/boxScope.js'
import s from './rail.module.css'

// Index right-rail cards (#53 Part B). Each self-hides when it has nothing to show, so
// the rail (desktop) / feed folds (mobile) never render an empty box. Tabler icons come
// from @tabler/icons-react (inline SVG) — never the `ti` webfont, which isn't loaded here.

// "Esta semana" — 7-day Sunday-start strip (getWeek(0)); a dot marks days with a public,
// in-scope session; today is highlighted.
export function WeekStrip({ sessions, box }) {
  const today = todayISO()
  const days = getWeek(0).map(d => {
    const key = toISO(d)
    const has = (sessions?.[key] || []).some(x => x.public !== false && inBoxScope(x, box))
    return { key, dow: d.getDay(), num: d.getDate(), has, isToday: key === today }
  })
  return (
    <div className={s.rBox}>
      <div className={s.rTtl}><IconCalendarEvent className={s.rTtlIc} /> Esta semana</div>
      <div className={s.week}>
        {days.map(d => (
          <div key={d.key} className={`${s.wd}${d.isToday ? ' ' + s.wdToday : ''}`}>
            <span className={s.wdL}>{DAY_PT_TITLE[d.dow]}</span>
            <span className={s.wdN}>{d.num}</span>
            <span className={`${s.wdDot}${d.has ? '' : ' ' + s.wdDotOff}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

// "Ranking de hoje" — top-3 of today's WOD. Presentational: Index computes `rows` with
// rankResults/perfStr and passes them in. Renders nothing when there's no WOD or results.
export function TodayRanking({ wodLabel, wodMeta, rows, href }) {
  if (!rows?.length) return null
  return (
    <div className={s.rBox}>
      <div className={s.rTtl}><IconTrophy className={s.rTtlIc} /> Ranking de hoje</div>
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
    </div>
  )
}

// "Avisos do box" — the coach-set warning (Criador → settings.boxWarnings). Nothing when empty.
export function BoxNotice({ message }) {
  if (!message?.trim()) return null
  return (
    <div className={s.rBox}>
      <div className={s.rTtl}><IconAlertTriangle className={s.rTtlIc} /> Avisos do box</div>
      <div className={s.notice}>
        <IconAlertTriangle className={s.nIcon} />
        <span className={s.nTxt}>{message}</span>
      </div>
    </div>
  )
}
