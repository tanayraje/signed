-- Logbook stamps. Each achievement, once earned, becomes a stamp in its owner's courier log:
--   earned_at  when it was earned (the date inked on the stamp)
--   seen_at    when its owner watched it get stamped (null = the stamping animation still to play)
--   notified   whether the "new stamp" push has gone out
-- The tick function works out who has earned what (seal_stats_raw) and writes these rows.
create table if not exists public.stamps (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement text not null,
  earned_at timestamptz not null default now(),
  seen_at timestamptz,
  notified boolean not null default false,
  primary key (user_id, achievement)
);
alter table public.stamps enable row level security;
drop policy if exists "see your stamps and friends'" on public.stamps;
create policy "see your stamps and friends'" on public.stamps for select to authenticated
  using (user_id = auth.uid() or are_friends(auth.uid(), user_id));

-- The owner marks stamps as watched; nothing else about a stamp can be changed from the app.
create or replace function public.stamps_seen(ids text[]) returns void
language sql security definer set search_path = public as $$
  update stamps set seen_at = now() where user_id = auth.uid() and achievement = any(ids) and seen_at is null;
$$;
revoke all on function public.stamps_seen(text[]) from public, anon;
grant execute on function public.stamps_seen(text[]) to authenticated;

-- Server bookkeeping per person: whether their existing stamps have been filed (so old achievements
-- don't all ring at once), and the last seal patina stage and owl rank they were told about.
create table if not exists public.stamp_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  ready boolean not null default false,
  patina_told int,
  rank_told int
);
alter table public.stamp_state enable row level security;

-- The same numbers as seal_stats, without the "you or a friend" check, for the server only.
create or replace function public.seal_stats_raw(target uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  tz text;
  since timestamptz;
  out jsonb;
begin
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


revoke all on function public.seal_stats_raw(uuid) from public, anon, authenticated;
grant execute on function public.seal_stats_raw(uuid) to service_role;

create or replace function public.seal_stats(target uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or (target <> me and not are_friends(me, target)) then return null; end if;
  return seal_stats_raw(target);
end $$;
revoke all on function public.seal_stats(uuid) from public, anon;
grant execute on function public.seal_stats(uuid) to authenticated;
