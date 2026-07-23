/**
 * pipeline.ts — Consulta Creator
 * Pipeline de geração de conteúdo com integração Claude/Whisper preparada
 * mas DESLIGADA por padrão (AI_ENABLED=false). Enquanto desligada, cai
 * em fallback mock determinístico via mockPipeline.ts.
 *
 * ⚠️ Chamar Anthropic/OpenAI direto do browser não funciona (CORS) e vazaria
 * a chave. Quando houver backend (Lovable Cloud edge function ou proxy próprio):
 *   1. Trocar callClaude/transcribeAudio para chamar seu endpoint (/api/ai/…).
 *   2. Setar AI_ENABLED = true.
 * Nenhum outro arquivo precisa mudar.
 */

import type {
  Session,
  Topic,
  ContentPiece,
  ContentFormat,
  CFMResult,
  PIIFinding,
} from '@/types/session';
import type { Brain } from '@/types/brain';
import { FORMAT_CHANNEL } from './contentFormats';
import { buildArtwork } from './artRenderer';
import { buildExternalPrompts } from './externalPrompts';
import {
  generateContentFor as mockGenerateContentFor,
  createBlankSession,
  seedPipeline,
  seedScience,
} from './mockPipeline';

// ─── Flags ──────────────────────────────────────────────────────────────────

const AI_ENABLED = false; // manter false enquanto não houver backend

// id de referência para quando ativar (ajustar ao seu backend/gateway)
const CLAUDE_MODEL = 'claude-sonnet-4-5';

// ─── Utilitários ────────────────────────────────────────────────────────────

export const uid = () => Math.random().toString(36).slice(2, 10);

async function callClaude(_systemPrompt: string, _userMessage: string): Promise<string> {
  if (!AI_ENABLED) throw new Error('AI disabled');
  // Substituir por chamada ao seu endpoint quando houver backend.
  throw new Error('AI backend not wired');
}

// ─── Contexto da Brain ───────────────────────────────────────────────────────

function buildBrainContext(brain: Brain | null | undefined): string {
  if (!brain) return '';
  const d = brain.doctor;
  const p = brain.patient;
  const br = brain.brand;

  const toneMap: Record<string, string> = {
    didactic: 'didático e claro — explica de forma acessível sem perder precisão',
    empathetic: 'empático e acolhedor — reconhece a dor do paciente antes de educar',
    direct: 'direto e objetivo — vai ao ponto sem rodeios',
    technical: 'técnico e preciso — fala para paciente esclarecido ou para pares médicos',
  };

  return `
## Identidade do médico
- Nome: ${d.name || 'não informado'}
- Especialidade: ${d.specialty || 'não informada'}
- Credenciais: ${d.credentials || 'não informadas'}
- Anos de prática: ${d.yearsPractice || 'não informado'}
- Tom de voz: ${toneMap[d.tone] || d.tone}
- Estilo de abertura preferido: ${d.openingStyle || 'não definido'}
- Frases características: ${d.catchphrases?.filter(Boolean).join(', ') || 'nenhuma'}
- Temas que ama abordar: ${d.lovedTopics?.filter(Boolean).join(', ') || 'não definidos'}
- Temas que evita: ${d.avoidedTopics?.filter(Boolean).join(', ') || 'nenhum'}
- Referências científicas: ${d.references?.filter(Boolean).join(', ') || 'não definidas'}

## Paciente ideal
- Perfil demográfico: ${p.demographic || 'não definido'}
- Principais dores: ${p.mainPains?.filter(Boolean).join(', ') || 'não definidas'}
- Objeções comuns: ${p.commonObjections?.filter(Boolean).join(', ') || 'não definidas'}
- Linguagem que usam: ${p.language || 'português coloquial'}
- Medos: ${p.fears?.filter(Boolean).join(', ') || 'não definidos'}
- O que os faz agir: ${p.decisionTriggers?.filter(Boolean).join(', ') || 'não definido'}

## Marca
- Posicionamento: ${br.positioning || 'não definido'}
- Pilares editoriais: ${br.pillars?.filter(Boolean).join(' | ') || 'não definidos'}
- Valores: ${br.values?.filter(Boolean).join(', ') || 'não definidos'}
- Handle: ${br.handle || '@medico'}
- CTA padrão: ${br.defaultCTA || 'Agende sua consulta'}
- Palavras que SIM usa: ${br.wordsYes?.filter(Boolean).join(', ') || 'nenhuma lista'}
- Palavras que NUNCA usa: ${br.wordsNo?.filter(Boolean).join(', ') || 'nenhuma lista'}
`.trim();
}

