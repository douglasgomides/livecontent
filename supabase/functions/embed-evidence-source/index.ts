// embed-evidence-source — calcula o embedding de uma fonte de evidência recém
// cadastrada (ou recadastrada) pra alimentar a busca por relevância semântica.
// Chamado best-effort logo após cadastrar uma fonte — nunca bloqueia o cadastro
// se falhar (o cliente só loga o warning, a fonte continua existindo sem
// embedding até uma nova tentativa).
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) return json({ error: 'OPENAI_API_KEY not configured' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const { source_id } = await req.json();
    if (!source_id) return json({ error: 'Missing source_id' }, 400);

    const { data: source, error: sErr } = await supabase
      .from('evidence_sources').select('*').eq('id', source_id).maybeSingle();
    if (sErr || !source) return json({ error: 'Source not found' }, 404);

    const text = [
      source.title, source.authors, source.journal, source.summary,
      Array.isArray(source.tags) ? source.tags.join(', ') : '',
    ].filter(Boolean).join('\n').slice(0, 6000);

    const r = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!r.ok) { const t = await r.text(); return json({ error: `openai embeddings: ${t.slice(0, 300)}` }, 502); }
    const embData = await r.json();
    const vector: number[] = embData.data?.[0]?.embedding ?? [];
    if (!vector.length) return json({ error: 'Empty embedding' }, 502);

    const { error: upErr } = await supabase
      .from('evidence_sources')
      .update({ embedding: `[${vector.join(',')}]` })
      .eq('id', source_id);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    console.error('[embed-evidence-source]', e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
