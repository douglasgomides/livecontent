-- Inteligência de tendências: ideias de conteúdo em alta por especialidade
-- (curadas por IA via busca real na web) + desempenho real dos próprios posts
-- do médico (sincronizado via Windsor.ai, mapeado por conta do Instagram).

alter table public.brains add column if not exists instagram_account_id text;

create table if not exists public.trending_content_ideas (
  id uuid primary key default gen_random_uuid(),
  specialty text not null,
  topic text not null,
  why_it_works text not null,
  suggested_format text,
  source_title text,
  source_url text,
  fetched_at timestamptz not null default now()
);

alter table public.trending_content_ideas enable row level security;

-- Não é dado de um médico específico — qualquer autenticado pode ler.
-- Escrita só via service role (edge function), sem policy de insert/update pra usuário comum.
create policy "trending_content_ideas_select_authenticated"
  on public.trending_content_ideas for select
  to authenticated
  using (true);

create table if not exists public.social_post_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'instagram',
  external_media_id text not null,
  permalink text,
  caption text,
  media_type text,
  posted_at timestamptz,
  likes integer not null default 0,
  comments integer not null default 0,
  reach integer,
  saved integer,
  shares integer,
  engagement integer,
  synced_at timestamptz not null default now(),
  unique (user_id, platform, external_media_id)
);

alter table public.social_post_performance enable row level security;

-- Cada médico só vê o próprio desempenho. Escrita só via service role (sync job) —
-- sem policy de insert/update pra usuário comum, propositalmente.
create policy "social_post_performance_select_own"
  on public.social_post_performance for select
  to authenticated
  using (auth.uid() = user_id);
