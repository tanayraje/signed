revoke execute on function public.accept_invite(text), public.are_friends(uuid, uuid), public.file_letter(uuid, text),
  public.handle_new_user(), public.incoming_flights(), public.open_letter(uuid), public.prepare_letter(),
  public.send_pocket(uuid), public.vapid_public_key() from public, anon;
revoke execute on function public.handle_new_user(), public.prepare_letter() from authenticated;
grant execute on function public.accept_invite(text), public.are_friends(uuid, uuid), public.file_letter(uuid, text),
  public.incoming_flights(), public.open_letter(uuid), public.send_pocket(uuid), public.vapid_public_key() to authenticated;
grant execute on function public.are_friends(uuid, uuid), public.send_pocket(uuid) to service_role;
