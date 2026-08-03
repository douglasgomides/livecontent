// send-weekly-report — disparada por pg_cron toda segunda de manhã (nunca
// pelo app/usuário direto). Pra cada médico com webhook de WhatsApp E o
// próprio número configurados, agrega a semana anterior (conteúdo aprovado,
// leads, consultas) e manda um resumo — valor sem precisar abrir o app.
// Sempre grava o relatório em weekly_reports (mesmo se o envio falhar), pra
// dar pra ver no Dashboard de qualquer forma.
import { corsHeaders } from '../_shared/cors.ts';
import { isSafeWebhookUrl } from '../_shared/urlGuard.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CHANNEL_LABEL: Record<string, string> = {
  instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok',
  blog: 'Blog', gmb: 'Google Meu Negócio', doctoralia: 'Doctoralia', website: 'Site', podcast: 'Podcast',
};
const ORIGIN_LABEL: Record<string, string> = {
  instagram: 'Instagram', whatsapp: 'WhatsApp', indicacao: 'Indicação', outro: 'Outro',
};

function lastMonday(d: Date): Date {
  const day = d.getUTCDay(); // 0=domingo
  const diff = (day + 6) % 7; // dias desde a última segunda
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday;
}

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

  const thisMonday = lastMonday(new Date());
  const weekStart = new Date(thisMonday); weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const weekEnd = thisMonday;
  const weekStartIso = weekStart.toISOString();
  const weekEndIso = weekEnd.toISOString();
  const weekStartDate = weekStartIso.slice(0, 10);

  const { data: doctors, error: doctorsErr } = await supabase
    .from('doctor_settings')
    .select('user_id, whatsapp_webhook_url, own_whatsapp_number')
    .not('whatsapp_webhook_url', 'is', null)
    .not('own_whatsapp_number', 'is', null);
  if (doctorsErr) return json({ error: doctorsErr.message }, 500);
  if (!doctors || !doctors.length) return json({ ok: true, doctors: 0, sent: 0 });

  let sentCount = 0;
  const errors: string[] = [];

  for (const doctor of doctors) {
    try {
      const [{ data: pieces }, { data: leads }, { data: sessions }, { data: suggestion }] = await Promise.all([
        supabase.from('content_pieces')
          .select('channel, virality, topic_id, updated_at')
          .eq('user_id', doctor.user_id).eq('approved', true)
          .gte('updated_at', weekStartIso).lt('updated_at', weekEndIso),
        supabase.from('lead_captures')
          .select('origin, status, created_at, status_changed_at')
          .eq('user_id', doctor.user_id),
        supabase.from('sessions')
          .select('id').eq('user_id', doctor.user_id)
          .gte('created_at', weekStartIso).lt('created_at', weekEndIso),
        supabase.from('weekly_content_suggestions')
          .select('category, action_tip').eq('user_id', doctor.user_id)
          .order('week_start', { ascending: false }).limit(1).maybeSingle(),
      ]);

      const piecesByChannel: Record<string, number> = {};
      (pieces ?? []).forEach((p: any) => { piecesByChannel[p.channel] = (piecesByChannel[p.channel] ?? 0) + 1; });

      let bestPiece: { title: string; channel: string; score: number } | null = null;
      for (const p of (pieces ?? []) as any[]) {
        const score = p.virality?.score;
        if (typeof score === 'number' && (!bestPiece || score > bestPiece.score)) {
          let title = 'Tema';
          if (p.topic_id) {
            const { data: topic } = await supabase.from('topics').select('title').eq('id', p.topic_id).maybeSingle();
            title = topic?.title ?? title;
          }
          bestPiece = { title, channel: p.channel, score };
        }
      }

      const leadsThisWeek = (leads ?? []).filter((l: any) => l.created_at >= weekStartIso && l.created_at < weekEndIso);
      const leadsByOrigin: Record<string, number> = {};
      leadsThisWeek.forEach((l: any) => { leadsByOrigin[l.origin] = (leadsByOrigin[l.origin] ?? 0) + 1; });
      const leadsScheduled = (leads ?? []).filter((l: any) =>
        l.status === 'agendado' && l.status_changed_at >= weekStartIso && l.status_changed_at < weekEndIso).length;
      const leadsConverted = (leads ?? []).filter((l: any) =>
        l.status === 'convertido' && l.status_changed_at >= weekStartIso && l.status_changed_at < weekEndIso).length;

      const content = {
        piecesApproved: (pieces ?? []).length,
        piecesByChannel,
        leadsTotal: leadsThisWeek.length,
        leadsByOrigin,
        leadsScheduled,
        leadsConverted,
        sessionsRecorded: (sessions ?? []).length,
        bestPiece,
        suggestedTheme: suggestion ? { category: suggestion.category, actionTip: suggestion.action_tip } : null,
      };

      const message = buildMessage(weekStartDate, content);

      const { error: upsertErr } = await supabase.from('weekly_reports').upsert({
        user_id: doctor.user_id, week_start: weekStartDate, content, message, sent: false,
      }, { onConflict: 'user_id,week_start' });
      if (upsertErr) { errors.push(`${doctor.user_id}: ${upsertErr.message}`); continue; }

      if (!isSafeWebhookUrl(doctor.whatsapp_webhook_url)) {
        errors.push(`${doctor.user_id}: webhook inválido`);
        continue;
      }

      const r = await fetch(doctor.whatsapp_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: doctor.own_whatsapp_number, message }),
      });
      if (r.ok) {
        await supabase.from('weekly_reports')
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq('user_id', doctor.user_id).eq('week_start', weekStartDate);
        sentCount++;
      } else {
        errors.push(`${doctor.user_id}: webhook respondeu ${r.status}`);
      }
    } catch (e) {
      errors.push(`${doctor.user_id}: ${String((e as Error).message ?? e)}`);
    }
  }

  return json({ ok: true, doctors: doctors.length, sent: sentCount, errors });
});

