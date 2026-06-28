import { blkLabel, blkColor } from '../../../public/lib/wod.js'

export default function GroupsPanel({
  activeClass, groups, wodBlocks, rotationBlocks, rotationBlockIds, groupPositions, restSecs,
  timerCap, timerType,
  autoAdvance, setAutoAdvance,
  athletes,
  createGroups, dissolveGroups, setGroupBlock, reassignMember, advanceAll, toggleRotationBlock,
  push,
  s,
}) {
  if (!activeClass) return null

  return (
    <div style={s.card}>
      <div style={s.cardTitle}>Grupos</div>

      {groups.length === 0 ? (
        <div>
          <div style={{ fontSize: 12, color: '#806850', marginBottom: 12 }}>
            Divida a turma em grupos para rotação de blocos
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => createGroups(n)}
                style={{ ...s.btn, background: '#1a1a1a', color: '#c8b090', fontSize: 13, padding: '8px 18px' }}>
                {n} grupos
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Group cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {groups.map(grp => (
              <div key={grp.id} style={{ border: `1px solid ${grp.color}44`, borderLeft: `4px solid ${grp.color}`, borderRadius: 4, padding: '10px 12px', background: '#161210' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: grp.color, fontWeight: 900, fontSize: 13, minWidth: 72 }}>{grp.name}</span>
                  <select value={groupPositions[grp.id] || ''} onChange={e => setGroupBlock(grp.id, e.target.value)}
                    style={{ ...s.input, flex: 1, fontSize: 11 }}>
                    <option value="">— bloco —</option>
                    {wodBlocks.map(bl => (
                      <option key={bl.id} value={bl.id}>{blkLabel(bl)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: 11, color: '#806850' }}>
                  {[...(grp.athleteIds || []).map(id => athletes.find(a => a.id === id)?.name).filter(Boolean),
                    ...(grp.anonNames || [])].join(' · ') || <em style={{ color: '#554a3a' }}>Sem atletas</em>}
                </div>
              </div>
            ))}
          </div>

          {/* Athlete assignment */}
          {((activeClass.athlete_ids?.length || 0) + (activeClass.anon_names?.length || 0)) > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#554a3a', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Atribuir atletas</div>
              {[
                ...(activeClass.athlete_ids || []).map(id => ({ type: 'real', id, name: athletes.find(a => a.id === id)?.name || '?' })),
                ...(activeClass.anon_names  || []).map(name => ({ type: 'anon', id: null, name })),
              ].map(m => {
                const inGroup = groups.find(g =>
                  m.type === 'real' ? (g.athleteIds || []).includes(m.id) : (g.anonNames || []).includes(m.name)
                )
                return (
                  <div key={m.type === 'real' ? m.id : `anon-${m.name}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <span style={{ flex: 1, fontSize: 12, color: '#f0e8d0' }}>{m.name}</span>
                    {groups.map(g => (
                      <button key={g.id} onClick={() => reassignMember(m, g.id)} style={{
                        width: 34, height: 28,
                        border: `2px solid ${inGroup?.id === g.id ? g.color : '#2a231c'}`,
                        background: inGroup?.id === g.id ? g.color + '22' : 'transparent',
                        color: inGroup?.id === g.id ? g.color : '#554a3a',
                        borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 800,
                      }}>
                        {g.name.replace('Grupo ', '')}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {/* Rotation block selection */}
          {wodBlocks.length > 0 && (
            <div style={{ borderTop: '1px solid #2a231c', paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#806850', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Rotação</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {wodBlocks.map(bl => {
                  const inRot = rotationBlockIds.length === 0 || rotationBlockIds.includes(bl.id)
                  return (
                    <button key={bl.id} onClick={() => toggleRotationBlock(bl.id)}
                      style={{ ...s.btn, fontSize: 10, padding: '4px 10px',
                        background: inRot ? '#0d1a10' : '#111',
                        borderColor: inRot ? '#4ac8c0' : '#2a231c',
                        color: inRot ? '#4ac8c0' : '#554a3a' }}>
                      {inRot ? '✓' : '○'} {bl.label || bl.type}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#806850', textTransform: 'uppercase', letterSpacing: '.1em', flexShrink: 0 }}>Descanso</span>
                <input type="number" min="0" max="600" value={restSecs}
                  onChange={e => push({ rotation_rest_secs: Math.max(0, parseInt(e.target.value) || 0) })}
                  style={{ ...s.input, width: 64, textAlign: 'center' }} />
                <span style={{ fontSize: 10, color: '#554a3a' }}>seg</span>
              </div>
            </div>
          )}

          {/* Rotation controls */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
            <button onClick={advanceAll}
              style={{ ...s.btn, background: '#4ac8c0', borderColor: '#4ac8c0', color: '#0d0b09' }}>
              Avançar todos →
            </button>
            <button onClick={() => setAutoAdvance(a => !a)}
              style={{ ...s.btn, borderColor: autoAdvance ? '#d8a840' : '#2a231c', background: autoAdvance ? '#1a120a' : '#1a1a1a', color: autoAdvance ? '#d8a840' : '#806850' }}>
              ⏩ Auto: {autoAdvance ? 'ON' : 'OFF'}
            </button>
            <button onClick={dissolveGroups}
              style={{ ...s.btn, background: 'transparent', borderColor: '#c84038', color: '#c84038' }}>
              Dissolve ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
