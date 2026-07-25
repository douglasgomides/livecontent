// search-pubmed — busca real na API do PubMed (NCBI E-utilities, gratuita).
// Nunca inventa citação: só retorna artigos que realmente existem no PubMed,
// pro médico escolher quais adicionar à própria biblioteca de evidências.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

// Heurística de classificação por nível de evidência a partir do(s) tipo(s) de
// publicação que o próprio PubMed atribui ao artigo (nunca inventado por IA).
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

    const { query, maxResults } = await req.json();
    if (typeof query !== 'string' || !query.trim()) return json({ error: 'Missing query' }, 400);
    const retmax = Math.min(Math.max(Number(maxResults) || 10, 1), 20);

    const ncbiKey = Deno.env.get('NCBI_API_KEY'); // opcional — sem key, limite de 3 req/s já é suficiente aqui
    const keyParam = ncbiKey ? `&api_key=${ncbiKey}` : '';

    // 1. esearch: acha os PMIDs que casam com a busca
    const searchUrl = `${EUTILS}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query.trim())}&retmax=${retmax}&retmode=json${keyParam}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return json({ error: `PubMed esearch falhou: ${searchRes.status}` }, 502);
    const searchData = await searchRes.json();
    const ids: string[] = searchData?.esearchresult?.idlist ?? [];
    if (!ids.length) return json({ results: [] });

    // 2. esummary: metadados reais dos artigos encontrados (título, autores, revista, ano, tipo)
    const summaryUrl = `${EUTILS}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json${keyParam}`;
    const summaryRes = await fetch(summaryUrl);
    if (!summaryRes.ok) return json({ error: `PubMed esummary falhou: ${summaryRes.status}` }, 502);
    const summaryData = await summaryRes.json();
    const uids: string[] = summaryData?.result?.uids ?? ids;

    const results = uids.map((pmid) => {
      const item = summaryData.result[pmid];
      if (!item) return null;
      const pubTypes: string[] = item.pubtype ?? [];
      const authors = Array.isArray(item.authors)
        ? item.authors.slice(0, 3).map((a: any) => a.name).join(', ') + (item.authors.length > 3 ? ' et al.' : '')
        : '';
      const year = parseInt(String(item.pubdate ?? '').match(/\d{4}/)?.[0] ?? '', 10) || null;
      return {
        pubmed_id: pmid,
        title: item.title ?? '(sem título)',
        authors,
        journal: item.fulljournalname ?? item.source ?? '',
        year,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        evidence_level: evidenceLevelFromPubTypes(pubTypes),
        pub_types: pubTypes,
      };
    }).filter(Boolean);

    return json({ results });
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
