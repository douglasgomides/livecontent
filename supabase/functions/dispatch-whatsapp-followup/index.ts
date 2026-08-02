// dispatch-whatsapp-followup — dispara um POST pra webhook de WhatsApp
// configurado pelo médico (mesmo modelo dos webhooks de canal já existentes:
// Zapier/Make/n8n apontando pra automação própria dele) com telefone+mensagem
// de UM destinatário específico (paciente OU lead ainda não-paciente), e
// grava o resultado em whatsapp_followups.
// Nunca envia sem aprovação explícita do médico — esta função só roda quando
// ele já clicou em "Aprovar e enviar" no follow-up revisado.
import { corsHeaders } from '../_shared/cors.ts';
import { isSafeWebhookUrl } from '../_shared/urlGuard.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { followup_id } = await req.json();
    if (!followup_id) return json({ error: 'Missing followup_id' }, 400);

    const { data: followup, error: fErr } = await supabase
      .from('whatsapp_followups').select('*').eq('id', followup_id).maybeSingle();
    if (fErr || !followup) return json({ error: 'Follow-up not found' }, 404);
    if (followup.user_id !== userId) return json({ error: 'Forbidden' }, 403);

    // Consentimento é checado de novo aqui (não só no cliente) — a fonte de
    // verdade é o registro de origem (pré-consulta ou lead), nunca confiamos
    // só no que o frontend mandou pra decidir se pode enviar.
    const consentTable = followup.lead_id ? 'lead_captures' : 'preconsultation_responses';
    const consentId = followup.lead_id ?? followup.preconsult_response_id;
    const { data: consentRow } = await supabase
      .from(consentTable).select('whatsapp_consent').eq('id', consentId).maybeSingle();
    if (!consentRow?.whatsapp_consent) {
      await supabase.from('whatsapp_followups').update({
        status: 'failed',
      }).eq('id', followup_id);
      return json({ ok: false, error: 'Consentimento pra WhatsApp não encontrado' }, 403);
    }

    const { data: settings } = await supabase
      .from('doctor_settings').select('whatsapp_webhook_url').eq('user_id', userId).maybeSingle();
    const url = settings?.whatsapp_webhook_url;

    if (!url) {
      return json({ ok: false, needs_connection: true, error: 'Configure o webhook do WhatsApp em Ajustes' });
    }
    if (!isSafeWebhookUrl(url)) {
      await supabase.from('whatsapp_followups').update({ status: 'failed' }).eq('id', followup_id);
      return json({ ok: false, error: 'URL de webhook inválida ou aponta pra um endereço não permitido.' }, 400);
    }

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: followup.phone, message: followup.message, session_id: followup.session_id, lead_id: followup.lead_id }),
      });
      const ok = r.ok;
      const text = await r.text();
      await supabase.from('whatsapp_followups').update({
        status: ok ? 'sent' : 'failed',
        sent_at: ok ? new Date().toISOString() : null,
      }).eq('id', followup_id);
      // Histórico da conversa com o lead — só registro pra dar contexto à
      // próxima sugestão da IA e pro médico ver no kanban, nunca aciona nada.
      if (ok && followup.lead_id) {
        await supabase.from('lead_messages').insert({
          user_id: userId, lead_id: followup.lead_id, direction: 'outbound', body: followup.message,
        });
      }
      return json({ ok, status: r.status, message: text.slice(0, 300) });
    } catch (err) {
      await supabase.from('whatsapp_followups').update({ status: 'failed' }).eq('id', followup_id);
      return json({ ok: false, error: `Erro de rede: ${String((err as Error).message ?? err).slice(0, 300)}` }, 502);
    }
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
