-- Evidência científica, parte 2: monitoramento de tema (assina um assunto,
-- recebe novidades sozinho) + resumo em áudio debatido em duas vozes.

create table if not exists public.evidence_topic_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_checked_at timestamptz
);

alter table public.evidence_topic_watches enable row level security;

create policy "evidence_topic_watches_own"
  on public.evidence_topic_watches for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.evidence_topic_updates (
  id uuid primary key default gen_random_uuid(),
  watch_id uuid not null references public.evidence_topic_watches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text not null,
  source_title text,
  source_url text,
  found_at timestamptz not null default now()
);

alter table public.evidence_topic_updates enable row level security;

-- Só leitura pro médico — a escrita é feita pelo cron (service role), nunca
-- pelo cliente diretamente, pra garantir que só entra achado de busca real.
create policy "evidence_topic_updates_select_own"
  on public.evidence_topic_updates for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists evidence_topic_watches_due_idx
  on public.evidence_topic_watches (active, last_checked_at);
create index if not exists evidence_topic_updates_watch_idx
  on public.evidence_topic_updates (watch_id, found_at desc);

-- Segmentos do resumo em áudio "debatido" (duas vozes) — cacheado por fonte,
-- cada item {speaker, path, text}. Reaproveita o bucket evidence-audio já criado.
alter table public.evidence_sources
  add column if not exists audio_debate_segments jsonb;

select cron.schedule(
  'check-evidence-topic-watches-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://ifrsvvstjoduvxfcsozu.supabase.co/functions/v1/check-evidence-topic-watches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_instagram_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
