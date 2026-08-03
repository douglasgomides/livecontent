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
import { toast } from 'sonner';
import {
  fetchAllSessions,
  upsertSessionDb,
  deleteSessionDb,
  fetchBrain,
  fetchBrainSeeded,
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
let _settings: DoctorSettings = { webhooks: {}, preferredFormats: ['caption', 'carousel', 'reel', 'linkedin'], schedulingLink: null, whatsappWebhookUrl: null, whatsappInboundToken: null, heygenApiKey: null, heygenAvatarId: null, heygenVoiceId: null, metaAdsAccountId: null, googleAdsAccountId: null, ownWhatsappNumber: null };
let _hydrated = false;
let _channels: any[] = [];
// Só pra saber quando avisar 1x que a Brain foi pré-preenchida com base na 1a
// consulta real (ver subscribeRealtime) — nunca fica exposta fora do store.
let _brainSeeded = false;

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

// Toda mutação aqui é otimista: a tela já mudou antes de saber se o servidor
// aceitou. Sem isso, uma falha de rede/DB era só um console.error — a tela
// seguia mostrando o estado novo como se tivesse salvo, e o dado sumia no
// próximo reload sem o médico nunca saber que não persistiu. Um único `id`
// faz falhas em rajada (ex.: autoFillWeek chamando isso dezenas de vezes)
// colapsarem num só toast em vez de inundar a tela.
function notifySyncFailure(action: string) {
  toast.error(`Não foi possível salvar "${action}" no servidor. Sua tela já mudou, mas a alteração pode se perder se você recarregar — verifique sua conexão e tente de novo.`, { id: 'sync-error' });
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
    const [sessions, brain, jobs, settings, brainSeeded] = await Promise.all([
      fetchAllSessions(userId),
      fetchBrain(userId),
      fetchJobs(userId),
      fetchSettings(userId),
      fetchBrainSeeded(userId).catch(() => false),
    ]);
    _sessions = sessions;
    _brain = brain;
    _jobs = jobs;
    _settings = settings;
    _brainSeeded = brainSeeded;
    _hydrated = true;
    notify();
    subscribeRealtime(userId);
  } catch (err) {
    console.error('[store] hydrate failed', err);
    _hydrated = true; // still allow UI
    notify();
    toast.error('Não foi possível carregar seus dados agora. Recarregue a página ou tente novamente em instantes.', { id: 'hydrate-error' });
  }
}

export function resetStore() {
  _userId = null;
  _sessions = [];
  _brain = EMPTY_BRAIN;
  _jobs = [];
  _settings = { webhooks: {}, preferredFormats: ['caption', 'carousel', 'reel', 'linkedin'], schedulingLink: null, whatsappWebhookUrl: null, whatsappInboundToken: null, heygenApiKey: null, heygenAvatarId: null, heygenVoiceId: null, metaAdsAccountId: null, googleAdsAccountId: null, ownWhatsappNumber: null };
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'brains', filter: `user_id=eq.${userId}` }, async () => {
      // Sem isso, o pré-preenchimento automático que o run-pipeline grava direto
      // no banco (depois da 1a consulta real) ficava invisível até o médico
      // recarregar a página — o cache local só se atualiza no login.
      const [brain, seeded] = await Promise.all([fetchBrain(userId), fetchBrainSeeded(userId).catch(() => false)]);
      if (seeded && !_brainSeeded) {
        toast.success('Pré-preenchemos parte da sua Brain com base na sua primeira consulta gravada — dá uma olhada em Brain e ajuste o que quiser.', { id: 'brain-seeded', duration: 8000 });
      }
      _brainSeeded = seeded;
      _brain = brain;
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
    notifySyncFailure('consulta');
  }
}

export async function deleteSession(id: string): Promise<void> {
  _sessions = _sessions.filter(s => s.id !== id);
  notify();
  try {
    await deleteSessionDb(id);
  } catch (err) {
    console.error('[store] deleteSession failed', err);
    notifySyncFailure('exclusão da consulta');
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
    notifySyncFailure('perfil (Brain)');
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
    notifySyncFailure('agendamento/publicação');
  }
}

export async function deleteJob(id: string): Promise<void> {
  _jobs = _jobs.filter(j => j.id !== id);
  notify();
  try {
    await deleteJobDb(id);
  } catch (err) {
    console.error('[store] deleteJob failed', err);
    notifySyncFailure('remoção do agendamento');
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
    notifySyncFailure('ajustes');
  }
}

// ─── React hook ─────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';

const getSnapshot = () => _hydrated ? `1-${_version}` : '0';
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => '0');
}
