import styles from './Schedule.module.css'
import BlockDetail from './BlockDetail.jsx'

// ── Session Detail ────────────────────────────────────────────────────────────
export default function SessionDetail({
  sess,
  dateKey,
  checked,
  roundState,
  rmValues,
  rmEditKey,
  demoMap,
  isWodLogged,
  onCheck,
  onAdvance,
  onReset,
  onRmToggle,
  onRmConfirm,
  onDemo,
  onTimer,
  onLog,
  onLogBlock = null,
  getAthResult = null,
  athName = '',
}) {
  return (
    <div className={styles.dayDetail} onClick={e => e.stopPropagation()}>
      {sess.sessionName && <div className={styles.detailSessTitle}>{sess.sessionName}</div>}
      {(sess.blocks || []).map(bl => (
        <BlockDetail
          key={bl.id}
          bl={bl}
          sess={sess}
          dateKey={dateKey}
          checked={checked}
          roundState={roundState}
          rmValues={rmValues}
          rmEditKey={rmEditKey}
          demoMap={demoMap}
          isWodLogged={isWodLogged}
          onCheck={onCheck}
          onAdvance={onAdvance}
          onReset={onReset}
          onRmToggle={onRmToggle}
          onRmConfirm={onRmConfirm}
          onDemo={onDemo}
          onTimer={onTimer}
          onLogBlock={onLogBlock ? () => onLogBlock(bl) : null}
          athResult={getAthResult ? getAthResult(bl) : null}
          athName={athName}
        />
      ))}
      <button
        className={styles.logBtn}
        onClick={e => {
          e.stopPropagation()
          onLog()
        }}
      >
        <i className="ti ti-pencil" /> Registrar resultado
      </button>
    </div>
  )
}
