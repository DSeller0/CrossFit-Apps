import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../utils/supabase'

export function useTvSync({ onTvLoaded } = {}) {
  const [tv,      setTv]      = useState(null)
  const [saving,  setSaving]  = useState(false)
  const tvRef = useRef(null)
  tvRef.current = tv

  // Fetch initial tv_state; notify caller so it can sync form controls
  useEffect(() => {
    supabase.from('tv_state').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (!data) return
      setTv(data)
      onTvLoaded?.(data)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Multi-device sync — listen for remote pushes
  useEffect(() => {
    const chan = supabase.channel('tv-ctrl-coach')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tv_state' }, p => setTv(p.new))
      .subscribe()
    return () => { chan.unsubscribe() }
  }, [])

  const push = useCallback(async (patch) => {
    const base = tvRef.current ?? { slide: 'blank', timer_type: 'For Time', timer_cap_secs: 1200, timer_paused_elapsed: 0 }
    const next = { ...base, ...patch, updated_at: Date.now() }
    setTv(next)
    setSaving(true)
    await supabase.from('tv_state').upsert({ id: 1, ...patch, updated_at: Date.now() })
    setSaving(false)
  }, [])

  return { tv, saving, tvRef, push }
}
