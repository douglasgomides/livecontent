-- Agenda a purga de LGPD (áudio bruto + transcrição não-anonimizada de
-- sessões antigas) — item de maior prioridade identificado na auditoria de
-- compliance: hoje esse dado fica armazenado pra sempre, sem expiração.
-- Diariamente 05:00 (horário de Brasília = 08:00 UTC) — fora do horário
-- comercial, não compete com uso real do produto.
select cron.schedule(
  'purge-expired-session-media-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://ifrsvvstjoduvxfcsozu.supabase.co/functions/v1/purge-expired-session-media',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_instagram_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
