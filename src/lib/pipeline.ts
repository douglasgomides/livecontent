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

export const uid = () => Math.random().toString(36).slice(2, 10);

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
export async function runPipeline(sessionId: string, formats?: ContentFormat[]): Promise<void> {
  const { error } = await supabase.functions.invoke('run-pipeline', {
    body: { session_id: sessionId, formats },
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
