// stripe-webhook — recebe eventos do Stripe e atualiza a assinatura no banco.
// Verifica a assinatura HMAC do Stripe manualmente (sem SDK) antes de confiar em
// qualquer payload — sem isso, qualquer um poderia forjar um "pagamento aprovado".
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=') as [string, string]));
  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) return false;

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === v1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) return json({ error: 'STRIPE_WEBHOOK_SECRET not configured' }, 500);

    const sig = req.headers.get('stripe-signature');
    if (!sig) return json({ error: 'Missing signature' }, 400);
    const rawBody = await req.text();

    const valid = await verifyStripeSignature(rawBody, sig, webhookSecret);
    if (!valid) return json({ error: 'Invalid signature' }, 400);

    const event = JSON.parse(rawBody);
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        if (userId) {
          await admin.from('subscriptions').update({
            plan: 'pro',
            status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          }).eq('user_id', userId);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subObj = event.data.object;
        const status = subObj.status === 'active' ? 'active'
          : subObj.status === 'past_due' ? 'past_due'
          : 'canceled';
        const plan = event.type === 'customer.subscription.deleted' || status === 'canceled' ? 'free' : 'pro';
        await admin.from('subscriptions').update({
          plan,
          status,
          current_period_end: subObj.current_period_end ? new Date(subObj.current_period_end * 1000).toISOString() : null,
        }).eq('stripe_customer_id', subObj.customer);
        break;
      }
      default:
        break;
    }

    return json({ received: true });
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
