/**
 * db.ts — Camada de acesso ao Supabase para o produto agentico.
 * Mapeia entre linhas do Postgres (snake_case) e os tipos de domínio (camelCase).
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  Session,
  Topic,
  ContentPiece,
  PublishJob,
  SessionStatus,
  EvidenceSource,
  ReferenceStyle,
  PatientSignal,
} from '@/types/session';
import type { Brain } from '@/types/brain';
import { EMPTY_BRAIN } from '@/types/brain';
import {
  normalizePiece,
  normalizeTopic,
  normalizeSession,
} from './migrations';

// ─── Brain ──────────────────────────────────────────────────────────────────

export async function fetchBrain(userId: string): Promise<Brain> {
  const { data, error } = await supabase
    .from('brains')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return EMPTY_BRAIN;
  return {
    doctor: { ...EMPTY_BRAIN.doctor, ...(data.doctor as any) },
    patient: { ...EMPTY_BRAIN.patient, ...(data.patient as any) },
    brand: { ...EMPTY_BRAIN.brand, ...(data.brand as any) },
    onboarded: !!data.onboarded,
    objectionsOptIn: !!(data as any).objections_opt_in,
  };
}

export async function saveBrainDb(userId: string, brain: Brain): Promise<void> {
  const { error } = await supabase
    .from('brains')
    .upsert(
      {
        user_id: userId,
        doctor: brain.doctor as any,
        patient: brain.patient as any,
        brand: brain.brand as any,
        onboarded: brain.onboarded,
        objections_opt_in: brain.objectionsOptIn,
      },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

// ─── Sessions ───────────────────────────────────────────────────────────────

function sessionFromRow(
  row: any,
  topics: Topic[] = [],
  pieces: ContentPiece[] = [],
): Session {
  return normalizeSession({
    id: row.id,
    createdAt: row.created_at,
    source: row.source,
    title: row.title,
    durationSec: row.duration_sec,
    status: row.status,
    audioUrl: row.audio_path ?? undefined,
    rawTranscript: row.raw_transcript ?? undefined,
    anonymizedTranscript: row.anonymized_transcript ?? undefined,
    piiFindings: row.pii_findings ?? [],
    topics,
    content: pieces,
    science: row.science ?? undefined,
    errorMessage: row.error_message ?? undefined,
  })!;
}

export async function fetchAllSessions(userId: string): Promise<Session[]> {
  const [{ data: sessions, error: e1 }, { data: topics, error: e2 }, { data: pieces, error: e3 }] =
    await Promise.all([
      supabase.from('sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('topics').select('*').eq('user_id', userId).order('position', { ascending: true }),
      supabase.from('content_pieces').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;

  const topicsBySession = new Map<string, Topic[]>();
  (topics ?? []).forEach((t: any) => {
    const list = topicsBySession.get(t.session_id) ?? [];
    list.push(normalizeTopic({
      id: t.id,
      title: t.title,
      summary: t.summary,
      funnelStage: t.funnel_stage,
      included: t.included,
    }));
    topicsBySession.set(t.session_id, list);
  });

  const piecesBySession = new Map<string, ContentPiece[]>();
  (pieces ?? []).forEach((p: any) => {
    const list = piecesBySession.get(p.session_id) ?? [];
    list.push(normalizePiece({
      id: p.id,
      topicId: p.topic_id,
      format: p.format,
      channel: p.channel,
      body: p.body,
      cfm: p.cfm,
      approved: p.approved,
      rejected: p.rejected,
      rejectedReason: p.rejected_reason ?? undefined,
      rejectedNote: p.rejected_note ?? undefined,
      meta: p.meta ?? undefined,
      brainSignals: p.brain_signals ?? undefined,
      artwork: p.artwork ?? undefined,
      externalPrompts: p.external_prompts ?? undefined,
      evidenceIds: p.evidence_ids ?? undefined,
      referenceStyleId: p.reference_style_id ?? undefined,
    }));
    piecesBySession.set(p.session_id, list);
  });

  return (sessions ?? []).map((s: any) =>
    sessionFromRow(s, topicsBySession.get(s.id) ?? [], piecesBySession.get(s.id) ?? []),
  );
}

export async function upsertSessionDb(userId: string, s: Session): Promise<void> {
  // Upsert the session row
  const { error: e1 } = await supabase.from('sessions').upsert({
    id: s.id,
    user_id: userId,
    source: s.source,
    title: s.title,
    duration_sec: s.durationSec,
    status: s.status as SessionStatus,
    audio_path: s.audioUrl ?? null,
    raw_transcript: s.rawTranscript ?? null,
    anonymized_transcript: s.anonymizedTranscript ?? null,
    pii_findings: (s.piiFindings ?? []) as any,
    science: (s.science ?? null) as any,
    error_message: s.errorMessage ?? null,
  });
  if (e1) throw e1;

  // Replace topics
  await supabase.from('topics').delete().eq('session_id', s.id);
  if (s.topics?.length) {
    const rows = s.topics.map((t, i) => ({
      id: t.id,
      user_id: userId,
      session_id: s.id,
      title: t.title,
      summary: t.summary,
      funnel_stage: t.funnelStage,
      included: t.included,
      position: i,
    }));
    const { error: e2 } = await supabase.from('topics').insert(rows);
    if (e2) throw e2;
  }

  // Replace pieces
  await supabase.from('content_pieces').delete().eq('session_id', s.id);
  if (s.content?.length) {
    const rows = s.content.map(p => ({
      id: p.id,
      user_id: userId,
      session_id: s.id,
      topic_id: p.topicId || null,
      format: p.format,
      channel: p.channel,
      body: p.body,
      cfm: p.cfm as any,
      approved: p.approved,
      rejected: !!p.rejected,
      rejected_reason: p.rejectedReason ?? null,
      rejected_note: p.rejectedNote ?? null,
      meta: (p.meta ?? null) as any,
      brain_signals: (p.brainSignals ?? null) as any,
      artwork: (p.artwork ?? null) as any,
      external_prompts: (p.externalPrompts ?? null) as any,
      evidence_ids: (p.evidenceIds ?? []) as any,
      reference_style_id: p.referenceStyleId ?? null,
    }));
    const { error: e3 } = await supabase.from('content_pieces').insert(rows);
    if (e3) throw e3;
  }
}

export async function deleteSessionDb(sessionId: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

// ─── Publish jobs ───────────────────────────────────────────────────────────

function jobFromRow(row: any): PublishJob {
  return {
    id: row.id,
    pieceId: row.piece_id,
    sessionId: row.session_id,
    channel: row.channel,
    format: row.format,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scheduledAt: row.scheduled_at ?? undefined,
    message: row.message ?? undefined,
  };
}

export async function fetchJobs(userId: string): Promise<PublishJob[]> {
  const { data, error } = await supabase
    .from('publish_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(jobFromRow);
}

export async function upsertJobDb(userId: string, j: PublishJob): Promise<void> {
  const { error } = await supabase.from('publish_jobs').upsert({
    id: j.id,
    user_id: userId,
    piece_id: j.pieceId,
    session_id: j.sessionId,
    channel: j.channel,
    format: j.format,
    title: j.title,
    status: j.status,
    message: j.message ?? null,
    scheduled_at: j.scheduledAt ?? null,
  });
  if (error) throw error;
}

export async function deleteJobDb(id: string): Promise<void> {
  const { error } = await supabase.from('publish_jobs').delete().eq('id', id);
  if (error) throw error;
}

// ─── Settings (webhooks) ────────────────────────────────────────────────────

export interface DoctorSettings {
  webhooks: Partial<Record<string, string>>;
  preferredFormats: string[];
}

export async function fetchSettings(userId: string): Promise<DoctorSettings> {
  const { data, error } = await supabase
    .from('doctor_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return {
    webhooks: (data?.webhooks as any) ?? {},
    preferredFormats: (data?.preferred_formats as any) ?? ['caption', 'carousel', 'reel', 'linkedin'],
  };
}

export async function saveSettingsDb(userId: string, s: DoctorSettings): Promise<void> {
  const { error } = await supabase.from('doctor_settings').upsert({
    user_id: userId,
    webhooks: s.webhooks as any,
    preferred_formats: s.preferredFormats as any,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ─── Storage: upload audio ─────────────────────────────────────────────────

export async function uploadAudio(userId: string, sessionId: string, blob: Blob, ext = 'webm'): Promise<string> {
  const path = `${userId}/${sessionId}.${ext}`;
  const { error } = await supabase.storage
    .from('consultation-audio')
    .upload(path, blob, { upsert: true, contentType: blob.type || 'audio/webm' });
  if (error) throw error;
  return path;
}

export async function getAudioSignedUrl(path: string, ttlSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('consultation-audio')
    .createSignedUrl(path, ttlSec);
  if (error) throw error;
  return data.signedUrl;
}

// ─── Biblioteca de evidências científicas ──────────────────────────────────

function mapEvidenceRow(row: any): EvidenceSource {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors ?? undefined,
    journal: row.journal ?? undefined,
    year: row.year ?? undefined,
    url: row.url ?? undefined,
    pubmedId: row.pubmed_id ?? undefined,
    evidenceLevel: row.evidence_level,
    summary: row.summary ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    source: row.source,
    createdAt: row.created_at,
  };
}

export async function fetchEvidenceSources(userId: string): Promise<EvidenceSource[]> {
  const { data, error } = await supabase
    .from('evidence_sources')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapEvidenceRow);
}

export async function addEvidenceSource(userId: string, s: Omit<EvidenceSource, 'id' | 'createdAt'>): Promise<EvidenceSource> {
  const { data, error } = await supabase
    .from('evidence_sources')
    .insert({
      user_id: userId,
      title: s.title,
      authors: s.authors ?? null,
      journal: s.journal ?? null,
      year: s.year ?? null,
      url: s.url ?? null,
      pubmed_id: s.pubmedId ?? null,
      evidence_level: s.evidenceLevel,
      summary: s.summary ?? null,
      tags: s.tags as any,
      source: s.source,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapEvidenceRow(data);
}

export async function deleteEvidenceSource(id: string): Promise<void> {
  const { error } = await supabase.from('evidence_sources').delete().eq('id', id);
  if (error) throw error;
}

// ─── Biblioteca de estilos de referência (estrutura, não conteúdo) ─────────

function mapReferenceStyleRow(row: any): ReferenceStyle {
  return {
    id: row.id,
    name: row.name,
    formatHint: row.format_hint,
    sourceType: row.source_type,
    sourceImagePath: row.source_image_path ?? undefined,
    sourceText: row.source_text ?? undefined,
    sourceOwnership: row.source_ownership ?? 'other',
    structureDescription: row.structure_description,
    createdAt: row.created_at,
  };
}

export async function fetchReferenceStyles(userId: string): Promise<ReferenceStyle[]> {
  const { data, error } = await supabase
    .from('reference_styles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReferenceStyleRow);
}

export async function addReferenceStyle(userId: string, s: {
  name: string;
  formatHint: string;
  sourceType: 'image' | 'text';
  sourceImagePath?: string;
  sourceText?: string;
  sourceOwnership: 'own' | 'other';
  structureDescription: string;
}): Promise<ReferenceStyle> {
  const { data, error } = await supabase
    .from('reference_styles')
    .insert({
      user_id: userId,
      name: s.name,
      format_hint: s.formatHint,
      source_type: s.sourceType,
      source_image_path: s.sourceImagePath ?? null,
      source_text: s.sourceText ?? null,
      source_ownership: s.sourceOwnership,
      structure_description: s.structureDescription,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapReferenceStyleRow(data);
}

export async function deleteReferenceStyle(id: string): Promise<void> {
  const { error } = await supabase.from('reference_styles').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadReferenceImage(userId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('reference-images')
    .upload(path, file, { contentType: file.type || 'image/jpeg' });
  if (error) throw error;
  return path;
}

// ─── Sinais de inteligência comercial (objeções/dúvidas/sinais de compra) ──
// Extraídos automaticamente pelo run-pipeline a partir da transcrição
// anonimizada — só leitura aqui, nada de escrita client-side.

function mapPatientSignalRow(row: any): PatientSignal {
  return {
    id: row.id,
    sessionId: row.session_id,
    kind: row.kind,
    category: row.category,
    label: row.label,
    confidence: row.confidence,
    createdAt: row.created_at,
  };
}

export async function fetchPatientSignals(userId: string): Promise<PatientSignal[]> {
  const { data, error } = await supabase
    .from('patient_signals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPatientSignalRow);
}

// ─── Assinatura / plano ─────────────────────────────────────────────────────

export interface Subscription {
  plan: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due' | 'none';
  currentPeriodEnd: string | null;
}

export async function fetchSubscription(userId: string): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return {
    plan: (data?.plan as any) ?? 'free',
    status: (data?.status as any) ?? 'none',
    currentPeriodEnd: data?.current_period_end ?? null,
  };
}
