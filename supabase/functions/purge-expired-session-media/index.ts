// purge-expired-session-media — disparada por pg_cron diariamente (nunca pelo
// app/usuário direto). Fecha o maior buraco de LGPD identificado na auditoria:
// áudio bruto e transcrição não-anonimizada de paciente ficavam armazenados
// pra sempre, sem expiração nenhuma. Esta function apaga só isso — nunca toca
// anonymized_transcript nem content_pieces, que são o que o produto realmente
// precisa manter (o texto já sem PII e o conteúdo já gerado a partir dele).
//
// Só afeta sessões em status terminal (ready/failed) — nunca uma sessão que
// ainda está em andamento no pipeline (o médico pode estar no meio da revisão
// de anonimização ou de tópicos, que dependem do dado bruto até serem
// confirmadas).
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Sugestão da auditoria de LGPD: 30-90 dias. 60 é o meio-termo — tempo o
// bastante pro médico voltar numa sessão antiga se precisar, curto o
// bastante pra não acumular PII indefinidamente.
const RETENTION_DAYS = 60;
const TERMINAL_STATUSES = ['ready', 'failed'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions, error: fetchErr } = await supabase
    .from('sessions')
    .select('id, audio_path, raw_transcript')
    .in('status', TERMINAL_STATUSES)
    .lt('created_at', cutoff)
    .or('audio_path.not.is.null,raw_transcript.not.is.null');
  if (fetchErr) return json({ error: fetchErr.message }, 500);
  if (!sessions || !sessions.length) return json({ ok: true, purged: 0 });

  let purged = 0;
  const errors: string[] = [];

  for (const s of sessions) {
    try {
      if (s.audio_path) {
        const { error: storageErr } = await supabase.storage
          .from('consultation-audio')
          .remove([s.audio_path]);
        // Segue mesmo se o objeto já não existir no storage (ex.: já foi
        // removido numa rodada anterior que falhou só na parte do banco) —
        // o objetivo é garantir que a LINHA não referencie mais dado bruto.
        if (storageErr) errors.push(`${s.id} (storage): ${storageErr.message}`);
      }
      const { error: updateErr } = await supabase
        .from('sessions')
        .update({ audio_path: null, raw_transcript: null })
        .eq('id', s.id);
      if (updateErr) { errors.push(`${s.id} (db): ${updateErr.message}`); continue; }
      purged++;
    } catch (e) {
      errors.push(`${s.id}: ${String((e as Error)?.message ?? e)}`);
    }
  }

  return json({ ok: true, checked: sessions.length, purged, errors });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
