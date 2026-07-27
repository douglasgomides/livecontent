import type { ContentFormat, ContentChannel } from '@/types/session';
import { Instagram, Linkedin, MessageSquare, Youtube, FileText, Globe, MapPin, Stethoscope, Mic, Music, Camera } from 'lucide-react';

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

export const FORMAT_GROUPS: { label: string; formats: ContentFormat[] }[] = [
  { label: 'Redes sociais', formats: ['reel', 'carousel', 'stories', 'caption', 'linkedin'] },
  { label: 'Conteúdo longo', formats: ['blog', 'youtube', 'podcast', 'tiktok'] },
  { label: 'Presença online', formats: ['gmb', 'doctoralia', 'website'] },
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
