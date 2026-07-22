import type { Session, PIIFinding, Topic, ContentPiece, ContentFormat, CFMResult, DoctorProfile, SessionSource } from '@/types/session';

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

const VOICE_NOTE_DEMO_TRANSCRIPT = `Nota rápida: acabei de atender um caso que quero comentar. Paciente jovem, atleta, chegou achando que precisava operar o ombro por causa de uma dor de 6 semanas. Fizemos avaliação funcional e, na verdade, é um quadro de sobrecarga por overtraining. Vou de fisioterapia dirigida por 8 semanas antes de considerar qualquer coisa mais invasiva. Fica o lembrete: dor no ombro em atleta jovem raramente é cirúrgico de primeira.`;

const VOICE_NOTE_DEMO_ANON = `Nota rápida: acabei de atender um caso que quero comentar. Paciente jovem, atleta, chegou achando que precisava operar o ombro por causa de uma dor de 6 semanas. Fizemos avaliação funcional e, na verdade, é um quadro de sobrecarga por overtraining. Vou de fisioterapia dirigida por 8 semanas antes de considerar qualquer coisa mais invasiva. Fica o lembrete: dor no ombro em atleta jovem raramente é cirúrgico de primeira.`;

const VOICE_NOTE_TOPIC: Topic = {
  id: 'vn',
  title: 'Dor no ombro em atleta jovem: nem sempre é cirurgia',
  summary: 'Quadros de sobrecarga respondem bem a fisioterapia dirigida antes de considerar procedimento invasivo.',
  funnelStage: 'C1',
  included: true,
};

const CONTENT_TEMPLATES: Record<ContentFormat, (topic: Topic, profile: DoctorProfile | null, science?: Session['science']) => string> = {
  reel: (t, _p, sci) => `🎬 REEL — 45s

[0-3s] Gancho: "Se você sente ${t.title.toLowerCase()}, esse vídeo é pra você."
[3-15s] Problema: contexto rápido do sintoma e por que ele aparece.
[15-30s] Insight: ${t.summary}
[30-40s] O que fazer agora (2 passos práticos).
[40-45s] CTA: "Salva esse vídeo e compartilha com quem precisa."

Trilha: instrumental calmo. Corte a cada 3 segundos.${sci ? `\n\nFonte citada em tela: ${sci.reference}` : ''}`,
  carousel: (t, _p, sci) => `📱 CARROSSEL — 7 slides

Slide 1 — Capa: "${t.title}"
Slide 2 — O sintoma que a maioria ignora.
Slide 3 — Por que isso acontece (explicação didática).
Slide 4 — Mito x verdade.
Slide 5 — ${t.summary}
Slide 6 — 3 passos práticos hoje.
Slide 7 — Quando procurar um especialista + CTA suave.${sci ? `\n\nSlide fonte: "Baseado em: ${sci.reference}"` : ''}`,
  caption: (t, _p, sci) => `📝 LEGENDA IG

${t.title}.

${t.summary}

Não é toda dor que precisa de bisturi. Boa parte responde a mudanças simples de rotina — desde que a gente entenda o que está por trás.

Se esse conteúdo faz sentido, comenta aqui embaixo o que mais te confunde sobre o tema. Vou responder um a um.${sci ? `\n\n📚 Baseado em: ${sci.reference}` : ''}`,
  linkedin: (t, _p, sci) => `💼 POST LINKEDIN

${t.title}

Uma paciente me perguntou essa semana se precisava operar. A resposta honesta, na maioria dos casos, é: não necessariamente.

${t.summary}

Três coisas mudaram nos últimos anos:
1. Melhor entendimento da biomecânica.
2. Protocolos de fisioterapia mais direcionados.
3. Uso racional de exames de imagem.

O ponto: cirurgia é ferramenta, não solução automática. E parte do trabalho médico é traduzir isso.${sci ? `\n\nReferência: ${sci.reference}` : ''}`,
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

export function generateContentFor(topic: Topic, formats: ContentFormat[], profile: DoctorProfile | null, science?: Session['science']): ContentPiece[] {
  return formats.map(format => {
    const body = CONTENT_TEMPLATES[format](topic, profile, science);
    return { id: uid(), topicId: topic.id, format, body, cfm: scoreCFM(body), approved: false };
  });
}

export const rescoreContent = (piece: ContentPiece): ContentPiece => ({ ...piece, cfm: scoreCFM(piece.body) });

export function createBlankSession(source: SessionSource, durationSec = 0, audioUrl?: string): Session {
  const titles: Record<SessionSource, string> = {
    recording: `Consulta de ${new Date().toLocaleDateString('pt-BR')}`,
    upload: `Consulta enviada — ${new Date().toLocaleDateString('pt-BR')}`,
    voice_note: `Voice Note — ${new Date().toLocaleDateString('pt-BR')}`,
    science: `Science to Content — ${new Date().toLocaleDateString('pt-BR')}`,
  };
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    source,
    title: titles[source],
    durationSec,
    status: 'transcribing',
    audioUrl,
  };
}

export function seedPipeline(s: Session): Session {
  // Voice notes get the shorter transcript and 1 pre-included topic
  if (s.source === 'voice_note') {
    return {
      ...s,
      rawTranscript: VOICE_NOTE_DEMO_TRANSCRIPT,
      anonymizedTranscript: VOICE_NOTE_DEMO_ANON,
      piiFindings: [],
      topics: [{ ...VOICE_NOTE_TOPIC, id: uid() }],
    };
  }
  return {
    ...s,
    rawTranscript: DEMO_TRANSCRIPT,
    anonymizedTranscript: DEMO_ANONYMIZED,
    piiFindings: DEMO_PII,
    topics: DEMO_TOPICS.map(t => ({ ...t, id: uid() })),
  };
}

/** Science: seed 1 topic derived from the pasted text; skip anonymization */
export function seedScience(s: Session, text: string, reference: string, kind: NonNullable<Session['science']>['kind']): Session {
  const firstSentence = text.split(/[.!?]/)[0].trim().slice(0, 90);
  const topic: Topic = {
    id: uid(),
    title: firstSentence || 'Novo achado clínico',
    summary: text.slice(0, 260).trim() + (text.length > 260 ? '…' : ''),
    funnelStage: 'C1',
    included: true,
  };
  return {
    ...s,
    rawTranscript: text,
    anonymizedTranscript: text,
    piiFindings: [],
    topics: [topic],
    science: { reference, kind, originalText: text },
  };
}

export { scoreCFM };
