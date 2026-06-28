import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'
import { isWodBlock, uid } from '../public/lib/wod.js'

const GROUP_COLORS = ['#4ac8c0','#d8a840','#d05878','#6a88d0','#70b070','#c880c0']
const GROUP_NAMES  = ['Grupo A','Grupo B','Grupo C','Grupo D','Grupo E','Grupo F']

// Manages group rotation, auto-advance timer effects, and group CRUD.
// setTimerBlkId/Type/Cap are stable useState setters from useTimer.
// timerStartedAt, timerBlockId, rotationRestUntil, groupsLength are scalars for effect deps.
export function useGroupRotation({
  push, tvRef, selSessObjRef, activeClassRef,
  setTimerBlkId, setTimerType, setTimerCap,
  timerStartedAt, timerBlockId, rotationRestUntil, groupsLength,
}) {
  const [autoAdvance,     setAutoAdvance]     = useState(false)
  const hasAutoAdvRef     = useRef(false)
  const autoAdvanceRef    = useRef(false)
  const rotationCountRef  = useRef(0)

  useEffect(() => { autoAdvanceRef.current = autoAdvance }, [autoAdvance])

  useEffect(() => {
    hasAutoAdvRef.current    = false
    rotationCountRef.current = 0
  }, [timerStartedAt])

  // Groups mode: fire advance when cap elapsed
  useEffect(() => {
    if (!autoAdvance || !timerStartedAt) return
    const id = setInterval(() => {
      const t = tvRef.current
      if (!t?.timer_started_at || !t?.timer_cap_secs) return
      const elapsed = Math.floor((Date.now() - t.timer_started_at) / 1000 + (t.timer_paused_elapsed ?? 0))
      if (elapsed >= t.timer_cap_secs && !hasAutoAdvRef.current) {
        hasAutoAdvRef.current = true
        const rSecs = t.rotation_rest_secs || 0
        rSecs > 0 ? push({ rotation_rest_until: Date.now() + rSecs * 1000 }) : advanceFromRefs()
      }
    }, 500)
    return () => clearInterval(id)
  }, [autoAdvance, timerStartedAt, push]) // eslint-disable-line react-hooks/exhaustive-deps

  // No-groups mode: sequential block advance when cap elapsed
  useEffect(() => {
    if (groupsLength > 0 || !timerStartedAt || !timerBlockId) return
    const id = setInterval(() => {
      const t = tvRef.current
      if (!t?.timer_started_at || !t?.timer_cap_secs || !t?.timer_block_id) return
      const elapsed = Math.floor((Date.now() - t.timer_started_at) / 1000 + (t.timer_paused_elapsed ?? 0))
      if (elapsed >= t.timer_cap_secs && !hasAutoAdvRef.current) {
        hasAutoAdvRef.current = true
        const rSecs = t.rotation_rest_secs || 0
        rSecs > 0 ? push({ rotation_rest_until: Date.now() + rSecs * 1000 }) : advanceFromRefs()
      }
    }, 500)
    return () => clearInterval(id)
  }, [groupsLength, timerStartedAt, timerBlockId, push]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rest expiry — fires for both group and no-group modes
  useEffect(() => {
    if (!rotationRestUntil) return
    const delay = rotationRestUntil - Date.now()
    if (delay <= 0) { advanceFromRefs(); return }
    const id = setTimeout(advanceFromRefs, delay + 300)
    return () => clearTimeout(id)
  }, [rotationRestUntil]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reads entirely from refs — safe to call from setInterval/setTimeout
  function advanceFromRefs() {
    const wods    = (selSessObjRef.current?.blocks || []).filter(isWodBlock)
    const rotIds  = tvRef.current?.rotation_block_ids || []
    const rotBlks = rotIds.length > 0 ? wods.filter(b => rotIds.includes(b.id)) : wods
    const grps    = activeClassRef.current?.groups || []

    if (grps.length > 0) {
      if (rotBlks.length === 0) { push({ rotation_rest_until: null }); return }
      const curPos = tvRef.current?.group_positions || {}
      const newPos = {}
      for (const g of grps) {
        const idx    = rotBlks.findIndex(b => b.id === curPos[g.id])
        newPos[g.id] = rotBlks[(idx + 1) % rotBlks.length].id
      }
      rotationCountRef.current += 1
      const cycleComplete = rotationCountRef.current >= rotBlks.length
      if (cycleComplete) {
        rotationCountRef.current = 0
        const finishers = rotIds.length > 0 ? wods.filter(b => !rotIds.includes(b.id)) : []
        if (finishers.length > 0) {
          const first = finishers[0]
          push({
            group_positions: newPos, rotation_rest_until: null,
            timer_block_id: first.id, timer_type: first.type || 'For Time',
            timer_cap_secs: (parseInt(first.duration) || 20) * 60,
            ...(autoAdvanceRef.current ? { timer_started_at: Date.now(), timer_paused_elapsed: 0 } : {}),
          })
          setTimerBlkId(first.id)
          setTimerType(first.type || 'For Time')
          setTimerCap(parseInt(first.duration) || 20)
          setAutoAdvance(false)
        } else {
          push({ group_positions: newPos, rotation_rest_until: null })
        }
      } else {
        push({
          group_positions: newPos, rotation_rest_until: null,
          ...(autoAdvanceRef.current ? { timer_started_at: Date.now(), timer_paused_elapsed: 0 } : {}),
        })
      }
    } else {
      const curId = tvRef.current?.timer_block_id
      const idx   = rotBlks.findIndex(b => b.id === curId)
      const next  = idx >= 0 ? rotBlks[idx + 1] : null
      if (next) {
        push({
          timer_block_id: next.id, timer_type: next.type || 'For Time',
          timer_cap_secs: (parseInt(next.duration) || 20) * 60,
          timer_started_at: Date.now(), timer_paused_elapsed: 0, rotation_rest_until: null,
        })
        setTimerBlkId(next.id)
        setTimerType(next.type || 'For Time')
        setTimerCap(parseInt(next.duration) || 20)
      } else {
        push({ rotation_rest_until: null })
      }
    }
  }

  async function createGroups(n) {
    const ac = activeClassRef.current
    if (!ac) return
    const wods = (selSessObjRef.current?.blocks || []).filter(isWodBlock)
    const newGroups = Array.from({ length: n }, (_, i) => ({
      id: uid(), name: GROUP_NAMES[i], color: GROUP_COLORS[i], athleteIds: [], anonNames: [],
    }))
    ;(ac.athlete_ids || []).forEach((id, i) => newGroups[i % n].athleteIds.push(id))
    ;(ac.anon_names  || []).forEach((name, i) => newGroups[i % n].anonNames.push(name))
    await supabase.from('class_executions').update({ groups: newGroups }).eq('id', ac.id)
    if (wods.length > 0) {
      const newPos = {}
      newGroups.forEach((g, i) => { newPos[g.id] = wods[i % wods.length].id })
      await push({ group_positions: newPos })
    }
  }

  async function dissolveGroups() {
    const ac = activeClassRef.current
    if (!ac) return
    await supabase.from('class_executions').update({ groups: [] }).eq('id', ac.id)
    await push({ group_positions: {}, rotation_block_ids: [], rotation_rest_secs: 0, rotation_rest_until: null })
  }

  async function setGroupBlock(groupId, blockId) {
    const pos = tvRef.current?.group_positions || {}
    await push({ group_positions: { ...pos, [groupId]: blockId } })
  }

  async function reassignMember(m, targetGroupId) {
    const ac = activeClassRef.current
    if (!ac) return
    const newGroups = (ac.groups || []).map(g => {
      const ng = { ...g, athleteIds: [...(g.athleteIds || [])], anonNames: [...(g.anonNames || [])] }
      if (m.type === 'real') {
        ng.athleteIds = ng.athleteIds.filter(id => id !== m.id)
        if (g.id === targetGroupId) ng.athleteIds.push(m.id)
      } else {
        ng.anonNames = ng.anonNames.filter(n => n !== m.name)
        if (g.id === targetGroupId) ng.anonNames.push(m.name)
      }
      return ng
    })
    await supabase.from('class_executions').update({ groups: newGroups }).eq('id', ac.id)
  }

  async function advanceAll() {
    const grps    = activeClassRef.current?.groups || []
    const wods    = (selSessObjRef.current?.blocks || []).filter(isWodBlock)
    const rotIds  = tvRef.current?.rotation_block_ids || []
    const rotBlks = rotIds.length > 0 ? wods.filter(b => rotIds.includes(b.id)) : wods
    const pos     = tvRef.current?.group_positions || {}
    if (rotBlks.length === 0 || grps.length === 0) return
    const newPos = {}
    for (const g of grps) {
      const idx = rotBlks.findIndex(b => b.id === pos[g.id])
      newPos[g.id] = rotBlks[(idx + 1) % rotBlks.length].id
    }
    await push({ group_positions: newPos, rotation_rest_until: null })
  }

  async function toggleRotationBlock(blId) {
    const wods  = (selSessObjRef.current?.blocks || []).filter(isWodBlock)
    const cur   = tvRef.current?.rotation_block_ids || []
    const base  = cur.length === 0 ? wods.map(b => b.id) : cur
    const next  = base.includes(blId) ? base.filter(id => id !== blId) : [...base, blId]
    await push({ rotation_block_ids: next.length === wods.length ? [] : next })
  }

  return {
    autoAdvance, setAutoAdvance, rotationCountRef,
    createGroups, dissolveGroups, setGroupBlock, reassignMember, advanceAll, toggleRotationBlock,
  }
}
