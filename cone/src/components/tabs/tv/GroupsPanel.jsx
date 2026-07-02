import { blkLabel } from '../../../public/lib/wod.js'
import st from './tvController.module.css'

export default function GroupsPanel({
  activeClass, groups, wodBlocks, rotationBlockIds, groupPositions, restSecs,
  autoAdvance, setAutoAdvance,
  athletes,
  createGroups, dissolveGroups, setGroupBlock, reassignMember, advanceAll, toggleRotationBlock,
  push,
}) {
  if (!activeClass) return null

  return (
    <div className={st.card}>
      <div className={st.cardTitle}>Grupos</div>

      {groups.length === 0 ? (
        <div>
          <div className={st.groupsIntro}>Divida a turma em grupos para rotação de blocos</div>
          <div className={st.groupsCreateBtns}>
            {[2, 3, 4].map(n => (
              <button key={n} className={`${st.btn} ${st.createBtn}`} onClick={() => createGroups(n)}>
                {n} grupos
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className={st.groupCards}>
            {groups.map(grp => (
              <div key={grp.id} className={st.groupCard} style={{ borderColor: grp.color + '44', borderLeftColor: grp.color }}>
                <div className={st.groupHead}>
                  <span className={st.groupName} style={{ color: grp.color }}>{grp.name}</span>
                  <select className={`${st.input} ${st.groupBlockSelect}`} value={groupPositions[grp.id] || ''}
                    onChange={e => setGroupBlock(grp.id, e.target.value)}>
                    <option value="">— bloco —</option>
                    {wodBlocks.map(bl => <option key={bl.id} value={bl.id}>{blkLabel(bl)}</option>)}
                  </select>
                </div>
                <div className={st.groupMembers}>
                  {[...(grp.athleteIds || []).map(id => athletes.find(a => a.id === id)?.name).filter(Boolean),
                    ...(grp.anonNames || [])].join(' · ') || <em className={st.groupMembersEmpty}>Sem atletas</em>}
                </div>
              </div>
            ))}
          </div>

          {((activeClass.athlete_ids?.length || 0) + (activeClass.anon_names?.length || 0)) > 0 && (
            <div className={st.assignSection}>
              <div className={st.sectionLbl}>Atribuir atletas</div>
              {[
                ...(activeClass.athlete_ids || []).map(id => ({ type: 'real', id, name: athletes.find(a => a.id === id)?.name || '?' })),
                ...(activeClass.anon_names  || []).map(name => ({ type: 'anon', id: null, name })),
              ].map(m => {
                const inGroup = groups.find(g =>
                  m.type === 'real' ? (g.athleteIds || []).includes(m.id) : (g.anonNames || []).includes(m.name)
                )
                return (
                  <div key={m.type === 'real' ? m.id : `anon-${m.name}`} className={st.assignRow}>
                    <span className={st.assignName}>{m.name}</span>
                    {groups.map(g => (
                      <button key={g.id} className={st.assignBtn} onClick={() => reassignMember(m, g.id)} style={{
                        borderColor: inGroup?.id === g.id ? g.color : undefined,
                        background: inGroup?.id === g.id ? g.color + '22' : undefined,
                        color: inGroup?.id === g.id ? g.color : undefined,
                      }}>
                        {g.name.replace('Grupo ', '')}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {wodBlocks.length > 0 && (
            <div className={st.rotationSection}>
              <div className={st.sectionLbl}>Rotação</div>
              <div className={st.rotationChips}>
                {wodBlocks.map(bl => {
                  const inRot = rotationBlockIds.length === 0 || rotationBlockIds.includes(bl.id)
                  return (
                    <button key={bl.id} className={`${st.btn} ${st.rotationChip} ${inRot ? st.on : ''}`}
                      onClick={() => toggleRotationBlock(bl.id)}>
                      {inRot ? '✓' : '○'} {bl.label || bl.type}
                    </button>
                  )
                })}
              </div>
              <div className={st.restRow}>
                <span className={st.restLbl}>Descanso</span>
                <input type="number" min="0" max="600" value={restSecs} className={`${st.input} ${st.restInput}`}
                  onChange={e => push({ rotation_rest_secs: Math.max(0, parseInt(e.target.value) || 0) })} />
                <span className={st.restUnit}>seg</span>
              </div>
            </div>
          )}

          <div className={st.rotationCtrls}>
            <button className={`${st.btn} ${st.advanceBtn}`} onClick={advanceAll}>Avançar todos →</button>
            <button className={`${st.btn} ${st.autoBtn} ${autoAdvance ? st.on : ''}`} onClick={() => setAutoAdvance(a => !a)}>
              ⏩ Auto: {autoAdvance ? 'ON' : 'OFF'}
            </button>
            <button className={`${st.btn} ${st.dissolveBtn}`} onClick={dissolveGroups}>Dissolve ×</button>
          </div>
        </div>
      )}
    </div>
  )
}
