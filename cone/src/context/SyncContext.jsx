import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { loadLS, saveLS, loadEvents, saveEvents, syncFromSupabase, getSessionsTs } from '../utils/storage';
import { dbGetUpdatedAt } from '../utils/supabase';
import { useAuth } from './AuthContext';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const { session } = useAuth();
  const [sessions, setSessions] = useState(loadLS);
  const [events,   setEvents]   = useState(loadEvents);
  const [syncState, setSyncState] = useState('idle'); // 'idle'|'syncing'|'synced'|'conflict'

  // Consumed by the auto-save effects below to skip the write their own
  // setSessions/setEvents call triggers (#111) — set just before each setter,
  // by both the startup pull and the manual "Sincronizar" button (handleSync),
  // since both are reads and neither may write back what it just read.
  const suppressSessionsSave = useRef(false);
  const suppressEventsSave   = useRef(false);

  // ── Pull latest data from Supabase once the coach's session is established ──
  // Gated on auth (#81): locations/coach_profile reads now require is_allowed_user(),
  // so the pull must run with the authenticated JWT attached — not in the brief anon
  // window during a cold load (which would return null for those two tables). The SPA
  // is fully behind login, so an anon sync was never useful anyway. Keyed on a boolean
  // so a token refresh (which changes the session reference) doesn't re-trigger it.
  const authed = !!session;
  useEffect(() => {
    if (!authed) return;
    syncFromSupabase().then(fresh => {
      if (fresh.sessions) { suppressSessionsSave.current = true; setSessions(fresh.sessions); }
      if (fresh.events)   { suppressEventsSave.current = true; setEvents(fresh.events); }
    }).catch(() => {});
  }, [authed]);

  // ── Auto-save — skips the mount run and the pull's own setState (#111) ─────
  // The mount run would only re-persist what loadLS/loadEvents just read; the
  // pull run is itself a read and must not write back what it read (CLAUDE.md:
  // "a load/read path never writes" — this was the biggest instance of that
  // class, and the one hiding #109's `locations`/`coach_profile` writes in that
  // plan's network trace). A genuine user edit is neither of those and still
  // saves exactly as before.
  const sessionsMounted = useRef(false);
  useEffect(() => {
    if (!sessionsMounted.current) { sessionsMounted.current = true; return; }
    if (suppressSessionsSave.current) { suppressSessionsSave.current = false; return; }
    saveLS(sessions);
  }, [sessions]);

  const eventsMounted = useRef(false);
  useEffect(() => {
    if (!eventsMounted.current) { eventsMounted.current = true; return; }
    if (suppressEventsSave.current) { suppressEventsSave.current = false; return; }
    saveEvents(events);
  }, [events]);

  // ── Conflict detection — poll every 30 s ─────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const check = async () => {
      try {
        const remoteTs = await dbGetUpdatedAt('sessions');
        const localTs  = getSessionsTs();
        if (remoteTs && localTs && remoteTs > localTs) {
          setSyncState(s => s === 'syncing' || s === 'synced' ? s : 'conflict');
        }
      } catch { /* ignore */ }
    };
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [session]);

  const handleSync = async () => {
    setSyncState('syncing');
    try {
      const fresh = await syncFromSupabase();
      if (fresh.sessions) { suppressSessionsSave.current = true; setSessions(fresh.sessions); }
      if (fresh.events)   { suppressEventsSave.current = true; setEvents(fresh.events); }
      setSyncState('synced');
      setTimeout(() => setSyncState('idle'), 2200);
    } catch {
      setSyncState('idle');
    }
  };

  return (
    <SyncContext.Provider value={{ sessions, setSessions, events, setEvents, syncState, handleSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => useContext(SyncContext);
