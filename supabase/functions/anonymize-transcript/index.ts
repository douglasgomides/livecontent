// anonymize-transcript — chama Anthropic Claude para detectar/substituir PII.
// Requer: ANTHROPIC_API_KEY.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-sonnet-4-5';

const SYSTEM = `Você é um sistema de anonimização de transcrições de consultas médicas em português brasileiro.
Sua tarefa é REMOVER TODA informação identificável do paciente e substituí-la por marcadores genéricos entre colchetes.

Substitua obrigatoriamente:
- Nomes próprios do paciente ou familiares → [paciente], [familiar]
- Número de prontuário / matrícula / documentos → [prontuário]
- Endereços (rua, número, bairro, cidade) → [endereço removido]
- Convênio / plano de saúde por nome → [plano]
- Profissão identificável (quando ajudar a reconhecer) → [profissão]
- Telefones, e-mails, redes sociais → [contato]
- Empresa/local de trabalho identificável → [local de trabalho]
- Nomes de médicos colegas → [colega]

MANTENHA: sintomas, exames, condutas médicas, contexto clínico, tempos ("3 meses"), a fala do médico.

Retorne EXCLUSIVAMENTE um JSON válido no formato:
{
  "anonymized": "transcrição anonimizada completa",
  "findings": [
    { "original": "texto original", "replacement": "[marcador]", "type": "name|id|plan|address|contact|profession|other" }
  ]
}
Sem markdown, sem cercas de código, sem texto antes ou depois do JSON.`;

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

    const { transcript } = await req.json();
    if (typeof transcript !== 'string' || !transcript.trim()) return json({ error: 'Empty transcript' }, 400);

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{ role: 'user', content: transcript }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return json({ error: `anthropic error: ${t.slice(0, 500)}` }, 502);
    }
    const data = await r.json();
    const text = (data.content?.[0]?.text ?? '').trim().replace(/^```json\s*|\s*```$/g, '');
    let parsed: any;
    try { parsed = JSON.parse(text); }
    catch { return json({ error: 'invalid JSON from model', raw: text.slice(0, 500) }, 502); }

    return json({
      anonymized: String(parsed.anonymized ?? transcript),
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    });
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
