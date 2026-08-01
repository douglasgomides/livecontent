-- Evidência científica, parte 1 (busca por relevância real + resumo em áudio):
-- embeddings pra ranquear por relevância semântica em vez de lista solta, e um
-- bucket privado pro áudio de resumo gerado sob demanda (cacheado por fonte).

create extension if not exists vector with schema extensions;

alter table public.evidence_sources
  add column if not exists embedding extensions.vector(1536),
  add column if not exists audio_summary_path text;

-- Busca por similaridade de cosseno, escopada ao médico dono da fonte — nunca
-- cruza dados de evidência entre contas diferentes.
create or replace function public.match_evidence_sources(
  query_embedding extensions.vector(1536),
  match_user_id uuid,
  match_count int default 15
)
returns setof public.evidence_sources
language sql stable
as $$
  select *
  from public.evidence_sources
  where user_id = match_user_id and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence-audio', 'evidence-audio', false, 15728640, array['audio/mpeg'])
on conflict (id) do nothing;

create policy "evidence audio own read" on storage.objects for select to authenticated
  using (bucket_id = 'evidence-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence audio own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence audio own update" on storage.objects for update to authenticated
  using (bucket_id = 'evidence-audio' and (storage.foldername(name))[1] = auth.uid()::text);
