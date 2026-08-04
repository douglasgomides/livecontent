-- Custo opcional por produto/procedimento — permite calcular margem real
-- (avg_price - cost) em vez de usar preço como proxy imperfeito de margem.
-- Fica em branco por padrão: nada quebra pra quem não preenche.
alter table public.products add column if not exists cost numeric;

-- Protocolo individualizado sugerido pela IA a partir da consulta real: uma
-- sequência de etapas que atende a necessidade identificada do paciente e,
-- entre opções clinicamente equivalentes, prioriza a de maior margem pro
-- médico — nunca inventa necessidade nem prioriza margem sobre indicação
-- clínica (regra aplicada no prompt de _shared/commercialIntelligence.ts).
-- Sempre nasce com status 'pendente': só o médico aprova ou descarta.
alter table public.commercial_intelligence
  add column if not exists protocolo_individualizado jsonb;
