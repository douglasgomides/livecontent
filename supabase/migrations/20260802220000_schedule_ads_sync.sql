-- Sincronização diária de Meta Ads / Google Ads (via API REST do Windsor.ai)
-- pra ad_campaigns, mesmo padrão do cron do Instagram. Reaproveita o mesmo
-- secret guardado no Vault (sync_instagram_cron_secret) — é o mesmo valor já
-- cadastrado como CRON_SECRET nas secrets do projeto, compartilhado entre
-- todas as edge functions, não precisa de um novo.

select cron.schedule(
  'sync-ads-performance-daily',
  '10 7 * * *',
  $$
  select net.http_post(
    url := 'https://ifrsvvstjoduvxfcsozu.supabase.co/functions/v1/sync-ads-performance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_instagram_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
