-- Fecha o buraco identificado na auditoria: só run-pipeline tem teto de uso;
-- as outras 7 edge functions que gastam a chave da PLATAFORMA (não a do
-- médico) em provedor pago podem ser chamadas sem limite nenhum. Esta tabela
-- é só o contador — não é a tabela de custo/FinOps (api_call_log, ainda não
-- construída), que vai guardar tokens/custo real por chamada. Aqui é só
-- "quantas vezes essa função rodou pra esse usuário, nas últimas N horas/dias".
create table if not exists public.api_rate_limit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  function_name text not null,
  created_at timestamptz not null default now()
);

alter table public.api_rate_limit_log enable row level security;

-- Cada edge function grava usando o client autenticado do próprio médico
-- (mesmo padrão de run-pipeline), então precisa poder inserir/contar as
-- próprias linhas — nunca as de outro usuário.
create policy "api_rate_limit_log_insert_own"
  on public.api_rate_limit_log for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "api_rate_limit_log_select_own"
  on public.api_rate_limit_log for select
  to authenticated
  using (auth.uid() = user_id);

create index api_rate_limit_log_user_fn_time
  on public.api_rate_limit_log (user_id, function_name, created_at desc);

-- Linhas só servem pra contagem numa janela de 30 dias (o maior limite usado
-- hoje) — sem retenção longa, isso também é dado de uso que não precisa
-- acumular indefinidamente (mesmo princípio da purga de LGPD).
create index api_rate_limit_log_created_at on public.api_rate_limit_log (created_at);
