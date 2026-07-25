// extract-topics — Claude extrai 2-5 tópicos de conteúdo do transcript anonimizado.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-sonnet-4-5';

const SYSTEM = `Você é um estrategista de conteúdo para médicos brasileiros.
Sua tarefa: analisar a transcrição anonimizada de uma consulta ou nota e extrair de 2 a 5 tópicos de conteúdo que o médico pode usar para educar seus pacientes ideais.

Regras:
- Cada tópico deve ser AUTOSUFICIENTE (o público entende sem contexto da consulta).
- Titulo com gancho claro (não neutro).
- Summary explica o tema em 1-3 frases, incluindo o insight central que a peça vai carregar.
- funnelStage classifica onde o público está:
  * C0 = não sabe que o problema existe
  * C1 = tem sintoma mas crenças erradas
  * C2 = quer saber o que fazer
  * C3 = quase-paciente, precisa de prova/confiança
- Nunca inventar dados que não estão na transcrição.
- Nunca usar hashtags, emojis, travessão (—) ou clichês de IA ("no mundo atual", "vale destacar", etc.).

Retorne EXCLUSIVAMENTE um JSON array válido:
[
  { "title": "...", "summary": "...", "funnelStage": "C0|C1|C2|C3" }
]
Sem markdown, sem cercas de código, sem texto extra.`;

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

    const { transcript, brain } = await req.json();
    if (typeof transcript !== 'string' || !transcript.trim()) return json({ error: 'Empty transcript' }, 400);

    const brainContext = brain ? `\n\n## Perfil do médico (para calibrar):\n${JSON.stringify(brain).slice(0, 2000)}` : '';

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        system: SYSTEM,
        messages: [{ role: 'user', content: `Transcrição anonimizada:\n${transcript}${brainContext}` }],
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
    if (!Array.isArray(parsed)) return json({ error: 'expected array' }, 502);

    return json({ topics: parsed });
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
