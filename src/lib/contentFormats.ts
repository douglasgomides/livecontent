import type { ContentFormat, ContentChannel, Topic, SessionSource, SessionStatus, LeadOrigin } from '@/types/session';
import { Instagram, Linkedin, MessageSquare, Youtube, FileText, Globe, MapPin, Stethoscope, Mic, Music, Camera } from 'lucide-react';

// Rótulos em linguagem simples pro estágio de funil (C0-C3 é jargão de marketing
// que um médico leigo em ferramenta de conteúdo não teria por que conhecer) —
// fonte única, nunca renderizar o código cru "C1" na tela em lugar nenhum.
// Vários temas de UMA MESMA consulta podem legitimamente cair no mesmo estágio
// (não é um identificador sequencial único) — mostrar o código cru lado a lado
// é o que faz isso parecer um bug de "rótulo duplicado" quando não é.
export const FUNNEL_STAGE_LABEL: Record<Topic['funnelStage'], string> = {
  C0: 'Não sabe do problema',
  C1: 'Sabe do problema',
  C2: 'Compara soluções',
  C3: 'Pronto para agendar',
};

export const FORMAT_LABEL: Record<ContentFormat, string> = {
  reel: 'Reel',
  carousel: 'Carrossel',
  caption: 'Legenda IG',
  stories: 'Stories IG',
  linkedin: 'Post LinkedIn',
  blog: 'Blog / artigo',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  podcast: 'Podcast',
  gmb: 'Google Meu Negócio',
  doctoralia: 'Doctoralia',
  website: 'Site do médico',
};

export const FORMAT_ICON: Record<ContentFormat, any> = {
  reel: Instagram,
  carousel: Instagram,
  caption: MessageSquare,
  stories: Camera,
  linkedin: Linkedin,
  blog: FileText,
  youtube: Youtube,
  tiktok: Music,
  podcast: Mic,
  gmb: MapPin,
  doctoralia: Stethoscope,
  website: Globe,
};

export const FORMAT_CHANNEL: Record<ContentFormat, ContentChannel> = {
  reel: 'instagram',
  carousel: 'instagram',
  caption: 'instagram',
  stories: 'instagram',
  linkedin: 'linkedin',
  blog: 'blog',
  youtube: 'youtube',
  tiktok: 'tiktok',
  podcast: 'podcast',
  gmb: 'gmb',
  doctoralia: 'doctoralia',
  website: 'website',
};

export const CHANNEL_LABEL: Record<ContentChannel, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  blog: 'Blog',
  gmb: 'Google Meu Negócio',
  doctoralia: 'Doctoralia',
  website: 'Site do médico',
  podcast: 'Podcast',
};

export const CHANNEL_ICON: Record<ContentChannel, any> = {
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music,
  blog: FileText,
  gmb: MapPin,
  doctoralia: Stethoscope,
  website: Globe,
  podcast: Mic,
};

// Agrupado por PLATAFORMA DE DESTINO (onde vai ser postado), não por categoria
// de conteúdo — é assim que o médico pensa ("quero postar no Instagram e no
// YouTube"), não em termos de "conteúdo longo x redes sociais".
export const FORMAT_GROUPS: { label: string; formats: ContentFormat[] }[] = [
  { label: 'Instagram', formats: ['reel', 'carousel', 'stories', 'caption'] },
  { label: 'LinkedIn', formats: ['linkedin'] },
  { label: 'TikTok', formats: ['tiktok'] },
  { label: 'YouTube', formats: ['youtube'] },
  { label: 'Blog', formats: ['blog'] },
  { label: 'Podcast', formats: ['podcast'] },
  { label: 'Google Meu Negócio', formats: ['gmb'] },
  { label: 'Doctoralia', formats: ['doctoralia'] },
  { label: 'Site do médico', formats: ['website'] },
];

export const RECOMMENDED_FORMATS: ContentFormat[] = ['reel', 'carousel', 'caption', 'blog', 'gmb'];

// Rótulos de exibição pra taxonomia fixa de objeção em
// supabase/functions/_shared/patientSignals.ts — fonte única do lado do cliente
// (Insights.tsx e a sugestão semanal de conteúdo compartilham este dicionário;
// o backend mantém sua própria cópia porque não importa código do frontend).
export const OBJECTION_LABEL: Record<string, string> = {
  price_cost: 'Preço/custo', fear_procedure_side_effects: 'Medo do procedimento/efeitos',
  need_think_it_over: 'Precisa pensar', family_spouse_approval: 'Aprovação de família/cônjuge',
  insurance_coverage: 'Cobertura de plano', previous_bad_experience: 'Experiência ruim anterior',
  scheduling_time: 'Tempo/agenda', other: 'Outro',
};