// ─── System prompt base ──────────────────────────────────────────────────────

const BASE_RULES = `
## Regras universais de copy — NÃO NEGOCIÁVEIS
- NUNCA hashtags. NUNCA travessão (—). NUNCA "não é X, é Y".
- NUNCA clichês de IA: "no mundo atual", "é importante ressaltar", "vale destacar",
  "de forma holística", "impactar positivamente", "nesse sentido", "tendo em vista".
- Tom direto. Frases curtas (máx 2 linhas). CTA sempre específico.

## Regras CFM (Resoluções 1.974/2.336)
- Sem promessa de resultado ("cura", "100%", "garantido").
- Sem antes-e-depois de paciente identificável.
- Sem diagnóstico à distância. Sem posologia. Sem preço. Sem sensacionalismo.
`.trim();

// ─── Prompts por formato ─────────────────────────────────────────────────────

const FORMAT_SYSTEM: Record<ContentFormat, string> = {
  carousel: `Estrategista de carrosséis médicos. Entregue APENAS os slides.
Estrutura: gancho forte OU choque de realidade OU erro comum OU guia prático.
Máx 280 chars/slide. 7–10 slides. Último = CTA específico.
Formato:
SLIDE 1 — CAPA
Título: ...
Texto: ...
[continuar]
SLIDE FINAL — CTA
Título: ...
CTA: ...`,
  reel: `Roteirista de Reels. Entregue APENAS o roteiro falado.
GANCHO 0–3s. CORPO 4–80s. CTA 5–10s finais.
Proibido: "clique no link", "arraste", "link na bio", "marque um amigo".
Formato:
[GANCHO — 0s a 3s]
...
[CORPO]
...
[CTA]
...
Duração estimada: N segundos`,
  caption: `Legendas de Instagram médico. Entregue 3 versões:
VERSÃO CURTA (até 5 linhas)
VERSÃO MÉDIA (8–12 linhas)
VERSÃO LONGA (15–20 linhas)
Sem hashtags. Sem "Olá, hoje vou falar sobre".`,
  linkedin: `Post de LinkedIn médico para pares e pacientes esclarecidos.
Linha 1 forte antes do "ver mais". Parágrafos curtos. CTA de conversa.
Máx 2 emojis. Máx 3 hashtags no fim.`,
  stories: `Roteiro de 4 frames de Stories.
Frame 1: enquete/pergunta. Frame 2: dado. Frame 3: insight. Frame 4: CTA.
Textos curtíssimos.`,
  gmb: `Post para Google Meu Negócio. 150–300 palavras.
Abertura em linguagem de busca. Palavras-chave naturais. CTA de agendar.
Sem hashtags, sem preço.`,
  blog: `Artigo em markdown, 800–1500 palavras.
# Título com palavra-chave
Introdução (150–200 palavras).
## H2 secundárias
## Conclusão + CTA
Sem "Neste artigo vamos falar sobre".`,
  youtube: `Roteiro de vídeo ~8min.
[INTRO 0:00–0:30] [BLOCO 1 problema] [BLOCO 2 ciência]
[BLOCO 3 prática] [BLOCO 4 FAQ] [FECHO recap+CTA]
Tom de fala, não de leitura.`,
  tiktok: `Roteiro TikTok 45s.
[Hook 0–3s] [Desenvolvimento 3–38s] [CTA 38–45s]
Descreva legendas on-screen. Tom de conversa.`,
  podcast: `Roteiro de podcast ~15min.
[Abertura 0–1min] [Bloco 1 contexto] [Bloco 2 aprofundamento]
[Bloco 3 prática] [Fecho recap+próximo episódio]
Casos sempre anonimizados.`,
  doctoralia: `Artigo para Doctoralia, 300–500 palavras.
Título com condição/sintoma. O que é, sinais, avaliação, CTA agendar.
Tom clínico acessível.`,
  website: `HTML semântico para página de especialidade.
Estrutura:
<article>
  <h1>{título com condição/especialidade}</h1>
  <p>{resumo 2 linhas}</p>
  <section><h2>Quando procurar avaliação</h2><ul><li>...</li></ul></section>
  <section><h2>Como é feita a avaliação</h2><ol><li>...</li></ol></section>
  <section><h2>Agendar avaliação</h2><p>{CTA}</p></section>
</article>
Palavras-chave da especialidade naturalmente inseridas. Sem clickbait.`,
};

