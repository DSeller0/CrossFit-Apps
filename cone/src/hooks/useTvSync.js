import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../utils/supabase'

export function useTvSync({ onTvLoaded } = {}) {
  const [tv, setTv] = useState(null)
  const [saving, setSaving] = useState(false)
  const tvRef = useRef(null)
  // Latest-tv mirror for the callbacks in useTimer/useGroupRotation/push, which read
  // tvRef.current from event handlers and intervals — never during render. Written from
  // an effect rather than during render (react-hooks/refs): the ref then updates after
  // commit instead of mid-render, which is the same instant as far as every reader is
  // concerned (none of them run in the render phase) and is safe under concurrent
  // rendering, where a render can be thrown away.
  useEffect(() => {
    tvRef.current = tv
  }, [tv])

  // Fetch initial tv_state; notify caller so it can sync form controls
  useEffect(() => {
    supabase
      .from('tv_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setTv(data)
        onTvLoaded?.(data)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Multi-device sync — listen for remote pushes
  useEffect(() => {
    const chan = supabase
      .channel('tv-ctrl-coach')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tv_state' }, p =>
        setTv(p.new),
      )
      .subscribe()
    return () => {
      chan.unsubscribe()
    }
  }, [])

  const push = useCallback(async patch => {
    const base = tvRef.current ?? {
      slide: 'blank',
      timer_type: 'For Time',
      timer_cap_secs: 1200,
      timer_paused_elapsed: 0,
    }
    const next = { ...base, ...patch, updated_at: Date.now() }
    setTv(next)
    setSaving(true)
    await supabase.from('tv_state').upsert({ id: 1, ...patch, updated_at: Date.now() })
    setSaving(false)
  }, [])

  return { tv, saving, tvRef, push }
}
