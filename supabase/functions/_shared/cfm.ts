// Scoring semântico de compliance publicitária médica (CFM) — por contexto, não
// por palavra-chave. Compartilhado entre score-cfm (rescan manual) e run-pipeline
// (scoring automático na geração).
const MODEL = 'claude-sonnet-4-5';

export const CFM_SYSTEM = `Você é um auditor de publicidade médica brasileira, especialista nas Resoluções CFM
1.974/2011, 2.126/2015 e 2.336/2023. Sua tarefa é avaliar UM texto de conteúdo (post, roteiro,
legenda) e decidir se ele fere alguma regra ética REAL — não se ele usa uma palavra da lista negra.

## O que é PROIBIDO de fato (flagar como "block" ou "warning" conforme gravidade)
- Prometer ou garantir resultado/cura ("você vai se curar", "resultado garantido", "sem risco algum").
- Antes-e-depois de paciente identificável, ou que sugira resultado individual replicável como regra.
- Diagnóstico ou prescrição à distância ("se você sente X, você tem Y, tome Z").
- Posologia, nome comercial de medicamento, ou preço/valor de consulta/procedimento.
- Comparação ou superlativo autopromocional ("o melhor do Brasil", "clínica número 1").
- Indicação nominal de outro profissional/concorrente, ou depreciação de colega.
- Sensacionalismo que explore medo infundado ou minimize risco real de um procedimento.

## O que é PERMITIDO e NÃO deve ser flagado (técnica de persuasão ética)
- Gancho forte, urgência genuína ("não deixe pra depois"), quebra de padrão, storytelling.
- Prova social agregada e anônima ("a maioria dos pacientes relata melhora em X semanas" —
  desde que não seja promessa individual garantida).
- Estatísticas reais da literatura, citadas com fonte.
- CTA direto para agendar avaliação (isso não é "venda de resultado", é convite a agendar).
- Tom de autoridade, humor, linguagem coloquial, emojis com moderação.
- Descrever o RACIOCÍNIO clínico do médico em termos gerais (não é diagnóstico à distância
  quando claramente educativo e não dirigido a "você, leitor, tem isso").

## Como responder
Para cada problema real encontrado, cite o TRECHO exato e explique em 1 frase por que fere qual
resolução/princípio — nunca flagar só por conter uma palavra isoladamente sem o problema de fato
estar presente na frase completa. Se nada de fato problemático existir, retorne flags vazio.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "score": 0-100 (100 = sem problema algum; cada "block" real subtrai ~30; cada "warning" real subtrai ~8),
  "flags": [
    { "label": "trecho \\"...\\": explicação curta ligada à regra específica", "severity": "block|warning|info" }
  ]
}
Se não houver nenhum problema, inclua um único flag informativo: {"label":"Nenhum problema ético real identificado","severity":"info"}.
Sem markdown, sem texto fora do JSON.`;

export interface CFMResult {
  score: number;
  flags: Array<{ label: string; severity: 'info' | 'warning' | 'block' }>;
}

const FALLBACK: CFMResult = {
  score: 50,
  flags: [{ label: 'Não foi possível avaliar automaticamente — revise manualmente antes de aprovar', severity: 'warning' }],
};

export async function scoreCFMSemantic(anthropicKey: string, body: string): Promise<CFMResult> {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: CFM_SYSTEM,
        messages: [{ role: 'user', content: body.slice(0, 6000) }],
      }),
    });
    if (!r.ok) { console.warn('[cfm] anthropic', r.status, await r.text()); return FALLBACK; }
    const data = await r.json();
    const text = (data.content?.[0]?.text ?? '').trim().replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(text);
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    const flags = Array.isArray(parsed.flags) && parsed.flags.length
      ? parsed.flags
      : [{ label: 'Nenhum problema ético real identificado', severity: 'info' as const }];
    return { score, flags };
  } catch (e) {
    console.warn('[cfm] failed', e);
    return FALLBACK;
  }
}
