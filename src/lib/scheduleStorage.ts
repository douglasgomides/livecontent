import type { ContentPiece, ContentChannel, ContentFormat, PublishJob } from '@/types/session';
import { loadJobs } from './publishQueue';

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

const KEY = 'cc_schedule';
const uid = () => Math.random().toString(36).slice(2, 10);

export function loadSchedule(): ScheduledPost[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]') as ScheduledPost[];
    return syncWithQueue(raw);
  } catch {
    return [];
  }
}

function saveSchedule(items: ScheduledPost[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

/** If a matching publish job is 'published', reflect it on the schedule. */
function syncWithQueue(items: ScheduledPost[]): ScheduledPost[] {
  const jobs = loadJobs();
  const publishedKeys = new Set(
    jobs.filter(j => j.status === 'published').map(j => `${j.pieceId}:${j.channel}`),
  );
  let dirty = false;
  const next = items.map(it => {
    if (it.status !== 'published' && publishedKeys.has(`${it.pieceId}:${it.channel}`)) {
      dirty = true;
      return { ...it, status: 'published' as ScheduleStatus };
    }
    return it;
  });
  if (dirty) localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function schedulePiece(
  piece: ContentPiece,
  sessionId: string,
  channel: ContentChannel,
  scheduledFor: string,
  topicTitle: string,
): ScheduledPost {
  const now = new Date().toISOString();
  const item: ScheduledPost = {
    id: uid(),
    pieceId: piece.id,
    sessionId,
    channel,
    format: piece.format,
    title: topicTitle,
    scheduledFor,
    status: 'planned',
    createdAt: now,
  };
  saveSchedule([item, ...loadSchedule()]);
  return item;
}

export function updateScheduled(id: string, patch: Partial<ScheduledPost>) {
  saveSchedule(loadSchedule().map(s => (s.id === id ? { ...s, ...patch } : s)));
}

export function deleteScheduled(id: string) {
  saveSchedule(loadSchedule().filter(s => s.id !== id));
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

/** Distribute approved+unscheduled pieces across the next 7 days, respecting a light channel cap. */
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
    // find a day in the next 7 with <2 items for this channel
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
        created.push({
          id: uid(),
          pieceId: piece.id,
          sessionId,
          channel,
          format: piece.format,
          title: topicTitle,
          scheduledFor: iso,
          status: 'planned',
          createdAt: new Date().toISOString(),
        });
        placed = true;
        cursor = (idx + 1) % 7;
      }
    }
  }
  if (created.length) saveSchedule([...created, ...loadSchedule()]);
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
