// create-checkout-session — abre um Stripe Checkout pro plano Pro.
// Requer secrets: STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID (criados no dashboard do Stripe).
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const priceId = Deno.env.get('STRIPE_PRO_PRICE_ID');
    if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500);
    if (!priceId) return json({ error: 'STRIPE_PRO_PRICE_ID not configured' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;
    const email = claims.claims.email as string | undefined;

    const { origin } = await req.json().catch(() => ({ origin: null }));
    const site = origin || Deno.env.get('SITE_URL') || 'https://livecontent.lovable.app';

    const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();

    let customerId = sub?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const custRes = await stripeFetch(stripeKey, 'POST', '/customers', {
        email: email ?? '',
        'metadata[user_id]': userId,
      });
      if (!custRes.ok) return json({ error: `Stripe (customer): ${await custRes.text()}` }, 502);
      const cust = await custRes.json();
      customerId = cust.id;
      await supabase.from('subscriptions').update({ stripe_customer_id: customerId }).eq('user_id', userId);
    }

    const sessionRes = await stripeFetch(stripeKey, 'POST', '/checkout/sessions', {
      customer: customerId!,
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${site}/app/settings?checkout=success`,
      cancel_url: `${site}/app/settings?checkout=cancel`,
      'metadata[user_id]': userId,
    });
    if (!sessionRes.ok) return json({ error: `Stripe (checkout): ${await sessionRes.text()}` }, 502);
    const session = await sessionRes.json();

    return json({ url: session.url });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

async function stripeFetch(key: string, method: string, path: string, body?: Record<string, string>) {
  return fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
