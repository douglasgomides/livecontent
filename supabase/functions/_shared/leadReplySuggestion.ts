// Sugere uma resposta + uma etapa de funil pra um lead que acabou de responder
// por WhatsApp — SEMPRE um convite pro médico revisar, nunca aplicado sozinho.
// Mesmo padrão de _shared/patientSignals.ts e cfm.ts: prompt fixo, JSON forçado,
// FALLBACK que nunca derruba o chamador (o webhook de entrada chama isso
// best-effort — se a IA falhar, a mensagem já foi registrada mesmo assim).
const MODEL = 'claude-sonnet-4-5';

const SYSTEM = `Você ajuda um médico brasileiro a responder um lead (ainda não é paciente, deixou
contato num formulário de captação) que respondeu por WhatsApp. Gere uma resposta curta, humana, no
tom de quem atende consultório — não robótica, não um vendedor agressivo — que avance a conversa pro
agendamento sem prometer nada clínico ou fazer diagnóstico à distância. Baseado SÓ no texto real do
lead, classifique se dá pra sugerir mover pra uma nova etapa de funil (novo, contatado, agendado,
convertido, perdido). Só sugira mudança quando o texto deixar claro (ex.: "quero marcar" -> agendado;
"não tenho mais interesse"/"não, obrigado" -> perdido); se ambíguo, repita a etapa atual.

Retorne SÓ um JSON:
{"draftReply":"...","suggestedStatus":"novo|contatado|agendado|convertido|perdido","reason":"frase curta"}
Sem markdown, sem texto fora do JSON.`;

export interface LeadReplySuggestion {
  draftReply: string;
  suggestedStatus: string;
  reason: string;
}

export async function suggestLeadReply(
  anthropicKey: string,
  lead: { name: string; reason: string | null; status: string },
  history: { direction: string; body: string }[],
): Promise<LeadReplySuggestion | null> {
  try {
    const transcript = history.map(m => `${m.direction === 'inbound' ? 'Lead' : 'Médico'}: ${m.body}`).join('\n');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM,
        messages: [{
          role: 'user',
          content: `Lead: ${lead.name}. Motivo informado no formulário: ${lead.reason ?? 'não informado'}. Etapa atual: ${lead.status}.\n\nConversa até agora:\n${transcript}`,
        }],
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const text: string = data.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!parsed.draftReply) return null;
    return {
      draftReply: String(parsed.draftReply),
      suggestedStatus: String(parsed.suggestedStatus ?? lead.status),
      reason: String(parsed.reason ?? ''),
    };
  } catch {
    return null;
  }
}
