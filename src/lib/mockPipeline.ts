import type { Session, PIIFinding, Topic, ContentPiece, ContentFormat, CFMResult, DoctorProfile, SessionSource } from '@/types/session';
import type { Brain } from '@/types/brain';
import { FORMAT_CHANNEL } from './contentFormats';
import { buildArtwork } from './artRenderer';
import { buildExternalPrompts } from './externalPrompts';



// UUID de verdade — sessions.id/topics.id/content_pieces.id são colunas UUID.
export const uid = () => crypto.randomUUID();

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

const VOICE_NOTE_TOPIC: Topic = {
  id: 'vn',
  title: 'Dor no ombro em atleta jovem: nem sempre é cirurgia',
  summary: 'Quadros de sobrecarga respondem bem a fisioterapia dirigida antes de considerar procedimento invasivo.',
  funnelStage: 'C1',
  included: true,
};

type PieceDraft = { body: string; meta?: ContentPiece['meta'] };

const specialty = (p: DoctorProfile | null) => p?.specialty || 'especialista';
const sciTag = (s?: Session['science']) => (s ? `\n\n📚 Baseado em: ${s.reference}` : '');

const TEMPLATES: Record<ContentFormat, (t: Topic, p: DoctorProfile | null, s?: Session['science']) => PieceDraft> = {
  reel: (t, _p, s) => ({
    body: `🎬 REEL — 45s

[0-3s] Gancho: "Se você sente ${t.title.toLowerCase()}, esse vídeo é pra você."
[3-15s] Problema: contexto rápido do sintoma e por que ele aparece.
[15-30s] Insight: ${t.summary}
[30-40s] O que fazer agora (2 passos práticos).
[40-45s] CTA: "Salva esse vídeo e compartilha com quem precisa."

Trilha: instrumental calmo. Corte a cada 3 segundos.${sciTag(s)}`,
    meta: { duration: '45s', hashtags: ['#saude', '#medicina', '#bemestar'], thumbnailHint: 'Close no médico + texto grande do gancho' },
  }),

  carousel: (t, _p, s) => ({
    body: `📱 CARROSSEL — 7 slides

Slide 1 — Capa: "${t.title}"
Slide 2 — O sintoma que a maioria ignora.
Slide 3 — Por que isso acontece (explicação didática).
Slide 4 — Mito x verdade.
Slide 5 — ${t.summary}
Slide 6 — 3 passos práticos hoje.
Slide 7 — Quando procurar um especialista + CTA suave.${sciTag(s)}`,
    meta: { hashtags: ['#saude', '#dicasmedicas'], thumbnailHint: 'Slide 1: título grande sobre fundo escuro' },
  }),

  stories: (t) => ({
    body: `📸 STORIES IG — 4 telas

Tela 1 — Enquete: "Você já sentiu ${t.title.toLowerCase()}?" [ Sim / Não ]
Tela 2 — Texto grande: "Isso é mais comum do que parece."
Tela 3 — Insight rápido: ${t.summary}
Tela 4 — Sticker "Quer saber mais?" + CTA arraste pra cima / link.`,
    meta: { duration: '15s por tela', cta: 'Link para post completo ou agendamento' },
  }),

  caption: (t, _p, s) => ({
    body: `${t.title}.

${t.summary}

Não é toda dor que precisa de bisturi. Boa parte responde a mudanças simples de rotina — desde que a gente entenda o que está por trás.

Se esse conteúdo faz sentido, comenta aqui embaixo o que mais te confunde sobre o tema. Vou responder um a um.${sciTag(s)}`,
    meta: { hashtags: ['#medicina', '#saude', '#educacaoemsaude'] },
  }),

  linkedin: (t, _p, s) => ({
    body: `${t.title}

Uma paciente me perguntou essa semana se precisava operar. A resposta honesta, na maioria dos casos, é: não necessariamente.

${t.summary}

Três coisas mudaram nos últimos anos:
1. Melhor entendimento da biomecânica.
2. Protocolos de fisioterapia mais direcionados.
3. Uso racional de exames de imagem.

O ponto: cirurgia é ferramenta, não solução automática. E parte do trabalho médico é traduzir isso.${sciTag(s)}`,
    meta: { hashtags: ['#medicina', '#saude', '#lideranca'] },
  }),

  blog: (t, p, s) => ({
    body: `# ${t.title}

*Por Dr(a). ${p?.name || '[nome]'} — ${specialty(p)}*

## Introdução

${t.summary} Neste artigo, vou explicar de forma acessível o que está por trás desse quadro, o que a ciência mais recente aponta, e quais caminhos costumam funcionar na prática clínica.

## O que acontece no corpo

Todo sintoma tem uma origem funcional. No caso de ${t.title.toLowerCase()}, o mecanismo mais frequente envolve sobrecarga, inflamação local e adaptação postural inadequada. Reconhecer esse encadeamento muda a conduta.

## Sinais de alerta

- Dor que persiste por mais de 6 semanas
- Piora com atividades específicas
- Limitação funcional que atrapalha o dia a dia
- Falha de tratamentos anteriores

## O que costuma funcionar

1. **Avaliação funcional cuidadosa** antes de qualquer imagem.
2. **Fisioterapia dirigida** ao mecanismo, não apenas ao sintoma.
3. **Ajuste de rotina e ergonomia**, especialmente pra quem trabalha sentado ou faz esforço repetitivo.
4. **Reavaliação em 6-8 semanas** com critérios objetivos.

## Quando considerar procedimento invasivo

Só depois de esgotar as opções conservadoras e com indicação clara. Ainda assim, a decisão é sempre compartilhada com o paciente.

## Conclusão

${t.summary} Se você se identifica com esse quadro, procure uma avaliação individualizada — cada caso tem nuances que só ficam claras no consultório.${sciTag(s)}`,
    meta: {
      title: t.title,
      metaDescription: t.summary.slice(0, 155),
      tags: [specialty(p), 'saúde', 'tratamento', 'medicina baseada em evidência'],
    },
  }),

  youtube: (t, p, s) => ({
    body: `## Roteiro — vídeo YouTube (~8 min)

**Intro (0:00-0:30)**
Olá, sou ${p?.name || '[médico]'}, ${specialty(p)}. Hoje vou falar sobre ${t.title.toLowerCase()} — um tema que aparece muito no consultório e gera bastante dúvida.

**Bloco 1 — O problema (0:30-2:00)**
Por que esse quadro é tão comum. Como ele costuma se manifestar. O que os pacientes mais me perguntam.

**Bloco 2 — O que a ciência diz (2:00-4:30)**
${t.summary} Trabalhos recentes reforçam essa abordagem.

**Bloco 3 — O que fazer na prática (4:30-6:30)**
Passo a passo do que costuma funcionar. Sinais de alerta. Quando procurar ajuda.

**Bloco 4 — Perguntas frequentes (6:30-7:30)**
Responder 3-4 dúvidas comuns.

**Fecho (7:30-8:00)**
Se esse vídeo te ajudou, inscreva-se no canal. Deixe sua pergunta nos comentários.${sciTag(s)}`,
    meta: {
      title: `${t.title} — o que ${specialty(p)} explica`,
      metaDescription: t.summary.slice(0, 155),
      tags: [specialty(p), t.title.split(' ').slice(0, 3).join(' '), 'saúde', 'medicina'],
      timestamps: [
        { time: '0:00', label: 'Introdução' },
        { time: '0:30', label: 'O problema' },
        { time: '2:00', label: 'O que a ciência diz' },
        { time: '4:30', label: 'O que fazer na prática' },
        { time: '6:30', label: 'Perguntas frequentes' },
        { time: '7:30', label: 'Fecho e CTA' },
      ],
      thumbnailHint: `Rosto do médico à esquerda, texto grande à direita: "${t.title.split(':')[0].toUpperCase()}"`,
      duration: '~8 min',
    },
  }),

  tiktok: (t) => ({
    body: `🎵 TIKTOK — 45s

[Hook 0-3s]
"Você tá tratando ${t.title.toLowerCase()} do jeito errado."

[Desenvolvimento 3-35s]
Explicação rápida do erro comum + o que a evidência mostra.
${t.summary}

[Virada 35-40s]
"O que fazer em vez disso: [passo prático em 5 palavras]"

[CTA 40-45s]
"Segue pra parte 2." + comentário fixado com link.

Texto on-screen: legendas grandes em amarelo/preto.
Trilha sugerida: som viral na categoria educacional/saúde.`,
    meta: {
      duration: '45s',
      hashtags: ['#saudetiktok', '#medicoexplica', '#fyp', '#dicadesaude'],
      thumbnailHint: 'Frame com texto "ERRO COMUM" em vermelho',
    },
  }),

  podcast: (t, p, s) => ({
    body: `🎙️ EPISÓDIO PODCAST — ~15 min

**Título:** ${t.title}

**Show notes:**
${t.summary}

**Roteiro:**

[Abertura — 0:00-1:00]
Bem-vindos ao episódio. Sou ${p?.name || '[médico]'}, ${specialty(p)}. Hoje o assunto é ${t.title.toLowerCase()} — algo que atende muita gente e gera muita confusão.

[Bloco 1 — 1:00-5:00]
Contextualização. Por que esse tema importa agora. Casos que ilustram o problema (sempre respeitando o anonimato).

[Bloco 2 — 5:00-10:00]
Aprofundamento clínico. ${t.summary} Como isso muda a conduta.

[Bloco 3 — 10:00-13:00]
Recomendações práticas. O que o ouvinte pode fazer hoje. Quando procurar ajuda.

[Fecho — 13:00-15:00]
Recap dos 3 pontos principais. Convite para próximo episódio. Onde encontrar mais conteúdo.${sciTag(s)}`,
    meta: {
      title: t.title,
      duration: '~15 min',
      tags: [specialty(p), 'saúde', 'medicina', 'podcast médico'],
    },
  }),

  gmb: (t, p) => ({
    body: `📍 POST GOOGLE MEU NEGÓCIO

${t.title}

${t.summary}

Se você tem dúvidas sobre esse tema, ${specialty(p)} pode te orientar. Agende uma avaliação.

📞 Ligue ou envie WhatsApp para agendar.`,
    meta: {
      cta: 'Agendar',
      thumbnailHint: 'Foto do consultório ou infográfico do tema (1200x900)',
    },
  }),

  doctoralia: (t, p) => ({
    body: `**${t.title}**

*Artigo por ${p?.name || '[médico]'} — ${specialty(p)}*

${t.summary}

No dia a dia do consultório, esse é um dos temas que mais gera dúvida. A boa notícia é que a maioria dos casos tem caminho bem estabelecido:

- Avaliação individualizada é o ponto de partida.
- Tratamento conservador costuma ser a primeira linha.
- Reavaliação com critérios objetivos evita procedimentos desnecessários.

Se você se identifica com esse quadro, agende uma consulta para uma avaliação personalizada.`,
    meta: {
      title: t.title,
      tags: [specialty(p), 'artigo', 'educação em saúde'],
      cta: 'Agendar consulta',
    },
  }),

  website: (t, p) => ({
    body: `<article>
  <h2>${t.title}</h2>
  <p class="lead">${t.summary}</p>

  <p>Este é um dos temas que mais recebo perguntas no consultório. Abaixo, um resumo do que costuma funcionar na prática, baseado em evidência atual e na experiência clínica em ${specialty(p)}.</p>

  <h3>Sinais que merecem atenção</h3>
  <ul>
    <li>Sintomas que persistem por mais de 6 semanas.</li>
    <li>Piora funcional com atividades específicas.</li>
    <li>Falha de tratamentos anteriores.</li>
  </ul>

  <h3>O que costuma ser feito</h3>
  <ol>
    <li>Avaliação clínica funcional.</li>
    <li>Exames complementares só quando necessários.</li>
    <li>Plano de tratamento individualizado.</li>
  </ol>

  <p><a href="#agendamento" class="cta">Agendar avaliação</a></p>
</article>`,
    meta: {
      title: t.title,
      metaDescription: t.summary.slice(0, 155),
    },
  }),
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
  return { score: Math.max(0, Math.min(100, score)), flags, evaluated: true };
}

