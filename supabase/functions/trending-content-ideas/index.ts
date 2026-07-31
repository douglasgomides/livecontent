// trending-content-ideas — pesquisa real (via web search nativo do Claude) do que
// está performando em redes sociais pra uma especialidade médica, e cacheia o
// resultado por até CACHE_DAYS pra não pesquisar de novo a cada abertura de tela.
// Não inventa dado: só retorna o que a busca real trouxe, com fonte citada.
// Diferente de trending-topics (PubMed/Google News, foco em evidência) — aqui o
// foco é padrão de conteúdo social (formato, gancho, porque funciona).
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-sonnet-4-5';
const CACHE_DAYS = 7;

const SYSTEM = `Você é um pesquisador de tendências de conteúdo médico em redes sociais.
Use a busca na web pra encontrar informação REAL e ATUAL sobre o que está performando bem em
Instagram/TikTok pra médicos da especialidade informada, no Brasil. Baseie-se em fontes reais
(artigos de marketing médico, análises de tendências, roundups de conteúdo, cases publicados) —
nunca invente um post, número ou fonte que não veio de uma busca real.

Depois de pesquisar, retorne SÓ um JSON array (5 a 8 itens), sem markdown, sem texto fora do JSON:
[{"topic":"tema/ângulo específico de conteúdo","why_it_works":"por que esse padrão funciona (gancho psicológico, formato, timing)","suggested_format":"reel|carousel|caption|stories|linkedin","source_title":"título da fonte real","source_url":"URL real da fonte"}]

Se a busca não encontrar nada específico pra especialidade, generalize pra conteúdo médico/saúde
em geral — mas sempre com fonte real. Nunca deixe source_url vazio ou inventado.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { data: brainRow } = await userClient.from('brains').select('doctor').eq('user_id', userId).maybeSingle();
    const specialty = String((brainRow?.doctor as any)?.specialty ?? '').trim();
    if (!specialty) return json({ error: 'Cadastre sua especialidade em Meu Consultório antes de buscar tendências.' }, 400);
    const specialtyKey = specialty.toLowerCase();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let forceRefresh = false;
    try {
      const body = await req.json();
      forceRefresh = body?.refresh === true;
    } catch {
      // corpo vazio é válido (chamada sem opções) — só significa "sem refresh forçado"
    }

    if (!forceRefresh) {
      const cacheCutoff = new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: cached } = await admin
        .from('trending_content_ideas')
        .select('*')
        .ilike('specialty', specialtyKey)
        .gte('fetched_at', cacheCutoff)
        .order('fetched_at', { ascending: false });
      if (cached && cached.length) return json({ ideas: cached, cached: true });
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
        messages: [{ role: 'user', content: `Especialidade médica: ${specialty}. Pesquise e retorne as ideias agora.` }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return json({ error: `anthropic error: ${t.slice(0, 500)}` }, 502);
    }
    const data = await r.json();
    // Com tools server-side (web_search), a resposta pode ter vários blocos
    // (server_tool_use, web_search_tool_result, text...) — o texto final do
    // modelo (com o JSON pedido) é o último bloco type:"text".
    const textBlocks = (data.content ?? []).filter((b: any) => b.type === 'text');
    const rawText = (textBlocks[textBlocks.length - 1]?.text ?? '').trim();
    const cleaned = rawText.replace(/^```json\s*|\s*```$/g, '');
    let ideas: any[];
    try {
      ideas = JSON.parse(cleaned);
    } catch {
      return json({ error: 'A pesquisa não retornou um formato válido. Tente de novo.' }, 502);
    }
    if (!Array.isArray(ideas) || !ideas.length) {
      return json({ error: 'Nenhuma tendência encontrada pra essa especialidade agora.' }, 502);
    }

    const rows = ideas.slice(0, 8).map((idea: any) => ({
      specialty: specialtyKey,
      topic: String(idea.topic ?? '').slice(0, 300),
      why_it_works: String(idea.why_it_works ?? '').slice(0, 500),
      suggested_format: idea.suggested_format ? String(idea.suggested_format).slice(0, 40) : null,
      source_title: idea.source_title ? String(idea.source_title).slice(0, 300) : null,
      source_url: idea.source_url ? String(idea.source_url).slice(0, 500) : null,
    }));

    const { data: inserted, error: insErr } = await admin
      .from('trending_content_ideas')
      .insert(rows)
      .select('*');
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ ideas: inserted, cached: false });
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
