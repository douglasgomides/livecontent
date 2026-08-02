-- Marca se a Brain do médico já recebeu o pré-preenchimento automático (paciente/tom)
-- baseado na 1a consulta real gravada. Roda só 1x por conta: sem isso, toda consulta
-- real repetiria a chamada de IA e poderia sobrescrever ajustes que o médico já fez.
ALTER TABLE public.brains ADD COLUMN IF NOT EXISTS brain_seeded BOOLEAN NOT NULL DEFAULT false;

-- Sem isso, a atualização que o run-pipeline grava direto na Brain (pré-preenchimento
-- da 1a consulta) nunca chega via Realtime no cliente — fica invisível até reload.
ALTER PUBLICATION supabase_realtime ADD TABLE public.brains;
