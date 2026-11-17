-- Seal patina and achievements.
-- profiles.sealed counts every letter someone has sent, so their seal can age (patina) wherever it shows.
-- seal_stats(target) returns what each achievement needs; only you and your friends can read it.

alter table public.profiles add column if not exists sealed integer not null default 0;

update public.profiles p
set sealed = coalesce((select count(*) from public.letters l where l.sender = p.id), 0);

create or replace function public.count_sealed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set sealed = sealed + 1 where id = new.sender;
  return new;
end $$;

drop trigger if exists letters_count_sealed on public.letters;
create trigger letters_count_sealed after insert on public.letters
for each row execute function public.count_sealed();

create or replace function public.seal_stats(target uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  tz text;
  out jsonb;
begin
  if me is null or (target <> me and not are_friends(me, target)) then
    return null;
  end if;
  select coalesce(nullif(p.tz, ''), 'UTC') into tz from profiles p where p.id = target;

  with sent as (
    select * from letters where sender = target
  ),
  weeks as (
    select recipient, date_trunc('week', sent_at) as wk from sent group by 1, 2
  ),
  runs as (
    select recipient, wk - (row_number() over (partition by recipient order by wk)) * interval '1 week' as grp from weeks
  ),
  best_run as (
    select coalesce(max(n), 0) as n from (select count(*) as n from runs group by recipient, grp) r
  )
  select jsonb_build_object(
    'sealed', (select count(*) from sent),
    'night_owl', exists (select 1 from sent where extract(hour from sent_at at time zone tz) < 4),
    'long_haul', exists (select 1 from sent where distance_km >= 1000),
    'enchanted', exists (select 1 from sent where enchanted or audio_path is not null),
    'same_day', exists (
      select 1 from sent b join letters a on a.sender = b.recipient and a.recipient = target
      where b.sent_at between a.arrive_at and a.arrive_at + interval '1 day'),
    'pen_pal_weeks', (select n from best_run),
    'friends', (select count(*) from friend_settings fs where fs.owner = target and are_friends(target, fs.friend)),
    'seasons', (select count(distinct case
                  when extract(month from sent_at) in (12, 1, 2) then 1
                  when extract(month from sent_at) in (3, 4, 5) then 2
                  when extract(month from sent_at) in (6, 7, 8) then 3
                  else 4 end) from sent),
    'one_year', exists (
      select 1 from friend_settings fs
      where fs.owner = target and fs.since <= now() - interval '365 days'
        and exists (select 1 from sent where sent.recipient = fs.friend))
  ) into out;
  return out;
end $$;

revoke all on function public.seal_stats(uuid) from public, anon;
grant execute on function public.seal_stats(uuid) to authenticated;
revoke all on function public.count_sealed() from public, anon, authenticated;