function buildMessage(weekStartDate: string, c: {
  piecesApproved: number; piecesByChannel: Record<string, number>;
  leadsTotal: number; leadsByOrigin: Record<string, number>;
  leadsScheduled: number; leadsConverted: number; sessionsRecorded: number;
  bestPiece: { title: string; channel: string; score: number } | null;
  suggestedTheme: { category: string; actionTip: string } | null;
}): string {
  const lines: string[] = [];
  lines.push(`*Resumo da semana de ${weekStartDate}*`);
  lines.push('');
  lines.push(`📝 ${c.piecesApproved} peça(s) de conteúdo aprovada(s)` + (
    Object.keys(c.piecesByChannel).length
      ? ` — ${Object.entries(c.piecesByChannel).map(([ch, n]) => `${CHANNEL_LABEL[ch] ?? ch}: ${n}`).join(', ')}`
      : ''
  ));
  lines.push(`👥 ${c.leadsTotal} lead(s) novo(s)` + (
    Object.keys(c.leadsByOrigin).length
      ? ` — ${Object.entries(c.leadsByOrigin).map(([o, n]) => `${ORIGIN_LABEL[o] ?? o}: ${n}`).join(', ')}`
      : ''
  ));
  lines.push(`📅 ${c.leadsScheduled} agendamento(s), ${c.leadsConverted} conversão(ões) em paciente`);
  lines.push(`🎙️ ${c.sessionsRecorded} consulta(s) gravada(s)`);
  if (c.bestPiece) {
    lines.push('');
    lines.push(`Melhor conteúdo da semana: *${c.bestPiece.title}* (${CHANNEL_LABEL[c.bestPiece.channel] ?? c.bestPiece.channel}, potencial de viralização ${c.bestPiece.score}/100)`);
  }
  if (c.suggestedTheme) {
    lines.push('');
    lines.push(`Sugestão pra próxima semana: ${c.suggestedTheme.actionTip}`);
  }
  return lines.join('\n');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
