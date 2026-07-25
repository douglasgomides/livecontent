// dispatch-publish-webhook — dispara um POST para a URL configurada pelo médico
// para o canal da peça, e grava o resultado no publish_jobs.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { job_id } = await req.json();
    if (!job_id) return json({ error: 'Missing job_id' }, 400);

    const { data: job, error: jErr } = await supabase
      .from('publish_jobs').select('*').eq('id', job_id).maybeSingle();
    if (jErr || !job) return json({ error: 'Job not found' }, 404);
    if (job.user_id !== userId) return json({ error: 'Forbidden' }, 403);

    const { data: piece, error: pErr } = await supabase
      .from('content_pieces').select('*').eq('id', job.piece_id).maybeSingle();
    if (pErr || !piece) return json({ error: 'Piece not found' }, 404);

    const { data: settings } = await supabase
      .from('doctor_settings').select('*').eq('user_id', userId).maybeSingle();
    const webhooks: Record<string, string> = (settings?.webhooks as any) ?? {};
    const url = webhooks[job.channel];

    if (!url) {
      await supabase.from('publish_jobs').update({
        status: 'needs_connection',
        message: `Nenhuma webhook configurada para ${job.channel}. Configure em Ajustes.`,
      }).eq('id', job_id);
      return json({ ok: false, needs_connection: true });
    }

    await supabase.from('publish_jobs').update({ status: 'publishing' }).eq('id', job_id);

    const payload = {
      channel: job.channel,
      format: job.format,
      title: job.title,
      body: piece.body,
      meta: piece.meta,
      artwork: piece.artwork,
      external_prompts: piece.external_prompts,
      scheduled_at: job.scheduled_at,
      session_id: job.session_id,
      piece_id: piece.id,
    };

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const ok = r.ok;
      const text = await r.text();
      await supabase.from('publish_jobs').update({
        status: ok ? 'published' : 'failed',
        message: ok ? 'Webhook aceito' : `HTTP ${r.status}: ${text.slice(0, 300)}`,
      }).eq('id', job_id);
      return json({ ok, status: r.status, message: text.slice(0, 300) });
    } catch (err) {
      await supabase.from('publish_jobs').update({
        status: 'failed',
        message: `Erro de rede: ${String((err as Error).message ?? err).slice(0, 300)}`,
      }).eq('id', job_id);
      return json({ ok: false, error: String((err as Error).message ?? err) }, 502);
    }
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
