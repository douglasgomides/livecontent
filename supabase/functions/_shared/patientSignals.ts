// Extrai sinais de inteligência comercial (objeções, dúvidas, sinais de decisão de
// compra) da transcrição JÁ ANONIMIZADA de uma consulta. Nunca deve receber
// raw_transcript — só anonymized_transcript, mesma disciplina do resto do pipeline.
// Mesmo padrão de _shared/cfm.ts: prompt fixo, JSON forçado, FALLBACK que nunca
// derruba o chamador (run-pipeline chama isso best-effort, sem setError em falha).
const MODEL = 'claude-sonnet-4-5';

const SIGNAL_SYSTEM = `Você é um analista de inteligência comercial para consultórios médicos brasileiros.
Recebe a transcrição JÁ ANONIMIZADA de uma consulta e identifica, de forma factual, sinais de
objeção, dúvida ou intenção de compra que o PACIENTE expressou. Nunca invente nada que não esteja
no texto. Trabalhe SOMENTE com o texto fornecido.

## Taxonomia (use exatamente estes valores)
kind="objection": category ∈ {price_cost, fear_procedure_side_effects, need_think_it_over,
  family_spouse_approval, insurance_coverage, previous_bad_experience, scheduling_time, other}
kind="question": category ∈ {symptom_cause, procedure_details, safety_side_effects,
  cost_insurance, recovery_aftercare, alternatives, other}
kind="buying_signal": category ∈ {ready_to_schedule, asked_price_proactively,
  asked_next_steps, requested_recommendation, other}

Para cada sinal real e claro, gere um "label" curto (máx 140 caracteres) que PARAFRASEIA o que o
paciente deu a entender — NUNCA copie a frase literal da transcrição (reduz ainda mais qualquer
risco de algo sensível aparecer num resumo). Se não houver sinal claro, não force — retorne menos
itens ou array vazio.

Retorne SÓ um JSON array (pode ser vazio):
[{"kind":"objection|question|buying_signal","category":"...","label":"...","confidence":0-100}]
Sem markdown, sem texto fora do JSON. Máximo 12 itens.`;

export interface PatientSignalRow {
  kind: 'objection' | 'question' | 'buying_signal';
  category: string;
  label: string;
  confidence: number;
}

const FALLBACK: PatientSignalRow[] = [];

export async function extractPatientSignals(anthropicKey: string, anonymizedTranscript: string): Promise<PatientSignalRow[]> {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 2000, system: SIGNAL_SYSTEM,
        messages: [{ role: 'user', content: anonymizedTranscript }],
      }),
    });
    if (!r.ok) { console.warn('[signals] anthropic', r.status); return FALLBACK; }
    const data = await r.json();
    const text = (data.content?.[0]?.text ?? '').trim().replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return FALLBACK;
    const VALID_KIND = new Set(['objection', 'question', 'buying_signal']);
    return parsed
      .filter((s: any) => VALID_KIND.has(s.kind))
      .slice(0, 12)
      .map((s: any) => ({
        kind: s.kind,
        category: String(s.category || 'other'),
        label: String(s.label || '').slice(0, 160),
        confidence: Math.max(0, Math.min(100, Number(s.confidence) || 60)),
      }));
  } catch (e) {
    console.warn('[signals] failed', e);
    return FALLBACK;
  }
}
