-- Start a new profile with the first name from Google, if there is one.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare full_name text := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
begin
  insert into public.profiles (id, name) values (new.id, split_part(full_name, ' ', 1)) on conflict do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
