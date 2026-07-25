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

export const rescoreContent = (piece: ContentPiece): ContentPiece => ({
  ...piece,
  cfm: scoreCFM(piece.body),
});

export { createBlankSession, seedPipeline, seedScience };

// ─── CFM (regex local) ──────────────────────────────────────────────────────

const CFM_BLOCKS = [
  'cura garantida', 'sem risco', 'milagre', 'infalível', 'melhor do brasil',
  '100% eficaz', 'resultado garantido',
];
const CFM_WARNINGS = [
  { pattern: /garant[ie]/i, label: '"Garantia" pode configurar promessa de resultado' },
  { pattern: /antes.*depois|resultado real/i, label: 'Antes/depois exige cuidado ético (CFM)' },
  { pattern: /\d+\s*dias?\s*(pra|para|de)\s*(result|melhora|cura)/i, label: 'Prazo de resultado pode ser promessa' },
  { pattern: /melhor (médico|clínica|tratamento)/i, label: 'Superlativo pode configurar autopromoção' },
  { pattern: /\d+\s*mg|\d+\s*comprimido|dose\s+de/i, label: 'Posologia não deve aparecer em conteúdo público' },
];

export function scoreCFM(body: string): CFMResult {
  const flags: CFMResult['flags'] = [];
  let score = 98;
  const lower = body.toLowerCase();
  CFM_BLOCKS.forEach(term => {
    if (lower.includes(term)) { flags.push({ label: `Termo bloqueado pelo CFM: "${term}"`, severity: 'block' }); score -= 30; }
  });
  CFM_WARNINGS.forEach(({ pattern, label }) => {
    if (pattern.test(lower)) { flags.push({ label, severity: 'warning' }); score -= 8; }
  });
  if (!flags.length) flags.push({ label: 'Nenhum problema CFM detectado', severity: 'info' });
  return { score: Math.max(0, Math.min(100, score)), flags };
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
