export interface DoctorLayer {
  name: string;
  specialty: string;
  credentials: string;
  yearsPractice: string;
  tone: 'didactic' | 'empathetic' | 'direct' | 'technical';
  catchphrases: string[];
  lovedTopics: string[];
  avoidedTopics: string[];
  references: string[];
  openingStyle: string;
}

export interface PatientLayer {
  demographic: string;
  mainPains: string[];
  commonObjections: string[];
  language: string;
  fears: string[];
  decisionTriggers: string[];
  channels: string[];
}

export interface BrandLayer {
  positioning: string;
  pillars: [string, string, string] | string[];
  values: string[];
  ethicalPromises: string[];
  wordsYes: string[];
  wordsNo: string[];
  defaultCTA: string;
}

export interface Brain {
  doctor: DoctorLayer;
  patient: PatientLayer;
  brand: BrandLayer;
  onboarded: boolean;
}

export const EMPTY_BRAIN: Brain = {
  doctor: {
    name: '',
    specialty: '',
    credentials: '',
    yearsPractice: '',
    tone: 'didactic',
    catchphrases: [],
    lovedTopics: [],
    avoidedTopics: [],
    references: [],
    openingStyle: '',
  },
  patient: {
    demographic: '',
    mainPains: [],
    commonObjections: [],
    language: '',
    fears: [],
    decisionTriggers: [],
    channels: [],
  },
  brand: {
    positioning: '',
    pillars: ['', '', ''],
    values: [],
    ethicalPromises: [],
    wordsYes: [],
    wordsNo: [],
    defaultCTA: '',
  },
  onboarded: false,
};
