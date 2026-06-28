import { useState } from 'react'
import { supabase } from '../utils/supabase'

export function useLiveRegistration({ tvRef, selSessId, selDate, timerBlkId, selSessObj, loadResults }) {
  const [liveRegs,   setLiveRegs]   = useState({})
  const [liveScales, setLiveScales] = useState({})

  function elapsedSecs() {
    const t = tvRef.current
    if (!t) return 0
    if (t.timer_started_at) return Math.floor((Date.now() - t.timer_started_at) / 1000 + (t.timer_paused_elapsed ?? 0))
    return t.timer_paused_elapsed ?? 0
  }

  function currentTimerBlock() {
    const bid = tvRef.current?.timer_block_id || timerBlkId
    if (!bid || !selSessObj) return null
    return (selSessObj.blocks || []).find(b => b.id === bid) || null
  }

  async function registerLive(athleteId, scale) {
    const secs  = elapsedSecs()
    const block = currentTimerBlock()
    const { data: existing } = await supabase.from('results_v2')
      .select('id,blocks').eq('athlete_id', athleteId)
      .eq('session_id', selSessId).eq('date', selDate)
      .maybeSingle()
    const newBlk = {
      blockId: block?.id || 'live', blockType: 'For Time',
      blockLabel: block?.label || block?.type || 'For Time',
      perfTime: secs, scale, rpe: null,
    }
    const merged = existing
      ? [...(existing.blocks || []).filter(b => b.blockId !== newBlk.blockId), newBlk]
      : [newBlk]
    await supabase.from('results_v2').upsert({
      ...(existing ? { id: existing.id } : {}),
      date: selDate, athlete_id: athleteId, session_id: selSessId,
      blocks: merged, logged_by_athlete: false,
    })
    setLiveRegs(r => ({ ...r, [athleteId]: { perfTime: secs, scale } }))
    loadResults()
  }

  async function undoLive(athleteId) {
    const block = currentTimerBlock()
    const bid   = block?.id || 'live'
    const { data: existing } = await supabase.from('results_v2')
      .select('id,blocks').eq('athlete_id', athleteId)
      .eq('session_id', selSessId).eq('date', selDate)
      .maybeSingle()
    if (!existing) return
    const trimmed = (existing.blocks || []).filter(b => b.blockId !== bid)
    await supabase.from('results_v2').update({ blocks: trimmed }).eq('id', existing.id)
    setLiveRegs(r => { const n = { ...r }; delete n[athleteId]; return n })
    loadResults()
  }

  return { liveRegs, liveScales, setLiveScales, setLiveRegs, registerLive, undoLive }
}
