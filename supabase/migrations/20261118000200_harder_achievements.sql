-- Harder achievements. seal_stats now also returns:
--   night_owl_nights  different nights a letter was sealed between midnight and 4 am (Night owl: 3)
--   same_day_count    letters written within a day of one landing from that friend (Same-day reply: 3)
--   pen_pal_weeks     longest run of weeks where you and one friend BOTH wrote to each other (Pen pal: 4).
--                     Counted in UTC weeks so both friends always get it at the same moment.
--   pen_friends       friends you've swapped letters with both ways (Full shelf: 5)
--   year_months       longest run of months writing to one friend at least once a month (One year: 12)
--   sea_count         flights over open sea (Sea crossing: 3)
--   far_count         flights longer than 5,000 km (Far flight: 3)
--   seal_since        when this seal was first made (Heirloom patina needs it to be a year old)
create or replace function public.seal_stats(target uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  tz text;
  since timestamptz;
  out jsonb;
begin
  if me is null or (target <> me and not are_friends(me, target)) then
    return null;
  end if;
  select coalesce(nullif(p.tz, ''), 'UTC'), p.created_at into tz, since from profiles p where p.id = target;

  with sent as (
    select * from letters where sender = target
  ),
  got as (
    select * from letters where recipient = target
  ),
  both_weeks as (
    select s.recipient, date_trunc('week', s.sent_at at time zone 'UTC') as wk
    from sent s
    where exists (select 1 from got g where g.sender = s.recipient
                  and date_trunc('week', g.sent_at at time zone 'UTC') = date_trunc('week', s.sent_at at time zone 'UTC'))
    group by 1, 2
  ),
  week_runs as (
    select recipient, wk - (row_number() over (partition by recipient order by wk)) * interval '1 week' as grp from both_weeks
  ),
  months as (
    select recipient, date_trunc('month', sent_at at time zone tz) as m from sent group by 1, 2
  ),
  month_runs as (
    select recipient, m - (row_number() over (partition by recipient order by m)) * interval '1 month' as grp from months
  )
  select jsonb_build_object(
    'sealed', (select count(*) from sent),
    'night_owl_nights', (select count(distinct (sent_at at time zone tz)::date) from sent where extract(hour from sent_at at time zone tz) < 4),
    'km', (select coalesce(round(sum(distance_km)), 0) from sent),
    'enchanted', exists (select 1 from sent where enchanted or audio_path is not null),
    'same_day_count', (select count(distinct b.id) from sent b join got a on a.sender = b.recipient
                       where b.sent_at between a.arrive_at and a.arrive_at + interval '1 day'),
    'pen_pal_weeks', (select coalesce(max(n), 0) from (select count(*) as n from week_runs group by recipient, grp) r),
    'friends', (select count(*) from friend_settings fs where fs.owner = target and are_friends(target, fs.friend)),
    'pen_friends', (select count(distinct s.recipient) from sent s
                    where are_friends(target, s.recipient) and exists (select 1 from got g where g.sender = s.recipient)),
    'seasons', (select count(distinct case
                  when extract(month from sent_at) in (12, 1, 2) then 1
                  when extract(month from sent_at) in (3, 4, 5) then 2
                  when extract(month from sent_at) in (6, 7, 8) then 3
                  else 4 end) from sent),
    'year_months', (select coalesce(max(n), 0) from (select count(*) as n from month_runs group by recipient, grp) r),
    'cities', (select count(distinct lower(to_place)) from sent where to_place is not null and to_place <> ''),
    'longest_km', (select coalesce(max(distance_km), 0) from sent),
    'sea_count', (select count(*) from sent where over_sea),
    'far_count', (select count(*) from sent where distance_km > 5000),
    'seal_since', since
  ) into out;
  return out;
end $$;

revoke all on function public.seal_stats(uuid) from public, anon;
grant execute on function public.seal_stats(uuid) to authenticated;
