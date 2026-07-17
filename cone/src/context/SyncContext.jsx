import { createContext, useContext, useState, useEffect } from 'react';
import { loadLS, saveLS, loadEvents, saveEvents, syncFromSupabase, getSessionsTs } from '../utils/storage';
import { dbGetUpdatedAt } from '../utils/supabase';
import { useAuth } from './AuthContext';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const { session } = useAuth();
  const [sessions, setSessions] = useState(loadLS);
  const [events,   setEvents]   = useState(loadEvents);
  const [syncState, setSyncState] = useState('idle'); // 'idle'|'syncing'|'synced'|'conflict'

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
      if (fresh.sessions) setSessions(fresh.sessions);
      if (fresh.events)   setEvents(fresh.events);
    }).catch(() => {});
  }, [authed]);

  // ── Auto-save ─────────────────────────────────────────────────────────────
  useEffect(() => { saveLS(sessions); },    [sessions]);
  useEffect(() => { saveEvents(events); }, [events]);

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
      } catch {}
    };
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [session]);

  const handleSync = async () => {
    setSyncState('syncing');
    try {
      const fresh = await syncFromSupabase();
      if (fresh.sessions) setSessions(fresh.sessions);
      if (fresh.events)   setEvents(fresh.events);
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
