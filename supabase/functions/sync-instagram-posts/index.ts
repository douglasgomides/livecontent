// sync-instagram-posts — disparada por pg_cron (nunca pelo app/usuário direto).
// Pra cada médico com brains.instagram_account_id configurado, busca o desempenho
// real dos posts recentes via API REST do Windsor.ai (chave própria do médico/agência,
// guardada como secret WINDSOR_API_KEY) e faz upsert em social_post_performance.
// Protegida por CRON_SECRET (header x-cron-secret) em vez de JWT de usuário — só o
// job agendado no Postgres deve conseguir chamar isso.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const WINDSOR_FIELDS = [
  'media_id', 'media_permalink', 'media_caption', 'media_type', 'timestamp',
  'media_like_count', 'media_comments_count', 'media_reach', 'media_saved',
  'media_shares', 'media_engagement',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const windsorKey = Deno.env.get('WINDSOR_API_KEY');
  if (!windsorKey) return json({ error: 'WINDSOR_API_KEY not configured' }, 500);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: brains, error: brainsErr } = await supabase
    .from('brains').select('user_id, instagram_account_id')
    .not('instagram_account_id', 'is', null);
  if (brainsErr) return json({ error: brainsErr.message }, 500);
  if (!brains || !brains.length) return json({ ok: true, doctors: 0, posts: 0 });

  let totalPosts = 0;
  const errors: string[] = [];

  for (const brain of brains) {
    try {
      const url = new URL(`https://connectors.windsor.ai/instagram`);
      url.searchParams.set('api_key', windsorKey);
      url.searchParams.set('fields', WINDSOR_FIELDS.join(','));
      url.searchParams.set('accounts', brain.instagram_account_id);
      url.searchParams.set('date_preset', 'last_30dT');

      const r = await fetch(url.toString());
      if (!r.ok) { errors.push(`${brain.instagram_account_id}: windsor ${r.status}`); continue; }
      const body = await r.json();
      const rows: any[] = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []);
      if (!rows.length) continue;

      const upsertRows = rows
        .filter(row => row.media_id)
        .map(row => ({
          user_id: brain.user_id,
          platform: 'instagram',
          external_media_id: String(row.media_id),
          permalink: row.media_permalink ?? null,
          caption: row.media_caption ?? null,
          media_type: row.media_type ?? null,
          posted_at: row.timestamp ?? null,
          likes: Number(row.media_like_count) || 0,
          comments: Number(row.media_comments_count) || 0,
          reach: row.media_reach != null ? Number(row.media_reach) : null,
          saved: row.media_saved != null ? Number(row.media_saved) : null,
          shares: row.media_shares != null ? Number(row.media_shares) : null,
          engagement: row.media_engagement != null ? Number(row.media_engagement) : null,
          synced_at: new Date().toISOString(),
        }));

      const { error: upsertErr } = await supabase
        .from('social_post_performance')
        .upsert(upsertRows, { onConflict: 'user_id,platform,external_media_id' });
      if (upsertErr) { errors.push(`${brain.instagram_account_id}: ${upsertErr.message}`); continue; }
      totalPosts += upsertRows.length;
    } catch (e) {
      errors.push(`${brain.instagram_account_id}: ${String((e as Error).message ?? e)}`);
    }
  }

  return json({ ok: true, doctors: brains.length, posts: totalPosts, errors });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
