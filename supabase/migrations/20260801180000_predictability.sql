-- Previsibilidade: pra projetar receita de verdade (não estimativa inventada),
-- precisamos de um valor numérico por produto (price_range é texto livre, não
-- dá pra somar) e de uma forma do médico marcar se uma oportunidade de upsell
-- foi realmente aceita ou recusada depois — sem isso não existe taxa de
-- conversão real pra calcular probabilidade nenhuma.

alter table public.products
  add column if not exists avg_price numeric;

-- commercial_intelligence já existe (criada fora de migration numa sessão
-- anterior — gap conhecido). Garante explicitamente que o próprio médico pode
-- atualizar sua consulta (pra marcar status de oportunidade de upsell), sem
-- depender de uma policy pré-existente não documentada localmente.
drop policy if exists "commercial_intelligence_update_own" on public.commercial_intelligence;
create policy "commercial_intelligence_update_own"
  on public.commercial_intelligence for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
