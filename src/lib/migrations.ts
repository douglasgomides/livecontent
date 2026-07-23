import type {
  Session, ContentPiece, Topic, SessionSource, SessionStatus, ContentFormat, ContentChannel,
} from '@/types/session';
import { FORMAT_CHANNEL } from './contentFormats';

export const SCHEMA_VERSION = 2;
const SCHEMA_KEY = 'cc_schema_version';
const SESSIONS_KEY = 'cc_sessions';

const VALID_STATUS: SessionStatus[] = [
  'recording', 'transcribing', 'anonymizing', 'anonymization_review',
  'extracting_topics', 'topics_review', 'generating_content', 'ready',
];
const VALID_SOURCE: SessionSource[] = ['recording', 'upload', 'voice_note', 'science', 'audio_livre', 'link'];
const VALID_FORMAT: ContentFormat[] = [
  'reel', 'carousel', 'caption', 'stories', 'linkedin',
  'blog', 'youtube', 'tiktok', 'podcast', 'gmb', 'doctoralia', 'website',
];

const asString = (v: unknown, fb = ''): string => (typeof v === 'string' ? v : fb);
const asNumber = (v: unknown, fb = 0): number => (typeof v === 'number' && !isNaN(v) ? v : fb);
const asBool = (v: unknown): boolean => Boolean(v);
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function normalizePiece(raw: any): ContentPiece {
  const p = raw && typeof raw === 'object' ? raw : {};
  const format: ContentFormat = VALID_FORMAT.includes(p.format) ? p.format : 'caption';
  const channel: ContentChannel = p.channel || FORMAT_CHANNEL[format] || 'instagram';
  const cfmRaw = p.cfm && typeof p.cfm === 'object' ? p.cfm : {};
  return {
    id: asString(p.id, `piece_${Math.random().toString(36).slice(2, 10)}`),
    topicId: asString(p.topicId, ''),
    format,
    channel,
    body: asString(p.body, ''),
    cfm: {
      score: asNumber(cfmRaw.score, 0),
      flags: asArray<{ label: string; severity: 'info' | 'warning' | 'block' }>(cfmRaw.flags)
        .filter(f => f && typeof f === 'object')
        .map(f => ({
          label: asString((f as any).label, '—'),
          severity: (['info', 'warning', 'block'].includes((f as any).severity) ? (f as any).severity : 'info'),
        })),
    },
    approved: asBool(p.approved),
    rejected: asBool(p.rejected),
    rejectedReason: p.rejectedReason,
    rejectedNote: typeof p.rejectedNote === 'string' ? p.rejectedNote : undefined,
    meta: p.meta && typeof p.meta === 'object' ? p.meta : undefined,
    brainSignals: p.brainSignals && typeof p.brainSignals === 'object'
      ? { pillar: p.brainSignals.pillar, usedTraits: asArray<string>(p.brainSignals.usedTraits) }
      : undefined,
    artwork: p.artwork && typeof p.artwork === 'object'
      ? {
          width: asNumber(p.artwork.width, 1080),
          height: asNumber(p.artwork.height, 1080),
          slides: asArray(p.artwork.slides),
        }
      : undefined,
    externalPrompts: p.externalPrompts && typeof p.externalPrompts === 'object' ? p.externalPrompts : undefined,
  };
}

export function normalizeTopic(raw: any): Topic {
  const t = raw && typeof raw === 'object' ? raw : {};
  const stage = ['C0', 'C1', 'C2', 'C3'].includes(t.funnelStage) ? t.funnelStage : 'C1';
  return {
    id: asString(t.id, `topic_${Math.random().toString(36).slice(2, 10)}`),
    title: asString(t.title, 'Tema sem título'),
    summary: asString(t.summary, ''),
    funnelStage: stage,
    included: t.included !== false,
  };
}

export function normalizeSession(raw: any): Session | null {
  try {
    const s = raw && typeof raw === 'object' ? raw : {};
    if (!s.id) return null;
    return {
      id: asString(s.id),
      createdAt: asString(s.createdAt, new Date().toISOString()),
      source: VALID_SOURCE.includes(s.source) ? s.source : 'recording',
      title: asString(s.title, 'Sessão'),
      durationSec: asNumber(s.durationSec, 0),
      status: VALID_STATUS.includes(s.status) ? s.status : 'ready',
      audioUrl: typeof s.audioUrl === 'string' ? s.audioUrl : undefined,
      rawTranscript: typeof s.rawTranscript === 'string' ? s.rawTranscript : undefined,
      anonymizedTranscript: typeof s.anonymizedTranscript === 'string' ? s.anonymizedTranscript : undefined,
      piiFindings: asArray(s.piiFindings),
      topics: asArray(s.topics).map(normalizeTopic),
      content: asArray(s.content).map(normalizePiece),
      science: s.science && typeof s.science === 'object' ? s.science : undefined,
    };
  } catch (err) {
    console.warn('[migrations] dropping corrupted session', err);
    return null;
  }
}

export function normalizeSessions(list: unknown): Session[] {
  return asArray(list).map(normalizeSession).filter((s): s is Session => s !== null);
}

export interface MigrationStats {
  sessions: number;
  pieces: number;
  fixedPieces: number;
  dropped: number;
  ranVersion: number;
}

/** Idempotent boot migration. Rewrites cc_sessions once per schema version. */
export function runMigrations(opts: { force?: boolean } = {}): MigrationStats {
  const current = Number(localStorage.getItem(SCHEMA_KEY) || 0);
  const raw = localStorage.getItem(SESSIONS_KEY);
  let parsed: unknown = [];
  try { parsed = raw ? JSON.parse(raw) : []; } catch { parsed = []; }

  const before = Array.isArray(parsed) ? parsed.length : 0;
  const normalized = normalizeSessions(parsed);
  const dropped = before - normalized.length;

  // count pieces that had to be repaired
  let fixedPieces = 0;
  let pieces = 0;
  normalized.forEach((s, i) => {
    const originalContent = Array.isArray((parsed as any[])[i]?.content) ? (parsed as any[])[i].content : [];
    s.content?.forEach((piece, j) => {
      pieces++;
      const orig = originalContent[j];
      if (!orig || typeof orig !== 'object' ||
          typeof orig.body !== 'string' ||
          !orig.cfm || !Array.isArray(orig.cfm.flags) ||
          !orig.channel) {
        fixedPieces++;
      }
    });
  });

  if (opts.force || current < SCHEMA_VERSION || dropped > 0 || fixedPieces > 0) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(normalized));
    localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
  }

  return { sessions: normalized.length, pieces, fixedPieces, dropped, ranVersion: SCHEMA_VERSION };
}
