export type ConsultationStatus = 
  | 'recording'
  | 'transcribed'
  | 'anonymized'
  | 'separated'
  | 'analyzed'
  | 'dashboard_ready'
  | 'content_generated'
  | 'completed';

export interface DoctorSettings {
  specialty: string;
  objective: 'authority' | 'education' | 'growth' | 'conversion';
  tone: 'didactic' | 'empathetic' | 'direct' | 'technical';
  mode: 'automatic' | 'approval';
}

export interface PatientVoice {
  keyPhrases: { text: string; emotion: string; type: 'pain' | 'fear' | 'doubt' | 'desire' }[];
  implicitQuestions: string[];
  languageStyle: string;
  emotionalJourney: { stage: string; emotion: string }[];
}

export interface DoctorCommunication {
  authorityMoments: string[];
  didacticExplanations: string[];
  strongAnalogies: string[];
  confusingPoints: string[];
}

export interface ClinicalIntelligence {
  centralPain: string;
  fears: string[];
  objectionType: 'fear' | 'information' | 'timing';
  interestLevel: number;
  trustLevel: number;
  decisionProfile: string;
  followUpGuidelines: string[];
  reinforcementPoints: string[];
}

export interface BrandExtraction {
  transmittedValues: string[];
  implicitDifferentials: string[];
  recurrentNarratives: string[];
  positioningCause: string;
  motherPhrases: string[];
  authorityThemes: string[];
}

export interface ContentSuggestion {
  theme: string;
  ethicalRisk: 'low' | 'medium' | 'high';
  format: 'reel' | 'carousel' | 'stories' | 'post';
  description: string;
}

export interface GeneratedContent {
  reels: { title: string; script: string; duration: string }[];
  carousels: { title: string; slides: string[] }[];
  stories: { content: string }[];
  posts: { title: string; content: string }[];
}

export interface Consultation {
  id: string;
  createdAt: Date;
  duration: number;
  status: ConsultationStatus;
  consentGiven: boolean;
  audioUrl?: string;
  transcription?: string;
  anonymizedTranscription?: string;
  patientSpeech?: string[];
  doctorSpeech?: string[];
  patientVoice?: PatientVoice;
  doctorCommunication?: DoctorCommunication;
  clinicalIntelligence?: ClinicalIntelligence;
  brandExtraction?: BrandExtraction;
  contentPotential?: number;
  authorityPotential?: number;
  initialEmotion?: string;
  finalEmotion?: string;
  awarenessLevel?: string;
  contentSuggestions?: ContentSuggestion[];
  generatedContent?: GeneratedContent;
  finalGuidance?: {
    postFirst: string;
    reason: string;
    expectedImpact: string;
    ethicalAlerts: string[];
  };
}
