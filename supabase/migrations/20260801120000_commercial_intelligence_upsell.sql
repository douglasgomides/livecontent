alter table public.commercial_intelligence
  add column if not exists oportunidades_upsell jsonb not null default '[]'::jsonb,
  add column if not exists argumento_recomendado_proximo_contato text;
