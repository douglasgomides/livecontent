// transcribe-audio — chama OpenAI Whisper para transcrever áudio a partir do Storage.
// Requer: OPENAI_API_KEY em Project Settings → Secrets.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
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

    const { audio_path } = await req.json();
    if (!audio_path || !audio_path.startsWith(`${userId}/`)) {
      return json({ error: 'Invalid audio_path' }, 400);
    }

    // Download audio from private bucket using the user's client (RLS enforced).
    const { data: blob, error: dlErr } = await supabase.storage.from('consultation-audio').download(audio_path);
    if (dlErr || !blob) return json({ error: `download failed: ${dlErr?.message}` }, 400);

    const form = new FormData();
    form.append('file', blob, audio_path.split('/').pop() ?? 'audio.webm');
    form.append('model', 'whisper-1');
    form.append('language', 'pt');
    form.append('response_format', 'json');

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    });
    if (!r.ok) {
      const t = await r.text();
      return json({ error: `whisper error: ${t.slice(0, 500)}` }, 502);
    }
    const data = await r.json();
    return json({ transcript: data.text ?? '' });
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
