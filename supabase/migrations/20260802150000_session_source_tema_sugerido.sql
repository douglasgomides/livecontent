-- Nova origem de consulta: tema gerado a partir de uma objeção real de paciente
-- (fecha o loop de patient_signals -> sugestão de conteúdo -> geração real).
-- ALTER TYPE ... ADD VALUE precisa rodar sozinho, fora da mesma transação que
-- já usa o valor novo (restrição do Postgres).
ALTER TYPE public.session_source ADD VALUE IF NOT EXISTS 'tema_sugerido';
