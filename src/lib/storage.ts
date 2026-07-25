/**
 * storage.ts — Fachada síncrona sobre o store baseado no Supabase.
 * Mantida para compatibilidade com as páginas existentes.
 * As leituras vêm do cache em memória, hidratado no login.
 * As escritas persistem no Postgres com RLS por usuário.
 */
import type { Session, DoctorProfile } from '@/types/session';
import { normalizeSession } from './migrations';
import {
  getSessions,
  upsertSession as storeUpsert,
  useStoreVersion,
  getBrain,
} from './store';

// Sessions ------------------------------------------------------------------

export const loadSessions = (): Session[] => getSessions();

/** Legado: preservada para chamadas antigas — não faz nada em produção multi-tenant. */
export const saveSessions = (_s: Session[]) => {
  // no-op: writes go through upsertSession which persists to Supabase
};

export const upsertSession = (session: Session) => {
  const clean = normalizeSession(session);
  if (!clean) return;
  // fire-and-forget
  void storeUpsert(clean);
};

export const getSession = (id: string) => getSessions().find(s => s.id === id);

/** Hook para forçar re-render quando o store atualiza (Realtime). */
export const useSessions = () => {
  useStoreVersion();
  return getSessions();
};

// Profile (legacy) ----------------------------------------------------------
// O perfil antigo virou parte do Brain (camada doctor). Estas funções ainda
// existem para não quebrar imports antigos; leem/gravam o brain.doctor.

const PROFILE_KEY = 'cc_profile';

export const loadProfile = (): DoctorProfile | null => {
  const brain = getBrain();
  if (brain.onboarded) {
    return {
      name: brain.doctor.name,
      specialty: brain.doctor.specialty,
      idealPatient: brain.patient.demographic,
      tone: brain.doctor.tone,
      onboarded: true,
    };
  }
  // Fallback para dados legados de navegador (usado apenas antes de logar).
  try {
    const p = localStorage.getItem(PROFILE_KEY);
    return p ? JSON.parse(p) : null;
  } catch {
    return null;
  }
};

export const saveProfile = (p: DoctorProfile) =>
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
