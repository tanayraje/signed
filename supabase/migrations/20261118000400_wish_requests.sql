-- 11:11 requests: turning it on for a friend asks them to join (a notification and a page),
-- and they can join or say not now.
alter table public.friend_settings
  add column if not exists wish_told boolean not null default false,       -- the friend has been asked (or told they were joined)
  add column if not exists wish_declined_at timestamptz;                   -- the friend said not now

-- Requests made before this existed are treated as already asked.
update public.friend_settings set wish_told = true where wish_1111;

-- Each fresh request is asked again, and clears an old "not now".
create or replace function public.wish_request_reset() returns trigger
language plpgsql as $$
begin
  if new.wish_1111 and not coalesce(old.wish_1111, false) then
    new.wish_told := false;
    new.wish_declined_at := null;
  end if;
  return new;
end $$;
drop trigger if exists wish_request_reset on public.friend_settings;
create trigger wish_request_reset before update of wish_1111 on public.friend_settings
  for each row execute function public.wish_request_reset();

-- Saying not now turns off the friend's request (their row, which you can't edit directly).
create or replace function public.decline_wish(requester uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update friend_settings set wish_1111 = false, wish_declined_at = now()
   where owner = requester and friend = auth.uid() and wish_1111;
end $$;
revoke execute on function public.decline_wish(uuid) from public, anon;
grant execute on function public.decline_wish(uuid) to authenticated;
