// generate-content — Claude gera o corpo de uma peça de conteúdo por formato.
// Recebe { topic, format, transcript, brain } e retorna { body }.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-sonnet-4-5';

const BASE_RULES = `
## Regras universais de copy — NÃO NEGOCIÁVEIS
- NUNCA hashtags (exceto LinkedIn, no fim, no máx 3).
- NUNCA travessão (—). NUNCA a estrutura "não é X, é Y".
- NUNCA clichês de IA: "no mundo atual", "é importante ressaltar", "vale destacar", "de forma holística", "impactar positivamente", "nesse sentido", "tendo em vista".
- Tom direto. Frases curtas (máx 2 linhas). CTA sempre específico (nunca "saiba mais").
- Escreva como quem fala. Não use jargão médico sem tradução.

## Regras CFM (Resoluções 1.974/2.336) — obrigatório
- Sem promessa de resultado ("cura", "100%", "garantido", "infalível", "sem risco", "melhor do Brasil").
- Sem antes-e-depois de paciente identificável.
- Sem diagnóstico à distância. Sem posologia (mg, doses). Sem preço de consulta. Sem indicação nominal de colega. Sem sensacionalismo.
`.trim();

const FORMAT_SYSTEM: Record<string, string> = {
  carousel: `Estrategista de carrosséis médicos. Entregue APENAS os slides.
Estrutura: gancho forte OU choque de realidade OU erro comum OU guia prático.
Máx 280 chars/slide. 7-10 slides. Último = CTA específico.
Formato:
SLIDE 1 — CAPA
Título: ...
Texto: ...
[continuar]
SLIDE FINAL — CTA
Título: ...
CTA: ...`,
  reel: `Roteirista de Reels. Entregue APENAS o roteiro falado.
GANCHO 0-3s. CORPO 4-80s. CTA 5-10s finais.
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
VERSÃO MÉDIA (8-12 linhas)
VERSÃO LONGA (15-20 linhas)
Sem hashtags. Sem "Olá, hoje vou falar sobre".`,
  linkedin: `Post de LinkedIn médico para pares e pacientes esclarecidos.
Linha 1 forte antes do "ver mais". Parágrafos curtos. CTA de conversa.
Máx 2 emojis. Máx 3 hashtags no fim.`,
  stories: `Roteiro de 4 frames de Stories.
Frame 1: enquete/pergunta. Frame 2: dado. Frame 3: insight. Frame 4: CTA.
Textos curtíssimos.`,
  gmb: `Post para Google Meu Negócio. 150-300 palavras.
Abertura em linguagem de busca. Palavras-chave naturais. CTA de agendar.
Sem hashtags, sem preço.`,
  blog: `Artigo em markdown, 800-1500 palavras.
# Título com palavra-chave
Introdução (150-200 palavras).
## H2 secundárias
## Conclusão + CTA
Sem "Neste artigo vamos falar sobre".`,
  youtube: `Roteiro de vídeo ~8min.
[INTRO 0:00-0:30] [BLOCO 1 problema] [BLOCO 2 ciência]
[BLOCO 3 prática] [BLOCO 4 FAQ] [FECHO recap+CTA]
Tom de fala, não de leitura.`,
  tiktok: `Roteiro TikTok 45s.
[Hook 0-3s] [Desenvolvimento 3-38s] [CTA 38-45s]
Descreva legendas on-screen. Tom de conversa.`,
  podcast: `Roteiro de podcast ~15min.
[Abertura 0-1min] [Bloco 1 contexto] [Bloco 2 aprofundamento]
[Bloco 3 prática] [Fecho recap+próximo episódio]
Casos sempre anonimizados.`,
  doctoralia: `Artigo para Doctoralia, 300-500 palavras.
Título com condição/sintoma. O que é, sinais, avaliação, CTA agendar.
Tom clínico acessível.`,
  website: `HTML semântico para página de especialidade.
<article>
  <h1>título</h1>
  <p>resumo</p>
  <section><h2>Quando procurar avaliação</h2><ul><li>...</li></ul></section>
  <section><h2>Como é feita a avaliação</h2><ol><li>...</li></ol></section>
  <section><h2>Agendar</h2><p>CTA</p></section>
</article>`,
};

