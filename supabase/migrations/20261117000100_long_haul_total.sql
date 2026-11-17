-- Long haul counts the total distance flown by all your letters (5,000 km), not one long letter.
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
    'km', (select coalesce(round(sum(distance_km)), 0) from sent),
    'long_haul', (select coalesce(sum(distance_km), 0) >= 5000 from sent),
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
