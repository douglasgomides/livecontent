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

export type SessionSource = 'recording' | 'upload' | 'voice_note' | 'science' | 'audio_livre' | 'link' | 'tema_sugerido';

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
  // Potencial de viralização da matéria-prima (o tema em si, antes de virar
  // conteúdo) — calculado automaticamente ao extrair os temas; null até isso rodar.
  virality?: ViralityResult | null;
}

export interface CFMResult {
  score: number; // 0-100
  flags: { label: string; severity: 'info' | 'warning' | 'block' }[];
  // false quando a IA não conseguiu avaliar (falha na chamada) — nesse caso
  // score é só um placeholder neutro (50), NUNCA uma nota real. Distingue
  // "metade conforme" de "não avaliado", que são estados completamente diferentes.
  evaluated: boolean;
}

// Nota de potencial de viralização/qualidade, estilo Opus Clip — gancho, retenção
// e "vontade de compartilhar", cada um 0-100 (score final é a média dos três).
// Aplicada tanto em matéria-prima ainda não virou conteúdo (tema de consulta,
// artigo, notícia monitorada) quanto na peça já gerada — pra apontar o que vale
// mais a pena puxar/gerar primeiro, e o que priorizar na hora de publicar.
export interface ViralityResult {
  score: number;
  hook: number;
  retention: number;
  shareability: number;
  reasons: string[];
}

export interface ArtworkSlide {
  kind: 'cover' | 'content' | 'cta' | 'story';
  eyebrow?: string;
  title?: string;
  body?: string;
  footer?: string;
  // Categoria de foto de marca sugerida pra fundo deste slide (ex.: 'lifestyle'
  // pro gancho emocional, 'clinic' pra mostrar o consultório) — só usada se o
  // médico tiver fotos dessa categoria; sem isso, o slide fica só o cartão de texto.
  photoCategory?: BrandPhotoCategory;
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
  // Potencial de viralização da peça já gerada — pra saber o que priorizar
  // publicar primeiro. null até rodar (rescoring manual reavalia junto com CFM).
  virality?: ViralityResult | null;
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
  // Caminho no storage do resumo em áudio já gerado (cache — evita reprocessar
  // toda vez). Null até a primeira vez que o médico pede o resumo em áudio.
  audioSummaryPath?: string | null;
  // Potencial de viralização/qualidade do artigo como matéria-prima de conteúdo —
  // calculado ao cadastrar (best-effort, pode ficar null se a IA falhar).
  virality?: ViralityResult | null;
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
  // Transcrição literal da copy original — só existe quando sourceOwnership='own'
  // (adaptação fiel é segura, é autoria do próprio médico). Ajuda a gerar mais
  // próximo do original do que só a estrutura abstrata permitiria.
  extractedCopy?: string;
  createdAt: string;
  // Marca este estilo como o padrão aplicado automaticamente em toda geração
  // nova (sem precisar escolher toda vez). Só um por médico — banco garante isso.
  isDefault: boolean;
}

// Inteligência comercial extraída dessa consulta específica (run-pipeline) —
// nunca mostrada antes na tela da própria consulta, só no agregado do admin.
export interface CommercialArgument {
  argumento: string;
  categoria: string;
  momentoDaConsulta: string;
  reacaoPercebidaDoPaciente: string;
}
export interface CommercialObjection {
  objecao: string;
  categoria: string;
  comoFoiRespondida: string | null;
  objecaoSuperada: boolean | null;
}
export interface CommercialPain {
  dor: string;
  categoria: string;
}
// Status real da oportunidade — NUNCA gerado pela IA, só o médico marca depois
// de saber o que de fato aconteceu. É essa marcação que vira dado real pra
// calcular taxa de conversão/probabilidade — sem isso não existe previsão
// honesta possível, só achismo.
export type UpsellStatus = 'pendente' | 'aceito' | 'recusado';

export interface UpsellOpportunity {
  oportunidade: string;
  tipo: string;
  racional: string;
  // Preenchido só quando a IA casa a oportunidade com um item real do catálogo
  // de produtos do médico (nunca inventado) — null quando não há correspondência.
  produtoCatalogoId: string | null;
  produtoCatalogoNome: string | null;
  status: UpsellStatus;
}
export interface SessionCommercialIntelligence {
  houveOfertaComercial: boolean;
  resultado: 'fechou' | 'nao_fechou' | 'indefinido' | 'nao_se_aplica';
  motivoResultado: string | null;
  argumentosUtilizados: CommercialArgument[];
  objecoesPaciente: CommercialObjection[];
  doresIdentificadas: CommercialPain[];
  procedimentosMencionados: string[];
  condicoesComerciais: { precoMencionado: boolean; parcelamentoMencionado: boolean; descontoOferecido: boolean; detalhes: string | null };
  proximaAcao: string | null;
  resumoComercial: string;
  oportunidadesUpsell: UpsellOpportunity[];
  argumentoRecomendadoProximoContato: string | null;
}

// Ideia de conteúdo em alta pra especialidade, pesquisada de verdade na web
// (nunca inventada) — cacheada por alguns dias pra não pesquisar toda hora.
export interface TrendingContentIdea {
  id: string;
  specialty: string;
  topic: string;
  whyItWorks: string;
  suggestedFormat: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  fetchedAt: string;
}

