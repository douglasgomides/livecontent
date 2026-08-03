// Rascunha uma mensagem PROATIVA de nurturing pra um lead que ainda não
// respondeu/agendou — diferente de leadReplySuggestion.ts (que reage a uma
// mensagem que o lead mandou). Sempre um rascunho pro médico revisar e
// aprovar, nunca enviado sozinho. A "temperatura" (frio/morno) e o checkpoint
// de dia vêm da etapa do kanban (novo/contatado) e de quanto tempo faz que
// entrou nela — é a tradução possível do conceito do documento de produto
// pros dados que este app realmente tem (não temos rastreamento de clique/
// visualização, só o status manual do médico).
const MODEL = 'claude-sonnet-4-5';

const SYSTEM = `Você ajuda um médico brasileiro a manter contato com um lead (ainda não é paciente)
que ainda não respondeu ou não agendou consulta. Gere uma mensagem curta, humana, de WhatsApp —
nunca robótica, nunca insistente ou vendedora agressiva — que reacende a conversa sem prometer nada
clínico ou fazer diagnóstico à distância. Baseie-se no motivo que o lead informou no formulário (se
houver) e no checkpoint da cadência informado, mas NUNCA repita a mesma mensagem de um checkpoint
anterior — cada toque deve trazer um ângulo novo (educar, tirar dúvida comum, remover fricção,
convite direto), nunca só "cutucar" de novo.

Retorne SÓ um JSON: {"message":"..."}
Sem markdown, sem texto fora do JSON.`;

export interface NurturingDraft {
  message: string;
}

export async function suggestNurturingMessage(
  anthropicKey: string,
  lead: { name: string; reason: string | null },
  checkpoint: { temperature: 'frio' | 'morno'; day: number; totalCheckpoints: number },
): Promise<NurturingDraft | null> {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM,
        messages: [{
          role: 'user',
          content: `Lead: ${lead.name}. Motivo informado no formulário: ${lead.reason ?? 'não informado'}.\n` +
            `Temperatura: ${checkpoint.temperature}. Este é o toque do dia ${checkpoint.day} (checkpoint ${checkpoint.temperature === 'frio' ? '1/4/8' : '1/3/6/10'} dias desde que entrou nessa etapa).`,
        }],
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const text: string = data.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!parsed.message) return null;
    return { message: String(parsed.message) };
  } catch {
    return null;
  }
}
