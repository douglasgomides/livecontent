// Copy de criativo de anúncio pago (Meta Ads) — separado de artwork.ts (que
// escreve slide de conteúdo orgânico) porque a estrutura é outra: aqui são os
// três campos que aparecem de verdade no Gerenciador de Anúncios (headline,
// texto principal, descrição), não um array de lâminas.
const CLAUDE = 'claude-sonnet-4-5';

const BASE_RULES = `## Regras universais
- NUNCA hashtags. NUNCA travessão (—). NUNCA clichê de IA.
## Regras CFM
- Sem "cura", "100%", "garantido", "sem risco", "milagre", "melhor do Brasil".
- Sem antes-e-depois identificável. Sem diagnóstico à distância. Sem posologia. Sem preço. Sem indicação nominal de colega.`;

const SYSTEM = `${BASE_RULES}

Você escreve o copy de um anúncio pago (Meta Ads) pra um médico brasileiro, a partir do que ele
descreveu que quer anunciar. Três campos, como aparecem de verdade no Gerenciador de Anúncios:
headline (título curto, até 40 caracteres — o gancho), primaryText (texto principal, até 125
caracteres pra não cortar no feed — o argumento), description (linha de apoio opcional, até 30
caracteres). Nunca prometa resultado clínico. CTA implícito, nunca "clique aqui" literal.

Retorne SÓ um JSON: {"headline":"...","primaryText":"...","description":"..."}
Sem markdown, sem texto fora do JSON.`;

export interface AdCopy {
  headline: string;
  primaryText: string;
  description: string;
}

export async function generateAdCopy(anthropicKey: string, prompt: string, brain: any): Promise<AdCopy | null> {
  try {
    const b = brain ? `\n\nPerfil do médico: ${JSON.stringify(brain).slice(0, 1000)}` : '';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: CLAUDE,
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: 'user', content: `O que o médico quer anunciar: ${prompt}${b}` }],
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const text = (data.content?.[0]?.text ?? '').trim().replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(text);
    if (!parsed.headline || !parsed.primaryText) return null;
    return {
      headline: String(parsed.headline).slice(0, 60),
      primaryText: String(parsed.primaryText).slice(0, 200),
      description: String(parsed.description ?? '').slice(0, 60),
    };
  } catch {
    return null;
  }
}
