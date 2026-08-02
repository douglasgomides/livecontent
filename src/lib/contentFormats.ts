import type { ContentFormat, ContentChannel, Topic } from '@/types/session';
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
