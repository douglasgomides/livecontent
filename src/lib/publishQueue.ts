/**
 * publishQueue.ts — wrapper síncrono sobre `publish_jobs` (via store).
 *
 * Todas as leituras vêm do cache do store (síncrono, hidratado no login).
 * Escritas atualizam cache + banco (async, otimista) e o Realtime confirma.
 */
import type { PublishJob, ContentPiece, ContentChannel } from '@/types/session';
import { FORMAT_CHANNEL } from './contentFormats';
import { getJobs, upsertJob, deleteJob as storeDeleteJob } from './store';

const uid = () => Math.random().toString(36).slice(2, 10);

export function loadJobs(): PublishJob[] {
  return getJobs();
}

export function enqueueJobs(
  piece: ContentPiece,
  sessionId: string,
  channels: ContentChannel[],
  topicTitle: string,
): PublishJob[] {
  const now = new Date().toISOString();
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
  created.forEach(j => { void upsertJob(j); });
  return created;
}

function initialStatus(ch: ContentChannel): PublishJob['status'] {
  if (ch === 'blog' || ch === 'website' || ch === 'doctoralia' || ch === 'gmb') return 'downloaded';
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
      return 'Configure a webhook do Instagram em Ajustes para publicar.';
    case 'linkedin':
      return 'Configure a webhook do LinkedIn em Ajustes para publicar.';
    case 'youtube':
      return 'Configure a webhook do YouTube em Ajustes para publicar.';
    case 'tiktok':
      return 'Configure a webhook do TikTok em Ajustes para publicar.';
    case 'podcast':
      return 'Roteiro pronto. Gere o áudio (Notebook LM / ElevenLabs) e publique.';
  }
}

export function updateJob(id: string, patch: Partial<PublishJob>) {
  const current = getJobs().find(j => j.id === id);
  if (!current) return;
  void upsertJob({ ...current, ...patch, updatedAt: new Date().toISOString() });
}

export function deleteJob(id: string) {
  void storeDeleteJob(id);
}

export function clearFinished() {
  getJobs()
    .filter(j => j.status === 'published' || j.status === 'downloaded' || j.status === 'failed')
    .forEach(j => { void storeDeleteJob(j.id); });
}

/** Recommended channels for a piece based on format. */
export function recommendedChannelsForPiece(piece: ContentPiece): ContentChannel[] {
  const primary = FORMAT_CHANNEL[piece.format];
  if (piece.format === 'blog') return ['blog', 'website'];
  return [primary];
}
