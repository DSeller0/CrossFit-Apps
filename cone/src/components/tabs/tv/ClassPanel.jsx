export default function ClassPanel({
  tv, selSessId, activeClass, pastClasses, athletes,
  classLabel, setClassLabel, startClass, endClass, loadClasses,
  s, // style constants
}) {
  return (
    <div style={s.card}>
      <div style={s.cardTitle}>Aula</div>

      {!tv?.class_id ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={s.lbl}>Turma</label>
            <input value={classLabel} onChange={e => setClassLabel(e.target.value)}
              placeholder="ex: 7h, 9h, Turma A" style={s.input} />
          </div>
          <button onClick={startClass} disabled={!selSessId}
            style={{ ...s.btn, background: selSessId ? '#48b860' : '#1a1a1a', borderColor: selSessId ? '#48b860' : '#2a231c', color: selSessId ? '#0d0b09' : '#554a3a', flexShrink: 0 }}>
            <i className="ti ti-whistle" /> Iniciar Aula
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#48b860', display: 'inline-block', boxShadow: '0 0 6px #48b860' }} />
              <span style={{ fontSize: 16, fontWeight: 900, color: '#4ac8c0' }}>{activeClass?.class_label || 'Aula ativa'}</span>
            </div>
            <button onClick={endClass} style={{ ...s.btn, fontSize: 11, borderColor: '#c84038', color: '#c84038', background: 'transparent' }}>
              <i className="ti ti-square-off" /> Encerrar
            </button>
          </div>

          <div style={{ fontSize: 13, color: '#c8b090', marginBottom: 10 }}>
            {((activeClass?.athlete_ids?.length || 0) + (activeClass?.anon_names?.length || 0))} atletas presentes
            <button onClick={loadClasses} style={{ ...s.btn, fontSize: 10, padding: '2px 6px', marginLeft: 8, background: 'transparent', color: '#806850' }}>
              <i className="ti ti-refresh" />
            </button>
          </div>

          {((activeClass?.athlete_ids?.length || 0) + (activeClass?.anon_names?.length || 0)) > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {(activeClass?.athlete_ids || []).map(id => {
                const a = athletes.find(x => x.id === id)
                return a ? <span key={id} style={{ ...s.pill, borderColor: '#1a3a1a', color: '#48b860', background: '#0a1a0a' }}>{a.name}</span> : null
              })}
              {(activeClass?.anon_names || []).map((name, i) => (
                <span key={i} style={{ ...s.pill, borderStyle: 'dashed' }}>{name}</span>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, color: '#554a3a', background: '#161210', border: '1px solid #2a231c', borderRadius: 4, padding: '6px 10px' }}>
            <i className="ti ti-qrcode" style={{ marginRight: 4 }} />
            QR no slide <strong style={{ color: '#c8b090' }}>QR Code</strong> leva ao check-in
          </div>
        </>
      )}

      {pastClasses.length > 0 && (
        <div style={{ marginTop: 14, borderTop: '1px solid #2a231c', paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: '#554a3a', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Aulas anteriores hoje</div>
          {pastClasses.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
              <span style={{ color: '#806850', fontWeight: 700 }}>{c.class_label}</span>
              <span style={{ color: '#554a3a' }}>{(c.athlete_ids?.length || 0) + (c.anon_names?.length || 0)} atletas</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
