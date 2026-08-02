-- Marca sessões cujo conteúdo NÃO foi derivado de transcrição real verificada
-- (hoje: todo o fluxo Link → Conteúdo, que não tem integração de transcrição de
-- vídeo real conectada) — usado pra exigir confirmação explícita do médico
-- antes de aprovar qualquer peça gerada a partir desse rascunho.
ALTER TABLE public.sessions ADD COLUMN unverified_draft BOOLEAN NOT NULL DEFAULT false;