const TONE_MAP: Record<string, string> = {
  didactic: 'didático e claro — explica de forma acessível sem perder precisão',
  empathetic: 'empático e acolhedor — reconhece a dor do paciente antes de educar',
  direct: 'direto e objetivo — vai ao ponto sem rodeios',
  technical: 'técnico e preciso — fala para paciente esclarecido ou para pares médicos',
};

function buildBrainContext(brain: any): string {
  if (!brain) return '';
  const d = brain.doctor ?? {};
  const p = brain.patient ?? {};
  const br = brain.brand ?? {};
  const arr = (v: any) => Array.isArray(v) ? v.filter(Boolean).join(', ') : '';
  return `
## Identidade do médico
- Nome: ${d.name || '—'}
- Especialidade: ${d.specialty || '—'}
- Tom: ${TONE_MAP[d.tone] || d.tone || '—'}
- Frases características: ${arr(d.catchphrases)}
- Temas favoritos: ${arr(d.lovedTopics)}
- Temas evitados: ${arr(d.avoidedTopics)}

## Paciente ideal
- Perfil: ${p.demographic || '—'}
- Dores: ${arr(p.mainPains)}
- Objeções: ${arr(p.commonObjections)}
- Medos: ${arr(p.fears)}
- Linguagem: ${p.language || '—'}

## Marca
- Posicionamento: ${br.positioning || '—'}
- Pilares: ${arr(br.pillars)}
- CTA padrão: ${br.defaultCTA || '—'}
- Palavras SIM: ${arr(br.wordsYes)}
- Palavras NUNCA: ${arr(br.wordsNo)}
`.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { topic, format, transcript, brain } = await req.json();
    if (!topic || !format) return json({ error: 'Missing topic/format' }, 400);
    const formatSys = FORMAT_SYSTEM[format];
    if (!formatSys) return json({ error: `Unknown format: ${format}` }, 400);

    const funnelDesc: Record<string, string> = {
      C0: 'público não sabe que o problema existe',
      C1: 'público reconhece sintoma mas tem crenças erradas',
      C2: 'público quer saber o que fazer',
      C3: 'paciente ou quase-paciente (prova, confiança)',
    };

    const { data: evidenceRows } = await supabase
      .from('evidence_sources').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(30);
    const evidence = evidenceRows ?? [];
    const evidenceBlock = evidence.length
      ? `\n\n## Evidência científica disponível — ÚNICA fonte permitida pra citação\n${evidence.map((e: any, i: number) =>
          `[${i + 1}] ${e.title}${e.authors ? ` — ${e.authors}` : ''}${e.journal ? ` (${e.journal}${e.year ? `, ${e.year}` : ''})` : ''} · nível: ${e.evidence_level}`
        ).join('\n')}\n\nSe for citar um estudo/dado científico, cite APENAS um dos itens acima. NUNCA invente DOI, autor, revista ou estatística que não esteja nesta lista.`
      : '\n\n## Evidência científica disponível\nNenhuma fonte cadastrada. NÃO cite estudo, revista, autor ou dado estatístico específico — fale em termos gerais, sem inventar referência.';

    const userMessage = `
## Tema
Título: ${topic.title}
Resumo: ${topic.summary}
Funil: ${topic.funnelStage} — ${funnelDesc[topic.funnelStage] || ''}

${transcript ? `## Transcrição base (não copiar literalmente)\n${String(transcript).slice(0, 1500)}` : ''}

${buildBrainContext(brain)}${evidenceBlock}

Gere o conteúdo agora no formato solicitado. Aplique todas as regras universais e CFM.
`.trim();

    const systemPrompt = `${BASE_RULES}\n\n${formatSys}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return json({ error: `anthropic error: ${t.slice(0, 500)}` }, 502);
    }
    const data = await r.json();
    const body = (data.content?.[0]?.text ?? '').trim();

    return json({ body });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
