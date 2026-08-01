// evidence-audio-debate — gera um resumo em áudio "debatido" por duas vozes
// (estilo NotebookLM) sobre uma fonte de evidência. Em vez de costurar os
// áudios num arquivo só (sem lib de áudio disponível no runtime da edge
// function), devolve uma LISTA DE SEGMENTOS — o cliente toca em sequência.
// Cacheado por fonte (evidence_sources.audio_debate_segments).
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CLAUDE = 'claude-sonnet-4-5';
const VOICE_BY_SPEAKER: Record<string, string> = { A: 'nova', B: 'onyx' };
const MAX_TURNS = 8;

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

    const { source_id } = await req.json();
    if (!source_id) return json({ error: 'Missing source_id' }, 400);

    const { data: source, error: sErr } = await supabase
      .from('evidence_sources').select('*').eq('id', source_id).maybeSingle();
    if (sErr || !source) return json({ error: 'Source not found' }, 404);

    // Já existe debate gerado — só renova as signed URLs de cada segmento.
    if (Array.isArray(source.audio_debate_segments) && source.audio_debate_segments.length) {
      const segments = await signSegments(supabase, source.audio_debate_segments);
      return json({ segments, cached: true });
    }

    const turns = await claudeDebateScript(anthropicKey, source);
    if (!turns.length) return json({ error: 'Não foi possível gerar o roteiro do debate' }, 502);

    const stored: { speaker: string; text: string; path: string }[] = [];
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const voice = VOICE_BY_SPEAKER[turn.speaker] ?? 'alloy';
      const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', voice, input: turn.text, response_format: 'mp3' }),
      });
      if (!ttsRes.ok) { const t = await ttsRes.text(); return json({ error: `openai tts: ${t.slice(0, 300)}` }, 502); }
      const buffer = await ttsRes.arrayBuffer();
      const path = `${userId}/${source_id}_debate_${i}.mp3`;
      const { error: upErr } = await supabase.storage
        .from('evidence-audio').upload(path, buffer, { contentType: 'audio/mpeg', upsert: true });
      if (upErr) return json({ error: upErr.message }, 500);
      stored.push({ speaker: turn.speaker, text: turn.text, path });
    }

    await supabase.from('evidence_sources').update({ audio_debate_segments: stored }).eq('id', source_id);

    const segments = await signSegments(supabase, stored);
    return json({ segments, cached: false });
  } catch (e) {
    console.error('[evidence-audio-debate]', e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

async function signSegments(supabase: any, stored: { speaker: string; text: string; path: string }[]) {
  const segments = [];
  for (const s of stored) {
    const { data: signed, error } = await supabase.storage.from('evidence-audio').createSignedUrl(s.path, 3600);
    if (!error && signed?.signedUrl) {
      segments.push({ speaker: s.speaker, text: s.text, audio_url: signed.signedUrl });
    }
  }
  return segments;
}

async function claudeDebateScript(key: string, source: any): Promise<{ speaker: 'A' | 'B'; text: string }[]> {
  const system = `Você escreve roteiros de DEBATE em áudio entre duas pessoas (locutor A e
especialista B) discutindo um artigo/diretriz científica, em português brasileiro, pra ser
NARRADO em voz alta — nunca em formato de texto escrito. A: faz perguntas curiosas e reformula
em linguagem simples. B: explica o achado com propriedade, sem jargão desnecessário. Tom natural
de conversa, frases curtas, sem markdown. Máximo ${MAX_TURNS} falas alternadas (A, B, A, B...).
Nunca invente dado que não esteja no resumo fornecido.

Retorne SÓ um JSON array, sem markdown: [{"speaker":"A"|"B","text":"..."}]`;
  const user = `Título: ${source.title}
Autores: ${source.authors ?? 'não informado'}
Revista/fonte: ${source.journal ?? 'não informado'}
Nível de evidência: ${source.evidence_level}
Resumo: ${source.summary ?? '(sem resumo cadastrado — debata só com base no título e metadados acima)'}`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: CLAUDE, max_tokens: 1500, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const text = (data.content?.[0]?.text ?? '').trim().replace(/^```json\s*|\s*```$/g, '');
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t: any) => (t?.speaker === 'A' || t?.speaker === 'B') && typeof t?.text === 'string' && t.text.trim())
      .slice(0, MAX_TURNS)
      .map((t: any) => ({ speaker: t.speaker, text: String(t.text).slice(0, 600) }));
  } catch {
    return [];
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
