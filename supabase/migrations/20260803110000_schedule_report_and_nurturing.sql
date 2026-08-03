-- Agenda as duas frentes do documento de visão que valem a pena agora.
-- Mesmo secret do Vault já usado pelos outros crons (sync_instagram_cron_secret
-- == CRON_SECRET nas secrets do projeto, compartilhado entre as functions).

-- Relatório semanal — toda segunda-feira 08:00 (horário de Brasília = 11:00 UTC).
select cron.schedule(
  'send-weekly-report-monday',
  '0 11 * * 1',
  $$
  select net.http_post(
    url := 'https://ifrsvvstjoduvxfcsozu.supabase.co/functions/v1/send-weekly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_instagram_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Nurturing proativo de leads — diariamente 07:00 (horário de Brasília = 10:00 UTC).
select cron.schedule(
  'suggest-lead-nurturing-daily',
  '0 10 * * *',
  $$
  select net.http_post(
    url := 'https://ifrsvvstjoduvxfcsozu.supabase.co/functions/v1/suggest-lead-nurturing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_instagram_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
