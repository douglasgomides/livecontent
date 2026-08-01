// check-evidence-topic-watches — disparada por pg_cron (nunca pelo app direto,
// mesmo padrão de sync-instagram-posts: protegida por CRON_SECRET). Pra cada
// tema que o médico assinou, busca na web (via Claude) o que há de novo desde
// a última checagem e grava em evidence_topic_updates. Só busca tema que não
// foi checado nos últimos CHECK_INTERVAL_DAYS — evita repesquisar todo dia.
import { corsHeaders } from '../_shared/cors.ts';
import { scoreViralitySemantic } from '../_shared/virality.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-sonnet-4-5';
const CHECK_INTERVAL_DAYS = 3;

const SYSTEM = `Você é um pesquisador científico/médico. Use a busca na web pra encontrar
NOVIDADES REAIS E RECENTES sobre o tema informado — estudos novos, diretrizes atualizadas,
consensos, revisões. Nunca invente achado, fonte ou data. Se não houver nada genuinamente novo
desde o período informado, retorne um array vazio — não force resultado.

Retorne SÓ um JSON array (0 a 5 itens), sem markdown, sem texto fora do JSON:
[{"title":"título curto do achado/atualização","summary":"o que mudou ou o que foi encontrado, 1-2 frases","source_title":"título da fonte real","source_url":"URL real da fonte"}]`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const cutoff = new Date(Date.now() - CHECK_INTERVAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: watches, error: watchesErr } = await supabase
    .from('evidence_topic_watches')
    .select('id, user_id, topic, last_checked_at')
    .eq('active', true)
    .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`);
  if (watchesErr) return json({ error: watchesErr.message }, 500);
  if (!watches || !watches.length) return json({ ok: true, watches: 0, updates: 0 });

  let totalUpdates = 0;
  const errors: string[] = [];

  for (const watch of watches) {
    try {
      const sinceText = watch.last_checked_at
        ? `desde ${new Date(watch.last_checked_at).toLocaleDateString('pt-BR')}`
        : 'dos últimos 30 dias';
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1500,
          system: SYSTEM,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
          messages: [{ role: 'user', content: `Tema: ${watch.topic}. Busque novidades reais ${sinceText}.` }],
        }),
      });
      if (!r.ok) { errors.push(`${watch.topic}: anthropic ${r.status}`); continue; }
      const data = await r.json();
      const textBlocks = (data.content ?? []).filter((b: any) => b.type === 'text');
      const rawText = (textBlocks[textBlocks.length - 1]?.text ?? '').trim().replace(/^```json\s*|\s*```$/g, '');
      let items: any[] = [];
      try { items = JSON.parse(rawText); } catch { items = []; }

      if (Array.isArray(items) && items.length) {
        const candidates = items.slice(0, 5).map((it: any) => ({
          watch_id: watch.id,
          user_id: watch.user_id,
          title: String(it.title ?? '').slice(0, 300),
          summary: String(it.summary ?? '').slice(0, 500),
          source_title: it.source_title ? String(it.source_title).slice(0, 300) : null,
          source_url: it.source_url ? String(it.source_url).slice(0, 500) : null,
        })).filter(row => row.title && row.source_url);
        // Pontua o potencial de viralização de cada notícia encontrada como
        // matéria-prima — best-effort, uma falha aqui não impede salvar a novidade.
        const rows = await Promise.all(candidates.map(async row => ({
          ...row,
          virality: await scoreViralitySemantic(anthropicKey, { title: row.title, text: row.summary, contentType: 'noticia' }),
        })));
        if (rows.length) {
          const { error: insErr } = await supabase.from('evidence_topic_updates').insert(rows);
          if (insErr) errors.push(`${watch.topic}: ${insErr.message}`);
          else totalUpdates += rows.length;
        }
      }

      await supabase.from('evidence_topic_watches').update({ last_checked_at: new Date().toISOString() }).eq('id', watch.id);
    } catch (e) {
      errors.push(`${watch.topic}: ${String((e as Error).message ?? e)}`);
    }
  }

  return json({ ok: true, watches: watches.length, updates: totalUpdates, errors });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
