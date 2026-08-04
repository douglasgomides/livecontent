// generate-ad-creative — sob demanda (botão em Anúncios). Gera o criativo de
// um anúncio pago: imagem de fundo (gpt-image-1, sem texto embutido — o copy
// fica em campos separados, igual ao Gerenciador de Anúncios de verdade) +
// headline/texto principal/descrição. O médico baixa a imagem e cola o texto
// direto no Ads Manager — a gente não cria nem publica campanha nenhuma, só
// o criativo (mesmo princípio de "IA sugere, médico decide e executa" de toda
// a página de Anúncios).
import { corsHeaders } from '../_shared/cors.ts';
import { AD_DIMENSIONS } from '../_shared/artwork.ts';
import { generateAdCopy } from '../_shared/adCreative.ts';
import { generateImageBase64, base64ToUint8Array } from '../_shared/gptImage.ts';
import { checkAndRecordRateLimit } from '../_shared/rateLimit.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const rl = await checkAndRecordRateLimit(supabase, userId, 'generate-ad-creative');
    if (!rl.allowed) return json({ error: rl.message }, 429);

    const { prompt, dimension } = await req.json();
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) return json({ error: 'Missing prompt' }, 400);
    const dims = AD_DIMENSIONS[dimension];
    if (!dims) return json({ error: `Dimensão "${dimension}" inválida` }, 400);

    const { data: brainRow } = await supabase.from('brains').select('doctor, patient, brand').eq('user_id', userId).maybeSingle();

    const [copy, imageB64] = await Promise.all([
      generateAdCopy(anthropicKey, prompt, brainRow ?? null),
      generateImageBase64(openaiKey, prompt, dims.width, dims.height),
    ]);
    if (!copy) return json({ error: 'Falha ao gerar o texto do anúncio' }, 502);
    if (!imageB64) return json({ error: 'Falha ao gerar a imagem' }, 502);

    const path = `${userId}/${crypto.randomUUID()}.png`;
    const { error: upErr } = await supabase.storage
      .from('ad-creatives')
      .upload(path, base64ToUint8Array(imageB64), { contentType: 'image/png' });
    if (upErr) return json({ error: upErr.message }, 500);

    const { data: row, error: insErr } = await supabase.from('ad_creatives').insert({
      user_id: userId,
      prompt,
      dimension,
      headline: copy.headline,
      primary_text: copy.primaryText,
      description: copy.description,
      image_path: path,
    }).select('*').single();
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ creative: row });
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
