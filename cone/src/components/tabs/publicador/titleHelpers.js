import { DAY_PT_TITLE, MONTH_PT } from '../../../public/lib/week.js'

// Per-format computed title defaults (#59 · C5·b2 · plans/83 T7) — what a format's
// Título placeholder shows, and what actually renders when the coach's own field is
// empty. Pure: no React, no client.
const pad = n => String(n).padStart(2, '0')

export function computedTitle(format, ctx = {}) {
  switch (format) {
    case 'dia':
    case 'diaMobile': {
      const d = ctx.date
      if (!d) return ''
      return `${DAY_PT_TITLE[d.getDay()].toUpperCase()} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
    }
    case 'semana':
    case 'semanaMobile': {
      const dates = ctx.weekDates
      if (!dates || !dates.length) return ''
      const start = dates[0]
      const end = dates[dates.length - 1]
      return `SEMANA ${start.getDate()}–${end.getDate()} ${MONTH_PT[start.getMonth()].toUpperCase()}`
    }
    case 'mes':
      return typeof ctx.month === 'number' && ctx.year
        ? `${MONTH_PT[ctx.month].toUpperCase()} ${ctx.year}`
        : ''
    default:
      return ''
  }
}

// `titles[format] || computedTitle(...)` is the resolution rule every view uses —
// centralised so the container, the Títulos panel's placeholder, and each export
// view can't drift into three different fallback orders.
export function resolveTitle(format, titles, ctx) {
  return (titles && titles[format]) || computedTitle(format, ctx)
}
