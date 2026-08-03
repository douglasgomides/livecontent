// Geração de ARTE visual (slides estruturados pra carousel/stories) — sob demanda,
// fora do caminho crítico do run-pipeline (que só gera texto/copy rápido).
// Renderizado client-side (Canvas → PNG/vídeo) com a marca do médico.
const CLAUDE = 'claude-sonnet-4-5';

export const ARTWORK_DIMS: Record<string, { width: number; height: number }> = {
  carousel: { width: 1080, height: 1350 },
  stories: { width: 1080, height: 1920 },
};

// Dimensões mais usadas em anúncio no Meta hoje — quadrado e vertical 4:5 pro
// feed, 9:16 pra Stories/Reels. Paisagem 1.91:1 caiu em desuso e não é mais o
// formato recomendado pela própria Meta, por isso fica de fora.
export const AD_DIMENSIONS: Record<string, { width: number; height: number; label: string }> = {
  quadrado: { width: 1080, height: 1080, label: 'Feed quadrado (1:1)' },
  vertical: { width: 1080, height: 1350, label: 'Feed vertical (4:5)' },
  story: { width: 1080, height: 1920, label: 'Stories/Reels (9:16)' },
};

const BASE_RULES = `## Regras universais
- NUNCA hashtags em nenhum formato (nem LinkedIn). NUNCA travessão (—). NUNCA "não é X, é Y".
- NUNCA clichês de IA. Tom direto. Frases curtas. CTA específico.
## Regras CFM
- Sem "cura", "100%", "garantido", "sem risco", "milagre", "melhor do Brasil".
- Sem antes-e-depois identificável. Sem diagnóstico à distância. Sem posologia. Sem preço. Sem indicação nominal de colega.`;

const SLIDES_SYSTEM: Record<string, string> = {
  carousel: `Estrategista de carrosséis médicos. Gere 7-10 slides reais e específicos sobre o tema
(nunca genéricos/placeholder) — o slide 1 decide se o usuário desliza, então o gancho tem que
ser forte (4-7 palavras, pergunta direta ou promessa clara). Estrutura: capa (gancho) → contexto
(por que importa agora) → 2-3 slides de desenvolvimento (mito×verdade, passo a passo — um ponto
por slide, sem jargão) → 1-2 slides de virada (o dado ou raciocínio que ninguém conta) → resumo
em uma frase → CTA final de salvar/compartilhar (nunca "seguir").
Cada slide tem: kind ("cover" pro primeiro, "content" pros do meio, "cta" pro último),
eyebrow (rótulo curto, ex: "01 · O SINTOMA"), title (frase de impacto, máx 60 chars),
body (1-3 frases, máx 200 chars, vazio no cover/cta se não precisar).
Regras CFM e universais valem aqui também (sem promessa de cura, sem hashtags, sem travessão).`,
  stories: `Roteirista de Stories médicos. Gere 7-10 frames em 3 partes: 1 frame de gancho (headline
forte, por que assistir), 5-8 frames de valor (um ponto por frame — dado, insight, reflexão ligada
ao tema real da consulta, texto grande e legível), 1 frame final de ação (enquete, caixinha de
pergunta, ou convite a marcar alguém).
Cada frame: kind ("story" pros de valor, "cta" pro último), eyebrow (rótulo curto, ex:
"ENQUETE"), title (frase curta de impacto, máx 50 chars), body (opcional, máx 100 chars).
Regras CFM e universais valem aqui também.`,
};

function buildEvidenceBlock(evidence: any[]): string {
  if (!evidence.length) {
    return '\n\n## Evidência científica disponível\nNenhuma fonte cadastrada pelo médico. NÃO cite estudo, revista, autor ou dado estatístico específico — fale em termos gerais de prática clínica, sem inventar referência.';
  }
  const list = evidence.map((e, i) =>
    `[${i + 1}] ${e.title}${e.authors ? ` — ${e.authors}` : ''}${e.journal ? ` (${e.journal}${e.year ? `, ${e.year}` : ''})` : ''} · nível: ${e.evidence_level}`
  ).join('\n');
  return `\n\n## Evidência científica disponível — ÚNICA fonte permitida pra citação\n${list}\n\nSe for citar um estudo/dado científico, cite APENAS um dos itens acima. NUNCA invente DOI, autor, revista ou estatística que não esteja nesta lista.`;
}

function buildSlidesUser(topic: any, transcript: string, brain: any, evidence: any[], referenceStructure: string | null): string {
  const funnelDesc: Record<string, string> = {
    C0: 'não sabe que o problema existe', C1: 'reconhece sintoma, tem crenças erradas',
    C2: 'quer saber o que fazer', C3: 'quase-paciente, precisa de prova',
  };
  const b = brain ? `\n\n## Perfil do médico:\n${JSON.stringify(brain).slice(0, 1500)}` : '';
  const refBlock = referenceStructure
    ? `\n\n## Estrutura de referência a seguir (formato/gancho/progressão/estilo — NUNCA copie frases, só o padrão)\n${referenceStructure}`
    : '';
  return `## Tema
Título: ${topic.title}
Resumo: ${topic.summary}
Funil: ${topic.funnelStage ?? topic.funnel_stage} — ${funnelDesc[topic.funnelStage ?? topic.funnel_stage] ?? ''}

## Transcrição base (não copiar literalmente)
${String(transcript ?? '').slice(0, 1500)}${b}${buildEvidenceBlock(evidence)}${refBlock}`;
}

async function claudeJson(key: string, system: string, user: string, maxTokens = 2500)
  : Promise<{ ok: true; data: any } | { ok: false; error: string }>
{
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: CLAUDE, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!r.ok) return { ok: false, error: `anthropic ${r.status}: ${(await r.text()).slice(0, 200)}` };
    const data = await r.json();
    const text = (data.content?.[0]?.text ?? '').trim().replace(/^```json\s*|\s*```$/g, '');
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e) };
  }
}

export async function generateArtworkSlides(
  key: string, format: string, topic: any, transcript: string, brain: any,
  evidence: any[], referenceStructure: string | null,
): Promise<any[]> {
  const handle = brain?.brand?.handle || undefined;
  const system = `${BASE_RULES}\n\n${SLIDES_SYSTEM[format]}\n\nRetorne SÓ um JSON array: [{"kind":"cover|content|cta|story","eyebrow":"...","title":"...","body":"..."}]\nSem markdown, sem texto fora do array.`;
  const user = buildSlidesUser(topic, transcript, brain, evidence, referenceStructure);
  const res = await claudeJson(key, system, user);
  if (!res.ok || !Array.isArray(res.data) || !res.data.length) {
    return [{ kind: 'cover', eyebrow: format.toUpperCase(), title: topic.title, body: topic.summary?.slice(0, 160) ?? '', footer: handle }];
  }
  return res.data.map((s: any) => ({
    kind: ['cover', 'content', 'cta', 'story'].includes(s.kind) ? s.kind : 'content',
    eyebrow: typeof s.eyebrow === 'string' ? s.eyebrow.slice(0, 40) : undefined,
    title: typeof s.title === 'string' ? s.title.slice(0, 120) : undefined,
    body: typeof s.body === 'string' ? s.body.slice(0, 300) : undefined,
    footer: handle,
  }));
}
