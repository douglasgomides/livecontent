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
  BrandPhoto,
  BrandPhotoCategory,
  SocialPostPerformance,
  SessionCommercialIntelligence,
  PreConsultationResponse,
  Product,
  ProductCategory,
  EvidenceTopicWatch,
  EvidenceTopicUpdate,
  WeeklyContentSuggestion,
  LeadCapture,
  LeadOrigin,
  LeadStatus,
  LeadMessage,
  WhatsappFollowup,
  AvatarVideo,
  ShortLink,
  CustomFormField,
  CustomFormType,
  AdCampaign,
  AdCampaignSuggestion,
  AdSuggestionStatus,
  WeeklyReport,
} from '@/types/session';
import type { Brain } from '@/types/brain';
import { EMPTY_BRAIN } from '@/types/brain';
import {
  normalizePiece,
  normalizeTopic,
  normalizeSession,
} from './migrations';

// ─── Brain ──────────────────────────────────────────────────────────────────

// Checa se o usuário tem permissão de admin — usado só pra decidir se o item
// "Admin" aparece na sidebar (a página em si já tem seu próprio gate real no
// servidor via admin-overview; isso é puramente pra não mostrar um link morto
// pra quem nunca vai conseguir entrar).
export async function isAppAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_app_admin', { uid: userId });
  if (error) { console.warn('[isAppAdmin] failed', error); return false; }
  return !!data;
}

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

// Flag interna (não faz parte do tipo Brain) que marca se o pré-preenchimento
// automático a partir da 1a consulta real já rodou — usada só pra decidir quando
// mostrar o toast de "pré-preenchemos sua Brain" uma única vez (ver store.ts).
export async function fetchBrainSeeded(userId: string): Promise<boolean> {
  const { data } = await supabase.from('brains').select('brain_seeded').eq('user_id', userId).maybeSingle();
  return !!(data as any)?.brain_seeded;
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
      } as any,
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
    unverifiedDraft: !!row.unverified_draft,
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
      virality: t.virality,
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
      virality: p.virality,
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
    unverified_draft: !!s.unverifiedDraft,
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
      virality: (t.virality ?? null) as any,
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
      virality: (p.virality ?? null) as any,
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
  // Onde o CTA "Agendar" da captação de leads manda o lead (WhatsApp,
  // Doctoralia, o que o médico já usa hoje) — null até ele configurar.
  schedulingLink: string | null;
  // Webhook do WhatsApp (mesmo modelo dos webhooks de canal, mas separado —
  // é envio individual por paciente/lead, não broadcast de conteúdo).
  whatsappWebhookUrl: string | null;
  // Token pra autenticar o webhook de ENTRADA (a automação do médico chama
  // esse endpoint quando um lead responde por WhatsApp) — gerado automático
  // pelo banco, só leitura aqui.
  whatsappInboundToken: string | null;
  // Credenciais da conta HeyGen do PRÓPRIO médico (avatar clonado dele) —
  // nunca um secret compartilhado da plataforma, cada médico usa a sua.
  heygenApiKey: string | null;
  heygenAvatarId: string | null;
  heygenVoiceId: string | null;
  // ID da conta de anúncio (Meta/Google) no Windsor.ai que pertence a ESTE
  // médico — a chave do Windsor é compartilhada da agência, isso aqui é só
  // qual conta, dentre as conectadas, é a dele.
  metaAdsAccountId: string | null;
  googleAdsAccountId: string | null;
  // Número do PRÓPRIO médico (não de paciente/lead) — pra onde vai o relatório
  // semanal automático. Reaproveita o mesmo whatsappWebhookUrl como transporte.
  ownWhatsappNumber: string | null;
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
    schedulingLink: data?.scheduling_link ?? null,
    whatsappWebhookUrl: data?.whatsapp_webhook_url ?? null,
    whatsappInboundToken: data?.whatsapp_inbound_token ?? null,
    heygenApiKey: data?.heygen_api_key ?? null,
    heygenAvatarId: data?.heygen_avatar_id ?? null,
    heygenVoiceId: data?.heygen_voice_id ?? null,
    metaAdsAccountId: data?.meta_ads_account_id ?? null,
    googleAdsAccountId: data?.google_ads_account_id ?? null,
    ownWhatsappNumber: (data as any)?.own_whatsapp_number ?? null, // TODO: remove cast after types.ts regenerated (migration 20260803100000 pending)
  };
}

