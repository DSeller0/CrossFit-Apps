export const MONTH_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const DAY_PT   = ['DOM','SEG','TER','QUA','QUI','SEX','SAB']

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
