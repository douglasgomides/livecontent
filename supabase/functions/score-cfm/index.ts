// score-cfm — julga compliance publicitária médica (CFM) por CONTEXTO, não por
// palavra-chave. Usado pelo botão "Rescan" no cliente após edição manual.
import { corsHeaders } from '../_shared/cors.ts';
import { scoreCFMSemantic } from '../_shared/cfm.ts';
import { checkAndRecordRateLimit } from '../_shared/rateLimit.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const rl = await checkAndRecordRateLimit(supabase, userId, 'score-cfm');
    if (!rl.allowed) return json({ error: rl.message }, 429);

    const { body } = await req.json();
    if (typeof body !== 'string' || !body.trim()) return json({ error: 'Empty body' }, 400);

    const result = await scoreCFMSemantic(key, body);
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