function applyBrand(body: string, brain?: Brain | null): { body: string; usedTraits: string[] } {
  const traits: string[] = [];
  if (!brain) return { body, usedTraits: traits };
  let out = body;
  // Replace banned words
  brain.brand.wordsNo.filter(Boolean).forEach(w => {
    const re = new RegExp(`\\b${w.trim()}\\b`, 'gi');
    if (re.test(out)) { out = out.replace(re, '____'); traits.push(`removeu "${w}"`); }
  });
  // Append default CTA if not already present
  if (brain.brand.defaultCTA?.trim() && !out.toLowerCase().includes(brain.brand.defaultCTA.toLowerCase().slice(0, 12))) {
    out += `\n\n${brain.brand.defaultCTA.trim()}`;
    traits.push('CTA da marca');
  }
  // Signal tone
  if (brain.doctor.tone) traits.push(`tom ${brain.doctor.tone}`);
  return { body: out, usedTraits: traits };
}

function pickPillar(topic: Topic, brain?: Brain | null): string | undefined {
  if (!brain) return;
  const pillars = brain.brand.pillars.filter(Boolean);
  if (!pillars.length) return;
  const hash = topic.title.length + topic.summary.length;
  return pillars[hash % pillars.length];
}

export function generateContentFor(
  topic: Topic,
  formats: ContentFormat[],
  profile: DoctorProfile | null,
  science?: Session['science'],
  brain?: Brain | null,
): ContentPiece[] {
  return formats.map(format => {
    const draft = TEMPLATES[format](topic, profile, science);
    const applied = applyBrand(draft.body, brain);
    const pillar = pickPillar(topic, brain);
    const piece: ContentPiece = {
      id: uid(),
      topicId: topic.id,
      format,
      channel: FORMAT_CHANNEL[format],
      body: applied.body,
      meta: draft.meta,
      cfm: scoreCFM(applied.body),
      approved: false,
      brainSignals: brain ? { pillar, usedTraits: applied.usedTraits } : undefined,
    };
    piece.artwork = buildArtwork(piece, topic, brain);
    piece.externalPrompts = buildExternalPrompts(piece, topic, brain);
    return piece;
  });

}


