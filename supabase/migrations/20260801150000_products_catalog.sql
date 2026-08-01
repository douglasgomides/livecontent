-- Catálogo de produtos/procedimentos do médico — cadastrado uma vez, usado pra
-- casar as oportunidades de upsell da inteligência comercial com algo que a
-- clínica realmente oferece, em vez de sugestão genérica.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'outro',
  description text,
  price_range text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products_select_own"
  on public.products for select
  to authenticated
  using (auth.uid() = user_id);

create policy "products_insert_own"
  on public.products for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "products_update_own"
  on public.products for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "products_delete_own"
  on public.products for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists products_user_id_idx on public.products (user_id, active);
