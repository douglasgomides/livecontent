/**
 * pipeline.ts — Orquestração do lado cliente.
 * Chama a Edge Function `run-pipeline` para pipelines reais (áudio real).
 * Mantém helpers do mock para fluxos síncronos legados (voice_note, science).
 */
import type { Session, ContentPiece, Topic, ContentFormat, CFMResult } from '@/types/session';
import type { Brain } from '@/types/brain';
import { supabase } from '@/integrations/supabase/client';
import { uploadAudio } from './db';
import { getUserId } from './store';
import {
  generateContentFor as mockGenerateContentFor,
  createBlankSession,
  seedPipeline,
  seedScience,
} from './mockPipeline';

// Precisa ser um UUID de verdade — sessions.id/topics.id/content_pieces.id são
// colunas UUID no Postgres. Um id curto tipo "l3d9tje8" quebra o insert com
// "invalid input syntax for type uuid", silenciosamente engolido pelo catch
// do store (era a causa real do "Falha ao iniciar pipeline").
export const uid = () => crypto.randomUUID();

// Delegamos geração local ao mock (para peças síncronas/manuais nas telas atuais).
export function generateContentFor(
  topic: Topic,
  formats: ContentFormat[],
  profile: any,
  science?: Session['science'],
  brain?: Brain | null,
): ContentPiece[] {
  return mockGenerateContentFor(topic, formats, profile, science, brain);
}

export { createBlankSession, seedPipeline, seedScience };

// ─── CFM (scoring semântico via Edge Function — julga contexto, não palavra-chave) ──

export async function rescoreContent(piece: ContentPiece): Promise<ContentPiece> {
  const cfm = await scoreCFMRemote(piece.body);
  return { ...piece, cfm };
}

export async function scoreCFMRemote(body: string): Promise<CFMResult> {
  const { data, error } = await supabase.functions.invoke('score-cfm', { body: { body } });
  if (error || !data) {
    throw new Error(error?.message ?? 'Falha ao avaliar CFM');
  }
  return data as CFMResult;
}

// ─── Busca real de evidência científica (PubMed) ────────────────────────────

export interface PubmedResult {
  pubmed_id: string;
  title: string;
  authors: string;
  journal: string;
  year: number | null;
  url: string;
  evidence_level: string;
  pub_types: string[];
}

export async function searchPubmed(query: string, maxResults = 10): Promise<PubmedResult[]> {
  const { data, error } = await supabase.functions.invoke('search-pubmed', { body: { query, maxResults } });
  if (error) throw new Error(error.message ?? 'Falha na busca do PubMed');
  return (data?.results ?? []) as PubmedResult[];
}

// ─── Temas em alta (PubMed recente + notícias de saúde BR/internacional) ────

export interface TrendingItem {
  kind: 'pubmed' | 'news_br' | 'news_intl';
  title: string;
  source: string;
  date: string | null;
  url: string;
  evidence_level?: string;
}

export async function fetchTrendingTopics(query?: string): Promise<{ query: string; results: TrendingItem[] }> {
  const { data, error } = await supabase.functions.invoke('trending-topics', { body: { query } });
  if (error) throw new Error(error.message ?? 'Falha ao buscar temas em alta');
  return { query: data?.query ?? '', results: (data?.results ?? []) as TrendingItem[] };
}

// ─── Estilos de referência (extrai estrutura, nunca conteúdo literal) ───────

export async function analyzeReferenceStyle(args: { imagePath?: string; text?: string; formatHint?: string }): Promise<string> {
  const { data, error } = await supabase.functions.invoke('analyze-reference-style', {
    body: { image_path: args.imagePath, text: args.text, format_hint: args.formatHint },
  });
  if (error || !data?.structure_description) {
    throw new Error(error?.message ?? 'Falha ao analisar a referência');
  }
  return data.structure_description as string;
}

// ─── Billing (Stripe) ────────────────────────────────────────────────────────

export async function startCheckout(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { origin: window.location.origin },
  });
  if (error || !data?.url) throw new Error(error?.message ?? 'Falha ao abrir checkout');
  return data.url as string;
}

export async function openCustomerPortal(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('customer-portal', {
    body: { origin: window.location.origin },
  });
  if (error || !data?.url) throw new Error(error?.message ?? 'Falha ao abrir portal');
  return data.url as string;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  specialty: string | null;
  sessions_total: number;
  sessions_last_30d: number;
  sessions_failed: number;
  content_pieces_total: number;
  last_activity: string | null;
  plan: 'free' | 'pro';
  subscription_status: string;
}

export interface AdminOverview {
  total_users: number;
  total_sessions: number;
  total_pieces: number;
  pro_users: number;
  users: AdminUserRow[];
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.functions.invoke('admin-overview');
  if (error) throw new Error(error.message ?? 'Falha ao carregar painel admin');
  return data as AdminOverview;
}

// ─── Pipeline real (Edge Function) ──────────────────────────────────────────

export async function uploadAudioForSession(sessionId: string, blob: Blob, ext = 'webm'): Promise<string> {
  const uid = getUserId();
  if (!uid) throw new Error('Não autenticado');
  return uploadAudio(uid, sessionId, blob, ext);
}

/**
 * Dispara o pipeline agentico completo no servidor.
 * Retorna imediatamente. Realtime avisa a UI conforme cada etapa avança.
 */
export async function runPipeline(sessionId: string, formats?: ContentFormat[], referenceStyleId?: string): Promise<void> {
  const { error } = await supabase.functions.invoke('run-pipeline', {
    body: { session_id: sessionId, formats, reference_style_id: referenceStyleId },
  });
  if (error) throw error;
}

/**
 * Retry manual de uma sessão que falhou.
 */
export async function retryPipeline(sessionId: string): Promise<void> {
  await supabase.from('sessions').update({ status: 'transcribing', error_message: null }).eq('id', sessionId);
  return runPipeline(sessionId);
}
