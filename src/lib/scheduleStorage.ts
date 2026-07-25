/**
 * scheduleStorage.ts — agenda editorial derivada de `publish_jobs`.
 *
 * Um "ScheduledPost" é uma linha de `publish_jobs` com `scheduledAt` definido.
 * Isso unifica a fila e o calendário numa fonte de verdade única no banco.
 */
import type { ContentPiece, ContentChannel, ContentFormat, PublishJob } from '@/types/session';
import { getJobs, upsertJob, deleteJob as storeDeleteJob } from './store';

export type ScheduleStatus = 'planned' | 'ready' | 'published';

export interface ScheduledPost {
  id: string;
  pieceId: string;
  sessionId: string;
  channel: ContentChannel;
  format: ContentFormat;
  title: string;
  scheduledFor: string; // ISO
  status: ScheduleStatus;
  createdAt: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function jobToScheduled(j: PublishJob): ScheduledPost | null {
  if (!j.scheduledAt) return null;
  const status: ScheduleStatus =
    j.status === 'published' ? 'published' : 'planned';
  return {
    id: j.id,
    pieceId: j.pieceId,
    sessionId: j.sessionId,
    channel: j.channel,
    format: j.format,
    title: j.title,
    scheduledFor: j.scheduledAt,
    status,
    createdAt: j.createdAt,
  };
}

export function loadSchedule(): ScheduledPost[] {
  return getJobs()
    .map(jobToScheduled)
    .filter((s): s is ScheduledPost => s !== null);
}

export function schedulePiece(
  piece: ContentPiece,
  sessionId: string,
  channel: ContentChannel,
  scheduledFor: string,
  topicTitle: string,
): ScheduledPost {
  const now = new Date().toISOString();
  const job: PublishJob = {
    id: uid(),
    pieceId: piece.id,
    sessionId,
    channel,
    format: piece.format,
    title: topicTitle,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    scheduledAt: scheduledFor,
    message: 'Agendado. Publica quando você clicar em "Publicar" ou no horário definido.',
  };
  void upsertJob(job);
  return jobToScheduled(job)!;
}

export function updateScheduled(id: string, patch: Partial<ScheduledPost>) {
  const current = getJobs().find(j => j.id === id);
  if (!current) return;
  const next: PublishJob = {
    ...current,
    scheduledAt: patch.scheduledFor ?? current.scheduledAt,
    status:
      patch.status === 'published' ? 'published' :
      patch.status === 'planned' ? 'queued' :
      current.status,
    updatedAt: new Date().toISOString(),
  };
  void upsertJob(next);
}

export function deleteScheduled(id: string) {
  void storeDeleteJob(id);
}

/** Suggested time-of-day (HH:mm) per channel. */
export const SUGGESTED_TIME: Record<ContentChannel, string> = {
  instagram: '19:00',
  tiktok: '19:00',
  linkedin: '08:00',
  youtube: '18:00',
  blog: '10:00',
  gmb: '10:00',
  doctoralia: '10:00',
  website: '10:00',
  podcast: '07:00',
};

export function buildDate(dateISO: string, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(dateISO);
  d.setHours(h || 12, m || 0, 0, 0);
  return d.toISOString();
}

/** Distribute approved+unscheduled pieces across the next 7 days. */
export function autoFillWeek(
  approvedPieces: { piece: ContentPiece; sessionId: string; topicTitle: string }[],
  existing: ScheduledPost[],
): ScheduledPost[] {
  const created: ScheduledPost[] = [];
  const scheduledPieceIds = new Set(existing.map(s => s.pieceId));
  const perDayChannel: Record<string, Record<string, number>> = {};

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  let cursor = 0;
  for (const { piece, sessionId, topicTitle } of approvedPieces) {
    if (scheduledPieceIds.has(piece.id)) continue;
    const channel: ContentChannel = (piece as any).channel || 'instagram';
    let placed = false;
    for (let i = 0; i < 7 && !placed; i++) {
      const idx = (cursor + i) % 7;
      const day = new Date(start);
      day.setDate(day.getDate() + idx);
      const key = day.toISOString().slice(0, 10);
      perDayChannel[key] ||= {};
      if ((perDayChannel[key][channel] || 0) < 2) {
        perDayChannel[key][channel] = (perDayChannel[key][channel] || 0) + 1;
        const iso = buildDate(day.toISOString(), SUGGESTED_TIME[channel] || '12:00');
        created.push(schedulePiece(piece, sessionId, channel, iso, topicTitle));
        placed = true;
        cursor = (idx + 1) % 7;
      }
    }
  }
  return created;
}

export function scheduledForDay(items: ScheduledPost[], dateISO: string): ScheduledPost[] {
  const target = dateISO.slice(0, 10);
  return items
    .filter(s => s.scheduledFor.slice(0, 10) === target)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

export function upcoming(items: ScheduledPost[], n: number): ScheduledPost[] {
  const now = Date.now();
  return items
    .filter(s => s.status !== 'published' && new Date(s.scheduledFor).getTime() >= now - 60_000)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
    .slice(0, n);
}
