import { useState } from 'react'
import { rankResults, perfStr } from '../../../public/lib/wod.js'
import st from './tvController.module.css'

function buildMembers(cls, athletes) {
  return [
    ...(cls.athlete_ids || []).map(id => ({
      type: 'real', id, key: `real:${id}`, name: athletes.find(a => a.id === id)?.name || '?',
    })),
    ...(cls.anon_names || []).map(name => ({ type: 'anon', name, key: `anon:${name}` })),
  ]
}

function scoreMembers(members, cls, results, activeBlockId, liveOverride) {
  return members.map(m => {
    let entry = null
    if (m.type === 'real') {
      const row = results.find(r => r.athleteId === m.id)
      const blk = row?.blocks?.find(b => b.blockId === activeBlockId)
      if (blk) entry = { perfTime: blk.perfTime, perfRounds: blk.perfRounds, perfReps: blk.perfReps, scale: blk.scale }
    } else {
      const ar = cls.anon_results?.[m.name]
      if (ar && ar.blockId === activeBlockId) entry = { perfTime: ar.perfTime, scale: ar.scale }
    }
    if (!entry && liveOverride[m.key]) entry = liveOverride[m.key]
    return { ...m, entry }
  })
}

function RosterRow({ m, rank, timerType, isActive, canRegister, liveReg }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(null)
  const scale = liveReg.liveScales[m.key] ?? 'Rx'

  function startEdit() {
    setDraft({ perfTime: m.entry.perfTime || '', scale: m.entry.scale || null })
    setEditing(true)
  }
  async function saveEdit() {
    await liveReg.editLive(m, draft)
    setEditing(false)
  }
  async function remove() {
    await liveReg.removeLive(m)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className={st.rosterRow}>
        <span className={st.rank}>{rank ?? '—'}</span>
        <span className={st.athName}>{m.name}</span>
        <div className={st.scalePills}>
          {['Rx','Sc','Adp'].map(sc => (
            <button key={sc} className={`${st.scalePill} ${draft.scale === sc ? st.sel : ''}`}
              onClick={() => setDraft(d => ({ ...d, scale: sc }))}>{sc}</button>
          ))}
        </div>
        <input className={`${st.input} ${st.editTimeInput}`} value={draft.perfTime} placeholder="mm:ss"
          onChange={e => setDraft(d => ({ ...d, perfTime: e.target.value }))} />
        <button className={`${st.btn} ${st.rowBtn} ${st.reg}`} onClick={saveEdit}>Salvar</button>
        <button className={`${st.btn} ${st.rowBtn} ${st.remove}`} onClick={remove}><i className="ti ti-trash" /></button>
        <button className={`${st.btn} ${st.rowBtn} ${st.edit}`} onClick={() => setEditing(false)}>Cancelar</button>
      </div>
    )
  }

  return (
    <div className={`${st.rosterRow} ${m.entry ? st.registered : ''}`}>
      <span className={st.rank}>{m.entry ? rank : '—'}</span>
      <span className={st.athName}>
        {m.name}{m.type === 'anon' && <span className={st.guestBadge}>visitante</span>}
      </span>
      {m.entry ? (
        <>
          <span className={st.pill}>{m.entry.scale || '—'}</span>
          <span className={`${st.perf} ${!m.entry.perfTime && !m.entry.perfRounds ? st.empty : ''}`}>
            {perfStr(m.entry, timerType)}
          </span>
          {isActive && (
            <button className={`${st.btn} ${st.rowBtn} ${st.edit}`} onClick={startEdit}>
              <i className="ti ti-pencil" /> Editar
            </button>
          )}
        </>
      ) : canRegister ? (
        <>
          <div className={st.scalePills}>
            {['Rx','Sc','Adp'].map(sc => (
              <button key={sc} className={`${st.scalePill} ${scale === sc ? st.sel : ''}`}
                onClick={() => liveReg.setLiveScales(s => ({ ...s, [m.key]: sc }))}>{sc}</button>
            ))}
          </div>
          <button className={`${st.btn} ${st.rowBtn} ${st.reg}`} onClick={() => liveReg.registerLive(m, scale)}>
            <i className="ti ti-check" /> Registrar
          </button>
        </>
      ) : (
        <span className={`${st.perf} ${st.empty}`}>—</span>
      )}
    </div>
  )
}

