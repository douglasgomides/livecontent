export type SessionStatus =
  | 'recording'
  | 'transcribing'
  | 'anonymizing'
  | 'anonymization_review'
  | 'extracting_topics'
  | 'topics_review'
  | 'generating_content'
  | 'ready';

export type SessionSource = 'recording' | 'upload' | 'voice_note' | 'science';

export type ContentFormat = 'reel' | 'carousel' | 'caption' | 'linkedin';

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

export interface ContentPiece {
  id: string;
  topicId: string;
  format: ContentFormat;
  body: string;
  cfm: CFMResult;
  approved: boolean;
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
