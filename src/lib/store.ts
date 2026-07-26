/**
 * store.ts — Store síncrono em memória, alimentado pelo Supabase.
 *
 * As páginas existentes usam APIs síncronas (loadSessions, loadBrain, etc.).
 * Este store hidrata do banco no login e mantém uma cópia em memória para
 * leituras síncronas. Escritas atualizam DB (async) e cache (imediato),
 * disparando um `notify()` para hooks que se inscrevem.
 */
import type { Session, PublishJob } from '@/types/session';
import type { Brain } from '@/types/brain';
import { EMPTY_BRAIN } from '@/types/brain';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchAllSessions,
  upsertSessionDb,
  deleteSessionDb,
  fetchBrain,
  saveBrainDb,
  fetchJobs,
  upsertJobDb,
  deleteJobDb,
  fetchSettings,
  saveSettingsDb,
  type DoctorSettings,
} from './db';
import { normalizeSession } from './migrations';

// ─── State ──────────────────────────────────────────────────────────────────

let _userId: string | null = null;
let _sessions: Session[] = [];
let _brain: Brain = EMPTY_BRAIN;
let _jobs: PublishJob[] = [];
let _settings: DoctorSettings = { webhooks: {}, preferredFormats: ['caption', 'carousel', 'reel', 'linkedin'] };
let _hydrated = false;
let _channels: any[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();

// Contador que sobe a cada notify() — o snapshot do useSyncExternalStore
// precisa mudar de VALOR a cada mutação real, não só quando o tamanho de um
// array muda. Antes o snapshot era baseado em .length dos arrays, então uma
// sessão existente mudando de status (recording -> transcribing -> ...) via
// Realtime não disparava re-render nenhum — só um refresh completo da página
// (que re-hidrata do zero) mostrava o estado novo. Era o bug "preciso dar
// refresh pra ver o progresso".
let _version = 0;

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  _version++;
  listeners.forEach(l => {
    try { l(); } catch {}
  });
}

// ─── Getters (sync) ─────────────────────────────────────────────────────────

export const getUserId = () => _userId;
export const isHydrated = () => _hydrated;
export const getSessions = () => _sessions;
export const getBrain = () => _brain;
export const getJobs = () => _jobs;
export const getSettings = () => _settings;

// ─── Hydration ──────────────────────────────────────────────────────────────

export async function hydrateStore(userId: string): Promise<void> {
  _userId = userId;
  try {
    const [sessions, brain, jobs, settings] = await Promise.all([
      fetchAllSessions(userId),
      fetchBrain(userId),
      fetchJobs(userId),
      fetchSettings(userId),
    ]);
    _sessions = sessions;
    _brain = brain;
    _jobs = jobs;
    _settings = settings;
    _hydrated = true;
    notify();
    subscribeRealtime(userId);
  } catch (err) {
    console.error('[store] hydrate failed', err);
    _hydrated = true; // still allow UI
    notify();
  }
}

export function resetStore() {
  _userId = null;
  _sessions = [];
  _brain = EMPTY_BRAIN;
  _jobs = [];
  _settings = { webhooks: {}, preferredFormats: ['caption', 'carousel', 'reel', 'linkedin'] };
  _hydrated = false;
  _channels.forEach(c => supabase.removeChannel(c));
  _channels = [];
  notify();
}

function subscribeRealtime(userId: string) {
  _channels.forEach(c => supabase.removeChannel(c));
  _channels = [];

  const ch = supabase
    .channel(`user-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `user_id=eq.${userId}` }, async () => {
      _sessions = await fetchAllSessions(userId);
      notify();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'topics', filter: `user_id=eq.${userId}` }, async () => {
      _sessions = await fetchAllSessions(userId);
      notify();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content_pieces', filter: `user_id=eq.${userId}` }, async () => {
      _sessions = await fetchAllSessions(userId);
      notify();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'publish_jobs', filter: `user_id=eq.${userId}` }, async () => {
      _jobs = await fetchJobs(userId);
      notify();
    })
    .subscribe();
  _channels.push(ch);
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function upsertSession(s: Session): Promise<void> {
  if (!_userId) return;
  const clean = normalizeSession(s);
  if (!clean) return;
  // optimistic
  _sessions = [clean, ..._sessions.filter(x => x.id !== clean.id)];
  notify();
  try {
    await upsertSessionDb(_userId, clean);
  } catch (err) {
    console.error('[store] upsertSession failed', err);
  }
}

export async function deleteSession(id: string): Promise<void> {
  _sessions = _sessions.filter(s => s.id !== id);
  notify();
  try {
    await deleteSessionDb(id);
  } catch (err) {
    console.error('[store] deleteSession failed', err);
  }
}

export async function saveBrain(b: Brain): Promise<void> {
  if (!_userId) return;
  _brain = b;
  notify();
  try {
    await saveBrainDb(_userId, b);
  } catch (err) {
    console.error('[store] saveBrain failed', err);
  }
}

export async function upsertJob(j: PublishJob): Promise<void> {
  if (!_userId) return;
  _jobs = [j, ..._jobs.filter(x => x.id !== j.id)];
  notify();
  try {
    await upsertJobDb(_userId, j);
  } catch (err) {
    console.error('[store] upsertJob failed', err);
  }
}

export async function deleteJob(id: string): Promise<void> {
  _jobs = _jobs.filter(j => j.id !== id);
  notify();
  try {
    await deleteJobDb(id);
  } catch (err) {
    console.error('[store] deleteJob failed', err);
  }
}

export async function refreshJobs(): Promise<void> {
  if (!_userId) return;
  try {
    _jobs = await fetchJobs(_userId);
    notify();
  } catch (err) {
    console.error('[store] refreshJobs failed', err);
  }
}

export async function saveSettings(s: DoctorSettings): Promise<void> {
  if (!_userId) return;
  _settings = s;
  notify();
  try {
    await saveSettingsDb(_userId, s);
  } catch (err) {
    console.error('[store] saveSettings failed', err);
  }
}

// ─── React hook ─────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';

const getSnapshot = () => _hydrated ? `1-${_version}` : '0';
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => '0');
}
