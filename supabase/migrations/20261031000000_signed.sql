-- Signed: letters between friends, carried by owls.

create extension if not exists pgcrypto with schema extensions;

-- People ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  monogram text not null default '' check (char_length(monogram) <= 2),
  wax text not null default 'oxblood',
  mixins text[] not null default '{gold}',
  plume text not null default 'tawny',
  eye text not null default 'amber',
  owl_name text not null default 'Wren',
  tz text not null default 'Asia/Kolkata',
  quick_flights boolean not null default false,
  last_lat double precision,
  last_lon double precision,
  last_place text,
  last_seen_at timestamptz,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- One row per direction. Two rows (a->b and b->a) mean a friendship.
create table public.friend_settings (
  owner uuid not null references public.profiles on delete cascade,
  friend uuid not null references public.profiles on delete cascade,
  post_day smallint not null default 0 check (post_day between 0 and 6),
  auto_post boolean not null default true,
  wish_1111 boolean not null default false,
  last_auto_post date,
  since timestamptz not null default now(),
  primary key (owner, friend),
  check (owner <> friend)
);

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friend_settings where owner = a and friend = b)
     and exists (select 1 from friend_settings where owner = b and friend = a);
$$;

create table public.invites (
  code text primary key default encode(extensions.gen_random_bytes(6), 'hex'),
  from_user uuid not null references public.profiles on delete cascade,
  used_by uuid references public.profiles,
  created_at timestamptz not null default now()
);

-- Mail -----------------------------------------------------------------
create table public.letters (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.profiles on delete cascade,
  recipient uuid not null references public.profiles on delete cascade,
  kind text not null default 'letter' check (kind in ('letter', 'bundle')),
  body text not null default '',
  question text,
  stamp text not null default 'lotus',
  photo_path text,
  photo_caption text,
  audio_path text,
  video_path text,
  transcript jsonb,            -- [{word, start, end}] for talking letters
  enchanted boolean not null default false,
  scraps jsonb,                -- bundle contents
  from_lat double precision, from_lon double precision, from_place text,
  to_lat double precision, to_lon double precision, to_place text,
  distance_km integer,
  sent_at timestamptz not null default now(),
  arrive_at timestamptz not null default now(),
  opened_at timestamptz,
  place text check (place in ('wall', 'trunk')),
  notified boolean not null default false
);
create index letters_recipient_idx on public.letters (recipient, arrive_at);
create index letters_sender_idx on public.letters (sender, sent_at);
create index letters_undelivered_idx on public.letters (arrive_at) where notified = false;

create or replace function public.haversine_km(lat1 float8, lon1 float8, lat2 float8, lon2 float8) returns float8
language sql immutable set search_path = public as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)));
$$;

-- The server, not the phone, decides where an owl flies and when it lands.
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
    minutes := greatest(20, least(360, d / 300.0 * 60));  -- owls cruise ~300 km/h, 20 min to 6 h
  end if;
  new.arrive_at := now() + make_interval(secs => minutes * 60);
  new.opened_at := null; new.place := null; new.notified := false;
  return new;
end $$;
create trigger letters_prepare before insert on public.letters
  for each row execute function public.prepare_letter();

create table public.scraps (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles on delete cascade,
  friend uuid not null references public.profiles on delete cascade,
  type text not null check (type in ('line', 'photo', 'question', 'voice')),
  text text,
  media_path text,
  created_at timestamptz not null default now()
);

create table public.stamps (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles on delete cascade,
  image_path text not null,
  created_at timestamptz not null default now()
);

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.profiles on delete cascade,
  recipient uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Row level security ----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.friend_settings enable row level security;
alter table public.invites enable row level security;
alter table public.letters enable row level security;
alter table public.scraps enable row level security;
alter table public.stamps enable row level security;
alter table public.wishes enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "see yourself and friends" on public.profiles for select
  using (id = auth.uid() or are_friends(auth.uid(), id));
create policy "edit yourself" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "your friend settings" on public.friend_settings for select using (owner = auth.uid() or friend = auth.uid());
create policy "change your side" on public.friend_settings for update using (owner = auth.uid()) with check (owner = auth.uid());

