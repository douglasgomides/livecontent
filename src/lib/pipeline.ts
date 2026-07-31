/**
 * pipeline.ts — Orquestração do lado cliente.
 * Chama a Edge Function `run-pipeline` para pipelines reais (áudio real).
 * Mantém helpers do mock para fluxos síncronos legados (voice_note, science).
 */
import type { Session, ContentPiece, Topic, ContentFormat, CFMResult, TrendingContentIdea } from '@/types/session';
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

// supabase-js só bota "Edge Function returned a non-2xx status code" em
// error.message por padrão — o corpo JSON real (ex.: "ANTHROPIC_API_KEY not
// configured") fica em error.context (a Response bruta) e nunca é lido a
// menos que a gente busque explicitamente. Sem isso, todo erro real da função
// vira essa mesma frase genérica e inútil pra diagnosticar qualquer coisa.
export async function describeFunctionError(error: any, fallback: string): Promise<string> {
  if (!error) return fallback;
  const ctx = error.context;
  if (ctx && typeof ctx.clone === 'function') {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      try {
        const text = await ctx.clone().text();
        if (text) return text.slice(0, 300);
      } catch { /* noop */ }
    }
  }
  return error.message ?? fallback;
}

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
    throw new Error(await describeFunctionError(error, 'Falha ao avaliar CFM'));
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
  if (error) throw new Error(await describeFunctionError(error, 'Falha na busca do PubMed'));
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
  if (error) throw new Error(await describeFunctionError(error, 'Falha ao buscar temas em alta'));
  return { query: data?.query ?? '', results: (data?.results ?? []) as TrendingItem[] };
}

// ─── Estilos de referência (extrai estrutura, nunca conteúdo literal) ───────

export async function analyzeReferenceStyle(args: { imagePath?: string; text?: string; formatHint?: string; sourceOwnership?: 'own' | 'other' }): Promise<{ structureDescription: string; extractedCopy?: string }> {
  const { data, error } = await supabase.functions.invoke('analyze-reference-style', {
    body: { image_path: args.imagePath, text: args.text, format_hint: args.formatHint, source_ownership: args.sourceOwnership ?? 'other' },
  });
  if (error || !data?.structure_description) {
    throw new Error(await describeFunctionError(error, 'Falha ao analisar a referência'));
  }
  return { structureDescription: data.structure_description as string, extractedCopy: data.extracted_copy ?? undefined };
}

// ─── Arte visual sob demanda (carousel/stories) ─────────────────────────────
// Separada do run-pipeline de propósito: a geração de conteúdo fica rápida,
// e só paga o custo extra de IA pra arte quando o médico realmente pede.

export async function generateArtwork(pieceId: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('generate-artwork', {
    body: { piece_id: pieceId },
  });
  if (error || !data?.artwork) {
    throw new Error(await describeFunctionError(error, 'Falha ao gerar arte'));
  }
  return data.artwork;
}

// ─── Billing (Stripe) ────────────────────────────────────────────────────────

export async function startCheckout(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { origin: window.location.origin },
  });
  if (error || !data?.url) throw new Error(await describeFunctionError(error, 'Falha ao abrir checkout'));
  return data.url as string;
}

export async function openCustomerPortal(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('customer-portal', {
    body: { origin: window.location.origin },
  });
  if (error || !data?.url) throw new Error(await describeFunctionError(error, 'Falha ao abrir portal'));
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
  if (error) throw new Error(await describeFunctionError(error, 'Falha ao carregar painel admin'));
  return data as AdminOverview;
}

// ─── Inteligência comercial (agregado cross-médico, admin-only) ────────────

export interface CommercialArgumentStat {
  categoria: string;
  total: number;
  fechou: number;
  taxa: number;
}

export interface CommercialArgumentRanking {
  argumento: string;
  total: number;
  fechou: number;
  taxa: number;
}

export interface CommercialObjectionStat {
  categoria: string;
  total: number;
  taxa_superacao: number | null;
}

export interface CommercialCrossing {
  dor_categoria: string;
  arg_categoria: string;
  fechou_count: number;
}

export interface CommercialByDoctor {
  user_id: string;
  specialty: string;
  total: number;
  fechou: number;
  taxa: number;
}

export interface CommercialBySpecialty {
  specialty: string;
  total: number;
  fechou: number;
  taxa: number;
}

export interface CommercialIntelligenceReport {
  total_sessoes_com_oferta: number;
  total_sessoes_com_resultado_decidido: number;
  taxa_fechamento_geral: number | null;
  por_categoria_argumento: CommercialArgumentStat[];
  ranking_argumentos: CommercialArgumentRanking[];
  ranking_argumentos_amostra_minima: number;
  ranking_argumentos_total_distintos: number;
  ranking_argumentos_omitidos_por_amostra_baixa: number;
  objecoes: CommercialObjectionStat[];
  cruzamento_dor_argumento: CommercialCrossing[];
  por_medico: CommercialByDoctor[];
  por_especialidade: CommercialBySpecialty[];
}

export async function fetchCommercialIntelligenceReport(): Promise<CommercialIntelligenceReport> {
  const { data, error } = await supabase.functions.invoke('commercial-intelligence-report');
  if (error) throw new Error(await describeFunctionError(error, 'Falha ao carregar inteligência comercial'));
  return data as CommercialIntelligenceReport;
}

export interface CommercialBenchmark {
  eligible: boolean;
  scope: 'specialty' | 'market';
  specialty: string | null;
  sampleSize: number;
  minRequired?: number;
  closingRate: number | null;
  topArguments: Array<{ categoria: string; label: string; taxaFechamento: number; amostras: number }>;
  topObjections: Array<{ categoria: string; label: string; ocorrencias: number; pctDasOfertas: number }>;
}

// Benchmark de mercado (cross-médico, anonimizado, só agregado por categoria) —
// qualquer médico pode chamar, diferente do relatório admin-only acima.
export async function fetchCommercialBenchmark(): Promise<CommercialBenchmark> {
  const { data, error } = await supabase.functions.invoke('commercial-benchmark');
  if (error) throw new Error(await describeFunctionError(error, 'Falha ao carregar benchmark de mercado'));
  return data as CommercialBenchmark;
}

function mapTrendingIdeaRow(row: any): TrendingContentIdea {
  return {
    id: row.id,
    specialty: row.specialty,
    topic: row.topic,
    whyItWorks: row.why_it_works,
    suggestedFormat: row.suggested_format ?? null,
    sourceTitle: row.source_title ?? null,
    sourceUrl: row.source_url ?? null,
    fetchedAt: row.fetched_at,
  };
}

// Pesquisa real (web search do Claude) do que está performando em redes sociais
// pra especialidade do médico — cacheado no backend por alguns dias.
// refresh=true força nova pesquisa mesmo com cache válido.
export async function fetchTrendingContentIdeas(refresh = false): Promise<TrendingContentIdea[]> {
  const { data, error } = await supabase.functions.invoke('trending-content-ideas', {
    body: { refresh },
  });
  if (error || !data?.ideas) {
    throw new Error(await describeFunctionError(error, 'Falha ao buscar tendências'));
  }
  return (data.ideas as any[]).map(mapTrendingIdeaRow);
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
  if (error) throw new Error(await describeFunctionError(error, 'Falha ao iniciar pipeline'));
}

/**
 * Retry manual de uma sessão que falhou.
 */
export async function retryPipeline(sessionId: string): Promise<void> {
  await supabase.from('sessions').update({ status: 'transcribing', error_message: null }).eq('id', sessionId);
  return runPipeline(sessionId);
}
