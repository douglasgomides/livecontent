// suggest-lead-nurturing — disparada por pg_cron (nunca pelo app/usuário
// direto), uma vez por dia. Pra cada lead que ainda não respondeu/agendou
// (status 'novo' ou 'contatado'), com consentimento de WhatsApp, verifica se
// bateu o próximo checkpoint da cadência de nurturing por temperatura e, se
// sim, gera um RASCUNHO de mensagem — nunca envia sozinha. O médico vê e
// aprova em Captação de leads, no mesmo fluxo que já existe pra resposta.
//
// Adaptação do documento de visão (que descreve nurturing por comportamento
// fino — clique, visualização) pros dados que este app realmente tem: aqui a
// "temperatura" vem do status do kanban (novo=frio, contatado=morno), e o
// relógio da cadência conta a partir de quando o lead ENTROU nesse status
// (status_changed_at), não de quando foi criado.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { suggestNurturingMessage } from '../_shared/leadNurturingSuggestion.ts';

const CADENCE: Record<'novo' | 'contatado', { temperature: 'frio' | 'morno'; checkpoints: number[] }> = {
  novo: { temperature: 'frio', checkpoints: [1, 4, 8] },
  contatado: { temperature: 'morno', checkpoints: [1, 3, 6, 10] },
};

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

  const { data: leads, error: leadsErr } = await supabase
    .from('lead_captures')
    .select('id, user_id, name, contact, reason, status, status_changed_at, last_nurture_day, whatsapp_consent')
    .in('status', ['novo', 'contatado'])
    .eq('whatsapp_consent', true);
  if (leadsErr) return json({ error: leadsErr.message }, 500);
  if (!leads || !leads.length) return json({ ok: true, checked: 0, drafted: 0 });

  let drafted = 0;
  const errors: string[] = [];
  const now = Date.now();

  for (const lead of leads) {
    try {
      const cadence = CADENCE[lead.status as 'novo' | 'contatado'];
      if (!cadence) continue;

      const daysSince = Math.floor((now - new Date(lead.status_changed_at).getTime()) / (24 * 60 * 60 * 1000));
      const dueCheckpoint = [...cadence.checkpoints].reverse().find(c => c <= daysSince && c > (lead.last_nurture_day ?? 0));
      if (dueCheckpoint == null) continue;

      // Já tem rascunho ou aprovação pendente pra esse lead? Não empilha —
      // deixa o médico resolver o que já está esperando primeiro.
      const { data: existing } = await supabase
        .from('whatsapp_followups')
        .select('id').eq('lead_id', lead.id).in('status', ['draft', 'approved']).maybeSingle();
      if (existing) continue;

      const draft = await suggestNurturingMessage(
        anthropicKey,
        { name: lead.name, reason: lead.reason },
        { temperature: cadence.temperature, day: dueCheckpoint, totalCheckpoints: cadence.checkpoints.length },
      );
      if (!draft) continue;

      const { error: insErr } = await supabase.from('whatsapp_followups').insert({
        user_id: lead.user_id, lead_id: lead.id, phone: lead.contact, message: draft.message,
      });
      if (insErr) { errors.push(`${lead.id}: ${insErr.message}`); continue; }

      await supabase.from('lead_captures').update({ last_nurture_day: dueCheckpoint }).eq('id', lead.id);
      drafted++;
    } catch (e) {
      errors.push(`${lead.id}: ${String((e as Error).message ?? e)}`);
    }
  }

  return json({ ok: true, checked: leads.length, drafted, errors });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
