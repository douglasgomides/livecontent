export type ConsultationStatus = 
  | 'recording'
  | 'transcribing'
  | 'anonymizing'
  | 'separating'
  | 'extracting_patient'
  | 'analyzing_doctor'
  | 'clinical_intelligence'
  | 'brand_extraction'
  | 'dashboard_ready'
  | 'content_decision'
  | 'content_generating'
  | 'completed';

export const PROCESSING_STAGES: { id: ConsultationStatus; label: string; description: string }[] = [
  { id: 'recording', label: 'Gravação', description: 'Capturando áudio da consulta' },
  { id: 'transcribing', label: 'Transcrição', description: 'Convertendo áudio em texto (100%)' },
  { id: 'anonymizing', label: 'Anonimização', description: 'Removendo dados identificáveis' },
  { id: 'separating', label: 'Separação de Falas', description: 'Identificando médico e paciente' },
  { id: 'extracting_patient', label: 'Voz do Paciente', description: 'Extraindo frases, emoções e linguagem' },
  { id: 'analyzing_doctor', label: 'Comunicação Médica', description: 'Analisando pontos fortes e analogias' },
  { id: 'clinical_intelligence', label: 'Inteligência Clínica', description: 'Mapeando objeções e decisão' },
  { id: 'brand_extraction', label: 'Extração de Marca', description: 'Identificando valores e diferenciais' },
  { id: 'dashboard_ready', label: 'Dashboard', description: 'Organizando dados para visualização' },
  { id: 'content_decision', label: 'Decisão de Conteúdo', description: 'Classificando temas e riscos' },
  { id: 'content_generating', label: 'Geração de Conteúdo', description: 'Criando Reels, Carrosséis, Stories' },
  { id: 'completed', label: 'Concluído', description: 'Consulta transformada em ativos' },
];

export interface DoctorSettings {
  name: string;
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
  id: string;
  theme: string;
  ethicalRisk: 'low' | 'medium' | 'high';
  format: 'reel' | 'carousel' | 'stories' | 'post';
  description: string;
  blocked?: boolean;
}

export interface GeneratedContent {
  reels: { id: string; title: string; script: string; duration: string }[];
  carousels: { id: string; title: string; slides: string[] }[];
  stories: { id: string; slides: { content: string; type: 'text' | 'question' | 'poll' }[] }[];
  posts: { id: string; title: string; content: string }[];
}

export interface PatientExperience {
  clearPoints: string[];
  uncertainties: string[];
  recommendedContent: string[];
}

export interface FinalGuidance {
  postFirst: string;
  reason: string;
  expectedImpact: string;
  ethicalAlerts: string[];
}

export interface SalesArsenal {
  // Sugestões de fala para o médico
  suggestedPhrases: {
    situation: string;
    phrase: string;
    why: string;
  }[];
  // Produtos/tratamentos recomendados
  recommendedProducts: {
    name: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    priceRange?: string;
  }[];
  // Scripts para objeções comuns
  objectionHandlers: {
    objection: string;
    response: string;
    tone: 'empathetic' | 'educational' | 'reassuring';
  }[];
  // Gatilhos de fechamento
  closingTriggers: {
    signal: string;
    action: string;
  }[];
  // Probabilidade de fechamento
  closingProbability: number;
  // Próximos passos recomendados
  nextSteps: string[];
  // Pontos de urgência
  urgencyPoints: string[];
}

export interface Consultation {
  id: string;
  createdAt: Date;
  duration: number;
  status: ConsultationStatus;
  currentStage: number;
  consentGiven: boolean;
  audioUrl?: string;
  
  // Stage 2
  transcription?: string;
  
  // Stage 3
  anonymizedTranscription?: string;
  
  // Stage 4
  patientSpeech?: string[];
  doctorSpeech?: string[];
  
  // Stage 5
  patientVoice?: PatientVoice;
  
  // Stage 6
  doctorCommunication?: DoctorCommunication;
  
  // Stage 7
  clinicalIntelligence?: ClinicalIntelligence;
  
  // Stage 8
  brandExtraction?: BrandExtraction;
  
  // Dashboard metrics
  contentPotential?: number;
  authorityPotential?: number;
  initialEmotion?: string;
  finalEmotion?: string;
  awarenessLevel?: string;
  
  // Stage 10
  contentSuggestions?: ContentSuggestion[];
  
  // Stage 11
  generatedContent?: GeneratedContent;
  
  // Patient experience
  patientExperience?: PatientExperience;
  
  // Stage 12
  finalGuidance?: FinalGuidance;

  // Sales Arsenal
  salesArsenal?: SalesArsenal;
}