// ─── Geração principal ───────────────────────────────────────────────────────

function buildUserMessage(
  topic: Topic,
  _format: ContentFormat,
  transcript: string | undefined,
  brain: Brain | null | undefined,
): string {
  const funnelDesc: Record<Topic['funnelStage'], string> = {
    C0: 'C0 — público não sabe que o problema existe',
    C1: 'C1 — público reconhece sintoma mas tem crenças erradas',
    C2: 'C2 — público quer saber o que fazer',
    C3: 'C3 — paciente ou quase paciente (prova, confiança)',
  };

  return `
## Tema
Título: ${topic.title}
Resumo: ${topic.summary}
Funil: ${funnelDesc[topic.funnelStage] || topic.funnelStage}

${transcript ? `## Transcrição base (não copiar literalmente)\n${transcript.slice(0, 1200)}` : ''}

${buildBrainContext(brain)}

Gere o conteúdo agora no formato solicitado. Aplique todas as regras.
`.trim();
}

export function generateContentFor(
  topic: Topic,
  formats: ContentFormat[],
  profile: any,
  science?: Session['science'],
  brain?: Brain | null,
  _transcript?: string,
): ContentPiece[] {
  // AI_ENABLED=false: delega ao mock (síncrono). Quando ativar o backend,
  // trocar assinatura para async e usar callClaude + applyBrand + scoreCFM.
  return mockGenerateContentFor(topic, formats, profile, science, brain);
}

// ─── Transcrição / Anonimização / Tópicos ───────────────────────────────────

export async function transcribeAudio(_audioBlob: Blob): Promise<string> {
  if (!AI_ENABLED) {
    return '[Transcrição mock — pipeline em modo offline. Ative AI_ENABLED com backend seguro.]';
  }
  throw new Error('AI backend not wired');
}

export async function anonymizeTranscript(
  raw: string,
): Promise<{ anonymized: string; findings: PIIFinding[] }> {
  if (!AI_ENABLED) return { anonymized: raw, findings: [] };
  try {
    const rawJson = await callClaude('anonimize', raw);
    const parsed = JSON.parse(rawJson.replace(/```json|```/g, '').trim());
    return { anonymized: parsed.anonymized, findings: parsed.findings };
  } catch {
    return { anonymized: raw, findings: [] };
  }
}

export async function extractTopics(
  transcript: string,
  _brain?: Brain | null,
): Promise<Topic[]> {
  if (!AI_ENABLED) {
    return [{
      id: uid(),
      title: 'Tema extraído da sessão',
      summary: transcript.slice(0, 200),
      funnelStage: 'C1',
      included: true,
    }];
  }
  try {
    const raw = await callClaude('extract', transcript);
    const parsed: any[] = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return parsed.map(t => ({
      id: uid(),
      title: t.title,
      summary: t.summary,
      funnelStage: t.funnelStage as Topic['funnelStage'],
      included: true,
    }));
  } catch {
    return [];
  }
}

// ─── CFM Score ───────────────────────────────────────────────────────────────

const CFM_BLOCKS = [
  'cura garantida', 'sem risco', 'milagre', 'infalível', 'melhor do brasil',
  '100% eficaz', 'resultado garantido',
];

const CFM_WARNINGS = [
  { pattern: /garant[ie]/i, label: '"Garantia" pode configurar promessa de resultado' },
  { pattern: /antes.*depois|resultado real/i, label: 'Antes/depois exige cuidado ético (CFM)' },
  { pattern: /\d+\s*dias?\s*(pra|para|de)\s*(result|melhora|cura)/i, label: 'Prazo de resultado pode ser promessa' },
  { pattern: /melhor (médico|clínica|tratamento)/i, label: 'Superlativo pode configurar autopromoção' },
  { pattern: /\d+\s*mg|\d+\s*comprimido|dose\s+de/i, label: 'Posologia não deve aparecer em conteúdo público' },
  { pattern: /se você tem .{5,30} você tem/i, label: 'Diagnóstico à distância não permitido' },
  { pattern: /consulte\s+\w+\s+(dr|dra)\./i, label: 'Indicação nominal de colega pode ser vedada' },
];

export function scoreCFM(body: string): CFMResult {
  const flags: CFMResult['flags'] = [];
  let score = 98;
  const lower = body.toLowerCase();

  CFM_BLOCKS.forEach(term => {
    if (lower.includes(term)) {
      flags.push({ label: `Termo bloqueado pelo CFM: "${term}"`, severity: 'block' });
      score -= 30;
    }
  });

  CFM_WARNINGS.forEach(({ pattern, label }) => {
    if (pattern.test(lower)) {
      flags.push({ label, severity: 'warning' });
      score -= 8;
    }
  });

  if (!flags.length) flags.push({ label: 'Nenhum problema CFM detectado', severity: 'info' });

  return { score: Math.max(0, Math.min(100, score)), flags };
}

// ─── Brand application ───────────────────────────────────────────────────────

function applyBrand(body: string, brain?: Brain | null): { body: string; usedTraits: string[] } {
  const traits: string[] = [];
  if (!brain) return { body, usedTraits: traits };

  let out = body;

  brain.brand.wordsNo.filter(Boolean).forEach(w => {
    const re = new RegExp(`\\b${w.trim()}\\b`, 'gi');
    if (re.test(out)) {
      out = out.replace(re, '____');
      traits.push(`removeu "${w}"`);
    }
  });

  if (brain.brand.defaultCTA?.trim()) {
    const ctaSnippet = brain.brand.defaultCTA.toLowerCase().slice(0, 15);
    if (!out.toLowerCase().includes(ctaSnippet)) {
      out += `\n\n${brain.brand.defaultCTA.trim()}`;
      traits.push('CTA da marca aplicado');
    }
  }

  if (brain.doctor.tone) traits.push(`tom: ${brain.doctor.tone}`);

  return { body: out, usedTraits: traits };
}

function pickPillar(topic: Topic, brain?: Brain | null): string | undefined {
  if (!brain) return;
  const pillars = brain.brand.pillars.filter(Boolean);
  if (!pillars.length) return;
  const hash = topic.title.length + topic.summary.length;
  return pillars[hash % pillars.length];
}

// ─── Compatibilidade ────────────────────────────────────────────────────────

export { createBlankSession, seedPipeline, seedScience };

export const rescoreContent = (piece: ContentPiece): ContentPiece => ({
  ...piece,
  cfm: scoreCFM(piece.body),
});

// Referência (não usada enquanto AI_ENABLED=false)
export const _CLAUDE_MODEL = CLAUDE_MODEL;
