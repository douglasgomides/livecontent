export type SessionStatus =
  | 'recording'
  | 'transcribing'
  | 'anonymizing'
  | 'anonymization_review'
  | 'extracting_topics'
  | 'topics_review'
  | 'generating_content'
  | 'ready';

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

export interface ContentPiece {
  id: string;
  topicId: string;
  format: ContentFormat;
  channel: ContentChannel;
  body: string;
  cfm: CFMResult;
  approved: boolean;
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
}

export interface ScienceSource {
  reference: string;
  kind: 'abstract' | 'news' | 'guideline' | 'other';
  originalText: string;
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
  message?: string;
}
