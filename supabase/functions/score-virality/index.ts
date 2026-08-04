// score-virality — julga potencial de viralização/qualidade (gancho, retenção,
// compartilhabilidade), estilo Opus Clip. Usado pelo rescan manual no cliente
// (tema, artigo, peça) — stateless, quem chama decide onde persistir o resultado.
import { corsHeaders } from '../_shared/cors.ts';
import { scoreViralitySemantic, type ViralityContentType } from '../_shared/virality.ts';
import { checkAndRecordRateLimit } from '../_shared/rateLimit.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const VALID_TYPES: ViralityContentType[] = ['tema', 'artigo', 'noticia', 'peca'];

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
    const userId = claims.claims.sub;

    const rl = await checkAndRecordRateLimit(supabase, userId, 'score-virality');
    if (!rl.allowed) return json({ error: rl.message }, 429);

    const { title, text, contentType } = await req.json();
    if (typeof text !== 'string' || !text.trim()) return json({ error: 'Empty text' }, 400);
    const type: ViralityContentType = VALID_TYPES.includes(contentType) ? contentType : 'peca';

    const result = await scoreViralitySemantic(key, { title, text, contentType: type });
    return json(result);
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
