import type { ContentPiece, ExternalPromptTool, Topic } from '@/types/session';
import type { Brain } from '@/types/brain';

export const TOOL_META: Record<ExternalPromptTool, { label: string; url: string; hint: string }> = {
  sora: { label: 'Sora / OpenAI vídeo', url: 'https://sora.chatgpt.com', hint: 'Prompt de vídeo curto (5–15s) pra abrir o Reel/TikTok' },
  runway: { label: 'Runway / Kling', url: 'https://runwayml.com', hint: 'Prompt cinematográfico com câmera e movimento' },
  notebook_lm: { label: 'Notebook LM (podcast)', url: 'https://notebooklm.google.com', hint: 'Briefing pra gerar podcast conversacional' },
  midjourney: { label: 'Midjourney / Nano Banana', url: 'https://midjourney.com', hint: 'Prompt de capa/thumbnail no estilo da marca' },
  heygen: { label: 'HeyGen / D-ID (avatar)', url: 'https://heygen.com', hint: 'Roteiro pronto pra avatar IA falar' },
  elevenlabs: { label: 'ElevenLabs (voz)', url: 'https://elevenlabs.io', hint: 'Texto limpo pra TTS + sugestão de voz' },
};

function toneWord(brain?: Brain | null): string {
  const t = brain?.doctor.tone;
  if (t === 'empathetic') return 'empático e acolhedor';
  if (t === 'direct') return 'direto e objetivo';
  if (t === 'technical') return 'técnico e preciso';
  return 'didático e claro';
}

function paletteWords(brain?: Brain | null): string {
  const p = brain?.brand.colorPrimary || 'dourado';
  const bg = brain?.brand.colorBackground || 'preto profundo';
  return `paleta: fundo ${bg}, destaque ${p}, tipografia serifada elegante`;
}

export function buildExternalPrompts(
  piece: ContentPiece,
  topic: Topic | undefined,
  brain?: Brain | null,
): Partial<Record<ExternalPromptTool, string>> {
  const title = topic?.title || piece.meta?.title || 'Tema clínico';
  const summary = topic?.summary || piece.body.slice(0, 200);
  const specialty = brain?.doctor.specialty || 'especialista';
  const tone = toneWord(brain);
  const palette = paletteWords(brain);
  const bodySnippet = piece.body.slice(0, 400).trim();

  const out: Partial<Record<ExternalPromptTool, string>> = {};

  // Sora / Runway — video prompts by format
  if (['reel', 'tiktok', 'youtube', 'stories'].includes(piece.format)) {
    out.sora = `Vídeo vertical 9:16, 8 segundos. Cena: consultório médico moderno, luz natural suave, plano médio de um(a) ${specialty} falando com calma para a câmera. Sem áudio. Texto grande sobreposto: "${title}". Estilo cinematográfico, ${palette}. Câmera fixa, foco no rosto, leve dolly-in nos últimos 2s.`;
    out.runway = `Cinematic vertical clip, 9:16, 10s. Setting: modern clinic room, warm ambient light, single doctor speaking to camera. Slow dolly-in, shallow depth of field, subtle film grain. Mood: ${tone}. On-screen text: "${title}". Color grade: ${palette}. Camera: 35mm, f/2.0, natural handheld micro-motion.`;
  }

  // Notebook LM (podcast)
  if (['podcast', 'blog', 'youtube'].includes(piece.format) || piece.format === 'reel') {
    out.notebook_lm = `Crie um episódio de podcast conversacional (2 apresentadores) com ~10 minutos sobre o tema abaixo, no tom ${tone}, voltado para pacientes leigos. Nunca prometa cura nem cite marcas comerciais.

TÍTULO: ${title}

RESUMO: ${summary}

CONTEÚDO BASE:
${bodySnippet}

Estrutura: (1) abertura empática 60s, (2) contexto clínico 3min, (3) o que a evidência mostra 3min, (4) o que fazer na prática 2min, (5) fecho com convite pra avaliação individual. Evite jargão sem explicar. Use analogias do dia a dia.`;
  }

  // Midjourney — thumbnail/cover
  out.midjourney = `editorial medical thumbnail, ${palette}, minimalist composition, large serif title "${title}", soft key light, subtle grain, clinical premium aesthetic, negative space, ${piece.format === 'youtube' ? '16:9' : piece.format === 'stories' || piece.format === 'reel' || piece.format === 'tiktok' ? '9:16' : '1:1'} --style raw --v 6`;

  // HeyGen / D-ID
  if (['reel', 'tiktok', 'youtube', 'stories', 'caption', 'linkedin'].includes(piece.format)) {
    out.heygen = `Avatar profissional (${specialty === 'especialista' ? 'médico(a)' : specialty}), fundo neutro de consultório, olhar direto na câmera, tom ${tone}. Falar o roteiro abaixo em ritmo natural (~130 wpm), com pausas curtas nas quebras.

ROTEIRO:
${bodySnippet}`;
  }

  // ElevenLabs
  out.elevenlabs = `Voz sugerida: adulta, ${tone}, ritmo médio, sem entonação exagerada.

TEXTO PARA TTS:
${cleanForTts(piece.body)}`;

  return out;
}

function cleanForTts(body: string): string {
  return body
    .replace(/[#*_>`~]+/g, '')
    .replace(/\[[^\]]*\]/g, '') // remove [0-3s] etc
    .replace(/📱|🎬|📸|🎵|🎙️|📍|📚|📞|🔥|✅|❌/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
