import type { Session, DoctorProfile } from '@/types/session';

const SESSIONS_KEY = 'cc_sessions';
const PROFILE_KEY = 'cc_profile';

export const loadSessions = (): Session[] => {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); } catch { return []; }
};
export const saveSessions = (s: Session[]) => localStorage.setItem(SESSIONS_KEY, JSON.stringify(s));
export const upsertSession = (session: Session) => {
  const all = loadSessions();
  const idx = all.findIndex(s => s.id === session.id);
  if (idx >= 0) all[idx] = session; else all.unshift(session);
  saveSessions(all);
};
export const getSession = (id: string) => loadSessions().find(s => s.id === id);

export const loadProfile = (): DoctorProfile | null => {
  try { const p = localStorage.getItem(PROFILE_KEY); return p ? JSON.parse(p) : null; } catch { return null; }
};
export const saveProfile = (p: DoctorProfile) => localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