export async function saveSettingsDb(userId: string, s: DoctorSettings): Promise<void> {
  const { error } = await supabase.from('doctor_settings').upsert({
    user_id: userId,
    webhooks: s.webhooks as any,
    preferred_formats: s.preferredFormats as any,
    scheduling_link: s.schedulingLink,
    whatsapp_webhook_url: s.whatsappWebhookUrl,
    heygen_api_key: s.heygenApiKey,
    heygen_avatar_id: s.heygenAvatarId,
    heygen_voice_id: s.heygenVoiceId,
    meta_ads_account_id: s.metaAdsAccountId,
    google_ads_account_id: s.googleAdsAccountId,
    own_whatsapp_number: s.ownWhatsappNumber, // TODO: remove cast below after types.ts regenerated
  } as any, { onConflict: 'user_id' });
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
    audioSummaryPath: row.audio_summary_path ?? null,
    virality: row.virality ?? null,
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

export async function updateEvidenceSourceVirality(id: string, virality: EvidenceSource['virality']): Promise<void> {
  const { error } = await supabase.from('evidence_sources').update({ virality: virality as any }).eq('id', id);
  if (error) throw error;
}

export interface EvidenceUsage {
  pieceId: string;
  sessionId: string;
  format: string;
}

// Cruza cada fonte de evidência com as peças que realmente a citaram
// (content_pieces.evidence_ids) — pra biblioteca deixar de ser uma lista solta
// e mostrar "usada em X peças", com link direto pra cada uma.
export async function fetchEvidenceUsage(userId: string): Promise<Map<string, EvidenceUsage[]>> {
  const { data, error } = await supabase
    .from('content_pieces')
    .select('id, session_id, format, evidence_ids')
    .eq('user_id', userId)
    .not('evidence_ids', 'eq', '[]');
  if (error) throw error;
  const usage = new Map<string, EvidenceUsage[]>();
  (data ?? []).forEach((p: any) => {
    (p.evidence_ids ?? []).forEach((evidenceId: string) => {
      const list = usage.get(evidenceId) ?? [];
      list.push({ pieceId: p.id, sessionId: p.session_id, format: p.format });
      usage.set(evidenceId, list);
    });
  });
  return usage;
}

export async function getEvidenceAudioSignedUrl(path: string, ttlSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('evidence-audio')
    .createSignedUrl(path, ttlSec);
  if (error) throw error;
  return data.signedUrl;
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
    extractedCopy: row.extracted_copy ?? undefined,
    createdAt: row.created_at,
    isDefault: !!row.is_default,
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
  extractedCopy?: string;
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
      extracted_copy: s.extractedCopy ?? null,
    } as any)
    .select('*')
    .single();
  if (error) throw error;
  return mapReferenceStyleRow(data);
}

export async function deleteReferenceStyle(id: string): Promise<void> {
  const { error } = await supabase.from('reference_styles').delete().eq('id', id);
  if (error) throw error;
}

// Marca UM estilo como padrão (aplicado automaticamente em toda geração nova,
// sem precisar escolher toda vez) — desmarca qualquer outro antes, já que o
// banco garante só um padrão por médico (índice único parcial em is_default).
export async function setDefaultReferenceStyle(userId: string, id: string): Promise<void> {
  const { error: e1 } = await supabase.from('reference_styles').update({ is_default: false } as any).eq('user_id', userId);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('reference_styles').update({ is_default: true } as any).eq('id', id);
  if (e2) throw e2;
}

