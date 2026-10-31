-- Server-only secrets (push keys, the cron secret). Never exposed through the API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.app_secrets (key text primary key, value text not null);
insert into private.app_secrets (key, value) values ('tick', encode(extensions.gen_random_bytes(24), 'hex'));

create or replace function public.get_app_secret(k text) returns text
language sql stable security definer set search_path = private as $$
  select value from private.app_secrets where key = k;
$$;
create or replace function public.set_app_secret(k text, v text) returns void
language sql security definer set search_path = private as $$
  insert into private.app_secrets (key, value) values (k, v) on conflict (key) do update set value = excluded.value;
$$;
revoke execute on function public.get_app_secret(text) from public, anon, authenticated;
revoke execute on function public.set_app_secret(text, text) from public, anon, authenticated;
grant execute on function public.get_app_secret(text) to service_role;
grant execute on function public.set_app_secret(text, text) to service_role;

-- The push public key is meant to be public; phones need it to subscribe. The tick function creates the pair on its first run.
create or replace function public.vapid_public_key() returns text
language sql stable security definer set search_path = private as $$
  select value from private.app_secrets where key = 'vapid_public';
$$;
grant execute on function public.vapid_public_key() to anon, authenticated;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
