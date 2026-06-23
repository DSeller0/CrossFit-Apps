import s from './Header.module.css'

export default function Header({ brand = 'CONE', sub, backHref, backTitle }) {
  return (
    <header className={s.hdr} style={{ position: 'relative' }}>
      {backHref && (
        <a className={s.back} href={backHref} title={backTitle}>←</a>
      )}
      <div className={s.rule}>
        <div className={s.line} />
        <div className={s.diamond} />
        <div className={`${s.line} ${s.lineR}`} />
      </div>
      <div className={s.brand}>{brand}</div>
      {sub && <div className={s.sub}>{sub}</div>}
    </header>
  )
}