export async function unsetDefaultReferenceStyle(id: string): Promise<void> {
  const { error } = await supabase.from('reference_styles').update({ is_default: false } as any).eq('id', id);
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

// ─── Fotos de marca (médico/clínica/equipe) pra usar de fundo nas artes ─────

function mapBrandPhotoRow(row: any): BrandPhoto {
  return {
    id: row.id,
    storagePath: row.storage_path,
    category: row.category,
    createdAt: row.created_at,
  };
}

export async function fetchBrandPhotos(userId: string): Promise<BrandPhoto[]> {
  const { data, error } = await supabase
    .from('brand_photos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBrandPhotoRow);
}

export async function uploadBrandPhoto(userId: string, file: File, category: BrandPhotoCategory): Promise<BrandPhoto> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('brand-photos')
    .upload(path, file, { contentType: file.type || 'image/jpeg' });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from('brand_photos')
    .insert({ user_id: userId, storage_path: path, category })
    .select('*')
    .single();
  if (error) throw error;
  return mapBrandPhotoRow(data);
}

export async function deleteBrandPhoto(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from('brand-photos').remove([storagePath]);
  const { error } = await supabase.from('brand_photos').delete().eq('id', id);
  if (error) throw error;
}

export async function getBrandPhotoSignedUrl(path: string, ttlSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('brand-photos')
    .createSignedUrl(path, ttlSec);
  if (error) throw error;
  return data.signedUrl;
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
    actionTip: row.action_tip ?? '',
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

// Só os sinais de UMA consulta — usado pelo resumo de fechamento (objeção
// principal, sentimento) logo que a consulta fica pronta, sem puxar o
// histórico inteiro do médico só pra mostrar uma tela.
export async function fetchPatientSignalsForSession(sessionId: string): Promise<PatientSignal[]> {
  const { data, error } = await supabase
    .from('patient_signals')
    .select('*')
    .eq('session_id', sessionId)
    .order('confidence', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPatientSignalRow);
}

// ─── Sugestão semanal de conteúdo (fecha o loop de objeções) ───────────────
// Uma linha por (médico, semana) — calculada sob demanda no cliente na
// primeira visita à Trends da semana (ver src/lib/weeklySuggestion.ts).

function mapWeeklySuggestionRow(row: any): WeeklyContentSuggestion {
  return {
    id: row.id,
    weekStart: row.week_start,
    category: row.category,
    signalCount: row.signal_count,
    exampleLabel: row.example_label,
    actionTip: row.action_tip,
    status: row.status,
    sessionId: row.session_id,
    createdAt: row.created_at,
  };
}

export async function fetchWeeklySuggestion(userId: string, weekStart: string): Promise<WeeklyContentSuggestion | null> {
  const { data, error } = await supabase
    .from('weekly_content_suggestions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error) throw error;
  return data ? mapWeeklySuggestionRow(data) : null;
}

export async function createWeeklySuggestion(userId: string, input: {
  weekStart: string; category: string; signalCount: number; exampleLabel: string; actionTip: string;
}): Promise<WeeklyContentSuggestion> {
  const { data, error } = await supabase
    .from('weekly_content_suggestions')
    .insert({
      user_id: userId,
      week_start: input.weekStart,
      category: input.category,
      signal_count: input.signalCount,
      example_label: input.exampleLabel,
      action_tip: input.actionTip,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapWeeklySuggestionRow(data);
}

export async function updateWeeklySuggestion(id: string, patch: { status?: 'generated' | 'dismissed'; sessionId?: string }): Promise<void> {
  const { error } = await supabase
    .from('weekly_content_suggestions')
    .update({
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.sessionId ? { session_id: patch.sessionId } : {}),
    })
    .eq('id', id);
  if (error) throw error;
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

// ─── Desempenho de posts próprios (sincronizado via Windsor.ai) ────────────

function mapSocialPostRow(row: any): SocialPostPerformance {
  return {
    id: row.id,
    platform: row.platform,
    externalMediaId: row.external_media_id,
    permalink: row.permalink ?? null,
    caption: row.caption ?? null,
    mediaType: row.media_type ?? null,
    postedAt: row.posted_at ?? null,
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    reach: row.reach ?? null,
    saved: row.saved ?? null,
    shares: row.shares ?? null,
    engagement: row.engagement ?? null,
    syncedAt: row.synced_at,
  };
}

export async function fetchTopOwnPosts(userId: string, limit = 10): Promise<SocialPostPerformance[]> {
  const { data, error } = await supabase
    .from('social_post_performance')
    .select('*')
    .eq('user_id', userId)
    .order('engagement', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapSocialPostRow);
}

// ─── Inteligência comercial por consulta (extraída no run-pipeline) ────────

function mapCommercialIntelligenceRow(row: any): SessionCommercialIntelligence {
  const cond = row.condicoes_comerciais ?? {};
  return {
    houveOfertaComercial: !!row.houve_oferta_comercial,
    resultado: row.resultado ?? 'nao_se_aplica',
    motivoResultado: row.motivo_resultado ?? null,
    argumentosUtilizados: (row.argumentos_utilizados ?? []).map((a: any) => ({
      argumento: a.argumento, categoria: a.categoria,
      momentoDaConsulta: a.momento_da_consulta, reacaoPercebidaDoPaciente: a.reacao_percebida_do_paciente,
    })),
    objecoesPaciente: (row.objecoes_paciente ?? []).map((o: any) => ({
      objecao: o.objecao, categoria: o.categoria,
      comoFoiRespondida: o.como_foi_respondida ?? null, objecaoSuperada: o.objecao_superada ?? null,
    })),
    doresIdentificadas: (row.dores_identificadas ?? []).map((d: any) => ({ dor: d.dor, categoria: d.categoria })),
    procedimentosMencionados: row.procedimentos_mencionados ?? [],
    condicoesComerciais: {
      precoMencionado: !!cond.preco_mencionado,
      parcelamentoMencionado: !!cond.parcelamento_mencionado,
      descontoOferecido: !!cond.desconto_oferecido,
      detalhes: cond.detalhes ?? null,
    },
    proximaAcao: row.proxima_acao ?? null,
    resumoComercial: row.resumo_comercial ?? '',
    oportunidadesUpsell: (row.oportunidades_upsell ?? []).map((u: any) => ({
      oportunidade: u.oportunidade, tipo: u.tipo, racional: u.racional,
      produtoCatalogoId: u.produto_catalogo_id ?? null,
      produtoCatalogoNome: u.produto_catalogo_nome ?? null,
      // Consultas geradas antes desse campo existir não têm status gravado —
      // trata como pendente (nunca foi marcada, não é o mesmo que "recusada").
      status: u.status ?? 'pendente',
    })),
    argumentoRecomendadoProximoContato: row.argumento_recomendado_proximo_contato ?? null,
  };
}

export async function fetchCommercialIntelligenceForSession(sessionId: string): Promise<SessionCommercialIntelligence | null> {
  const { data, error } = await supabase
    .from('commercial_intelligence')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCommercialIntelligenceRow(data) : null;
}

export interface CommercialIntelligenceWithMeta extends SessionCommercialIntelligence {
  sessionId: string;
  createdAt: string;
}

// Todas as consultas com inteligência comercial do médico — base pra qualquer
// agregação de previsibilidade (receita projetada, probabilidade, tendência).
export async function fetchAllCommercialIntelligence(userId: string): Promise<CommercialIntelligenceWithMeta[]> {
  const { data, error } = await supabase
    .from('commercial_intelligence')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => ({
    ...mapCommercialIntelligenceRow(row),
    sessionId: row.session_id,
    createdAt: row.created_at,
  }));
}

// Marca o resultado real de uma oportunidade de upsell (aceito/recusado) —
// só o médico faz isso, nunca a IA. É esse dado que vira taxa de conversão
// de verdade pra alimentar a previsibilidade.
export async function updateUpsellOpportunityStatus(
  sessionId: string,
  opportunityIndex: number,
  status: 'aceito' | 'recusado',
): Promise<void> {
  const { data, error: fetchErr } = await supabase
    .from('commercial_intelligence')
    .select('oportunidades_upsell')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!data) throw new Error('Inteligência comercial não encontrada');
  const list: any[] = Array.isArray(data.oportunidades_upsell) ? [...(data.oportunidades_upsell as any[])] : [];
  if (!list[opportunityIndex]) throw new Error('Oportunidade não encontrada');
  list[opportunityIndex] = { ...list[opportunityIndex], status };
  const { error: upErr } = await supabase
    .from('commercial_intelligence')
    .update({ oportunidades_upsell: list })
    .eq('session_id', sessionId);
  if (upErr) throw upErr;
}

// ─── Formulário de pré-consulta (link público avulso) ──────────────────────

function mapPreConsultationRow(row: any): PreConsultationResponse {
  return {
    id: row.id,
    patientName: row.patient_name,
    patientContact: row.patient_contact ?? null,
    answers: row.answers ?? {},
    submittedAt: row.submitted_at,
    linkedSessionId: row.linked_session_id ?? null,
    whatsappConsent: !!row.whatsapp_consent,
  };
}

// Chamado da tela pública /pre-consulta/:doctorId — sem sessão autenticada,
// funciona porque a policy de insert é aberta pro papel anon.
export async function submitPreConsultationForm(
  doctorUserId: string,
  patientName: string,
  patientContact: string,
  answers: Record<string, string | string[]>,
  whatsappConsent: boolean = false,
): Promise<void> {
  const { error } = await supabase.from('preconsultation_responses').insert({
    user_id: doctorUserId,
    patient_name: patientName,
    patient_contact: patientContact || null,
    answers,
    whatsapp_consent: whatsappConsent,
  });
  if (error) throw error;
}

export async function fetchPreConsultationResponses(userId: string): Promise<PreConsultationResponse[]> {
  const { data, error } = await supabase
    .from('preconsultation_responses')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPreConsultationRow);
}

// Acha a resposta de pré-consulta vinculada a ESTA consulta específica — usado
// pra decidir se dá pra oferecer follow-up de WhatsApp (precisa de consentimento
// + contato reais, coletados antes, nunca inventados na hora).
export async function fetchPreConsultationForSession(sessionId: string): Promise<PreConsultationResponse | null> {
  const { data, error } = await supabase
    .from('preconsultation_responses')
    .select('*')
    .eq('linked_session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPreConsultationRow(data) : null;
}

export async function linkPreConsultationResponse(responseId: string, sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('preconsultation_responses')
    .update({ linked_session_id: sessionId })
    .eq('id', responseId);
  if (error) throw error;
}

// ─── Follow-up de WhatsApp por paciente/lead (rascunho -> aprovação -> envio) ──

function mapWhatsappFollowupRow(row: any): WhatsappFollowup {
  return {
    id: row.id,
    sessionId: row.session_id ?? null,
    preconsultResponseId: row.preconsult_response_id ?? null,
    leadId: row.lead_id ?? null,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    sentAt: row.sent_at ?? null,
  };
}

export async function fetchWhatsappFollowupForSession(sessionId: string): Promise<WhatsappFollowup | null> {
  const { data, error } = await supabase
    .from('whatsapp_followups')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapWhatsappFollowupRow(data) : null;
}

export async function createWhatsappFollowup(
  userId: string, sessionId: string, preconsultResponseId: string, phone: string, message: string,
): Promise<WhatsappFollowup> {
  const { data, error } = await supabase
    .from('whatsapp_followups')
    .insert({ user_id: userId, session_id: sessionId, preconsult_response_id: preconsultResponseId, phone, message })
    .select('*')
    .single();
  if (error) throw error;
  return mapWhatsappFollowupRow(data);
}

// Idem, pra um lead (ainda não-paciente) — sem sessão/pré-consulta vinculada.
// Um lead pode trocar várias mensagens ao longo do tempo (diferente de
// paciente, que só tem UM follow-up pós-consulta) — pega sempre a mais
// recente, nunca assume linha única.
export async function fetchWhatsappFollowupForLead(leadId: string): Promise<WhatsappFollowup | null> {
  const { data, error } = await supabase
    .from('whatsapp_followups')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data[0] ? mapWhatsappFollowupRow(data[0]) : null;
}

export async function createWhatsappFollowupForLead(
  userId: string, leadId: string, phone: string, message: string,
): Promise<WhatsappFollowup> {
  const { data, error } = await supabase
    .from('whatsapp_followups')
    .insert({ user_id: userId, lead_id: leadId, phone, message })
    .select('*')
    .single();
  if (error) throw error;
  return mapWhatsappFollowupRow(data);
}

export async function updateWhatsappFollowupMessage(id: string, message: string): Promise<void> {
  const { error } = await supabase.from('whatsapp_followups').update({ message }).eq('id', id);
  if (error) throw error;
}

// Chama a edge function que de fato dispara o webhook do médico — nunca envia
// direto do cliente pro webhook de terceiro (mesmo padrão de segurança das
// publicações em Instagram/LinkedIn/etc via dispatch-publish-webhook).
export async function approveAndSendWhatsappFollowup(followupId: string): Promise<{ ok: boolean; error?: string }> {
  await supabase.from('whatsapp_followups').update({ status: 'approved' }).eq('id', followupId);
  const { data, error } = await supabase.functions.invoke('dispatch-whatsapp-followup', { body: { followup_id: followupId } });
  if (error) return { ok: false, error: error.message ?? 'Falha ao enviar' };
  return data as { ok: boolean; error?: string };
}

// ─── Vídeo com avatar clonado (HeyGen) — sempre sob demanda, por peça ──────

function mapAvatarVideoRow(row: any): AvatarVideo {
  return {
    id: row.id,
    contentPieceId: row.content_piece_id,
    status: row.status,
    videoUrl: row.video_url ?? null,
    error: row.error ?? null,
    createdAt: row.created_at,
  };
}

// Pega a geração mais recente dessa peça — o médico pode gerar de novo (ex.:
// depois de editar o roteiro), então nunca assume linha única.
export async function fetchAvatarVideoForPiece(pieceId: string): Promise<AvatarVideo | null> {
  const { data, error } = await supabase
    .from('avatar_videos')
    .select('*')
    .eq('content_piece_id', pieceId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data[0] ? mapAvatarVideoRow(data[0]) : null;
}

// Chama a edge function que fala com a API do HeyGen usando a CONTA/AVATAR DO
// PRÓPRIO MÉDICO (nunca uma credencial compartilhada da plataforma) — a
// geração em si é assíncrona do lado do HeyGen, esta chamada só inicia o job.
export async function createAvatarVideoJob(pieceId: string): Promise<AvatarVideo> {
  const { data, error } = await supabase.functions.invoke('generate-avatar-video', { body: { piece_id: pieceId } });
  if (error) throw new Error(error.message ?? 'Falha ao iniciar geração do vídeo');
  if (data?.error) throw new Error(data.error);
  return mapAvatarVideoRow(data);
}

// Polling leve enquanto o job está 'processing' — sem cron, o próprio
// componente chama isso a cada alguns segundos enquanto a tela estiver aberta.
export async function checkAvatarVideoStatus(avatarVideoId: string): Promise<AvatarVideo> {
  const { data, error } = await supabase.functions.invoke('check-avatar-video-status', { body: { avatar_video_id: avatarVideoId } });
  if (error) throw new Error(error.message ?? 'Falha ao checar status do vídeo');
  if (data?.error) throw new Error(data.error);
  return mapAvatarVideoRow(data);
}

export async function fetchRecentSessionsForLinking(userId: string, limit = 20): Promise<{ id: string; title: string; createdAt: string }[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, title: r.title, createdAt: r.created_at }));
}

// ─── Captação de lead (link público avulso, pra quem ainda não é paciente) ──

function mapLeadCaptureRow(row: any): LeadCapture {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    reason: row.reason ?? null,
    origin: row.origin,
    status: row.status,
    linkedSessionId: row.linked_session_id ?? null,
    createdAt: row.created_at,
    notes: row.notes ?? null,
    nextFollowUpAt: row.next_follow_up_at ?? null,
    whatsappConsent: !!row.whatsapp_consent,
    suggestedStatus: row.suggested_status ?? null,
    suggestedStatusReason: row.suggested_status_reason ?? null,
    customAnswers: row.custom_answers ?? {},
    utmCampaign: row.utm_campaign ?? null,
  };
}

