// Pré-preenche a Brain (paciente/tom do médico) a partir da transcrição JÁ ANONIMIZADA
// da PRIMEIRA consulta real gravada — reduz a fricção de ativação: em vez de o médico
// digitar ~10 campos à mão em Brain.tsx logo de cara, a própria consulta já entrega sinal
// real de dor/objeção/linguagem do paciente e de tom/abertura do médico. Mesmo padrão de
// _shared/patientSignals.ts: prompt fixo, JSON forçado, FALLBACK que nunca derruba o
// chamador (run-pipeline chama isso best-effort, sem setError em falha) e nunca inventa
// o que não está no texto.
const MODEL = 'claude-sonnet-4-5';

const SEED_SYSTEM = `Você analisa a transcrição JÁ ANONIMIZADA da PRIMEIRA consulta gravada de um médico
nesta ferramenta, pra ajudar a pré-preencher o perfil dele com base em dado real — em vez de pedir
que ele digite tudo à mão antes de ter usado a ferramenta de verdade. Nunca invente nada que não
esteja implícito no texto: se não houver base suficiente pra um campo, OMITA esse campo (não force).

Extraia, somente quando houver evidência real no texto:
- patientMainPains: sintomas/queixas que o paciente relatou, frases curtas
- patientCommonObjections: objeções/hesitações que o paciente expressou (preço, medo, tempo, etc.)
- patientLanguage: como o paciente descreve o problema com as PRÓPRIAS palavras dele (1 frase-exemplo,
  nunca jargão médico) — ex: "ele chama a lombalgia de 'aquela dor que trava'"
- patientFears: medos explícitos do paciente
- patientDecisionTriggers: o que pareceu convencer/motivar o paciente a considerar agir
- doctorCatchphrases: expressões que o MÉDICO repetiu ou que soam como marca registrada dele
- doctorOpeningStyle: como o médico conduziu a abertura da conversa (1 frase descritiva)
- doctorTone: didactic|empathetic|direct|technical — o tom que o MÉDICO usa de fato com o paciente,
  pela evidência real no texto (não pelo que ele preencheu em outro lugar)

EXCEÇÃO NÃO-NEGOCIÁVEL: nunca inclua nome, apelido, endereço ou contato em nenhum campo — generalize
só essa parte específica se aparecer, mesmo que a anonimização tenha deixado passar.

Retorne SÓ um JSON object — campos sem base real ficam OMITIDOS, nunca inventados:
{"patientMainPains":[...],"patientCommonObjections":[...],"patientLanguage":"...","patientFears":[...],
"patientDecisionTriggers":[...],"doctorCatchphrases":[...],"doctorOpeningStyle":"...","doctorTone":"..."}
Sem markdown, sem texto fora do JSON.`;

export interface BrainSeedSuggestion {
  patientMainPains?: string[];
  patientCommonObjections?: string[];
  patientLanguage?: string;
  patientFears?: string[];
  patientDecisionTriggers?: string[];
  doctorCatchphrases?: string[];
  doctorOpeningStyle?: string;
  doctorTone?: 'didactic' | 'empathetic' | 'direct' | 'technical';
}

const VALID_TONE = new Set(['didactic', 'empathetic', 'direct', 'technical']);
const cleanList = (v: any): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const list = v.map(x => String(x || '').trim().slice(0, 200)).filter(Boolean).slice(0, 8);
  return list.length ? list : undefined;
};
const cleanText = (v: any): string | undefined => {
  const s = String(v || '').trim().slice(0, 300);
  return s || undefined;
};

export async function inferBrainSeed(anthropicKey: string, anonymizedTranscript: string): Promise<BrainSeedSuggestion | null> {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1500, system: SEED_SYSTEM,
        messages: [{ role: 'user', content: anonymizedTranscript }],
      }),
    });
    if (!r.ok) { console.warn('[brain-seed] anthropic', r.status); return null; }
    const data = await r.json();
    const text = (data.content?.[0]?.text ?? '').trim().replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return null;

    const out: BrainSeedSuggestion = {
      patientMainPains: cleanList(parsed.patientMainPains),
      patientCommonObjections: cleanList(parsed.patientCommonObjections),
      patientLanguage: cleanText(parsed.patientLanguage),
      patientFears: cleanList(parsed.patientFears),
      patientDecisionTriggers: cleanList(parsed.patientDecisionTriggers),
      doctorCatchphrases: cleanList(parsed.doctorCatchphrases),
      doctorOpeningStyle: cleanText(parsed.doctorOpeningStyle),
      doctorTone: VALID_TONE.has(parsed.doctorTone) ? parsed.doctorTone : undefined,
    };
    const hasAny = Object.values(out).some(v => v !== undefined);
    return hasAny ? out : null;
  } catch (e) {
    console.warn('[brain-seed] failed', e);
    return null;
  }
}
