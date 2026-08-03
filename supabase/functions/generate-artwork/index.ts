// generate-artwork — gera a ARTE visual (slides) de UMA peça já existente, sob
// demanda (botão "Gerar arte" no piece). Separado do run-pipeline de propósito:
// mantém a geração de conteúdo rápida, e só paga o custo extra de IA pra arte
// quando o médico realmente quer baixar a imagem/vídeo daquele piece.
import { corsHeaders } from '../_shared/cors.ts';
import { ARTWORK_DIMS, generateArtworkSlides } from '../_shared/artwork.ts';
import { generateImageBase64, base64ToUint8Array } from '../_shared/gptImage.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { piece_id, background_prompt } = await req.json();
    if (!piece_id) return json({ error: 'Missing piece_id' }, 400);

    const { data: piece, error: pErr } = await supabase.from('content_pieces').select('*').eq('id', piece_id).maybeSingle();
    if (pErr || !piece) return json({ error: 'Piece not found' }, 404);
    if (piece.user_id !== userId) return json({ error: 'Forbidden' }, 403);
    const dims = ARTWORK_DIMS[piece.format];
    if (!dims) return json({ error: `Formato "${piece.format}" não tem arte visual (só texto)` }, 400);

    const { data: topicRow } = piece.topic_id
      ? await supabase.from('topics').select('*').eq('id', piece.topic_id).maybeSingle()
      : { data: null };
    const topic = topicRow
      ? { title: topicRow.title, summary: topicRow.summary, funnelStage: topicRow.funnel_stage }
      : { title: piece.meta?.title ?? 'Tema', summary: piece.body?.slice(0, 200) ?? '' };

    const { data: session } = await supabase.from('sessions').select('anonymized_transcript, raw_transcript').eq('id', piece.session_id).maybeSingle();
    const transcript = session?.anonymized_transcript ?? session?.raw_transcript ?? piece.body ?? '';

    const { data: brainRow } = await supabase.from('brains').select('*').eq('user_id', userId).maybeSingle();
    const brain = brainRow ? { doctor: brainRow.doctor, patient: brainRow.patient, brand: brainRow.brand } : null;

    const { data: evidenceRows } = await supabase
      .from('evidence_sources').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(30);

    let referenceStructure: string | null = null;
    if (piece.reference_style_id) {
      const { data: refRow } = await supabase
        .from('reference_styles').select('structure_description')
        .eq('id', piece.reference_style_id).eq('user_id', userId).maybeSingle();
      referenceStructure = refRow?.structure_description ?? null;
    }

    // Fundo gerado por IA é opcional (o médico digita um prompt antes de gerar);
    // se falhar, a arte em texto ainda sai — só avisamos que o fundo não veio,
    // nunca fingimos que deu certo.
    let backgroundImagePath: string | null = null;
    let backgroundGenerationFailed = false;
    if (typeof background_prompt === 'string' && background_prompt.trim()) {
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      const imageB64 = openaiKey ? await generateImageBase64(openaiKey, background_prompt, dims.width, dims.height) : null;
      if (imageB64) {
        const bgPath = `${userId}/${crypto.randomUUID()}.png`;
        const { error: bgErr } = await supabase.storage
          .from('ai-backgrounds')
          .upload(bgPath, base64ToUint8Array(imageB64), { contentType: 'image/png' });
        if (!bgErr) backgroundImagePath = bgPath;
        else backgroundGenerationFailed = true;
      } else {
        backgroundGenerationFailed = true;
      }
    }

    const slides = await generateArtworkSlides(anthropicKey, piece.format, topic, transcript, brain, evidenceRows ?? [], referenceStructure);
    const artwork = { ...dims, slides, backgroundImagePath };

    const { error: updErr } = await supabase.from('content_pieces').update({ artwork }).eq('id', piece_id);
    if (updErr) return json({ error: updErr.message }, 500);

    return json({ artwork, backgroundGenerationFailed });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
