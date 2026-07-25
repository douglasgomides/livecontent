// trending-topics — descoberta de temas em alta pra inspirar conteúdo, puxando de
// fontes reais: PubMed (artigos recentes) + Google News (saúde, BR e internacional).
// Nunca inventa notícia/estudo — só retorna o que essas fontes realmente publicaram.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

interface TrendingItem {
  kind: 'pubmed' | 'news_br' | 'news_intl';
  title: string;
  source: string;
  date: string | null;
  url: string;
  evidence_level?: string;
}

function evidenceLevelFromPubTypes(pubTypes: string[]): string {
  const t = pubTypes.map(p => p.toLowerCase());
  if (t.some(p => p.includes('meta-analysis'))) return 'meta_analysis';
  if (t.some(p => p.includes('systematic review'))) return 'systematic_review';
  if (t.some(p => p.includes('randomized controlled trial'))) return 'rct';
  if (t.some(p => p.includes('practice guideline') || p.includes('guideline'))) return 'guideline';
  if (t.some(p => p.includes('observational study') || p.includes('comparative study') || p.includes('cohort'))) return 'cohort';
  if (t.some(p => p.includes('case reports'))) return 'case_series';
  return 'other';
}

async function fetchPubmedRecent(query: string, retmax: number): Promise<TrendingItem[]> {
  try {
    const searchUrl = `${EUTILS}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${retmax}&sort=date&reldate=180&datetype=pdat&retmode=json`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const ids: string[] = searchData?.esearchresult?.idlist ?? [];
    if (!ids.length) return [];

    const summaryUrl = `${EUTILS}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
    const summaryRes = await fetch(summaryUrl);
    if (!summaryRes.ok) return [];
    const summaryData = await summaryRes.json();
    const uids: string[] = summaryData?.result?.uids ?? ids;

    return uids.map((pmid) => {
      const item = summaryData.result[pmid];
      if (!item) return null;
      return {
        kind: 'pubmed' as const,
        title: item.title ?? '(sem título)',
        source: item.fulljournalname ?? item.source ?? 'PubMed',
        date: item.pubdate ?? null,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        evidence_level: evidenceLevelFromPubTypes(item.pubtype ?? []),
      };
    }).filter(Boolean) as TrendingItem[];
  } catch (e) {
    console.warn('[trending] pubmed failed', e);
    return [];
  }
}

// Google News RSS é público, sem necessidade de API key — parsing leve por regex
// (formato do feed é estável: <item><title>/<link>/<pubDate>/<source>).
async function fetchGoogleNews(query: string, kind: 'news_br' | 'news_intl', limit: number): Promise<TrendingItem[]> {
  try {
    const params = kind === 'news_br'
      ? 'hl=pt-BR&gl=BR&ceid=BR:pt-BR'
      : 'hl=en-US&gl=US&ceid=US:en';
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${params}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const xml = await res.text();
    const items: TrendingItem[] = [];
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    for (const block of itemBlocks.slice(0, limit)) {
      const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
      const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
      const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
      const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.trim();
      if (!title || !link) continue;
      items.push({ kind, title: decodeXml(title), source: source ? decodeXml(source) : (kind === 'news_br' ? 'Notícia BR' : 'Notícia internacional'), date: pubDate ?? null, url: link });
    }
    return items;
  } catch (e) {
    console.warn(`[trending] ${kind} failed`, e);
    return [];
  }
}

function decodeXml(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
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
    const { data: claims, error } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { query: overrideQuery } = await req.json().catch(() => ({}));
    let query = (overrideQuery ?? '').trim();

    if (!query) {
      const { data: brainRow } = await supabase.from('brains').select('doctor').eq('user_id', userId).maybeSingle();
      const specialty = (brainRow?.doctor as any)?.specialty;
      query = specialty?.trim() || 'medicina geral';
    }

    const [pubmed, newsBr, newsIntl] = await Promise.all([
      fetchPubmedRecent(query, 6),
      fetchGoogleNews(`${query} saúde`, 'news_br', 5),
      fetchGoogleNews(`${query} health`, 'news_intl', 5),
    ]);

    return json({ query, results: [...pubmed, ...newsBr, ...newsIntl] });
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
