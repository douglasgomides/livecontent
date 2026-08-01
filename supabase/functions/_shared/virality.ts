// Scoring semântico de potencial de viralização/qualidade — estilo Opus Clip.
// Avalia gancho, retenção e "vontade de compartilhar" de UM texto (matéria-prima
// ainda não virou conteúdo, ou peça já gerada), pra apontar o que vale mais a
// pena puxar/gerar/publicar primeiro. Compartilhado entre score-virality (rescan
// manual), run-pipeline (temas + peças), embed-evidence-source (artigos) e
// check-evidence-topic-watches (notícias monitoradas).
const MODEL = 'claude-sonnet-4-5';

export type ViralityContentType = 'tema' | 'artigo' | 'noticia' | 'peca';

const CONTEXT_HINT: Record<ViralityContentType, string> = {
  tema: 'Isto é um TEMA extraído de uma consulta gravada — ainda não virou conteúdo. Avalie o potencial da matéria-prima: esse assunto, do jeito que está resumido, tem gancho pra virar um post que prende atenção?',
  artigo: 'Isto é um ARTIGO/ESTUDO científico cadastrado como fonte de evidência — ainda não virou conteúdo. Avalie o potencial de virar um post interessante pro público leigo, não o rigor científico (isso já é avaliado em outro lugar).',
  noticia: 'Isto é uma NOTÍCIA/ATUALIZAÇÃO encontrada por monitoramento automático de um tema — ainda não virou conteúdo. Avalie o potencial de virar um post de "novidade" que os pacientes queiram ler.',
  peca: 'Isto é uma PEÇA DE CONTEÚDO já gerada e pronta (post, roteiro, legenda) — avalie o texto final como ele vai ser publicado.',
};

export const VIRALITY_SYSTEM = `Você é um editor especialista em viralização de conteúdo médico nas redes sociais,
no mesmo espírito de ferramentas como o Opus Clip (que aponta os melhores trechos de um vídeo longo pra virar clipe).
Sua tarefa é avaliar UM texto e dar uma nota de 0 a 100 pra cada um destes três critérios:

- GANCHO (hook): as primeiras 1-2 frases prendem a atenção de quem está rolando o feed? Quebra padrão,
  gera curiosidade genuína, faz uma pergunta que incomoda, contraria uma crença comum?
- RETENÇÃO (retention): o conteúdo mantém interesse até o fim — tem progressão, tensão, um "porquê continuar
  lendo/assistindo", ou é só uma lista plana de informação sem arco nenhum?
- COMPARTILHABILIDADE (shareability): dá vontade real de mandar pra alguém ("nossa, isso é você" ou "olha
  isso") — por utilidade prática, identificação emocional, ou surpresa? Conteúdo puramente informativo sem
  nenhum desses gatilhos pontua baixo aqui, mesmo sendo tecnicamente correto.

Não confunda "viralização" com sensacionalismo antiético — um gancho forte e honesto pontua alto; uma
promessa exagerada ou clickbait vazio não deveria (isso é avaliado à parte pela auditoria de compliance,
aqui você só avalia se tecnicamente prende e engaja, dado o texto como está).

Para cada nota, dê um motivo curto (1 frase) explicando o porquê daquele número — cite o trecho ou a
característica específica do texto que justifica, não uma generalidade.

Retorne EXCLUSIVAMENTE um JSON válido, sem markdown, sem texto fora do JSON:
{
  "hook": 0-100,
  "retention": 0-100,
  "shareability": 0-100,
  "reasons": ["motivo curto do gancho", "motivo curto da retenção", "motivo curto da compartilhabilidade"]
}`;

export interface ViralityResult {
  score: number;
  hook: number;
  retention: number;
  shareability: number;
  reasons: string[];
}

const FALLBACK: ViralityResult = {
  score: 50, hook: 50, retention: 50, shareability: 50,
  reasons: ['Não foi possível avaliar automaticamente'],
};

function clamp(n: unknown): number {
  const v = Number(n);
  if (isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export async function scoreViralitySemantic(
  anthropicKey: string,
  input: { title?: string; text: string; contentType: ViralityContentType },
): Promise<ViralityResult> {
  try {
    const body = `${CONTEXT_HINT[input.contentType]}\n\n${input.title ? `Título: ${input.title}\n\n` : ''}Texto:\n${input.text.slice(0, 6000)}`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: VIRALITY_SYSTEM,
        messages: [{ role: 'user', content: body }],
      }),
    });
    if (!r.ok) { console.warn('[virality] anthropic', r.status, await r.text()); return FALLBACK; }
    const data = await r.json();
    const text = (data.content?.[0]?.text ?? '').trim().replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(text);
    const hook = clamp(parsed.hook);
    const retention = clamp(parsed.retention);
    const shareability = clamp(parsed.shareability);
    const score = Math.round((hook + retention + shareability) / 3);
    const reasons = Array.isArray(parsed.reasons) && parsed.reasons.length
      ? parsed.reasons.map((r: unknown) => String(r)).slice(0, 3)
      : ['Sem justificativa retornada'];
    return { score, hook, retention, shareability, reasons };
  } catch (e) {
    console.warn('[virality] failed', e);
    return FALLBACK;
  }
}
