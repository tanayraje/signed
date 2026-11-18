-- Owl wardrobe: breeds, clothing, rank by distance flown, and the owl achievements.
-- profiles.breed      which felt owl you fly (eight breeds; three unlock with rank)
-- profiles.outfit     what it wears, one piece per slot: {"head": "postman_cap", "neck": "silk_scarf", ...}
-- profiles.flown_km   total distance your letters have flown; it sets your rank, and rank makes your owl faster
-- letters.over_sea    whether the straight path crossed open sea (filled in by the tick function)

alter table public.profiles add column if not exists breed text;
alter table public.profiles add column if not exists outfit jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists flown_km integer not null default 0;
alter table public.letters add column if not exists over_sea boolean;

-- Everyone keeps an owl close to the one they had: the old plumage picks the breed.
update public.profiles set breed = case plume
  when 'tawny' then 'tawny' when 'umber' then 'spotted' when 'sand' then 'barn' when 'white' then 'barn'
  when 'ash' then 'classic' when 'dark' then 'tawny' when 'russet' then 'classic' when 'slate' then 'burrowing'
  else 'tawny' end
where breed is null;
alter table public.profiles alter column breed set default 'tawny';
alter table public.profiles alter column breed set not null;

-- The map's drawn owl and the owl-feather mix-in still use a plumage colour: match it to the breed.
update public.profiles set plume = case breed
  when 'classic' then 'russet' when 'tawny' then 'tawny' when 'barn' then 'sand' when 'spotted' then 'umber'
  when 'burrowing' then 'sand' when 'scops' then 'ash' when 'snowy' then 'white' when 'eagle' then 'russet' else plume end;

update public.profiles p
set flown_km = coalesce((select sum(distance_km) from public.letters l where l.sender = p.id), 0);

-- Count each letter sent, and how far it flew.
create or replace function public.count_sealed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set sealed = sealed + 1, flown_km = flown_km + coalesce(new.distance_km, 0) where id = new.sender;
  return new;
end $$;

-- Rank makes owls faster: 1.0x new, 1.1x courier (1,000 km), 1.2x senior (5,000), 1.3x veteran (15,000), 1.4x master (25,000).
create or replace function public.owl_speed(km integer) returns float8
language sql immutable set search_path = public as $$
  select case when km >= 25000 then 1.4 when km >= 15000 then 1.3 when km >= 5000 then 1.2 when km >= 1000 then 1.1 else 1.0 end;
$$;

create or replace function public.prepare_letter() returns trigger
language plpgsql security definer set search_path = public as $$
declare s profiles; r profiles; d float8; minutes float8;
begin
  if new.sender <> auth.uid() then raise exception 'You can only send as yourself'; end if;
  if not are_friends(new.sender, new.recipient) then raise exception 'You can only write to friends'; end if;
  select * into s from profiles where id = new.sender;
  select * into r from profiles where id = new.recipient;
  new.sent_at := now();
  new.from_lat := s.last_lat; new.from_lon := s.last_lon; new.from_place := s.last_place;
  new.to_lat := r.last_lat; new.to_lon := r.last_lon; new.to_place := r.last_place;
  if s.last_lat is not null and r.last_lat is not null then
    d := haversine_km(s.last_lat, s.last_lon, r.last_lat, r.last_lon);
  else
    d := 0;
  end if;
  new.distance_km := round(d);
  if s.quick_flights then
    minutes := 1;
  else
    -- owls cruise ~300 km/h (20 min to 6 h), and a higher rank flies faster
    minutes := greatest(20, least(360, d / 300.0 * 60)) / owl_speed(coalesce(s.flown_km, 0));
  end if;
  new.arrive_at := now() + make_interval(secs => minutes * 60);
  new.opened_at := null; new.place := null; new.notified := false; new.over_sea := null;
  return new;
end $$;

-- What each achievement needs, now with the owl ones: cities written to, the longest flight, and a sea crossing.
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
        and exists (select 1 from sent where sent.recipient = fs.friend)),
    'cities', (select count(distinct lower(to_place)) from sent where to_place is not null and to_place <> ''),
    'longest_km', (select coalesce(max(distance_km), 0) from sent),
    'sea', exists (select 1 from sent where over_sea)
  ) into out;
  return out;
end $$;

revoke all on function public.seal_stats(uuid) from public, anon;
grant execute on function public.seal_stats(uuid) to authenticated;
revoke all on function public.count_sealed() from public, anon, authenticated;
