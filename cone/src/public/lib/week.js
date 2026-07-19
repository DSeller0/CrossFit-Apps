export const MONTH_PT       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const MONTH_PT_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
export const DAY_PT         = ['DOM','SEG','TER','QUA','QUI','SEX','SAB']
export const DAY_PT_TITLE   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
export const DAY_PT_FULL    = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']

// Day name for a YYYY-MM-DD key. Noon-anchored so a UTC-negative offset can't
// roll the date back a day. Used where a session has no name of its own.
export function dayNameFull(dateKey) {
  const [y,m,d] = dateKey.split('-').map(Number)
  return DAY_PT_FULL[new Date(y,m-1,d).getDay()]
}

// "Dom 5 Jul" — day-name + date + short month, the shared display format
// (Me.jsx / Timer.jsx). Callers needing a different layout (e.g. TV's
// comma-separated variant) keep their own wrapper around the arrays above.
export function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_PT_TITLE[d.getDay()]} ${d.getDate()} ${MONTH_PT_SHORT[d.getMonth()]}`
}

// "5 Jul" — date + short month, no day name. For dense rows where the weekday
// costs more than it tells you (me.html's event list).
export function fmtDateShort(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()} ${MONTH_PT_SHORT[d.getMonth()]}`
}

// "5 Jul 2026" — the same, with the year. Replaces a toLocaleDateString('pt-BR')
// call that rendered "05 de jul. de 2026"; keeping the format in our own hands
// means it can't drift with the browser's locale data.
export function fmtDateYear(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()} ${MONTH_PT_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

export function toISO(d) {
  const p = n => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`
}

export function todayISO() { return toISO(new Date()) }

export function getWeek(off) {
  const now=new Date(),sun=new Date(now)
  sun.setDate(now.getDate()-now.getDay()+off*7)
  return Array.from({length:7},(_,i)=>{const d=new Date(sun);d.setDate(sun.getDate()+i);return d})
}

// Sunday-start month grid, chunked into weeks of 7 cells. Every cell (including
// the leading/trailing days padding the first/last week) carries a real Date —
// not just in-month day numbers — because some callers (Publicador's export
// views) preview session content on padding days; `inMonth` flags which cells
// belong to the requested month. Canonical since #84, folding in 3 divergent
// month-grid builders (Publicador's Date-per-cell weeks, its day-number-or-null
// AgendaView grid, Resultados' {start,end} week summaries) — each derives its
// own shape from these cells (e.g. `inMonth ? date.getDate() : null`).
export function monthGridCells(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalWeeks = Math.ceil((first.getDay() + daysInMonth) / 7)
  const startDate = start.getDate()
  const weeks = []
  for (let w = 0; w < totalWeeks; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(startDate + w * 7 + d)
      week.push({ date, inMonth: date.getMonth() === month })
    }
    weeks.push(week)
  }
  return weeks
}

export function dateToWeekOffset(dateKey) {
  const now=new Date()
  const todaySun=new Date(now);todaySun.setDate(now.getDate()-now.getDay());todaySun.setHours(0,0,0,0)
  const target=new Date(dateKey+'T12:00:00')
  const targetSun=new Date(target);targetSun.setDate(target.getDate()-target.getDay());targetSun.setHours(0,0,0,0)
  return Math.round((targetSun-todaySun)/(7*24*60*60*1000))
}
