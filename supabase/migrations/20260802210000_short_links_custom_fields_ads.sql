-- Três frentes desta leva:
-- 1) Encurtador de link simples (pra pré-consulta/captação de lead não ficarem
--    gigantes depois de UTM etc).
-- 2) Campos customizáveis por médico nos dois formulários públicos, além dos
--    campos fixos que run-pipeline já lê por id.
-- 3) Inteligência de anúncios (Meta Ads / Google Ads via Windsor.ai), com
--    atribuição real ao funil comercial via utm_campaign.

-- ============================================================
-- 1) Encurtador de link
-- ============================================================
create table if not exists public.short_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  target_url text not null,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, target_url)
);

alter table public.short_links enable row level security;

create policy "short_links_select_own"
  on public.short_links for select
  to authenticated
  using (auth.uid() = user_id);

create policy "short_links_insert_own"
  on public.short_links for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "short_links_delete_own"
  on public.short_links for delete
  to authenticated
  using (auth.uid() = user_id);

-- Resolução pública (a tela /s/:slug não tem sessão) — função estreita: só
-- devolve a URL alvo e incrementa o contador, nunca expõe a tabela inteira.
create or replace function public.resolve_short_link(p_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
begin
  update public.short_links set clicks = clicks + 1
  where slug = p_slug
  returning target_url into v_url;
  return v_url;
end;
$$;
grant execute on function public.resolve_short_link(text) to anon, authenticated;

-- ============================================================
-- 2) Campos customizáveis por médico (pré-consulta / captação de lead)
-- ============================================================
create table if not exists public.custom_form_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  form_type text not null check (form_type in ('pre_consulta', 'lead_capture')),
  label text not null,
  field_type text not null check (field_type in ('short_text', 'long_text', 'single_choice', 'multi_choice', 'yes_no')),
  options jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  required boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.custom_form_fields enable row level security;

create policy "custom_form_fields_select_own"
  on public.custom_form_fields for select
  to authenticated
  using (auth.uid() = user_id);

create policy "custom_form_fields_insert_own"
  on public.custom_form_fields for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "custom_form_fields_update_own"
  on public.custom_form_fields for update
  to authenticated
  using (auth.uid() = user_id);

create policy "custom_form_fields_delete_own"
  on public.custom_form_fields for delete
  to authenticated
  using (auth.uid() = user_id);

-- Leitura pública estreita (só o que o formulário precisa pra se montar,
-- nunca user_id) — mesmo padrão de get_scheduling_link.
create or replace function public.get_custom_form_fields(p_doctor_id uuid, p_form_type text)
returns table (id uuid, label text, field_type text, options jsonb, "position" integer, required boolean)
language sql
security definer
set search_path = public
as $$
  select id, label, field_type, options, "position", required
  from public.custom_form_fields
  where user_id = p_doctor_id and form_type = p_form_type
  order by "position" asc, created_at asc;
$$;
grant execute on function public.get_custom_form_fields(uuid, text) to anon, authenticated;

-- Respostas dos campos customizados de lead (preconsultation_responses.answers
-- já é jsonb livre, então os campos de pré-consulta entram lá mesmo).
alter table public.lead_captures add column if not exists custom_answers jsonb not null default '{}'::jsonb;

-- ============================================================
-- 3) Inteligência de anúncios (Meta Ads / Google Ads)
-- ============================================================
alter table public.doctor_settings add column if not exists meta_ads_account_id text;
alter table public.doctor_settings add column if not exists google_ads_account_id text;

-- Atribuição real: o link de captação carrega ?utm_campaign=<nome exato da
-- campanha no Meta/Google Ads>, pra cruzar gasto com lead/conversão de verdade.
alter table public.lead_captures add column if not exists utm_campaign text;

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('meta', 'google')),
  external_campaign_id text not null,
  campaign_name text not null,
  status text,
  spend numeric not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  date_preset text not null default 'last_30dT',
  synced_at timestamptz not null default now(),
  unique (user_id, platform, external_campaign_id)
);

alter table public.ad_campaigns enable row level security;

create policy "ad_campaigns_select_own"
  on public.ad_campaigns for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.ad_campaign_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  suggestion_type text not null check (suggestion_type in ('pausar', 'aumentar_orcamento', 'reduzir_orcamento', 'revisar_criativo')),
  reason text not null,
  -- Sugestão da IA nunca executa sozinha: aprovar aqui só marca a decisão do
  -- médico e mostra a ação a fazer no próprio Meta/Google Ads Manager (não
  -- temos escrita conectada na conta de anúncio do médico, só leitura via
  -- Windsor.ai) — nunca fingir automação que não existe de verdade.
  status text not null default 'pendente' check (status in ('pendente', 'aceita', 'descartada')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.ad_campaign_suggestions enable row level security;

create policy "ad_campaign_suggestions_select_own"
  on public.ad_campaign_suggestions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "ad_campaign_suggestions_update_own"
  on public.ad_campaign_suggestions for update
  to authenticated
  using (auth.uid() = user_id);
