// admin-overview — visão agregada de todos os médicos (só pra quem está em
// app_admins). Usa service role pra ler além do RLS, mas SEMPRE confere admin
// primeiro com a claim do próprio usuário logado.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { data: isAdmin, error: adminErr } = await userClient.rpc('is_app_admin', { uid: userId });
    if (adminErr || !isAdmin) return json({ error: 'Forbidden — não é admin' }, 403);

    // Service role: só a partir daqui, só depois de confirmar que quem pediu é admin de verdade.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (usersErr) return json({ error: usersErr.message }, 500);

    const [{ data: brains }, { data: sessions }, { data: pieces }, { data: subs }] = await Promise.all([
      admin.from('brains').select('user_id, doctor'),
      admin.from('sessions').select('user_id, created_at, status'),
      admin.from('content_pieces').select('user_id'),
      admin.from('subscriptions').select('*'),
    ]);

    const sessionsByUser = new Map<string, { total: number; last: string | null; failed: number }>();
    (sessions ?? []).forEach((s: any) => {
      const cur = sessionsByUser.get(s.user_id) ?? { total: 0, last: null, failed: 0 };
      cur.total += 1;
      if (s.status === 'failed') cur.failed += 1;
      if (!cur.last || s.created_at > cur.last) cur.last = s.created_at;
      sessionsByUser.set(s.user_id, cur);
    });
    const piecesByUser = new Map<string, number>();
    (pieces ?? []).forEach((p: any) => piecesByUser.set(p.user_id, (piecesByUser.get(p.user_id) ?? 0) + 1));
    const brainByUser = new Map((brains ?? []).map((b: any) => [b.user_id, b.doctor]));
    const subByUser = new Map((subs ?? []).map((s: any) => [s.user_id, s]));

    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const usersOverview = usersData.users.map(u => {
      const sessStats = sessionsByUser.get(u.id) ?? { total: 0, last: null, failed: 0 };
      const sub = subByUser.get(u.id);
      const recentSessions = (sessions ?? []).filter((s: any) => s.user_id === u.id && s.created_at >= oneMonthAgo).length;
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        specialty: (brainByUser.get(u.id) as any)?.specialty ?? null,
        sessions_total: sessStats.total,
        sessions_last_30d: recentSessions,
        sessions_failed: sessStats.failed,
        content_pieces_total: piecesByUser.get(u.id) ?? 0,
        last_activity: sessStats.last,
        plan: sub?.plan ?? 'free',
        subscription_status: sub?.status ?? 'none',
      };
    }).sort((a, b) => (b.last_activity ?? '').localeCompare(a.last_activity ?? ''));

    return json({
      total_users: usersOverview.length,
      total_sessions: (sessions ?? []).length,
      total_pieces: (pieces ?? []).length,
      pro_users: usersOverview.filter(u => u.plan === 'pro').length,
      users: usersOverview,
    });
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