export const rescoreContent = (piece: ContentPiece): ContentPiece => ({ ...piece, cfm: scoreCFM(piece.body) });

export function createBlankSession(source: SessionSource, durationSec = 0, audioUrl?: string): Session {
  const titles: Record<SessionSource, string> = {
    recording: `Consulta de ${new Date().toLocaleDateString('pt-BR')}`,
    upload: `Consulta enviada — ${new Date().toLocaleDateString('pt-BR')}`,
    voice_note: `Voice Note — ${new Date().toLocaleDateString('pt-BR')}`,
    science: `Science to Content — ${new Date().toLocaleDateString('pt-BR')}`,
    audio_livre: `Áudio livre — ${new Date().toLocaleDateString('pt-BR')}`,
    link: `Link — ${new Date().toLocaleDateString('pt-BR')}`,
    tema_sugerido: `Tema sugerido — ${new Date().toLocaleDateString('pt-BR')}`,
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
  if (s.source === 'voice_note') {
    return {
      ...s,
      rawTranscript: VOICE_NOTE_DEMO_TRANSCRIPT,
      anonymizedTranscript: VOICE_NOTE_DEMO_TRANSCRIPT,
      piiFindings: [],
      topics: [{ ...VOICE_NOTE_TOPIC, id: uid() }],
    };
  }
  if (s.source === 'audio_livre' || s.source === 'link') {
    return {
      ...s,
      rawTranscript: s.rawTranscript || VOICE_NOTE_DEMO_TRANSCRIPT,
      anonymizedTranscript: s.rawTranscript || VOICE_NOTE_DEMO_TRANSCRIPT,
      piiFindings: [],
      topics: DEMO_TOPICS.map(t => ({ ...t, id: uid() })),
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
