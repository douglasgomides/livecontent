// receive-whatsapp-reply — endpoint público (sem JWT) que a automação do
// próprio médico (Zapier/Make/n8n) chama quando um LEAD responde por
// WhatsApp. Autenticado por um token por médico na URL (não é sessão de
// usuário autenticado — vem de fora, do provedor de automação dele).
// Registra a mensagem, casa com o lead pelo telefone, e pede uma sugestão de
// resposta + próxima etapa pra IA — nunca envia nada nem move o lead sozinho,
// só deixa pronto pro médico revisar em "Detalhes" no kanban.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { suggestLeadReply } from '../_shared/leadReplySuggestion.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return json({ error: 'Missing token' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: settings } = await supabase
      .from('doctor_settings').select('user_id').eq('whatsapp_inbound_token', token).maybeSingle();
    if (!settings) return json({ error: 'Invalid token' }, 401);
    const userId = settings.user_id;

    const { phone, message } = await req.json();
    if (!phone || !message) return json({ error: 'Missing phone/message' }, 400);

    // Casa pelo telefone — normaliza tirando tudo que não é dígito e compara
    // os últimos 8 dígitos, pra não depender de formatação exata (+55, DDD
    // com/sem 9, espaços etc).
    const digits = String(phone).replace(/\D/g, '');
    const { data: leads } = await supabase
      .from('lead_captures').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    const lead = (leads ?? []).find((l: any) => String(l.contact).replace(/\D/g, '').endsWith(digits.slice(-8)));
    if (!lead) return json({ ok: false, error: 'Lead não encontrado pra esse telefone' }, 404);

    await supabase.from('lead_messages').insert({ user_id: userId, lead_id: lead.id, direction: 'inbound', body: message });

    // Sugestão da IA é best-effort — se falhar, a mensagem já foi registrada
    // e o médico vê no kanban mesmo sem rascunho de resposta pronto.
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      try {
        const { data: history } = await supabase
          .from('lead_messages').select('direction, body').eq('lead_id', lead.id).order('created_at', { ascending: true }).limit(20);
        const suggestion = await suggestLeadReply(anthropicKey, lead, history ?? []);
        if (suggestion) {
          await supabase.from('lead_captures').update({
            suggested_status: suggestion.suggestedStatus,
            suggested_status_reason: suggestion.reason,
          }).eq('id', lead.id);

          // Rascunho de resposta fica pronto em whatsapp_followups (draft) —
          // reaproveita o MESMO fluxo de aprovação já existente. Se o último
          // follow-up desse lead já foi enviado, cria um novo (conversa
          // contínua); senão, atualiza o rascunho pendente.
          const { data: existingRows } = await supabase
            .from('whatsapp_followups').select('id, status').eq('lead_id', lead.id)
            .order('created_at', { ascending: false }).limit(1);
          const existing = existingRows?.[0];
          if (existing && existing.status !== 'sent') {
            await supabase.from('whatsapp_followups').update({ message: suggestion.draftReply, status: 'draft' }).eq('id', existing.id);
          } else {
            await supabase.from('whatsapp_followups').insert({
              user_id: userId, lead_id: lead.id, phone: lead.contact, message: suggestion.draftReply,
            });
          }
        }
      } catch {
        // best-effort — segue sem sugestão
      }
    }

    return json({ ok: true });
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
