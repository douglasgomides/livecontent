// check-avatar-video-status — polling leve chamado pelo cliente enquanto um
// vídeo de avatar (HeyGen) está 'processing'. Sem cron: o próprio componente
// no navegador chama isso a cada alguns segundos enquanto a tela do médico
// estiver aberta, igual outras gerações sob demanda desta ferramenta.
import { corsHeaders } from '../_shared/cors.ts';
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

    const { avatar_video_id } = await req.json();
    if (!avatar_video_id) return json({ error: 'Missing avatar_video_id' }, 400);

    const { data: job, error: jErr } = await supabase
      .from('avatar_videos').select('*').eq('id', avatar_video_id).maybeSingle();
    if (jErr || !job) return json({ error: 'Vídeo não encontrado' }, 404);
    if (job.user_id !== userId) return json({ error: 'Forbidden' }, 403);

    if (job.status !== 'processing' || !job.heygen_video_id) return json(job);

    const { data: settings } = await supabase
      .from('doctor_settings').select('heygen_api_key').eq('user_id', userId).maybeSingle();
    if (!settings?.heygen_api_key) return json(job);

    const r = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(job.heygen_video_id)}`, {
      headers: { 'X-Api-Key': settings.heygen_api_key },
    });
    const body = await r.json();
    const status = body?.data?.status;

    if (status === 'completed') {
      const { data: updated } = await supabase
        .from('avatar_videos')
        .update({ status: 'completed', video_url: body.data.video_url, updated_at: new Date().toISOString() })
        .eq('id', job.id).select('*').single();
      return json(updated ?? job);
    }
    if (status === 'failed') {
      const errMsg = body?.data?.error?.message || 'Falha na geração do vídeo';
      const { data: updated } = await supabase
        .from('avatar_videos')
        .update({ status: 'failed', error: String(errMsg).slice(0, 300), updated_at: new Date().toISOString() })
        .eq('id', job.id).select('*').single();
      return json(updated ?? job);
    }
    // pending/waiting/processing — continua igual, só devolve o estado atual
    return json(job);
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
