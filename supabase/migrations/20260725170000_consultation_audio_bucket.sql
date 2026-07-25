-- O bucket 'consultation-audio' foi criado originalmente fora de uma migration
-- (via ação direta do agente ao construir a gravação de áudio). Isso deixa a
-- migration incompleta pra qualquer ambiente novo (ex.: migrar de projeto
-- Supabase). Esta migration recria o bucket de forma idempotente, com as
-- mesmas configurações já em produção.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'consultation-audio', 'consultation-audio', false, 26214400,
  ARRAY['audio/webm','audio/mp4','audio/mpeg','audio/mp3','audio/wav','audio/wave','audio/ogg','audio/x-m4a','audio/m4a']
)
ON CONFLICT (id) DO NOTHING;
