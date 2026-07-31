// commercial-intelligence-report — agregação cross-médico da inteligência
// comercial extraída pelo run-pipeline (tabela commercial_intelligence).
// Admin-only, mesmo padrão de autenticação e acesso via service-role do
// admin-overview: RLS normal (dono só vê a própria linha) + este endpoint
// bypassa via service_role só depois de confirmar is_app_admin(uid).
// Retorna dados agregados em JSON — sem dashboard visual ainda (a UI decide
// depois onde plugar isso, conforme combinado).
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MIN_SAMPLES_ARGUMENTO = 3;

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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: rows, error: rowsErr } = await admin
      .from('commercial_intelligence')
      .select('user_id, specialty, houve_oferta_comercial, resultado, argumentos_utilizados, objecoes_paciente, dores_identificadas');
    if (rowsErr) return json({ error: rowsErr.message }, 500);

    const withOffer = (rows ?? []).filter(r => r.houve_oferta_comercial);
    // Só 'fechou'/'nao_fechou' contam como resultado decidido pra taxa de conversão —
    // 'indefinido' (consulta não terminou de decidir) e 'nao_se_aplica' distorceriam a taxa.
    const decided = withOffer.filter(r => r.resultado === 'fechou' || r.resultado === 'nao_fechou');

    // ── Taxa de fechamento por categoria de argumento ──────────────────────
    // Atribui o resultado da consulta inteira a CADA categoria de argumento usada
    // nela (uma consulta pode ter mais de um argumento/categoria) — é uma correlação,
    // não uma prova de causalidade isolada por argumento.
    const porCategoriaArgumento = new Map<string, { total: number; fechou: number }>();
    for (const row of decided) {
      const categorias = new Set((row.argumentos_utilizados ?? []).map((a: any) => a.categoria));
      for (const cat of categorias) {
        const acc = porCategoriaArgumento.get(cat) ?? { total: 0, fechou: 0 };
        acc.total++;
        if (row.resultado === 'fechou') acc.fechou++;
        porCategoriaArgumento.set(cat, acc);
      }
    }

    // ── Ranking de argumentos individuais (texto livre, normalizado) ───────
    const porArgumentoTexto = new Map<string, { argumento: string; total: number; fechou: number }>();
    for (const row of decided) {
      const seen = new Set<string>();
      for (const a of row.argumentos_utilizados ?? []) {
        const key = String(a.argumento ?? '').trim().toLowerCase();
        if (!key || seen.has(key)) continue; // não conta 2x o mesmo argumento repetido na mesma consulta
        seen.add(key);
        const acc = porArgumentoTexto.get(key) ?? { argumento: a.argumento, total: 0, fechou: 0 };
        acc.total++;
        if (row.resultado === 'fechou') acc.fechou++;
        porArgumentoTexto.set(key, acc);
      }
    }
    const rankingArgumentosTotal = porArgumentoTexto.size;
    const rankingArgumentos = [...porArgumentoTexto.values()]
      .filter(a => a.total >= MIN_SAMPLES_ARGUMENTO)
      .map(a => ({ ...a, taxa: a.fechou / a.total }))
      .sort((a, b) => b.taxa - a.taxa || b.total - a.total);

    // ── Objeções mais frequentes e taxa de superação ───────────────────────
    const porObjecao = new Map<string, { total: number; superadaCount: number; superadaKnown: number }>();
    for (const row of withOffer) {
      for (const o of row.objecoes_paciente ?? []) {
        const acc = porObjecao.get(o.categoria) ?? { total: 0, superadaCount: 0, superadaKnown: 0 };
        acc.total++;
        if (typeof o.objecao_superada === 'boolean') {
          acc.superadaKnown++;
          if (o.objecao_superada) acc.superadaCount++;
        }
        porObjecao.set(o.categoria, acc);
      }
    }
    const objecoes = [...porObjecao.entries()]
      .map(([categoria, v]) => ({
        categoria, total: v.total,
        taxa_superacao: v.superadaKnown > 0 ? v.superadaCount / v.superadaKnown : null,
      }))
      .sort((a, b) => b.total - a.total);

    // ── Cruzamento dor × categoria de argumento vencedor (só consultas fechadas) ──
    const porCruzamento = new Map<string, number>();
    for (const row of decided) {
      if (row.resultado !== 'fechou') continue;
      const dorCats = new Set((row.dores_identificadas ?? []).map((d: any) => d.categoria));
      const argCats = new Set((row.argumentos_utilizados ?? []).map((a: any) => a.categoria));
      for (const dor of dorCats) {
        for (const arg of argCats) {
          const key = `${dor}::${arg}`;
          porCruzamento.set(key, (porCruzamento.get(key) ?? 0) + 1);
        }
      }
    }
    const cruzamentoDorArgumento = [...porCruzamento.entries()]
      .map(([key, fechouCount]) => {
        const [dor_categoria, arg_categoria] = key.split('::');
        return { dor_categoria, arg_categoria, fechou_count: fechouCount };
      })
      .sort((a, b) => b.fechou_count - a.fechou_count)
      .slice(0, 20);

    // ── Segmentação por médico e por especialidade ─────────────────────────
    const porMedico = new Map<string, { specialty: string; total: number; fechou: number }>();
    const porEspecialidade = new Map<string, { total: number; fechou: number }>();
    for (const row of decided) {
      const m = porMedico.get(row.user_id) ?? { specialty: row.specialty || '(sem especialidade)', total: 0, fechou: 0 };
      m.total++;
      if (row.resultado === 'fechou') m.fechou++;
      porMedico.set(row.user_id, m);

      const specKey = row.specialty || '(sem especialidade)';
      const e = porEspecialidade.get(specKey) ?? { total: 0, fechou: 0 };
      e.total++;
      if (row.resultado === 'fechou') e.fechou++;
      porEspecialidade.set(specKey, e);
    }

    return json({
      total_sessoes_com_oferta: withOffer.length,
      total_sessoes_com_resultado_decidido: decided.length,
      taxa_fechamento_geral: decided.length ? decided.filter(r => r.resultado === 'fechou').length / decided.length : null,
      por_categoria_argumento: [...porCategoriaArgumento.entries()]
        .map(([categoria, v]) => ({ categoria, total: v.total, fechou: v.fechou, taxa: v.fechou / v.total }))
        .sort((a, b) => b.taxa - a.taxa),
      ranking_argumentos: rankingArgumentos,
      ranking_argumentos_amostra_minima: MIN_SAMPLES_ARGUMENTO,
      // Quantos argumentos distintos existem no total vs quantos entraram no ranking —
      // pra deixar explícito que argumentos com poucas amostras foram omitidos, não que não existem.
      ranking_argumentos_total_distintos: rankingArgumentosTotal,
      ranking_argumentos_omitidos_por_amostra_baixa: rankingArgumentosTotal - rankingArgumentos.length,
      objecoes,
      cruzamento_dor_argumento: cruzamentoDorArgumento,
      por_medico: [...porMedico.entries()].map(([user_id, v]) => ({
        user_id, specialty: v.specialty, total: v.total, fechou: v.fechou, taxa: v.fechou / v.total,
      })).sort((a, b) => b.total - a.total),
      por_especialidade: [...porEspecialidade.entries()].map(([specialty, v]) => ({
        specialty, total: v.total, fechou: v.fechou, taxa: v.fechou / v.total,
      })).sort((a, b) => b.total - a.total),
    });
  } catch (e) {
    console.error('[commercial-intelligence-report]', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
