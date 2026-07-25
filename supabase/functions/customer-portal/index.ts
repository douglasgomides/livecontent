// customer-portal — abre o portal do Stripe pro médico gerenciar/cancelar a própria assinatura.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
    if (!sub?.stripe_customer_id) return json({ error: 'Nenhuma assinatura encontrada ainda' }, 400);

    const { origin } = await req.json().catch(() => ({ origin: null }));
    const site = origin || Deno.env.get('SITE_URL') || 'https://livecontent.lovable.app';

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ customer: sub.stripe_customer_id, return_url: `${site}/app/settings` }).toString(),
    });
    if (!res.ok) return json({ error: `Stripe: ${await res.text()}` }, 502);
    const data = await res.json();
    return json({ url: data.url });
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
