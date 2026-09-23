-- Re-schedule the Ticketmaster ingest with a shared-secret header.
-- The old job sent the publishable key as a Bearer token, which the function
-- gateway rejected (401 ES256) — no events were ingested after 2026-04-06.
-- Prerequisite (not in git): vault secret 'cron_secret' + function secret CRON_SECRET, same value.
select cron.unschedule('ingest-ticketmaster')
where exists (select 1 from cron.job where jobname = 'ingest-ticketmaster');

select cron.schedule(
  'ingest-ticketmaster',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://sjkvobewtukxbhmhuidh.supabase.co/functions/v1/ingest-ticketmaster',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
