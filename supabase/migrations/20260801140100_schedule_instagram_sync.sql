-- Sincronização diária do desempenho real de posts do Instagram (via API REST
-- do Windsor.ai) para social_post_performance. O segredo compartilhado que
-- protege a chamada (header x-cron-secret, conferido em sync-instagram-posts)
-- fica no Vault — nunca em texto plano no comando do cron nem em git. Depois
-- de aplicar esta migração, rode manualmente (uma vez, via SQL editor):
--   select vault.create_secret('<valor-do-CRON_SECRET>', 'sync_instagram_cron_secret',
--     'Shared secret sync-instagram-posts checks against x-cron-secret header');
-- Esse mesmo valor precisa ser cadastrado como secret CRON_SECRET da edge
-- function sync-instagram-posts (junto com WINDSOR_API_KEY, a chave real do
-- Windsor.ai) em Project Settings > Edge Functions > Secrets.

select cron.schedule(
  'sync-instagram-posts-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://ifrsvvstjoduvxfcsozu.supabase.co/functions/v1/sync-instagram-posts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_instagram_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
