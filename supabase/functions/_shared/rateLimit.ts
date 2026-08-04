// Rate limit por usuário+função, extraído do bloco que já existia só em
// run-pipeline/index.ts (mesmos limites: 20/hora e 8/mês no Free, 60/hora e
// 500/mês no Pro) — aplicado agora também nas outras edge functions que
// chamam provedor pago com a chave da PLATAFORMA sem teto nenhum. Cada
// função tem seu próprio contador independente (função A bater no limite não
// afeta o contador da função B) — mais simples e mais seguro que tentar
// unificar num teto global sem dado real sobre o custo relativo de cada uma.
//
// Isso NÃO é a tabela de custo real (FinOps, ainda não construída) — é só
// contagem de chamadas, pra fechar o buraco de "gasto sem limite nenhum".
export interface RateLimitResult {
  allowed: boolean;
  message?: string;
}

export async function checkAndRecordRateLimit(
  supabase: any,
  userId: string,
  functionName: string,
): Promise<RateLimitResult> {
  const { data: subRow } = await supabase.from('subscriptions').select('plan, status').eq('user_id', userId).maybeSingle();
  const isPro = subRow?.plan === 'pro' && subRow?.status === 'active';

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: hourly } = await supabase
    .from('api_rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('function_name', functionName)
    .gte('created_at', oneHourAgo);
  const HOURLY_LIMIT = isPro ? 60 : 20;
  if ((hourly ?? 0) >= HOURLY_LIMIT) {
    return { allowed: false, message: 'Limite de uso por hora atingido. Tente novamente mais tarde.' };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: monthly } = await supabase
    .from('api_rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('function_name', functionName)
    .gte('created_at', thirtyDaysAgo);
  const MONTHLY_LIMIT = isPro ? 500 : 8;
  if ((monthly ?? 0) >= MONTHLY_LIMIT) {
    return {
      allowed: false,
      message: isPro
        ? 'Limite mensal do plano Pro atingido para esta ação. Fale com o suporte.'
        : 'Limite mensal do plano Free atingido para esta ação. Faça upgrade pra Pro em Ajustes.',
    };
  }

  // Best-effort: se o insert falhar por algum motivo, ainda deixamos a
  // chamada passar — um contador que falha não deveria derrubar a feature
  // real que o médico está tentando usar.
  await supabase.from('api_rate_limit_log').insert({ user_id: userId, function_name: functionName }).then(
    () => {},
    () => {},
  );

  return { allowed: true };
}