// Chamado da tela pública /captar/:doctorId — sem sessão autenticada, funciona
// porque a policy de insert é aberta pro papel anon.
export async function submitLeadCapture(
  doctorUserId: string,
  name: string,
  contact: string,
  reason: string,
  origin: LeadOrigin,
  whatsappConsent: boolean = false,
  customAnswers: Record<string, string | string[]> = {},
  utmCampaign: string | null = null,
): Promise<void> {
  const { error } = await supabase.from('lead_captures').insert({
    user_id: doctorUserId,
    name,
    contact,
    reason: reason || null,
    origin,
    whatsapp_consent: whatsappConsent,
    custom_answers: customAnswers,
    utm_campaign: utmCampaign,
  });
  if (error) throw error;
}

export async function fetchLeadCaptures(userId: string): Promise<LeadCapture[]> {
  const { data, error } = await supabase
    .from('lead_captures')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLeadCaptureRow);
}

// IDs de lead com um rascunho de WhatsApp esperando aprovação — pra mostrar um
// aviso no card do kanban sem precisar abrir cada lead um por um (nurturing
// proativo por temperatura cria esses rascunhos sozinho, sem o médico pedir).
export async function fetchLeadIdsWithPendingDraft(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('whatsapp_followups')
    .select('lead_id')
    .eq('user_id', userId)
    .eq('status', 'draft')
    .not('lead_id', 'is', null);
  if (error) throw error;
  return new Set((data ?? []).map((r: any) => r.lead_id as string));
}

