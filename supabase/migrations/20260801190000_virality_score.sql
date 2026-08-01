-- Fator de viralização/qualidade estilo Opus Clip — aplicado tanto na matéria-prima
-- (tema de consulta, artigo, notícia monitorada) quanto na peça já gerada, pra
-- apontar o que vale mais a pena puxar/gerar e o que priorizar na hora de publicar.
-- JSONB nulo até a primeira pontuação rodar (best-effort, nunca bloqueia o fluxo).
ALTER TABLE public.topics ADD COLUMN virality JSONB;
ALTER TABLE public.content_pieces ADD COLUMN virality JSONB;
ALTER TABLE public.evidence_sources ADD COLUMN virality JSONB;
ALTER TABLE public.evidence_topic_updates ADD COLUMN virality JSONB;
