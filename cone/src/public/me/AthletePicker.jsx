import styles from './Me.module.css'

// "Quem é você?" — one component, two layouts.
//
//   variant="picker" → the first-visit screen (mobile)
//   variant="rail"   → the persistent left rail (desktop ≥768px)
//
// Both were inlined twice in Me.jsx with the same filter/sort logic copy-pasted.
// Since #52 the choice is remembered (localStorage `cone_athlete_filter`, the key
// results.html and schedule.html already share), so the picker is what the backlog
// always called it: a *first-visit* screen, not a toll gate on every load.
export default function AthletePicker({
  variant,
  athletes,
  selected,
  query,
  onQuery,
  onSelect,
  onClear,
}) {
  const q = query.trim().toLowerCase()
  const sorted = [...athletes].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const matches = q ? sorted.filter(a => a.name.toLowerCase().includes(q)) : sorted

  if (variant === 'rail') {
    return (
      <div className={styles.selPane}>
        <h2 className={styles.selPhdr}>Atletas</h2>
        <div className={styles.selSearch}>
          <input
            className={styles.selInp}
            type="search"
            placeholder="Buscar..."
            aria-label="Buscar atleta"
            value={query}
            onChange={e => onQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className={styles.selList}>
          <a
            className={`${styles.selTodos} ${!selected ? styles.selTodosOn : ''}`}
            href="me.html"
            aria-current={!selected ? 'true' : undefined}
            onClick={e => {
              e.preventDefault()
              onClear()
            }}
          >
            <span
              className={`${styles.selTodosDi} ${!selected ? styles.selDiOn : ''}`}
              aria-hidden="true"
            >
              {!selected ? '◆' : '◇'}
            </span>
            <span className={styles.selTodosLbl}>Todos</span>
          </a>
          {matches.map(a => {
            const on = String(selected?.id) === String(a.id)
            return (
              <a
                key={a.id}
                className={`${styles.selItem} ${on ? styles.selItemOn : ''}`}
                href={`me.html?id=${a.id}`}
                aria-current={on ? 'true' : undefined}
                onClick={e => {
                  e.preventDefault()
                  onSelect(a)
                }}
              >
                <span className={`${styles.selDi} ${on ? styles.selDiOn : ''}`} aria-hidden="true">
                  {on ? '◆' : '◇'}
                </span>
                <div className={styles.selInfo}>
                  <div className={`${styles.selName} ${on ? styles.selNameOn : ''}`}>{a.name}</div>
                  {a.level && (
                    <div className={`${styles.selLevel} ${on ? styles.selLevelOn : ''}`}>
                      {a.level}
                    </div>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pickerWrap}>
      <h1 className={styles.pickerTitle}>Quem é você?</h1>
      <p className={styles.pickerSub}>Selecione seu nome para ver seu perfil.</p>
      <input
        className={styles.pickerInput}
        type="search"
        placeholder="Buscar..."
        aria-label="Buscar atleta"
        value={query}
        onChange={e => onQuery(e.target.value)}
        autoComplete="off"
      />
      <div className={styles.pickerList}>
        {!matches.length ? (
          <div className={styles.pickerEmpty}>Nenhum atleta encontrado.</div>
        ) : (
          matches.map(a => (
            <a
              key={a.id}
              className={styles.pickerItem}
              href={`me.html?id=${a.id}`}
              onClick={e => {
                e.preventDefault()
                onSelect(a)
              }}
            >
              <span
                className={styles.athDot}
                style={{ background: a.color || 'var(--teal)' }}
                aria-hidden="true"
              />
              <span className={styles.pickerName}>{a.name}</span>
            </a>
          ))
        )}
      </div>
    </div>
  )
}