// Qualquer mudança manual de etapa invalida uma sugestão da IA pendente
// (ela já cumpriu o papel, seja porque o médico seguiu ou porque decidiu
// diferente) — sempre limpa junto, nunca deixa uma sugestão velha na tela.
export async function updateLeadCaptureStatus(id: string, status: LeadStatus): Promise<void> {
  const { error } = await supabase
    .from('lead_captures')
    // Reseta o relógio do nurturing proativo — a cadência conta os dias a
    // partir de QUANDO entrou nesta etapa, não de quando o lead foi criado.
    .update({ status, suggested_status: null, suggested_status_reason: null, status_changed_at: new Date().toISOString(), last_nurture_day: 0 } as any) // TODO: remove cast after types.ts regenerated
    .eq('id', id);
  if (error) throw error;
}

// Descarta a sugestão sem mudar a etapa — "não, obrigado" do médico.
export async function dismissLeadSuggestion(id: string): Promise<void> {
  const { error } = await supabase
    .from('lead_captures')
    .update({ suggested_status: null, suggested_status_reason: null })
    .eq('id', id);
  if (error) throw error;
}

// Nota livre e data de retorno — mini-CRM, nenhum dos dois dispara nada
// sozinho, é só estado do acompanhamento manual do médico.
export async function updateLeadCaptureNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase.from('lead_captures').update({ notes: notes || null }).eq('id', id);
  if (error) throw error;
}