function ClassAccordion({ cls, isActive, expanded, onToggle, athletes, results, activeBlockId, timerType, canRegister, liveReg, endClass }) {
  const members = buildMembers(cls, athletes)
  const scored  = scoreMembers(members, cls, results, activeBlockId, liveReg.liveOverride)
  const registered = scored.filter(m => m.entry)
  const pending    = scored.filter(m => !m.entry)
  const ranked     = rankResults(registered.map(m => m.entry), timerType)
    .map(e => registered.find(m => m.entry === e))

  return (
    <div className={`${st.classCard} ${isActive ? st.active : ''} ${expanded ? st.expanded : ''}`}>
      <div className={st.classHead} onClick={onToggle}>
        <div className={st.classHeadInfo}>
          <div className={st.cName}>
            {isActive && <span className={st.liveDot} />}
            {cls.class_label || 'Turma'}
          </div>
          <div className={st.cMeta}>{members.length} atletas · {registered.length} registrados</div>
        </div>
        {isActive && (
          <button className={`${st.btn} ${st.endBtn}`} onClick={e => { e.stopPropagation(); endClass() }}>
            <i className="ti ti-square-off" /> Encerrar
          </button>
        )}
        <span className={st.chev}>{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && (
        <div className={st.rosterList}>
          {ranked.map((m, i) => (
            <RosterRow key={m.key} m={m} rank={i + 1} timerType={timerType}
              isActive={isActive} canRegister={false} liveReg={liveReg} />
          ))}
          {pending.map(m => (
            <RosterRow key={m.key} m={m} rank={null} timerType={timerType}
              isActive={isActive} canRegister={isActive && canRegister} liveReg={liveReg} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClassPanel({
  tv, selSessId, todayClasses, activeClass, athletes, results, activeBlockId, timerType, timerRun,
  classLabel, setClassLabel, startClass, endClass, liveReg,
}) {
  const [manualToggle, setManualToggle] = useState({})
  const canRegister = timerType === 'For Time' && (timerRun || (tv?.timer_paused_elapsed > 0))

  return (
    <div className={st.card}>
      <div className={st.cardTitle}>Aula</div>
      <div className={st.classForm}>
        <div className={st.classFormField}>
          <label className={st.lbl}>Turma</label>
          <input className={st.input} value={classLabel} onChange={e => setClassLabel(e.target.value)}
            placeholder="ex: 7h, 9h, Turma A" disabled={!!activeClass} />
        </div>
        <button className={`${st.btn} ${st.classFormBtn}`} onClick={startClass} disabled={!selSessId || !!activeClass}>
          <i className="ti ti-whistle" /> Iniciar
        </button>
      </div>
      {activeClass && <div className={st.classHint}>Encerre a aula ativa para iniciar outra.</div>}

      {todayClasses.length === 0 ? (
        <div className={st.emptyNote}>Nenhuma aula hoje ainda</div>
      ) : (
        <div className={st.classList}>
          {todayClasses.map(cls => {
            const isActive = cls.id === activeClass?.id
            const expanded = manualToggle[cls.id] ?? isActive
            return (
              <ClassAccordion key={cls.id} cls={cls} isActive={isActive} expanded={expanded}
                onToggle={() => setManualToggle(t => ({ ...t, [cls.id]: !expanded }))}
                athletes={athletes} results={results} activeBlockId={activeBlockId}
                timerType={timerType} canRegister={canRegister} liveReg={liveReg} endClass={endClass} />
            )
          })}
        </div>
      )}
    </div>
  )
}
