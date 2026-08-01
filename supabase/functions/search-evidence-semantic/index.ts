// search-evidence-semantic — ranqueia a biblioteca de evidências do médico por
// relevância semântica real (embeddings), em vez de listar tudo solto. Fontes
// que ainda não têm embedding calculado (falha de embed-evidence-source, ou
// cadastradas antes desse recurso existir) simplesmente não aparecem — nunca
// quebra a busca por causa de uma fonte incompleta.
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
    const userId = claims.claims.sub;

    const { query } = await req.json();
    if (!query || typeof query !== 'string') return json({ error: 'Missing query' }, 400);

    const r = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: query.slice(0, 2000) }),
    });
    if (!r.ok) { const t = await r.text(); return json({ error: `openai embeddings: ${t.slice(0, 300)}` }, 502); }
    const embData = await r.json();
    const vector: number[] = embData.data?.[0]?.embedding ?? [];
    if (!vector.length) return json({ error: 'Empty embedding' }, 502);

    const { data, error } = await supabase.rpc('match_evidence_sources', {
      query_embedding: `[${vector.join(',')}]`,
      match_user_id: userId,
      match_count: 15,
    });
    if (error) return json({ error: error.message }, 500);

    return json({ results: data ?? [] });
  } catch (e) {
    console.error('[search-evidence-semantic]', e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