export async function updateLeadCaptureFollowUp(id: string, date: string | null): Promise<void> {
  const { error } = await supabase.from('lead_captures').update({ next_follow_up_at: date }).eq('id', id);
  if (error) throw error;
}

export async function linkLeadCaptureToSession(id: string, sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('lead_captures')
    .update({ linked_session_id: sessionId, status: 'convertido' })
    .eq('id', id);
  if (error) throw error;
}

// Histórico de conversa por WhatsApp com um lead — só leitura, quem grava é
// o servidor (edge function no inbound, e o dispatch no outbound).
export async function fetchLeadMessages(leadId: string): Promise<LeadMessage[]> {
  const { data, error } = await supabase
    .from('lead_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id, leadId: row.lead_id, direction: row.direction, body: row.body, createdAt: row.created_at,
  }));
}

// Chamado da tela pública /captar/:doctorId — RPC estreita (só devolve o link
// de agendamento, nunca a linha inteira de doctor_settings, que também guarda
// URLs de webhook) porque a tabela não tem select público.
export async function fetchSchedulingLinkPublic(doctorId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_scheduling_link', { doctor_id: doctorId });
  if (error) { console.warn('[fetchSchedulingLinkPublic] failed', error); return null; }
  return data ?? null;
}

// ─── Catálogo de produtos/procedimentos ────────────────────────────────────

function mapProductRow(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? null,
    priceRange: row.price_range ?? null,
    avgPrice: row.avg_price ?? null,
    active: row.active,
    createdAt: row.created_at,
  };
}

export async function fetchProducts(userId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapProductRow);
}

