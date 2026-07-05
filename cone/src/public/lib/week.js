export const MONTH_PT       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const MONTH_PT_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
export const DAY_PT         = ['DOM','SEG','TER','QUA','QUI','SEX','SAB']
export const DAY_PT_TITLE   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

// "Dom 5 Jul" — day-name + date + short month, the shared display format
// (Me.jsx / Timer.jsx). Callers needing a different layout (e.g. TV's
// comma-separated variant) keep their own wrapper around the arrays above.
export function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `${DAY_PT_TITLE[d.getDay()]} ${d.getDate()} ${MONTH_PT_SHORT[d.getMonth()]}`
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

export function dateToWeekOffset(dateKey) {
  const now=new Date()
  const todaySun=new Date(now);todaySun.setDate(now.getDate()-now.getDay());todaySun.setHours(0,0,0,0)
  const target=new Date(dateKey+'T12:00:00')
  const targetSun=new Date(target);targetSun.setDate(target.getDate()-target.getDay());targetSun.setHours(0,0,0,0)
  return Math.round((targetSun-todaySun)/(7*24*60*60*1000))
}
