import type { ContentPiece, PipelineStatus, RejectReason } from '@/types/session';
import { loadJobs } from './publishQueue';
import { loadSchedule } from './scheduleStorage';

export const REJECT_LABEL: Record<RejectReason, string> = {
  off_tone: 'Fora do tom',
  sensitive: 'Assunto sensível',
  weak_hook: 'Gancho fraco',
  wrong_channel: 'Canal errado',
  other: 'Outro',
};

export const STATUS_META: Record<PipelineStatus, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-secondary text-muted-foreground' },
  approved: { label: 'Aprovada', cls: 'bg-success/15 text-success' },
  scheduled: { label: 'Agendada', cls: 'bg-primary/15 text-primary' },
  published: { label: 'Publicada', cls: 'bg-success/20 text-success' },
  rejected: { label: 'Rejeitada', cls: 'bg-muted text-muted-foreground line-through' },
  blocked: { label: 'Bloqueada CFM', cls: 'bg-destructive/15 text-destructive' },
};

/** Derive the effective pipeline status for a piece from all storages. */
export function getPieceStatus(piece: ContentPiece): PipelineStatus {
  if (piece.rejected) return 'rejected';
  if (piece.cfm?.flags?.some(f => f.severity === 'block')) return 'blocked';
  if (!piece.approved) return 'draft';

  const jobs = loadJobs();
  const published = jobs.some(j => j.pieceId === piece.id && j.status === 'published');
  if (published) return 'published';

  const scheduled = loadSchedule().some(
    s => s.pieceId === piece.id && s.status !== 'published',
  );
  if (scheduled) return 'scheduled';

  return 'approved';
}
