import s from './Atletas.module.css'

// The grade's group header (#160/plans/76) — a bare day label ("Hoje", "Amanhã",
// "Sex 05/09") or "Sem sessão marcada". A time is appended only when an agenda
// event links the session; most groups never have one, and that's fine — it gets
// better for free as the coach uses Agenda (see nextSessionGroups).
// CLIENT-FREE.
export default function DayGroupHeader({ label, time }) {
  return (
    <div className={s.dayHdr}>
      {label}
      {time && <span className={s.dayHdrTime}> · {time}</span>}
    </div>
  )
}
