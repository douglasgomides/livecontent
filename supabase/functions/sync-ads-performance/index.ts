// sync-ads-performance — disparada por pg_cron (nunca pelo app/usuário direto),
// mesmo padrão de sync-instagram-posts. Pra cada médico com meta_ads_account_id/
// google_ads_account_id configurado em doctor_settings, busca o desempenho real
// via API REST do Windsor.ai (chave compartilhada da agência, WINDSOR_API_KEY)
// e faz upsert em ad_campaigns. Depois cruza com lead_captures.utm_campaign pra
// calcular CAC real e pede sugestões à IA (nunca executa nada sozinha — só
// grava sugestão pendente pro médico aprovar/descartar em Anúncios).
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { suggestAdActions } from '../_shared/adSuggestions.ts';

const WINDSOR_FIELDS = ['campaign', 'campaign_id', 'spend', 'impressions', 'clicks', 'status'];
const CONNECTOR_BY_PLATFORM: Record<string, string> = { meta: 'facebook', google: 'google_ads' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const windsorKey = Deno.env.get('WINDSOR_API_KEY');
  if (!windsorKey) return json({ error: 'WINDSOR_API_KEY not configured' }, 500);
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: doctors, error: doctorsErr } = await supabase
    .from('doctor_settings').select('user_id, meta_ads_account_id, google_ads_account_id')
    .or('meta_ads_account_id.not.is.null,google_ads_account_id.not.is.null');
  if (doctorsErr) return json({ error: doctorsErr.message }, 500);
  if (!doctors || !doctors.length) return json({ ok: true, doctors: 0, campaigns: 0 });

  let totalCampaigns = 0;
  const errors: string[] = [];

  for (const doctor of doctors) {
    const accountByPlatform: Record<string, string | null> = {
      meta: doctor.meta_ads_account_id, google: doctor.google_ads_account_id,
    };

    for (const [platform, accountId] of Object.entries(accountByPlatform)) {
      if (!accountId) continue;
      try {
        const connector = CONNECTOR_BY_PLATFORM[platform];
        const url = new URL(`https://connectors.windsor.ai/${connector}`);
        url.searchParams.set('api_key', windsorKey);
        url.searchParams.set('fields', WINDSOR_FIELDS.join(','));
        url.searchParams.set('accounts', accountId);
        url.searchParams.set('date_preset', 'last_30dT');

        const r = await fetch(url.toString());
        if (!r.ok) { errors.push(`${platform}/${accountId}: windsor ${r.status}`); continue; }
        const body = await r.json();
        const rows: any[] = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []);
        if (!rows.length) continue;

        const upsertRows = rows
          .filter(row => row.campaign_id)
          .map(row => ({
            user_id: doctor.user_id,
            platform,
            external_campaign_id: String(row.campaign_id),
            campaign_name: row.campaign ?? String(row.campaign_id),
            status: row.status ?? null,
            spend: Number(row.spend) || 0,
            impressions: Number(row.impressions) || 0,
            clicks: Number(row.clicks) || 0,
            date_preset: 'last_30dT',
            synced_at: new Date().toISOString(),
          }));

        const { error: upsertErr } = await supabase
          .from('ad_campaigns')
          .upsert(upsertRows, { onConflict: 'user_id,platform,external_campaign_id' });
        if (upsertErr) { errors.push(`${platform}/${accountId}: ${upsertErr.message}`); continue; }
        totalCampaigns += upsertRows.length;
      } catch (e) {
        errors.push(`${platform}/${accountId}: ${String((e as Error).message ?? e)}`);
      }
    }

    // Sugestões da IA — best-effort, cruzando com atribuição real de leads.
    if (anthropicKey) {
      try {
        const { data: campaigns } = await supabase
          .from('ad_campaigns').select('*').eq('user_id', doctor.user_id);
        if (campaigns && campaigns.length) {
          const { data: leads } = await supabase
            .from('lead_captures').select('utm_campaign').eq('user_id', doctor.user_id).not('utm_campaign', 'is', null);
          const leadCountByCampaign = new Map<string, number>();
          (leads ?? []).forEach((l: any) => {
            leadCountByCampaign.set(l.utm_campaign, (leadCountByCampaign.get(l.utm_campaign) ?? 0) + 1);
          });

          const enriched = campaigns.map((c: any) => {
            const leadCount = leadCountByCampaign.get(c.campaign_name) ?? 0;
            return {
              id: c.id, name: c.campaign_name, spend: Number(c.spend),
              impressions: Number(c.impressions), clicks: Number(c.clicks),
              leads: leadCount, cac: leadCount > 0 ? Number(c.spend) / leadCount : null,
            };
          });

          const suggestions = await suggestAdActions(anthropicKey, enriched);
          if (suggestions.length) {
            // Recomputa do zero as pendentes (preserva aceita/descartada como histórico).
            await supabase.from('ad_campaign_suggestions')
              .delete().eq('user_id', doctor.user_id).eq('status', 'pendente');
            await supabase.from('ad_campaign_suggestions').insert(
              suggestions.map(s => ({
                user_id: doctor.user_id,
                ad_campaign_id: s.campaignId,
                suggestion_type: s.suggestionType,
                reason: s.reason,
              })),
            );
          }
        }
      } catch (e) {
        errors.push(`suggestions/${doctor.user_id}: ${String((e as Error).message ?? e)}`);
      }
    }
  }

  return json({ ok: true, doctors: doctors.length, campaigns: totalCampaigns, errors });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
