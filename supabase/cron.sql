-- Run once in the SQL editor (replace YOUR-PROJECT with your project ref).
-- The secret is read from the database, so nothing needs copying.
select cron.schedule('signed-tick', '* * * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT.supabase.co/functions/v1/tick',
    headers := jsonb_build_object('Authorization', 'Bearer ' || public.get_app_secret('tick'), 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);
