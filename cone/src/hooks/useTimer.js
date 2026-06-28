import { useState } from 'react'

const TIMER_TYPES = ['For Time', 'AMRAP', 'EMOM', 'Benchmark']

export function useTimer({ tv, tvRef, push }) {
  const [timerType,  setTimerType]  = useState('For Time')
  const [timerCap,   setTimerCap]   = useState(20)
  const [timerBlkId, setTimerBlkId] = useState(null)

  async function startTimer() {
    await push({
      slide: 'timer', timer_type: timerType, timer_cap_secs: timerCap * 60,
      timer_block_id: timerBlkId, timer_started_at: Date.now(),
      timer_paused_elapsed: tv?.timer_paused_elapsed ?? 0,
    })
  }

  async function pauseTimer() {
    const elapsed = tv?.timer_started_at
      ? (Date.now() - tv.timer_started_at) / 1000 + (tv.timer_paused_elapsed ?? 0)
      : (tv?.timer_paused_elapsed ?? 0)
    await push({ timer_started_at: null, timer_paused_elapsed: Math.floor(elapsed) })
  }

  async function resetTimer() {
    await push({ timer_started_at: null, timer_paused_elapsed: 0 })
  }

  // bl is the pre-fetched block object (or null for "Personalizado")
  function selectBlock(id, bl) {
    setTimerBlkId(id || null)
    if (bl) {
      if (bl.type && TIMER_TYPES.includes(bl.type)) setTimerType(bl.type)
      setTimerCap(parseInt(bl.duration) || timerCap)
    }
    push({ timer_block_id: id || null })
  }

  function elapsedSecs() {
    const t = tvRef.current
    if (!t) return 0
    if (t.timer_started_at) return Math.floor((Date.now() - t.timer_started_at) / 1000 + (t.timer_paused_elapsed ?? 0))
    return t.timer_paused_elapsed ?? 0
  }

  // selSessObj passed at call-time to avoid stale closure in live-reg context
  function currentTimerBlock(selSessObj) {
    const bid = tvRef.current?.timer_block_id || timerBlkId
    if (!bid || !selSessObj) return null
    return (selSessObj.blocks || []).find(b => b.id === bid) || null
  }

  return {
    timerType, setTimerType, timerCap, setTimerCap, timerBlkId, setTimerBlkId,
    startTimer, pauseTimer, resetTimer, selectBlock, elapsedSecs, currentTimerBlock,
  }
}
