-- Run once in the Supabase SQL editor after deploying the `tick` function.
-- Replace YOUR-PROJECT and YOUR-TICK-SECRET (the same value you set as the TICK_SECRET function secret).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('signed-tick', '* * * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT.supabase.co/functions/v1/tick',
    headers := '{"Authorization": "Bearer YOUR-TICK-SECRET", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
