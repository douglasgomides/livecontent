// commercial-benchmark — benchmark de mercado (cross-médico, anonimizado, só
// agregado por categoria) pra resolver o "dia 1 vazio": mesmo sem consultas
// suficientes, o médico vê o que fecha mais no mercado pra especialidade dele.
// Diferente de commercial-intelligence-report (admin-only): qualquer médico
// autenticado pode chamar, porque NUNCA retorna texto livre, session_id ou
// user_id de outro médico — só contagens e taxas por categoria fixa (mesma
// taxonomia de _shared/commercialIntelligence.ts).
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SPECIALTY_MIN_OFFERS = 12;
const MARKET_MIN_OFFERS = 20;
const MIN_SAMPLES_CATEGORY = 3;

const ARG_LABEL: Record<string, string> = {
  autoridade: 'Autoridade/credencial', prova_social: 'Prova social', urgencia: 'Urgência',
  escassez: 'Escassez', beneficio_funcional: 'Benefício funcional', beneficio_emocional: 'Benefício emocional',
  preco_condicao: 'Condição de preço', garantia: 'Garantia', comparacao: 'Comparação', outro: 'Outro',
};
const OBJ_LABEL: Record<string, string> = {
  preco: 'Preço', tempo: 'Tempo/agenda', medo_dor: 'Medo/dor', duvida_eficacia: 'Dúvida de eficácia',
  precisa_pensar: 'Precisa pensar', terceiros_opiniao: 'Opinião de terceiros', outro: 'Outro',
};

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

    const { data: brainRow } = await userClient.from('brains').select('doctor').eq('user_id', userId).maybeSingle();
    const mySpecialty = String((brainRow?.doctor as any)?.specialty ?? '').trim().toLowerCase();

    // Service role só pra ler o agregado cross-médico — nunca repassamos linha crua ao cliente.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: rows, error } = await admin
      .from('commercial_intelligence')
      .select('specialty, houve_oferta_comercial, resultado, argumentos_utilizados, objecoes_paciente');
    if (error) return json({ error: error.message }, 500);

    const all = rows ?? [];
    const mine = mySpecialty
      ? all.filter(r => String(r.specialty ?? '').trim().toLowerCase() === mySpecialty)
      : [];
    const mineOffers = mine.filter(r => r.houve_oferta_comercial).length;

    // Prioriza o benchmark da própria especialidade; só cai pro mercado geral
    // se a especialidade ainda não tiver amostra suficiente.
    const useSegment = Boolean(mySpecialty) && mineOffers >= SPECIALTY_MIN_OFFERS;
    const pool = useSegment ? mine : all;
    const withOffer = pool.filter(r => r.houve_oferta_comercial);

    if (!useSegment && withOffer.length < MARKET_MIN_OFFERS) {
      return json({
        eligible: false,
        scope: 'market',
        sampleSize: withOffer.length,
        minRequired: MARKET_MIN_OFFERS,
      });
    }

    const decided = withOffer.filter(r => r.resultado === 'fechou' || r.resultado === 'nao_fechou');
    const closingRate = decided.length
      ? decided.filter(r => r.resultado === 'fechou').length / decided.length
      : null;

    // Taxa de fechamento por categoria de argumento — uma consulta pode contar em
    // mais de uma categoria se usou mais de um tipo de argumento.
    const argAcc = new Map<string, { total: number; fechou: number }>();
    for (const row of decided) {
      const cats = new Set((row.argumentos_utilizados ?? []).map((a: any) => a.categoria));
      for (const c of cats) {
        const acc = argAcc.get(c) ?? { total: 0, fechou: 0 };
        acc.total++;
        if (row.resultado === 'fechou') acc.fechou++;
        argAcc.set(c, acc);
      }
    }
    const topArguments = [...argAcc.entries()]
      .filter(([, v]) => v.total >= MIN_SAMPLES_CATEGORY)
      .map(([categoria, v]) => ({
        categoria, label: ARG_LABEL[categoria] ?? categoria,
        taxaFechamento: v.fechou / v.total, amostras: v.total,
      }))
      .sort((a, b) => b.taxaFechamento - a.taxaFechamento || b.amostras - a.amostras)
      .slice(0, 5);

    // Frequência de objeção por categoria, sobre todas as ofertas (não só decididas).
    const objAcc = new Map<string, number>();
    for (const row of withOffer) {
      const cats = new Set((row.objecoes_paciente ?? []).map((o: any) => o.categoria));
      for (const c of cats) objAcc.set(c, (objAcc.get(c) ?? 0) + 1);
    }
    const topObjections = [...objAcc.entries()]
      .filter(([, n]) => n >= MIN_SAMPLES_CATEGORY)
      .map(([categoria, n]) => ({
        categoria, label: OBJ_LABEL[categoria] ?? categoria,
        ocorrencias: n, pctDasOfertas: Math.round((n / withOffer.length) * 100),
      }))
      .sort((a, b) => b.ocorrencias - a.ocorrencias)
      .slice(0, 5);

    return json({
      eligible: true,
      scope: useSegment ? 'specialty' : 'market',
      specialty: useSegment ? mySpecialty : null,
      sampleSize: withOffer.length,
      closingRate,
      topArguments,
      topObjections,
    });
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
