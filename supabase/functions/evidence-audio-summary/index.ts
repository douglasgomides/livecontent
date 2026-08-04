// evidence-audio-summary — gera (ou reaproveita) um resumo em áudio de uma
// fonte de evidência, pro médico ouvir em vez de ler. Cacheado por fonte
// (audio_summary_path) — só chama Claude + TTS na primeira vez; depois disso
// só gera uma nova signed URL pro mesmo arquivo.
import { corsHeaders } from '../_shared/cors.ts';
import { checkAndRecordRateLimit } from '../_shared/rateLimit.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CLAUDE = 'claude-sonnet-4-5';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
    if (!openaiKey) return json({ error: 'OPENAI_API_KEY not configured' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const rl = await checkAndRecordRateLimit(supabase, userId, 'evidence-audio-summary');
    if (!rl.allowed) return json({ error: rl.message }, 429);

    const { source_id } = await req.json();
    if (!source_id) return json({ error: 'Missing source_id' }, 400);

    const { data: source, error: sErr } = await supabase
      .from('evidence_sources').select('*').eq('id', source_id).maybeSingle();
    if (sErr || !source) return json({ error: 'Source not found' }, 404);

    // Já existe áudio gerado — só renova a signed URL, sem reprocessar.
    if (source.audio_summary_path) {
      const { data: signed, error: signErr } = await supabase.storage
        .from('evidence-audio').createSignedUrl(source.audio_summary_path, 3600);
      if (!signErr && signed?.signedUrl) {
        return json({ audio_url: signed.signedUrl, path: source.audio_summary_path, cached: true });
      }
      // se a signed URL falhar (ex: arquivo removido do bucket), regenera abaixo.
    }

    const summaryText = await claudeSummary(anthropicKey, source);

    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', voice: 'alloy', input: summaryText, response_format: 'mp3' }),
    });
    if (!ttsRes.ok) { const t = await ttsRes.text(); return json({ error: `openai tts: ${t.slice(0, 300)}` }, 502); }
    const audioBuffer = await ttsRes.arrayBuffer();

    const path = `${userId}/${source_id}.mp3`;
    const { error: upErr } = await supabase.storage
      .from('evidence-audio')
      .upload(path, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) return json({ error: upErr.message }, 500);

    await supabase.from('evidence_sources').update({ audio_summary_path: path }).eq('id', source_id);

    const { data: signed, error: signErr } = await supabase.storage
      .from('evidence-audio').createSignedUrl(path, 3600);
    if (signErr || !signed?.signedUrl) return json({ error: signErr?.message ?? 'Falha ao gerar link do áudio' }, 500);

    return json({ audio_url: signed.signedUrl, path, cached: false });
  } catch (e) {
    console.error('[evidence-audio-summary]', e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

async function claudeSummary(key: string, source: any): Promise<string> {
  const system = `Você resume artigos e diretrizes científicas em português brasileiro, em texto
pra ser LIDO EM VOZ ALTA por um narrador — nunca em formato de texto escrito (sem marcadores, sem
títulos, sem markdown). 150 a 220 palavras. Estrutura: o que o estudo/diretriz avaliou, o achado
principal em linguagem natural, e o nível de evidência. Tom direto, claro, sem jargão desnecessário.
Nunca invente dado que não esteja no resumo fornecido — se o resumo for curto, o áudio também é.`;
  const user = `Título: ${source.title}
Autores: ${source.authors ?? 'não informado'}
Revista/fonte: ${source.journal ?? 'não informado'}
Ano: ${source.year ?? 'não informado'}
Nível de evidência: ${source.evidence_level}
Resumo: ${source.summary ?? '(sem resumo cadastrado — narre só com base no título e metadados acima)'}`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: CLAUDE, max_tokens: 500, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  return (data.content?.[0]?.text ?? '').trim().slice(0, 1200);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
