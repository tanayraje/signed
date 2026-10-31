-- Used by the tick function (service role) to send a pocket on post day.
-- The insert trigger checks auth.uid(), so the service path sets the claim first.
create or replace function public.send_pocket_for(owner_id uuid, friend_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     and coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') <> 'service_role' then
    raise exception 'Not allowed';
  end if;
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', owner_id::text, 'role', 'service_role')::text, true);
  select public.send_pocket(friend_id) into new_id;
  return new_id;
end $$;
revoke execute on function public.send_pocket_for(uuid, uuid) from public, anon, authenticated;
