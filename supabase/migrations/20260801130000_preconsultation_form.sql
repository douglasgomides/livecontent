-- Formulário de pré-consulta: link público avulso que o médico manda pro
-- paciente antes da consulta (sem exigir conta do paciente). As respostas
-- ficam soltas até o médico vincular manualmente a uma consulta gravada
-- depois — aí a inteligência comercial dessa consulta pode cruzar com o
-- que o paciente já tinha sinalizado antes de sentar com o médico.

create table if not exists public.preconsultation_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_name text not null,
  patient_contact text,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  linked_session_id uuid references public.sessions(id) on delete set null
);

alter table public.preconsultation_responses enable row level security;

-- O médico só vê e gerencia as respostas endereçadas a ele.
create policy "preconsultation_responses_select_own"
  on public.preconsultation_responses for select
  to authenticated
  using (auth.uid() = user_id);

-- Só o vínculo com a consulta pode ser editado pelo médico (o restante é o
-- relato original do paciente, não deve ser alterável depois de enviado).
create policy "preconsultation_responses_update_own"
  on public.preconsultation_responses for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Envio é público e sem conta (paciente preenche antes de existir qualquer
-- sessão) — por isso a policy de insert é aberta pro papel anon/authenticated,
-- restrita só a preencher exatamente esses campos (linked_session_id nunca
-- vem do formulário público).
create policy "preconsultation_responses_insert_public"
  on public.preconsultation_responses for insert
  to anon, authenticated
  with check (linked_session_id is null);

create index if not exists preconsultation_responses_user_id_idx
  on public.preconsultation_responses (user_id, submitted_at desc);