export async function addProduct(
  userId: string,
  name: string,
  category: ProductCategory,
  description: string,
  priceRange: string,
  avgPrice: number | null,
): Promise<void> {
  const { error } = await supabase.from('products').insert({
    user_id: userId,
    name,
    category,
    description: description || null,
    price_range: priceRange || null,
    avg_price: avgPrice,
  });
  if (error) throw error;
}

export async function updateProductActive(productId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('products').update({ active }).eq('id', productId);
  if (error) throw error;
}

export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw error;
}

// ─── Monitoramento de tema (evidência científica) ──────────────────────────

function mapTopicWatchRow(row: any): EvidenceTopicWatch {
  return {
    id: row.id,
    topic: row.topic,
    active: row.active,
    createdAt: row.created_at,
    lastCheckedAt: row.last_checked_at ?? null,
  };
}

function mapTopicUpdateRow(row: any): EvidenceTopicUpdate {
  return {
    id: row.id,
    watchId: row.watch_id,
    title: row.title,
    summary: row.summary,
    sourceTitle: row.source_title ?? null,
    sourceUrl: row.source_url ?? null,
    foundAt: row.found_at,
    virality: row.virality ?? null,
  };
}

export async function fetchTopicWatches(userId: string): Promise<EvidenceTopicWatch[]> {
  const { data, error } = await supabase
    .from('evidence_topic_watches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapTopicWatchRow);
}

export async function addTopicWatch(userId: string, topic: string): Promise<EvidenceTopicWatch> {
  const { data, error } = await supabase
    .from('evidence_topic_watches')
    .insert({ user_id: userId, topic })
    .select('*')
    .single();
  if (error) throw error;
  return mapTopicWatchRow(data);
}

export async function deleteTopicWatch(id: string): Promise<void> {
  const { error } = await supabase.from('evidence_topic_watches').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTopicUpdates(watchIds: string[]): Promise<Map<string, EvidenceTopicUpdate[]>> {
  const map = new Map<string, EvidenceTopicUpdate[]>();
  if (!watchIds.length) return map;
  const { data, error } = await supabase
    .from('evidence_topic_updates')
    .select('*')
    .in('watch_id', watchIds)
    .order('found_at', { ascending: false });
  if (error) throw error;
  (data ?? []).forEach((row: any) => {
    const u = mapTopicUpdateRow(row);
    const list = map.get(u.watchId) ?? [];
    list.push(u);
    map.set(u.watchId, list);
  });
  return map;
}

// ─── Encurtador de link ─────────────────────────────────────────────────────

function mapShortLinkRow(row: any): ShortLink {
  return { id: row.id, slug: row.slug, targetUrl: row.target_url, clicks: row.clicks, createdAt: row.created_at };
}

function randomSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Reaproveita o slug existente se essa URL exata já foi encurtada antes
// (unique em user_id+target_url), senão cria um novo com retry em colisão
// de slug (extremamente raro com 7 chars base62, mas o unique garante).
export async function createOrGetShortLink(userId: string, targetUrl: string): Promise<ShortLink> {
  const { data: existing } = await supabase
    .from('short_links').select('*').eq('user_id', userId).eq('target_url', targetUrl).maybeSingle();
  if (existing) return mapShortLinkRow(existing);

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('short_links')
      .insert({ user_id: userId, target_url: targetUrl, slug: randomSlug() })
      .select('*')
      .single();
    if (!error) return mapShortLinkRow(data);
    if (error.code !== '23505') throw error; // não é conflito de unique, propaga
  }
  throw new Error('Não deu pra gerar um link curto agora. Tente de novo.');
}

// Chamado pela tela pública /s/:slug — sem sessão, via RPC estreita (nunca
// expõe a tabela toda nem qual médico é dono do link).
export async function resolveShortLink(slug: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('resolve_short_link', { p_slug: slug });
  if (error) throw error;
  return data ?? null;
}

// ─── Campos customizáveis dos formulários públicos ─────────────────────────

function mapCustomFormFieldRow(row: any): CustomFormField {
  return {
    id: row.id,
    formType: row.form_type,
    label: row.label,
    fieldType: row.field_type,
    options: Array.isArray(row.options) ? row.options : [],
    position: row.position,
    required: !!row.required,
  };
}

// Autenticado — usado na tela do médico que monta os campos.
export async function fetchCustomFormFields(userId: string, formType: CustomFormType): Promise<CustomFormField[]> {
  const { data, error } = await supabase
    .from('custom_form_fields')
    .select('*')
    .eq('user_id', userId)
    .eq('form_type', formType)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCustomFormFieldRow);
}

