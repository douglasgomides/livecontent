-- Fecha o advisory 'function_search_path_mutable' do linter do Supabase:
-- função sem search_path fixo pode ser enganada por um schema criado por
-- outro papel que "esconda" evidence_sources na frente do public no caminho
-- de busca. Sem SECURITY DEFINER aqui (roda com o privilégio de quem chama),
-- então o risco prático é baixo, mas o fix é gratuito e é a recomendação
-- padrão do próprio Supabase.
alter function public.match_evidence_sources(extensions.vector, uuid, int)
  set search_path = public, extensions;
