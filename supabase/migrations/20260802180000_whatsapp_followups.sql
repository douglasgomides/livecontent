-- PENDENTE DE APLICAÇÃO — escrito com o Supabase MCP desconectado nesta sessão.
-- Aplicar via apply_migration assim que a conexão voltar, depois confirmar com
-- list_tables/get_advisors, regenerar src/integrations/supabase/types.ts, e
-- fazer o deploy da edge function supabase/functions/dispatch-whatsapp-followup/.
--
-- Consentimento explícito coletado ANTES da consulta (via Pré-consulta) — sem
-- isso, nenhuma mensagem de acompanhamento é gerada nem enviada pra esse
-- paciente, mesmo que o contato dele já esteja registrado.
alter table public.preconsultation_responses
  add column if not exists whatsapp_consent boolean not null default false;

-- Webhook do WhatsApp, mesmo modelo dos webhooks de canal já existentes
-- (Zapier/Make/n8n apontando pra automação própria do médico) — mas separado
-- de doctor_settings.webhooks porque não é um canal de publicação de conteúdo
-- (broadcast), é envio individual por paciente específico.
alter table public.doctor_settings
  add column if not exists whatsapp_webhook_url text;

-- Uma mensagem de acompanhamento por (consulta, resposta de pré-consulta) OU
-- por lead (quem ainda não é paciente) — rascunho gerado a partir do que já
-- foi extraído/coletado, sempre revisável, só sai depois de aprovação
-- explícita do médico. session_id/preconsult_response_id ficam null pra
-- follow-up de lead; lead_id fica null pra follow-up de paciente — nunca os
-- dois preenchidos ao mesmo tempo (constraint abaixo).
create table if not exists public.whatsapp_followups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  preconsult_response_id uuid references public.preconsultation_responses(id) on delete cascade,
  lead_id uuid references public.lead_captures(id) on delete cascade,
  phone text not null,
  message text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint whatsapp_followups_target check (
    (lead_id is not null and session_id is null and preconsult_response_id is null)
    or (lead_id is null and session_id is not null and preconsult_response_id is not null)
  )
);

alter table public.whatsapp_followups enable row level security;

create policy "whatsapp_followups_own"
  on public.whatsapp_followups for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists whatsapp_followups_session_idx
  on public.whatsapp_followups (session_id);
create index if not exists whatsapp_followups_lead_idx
  on public.whatsapp_followups (lead_id);
