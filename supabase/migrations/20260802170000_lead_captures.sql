-- PENDENTE DE APLICAÇÃO — escrito com o Supabase MCP desconectado nesta sessão.
-- Aplicar via apply_migration assim que a conexão voltar, depois confirmar com
-- list_tables/get_advisors e regenerar src/integrations/supabase/types.ts.
--
-- Captação de lead: link público avulso pra quem AINDA NÃO é paciente (bio do
-- Instagram, envio direto por WhatsApp) — diferente da pré-consulta (que é pra
-- quem já tem consulta marcada). Mesmo padrão de RLS de preconsultation_responses:
-- insert público (paciente não tem conta), select/update só do médico dono.
create table if not exists public.lead_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contact text not null,
  reason text,
  origin text not null default 'outro' check (origin in ('instagram', 'whatsapp', 'indicacao', 'outro')),
  status text not null default 'novo' check (status in ('novo', 'contatado', 'agendado', 'convertido', 'perdido')),
  linked_session_id uuid references public.sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.lead_captures enable row level security;

create policy "lead_captures_select_own"
  on public.lead_captures for select
  to authenticated
  using (auth.uid() = user_id);

create policy "lead_captures_update_own"
  on public.lead_captures for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Envio é público e sem conta — restrito a nunca vir com status diferente de
-- 'novo' nem já vinculado a uma consulta (isso só o médico faz depois).
create policy "lead_captures_insert_public"
  on public.lead_captures for insert
  to anon, authenticated
  with check (status = 'novo' and linked_session_id is null);

create index if not exists lead_captures_user_id_idx
  on public.lead_captures (user_id, created_at desc);

-- Link de agendamento configurável (WhatsApp, Doctoralia, o que o médico já
-- usa hoje pra marcar consulta) — mostrado como CTA na tela de captação.
alter table public.doctor_settings add column if not exists scheduling_link text;

-- A tela pública de captação precisa ler SÓ o link de agendamento de um médico
-- específico, sem autenticação — doctor_settings não tem (nem deveria ter)
-- select público, porque também guarda as URLs de webhook. Uma função estreita
-- (retorna só esse campo, nunca a linha inteira) evita abrir a tabela toda.
create or replace function public.get_scheduling_link(doctor_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select scheduling_link from public.doctor_settings where user_id = doctor_id;
$$;
grant execute on function public.get_scheduling_link(uuid) to anon, authenticated;
