-- Geração de imagem por IA (gpt-image-1), pros dois escopos pedidos:
-- 1) Criativo de anúncio pago (imagem + headline/texto/descrição) — o médico
--    baixa a imagem e cola o texto no Gerenciador de Anúncios dele; a gente não
--    cria nem publica campanha nenhuma, só o criativo.
-- 2) Fundo de arte orgânica (carousel/stories) gerado por IA, como alternativa
--    a exigir foto de marca enviada pelo médico.
--
-- Bucket separado de brand-photos de propósito: fundo gerado por IA é
-- decorativo/ilustrativo (nunca finge ser foto real do médico/equipe/clínica),
-- então não faz sentido misturar com as fotos reais que o médico sobe.

-- ============================================================
-- Criativos de anúncio
-- ============================================================
create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  dimension text not null check (dimension in ('quadrado', 'vertical', 'story')),
  headline text not null,
  primary_text text not null,
  description text not null default '',
  image_path text not null,
  created_at timestamptz not null default now()
);

alter table public.ad_creatives enable row level security;

create policy "ad_creatives_all_own"
  on public.ad_creatives for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index ad_creatives_user on public.ad_creatives(user_id, created_at desc);

-- Bucket privado pras imagens de criativo de anúncio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-creatives', 'ad-creatives', false, 10485760, array['image/png'])
on conflict (id) do nothing;

create policy "ad creatives own read" on storage.objects for select to authenticated
  using (bucket_id = 'ad-creatives' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ad creatives own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'ad-creatives' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ad creatives own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'ad-creatives' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Fundos de arte orgânica gerados por IA
-- ============================================================
-- Sem tabela própria: o caminho da imagem fica dentro do jsonb `artwork` de
-- content_pieces (campo backgroundImagePath), igual ao resto da arte.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-backgrounds', 'ai-backgrounds', false, 10485760, array['image/png'])
on conflict (id) do nothing;

create policy "ai backgrounds own read" on storage.objects for select to authenticated
  using (bucket_id = 'ai-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ai backgrounds own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'ai-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ai backgrounds own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'ai-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);
