import type { PublishJob, ContentPiece, ContentChannel } from '@/types/session';
import { FORMAT_CHANNEL } from './contentFormats';

const KEY = 'cc_publish_queue';

const uid = () => Math.random().toString(36).slice(2, 10);

export function loadJobs(): PublishJob[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveJobs(jobs: PublishJob[]) {
  localStorage.setItem(KEY, JSON.stringify(jobs));
}

export function enqueueJobs(
  piece: ContentPiece,
  sessionId: string,
  channels: ContentChannel[],
  topicTitle: string,
): PublishJob[] {
  const now = new Date().toISOString();
  const jobs = loadJobs();
  const created: PublishJob[] = channels.map(ch => ({
    id: uid(),
    pieceId: piece.id,
    sessionId,
    channel: ch,
    format: piece.format,
    title: topicTitle,
    status: initialStatus(ch),
    createdAt: now,
    updatedAt: now,
    message: initialMessage(ch),
  }));
  saveJobs([...created, ...jobs]);
  return created;
}

function initialStatus(ch: ContentChannel): PublishJob['status'] {
  if (ch === 'blog' || ch === 'website' || ch === 'doctoralia') return 'downloaded';
  if (ch === 'gmb') return 'downloaded';
  return 'needs_connection';
}

function initialMessage(ch: ContentChannel): string {
  switch (ch) {
    case 'blog':
    case 'website':
      return 'Baixe o arquivo pronto (.md/.html) e cole no seu site.';
    case 'doctoralia':
      return 'Texto pronto. Cole no seu perfil da Doctoralia.';
    case 'gmb':
      return 'Texto pronto. Cole no painel do Google Meu Negócio.';
    case 'instagram':
      return 'Preview no formato do canal pronto. Conecte sua conta Instagram para publicar.';
    case 'linkedin':
      return 'Post pronto. Conecte o LinkedIn para publicar direto daqui.';
    case 'youtube':
      return 'Roteiro + capa prontos. Conecte o YouTube para agendar.';
    case 'tiktok':
      return 'Roteiro + arte pronta. Conecte o TikTok para publicar.';
    case 'podcast':
      return 'Roteiro pronto. Gere o áudio (Notebook LM ou ElevenLabs) e publique no seu canal.';
  }
}

export function updateJob(id: string, patch: Partial<PublishJob>) {
  const jobs = loadJobs().map(j => j.id === id ? { ...j, ...patch, updatedAt: new Date().toISOString() } : j);
  saveJobs(jobs);
}

export function deleteJob(id: string) {
  saveJobs(loadJobs().filter(j => j.id !== id));
}

export function clearFinished() {
  saveJobs(loadJobs().filter(j => j.status === 'queued' || j.status === 'needs_connection' || j.status === 'publishing'));
}

/** Recommended channels for a piece based on format. */
export function recommendedChannelsForPiece(piece: ContentPiece): ContentChannel[] {
  const primary = FORMAT_CHANNEL[piece.format];
  // most pieces publish to their own channel only; blog also mirrors on website
  if (piece.format === 'blog') return ['blog', 'website'];
  return [primary];
}
