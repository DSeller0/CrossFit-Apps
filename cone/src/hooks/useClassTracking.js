import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { uid } from '../public/lib/wod.js'

export function useClassTracking({ selSessId, selDate, push, classId }) {
  const [classLabel,   setClassLabel]   = useState('Turma')
  const [todayClasses, setTodayClasses] = useState([])

  const loadClasses = useCallback(async () => {
    if (!selSessId || !selDate) return
    const { data } = await supabase.from('class_executions')
      .select('*').eq('session_id', selSessId).eq('date_key', selDate)
      .order('created_at', { ascending: true })
    if (data) setTodayClasses(data)
  }, [selSessId, selDate])

  useEffect(() => { loadClasses() }, [loadClasses])

  useEffect(() => {
    if (!selSessId) return
    const chan = supabase.channel(`ce-ctrl-${selSessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_executions',
        filter: `session_id=eq.${selSessId}` }, () => loadClasses())
      .subscribe()
    return () => { chan.unsubscribe() }
  }, [selSessId, loadClasses])

  async function startClass() {
    if (!selSessId) return
    const id = uid()
    const row = { id, date_key: selDate, session_id: selSessId,
      class_label: classLabel.trim() || 'Turma', athlete_ids: [], anon_names: [], created_at: Date.now() }
    await supabase.from('class_executions').insert(row)
    await push({ class_id: id })
  }

  async function endClass() {
    if (!classId) return
    await supabase.from('class_executions').update({ reset_at: Date.now() }).eq('id', classId)
    await push({ class_id: null })
  }

  const activeClass  = todayClasses.find(c => c.id === classId && !c.reset_at) || null
  const pastClasses  = todayClasses.filter(c => c.reset_at)

  return { classLabel, setClassLabel, todayClasses, activeClass, pastClasses, loadClasses, startClass, endClass }
}
