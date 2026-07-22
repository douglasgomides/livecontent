import type { Session, PIIFinding, Topic, ContentPiece, ContentFormat, CFMResult, DoctorProfile } from '@/types/session';

export const uid = () => Math.random().toString(36).slice(2, 10);

const DEMO_TRANSCRIPT = `Médico: Bom dia, dona Maria. Vi aqui no seu prontuário 4487 que a senhora mora ali na Rua das Palmeiras, número 320. Como está se sentindo hoje?
Paciente: Doutor, tô com essa dor no joelho direito faz três meses. O plano Amil autorizou a ressonância finalmente. Trabalho como costureira, então fico sentada o dia todo.
Médico: Entendi. Você trouxe o exame? Deixa eu ver. Aqui, olha, tem uma pequena lesão no menisco. É comum na sua idade, e a boa notícia é que a gente consegue tratar sem cirurgia na maioria dos casos.
Paciente: Ah, que alívio. Meu marido, o José, tava preocupado. E o valor da consulta particular, doutor? Porque pelo plano demora tanto...
Médico: A gente conversa isso com a secretária. O importante agora é começar fisioterapia e ajustar sua rotina. Nada de subir escada correndo.`;

const DEMO_ANONYMIZED = `Médico: Bom dia. Vi seu prontuário. Como está se sentindo hoje?
Paciente: Doutor, estou com essa dor no joelho direito faz três meses. O plano autorizou a ressonância finalmente. Trabalho sentada o dia todo.
Médico: Entendi. Você trouxe o exame? Aqui, olha, tem uma pequena lesão no menisco. É comum na sua idade, e a boa notícia é que a gente consegue tratar sem cirurgia na maioria dos casos.
Paciente: Ah, que alívio. Meu familiar estava preocupado. E o valor da consulta particular, doutor? Porque pelo plano demora tanto...
Médico: A gente conversa isso com a secretária. O importante agora é começar fisioterapia e ajustar sua rotina. Nada de subir escada correndo.`;

const DEMO_PII: PIIFinding[] = [
  { original: 'dona Maria', replacement: '[paciente]', type: 'name' },
  { original: 'prontuário 4487', replacement: '[prontuário]', type: 'id' },
  { original: 'Rua das Palmeiras, número 320', replacement: '[endereço removido]', type: 'address' },
  { original: 'Amil', replacement: '[plano]', type: 'plan' },
  { original: 'costureira', replacement: '[profissão]', type: 'profession' },
  { original: 'meu marido, o José', replacement: 'meu familiar', type: 'name' },
];

const DEMO_TOPICS: Topic[] = [
  { id: uid(), title: 'Lesão de menisco: quando dá pra evitar cirurgia', summary: 'A maioria das lesões meniscais em pacientes acima de 40 anos responde bem a tratamento conservador (fisioterapia + ajuste de rotina).', funnelStage: 'C1', included: true },
  { id: uid(), title: 'Dor no joelho de quem trabalha sentado o dia todo', summary: 'Postura estática prolongada é fator de risco subestimado. Sinais de alerta e o que fazer.', funnelStage: 'C0', included: true },
  { id: uid(), title: 'Plano de saúde x consulta particular: como decidir', summary: 'Comparativo honesto sobre tempo de autorização, continuidade do cuidado e custo real.', funnelStage: 'C2', included: false },
];

const CONTENT_TEMPLATES: Record<ContentFormat, (topic: Topic, profile: DoctorProfile | null) => string> = {
  reel: (t) => `🎬 REEL — 45s

[0-3s] Gancho: "Se você sente ${t.title.toLowerCase()}, esse vídeo é pra você."
[3-15s] Problema: contexto rápido do sintoma e por que ele aparece.
[15-30s] Insight: ${t.summary}
[30-40s] O que fazer agora (2 passos práticos).
[40-45s] CTA: "Salva esse vídeo e compartilha com quem precisa."

Trilha: instrumental calmo. Corte a cada 3 segundos.`,
  carousel: (t) => `📱 CARROSSEL — 7 slides

Slide 1 — Capa: "${t.title}"
Slide 2 — O sintoma que a maioria ignora.
Slide 3 — Por que isso acontece (explicação didática).
Slide 4 — Mito x verdade.
Slide 5 — ${t.summary}
Slide 6 — 3 passos práticos hoje.
Slide 7 — Quando procurar um especialista + CTA suave.`,
  caption: (t) => `📝 LEGENDA IG

${t.title}.

${t.summary}

Não é toda dor que precisa de bisturi. Boa parte responde a mudanças simples de rotina — desde que a gente entenda o que está por trás.

Se esse conteúdo faz sentido, comenta aqui embaixo o que mais te confunde sobre o tema. Vou responder um a um.`,
  linkedin: (t) => `💼 POST LINKEDIN

${t.title}

Uma paciente me perguntou essa semana se precisava operar. A resposta honesta, na maioria dos casos, é: não necessariamente.

${t.summary}

Três coisas mudaram nos últimos anos:
1. Melhor entendimento da biomecânica.
2. Protocolos de fisioterapia mais direcionados.
3. Uso racional de exames de imagem.

O ponto: cirurgia é ferramenta, não solução automática. E parte do trabalho médico é traduzir isso.`,
};

const RISKY_TERMS = ['cura garantida', '100%', 'sem risco', 'milagre', 'infalível', 'melhor do brasil'];

function scoreCFM(body: string): CFMResult {
  const flags: CFMResult['flags'] = [];
  let score = 95;
  const lower = body.toLowerCase();
  RISKY_TERMS.forEach(t => {
    if (lower.includes(t)) { flags.push({ label: `Termo restrito: "${t}"`, severity: 'block' }); score -= 25; }
  });
  if (/garant[ie]/.test(lower)) { flags.push({ label: 'Palavra "garantia" pode configurar promessa de resultado', severity: 'warning' }); score -= 8; }
  if (/antes.*depois|resultado real/.test(lower)) { flags.push({ label: 'Formato antes/depois exige cuidado ético', severity: 'warning' }); score -= 8; }
  if (!flags.length) flags.push({ label: 'Nenhuma promessa de resultado detectada', severity: 'info' });
  return { score: Math.max(0, Math.min(100, score)), flags };
}

export function generateContentFor(topic: Topic, formats: ContentFormat[], profile: DoctorProfile | null): ContentPiece[] {
  return formats.map(format => {
    const body = CONTENT_TEMPLATES[format](topic, profile);
    return { id: uid(), topicId: topic.id, format, body, cfm: scoreCFM(body), approved: false };
  });
}

export const rescoreContent = (piece: ContentPiece): ContentPiece => ({ ...piece, cfm: scoreCFM(piece.body) });

export function createBlankSession(source: Session['source'], durationSec = 0, audioUrl?: string): Session {
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    source,
    title: 'Consulta sem título',
    durationSec,
    status: 'transcribing',
    audioUrl,
  };
}

export function seedPipeline(s: Session): Session {
  return {
    ...s,
    rawTranscript: DEMO_TRANSCRIPT,
    anonymizedTranscript: DEMO_ANONYMIZED,
    piiFindings: DEMO_PII,
    topics: DEMO_TOPICS.map(t => ({ ...t, id: uid() })),
  };
}

export { scoreCFM };
