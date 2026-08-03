-- Duas frentes do documento de visão do produto que valem a pena agora:
-- 1) Relatório semanal por WhatsApp (toda segunda) — valor sem precisar abrir
--    o app, ataca direto a fricção do menu com ~20 itens.
-- 2) Nurturing proativo por temperatura do lead — adaptado aos dados que
--    realmente temos hoje (status do kanban), não ao rastreamento comportamental
--    fino que o documento descreve (não temos pixel de clique/visualização).
--    Segue o mesmo princípio de todo o resto do produto: IA sugere, médico
--    aprova, nunca envia sozinho — reaproveita o mesmo whatsapp_followups.

-- ============================================================
-- 1) Relatório semanal
-- ============================================================
alter table public.doctor_settings add column if not exists own_whatsapp_number text;

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  content jsonb not null,
  message text not null,
  sent boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_reports enable row level security;

create policy "weekly_reports_select_own"
  on public.weekly_reports for select
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- 2) Nurturing proativo por temperatura do lead
-- ============================================================
-- Quando o status mudou pela última vez — cadência conta os dias a partir
-- daqui, não de created_at (senão um lead "contatado" há muito tempo dispararia
-- tudo de uma vez). last_nurture_day guarda até qual dia da cadência já foi
-- tocado nesse status, pra nunca repetir o mesmo checkpoint.
alter table public.lead_captures add column if not exists status_changed_at timestamptz not null default now();
alter table public.lead_captures add column if not exists last_nurture_day integer not null default 0;