// Público — usado pelos dois formulários públicos pra se montarem, via RPC
// estreita (só o que o formulário precisa renderizar, nunca o user_id).
export async function fetchPublicCustomFormFields(doctorId: string, formType: CustomFormType): Promise<CustomFormField[]> {
  const { data, error } = await supabase.rpc('get_custom_form_fields', { p_doctor_id: doctorId, p_form_type: formType });
  if (error) throw error;
  return (data ?? []).map(mapCustomFormFieldRow);
}

export async function createCustomFormField(
  userId: string,
  formType: CustomFormType,
  field: Omit<CustomFormField, 'id' | 'formType' | 'position'>,
  position: number,
): Promise<CustomFormField> {
  const { data, error } = await supabase
    .from('custom_form_fields')
    .insert({
      user_id: userId,
      form_type: formType,
      label: field.label,
      field_type: field.fieldType,
      options: field.options,
      required: field.required,
      position,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapCustomFormFieldRow(data);
}

export async function updateCustomFormField(id: string, patch: Partial<Pick<CustomFormField, 'label' | 'fieldType' | 'options' | 'required' | 'position'>>): Promise<void> {
  const { error } = await supabase.from('custom_form_fields').update({
    ...(patch.label !== undefined && { label: patch.label }),
    ...(patch.fieldType !== undefined && { field_type: patch.fieldType }),
    ...(patch.options !== undefined && { options: patch.options }),
    ...(patch.required !== undefined && { required: patch.required }),
    ...(patch.position !== undefined && { position: patch.position }),
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomFormField(id: string): Promise<void> {
  const { error } = await supabase.from('custom_form_fields').delete().eq('id', id);
  if (error) throw error;
}

// ─── Inteligência de anúncios (Meta Ads / Google Ads via Windsor.ai) ───────

// Cruza ad_campaigns (sincronizado do Windsor.ai) com lead_captures.utm_campaign
// pra mostrar CAC/conversão REAL por campanha, não só CTR/CPC da plataforma.
export async function fetchAdCampaigns(userId: string): Promise<AdCampaign[]> {
  const [{ data: campaigns, error: campErr }, { data: leads, error: leadErr }] = await Promise.all([
    supabase.from('ad_campaigns').select('*').eq('user_id', userId).order('spend', { ascending: false }),
    supabase.from('lead_captures').select('utm_campaign, status').eq('user_id', userId).not('utm_campaign', 'is', null),
  ]);
  if (campErr) throw campErr;
  if (leadErr) throw leadErr;

  const leadsByCampaign = new Map<string, { total: number; convertido: number }>();
  (leads ?? []).forEach((l: any) => {
    const key = l.utm_campaign as string;
    const cur = leadsByCampaign.get(key) ?? { total: 0, convertido: 0 };
    cur.total += 1;
    if (l.status === 'convertido') cur.convertido += 1;
    leadsByCampaign.set(key, cur);
  });

  return (campaigns ?? []).map((row: any) => {
    const attribution = leadsByCampaign.get(row.campaign_name) ?? { total: 0, convertido: 0 };
    return {
      id: row.id,
      platform: row.platform,
      externalCampaignId: row.external_campaign_id,
      campaignName: row.campaign_name,
      status: row.status,
      spend: Number(row.spend),
      impressions: Number(row.impressions),
      clicks: Number(row.clicks),
      datePreset: row.date_preset,
      syncedAt: row.synced_at,
      leadsGenerated: attribution.total,
      patientsConverted: attribution.convertido,
      cac: attribution.total > 0 ? Number(row.spend) / attribution.total : null,
    };
  });
}

function mapAdSuggestionRow(row: any): AdCampaignSuggestion {
  return {
    id: row.id,
    adCampaignId: row.ad_campaign_id,
    suggestionType: row.suggestion_type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? null,
  };
}

export async function fetchAdCampaignSuggestions(userId: string): Promise<AdCampaignSuggestion[]> {
  const { data, error } = await supabase
    .from('ad_campaign_suggestions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAdSuggestionRow);
}

// Aprovar aqui NUNCA executa nada no Meta/Google Ads de verdade (não temos
// escrita conectada na conta do médico) — só registra a decisão dele. A ação
// concreta (pausar, mudar orçamento) ele ainda faz no próprio Ads Manager.
export async function resolveAdCampaignSuggestion(id: string, status: AdSuggestionStatus): Promise<void> {
  const { error } = await supabase
    .from('ad_campaign_suggestions')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ─── Relatório semanal (gerado por cron + WhatsApp, aqui só leitura) ───────

// TODO: remove (supabase as any) casts below after types.ts regenerated (migration 20260803100000 pending)
export async function fetchLatestWeeklyReport(userId: string): Promise<WeeklyReport | null> {
  const { data, error } = await (supabase as any)
    .from('weekly_reports')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    weekStart: data.week_start,
    content: data.content as WeeklyReport['content'],
    message: data.message,
    sent: data.sent,
    sentAt: data.sent_at ?? null,
    createdAt: data.created_at,
  };
}
