export type SessionStatus =
  | 'recording'
  | 'transcribing'
  | 'anonymizing'
  | 'anonymization_review'
  | 'extracting_topics'
  | 'topics_review'
  | 'generating_content'
  | 'ready'
  | 'failed';

export type SessionSource = 'recording' | 'upload' | 'voice_note' | 'science' | 'audio_livre' | 'link';

export type ContentFormat =
  | 'reel' | 'carousel' | 'caption' | 'stories' | 'linkedin'
  | 'blog' | 'youtube' | 'tiktok' | 'podcast'
  | 'gmb' | 'doctoralia' | 'website';

export type ContentChannel =
  | 'instagram' | 'linkedin' | 'youtube' | 'tiktok'
  | 'blog' | 'gmb' | 'doctoralia' | 'website' | 'podcast';

export interface PIIFinding {
  original: string;
  replacement: string;
  type: 'name' | 'id' | 'plan' | 'address' | 'contact' | 'profession' | 'other';
}

export interface Topic {
  id: string;
  title: string;
  summary: string;
  funnelStage: 'C0' | 'C1' | 'C2' | 'C3';
  included: boolean;
}

export interface CFMResult {
  score: number; // 0-100
  flags: { label: string; severity: 'info' | 'warning' | 'block' }[];
}

export interface ArtworkSlide {
  kind: 'cover' | 'content' | 'cta' | 'story';
  eyebrow?: string;
  title?: string;
  body?: string;
  footer?: string;
}

export interface Artwork {
  width: number;
  height: number;
  slides: ArtworkSlide[];
}

export type ExternalPromptTool = 'sora' | 'runway' | 'notebook_lm' | 'midjourney' | 'heygen' | 'elevenlabs';

export type PipelineStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'rejected' | 'blocked';

export type RejectReason = 'off_tone' | 'sensitive' | 'weak_hook' | 'wrong_channel' | 'other';

export interface ContentPiece {
  id: string;
  topicId: string;
  format: ContentFormat;
  channel: ContentChannel;
  body: string;
  cfm: CFMResult;
  approved: boolean;
  rejected?: boolean;
  rejectedReason?: RejectReason;
  rejectedNote?: string;
  meta?: {
    title?: string;
    metaDescription?: string;
    tags?: string[];
    hashtags?: string[];
    timestamps?: { time: string; label: string }[];
    thumbnailHint?: string;
    duration?: string;
    cta?: string;
  };
  brainSignals?: {
    pillar?: string;
    usedTraits: string[];
  };
  artwork?: Artwork;
  externalPrompts?: Partial<Record<ExternalPromptTool, string>>;
  evidenceIds?: string[];
  referenceStyleId?: string;
}

export type EvidenceLevel =
  | 'meta_analysis' | 'systematic_review' | 'rct' | 'cohort'
  | 'case_control' | 'case_series' | 'guideline' | 'expert_opinion' | 'other';

export interface EvidenceSource {
  id: string;
  title: string;
  authors?: string;
  journal?: string;
  year?: number;
  url?: string;
  pubmedId?: string;
  evidenceLevel: EvidenceLevel;
  summary?: string;
  tags: string[];
  source: 'manual' | 'pubmed';
  createdAt: string;
}

export interface ReferenceStyle {
  id: string;
  name: string;
  formatHint: string;
  sourceType: 'image' | 'text';
  sourceImagePath?: string;
  sourceText?: string;
  // 'own' = peça do próprio médico (adaptação fiel liberada); 'other' = peça de
  // outra pessoa/conta (só estrutura abstrata, nunca texto — protege direito autoral).
  sourceOwnership: 'own' | 'other';
  structureDescription: string;
  createdAt: string;
}

export interface ScienceSource {
  reference: string;
  kind: 'abstract' | 'news' | 'guideline' | 'other';
  originalText: string;
}

export type PatientSignalKind = 'objection' | 'question' | 'buying_signal';

// Sinal de inteligência comercial extraído automaticamente da transcrição
// anonimizada — paráfrase curta, nunca frase literal do paciente.
export interface PatientSignal {
  id: string;
  sessionId: string;
  kind: PatientSignalKind;
  category: string;
  label: string;
  confidence: number;
  createdAt: string;
}

export interface Session {
  id: string;
  createdAt: string;
  source: SessionSource;
  title: string;
  durationSec: number;
  status: SessionStatus;
  audioUrl?: string;
  rawTranscript?: string;
  anonymizedTranscript?: string;
  piiFindings?: PIIFinding[];
  topics?: Topic[];
  content?: ContentPiece[];
  science?: ScienceSource;
  errorMessage?: string;
}

export interface DoctorProfile {
  name: string;
  specialty: string;
  idealPatient: string;
  tone: 'didactic' | 'empathetic' | 'direct' | 'technical';
  onboarded: boolean;
}

// Publish queue
export type PublishStatus = 'queued' | 'publishing' | 'published' | 'needs_connection' | 'downloaded' | 'failed';

export interface PublishJob {
  id: string;
  pieceId: string;
  sessionId: string;
  channel: ContentChannel;
  format: ContentFormat;
  title: string;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  message?: string;
}
