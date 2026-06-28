function fmtSecs(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function LiveRegistrationPanel({
  timerType, activeClass, timerRun, tv, athletes,
  liveRegs, liveScales, setLiveScales,
  registerLive, undoLive,
  s,
}) {
  const hasTime = timerRun || (tv?.timer_paused_elapsed > 0)
  const total = (activeClass?.athlete_ids?.length || 0) + (activeClass?.anon_names?.length || 0)
  if (timerType !== 'For Time' || !activeClass || total === 0 || !hasTime) return null

  return (
    <div style={s.card}>
      <div style={{ ...s.cardTitle, color: '#4ac8c0' }}>
        <i className="ti ti-flag-check" style={{ marginRight: 6 }} />Registro ao Vivo
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(activeClass.athlete_ids || []).map(aid => {
          const ath = athletes.find(a => a.id === aid)
          if (!ath) return null
          const reg = liveRegs[aid]
          const scale = liveScales[aid] ?? 'Rx'
          const scaleBtn = (sc) => ({
            padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${scale === sc ? '#4ac8c0' : '#2a231c'}`,
            background: scale === sc ? '#0d1a1a' : 'transparent',
            color: scale === sc ? '#4ac8c0' : '#806850',
            borderRadius: 3,
          })
          return (
            <div key={aid} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
              background: reg ? '#0d1a0a' : '#161210',
              border: `1px solid ${reg ? '#48b86044' : '#2a231c'}`,
              borderRadius: 4, opacity: reg ? 0.7 : 1,
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: reg ? '#48b860' : '#f0e8d0', flex: 1 }}>{ath.name}</span>
              {!reg ? (
                <>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {['Rx','Sc','Adp'].map(sc => (
                      <button key={sc} style={scaleBtn(sc)} onClick={() => setLiveScales(ls => ({ ...ls, [aid]: sc }))}>{sc}</button>
                    ))}
                  </div>
                  <button onClick={() => registerLive(aid, scale)}
                    style={{ ...s.btn, background: '#4ac8c0', borderColor: '#4ac8c0', color: '#0d0b09', padding: '5px 12px', fontSize: 12 }}>
                    ✓ Registrar
                  </button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: '#48b860', fontFamily: 'monospace', fontWeight: 700 }}>{fmtSecs(reg.perfTime)}</span>
                  <span style={{ fontSize: 10, color: '#806850' }}>{reg.scale}</span>
                  <button onClick={() => undoLive(aid)}
                    style={{ ...s.btn, background: 'transparent', borderColor: '#c84038', color: '#c84038', padding: '4px 10px', fontSize: 11 }}>
                    ✕ Desfazer
                  </button>
                </>
              )}
            </div>
          )
        })}
        {(activeClass.anon_names || []).map((name, i) => (
          <div key={`anon-${i}`} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
            background: '#161210', border: '1px dashed #2a231c', borderRadius: 4, opacity: 0.5,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#806850', flex: 1 }}>{name}</span>
            <span style={{ fontSize: 10, color: '#554a3a' }}>visitante</span>
          </div>
        ))}
      </div>
    </div>
  )
}
