// Sugere ações (pausar, aumentar/reduzir orçamento, revisar criativo) a partir
// do desempenho REAL de cada campanha (gasto/leads/CAC já calculados, nunca
// inventados pela IA) — sempre um convite pro médico decidir, nunca aplica
// nada no Meta/Google Ads sozinho (não temos escrita conectada na conta dele).
const MODEL = 'claude-sonnet-4-5';

const SYSTEM = `Você analisa o desempenho de campanhas de Meta Ads/Google Ads de um médico brasileiro,
já cruzado com quantos leads reais cada campanha gerou (não é CTR/CPC genérico, é conversão de
verdade). Aponte no máximo 1 sugestão por campanha, e SÓ quando os números realmente justificarem —
não force sugestão pra campanha sem sinal claro (deixe de fora). Critérios:
- "pausar": gastou valor relevante e gerou zero (ou pouquíssimos) leads.
- "aumentar_orcamento": CAC bem abaixo da média das outras campanhas do médico (está funcionando,
  vale escalar).
- "reduzir_orcamento": CAC bem acima da média, mas ainda gera algum lead (não zerou, mas está caro).
- "revisar_criativo": muito clique/impressão mas conversão em lead desproporcionalmente baixa
  (indica que o anúncio atrai atenção mas o criativo/oferta não converte).
Escreva o motivo em 1-2 frases, citando os números reais (gasto, leads, CAC) — nunca genérico.

Retorne SÓ um JSON array, um item por campanha que merece sugestão:
[{"campaignId":"...","suggestionType":"pausar|aumentar_orcamento|reduzir_orcamento|revisar_criativo","reason":"..."}]
Sem markdown, sem texto fora do array. Array vazio [] se nenhuma campanha justificar sugestão.`;

export interface AdSuggestionDraft {
  campaignId: string;
  suggestionType: string;
  reason: string;
}

export async function suggestAdActions(
  anthropicKey: string,
  campaigns: { id: string; name: string; spend: number; impressions: number; clicks: number; leads: number; cac: number | null }[],
): Promise<AdSuggestionDraft[]> {
  if (!campaigns.length) return [];
  try {
    const table = campaigns.map(c =>
      `- ${c.name} (id ${c.id}): gasto R$${c.spend.toFixed(2)}, ${c.impressions} impressões, ${c.clicks} cliques, ${c.leads} leads, CAC ${c.cac != null ? `R$${c.cac.toFixed(2)}` : 'sem lead ainda'}`
    ).join('\n');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: `Campanhas dos últimos 30 dias:\n${table}` }],
      }),
    });
    if (!r.ok) return [];
    const data = await r.json();
    const text: string = data.content?.[0]?.text ?? '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    const validIds = new Set(campaigns.map(c => c.id));
    const validTypes = new Set(['pausar', 'aumentar_orcamento', 'reduzir_orcamento', 'revisar_criativo']);
    return parsed
      .filter((s: any) => validIds.has(s.campaignId) && validTypes.has(s.suggestionType) && s.reason)
      .map((s: any) => ({ campaignId: String(s.campaignId), suggestionType: String(s.suggestionType), reason: String(s.reason).slice(0, 500) }));
  } catch {
    return [];
  }
}