// Idem, taxonomia fixa de sentimento (mesma fonte em patientSignals.ts).
export const SENTIMENT_LABEL: Record<string, string> = {
  hesitant: 'Hesitante', skeptical: 'Cético', anxious: 'Ansioso', excited: 'Animado',
  frustrated: 'Frustrado', reassured: 'Tranquilizado', indifferent: 'Indiferente', other: 'Outro',
};

// Pisos mínimos antes de confiar em qualquer padrão aprendido a partir de
// patient_signals (opt-in de objeções em Insights, sugestão semanal de
// conteúdo) — amostra pequena demais vira ruído, não sinal.
export const MIN_TOTAL_OBJECTIONS = 8;
export const MIN_LEADING_CATEGORY = 3;

// Fonte única pra origem de um lead capturado (Instagram/WhatsApp/indicação/
// outro) — usada na tela de gestão de leads e no ROI por canal em Insights.
export const LEAD_ORIGIN_LABEL: Record<LeadOrigin, string> = {
  instagram: 'Instagram', whatsapp: 'WhatsApp', indicacao: 'Indicação', outro: 'Outro',
};

// Paleta categórica pra gráficos/badges em Insights — 6 cores fixas (ver
// --chart-1..6 em index.css), atribuídas por CATEGORIA, não por posição, pra
// a mesma objeção/sentimento manter sempre a mesma cor mesmo quando a ordem
// muda por filtro/ranking.
export const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-6))',
];

function paletteFor<T extends string>(keys: T[]): Record<T, string> {
  const out = {} as Record<T, string>;
  keys.forEach((k, i) => { out[k] = CHART_COLORS[i % CHART_COLORS.length]; });
  return out;
}

export const OBJECTION_COLOR = paletteFor(Object.keys(OBJECTION_LABEL));
export const SENTIMENT_COLOR = paletteFor(Object.keys(SENTIMENT_LABEL));
export const LEAD_ORIGIN_COLOR: Record<LeadOrigin, string> = {
  instagram: CHART_COLORS[4], whatsapp: CHART_COLORS[1], indicacao: CHART_COLORS[2], outro: CHART_COLORS[5],
};
export const FUNNEL_STAGE_COLOR: Record<Topic['funnelStage'], string> = {
  C0: CHART_COLORS[5], C1: CHART_COLORS[0], C2: CHART_COLORS[2], C3: CHART_COLORS[4],
};

// Fonte única pra origem da consulta — antes cada tela tinha sua própria cópia
// (algumas com "Voice Note"/"Science" corretos, outras vazando o valor cru do
// enum via .replace('_',' ') e mostrando "voice note"/"recording" em inglês
// sem tradução nenhuma). "Voice Note"/"Science" ficam como estão de propósito:
// são o nome da própria feature (igual "Insights"/"Trends" no menu), não um
// vazamento — o problema real era a INCONSISTÊNCIA entre telas pro mesmo valor.
export const SOURCE_LABEL: Record<SessionSource, string> = {
  recording: 'Gravação',
  upload: 'Upload',
  voice_note: 'Voice Note',
  science: 'Science',
  audio_livre: 'Áudio livre',
  link: 'Link',
  tema_sugerido: 'Tema sugerido',
};

// Idem pro status do pipeline — status.replace(/_/g,' ') vazava código interno
// cru ("generating_content" -> "generating content") sem tradução nenhuma.
export const STATUS_LABEL: Record<SessionStatus, string> = {
  recording: 'Gravando',
  transcribing: 'Transcrevendo',
  anonymizing: 'Anonimizando',
  anonymization_review: 'Revisar PII',
  extracting_topics: 'Extraindo temas',
  topics_review: 'Revisar temas',
  generating_content: 'Gerando',
  ready: 'Pronto',
  failed: 'Falhou',
};

/** Formats that produce ready-to-copy text vs prepared publication */
export const EXPORT_MODE: Record<ContentFormat, 'copy' | 'publish' | 'download'> = {
  reel: 'publish',
  carousel: 'publish',
  stories: 'publish',
  caption: 'copy',
  linkedin: 'publish',
  blog: 'download',
  youtube: 'publish',
  tiktok: 'publish',
  podcast: 'download',
  gmb: 'copy',
  doctoralia: 'copy',
  website: 'download',
};