create policy "your invites" on public.invites for select using (from_user = auth.uid());
create policy "make invites" on public.invites for insert with check (from_user = auth.uid());

-- A letter in flight is visible to its sender; the recipient sees it once it has landed.
create policy "read your mail" on public.letters for select
  using (sender = auth.uid() or (recipient = auth.uid() and arrive_at <= now()));
create policy "send mail" on public.letters for insert with check (sender = auth.uid());

create policy "your pocket" on public.scraps for all using (owner = auth.uid()) with check (owner = auth.uid() and are_friends(owner, friend));
create policy "your stamps" on public.stamps for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy "see wishes" on public.wishes for select using (sender = auth.uid() or recipient = auth.uid());
create policy "make wishes" on public.wishes for insert with check (
  sender = auth.uid()
  and exists (select 1 from friend_settings where owner = sender and friend = recipient and wish_1111)
  and exists (select 1 from friend_settings where owner = recipient and friend = sender and wish_1111));
create policy "your devices" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Actions ---------------------------------------------------------------
create or replace function public.accept_invite(invite_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invites;
begin
  select * into inv from invites where code = invite_code for update;
  if inv is null then raise exception 'That invite link is not valid'; end if;
  if inv.from_user = auth.uid() then raise exception 'That is your own invite'; end if;
  if inv.used_by is not null and inv.used_by <> auth.uid() then raise exception 'That invite has already been used'; end if;
  insert into friend_settings (owner, friend) values (auth.uid(), inv.from_user), (inv.from_user, auth.uid()) on conflict do nothing;
  update invites set used_by = auth.uid() where code = invite_code;
  return inv.from_user;
end $$;

-- Letters heading your way: who and when, never what.
create or replace function public.incoming_flights()
returns table (id uuid, sender uuid, sent_at timestamptz, arrive_at timestamptz,
  from_lat float8, from_lon float8, to_lat float8, to_lon float8)
language sql stable security definer set search_path = public as $$
  select id, sender, sent_at, arrive_at, from_lat, from_lon, to_lat, to_lon
  from letters where recipient = auth.uid() and arrive_at > now();
$$;

create or replace function public.open_letter(letter_id uuid) returns void
language sql security definer set search_path = public as $$
  update letters set opened_at = coalesce(opened_at, now())
  where id = letter_id and recipient = auth.uid() and arrive_at <= now();
$$;

create or replace function public.file_letter(letter_id uuid, where_to text) returns void
language sql security definer set search_path = public as $$
  update letters set place = where_to
  where id = letter_id and recipient = auth.uid() and where_to in ('wall', 'trunk');
$$;

-- Ties up the pocket for one friend and sends it as a bundle.
create or replace function public.send_pocket(friend_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare bundle jsonb; new_id uuid;
begin
  select jsonb_agg(jsonb_build_object('type', type, 'text', text, 'media_path', media_path) order by created_at)
    into bundle from scraps where owner = auth.uid() and friend = friend_id;
  if bundle is null then raise exception 'Your pocket is empty'; end if;
  insert into letters (sender, recipient, kind, scraps, stamp) values (auth.uid(), friend_id, 'bundle', bundle, 'chai')
    returning id into new_id;
  delete from scraps where owner = auth.uid() and friend = friend_id;
  return new_id;
end $$;

-- Media -----------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('mail', 'mail', false) on conflict do nothing;

create policy "upload to your folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'mail' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read your files and landed mail" on storage.objects for select to authenticated
  using (bucket_id = 'mail' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.letters l
      where l.recipient = auth.uid() and l.arrive_at <= now()
        and (l.photo_path = name or l.audio_path = name or l.video_path = name
             or l.scraps @> jsonb_build_array(jsonb_build_object('media_path', name))))
    or exists (select 1 from public.stamps s join public.letters l on l.stamp = 'custom:' || s.id::text
      where s.image_path = name and l.recipient = auth.uid() and l.arrive_at <= now())));
