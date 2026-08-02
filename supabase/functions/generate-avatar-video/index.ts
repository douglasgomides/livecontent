// generate-avatar-video — inicia a geração de um vídeo do médico com o
// PRÓPRIO avatar clonado no HeyGen (nunca um avatar de estoque), lendo o
// roteiro de UMA peça específica. Sempre sob demanda — o médico clica, nunca
// roda sozinho no pipeline. Usa a chave/avatar_id/voice_id da conta HeyGen do
// próprio médico (guardados em doctor_settings), nunca um secret da plataforma.
// A geração em si é assíncrona do lado do HeyGen — esta função só inicia o
// job e devolve a linha criada; o cliente faz polling via
// check-avatar-video-status enquanto o status ficar 'processing'.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_SCRIPT_CHARS = 4500; // limite do HeyGen é 5000, deixa margem

// Roteiro pro avatar FALAR precisa ser texto corrido, não markdown — tira
// símbolos de formatação (títulos, negrito, listas, links) sem tentar
// reescrever o conteúdo.
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~`>#]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, MAX_SCRIPT_CHARS);
}

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

    const { piece_id } = await req.json();
    if (!piece_id) return json({ error: 'Missing piece_id' }, 400);

    const { data: piece, error: pErr } = await supabase
      .from('content_pieces').select('id, user_id, body').eq('id', piece_id).maybeSingle();
    if (pErr || !piece) return json({ error: 'Peça não encontrada' }, 404);
    if (piece.user_id !== userId) return json({ error: 'Forbidden' }, 403);

    const { data: settings } = await supabase
      .from('doctor_settings').select('heygen_api_key, heygen_avatar_id, heygen_voice_id').eq('user_id', userId).maybeSingle();
    if (!settings?.heygen_api_key || !settings?.heygen_avatar_id || !settings?.heygen_voice_id) {
      return json({ error: 'Configure sua conta HeyGen (chave, avatar e voz) em Ajustes antes de gerar vídeo.' }, 400);
    }

    const script = stripMarkdown(piece.body || '');
    if (!script) return json({ error: 'Peça sem texto pra virar roteiro' }, 400);

    const { data: job, error: jErr } = await supabase
      .from('avatar_videos')
      .insert({ user_id: userId, content_piece_id: piece_id, status: 'processing' })
      .select('*')
      .single();
    if (jErr || !job) return json({ error: 'Falha ao criar registro do vídeo' }, 500);

    try {
      const r = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: { 'X-Api-Key': settings.heygen_api_key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_inputs: [{
            character: { type: 'avatar', avatar_id: settings.heygen_avatar_id, avatar_style: 'normal' },
            voice: { type: 'text', input_text: script, voice_id: settings.heygen_voice_id },
            background: { type: 'color', value: '#FAFAFA' },
          }],
          dimension: { width: 720, height: 1280 },
        }),
      });
      const body = await r.json();
      const heygenVideoId = body?.data?.video_id;
      if (!r.ok || !heygenVideoId) {
        const msg = body?.message || body?.error?.message || `HeyGen retornou ${r.status}`;
        await supabase.from('avatar_videos').update({ status: 'failed', error: String(msg).slice(0, 300) }).eq('id', job.id);
        return json({ error: String(msg).slice(0, 300) }, 502);
      }
      const { data: updated } = await supabase
        .from('avatar_videos').update({ heygen_video_id: heygenVideoId }).eq('id', job.id).select('*').single();
      return json(updated ?? job);
    } catch (err) {
      const msg = `Erro de rede: ${String((err as Error).message ?? err).slice(0, 300)}`;
      await supabase.from('avatar_videos').update({ status: 'failed', error: msg }).eq('id', job.id);
      return json({ error: msg }, 502);
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
