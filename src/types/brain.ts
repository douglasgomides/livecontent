export interface DoctorLayer {
  name: string;
  specialty: string;
  credentials: string;
  yearsPractice: string;
  tone: 'didactic' | 'empathetic' | 'direct' | 'technical';
  // Sugestão automática (baseada na 1a consulta real) de um tom diferente do escolhido
  // no onboarding — nunca aplicada sozinha, só some quando o médico aceita ou dispensa.
  toneSuggested?: 'didactic' | 'empathetic' | 'direct' | 'technical';
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
  handle: string;
  colorPrimary: string;
  colorBackground: string;
  colorText: string;
  fontHeading: string;
}

export interface Brain {
  doctor: DoctorLayer;
  patient: PatientLayer;
  brand: BrandLayer;
  onboarded: boolean;
  // Opt-in explícito do médico pra usar objeções inferidas automaticamente
  // (patient_signals) nas próximas gerações — nunca ligado sozinho, mesmo com
  // amostra suficiente. Fica na raiz (não em patient/*) pra não distorcer
  // getCompleteness(), que itera Object.keys() de cada camada curada manualmente.
  objectionsOptIn: boolean;
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
    handle: '@seu.consultorio',
    colorPrimary: '#C9A84C',
    colorBackground: '#0A0A0A',
    colorText: '#F5F0E8',
    fontHeading: 'Cormorant Garamond, Georgia, serif',
  },
  onboarded: false,
  objectionsOptIn: false,
};
