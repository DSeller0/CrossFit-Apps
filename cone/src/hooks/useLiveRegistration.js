import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { fmtSecs } from '../public/lib/wod.js'

// member shape: { type:'real', id, name, key } | { type:'anon', name, key }
// key is `real:<athleteId>` or `anon:<name>` — unified identity across results_v2 (real) and
// class_executions.anon_results (guest, day-scoped only — see CLAUDE.md TV system notes).
export function useLiveRegistration({
  tvRef, selSessId, selDate, selSessObj, activeClassId,
  elapsedSecs, currentTimerBlock, loadResults,
}) {
  const [liveScales,   setLiveScales]   = useState({}) // key -> 'Rx'|'Sc'|'Adp', pre-registration picker
  const [liveOverride, setLiveOverride] = useState({}) // key -> { perfTime, scale }, optimistic until server data lands

  function currentBlockId() {
    return currentTimerBlock(selSessObj)?.id || 'live'
  }

  async function writeEntry(member, { perfTime, scale }) {
    const blockId = currentBlockId()
    if (member.type === 'real') {
      const block = currentTimerBlock(selSessObj)
      const { data: existing } = await supabase.from('results_v2')
        .select('id,blocks').eq('athlete_id', member.id)
        .eq('session_id', selSessId).eq('date', selDate)
        .maybeSingle()
      const newBlk = {
        blockId, blockType: 'For Time',
        blockLabel: block?.label || block?.type || 'For Time',
        perfTime, scale, rpe: null,
      }
      const merged = existing
        ? [...(existing.blocks || []).filter(b => b.blockId !== blockId), newBlk]
        : [newBlk]
      await supabase.from('results_v2').upsert({
        ...(existing ? { id: existing.id } : {}),
        date: selDate, athlete_id: member.id, session_id: selSessId,
        blocks: merged, logged_by_athlete: false,
      })
      loadResults()
    } else {
      if (!activeClassId) return
      const { data: cls } = await supabase.from('class_executions')
        .select('anon_results').eq('id', activeClassId).maybeSingle()
      const next = { ...(cls?.anon_results || {}), [member.name]: { blockId, perfTime, scale } }
      await supabase.from('class_executions').update({ anon_results: next }).eq('id', activeClassId)
    }
    setLiveOverride(o => ({ ...o, [member.key]: { perfTime, scale } }))
  }

  async function registerLive(member, scale) {
    await writeEntry(member, { perfTime: fmtSecs(elapsedSecs()), scale })
  }

  async function editLive(member, { perfTime, scale }) {
    await writeEntry(member, { perfTime, scale })
  }

  async function removeLive(member) {
    const blockId = currentBlockId()
    if (member.type === 'real') {
      const { data: existing } = await supabase.from('results_v2')
        .select('id,blocks').eq('athlete_id', member.id)
        .eq('session_id', selSessId).eq('date', selDate)
        .maybeSingle()
      if (existing) {
        const trimmed = (existing.blocks || []).filter(b => b.blockId !== blockId)
        await supabase.from('results_v2').update({ blocks: trimmed }).eq('id', existing.id)
      }
      loadResults()
    } else if (activeClassId) {
      const { data: cls } = await supabase.from('class_executions')
        .select('anon_results').eq('id', activeClassId).maybeSingle()
      const next = { ...(cls?.anon_results || {}) }
      delete next[member.name]
      await supabase.from('class_executions').update({ anon_results: next }).eq('id', activeClassId)
    }
    setLiveOverride(o => { const n = { ...o }; delete n[member.key]; return n })
  }

  return { liveScales, setLiveScales, liveOverride, registerLive, editLive, removeLive }
}