// Desempenho real de um post próprio (sincronizado via Windsor.ai) — mostra o
// que já funcionou de verdade com a própria audiência, pra repetir o padrão.
export interface SocialPostPerformance {
  id: string;
  platform: string;
  externalMediaId: string;
  permalink: string | null;
  caption: string | null;
  mediaType: string | null;
  postedAt: string | null;
  likes: number;
  comments: number;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  engagement: number | null;
  syncedAt: string;
}

// Resposta de um paciente ao formulário de pré-consulta (link público avulso,
// sem conta) — fica solta até o médico vincular manualmente a uma consulta
// gravada depois, pra cruzar com a inteligência comercial dessa consulta.
export interface PreConsultationResponse {
  id: string;
  patientName: string;
  patientContact: string | null;
  answers: Record<string, string>;
  submittedAt: string;
  linkedSessionId: string | null;
}

// Captação de lead: quem AINDA NÃO é paciente, veio de um link avulso (bio do
// Instagram, envio direto por WhatsApp, indicação) — alimenta o funil com
// dado de origem real, diferente da pré-consulta (que já pressupõe consulta marcada).
export type LeadOrigin = 'instagram' | 'whatsapp' | 'indicacao' | 'outro';
export type LeadStatus = 'novo' | 'contatado' | 'agendado' | 'convertido' | 'perdido';

export interface LeadCapture {
  id: string;
  name: string;
  contact: string;
  reason: string | null;
  origin: LeadOrigin;
  status: LeadStatus;
  linkedSessionId: string | null;
  createdAt: string;
}

// Assinatura de tema pra monitoramento automático de novidades (evidência
// científica) — pesquisado periodicamente, nunca inventado.
export interface EvidenceTopicWatch {
  id: string;
  topic: string;
  active: boolean;
  createdAt: string;
  lastCheckedAt: string | null;
}

export interface EvidenceTopicUpdate {
  id: string;
  watchId: string;
  title: string;
  summary: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
  foundAt: string;
  // Potencial de viralização/qualidade dessa notícia como matéria-prima —
  // calculado automaticamente pela busca periódica (check-evidence-topic-watches).
  virality?: ViralityResult | null;
}

// Um turno do resumo em áudio "debatido" (duas vozes) sobre uma fonte de
// evidência — já com a signed URL do segmento pronto pra tocar.
export interface DebateSegment {
  speaker: 'A' | 'B';
  text: string;
  audioUrl: string;
}

// Catálogo de produtos/procedimentos do médico — cadastrado uma vez, usado pra
// a inteligência comercial sugerir upsell casando com algo real que existe.
export type ProductCategory = 'procedimento' | 'pacote' | 'plano_recorrente' | 'produto' | 'servico' | 'outro';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string | null;
  priceRange: string | null;
  // Valor numérico único (opcional) — só isso permite projetar receita de
  // verdade; priceRange é texto livre pro médico, não dá pra somar.
  avgPrice: number | null;
  active: boolean;
  createdAt: string;
}

export type BrandPhotoCategory = 'working' | 'lifestyle' | 'family' | 'clinic' | 'team' | 'other';

// Foto que o médico sobe (dele, da clínica, da equipe) pra IA usar como fundo
// nas artes geradas — categorizada pra IA escolher a foto certa por contexto.
export interface BrandPhoto {
  id: string;
  storagePath: string;
  category: BrandPhotoCategory;
  createdAt: string;
}

export interface ScienceSource {
  reference: string;
  kind: 'abstract' | 'news' | 'guideline' | 'other';
  originalText: string;
}

export type PatientSignalKind = 'objection' | 'question' | 'buying_signal' | 'sentiment';

// Sinal de inteligência comercial extraído automaticamente da transcrição
// anonimizada — expressão real do paciente (fiel, mas nunca com dado que
// identifique alguém), mais uma dica de ação (actionTip) quando fizer sentido
// pro tipo de sinal (contra-argumento pra objeção, próxima ação pra sinal de
// compra, ajuste de tom pro sentimento).
export interface PatientSignal {
  id: string;
  sessionId: string;
  kind: PatientSignalKind;
  category: string;
  label: string;
  actionTip: string;
  confidence: number;
  createdAt: string;
}

// Fecha o loop: uma sugestão de tema por semana, derivada da objeção mais
// frequente entre os patient_signals reais do médico (só quando ele optou por
// isso em Insights). O médico pode gerar conteúdo real a partir dela (1 clique)
// ou dispensar — nunca aplicada/gerada sozinha.
export interface WeeklyContentSuggestion {
  id: string;
  weekStart: string; // YYYY-MM-DD, segunda-feira da semana
  category: string;
  signalCount: number;
  exampleLabel: string;
  actionTip: string;
  status: 'pending' | 'generated' | 'dismissed';
  sessionId?: string | null;
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
  // true quando o conteúdo NÃO foi derivado de uma transcrição real verificada
  // (ex.: fluxo Link → Conteúdo sem integração de YouTube Data/Whisper conectada
  // — o rascunho é gerado só a partir da URL/contexto informado, nunca do vídeo
  // em si). Precisa de confirmação explícita do médico antes de aprovar a peça.
  unverifiedDraft?: boolean;
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
